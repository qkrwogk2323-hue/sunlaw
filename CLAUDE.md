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

### 새 페이지/메뉴 신설 필수 체크리스트
1. `mode-aware-nav.tsx`에 메뉴 항목 등록 (안 하면 사이드바에 안 보임)
2. 서버에서 `requireXxxAccess()` 권한 체크
3. 빈 상태(empty state) 필수 — 데이터 없을 때 안내 문구
4. 페이지 헤더 — `<h1>제목</h1>` + `<p>설명</p>`
5. 모바일 반응형 — Tailwind `md:`, `lg:` 클래스

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

**현재 위반 중인 항목:**
- `deleteMembershipAction` — `organization_memberships` 즉시 hard delete ❌ → 수정 필요
- Cases 보관함 UI — `moveCaseToDeletedAction` 있지만 복구 UI 없음 ❌ → 수정 필요

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

## 기술 제약

- `button.tsx`에 `'use client'` **추가 금지** — 서버 컴포넌트가 `buttonStyles()` 직접 호출
- 모든 Server Action → `revalidatePath()` 호출
- ARIA 속성 모든 인터랙티브 요소에 필수

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
