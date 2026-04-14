# Veinspiral 총체적 난국 해소 지시서

## 1. 현재 판정

현재 상태는 `실서비스 투입 불가`에서 `내부 테스트용 가능`으로 올라온 수준이다. 1차 배포 차단 결함 상당수는 이미 정리됐지만, 운영 재현성, 문서 영속화, DB 최종 방어선, 핵심 E2E가 아직 닫히지 않았다.

## 2. 이미 끝난 것

1. 마이그레이션 체계는 forward-only 기준으로 정리됐다.
2. `rate_limit_buckets`와 `create_case_atomic`은 hotfix migration 방식으로 분리됐다.
3. 페이지 가드와 서버 액션 가드는 `requireCaseAccess` / `checkCaseActionAccess`로 상당 부분 수렴됐다.
4. `app.can_access_case`와 rehab RLS 11개 정책, 핵심 복합 FK 일부가 들어갔다.
5. 사건 생성은 `create_case_atomic` RPC 기준 원자화됐다.
6. `rehabilitation/page.tsx`의 `profile_id` 경로, `section_number` 조회 불일치가 교정됐다.
7. `general-signup`, `temp-login`, `action-integration` 등 일부 테스트 계약이 현재 구현에 맞게 재작성됐다.

## 3. 아직 남은 핵심 결함

1. `rehabilitation_prohibition_orders`가 원격 드리프트 상태다. migration에는 정의돼 있으나 원격 DB에는 없어서 관련 액션이 실제 실행 시 실패한다.
2. `app.can_access_case`와 RLS 정합화가 rehab 일부 테이블 중심으로만 끝났다. 사건 전체 하위 테이블과 도산 공통 테이블까지 마지막 방어선이 확장되지 않았다.
3. 복합 FK는 `rehabilitation_applications`, `rehabilitation_creditors`까지만 들어갔다. 다른 rehab/insolvency 테이블은 여전히 조직-사건 위조 입력 여지가 있다.
4. 문서 생성은 여전히 사건 문서함과 영속 이력으로 연결되지 않은 구간이 남아 있다.
5. 핵심 E2E는 아직 실사용 흐름을 완결형으로 잠그지 못했다.
6. full CI green 상태가 문서화된 증거로 고정돼 있지 않다. 부분 테스트 통과와 전체 파이프라인 통과는 다르다.

## 4. 총체적 난국 해소를 위한 최종 지시

### 4.1 운영 재현성 고정

1. `supabase/migrations/20260410000001~20260410000012`는 박제된 초기 상태로 취급한다.
2. 이후 DB 변경은 무조건 새 timestamp migration으로만 추가한다.
3. production에 수동 SQL을 넣었다면 같은 내용을 즉시 forward-only migration으로 승격시킨다.
4. `supabase_migrations.schema_migrations`는 로컬이 아니라 migration 파일이 정본이다. 원격 히스토리 삭제 후 재삽입 같은 수동 재구성은 금지한다.
5. 완료 기준은 `fresh DB apply`, `기존 DB upgrade`, `production`이 같은 14개 migration 경로로 수렴하는 것이다.

### 4.2 보안 경계 완성

1. `app.can_access_case`를 기준 함수로 고정한다.
2. 다음 테이블의 RLS를 전부 `app.can_access_case(case_id)` 또는 동등한 기준으로 통일한다.
   1) `case_clients`
   2) `case_parties`
   3) `case_schedules`
   4) `case_documents`
   5) `case_requests`
   6) `insolvency_creditors`
   7) `insolvency_assets`
   8) `insolvency_income`
   9) `insolvency_correction_notices`
   10) `rehabilitation_*` 전 테이블
3. 앱 가드, 서버 액션 가드, DB RLS의 기준 문구를 하나로 맞춘다.
4. `assigned_cases_only`와 `all_org_cases` 정책이 페이지, 액션, DB에서 동일하게 작동하는지 실제 사용자 계정 2종으로 검증한다.
5. 완료 기준은 `비배정 사용자`가 URL, POST, SQL 경유 어느 경로로도 사건 하위 자원에 접근하지 못하는 것이다.

