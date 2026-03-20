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

## 🚫 절대 금지 목록

| 금지 | 대체 |
|------|------|
| `window.confirm()` | `DangerActionButton` |
| `alert()` | `useToast()` |
| `<form action={fn}>` (raw) | `<ClientActionForm>` |
| `"에러가 발생했습니다"` | 원인 + 해결방법 명시 |
| 로딩 중 버튼 활성화 | `isLoading` / `disabled` |
| 삭제 후 토스트 없음 | `undo()` 토스트 |

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
