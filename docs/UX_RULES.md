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

## 🗑 Soft Delete + Trash Bin 규칙 (UX #8 강제)

> **UX 체크리스트 #8 "취소 및 복구"를 강제 구현한 규칙이다.**  
> 사용자에게 노출되는 destructive action에는 절대 예외 없이 적용한다. 단, `PROJECT_RULES.md 2-5-1`의 보상 삭제 예외는 내부 롤백 처리에 한해 허용한다.

### 원칙
- 모든 삭제/비활성화는 **즉시 hard delete 금지**
- 반드시 `lifecycle_status = 'soft_deleted'` 또는 `deleted_at` 업데이트로 처리
- Soft delete 후 → UI에서 즉시 사라지되, `/trash` 페이지에서 복구 가능해야 함
- 복구(restore) 버튼 하나로 즉시 활성화 가능해야 함
- 단, 같은 요청 안에서 방금 생성한 row를 롤백하는 내부 보상 삭제는 `PROJECT_RULES.md 2-5-1`을 따른다

### 구현 패턴

#### 1. Soft Delete Action
```ts
// ❌ 금지
await supabase.from('table').delete().eq('id', id);

// ✅ 필수 — lifecycle_status가 있는 테이블
await supabase.from('table')
  .update({ lifecycle_status: 'soft_deleted', updated_by: auth.user.id })
  .eq('id', id);

// ✅ 필수 — deleted_at 방식 (lifecycle_status 없는 테이블)
await supabase.from('table')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', id);
revalidatePath('/...');
// redirect는 하지 않음 — toast + undo 처리
```

#### 2. 목록 쿼리에서 soft-deleted 제외
```ts
// ✅ 필수 — 목록 조회 시 항상 필터
.neq('lifecycle_status', 'soft_deleted')
// 또는
.is('deleted_at', null)
```

#### 3. Trash 페이지 패턴
- `/cases?tab=trash` 또는 `/cases/trash` 로 접근
- soft-deleted 항목 목록 표시
- 각 항목마다 "복구" 버튼 (→ `lifecycle_status = 'active'` 로 되돌림)
- 관리자만 "영구 삭제" (hard delete) 가능

#### 4. 성공 토스트 패턴
```tsx
// ✅ soft delete 후 반드시 undo 토스트
undo('사건이 보관함으로 이동되었습니다', {
  message: '8초 내 취소 가능합니다. 보관함에서 언제든 복구할 수 있습니다.',
  onUndo: async () => { await restoreAction({ id }); }
});
```

### 금지 목록 추가
| 금지 | 대체 |
|------|------|
| `.delete()` 직접 호출 (soft_deleted 전제 없이) | `lifecycle_status = 'soft_deleted'` 업데이트 |
| 삭제 후 복구 UI 없음 | `/trash` 또는 `?tab=trash` 페이지 제공 |
| 삭제 후 undo 토스트 없음 | `undo()` 토스트 8초 복구 옵션 필수 |

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

---

## 📏 목록 성능 & 페이지네이션 규칙 (3-7)

- **8개 이상** 항목은 접기(Collapsible) 또는 "더 보기"를 기본으로 제공한다.
- **50개 이상** 항목은 서버 사이드 또는 커서 기반 페이지네이션을 사용한다.
- 무한 길이 목록을 한 번에 전부 렌더링하지 않는다.
- 검색과 정렬은 URL 쿼리 파라미터(`q`, `sort`)와 동기화할 수 있어야 한다.
- 긴 목록 페이지의 검색창은 상단에 고정(`sticky`)할 수 있어야 한다.

```tsx
// ✅ 8개 초과 목록
{items.length > 7 ? (
  <CollapsibleList items={items} defaultShowCount={7} label="사건" />
) : (
  items.map((item) => <ListRow key={item.id} {...item} />)
)}
```

---

## 🔄 로딩·에러·중복 제출 방지 규칙 (3-8)

- 네트워크 요청 중에는 버튼을 비활성화해 중복 제출을 막는다.
- 낙관적 UI를 사용하는 경우 서버 실패 시 롤백 경로를 반드시 제공한다.
- 복구 가능한 오류는 `<InlineError>`로 인라인 표시한다.
- 복구 불가능한 오류는 에러 경계 또는 전역 에러 화면으로 처리한다.

---

## 🎨 전역 UI 품질 규칙 (3-9)

전 화면에 공통으로 적용되는 레이아웃·컴포넌트 품질 기준이다.

### 섹션 헤더

- 한 섹션 헤더에는 제목, 설명(선택), 우측 액션(선택) 3요소 이내만 허용한다. 4개 이상이면 구조 위반이다.

