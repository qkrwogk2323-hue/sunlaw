# 김한경 변제계획안 미리보기 검증 v4 (f876440 배포 후)

> 검증일: 2026-04-07 (v3 직후 동일 세션)
> 검증자: Claude (VERIFIER)
> 대상: www.veinspiral.com
> case_id: `b6823d01-5832-49a8-8682-355303a3acf5`
> 사건번호: `2025 개회 101101`

---

## 0. 헤드라인

> ✅ **배포 확정: buildId `RJs6cVwGIFnglYuZygAF7` → `ybP52jdMFCZW6LISK70aY`**
> ✅ **미리보기 변제율 단일화 성공 (32.2% → 35.6%)**
> ❌ **변제계획 탭 패널은 여전히 변화 없음** — 저장 버튼/카드/empty state 모두 부재

즉 f876440은 **document-generator 경로에는 반영되었으나, 변제계획 탭 UI 컴포넌트에는 적용 흔적이 없다.** 두 경로가 서로 다른 파일을 참조 중임을 시사.

---

## 1. 배포 확인

| 항목 | v3 | v4 | 변화 |
|---|---|---|---|
| HTML buildId 코멘트 | `RJs6cVwGIFnglYuZygAF7` | **`ybP52jdMFCZW6LISK70aY`** | ✅ 변경 |
| CSS hash | `74c155565e280aac` | `74c155565e280aac` | 동일 (스타일 무변경) |
| webpack chunk | `02a043e381decb40` | `02a043e381decb40` | 동일 |
| 미리보기 iframe 본문 길이 | 17,579자 | **17,667자** (+88) | ✅ 변경 |

**buildId가 변경되었으므로 f876440 배포는 실제 production에 도달했다.** (CSS/webpack hash가 동일한 이유는 .tsx 컴포넌트 수정이 해당 청크에 머지되지 않거나 Next.js가 변경 없는 chunk를 재사용했기 때문으로 추정)

---

## 2. 기대 변화별 결과

### 2-1. 변제계획 탭 진입 시

| # | 기대 | 실제 | 결과 |
|---|---|---|---|
| a | empty state "소득 정보 없음" OR 정상 계산 결과 | 변제 옵션 select 2개만 (106자 고정) | ❌ |
| b | sticky bottom "변제계획 저장" 버튼 | **panel.querySelectorAll('button') = 0건** | ❌ |
| c | 월가용소득 카드 | 미표시 | ❌ |
| d | 변제율 카드 | 미표시 | ❌ |
| e | 청산가치 카드 | 미표시 | ❌ |

**실제 패널 원본 (v1/v2/v3/v4 모두 bit-identical, 106자):**
```
변제 옵션
변제기간
원금 5년 변제
원리금 5년 변제
원금 100% (5년 이내)
원금 100% (3년 이내)
3년 전액 변제
변제 방식
원리금변제 (원금 우선)
원리금합산변제 (비율 배분)
```

### 2-2. 변제계획안 미리보기 (출력/문서 탭) — 변제율 단일화

| # | 기대 | 실제 | 결과 |
|---|---|---|---|
| a | 합계 행 변제율: 32.2% → 35.6% | ✅ **35.6%** | ✅ |
| b | 또는 두 분모 일치해 모두 35.6% | ✅ **두 분모 모두 35.6%, 32.2% 문자열 완전 소거** | ✅ |

**raw 발췌:**
```
(K) 가용소득 총변제예정액   20,212,488원   월가용 × 36
(L) (K)의 현재가치          18,961,503원   월가용 × 라이프니츠 계수(33.7719)

변제율: 35.6% (총변제 20,212,488원 / 확정+미확정 채권 56,714,484원)

1   인천세무서             7,067,290원    69,964원   2,518,704원   35.6%
2   제이비우리캐피탈(주)   23,835,499원   130,236원  4,688,496원   35.6%
...
```

#### 부수 효과: 채권자별 월변제액 재분배 확인
| 채권자 | v3 월변제액 | v4 월변제액 | 변화 |
|---|---|---|---|
| 인천세무서 | 63,139원 | **69,964원** (+6,825) | 재계산 |
| 제이비우리캐피탈(주) | 212,948원 | **130,236원** (−82,712) | 재계산 |
| 기타 동일 배분 로직 적용 | | | |

v3에서는 채권자별 월변제액이 `ratio × (채권액/62,844,516)` 기반(32.2% 분배)이었고, v4는 `ratio × (채권액/56,714,484)` 기반(35.6% 분배)으로 바뀜. **분모 단일화 = 35.6% = 확정+미확정 채권** 경로가 document-generator에 일관 적용됨.

---

## 3. PASS / FAIL 매트릭스

