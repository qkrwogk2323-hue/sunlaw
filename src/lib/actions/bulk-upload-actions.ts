'use server';

import { revalidatePath } from 'next/cache';
import { requireOrganizationActionAccess } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

// ─── 특이사항 저장 위치 추천 (rules-first, LLM 불필요) ─────────────────────────

function classifySpecialNote(note: string, clientName: string): string {
  const text = note.toLowerCase();
  if (/비용|수임료|보수|미납|입금|지급|결제|청구|정산/.test(text)) {
    return `"${note}" — ${clientName} 의뢰인의 비용 탭 또는 수금 관리에 기록하는 것을 권장합니다.`;
  }
  if (/연락|전화|문자|카톡|부재|수신거부|응답/.test(text)) {
    return `"${note}" — ${clientName} 의뢰인의 연락 이력 탭에 기록하는 것을 권장합니다.`;
  }
  if (/사건|소송|판결|기일|법원|제출|서류|서면|항소|상고/.test(text)) {
    return `"${note}" — 해당 사건 페이지의 메모 또는 활동 기록에 기록하는 것을 권장합니다.`;
  }
  if (/주소|이사|이전|변경|업데이트/.test(text)) {
    return `"${note}" — ${clientName} 의뢰인의 기본 정보 탭에 주소를 업데이트하는 것을 권장합니다.`;
  }
  return `"${note}" — ${clientName} 의뢰인 상세 페이지의 특이사항 탭에 저장하는 것을 권장합니다.`;
}

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

    // 특이사항이 있으면 rules-first 분류 (LLM 불필요)
    if (specialNote) {
      aiSuggestions.push({ name, suggestion: classifySpecialNote(specialNote, name) });
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
    const openedOn = (row['개시일'] || row['접수일'] || row['opened_on'] || '').trim() || null;
    const summary = (row['요약'] || row['summary'] || '').trim() || null;
    const clientName = (row['의뢰인'] || row['의뢰인이름'] || row['client_name'] || '').trim() || null;
    const clientEmail = (row['의뢰인이메일'] || row['client_email'] || '').trim() || null;

    if (!title) { errors.push({ row: rowNum, reason: '사건명이 비어 있습니다.' }); skipped++; continue; }
    if (!openedOn) { errors.push({ row: rowNum, reason: `"${title}": 개시일이 비어 있습니다. YYYY-MM-DD 형식으로 입력해 주세요.` }); skipped++; continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(openedOn)) { errors.push({ row: rowNum, reason: `"${title}": 개시일 형식이 올바르지 않습니다. YYYY-MM-DD 형식이어야 합니다. (입력값: ${openedOn})` }); skipped++; continue; }

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

function normalizeScheduleKind(rawValue: string) {
  const value = rawValue.trim().toLowerCase().replace(/\s/g, '');
  if (!value) return 'reminder' as const;
  if (['업무일정', '업무', 'task', 'work', 'reminder', '리마인더'].includes(value)) return 'reminder' as const;
  if (['미팅일정', '미팅', '회의', 'meeting'].includes(value)) return 'meeting' as const;
  if (['기타일정', '기타', 'other'].includes(value)) return 'other' as const;
  if (['기일', '마감', '기한', 'deadline', 'hearing'].includes(value)) return 'deadline' as const;
  return 'other' as const;
}

function normalizeScheduleDateTime(rawValue: string): string | null {
  const value = rawValue.trim();
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T09:00`;
  return null;
}

function asYes(rawValue: string) {
  return ['y', 'yes', '예', '네', 'true', '1'].includes(rawValue.trim().toLowerCase());
}

function composeScheduleNotes(parts: Array<[string, string | undefined]>) {
  return parts
    .map(([label, value]) => [label, value?.trim() ?? ''] as const)
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join('\n');
}

export async function bulkUploadSchedulesAction(
  organizationId: string,
  csvText: string
): Promise<BulkUploadResult> {
  const { auth } = await requireOrganizationActionAccess(organizationId, {
    permission: 'schedule_create',
    errorMessage: '일정 일괄 등록 권한이 없습니다.'
  });

  const rows = parseCSV(csvText);
  if (!rows.length) {
    return { ok: false, code: 'EMPTY_CSV', userMessage: 'CSV 파일에 데이터가 없습니다. 헤더를 포함해 최소 2행이 필요합니다.' };
  }
  if (rows.length > 200) {
    return { ok: false, code: 'TOO_MANY_ROWS', userMessage: `한 번에 최대 200건까지 업로드할 수 있습니다. 현재 ${rows.length}건입니다.` };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existingCases } = await supabase
    .from('cases')
    .select('id, title, reference_no, case_number')
    .eq('organization_id', organizationId)
    .neq('lifecycle_status', 'soft_deleted');

  const caseByReference = new Map<string, string>();
  const caseByTitle = new Map<string, string>();
  for (const item of existingCases ?? []) {
    if (item.reference_no) caseByReference.set(item.reference_no.trim().toLowerCase(), item.id);
    if (item.case_number) caseByReference.set(item.case_number.trim().toLowerCase(), item.id);
    if (item.title) caseByTitle.set(item.title.trim().toLowerCase(), item.id);
  }

  const errors: Array<{ row: number; reason: string }> = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const rowNum = i + 2;

    const caseReference = (row['사건번호'] || row['reference_no'] || row['사건참조번호'] || '').trim();
    const caseTitle = (row['사건명'] || row['case_title'] || row['제목'] || '').trim();
    const title = (row['일정명'] || row['제목'] || row['name'] || row['현재상황'] || row['권고조치'] || '').trim();
    const rawKind = (row['일정종류'] || row['kind'] || '').trim();
    const scheduledStart = normalizeScheduleDateTime(
      (row['일시'] || row['시작일시'] || row['scheduled_start'] || row['보정완료기한'] || '').trim()
    );
    const scheduledEnd = normalizeScheduleDateTime((row['종료일시'] || row['scheduled_end'] || '').trim());
    const location = (row['장소'] || row['location'] || '').trim() || null;
    const currentStatus = (row['현재상황'] || row['status'] || '').trim();
    const specialNote = (row['특이사항'] || row['메모'] || row['note'] || '').trim();
    const correctionServedOn = (row['보정송달완료일자'] || '').trim();
    const correctionDueOn = (row['보정완료기한'] || '').trim();
    const relatedPerson = (row['연계인'] || row['연계자'] || '').trim();
    const recommendation = (row['권고조치'] || '').trim();
    const important = asYes((row['중요일정'] || row['is_important'] || '').trim());

    const caseId =
      (caseReference ? caseByReference.get(caseReference.toLowerCase()) : null)
      ?? (caseTitle ? caseByTitle.get(caseTitle.toLowerCase()) : null)
      ?? null;

    if (!caseId) {
      errors.push({ row: rowNum, reason: '사건번호 또는 사건명으로 연결할 사건을 찾을 수 없습니다.' });
      skipped += 1;
      continue;
    }
    if (!title || title.length < 2) {
      errors.push({ row: rowNum, reason: '일정명 또는 현재상황을 2자 이상 입력해 주세요.' });
      skipped += 1;
      continue;
    }
    if (!scheduledStart) {
      errors.push({ row: rowNum, reason: '일시 또는 보정완료기한을 YYYY-MM-DD 또는 YYYY-MM-DDTHH:mm 형식으로 입력해 주세요.' });
      skipped += 1;
      continue;
    }

    const scheduleKind = normalizeScheduleKind(rawKind || (recommendation || correctionDueOn ? '업무일정' : '기타일정'));
    const notes = composeScheduleNotes([
      ['현재상황', currentStatus || undefined],
      ['특이사항', specialNote || undefined],
      ['보정송달완료일자', correctionServedOn || undefined],
      ['보정완료기한', correctionDueOn || undefined],
      ['연계인', relatedPerson || undefined],
      ['권고조치', recommendation || undefined]
    ]);

    const shouldMarkImportant =
      important ||
      scheduleKind === 'deadline' ||
      (correctionDueOn ? new Date(`${correctionDueOn}T23:59:59`).getTime() < Date.now() : false);

    const { error } = await supabase.from('case_schedules').insert({
      organization_id: organizationId,
      case_id: caseId,
      title,
      schedule_kind: scheduleKind,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      location,
      notes: notes || null,
      client_visibility: 'internal_only',
      is_important: shouldMarkImportant,
      created_by: auth.user.id,
      created_by_name: auth.profile.full_name,
      updated_by: auth.user.id
    });

    if (error) {
      errors.push({ row: rowNum, reason: error.message });
      skipped += 1;
      continue;
    }
    created += 1;
  }

  revalidatePath('/calendar');
  revalidatePath('/dashboard');
  return { ok: true, created, skipped, errors, aiSuggestions: [] };
}
