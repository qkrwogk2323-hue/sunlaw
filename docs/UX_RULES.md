# Vein Spiral — UX 규칙 원본 (UX Checklist Rules)

> **이 파일이 원본입니다.**  
> `.github/copilot-instructions.md`, `CLAUDE.md`, `.cursorrules` 는 모두 이 파일을 참조합니다.  
> 규칙을 수정할 때는 이 파일을 먼저 수정하고, 나머지 파일에도 동일하게 반영하세요.

---

## 📐 10-Point UX Checklist (전 앱 강제 적용)

이 프로젝트는 **UX 체크리스트 10개**를 모든 사용자 액션에 100% 적용합니다.  
새 기능 추가, 기존 코드 수정 시 아래 규칙을 반드시 따르세요.

---

## ✅ 컴포넌트 사용 규칙

### 1. 폼 제출 (Form Submit)
```tsx
// ❌ 금지
<form action={serverAction}>
  <button type="submit">저장</button>
</form>

// ✅ 필수
import { ClientActionForm } from '@/components/ui/client-action-form';
import { SubmitButton } from '@/components/ui/submit-button';

<ClientActionForm
  action={serverAction}
  successTitle="저장 완료"
  successMessage="변경사항이 저장되었습니다."
  errorTitle="저장 실패"
>
  <SubmitButton>저장</SubmitButton>
</ClientActionForm>
```

**규칙:**
- 모든 `<form action={...}>` → `<ClientActionForm action={...} successTitle="...">`
- `successTitle` 필수. `successMessage`, `errorTitle`, `errorMessage` 권장
- `<button type="submit">` → `<SubmitButton>` (로딩 상태 자동 연결)

---

### 2. 위험 액션 (Destructive Action)
```tsx
// ❌ 금지
<button onClick={() => { if (confirm('삭제?')) deleteAction(id) }}>삭제</button>

// ✅ 필수
import { DangerActionButton } from '@/components/ui/danger-action-button';

<DangerActionButton
  action={deleteAction}
  fields={{ id: item.id }}
  title="케이스 삭제"
  description="이 케이스를 삭제하면 모든 관련 데이터가 영구 제거됩니다."
  highlightedInfo={`케이스명: ${item.name}`}
  confirmLabel="삭제"
  successTitle="케이스 삭제 완료"
  errorTitle="삭제 실패"
/>
```

**규칙:**
- `delete`, `remove`, `archive`, `revoke`, `kick`, `ban` 등 모든 destructive action → `DangerActionButton`
- `window.confirm()` **절대 사용 금지**
- `highlightedInfo`에 삭제 대상 핵심 정보 반드시 재노출

---

### 3. 토스트 메시지 (Toast)
```tsx
// ❌ 금지
alert('완료!')
console.log('에러')
toast('저장되었습니다') // 문자열만 넘기기

// ✅ 필수
import { useToast } from '@/components/ui/toast-provider';

const { success, error, warning, undo } = useToast();

success('저장 완료', { message: '변경사항이 저장되었습니다.' });
error('저장 실패', { message: '네트워크 연결을 확인하고 다시 시도해주세요.' });
undo('케이스 삭제됨', { message: '8초 내 실행취소 가능합니다.', onUndo: handleUndo });
```

**규칙:**
- 에러 메시지에 **"에러가 발생했습니다" 금지** → 반드시 원인 + 해결방법 명시
- 삭제/아카이브 후 → `undo()` 토스트로 8초 복구 옵션 제공
- `alert()` **절대 사용 금지**

---

### 4. 버튼 (Button)
```tsx
// 기본 버튼 (서버 컴포넌트 포함 어디서나)
import { Button } from '@/components/ui/button';

// 툴팁 / 비활성 이유가 필요한 경우 (클라이언트 컴포넌트만)
import { EnhancedButton } from '@/components/ui/enhanced-button';

<EnhancedButton
  disabled={!hasPermission}
  disabledReason="이 작업은 관리자만 수행할 수 있습니다."
  tooltip="케이스 내보내기"
>
  내보내기
</EnhancedButton>
```