### 4.3 DB 무결성 완성

1. `(case_id, organization_id) -> cases(id, organization_id)` 복합 FK를 다음 테이블까지 확장한다.
   1) `rehabilitation_creditor_settings`
   2) `rehabilitation_properties`
   3) `rehabilitation_property_deductions`
   4) `rehabilitation_family_members`
   5) `rehabilitation_income_settings`
   6) `rehabilitation_affidavits`
   7) `rehabilitation_plan_sections`
   8) `rehabilitation_secured_properties`
   9) `insolvency_*` 중 `case_id`, `organization_id`를 함께 가진 테이블 전체
2. `organizations.source_signup_request_id`, `case_clients.last_linked_hub_id` 같은 주요 참조 컬럼 FK 누락도 단계적으로 복구한다.
3. FK 추가 전 기존 데이터 mismatch를 SQL로 먼저 0건 확인하고, 그 결과를 migration 코멘트나 운영 문서에 남긴다.
4. 완료 기준은 위조된 `organizationId`로 회생·파산 데이터를 저장하려 할 때 앱이 아니라 DB가 최종 차단하는 것이다.

### 4.4 원격 드리프트 복구

1. `rehabilitation_prohibition_orders` 누락은 별도 hotfix migration으로 즉시 복구한다.
2. migration 정의와 원격 실테이블 존재 여부를 비교하는 drift 점검 스크립트를 추가한다.
3. `upsertProhibitionOrder` 실행 경로에 대해 실DB 기준 smoke test를 붙인다.
4. 완료 기준은 관련 액션이 production에서 더 이상 relation-not-found로 실패하지 않는 것이다.

### 4.5 사건 코어 읽기 경로 일치

1. `case_handlers` 저장과 조회 계약을 일치시킨다. 조회 쿼리에서 `handlers: []` 같은 하드코딩 반환은 제거한다.
2. handler role 값은 `case_manager` 하나로 고정하고 기존 데이터도 백필한다.
3. `getCaseDetailSections()`와 관련 화면이 실제 저장된 담당자 관계를 읽도록 수정한다.
4. 완료 기준은 사건 생성 직후 담당자, 관리조직, 의뢰인 연결이 모든 상세 화면에서 동일하게 보이는 것이다.

### 4.6 개인회생·파산 모듈 안정화

1. `rehabilitation/page.tsx`의 프리필 수정이 다른 쿼리·액션·탭 DTO와 충돌하지 않는지 전수 확인한다.
2. `client_private_profiles`를 읽는 별도 안전 경로를 설계한다. 서버 컴포넌트에서 암호화 필드를 무리하게 직접 복호화하지 않는다.
3. 회생·파산 subtype 강제를 모든 write action과 문서 생성 경로까지 유지한다.
4. `rehabilitation_prohibition_orders` 복구 후 금지명령 관련 흐름도 같은 기준으로 다시 테스트한다.
5. 완료 기준은 회생 사건에서만 회생 화면과 저장, 파산 사건에서만 파산 화면과 저장이 작동하는 것이다.

### 4.7 문서 생성 영속화

1. HTML Blob 즉시 다운로드 구조를 종료한다.
2. 문서 생성은 서버 액션에서 수행하고, 결과물을 스토리지에 저장하며, `case_documents` 행을 함께 남기게 바꾼다.
3. 생성 문서의 버전, 생성 시각, 생성자, 원본 데이터 스냅샷 또는 재생성 키를 저장한다.
4. UI 다운로드 버튼은 Blob이 아니라 저장된 문서 아티팩트를 내려받게 바꾼다.
5. 완료 기준은 사건 하나에 대해 문서 생성 이력, 재다운로드, 재생성 근거가 남는 것이다.

### 4.8 테스트 계약과 CI 복구

1. CI gate를 다음 순서로 고정한다.
   1) `node scripts/check-migrations.mjs`
   2) fresh DB migration apply
   3) upgrade path migration apply
   4) `pnpm typecheck`
   5) `pnpm vitest run`
   6) 핵심 Playwright smoke
   7) `pnpm build`
