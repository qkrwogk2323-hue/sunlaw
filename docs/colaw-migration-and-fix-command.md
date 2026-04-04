# colaw 전체 사건 마이그레이션 + 문서 출력 일치화 명령서

> **목표**: colaw.co.kr의 90건 전체 개인회생 사건을 Vein Spiral에 이관하고,
> 출력 결과물이 colaw ClipReport와 100% 일치하도록 문서 생성기를 수정한다.
> **작성일**: 2026-04-04
> **대상 법무법인**: 서해

---

## 전체 작업 순서

```
[STEP 1] 마이그레이션 스크립트 실행 — 90건 colaw → VS DB 이관
[STEP 2] 기존 문서 버그 수정 — P0~P2 전체 (rehab-module-completion-command.md 참조)
[STEP 3] 출력 결과물 대조 검증 — 대표 3건으로 colaw vs VS 비교
[STEP 4] 불일치 발견 시 추가 수정
```

---

## STEP 1: 마이그레이션 실행

### 1-1. 스크립트 위치

```
scripts/colaw-migration/migrate-colaw-to-vs.ts  ← 메인 스크립트 (90건 ID 내장)
scripts/colaw-migration/README.md               ← 필드 매핑 문서
```

### 1-2. 실행 전 점검

1. `npm install puppeteer @supabase/supabase-js` 설치
2. colaw.co.kr 브라우저 자동 로그인 상태 확인
3. `.env` 설정:
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
   - `ORGANIZATION_ID` (법무법인 서해 조직 UUID)
   - `CREATED_BY` (실행자 프로필 UUID)
   - `CHROME_DATA_DIR` (Chrome 프로필 경로)

### 1-3. 실행

```bash
npx tsx scripts/colaw-migration/migrate-colaw-to-vs.ts
```

### 1-4. 스크립트 개선 필요 사항

마이그레이션 스크립트는 기본 구조가 작성되어 있으나, colaw의 정확한 form 구조에 따라 아래 부분을 현장에서 조정해야 한다:

| 항목 | 상태 | 필요 작업 |
|------|------|----------|
| 신청인 탭 추출 | ✅ 검증 완료 | field name 확인됨 |
| 채권자 탭 추출 | ⚠️ 부분 검증 | `creditor-add-list` 셀렉트 순회 로직 현장 테스트 |
| 재산 탭 추출 | ⚠️ 구조 미확인 | 테이블 셀렉터 현장 조정 |
| 수입지출 탭 추출 | ⚠️ 구조 미확인 | field name 현장 확인 |
| 진술서 탭 추출 | ⚠️ 구조 미확인 | textarea name 현장 확인 |
| 변제계획안 10항 | ⚠️ 구조 미확인 | textarea 순서 현장 확인 |

