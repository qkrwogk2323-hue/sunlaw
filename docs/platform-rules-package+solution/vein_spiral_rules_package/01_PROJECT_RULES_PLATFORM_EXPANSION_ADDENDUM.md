# PROJECT_RULES 플랫폼·결제·허브·검색·암호화 확장 삽입문안

## 1. 삽입 위치

1. 카테고리 1 끝에 `1-6`부터 `1-12`까지 추가한다.
2. 카테고리 2 끝에 `2-8`부터 `2-13`까지 추가한다.
3. 카테고리 3 끝에 `3-15`부터 `3-22`까지 추가한다.
4. 카테고리 4 끝에 `4-5`부터 `4-8`까지 추가한다.
5. 카테고리 5 끝에 `5-5`부터 `5-9`까지 추가한다.
6. 카테고리 6 절대 금지 목록에 추가 금지 항목을 반영한다.
7. 새 기능 구현 전 체크리스트에 추가 항목을 반영한다.

## 2. 카테고리 1 삽입문안

### 1-6. 플랫폼 관리자 권한 분리 규칙

공동 규칙:

1. 플랫폼 관리자 판정은 기존 `app.is_platform_admin()` 또는 동등 함수로 수행한다.
2. 플랫폼 관리자 권한은 다음 세부 권한으로 분리한다.
   1. `platform_org_approve`
   2. `platform_org_suspend`
   3. `platform_org_expel`
   4. `platform_org_delete_prepare`
   5. `platform_org_delete_execute`
   6. `platform_org_restore`
   7. `platform_support_manage`
   8. `platform_billing_override`
   9. `platform_security_view`
   10. `platform_csv_restore_execute`
3. 플랫폼 조직 소속 관리자라 하더라도 위 세부 권한이 없으면 해당 기능을 실행할 수 없다.
4. `platform_org_delete_execute` 는 `platform_org_delete_prepare` 이후 `24시간` 이내에만 실행할 수 있다.
5. `platform_org_delete_execute` 수행 시 `reason_code`, `reason_text`, `snapshot_export_id`, `actor_profile_id`, `executed_at` 기록이 없으면 실행할 수 없다.

### 1-7. 조직 생성 승인 권한 규칙

공동 규칙:

1. 조직 생성 승인 액션은 `organization_signup_requests` 기반으로만 처리한다.
2. 승인 가능 주체는 `platform_org_approve = true` 인 플랫폼 관리자만 허용한다.
3. 승인 결정은 `approve`, `reject`, `request_changes`, `cancelled` 중 하나로 표준화한다.
4. 승인 시 다음 필드를 반드시 기록한다.
   1. `reviewed_by`
   2. `reviewed_at`
   3. `review_note`
   4. `approved_organization_id`
   5. `approved_modules`
   6. `approved_trial_days`
5. 조직 생성 승인 처리 시간 SLA는 `p95 <= 24h`, 긴급 승인은 `p95 <= 2h` 로 관리한다.
6. 승인 누락률 `U = unreviewed_pending_requests_older_than_24h / total_pending_requests` 는 `0.05` 이하를 유지해야 한다.

### 1-8. 고객관리센터 권한 및 SLA 규칙

공동 규칙:

1. 고객관리센터 접근 가능 역할은 `platform_support_manage = true` 인 플랫폼 관리자 또는 플랫폼 지원 담당자로 제한한다.
2. 고객센터 티켓 우선순위는 `security`, `billing_lock`, `org_blocker`, `data_restore`, `general` 로 고정한다.
3. 티켓 우선순위 점수는 `PriorityScore = 100*security + 60*billing_lock + 40*org_blocker + 25*data_restore + 10*general` 로 계산한다.
4. `security=1` 이면 최초 응답 SLA는 `2h`, `billing_lock=1` 이면 `4h`, 그 외는 `24h` 를 기본으로 한다.
5. 고객센터 대화, 상태 변경, 내부 메모, AI 요약, 해결 처리 이력은 모두 로그로 남겨야 한다.
6. 고객센터 티켓은 닫기 전 반드시 `resolution_code` 와 `resolution_summary` 를 남겨야 한다.

### 1-9. 플랫폼 조직의 조직 추방 및 삭제 규칙

