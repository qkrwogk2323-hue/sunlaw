# Vein Spiral v2.1 아키텍처 개요

## 1. 상위 구조

```text
Landing
Internal Workspace
Client Portal
Admin 메뉴(Internal Workspace 내 확장)
```

## 2. Internal Workspace

Internal Workspace의 사이드바는 고정형 메뉴 목록이 아니라,
현재 사용자 컨텍스트에 따라 동적으로 구성된다.

메뉴 노출은 다음 세 요소의 조합으로 결정된다.
1. 사용자 역할 (user role)
2. 조직 유형 (organization kind)
3. 뷰 모드 (view mode)

(구현 기준: mode-aware-nav, auth 계층)

### 2.1 공통 메뉴

기본적으로 아래 항목을 공통 메뉴로 노출한다.

```text
Dashboard
Notifications
Calendar
Documents
```

`Billing`은 공통 메뉴에 항상 포함되지 않는다. 플랫폼 관리자 시야, 의뢰인 시야, 추심 조직 시야에서는 제외되고, 그 외 내부 조직 시야에서만 공통 메뉴로 추가된다.

### 2.2 조직 메뉴

조직 메뉴는 현재 모드와 조직 종류에 따라 달라진다.

```text
platform_admin
- Organization Requests
- Modules
- Support
- Platform Settings
- Organizations
- Clients

platform_admin + organization_staff view
- Cases
- Clients
- Reports
- Organization Settings

client_communication
- Portal
- Inbox

collection_admin 또는 collection_company
- Collections
- Cases
- Billing
- Documents
- Clients
- Reports

law_admin
- Cases
- Clients
- Reports
- Organization Settings

mixed_practice
- Cases
- Clients
- Reports
- Collections

other_admin / law_firm / corporate_legal_team / 기타 기본 조직 시야
- Cases
- Clients
- Reports
- Organization Settings
```

### 2.3 협업 메뉴

협업 메뉴도 조직 종류에 따라 달라진다.

```text
collection_admin 또는 collection_company
- Inbox
- Client Access
- Organizations

그 외 내부 조직 시야
- Inbox
- Organizations
- Documents
```

### 2.4 회사 관리 메뉴

회사 관리 메뉴는 관리자 모드이거나 구성원 관리 권한이 있는 경우에만 노출한다.

```text
Organization Settings
Team Settings
Support
```

`Support`는 구성원 관리 권한이 있을 때만 추가된다.

### 2.5 추가 메뉴

추가 메뉴는 조직의 활성 모듈에 따라 보강된다.

```text
Collections
Reports
```

단, 이 항목은 해당 모듈이 켜져 있으면서 조직 메뉴에 아직 같은 목적의 항목이 없을 때만 추가된다.

### 2.6 이해 보조 예시

아래 예시는 실제 구현에서 자주 보게 되는 대표 조합이다.

```text
예시 A. platform_admin + internal org + default mode
- 공통 메뉴: Dashboard, Notifications, Calendar, Documents
- 조직 메뉴: Organization Requests, Modules, Support, Platform Settings, Organizations, Clients
- 해석: 플랫폼 관리자가 기본 모드로 들어오면 내부 조직 소속 여부와 무관하게 플랫폼 운영 메뉴 중심으로 구성된다.

예시 B. client + portal mode
- 공통 메뉴: Dashboard, Notifications, Calendar, Documents
- 조직 메뉴: Portal, Inbox
- 협업 메뉴: Inbox, Organizations, Documents
- 해석: 의뢰인 시야에서는 Portal 진입과 요청/회신 흐름이 중심이 되고, 내부 운영 메뉴는 전면에 나오지 않는다.
```

## 3. 공통 Case Shell

모든 사건은 아래 공통 탭을 공유한다.

```text
Overview
Communication
Documents
Schedule
Participants
Billing
Timeline
```

사건 유형에 따라 선택 모듈을 추가한다.

```text
Collection
Insolvency
Settlement
기타 특화 모듈
```

## 4. Billing과 Collection의 분리

1. Billing은 조직과 의뢰인 사이의 공통 청구/입금 도메인이다.
2. Collection은 추심 사건에서만 활성화되는 선택 모듈이며, 상위 메뉴에서도 별도 Workspace로 운영한다.

## 5. 새로 추가된 데이터 도메인

```text
organization_signup_requests
invitations
case_stage_templates
case_stage_template_steps
case_messages
case_requests
case_request_attachments
billing_entries
```

## 6. 권한 구조

UI는 단순하게 Admin / Staff로 보이게 하되, 실제 저장 구조는 기존 membership role + permissions JSONB를 유지한다.

```text
organization_memberships
  ├ role
  └ permissions
```

## 7. 의뢰인 포털

의뢰인은 읽기 전용 사용자가 아니라 제한된 쓰기 권한의 참여자다.

허용
1. 공개 문서 보기
2. 공개 일정 보기
3. 메시지 보내기
4. 요청 생성
5. 자료 제출
6. 일정 제안
7. 청구/입금 확인

차단
1. 내부 메모 보기
2. 타 사건 접근
3. 결재 수정
4. 조직 정보 접근
