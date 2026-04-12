# CLAUDE.md — Vein Spiral

> Claude Code가 자동으로 읽는 프로젝트 규칙입니다.  
> 전체 규칙 원본: `docs/UX_RULES.md`

## 작업 방식
- 연속 작업 시 중간 확인 없이 끝까지 진행. 커밋 단위로 끊되 지시 요청하지 말 것
- typecheck 통과하면 바로 다음 작업으로 넘어갈 것
- "다음 지시 주세요" 금지 — TODO 목록이 남아있으면 알아서 진행

## 스택

- Next.js 16 App Router + React 19 + TypeScript strict
- Tailwind v4, Supabase (auth + DB)
- 커스텀 UI 컴포넌트 (shadcn/ui, Radix, sonner **미사용**)
- `cn()` at `@/lib/cn`

## 🔴 반드시 따를 코드 규칙

### 폼 필드
```tsx
// ✅ 필수 입력란 — 빨간 * 표시 필수
<div className="space-y-1">
  <label htmlFor="name" className="text-sm font-medium">
    이름 <span className="text-red-500" aria-hidden="true">*</span>
  </label>
  <Input id="name" name="name" required aria-required="true" />
</div>
// 폼 상단에 안내문
<p className="text-xs text-slate-500"><span className="text-red-500">*</span> 필수 입력 항목입니다</p>
```
- `required` 필드 → `<span className="text-red-500">*</span>` 필수
- `label htmlFor` ↔ `input id` 반드시 연결
- `placeholder`는 label 대체 불가, 보조 안내만
- 폼 상단에 필수/선택 안내를 표시
- URL, 이메일, 사업자번호, 전화번호, 주민번호는 형식 힌트를 같이 표시
- raw Zod/JSON/영문 검증 에러를 그대로 노출하지 않음
- 개발언어, 내부 코드 용어, 영어 시스템 문구, 개발자 설명, 추상적인 표현을 UI에 그대로 노출하지 않음
- 같은 의미의 상태 카드와 안내 박스는 크기와 정렬을 맞추고 글자가 깨지지 않게 구성
- 플랫폼 전용 기능이 일반 사용자조직이나 의뢰인 화면에 보이거나 실행되면 버그로 간주하고 플랫폼 관리조직 로그로 기록
- 본인이 하지 않은 staged 변경은 절대 건드리지 않음. 푸시가 막히면 현재 상태를 먼저 보고하고 브랜치/로컬 보존 여부를 사용자에게 확인

### 새 페이지/메뉴 신설 필수 체크리스트
1. `mode-aware-nav.tsx`에 메뉴 항목 등록 (안 하면 사이드바에 안 보임)
2. 서버에서 `requireXxxAccess()` 권한 체크
3. 빈 상태(empty state) 필수 — 데이터 없을 때 안내 문구
4. 페이지 헤더 — `<h1>제목</h1>` + `<p>설명</p>`
5. 모바일 반응형 — Tailwind `md:`, `lg:` 클래스
6. 메뉴에 보이는 핵심 기능은 실제 라우트와 1:1로 연결
7. KPI/요약 카드가 수치나 상태를 표시하면 클릭 가능해야 함
8. 숫자 카운트는 실제 항목 수와 같아야 함

```tsx
// ✅ 빈 상태 패턴
{items.length === 0 && (
  <div className="py-12 text-center text-slate-400">
    <Icon className="mx-auto mb-3 h-8 w-8 opacity-40" />
    <p className="font-medium">아직 [항목]이 없습니다</p>
    <p className="mt-1 text-sm">[다음 행동 안내]</p>
  </div>
)}
```

### Soft Delete (UX #8 강제)
```ts
// ❌ 절대 금지 — 즉시 hard delete
await supabase.from('table').delete().eq('id', id);

// ✅ 필수 — lifecycle_status 방식
await supabase.from('table')
  .update({ lifecycle_status: 'soft_deleted', updated_by: auth.user.id })
  .eq('id', id);

// ✅ 필수 — deleted_at 방식 (lifecycle_status 없는 테이블)
await supabase.from('table')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', id);
```
- 목록 쿼리: `.neq('lifecycle_status', 'soft_deleted')` 또는 `.is('deleted_at', null)` 필수
- 삭제 후 반드시 `undo()` 토스트 + "보관함에서 복구 가능" 안내
- Trash UI(`?tab=trash` 또는 `/trash`): 복구 버튼 + 관리자만 영구삭제 가능
- 내부 롤백 삭제는 `PROJECT_RULES.md 2-5-1` 보상 삭제 예외를 따른다

