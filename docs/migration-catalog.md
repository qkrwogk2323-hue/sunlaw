# Supabase Migration Catalog (0001~0052)

이 문서는 `supabase/migrations`의 번호를 0001부터 0052까지 누락 없이 정렬한 기준 카탈로그다. 아래 분류는 현재 runtime 상태를 단정하는 표가 아니라, forward-only 정리를 위한 문서적 해석 기준이다.

## 상태 요약

- 번호 연속성: `0001` ~ `0052` 연속
- 원칙: 이미 적용된 migration은 수정하지 않고, 정리는 forward-only migration으로 수행한다
- canonical semantic baseline:
  - 협업 허브: `0040`, `0041`
  - 플랫폼 관리자 의미: `0042`
- history-sync only:
  - `0044`, `0045`
- 의미 회귀:
  - `0050`
- 보안/하드닝 후속:
  - `0051`, `0052`

## 분류 기준

| 분류 | 의미 |
|---|---|
| active | 현재도 직접적인 의미를 가지는 활성 migration |
| canonical_origin | forward-only superseding migration이 따라야 할 정식 의미 기준점 |
| transitional | 과도기 이력. 역사 보존은 필요하지만 현재 canonical meaning은 아님 |
| retired | 과거 실험축/제거 완료 축. 현재 활성 모델로 해석하지 않음 |
| history_sync_only | 원격 히스토리 정합용 재선언. canonical source로 사용하지 않음 |
| regression_history | 의미가 되돌아간 이력. immutable history로 보존하되 새 migration으로 supersede 대상 |
| hardening_followup | 보안·운영 하드닝을 위한 후속 migration |

## 마이그레이션 설명