공동 규칙:

1. 추방 `expel` 은 즉시 hard delete 가 아니라 `organizations.lifecycle_status = 'soft_deleted'` 와 접근 정지로 처리한다.
2. 추방 시 다음 작업을 같은 트랜잭션 또는 보장된 작업 체인으로 수행한다.
   1. 조직 상태 `soft_deleted`
   2. 활성 멤버십 `suspended`
   3. 새 로그인 차단
   4. 활성 허브 쓰기 차단
   5. CSV 복구 스냅샷 생성
   6. 감사 로그 기록
3. 삭제 준비 `delete_prepare` 는 snapshot export 완료 전에는 허용하지 않는다.
4. 삭제 실행 `delete_execute` 는 다음 조건을 모두 만족할 때만 허용한다.
   1. `legal_hold = 0`
   2. `snapshot_export_exists = 1`
   3. `audit_export_exists = 1`
   4. `open_incident_count = 0`
5. hard purge 는 별도 물리 삭제 작업으로 분리하며, 물리 삭제 이후에도 감사 로그와 복구 CSV 메타데이터는 보존해야 한다.
6. `organization_purge` 이후 복구는 live row 복원이 아니라 CSV replay 복원으로 처리한다.

### 1-10. 사용자 조직 권한 계층 규칙

공동 규칙:

1. 역할 우선순위는 `org_owner > org_manager > org_staff > client` 로 고정한다.
2. `org_owner` 는 조직 설정, 권한 변경, 결제 관리, 문서 보관 정책, 연동 해제 승인 권한을 가진다.
3. `org_manager` 는 사건, 문서, 일정, 허브, 요청, 청구에 대한 운영 권한을 가지되 조직 삭제와 결제 플랜 변경은 할 수 없다.
4. `org_staff` 는 부여된 permission template 범위 내에서만 작업한다.
5. `client` 는 포털과 사건 허브의 공개 범위 내 기능만 사용한다.
6. 조직 멤버십이 `active` 가 아닌 경우 쓰기 액션은 모두 차단한다.
7. 유효 권한 계산식은 `EffectivePermission = TemplatePermission + Grants - Denies` 로 정의한다.
8. `Deny` 는 항상 `Grant` 보다 우선한다.

### 1-11. 플랫폼 지원과 플랫폼 운영의 분리 규칙

공동 규칙:

1. `platform_support_manage` 와 `platform_org_delete_execute` 는 기본적으로 같은 사용자에게 동시에 부여하지 않는 것을 원칙으로 한다.
2. 동일 사용자에게 양쪽 권한을 부여하는 경우 `dual_role_justification` 기록이 있어야 한다.
3. 보안 사고, 결제 잠금, 데이터 복구, 조직 추방은 서로 다른 감사 이벤트 타입으로 분리 기록해야 한다.

### 1-12. 플랫폼 청구 기간 조정 권한 규칙

공동 규칙:

1. 플랫폼 관리자는 조직별 유료 전환 유예 일수를 수동 조정할 수 있다.
2. 수동 조정 값 `override_days` 허용 범위는 `0 <= override_days <= 365` 로 한다.
3. 실제 유예 만료일은 `trial_start_at + 7일 + override_days` 로 계산한다.
4. 수동 조정은 `changed_by`, `changed_at`, `previous_override_days`, `new_override_days`, `reason_code` 를 남겨야 한다.

## 3. 카테고리 2 삽입문안

### 2-8. 상태변경 액션 중복 방지 규칙

1. 상태변경 액션 중복 반영률 `D = duplicated_persisted_rows / unique_client_request_id_count` 는 반드시 `0`이어야 한다.
2. 모든 생성, 전송, 제출, 승인, 초대, 채팅, 알림, 해결 처리 액션은 `client_request_id` 또는 `client_message_id` 를 포함해야 한다.
3. 서버는 동일 키를 한 번만 처리해야 한다.
4. 채팅 전송은 최소 `channel_id + client_message_id` 조합의 유일성 제약을 가져야 한다.
5. 실시간 구독과 낙관적 업데이트는 서버 `id` 기준으로 중복 제거해야 한다.

### 2-9. DB 연결고리 강화 규칙

