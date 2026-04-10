# 김한경 변제계획안 미리보기 재검증 v3 (c8b4018 배포 후 — 미반영)

> 검증일: 2026-04-07 (v2 직후 동일 세션)
> 검증자: Claude (VERIFIER)
> 대상: www.veinspiral.com — SW unregister + caches.delete + reload + `?_=v3` 캐시버스터
> case_id: `b6823d01-5832-49a8-8682-355303a3acf5`
> 사건번호: `2025 개회 101101`

---

## 0. 헤드라인

> **🔴 c8b4018 배포가 production에 반영되지 않았다.**
> 빌드 ID, 변제계획 탭 패널 텍스트, 미리보기 iframe 본문 17,579자 모두 v2와 **bit-identical**.

### v2 ↔ v3 비교

| 비교축 | v2 | v3 | 변화 |
|---|---|---|---|
| `<!--buildId-->` (HTML 코멘트) | `RJs6cVwGIFnglYuZygAF7` | **`RJs6cVwGIFnglYuZygAF7`** | ❌ 동일 |
| CSS hash | `74c155565e280aac.css` | `74c155565e280aac.css` | ❌ 동일 |
| webpack chunk | `webpack-02a043e381decb40.js` | `webpack-02a043e381decb40.js` | ❌ 동일 |
| 변제계획 패널 길이 | 106자 | 106자 | ❌ 동일 |
| 변제계획 패널 버튼 수 | 0 | 0 | ❌ 동일 |
| 미리보기 iframe 본문 길이 | 17,579자 | 17,579자 | ❌ 동일 |
| 미리보기 변제율 | 35.6% + 32.2% | 35.6% + 32.2% | ❌ 동일 |
| K | 20,212,488 | 20,212,488 | ❌ 동일 |
| L | 18,961,503 | 18,961,503 | ❌ 동일 |
| 가용소득 | 561,458 | 561,458 | ❌ 동일 |
| 채권자 5번 | 부재 | 부재 | ❌ 동일 |

**판정: c8b4018 빌드/배포가 미완료이거나 production에 도달하지 않았다.**

---

## 1. 빌드 ID → commit 매핑 시도

| 시도 | 결과 |
|---|---|
| `__NEXT_DATA__.buildId` | `null` (App Router는 `__NEXT_DATA__` 미주입) |
| HTML 첫 코멘트 `<!--...-->` | **`RJs6cVwGIFnglYuZygAF7`** (v2와 동일) |
| `/api/version` | JSON 미구현, HTML 그대로 응답 (Next 라우팅이 catch-all로 SPA HTML 반환) |
| `/api/health` | `{"ok":true,"service":"vein-spiral-v2"}` — service 이름만 반환, commit hash 없음 |
| `_next/static/chunks/webpack-*.js` 해시 | `02a043e381decb40` (v2 동일) |
| `_next/static/css/*.css` 해시 | `74c155565e280aac` (v2 동일) |
| Vercel API | 미접근 (인증 토큰 없음, 사용자 액션 필요) |

**buildId → commit 매핑 결론:**
- production에 노출된 어떤 엔드포인트도 commit hash를 반환하지 않음
- buildId(21자) ↔ commit(7자) 매핑 테이블이 운영자 측에 없으면 외부에서 검증 불가
- **권고: `/api/version`에 `{commit, buildId, builtAt}` JSON을 노출하는 P0 조치 필요**

---

## 2. 검증 항목별 결과

### (1) 변제계획 탭 진입 시 (기대: empty state OR 정상 카드)

| 기대 | 실제 |
|---|---|
| empty state "소득 정보 없음" | ❌ 미표시 |
| 정상 계산 결과 (월가용·변제율·청산가치 카드) | ❌ 미표시 |
| sticky bottom "변제계획 저장" 버튼 | ❌ 미표시 |

**실제 패널 내용 (106자 그대로):**
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
- panel.querySelectorAll('button') → **0건**
- 카드, 메트릭, 저장 버튼, empty state 모두 부재

