# 개인회생·개인파산 진행 상태

> **목적**: 조사관/실행자/검증관 세션이 공유하는 단일 진실 파일
> **규칙**: 세션 시작 전 반드시 읽고, 세션 끝날 때 반드시 업데이트
> **마지막 갱신**: 2026-04-07
> **HEAD**: `f3d1932` (P1-10 종결)

---

## 0. 운영 원칙 (재발방지 — 2026-04-07 추가)

이 5개를 어겨서 한 사이클씩 손해 봤습니다. 다음 세션은 반드시 지킬 것:

1. **세션 시작 = 이 파일 + 최신 P*-directive 읽기.** 같은 디렉티브 두 번 받지 않기.
2. **수치는 코드에 박기 전 산수 검산.** (33.7702 / 20,212,548 사고)
3. **김한경 1건 end-to-end 통과 전엔 다음 작업 시작 금지.**
4. **세션 끝날 때 이 파일 갱신 + 작업 히스토리에 한 줄 추가.**
5. **콜로 외부 영역(ClipReport mssql)은 역공학 금지.** 1원 단위 일치 요구는 외부 주입 경로(`buildAdjustedSchedule({totalTarget})`)로만 흡수.

---

## 🔴 블로커

### BLK-1. 채권자 금액 불일치 70건 → 스크립트 준비 완료, CLI 실행 대기
- 증상: colaw 마이그레이션된 90건 중 70건의 채권자 총액이 colaw와 다름
- 수정 완료: `RE_EXTRACT_TARGETS` 87건 전수 매핑 / `extractIncome()` 필드명 교정 / `median_income_year` DB 업데이트 / `incomeUrl()` 추가
- **남은 작업**: CLI에서 `npx tsx scripts/colaw-migration/re-extract-creditors.ts` 실행
- 이후 P1-6(b) 재집계 스크립트로 잔여 mismatch 확인 (`df78234` 참조)
- 보고서: `docs/colaw-vs-verification-report-v2.md`, `docs/reports/investigation-2026-04-06.md`

### BLK-2. 김한경 1건 end-to-end 검증 미완료
- 입력 → 저장 → 계산 → 문서 출력 → colaw 비교까지 한 사이클 통과 전엔 다음 사건/모듈 진행 금지
- P0~P1-10 코드 변경분이 실제 김한경 한 명에서 정합하는지 확인 필요
- 현재 단위 검증만 통과 (561,457×36, leibniz 33.7719 등)

---

## 📋 개인회생 모듈

### 탭별 완성도

| 탭 | 저장 | 로드 | 계산 | 문서 출력 | 상태 |
|----|------|------|------|----------|------|
| 신청인 | ✅ | ✅ | - | ✅ | 완료 |
| 채권자 | ✅ | ✅ | ✅ | ✅ | 완료 (BLK-1 잔재) |
| 재산 | ✅ | ✅ | ✅ | ✅ | 완료 |
| 소득·생계비 | ✅ | ✅ | ✅ | ✅ | 완료 |
| 진술서 | ✅ | ✅ | - | ✅ | 완료 |
| 변제계획 | ✅ | ✅ | ✅ | ✅ | 완료 (P1-9 라운딩 적용) |
| 출력·문서 | - | - | - | ✅ | 완료 |

### P0~P1 포팅 진행 상태