1. 필수 연결고리 무결성 점수 `FKIntegrity = valid_required_edges / total_required_edges` 는 `1`이어야 한다.
2. 필수 연결고리는 최소 다음을 포함한다.
   1. `organization_memberships.organization_id -> organizations.id`
   2. `cases.organization_id -> organizations.id`
   3. `case_clients.case_id -> cases.id`
   4. `case_hubs.case_id -> cases.id`
   5. `case_hub_members.hub_id -> case_hubs.id`
   6. `client_access_requests.target_organization_id -> organizations.id`
3. 연결고리 위반 상태는 `valid`, `soft_violation`, `hard_violation`, `quarantined` 로 구분한다.
4. `soft_violation` 은 읽기는 허용하되 신규 쓰기를 제한하고, 자동 복구 작업을 생성한다.
5. `hard_violation` 은 해당 객체의 핵심 액션을 차단하고 플랫폼 관리자에게 알린다.
6. `quarantined` 는 일반 사용자와 조직 사용자에게 숨기고 플랫폼 관리자만 볼 수 있게 한다.
7. 연결고리 위반 자동 복구 성공률 `RepairSuccess = repaired_edges / detected_violations` 는 `0.95` 이상을 목표로 한다.

### 2-10. 문서 보관 및 물리 삭제 규칙

1. 문서와 사건은 `retention_class` 와 `lifecycle_status` 로 관리한다.
2. 문서 보관 클래스는 기존 enum `commercial_10y`, `document_5y`, `litigation_25y`, `permanent` 를 따른다.
3. 물리 삭제 가능 조건은 `retention_expired = 1`, `legal_hold = 0`, `snapshot_export_exists = 1` 을 모두 만족해야 한다.
4. 보관 가능성 점수 `ArchiveEligibility = retention_expired * (1 - legal_hold) * snapshot_export_exists` 가 `1` 일 때만 purge 대기열에 넣는다.
5. 문서 `storage_path` 를 변경하는 모든 작업은 감사 로그에 남겨야 한다.
6. `client_visibility` 가 `client_visible` 인 문서는 보관, 복구, 삭제 시 의뢰인 노출 상태 변화를 별도 로그로 남겨야 한다.

### 2-11. 개인정보 암호화 규칙

1. 개인정보 등급은 `P0`, `P1`, `P2`, `P3` 로 구분한다.
2. `P0` 는 공개 정보, `P1` 은 내부 기본 정보, `P2` 는 민감 내부 정보, `P3` 는 고위험 식별정보로 정의한다.
3. `P3` 필드는 반드시 암호문 컬럼으로 저장해야 한다.
4. 주민번호, 사업자등록번호 원문, 상세 주소, 계좌번호, 고위험 식별 토큰은 `P3` 로 분류한다.
5. 암호화 방식은 `AES-256-GCM` 기반 envelope encryption 또는 동등 수준 이상으로 한다.
6. 검색이 필요한 민감 필드는 원문 검색을 금지하고 `HMAC-SHA-256` 기반 결정적 검색 토큰을 별도 저장한다.
7. 평문 로그 노출 횟수 `PlaintextLeakCount` 는 반드시 `0`이어야 한다.
8. 키 버전 `key_version` 을 저장하고, 키 회전 주기는 `90일` 이하를 기본값으로 한다.
9. 키 회전 성공률 `KeyRotationSuccess = rotated_rows / target_rows` 는 `0.999` 이상이어야 한다.

### 2-12. 감사 로그 및 CSV 복구 규칙

1. 모든 플랫폼 핵심 액션은 DB 감사 로그와 CSV 복구 패키지 양쪽에 반영되어야 한다.
2. 최소 보존 로그 범주는 다음과 같다.
   1. row change log
   2. platform decision log
   3. security event log
   4. support ticket event log
   5. billing state log
   6. AI action log
3. CSV 복구 패키지는 조직 단위로 생성하며, 최소 `manifest`, `organization`, `memberships`, `cases`, `case_clients`, `documents`, `hubs`, `hub_members`, `notifications`, `audit_hash_chain` 파일을 포함해야 한다.
4. 복구 완전성 점수 `RestoreCompleteness = restored_rows / exported_rows` 는 `1`이어야 한다.
5. 복구 순서는 `manifest -> organizations -> profiles -> memberships -> cases -> case_clients -> documents -> hubs -> hub_members -> notifications -> derived rebuild` 로 고정한다.
6. CSV 패키지는 tamper detection 을 위해 `sha256` 해시와 파일별 row count 를 포함해야 한다.

