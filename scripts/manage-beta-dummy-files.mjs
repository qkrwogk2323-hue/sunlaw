import crypto from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createAuthenticatedSmokeAdminClient, resolveAuthenticatedSmokeRecipient } from '../tests/e2e/authenticated-smoke-account.mjs';

for (const envPath of [resolve('.env.local'), resolve('.env')]) {
  if (existsSync(envPath)) {
    process.loadEnvFile?.(envPath);
  }
}

const DEFAULT_TAG = 'beta-participants';
const DEFAULT_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'case-files';

function usage() {
  console.log(`Usage:
  pnpm dummy:beta-files list [--participant-email <email> | --recipient-email <email>] [--case-id <uuid>] [--tag <name>]
  pnpm dummy:beta-files inject [--participant-email <email> | --recipient-email <email>] [--case-id <uuid>] [--tag <name>] [--title <text>] [--client-visible] [--ensure-case]
  pnpm dummy:beta-files cleanup [--participant-email <email> | --recipient-email <email>] [--case-id <uuid>] [--tag <name>] [--yes]

Notes:
  - All dummy files are stored under storage path org/<orgId>/cases/<caseId>/dummy/<tag>/...
  - cleanup only removes case_documents rows and storage files under that dummy prefix.
  - list/cleanup with participant email and no case id covers that participant's dummy files across linked cases.
  - cleanup without --participant-email, --recipient-email, or --case-id prompts: 어떤 참가자의 더미파일을 삭제할까요?
  - inject defaults to the authenticated smoke recipient when no recipient email is provided.
`);
}

function parseArgs(argv) {
  const options = {
    tag: DEFAULT_TAG,
    clientVisible: false,
    ensureCase: false,
    title: null,
    recipientEmail: null,
    caseId: null,
    yes: false,
  };

  const [command, ...rest] = argv;
  if (command === '--help' || command === '-h' || command === 'help') {
    options.help = true;
    return { command: null, options };
  }

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (token === '--tag') options.tag = rest[++index] ?? DEFAULT_TAG;
    else if (token === '--title') options.title = rest[++index] ?? null;
    else if (token === '--recipient-email' || token === '--participant-email') options.recipientEmail = (rest[++index] ?? '').trim().toLowerCase() || null;
    else if (token === '--case-id') options.caseId = rest[++index] ?? null;
    else if (token === '--client-visible') options.clientVisible = true;
    else if (token === '--ensure-case') options.ensureCase = true;
    else if (token === '--yes') options.yes = true;
    else if (token === '--help' || token === '-h') options.help = true;
    else throw new Error(`Unknown argument: ${token}`);
  }

  return { command, options };
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'dummy-file';
}

