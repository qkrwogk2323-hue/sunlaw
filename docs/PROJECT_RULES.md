# Vein Spiral — 프로젝트 통합 규칙 (PROJECT_RULES.md)

> **이 파일이 모든 규칙의 최상위 단일 원본(Single Source of Truth)입니다.**  
> 새 기능을 만들기 전에 반드시 이 파일을 먼저 읽으십시오.  
> 규칙 변경 시 이 파일을 수정하고, `docs/UX_RULES.md`, `CLAUDE.md`, `.github/copilot-instructions.md`에도 동일하게 반영하세요.

---

## 📦 스택 & 기술 제약

| 항목 | 기준 |
|------|------|
| Framework | Next.js 16 App Router + React 19 + TypeScript strict |
| 스타일 | Tailwind v4 (CSS variables 기반), 커스텀 UI 컴포넌트 |
| DB/Auth | Supabase (Auth + PostgreSQL + RLS) |
| 금지 라이브러리 | shadcn/ui, Radix primitives, sonner — **신규 직접 사용 금지** (기존 button.tsx 등 extend는 허용, toast-provider.tsx로 대체 완료) |
| cn() 경로 | `@/lib/cn` |
| Server Components | 기본. Client Components는 인터랙션이 필요한 최소 범위만 |
| `button.tsx` | `'use client'` **추가 금지** — 서버 컴포넌트가 `buttonStyles()` 직접 호출 |

---

## 🔐 카테고리 1: 권한 & 인증 규칙

### 1-1. 권한 가드 함수 (서버 액션 & 페이지)

모든 서버 액션과 보호 페이지는 **반드시** 아래 함수 중 하나로 시작해야 합니다:

```ts
// 페이지 보호 — 미인증 시 /login으로 redirect
const auth = await requireAuthenticatedUser();

// 조직 액션 보호 — 조직 미소속 시 throw
const { auth, membership } = await requireOrganizationActionAccess(organizationId, {
  permission: 'case_create',       // 선택: 특정 권한 필요
  requireManager: true,            // 선택: 관리자만
  errorMessage: '...에러 메시지'
});

// 조직 구성원 관리 보호 (team invite, permission manage)
const { auth } = await requireOrganizationUserManagementAccess(organizationId, '에러 메시지');

// 플랫폼 관리자 전용 페이지
const auth = await requirePlatformAdmin(organizationId?);

// 플랫폼 관리자 전용 액션
const auth = await requirePlatformAdminAction('에러 메시지', organizationId?);
```

**규칙:**
- UI에서 버튼을 숨기는 것만으로 권한 제어 완료 불가 — **서버에서 반드시 재검증**
- 권한 없으면 `redirect()` (페이지) 또는 `throw new Error()` (액션)

### 1-2. 플랫폼 조직 모델

```
플랫폼 조직 = organizations 테이블에서 is_platform_root=true 이고 kind='platform_management'인 단일 조직
플랫폼 관리자 = 플랫폼 조직 소속 org_owner 또는 org_manager 멤버
```

- `isPlatformOperator(auth)` → 플랫폼 조직 소속 관리자인지 확인
- `hasPlatformManagementMembership(auth)` → 동일
- `PLATFORM_ORGANIZATION_SLUG` = `'vein-bn-1'` (0046 migration 기준)

### 1-3. 권한 키 목록 (`src/lib/permissions.ts`)

| 그룹 | 키 |
|------|----|
| organization | team_invite, team_permission_manage, organization_settings_manage, user_manage |
| cases | case_create, case_edit, case_delete, case_assign, case_stage_manage |
| documents | document_create, document_edit, document_approve, document_share, document_export |
| requests | request_create, request_manage, request_close |
| schedules | schedule_create, schedule_edit, schedule_confirm, schedule_manage, calendar_export |
| billing | billing_view, billing_issue, billing_payment_confirm, billing_export, billing_manage |
| collection | collection_view, collection_contact_manage, collection_payment_plan_manage, collection_payment_confirm, collection_metrics_view, collection_manage |
| reports | report_view, report_export, case_board_export |
| compensation | collection_compensation_view_self, collection_compensation_view_team, ... |
| settlement | settlement_view, settlement_manage, settlement_export |

### 1-4. 역할 계층

```
org_owner > org_manager > org_staff > client (포털 사용자)
isManagementRole(role) = org_owner || org_manager
```

