# 검증관 지시서 — COLAW 전 탭 전수 워크스루 + 유형별 신규 사건 생성

목적: 콜로 회생 7탭(신청인/채권자/재산/수입지출/진술서/변제계획안10항/자료제출목록)의 **모든 버튼·체크박스·셀렉트·modal·자동 트리거**를 직접 누르고 저장해보고, **모든 분기 유형의 신규 사건을 직접 생성**해서 어떤 데이터가 어디에 어떻게 들어가고 다른 탭/form에 어떤 영향을 주는지 전부 기록한다.

VS에서 raw HTML만 받아서는 절대 알 수 없는 정보(modal 내용, 자동 채움 트리거, 저장 동작, 자동 계산식)를 빠짐없이 드러내는 것이 목표.

작성 위치: `audit/colaw_button_walkthrough.md`

---

## 0. 사전 준비

1. 콜로 로그인 + 관할법원 권한 확인
2. **검증관 전용 dummy 사건 폴더** 만들기 (가상 인적사항만 사용 — 실제 인물 X)
3. 작업 로그를 매 단계 markdown에 즉시 기록 (스크린샷 가능하면 첨부)

각 단계 기록 양식:
```
- 액션: 어떤 버튼/체크박스 클릭, 어떤 값 입력
- DOM 변화: 어떤 modal/탭/form이 새로 열리거나 닫히는지
- 저장 후 다른 탭 변화: plansection / properties / income / affidavit / datasubmission 모두 다시 열어 변화 기록
- 자동 계산/자동 채움 발견: 합계, 라이프니츠, 생계비, 변제기간, 자동 문구 등
- 모르는 필드/버튼: 라벨/id/name 그대로 적기
```

---

## 1. 모든 유형 신규 사건 생성 (총 30개 dummy 사건)

각 유형마다 **신규 사건을 만들어서 저장**하고, 저장 후 **모든 7탭을 다시 열어** 자동 채움/자동 계산이 어떻게 일어났는지 기록.

### 1-A. 채권자 유형별 (10개)
| # | 유형 | 채권자 구성 |
|---|---|---|
| A1 | 일반 무담보만 | 자연인 1, 법인 1, 합계 1,000만 |
| A2 | 별제권 1건 (부동산 근저당) | 부동산 1 + 별제권 채권자 1 + 일반 2 |
| A3 | 별제권 1건 (자동차 담보) | 자동차 1 + 별제권 채권자 1 + 일반 2 |
| A4 | 별제권 다수 (부동산 + 자동차) | 부동산 1 + 자동차 1 + 별제권 2 + 일반 3 |
| A5 | 우선변제 1건 (국세) | 국가 채권자 1 + 일반 3 |
| A6 | 우선변제 다수 (국세 + 지방세 + 임금) | 국가 1 + 지자체 1 + 자연인(임금) 1 + 일반 3 |
| A7 | 미확정채권 1건 | 일반 3 + 미확정 1 (modal로) |
| A8 | 보증인 있는 채무 1건 | 일반 3 + 보증인 1명 |
| A9 | 보증인 다수 (한 채권에 보증인 3명) | 일반 1 + 보증인 3명 (가지번호 1-1, 1-2, 1-3) |
| A10 | 주담대 채무재조정 신청 | 부동산 1 + 주담대 채권 1 + 채무재조정 chk |

### 1-B. 재산 유형별 (8개)
| # | 유형 | 재산 |
|---|---|---|
| B1 | 재산 전혀 없음 | (빈) |
| B2 | 현금만 | 현금 50만 |
| B3 | 예금 + 보험 | 예금 200만 + 보험 100만 |
| B4 | 부동산만 (저당 없음) | 아파트 1억 |
| B5 | 부동산 + 근저당 (별제권 트리거) | 아파트 2억 + 근저당 1억 5천 |
| B6 | 자동차만 | 자동차 500만 |
| B7 | 임차보증금 | 임차보증금 5,000만 |
| B8 | 면제재산 신청 (4종 chk 각각) | 면제재산 4종 모두 입력 |

### 1-C. 수입지출/변제기간 유형별 (6개)
| # | 유형 | 입력 |
|---|---|---|
| C1 | 급여소득자 (incomegubun=1), 부양가족 0, 36월 | 월급 200, 생계비 자동 |
| C2 | 급여소득자, 부양가족 3 | 월급 350, 생계비 자동 (변화 확인) |
| C3 | 영업소득자 (incomegubun=2) | 영업소득 입력 폼 자체 다른지 |
| C4 | 변제기간 60월 (사유: 우선변제 36월 내 불가) | 우선변제 채권 큰 액수 1건 → 60월 입력 시 사유란 나오는지 |
| C5 | 변제기간 60월 (사유: 청산가치) | 부동산 + 별제권 → 60월 |
| C6 | additionalsetting1~5 각각 입력 | 5개 각각 의미 파악 |

