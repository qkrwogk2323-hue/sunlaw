# 김한경 변제계획 탭 검증 v5 (269326b 배포 후)

> 검증일: 2026-04-07 (v4 직후 동일 세션)
> 검증자: Claude (VERIFIER)
> 대상: www.veinspiral.com
> case_id: `b6823d01-5832-49a8-8682-355303a3acf5`

---

## 0. 헤드라인

> ✅ **배포 확정**: buildId `ybP52jdMFCZW6LISK70aY` → **`0CtrdnbumuuMJVl9Wsu6g`**
> 🔴 **페이지 하이드레이션 전면 실패** — 어떤 탭도 클릭으로 전환되지 않음
> 🔴 **변제계획 탭 패널을 DOM에 불러올 수조차 없음** (SSR 기본 탭은 `신청인`, 다른 tabpanel은 DOM에 존재하지 않음)

v4까지는 "변제계획 탭으로 전환은 되지만 패널 내용이 106자에 불과" 상태였는데, v5에서는 한 단계 앞 — **탭 전환 자체가 동작하지 않는** 상태로 바뀌었다.

---

## 1. 배포 확인

| 항목 | v4 | v5 | 변화 |
|---|---|---|---|
| HTML buildId 코멘트 | `ybP52jdMFCZW6LISK70aY` | **`0CtrdnbumuuMJVl9Wsu6g`** | ✅ 변경 |
| 검증 URL | `?_=v4` | `?_=v5` / `?_=v5b` / `?_=v5c` | — |
| SW unregister + caches.delete | ✅ | ✅ | — |

buildId가 바뀌었으므로 269326b 빌드는 production에 도달했다.

---

## 2. 하이드레이션 상태 (핵심 관찰)

스크립트는 19개가 로드되고 `document.readyState === "complete"`지만, React 이벤트 핸들러가 DOM 요소에 붙지 않았다.

| 점검 | 값 |
|---|---|
| 전체 요소 수 (`document.querySelectorAll('*').length`) | 887 |
| `__reactFiber$*` / `__reactProps$*` 키를 가진 요소 수 | **6** |
| 최상위 fiber 요소 | `<html>` (fiber만 있음, props 없음) |
| `[role="tab"]` 버튼들의 `__reactProps$*` | **0건 전원 부재** |
| `[role="tab"]` 버튼 outerHTML | 순수 SSR HTML, 이벤트 리스너 흔적 없음 (`class="... transition-colors ..."`) |
| `window.__NEXT_DATA__` | `undefined` (App Router라서 정상) |
| `globalThis.__next_f` | `object` (SSR payload 존재) |

즉 **SSR HTML은 정상 도착했지만 React가 이벤트 리스너를 attach하지 못한 상태**가 5~6초 후에도 지속된다.

### 2-1. 탭 전환 시도 전원 실패

현재 활성 탭: `신청인` (`aria-selected="true"`)

| 방법 | 결과 |
|---|---|
| `tab.click()` | `aria-selected` 그대로 false, tabpanel 변화 없음 |
| `PointerEvent/MouseEvent` 풀 시퀀스 dispatch (`pointerover→down→up→click`) | 동일 |
| `tab.focus()` + `ArrowRight` KeyboardEvent ×5 | 동일 |
| `location.reload()` 후 재시도 (4~6초 대기 포함) | 동일 |
| 네비게이션 `?_=v5` → `?_=v5b` → `?_=v5c` | 동일 |

### 2-2. DOM에 존재하는 tabpanel 개수

```js
document.querySelectorAll('[role="tabpanel"]').length // 1
```

**`변제계획` 탭에 해당하는 tabpanel은 DOM에 렌더되지 않았다.** 현재 DOM에 있는 유일한 panel은 `신청인`(459자).

---

## 3. 기대값 대비 결과

| # | 기대 | 실제 | 결과 |
|---|---|---|---|
| a | `panel.innerText.length > 106` | **측정 불가** (변제계획 tabpanel이 DOM에 없음) | ⛔ BLOCKED |
| b | `panel.querySelectorAll('button').length >= 1` | 측정 불가 | ⛔ BLOCKED |
| c | 월변제액 카드 `561,458원` | 측정 불가 | ⛔ BLOCKED |
| d | 변제기간 카드 `36개월` | 측정 불가 | ⛔ BLOCKED |
| e | 변제율 카드 `%` | 측정 불가 | ⛔ BLOCKED |
| f | 채권자별 배분 표 (10건) | 측정 불가 | ⛔ BLOCKED |
| g | sticky bottom 저장 버튼 visible | 측정 불가 | ⛔ BLOCKED |

**전체 7개 항목 BLOCKED — 변제계획 탭을 열 수 없어서 기대값을 관측할 수조차 없다.**

---

## 4. 부수 관찰 (참고)

신청인 탭에는 하이드레이션 실패의 부수 효과로 다음과 같은 정적 상태가 보인다 (이것 자체는 기대 범위 안일 수 있으나 명시):

- `value="김한경"` 등 서버 렌더 값은 정상 주입
- 가족 구성원 섹션 표기: **"부양가족 1인 (본인 포함) — 기준중위소득 산정에 사용됩니다"**
  - v4까지 운영자가 언급한 "+1을 두 번 함 → 2인 가구 오계산" 증상이 있었다면, SSR 텍스트 상으로는 "1인"으로 보인다 (다만 이는 신청인 탭 폼 표기일 뿐이며, 변제계획 탭의 실제 계산 경로가 같은 값을 쓰는지 여부는 관측할 수 없다)