---

## 🗄 카테고리 2: DB & 마이그레이션 규칙

### 2-1. 마이그레이션 파일 규칙

- 파일명 형식: `NNNN_설명.sql` (연속 번호, 4자리)
- `pnpm check:migrations` 로 번호 누락/중복 자동 차단
- 현재 최신: `0048_case_cover_fields.sql`
- **적용 완료**: `0048_case_cover_fields.sql` live DB 적용 완료 ✅
- 다음 번호: `0049_*`

### 2-2. lifecycle_status 타입 (DB 전역 enum)

```sql
-- 0002_core_schema.sql에 정의됨
'active' | 'soft_deleted' | 'archived' | 'legal_hold'
```

`cases`, `organizations` 테이블에 `lifecycle_status` 컬럼 존재.

### 2-3. Soft Delete 규칙 ← **절대 금지: 즉시 hard delete**

```ts
// ❌ 금지
await supabase.from('table').delete().eq('id', id);

// ✅ lifecycle_status가 있는 테이블
await supabase.from('table')
  .update({ lifecycle_status: 'soft_deleted', updated_by: auth.user.id })
  .eq('id', id);

// ✅ lifecycle_status 없는 테이블 (deleted_at 컬럼 추가 후)
await supabase.from('table')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', id);
```

- 목록 쿼리에 `.neq('lifecycle_status', 'soft_deleted')` 또는 `.is('deleted_at', null)` 필수
- 예외: soft_deleted 상태에서만 hard delete 허용 (`forceDeleteCaseAction` 패턴)

### 2-4. 현재 soft delete 위반 중인 항목

| 항목 | 파일 | 상태 |
|------|------|------|
| `deleteMembershipAction` | `organization-actions.ts` | ❌ hard delete — 수정 필요 |
| Cases 보관함 UI | `/cases/page.tsx` | ❌ 복구 UI 없음 — 수정 필요 |

### 2-5. 이미 올바르게 구현된 soft delete

| 항목 | 상태 |
|------|------|
| `moveCaseToDeletedAction` | ✅ lifecycle_status = 'soft_deleted' |
| `forceDeleteCaseAction` | ✅ soft_deleted 상태에서만 hard delete |
| Notifications (`trashed_at`) | ✅ soft archive 완료 |
| Organizations (`lifecycle_status`) | ✅ soft_deleted 존재 |

### 2-6. revalidatePath 규칙

모든 Server Action 성공 후 **반드시** `revalidatePath()` 호출.

### 2-7. Enum 확장 규칙

- `caseType` enum 확장 시 반드시 **별도 브랜치** (`feat/enum-expansion`)에서 진행
- 행정(administrative) / 합의(settlement) / 도산(insolvency) 추가 예정
- 확장 시 필수 작업:
  1. DB enum migration 파일 생성 (`ALTER TYPE public.case_type ADD VALUE ...`)
  2. 기존 데이터 backfill 스크립트 포함
  3. `src/lib/validators.ts`의 `caseTypeEnum` 업데이트
  4. `src/lib/status-labels.ts`의 `caseTypeLabels` 업데이트
  5. `src/components/forms/case-create-form.tsx` 드롭다운 옵션 추가
  6. `src/lib/actions/organization-actions.ts`의 `CASE_TYPE_CSV_MAP` 업데이트

---

## 🎨 카테고리 3: UX & 컴포넌트 규칙

> 원본: `docs/UX_RULES.md` | 4단계 체크리스트: `docs/ux-action-checklist.md`

### 3-1. UX 체크리스트 4단계 (모든 액션에 적용)

| Phase | 항목 | 핵심 |
|-------|------|------|
| 0 | 행동 유발 + 사전 안내 | 버튼 레이블 = 결과 중심, 영향 범위 미리 표시 |
| 1 | 권한 검증 + 중간 확인 | UI + 서버 둘 다, 위험 액션은 ConfirmModal |
| 2 | 처리 상태 + 결과 피드백 | 로딩 스피너, 버튼 비활성, 성공/실패 토스트 |
| 3 | 취소/복구 + 일관성 + 메시지 체계 | undo 토스트, soft delete, 같은 액션 = 같은 컴포넌트 |

### 3-2. 핵심 컴포넌트 사용 규칙

