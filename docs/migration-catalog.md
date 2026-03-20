# Supabase Migration Catalog (0001~0051)

이 문서는 `supabase/migrations`의 번호를 0001부터 0051까지 누락 없이 정렬한 기준 카탈로그입니다.

## 상태 요약
- 번호 연속성: `0001` ~ `0051` 연속
- 누락 보정: `0044`, `0045`는 원격 DB 히스토리와 맞추기 위해 회수/반영된 파일

## 마이그레이션 설명
| 버전 | 파일 | 스키마/목적 |
|---|---|---|
| 0001 | `0001_extensions.sql` | Postgres 확장(기본 함수/UUID/암호화 등) 초기화 |
| 0002 | `0002_core_schema.sql` | 코어 도메인 스키마(프로필/조직/사건 등 핵심 테이블/타입) 생성 |
| 0003 | `0003_rls.sql` | 코어 테이블 RLS 정책 기본 세트 |
| 0004 | `0004_storage.sql` | 파일 스토리지 버킷/정책 구성 |
| 0005 | `0005_audit.sql` | 감사 로그 스키마/정책 구성 |
| 0006 | `0006_actor_workspace_foundation.sql` | 액터 워크스페이스(권한 모델 기반) 기초 스키마 |
| 0007 | `0007_actor_workspace_rls.sql` | 워크스페이스 관련 RLS 강화 |
| 0008 | `0008_actor_workspace_audit.sql` | 워크스페이스 감사/추적 보강 |
| 0009 | `0009_p0_01_multiorg_case_foundation.sql` | 멀티조직 사건 도메인 기반 스키마 |
| 0010 | `0010_p0_02_org_signup_governance.sql` | 조직 가입신청 거버넌스(`organization_kind` 포함) |
| 0011 | `0011_p0_03_invitation_rework.sql` | 초대/가입 흐름 리워크 |
| 0012 | `0012_p0_04_permission_templates.sql` | 권한 템플릿/권한 매핑 스키마 |
| 0013 | `0013_p0_05_financial_domains.sql` | 비용/정산/수납/성과 관련 금융 도메인 |
| 0014 | `0014_p0_06_case_shell_scaffold.sql` | 사건 셸/보드 스캐폴드 |
| 0015 | `0015_hotfix_security_and_portal_rls.sql` | 포털/보안 RLS 핫픽스 |
| 0016 | `0016_dynamic_configuration_foundation.sql` | 동적 설정(플랫폼/조직 설정, 플래그) 기반 |
| 0017 | `0017_dynamic_configuration_seed_catalog.sql` | 동적 설정 카탈로그 시드 |
| 0018 | `0018_schema_sync_organization_signup_requests.sql` | 조직가입신청 스키마 동기화 |
| 0019 | `0019_client_access_requests.sql` | 의뢰인 접근 요청 도메인 |
| 0020 | `0020_org_signup_document_verification.sql` | 조직신청 서류 검증 도메인 |
| 0021 | `0021_refresh_landing_hero_copy.sql` | 랜딩 카피/리소스 갱신 |
| 0022 | `0022_client_account_onboarding.sql` | 의뢰인 계정 온보딩 스키마 |
| 0023 | `0023_platform_admin_security_controls.sql` | 플랫폼 관리자 보안 제어 |
| 0024 | `0024_virtual_organization_registry.sql` | 가상 조직 레지스트리(과거 구조) |
| 0025 | `0025_platform_admin_scenario_controls_and_legal_identity.sql` | 플랫폼 시나리오 제어/법적 식별 보강 |
| 0026 | `0026_notification_center_upgrade.sql` | 알림센터 업그레이드 기반 |
| 0027 | `0027_security_and_atomicity_fixes.sql` | 보안/원자성 대형 보정 |
| 0028 | `0028_org_signup_review_hardening.sql` | 조직신청 심사 하드닝 |
| 0029 | `0029_notification_status_destination_model.sql` | 알림 상태/목적지 모델 도입 |
| 0030 | `0030_organization_exit_requests.sql` | 조직 탈퇴 신청/승인 도메인 |
| 0031 | `0031_notification_snooze_support.sql` | 알림 스누즈 지원 |
| 0032 | `0032_platform_root_membership_admin.sql` | 플랫폼 루트 멤버십 모델 |
| 0033 | `0033_remove_platform_mode_tables_and_virtual_orgs.sql` | 플랫폼 모드/가상 조직 테이블 제거 |
| 0034 | `0034_platform_admin_membership_only_and_cleanup.sql` | 플랫폼 관리자 멤버십 단일화/정리 |
| 0035 | `0035_member_private_profiles_and_daily_profile_completeness_alert.sql` | 구성원 민감정보/일일 프로필 완성 알림 |
| 0036 | `0036_notification_channel_preferences_and_kakao_outbox.sql` | 알림 채널 선호/카카오 아웃박스 |
| 0037 | `0037_lock_platform_admin_to_vein_bn_1.sql` | 플랫폼 관리자 `vein-bn-1` 고정(이전 기준) |
| 0038 | `0038_staff_temp_credentials_and_forced_password_reset.sql` | 직원 임시계정/강제 비밀번호 변경 |
| 0039 | `0039_client_temp_credentials_global_login.sql` | 의뢰인 임시계정/전역 로그인 보강 |
| 0040 | `0040_organization_collaboration_hubs.sql` | 조직 간 협업허브(요청/허브/메시지) |
| 0041 | `0041_collaboration_hub_reads_and_case_shares.sql` | 협업허브 읽음/사건 공유 |
| 0042 | `0042_platform_admin_by_platform_management_org.sql` | 플랫폼 관리자 판정 로직 변경(종류 기반) |
| 0043 | `0043_client_special_notes.sql` | 의뢰인 특이사항 도메인 |
| 0044 | `0044_organization_collaboration_hubs.sql` | 원격 히스토리 정합용 협업허브 스키마(0040 계열) |
| 0045 | `0045_collaboration_hub_reads_and_case_shares.sql` | 원격 히스토리 정합용 읽음/공유 스키마(0041 계열) |
| 0046 | `0046_lock_single_platform_root_to_vein_bn_1.sql` | 플랫폼 조직 단일 고정(`vein-bn-1`) 및 관리자 판정 재고정 |
| 0047 | `0047_add_organization_industry_fields.sql` | 조직/조직가입신청 업종 필드 추가 |
| 0048 | `0048_case_cover_fields.sql` | 사건 표지 출력용 추가 필드 |
| 0049 | `0049_case_hubs.sql` | 사건허브(사건 중심 협업 로비) 스키마 |
| 0050 | `0050_finalize_single_platform_root_to_vein_bn_1.sql` | 플랫폼 조직 단일 고정 최종화 |
| 0051 | `0051_enable_rls_for_exit_requests_and_kakao_outbox.sql` | `organization_exit_requests` 및 `kakao_notification_outbox` RLS 활성화 및 정책 설정 |

## 운영 메모
- `0044`, `0045`는 원격 DB에 이미 존재하던 버전과 로컬 번호를 일치시키기 위한 정합 파일입니다.
- 현재 플랫폼 조직 기준은 `0046` 기준을 따릅니다.
- `0051`은 기존에 RLS 없이 생성된 `organization_exit_requests`(0030)와 `kakao_notification_outbox`(0036) 테이블에 RLS 및 정책을 추가합니다.
