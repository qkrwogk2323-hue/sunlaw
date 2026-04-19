# 전체 사이트 전수 조사 보고서

> 작성: 2026-04-19
> 방법: 3개 병렬 에이전트 (카운트 불일치 / 알림 destination / revalidatePath·RLS)
> 트리거: 대시보드 알림 카테고리 카운트 불일치 수정(0194634) 후, 동일 패턴 전수 스캔

---

## 요약

| 조사 영역 | 항목 수 | 결과 |
|---|---|---|
| 카운트/수치 불일치 | 7종 | ❌ **2건 불일치** (미납 청구 + 진행 중 사건) |
| 알림 destination 경로 | 23종 | ✅ 전부 정상 |
| revalidatePath 누락 | 전체 server action | ✅ 이상 없음 |
| 사일런트 실패 | 전체 try-catch | ✅ 전부 의도적 (알림 실패 ≠ 핵심 차단) |
| 포털 RLS 경계 | portal 전체 | ✅ admin client 오용 0건 |

**P0 0건, P1 2건** (필터 조건 불일치).

---

## ❌ 불일치 2건 상세

### 1. 미납 청구 수 (`pendingBillingCount`) — P1

**표시 A (대시보드)**:
- `src/lib/queries/dashboard.ts:362-366`
- `loadDashboardCoreSections` → `billing_entries.status IN ('draft', 'issued', 'partial')`

**표시 B (리포트)**:
- `src/lib/queries/dashboard.ts:738-742`
- `getDashboardStats` → `billing_entries.status IN ('pending', 'overdue')`

**문제**: 같은 변수명 `pendingBillingCount`인데 필터가 완전히 다름.
- A: "아직 처리 안 된 항목" (초안+발행+부분입금)
- B: "문제 있는 항목" (대기+연체)
- 두 숫자가 다르게 나올 수밖에 없음

**영향**: 대시보드 "미수금 N건"과 `/billing` 리포트 카드 숫자가 다름.

---

### 2. 진행 중 사건 수 (`activeCases`) — P1

**표시 A (대시보드)**:
- `src/lib/queries/dashboard.ts:290-294`
- `loadDashboardCoreSections` → `case_status NOT IN ('closed', 'archived')` AND `lifecycle_status != 'soft_deleted'`

**표시 B (리포트)**:
- `src/lib/queries/dashboard.ts:722-725`
- `getDashboardStats` → `lifecycle_status != 'soft_deleted'` AND `case_status IN ('active', 'pending')`

**문제**: 부정 필터 vs 긍정 필터.
- A: closed/archived 빼고 전부 (intake, active, pending, review 등 다 포함)
- B: active/pending만 (intake, review 등 제외)
- case_status에 intake, review 같은 중간 상태가 있으면 A > B

**영향**: 대시보드 "진행 중 사건 N건"과 리포트 사건 수가 다름.

---

## ✅ 정상 확인 영역

### 알림 destination (23/23 정상)
모든 NOTIFICATION_TYPES의 destination_url → 실제 page.tsx 존재 + 관련 데이터 렌더 + 파라미터 치환 정상.

### revalidatePath
모든 server action이 DB 변경 후 revalidatePath 호출. 누락 없음.

### 사일런트 실패
3곳의 try-catch (notifyDocumentStakeholders, billing client 알림, contract signature 직원 알림)는 전부 의도적 — 알림 실패가 핵심 로직(문서/청구/서명 저장)을 차단하지 않도록 설계.

### 포털 RLS
portal 페이지 전체가 `createSupabaseServerClient` 사용 + `profile_id=auth.user.id` 또는 `is_portal_enabled=true` 필터. admin client 오용 0건.

---

## 수정 계획

### P1-1: `pendingBillingCount` 필터 통일

**방향**: 대시보드와 리포트가 같은 의미("미처리 청구")를 전달해야 함.
`['draft', 'issued', 'partial']`이 "아직 완료 안 된 항목"으로 더 포괄적이므로 이쪽을 기준으로 통일.

**변경**: `getDashboardStats`의 billing 쿼리를 `['draft', 'issued', 'partial']`로 교정.

### P1-2: `activeCases` 필터 통일

**방향**: "진행 중 사건"의 정의를 하나로 고정.
대시보드의 `NOT IN ('closed', 'archived')`가 더 포괄적(intake/review 포함)이므로 이쪽을 기준으로 통일.

**변경**: `getDashboardStats`의 cases 쿼리를 `case_status NOT IN ('closed', 'archived')`로 교정.
