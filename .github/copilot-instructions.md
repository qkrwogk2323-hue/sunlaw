# GitHub Copilot Instructions — Vein Spiral

> 이 파일은 GitHub Copilot이 자동으로 읽는 프로젝트 규칙입니다.  
> 전체 규칙 원본: `docs/UX_RULES.md`

---

## 🔴 코드 작성 시 반드시 따를 규칙

### 폼 제출
- `<form action={serverAction}>` **금지** → 반드시 `<ClientActionForm action={...} successTitle="...">` 사용
- `<button type="submit">` **금지** → `<SubmitButton>` 사용

### Destructive 액션
- `delete`, `remove`, `archive`, `revoke`, `kick`, `ban` 액션 → `<DangerActionButton>` 사용
- `window.confirm()` **절대 금지**
- `alert()` **절대 금지**

### 토스트/에러
- `useToast()` hook 사용: `success()`, `error()`, `warning()`, `undo()`
- 에러 메시지에 **"에러가 발생했습니다"** 금지 → 원인 + 해결방법 명시
- 삭제/변경 후 → `undo()` 토스트 (8초 복구 옵션)

### 버튼
- 서버 컴포넌트: `Button` (`@/components/ui/button`)
- 클라이언트 + 툴팁 필요: `EnhancedButton` (`@/components/ui/enhanced-button`)
- 로딩 중 `isLoading` prop 필수 (중복 클릭 방지)

### 기술
- `button.tsx`에 `'use client'` **추가 금지** (서버 컴포넌트 호환 필수)
- 모든 Server Action 성공 후 `revalidatePath()` 호출
- 모든 인터랙티브 요소에 `aria-label` 또는 `aria-describedby`

---

## 핵심 컴포넌트 import 경로

```ts
import { ClientActionForm } from '@/components/ui/client-action-form';
import { DangerActionButton } from '@/components/ui/danger-action-button';
import { SubmitButton } from '@/components/ui/submit-button';
import { useToast } from '@/components/ui/toast-provider';
import { Button } from '@/components/ui/button';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { LoadingOverlay, InlineLoadingSpinner } from '@/components/ui/loading';
import { InlineError } from '@/components/ui/inline-error';
```

전체 규칙: `docs/UX_RULES.md`
