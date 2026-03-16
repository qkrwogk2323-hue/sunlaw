# Vein Spiral v2.1 아키텍처 개요

## 1. 상위 구조

```text
Landing
Internal Workspace
Client Portal
Admin 메뉴(Internal Workspace 내 확장)
```

## 2. Internal Workspace

```text
Dashboard
Inbox
Cases
Collections
Documents
Calendar
Clients
Reports
Settings
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
