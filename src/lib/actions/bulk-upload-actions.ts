'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganizationActionAccess } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { buildTaskPlan } from '@/lib/ai/task-planner';

// ─── CSV 파싱 헬퍼 ────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  fields.push(cur.trim());
  return fields;
}

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^\uFEFF/, '').toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

// ─── 의뢰인 CSV 일괄 등록 ────────────────────────────────────────────────────
// CSV 컬럼: 이름*, 이메일, 연락처, 사건제목(기존사건 연결용), 관계, 특이사항
// * = 필수

export type ClientBulkRow = {
  name: string;
  email?: string;
  phone?: string;
  caseTitle?: string;
  relation?: string;
  specialNote?: string;
};

export type BulkUploadResult = {
  ok: true;
  created: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
  aiSuggestions: Array<{ name: string; suggestion: string }>;
} | {
  ok: false;
  code: string;
  userMessage: string;
};

// CSV로 의뢰인 목록을 한 번에 등록하고 연결 가능한 사건을 같이 매칭한다.
export async function bulkUploadClientsAction(
  organizationId: string,
  csvText: string
): Promise<BulkUploadResult> {
  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'user_manage',
    errorMessage: '의뢰인 일괄 등록 권한이 없습니다.'
  });

  const rows = parseCSV(csvText);
  if (!rows.length) {
    return { ok: false, code: 'EMPTY_CSV', userMessage: 'CSV 파일에 데이터가 없습니다. 헤더를 포함해 최소 2행이 필요합니다.' };
  }
  if (rows.length > 200) {
    return { ok: false, code: 'TOO_MANY_ROWS', userMessage: `한 번에 최대 200건까지 업로드할 수 있습니다. 현재 ${rows.length}건입니다.` };
  }

  const supabase = await createSupabaseServerClient();

  // 기존 사건 목록 조회 (제목 매칭용)
  const { data: existingCases } = await supabase
    .from('cases')
    .select('id, title')
    .eq('organization_id', organizationId)
    .neq('lifecycle_status', 'soft_deleted');

  const caseByTitle = new Map((existingCases ?? []).map((c: any) => [c.title.trim(), c.id]));

  const errors: Array<{ row: number; reason: string }> = [];
  let created = 0;
  let skipped = 0;
  const aiSuggestions: Array<{ name: string; suggestion: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    // 컬럼 매핑 (한/영 둘 다 허용)
    const name = (row['이름'] || row['name'] || '').trim();
    const email = (row['이메일'] || row['email'] || '').trim() || undefined;
    const phone = (row['연락처'] || row['phone'] || row['휴대폰'] || '').trim() || undefined;
    const caseTitle = (row['사건제목'] || row['case'] || row['사건'] || '').trim() || undefined;
    const relation = (row['관계'] || row['relation'] || '의뢰인').trim() || '의뢰인';
    const specialNote = (row['특이사항'] || row['note'] || row['메모'] || '').trim() || undefined;

    if (!name) { errors.push({ row: rowNum, reason: '이름이 비어 있습니다.' }); skipped++; continue; }
    if (!email && !phone) { errors.push({ row: rowNum, reason: `${name}: 이메일 또는 연락처 중 하나는 필수입니다.` }); skipped++; continue; }

    const caseId = caseTitle ? (caseByTitle.get(caseTitle) ?? null) : null;
    if (caseTitle && !caseId) {
      errors.push({ row: rowNum, reason: `${name}: 사건 "${caseTitle}"을 찾을 수 없어 미연결로 등록합니다.` });
    }

    // case_clients 직접 삽입 (포털 초대 없이 등록만)
    const { error: insertError } = await supabase.from('case_clients').insert({
      organization_id: organizationId,
      case_id: caseId,
      client_name: name,
      client_email_snapshot: email ?? null,
      relation_label: relation,
      link_status: caseId ? 'linked' : 'orphan_review',
      is_portal_enabled: false,
      created_by: auth.user.id,
      updated_by: auth.user.id
    });

    if (insertError) {
      errors.push({ row: rowNum, reason: `${name}: 저장 실패 — ${insertError.message}` });
      skipped++;
      continue;
    }

    created++;

    // 특이사항이 있으면 AI 제안 생성
    if (specialNote) {
      try {
        const plan = await buildTaskPlan(
          `의뢰인 "${name}"에 대한 메모가 있습니다: "${specialNote}"\n` +
          `이 내용을 어디에 기록하면 좋을지 한 문장으로 안내해주세요. (예: 의뢰인 특이사항, 비용 메모, 사건 요약 등)`,
          caseId ? [{ id: caseId, title: caseTitle ?? '연결 사건' }] : []
        );
        aiSuggestions.push({ name, suggestion: plan.summary });
      } catch {
        // AI 실패 시 기본 제안
        aiSuggestions.push({
          name,
          suggestion: `"${specialNote}" — 의뢰인 상세 페이지의 특이사항 탭에 저장하는 것을 권장합니다.`
        });
      }
    }
  }

  revalidatePath('/clients');

  return { ok: true, created, skipped, errors, aiSuggestions };
}

