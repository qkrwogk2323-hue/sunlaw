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
- 단, 같은 요청 안에서 방금 생성한 row를 실패 복구하는 내부 보상 삭제는 `PROJECT_RULES.md 2-5-1`을 따른다

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

---

## v2.0 추가 규칙 요약

### 메타 규칙 (0-7, 0-8)
- **CI 강제**: `typecheck` + `lint` + `build` + `test` + `check:migrations` 전부 통과해야 머지
- **이행 원칙**: 기존 파일 수정 시 수정 범위 내에서 규칙 준수 (신규 구현은 즉시 적용)

### 보안 추가 (1-6, 1-7)
- **기본 거부(Default Deny)**: 권한 명시 없는 기능 허용 금지. `disabledReason` 제공
- **민감정보**: `service_role`·JWT·API key 클라이언트 번들·로그 노출 금지. 주민번호·계좌번호 로그 기록 금지

### DB 추가 (2-8 ~ 2-10)
- 2개 이상 테이블 동시 변경 → 트랜잭션 또는 원자적 RPC 사용 (2-8)
- 조직 데이터 테이블 모두 RLS 활성화. RLS 없는 테이블 머지 금지 (2-9)
- 새 필터·정렬·조인 키 도입 시 인덱스 검토. `select('*')` 남용 금지 (2-10)

### UX 추가 (3-7, 3-8)
- **페이지네이션**: 8개 이상 → 접기/더보기. 50개 이상 → 서버 페이지네이션
- **중복 제출 방지**: 요청 중 버튼 비활성화. 낙관적 UI 실패 시 롤백 경로 필수

### 메시지 추가 (4-5, 4-6)
- 반복 메시지는 중앙 상수에서 관리 (4-5)
- Server Action은 `{ ok: true }` | `{ ok: false; code; userMessage }` 형태 반환 (4-6)

### 아키텍처 추가 (5-5 ~ 5-9)
- DB 쓰기는 Server Action/Route Handler에서만 (5-5)
- 서버 검증이 최종 원본 (5-6)
- 신규 Server Action은 성공·실패 테스트 각 1개 이상 (5-7)
- 주요 변경은 추적 가능해야 함 (5-8)
- N+1 쿼리·무제한 렌더링 금지 (5-9)

### 용어 규칙 (6-2)
- UI: "조직", "의뢰인", "허브" / 코드: `organizationId`, `clientId`, `hubId`

## ✅ 체크리스트 v2.0 (22개)

1~15: 기존 항목 유지  
16. 8개 이상 목록에 접기/더보기  
17. 50개 이상 목록에 서버 페이지네이션  
18. 플랫폼 관리자 전용 기능은 5-4 목록 등록  
19. 플랫폼 관리자 진입점이 목록 또는 대시보드  
20. 용어를 6-1 정의와 일치하게 사용  
21. 로그·메시지에 민감정보 노출 없음  
22. 권한·RLS·soft delete 변경 시 회귀 테스트 추가
