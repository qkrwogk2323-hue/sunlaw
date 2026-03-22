import { NextResponse } from 'next/server';
import { getCurrentAuth } from '@/lib/auth';

type ContractScanResult = {
  title: string;
  documentTitle: string;
  agreementType: 'retainer' | 'flat_fee' | 'success_fee' | 'expense_reimbursement' | 'installment_plan' | 'internal_settlement';
  summary: string;
  description: string;
  fixedAmount: string;
  rate: string;
  effectiveFrom: string;
  effectiveTo: string;
};

const EMPTY_RESULT: ContractScanResult = {
  title: '',
  documentTitle: '',
  agreementType: 'retainer',
  summary: '',
  description: '',
  fixedAmount: '',
  rate: '',
  effectiveFrom: '',
  effectiveTo: ''
};

function normalizeDate(value: unknown) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}

function normalizeResult(input: any): ContractScanResult {
  const agreementType = ['retainer', 'flat_fee', 'success_fee', 'expense_reimbursement', 'installment_plan', 'internal_settlement'].includes(String(input?.agreementType))
    ? input.agreementType
    : 'retainer';

  return {
    title: String(input?.title || '').slice(0, 200),
    documentTitle: String(input?.documentTitle || input?.title || '').slice(0, 200),
    agreementType,
    summary: String(input?.summary || '').slice(0, 2000),
    description: String(input?.description || '').slice(0, 1000),
    fixedAmount: input?.fixedAmount != null && `${input.fixedAmount}` !== '' ? String(Number(input.fixedAmount) || '') : '',
    rate: input?.rate != null && `${input.rate}` !== '' ? String(Number(input.rate) || '') : '',
    effectiveFrom: normalizeDate(input?.effectiveFrom),
    effectiveTo: normalizeDate(input?.effectiveTo)
  };
}

async function parseWithGemini(file: File): Promise<ContractScanResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const bytes = Buffer.from(await file.arrayBuffer());
  const base64Data = bytes.toString('base64');

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text:
                '당신은 한국 계약서 정리 도우미입니다. 첨부 문서에서 계약 등록에 필요한 정보만 추출해 JSON으로만 답하세요. 허용 키: title, documentTitle, agreementType(retainer|flat_fee|success_fee|expense_reimbursement|installment_plan|internal_settlement), summary, description, fixedAmount, rate, effectiveFrom, effectiveTo. 날짜는 YYYY-MM-DD, 모르면 빈 문자열.'
            },
            {
              inlineData: {
                mimeType: file.type || 'application/octet-stream',
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) return null;
  const payload = await response.json();
  const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) return null;

  try {
    return normalizeResult(JSON.parse(content));
  } catch {
    return null;
  }
}

function parseFallbackFromFilename(fileName: string): ContractScanResult {
  const base = fileName.replace(/\.[^.]+$/, '');
  return {
    ...EMPTY_RESULT,
    title: base.slice(0, 200),
    documentTitle: fileName.slice(0, 200),
    summary: `업로드 파일명 기준 임시 계약 요약: ${base}`
  };
}

export async function POST(request: Request) {
  const auth = await getCurrentAuth();
  if (!auth) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || !file.size) {
    return NextResponse.json({ ok: false, error: '분석할 계약서를 첨부해 주세요.' }, { status: 400 });
  }

  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: '파일은 20MB 이하만 업로드할 수 있습니다.' }, { status: 400 });
  }

  const parsed = await parseWithGemini(file);
  if (parsed) {
    return NextResponse.json({ ok: true, data: parsed, provider: 'gemini' });
  }

  return NextResponse.json({
    ok: true,
    data: parseFallbackFromFilename(file.name),
    provider: 'fallback',
    notice: 'AI 스캔이 어려워 파일명 기준 임시 입력값을 채웠습니다.'
  });
}
