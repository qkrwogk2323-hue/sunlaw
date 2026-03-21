# 수식·임계치·상태머신 총정리

## 1. 핵심 품질 지표

1. 중복 반영률  
`D = duplicated_persisted_rows / unique_client_request_id_count`  
허용값 `0`

2. 연결고리 무결성  
`FKIntegrity = valid_required_edges / total_required_edges`  
허용값 `1`

3. 복구 완전성  
`RestoreCompleteness = restored_rows / exported_rows`  
허용값 `1`

4. 평문 노출률  
`PlaintextLeakRate = plaintext_p3_exposures / total_p3_access_events`  
허용값 `0`

5. 로그 전달 실패율  
`LogDeliveryFailure = failed_events / total_events`  
허용값 `<= 0.001`

6. 성능 회귀율  
`PerfRegression = (new_p95 - baseline_p95) / baseline_p95`  
허용값 `<= 0.10`

## 2. 의뢰인 케어감 계산

1. 공식  
`ClientCareScore = 100 * (0.25*R + 0.20*N + 0.15*S + 0.15*D + 0.10*M + 0.10*H + 0.05*P)`

2. 변수
1. `R = clamp(1 - unanswered_client_hours / 48, 0, 1)`
2. `N = 1` if `next_client_visible_action_due_at <= 7일`, `0.5` if `<= 14일`, else `0`
3. `S = min(upcoming_client_visible_schedule_count / 2, 1)`
4. `D = clamp(1 - max(last_client_visible_update_days - 7, 0) / 21, 0, 1)`
5. `M = clamp(1 - unread_client_message_count / 5, 0, 1)`
6. `H = 1` if `assigned_primary_handler_id exists` else `0`
7. `P = 1` if `payment_or_billing_summary_visible = true` else `0`

3. 등급
1. `90~100 = A`
2. `75~89 = B`
3. `60~74 = C`
4. `0~59 = D`

4. 자동 조치
1. `ClientCareScore < 60` 이면 케어 경고 생성
2. `ClientCareScore < 40` 이면 조직 관리자와 플랫폼 지원센터에 동시 알림

## 3. 고객센터 우선순위 점수

1. 공식  
`PriorityScore = 100*security + 60*billing_lock + 40*org_blocker + 25*data_restore + 10*general`

2. 해석
1. `PriorityScore >= 100` 이면 최초 응답 `2h`
2. `60 <= PriorityScore < 100` 이면 최초 응답 `4h`
3. `25 <= PriorityScore < 60` 이면 최초 응답 `12h`
4. 그 외 `24h`

## 4. 프리미엄 홈 점수

1. 공식  
`PremiumHomeScore = 100 * (0.22*C + 0.18*A + 0.15*P + 0.15*L + 0.15*R + 0.15*F)`

2. 변수
1. `C = 1` if hero headline `<= 14단어` and subheadline `<= 18단어` and primary_cta_count = 1 else `0.5` or `0`
2. `A = min(authority_proof_block_count / 3, 1)`
3. `P = min(case_study_or_customer_proof_count / 4, 1)`
4. `L = clamp(1 - max(mobile_lcp_seconds - 2.0, 0) / 1.5, 0, 1)`
5. `R = 1` if refund_or_trial_or_risk_reversal_block_exists else `0`
6. `F = clamp(1 - friction_field_count / 6, 0, 1)`

3. 배포 기준
1. `PremiumHomeScore >= 80`
2. `mobile_lcp_seconds <= 2.5`
3. `primary_cta_count = 1`
4. `above_the_fold_block_count <= 5`

## 5. 결제 상태머신

1. 상태
1. `trialing`
2. `active`
3. `past_due`
4. `locked_soft`
5. `locked_hard`
6. `cancelled`

2. 전이
1. `trialing -> active` if `payment_confirmed = 1`
2. `trialing -> locked_soft` if `trial_expired = 1` and `payment_confirmed = 0`
3. `locked_soft -> locked_hard` if `hours_since_soft_lock > 72` and `payment_confirmed = 0`
4. `locked_soft -> active` if `payment_confirmed = 1`
5. `locked_hard -> active` if `payment_confirmed = 1`
6. `active -> past_due` if `billing_cycle_failed = 1`
7. `past_due -> locked_soft` if `hours_since_past_due > 72`
8. `active -> cancelled` if `cancel_confirmed = 1`

3. 체험 만료식
`trial_end_at = trial_start_at + 7일 + override_days`

4. 잠금 허용 경로
1. `locked_soft`: login, billing, support, export
2. `locked_hard`: login, billing, support

## 6. 검색 성능 공식

1. 서버 검색 성공 기준  
`SearchServerPass = 1 if search_p95_ms <= 400 else 0`

2. 로컬 검색 성공 기준  
`SearchLocalPass = 1 if search_p95_ms <= 150 else 0`

3. 검색 적용률  
`SearchCoverage = searchable_menus / total_primary_menus`  
허용값 `1`

## 7. 규칙 변경 게이트

1. 공식  
`RuleGatePass = migration_success * backfill_success * rollback_test * latency_budget_pass * violation_rate_pass`

2. 불리언 판정
1. `migration_success = 1` if migration applied in staging and prod candidate
2. `backfill_success = 1` if `backfilled_rows / target_rows >= 0.999`
3. `rollback_test = 1` if rollback dry-run success
4. `latency_budget_pass = 1` if `PerfRegression <= 0.10`
5. `violation_rate_pass = 1` if `shadow_violation_rate <= 0.001`

3. `RuleGatePass = 1` 일 때만 `observe -> warn`, `warn -> block` 전환 가능

## 8. AI 적용 지표

1. AI 적용률  
`AICoverage = ai_enabled_primary_menus / total_primary_menus`

2. AI 개인정보 누출률  
`AIPILeak = ai_outputs_with_plaintext_p3 / total_ai_outputs`  
허용값 `0`

3. AI 효용 점수  
`AIUtility = time_saved_minutes / baseline_task_minutes`  
목표값 `>= 0.25`

4. AI 지연 예산  
`ai_p95_latency_ms <= 2000`