**권장**: 1건(김진한 #84, cs=5733046)으로 먼저 테스트 후 전체 실행

---

## STEP 2: 문서 생성기 버그 수정

**상세 명령**: `docs/rehab-module-completion-command.md` 참조 (이미 작성 완료)

### P0 치명 결함 (4건)

| ID | 내용 | 수정 파일 |
|----|------|----------|
| P0-1 | 가용소득 불일치 (회생위원 보수 조건부 차감) | document-generator.ts |
| P0-2 | 대리인 정보 전체 문서 빈칸 | document-generator.ts 전 함수 |
| P0-3 | 변제기간 날짜 빈칸 | document-generator.ts generateRepaymentPlan |
| P0-4 | 사건번호 빈칸 | document-generator.ts generateApplication |

### P1 중요 결함 (9건)

| ID | 내용 | 수정 파일 |
|----|------|----------|
| P1-1 | 채권자 합계 vs 무담보 채권액 불일치 | document-generator.ts |
| P1-2 | 채권현재액 산정기준일 빈칸 | document-generator.ts |
| P1-3 | 채권자 주소/연락처 빈칸 | document-generator.ts |
| P1-4 | 재산 명칭 빈칸 | document-generator.ts |
| P1-5 | 면제재산 placeholder 텍스트 | document-generator.ts |
| P1-6 | 급여소득 상세 빈칸 | document-generator.ts |
| P1-7 | 고용/자영 구분 미체크 | document-generator.ts |
| P1-8 | 변제계획안 채권액 불일치 | document-generator.ts |
| P1-9 | 진술서 거의 전체 빈칸 | document-generator.ts + queries |

### P2 개선 사항 (7건)

| ID | 내용 |
|----|------|
| P2-1 | 생계비 표시 로직 |
| P2-2 | 가족관계 빈칸 |
| P2-3 | 개시신청서 내용 과소 |
| P2-4 | 위임장 위임사항 목록 누락 |
| P2-5 | 주거상황 기본값 오류 |
| P2-6 | 모달 닫기 UX 문제 |
| P2-7 | 주민번호 마스킹 차이 |

---

## STEP 3: 출력 비교 검증

### 3-1. 대조 대상 사건 (3건)

| 번호 | 이름 | casebasicsseq | 특징 |
|------|------|---------------|------|
| 84 | 김진한 | 5733046 | 급여소득자, 무담보 채권만, 이미 분석 완료 |
| 89 | 최병호 | 5748242 | 최신 사건, 인천지방법원 |
| 77 | 김상수 | 5711568 | 서울회생법원, 다른 관할 테스트 |

### 3-2. 문서별 비교 항목

각 대조 사건에 대해 아래 7개 문서를 비교:

#### 개시신청서 (B_27)
- [ ] 사건번호 일치
- [ ] 신청인 성명/주민번호 일치
- [ ] 주소(등록상/현주소) 일치
- [ ] 대리인 정보 일치
- [ ] 관할법원 일치

#### 위임장 (B_28)
- [ ] 위임인(신청인) 정보 일치
- [ ] 대리인(법무사) 정보 일치
- [ ] 위임사항 목록 있음

#### 변제계획안 (B_29)
- [ ] 가용소득 금액 일치 (회생위원 보수 조건 확인)
- [ ] 월 변제액 일치
- [ ] 총 변제액 일치
- [ ] 변제율(%) 일치
- [ ] 변제기간(시작일~종료일) 일치
- [ ] 채권자별 배분액 일치

#### 채권자목록
- [ ] 채권자 수 일치
- [ ] 각 채권자 이름/주소/금액 일치
- [ ] 합계 금액 일치
- [ ] 산정기준일 표시

#### 재산목록
- [ ] 재산 항목 수 일치
- [ ] 각 항목 명칭/금액 일치
- [ ] 면제재산 설명 표시

#### 수입지출목록
- [ ] 급여소득 금액 일치
- [ ] 기간구분/연간환산 표시
- [ ] 고용/자영 구분 체크 일치
- [ ] 가족관계 데이터 표시

#### 진술서
- [ ] 경력 사항 표시
- [ ] 주거 상황 표시
- [ ] 부채 경위 표시
- [ ] 면책절차 표시

### 3-3. colaw 출력물 확인 방법

```
colaw ClipReport URL 패턴:
https://report.colaw.co.kr/ClipReport4/JavaOOFGeneratorChange4_Popup.jsp
  ?crfName=B_27  (또는 B_28, B_29, B_30, B_31)
  &crfParams=casebasicsseq:{cs}^companycode:20130527120720950^diaryyear:{dy}^resurapplicationpersonseq:{rs}^reportprintexcept:1
  &crfDbName=mssql
  &crfHwpType=H
```

각 문서 코드:
- B_27: 개시신청서
- B_28: 위임장
- B_29: 변제계획안
- B_30: 위임인확인서
- B_31: 정보수신신청서

---

## STEP 4: 불일치 수정

STEP 3에서 발견된 불일치를 아래 형식으로 기록하고 수정:

```
문서: [문서명]
항목: [불일치 항목]
colaw 값: [colaw에서 표시되는 값]
VS 값: [Vein Spiral에서 표시되는 값]
원인: [데이터 미입력 / 바인딩 누락 / 계산 로직 차이]
수정 파일: [파일명:라인]
수정 내용: [구체적 코드 변경]
```

---

## 참조 문서

```
docs/rehab-full-audit-2026-04-04.md           ← 전수조사 보고서
docs/rehab-module-completion-command.md        ← P0~P2 수정 상세 명령서
scripts/colaw-migration/migrate-colaw-to-vs.ts ← 마이그레이션 스크립트
scripts/colaw-migration/README.md              ← 필드 매핑 + 실행 안내
```

---

## colaw 사건 전체 목록 (90건 요약)

| 범위 | 기간 | 건수 |
|------|------|------|
| #81~90 | 2026-02 ~ 2026-03 | 10건 |
| #71~80 | 2026-01 ~ 2026-02 | 10건 |
| #61~70 | 2025-11 ~ 2025-12 | 10건 |
| #51~60 | 2025-09 ~ 2025-11 | 10건 |
| #41~50 | 2025-07 ~ 2025-09 | 10건 |
| #31~40 | 2025-05 ~ 2025-07 | 10건 |
| #21~30 | 2025-03 ~ 2025-05 | 10건 |
| #11~20 | 2025-01 ~ 2025-03 | 10건 |
| #1~10 | 2024-12 ~ 2025-01 | 10건 |

전체 ID 목록: `scripts/colaw-migration/migrate-colaw-to-vs.ts`의 `COLAW_CASES` 배열
