# 개인회생 자동작성 모듈 완성 명령서

> **목표**: 7개 법원 제출 문서가 실제 데이터로 빈칸 없이 생성되어, 법무사가 출력 즉시 법원에 제출할 수 있는 상태로 만든다.
> **검증 기준**: 김진한 사건(cbf04b73-a193-4e02-b5ac-1c9cca381620)으로 출력한 문서에 placeholder·빈칸·불일치·NaN이 0개여야 한다.
> **비교 원본**: colaw.co.kr ClipReport (B_27~B_31) 출력물

---

## 작업 전 필수 읽기

```
docs/rehab-full-audit-2026-04-04.md          ← 전수조사 보고서 (P0/P1/P2 전체 목록)
src/lib/rehabilitation/document-generator.ts  ← 문서 생성 핵심 (7개 함수)
src/lib/queries/rehabilitation.ts             ← getRehabModuleData() 데이터 fetch
src/lib/actions/rehabilitation-actions.ts     ← generateRehabDocument() 서버 액션
src/app/(app)/cases/[caseId]/rehabilitation/tabs/rehab-documents-tab.tsx ← 출력/문서 탭 UI
```

---

## 파이프라인 구조 (반드시 이해하고 시작)

```
[Supabase 10개 테이블]
    ↓ getRehabModuleData() — Promise.all 병렬 fetch
[DocumentData 객체]
    ↓ generateDocument(type, data) — 7개 내부 함수 분기
[HTML string]
    ↓ iframe 또는 다운로드
[법원 제출 문서]
```

핵심: **DB에 데이터가 있어도 document-generator.ts에서 바인딩하지 않으면 문서에 안 나온다.**
모든 수정은 이 파이프라인의 어느 단계가 끊어져 있는지 파악 → 연결하는 작업이다.

---

## PHASE 1: P0 치명 결함 수정 (법원 제출 차단)

### 1-1. 가용소득 일관성 확인 (회생위원 보수 조건부 차감)

**파일**: `document-generator.ts` `generateRepaymentPlan()` (라인 ~920)

#### 핵심 업무 규칙: 회생위원 보수 차감은 조건부

회생위원 보수(통상 3%)는 **법원이 외부 회생위원을 선임한 경우에만** 월 가용소득에서 차감한다.
- 외부 회생위원 미선임 → 보수 차감 없음 → `availableIncome = rawAvailable`
- 외부 회생위원 선임 → 보수 차감 → `availableIncome = rawAvailable - commission`

따라서 DB에 **"외부 회생위원 선임 여부"** 플래그가 필요하다.

**작업**:

1. `rehabilitation_income_settings` (또는 `rehabilitation_plan_settings`) 테이블에 `has_external_trustee` (boolean, default false) 필드가 있는지 확인. 없으면 추가:
   ```sql
   ALTER TABLE rehabilitation_income_settings
     ADD COLUMN IF NOT EXISTS has_external_trustee boolean DEFAULT false;
   ```

2. 변제계획 탭 UI에 "외부 회생위원 선임 여부" 토글/체크박스 추가. 선임 시에만 보수율 입력 필드 활성화.

3. 가용소득 계산 공식 (document-generator.ts + 탭 UI 양쪽 모두):
   ```
   rawAvailable = monthlyIncome - livingExpense - extraLivingCost - childSupport

   if (has_external_trustee && trustee_comm_rate > 0) {
     commission = floor(rawAvailable × trustee_comm_rate / 100)
     availableIncome = rawAvailable - commission
   } else {
     availableIncome = rawAvailable
   }
   ```

4. 변제계획안 문서에도 조건 반영:
   - 외부 회생위원 선임 시: "회생위원 보수 (3%): -13,842원" 행 표시
   - 미선임 시: 해당 행 숨김, 가용소득 = rawAvailable 그대로

**검증 (김진한 사건 — 외부 회생위원 선임 케이스)**:
- net_salary=2,981,000, living_cost=2,519,575 → rawAvailable=461,425
- has_external_trustee=true, trustee_comm_rate=3 → commission=13,842 → availableIncome=**447,583** (±1원 허용)
- 이 값이 변제계획 탭 UI의 가용소득과 ±1원 이내로 일치해야 한다
- 문서의 월변제액·총변제액·변제율·채권자별 배분이 모두 이 availableIncome 기준이어야 한다

**검증 (외부 회생위원 미선임 케이스)**:
- 동일 소득 데이터, has_external_trustee=false → availableIncome=**461,425** (차감 없음)
- 문서에 "회생위원 보수" 행이 표시되지 않아야 한다

**변제계획 탭에서도 동일 공식 사용하는지 교차 확인**:
- `rehab-plan-tab.tsx` 또는 해당 컴포넌트에서 가용소득 계산 로직을 찾아서 document-generator.ts와 비교
- 두 곳이 다르면 **하나의 공통 유틸 함수** `calcAvailableIncome(settings)` 로 분리하여 양쪽에서 import

