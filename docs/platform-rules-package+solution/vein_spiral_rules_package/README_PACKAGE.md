# Vein Spiral 규칙 패키지

이 패키지는 현재 작업공간에서 확인 가능한 main 브랜치 핵심 아티팩트를 기준으로 작성한 규칙 총정리본이다.

검토에 반영한 기반 파일:
1. 사용자가 제공한 `PROJECT_RULES.md` 원문
2. `migrations.zip` 내 `0001`부터 `0050`까지 전체 migration
3. 이 대화에서 확인된 `0051_enable_rls_for_exit_requests_and_kakao_outbox.sql`
4. 이 대화에서 확인된 `docs/migration-catalog.md`
5. 이 대화에서 확인된 `0049_case_hubs.sql`
6. 이 대화에서 확인된 `0050_finalize_single_platform_root_to_vein_bn_1.sql`
7. 이 대화에서 확인된 PR #13, PR #14 메타데이터와 코멘트

패키지 구성:
1. `01_PROJECT_RULES_PLATFORM_EXPANSION_ADDENDUM.md`
2. `02_FORMULAS_AND_THRESHOLDS.md`
3. `03_ROLLOUT_AND_LEGACY_TRANSITION.md`
4. `04_platform_log_sink_matrix.csv`
5. `05_organization_restore_package_matrix.csv`
6. `06_menu_search_matrix.csv`
7. `07_subscription_lock_matrix.csv`

적용 원칙:
1. 기존 섹션 구조를 깨지 않기 위해 새 카테고리를 만들지 않고 기존 카테고리 하위 번호 추가 방식으로 설계했다.
2. 공통 규칙과 PC 전용, 모바일 전용 규칙을 분리했다.
3. 추상적 표현을 배제하고, 수치, 공식, 임계치, 금지 기준, 배포 차단 기준으로만 작성했다.
