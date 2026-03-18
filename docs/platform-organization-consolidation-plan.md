# Platform Organization Consolidation Plan

## 한 줄 핵심

플랫폼 관리자라는 별도 세계를 만들지 말고, **고정된 플랫폼 조직**과 **그 조직 관리자**라는 모델로 단순화한다.

## 현재 구조의 문제

현재 구현은 플랫폼 관리자를 조직 바깥의 특수 존재처럼 다루는 흔적이 여러 계층에 남아 있다.

- UI 문맥이 `platform_admin`, `organization_staff`, `law_admin`, `collection_admin`, `other_admin`처럼 분기되며, 플랫폼 관리자는 다시 일반 조직 시야와 가상 조직 시야를 오가는 구조다.
- 내비게이션은 `플랫폼 관리자 모드`, `가상직원 시야`, `가상 조직 시야` 같은 용어를 직접 노출해 사용자가 실제로 어느 조직 문맥에서 일하는지 흐리게 만든다.
- 데이터 계층에는 `0024_virtual_organization_registry.sql`의 가상 조직 시드와 `0025_platform_admin_scenario_controls_and_legal_identity.sql`의 시나리오 접근 제어가 따로 존재해, 실제 운영 모델이라기보다 플랫폼 관리자 전용 보정층처럼 보인다.
- 결과적으로 권한 판단이 `조직 멤버십 기반 접근`과 `플랫폼 관리자 특수 권한` 사이에서 이중화되고, 새 화면/정책을 추가할수록 예외 처리가 늘어날 가능성이 높다.

## 플랫폼 조직 고정 모델 제안

목표 모델은 아래처럼 단순하다.

1. `organizations` 안에 **플랫폼 조직 한 개**를 고정 식별자로 둔다.
2. 플랫폼 운영자는 모두 그 플랫폼 조직의 `organization_memberships` 구성원이다.
3. 플랫폼 관리자는 별도 엔티티가 아니라, 플랫폼 조직 소속 사용자 중 플랫폼 운영 권한을 가진 관리자다.
4. 일반 조직과 플랫폼 조직은 같은 조직 모델을 공유하고, 차이는 **권한 범위**에서만 발생한다.
5. 화면도 `플랫폼 관리자 모드`가 아니라 `플랫폼 조직 운영 화면`으로 정의한다.

권장 해석:

- **조직 모델**: 모든 사용자는 어떤 조직에 속한다.
- **플랫폼 모델**: 플랫폼 조직은 서비스 운영 주체인 고정 조직이다.
- **권한 모델**: 플랫폼 조직 소속 사용자에게만 승인/시스템 설정/전역 운영 권한을 부여한다.

## 제거 또는 축소할 개념

우선순위가 높은 정리 대상은 아래와 같다.

1. **platform admin mode on/off 토글**
   - 현재 문맥 저장, 새로고침 복원, 메뉴 강조, 접근 제어를 모두 복잡하게 만든다.
   - 최종적으로는 제거하고, 필요한 경우 조직 전환 또는 권한 기반 메뉴 노출로 대체한다.

2. **가상 조직 시야 / scenario mode**
   - 데모·검증용 시야라면 내부 QA 도구로 한정하고, 운영 모델의 중심 개념에서 분리한다.
   - 운영 권한과 시나리오 샌드박스는 같은 개념이 아니므로 분리해야 한다.

3. **가상 조직 / 더미 레지스트리**
   - `0024_virtual_organization_registry.sql`처럼 실제 조직 모델을 보정하는 시드는 장기 구조의 기준이 되면 안 된다.
   - 필요하면 데모 seed로 이동하고, 운영 스키마 기본값에서는 제거한다.

4. **플랫폼 관리자 전용 우회 테이블**
   - 보안 승인, 시나리오 허용, 별도 활성화 플래그가 꼭 필요하더라도 최종 권한 판단은 플랫폼 조직 멤버십을 기준으로 재정렬해야 한다.
   - 별도 테이블은 보조 통제 수단으로만 남기고, 주 식별 모델이 되어서는 안 된다.

## 유지해야 할 플랫폼 전용 권한

조직 모델을 단순화하더라도 플랫폼 전용 권한 자체는 유지해야 한다.

예시 권한:

- 조직 개설 신청 승인/반려
- 조직 lifecycle 상태 변경
- 플랫폼 공통 설정 및 feature flag 편집
- 전역 지원 요청 처리
- 보안 통제, 감사 로그 열람, 정책 강제
- 조직 간 운영 데이터 조회 범위 확장

권장 방식:

- `profiles.platform_role = 'platform_admin'` 같은 속성은 즉시 제거 대상이라기보다 **이행기 플래그**로 본다.
- 최종 판단은 `platform organization membership + explicit platform permissions` 조합으로 수렴한다.
- 즉, “플랫폼 조직 소속”이 기본 자격이고, 그 위에 “어떤 플랫폼 운영 권한을 갖는가”를 세분화한다.

## 수정 파일 후보와 마이그레이션 후보

### 문서/설계 정리 후보

- `docs/architecture.md`
  - 플랫폼 운영 구조를 별도 세계가 아니라 고정 플랫폼 조직 모델로 재정의.