async function firstActiveMembershipOrg(admin, profileId) {
  const { data, error } = await admin
    .from('organization_memberships')
    .select('organization_id')
    .eq('profile_id', profileId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.organization_id ?? null;
}

async function resolveProfile(admin, recipientEmail) {
  if (recipientEmail) {
    const { data, error } = await admin
      .from('profiles')
      .select('id, email, full_name, default_organization_id, is_client_account, is_active')
      .eq('email', recipientEmail)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error(`Active profile not found for ${recipientEmail}`);
    return data;
  }

  const recipient = await resolveAuthenticatedSmokeRecipient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, email, full_name, default_organization_id, is_client_account, is_active')
    .eq('id', recipient.profileId)
    .eq('is_active', true)
    .single();

  if (error) throw error;
  return data;
}

async function resolveExistingCase(admin, profile, explicitCaseId) {
  if (explicitCaseId) {
    const { data, error } = await admin
      .from('cases')
      .select('id, organization_id, title, reference_no, case_status, lifecycle_status')
      .eq('id', explicitCaseId)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error(`Case not found for id ${explicitCaseId}`);
    return data;
  }

  if (profile.is_client_account) {
    const { data, error } = await admin
      .from('case_clients')
      .select('case_id, organization_id, cases!inner(id, title, reference_no, case_status, lifecycle_status)')
      .eq('profile_id', profile.id)
      .eq('is_portal_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data?.cases) {
      const caseRow = Array.isArray(data.cases) ? data.cases[0] : data.cases;
      return { ...caseRow, organization_id: data.organization_id };
    }
  }

  const organizationId = profile.default_organization_id ?? await firstActiveMembershipOrg(admin, profile.id);
  if (!organizationId) return null;

  const { data, error } = await admin
    .from('cases')
    .select('id, organization_id, title, reference_no, case_status, lifecycle_status')
    .eq('organization_id', organizationId)
    .neq('lifecycle_status', 'soft_deleted')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function ensureSandboxCase(admin, profile) {
  const organizationId = profile.default_organization_id ?? await firstActiveMembershipOrg(admin, profile.id);
  if (!organizationId) {
    throw new Error('No organization context found for target profile. Pass --case-id or use a profile with an active organization.');
  }

  const caseId = crypto.randomUUID();
  const referenceNo = `DUMMY-${String(Date.now()).slice(-6)}`;
  const title = `[DUMMY] ${profile.full_name ?? profile.email} beta sandbox`;
  const { error: caseError } = await admin.from('cases').insert({
    id: caseId,
    organization_id: organizationId,
    title,
    reference_no: referenceNo,
    case_type: 'advisory',
    case_status: 'active',
    stage_key: 'intake',
    lifecycle_status: 'active',
    summary: 'Managed sandbox case for dummy beta documents.',
    created_by: profile.id,
    updated_by: profile.id,
  });
  if (caseError) throw caseError;

  if (profile.is_client_account) {
    const { error: linkError } = await admin.from('case_clients').insert({
      id: crypto.randomUUID(),
      organization_id: organizationId,
      case_id: caseId,
      profile_id: profile.id,
      client_name: profile.full_name ?? profile.email,
      client_email_snapshot: profile.email,
      relation_label: '베타참여자',
      is_portal_enabled: true,
      created_by: profile.id,
      updated_by: profile.id,
    });
    if (linkError) throw linkError;
  }

  return {
    id: caseId,
    organization_id: organizationId,
    title,
    reference_no: referenceNo,
    case_status: 'active',
    lifecycle_status: 'active',
  };
}

async function resolveTarget(admin, options) {
  const profile = await resolveProfile(admin, options.recipientEmail);
  let caseRecord = await resolveExistingCase(admin, profile, options.caseId);

  if (!caseRecord && options.ensureCase) {
    caseRecord = await ensureSandboxCase(admin, profile);
  }

  if (!caseRecord) {
    throw new Error('Target case could not be resolved. Pass --case-id or re-run with --ensure-case.');
  }

  return { profile, caseRecord };
}

async function findCleanupCandidates(admin, tag) {
  const { data: documents, error: documentsError } = await admin
    .from('case_documents')
    .select('id, case_id, organization_id, title, storage_path, created_at, client_visibility, cases(id, title, reference_no)')
    .like('storage_path', `org/%/cases/%/dummy/${tag}/%`)
    .order('created_at', { ascending: false });

  if (documentsError) throw documentsError;
  if (!documents?.length) return [];

  const caseIds = [...new Set(documents.map((item) => item.case_id).filter(Boolean))];
  const { data: caseClients, error: caseClientsError } = await admin
    .from('case_clients')
    .select('case_id, profile_id, client_name, client_email_snapshot, created_at, profiles(email, full_name)')
    .in('case_id', caseIds)
    .eq('is_portal_enabled', true)
    .order('created_at', { ascending: true });

  if (caseClientsError) throw caseClientsError;

  const caseClientMap = new Map();
  for (const link of caseClients ?? []) {
    if (!caseClientMap.has(link.case_id)) {
      caseClientMap.set(link.case_id, link);
    }
  }

  const grouped = new Map();
  for (const document of documents) {
    const client = caseClientMap.get(document.case_id);
    const profile = Array.isArray(client?.profiles) ? client.profiles[0] : client?.profiles;
    const caseRow = Array.isArray(document.cases) ? document.cases[0] : document.cases;
    const recipientEmail = profile?.email ?? client?.client_email_snapshot ?? 'unknown@example.com';
    const recipientName = profile?.full_name ?? client?.client_name ?? recipientEmail;
    const key = recipientEmail;

    if (!grouped.has(key)) {
      grouped.set(key, {
        recipientEmail,
        recipientName,
        caseCount: 0,
        documentCount: 0,
        cases: [],
        documents: [],
      });
    }

    const entry = grouped.get(key);
    if (!entry.cases.some((item) => item.caseId === document.case_id)) {
      entry.cases.push({
        caseId: document.case_id,
        organizationId: document.organization_id,
        caseTitle: caseRow?.title ?? 'Untitled case',
        referenceNo: caseRow?.reference_no ?? null,
      });
      entry.caseCount += 1;
    }
    entry.documentCount += 1;
    entry.documents.push(document);
  }

  return [...grouped.values()]
    .map((candidate) => ({
      ...candidate,
      cases: candidate.cases.sort((left, right) => left.caseTitle.localeCompare(right.caseTitle)),
    }))
    .sort((left, right) => right.documentCount - left.documentCount);
}

async function listParticipantDummyDocuments(admin, profile, tag) {
  const { data: caseClients, error: caseClientsError } = await admin
    .from('case_clients')
    .select('case_id, organization_id, cases(id, title, reference_no)')
    .eq('profile_id', profile.id)
    .eq('is_portal_enabled', true)
    .order('created_at', { ascending: false });

  if (caseClientsError) throw caseClientsError;

  const caseIds = [...new Set((caseClients ?? []).map((item) => item.case_id).filter(Boolean))];
  if (!caseIds.length) {
    return { documents: [], matchedCases: [] };
  }

  const { data: documents, error: documentsError } = await admin
    .from('case_documents')
    .select('id, case_id, organization_id, title, client_visibility, storage_path, created_at')
    .in('case_id', caseIds)
    .like('storage_path', `org/%/cases/%/dummy/${tag}/%`)
    .order('created_at', { ascending: false });

  if (documentsError) throw documentsError;

  const matchedCaseIds = new Set((documents ?? []).map((item) => item.case_id));
  const matchedCases = (caseClients ?? [])
    .filter((item) => matchedCaseIds.has(item.case_id))
    .map((item) => {
      const caseRow = Array.isArray(item.cases) ? item.cases[0] : item.cases;
      return {
        caseId: item.case_id,
        organizationId: item.organization_id,
        caseTitle: caseRow?.title ?? 'Untitled case',
        referenceNo: caseRow?.reference_no ?? null,
      };
    });

  return {
    documents: documents ?? [],
    matchedCases,
  };
}

async function promptCleanupCandidate(candidates, tag) {
  if (!candidates.length) {
    throw new Error(`No dummy files found for tag ${tag}`);
  }

  console.log(`어떤 참가자의 더미파일을 삭제할까요? (tag: ${tag})`);
  for (const [index, candidate] of candidates.entries()) {
    const casePreview = candidate.cases
      .slice(0, 2)
      .map((item) => item.referenceNo ? `${item.caseTitle} / ${item.referenceNo}` : item.caseTitle)
      .join(', ');
    const moreCases = candidate.caseCount > 2 ? ` 외 ${candidate.caseCount - 2}건` : '';
    console.log(`${index + 1}. ${candidate.recipientName} <${candidate.recipientEmail}> | ${candidate.caseCount} cases | ${candidate.documentCount} files | ${casePreview}${moreCases}`);
  }

  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question('번호를 입력하세요: ')).trim();
    const selection = Number.parseInt(answer, 10);
    if (!Number.isInteger(selection) || selection < 1 || selection > candidates.length) {
      throw new Error('Invalid selection. Cleanup aborted.');
    }
    return candidates[selection - 1];
  } finally {
    rl.close();
  }
}