#### 폼 제출
```tsx
// ❌ 금지
<form action={serverAction}><button type="submit">저장</button></form>

// ✅ 필수
<ClientActionForm action={serverAction} successTitle="저장 완료" successMessage="...">
  <SubmitButton>저장</SubmitButton>
</ClientActionForm>
```

#### Destructive 액션
```tsx
// ❌ 금지
window.confirm('삭제?') / alert() / <button onClick={...}>

// ✅ 필수
<DangerActionButton
  action={softDeleteAction}
  fields={{ id: item.id, organizationId }}
  title="사건 삭제"
  description="삭제하면 보관함으로 이동되며, 언제든 복구할 수 있습니다."
  highlightedInfo={`사건명: ${item.title}`}
  confirmLabel="보관함으로 이동"
  successTitle="보관함으로 이동되었습니다"
/>
```

#### 버튼
```tsx
// 서버 컴포넌트
import { Button } from '@/components/ui/button';

// 클라이언트 + 툴팁/disabled 이유
import { EnhancedButton } from '@/components/ui/enhanced-button';
<EnhancedButton disabled={!hasPermission} disabledReason="관리자만 가능합니다.">...</EnhancedButton>
```

#### 토스트
```tsx
const { success, error, warning, undo } = useToast();

success('저장 완료', { message: '변경사항이 저장되었습니다.' });
error('저장 실패', { message: '네트워크 연결을 확인하고 다시 시도해주세요.' });  // "에러 발생" 금지
undo('삭제됨', { message: '8초 내 취소 가능합니다.', onUndo: handleUndo });
```

#### 에러 / 로딩
```tsx
<InlineError title="업로드 실패" cause="파일이 10MB 초과" resolution="10MB 이하 파일 선택" onRetry={...} />
<LoadingOverlay message="저장 중..." />
<InlineLoadingSpinner size="sm" />
```

### 3-3. 폼 필드 규칙

```tsx
// ✅ 필수 입력란 패턴
<p className="text-xs text-slate-500 mb-4">
  <span className="text-red-500">*</span> 필수 입력 항목입니다
</p>
<div className="space-y-1">
  <label htmlFor="name" className="text-sm font-medium text-slate-700">
    이름 <span className="text-red-500" aria-hidden="true">*</span>
  </label>
  <Input id="name" name="name" required aria-required="true" placeholder="홍길동" />
  {fieldError.name && <p className="text-xs text-red-500">{fieldError.name}</p>}
</div>
```

**규칙:**
- `required` 필드 → `<span className="text-red-500" aria-hidden="true">*</span>` 필수
- `label htmlFor` ↔ `input id` 반드시 연결
- `placeholder`는 label 대체 불가, 보조 안내만
- 빈 필수 필드 → 클라이언트에서 먼저 차단 (에러 문구: `"[필드명]은(는) 필수입니다."`)

### 3-4. 새 페이지/메뉴 신설 체크리스트

새 라우트/메뉴 추가 시 **6가지 모두 필수**:

1. **`mode-aware-nav.tsx`에 메뉴 항목 등록** — 안 하면 사이드바에 안 보임
2. **`sectionAccent` 색상 등록** — 새 섹션 ID 추가 시 accent 정의 필수
3. **서버 권한 체크** — `requireXxxAccess()` 호출, 미인가 시 redirect
4. **빈 상태(empty state)** — 데이터 없을 때 아이콘 + `"아직 [항목]이 없습니다"` + 안내
5. **페이지 헤더** — `<h1>제목</h1>` + `<p className="text-sm text-slate-500">설명</p>`
6. **모바일 반응형** — Tailwind `md:`, `lg:` 클래스

```tsx
// ✅ 빈 상태 패턴
{items.length === 0 && (
  <div className="py-12 text-center text-slate-400">
    <SomeIcon className="mx-auto mb-3 h-8 w-8 opacity-40" />
    <p className="font-medium">아직 [항목]이 없습니다</p>
    <p className="mt-1 text-sm">[다음에 할 행동 안내]</p>
  </div>
)}
```

### 3-5. ARIA & 접근성

- 모든 인터랙티브 요소에 `aria-label` 또는 `aria-describedby` 필수
- 모달/드롭다운: ESC 닫기, Tab 포커스 트랩
- 이미지: `alt` 필수 (장식용은 `alt=""`)
- `aria-busy="true"` — 로딩 중인 섹션에 적용