| ID | 항목 | 커밋 | 상태 |
|---|---|---|---|
| P0 | 라이프니츠 현가 + 계단식 조세우선 배분 + 확정/미확정 | `d856c3b` | ✅ |
| P0-1 | leibniz 정밀도 — 역산 리터럴 → 공표 4자리 (33.7719) | `c693120` | ✅ |
| P0-3 | 별제권 담보 부족액 자동 도출 | `dd1f19f` | ✅ |
| P1-1 | 생계비 자동 조정 (기준중위 60%, 2022~2026 전 연도) | `7a5b54d`,`d49d5c7`,`e6ce03b` | ✅ |
| P1-2 | 변제기간 자동 결정 (36/48/60 청산가치 보장) | `8b52377` | ✅ (48/60 계수는 P1-10에서 확인 — 33.7719 산식 검증됨) |
| P1-3 | 변제율 표기 (%) | `7a5b54d` | ✅ |
| P1-4 | B_19 "10항 이하" 자동문구 엔진 | — | ⏸ 보류 (전체 조항 사전 미수집, 김한경 1건만) |
| P1-5 | 마이그레이션 — 담보평가액 추출 | — | ⏸ colaw 모달 캡처 선행 |
| P1-6(a) | 김한경 중복 사건 정리 | — | ⏸ |
| P1-6(b) | mismatch 재집계 스크립트 | `7e6c0e9`,`df78234` | ✅ (BLK-1 실행 대기) |
| P1-7 | 월가용소득 공식 확장 (colaw 4필드 통합) | `ae3b994` | ✅ |
| P1-8 | 변제기간 6규칙 엔진 + setting=6 39% 검증 | `d846f6c` | ✅ |
| P1-9 | 회차분배 라운딩 + 마지막달 보정 + 변제율 자리수 | `c9c2a1d` | ✅ (561,457/561,461 분포 재현) |
| P1-10 | 라이프니츠 K vs L 충돌 결정 | `f3d1932` | ✅ **가설 B 채택 / 코드 수정 0건** |

### P1-10 핵심 결론 (재발방지용 요약)

- `LEIBNIZ_REHAB[36] = 33.7719` 유지 (colaw 저장 `leibniz=30.7719` + 3 = 33.7719 ✅ 일치)
- `period-setting.ts totalScheduled = monthly × months` 단순곱 유지
- K(총변제예정액)는 **colaw 도메인 밖** — `report.colaw.co.kr/ClipReport/B_29`(mssql) 서버측 산출
- 김한경 +96원 차이는 ClipReport 회차분배 ceil 흡수 결과. Vein은 `buildAdjustedSchedule({totalTarget})` 외부 주입으로만 흡수
- 가설 A (이중 계수 33.7702/33.77519)는 anatomy 유령값 → 폐기
- **사고 기록**: 4-07 09시경 검산 없이 "33.7702 × 36 / 33.7719 = 20,212,548" 코드에 박았다가 실제 20,213,470 (922원 차이) 발견. 한 사이클(약 2시간) 손실 후 host HEAD `6394256`로 롤백

### 법원 제출 문서

| 문서 | 구현 | 데이터 바인딩 | 샘플 검증 |
|------|------|------------|----------|
| 개시신청서 / 위임장 / 담당변호사지정서 / 금지·중지명령 / 채권자목록 / 재산목록 / 수입지출목록 / 진술서 / 변제계획안 | ✅ | ✅ | ⏸ (BLK-2) |

### 계산 로직 검증

| 항목 | 상태 |
|------|------|
| 월 가용소득 공식 (P1-7) | ✅ |
| 변제율 계산 (P1-3) | ✅ |
| 청산가치 보장 원칙 (P1-2) | ✅ |
| 적격성 한도 검증 | ✅ |
| 기준중위소득 2022~2026 (P1-1) | ✅ |
| 라이프니츠 36/48/60 (P0-1) | ✅ (36 김한경 검증, 48/60은 산식 일관 — 케이스 확보 권장) |
| 회차분배 라운딩 (P1-9) | ✅ (김한경 561,457/561,461) |
| 6규칙 엔진 (P1-8) | ✅ (setting=6 39%) |

---

## 📋 개인파산 모듈

### colaw 구조 채증 (2026-04-07 신규)

`docs/reports/colaw-auto-fill-profile-2026-04-07.md` 참조.