### 2-13. 점진적 룰 변경 및 레거시 처리 규칙

1. 모든 대형 룰 변경은 `observe`, `warn`, `block` 의 3단계 강제 모드로 적용한다.
2. `observe` 단계에서는 위반을 기록만 하고 차단하지 않는다.
3. `warn` 단계에서는 사용자에게 경고를 노출하되 핵심 업무를 즉시 차단하지 않는다.
4. `block` 단계에서만 실제 차단을 수행한다.
5. 단계 전환 조건식 `RuleGatePass = migration_success * backfill_success * rollback_test * latency_budget_pass * violation_rate_pass` 가 `1` 이어야 다음 단계로 올릴 수 있다.
6. `migration_success`, `rollback_test`, `latency_budget_pass` 는 불리언 값이다.
7. `backfill_success` 는 `backfilled_rows / target_rows >= 0.999` 일 때 `1` 이다.
8. `violation_rate_pass` 는 `shadow_violation_rate <= 0.001` 일 때 `1` 이다.
9. 레거시 정책, 레거시 파일, 레거시 enum, 레거시 route 는 `legacy_inventory` 목록에 등록 후 제거한다.
10. 등록되지 않은 레거시 자산을 암묵적으로 삭제해서는 안 된다.

## 4. 카테고리 3 삽입문안

### 3-15. 의뢰인-조직-사건 허브 연결 규칙

공동 규칙:

1. 허브 연결 무결성 점수 `HubLinkIntegrity = valid_hub_links / total_hub_links` 는 `1`이어야 한다.
2. `case_hubs.case_id` 는 사건당 `1개`만 허용한다.
3. `case_hubs.primary_client_id` 가 존재하는 경우 해당 프로필은 같은 사건의 의뢰인 연결체인 안에서 검증 가능해야 한다.
4. 의뢰인 연결체인은 최소 `organization -> case -> case_client -> profile -> case_hub` 검증을 통과해야 한다.
5. 연결 생성, 변경, 해제는 모두 감사 로그에 기록해야 한다.
6. 허브 좌석 상한은 `collaborator_limit`, `viewer_limit` 을 초과할 수 없다.

### 3-16. 의뢰인 연결 해제 및 붕 뜬 의뢰인 처리 규칙

공동 규칙:

1. 해제 상태는 `linked`, `detaching`, `orphaned_pending_assignment`, `archived` 로 구분한다.
2. 허브에서 의뢰인 연결을 해제하려면 다음 중 하나를 만족해야 한다.
   1. 대체 primary client 가 이미 지정됨
   2. 사건이 `closed` 또는 `archived`
   3. 플랫폼 관리자 또는 조직 소유자가 해제 승인
3. `orphaned_pending_assignment` 상태의 의뢰인은 일반 목록에서 숨기지 말고 복구 큐에 표시해야 한다.
4. 붕 뜬 의뢰인 복구 시간 `OrphanRecoveryHours` 의 `p95` 는 `72h` 이하를 목표로 한다.
5. `orphaned_pending_assignment` 가 `7일`을 초과하면 플랫폼 알림을 발생시켜야 한다.
6. 해제 직후 남는 데이터는 다음 중 하나로 이동해야 한다.
   1. 다른 사건에 재연결
   2. 동일 조직의 미할당 의뢰인 풀
   3. 보관 상태
7. 해제는 물리 삭제가 아니라 상태 전이와 참조 재배치로 우선 처리한다.

### 3-17. 의뢰인 케어감 계산 규칙

공동 규칙:

1. 연결된 의뢰인의 케어감 점수 `ClientCareScore` 는 `0`부터 `100` 사이 실수로 계산한다.
2. 계산식은 다음과 같다.

`ClientCareScore = 100 * (0.25*R + 0.20*N + 0.15*S + 0.15*D + 0.10*M + 0.10*H + 0.05*P)`

