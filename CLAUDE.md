# CLAUDE.md — Vein Spiral

> Claude Code가 자동으로 읽는 프로젝트 규칙입니다.  
> 전체 규칙 원본: `docs/UX_RULES.md`

## 스택

- Next.js 16 App Router + React 19 + TypeScript strict
- Tailwind v4, Supabase (auth + DB)
- 커스텀 UI 컴포넌트 (shadcn/ui, Radix, sonner **미사용**)
- `cn()` at `@/lib/cn`

## 🔴 반드시 따를 코드 규칙

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
