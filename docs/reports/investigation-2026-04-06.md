# 조사 보고서 — 개인회생 마이그레이션 현황 전수 점검

**작성일**: 2026-04-06
**작성자**: 조사관(Sonnet)
**역할**: 현황 파악 + 실행 계획 수립

---

## 1. DB 현황 (실측치)

### 1-1. 사건 수

| 항목 | 수치 |
|------|------|
| 전체 insolvency 사건 (soft-delete 제외) | **89건** |
| income_settings 행 있음 | 88건 |
| income_settings 행 없음 | **1건** |

> 90건 마이그레이션 대상 중 1건 soft-delete 또는 미등록 상태.

### 1-2. 소득 데이터 현황

| 항목 | 수치 |
|------|------|
| gross_salary > 0 (소득 있음) | **39건** |
| gross_salary = 0 (소득 미입력) | **49건** |
| income_settings 행 자체 없음 | **1건** |
| **소득 데이터 필요 합계** | **50건** |

→ 50건이 colaw에서 소득 데이터를 재추출해야 함.

### 1-3. 채권자 금액 불일치 (colaw-vs-verification-report-v2 기준)

| 항목 | 수치 |
|------|------|
| 전체 대상 | 90건 |
| 총액 일치 | 20건 |
| **총액 불일치** | **70건** |
| 불일치 원인 | 마이그레이션 스크립트 `extractCreditors` 버그 (동명채권자 복수건 금액 소실) |

---

## 2. 기존 재추출 스크립트 분석

### 파일: `scripts/colaw-migration/re-extract-creditors.ts`

**구조**:
- `COLAW_CASES`: 90개 사건의 colaw 파라미터 (cs/rs/dy) 매핑 — ✅ 완전
- `RE_EXTRACT_TARGETS`: 24개 vsId→colawN 명시 매핑 — ⚠️ **불완전** (70건 중 24건만)
- `extractCreditors()`: Puppeteer로 채권자 탭 파싱 — ✅ 로직 정상
- `extractIncome()`: 수입지출 탭 파싱 — ⚠️ colaw 필드명 추정값 사용 (검증 필요)
- `updateCase()`: DB soft-delete 후 재삽입 — ✅ soft-delete 준수
- `main()`: RE_EXTRACT_TARGETS만 순회, **자동감지 미구현** (주석만 있음)

**문제점**:
1. RE_EXTRACT_TARGETS에 70건 중 24건만 명시됨
2. 나머지 46건은 vsId 매핑이 없어 실행 불가
3. extractIncome()의 colaw 필드명이 실제 필드명과 다를 가능성 있음
   (예: `monthaverageincomemoney` → 실제 사용, 스크립트는 `monthlyincomeamount` 추정)

**실행 조건** (CLI 필요):
```bash
npm install puppeteer @supabase/supabase-js
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... ORGANIZATION_ID=... \
npx tsx scripts/colaw-migration/re-extract-creditors.ts
```

---

## 3. 미해결 항목 전체 목록

### 🔴 P0 — 즉시 해결 필요

| ID | 항목 | 규모 | 방법 |
|----|------|------|------|
| P0-1 | 채권자 금액 불일치 | 70건 | 스크립트 보완 후 CLI 실행 |
| P0-2 | 소득 데이터 미입력 | 50건 | colaw 수입지출 탭 재추출 |

### 🟡 P1 — 블로커 해결 후

| ID | 항목 | 규모 | 방법 |
|----|------|------|------|
| P1-1 | 채권자 수동 검토 | 6건 | 담당자 확인 (creditor-mismatch-report.md) |
| P1-2 | median_income_year 미설정 | 미확인 | income_settings.median_income_year NULL 건 확인 |
| P1-3 | 실사건 1건 end-to-end 검증 | 1건 | 블로커 해결 후 진행 |

### 🟢 P2 — 개인파산

| ID | 항목 | 상태 |
|----|------|------|
| P2-1 | 개인파산 탭 UI 구현 | 미착수 |
| P2-2 | 개인파산 DB 테이블 확인 | 미확인 |
| P2-3 | 개인파산 문서 출력 연결 | 부분 구현 (`bankruptcy-document-actions.ts` 존재) |

---

## 4. 실행 계획

### Step 1. RE_EXTRACT_TARGETS 46건 보완 (조사관 작업)

70건 불일치 중 24건은 이미 매핑됨. 나머지 46건의 vsId를 DB에서 조회하여 RE_EXTRACT_TARGETS에 추가해야 함.

**필요 쿼리**:
```sql
-- 불일치 70건의 vsId 조회
-- colaw 검증 보고서의 불일치 사건명 목록과 VS cases 테이블을 매칭
SELECT c.id, c.title
FROM cases c
WHERE c.organization_id = '6b83d234-897e-43ef-8cf8-c7c7cf0a9f39'
AND (c.lifecycle_status IS NULL OR c.lifecycle_status != 'soft_deleted')
ORDER BY c.created_at;
```

### Step 2. extractIncome() 필드명 검증

colaw 수입지출 탭의 실제 필드명 확인 필요:
- 실제 확인된 필드: `monthaverageincomemoney`, `diaryyear`, `thelowestfamilylivingmoneyseq`
- 스크립트가 추정하는 필드: `monthlyincomeamount`, `tagyeosalary`, `livingcost`
- **불일치 가능성 높음** → 스크립트 수정 필요

### Step 3. CLI 실행 (실행자 작업)

```bash
cd /path/to/vein-spiral-source-integrated-v1
SUPABASE_URL=https://hyfdebinoirtluwpfmqx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
ORGANIZATION_ID=6b83d234-897e-43ef-8cf8-c7c7cf0a9f39 \
CHROME_DATA_DIR=<chrome_profile_path> \
npx tsx scripts/colaw-migration/re-extract-creditors.ts
```

---

## 5. 즉시 실행 가능한 항목 (브라우저 기반)

현재 colaw 탭(628703001)과 Supabase 탭(628703002)이 열려 있어 다음 작업은 지금 바로 가능:

1. **46건 vsId 매핑 완성** — DB 쿼리로 title→vsId 조회 후 COLAW_CASES와 매칭
2. **extractIncome() 필드명 검증** — colaw 수입지출 탭에서 실제 필드명 확인
3. **median_income_year NULL 건 수 확인** — DB 쿼리

---

## 6. 완료된 항목 (참고)

| 항목 | 완료일 | 비고 |
|------|-------|------|
| plan_sections 마이그레이션 | 이전 세션 | 35행/30건 |
| properties 마이그레이션 | 이전 세션 | 1,206행/82건 |
| secured_properties 마이그레이션 | 이전 세션 | 44행/43건 |
| family_members 마이그레이션 | 2026-04-06 | 219명/79건 |
| 채권자 자동수정 2건 | 2026-04-06 | 와이앤케이파트너스대부, 제이씨엔피엘대부 |
| median-income.ts 2025 오류 수정 | 2026-04-06 | 보건복지부 고시 값으로 교정 |
| net_salary 0값 수정 | 2026-04-06 | 39건 |

---

## 7. 다음 요청

실행자에게 전달할 작업 (우선순위 순):

1. **RE_EXTRACT_TARGETS 46건 추가** — `scripts/colaw-migration/re-extract-creditors.ts` 수정
2. **extractIncome() 필드명 수정** — 실제 colaw 필드명으로 교체
3. **스크립트 실행** — 70건 채권자+소득 일괄 재추출
4. **median_income_year 설정** — income_settings 테이블 업데이트

```
이 보고서 읽고 수정해:
docs/reports/investigation-2026-04-06.md
```
