-- Migration 0082: audit_logs retention policy via pg_cron
-- 로그 중요도별 보관 기간:
--   critical  → 730일 (2년) 보존
--   business  → 365일 (1년) 보존
--   ops       → 60일 보존
--   unknown   → 30일 (정책 미정의 이벤트는 단기 보존)

-- pg_cron 확장이 없으면 건너뜀
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN

    -- 기존 동명 job 있으면 제거 후 재등록
    PERFORM cron.unschedule('audit_logs_retention_cleanup')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'audit_logs_retention_cleanup'
    );

    PERFORM cron.schedule(
      'audit_logs_retention_cleanup',
      '0 3 * * *',   -- 매일 새벽 3시
      $$
        -- 1. business 이벤트: 365일 초과 삭제
        DELETE FROM public.audit_logs
        WHERE action IN (
          'case.updated', 'case.created_via_csv', 'case.hub_linked', 'case.hub_unlinked',
          'document.added', 'document.deleted', 'document.approved', 'document.rejected',
          'collaboration.proposed', 'collaboration.approved', 'collaboration.rejected',
          'hub.created', 'hub.participant_joined', 'hub.participant_left',
          'case.shared', 'case.share_revoked'
        )
        AND created_at < NOW() - INTERVAL '365 days';

        -- 2. ops 이벤트: 60일 초과 삭제
        DELETE FROM public.audit_logs
        WHERE action IN (
          'member.invitation_resent',
          'notification.sent', 'invitation.sent'
        )
        AND created_at < NOW() - INTERVAL '60 days';

        -- 3. 정책 미정의(unknown) 이벤트: 30일 초과 삭제
        DELETE FROM public.audit_logs
        WHERE action NOT IN (
          -- critical
          'staff_temp_credential.issued', 'staff_temp_credential.reissued', 'staff_temp_credential.revoked',
          'client_temp_credential.issued', 'client_temp_credential.reissued', 'client_temp_credential.revoked',
          'member.invited', 'member.invitation_revoked', 'member.role_changed',
          'member.permission_changed', 'member.removed', 'member.password_reset_flagged',
          'case.created', 'case.status_changed', 'case.soft_deleted', 'case.restored',
          'case.archived', 'case.handler_changed',
          'billing.entry_created', 'billing.entry_updated', 'billing.entry_deleted',
          'agreement.created', 'agreement.updated', 'agreement.deleted',
          'payment.recorded', 'payment.corrected',
          'subscription.toggled', 'subscription.expiry_changed', 'service.locked', 'service.unlocked',
          -- business
          'case.updated', 'case.created_via_csv', 'case.hub_linked', 'case.hub_unlinked',
          'document.added', 'document.deleted', 'document.approved', 'document.rejected',
          'collaboration.proposed', 'collaboration.approved', 'collaboration.rejected',
          'hub.created', 'hub.participant_joined', 'hub.participant_left',
          'case.shared', 'case.share_revoked',
          -- ops
          'member.invitation_resent', 'notification.sent', 'invitation.sent'
        )
        AND created_at < NOW() - INTERVAL '30 days';
      $$
    );

    RAISE NOTICE 'audit_logs_retention_cleanup job scheduled (daily 03:00)';
  ELSE
    RAISE NOTICE 'pg_cron not installed — skipping audit_logs retention job';
  END IF;
END;
$$;