### 3-6. Trash Bin / 보관함 패턴

모든 Soft Delete 후 반드시 **보관함 UI** 제공:

```ts
// ✅ 삭제 → 보관함 이동 패턴
// 1. lifecycle_status = 'soft_deleted' 업데이트
// 2. "보관함으로 이동되었습니다" 성공 토스트
// 3. undo() 토스트 8초 표시
// 4. 복구 경로: /cases?tab=trash 또는 해당 목록 내 '보관함' 탭
```

- 삭제 후 토스트: `undo('보관함으로 이동됨', { message: '8초 내 복구 가능합니다.', onUndo: restoreAction })`
- 보관함 탭/라우트: `?tab=trash` 쿼리파라미터 또는 `/trash` 서브라우트
- 복구 액션: `restoreCaseAction` (lifecycle_status → 'active')
- 영구 삭제: 보관함에서만 허용 (`forceDeleteCaseAction` 패턴, 관리자 전용)
- **현재 미구현**: Cases 보관함 탭 (`/cases/page.tsx`) — 별도 세션에서 구현 예정

---

## 💬 카테고리 4: 메시지 체계 규칙

### 4-1. 토스트 문구 형식

```
성공:  "[대상] [동작] 완료"              예) "사건 삭제 완료"
실패:  "[동작] 실패 — [원인]"           예) "저장 실패 — 네트워크 오류"
경고:  "[조건] 확인 필요"               예) "저장되지 않은 변경사항이 있습니다"
안내:  "[다음 단계/상태]"               예) "초대 이메일이 발송되었습니다"
Undo:  "[동작]됨 — [N]초 내 취소 가능"  예) "삭제됨 — 8초 내 취소 가능"
```

### 4-2. 에러 메시지 금지 문구

| 금지 | 대체 |
|------|------|
| "에러가 발생했습니다" | "저장 실패 — 네트워크 연결을 확인해 주세요" |
| "오류가 발생했습니다" | 원인 + 해결 방법 명시 |
| "알 수 없는 오류" | 가능한 원인 추정 + 다시 시도 안내 |

### 4-3. 메시지 타입별 노출 위치

| 타입 | 위치 | 컴포넌트 |
|------|------|---------|
| 즉각 피드백 | 화면 우하단 | `useToast()` |
| 페이지/섹션 에러 | 인라인 (해당 섹션 상단) | `InlineError` |
| 빈 상태 | 콘텐츠 영역 중앙 | 빈 상태 패턴 |
| 전역 경고/공지 | 헤더 하단 배너 | 별도 Banner 컴포넌트 |

### 4-4. 목록 접기 + 통합 검색 규칙 (Collapsible List + Unified Search)

**강제 규칙:**

- 모든 목록은 항목이 **8개 이상**이면 자동 Accordion(접이식) 처리 필수
- 목록 기본 표시 개수: **7개** (초과 시 "더 보기" 토글 또는 Accordion)
- 각 페이지마다 별도 검색 로직 구현 **절대 금지** → `UnifiedListSearch` 컴포넌트 하나만 사용
- 검색 컴포넌트: `src/components/ui/unified-list-search.tsx` (Single Source of Truth)
- 검색 범위: 사건 + 의뢰인 + 조직 + 알림을 **단일 검색창**으로 처리
- 목록이 긴 페이지에서는 검색창을 목록 상단에 고정(sticky)

**컴포넌트 사용 패턴:**

```tsx
// ✅ 필수 — 모든 목록 페이지
import { UnifiedListSearch } from '@/components/ui/unified-list-search';

<UnifiedListSearch
  placeholder="사건명, 의뢰인, 사건번호 검색..."
  onSearch={(query) => setSearchQuery(query)}
  aria-label="목록 검색"
/>

// ✅ 8개 초과 목록 — Accordion 처리
{items.length > 7 ? (
  <CollapsibleList items={items} defaultShowCount={7} label="사건" />
) : (
  items.map((item) => <ListRow key={item.id} {...item} />)
)}
```

**현재 위반 중인 목록 (수정 필요):**