3. 각 변수 정의는 다음과 같다.
   1. `R = clamp(1 - unanswered_client_hours / 48, 0, 1)`
   2. `N = 1` if `next_client_visible_action_due_at` exists and `<= 7일`, else `0.5` if `<= 14일`, else `0`
   3. `S = min(upcoming_client_visible_schedule_count / 2, 1)`
   4. `D = clamp(1 - max(last_client_visible_update_days - 7, 0) / 21, 0, 1)`
   5. `M = clamp(1 - unread_client_message_count / 5, 0, 1)`
   6. `H = 1` if `assigned_primary_handler_id` exists else `0`
   7. `P = 1` if `payment_or_billing_summary_visible = true` else `0`
4. 등급 구간은 다음과 같다.
   1. `90~100 = A`
   2. `75~89 = B`
   3. `60~74 = C`
   4. `0~59 = D`
5. `ClientCareScore < 60` 인 경우 케어 경고를 발생시켜야 한다.
6. `ClientCareScore` 는 허브, 포털, 내부 담당자 목록에서 동일 공식을 사용해야 한다.

### 3-18. 각 메뉴 검색 기능 규칙

공동 규칙:

1. 검색 적용률 `SearchCoverage = searchable_menus / total_primary_menus` 는 `1`이어야 한다.
2. 각 1차 메뉴는 최소 `제목`, `식별자`, `관련자`, `상태` 중 2개 이상 필드를 검색할 수 있어야 한다.
3. 로컬 검색 debounce 는 `150ms`, 서버 검색 debounce 는 `250ms` 를 기본값으로 한다.
4. 서버 검색 `p95` 응답 시간은 `400ms` 이하, 로컬 검색 `p95` 응답 시간은 `150ms` 이하를 목표로 한다.
5. 검색 결과가 0건일 때는 원인과 다음 행동을 함께 제시해야 한다.
6. 검색어 길이 제한은 `min_chars = 1`, `max_chars = 100` 으로 한다.
7. 한국어, 영어, 사건번호, 이메일, 전화번호 토큰 검색을 지원해야 한다.

PC 전용 규칙:

1. PC에서는 목록 상단 고정 검색바 또는 헤더 통합 검색을 사용할 수 있다.
2. 결과 패널은 좌측 목록, 우측 상세 구조를 허용한다.

모바일 전용 규칙:

1. 모바일에서는 목록 상단 고정 검색창을 기본으로 한다.
2. 키보드 노출 시 첫 결과와 CTA가 가려지지 않아야 한다.
3. 검색 아이콘만 있고 실제 입력란이 숨겨진 상태를 기본값으로 두어서는 안 된다.

### 3-19. 유료화 및 결제 잠금 규칙

공동 규칙:

1. 조직용 서비스는 전면 유료화를 기본 원칙으로 하며, 무료 사용은 체험 기간에 한해 허용한다.
2. 구독 상태는 `trialing`, `active`, `past_due`, `locked_soft`, `locked_hard`, `cancelled` 로 구분한다.
3. 기본 무료 체험 기간은 `7일` 이다.
4. 실제 체험 만료일은 `trial_start_at + 7일 + override_days` 로 계산한다.
5. `override_days` 는 플랫폼 관리자가 조정할 수 있으며 `0 <= override_days <= 365` 를 만족해야 한다.
6. 구독 결제 수단은 최소 다음을 허용한다.
   1. `card`
   2. `bank_transfer`
   3. `virtual_account`
   4. `manual_invoice`
7. 자동 갱신은 `card`, `bank_transfer` 에서만 허용하고, `virtual_account`, `manual_invoice` 는 회차별 확정 결제로 처리한다.
8. `locked_soft` 상태에서는 로그인, 결제, 고객센터, 데이터 내보내기만 허용한다.
9. `locked_hard` 상태에서는 로그인, 결제, 고객센터만 허용한다.
10. 잠금 전이식은 다음과 같다.
   1. `trialing -> active` if paid
   2. `trialing -> locked_soft` if unpaid and trial expired
   3. `locked_soft -> locked_hard` if unpaid for additional `72h`
   4. `locked_* -> active` if paid and payment confirmed
