# Contract Defect List (Notifications)

요청된 결함 유형만 기록.

| defect type | 상태 | 내용 | 파일 |
|---|---|---|---|
| key 없이 직접 실행되는 CTA | 해결됨 (2026-04-15) | 보관함 전체 보기 CTA가 `NOTIFICATIONS_ARCHIVE_LIST` interaction key + `resolveInteractionHref` 경유로 이동 | `src/components/notifications-archive-button.tsx` |
| runActionByKey 직접 호출 | 정상 | notifications 도메인 UI에서 직접 호출 없음 (`executeInteractionByKey` 내부만 사용) | `src/components/notification-row-cta.tsx`, `src/components/notification-section-with-popup.tsx` |
| router.push 직접 호출 | 정상 | notifications 도메인 코드에서 직접 호출 없음 | `src/app/(app)/notifications/**`, `src/components/notifications-*` |
| state 불일치 | 해결됨 (2026-04-15) | 보관함 CTA가 `NOTIFICATION_STATE_KEYS.ARCHIVED`를 registry `state`에서 resolve → `?state=archived` 자동 부착, stateKey 계약 준수 | `src/components/notifications-archive-button.tsx`, `src/lib/interactions/registry.ts` |
| mixed인데 정의 없는 경우 | 정상 | `notifications.open`은 registry에서 `INTERACTION_TYPES.MIXED`로 정의됨 (mutate: read/status 기록 + navigate) | `src/lib/interactions/registry.ts:62` |

## 2026-04-15 수정 요약

- `NOTIFICATIONS_ARCHIVE_LIST` interaction key 신설 (notifications-keys.ts + registry.ts)
- 보관함 CTA 컴포넌트가 `resolveInteractionHref` + `data-interaction-key` 사용으로 전환
- URLSearchParams 직접 조립 코드 제거 → registry의 `state.state = 'archived'` 정의로 이관

## 재검토 체크리스트

- [x] `INTERACTION_REGISTRY`에 `NOTIFICATIONS_ARCHIVE_LIST` 엔트리 포함
- [x] 보관함 CTA의 `href`가 `resolveInteractionHref`로부터 유도
- [x] `data-interaction-key` attribute가 추적 가능하도록 두 곳(Button + Link)에 부착
- [x] typecheck / vitest 263 passed 유지