**규칙:**
- 서버 컴포넌트 → `Button`
- 클라이언트 컴포넌트, 툴팁/disabledReason 필요 → `EnhancedButton`
- `isLoading` prop 활용으로 로딩 중 중복 클릭 방지 필수

---

### 5. 에러 메시지 (Inline Error)
```tsx
import { InlineError } from '@/components/ui/inline-error';

<InlineError
  title="파일 업로드 실패"
  cause="파일 크기가 10MB를 초과했습니다."
  resolution="10MB 이하의 파일을 선택한 뒤 다시 업로드해주세요."
  onRetry={() => retryUpload()}
/>
```

**규칙:**
- 페이지/섹션 레벨 에러 → `InlineError`
- `cause` + `resolution` 필수 (원인 + 해결방법)
- `onRetry` 가능한 경우 항상 제공

---

### 6. 로딩 상태 (Loading)
```tsx
import { LoadingOverlay, InlineLoadingSpinner } from '@/components/ui/loading';

// 전체 페이지/섹션 블로킹
<LoadingOverlay message="데이터를 불러오는 중..." />

// 인라인 (버튼 옆, 섹션 내)
<InlineLoadingSpinner size="sm" />
```

**규칙:**
- 비동기 작업 중 관련 버튼/폼 `disabled` 처리 필수
- 로딩 중 중복 요청 발생 불가하게 막기

---

## 📋 폼 필드 & 입력 규칙

### 필수 입력란 표시
```tsx
// ❌ 금지 — 필수 여부 불명확
<label>이름</label>
<Input name="name" required />

// ✅ 필수 — 빨간 * 표시
<label className="flex items-center gap-1">
  이름 <span className="text-red-500" aria-hidden="true">*</span>
</label>
<Input name="name" required aria-required="true" />
```

**규칙:**
- `required` 필드에는 반드시 `<span className="text-red-500" aria-hidden="true">*</span>` 표시
- `aria-required="true"` 함께 추가
- 폼 상단에 안내문 추가: `<p className="text-xs text-slate-500"><span className="text-red-500">*</span> 필수 입력 항목입니다</p>`

### 폼 필드 레이아웃
```tsx
// ✅ label + input 쌍은 반드시 이 구조
<div className="space-y-1">
  <label htmlFor="fieldId" className="text-sm font-medium text-slate-700">
    이름 <span className="text-red-500" aria-hidden="true">*</span>
  </label>
  <Input id="fieldId" name="name" required aria-required="true" />
  {/* 검증 에러 있을 때만 표시 */}
  {error && <p className="text-xs text-red-500">{error}</p>}
</div>
```

**규칙:**
- `label`의 `htmlFor`와 `input`의 `id` 반드시 연결
- `placeholder`는 보조 안내용. label 대체 금지
- 인라인 에러는 input 바로 아래 `text-xs text-red-500`

### 클라이언트 검증
```tsx
// ✅ 제출 전 필수 필드 비어있으면 즉시 안내
if (!fields.title.trim()) {
  setFieldError('title', '사건명은 필수입니다.');
  return;
}
```

**규칙:**
- 빈 필수 필드 제출 시 서버 에러 전에 클라이언트에서 먼저 차단
- 에러 문구: `"[필드명]은(는) 필수입니다."` 형식

---

## 🗂 새 페이지/메뉴 신설 규칙

### 메뉴 항목 추가 시 체크리스트
새 라우트/메뉴를 만들 때 **반드시** 아래를 지켜야 합니다:

1. **mode-aware-nav.tsx에 메뉴 등록** — 추가 않으면 사이드바에 안 보임
2. **sectionAccent에 색상 등록** — 새 섹션이면 accent 색 정의 필수
3. **페이지에 권한 체크** — 서버에서 `requireXxxAccess()` 호출, 권한 없으면 redirect
4. **빈 상태(empty state) 필수** — 데이터 없을 때 `"아직 [항목]이 없습니다"` + 안내 문구
5. **로딩 상태** — `Suspense` 또는 skeleton 처리
6. **모바일 대응** — Tailwind 반응형 클래스 (`md:`, `lg:`) 적용