### 1-D. 진술서/변제계획안 유형별 (4개)
| # | 유형 |
|---|---|
| D1 | 진술서 모든 textarea 입력 → 저장 |
| D2 | del_affidavit_1_1, _2, _3_2, _3_3, _4 — 각 섹션 추가/삭제 버튼 |
| D3 | plansection frmPlanSection1~6 각 textarea 수기 입력 → 저장 |
| D4 | plansection 본문에 default 문구(`defultword`)가 있는지, 변경 시 자동 reset 되는지 |

### 1-E. 자료제출목록 datasubmission 탭 (2개)
| # | 유형 |
|---|---|
| E1 | datasubmission 탭 진입 → 모든 항목 캡처 (회생도 이 탭이 있는지) |
| E2 | 자료 1건 추가 → 저장 → 어떤 양식이 생성되는지 |

각 사건 생성 후 **모든 7탭의 raw HTML을 저장**하면 우리가 직접 비교할 수 있음:
```
audit/colaw_walkthrough/A1/{application,creditors,properties,income,affidavit,plansection,datasubmission}.html
audit/colaw_walkthrough/A2/...
```

---

## 2. 탭별 버튼·필드·기능 전수조사

### 2-1. 신청인 탭 (application)
- [ ] 모든 input/select/radio/checkbox 라벨 + id + 의미 나열
- [ ] **incomegubun radio (1=급여, 2=영업)** DOM 구조 캡처 — 우리 파서 90건 빈값 버그 원인 확인
- [ ] 급여 vs 영업 선택 시 form이 어떻게 바뀌는지 (영업이면 매출/경비/순소득 필드 추가?)
- [ ] **agentgubun radio** (1=법무사 등 / 2=변호사) — 다른 옵션 있는지
- [ ] 사건번호(`casenumber`) 자동 부여 vs 수기? 빈 케이스 89/90 이유
- [ ] 법원명(`courtname`) 변경 가능? 한 번 저장 후 잠김?
- [ ] 주민번호(`applicationjumin`) 마스킹 표시? 평문?
- [ ] 모든 주소 입력 (등록/현주소/직장/송달) — 우편번호 자동 검색 버튼 있는지
- [ ] 환불계좌 (`returnbanknameaccount`)
- [ ] 저장 버튼 위치 + 동작
- [ ] 인쇄 미리보기 / 출력 버튼 (코드에 `printApplication`이 있음)

### 2-2. 채권자 탭 (creditors)

#### 2-2-1. 기본 CRUD
- [ ] "채권자 추가" 버튼 → 빈 form 추가
- [ ] 인격구분 select(`classify`) 옵션 전부 나열
- [ ] 채권번호(`bondnumber`) — 자동? 수기? 한 번 부여 후 변경?
- [ ] 채권자명/주소/연락처/팩스/지점명(`branchname`)
- [ ] 채권사유(`bondcause`), 원금(`capital`), 산정근거(`capitalcompute`), 이자(`interest`), 산정근거, 채권내용(`bondcontent`)
- [ ] 지연이율(`delayrate`) — 의미와 입력 단위
- [ ] **저장** 버튼 → 응답 / URL / 리스트 변화
- [ ] **수정** (`upt-creditor`) — 어떤 필드가 잠기는지
- [ ] **삭제** (`del-creditor`) — 확인 모달, hard delete vs soft delete
- [ ] 채권자 순서 변경 가능?

#### 2-2-2. 채권자 단위 4개 checkbox
각각 체크 → 저장 → 채권자 탭 / plansection 탭 다시 열어 변화 기록.

- [ ] **우선변제** (`firstrepayment`) — 툴팁 "우선변제시 원금란에 원금+이자, 이자란 0" 의미. 자동 변환되는지 수기로 입력해야 하는지
- [ ] **미확정채권** (`unsettlementbond`) — modal과의 관계 (B-3-2와 다른가)
- [ ] **각종 연금법상의 채무** (`kindannuitydebt`) — 어떤 케이스에 쓰는지
- [ ] **주택담보대출 채무재조정 프로그램 신청서** (`applydebtrestructuring`) — 별도 양식이 어디에 생성되는지

#### 2-2-3. 채권자 단위 modal 3개
각 modal의 모든 필드, 저장 효과, 다른 탭 영향.