| 항목 | 값 |
|---|---|
| 진입점 | `/documentManage/documentBankruptList` |
| popup 네임스페이스 | `/bankruptcyManage/popup*` |
| 식별자 | `bankruptapplicantseq + casebasicsseq + diaryyear + division` |
| 리포트 엔진 | **ClipReport4** (회생 ClipReport와 버전 다름) |
| 전체인쇄 템플릿 | `C_18^C_17^C_9^C_2^C_3^C_15^C_5^C_6^C_12` (9개 합본) |
| 추가 파라미터 | `UPDOWN` |
| 채증 케이스 | 이경호 `ba=56308 / cs=5765514 / dy=2026` |

### 7개 탭 popup 엔드포인트 매핑 완료

| 탭 | URL | 클래스 |
|---|---|---|
| 신청서 | `/bankruptcyManage/popupBankruptcyApplication` | `application` |
| 진술서 | `/bankruptcyManage/popupBankruptcyAffidavitList` | `affidavit` |
| 채권자 | `/bankruptcyManage/popupBankruptcyCreditList` | `credit` |
| 재산 | `/bankruptcyManage/popupBankruptcyPropertyList` | `property` |
| 생활상황 | `/bankruptcyManage/popupBankruptcyLifeStyleList` | `lifestyle` |
| 수입지출 | `/bankruptcyManage/popupBankruptcyIncomeExpense` | `incomeexpense` |
| 자료제출 | `/bankruptcyManage/popupBankruptcyDataSubmission` | `datasubmission` |

### 탭별 구현

| 탭 | 저장 | 로드 | 계산 | 문서 출력 | 상태 |
|----|------|------|------|----------|------|
| 신청인 / 채권자 / 재산 / 면제재산 / 수입지출 / 진술서 | ⏸ | ⏸ | ⏸ | ⏸ | 미착수 |
| 출력·문서 | - | - | - | ⏸ | 부분 (`bankruptcy-document-actions`) |

### 법원 제출 문서

| 문서 | 구현 |
|------|------|
| 파산신청서 / 면책신청서 / 채권자목록 / 재산목록 / 수입지출목록 / 진술서 | ⏸ |

C_2~C_18 9개 템플릿의 한글 명칭 매핑은 다음 채증 단계.

---

## 🧪 검증 결과

### 실사건 1건 end-to-end 테스트
- 사건: **김한경** (회생, `cs=5640948 / dy=2025 / rs=210485`)
- 상태: ⏸ BLK-2 — 단위 검증만 통과, end-to-end 통과 아님

### 김한경 채증 확정 값 (재현 기준선)

| 항목 | colaw 값 | 출처 |
|---|---|---|
| `monthaverageincomemoney` | 2,100,000 | popupRescureIncomeExpenditure |
| `lowestlivingmoney` (1.5배) | 1,538,543 | 동상 |
| `nowvalue` (현재가치 L) | **18,961,470** | 동상 |
| `leibniz` (n−3 원값) | **30.7719** | 동상 |
| `forcingrepaymentmonth` | 36 | 동상 |
| `repaymentperiodsetting` | 6 | 동상 |
| 1~12회 월변제액 | 561,457 | 변제계획안 출력 |
| 13~36회 월변제액 | 561,461 | 변제계획안 출력 |
| K (총변제예정액) | 20,212,548 | ClipReport B_29 산출 |
| base × months | 20,212,452 | (K − 96, 회차분배 ceil 흡수 결과) |

---

## 📅 작업 히스토리

