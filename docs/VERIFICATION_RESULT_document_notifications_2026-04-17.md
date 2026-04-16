# 검증 결과 — 문서 생성 알림 (2026-04-17)

> 대상: `cdc29bc feat(notifications): 문서 생성 시 이해당사자 알림 자동 발생`
> 체크리스트: `docs/VERIFICATION_CHECKLIST_document_notifications.md`
> 검증 환경: `veinspiral-staging` (`siljimybhmmtbligzbms`)
> 검증 방법: `notifyDocumentStakeholders` 로직을 DB 레벨에서 재현 (`verify-scenarios.mjs`)
> 검증 실행일: 2026-04-17

---

## 결과 요약

| 항목 | 결과 |
|---|---|
| 총 검증 항목 | 15건 |
| 통과 | **15건** |
| 실패 | **0건** |

---

## 시나리오 A — `client_visible` 문서 등록 (8/8 통과)

Staff A(actor)가 `client_visible` 문서를 등록했을 때:

| # | 검증 항목 | 기대 | 결과 |
|---|---|---|---|
| A-1 | Staff A(actor)에게 알림 없음 | 본인 등록은 알림 제외 | ✅ |
| A-2 | Staff B에게 DOCUMENT_CREATED 수신 | org_manager이므로 수신 | ✅ |
| A-3 | Staff C에게 DOCUMENT_CREATED 수신 | case handler이므로 수신 | ✅ |
| A-4 | Client D에게 DOCUMENT_SHARED_WITH_CLIENT 수신 | portal_enabled + client_visible | ✅ |
| A-5 | Client E에게 알림 없음 | portal_enabled=false → 수신 금지 | ✅ |
| A-6 | Staff F에게 알림 없음 | 다른 조직 → 격리 | ✅ |
| A-7 | Staff B destination URL 정확성 | `/cases/:caseId?tab=documents` | ✅ |
| A-8 | Client D destination URL 정확성 | `/portal/cases/:caseId` | ✅ |

---

## 시나리오 B — `internal_only` 문서 등록 (5/5 통과)

Staff A(actor)가 `internal_only` 문서를 등록했을 때:

| # | 검증 항목 | 기대 | 결과 |
|---|---|---|---|
| B-1 | Staff B·C에게 DOCUMENT_CREATED 수신 | 직원은 internal도 수신 | ✅ |
| B-2 | Client D에게 알림 없음 | internal_only → 의뢰인 제외 | ✅ |
| B-3 | Client E에게 알림 없음 | portal off + internal | ✅ |
| B-4 | Staff F에게 알림 없음 | 다른 조직 | ✅ |
| B-5 | DOCUMENT_SHARED_WITH_CLIENT 0건 | 의뢰인 알림 타입 자체가 없어야 함 | ✅ |

---

## 시나리오 C — 협업 조직 격리 확인 (2/2 통과)

Org2를 `partner_org` role로 `case_organizations`에 추가한 뒤 문서 등록:

| # | 검증 항목 | 기대 | 결과 |
|---|---|---|---|
| C-1 | Staff F 여전히 알림 없음 | case_organizations 추가만으로는 알림 수신 불가 (의도된 정책) | ✅ |
| C-2 | Staff B·C 정상 수신 | 기존 동작 유지 | ✅ |

비고: 현재 `notifyDocumentStakeholders`는 `organization_memberships`(Org1) + `case_handlers`만 조회한다. `case_organizations` 연쇄를 통한 협업 조직 매니저 알림은 후속 스프린트 범위.

---

## 참고사항

- 시나리오 C에서 최초 `collaborating_org` role을 시도했으나 enum에 존재하지 않아 `partner_org`로 변경. 실제 동작에 차이 없음 (어떤 role이든 격리 결과 동일).
- 검증 후 알림 row는 `_verification_tag` 기준으로 자동 정리 완료.
- `case_documents` 테스트 row는 이 검증에서 생성하지 않음 (알림 로직만 재현).
- teardown은 별도 실행 필요: `node scripts/teardown-verification-personas.mjs`

---

## 검증 스크립트

검증에 사용한 임시 스크립트: `verify-scenarios.mjs` (프로젝트 루트, 커밋 불필요)
