# 김한경 변제계획 탭 검증 v6 (5bae08f revert 배포 후)

> 검증일: 2026-04-08
> 검증자: Claude (VERIFIER)
> 대상: www.veinspiral.com
> case_id: `b6823d01-5832-49a8-8682-355303a3acf5`

---

## 0. 헤드라인

> ✅ **revert 배포 확정**: buildId `0CtrdnbumuuMJVl9Wsu6g` → **`opD7urRmkliG7SuGrBaO9`**
> 🟡 **하이드레이션 부분 회복** — `__react*` fiber 보유 요소 **6개 → 58개**로 증가
> 🔴 **그러나 변제계획 탭 전환 여전히 불가** — `[role="tab"]` 버튼들 자체에는 `__reactProps$*` 0건, 클릭/PointerEvent 시퀀스 모두 `aria-selected="false"` 유지

**v5의 "전면 사망" 상태에서 v4의 "정상" 상태로 완전히 돌아가지는 않았다.**
revert가 일부 회복은 가져왔지만 (fiber 6→58), v4에서 가능했던 탭 전환은 v6에서도 막혀 있다.

---

## 1. 배포 확인

| 항목 | v5 | v6 | 변화 |
|---|---|---|---|
| HTML buildId 코멘트 | `0CtrdnbumuuMJVl9Wsu6g` | **`opD7urRmkliG7SuGrBaO9`** | ✅ 변경 |
| 검증 URL | `?_=v5c` | `?_=v6` | — |
| SW unregister + caches.delete | ✅ | ✅ | — |

5bae08f revert 빌드 production 도달 확정.

---

## 2. 하이드레이션 상태 비교

| 점검 | v4 (정상) | v5 (사망) | v6 (revert) |
|---|---|---|---|
| `__react*` fiber 보유 요소 | (정상) | **6** | **58** |
| `[role="tab"]` 버튼의 `__reactProps$*` | (있음, 클릭 동작) | 0 | **0 (여전히 없음)** |
| 변제계획 탭 클릭 후 `aria-selected` | `true` 전환 | `false` 유지 | **`false` 유지** |
| DOM 내 `[role="tabpanel"]` 개수 | (전환 가능) | 1 | **1** |

전체 877개 DOM 요소 중 6 → 58개로 fiber가 늘었지만, **탭 버튼이 속한 서브트리는 여전히 hydrate되지 않았다.**

---

## 3. 탭 전환 시도

| 방법 | v6 결과 |
|---|---|
| `tab.click()` (5초 대기 후) | `aria-selected="false"`, panel 변화 없음 |
| `location.reload()` 후 8초 대기 + `tab.click()` | 동일 |
| `scrollIntoView` + PointerEvent 풀 시퀀스 (`pointerover→enter→down→mousedown→pointerup→mouseup→click`) | 동일 |

활성 탭은 계속 `신청인` (SSR 기본값), tabpanel 1개, 길이 459자, 버튼 6개.

---

## 4. 기대값 대비 결과

운영자 v6 분기 기대:
- **PASS** = revert 후 hydration 정상 복귀 (변제계획 탭 클릭 가능, 패널 106자)
- **FAIL** = 다른 원인 → 추가 추적

| # | 기대 | 실제 | 결과 |
|---|---|---|---|
| a | buildId 새 값으로 변경 | `opD7urRmkliG7SuGrBaO9` | ✅ PASS |
| b | 페이지 hydration 정상 복귀 | 부분 회복 (6→58) but **탭 버튼 hydrate 안 됨** | 🔴 FAIL |
| c | 변제계획 탭 클릭 가능 | 클릭/이벤트 dispatch 모두 무반응 | 🔴 FAIL |
| d | 패널 106자 (v4와 동일) | **변제계획 panel을 열 수 없어 측정 불가** | ⛔ BLOCKED |

---

## 5. 결론

### 5-1. revert로는 v4 상태 회복 안 됨

운영자의 인과 가설은 "269326b가 hydration을 깼다 → revert하면 v4로 돌아간다"였지만, **v6에서 fiber 보유 요소가 v4 수준으로 회복되지 않았고**, 특히 탭 컴포넌트 서브트리는 여전히 dead.

가능한 해석 (검증관 관찰만, 코드 추적 없음):

1. 269326b가 단독 원인이 아닐 수 있음 — revert만으로는 부족
2. revert 자체에서 새 파일(`.npmrc`)이 같이 생기면서 빌드 환경이 v4와 완전 동일하지 않을 수 있음 (`5bae08f`: `3 files changed, 8 insertions(+), 10 deletions(-)`, `create mode 100644 .npmrc`)
3. CDN/Edge 캐시가 일부 chunk만 새 빌드로 갱신해서 chunk 간 버전 불일치가 발생했을 가능성
4. 한쪽 chunk가 throw하면 React 18/19는 부모 boundary로 fallback하면서 일부만 hydrate하고 멈출 수 있음 — 그 결과 fiber count 6 → 58 (일부만 회복) 패턴과 부합

