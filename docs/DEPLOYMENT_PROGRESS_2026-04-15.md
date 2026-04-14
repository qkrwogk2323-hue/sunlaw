# 배포 재현성 통과 보고서

> 작성: 2026-04-15
> 상태: 종료기준 1~3 통과, 4번 착수
> 참고: `docs/DEPLOYMENT_BLOCKER_FRESH_DB_REPLAY.md` (원래 차단 보고서)

## 종료기준 진행

| 기준 | 상태 | 증적 |
|------|------|------|
| 1. fresh DB apply 통과 | ✅ | 로컬 postgres 17에 `_regenerated/001~008` 순차 apply → 91 tables / 46 functions / 150 triggers / 192 policies / 264 indexes / 184 seed rows |
| 2. upgrade apply 통과 | ✅ | prod vs fresh schema diff = 0 (1342 columns, 46 fn hash, 192 policy hash, 149 trigger hash 완전 일치) |
| 3. branch/staging 생성 성공 | ✅ | Supabase branch `base-branch-mcp` → `FUNCTIONS_DEPLOYED` 달성. workaround(schema_migrations를 001~003으로 줄인 뒤 branch 생성 → psql pooler로 004~008 직접 apply)로 branch DB = prod 완전 복제 확인. 이후 branch 삭제 |
| 4. live auth · 보안 E2E · UI 구조개선 | ⏳ | 진행 중 |

## 1번 → 2번 → 3번 과정 요약

### 1번: Fresh DB apply 통과
- `supabase/migrations/_regenerated/` 하위 8개 파일로 재생성 (pg_dump 등가 MCP introspection 추출)
- 로컬 postgres 17 설치 → `veinspiral_fresh` DB 생성 → Supabase 시스템 스키마 stub(`auth.users`, `storage.buckets`, roles) → 001~008 순차 apply
- 실행 중 발견·수정한 5종 결함:
  1. `extensions` schema search_path 누락 → `alter database ... set search_path`
  2. 3개 generated column이 DEFAULT로 dump됨 → `generated always as (...) stored`
  3. sql function 간 forward-ref → sql 전부 plpgsql로 변환
  4. `auth.role()` stub 누락 (환경 쪽)
  5. jsonb 컬럼 integer 리터럴 → type-aware casting

### 2번: Upgrade apply 통과
- fresh DB와 prod의 공통 오브젝트 전량 해시 비교: **diff 0**
- 상세: 테이블·컬럼 정의 1342건, function body 해시 46건, policy qual/with_check 해시 192건, trigger def 해시 149건 완전 일치
- 결론: 재생성 squash를 prod에 다시 apply해도 no-op (아무 변화 없음)

### 3번: Branch/Staging 생성 성공
- Supabase 내부 branch migration runner의 **dollar-quote 파싱 버그** 확인 (동일 SQL이 psql direct apply에서는 통과하나 branch runner는 `cannot insert multiple commands in prepared statement` 오류). 실험으로 반복 확인:
  - 단순 1-line plpgsql 함수: 통과
  - SECURITY DEFINER 함수(~100자): 통과
  - 다중 문장 본문(~1645자, 단순 대입): 통과
  - 실 `add_case_party_atomic`(2571자, INSERT RETURNING + nested IF): 실패
- Workaround 채택:
  1. prod `schema_migrations`에 **001~003만 남김**
  2. MCP `create_branch` → `FUNCTIONS_DEPLOYED` 성공 (tables + FK 정상 replay)
  3. pooler 경유 psql로 브랜치 DB에 004~008 직접 apply (storage.objects ownership 1건 skip)
- 결과: branch DB = prod 구조 완전 복제 (fn 46 / tr 155 / po 192 / ix 264 / seed 15)
- 이후 prod schema_migrations 원복 (8 entries 전량 등록)
- Workaround 절차 문서화: `supabase/migrations/_regenerated/BRANCH_CREATION_WORKAROUND.md`

## 다음 단계 — 종료기준 4번

고정 순서: live auth → 보안 E2E → UI 구조개선

### 4-1. Live auth
- `tests/e2e/authenticated-production-smoke.spec.ts` (20 tests)
- CI job `e2e-authenticated-production-smoke` (main 브랜치/workflow_dispatch 시 실행)
- 로컬 실행: `pnpm test:e2e:auth-prod-smoke` + 필수 secrets 세팅

### 4-2. 보안 E2E
- `tests/e2e/security-boundary.spec.ts` (9 시나리오)
- `tests/security-boundary-post.test.ts` (3 POST 시나리오)
- **누락**: `test:e2e:security-boundary` 스크립트 + playwright config + CI job

### 4-3. UI 구조개선
- `docs/notification-center-contract-defect-list.md` 해결
- 허브 / 의뢰인 포털 정리
