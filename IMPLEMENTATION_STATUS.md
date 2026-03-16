# Vein Spiral Integrated Source Package

이 패키지는 현재 실제 소스 트리를 압축한 것입니다.

## 반영 범위
- 0001~0022 마이그레이션 포함
- 멀티조직 사건 모델(case_organizations, organization_relations)
- 조직 개설 신청 및 승인 기초
- 직원/의뢰인 초대 링크 구조
- 권한 템플릿 + 예외 권한 구조
- Client Billing / Collection Compensation / Inter-Org Settlement 스키마
- 공통 Case Shell UI 스캐폴드
- Dynamic Configuration 스키마 + 초기 관리자 UI
- 포털 최소권한 축소 핫픽스
- 초대 토큰 hash 기반 수락 핫픽스

## 아직 스캐폴드/초기 구현 수준인 영역
- Inbox UX 고도화
- Messages / Requests 운영형 UX
- Client Portal 쓰기 UX 전체
- Collections 성과판 고도화
- 내보내기 품질 및 포맷 고도화
- 자동화/AI
- 회원가입 동의문 정식 문구 확정 필요: 개인정보 처리 동의 / 시스템 이용 동의는 현재 UI에 placeholder로만 노출되며 추후 기재 예정 상태입니다. 이후 코드 변경 시 실제 약관 본문, 버전, 시행일, 저장 필드 정리를 반드시 반영해야 합니다.

## 확인 방법
1. 기존 프로젝트에 0001~0014가 적용되어 있으면 0015~0022까지 순서대로 추가 적용
2. 사용자 프로필, 실명, 플랫폼 관리자 시나리오 접근 관련 변경을 반영할 때는 `0025_platform_admin_scenario_controls_and_legal_identity.sql`도 함께 적용 여부를 확인
3. .env.local 복사
4. pnpm install
5. pnpm check:migrations
6. pnpm typecheck
7. pnpm dev

## 품질 게이트
- 마이그레이션 파일은 `supabase/migrations` 아래에서 `0001_*` 형식의 연속 번호만 허용합니다.
- `pnpm check:migrations`가 번호 누락과 중복을 차단합니다.
- GitHub Actions CI는 `pnpm check:all`을 강제 실행합니다.

## 현재 구조 평가
- `src/lib/actions/case-actions.ts`의 `createCaseAction`은 사건 생성, 담당자 연결, 조직 연결, 후속 일정/알림, 캐시 갱신, 리다이렉트를 한 액션 안에서 연속 처리하고 있습니다. 다중 쓰기 흐름이 서버 액션에 과도하게 응집되어 있어 실패 경계와 테스트 경계가 불명확합니다.
- 개선 방향은 입력 검증, 핵심 DB 쓰기, 후처리 알림/리밸리데이션을 분리하고, 가능하면 핵심 쓰기 흐름을 서비스 계층이나 DB 트랜잭션 경계로 옮기는 것입니다.
- `src/lib/actions/organization-actions.ts`의 `createStaffInvitationAction`은 지금은 짧아 보여도 초대 토큰 생성, 초대 메타데이터 조립, DB insert, 후속 이동이 액션 함수 안에 직접 들어가 있습니다. 조직/초대/승인 흐름이 한 파일에 누적되고 있어 정책 변경 시 결합도가 높아집니다.
- 개선 방향은 초대 생성 규칙, 초대 저장, 초대 수락 처리 로직을 별도 도메인 함수로 분리하는 것입니다.
- `src/lib/actions/organization-actions.ts`의 `acceptInvitationAction`은 초대 조회, 만료/이메일 검증, staff/client 분기, membership upsert, profile update, case client 연결, invitation 상태 변경, revalidate, redirect까지 모두 담당합니다. 핵심 상태 전이 로직이 하나의 액션에 몰려 있어 변경 비용과 회귀 위험이 높습니다.
- 개선 방향은 `validate invitation`, `apply staff invitation`, `apply client invitation`, `finalize invitation`처럼 단계별 함수로 분해하는 것입니다. 그렇지 않으면 이후 초대 정책, 직책 정책, 포털 연결 정책이 바뀔 때마다 같은 액션을 계속 수정하게 됩니다.
- `src/components/dashboard-hub-client.tsx`는 대시보드 전체 조립, 다수 상태, 시나리오 로컬 상태, 플래너, 메시지, 조직 커뮤니케이션, 알림/요약 카드까지 한 파일에서 처리합니다. 대형 클라이언트 컴포넌트에 여러 상호작용 섹션과 상태 관리가 혼재돼 있어 프론트 변경 리스크가 높습니다.
- 개선 방향은 플래너 패널, 메시지/조정 패널, 알림/요약 영역을 별도 컴포넌트 또는 훅으로 분리하고, 부모는 데이터 조립과 배치만 담당하게 만드는 것입니다.

## 테스트 평가
- 현재 테스트는 없는 것이 아닙니다. `tests/action-integration.test.ts`, `tests/e2e/public-route-smoke.ts`, `tests/e2e/authenticated-production-smoke.spec.ts` 기준으로 스모크와 가드 통합 테스트는 이미 있습니다.
- 다만 부족한 것은 핵심 업무 상태 전이 E2E입니다. 스모크와 가드 통합 테스트는 있으나, 초대 수락, 조직 승인, 결제/정산 같은 핵심 업무 시나리오 E2E가 부족합니다.
