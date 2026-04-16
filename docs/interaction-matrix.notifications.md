# Interaction Matrix — Notifications

> 작성: 2026-04-16
> 지위: 리뷰어 권고로 신설된 **13컬럼 확장형 샘플**. 이후 모든 도메인은 이 포맷으로 interaction-matrix 확장.
> 상위 문서: `docs/interaction-matrix.md` (프로젝트 전역 요약)
> 페이지 스펙: `docs/page-specs/notifications.md`

| interaction_key | 트리거 | 위치 | 사용자 | 노출 조건 | 비활성 조건 | 타입 | 결과 | 로딩 UX | 성공 UX | 실패 UX | 감사/로그 | 파일 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `NOTIFICATIONS_ARCHIVE_LIST` | 보관함 버튼 클릭 | `/notifications` 우상단 | 인증 사용자 | 항상 | 없음 | navigate | `resolveInteractionHref(INTERACTION_KEYS.NOTIFICATIONS_ARCHIVE_LIST)` → `/notifications?state=archived` | 팝오버 open/close만 반영 | toast 없음 | route resolve 실패 시 버튼 숨김 + 콘솔/로그 | `archive_list_open` | `src/components/notifications-archive-button.tsx` |
| `NOTIFICATIONS_ARCHIVE_LIST` | 보관함 전체 보기 링크 클릭 | 보관함 팝오버 내부 | 인증 사용자 | `archivedCount > 0` | `archivedCount === 0` | navigate | archived 필터 화면 이동 | 링크 클릭 후 팝오버 닫힘 | toast 없음 | 링크 대상 없으면 렌더 금지 | `archive_list_navigate` | `src/components/notifications-archive-button.tsx` |
| `NOTIFICATIONS_MARK_READ` | 읽음 버튼 클릭 | 알림 행 우측 | 인증 사용자 | `is_read = false` | 저장 중 | mutate | 현재 행 `is_read=true` 반영 | 버튼 disabled + spinner | success toast 없음 | `읽음 처리에 실패했습니다.` toast | `notification_mark_read` | `src/components/notification-row-cta.tsx` |
| `NOTIFICATIONS_RESOLVE` | 해결 버튼 클릭 | 알림 행 우측 | 인증 사용자 | `resolvable = true` | 저장 중 또는 권한 없음 | mutate | 상태 `resolved` 반영 + feed 재계산 | 버튼 disabled + spinner | `알림을 처리 완료로 변경했습니다.` toast | `알림 상태를 변경하지 못했습니다.` toast | `notification_resolve` | `src/components/notification-row-cta.tsx` |
| `notifications.open` | 행 본문 클릭 | 알림 리스트 행 전체 | 인증 사용자 | `target_route 존재` | 권한 없음 또는 target 없음 | mixed | 필요한 경우 mark-read 후 대상 route 이동 | 행 CTA disabled + skeleton 없음 | success toast 없음 | 권한 없음이면 대체 문구 또는 이동 차단 | `notification_open` | `src/components/notification-row-cta.tsx` |
| `NOTIFICATIONS_ARCHIVE` | 보관 버튼 클릭 | 알림 행 드롭다운 또는 보조 CTA | 인증 사용자 | `archivable = true` | 저장 중 | mutate | 상태 `archived` 반영, 기본 목록에서 제거 | 버튼 disabled + spinner | `알림을 보관함으로 이동했습니다.` toast | `보관 처리에 실패했습니다.` toast | `notification_archive` | `src/components/notification-row-cta.tsx` |
| `notifications.filter.state` | 상태 필터 변경 | 상단 필터 영역 | 인증 사용자 | 항상 | 조회 중 | navigate | query param 변경 후 목록 재조회 | 필터만 disabled | toast 없음 | 조회 실패 시 인라인 오류 배너 | `notifications_filter_change` | `src/app/(app)/notifications/page.tsx` |
| `notifications.refresh` | 새로고침 클릭 | 오류 배너/상단 | 인증 사용자 | 조회 오류 시 | 로딩 중 | mutate | feed 재조회 | 버튼 disabled + spinner | toast 없음 | `알림을 다시 불러오지 못했습니다.` toast | `notifications_refresh` | `src/app/(app)/notifications/page.tsx` |

## 점검 체크리스트
1. 결과 경로가 `src/lib/routes/registry.ts` 또는 `src/lib/routes/navigation-map.ts`에 존재하는가
2. interaction_key가 `src/lib/interactions/registry.ts`에 존재하는가
3. 직접 href 문자열 또는 직접 query string 조립을 제거했는가
4. `data-interaction-key`가 추적 대상 CTA에 부착됐는가
5. 고빈도 액션에 success toast를 남발하지 않았는가
6. 실패 시 사용자 문구가 raw error를 그대로 노출하지 않는가