### (2) 변제계획안 미리보기 (출력/문서 탭) — 기대: 합계 행 변제율 35.6% 단일화

| 기대 | 실제 |
|---|---|
| 합계 행: 32.2% → 35.6% | ❌ 합계/채권자별 모두 **여전히 32.2%** |
| 또는 두 분모 일치 | ❌ 상단 35.6% / 본문·합계 32.2% **여전히 두 값** |

**raw 발췌:**
```
변제율: 35.6% (총변제 20,212,488원 / 확정+미확정 채권 56,714,484원)
...
1   인천세무서   ...   32.2%
2   제이비우리캐피탈(주)   ...   32.2%
...
합 계   62,844,516원   561,458원   20,212,488원   32.2%
```

---

## 3. 결론 — 두 가지 가능성

### (A) 배포 자체가 완료되지 않음 (가장 유력)
근거:
- 빌드 ID가 v2와 완전 동일
- 모든 정적 자원 hash 동일
- 변경 사항이 0%

확인 방법:
- Vercel/CI 대시보드에서 c8b4018 → production 배포 상태 확인
- `git log` 기준 c8b4018 commit이 main에 머지되었는지 확인
- 빌드 로그에서 c8b4018 deploy URL이 alias `www.veinspiral.com`에 promote 되었는지 확인

### (B) 배포는 완료되었으나 다른 코드 경로/캐시
근거:
- (가능성 낮음) Next App Router의 페이지 캐시 또는 ISR이 아직 갱신 안 된 경우
- (가능성 낮음) Edge cache가 stale-while-revalidate

확인 방법:
- HTTP 응답 헤더 `x-vercel-cache`, `x-vercel-id`, `age` 확인
- `/cases/.../rehabilitation`에 `?cb=$(date +%s)` 같은 강제 캐시버스터로 EDGE bypass 시도

---

## 4. 권고 조치

| 우선순위 | 작업 | 책임 |
|---|---|---|
| **P0** | c8b4018 배포 상태 확인 (Vercel 대시보드 또는 CLI) | 운영자 |
| **P0** | `/api/version` 엔드포인트에 `{commit, buildId, builtAt}` JSON 노출 | 개발자 |
| P1 | 배포 후 빌드 ID 변경 확인 + 변제계획 탭 진입 + 미리보기 재검증 (v4) | 검증관 |
| P1 | LOAD-side `mapDbToIncomeForm` 추가 (median_income_year/net_salary → income_year/monthly_income 역변환) — 본 v3가 식별한 root cause를 코드로 차단 | 개발자 |

---

## 5. v3 검증 환경

- 캐시버스터: `?_=v3`
- SW unregister: ✅
- caches.delete: ✅
- 강제 reload: ✅
- 빌드 ID: `RJs6cVwGIFnglYuZygAF7` (v2와 동일)
- 검증 시각: 2026-04-07 (KST)

---

## Appendix: 빌드 ID 매핑 자동화 제안

```ts
// src/app/api/version/route.ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown',
    buildId: process.env.NEXT_BUILD_ID ?? 'unknown',
    builtAt: process.env.VERCEL_BUILD_TIME ?? 'unknown',
    branch: process.env.VERCEL_GIT_COMMIT_REF ?? 'unknown',
  });
}
```

이 한 줄짜리 라우트가 있으면 향후 검증관이 매 세션마다 1초 안에 배포 여부를 확정할 수 있다. 본 v3 보고의 1·2시간이 절약된다.

---

본 보고서는 `verify-kimhangyeong-2026-04-08.md` (v1) → `-v2.md` (v2) → 본 v3의 시계열 후속이며, **세 보고가 모두 동일 산출값**임을 근거로 c8b4018 배포 미반영을 결론한다. 코드 자체가 잘못되었을 가능성은 v3 단계에서 배제 불가 — 배포 확정 후 v4 검증으로 분기되어야 한다.
