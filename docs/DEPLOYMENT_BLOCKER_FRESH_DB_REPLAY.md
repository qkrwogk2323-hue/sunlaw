# 배포 차단 보고서 — Fresh DB Replay 결함

> 작성: 2026-04-14
> 상태: **실서비스 투입 불가 판정의 근거**
> 분류: 배포 재현성 (Deployment Reproducibility)

## 1. 결론

현재 `supabase/migrations/20260410000001~012` squash 파일은 **빈 DB에서 끝까지 재생될 수 없다**.
운영 DB는 squash 이전의 historical 경로로 이미 적용된 상태라 문제가 보이지 않았으나, Supabase
branch 기능으로 fresh DB에 동일 migration을 적용하면 **migration 간 forward-reference 결함**
때문에 중간에 실패한다.

이는 단일 결함이 아니라 **패턴**이다. 이 문서가 실서비스 투입 불가 판정의 핵심 근거다.

## 2. 실제 실행 증적 — Branch 시도 5회

| Branch | project_ref | 결과 | 발견된 결함 |
|---|---|---|---|
| v1 | chxvceylurookduwagbx | MIGRATIONS_FAILED | hotfix schema_migrations placeholder (선결) |
| v2 | cvkimgttfyzaylxcxjvg | MIGRATIONS_FAILED | 001: `app.is_platform_admin()` `language sql`이 003/004 테이블 참조 |
| v3 | vzbetcqtiksoqkpcueic | MIGRATIONS_FAILED | 003: `case_billing_party_kind` 타입명 오타 (실제 enum은 `billing_party_kind`) |
| v4 | bxdwklrcdpzescipfpjn | MIGRATIONS_FAILED | 004: `platform_runtime_settings` 초기화 DO 블록이 fresh DB에서 raise exception |
| v5 | yebyuvdfewjmxsgydpih | MIGRATIONS_FAILED | 005: `app.is_case_hub_org_member(uuid)` 참조 — 이 함수는 009에서 정의됨 |

각 branch 생성 → 실패 로그 확인 → 수정 → 재생성의 반복. 4번째 결함(v5)에서 이터레이션 중단.

## 3. 결함 분류

### 3.1 Forward-reference 패턴 A — 함수 본문이 미래 테이블을 참조

**예시**: `20260410000001_extensions_and_schemas.sql:33`
```sql
create or replace function app.is_platform_admin()
returns boolean language sql    -- ← sql은 생성 시점 본문 검증
...
  from public.platform_runtime_settings prs  -- 004에서 생성됨
```

`language sql` 함수는 생성 시점에 본문이 parser-validated되므로, 이후 migration에서 생성될
테이블을 참조하면 즉시 실패한다.

**이 세션에서 수정**: 4개 함수 `language sql` → `language plpgsql`
(`is_platform_admin`, `is_org_member`, `is_org_manager`, `is_org_staff`).
plpgsql은 본문 검증이 호출 시점으로 지연됨.

### 3.2 Forward-reference 패턴 B — 정책이 미래 함수를 참조

**예시**: `20260410000005_collaboration.sql` 어딘가에서
```sql
create policy ... on public.case_hub_organizations
using (app.is_platform_admin() or app.is_case_hub_org_member(hub_id))
                                       ↑↑↑ 009에서 정의됨
```

정책의 USING 표현식은 생성 시점에 함수 존재를 확인하므로 실패한다.

**이 세션에서 미수정** — 다음 라운드 과제.

### 3.3 데이터 전제 오류 — DO 블록이 fresh DB에서 동작 불가

**예시**: `20260410000004_platform_governance.sql:540`
```sql
if v_platform_org_id is null then
  raise exception 'platform governance canonicalization failed: no active platform_management organization found';
end if;
```

이 DO 블록은 이미 조직 데이터가 있는 환경을 전제. Fresh DB(조직 0건)에서는 raise exception으로 실패.

**이 세션에서 수정**: exception → notice + skip 으로 변경. 실제 데이터가 들어오면 이후 런타임
canonicalize 함수가 다시 실행되며 초기화.

### 3.4 단순 타입명 오타

**예시**: `20260410000003_core_tables.sql:494`
```sql
bill_to_party_kind public.case_billing_party_kind,  -- ← 실제 enum은 billing_party_kind
```

**이 세션에서 수정**: 올바른 타입명으로 교정.

## 4. 본 세션에서 수정된 3건