11. 결제 재활성화 복구 시간 `BillingUnlockTime` 의 `p95` 는 `10분` 이하를 목표로 한다.
12. 잠금 상태 변화는 모두 감사 로그와 결제 상태 로그에 남겨야 한다.

### 3-20. 시스템 최적화 규칙

공동 규칙:

1. 모바일 LCP는 `2.5s` 이하, INP는 `200ms` 이하, CLS는 `0.10` 이하를 목표로 한다.
2. 주요 목록 쿼리 `p95` 는 `250ms` 이하, 상세 조회 `p95` 는 `300ms` 이하를 목표로 한다.
3. 메뉴 오픈 `p95` 는 PC `180ms`, 모바일 `240ms` 이하를 목표로 한다.
4. 라우트별 초기 JS 예산은 모바일 기준 gzip `220KB` 이하를 목표로 한다.
5. 대시보드 1차 응답 `TTFB p95` 는 `600ms` 이하를 목표로 한다.
6. 검색과 알림, 허브 활동 피드는 페이지네이션 또는 접기 전략을 가져야 한다.
7. 성능 회귀율 `PerfRegression = (new_p95 - baseline_p95) / baseline_p95` 가 `0.10` 을 초과하면 배포 차단 사유로 본다.

### 3-21. 마케팅 홈 프리미엄화 규칙

공동 규칙:

1. 프리미엄 홈 점수 `PremiumHomeScore` 는 `0`부터 `100` 사이로 계산한다.
2. 계산식은 다음과 같다.

`PremiumHomeScore = 100 * (0.22*C + 0.18*A + 0.15*P + 0.15*L + 0.15*R + 0.15*F)`

3. 각 변수 정의는 다음과 같다.
   1. `C = 1` if hero headline `<= 14단어` and subheadline `<= 18단어` and primary_cta_count = 1 else `0.5` or `0`
   2. `A = min(authority_proof_block_count / 3, 1)`
   3. `P = min(case_study_or_customer_proof_count / 4, 1)`
   4. `L = clamp(1 - max(mobile_lcp_seconds - 2.0, 0) / 1.5, 0, 1)`
   5. `R = 1` if refund_or_trial_or_risk_reversal_block_exists else `0`
   6. `F = clamp(1 - friction_field_count / 6, 0, 1)`
4. 첫 화면 Above-the-fold 블록 수는 `5개` 이하여야 한다.
5. 첫 화면 Primary CTA 수는 정확히 `1개`, Secondary CTA 수는 최대 `1개` 로 제한한다.
6. 가격표는 `2 scroll` 이내에 도달 가능해야 한다.
7. 홈의 시각 설계는 프리미엄감을 이유로 행동 의미와 속도를 희생해서는 안 된다.

### 3-22. AI 도입 규칙

공동 규칙:

1. AI 적용률 `AICoverage = ai_enabled_primary_menus / total_primary_menus` 는 단계적으로 `0.60` 이상을 목표로 한다.
2. AI 기능은 `read_assist`, `draft_assist`, `triage_assist`, `summary_assist`, `search_assist` 로 구분한다.
3. 플랫폼 메뉴 AI는 조직 승인 요약, 로그 이상치 탐지, 고객센터 분류, 결제 잠금 안내를 제공해야 한다.
4. 조직 메뉴 AI는 사건 요약, 문서 초안, 일정 요약, 의뢰인 커뮤니케이션 초안, 허브 활동 요약을 제공해야 한다.
5. 의뢰인 메뉴 AI는 사건 상태 설명, 다음 단계 설명, 문서 의미 설명, 일정 안내를 제공해야 한다.
6. AI는 irreversible action 을 직접 실행해서는 안 되며, 항상 최종 확인 단계를 거쳐야 한다.
7. AI 액션 로그는 `actor_role`, `menu`, `prompt_class`, `output_class`, `accepted`, `executed`, `latency_ms` 를 기록해야 한다.
8. AI 개인정보 노출률 `AIPILeak = ai_outputs_with_plaintext_p3 / total_ai_outputs` 는 반드시 `0` 이어야 한다.

## 5. 카테고리 4 삽입문안

### 4-5. 오류 메시지 현지화 및 설명 가능 규칙