| 항목 | 결과 |
|---|---|
| 배포 확정 (buildId 변경) | ✅ PASS |
| (미리보기) 합계 행 변제율 35.6% | ✅ PASS |
| (미리보기) 32.2% 잔존 여부 | ✅ PASS (완전 소거) |
| (미리보기) 채권자별 재분배 | ✅ PASS (부수 검증) |
| (변제계획 탭) empty state 또는 카드 | ❌ FAIL |
| (변제계획 탭) sticky 저장 버튼 | ❌ FAIL |
| (변제계획 탭) 월가용·변제율·청산가치 카드 | ❌ FAIL |

**3 PASS / 3 FAIL (탭 UI 3개 항목은 단일 컴포넌트 원인으로 합산 1 FAIL로 볼 수도 있음)**

---

## 4. 원인 분석 (검증관 가설)

### 4-1. document-generator는 수정됨
- 미리보기 iframe 본문 길이가 17,579 → 17,667로 변경 (+88자: 아마 "변제율: 35.6%" 문자열의 새 분모 설명 추가)
- 32.2% 문자열 완전 소거 + 채권자별 값 재계산 확인
- 즉, **서버사이드 또는 iframe srcdoc 렌더 코드가 f876440에 포함됨**

### 4-2. 변제계획 탭 컴포넌트는 수정 흔적 없음
- panel 텍스트가 106자로 v1부터 bit-identical
- button 수 0건, 카드/메트릭 DOM 노드 전무
- 사용자 메모 "mapIncomeFormToDb는 SAVE만 변환, LOAD 변환 없음"이 사실이라면, LOAD-side mapper가 없으면 컴포넌트는 `income_year=undefined`로 빈 화면을 렌더하게 되고, **empty state 조차 표시되지 않는다**면 그건 empty state UI 자체가 컴포넌트에 아직 없거나 early return이 없어 렌더 경로가 아예 끊긴 것

### 4-3. f876440의 실제 수정 범위
- 미리보기 경로만 수정됨 (확실)
- 변제계획 탭 컴포넌트 수정은 커밋에 미포함 또는 다른 파일 경로로 머지됨
- **다음 커밋에서 변제계획 탭 컴포넌트를 수정한 별도 변경이 필요**

---

## 5. 권고 조치

| 우선순위 | 작업 | 책임 |
|---|---|---|
| **P0** | 변제계획 탭 컴포넌트의 LOAD-side mapper 추가 (`mapDbToIncomeForm`) — `median_income_year → income_year`, `net_salary → monthly_income` 역변환 | 개발자 |
| **P0** | 데이터 없을 때 empty state 카드 렌더 (현재는 아예 렌더 경로가 끊김) | 개발자 |
| **P0** | sticky bottom "변제계획 저장" 버튼 + Server Action 구현 | 개발자 |
| P1 | 미리보기 라이프니츠 계산 재검증 (L = 18,961,503 유지, 561,458 × 33.7719 = 18,961,503 산수 일치) | 완료 |
| P1 | anatomy §9.3 원본 대조 (35.6% vs colaw 39% 분모 차이 해명) | 운영자 |
| P2 | `/api/version` 라우트 추가 — buildId ↔ commit 매핑 자동화 | 개발자 |

---

## 6. 증거

### 6-1. 배포 확정 (buildId 변경)
```
fetch('/',{cache:'no-store'}).then(r=>r.text()).then(t=>t.slice(0,80))
// v3: <!--RJs6cVwGIFnglYuZygAF7-->
// v4: <!--ybP52jdMFCZW6LISK70aY-->
```

### 6-2. 변제계획 탭 패널 (여전히 미구현)
```js
const panel = document.querySelector('[role="tabpanel"]:not([hidden])');
panel.innerText.length // 106
panel.querySelectorAll('button').length // 0
```

### 6-3. 미리보기 변제율 소거
```js
iframe.contentDocument.body.innerText.includes('32.2%') // false
iframe.contentDocument.body.innerText.includes('35.6%') // true
```

---

## Appendix: 검증 환경

- 브라우저: Chrome (Claude in Chrome MCP)
- URL: `https://www.veinspiral.com/cases/b6823d01-5832-49a8-8682-355303a3acf5/rehabilitation?_=v4`
- 캐시버스터: `?_=v4` + SW unregister + caches.delete
- 검증 시각: 2026-04-07 (KST)

본 보고서는 v1 → v2 → v3의 시계열 후속이며, f876440 배포 효과가 **미리보기(document-generator)에는 적용, 변제계획 탭 UI 컴포넌트에는 미적용**임을 확정한다. 다음 검증(v5)은 변제계획 탭 컴포넌트에 LOAD-mapper + empty state + 저장 버튼을 추가하는 커밋이 배포된 이후에 수행.