### 5-2. v4 ↔ v6 차이의 핵심 단서

- v4: fiber count 정상, 탭 클릭 가능 (PointerEvent 시퀀스로 전환 성공)
- v6: fiber 6→58 (부분 회복), but 탭 버튼 hydrate 0건 → 클릭 전혀 동작 안 함
- v5: fiber 6 (최악), 탭 hydrate 0건 → 동일하게 클릭 안 됨

→ **v5와 v6는 탭 영역만 보면 사실상 같은 상태.** revert가 전체 hydration count는 약간 끌어올렸지만 **탭 컴포넌트 자체는 회복되지 않았다.**

---

## 6. 증거

### 6-1. buildId 변경
```js
fetch('/api/version',{cache:'no-store'}).then(r=>r.text()).then(t=>t.slice(0,80))
// v5: <!DOCTYPE html><!--0CtrdnbumuuMJVl9Wsu6g-->...
// v6: <!DOCTYPE html><!--opD7urRmkliG7SuGrBaO9-->...
```

### 6-2. fiber count
```js
const all=document.querySelectorAll('*'); // 887
let cnt=0; for(const el of all){
  if(Object.keys(el).some(k=>k.startsWith('__react'))) cnt++;
}
// v5: cnt === 6
// v6: cnt === 58
```

### 6-3. 탭 버튼 자체는 hydrate 0건
```js
const t=[...document.querySelectorAll('[role="tab"]')].find(x=>x.textContent.trim()==='변제계획');
Object.keys(t).filter(k=>k.startsWith('__react')).length // 0
```

### 6-4. PointerEvent 시퀀스 무반응
```js
// pointerover → enter → down → mousedown → pointerup → mouseup → click
// (clientX, clientY, pointerId:1, pointerType:'mouse', button:0, buttons:1, bubbles:true)
// 결과: aria-selected="false", 활성 panel innerText 변화 없음 (459자 그대로)
```

### 6-5. 콘솔 메시지
MCP 콘솔 추적 시작 시점이 페이지 로드 이후라 캡처되지 않음. (v5와 동일 한계)

---

## 7. PASS / FAIL 매트릭스

| 항목 | 결과 |
|---|---|
| 5bae08f 배포 확정 (buildId 변경) | ✅ PASS |
| 부분적 hydration 회복 (fiber 6→58) | 🟡 PARTIAL |
| 변제계획 탭 전환 | 🔴 FAIL |
| 패널 106자 측정 (v4 상태 확인) | ⛔ BLOCKED |
| **운영자 가설 (269326b 단독 원인)** | 🔴 **반증되지는 않았으나 revert만으로 부족** |

---

## 8. 검증관 보고 (화면 결과만)

- **5bae08f revert는 production 도달했다.**
- **하이드레이션이 부분적으로만 회복**되었다 (전체 fiber 6→58).
- **변제계획 탭 컴포넌트 서브트리는 여전히 hydrate되지 않아** 탭 전환이 불가능하다.
- v5와 v6 사이에 변제계획 탭 클릭 동작은 **둘 다 동일하게 실패** — revert가 그 부분에서는 변화를 못 만들었다.
- 따라서 **"269326b가 단독 hydration 원인" 가설은 v6 데이터로는 확정되지 않는다.**
- 추가 단서: revert 커밋이 `.npmrc`를 새로 만들었다는 점 (운영자 git show 출력 `create mode 100644 .npmrc`) — 빌드 환경 자체가 v4와 미묘하게 달라졌을 수 있음.

검증관은 여기서 멈추고, **코드 경로 / 환경 차이 추적은 운영자에게 이관한다.**

### 다음 v7 검증 요청 시 권장 점검

1. CDN/Edge 캐시 강제 무효화 (Vercel 캐시 purge 또는 새 immutable build) 후 재검증
2. `.npmrc` 변경의 hydration 영향 여부 확인 — 가능하면 revert 단계에서 `.npmrc`를 빼고 재push
3. 새 탭에서 DevTools를 직접 열고 reload하여 hydration error 메시지 캡처 (MCP 콘솔 추적 한계 우회)
4. v4 상태와 v6 상태의 `_next/static/chunks/*` 파일명 비교 — 일부 chunk만 갱신됐는지 확인

---

## Appendix: 검증 환경

- 브라우저: Chrome (Claude in Chrome MCP)
- URL: `https://www.veinspiral.com/cases/b6823d01-5832-49a8-8682-355303a3acf5/rehabilitation?_=v6`
- 캐시버스터: `?_=v6` + SW unregister + caches.delete + reload
- 검증 시각: 2026-04-08 (KST)
- buildId: `opD7urRmkliG7SuGrBaO9`
- head commit: 5bae08f (revert of 269326b)

본 보고서는 v1 → v2 → v3 → v4 → v5의 시계열 후속이며, **revert 단독으로는 v4 상태가 회복되지 않았음**을 확정한다.