### 폼 제출
```tsx
// ❌ 금지
<form action={serverAction}><button type="submit">저장</button></form>

// ✅ 필수
<ClientActionForm action={serverAction} successTitle="저장 완료">
  <SubmitButton>저장</SubmitButton>
</ClientActionForm>
```

### Destructive 액션
```tsx
// ❌ 금지
window.confirm('삭제?')
alert('삭제됨')

// ✅ 필수
<DangerActionButton
  action={deleteAction}
  fields={{ id: item.id }}
  title="삭제 확인"
  description="..."
  highlightedInfo={`대상: ${item.name}`}
  confirmLabel="삭제"
  successTitle="삭제 완료"
/>
```

### 토스트
```tsx
const { success, error, undo } = useToast();
success('저장 완료', { message: '...' });
error('실패', { message: '원인 + 해결방법' }); // "에러 발생" 금지
undo('삭제됨', { message: '8초 내 취소 가능', onUndo: handleUndo });
```
- 알림은 `destination_url` 없이 생성 금지
- generic `/dashboard` fallback 금지, 이유와 대체 경로를 보여줄 것

## 기술 제약

- `button.tsx`에 `'use client'` **추가 금지** — 서버 컴포넌트가 `buttonStyles()` 직접 호출
- 모든 Server Action → `revalidatePath()` 호출
- ARIA 속성 모든 인터랙티브 요소에 필수

### 번들 최적화
- 미디어: GIF 금지 → WebM/MP4 + `<video>` 사용. `unoptimized` 금지
- 무거운 라이브러리: 클라이언트에서 쓰지 않는 모듈은 dynamic import
- 탭/모달 등 조건부 UI: `next/dynamic`으로 lazy load

### 🔴 Migration 규칙 (절대 준수)
```
supabase/migrations/ 구조:
  001 extensions_and_schemas   007 insolvency_shared
  002 enums                    008 rehabilitation
  003 core_tables              009 functions_and_triggers
  004 platform_governance      010 rls_policies
  005 collaboration            011 indexes
  006 billing                  012 seed_data
```
- **새 migration 파일 추가 금지** — 기존 12개 파일 안에서 수정
- 컬럼 추가/변경 → 해당 도메인의 기존 CREATE TABLE 문을 직접 수정
- 함수 추가/변경 → `009_functions_and_triggers.sql` 수정
- RLS 추가/변경 → `010_rls_policies.sql` 수정
- 인덱스 추가 → `011_indexes.sql` 수정
- 시드 데이터 → `012_seed_data.sql` 수정
- 새 테이블이 필요하면 가장 가까운 도메인 파일(003~008)의 끝에 추가
- **배치 규칙**: 테이블 파일(003~008)에는 `CREATE TABLE` + 제약조건(constraint) + 코멘트만 둔다
  - `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` → `010_rls_policies.sql`에 집중
  - `CREATE INDEX` → `011_indexes.sql`에 집중
  - 테이블 파일에 인라인 RLS/인덱스를 넣지 말 것 — 대신 `-- NOTE: indexes → 011, RLS → 010` 코멘트 추가
- **절대 하지 말 것**: `0098_xxx.sql` 같은 증분 migration 파일 생성
- **이유**: 97개 → 12개로 squash한 구조. 다시 늘리면 안 됨
- 새 도메인 파일(013 이상)이 정말 필요하면 **사용자 승인** 후에만 추가. 기존 12개로 안 되는 이유를 먼저 설명할 것

## 핵심 컴포넌트

