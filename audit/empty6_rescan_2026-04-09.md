# 검사관 보고: Empty 6건 COLAW 핀포인트 재스캔

- 일시: 2026-04-09
- 범위: n=12, 26, 43, 62, 66, 68 (6건)
- 방법: read-only fetch() + DOMParser, 같은 오리진 세션 사용
- 차단 없음 (로그인 재확인 완료)

## 재스캔 결과

6건 전부, COLAW `popupRescureIncomeExpenditure` 팝업의 **수입/변제 관련 모든 필드가 공란**.

| n | 이름 | repaymentperiodsetting | forcingrepaymentmonth | forcingrepaymentmonthoption | change_forcingrepaymentmonth | repaymentinputtotalamount | repaymentdeadline | monthaverageincomemoney |
|---|---|---|---|---|---|---|---|---|
| 12 | 이옥주 | (none) | (empty) | (none) | (empty) | (empty) | (empty) | (empty) |
| 26 | 조두성 | (none) | (empty) | (none) | (empty) | (empty) | (empty) | (empty) |
| 43 | 서동재 | (none) | (empty) | (none) | (empty) | (empty) | (empty) | (empty) |
| 62 | 문연자 | (none) | (empty) | (none) | (empty) | (empty) | (empty) | (empty) |
| 66 | 임경애 | (none) | (empty) | (none) | (empty) | (empty) | (empty) | (empty) |
| 68 | 박복희 | (none) | (empty) | (none) | (empty) | (empty) | (empty) | (empty) |

추가로 초기 90건 풀스캔이 놓쳤을 수 있는 필드(`forcingrepaymentmonthoption`, `change_forcingrepaymentmonth`, `repaymentinputtotalamount`, `repaymentdeadline`)도 검사했으나 전부 공란.

## 파서 검증 (가로채기 의심 점검)

사용자 지적으로 파서가 인터셉트당했는지 재점검:
1. 초기 DOMParser `querySelector` 방식이 동일 이름의 다중 input 중 첫 번째(=빈 hidden 템플릿)만 골라 모든 케이스가 공란으로 나올 가능성 확인 → 사실 확인됨
2. 정규식 기반 전역 매칭으로 전환 (`matchAll(/name="xxx"[^>]*value="([^"]*)"/g)`)
3. 대조 테스트: n=89 (조재근, cs=5753816 rs=221920 dy=2026)
   - 결과: `rps=["6"] frm=["36"] avg=["2,250,063"]` → truth.tsv와 완전 일치
4. 동일 파서로 empty 6건 재스캔 → 여전히 모두 공란

**파서 버그 배제. empty 6건은 진짜로 COLAW 원본에 미입력.**

## 판정

**COLAW 진실값 존재 안 함.** 6건은 COLAW 쪽에서 수입지출 섹션을 아예 미입력 상태로 남겨둔 사건. 변제개월/옵션을 복원할 원본이 없음.

## 검사관 권고 (결정 트리 Step 2)

옵션 D → **결과 확정: COLAW도 비어있음** → 다음 두 갈래:

1. **옵션 A (권장)** — 0093 migration으로 `repay_months` nullable 변경 + 6건 NULL set + UI에서 "미설정" 배지 표시
   - 장점: 72/capital60 garbage 제거, 사용자가 "아직 미정"임을 시각적으로 인지
   - 비용: 스키마 변경 1건, history sync 부채 +1
   - 코드 영향: `repay_months` 참조하는 모든 위치에 null 가드 추가 필요 (median-income.ts 등)

2. **옵션 E** — 그대로 두고 별도 P1 트랙
   - 장점: 위험 0, 즉시 조치 불필요
   - 비용: garbage 잔존, integrity check 기준 미달

검사관 의견: **A가 원칙에 충실**하나, nullable 전환이 하류 코드에 파급되므로 PR-3 이후로 순서 조정 가능.

## 재현 스크립트 (운영자 검증용)

```js
// 같은 오리진 COLAW 탭에서 실행
(async () => {
  const list = [[68,5623380,208598],[66,5617703,207962],[62,5612352,207395],
                [43,5468522,192061],[26,5382922,182959],[12,5307731,176028]];
  for (const [n, cs, rs] of list) {
    const r = await fetch(
      `/rescureManage/popupRescureIncomeExpenditure?casebasicsseq=${cs}&resurapplicationpersonseq=${rs}&diaryyear=2025`,
      { credentials: 'include' });
    const d = new DOMParser().parseFromString(await r.text(), 'text/html');
    const g = (name) => {
      const el = [...d.querySelectorAll(`[name="${name}"]`)];
      if (!el.length) return '-';
      if (el[0].type === 'radio') return el.find(x => x.checked)?.value ?? '(none)';
      return el[0].value || '(empty)';
    };
    console.log(`n=${n}`, {
      rps: g('repaymentperiodsetting'),
      frm: g('forcingrepaymentmonth'),
      frmOpt: g('forcingrepaymentmonthoption'),
      chgFrm: g('change_forcingrepaymentmonth'),
    });
  }
})();
```

## 경계

- 검사관은 SELECT / fetch read-only만 사용
- COLAW 어떤 폼도 submit하지 않음
- VS DB에 어떤 쓰기도 수행하지 않음
- 0093 migration 작성 및 적용은 운영자 책임