##### 부속서류 modal (`layer-attached-documents`)
- [ ] "부속서류 1, 2, 3, 4 선택" 버튼 → modal 열림
- [ ] **부속서류 1, 2, 3, 4가 각각 무엇인지** (별제권 / 회생담보권 / 환취권 / 우선변제권 ?)
- [ ] 각 번호 체크 시 modal 안에 어떤 필드가 추가되는지
  - 1번 (별제권) → 담보종류 select, 담보물 표시, 담보가치, 우선변제예상액, 부동산/자동차/기타?
  - 2, 3, 4도 동일 조사
- [ ] 부속서류 modal 저장 후:
  - 채권자 카드 위 "1.별제권 (근저당권)" 텍스트 변화
  - properties 탭의 부동산/자동차 항목과 자동 연결되는지
  - plansection form5에 자동 문구 추가되는지
  - 합계 dambosum이 자동 채워지는지
  - 채권자 capital이 담보분/무담보분으로 자동 분리되는지

##### 미확정채권 modal (`layer-unconfirmed-bond`)
- [ ] "기타미확정채권(신탁재산 등)" 버튼 클릭
- [ ] 어떤 필드 (신탁재산, 추후확정, 사유)
- [ ] 저장 후 채권자 카드 / 합계 / plansection 변화

##### 보증인 modal (`layer-guarantor-debt`)
- [ ] "보증인이 있는 채무(가지번호)" 버튼 클릭
- [ ] 보증인 정보 필드 (이름/주민번호/주소/관계/보증금액/연대 vs 일반)
- [ ] **가지번호** 의미와 부여 규칙 (1-1, 1-2 형식?)
- [ ] 보증인 1명 / 다수 추가
- [ ] plansection / affidavit 자동 추가 문구

#### 2-2-4. 채권 합계 영역
- [ ] `nowtotalsum` (총합), `dambosum` (담보), `nodambosum` (무담보) — 자동 계산? 수기?
- [ ] 별제권 입력 시 dambosum이 자동 채워지는 값 (담보가치인지 우선변제예상액인지)
- [ ] 우선변제 체크 시 합계 분리 방식

#### 2-2-5. 채권자 탭 상단/하단 모든 버튼
- [ ] CSV 다운로드 (`cvs_file_download`) — 다운받아 첨부, 컬럼 분석
- [ ] 도움말 (`cvs_help_msg`)
- [ ] 정렬 버튼 (`close_sort_btn`) — 정렬 옵션 전부 나열
- [ ] 보증인/미확정/별제권 닫기 버튼 (`close_*`) 의미
- [ ] 일괄 가져오기/엑셀 업로드 같은 기능 있는지
- [ ] 인쇄 미리보기 (`printCreditor`)
- [ ] 그 외 모든 보이는 버튼

#### 2-2-6. creditor-add-list select
- [ ] option value(2186830 등 큰 숫자)의 의미 — DB pk?
- [ ] 한 번 부여된 seq가 변경/재사용되는지
- [ ] 채권자 삭제 시 seq가 어떻게 되는지

### 2-3. 재산 탭 (properties)

#### 2-3-1. 14개 재산 카테고리
각 카테고리마다 "추가" 버튼이 있는지, 어떤 form/필드가 뜨는지 전부 캡처.

- [ ] 현금 (`cashbigo`)
- [ ] 예금 (`deposit*`) — 통장 사본 첨부?
- [ ] 보험 (`insurance*`) — 해약환급금 자동 계산?
- [ ] 자동차 (`auto*`) — 차량가액 자동? 별제권 자동 연결?
- [ ] 부동산 (`estate*`) — 등기부 첨부, 시가 자동, 근저당 별제권 자동 연결
- [ ] 임차보증금 (`lease*`)
- [ ] 매출금채권
- [ ] 대여금채권
- [ ] 사업용설비/재고/비품 (`fixtures*`)
- [ ] 공탁금
- [ ] (가)압류적립금 (`attachment*`)
- [ ] 예상퇴직금 — 자동 계산식?
- [ ] 면제재산 (`excuse*`) — 4종 chk 각각 의미
- [ ] 기타 (`etc`)

#### 2-3-2. 면제재산 4개 chk
- [ ] `excusecontractchk` — 임차보증금 면제? 계약서 첨부?
- [ ] `excuseetcchk` — 기타 면제?
- [ ] `excusecopychk` — 사본 첨부?
- [ ] `excusedecisiondatechk` — 결정일 chk?
- [ ] 각 chk 시 다른 필드가 활성화되는지

#### 2-3-3. (가)압류적립금 (`attachment*`)
- [ ] 의미 — 압류된 적립금이 면제재산인지
- [ ] 입력 필드와 저장 효과