```
src/components/ui/
├── button.tsx              # 기본 버튼 (서버 안전)
├── enhanced-button.tsx     # 툴팁/disabledReason (클라이언트)
├── submit-button.tsx       # 폼 제출 버튼
├── client-action-form.tsx  # 폼 래퍼 + toast 자동 연결
├── danger-action-button.tsx # destructive 액션 + 확인 모달
├── confirmation-modal.tsx  # 확인 모달 (native <dialog>)
├── toast-provider.tsx      # useToast hook
├── loading.tsx             # LoadingOverlay + InlineLoadingSpinner
└── inline-error.tsx        # 인라인 에러 (원인 + 해결방법)
```

전체 규칙: `docs/UX_RULES.md`

---

## v2.0 추가 규칙 요약

### 메타 규칙 (0-4 ~ 0-8)
- **0-7 CI 강제**: `typecheck` + `lint` + `build` + `test` + `check:migrations` 전부 통과해야 머지
- **0-8 이행 원칙**: 신규 구현은 즉시 적용. 기존 파일 수정 시 수정 범위 내에서 규칙 준수

### 권한 추가 (1-6 ~ 1-7)
- **1-6 기본 거부(Default Deny)**: 권한 명시 없는 기능 허용 금지. 비활성 버튼에 `disabledReason` 제공
- **1-7 민감정보**: `service_role`·JWT·API key 클라이언트 노출 금지. 주민번호·계좌번호 로그 기록 금지

### DB 추가 (2-8 ~ 2-10)
- **2-8 트랜잭션**: 2개 이상 테이블 동시 변경은 트랜잭션 또는 원자적 RPC 사용
- **2-9 RLS**: 조직 데이터 테이블은 모두 RLS 활성화. RLS 없는 상태로 머지 금지
- **2-10 인덱스**: 새 필터·정렬·조인 키 도입 시 인덱스 필요성 검토. `select('*')` 남용 금지

### UX 추가 (3-7 ~ 3-8)
- **3-7 페이지네이션**: 8개 이상→접기/더보기, 50개 이상→서버 페이지네이션 필수
- **3-8 로딩·에러**: 요청 중 버튼 비활성화 필수. 낙관적 UI 실패 시 롤백 경로 제공

### 메시지 추가 (4-5 ~ 4-6)
- **4-5 단일 원본**: 반복 메시지는 중앙 상수에서 관리
- **4-6 액션 결과 계약**: `{ ok: true }` | `{ ok: false; code; userMessage; logRef? }` 형태로 반환

### 아키텍처 추가 (5-5 ~ 5-9)
- **5-5**: Server Components 기본값. DB 쓰기를 클라이언트에 직접 두지 않음
- **5-6**: 클라이언트 검증이 있어도 서버 검증이 최종 원본
- **5-7**: 신규 Server Action은 성공·실패 경로 테스트 각 1개 이상
- **5-8**: 주요 변경은 누가·무엇을·언제·결과 추적 가능해야 함
- **5-9**: N+1 쿼리 금지. 무제한 렌더링 금지
- 기능 검토는 `생성 → 승인/연결 → 알림 → 목적지 이동 → 처리 → 보관/삭제/복구 → 로그` 순서로 본다

### 프리미엄 허브 추가 (3-10 ~ 3-12, 4-7, 5-10 ~ 5-12)
- **3-10 메뉴 상단 구조**: 허브 결합도가 높은 메뉴는 첫 화면에 허브 요약 블록 포함
- **3-11 허브 연동**: 사건 관련 메뉴는 허브 입장, 허브 상태 요약, 허브 기준 필터 중 최소 1개 제공
- **3-12 허브 로비**: 데스크톱 `3:6:3` 레이아웃, 최근 활동 기본 7개, 협업률 링 + 열람률 보조 바
- **4-7 수치 표기**: `협업 x/y → 열람 x/y → 미읽음 n → 최근 활동 t` 순서와 표기 고정
- **5-10 ~ 5-12**: 사건허브를 메뉴 결합 중심축으로 유지하고, `PremiumPageHeader`, `HubContextStrip`, `HubMetricBadge`, `HubReadinessRing`, `ParticipantSlotRing`, `PremiumCaseCard`, `PremiumInfoPanel`, `ActivityFeedPanel`을 단일 원본 프리미티브로 사용