1. 오류 설명 완전성 점수 `E = title + cause + next_action + single_language` 는 반드시 `4`여야 한다.
2. 한국어 UI에서는 오류 메시지를 한국어만 사용해야 한다.
3. raw database error, stack trace, internal code, 영문 예외 객체 문구를 직접 노출해서는 안 된다.
4. 권한 오류는 필요한 권한 또는 필요한 조직 문맥을 명시해야 한다.
5. 인증 오류는 재로그인 또는 세션 갱신 경로를 제시해야 한다.
6. 네트워크 오류는 재시도 경로를 제시해야 한다.

### 4-6. 알림 의미 명시 및 행동 연결 규칙

1. `정보` 알림 의미 점수 `N_info = summary + context + reason + timestamp` 는 `4`여야 한다.
2. `조치 필요`, `경고`, `긴급` 알림 의미 점수 `N_action = summary + context + reason + urgency + action_needed + deep_link` 는 `6`이어야 한다.
3. 행동 필요 여부는 `지금 처리 필요`, `참조용`, `나중에 처리 가능` 중 하나로 명시해야 한다.
4. `조직 소통 화면에서 확인` 같이 이유와 행동이 없는 문구는 금지한다.
5. 행동이 필요한 알림은 반드시 deep link 또는 즉시 실행 가능한 Primary CTA를 가져야 한다.
6. `읽음 처리` 와 `조치 완료` 는 같은 의미로 합쳐서는 안 된다.

### 4-7. 플랫폼 로그 라우팅 규칙

1. 어떤 로그를 어디로 보내는지는 `platform_log_sink_matrix.csv` 를 기준으로 한다.
2. DB row change 는 `audit.change_log` 로 저장한다.
3. 플랫폼 결정 로그는 `audit.platform_action_log` 또는 동등 테이블로 저장한다.
4. 보안 이벤트 로그는 `audit.security_event_log` 또는 동등 테이블로 저장한다.
5. 고객센터 이벤트는 `support_ticket_events` 또는 동등 테이블로 저장한다.
6. 구독·결제 상태 변화는 `billing_subscription_events` 또는 동등 테이블로 저장한다.
7. 일별 CSV export 는 object storage 또는 동등 보관소에 저장한다.
8. 로그 전달 실패율 `LogDeliveryFailure = failed_events / total_events` 는 `0.001` 이하를 목표로 한다.

### 4-8. 모바일 알림 카드 규칙

1. 모바일 알림 카드는 첫 화면에서 다음 5개를 모두 보여야 한다.
   1. 무슨 일이 일어났는지
   2. 어떤 조직 또는 사건과 관련되는지
   3. 왜 내가 이 알림을 받았는지
   4. 지금 행동이 필요한지
   5. 어디로 가면 바로 해결되는지
2. `신규`, `일반` 배지만으로 중요도와 행동 필요 여부를 대체해서는 안 된다.
3. Primary CTA 높이는 `40px` 이상이어야 한다.
4. 목적지 화면이 준비되지 않았거나 권한이 없으면 이유와 대체 경로를 함께 제공해야 한다.

## 6. 카테고리 5 삽입문안

### 5-5. 플랫폼 운영 아키텍처 규칙

1. 플랫폼 조직은 승인, 지원, 보안, 결제, 복구, 추방, 삭제를 담당하는 control plane 으로 정의한다.
2. 사용자 조직은 사건, 문서, 일정, 허브, 의뢰인, 청구를 담당하는 tenant plane 으로 정의한다.
3. control plane 과 tenant plane 간 직접 쓰기 경로는 감사 로그 없이 허용해서는 안 된다.
4. 플랫폼 강제 작업은 항상 `actor_profile_id`, `target_organization_id`, `reason_code` 를 남겨야 한다.

### 5-6. CSV 복구 아키텍처 규칙

1. 모든 조직은 복구용 CSV 패키지를 생성할 수 있어야 한다.
2. 복구 패키지 파일 목록과 복구 순서는 `organization_restore_package_matrix.csv` 를 기준으로 한다.
3. CSV replay 복구는 idempotent 해야 한다.
4. 동일 restore batch 를 두 번 실행해도 최종 결과가 달라져서는 안 된다.
5. 복구 후 `RestoreCompleteness = 1` 과 `FKIntegrity = 1` 을 모두 만족해야 한다.