async function confirmCleanup(candidate, tag) {
  const rl = createInterface({ input, output });
  try {
    const answer = (await rl.question(`Delete ${candidate.documentCount} dummy files for ${candidate.recipientName} <${candidate.recipientEmail}> across ${candidate.caseCount ?? 1} case(s) | tag=${tag}? [y/N] `)).trim().toLowerCase();
    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}

function buildTargetFromCandidate(candidate) {
  return {
    profile: {
      email: candidate.recipientEmail,
      full_name: candidate.recipientName,
    },
    caseRecord: null,
    matchedCases: candidate.cases,
  };
}

function buildDummyStoragePath(organizationId, caseId, tag, title) {
  const stamp = Date.now();
  return `org/${organizationId}/cases/${caseId}/dummy/${tag}/${stamp}-${slugify(title)}.pdf`;
}

async function createDummyPdf({ title, recipientEmail, caseTitle, referenceNo, visibilityLabel, tag }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width, height } = page.getSize();

  page.drawText('VEIN Dummy Beta File', {
    x: 48,
    y: height - 72,
    size: 22,
    font: bold,
    color: rgb(0.08, 0.22, 0.38),
  });

  const lines = [
    `Title: ${title}`,
    `Recipient: ${recipientEmail}`,
    `Case: ${caseTitle}`,
    `Reference: ${referenceNo ?? '-'}`,
    `Visibility: ${visibilityLabel}`,
    `Managed tag: ${tag}`,
    `Generated at: ${new Date().toISOString()}`,
    '',
    'This file is stored under a dummy-only folder and can be removed in bulk by the beta dummy cleanup script.',
  ];

  let cursorY = height - 118;
  for (const line of lines) {
    page.drawText(line, {
      x: 48,
      y: cursorY,
      size: 11,
      font,
      color: rgb(0.15, 0.18, 0.24),
      maxWidth: width - 96,
      lineHeight: 14,
    });
    cursorY -= 22;
  }

  return pdf.save();
}

