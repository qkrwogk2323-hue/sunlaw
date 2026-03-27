# Contract Defect List (Notifications)

요청된 결함 유형만 기록.

| defect type | 상태 | 내용 | 파일 |
|---|---|---|---|
| key 없이 직접 실행되는 CTA | 위반 | 보관함 전체 보기 CTA가 interaction key 없이 `Link href` 직접 이동 | `src/components/notifications-archive-button.tsx` |
| runActionByKey 직접 호출 | 정상 | notifications 도메인 UI에서 직접 호출 없음 (`executeInteractionByKey` 내부만 사용) | `src/components/notification-row-cta.tsx`, `src/components/notification-section-with-popup.tsx` |
| router.push 직접 호출 | 정상 | notifications 도메인 코드에서 직접 호출 없음 | `src/app/(app)/notifications/**`, `src/components/notifications-*` |
| state 불일치 | 부분 위반 | row mutate는 key 계약으로 통일됐지만 보관함/설정 CTA는 stateKey 연계 없이 개별 실행 | `src/components/notifications-archive-button.tsx`, `src/app/(app)/notifications/page.tsx` |
| mixed인데 정의 없는 경우 | 위반 | `notifications.open`은 실제로 mutate(read/status) + navigate 혼합이나 registry type이 `navigate`로만 정의 | `src/lib/interactions/registry.ts`, `src/app/(app)/notifications/open/[notificationId]/route.ts` |