| 페이지 | 위반 내용 | 상태 |
|--------|----------|------|
| `/cases/page.tsx` | 무한 스크롤 없이 전체 목록 노출 | ❌ 수정 필요 |
| `/clients/page.tsx` | 검색 없이 전체 의뢰인 목록 | ❌ 수정 필요 |
| `/organizations/page.tsx` | 조직 목록 접기 없음 | ❌ 수정 필요 |
| `/admin/organizations/page.tsx` | 관리자 조직 목록 접기 없음 | ❌ 수정 필요 |
| `/notifications/page.tsx` | 알림 목록 전체 노출 | ❌ 수정 필요 |

---

## 🏗 카테고리 5: 아키텍처 규칙

### 5-1. 사건(Case) 모델

- 사건은 **다중 조직 참여형 협업 객체** (`case_organizations` 테이블)
- Case Shell 공통 탭: Overview / Communication / Documents / Schedule / Participants / Billing / Timeline
- 선택 모듈: Collection, Insolvency, Settlement
- `caseType` enum: `civil | debt_collection | execution | injunction | criminal | advisory | other`
- **이슈**: 행정, 합의, 도산은 아직 enum에 없음 → 별도 브랜치에서 확장 예정

### 5-2. 의뢰인 포털 권한 원칙

```
허용: 공개 문서 보기, 공개 일정 보기, 메시지 보내기, 요청 생성, 자료 제출, 청구/입금 확인
차단: 내부 메모, 타 사건, 결재 수정, 조직 정보
```

### 5-3. 플랫폼 조직 메뉴 원칙

플랫폼 조직(`kind='platform_management'`) 소속 사용자는 아래 메뉴만 표시:
- 조직 신청 관리 (`/admin/organization-requests`)
- 조직 관리 (`/admin/organizations`)
- 고객센터 (`/admin/support`)

일반 법무 메뉴(사건 목록, 의뢰인, 추심 등) **숨김**.

### 5-4. 플랫폼 관리자 기능 거버넌스 (Platform Admin Governance)

**강제 규칙:**

- `isPlatformOperator(auth)` 가 `true`인 사용자만 접근할 수 있는 모든 기능은 **이 섹션에 명확히 나열**되어야 함
- 플랫폼 관리자 전용 기능을 새로 추가할 때 반드시 이 목록을 먼저 업데이트
- **"조직검색" 버튼**은 플랫폼 관리자에게만 노출, 일반 사용자에게 완전 숨김
- 클릭 시 **조직 관리 대시보드** (`/admin/organizations`) 로 이동 — "조직 생성" 화면이 기본 노출되는 것 **금지**
- 플랫폼 관리자 화면의 진입점은 반드시 **목록/대시보드** 가 기본이어야 함 (생성 폼 금지)

**플랫폼 관리자 전용 기능 목록 (완전 목록):**

| 기능 | 라우트 | 설명 |
|------|--------|------|
| 조직 신청 심사 | `/admin/organization-requests` | 신규 조직 가입 승인/거절 |
| 조직 관리 대시보드 | `/admin/organizations` | 전체 조직 목록 조회/관리 |
| 고객센터 | `/admin/support` | 사용자 문의 처리 |
| 플랫폼 설정 | `/admin/modules` | 기능 모듈 on/off |
| 감사 로그 | `/admin/audit` | 전체 액션 이력 조회 |

**현재 위반 중인 항목:**

| 위반 | 위치 | 상태 |
|------|------|------|
| 조직검색 클릭 → 조직 생성 화면 바로 노출 | `mode-aware-nav.tsx` 또는 관련 버튼 | ❌ 수정 필요 |
| 플랫폼 관리자 기능 목록 미문서화 | `PROJECT_RULES.md` | ✅ 이번에 추가 완료 |

**메뉴 가드 패턴:**

```tsx
// ✅ 플랫폼 관리자 전용 메뉴 — 서버 컴포넌트에서 조건 처리
{isPlatformOperator && (
  <NavItem href="/admin/organizations" label="조직 관리" />
)}

// ❌ 금지 — 일반 사용자에게 플랫폼 메뉴 노출
<NavItem href="/admin/organizations" label="조직검색" /> // 권한 체크 없이
```

---

## 🚫 카테고리 6: 절대 금지 목록