### KPI / 요약 카드

- KPI 카드는 반드시 3계층으로 구성한다: **1행** 라벨 / **2행** 핵심 수치 / **3행** 보조 설명 또는 상태. 순서를 어기면 위반이다.
- 같은 grid row 안의 KPI 카드들은 `min-height`를 동일하게 맞춘다.
- 같은 row의 핵심 수치 텍스트는 `font-size`, `font-weight`, `line-height`를 동일하게 사용한다.
- KPI 카드 제목은 **16자를 초과할 수 없다**. 16자가 넘으면 문구를 재작성한다.
- KPI 카드 한 개는 집계 대상을 **하나만** 표현한다. 시간축·우선순위·객체 등 의미가 둘 이상 섞이면 위반이다.

```tsx
// ✅ KPI 카드 3계층 패턴
<div className="flex flex-col gap-1">
  <p className="text-xs text-slate-500">라벨</p>          {/* 1행 */}
  <p className="text-2xl font-bold text-slate-900">42</p> {/* 2행 */}
  <p className="text-xs text-slate-400">전월 대비 +3</p>  {/* 3행 */}
</div>
```

### 버튼 그룹

- 한 버튼 그룹에는 최대 3개까지 허용한다. 4개 이상이면 주·보조·더 보기 구조로 재구성한다.
- destructive 버튼은 그룹의 **마지막 위치**에 배치한다.

### 섹션 간격

- 같은 페이지의 1차 섹션 간 vertical gap은 `gap-6`(24px) 또는 `gap-8`(32px) 중 하나만 사용한다. 혼용은 금지한다.

### 빈 상태 문구

- empty state 문구는 **2문장으로 고정**한다: 1문장은 현재 상태, 2문장은 다음 행동. 3문장 이상은 금지한다.

```tsx
// ✅
<p className="font-medium">아직 사건이 없습니다</p>
<p className="mt-1 text-sm">새 사건을 등록해 업무를 시작해 주세요.</p>

// ❌ 3문장 이상 금지
```

### UI 용어 단일성

- 한 카드 안에서 지칭하는 객체는 하나여야 한다. 사건·알림·요청·조직 중 하나만 사용한다. 둘 이상 혼용하면 위반이다.

---

## 🧭 메뉴 상단 구조 규칙 (3-10)

- 주요 메뉴는 상단 5초 안에 제목, 핵심 요약, 다음 행동이 보이도록 구성한다.
- 허브 결합도가 높은 메뉴는 첫 뷰포트 안에 사건허브 요약 블록을 노출한다.
- 상단 Hero의 액션은 `Primary 1개 + Secondary 최대 2개`까지만 허용한다.
- 필터가 4개 이상이면 나머지는 고급 필터로 접는다.

## 🔗 사건허브 연동 인터랙션 규칙 (3-11)

- 사건 관련 메뉴(사건목록, 사건허브, 의뢰인, 문서, 일정, 알림, 청구, 추심, 보고)는 첫 뷰포트에 허브 입장 버튼, 허브 상태 요약, 허브 기준 필터 중 최소 1개를 제공한다.
- 허브 지표는 모든 메뉴에서 `협업 x/y → 열람 x/y → 미읽음 n → 최근 활동 t` 순서를 고정한다.
- 허브가 없는 상태의 기본 CTA는 반드시 `허브 연동`을 사용한다.
- 사건목록에서 사건허브 진입은 1클릭 이하여야 한다.

## 🏟 사건허브 로비 레이아웃 규칙 (3-12)

- 사건허브 로비 데스크톱 레이아웃은 `3 : 6 : 3`을 기본으로 사용한다.
- 중앙 로비 패널 최소 높이는 데스크톱 360px, 태블릿 280px, 모바일 220px을 따른다.
- 협업률은 링으로, 열람률은 보조 바 또는 집계 바로 표현한다.
- 최근 활동 피드는 기본 7개까지만 노출하고, 8개 이상은 더 보기 또는 Accordion을 제공한다.

## 🔢 수치 표기 및 상태 배지 규칙 (4-7)

- 허브 인원 수 표기는 `협업 3/5`, `열람 9/20`, `미읽음 12` 형식을 고정한다.
- 시간 표기는 `Xm 전`, `X시간 전`, `X일 전`, `YYYY.MM.DD` 순으로 단계화한다.
- 1,000 이상 수치는 쉼표를 사용하고 `1.2k` 같은 축약 표기를 금지한다.
- 상태는 색만으로 전달하지 않고, 텍스트와 아이콘 또는 배지를 함께 사용한다.