이 관찰은 하이드레이션 실패로 변제계획 탭 카드를 직접 볼 수 없기 때문에 **간접 근거에 불과**하다.

---

## 5. 증거

### 5-1. buildId 변경
```js
fetch('/api/version',{cache:'no-store'}).then(r=>r.text()).then(t=>t.slice(0,80))
// v4: <!DOCTYPE html><!--ybP52jdMFCZW6LISK70aY-->...
// v5: <!DOCTYPE html><!--0CtrdnbumuuMJVl9Wsu6g-->...
```

### 5-2. React fiber 부재
```js
const all=document.querySelectorAll('*'); // 887
let cnt=0; for(const el of all){
  if(Object.keys(el).some(k=>k.startsWith('__react'))) cnt++;
}
// cnt === 6  (html, body 및 최상위 몇 개만)
// 모든 [role="tab"] 버튼은 __reactProps$* 키 0건
```

### 5-3. 탭 전환 시도 결과
```js
const t=[...document.querySelectorAll('[role="tab"]')].find(x=>x.textContent.trim()==='변제계획');
t.click();
// await ~1s
t.getAttribute('aria-selected') // "false"
document.querySelector('[role="tabpanel"]:not([hidden])').innerText.slice(0,30)
// "* 필수 입력 항목입니다신청인 기본 정보..."  ← 여전히 신청인 패널
```

### 5-4. tabpanel 개수
```js
document.querySelectorAll('[role="tabpanel"]').length // 1
[...document.querySelectorAll('[role="tabpanel"]')][0].innerText.length // 459
```

### 5-5. 변제계획 탭 버튼 outerHTML (정적 SSR, 이벤트 리스너 없음)
```html
<button role="tab" aria-selected="false"
  class="whitespace-nowrap rounded-t-md px-4 py-2 text-sm font-medium transition-colors text-slate-500 hover:text-slate-700 hover:bg-slate-50">
  변제계획
</button>
```

### 5-6. 신청인 tabpanel outerHTML (앞부분, cooked)
```html
<div role="tabpanel">
  <div class="space-y-6">
    <p class="text-xs text-slate-500">
      <span class="text-red-500">*</span> 필수 입력 항목입니다
    </p>
    <section class="rounded-lg border border-slate-200 bg-white p-4">
      <h2 class="mb-4 text-base font-semibold text-slate-800">신청인 기본 정보</h2>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div class="space-y-1">
          <label for="applicant_name" class="text-sm font-medium text-slate-700">
            이름 <span class="text-red-500" aria-hidden="true">*</span>
          </label>
          <input id="applicant_name" type="text" required="" aria-required="true"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
                   focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="홍길동" value="김한경">
        </div>
        <div class="space-y-1">
          <label for="resident_front" class="...">주민등록번호 <span class="text-red-500" aria-hidden="true">*</span></label>
          <div class="flex items-center gap-2">
            <input id="resident_front" type="text" maxlength="6" required ...>
  ... (이하 생략)
```

---

## 6. PASS / FAIL 매트릭스

| 항목 | 결과 |
|---|---|
| 배포 확정 (buildId 변경) | ✅ PASS |
| React 하이드레이션 | 🔴 FAIL (전체) |
| 변제계획 탭 전환 | 🔴 FAIL (불가) |
| 변제계획 tabpanel DOM 존재 | 🔴 FAIL (DOM 없음) |
| 패널 길이 / 버튼 수 / 카드 / 표 / 저장 버튼 (7개 항목) | ⛔ BLOCKED (관측 불가) |

---

## 7. 검증관 보고 (화면 결과만)

- **269326b 배포는 production에 도달했다.**
- **그러나 `/cases/.../rehabilitation` 페이지가 클라이언트에서 하이드레이션되지 않는다.** 5~6초, reload 3회, 캐시 완전 삭제, 여러 캐시버스터 쿼리 모두 동일.
- **그 결과 변제계획 탭을 열 수 없고**, v4에서 식별한 "panel 106자 / 0버튼" 상태가 개선되었는지 여부를 **판정할 수 없다.**
- 콘솔 메시지는 이 툴의 추적 시작 타이밍(페이지 로드 이후) 때문에 캡처되지 않았다. 하이드레이션 에러는 새 탭에서 DevTools를 열고 새로고침해야 볼 수 있다.

검증관은 여기서 멈추고, **코드 경로 추적은 운영자에게 이관한다.**

다음 v6 검증 요청 시:
1. 269326b 이후의 후속 커밋(하이드레이션 복구)이 배포되었는지 (`/api/version` 접두 코멘트로 확인)
2. `변제계획` 탭이 정상 전환되는지 (`aria-selected="true"`)
3. `panel.innerText.length`, `buttons`, 카드 텍스트를 측정

---

## Appendix: 검증 환경

- 브라우저: Chrome (Claude in Chrome MCP)
- URL: `https://www.veinspiral.com/cases/b6823d01-5832-49a8-8682-355303a3acf5/rehabilitation?_=v5c`
- 캐시버스터: `?_=v5`, `?_=v5b`, `?_=v5c` + SW unregister + caches.delete + reload
- 검증 시각: 2026-04-07 (KST)
- buildId: `0CtrdnbumuuMJVl9Wsu6g`

본 보고서는 v1 → v2 → v3 → v4의 시계열 후속이며, 269326b 배포가 **변제계획 탭 복구 이전에 페이지 하이드레이션 자체를 깨뜨렸음**을 확정한다.