| # | Migration | 수정 내용 | 로컬 파일 | 원격 schema_migrations |
|---|---|---|---|---|
| 1 | 001 | `language sql` → `language plpgsql` (4 functions) | ✅ | ✅ statements UPDATE |
| 2 | 003 | `case_billing_party_kind` → `billing_party_kind` | ✅ | ✅ statements array UPDATE |
| 3 | 004 | canonicalization exception → notice+skip | ✅ | ✅ statements[141] UPDATE |

**원격 DB 영향**: 함수·정책·테이블 정의 자체는 운영 DB에 이미 적용된 상태로 바뀌지 않음.
변경된 것은 `supabase_migrations.schema_migrations` 레코드의 `statements` 배열 — 미래 branch
생성 시 replay될 텍스트.

## 5. 미수정된 결함 (최소 1건, 실제로는 다수 예상)

| # | Migration | 결함 |
|---|---|---|
| 4 | 005 | `app.is_case_hub_org_member(uuid)` 참조 — 009 정의 |
| ? | 006 | 미시도 |
| ? | 007 | 미시도 |
| ? | 008 | 미시도 |
| ? | 009 | 미시도 |
| ? | 010 | 미시도 |
| ? | 011 | 미시도 |
| ? | 012 | 미시도 |

Branch v5까지 4번 iteration 후 중단. 하나씩 고치는 방식은 체계적이지 않고, squash 파일
**전반에 forward-reference가 산재**한 상태로 판단.

## 6. 권장 복구 절차

### 6.1 의존 그래프 사전 분석 (patch before branch)
제3자 도구(`pg_depend` 분석, 커스텀 스크립트) 또는 수동 전수조사로 001~012 migration 파일 전체의
의존 관계 맵을 먼저 구축. 각 migration에서:

- **참조하는 테이블/함수/enum** 목록
- **생성하는 테이블/함수/enum** 목록
- "생성 위치 순번 > 참조 위치 순번"인 항목 — 모두 forward-reference

### 6.2 수정 방침 (우선순위)
1. **SQL 함수 → plpgsql 전환** (본문 검증 지연) — 가장 저비용
2. **정책 정의를 함수 정의 이후로 이동** — 정책은 생성 시점 함수 존재 필수
3. **DO 블록의 데이터 전제 제거** — fresh DB 경로 graceful skip

### 6.3 재검증 절차
```
for each fix:
  UPDATE schema_migrations statements
  delete branch (if exists)
  create branch
  if MIGRATIONS_FAILED: pick next defect
  if ACTIVE: fresh DB replay 성공 → 보안 E2E / live auth 진행
```

### 6.4 이상적 최종 산출물
- fresh DB에 001~012 + hotfix 전체 apply 성공
- branch 생성으로 검증 자동화 가능
- CI gate에 `fresh DB apply` 추가 가능 (`docs/CI_SECRETS.md` 지침 따라)

## 7. 판정

**현재 상태**: 실서비스 투입 불가 (배포 재현성 미확보)

**이유**: 구조 리팩터링은 13+ 커밋으로 상당히 진전됐으나, 배포 재현성(fresh DB replay)이 실행
불가능한 상태. 이 한 고비가 닫히지 않으면 모든 자동 증명 파이프라인이 원천적으로 가동 불능.

**전환 기준** (투입 가능으로 올리려면):
1. fresh DB apply 001~012 + hotfix 전체 끝까지 통과
2. Upgrade apply 검증 통과
3. Branch/staging 생성 가능
4. 그 이후에야 live auth integration, 보안 E2E, UI 구조개선 착수 가능 (순서 고정)

## 8. 외부 구조개선 제안서(의뢰인/알림/허브 정리)의 위치

같은 시점에 별도로 받은 UI/구조 정리 제안서는 **2차 구조개선 백로그**로 분류. 정당한 방향이지만,
fresh DB replay 결함을 닫기 전까지는 집행 불가. 순서:

1. **우선**: 이 문서(fresh DB replay 복구)
2. **그 다음**: `registry.ts` / `navigation-map.ts` / `interaction-matrix.md` 고정
3. **그 다음**: notifications 공통 feed, case_documents 단일 타임라인, case hub policy 함수,
   roster/portal query 분리

## 9. 본 세션 산출물 요약

- **로컬 파일 수정**: `20260410000001`, `20260410000003`, `20260410000004`
- **원격 schema_migrations UPDATE**: 3건
- **CI 작업 없음**: 여기서 멈춤
- **누적 커밋 14+**: 모든 코드 레이어 작업은 이미 이전 커밋에 반영됨. 이번 수정 3건만 신규
- **branch 전부 삭제**: 비용 정지

---

**한 줄 결론**: 알림·허브·의뢰인 화면 정리보다, 이 보고서가 드러낸 fresh DB replay 결함 복구가
우선이다.