| 버전 | 파일 | 분류 | 설명 |
|---|---|---|---|
| 0001 | `0001_extensions.sql` | active | Postgres 확장 초기화 |
| 0002 | `0002_core_schema.sql` | active | 코어 도메인 스키마 생성 |
| 0003 | `0003_rls.sql` | active | 코어 RLS 기본 세트 |
| 0004 | `0004_storage.sql` | active | 파일 스토리지 버킷/정책 구성 |
| 0005 | `0005_audit.sql` | active | 감사 로그 스키마/정책 구성 |
| 0006 | `0006_actor_workspace_foundation.sql` | active | 액터 워크스페이스 기초 스키마 |
| 0007 | `0007_actor_workspace_rls.sql` | active | 워크스페이스 RLS 강화 |
| 0008 | `0008_actor_workspace_audit.sql` | active | 워크스페이스 감사/추적 보강 |
| 0009 | `0009_p0_01_multiorg_case_foundation.sql` | canonical_origin | 멀티조직 사건 도메인 기반 스키마 |
| 0010 | `0010_p0_02_org_signup_governance.sql` | active | 조직 가입신청 거버넌스 |
| 0011 | `0011_p0_03_invitation_rework.sql` | active | 초대/가입 흐름 리워크 |
| 0012 | `0012_p0_04_permission_templates.sql` | active | 권한 템플릿/매핑 스키마 |
| 0013 | `0013_p0_05_financial_domains.sql` | active | 비용/정산/수납/성과 도메인 |
| 0014 | `0014_p0_06_case_shell_scaffold.sql` | active | 사건 셸/보드 스캐폴드 |
| 0015 | `0015_hotfix_security_and_portal_rls.sql` | active | 포털/보안 RLS 핫픽스 |
| 0016 | `0016_dynamic_configuration_foundation.sql` | active | 동적 설정 기반 |
| 0017 | `0017_dynamic_configuration_seed_catalog.sql` | active | 동적 설정 카탈로그 시드 |
| 0018 | `0018_schema_sync_organization_signup_requests.sql` | active | 조직가입신청 스키마 동기화 |
| 0019 | `0019_client_access_requests.sql` | active | 의뢰인 접근 요청 도메인 |
| 0020 | `0020_org_signup_document_verification.sql` | active | 조직신청 서류 검증 도메인 |
| 0021 | `0021_refresh_landing_hero_copy.sql` | active | 랜딩 카피/리소스 갱신 |
| 0022 | `0022_client_account_onboarding.sql` | active | 의뢰인 계정 온보딩 |
| 0023 | `0023_platform_admin_security_controls.sql` | transitional | 플랫폼 관리자 보안 제어 과도기 축 |
| 0024 | `0024_virtual_organization_registry.sql` | retired | 가상 조직 레지스트리 실험축 |
| 0025 | `0025_platform_admin_scenario_controls_and_legal_identity.sql` | retired | 플랫폼 시나리오 제어/법적 식별 과거 축 |
| 0026 | `0026_notification_center_upgrade.sql` | active | 알림센터 업그레이드 기반 |
| 0027 | `0027_security_and_atomicity_fixes.sql` | active | 보안/원자성 보정 기준점 |
| 0028 | `0028_org_signup_review_hardening.sql` | active | 조직신청 심사 하드닝 |
| 0029 | `0029_notification_status_destination_model.sql` | active | 알림 상태/목적지 모델 |
| 0030 | `0030_organization_exit_requests.sql` | active | 조직 탈퇴 신청/승인 도메인 |
| 0031 | `0031_notification_snooze_support.sql` | active | 알림 스누즈 지원 |
| 0032 | `0032_platform_root_membership_admin.sql` | transitional | 플랫폼 관리자 계보 과도기 migration |
| 0033 | `0033_remove_platform_mode_tables_and_virtual_orgs.sql` | retired | virtual/scenario 모델 퇴역 cutoff point |
| 0034 | `0034_platform_admin_membership_only_and_cleanup.sql` | transitional | 플랫폼 관리자 멤버십 정리 과도기 축 |
| 0035 | `0035_member_private_profiles_and_daily_profile_completeness_alert.sql` | active | 구성원 민감정보/프로필 완성 알림 |
| 0036 | `0036_notification_channel_preferences_and_kakao_outbox.sql` | active | 알림 채널 선호/카카오 아웃박스 |
| 0037 | `0037_lock_platform_admin_to_vein_bn_1.sql` | regression_history | slug 기반 고정 회귀의 역사적 시작점 |
| 0038 | `0038_staff_temp_credentials_and_forced_password_reset.sql` | active | 직원 임시계정/강제 비밀번호 변경 |
| 0039 | `0039_client_temp_credentials_global_login.sql` | active | 의뢰인 임시계정/전역 로그인 보강 |
| 0040 | `0040_organization_collaboration_hubs.sql` | canonical_origin | 조직 협업 허브의 canonical origin |
| 0041 | `0041_collaboration_hub_reads_and_case_shares.sql` | canonical_origin | 협업 허브 읽음/사건 공유 canonical origin |
| 0042 | `0042_platform_admin_by_platform_management_org.sql` | canonical_origin | 플랫폼 관리자 의미의 forward-only canonical semantic baseline |
| 0043 | `0043_client_special_notes.sql` | active | 의뢰인 특이사항 도메인 |
| 0044 | `0044_organization_collaboration_hubs.sql` | history_sync_only | 원격 히스토리 정합용 협업허브 재선언 |
| 0045 | `0045_collaboration_hub_reads_and_case_shares.sql` | history_sync_only | 원격 히스토리 정합용 읽음/공유 재선언 |
| 0046 | `0046_lock_single_platform_root_to_vein_bn_1.sql` | transitional | enum/단일 루트 준비 축, current canonical meaning 아님 |
| 0047 | `0047_add_organization_industry_fields.sql` | active | 조직 산업 필드 추가 |
| 0048 | `0048_case_cover_fields.sql` | active | 사건 커버 필드 보강 |
| 0049 | `0049_case_hubs.sql` | active | 사건허브 활성 축. multi-org / client bridge canonicalization 필요 |
| 0050 | `0050_finalize_single_platform_root_to_vein_bn_1.sql` | regression_history | immutable history로 보존하되 `0042` 기준 새 migration으로 supersede 대상인 회귀 migration |
| 0051 | `0051_enable_rls_for_exit_requests_and_kakao_outbox.sql` | hardening_followup | RLS 미적용 테이블 하드닝 |
| 0052 | `0052_harden_function_search_paths_and_extensions.sql` | hardening_followup | 함수 search_path 및 extension schema 하드닝 |
| 0053 | `0053_canonicalize_platform_governance.sql` | active | control-plane registry 기반 플랫폼 거버넌스 canonicalization |
| 0054 | `0054_canonicalize_collaboration_schema.sql` | active | 협업 스키마 canonicalization. `0040/0041` 기준으로 drift 수습 |
| 0055 | `0055_case_hub_multi_org_bridge.sql` | active | 사건허브 multi-org bridge 및 허브 접근 조직 연결 테이블 도입 |
| 0056 | `0056_client_link_lifecycle.sql` | active | 의뢰인 link lifecycle / orphan review / relink policy 및 `primary_case_client_id` canonicalization |

## 운영 메모

- 과거 migration은 ledger로 보존하고 수정하지 않는다.
- 플랫폼 관리자 판별의 구현 상세는 forward-only canonicalization migration에서 진화할 수 있으나, 현재 문서 기준 semantic baseline은 `0042`다.
- `0044`, `0045`는 fresh bootstrap을 깨뜨리는 주범이라기보다 canonical source 해석을 흐리는 history-sync 재선언이다.
- `0049`는 활성 축이지만, `0009`의 multi-org 사건 모델과 정합하도록 bridge migration이 필요하다.
- `0050`은 immutable history로 보존하되, 새 migration으로 supersede 대상이다.
- `0056`은 기존 `primary_client_id(profiles.id)`를 제거하지 않고, `primary_case_client_id(case_clients.id)`와 의뢰인 lifecycle 규칙을 additive로 도입하는 전환 축이다.