#### 2-3-4. 모든 재산 카테고리 저장 후
- [ ] 채권자 탭의 별제권/dambosum 자동 변화
- [ ] income 탭의 청산가치(`comparisonssumprincipalinterest`, `estatetotalmoney`) 자동 갱신

### 2-4. 수입지출/변제기간 탭 (income)

- [ ] **incomegubun** (radio) — 1=급여 vs 2=영업 선택 시 폼 변화
- [ ] 급여소득자: `monthincome`, `monthaverageincomemoney`, `tagyeosalary` — 자동 계산?
- [ ] 영업소득자: 매출/경비/순소득 필드 (없으면 어떻게 입력?)
- [ ] **부양가족** (`numberDependents`) 변경 → 생계비 자동 재계산
- [ ] **생계비** (`lowestlivingmoney`, `lowestlivingmoneyrate`)
  - rate(60%/100%) 변경 가능? — VS의 PR-3 hotfix Y'와 비교
  - `livingmoneycalcumethod` (모든 케이스 1) 의미
  - `modifythecostoflivingenlargedapply` 의미
- [ ] **변제기간** (`forcingrepaymentmonth`) 36/45/48/60 입력 시 사유 입력란이 생기는지
- [ ] `forcingrepaymentmonthoption` (모든 케이스 1) 의미와 다른 옵션
- [ ] `change_forcingrepaymentmonth` — 변경 이력?
- [ ] **라이프니츠** (`leibniz`, `except_leibniz`) — 자동 입력?
- [ ] `comparisonssumprincipalinterest` — 청산가치 비교
- [ ] `estatetotalmoney` — 재산 탭 합계와 연동
- [ ] **additionalsetting1~5** — 5개 추가 설정 각각 의미
- [ ] `auto_calculate_type`, `autocalculationmethod`, `interestreportdisplay` — 자동 계산 옵션
- [ ] `outsideresuremember_rate`, `addrate` 의미
- [ ] 저장 후 변제계획안10항 자동 채움 영향

### 2-5. 진술서 탭 (affidavit)

- [ ] del_affidavit_1_1, _2, _3_2, _3_3, _4 — 5개 섹션의 의미와 추가/삭제 버튼
- [ ] 각 textarea 라벨 (debt_history? property_change? income_change? living_situation? repay_feasibility?)
- [ ] `companynames`, `careerfromdate`, `careertodate`, `businesstype`, `education`, `bankruptcy`, `badbank`, `applicationownhouse` 의미
- [ ] `dealymoney` (지연 손해금?)
- [ ] `bondname`, `bondsummary`, `casenumber`, `annexedpaper` 의미
- [ ] 진술서가 채권자/재산 변경에 따라 자동 갱신되는지

### 2-6. 변제계획안 10항 탭 (plansection)

- [ ] frmPlanSection1~6 라벨 다시 확인 (1=이직신고 ... 6=기타사항)
- [ ] 각 form의 textarea에 default 문구가 미리 박혀 있는지
- [ ] 채권자 탭 저장 후 form5(강제집행 효력)에 자동 문구가 들어가는 정확한 트리거 (별제권만? 부동산만? 둘 다?)
- [ ] form1(이직신고)에 자동 문구가 들어가는 케이스 — 어떤 입력이 트리거?
- [ ] form6(기타사항) 자동 vs 수기 입력 비율
- [ ] 변제계획안 본문 1~10항(원금/이자/우선변제/별제권 등)이 어디에 있는지 — plansection 탭 외 다른 popup인지 (popupRescurePlanContent 같은 게 있는지)
- [ ] `defultword`, `changeword` 필드 의미
- [ ] `frm_modal_dialog_message` modal이 무엇인지

### 2-7. 자료제출목록 탭 (datasubmission) ⚠ 미수집

- [ ] 회생도 이 탭이 있는지 확인
- [ ] 어떤 자료 목록인지 (별제권 부속서류, 부동산 등기부, 보증인 자료, 미확정채권 자료, ...)
- [ ] 자동 생성 vs 수기 추가
- [ ] HTML 다운로드 가능하면 받아서 첨부
- [ ] 채권자/재산/진술서 변경이 datasubmission에 반영되는지

---

## 3. 알려진 파서 버그 — 콜로에서 직접 확인

### 3-1. 채권자 0건 케이스 (3건)
직접 콜로에서 열어 채권자 탭이 비어있는지(작성 전)인지 / 다른 div 구조인지 / 우리 파서가 잘못 읽는지 판별:
- **#12 이옥주** cb=5307731, dy=2025, rp=176028
- **#26 조두성** cb=5382922, dy=2025, rp=182959
- **#66 임경애** cb=5617703, dy=2025, rp=207962