### 용어 사용 (6-2)
- UI: "조직", "의뢰인", "허브" / 코드: `organizationId`, `clientId`, `hubId`

## ✅ 체크리스트 (v2.0 — 22개 항목)

1. `PROJECT_RULES.md` 전체 읽음
2. 서버 권한 가드 적용
3. 클라이언트 입력 서버에서 재검증
4. soft delete 대상 `.delete()` 직접 호출 없음
5. 목록 쿼리에서 삭제 데이터 제외
6. `ClientActionForm` + `SubmitButton` 사용
7. 파괴적 액션에 `DangerActionButton` 사용
8. 삭제 후 `undo()` 토스트 + 보관함 복구 경로 제공
9. 필수 필드에 빨간 `*` 표시
10. `label htmlFor` ↔ `input id` 연결
11. 빈 상태 화면 제공
12. 새 메뉴 `mode-aware-nav.tsx` 등록
13. 액션 성공 후 `revalidatePath()` 호출
14. ARIA 속성 적용
15. typecheck·lint·test·build·migrations 통과
16. 8개 이상 목록에 접기/더보기 제공
17. 50개 이상 목록에 서버 페이지네이션 적용
18. 플랫폼 관리자 전용 기능은 5-4 목록 등록
19. 플랫폼 관리자 진입점이 목록 또는 대시보드
20. 용어를 6-1 정의와 일치하게 사용
21. 로그·메시지에 민감정보 노출 없음
22. 권한·RLS·soft delete 변경 시 회귀 테스트 추가

---

## v2.1 플랫폼 운영 규칙 메모

- 기준 부속서:
  - `docs/platform-rules-package+solution/vein_spiral_rules_package/01_PROJECT_RULES_PLATFORM_EXPANSION_ADDENDUM.md`
  - `docs/platform-rules-package+solution/vein_spiral_rules_package/02_FORMULAS_AND_THRESHOLDS.md`
  - `docs/platform-rules-package+solution/vein_spiral_rules_package/03_ROLLOUT_AND_LEGACY_TRANSITION.md`
  - `docs/platform-rules-package+solution/vein_spiral_rules_package/*.csv`
- 플랫폼 관리자 판별은 `slug`, `name`, `label`이 아니라 canonical DB 모델과 `app.is_platform_admin()`을 사용한다.
- 이미 생성된 테이블을 후속 migration에서 `create table if not exists`로 재선언하지 않는다.
- migration canonical source, retired 축, history-sync 축은 `docs/migration-catalog.md`를 기준으로 해석한다.
- 메뉴 검색, 결제 잠금, 로그 싱크, 조직 복구 순서는 package matrix를 단일 원본으로 사용한다.
- schema-affecting change는 `main` 직푸시가 아니라 PR로 분리한다.
- 플랫폼 운영 질문, 조직 승인, 구독 조정, 조직 삭제, 운영 권한, 감사로그 판단은 AI가 답하지 않고 운영 메뉴로만 안내한다.
- 조직원 초대는 신원 입력과 권한 설정을 분리하고, 의뢰인 초대는 사건/허브 문맥과 연결 단계를 분리한다.

---

## 개인회생 자동작성 모듈 규칙

- 법적 근거: 채무자회생법, 처리지침(재민 2004-4, 2026.3.1 시행), 서울회생법원 가이드
- 상세: `docs/REHABILITATION_LAW_RULES.md`

### 🔴 계산 규칙 (위반 시 법원 불인가)

**우선변제 100%**: `has_priority_repay=true` 채권은 원리금 전액 변제 필수.
  가용소득 부족 시 변제기간 연장(최장 60개월) 또는 에러 표시.

**청산가치보장**: `현재가치(총변제액) ≥ 청산가치` 필수. 미달 시 D5111(재산처분) 양식 전환.

**변제기간**: 기본 36개월, 최장 60개월, 72개월 절대 불가.

### 🔴 올림/버림 규칙 (가이드 p.12-17)