### 빈 상태(Empty State) 패턴
```tsx
// ✅ 데이터 없을 때 반드시 이 패턴
{items.length === 0 && (
  <div className="py-12 text-center text-slate-400">
    <Icon className="mx-auto mb-3 h-8 w-8 opacity-40" />
    <p className="font-medium">아직 [항목]이 없습니다</p>
    <p className="mt-1 text-sm">[다음 행동 안내]</p>
  </div>
)}
```

### 페이지 헤더 패턴
```tsx
// ✅ 새 페이지 상단 헤더 — 반드시 제목 + 설명 포함
<div className="mb-6">
  <h1 className="text-xl font-bold text-slate-900">페이지 제목</h1>
  <p className="mt-1 text-sm text-slate-500">이 페이지에서 [무엇을] 할 수 있습니다.</p>
</div>
```

---

## 🚫 절대 금지 목록

| 금지 | 대체 |
|------|------|
| `window.confirm()` | `DangerActionButton` |
| `alert()` | `useToast()` |
| `<form action={fn}>` (raw) | `<ClientActionForm>` |
| `"에러가 발생했습니다"` | 원인 + 해결방법 명시 |
| 로딩 중 버튼 활성화 | `isLoading` / `disabled` |
| 삭제 후 토스트 없음 | `undo()` 토스트 |
| `placeholder`만 있고 `label` 없는 input | `htmlFor`로 연결된 `<label>` 추가 |
| 필수 필드에 `*` 없음 | `<span className="text-red-500">*</span>` |
| 빈 상태 화면 없음 | empty state 패턴 필수 |
| 메뉴 추가 후 nav 미등록 | mode-aware-nav.tsx에 항목 추가 |
| 새 페이지에 권한 체크 없음 | `requireXxxAccess()` 서버에서 호출 |

---

## 📁 핵심 컴포넌트 경로

```
src/components/ui/
├── button.tsx              # 기본 버튼 (서버 안전)
├── enhanced-button.tsx     # 툴팁/disabledReason 버튼 (클라이언트)
├── submit-button.tsx       # 폼 제출 버튼 (ClientActionForm 연동)
├── client-action-form.tsx  # 폼 래퍼 + useTransition + toast
├── danger-action-button.tsx # destructive 액션 버튼 + ConfirmModal
├── confirmation-modal.tsx  # 확인 모달 (native <dialog>)
├── toast-provider.tsx      # 토스트 시스템 + useToast hook
├── loading.tsx             # LoadingOverlay + InlineLoadingSpinner
└── inline-error.tsx        # 인라인 에러 메시지
```

---

## ⚙️ 기술 규칙

- **Next.js App Router** — Server Components 우선, Client Components 최소화
- **`button.tsx` 는 `'use client'` 추가 금지** — 서버 컴포넌트가 `buttonStyles()` 직접 호출
- **Optimistic Update** — 삭제/상태변경은 서버 응답 전 UI 먼저 반영 + 실패 시 롤백
- **`revalidatePath()`** — 모든 Server Action 성공 후 반드시 호출
- **ARIA** — `aria-label`, `aria-describedby`, `role` 모든 인터랙티브 요소에 적용
- **Keyboard Navigation** — 모달/드롭다운 ESC 닫기, Tab 포커스 트랩 필수

---

## 📝 메시지 작성 규칙

```
성공: "[대상] [동작] 완료"           예) "케이스 삭제 완료"
실패: "[동작] 실패 — [원인]"         예) "저장 실패 — 네트워크 오류"  
경고: "[조건] 확인 필요"             예) "저장되지 않은 변경사항이 있습니다"
안내: "[다음 단계/상태 설명]"         예) "초대 이메일이 발송되었습니다"
Undo: "[동작]됨 — [시간]초 내 취소 가능"  예) "삭제됨 — 8초 내 취소 가능"
```