### 3-2. 김한경 #1 채권자 수
- 콜로에서 #1 (cb=5263783) 열어 정확한 채권자 수 확인 (우리 9 vs DB 10)

### 3-3. 김한경 b6823d01 (veinspiral 사이트)
- veinspiral에서 b6823d01 cases 진입 → 채권자 13건이라는 검증관 보고 vs 우리 diff 10건
- 어느 쪽이 정확한지

### 3-4. 법원명 9건 오염 케이스
다음 9건이 콜로에서 실제로 어느 법원인지 확인:
- #62 문연자, #63 송애리, #64 이재현, #66 임경애, #67 이광수, #68 박복희, #70 김한경, #73 조병수, #84 김진한

### 3-5. 변제기간 0/빈값 21건
- 콜로에서 빈값인지(아직 미입력 사건) / 0이 진짜 입력값인지 / 어떤 의미인지

### 3-6. MULTI 매칭 오탐 (계승일/김기홍)
- 콜로에서 계승일 #13 vs #65 가 정말 다른 사건인지
- 김기홍 #23 vs #33 도 마찬가지
- 김기홍 6d6bb8a2 (DB) 변제기간 36인데 콜로 60 — 어느 쪽이 정확한지

---

## 4. 결과 보고 형식

### 4-1. dummy 사건별 (audit/colaw_walkthrough/{A1..E2}/)
각 폴더에 다음 저장:
- 7개 탭 raw HTML
- `notes.md` — 입력 내용 + 저장 시 발견한 자동 변화

### 4-2. 통합 보고 (audit/colaw_button_walkthrough.md)
다음 섹션 포함:
1. **전체 7탭 모든 버튼/필드 카탈로그** — 라벨/id/name/의미
2. **modal 3종 (부속서류/미확정/보증인) 필드 + 저장 효과** 상세
3. **자동 채움 트리거 매트릭스** — 어떤 입력이 어떤 form에 어떤 본문을 자동 생성하는지
4. **자동 계산식** — 합계, 라이프니츠, 생계비, 청산가치
5. **VS에 누락된 기능 리스트** — 우리가 raw HTML에서 못 봤거나 잘못 추출한 것
6. **파서 버그 6건 (3-1~3-6) 결론**
7. **datasubmission 탭 분석**

### 4-3. 항목별 기록 양식 (예시)
```markdown
### 부속서류 modal — 1번 별제권
- 클릭: "부속서류 1, 2, 3, 4 선택" 버튼 → modal 열림
- modal 제목: "부속서류 선택"
- 1번 체크 시 추가되는 필드:
  - bondsecuritytype (담보종류) — select [근저당권, 질권, 유치권, 양도담보, 가등기담보]
  - bondsecurityvalue (담보가치) — number
  - estimatedrecoveryamount (우선변제예상액) — number
  - estatekind — radio (부동산/자동차/기타)
  - estatedisplay — text (담보물 표시)
- 저장 후:
  - 채권자 카드: "1.별제권 (근저당권)" 텍스트 표시
  - dambosum: 0 → 7,500,000 자동 변경 (= bondsecurityvalue)
  - properties 탭 estate*: 변화 없음 (수기 추가 필요)
  - plansection form5: 자동으로 다음 본문 추가
    > "채무자 소유의 모든 부동산에 관한 ..."
- 모르는 점: bondsecurityvalue와 estimatedrecoveryamount가 다른 값일 때 어느 게 dambosum에 들어가는지
```

---

## 5. 우선순위 (시간 제약 시)

1. **§1-A 채권자 유형 10개 신규 사건** + 7탭 HTML 저장 + modal 3종 분석
2. **§2-7 datasubmission 탭** 회생 진입 + HTML 받기
3. **§2-2-3 modal 3종** 필드/저장 효과 정밀 조사
4. **§2-6 plansection 자동 채움 트리거** 확정
5. **§3 파서 버그 6건** 직접 확인
6. **§1-B 재산 / §1-C 수입지출 / §1-D 진술서** 유형 (시간 되는 만큼)
7. 나머지

---

## 6. 분량 안내

이 워크스루는 **시간이 걸리는 작업**입니다. 모든 항목 한 번에 못 해도 됨. 우선순위 순서대로 하나씩 끝내고 즉시 보고. 그동안 코드 작업자(저)는 검증관 보고와 무관한 PR (법원명/사건번호 hotfix, 채권자 인격구분 확장, 매칭 알고리즘 보강 등)을 진행합니다.

모르는 부분이 있으면 워크스루 중단하고 질문 — 추측으로 적지 말 것.