```
(E) 월변제예정액 (채권자별) → Math.ceil  (올림)
(P) 재산처분 변제액 (채권자별) → Math.ceil  (올림)
(O) 변제투입예정액          → Math.ceil  (올림)
(L) 현재가치 (라이프니쯔)    → Math.floor (버림)
④ 회생위원 보수             → Math.round (반올림)
변제율(%)                   → Math.round (반올림)
```

올림 결과, (H)월변제예정액 합계가 (A)월가용소득보다 약간 많아지는 것이 **정상**.

### 가용소득 공식

```
③ 월 가용소득 = ① 월 수입 - ② 조정된 생계비
④ 회생위원 보수:
    채무총액 ≤ 2억 AND 급여소득자 → 법원사무관 → 0원
    그 외 → 외부 위원 → ③의 1% (반올림)
⑤ 월 실제 가용소득 = ③ - ④
```

생계비 = 기준중위소득 × 60% (원칙). `living_cost_rate` 디폴트 100 (= 60% 그대로).
추가 생계비: 주거비, 미성년자 교육비, 의료비 (법원 승인 필요).

### 안분 공식

```
(E) = (A)월실제가용소득 × { (D)해당채권 / (G)총채권 }  [올림]
```
안분 기준: **원금** 원칙. 이자도 변제 가능하면 원금+이자 합계.

### D5110 vs D5111

```
현재가치(가용소득 총변제) > 청산가치 → D5110 (가용소득만)
현재가치(가용소득 총변제) ≤ 청산가치 → D5111 (가용소득+재산처분)
```

D5111 투입액: `(O) = {(J)청산가치 - (L)현재가치} × 승수` [올림]
승수: 1년이내=1.3, 2년이내=1.5. 외부 위원 시 1% 차감.

### 라이프니쯔 계수

```
36개월 = 3 + 30.7719 = 33.7719
48개월 = 3 + 40.9555 = 43.9555
60개월 = 3 + 50.6433 = 53.6433
```
할인율: 민법 §379 연 5%, 월 복리. 적립기간 3개월.

### 회차별 단계변제 (미구현)

원금 전부 + 이자 일부 변제 시:
Phase 1 (원금안분) → Phase 2 (원금잔+이자혼합) → Phase 3 (이자안분).

### 채권 분류 순서

```
1. 재단채권 (100%)  2. 우선채권 (100%)  3. 별제권부
4. 일반 (안분)      5. 미확정 (유보)
```
`renumberCreditors()`: 저장 시 자동 정렬, 1번부터 연속 부여.

### 채권자 가지번호 규칙 (처리지침 §5)

- 보증채무/연대보증 → 주채무자 채권번호의 **하위 번호** (예: 1-1, 1-2, 1-3)
- 가지번호는 주채무자 채권과 **같은 분류 그룹** 내에서만 부여해야 한다
- 동일 채권에 보증인이 복수이면 보증인 수만큼 가지번호를 연속 부여해야 한다
- 가지번호가 있는 채권의 `bond_number`는 주번호.부번호 형식으로 표시해야 한다 (예: `3-1`)

### 산정기준일 (처리지침 §3, 가이드 p.6)

- 채권자목록의 **산정기준일**(= 채권 현재액 산정 시점)을 반드시 표기해야 한다
- 산정기준일은 원칙적으로 **개인회생 개시신청일**로 한다
- 이자·지연손해금은 산정기준일 **전날**까지만 계산해야 한다
- D5106 채권자목록 상단에 `산정기준일: YYYY. MM. DD.` 형태로 명기해야 한다

### 변제개시일 규칙 (처리지침 §7③, §8④, §9①)

- 변제개시일 = 변제계획안 제출일 + 60~90일 내의 일정한 날로 정해야 한다
- 변제개시일이 확정되지 않은 경우 `변제개시일`이라는 문구로 대체 표기해야 한다
- 임치기간은 변제기간에 산입해야 한다 (처리지침 §8④)
- 변제계획안 제1항에 변제개시일을 명시해야 한다 (처리지침 §9①)

### 🔴 법원 서류 양식 규칙 (민사소송규칙 제4조)

