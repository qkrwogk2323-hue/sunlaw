# colaw → Vein Spiral 개인회생 마이그레이션

## 개요
colaw.co.kr의 개인회생 사건 90건을 Vein Spiral에 일괄 이관하는 스크립트.

## 사전 준비

```bash
npm install puppeteer @supabase/supabase-js
```

## 환경 변수 (.env)

```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ORGANIZATION_ID=<법무법인 서해 조직 UUID>
CREATED_BY=<실행자 프로필 UUID>
CHROME_DATA_DIR=/Users/<user>/Library/Application Support/Google/Chrome/Default
```

## 실행

```bash
npx tsx scripts/colaw-migration/migrate-colaw-to-vs.ts
```

## colaw 필드 → Vein Spiral DB 매핑

### 신청인 (application → rehabilitation_applications)

| colaw 필드명 | VS 컬럼 | 비고 |
|---|---|---|
| applicationname | applicant_name | |
| applicationjumin | resident_number_front + _hash | 820517-1814712 → front:820517, hash:1814712 |
| applicationzip / applicationaddress | registered_address (jsonb) | |
| nowapplicationzip / nowapplicationaddress | current_address (jsonb) | |
| officezip / officeaddress | office_address (jsonb) | |
| deliveryzip / deliveryaddress | service_address (jsonb) | |
| deliveryreceiptname | service_recipient | |
| deliveryreceipttel | phone_home | |
| deliveryreceiptmobile | phone_mobile | |
| returnbanknameaccount | return_account | |
| incomegubun | income_type | 1→salary, 2→business |
| officename | employer_name | |
| officeorder | position | |
| workyearmonth | work_period | |
| applicateplandate | application_date | |
| repaymentfromdate | repayment_start_date | |
| agentname | agent_name | |
| agenttel | agent_phone | |
| agentfax | agent_fax | |
| agentemail | agent_email | |
| agentzip / agentaddress | agent_address (jsonb) | |

### 채권자 (creditor → rehabilitation_creditors)

| colaw 필드명 | VS 컬럼 | 비고 |
|---|---|---|
| bondnumber | bond_number | int |
| classify | classify | 법인/자연인 |
| bondname | creditor_name | |
| zipcode | postal_code | |
| address | address | |
| tel | phone | |
| fax | fax | |
| bondcause | bond_cause | |
| capital | capital | 쉼표 제거 후 bigint |
| capitalcompute | capital_compute | |
| interest | interest | 쉼표 제거 후 bigint |
| interestcompute | interest_compute | |
| bondcontent | bond_content | |

### 수입지출 (income → rehabilitation_income_settings)

| colaw 필드명 | VS 컬럼 | 비고 |
|---|---|---|
| monthlyincomeamount | gross_salary | |
| tagyeosalary | net_salary | |
| livingcost | living_cost | |
| extralivingcost | extra_living_cost | |
| childsupport | child_support | |
| trusteecommrate | trustee_comm_rate | 외부위원 배당 시만 |
| repayperiod | repay_months | |
| nowtotalsum | total_debt | |
| dambosum | secured_debt | |
| nodambosum | unsecured_debt | |

### colaw URL 패턴

```
신청인: /rescureManage/popupRescureApplication?casebasicsseq={cs}&diaryyear={dy}&resurapplicationpersonseq={rs}&tabname=application
채권자: 같은 URL, 페이지 내 탭 클릭 (AJAX)
재산:   같은 URL, '재산' 탭 클릭
수입지출: 같은 URL, '수입지출/변제기간' 탭 클릭
진술서:  같은 URL, '진술서' 탭 클릭
변제계획안: 같은 URL, '변제계획안10항' 탭 클릭
```

## 90건 사건 ID 목록

`migrate-colaw-to-vs.ts`의 `COLAW_CASES` 배열 참조.

## 주의사항

1. colaw 자동 로그인이 활성 상태여야 합니다
2. Chrome 프로필 경로를 CHROME_DATA_DIR에 설정하면 쿠키를 재활용합니다
3. 주민번호 뒷자리는 운영 환경에서 반드시 해시 처리가 필요합니다
4. 채권자 탭의 form은 `creditor-add-list` 셀렉트로 채권자를 전환합니다
5. 마이그레이션 로그는 `migration-log.json`에 매 건마다 저장됩니다