// ─── 사건 CSV 일괄 등록 ──────────────────────────────────────────────────────
// CSV 컬럼: 제목*, 사건유형, 원금, 법원명, 사건번호, 접수일, 의뢰인이름, 의뢰인이메일, 요약
// * = 필수

// CSV로 사건 목록을 한 번에 등록하고 기본 담당자 및 의뢰인 연결을 같이 만든다.
export async function bulkUploadCasesAction(
  organizationId: string,
  csvText: string
): Promise<BulkUploadResult> {
  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'case_create',
    errorMessage: '사건 일괄 등록 권한이 없습니다.'
  });

  const rows = parseCSV(csvText);
  if (!rows.length) {
    return { ok: false, code: 'EMPTY_CSV', userMessage: 'CSV 파일에 데이터가 없습니다.' };
  }
  if (rows.length > 200) {
    return { ok: false, code: 'TOO_MANY_ROWS', userMessage: `한 번에 최대 200건까지 업로드할 수 있습니다. 현재 ${rows.length}건입니다.` };
  }

  const supabase = await createSupabaseServerClient();
  const { data: orgRow } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', organizationId)
    .single();
  const orgSlug = orgRow?.slug ?? 'CASE';

  const VALID_CASE_TYPES = ['civil', 'criminal', 'family', 'administrative', 'debt_collection', 'insolvency', 'general'];

  const errors: Array<{ row: number; reason: string }> = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;

    const title = (row['제목'] || row['사건명'] || row['title'] || '').trim();
    const rawType = (row['사건유형'] || row['유형'] || row['case_type'] || row['type'] || 'general').trim().toLowerCase();
    const caseType = VALID_CASE_TYPES.includes(rawType) ? rawType : 'general';
    const principalAmount = parseFloat((row['원금'] || row['principal_amount'] || '0').replace(/,/g, '')) || 0;
    const courtName = (row['법원'] || row['법원명'] || row['court_name'] || '').trim() || null;
    const caseNumber = (row['사건번호'] || row['case_number'] || '').trim() || null;
    const openedOn = (row['접수일'] || row['opened_on'] || '').trim() || null;
    const summary = (row['요약'] || row['summary'] || '').trim() || null;
    const clientName = (row['의뢰인'] || row['의뢰인이름'] || row['client_name'] || '').trim() || null;
    const clientEmail = (row['의뢰인이메일'] || row['client_email'] || '').trim() || null;

    if (!title) { errors.push({ row: rowNum, reason: '제목이 비어 있습니다.' }); skipped++; continue; }

    // 사건 번호 생성
    const now = new Date();
    const referenceNo = `${orgSlug.toUpperCase()}-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    const stageTemplateKey = caseType === 'debt_collection' ? 'collection-default'
      : caseType === 'civil' ? 'civil-default'
      : caseType === 'criminal' ? 'criminal-default'
      : 'general-default';
    const moduleFlags = caseType === 'debt_collection' ? { billing: true, collection: true }
      : caseType === 'insolvency' ? { billing: true, insolvency: true }
      : { billing: true };

    const { data: caseRecord, error: caseError } = await supabase
      .from('cases')
      .insert({
        organization_id: organizationId,
        reference_no: referenceNo,
        title,
        case_type: caseType,
        case_status: 'intake',
        stage_template_key: stageTemplateKey,
        stage_key: 'intake',
        module_flags: moduleFlags,
        principal_amount: principalAmount,
        opened_on: openedOn || null,
        court_name: courtName,
        case_number: caseNumber,
        summary,
        created_by: auth.user.id,
        updated_by: auth.user.id
      })
      .select('id')
      .single();

    if (caseError || !caseRecord) {
      errors.push({ row: rowNum, reason: `"${title}": 사건 저장 실패 — ${caseError?.message ?? '알 수 없는 오류'}` });
      skipped++;
      continue;
    }

    // 담당자 등록
    await supabase.from('case_handlers').insert({
      organization_id: organizationId,
      case_id: caseRecord.id,
      profile_id: auth.user.id,
      handler_name: auth.profile.full_name,
      role: 'case_manager'
    });

    // 의뢰인 이름이 있으면 case_clients에 임시 등록
    if (clientName) {
      await supabase.from('case_clients').insert({
        organization_id: organizationId,
        case_id: caseRecord.id,
        client_name: clientName,
        client_email_snapshot: clientEmail || null,
        relation_label: '의뢰인',
        link_status: 'linked',
        is_portal_enabled: false,
        created_by: auth.user.id,
        updated_by: auth.user.id
      });
    }

    created++;
  }

  revalidatePath('/cases');
  revalidatePath('/dashboard');

  return { ok: true, created, skipped, errors, aiSuggestions: [] };
}