- 용지: **A4** (210mm × 297mm)
- 여백: 위 **45mm**, 아래 **30mm**, 왼쪽·오른쪽 **20mm**
- 본문 글자 크기: **12pt**
- 줄간격: **200%**
- 표 내부 글자: **10pt** (본문보다 작게)
- 금액 표시: `toLocaleString('ko-KR')` + "원" (천 단위 콤마)
- 날짜 표시: `YYYY. MM. DD.` (마침표 구분)
- HTML 문서 생성 시 `@page` CSS로 위 여백을 강제해야 한다
- 인쇄 시 `@media print`로 불필요한 UI 요소를 숨겨야 한다

### 채권자목록 요약표 구조 (법원서식 D5106)

- 상단: **2분류** rowspan (담보부채권 / 무담보채권)
- 하단: **3분류** (별제권부 / 일반 확정 / 미확정)
- 요약표 열: 채권자 수, 원금 합계, 이자 합계, 채권현재액 합계
- 채권현재액 총합계 = 담보부 소계 + 무담보 소계
- 요약표는 채권자목록 본문 **앞**에 위치해야 한다

### 별제권 테이블 구조 (법원서식 D5106 부속서류)

- 5컬럼: **채권번호 / 담보종류 / 순위 / 목적물 / 채권최고액**
- 담보종류: 근저당권, 질권, 유치권, 양도담보, 가등기담보 중 택1
- 순위: 1순위, 2순위, 3순위 등 숫자로 기재
- 목적물: 부동산 → 소재지+면적, 자동차 → 차종+연식+등록번호
- 채권최고액: 설정 채권최고액 (원금과 다를 수 있음)

### 별제권 담보 환가비율 기본값 (가이드 §5, 실무)

```
부동산      → 70%
임차보증금  → 100%
예금        → 100%
보험        → 100%
기타        → 70% (기본값)
```
환가비율은 사용자가 변경할 수 있으나, 위 기본값을 디폴트로 제공해야 한다.

### 변제계획안 10항 필수 기재사항 (처리지침 §9)

변제계획안은 10개 항으로 구성하며, 각 항의 필수 내용은 다음과 같다:

```
제1항: 변제기간 — 변제개시일, 변제기간(개월), 종료일
제2항: 변제방법 — 월 변제액, 변제일, 납부 대상(회생위원)
제3항: 변제액과 변제율 — 총채무액, 총변제액, 변제율(%)
제4항: 채권자별 변제계획표 — "별첨에 의한다" + 별첨 표 첨부
제5항: 변제자금의 조달방법 — 급여/영업소득, D5111이면 재산처분 병기
제6항: 부인채권의 처리 — 부인채권 환수 변제 포함 여부
제7항: 면책조항 — 변제 완료 시 잔여 채무 면책 (법 §624)
제8항: 특별조항 — 채무자 의무사항 (이직신고, 소득변동 보고 등)
제9항: 처분할 재산의 처분방법 — D5111이면 처분 대상·방법·기한
제10항: 기타 사항 — 추가 특약
```

### 재산목록 카테고리 및 특수 계산 (법원서식 D5101)

14개 카테고리를 다음 순서로 기재해야 한다:
```
1.현금  2.예금  3.보험  4.자동차  5.임차보증금  6.부동산
7.사업용설비/재고/비품  8.대여금채권  9.매출금채권  10.예상퇴직금
11.(가)압류적립금  12.공탁금  13.기타  14.면제재산(주거용/생계비)
```

특수 계산 규칙:
- **예금/보험**: 각각 250만원 공제 가능 (법 §383①). 보험은 **보장성보험만** 공제 대상
- **예상퇴직금**: **1/2만** 청산가치에 반영 (나머지 1/2은 압류금지재산)
- **면제재산** (exempt_housing, exempt_living): 청산가치 **0원** 처리 (법 §383②)
- **임차보증금**: 주택임대차보호법 §8 우선변제 범위 내 금액은 압류 불가 → 청산가치 제외

### 크로스 탭 정합성 검증 (실무 요건)

다음 데이터 간 정합성을 검증하고 불일치 시 경고해야 한다:

1. **채권자↔재산**: 별제권 담보물건(`secured_properties`)의 `property_type`이
   재산목록(`properties`)의 `category`에 대응 항목이 있어야 한다
2. **소득↔변제계획**: 소득·생계비 탭의 가용소득이 변제계획 탭의 월 변제액 기준과 일치해야 한다
3. **가족↔부양가족수**: 가족 탭의 `is_dependent=true` 인원수와 생계비 산정 시 가구수가 일치해야 한다
4. **채권자 합계↔요약표**: 채권자목록의 원금·이자 합계가 요약표의 수치와 일치해야 한다

경고일 뿐 저장/제출을 차단하지 않는다 (사용자 판단에 맡김).

### 채무 한도 자격요건 (법 §579)

```
담보부 채무 ≥ 15억원 → 개인회생 부적격
무담보 채무 ≥ 10억원 → 개인회생 부적격
```
자격요건 미충족 시 명확한 경고를 표시해야 한다.

### 미확정 채권 처리 (가이드 p.9 §7)

- 채권의 존재·액수에 다툼이 있어 확정되지 않은 채권은 **미확정**으로 처리해야 한다
- 변제금액은 확정 시까지 **유보**해야 한다
- 모든 `[ ]` 안에는 `[원금]`이라고 기재해야 한다
- 확정 후 유보액을 배분하거나 반환해야 한다
- 안분 계산 시 확정채권과 미확정채권은 **별도 산정 후 합산**해야 한다

### 마지막 채권자 잔여 보정 (실무)

- 올림(Math.ceil) 적용 시 채권자별 배분 합계가 총액을 초과할 수 있다
- **마지막 채권자**가 잔여분을 흡수하여 총액과 정확히 일치시켜야 한다
- 이 규칙은 월변제예정액 배분과 재산처분 배분 모두에 적용해야 한다

### 변제율 표시 규칙 (가이드 §2)

```
변제율(%) = (총변제액 / 무담보원금) × 100
```
- 소수점 이하 반올림 (Math.round)
- 무담보원금 = 일반 무담보 원금 + 별제권 부족분 (담보 초과 미회수 원금)
- 무담보원금이 0이면 총 원금을 분모로 사용해야 한다

### 전자소송 CSV 양식 (법원 전자소송 시스템)

- 헤더: `채권자번호,채권자명,법인/개인,우편번호,도로명주소1,도로명주소2,전화번호,팩스번호,휴대전화번호,채권의원인,원금,이자`
- 인코딩: **UTF-8 BOM** (`\uFEFF` 선행) — Windows Excel 호환 필수
- 인격구분: `법인` / `개인` 이진 분류만 허용
- CSV 이스케이핑: RFC 4180 준수 (쉼표·따옴표·개행 포함 시 따옴표 감싸기)

### 파일 구조

```
src/lib/rehabilitation/
├── repayment-calculator.ts  # 변제계획 계산 (§8, 가이드 §2)
├── schedule-generator.ts    # 채권자별 배분 (가이드 §6) — 올림 적용
├── secured-allocation.ts    # 별제권 처리 (가이드 §5)
├── property-valuation.ts    # 청산가치 계산 (법 §614①④)
├── leibniz.ts               # 라이프니쯔 현재가치 — 버림 적용
├── median-income.ts         # 기준중위소득 (§7②)
├── court-form-schemas.ts    # Zod 스키마 (D5106~D5114)
├── document-generator.ts    # HTML 문서 생성
├── creditor-classification.ts # 채권자 분류 (우선/별제/일반/미확정)
├── ecourt-csv.ts            # 전자소송 CSV 변환
├── rounding.ts              # 마지막달 보정 + 변제율 표기
├── monthly-available.ts     # 월가용소득 상세 공식
├── period-setting.ts        # 변제기간 6규칙 엔진
├── repayment-period.ts      # 변제기간 자동결정
├── validators.ts            # 주민번호·전화번호·채무한도 검증
├── property-schemas.ts      # 재산 카테고리별 Zod 스키마
└── income-expense-schemas.ts # 수입/지출 서식 스키마
```
