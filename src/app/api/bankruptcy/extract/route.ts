import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { guardAccessDeniedResponse, guardValidationFailedResponse, guardServerErrorResponse } from '@/lib/api-guard-response';
import type { ExtractionResult, CreditorRaw, CorrectionChecklistItemRaw } from '@/lib/insolvency-types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const EXTRACTION_PROMPT = `당신은 한국 개인회생·파산 전문 AI입니다.
업로드된 문서를 분석해 다음 JSON 형식으로만 응답하세요.

응답 JSON 스키마:
{
  "documentType": "debt_certificate" | "correction_order" | "correction_recommendation" | "other",
  "rawSummary": "문서 전체 요약 (2~4문장)",
  "creditors": [
    {
      "creditorName": "채권자명",
      "claimClass": "secured" | "priority" | "general",
      "principalAmount": 숫자(원),
      "interestAmount": 숫자(원, 없으면 0),
      "penaltyAmount": 숫자(원, 없으면 0),
      "interestRatePct": 숫자 또는 null,
      "hasGuarantor": true/false,
      "guarantorName": "보증인명" 또는 null,
      "collateralDescription": "담보물 설명 (별제권부만)" 또는 null,
      "prioritySubtype": "national_tax" | "local_tax" | "social_insurance" | "wage_arrears" | "lease_deposit" | "child_support" | null,
      "sourcePageReference": "페이지/행 참조" 또는 null,
      "aiConfidenceScore": 0~1 사이 숫자
    }
  ],
  "correctionItems": [
    {
      "title": "필요 항목명",
      "description": "상세 설명" 또는 null,
      "responsibility": "client_self" | "client_visit" | "office_prepare"
    }
  ]
}

claimClass 분류 기준:
- secured: 담보 있는 채권 (근저당, 질권 등)
- priority: 세금, 4대보험, 미지급임금, 임차보증금, 양육비
- general: 그 외 일반채권

