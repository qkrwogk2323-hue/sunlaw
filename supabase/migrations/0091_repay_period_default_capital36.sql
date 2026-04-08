-- 변제기간 옵션 default를 capital36으로 변경
-- 사유: 2018년 이후 회생법원 정책은 원금 36개월이 표준.
--       기존 capital60은 2018 이전 5년 픽스 시대 잔재.
--       v13 검증관 §1 김한경 케이스 capital36 = anatomy 39% 일치 확정.
-- 영향: 신규 사건만 영향. 기존 row는 그대로 유지.

alter table public.rehabilitation_income_settings
  alter column repay_period_option set default 'capital36';