| 금지 | 대체 | 근거 |
|------|------|------|
| `window.confirm()` | `DangerActionButton` | UX #4 |
| `alert()` | `useToast()` | UX #10 |
| `<form action={fn}>` 날것 사용 | `<ClientActionForm>` | UX #5 |
| `<button type="submit">` 날것 | `<SubmitButton>` | UX #5 |
| `.delete()` hard delete (soft_deleted 게이트 없이) | `lifecycle_status='soft_deleted'` | UX #8 |
| 삭제 후 복구 UI/토스트 없음 | `undo()` + Trash UI | UX #8 |
| "에러가 발생했습니다" 문구 | 원인 + 해결방법 명시 | UX #6 |
| 로딩 중 버튼 활성화 | `isLoading` / `disabled` | UX #5 |
| `required` 필드에 `*` 없음 | `<span className="text-red-500">*</span>` | UX #1 |
| `placeholder`만 쓰고 `label` 없음 | `htmlFor`로 연결된 `<label>` | 접근성 |
| 빈 상태 화면 없음 | empty state 패턴 | UX #7 |
| 메뉴 추가 후 nav 미등록 | `mode-aware-nav.tsx` 항목 추가 | 일관성 |
| 새 페이지에 권한 체크 없음 | `requireXxxAccess()` 서버에서 호출 | UX #3 |
| `button.tsx`에 `'use client'` 추가 | 서버 컴포넌트 호환 유지 | 기술 |

---

## 📁 핵심 파일 위치

### UI 컴포넌트
```
src/components/ui/
├── button.tsx              # 기본 버튼 (서버 안전)
├── enhanced-button.tsx     # 툴팁/disabledReason (클라이언트)
├── submit-button.tsx       # 폼 제출 버튼
├── client-action-form.tsx  # 폼 래퍼 + useTransition + toast
├── danger-action-button.tsx # destructive 액션 + ConfirmModal
├── confirmation-modal.tsx  # 확인 모달 (native <dialog>)
├── toast-provider.tsx      # useToast hook
├── loading.tsx             # LoadingOverlay + InlineLoadingSpinner
└── inline-error.tsx        # 인라인 에러 (원인 + 해결방법)
```

### 권한/인증
```
src/lib/auth.ts             # requireXxxAccess 함수들
src/lib/permissions.ts      # PERMISSION_KEYS, hasPermission
src/lib/types.ts            # PlatformRole, Organization types
```

### 주요 Actions
```
src/lib/actions/
├── case-actions.ts         # 사건 CRUD, moveCaseToDeletedAction, forceDeleteCaseAction
├── organization-actions.ts # 조직/초대/멤버/CSV import
├── settings-actions.ts     # 조직 설정, 아카이브
├── notification-actions.ts # 알림 soft archive (trashed_at)
└── case-cover-action.ts    # 표지 인쇄 필드 저장
```

### 네비게이션
```
src/components/mode-aware-nav.tsx   # 사이드바 메뉴 (모든 메뉴 항목 여기에 등록)
src/components/mode-switcher.tsx    # ModeKey 타입, 모드 전환
```

---

## ✅ 새 기능 구현 전 체크리스트

기능을 만들기 전에 아래를 순서대로 확인하세요:

- [ ] 이 규칙 파일(`PROJECT_RULES.md`)을 읽었는가?
- [ ] 권한 가드: 서버 액션에 `requireXxxAccess()` 있는가?
- [ ] Soft delete: `.delete()` 직접 호출 없는가?
- [ ] 폼: `ClientActionForm` + `SubmitButton` 사용했는가?
- [ ] Destructive: `DangerActionButton` 사용했는가?
- [ ] 토스트: 삭제 후 `undo()` 토스트 있는가?
- [ ] 필수 필드: 빨간 `*` 표시 있는가?
- [ ] label-input 연결: `htmlFor` ↔ `id` 있는가?
- [ ] 빈 상태: empty state 패턴 있는가?
- [ ] 새 메뉴: `mode-aware-nav.tsx` 등록했는가?
- [ ] `revalidatePath()` 호출했는가?
- [ ] ARIA 속성 있는가?
- [ ] 타입 에러 없는가? (`pnpm typecheck`)
- [ ] 8개 이상 목록: `UnifiedListSearch` + Accordion 처리했는가?
- [ ] 플랫폼 관리자 전용 기능: 이 파일 5-4 목록에 등록했는가?
- [ ] 플랫폼 관리자 메뉴: 진입점이 목록/대시보드인가? (생성 폼 기본 노출 금지)
