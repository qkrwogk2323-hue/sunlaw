# CLAUDE.md — Vein Spiral

> Claude Code가 자동으로 읽는 프로젝트 규칙입니다.  
> 전체 규칙 원본: `docs/UX_RULES.md`

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