correctionItems는 보정권고서·보정명령서에서만 추출. 채권자 문서에서는 빈 배열.`;

async function extractWithGemini(base64Data: string, mimeType: string): Promise<ExtractionResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.');
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: EXTRACTION_PROMPT },
              { inlineData: { mimeType, data: base64Data } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Gemini API 오류: ${response.status} ${errBody.slice(0, 200)}`);
  }

  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Gemini 응답에서 텍스트를 추출할 수 없습니다.');

  const parsed = JSON.parse(content);

  const creditors: CreditorRaw[] = Array.isArray(parsed.creditors)
    ? parsed.creditors.map((c: Record<string, unknown>) => ({
        creditorName: String(c.creditorName || ''),
        claimClass: ['secured', 'priority', 'general'].includes(String(c.claimClass))
          ? (c.claimClass as CreditorRaw['claimClass'])
          : 'general',
        principalAmount: Math.max(0, Number(c.principalAmount) || 0),
        interestAmount: Math.max(0, Number(c.interestAmount) || 0),
        penaltyAmount: Math.max(0, Number(c.penaltyAmount) || 0),
        interestRatePct: c.interestRatePct != null ? Number(c.interestRatePct) : null,
        hasGuarantor: Boolean(c.hasGuarantor),
        guarantorName: c.guarantorName ? String(c.guarantorName) : null,
        collateralDescription: c.collateralDescription ? String(c.collateralDescription) : null,
        prioritySubtype: c.prioritySubtype ? String(c.prioritySubtype) : null,
        sourcePageReference: c.sourcePageReference ? String(c.sourcePageReference) : null,
        aiConfidenceScore: Math.min(1, Math.max(0, Number(c.aiConfidenceScore) || 0.8))
      }))
    : [];

  const correctionItems: CorrectionChecklistItemRaw[] = Array.isArray(parsed.correctionItems)
    ? parsed.correctionItems.map((item: Record<string, unknown>) => ({
        title: String(item.title || ''),
        description: item.description ? String(item.description) : null,
        responsibility: ['client_self', 'client_visit', 'office_prepare'].includes(String(item.responsibility))
          ? (item.responsibility as CorrectionChecklistItemRaw['responsibility'])
          : 'client_self'
      }))
    : [];

  return {
    documentType: ['debt_certificate', 'correction_order', 'correction_recommendation', 'other'].includes(parsed.documentType)
      ? parsed.documentType
      : 'other',
    creditors,
    correctionItems,
    rawSummary: String(parsed.rawSummary || ''),
    aiModel: GEMINI_MODEL
  };
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return guardAccessDeniedResponse(401, {
        blocked: '로그인이 필요합니다.',
        cause: '인증되지 않은 요청입니다.',
        resolution: '로그인 후 다시 시도해 주세요.'
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const caseId = formData.get('caseId') as string | null;
    const organizationId = formData.get('organizationId') as string | null;
    const documentType = (formData.get('documentType') as string | null) ?? 'other';

    if (!file || !caseId || !organizationId) {
      return guardValidationFailedResponse(400, {
        blocked: '필수 항목이 누락됐습니다.',
        cause: 'file, caseId, organizationId는 모두 필요합니다.',
        resolution: '파일과 사건 정보를 모두 입력해 주세요.'
      });
    }

    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.type)) {
      return guardValidationFailedResponse(400, {
        blocked: '지원하지 않는 파일 형식입니다.',
        cause: `업로드된 파일 형식: ${file.type}`,
        resolution: 'PDF, JPG, PNG, WebP 파일만 업로드할 수 있습니다.'
      });
    }

    if (file.size > 20 * 1024 * 1024) {
      return guardValidationFailedResponse(400, {
        blocked: '파일 크기가 너무 큽니다.',
        cause: `${(file.size / 1024 / 1024).toFixed(1)}MB`,
        resolution: '20MB 이하 파일만 업로드할 수 있습니다.'
      });
    }

    // 조직 멤버 확인
    const { data: membership } = await supabase
      .from('organization_memberships')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership) {
      return guardAccessDeniedResponse(403, {
        blocked: '접근 권한이 없습니다.',
        cause: '해당 조직의 구성원이 아닙니다.',
        resolution: '조직 관리자에게 권한을 요청하세요.'
      });
    }

    // ingestion job 생성
    const storagePath = `org/${organizationId}/cases/${caseId}/ingestion/${Date.now()}-${file.name}`;
    const { data: job, error: jobError } = await supabase
      .from('document_ingestion_jobs')
      .insert({
        organization_id: organizationId,
        case_id: caseId,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        document_type: documentType,
        status: 'processing',
        ai_model: GEMINI_MODEL,
        ai_prompt_version: 'v1',
        created_by: user.id,
        updated_by: user.id,
        processing_started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (jobError || !job) {
      return guardServerErrorResponse(500, '작업 큐 생성에 실패했습니다.');
    }

    // base64 변환 후 Gemini 추출
    const base64Data = Buffer.from(await file.arrayBuffer()).toString('base64');

    let result: ExtractionResult;
    try {
      result = await extractWithGemini(base64Data, file.type);
    } catch (aiErr) {
      await supabase
        .from('document_ingestion_jobs')
        .update({ status: 'failed', last_error: String(aiErr), updated_by: user.id })
        .eq('id', job.id);
      return guardServerErrorResponse(500, `AI 추출 실패: ${String(aiErr).slice(0, 100)}`);
    }

    // job 완료
    await supabase
      .from('document_ingestion_jobs')
      .update({
        status: 'completed',
        extracted_json: result as unknown as Record<string, unknown>,
        processing_completed_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', job.id);

    return NextResponse.json({ ok: true, jobId: job.id, result });
  } catch (err) {
    console.error('[/api/bankruptcy/extract]', err);
    return guardServerErrorResponse();
  }
}