### 5-7. 결제 아키텍처 규칙

1. 구독 결제 상태는 사건 청구 도메인과 분리된 별도 구독 도메인으로 관리한다.
2. 결제 상태 변경은 UI, API, 배치 어느 경로에서 발생해도 같은 상태 머신을 사용해야 한다.
3. 플랫폼 수동 기간 연장은 상태 머신 외부의 임시 해킹이 아니라 정식 `override_days` 필드로 관리해야 한다.
4. 잠금 상태에서도 결제, 고객센터, 로그아웃, 관리자 문의 경로는 항상 열어야 한다.

### 5-8. 검색 아키텍처 규칙

1. 각 메뉴 검색은 메뉴별 로컬 검색과 서버 검색을 분리해 설계한다.
2. 검색 기준 필드는 `menu_search_matrix.csv` 를 기준으로 한다.
3. PII 가 포함된 필드는 원문 full text search 를 금지하고, 허용된 검색 토큰만 사용한다.
4. 검색 로그는 원문 검색어 전체를 영구 저장하지 않고, 필요 시 마스킹 또는 토큰화해 저장한다.

### 5-9. AI 보조 아키텍처 규칙

1. AI는 `suggest`, `summarize`, `classify`, `explain`, `draft` 만 수행한다.
2. AI가 직접 `approve`, `reject`, `delete`, `purge`, `billing_unlock`, `membership_remove` 를 실행해서는 안 된다.
3. AI 출력은 role, case, organization, client visibility 범위를 넘어서면 안 된다.
4. AI는 각 메뉴에서 latency budget 을 가져야 하며, `p95 <= 2000ms` 를 목표로 한다.

## 7. 카테고리 6 절대 금지 목록 추가 문안

1. `client_request_id` 없는 상태변경 액션
2. 같은 사용자 입력으로 같은 채팅 메시지, 댓글, 알림이 2회 이상 저장되는 구조
3. `의뢰인 연동` 클릭 시 의뢰인 관리 화면 이동으로만 끝나는 구조
4. 조직 관련 알림에 `조직 미지정` 상태가 보이는 구조
5. 한국어 화면에 영어 시스템 오류가 섞여 직접 노출되는 구조
6. `해결 처리`, `처리하기`, `확인` 같은 추상 Primary CTA
7. 현재 조직명이 보이지 않는 모바일 보호 화면
8. snapshot export 없이 조직 hard purge 를 수행하는 구조
9. restore hash 검증 없이 CSV 복구를 실행하는 구조
10. AI가 irreversible action 을 자동 실행하는 구조
11. 모바일 메뉴가 레이아웃을 밀어내며 열리는 애니메이션
12. 잠금 상태에서 결제 화면까지 막아 버리는 구조

## 8. 새 기능 구현 전 체크리스트 추가 문안

1. 상태변경 액션에 `client_request_id` 또는 동등 키가 있는가?
2. 동일 액션이 DB와 UI에 중복 반영되지 않는가?
3. 현재 조직명이 모든 보호 화면에서 항상 보이는가?
4. 조직 전환이 URL 기반 문맥 전환과 서버 재검증으로 처리되는가?
5. 모바일 조직 전환 UI가 `Bottom Sheet` 또는 `Full-screen Sheet` 인가?
6. 모든 필수 필드에 빨간 `*` 와 상단 안내 문구가 있는가?
7. Primary CTA 와 실제 결과가 1:1 대응하는가?
8. `의뢰인 연동` 이 실제 연동 플로우를 여는가?
9. 사용자 오류 메시지가 한 언어로만 표시되고 원인과 다음 행동을 포함하는가?
10. 알림 카드가 요약, 문맥, 행동 필요 여부, deep link 를 포함하는가?
11. 모바일 핵심 버튼이 최소 `44px x 44px` 를 만족하는가?
12. `FKIntegrity = 1` 을 만족하는가?
13. `RestoreCompleteness = 1` 검증 경로가 있는가?
14. 구독 잠금 상태에서도 결제와 고객센터 경로가 열려 있는가?
15. AI 출력이 권한 범위를 넘지 않는가?