### 1-2. 대리인 정보 전 문서 주입

**DB 스키마**: `rehabilitation_applications` 테이블에 이미 존재하는 필드:
```sql
agent_type      text  -- '법무사','변호사','기타'
agent_name      text  -- 대리인 이름/법무법인명
agent_phone     text
agent_email     text
agent_fax       text
agent_address   jsonb
```

**현상**: DB 필드는 있으나 실제 데이터가 비어있을 가능성 ↔ 데이터가 있는데 바인딩이 안 되는 것 두 가지를 모두 점검.

**작업 1 — 데이터 확인**:
```sql
SELECT agent_type, agent_name, agent_phone, agent_email
FROM rehabilitation_applications
WHERE case_id = 'cbf04b73-a193-4e02-b5ac-1c9cca381620';
```
→ 비어 있으면 **신청인 탭 UI에서 대리인 입력 섹션이 제대로 저장되는지** 확인
→ 신청인 탭에 대리인 입력 UI가 없으면 추가 필요

**작업 2 — 7개 문서 전부에서 대리인 바인딩**:

| 문서 | 대리인 표시 위치 | 현재 상태 |
|------|---------------|---------|
| 개시신청서 | 대리인 섹션 (법무법인/전화/이메일) | `app.agent_name` 사용 중 → 데이터만 채우면 됨 |
| 위임장 | "을(를)" 자리 + 위임대리인 행 | `app.agent_name` 바인딩 확인 필요 |
| 변제계획안 | 하단 대리인 서명란 | `agentName` 사용 중 → 확인 |
| 채권자 목록 | 불필요 | — |
| 재산 목록 | 불필요 | — |
| 수입지출 목록 | 불필요 | — |
| 진술서 | 불필요 | — |

`generateDelegation()` 함수에서:
- "본인은 아래의 개인회생절차에 관련하여 **을(를)** 본인의 법정대리인으로 위임합니다"
  → `을(를)` 앞에 `app.agent_name` 삽입
- 위임대리인 행에 `app.agent_name` 삽입

### 1-3. 변제기간 날짜

**파일**: `document-generator.ts` `generateRepaymentPlan()` (라인 ~929)

현재 코드가 `repayment_start_date` 또는 `application_date`에서 날짜를 가져오는데:
1. **DB에 해당 날짜가 저장되어 있는지** 확인
2. 저장되어 있으면 문서 출력에서 `[ ____ ]년` 대신 실제 날짜가 나오는지 확인
3. 날짜 포맷: `2026년 5월` 형식 (년-월만, 일 불필요)

**변제기간 표시 필요 위치**:
- 변제계획안 상단: "변제 기간: 2026년 5월 ~ 2029년 4월 (36개월)"
- 회차별 변제표: 1회차 시작월 ~ 36회차 종료월

### 1-4. 사건번호

**파일**: `generateApplication()` (라인 319)
- 현재: `수원회생법원 ${caseNumber} 개회 호` → `caseNumber`가 빈 문자열이면 "수원회생법원  개회 호"
- `app.case_number`가 비어있는지, 또는 사건 데이터의 다른 필드에 있는지 확인
- 사건번호가 아직 배정 전이면 "2026 개회    호" (빈칸)로 표시하되, placeholder 꺾쇠(`[    ]`)가 아닌 실제 법원 양식 형태

**사건번호가 필요한 모든 문서**:
- 개시신청서 헤더
- 채권자 목록 헤더 ("수원회생법원 2026 개회 호 채무자 김진한")
- 변제계획안 헤더

→ 한 곳에서 `caseNumber` 변수를 만들어 전 문서에 전파하는 패턴으로 통일

---

## PHASE 2: P1 데이터 바인딩 완성

### 2-1. 채권자 목록 (`generateCreditorList()`)

**수정 항목**:

a) **합계 행 일관성**: 상단 요약 테이블에서
   - 합계 = 원금+이자 총합 (163,600,000)
   - 무담보 회생 = 원금+이자 총합 (163,600,000) ← 현재 원금만 표시
   - 또는 "원금 합계"와 "채권현재액 합계"를 별도 행으로 명확히 분리

b) **채권현재액 산정기준일**:
   - `creditors` 각 행의 `assessment_date` 또는 `created_at` 사용
   - 상단에 전체 산정기준일 표시

c) **채권자 주소/연락처**:
   - `rehabilitation_creditors` 테이블에 `address`, `contact` 필드 존재 확인
   - 없으면 마이그레이션 추가: `ALTER TABLE rehabilitation_creditors ADD COLUMN address text, ADD COLUMN contact text;`
   - 채권자 탭 UI에 주소 입력 필드 추가
   - `generateCreditorList()`에서 바인딩