async function listDummyDocuments(admin, target, options) {
  const likePattern = options.caseId
    ? `org/${target.caseRecord.organization_id}/cases/${target.caseRecord.id}/dummy/${options.tag}/%`
    : `org/${target.caseRecord.organization_id}/cases/%/dummy/${options.tag}/%`;

  const { data, error } = await admin
    .from('case_documents')
    .select('id, case_id, title, client_visibility, storage_path, created_at')
    .eq('organization_id', target.caseRecord.organization_id)
    .like('storage_path', likePattern)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

async function injectDummyDocument(admin, target, options) {
  const title = options.title ?? `Dummy beta file ${new Date().toISOString().slice(0, 10)}`;
  const visibility = options.clientVisible ? 'client_visible' : 'internal_only';
  const storagePath = buildDummyStoragePath(target.caseRecord.organization_id, target.caseRecord.id, options.tag, title);
  const bytes = await createDummyPdf({
    title,
    recipientEmail: target.profile.email,
    caseTitle: target.caseRecord.title,
    referenceNo: target.caseRecord.reference_no,
    visibilityLabel: visibility,
    tag: options.tag,
  });

  const upload = await admin.storage.from(DEFAULT_BUCKET).upload(storagePath, bytes, {
    contentType: 'application/pdf',
    upsert: false,
  });
  if (upload.error) throw upload.error;

  const documentId = crypto.randomUUID();
  const { error: insertError } = await admin.from('case_documents').insert({
    id: documentId,
    organization_id: target.caseRecord.organization_id,
    case_id: target.caseRecord.id,
    title,
    document_kind: 'other',
    approval_status: 'approved',
    client_visibility: visibility,
    storage_path: storagePath,
    mime_type: 'application/pdf',
    file_size: bytes.length,
    summary: `[dummy-managed:${options.tag}] Safe beta dummy file`,
    content_markdown: 'Managed by scripts/manage-beta-dummy-files.mjs',
    created_by: target.profile.id,
    created_by_name: target.profile.full_name ?? target.profile.email,
    reviewed_by_name: target.profile.full_name ?? target.profile.email,
    reviewed_at: new Date().toISOString(),
    updated_by: target.profile.id,
  });

  if (insertError) {
    await admin.storage.from(DEFAULT_BUCKET).remove([storagePath]).catch(() => undefined);
    throw insertError;
  }

  return { id: documentId, title, storagePath, visibility };
}

async function cleanupDummyDocuments(admin, documents) {
  if (!documents.length) {
    return { deletedCount: 0, storageDeletedCount: 0 };
  }

  const storagePaths = documents.map((item) => item.storage_path).filter(Boolean);
  if (storagePaths.length) {
    const { error: storageError } = await admin.storage.from(DEFAULT_BUCKET).remove(storagePaths);
    if (storageError) throw storageError;
  }

  const ids = documents.map((item) => item.id);
  const { error: deleteError } = await admin.from('case_documents').delete().in('id', ids);
  if (deleteError) throw deleteError;

  return {
    deletedCount: ids.length,
    storageDeletedCount: storagePaths.length,
  };
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (!command || options.help) {
    usage();
    process.exit(options.help ? 0 : 1);
  }

  const admin = createAuthenticatedSmokeAdminClient();
  const shouldPromptForCleanupTarget = command === 'cleanup' && !options.recipientEmail && !options.caseId;
  let target = null;
  let preloadedDocuments = null;
  let matchedCases = null;

  if (shouldPromptForCleanupTarget) {
    const candidates = await findCleanupCandidates(admin, options.tag);
    const selected = await promptCleanupCandidate(candidates, options.tag);
    target = buildTargetFromCandidate(selected);
    preloadedDocuments = selected.documents;
    matchedCases = selected.cases;
    if (!options.yes) {
      const confirmed = await confirmCleanup(selected, options.tag);
      if (!confirmed) {
        console.log(JSON.stringify({ aborted: true, reason: 'cleanup-cancelled' }, null, 2));
        return;
      }
    }
  } else if ((command === 'list' || command === 'cleanup') && options.recipientEmail && !options.caseId) {
    const profile = await resolveProfile(admin, options.recipientEmail);
    const participantScope = await listParticipantDummyDocuments(admin, profile, options.tag);
    target = {
      profile,
      caseRecord: null,
      matchedCases: participantScope.matchedCases,
    };
    preloadedDocuments = participantScope.documents;
    matchedCases = participantScope.matchedCases;
  } else {
    target = await resolveTarget(admin, options);
  }

  if (command === 'list') {
    const documents = preloadedDocuments ?? await listDummyDocuments(admin, target, options);
    console.log(JSON.stringify({
      bucket: DEFAULT_BUCKET,
      tag: options.tag,
      recipient: target.profile.email,
      case: target.caseRecord,
      matchedCases: matchedCases ?? target.matchedCases ?? (target.caseRecord ? [target.caseRecord] : []),
      documents,
    }, null, 2));
    return;
  }

  if (command === 'inject') {
    const injected = await injectDummyDocument(admin, target, options);
    console.log(JSON.stringify({
      bucket: DEFAULT_BUCKET,
      recipient: target.profile.email,
      case: target.caseRecord,
      injected,
      cleanupHint: `pnpm dummy:beta-files cleanup --case-id ${target.caseRecord.id} --tag ${options.tag}`,
    }, null, 2));
    return;
  }

  if (command === 'cleanup') {
    const documents = preloadedDocuments ?? await listDummyDocuments(admin, target, options);
    if (!documents.length) {
      console.log(JSON.stringify({
        bucket: DEFAULT_BUCKET,
        recipient: target.profile.email,
        case: target.caseRecord,
        matchedCases: matchedCases ?? target.matchedCases ?? [],
        tag: options.tag,
        matchedDocuments: [],
        result: { deletedCount: 0, storageDeletedCount: 0 },
      }, null, 2));
      return;
    }

    if (!shouldPromptForCleanupTarget && !options.yes) {
      const confirmed = await confirmCleanup({
        recipientEmail: target.profile.email,
        recipientName: target.profile.full_name ?? target.profile.email,
        caseCount: matchedCases?.length ?? target.matchedCases?.length ?? (target.caseRecord ? 1 : new Set(documents.map((item) => item.case_id)).size),
        documentCount: documents.length,
      }, options.tag);
      if (!confirmed) {
        console.log(JSON.stringify({ aborted: true, reason: 'cleanup-cancelled' }, null, 2));
        return;
      }
    }

    const result = await cleanupDummyDocuments(admin, documents);
    console.log(JSON.stringify({
      bucket: DEFAULT_BUCKET,
      recipient: target.profile.email,
      case: target.caseRecord,
      matchedCases: matchedCases ?? target.matchedCases ?? (target.caseRecord ? [target.caseRecord] : []),
      tag: options.tag,
      matchedDocuments: documents.map((item) => ({ id: item.id, title: item.title, storage_path: item.storage_path })),
      result,
    }, null, 2));
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});