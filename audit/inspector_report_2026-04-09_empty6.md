# 검사관 → 운영자 보고: Empty 6건 재확인 + 파서 자가검증

- 일시: 2026-04-09
- 대상: n=12(이옥주), 26(조두성), 43(서동재), 62(문연자), 66(임경애), 68(박복희)
- 범위: read-only fetch + 정규식 파서
- 선행: PR-2 prod apply 완료 (ba259e0) 후속 후속 조치

---

## 1. 배경

PR-2 apply 직후 0092 STEP 3 NOTICE 블록에서 empty 6건이 `repay_months=72, repay_period_option=capital60` garbage 상태로 남아있음이 확인됨. 검사관이 초기 90건 풀스캔에서 해당 6건을 "공란"으로 판정했으나, 사용자로부터 "파서가 가로채기당한 것 아닌가"라는 의심 제기 → 재검증 수행.

## 2. 1차 스캔 (DOMParser) — 파서 버그 발견

```js
document.querySelector('input[name="monthaverageincomemoney"]')?.value
```

동일 `name` 속성을 가진 input이 팝업 내에 여러 개 존재(숨김 템플릿 + 실제 입력란). `querySelector`는 첫 번째(빈 템플릿)만 반환하므로 알려진 값이 있는 케이스도 `(empty)`로 잘못 판정.

대조 테스트:
- n=89 (조재근, 알려진 값: rps=6, frm=36, avg=2,250,063)
- DOMParser 결과: `rps=(none), frm=(empty), avg=(empty)` ❌

→ 파서 버그 확정.

## 3. 2차 스캔 (정규식 전역 매칭) — 파서 수정

```js
[...html.matchAll(/name="monthaverageincomemoney"[^>]*value="([^"]*)"/g)]
[...html.matchAll(/name="repaymentperiodsetting"[^>]*value="(\d)"[^>]*checked/g)]
[...html.matchAll(/name="forcingrepaymentmonth"[^>]*value="([^"]*)"/g)]
```

대조 테스트 재실행:
- n=89 (조재근): `rps=["6"], frm=["36"], avg=["2,250,063"]` ✅ truth.tsv 일치

→ 파서 검증 완료.

## 4. Empty 6건 재스캔 결과 (정규식 파서)

| n | 이름 | rps | frm | frmOpt | change_frm | total | deadline | monthAvgIncome |
|---|---|---|---|---|---|---|---|---|
| 12 | 이옥주 | [] | [""] | [] | [""] | [""] | [""] | [""] |
| 26 | 조두성 | [] | [""] | [] | [""] | [""] | [""] | [""] |
| 43 | 서동재 | [] | [""] | [] | [""] | [""] | [""] | [""] |
| 62 | 문연자 | [] | [""] | [] | [""] | [""] | [""] | [""] |
| 66 | 임경애 | [] | [""] | [] | [""] | [""] | [""] | [""] |
| 68 | 박복희 | [] | [""] | [] | [""] | [""] | [""] | [""] |

- `rps=[]` : checked 상태인 `repaymentperiodsetting` 라디오 없음
- `frm=[""]` : `forcingrepaymentmonth` input 존재하나 value 공란
- `avg=[""]` : `monthaverageincomemoney` input 존재하나 value 공란
- 모든 보조 필드(`forcingrepaymentmonthoption`, `change_forcingrepaymentmonth`, `repaymentinputtotalamount`, `repaymentdeadline`) 역시 공란

**최종 판정: empty 6건은 가로채기가 아니라 COLAW 원본에 실제 미입력.**

수입/변제 섹션 자체가 손대지 않은 상태. 월 평균 소득조차 입력된 적 없음 → 변제개월을 복원할 진실값이 존재하지 않음.

## 5. 검사관 권고 (결정 트리 Step 2 확정)

옵션 D(재확인 먼저) → COLAW도 비어있음 확정 → 다음 두 갈래:

### 5-1. 권고: 옵션 A (원칙 준수)

0093 migration:
1. `rehabilitation_income_settings.repay_months` → `nullable` 전환
2. empty 6건 (case_id 직접 매칭) → `repay_months = null, repay_period_option = null` SET
3. UI에서 null일 때 "변제기간 미설정" 배지 + 입력 유도 CTA

