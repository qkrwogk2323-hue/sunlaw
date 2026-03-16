# 구 스키마 → v2 스키마 매핑

## 1. 사용자

1. `public.users` → `auth.users` + `public.profiles`
2. `users.role` → `profiles.platform_role` + `organization_memberships.role` + `case_clients`

## 2. 조직

1. `test_organizations` → `organizations`
2. `test_organization_members` 계열이 없던 구조 → `organization_memberships`

## 3. 사건

1. `test_cases` → `cases`
2. `test_case_handlers` → `case_handlers`
3. `test_case_clients` → `case_clients`
4. `test_case_parties` → `case_parties`
5. 주민등록번호, 상세주소 → `case_party_private_profiles`

## 4. 소송/문서/기일/회수

1. `test_lawsuit_submissions` 일부 역할 → `case_documents`
2. `test_schedules` → `case_schedules`
3. `test_recovery_activities` → `case_recovery_activities`
4. `test_individual_notifications` → `notifications`

## 5. 이관 순서

1. `auth.users` 기준 사용자 정합성 정리
2. `profiles` 생성 또는 동기화
3. 조직 생성 후 멤버십 적재
4. 사건을 조직 단위로 분류해 `organization_id`를 채움
5. 사건 하위 테이블을 모두 `organization_id` 포함 구조로 적재
6. 민감정보는 평문 컬럼에서 제거하고 암호화 후 `case_party_private_profiles`로 이동
7. 검증 완료 후 기존 평문 컬럼 삭제

## 6. 주의사항

1. 구 스키마의 `resident_number`, `id_card_url` 같은 평문 필드는 그대로 이관하면 안 된다.
2. `organization_id`를 채울 수 없는 레코드는 이관 전에 소유 조직 기준을 먼저 정의해야 한다.
3. `service_role`로 일괄 적재하는 경우에도 적재 후 반드시 RLS 기반 사용자 계정으로 샘플 검증을 수행해야 한다.
