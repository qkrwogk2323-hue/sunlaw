# Consistency Matrix (Notifications)

필수 그룹 점검:
- `notification-row-open`
- `notification-row-mutate`
- `notification-section-popup`

| groupKey | interaction type | 실제 코드 구현 방식 | 계약 일치 여부 | 근거 |
|---|---|---|---|---|
| `notification-row-open` | mixed | `NotificationRowCta`가 `executeInteractionByKey(notifications.open)` 호출 후 openHref로 이동 | 부분 일치 | `src/components/notification-row-cta.tsx`, `src/app/(app)/notifications/open/[notificationId]/route.ts` |
| `notification-row-mutate` | mutate | `읽음/해결/보관` 모두 `executeInteractionByKey` + `actionKey` 실행 | 일치 | `src/components/notification-row-cta.tsx`, `src/lib/interactions/registry.ts`, `src/lib/actions/run-action-by-key.ts` |
| `notification-section-popup` | mutate(UI) | popup open/close를 `setPopupOpen`으로 통일 | 일치 | `src/components/notification-section-with-popup.tsx` |

추가 그룹:

| groupKey | interaction type | 실제 코드 구현 방식 | 계약 일치 여부 | 근거 |
|---|---|---|---|---|
| `notification-summary-cards` | navigate | 4카드 모두 interaction key 기반 execute | 일치 | `src/components/notifications-summary-cards.tsx` |
| `notification-archive-menu` | mixed | toggle/close mutate + 전체보기 Link navigate | 부분 일치 | `src/components/notifications-archive-button.tsx` |
