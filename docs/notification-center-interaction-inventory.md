# CTA Inventory (Notifications)

검수 기준 파일:
- `src/app/(app)/notifications/page.tsx`
- `src/components/notification-section-with-popup.tsx`
- `src/components/notification-row-cta.tsx`
- `src/components/notifications-archive-button.tsx`
- `src/components/notifications/immediate-delete-form.tsx`

| CTA | trigger | action | target | transition | failure | groupKey |
|---|---|---|---|---|---|---|
| 요약카드 즉시필요 | click/tap/enter | executeInteractionByKey | `notifications.summary.immediate` | URL `state=active#immediate` 반영 | navigation 실패 시 브라우저 오류 | `notification-summary-cards` |
| 요약카드 검토필요 | click/tap/enter | executeInteractionByKey | `notifications.summary.confirm` | URL `state=active#confirm` 반영 | navigation 실패 시 브라우저 오류 | `notification-summary-cards` |
| 요약카드 미팅알림 | click/tap/enter | executeInteractionByKey | `notifications.summary.meeting` | URL `state=active#meeting` 반영 | navigation 실패 시 브라우저 오류 | `notification-summary-cards` |
| 요약카드 기타알림 | click/tap/enter | executeInteractionByKey | `notifications.summary.other` | URL `state=active#other` 반영 | navigation 실패 시 브라우저 오류 | `notification-summary-cards` |
| notification row 열기(섹션 프리뷰/팝업) | click/tap | executeInteractionByKey | `notifications.open` + `openHref` | open route 진입, 대상 알림 read/status 반영 가능 | open route 예외 시 `/notifications` fallback | `notification-row-open` |
| notification row 열기(보관함 row) | click/tap | executeInteractionByKey | `notifications.open` + `openHref` | open route 진입, 대상 알림 read/status 반영 가능 | open route 예외 시 `/notifications` fallback | `notification-row-open` |
| row 읽음 처리 | click/tap | executeInteractionByKey | `notifications.markRead` | `active -> read` | API 실패 시 inline 에러 | `notification-row-mutate` |
| row 해결 처리 | click/tap | executeInteractionByKey | `notifications.resolve` | `active/read -> resolved` | API 실패 시 inline 에러 | `notification-row-mutate` |
| row 보관함 이동 | click/tap | executeInteractionByKey | `notifications.archive` | `resolved -> archived` | guard/API 실패 시 inline 에러 | `notification-row-mutate` |
| 섹션 카드 전체보기 | click/tap | local state mutate | popup open | `popupOpen false -> true` | 실패 처리 없음(UI no-op) | `notification-section-popup` |
| 섹션 카드 더보기 | click/tap | local state mutate | popup open | `popupOpen false -> true` | 실패 처리 없음(UI no-op) | `notification-section-popup` |
| popup 닫기(overlay) | click/tap | local state mutate | popup close | `popupOpen true -> false` | 실패 처리 없음(UI no-op) | `notification-section-popup` |
| popup 닫기(버튼) | click/tap | local state mutate | popup close | `popupOpen true -> false` | 실패 처리 없음(UI no-op) | `notification-section-popup` |
| 보관함 드롭다운 열기/닫기 | click/tap | local state mutate | dropdown toggle | `open false <-> true` | 실패 처리 없음(UI no-op) | `notification-archive-menu` |
| 보관함 전체 보기 | click/tap/enter | Link navigate | `/notifications?state=archived` | archived view 전환 | navigation 실패 시 브라우저 오류 | `notification-archive-menu` |
| 수신 설정 저장 | submit | server action mutate | `updateNotificationChannelPreferenceAction` | preference 반영 | server action error feedback | `notification-settings` |
| 보관함 비우기 | confirm submit | destructive mutate | `emptyNotificationTrashAction` | archived rows -> deleted | server action error feedback | `notification-trash-actions` |
| archived row 영구삭제(별도 컴포넌트) | submit | destructive mutate | `permanentlyDeleteNotificationAction` | `archived -> deleted` | server action error feedback | `notification-row-mutate` |