| 날짜 | 작업 | 커밋 |
|------|------|------|
| 2026-04-04 | 개인회생 모듈 신설 (7탭, 5141줄) | f482576 |
| 2026-04-04 | 필드 매핑 / 문서 생성기 / 잔여이슈 | 5fe4648, 3de6bdb, 55ce0e6 |
| 2026-04-05 | 변제계획 저장 버그 / QA | a7d621f, 2e32b6d |
| 2026-04-06 | 위임장·담당변호사·채권자 레이아웃 | 4904b33, 7d4ddd6 |
| 2026-04-06 | 가족구성원 마이그 219명/79건 | (cowork) |
| 2026-04-06 | 채권자 불일치 분석·자동수정 / 보건복지부 생계비 / net_salary 39건 | (cowork) |
| 2026-04-06 | re-extract-creditors.ts 87건 매핑 + extractIncome 교정 | (cowork) |
| 2026-04-06 | P0 라이프니츠 현가 + 조세우선 배분 + 확정/미확정 | d856c3b |
| 2026-04-06 | P0-3 별제권 담보 부족액 자동 도출 | dd1f19f |
| 2026-04-07 | P0 회귀 테스트 + 라이프니츠 정밀도 보정 | 70c5389, c693120 |
| 2026-04-07 | P1-1 생계비 자동 + P1-3 변제율 + 2022~2026 보강 | 7a5b54d, d49d5c7, e6ce03b |
| 2026-04-07 | P1-2 변제기간 자동결정 (청산가치 보장) | 8b52377 |
| 2026-04-07 | P1-6(b) mismatch 재집계 + P1-7 컴퓨터 경로 통일 | 7e6c0e9, df78234 |
| 2026-04-07 | P1-7 월가용소득 공식 확장 (4필드 통합) | ae3b994 |
| 2026-04-07 | P1-8 변제기간 6규칙 엔진 + setting=6 39% | d846f6c |
| 2026-04-07 | P1-9 라운딩·마지막달 보정·변제율 자리수 | c9c2a1d |
| 2026-04-07 | puppeteer + 재추출 수동로그인 대기 | 6394256 |
| 2026-04-07 | **사고**: K 이중계수 산수 오류 (33.7702) → 가설 A 폐기 → 호스트 롤백 | (롤백) |
| 2026-04-07 | P0-1 K vs L 충돌 분석 보고서 | 8c23fd3 |
| 2026-04-07 | P1-10 종결 — colaw 직접 채증으로 가설 B 확정 (코드 수정 0건) | f3d1932 |
| 2026-04-07 | colaw 자동작성 로직 데이터 프로파일 (회생+파산) | (cowork, docs only) |

---

## 📖 관련 문서

- 프로젝트 목표: `docs/project-goal.md`
- colaw 검증 보고서: `docs/colaw-vs-verification-report-v2.md`
- 전수조사: `docs/rehab-full-audit-2026-04-04.md`
- 회생 anatomy: `docs/reports/colaw-repayment-plan-anatomy.md`
- P0 디렉티브: `docs/reports/p0-porting-directive-2026-04-06.md`
- P1 디렉티브: `docs/reports/p1-porting-directive-2026-04-07.md`
- P1-10 결론: `docs/reports/leibniz-k-l-conflict-2026-04-08.md`
- **콜로 자동작성 프로파일 (회생+파산)**: `docs/reports/colaw-auto-fill-profile-2026-04-07.md`
- 김한경 식별자: `cs=5640948 / dy=2025 / rs=210485`
- 이경호(파산 채증) 식별자: `ba=56308 / cs=5765514 / dy=2026`

---

## 🎯 다음 작업 (우선순위 — 절대 건너뛰지 말 것)

1. **BLK-1 해결**: CLI에서 `npx tsx scripts/colaw-migration/re-extract-creditors.ts` 실행
2. **BLK-1 후속**: P1-6(b) 재집계 스크립트로 mismatch 잔재 확인
3. **🔴 BLK-2 김한경 1건 end-to-end** — 입력→저장→계산→문서출력→colaw 비교 한 사이클 통과
   - 통과 기준: 변제계획안 출력의 1~12회 561,457 / 13~36회 561,461 / 총합 20,212,548 정확 재현 (±0원, ±96원은 외부 주입으로 허용)
4. **(선택) 회생 추가 케이스 채증** — setting≠6, 48mo, 60mo 각 1건 (L 공식 일반화 확인)
5. **개인파산 C_* 9개 템플릿 의미 매핑** — `colaw-auto-fill-profile-2026-04-07.md` §5
6. **개인파산 모듈 구현 시작** — 신청서/채권자/재산 부터
