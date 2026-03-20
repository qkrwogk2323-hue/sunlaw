# GitHub Copilot Instructions — Vein Spiral

> 이 파일은 GitHub Copilot이 자동으로 읽는 프로젝트 규칙입니다.  
> 전체 규칙 원본: `docs/UX_RULES.md`

---

## 🔴 코드 작성 시 반드시 따를 규칙

### 폼 필드 (필수 입력란)
- `required` 필드 → `<span className="text-red-500" aria-hidden="true">*</span>` 표시 필수
- `label htmlFor` ↔ `input id` 반드시 연결
- 폼 상단에 `<p className="text-xs text-slate-500"><span className="text-red-500">*</span> 필수 입력 항목입니다</p>` 추가
- `placeholder`는 label 대체 불가

### 새 페이지/메뉴 신설 필수 체크리스트
- `mode-aware-nav.tsx`에 메뉴 항목 등록 (누락 시 사이드바에 안 보임)
- 서버에서 `requireXxxAccess()` 권한 체크 필수
- 빈 상태(empty state): 데이터 없을 때 안내 문구 + 아이콘
- 페이지 헤더: `<h1>제목</h1>` + `<p className="text-sm text-slate-500">설명</p>`
- 모바일 반응형: Tailwind `md:`, `lg:` 클래스

### Soft Delete (UX #8 — 절대 금지: 즉시 hard delete)
- `.delete()` 직접 호출 금지 → `lifecycle_status = 'soft_deleted'` 또는 `deleted_at` 업데이트로 대체
- 삭제 후 `undo()` 토스트 필수 (8초 복구)
- Trash UI 제공 필수: `?tab=trash` 또는 `/trash` 에서 복구 버튼
- 목록 쿼리: `.neq('lifecycle_status', 'soft_deleted')` 또는 `.is('deleted_at', null)` 필수

**현재 위반**: `deleteMembershipAction` hard delete ❌, Cases 보관함 UI 없음 ❌

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