2. `action-integration`처럼 현재 구현 계약과 다른 테스트는 즉시 전수 정리한다.
3. 인증 API는 mocked route test와 live integration test를 분리한다.
4. 권한 테스트는 반드시 `전체 사건 접근 사용자`와 `배정 사건만 접근 사용자` 두 계정을 써서 검증한다.
5. 완료 기준은 핵심 파이프라인이 CI에서 red/green을 명확히 가르고, 수동 설명 없이 실패 원인을 읽을 수 있는 것이다.

### 4.9 지금 당장 추가할 테스트 12개

1. fresh DB에 14개 migration 전체 apply 테스트
2. 이미 squash 적용된 DB에 hotfix만 upgrade apply 테스트
3. `/api/auth/general-signup` live integration에서 1~5회 201, 6회 429 검증
4. `/api/auth/temp-login/sign-in` live integration에서 정상/임계치 초과 검증
5. 비배정 사용자의 `cover` URL 접근 차단 E2E
6. 비배정 사용자의 `rehabilitation` URL 접근 차단 E2E
7. 비배정 사용자의 `bankruptcy` URL 접근 차단 E2E
8. 비배정 사용자의 rehab action POST 차단 테스트
9. `create_case_atomic` 실패 시 4개 테이블 전부 롤백 테스트
10. 회생 신청인 프리필이 `profile_id -> profiles` 경로로 복원되는지 테스트
11. `rehabilitation_prohibition_orders` CRUD smoke test
12. 문서 생성 후 `case_documents`와 스토리지 아티팩트가 동시에 남는 통합 테스트

### 4.10 로컬 규율 정리

1. `package-lock.json`은 계속 금지하고 `pnpm-lock.yaml`만 정본으로 유지한다.
2. `.gitignore`에 추가한 `.pnpm-store`, `coverage`, `dist`, `.turbo`는 유지한다.
3. rollback legacy 파일은 archive로만 보관하고 실행 경로에서 제거한다.
4. 임시 메모, QA 산출물, 참조 ZIP은 커밋 정책을 분리한다.
5. 완료 기준은 개발자 로컬마다 다른 잔재 때문에 결과가 달라지지 않는 것이다.

## 5. 금지 사항

1. 이미 적용된 squash migration 본문을 다시 편집해 문제를 덮지 말 것
2. production에만 수동 SQL을 넣고 migration 파일 반영을 미루지 말 것
3. UI에서 링크만 숨기고 권한이 해결됐다고 판단하지 말 것
4. `failClosed`를 꺼서 인증 장애를 숨기지 말 것
5. type error를 `string | null`에서 `string`으로 바꾸는 식의 선언 봉합으로 끝내지 말 것
6. 부분 테스트 몇 개 통과를 전체 품질 회복으로 오인하지 말 것

## 6. 실행 순서

1. 1단계
   `rehabilitation_prohibition_orders` hotfix migration 작성 및 production/staging/dev 반영
2. 2단계
   사건 하위 테이블과 도산 공통 테이블 RLS 전면 통일
3. 3단계
   복합 FK를 rehab/insolvency 전 테이블로 확장
4. 4단계
   사건 상세 읽기 경로와 담당자 조회 계약 정리
5. 5단계
   문서 생성 영속화 구현
6. 6단계
   live integration + E2E + CI gate 고정

## 7. 완료 판정 기준

다음 7개를 모두 만족해야 `실서비스 투입 가능`으로 올릴 수 있다.

1. fresh DB와 기존 DB upgrade 결과가 동일하다.
2. 비배정 사용자는 페이지, 액션, DB 어느 경로로도 사건 하위 자원에 접근하지 못한다.
3. 사건 생성은 항상 원자적으로 커밋되거나 전부 롤백된다.
4. 회생·파산 저장은 조직-사건 정합성을 DB가 강제한다.
5. 문서 생성 결과가 사건 문서함과 이력으로 남는다.
6. 핵심 인증과 사건 플로우가 live integration과 E2E로 잠겨 있다.
7. CI가 migration, typecheck, test, build를 전부 통과한다.