- `docs/migration-plan.md`
  - 기존 `profiles.platform_role` 중심 사용자 분류를 플랫폼 조직 멤버십 기반 이행 계획으로 보완.
- `README.md`
  - 운영 메모에서 `virtual organization`/`scenario control`을 현재 특수 구조로 명시하고, 후속 정리 방향을 안내.

### 프론트엔드 정리 후보

- `src/components/mode-switcher.tsx`
  - `platform_admin`, `organization_staff`, `law_admin`, `collection_admin`, `other_admin`로 쪼개진 특수 모드 구조를 축소.
  - 플랫폼 조직 운영 화면과 일반 조직 운영 화면 중심으로 재설계.
- `src/components/mode-aware-nav.tsx`
  - `플랫폼 관리자 모드`, `가상직원 시야`, `가상 조직 시야` 문구 및 분기 제거 후보.
  - 조직 전환 + 권한 기반 메뉴 노출 구조로 재작성.
- `src/lib/platform-scenarios.ts`, `src/lib/platform-scenario-workspace.ts`
  - 운영 개념이 아니라 QA/demo 보조 도구인지 재분류.

### 인증/권한 정리 후보

- `src/lib/auth.ts`
  - `platform_role === 'platform_admin'`와 active view mode를 함께 보는 분기를 플랫폼 조직 membership/permission 기반으로 전환.
- `src/lib/actions/organization-actions.ts`, `src/lib/actions/client-account-actions.ts`
  - 플랫폼 관리자 조회를 조직 기반 조회로 변경.
- `src/lib/types.ts`
  - `PlatformRole`의 책임을 축소하거나 이행기 타입으로 명시.

### DB 마이그레이션 후보

1. **신규 migration**: 고정 플랫폼 조직 seed 및 불변 slug/code 추가
   - 예: `organizations.slug = 'platform-operations'`
   - 플랫폼 조직 식별자를 코드/설정에서 일관되게 참조.

2. **신규 migration**: 기존 플랫폼 운영 사용자에 대한 membership backfill
   - 현재 `profiles.platform_role = 'platform_admin'` 사용자들을 플랫폼 조직 멤버십으로 이관.

3. **신규 migration**: 플랫폼 전용 permission set 정의
   - 조직 기반 permission 체계 위에 `platform_organization_approve`, `platform_settings_manage` 같은 권한을 추가.

4. **정리 후보**: `0024_virtual_organization_registry.sql`
   - 운영 스키마 기본 레이어에서 제거하거나 demo seed로 이동.

5. **정리 후보**: `0025_platform_admin_scenario_controls_and_legal_identity.sql`
   - legal name은 유지 가능.
   - `platform_admin_scenario_controls`는 운영 권한과 분리해 QA/seed 전용으로 축소 검토.

6. **정리 후보**: `0023_platform_admin_security_controls.sql`
   - 필요 시 유지하되, membership 없는 독립 관리자 판별식이 아니라 플랫폼 조직 관리자에 대한 추가 보안 제어로 의미를 축소.

## 권한/성능/문맥 측면 효과

### 권한 측면

- 모든 접근 제어를 “어느 조직 소속인가, 그 조직에서 어떤 권한이 있는가”로 설명할 수 있다.
- 플랫폼만 예외라는 별도 규칙이 줄어 RLS와 서버 액션 검증식이 단순해진다.
- 권한 누수 위험이 감소한다. 특히 토글 상태나 가상 시야 상태에 의존한 판별을 줄일 수 있다.

### 성능/복잡도 측면

- mode/state 조합이 줄어들어 내비게이션, 쿠키 복원, 클라이언트 상태 관리가 단순해진다.
- 조직/권한 조회 쿼리를 공통화하기 쉬워진다.
- 별도 registry/scenario lookup이 줄면 초기 로딩 경로도 더 예측 가능해진다.

### 문맥/UX 측면

- 사용자는 “지금 나는 플랫폼 조직의 운영자다” 또는 “지금 나는 특정 고객 조직의 구성원이다”처럼 이해할 수 있다.
- 메뉴, 새로고침, 딥링크 접근 시 문맥이 더 안정적이다.
- 화면 설명도 `플랫폼 관리자 모드`보다 `플랫폼 조직 운영`이 실제 업무 구조와 맞는다.

## 제안하는 이행 순서

1. 설계 문서에서 플랫폼 조직 고정 원칙을 먼저 확정한다.
2. 플랫폼 조직 seed와 membership backfill migration을 추가한다.
3. auth/RLS 판별 함수를 플랫폼 조직 membership 기반으로 병행 지원한다.
4. 프론트엔드에서 platform mode 토글과 가상 조직 시야를 축소한다.
5. 가상 조직 registry와 scenario control을 demo/QA 전용 레이어로 밀어낸다.
6. 최종적으로 `platform_role`의 책임을 줄이고, 남더라도 호환성 필드로 한정한다.

## 한 줄 최종 판단

플랫폼 조직을 고정하고, 플랫폼 관리자를 그 조직의 관리자 권한으로 수렴시키는 쪽이 현재의 별도 플랫폼 관리자 세계보다 훨씬 자연스럽고, 일관되고, 권한 경계도 더 명확하다.
