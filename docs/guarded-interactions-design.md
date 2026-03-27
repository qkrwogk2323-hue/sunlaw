# Guarded Interaction Components Design

## 목적
- raw `href`/raw action 호출을 줄이고 `interactionKey` 기반 실행 통로를 강제한다.

## 컴포넌트
- `GuardedLink`
  - 입력: `interactionKey`
  - 동작: `executeInteractionByKey(key, { navigate })`
  - 용도: navigate/mixed 타입 CTA
- `GuardedActionButton`
  - 입력: `interactionKey`, `actionOptions`
  - 동작: `executeInteractionByKey(key, { actionOptions })`
  - 용도: mutate 타입 CTA

## 계약
- `navigate` 타입: `navigate` 어댑터 필수
- `mutate` 타입: `actionKey` 필수, 외부 `navigate` 금지
- `mixed` 타입: `navigate` 어댑터 필수

## 점진 적용 순서
1. notifications/summary CTA
2. notifications row CTA
3. mode-aware-nav
4. 기타 메뉴/카드 CTA