d) **이자 금액**: 각 채권자의 `interest` 필드가 DB에 있는지 확인 → 문서에 바인딩

### 2-2. 재산 목록 (`generatePropertyList()`)

a) **명칭 바인딩**: `properties[].asset_name` 또는 `asset_type` → 명칭 열
b) **면제재산**:
   - `propertyDeductions` 배열 데이터 → 면제재산 설명에 매핑
   - 데이터 없으면 "면제재산 결정신청 금액" 행 자체를 숨김 (placeholder 노출 금지)

### 2-3. 수입지출 목록 (`generateIncomeStatement()`)

a) **급여소득 상세 행**:
   ```
   기간구분: "월"
   금액: incomeSettings.net_salary (2,981,000)
   연간환산금액: net_salary × 12 (35,772,000)
   압류 유무: "없음" 또는 해당 필드
   ```

b) **고용/자영 구분**: `incomeSettings.income_type` 또는 `application.employment_type` 기반
   - "급여소득" → 고용(직장명) 열에 ■ 표시 + 직장명
   - "자영업" → 자영(상호) 열에 ■ 표시 + 상호명

c) **가족관계 테이블**: `familyMembers` 배열 → 각 행 생성
   - 데이터 없으면 "해당 없음" 한 행 표시

d) **생계비 표시**:
   - 실제 사용 생계비(2,519,575)를 명시하거나
   - 중위소득 60% 기준 조건문이 맞는지 확인 (현재 로직이 무조건 "60% 이하" 케이스를 표시)

### 2-4. 진술서 (`generateAffidavit()`)

진술서는 현재 거의 전체가 미매핑. `data.affidavit` 객체의 필드를 문서에 바인딩:

| 진술서 항목 | DB 필드 (추정) | 문서 위치 |
|-----------|-------------|---------|
| 최종학력 | `education_level`, `graduation_year` | I-1 |
| 과거 경력 | `career_history` (jsonb 배열) | I-2 테이블 |
| 결혼/이혼 | `marriage_history` | I-3 |
| 거주 시작일 | `residence_start_date` | II 상단 |
| 거주 유형 | `residence_type` (1~6) | II 체크박스 |
| 소송 경험 | `litigation_history` (jsonb 배열) | III-1 테이블 |
| 회생 사유 | `rehabilitation_reason` (배열) | III-2 체크박스 |
| 상세 사정 | `detailed_reason` (text) | III-3 텍스트 |
| 면책 이력 | `discharge_history` (jsonb 배열) | IV 테이블 |

**작업 순서**:
1. `rehabilitation_affidavits` 테이블 스키마 확인 — 위 필드들이 실제로 존재하는지
2. 없는 필드는 마이그레이션으로 추가
3. 진술서 탭 UI에서 해당 필드들이 입력/저장되는지 확인
4. `generateAffidavit()`에서 각 필드를 HTML에 바인딩
5. 체크박스는 해당 값에 따라 `■` / `□` 동적 토글

### 2-5. 변제계획안 채권액 통일

변제계획안 내부에 2개 테이블이 있음:
- **변제 내용 테이블**: 원금 기준 (23,600,000)
- **변제예정액표**: 원금+이자 기준 (23,950,000)

→ 둘 다 **원금+이자 합산 기준(=채권현재액)**으로 통일
→ `creditors[].capital + creditors[].interest` 사용

---

## PHASE 3: P2 품질 개선

### 3-1. 개시신청서 보강
colaw 수준으로 아래 항목 추가:
- 채무자 주소 (`app.address`)
- 직업 (`app.occupation`)
- 채무 요약 (채권자 수, 총 채무액)
- 관할법원명
- 첨부서류 목록 (표준 고정 텍스트)

### 3-2. 위임장 위임사항 목록 추가
표준 위임사항 (고정 텍스트):
```
1. 개인회생절차개시의 신청
2. 변제계획안의 작성 및 제출
3. 변제계획안의 수정
4. 개인회생절차에 관한 일체의 행위
```

### 3-3. 주민번호 마스킹 통일
`820517-*******` (7자리) → `820517-*****` (5자리) 또는 법원 제출 기준 확인 후 통일
→ `formatResidentNumber()` 헬퍼 하나로 전 문서 통일

### 3-4. 모달 닫기 버그
`rehab-documents-tab.tsx`의 `<dialog>` 요소:
- `onClose` 핸들러 + `Escape` 키 바인딩 + 닫기 버튼의 `onClick` 모두 점검
- `dialog.close()` 호출이 React state와 동기화되는지 확인

---

## PHASE 4: 최종 검증 체크리스트

**모든 수정이 끝난 후 아래를 전부 통과해야 완료**:

### 4-1. 빌드/타입 검증
```bash
npm run typecheck && npm run lint && npm run build
```
→ 에러 0개

### 4-2. 문서별 출력 검증 (김진한 사건 기준)

각 문서를 미리보기로 열어 아래를 검증:

**① 개시신청서**
- [ ] 채무자명: "김진한"
- [ ] 주민번호: "820517-*****" (마스킹 5자리)
- [ ] 대리인 법무법인명 표시됨
- [ ] 전화/이메일 표시됨
- [ ] 사건번호 또는 빈칸 양식 정상

**② 위임장**
- [ ] 위임자: "김진한"
- [ ] "을(를)" 앞에 대리인명 표시됨
- [ ] 위임대리인 행에 이름 표시됨
- [ ] 위임사항 1~4 목록 표시됨

**③ 채권자 목록**
- [ ] 채권자 5개 전부 표시 (신한/KB국민/하나/롯데/우리)
- [ ] 원금+이자 합계 일치 (163,600,000)
- [ ] 무담보 회생 채권액 = 합계와 일관
- [ ] 산정기준일 표시됨 (빈칸 아님)

**④ 재산 목록**
- [ ] 재산 명칭 표시됨 (빈칸 아님)
- [ ] 금액 4,830,000원
- [ ] 청산가치 4,830,000원
- [ ] "면제재산 (1. 설명)" placeholder 없음

**⑤ 수입 및 지출에 관한 목록**
- [ ] 고용(직장명) 열에 ■ 체크 표시
- [ ] 급여소득: 기간구분 "월", 금액 2,981,000원, 연간 35,772,000원
- [ ] 가족관계: 데이터 있으면 행 표시, 없으면 "해당 없음"

**⑥ 진술서**
- [ ] 최종학력 빈칸이 아닌 실제 데이터 또는 미입력 안내
- [ ] 주거상황 체크박스가 실제 데이터 기반 동적 선택
- [ ] 개인회생 사유 체크박스 1개 이상 선택됨
- [ ] placeholder 텍스트(YYYY, 설명 등) 0개

**⑦ 변제계획안**
- [ ] 외부 회생위원 선임 시: 가용소득 = 447,582원 또는 447,583원 (보수 3% 차감 후), "회생위원 보수" 행 표시
- [ ] 외부 회생위원 미선임 시: 가용소득 = 461,425원 (차감 없음), "회생위원 보수" 행 숨김
- [ ] 변제계획 탭 UI의 가용소득과 문서 출력의 가용소득 ±1원 이내 일치
- [ ] 월변제액 합계 = 가용소득
- [ ] 총변제액 = 월변제액 × 36개월
- [ ] 변제율 = 총변제액 / 총채무액 × 100
- [ ] 변제 시작일/종료일 실제 날짜 표시
- [ ] 채권자별 배분: 5개 채권자 합계 = 월변제액
- [ ] 변제 내용 테이블과 변제예정액표의 채권액 기준 동일
- [ ] 대리인명 표시됨

### 4-3. 크로스 문서 수치 일관성

```
채권자 목록 총 채무액 === 변제계획안 총 채무액
재산 목록 청산가치 === 변제계획안 청산가치
수입지출 목록 월평균소득 === 변제계획안 소득
```

### 4-4. 금지 패턴 검색

수정 완료 후 document-generator.ts 전체에서 아래 패턴이 0건이어야 한다:

```bash
# placeholder 텍스트 잔존
grep -n "YYYY\|설명)\|____|을(를)" src/lib/rehabilitation/document-generator.ts

# NaN 방어 누락
grep -n "|| ''" src/lib/rehabilitation/document-generator.ts
# → 숫자 필드에 || '' 사용하면 NaN 위험. || 0 또는 Number() 래핑 필요

# 하드코딩된 테스트 데이터
grep -n "김진한\|820517\|수원회생" src/lib/rehabilitation/document-generator.ts
# → 0건이어야 함 (데이터는 DB에서만)
```

---

## 작업 규칙

1. **본인이 하지 않은 staged 변경은 절대 건드리지 않음**
2. **migration 파일을 수정할 때**: 기존 테이블을 `CREATE TABLE IF NOT EXISTS`로 재선언하지 않고, `ALTER TABLE ADD COLUMN IF NOT EXISTS` 사용
3. **PR 단위로 분리**: PHASE 1 (P0) → PHASE 2 (P1) → PHASE 3 (P2) 각각 별도 커밋/PR
4. 모든 Server Action 변경 후 `revalidatePath()` 호출 확인
5. 문서 생성기에 사용하는 수치 계산 함수는 **단일 원본 유틸**로 분리하여 탭 UI와 문서 생성기가 동일 함수를 사용하도록 구조화
6. `typecheck` + `lint` + `build` 통과 필수
