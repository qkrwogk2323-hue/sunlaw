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
