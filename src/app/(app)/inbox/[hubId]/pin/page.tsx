import Link from 'next/link';
import type { Route } from 'next';
import { ArrowLeft, Lock, LockOpen } from 'lucide-react';
import { notFound } from 'next/navigation';
import { buttonStyles } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';
import { getEffectiveOrganizationId, requireAuthenticatedUser } from '@/lib/auth';
import { getCollaborationHubDetail } from '@/lib/queries/collaboration-hubs';
import { generateCollaborationHubPinAction, updateCollaborationHubPinAction } from '@/lib/actions/organization-actions';

/**
 * @rule-meta-start
 * surfaceScope: organization
 * requiresAuth: true
 * requiresTraceability: false
 * traceEntity: collaboration_hub_pin
 * @rule-meta-end
 */
export const dynamic = 'force-dynamic';

export default async function CollaborationHubPinPage({
  params,
  searchParams
}: {
  params: Promise<{ hubId: string }>;
  searchParams?: Promise<{ generated?: string }>;
}) {
  const { hubId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const auth = await requireAuthenticatedUser();
  const organizationId = getEffectiveOrganizationId(auth);
  if (!organizationId) notFound();

  const hub = await getCollaborationHubDetail(hubId, organizationId);
  if (!hub) notFound();

  const generatedPin = `${resolvedSearchParams?.generated ?? ''}`.trim();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">조직허브 PIN 관리</h1>
          <p className="mt-2 text-sm text-slate-600">{hub.title}에 들어갈 4자리 PIN을 관리합니다.</p>
        </div>
        <Link href={`/inbox/${hub.id}` as Route} className={buttonStyles({ variant: 'secondary', className: 'min-h-11 rounded-xl px-4' })}>
          <ArrowLeft className="size-4" /> 조직허브로 돌아가기
        </Link>
      </div>

      {generatedPin ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
          <p className="font-semibold">이건 완료했습니다.</p>
          <p className="mt-1">새 PIN이 생성되었습니다. 이번 한 번만 확인할 수 있습니다.</p>
          <div className="mt-3 inline-flex min-h-12 items-center rounded-2xl border border-emerald-200 bg-white px-5 text-2xl font-bold tracking-[0.45em] text-slate-950">
            {generatedPin}
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2">
            {hub.accessPinEnabled ? <Lock className="size-5 text-amber-600" /> : <LockOpen className="size-5 text-emerald-600" />}
            <h2 className="text-lg font-semibold text-slate-950">{hub.accessPinEnabled ? 'PIN 잠금 사용 중' : 'PIN 잠금 해제'}</h2>
          </div>
          <p className="mt-2 text-sm text-slate-600">참여 중인 조직만 허브에 들어오고, 그 다음 4자리 PIN으로 한 번 더 확인합니다.</p>

          <ClientActionForm action={generateCollaborationHubPinAction} successTitle="PIN이 자동 생성되었습니다." className="mt-5">
            <input type="hidden" name="hubId" value={hub.id} />
            <input type="hidden" name="organizationId" value={organizationId} />
            <SubmitButton pendingLabel="생성 중...">PIN 자동 생성</SubmitButton>
          </ClientActionForm>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">직접 저장 또는 잠금 해제</h2>
          <p className="mt-2 text-sm text-slate-600">4자리 숫자를 저장하면 새 PIN으로 바뀌고, 비워 두고 저장하면 잠금이 해제됩니다.</p>

          <ClientActionForm action={updateCollaborationHubPinAction} successTitle="PIN 설정이 저장되었습니다." className="mt-5 space-y-3">
            <input type="hidden" name="hubId" value={hub.id} />
            <input type="hidden" name="organizationId" value={organizationId} />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="collaboration-hub-manage-pin">4자리 PIN</label>
              <Input id="collaboration-hub-manage-pin" name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} placeholder="비워두면 잠금 해제" />
            </div>
            <SubmitButton variant="secondary" pendingLabel="저장 중...">저장</SubmitButton>
          </ClientActionForm>
        </section>
      </div>
    </div>
  );
}
