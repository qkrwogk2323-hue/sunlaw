-- 알림 중복 방지: 같은 조직·수신자·액션라벨·대상·날짜 조합에 하루 1건만 허용
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_daily_dedup
  ON public.notifications (
    organization_id,
    recipient_profile_id,
    action_label,
    action_target_id,
    (created_at::date)
  )
  WHERE action_label IS NOT NULL AND action_target_id IS NOT NULL;
