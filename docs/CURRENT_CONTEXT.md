# CURRENT CONTEXT

> 새 세션은 이 파일만 먼저 읽고 현재 상태를 고정한다. 다른 문서를 근거로 상태를 되돌리지 않는다.
> Last updated: 2026-04-17

## 1. 공식 상태
- 공식 상태: 실서비스 투입 가능
- 기준 문서: `docs/RELEASE_APPROVAL_2026-04-15.md`

## 2. 닫힌 챕터 (재논의 금지)
- 배포·보안 챕터 종료
- fresh DB replay / branch workaround / secret rotation 재논의 금지
- navigation hardcoding 82→0 종료, baseline 0 고정
- 빈 `0059~0070` migration 파일 논의 금지 (이미 삭제됨)
- `REHAB_AUDIT_CLI_CHECKLIST.md` 재개 금지
- COLAW 잔재 제거 지시서 재개 금지
- 문서 생성 알림(`notifyDocumentStakeholders`) 챕터 — 2026-04-17 staging 15/15 검증. `docs/VERIFICATION_RESULT_document_notifications_2026-04-17.md` 참조. 이 경로 건드릴 때만 재검증.

## 3. 현재 챕터
- `docs/BACKLOG_2026-04-15.md` 기준 허브 체감 개선

## 4. 최근 핵심 커밋
- `c4ac134` feat(hub-projection): case_documents + fee_agreements 문서 타임라인 통합
- `13e5d0f` perf: force-dynamic 감사 + 사건 상세 쿼리 병렬화
- `1df65a6` feat(dashboard): 허브 모음 뷰(DashboardHubOverview) 추가
- `19e755e` refactor(navigation): 하드코딩 0 달성 — baseline 고정

## 5. 지금 해야 할 일 (우선순위 순)
1. ~~`dashboard-hub-overview.tsx`의 `overdueMap` 실데이터 주입~~ ✅ 2026-04-17
2. ~~허브 projection 문서 타임라인을 실제 UI(`case-hubs/[hubId]`, `rehab-documents-tab`, `bankruptcy-documents-tab`)에 연결~~ ✅ 2026-04-17 (`<CaseHubDocumentTimeline>` 컴포넌트 + 3개 소비처 주입)
3. ~~의뢰인 포털(`portal/cases/[caseId]`)에 동일 타임라인 컴포넌트 연결 — 3-역할 한 화면 데모 완성~~ ✅ 2026-04-17 (portal-scope 머지 + `<CaseHubDocumentTimeline>` 재사용)
4. ~~문서 생성 시 알림 자동 발생 — 직원(`/cases/:caseId?tab=documents`) + 의뢰인(`/portal/cases/:caseId`, 공개 문서만)~~ ✅ 2026-04-17 (`DOCUMENT_CREATED` + `DOCUMENT_SHARED_WITH_CLIENT` 정책 + `notifyDocumentStakeholders`). **staging 15/15 검증 완료** (`docs/VERIFICATION_RESULT_document_notifications_2026-04-17.md`)
5. ~~검증관용 임시 페르소나 시드·teardown 스크립트 + 검증 체크리스트~~ ✅ 2026-04-17 (`scripts/seed-verification-personas.mjs`, `scripts/teardown-verification-personas.mjs`, `docs/VERIFICATION_CHECKLIST_document_notifications.md`)
6. ~~비용 메뉴 재정의 (완전개편) — /billing을 읽기 전용 리포트로 축소, 쓰기는 허브 탭으로 수렴, BillingComingSoonCards/쓰기 패널 삭제, 메뉴 레이블 "비용 리포트"로 변경~~ ✅ 2026-04-17 (사용자 주관 승인 후 실행, `BACKLOG §2.1` 참조)
7. 사용자 체감 화면 1개씩 끝내기 — 추상적 리팩터 금지

## 6. 손대면 안 되는 것
- `src/app/(app)/cases/[caseId]/rehabilitation/tabs/rehab-creditors-tab.tsx` (사용자 작업 중)
- `src/components/dashboard-hub-client.tsx` 내부 카드 중복 제거 (별도 스프린트, `1df65a6` 커밋 메시지 참조)
- 과거 배포 블로커 문서의 상태를 현재 기준으로 되돌리는 행위
- 빈 migration 파일 복원 / REHAB_AUDIT_CLI_CHECKLIST 재활성화

## 7. 응답 규칙
- 첫 응답은 3줄만
  1) 현재 기준
  2) 지금 작업 1개
  3) 바로 착수
- "진행할까요?" 금지
- production write / delete / cost / push / merge만 직전 1회 확인

## 8. 새 세션 시작 명령 (사용자용)
```
먼저 docs/CURRENT_CONTEXT.md만 읽고, 그 기준으로 현재 상태 3줄 요약 후 바로 작업 시작해라.
닫힌 챕터(배포/보안/fresh replay/navigation hardcoding/빈 0059~0070/REHAB_AUDIT_CLI_CHECKLIST)는 다시 열지 마라.
"진행할까요?" 같은 질문 금지. production write·delete·cost·push·merge만 직전 1회 확인.
```