## 👥 일괄 초대 및 생성 플로우 규칙 (3-21)

- 사용자 생성, 조직원 초대, 의뢰인 초대는 `목록 → 입력 → 완료` 또는 `문맥 → 입력 → 연결 → 완료` 구조를 사용한다.
- 기본 입력 행은 `3`, 직접 입력 최대 행은 `5`로 제한한다. `5`개를 넘으면 CSV 업로드 플로우로 전환한다.
- 데스크톱 한 행의 핵심 입력 필드는 `4개`를 넘기지 않는다. 모바일에서는 한 줄 한 필드로 쌓는다.
- 한 화면의 Primary CTA는 `1개`만 둔다.
- 완료 화면은 생성 여부, 연결 여부, 발송 여부, 실패 사유를 모두 보여야 한다.
- 조직원 초대는 신원 입력과 권한 설정을 분리한다. 임시 비밀번호 직접 노출은 `1회`만 허용하고 재노출은 금지한다.
- 의뢰인 초대는 사건 또는 허브 문맥을 먼저 고정하고, 표준 플로우에서 미연결 의뢰인을 남기지 않는다.
- 의뢰인 초대 기본 인증은 매직링크, OTP, 또는 동등한 일회성 인증을 사용한다. 평문 비밀번호 직접 노출은 금지한다.

---

## ✅ 새 기능 구현 전 체크리스트 (v2.0 — 22개 항목)

아래 항목을 순서대로 확인한다.

1. `PROJECT_RULES.md` 전체를 읽었는가.
2. 서버 권한 가드(`requireXxxAccess`)를 적용했는가.
3. 클라이언트 입력값을 서버에서 다시 검증하는가.
4. soft delete 대상에 `.delete()`를 직접 호출하지 않았는가.
5. 목록 기본 쿼리에서 삭제 데이터를 제외했는가.
6. 폼에 `ClientActionForm`과 `SubmitButton`을 사용했는가.
7. 파괴적 액션에 `DangerActionButton`을 사용했는가.
8. 삭제 후 `undo()` 토스트와 보관함 복구 경로를 제공했는가.
9. 필수 필드에 빨간 `*`를 표시했는가.
10. `label htmlFor`와 `input id`를 연결했는가.
11. 빈 상태 화면을 제공했는가.
12. 새 메뉴를 `mode-aware-nav.tsx`에 등록했는가.
13. 액션 성공 후 `revalidatePath()`를 호출했는가.
14. ARIA 속성을 적용했는가.
15. 타입 에러, 린트, 테스트, 빌드, 마이그레이션 검사를 통과했는가.
16. 8개 이상 목록에 접기 또는 더 보기를 제공했는가.
17. 50개 이상 목록에 서버 페이지네이션 또는 커서를 적용했는가.
18. 플랫폼 관리자 전용 기능이면 `PROJECT_RULES.md` 카테고리 5-4 목록에 등록했는가.
19. 플랫폼 관리자 메뉴의 기본 진입점이 목록 또는 대시보드인가.
20. 용어를 `PROJECT_RULES.md` 6-1 정의와 일치하게 사용했는가.
21. 로그와 사용자 메시지에 민감정보가 노출되지 않는가.
22. 권한, RLS, soft delete 변경이면 회귀 테스트를 추가했는가.

---

## 🧩 플랫폼 운영 부속서 채택 메모 (v2.1)

- 아래 파일들은 UX 구현이 따라야 하는 운영 기준 부속서다.
  - `docs/platform-rules-package+solution/vein_spiral_rules_package/02_FORMULAS_AND_THRESHOLDS.md`
  - `docs/platform-rules-package+solution/vein_spiral_rules_package/04_platform_log_sink_matrix.csv`
  - `docs/platform-rules-package+solution/vein_spiral_rules_package/05_organization_restore_package_matrix.csv`
  - `docs/platform-rules-package+solution/vein_spiral_rules_package/06_menu_search_matrix.csv`
  - `docs/platform-rules-package+solution/vein_spiral_rules_package/07_subscription_lock_matrix.csv`
- UX 문서는 구현 세부를 강제하지 않고, canonical matrix와 formula를 화면/상태/메시지에 일관되게 반영하는 것을 목표로 한다.
- 플랫폼 관리자 조직의 구현 방식은 DB canonicalization 결과를 따르며, UX 문서에서는 `app.is_platform_admin()`과 canonical permission path만 전제한다.
- 결제 잠금, 메뉴 검색, 의뢰인 케어감, 프리미엄 홈, AI 보조는 개별 화면 취향이 아니라 운영 공식과 임계치를 따른다.