**전제**: null 가드 하류 코드 영향 검토 필요
- `src/lib/median-income.ts` (변제개월 계산부)
- `src/components/cases/rehab-income-tab.tsx` (화면 표시부)
- `cases` 목록 / 대시보드 KPI 집계 로직
- 기존 테스트 케이스 null 허용 경로 추가

### 5-2. 대안: 옵션 E (별도 P1 트랙)

- 6건 garbage 상태 유지, 0094 또는 후속 트랙에서 처리
- PR-3 생계비 하드코딩 해제가 우선순위 높다고 판단 시 선택
- 다만 integrity check 통과 못함을 수용해야 함

## 6. PR 순서 권고

운영자 시간 최소화 관점에서:

1. **PR-3 (=옵션 C, rate 1컬럼 추가)** 먼저 진행
   - empty 6건 결정과 완전히 독립적
   - 0093 하나로 끝
   - 검사관이 적용 후 read-only 검증 가능

2. **PR-4 (=empty 6 nullable 전환)** 후행
   - 0094에서 `alter column repay_months drop not null` + null set
   - 하류 코드 수정 (median-income.ts 등)
   - 검사관이 null 가드 커버리지 검증

PR-3과 PR-4를 병합 하나로 묶으면 0093 단일 migration에 두 컬럼 변경(rate 추가 + repay_months nullable)을 담을 수도 있으나, 롤백 경로 단순화를 위해 분리 권장.

## 7. 검사관 재현 스크립트

```js
// COLAW 같은 오리진 탭 콘솔에서 실행
(async () => {
  const list = [[68,5623380,208598],[66,5617703,207962],[62,5612352,207395],
                [43,5468522,192061],[26,5382922,182959],[12,5307731,176028]];
  for (const [n, cs, rs] of list) {
    const r = await fetch(
      `/rescureManage/popupRescureIncomeExpenditure?casebasicsseq=${cs}&resurapplicationpersonseq=${rs}&diaryyear=2025`,
      { credentials: 'include' });
    const t = await r.text();
    const rps = [...t.matchAll(/name="repaymentperiodsetting"[^>]*value="(\d)"[^>]*checked/g)].map(m=>m[1]);
    const frm = [...t.matchAll(/name="forcingrepaymentmonth"[^>]*value="([^"]*)"/g)].map(m=>m[1]);
    const avg = [...t.matchAll(/name="monthaverageincomemoney"[^>]*value="([^"]*)"/g)].map(m=>m[1]);
    console.log(`n=${n}`, { rps, frm, avg });
  }
  // 대조: n=89 (알려진 값)
  const r89 = await fetch(
    '/rescureManage/popupRescureIncomeExpenditure?casebasicsseq=5753816&resurapplicationpersonseq=221920&diaryyear=2026',
    { credentials: 'include' });
  const t89 = await r89.text();
  console.log('n=89', {
    rps: [...t89.matchAll(/name="repaymentperiodsetting"[^>]*value="(\d)"[^>]*checked/g)].map(m=>m[1]),
    frm: [...t89.matchAll(/name="forcingrepaymentmonth"[^>]*value="([^"]*)"/g)].map(m=>m[1]),
    avg: [...t89.matchAll(/name="monthaverageincomemoney"[^>]*value="([^"]*)"/g)].map(m=>m[1]),
  });
})();
```

## 8. 경계 준수 선언

- ✅ fetch / SQL SELECT 외 아무것도 수행하지 않음
- ✅ COLAW 어떤 폼도 submit하지 않음
- ✅ VS DB 어떤 쓰기도 수행하지 않음
- ✅ 파서 버그 발견 → 즉시 공개 → 재검증 → 결과 갱신 (은닉 없음)

## 9. 후속 차단 해제 요청

운영자에게 결정 요청:
1. PR-3 옵션 A/B/C 중 선택 (검사관 권고: **C**)
2. Empty 6건 처리 옵션 A/E 중 선택 (검사관 권고: **A, 단 PR-3 이후**)

두 항목 모두 결정되면 검사관은 적용 후 read-only 검증에 즉시 투입 가능합니다.
