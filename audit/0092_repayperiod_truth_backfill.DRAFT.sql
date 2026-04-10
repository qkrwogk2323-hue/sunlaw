-- ============================================================
-- 0092 repayperiod truth backfill (DRAFT — 검사관 초안)
-- ============================================================
-- 출처: audit/colaw_repayperiod_truth.tsv (COLAW 90건 풀스캔 2026-04-08)
-- 근거: audit/inspector_report_2026-04-08.md
-- 정책: empty 6건은 null 유지 (검사관 권고 #3), 나머지 84건 교정
-- 작성: 검사관 read-only 초안. 운영자가 최종 검토 후 migration으로 승격.
--
-- ⚠ 머지 전 운영자 확인 필요:
--   1) 중복 신청인명 5건(김기홍·계승일·조두성·이옥주·임경애) tiebreaker 방식 확정
--   2) pg_dump 백업 완료 여부
--   3) PR-1 머지 완료 확인 (재-import 방지 우선)
--   4) 사용자(VEIN) timing 승인
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- STEP 0. 롤백용 백업 스냅샷
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS _backup_0092_rehab_income_settings AS
SELECT case_id, repay_months, repay_period_option, updated_at, now() AS _backup_at
FROM rehab_income_settings
WHERE 1=0;

INSERT INTO _backup_0092_rehab_income_settings
SELECT ris.case_id, ris.repay_months, ris.repay_period_option, ris.updated_at, now()
FROM rehab_income_settings ris
JOIN rehab_applications ra ON ra.case_id = ris.case_id
WHERE ra.applicant_name IN (
  '조재근','최병호','김현태','조영모','이순덕','박수인','김진한','홍광래','김정아','차성혁',
  '이상영','이미애','권은지','김상수','홍성우','안미선','강지성','조병수','이평주','박훈아',
  '김한경','현연수','박복희','이광수','임경애','계승일','이재현','송애리','문연자','전진경',
  '노남희','김태연','이호선','김성민','김도경','유원경','박장수','이다빈','박혜영','정유미',
  '김희정','장다운','강미정','전철홍','이재훈','김란희','이재균','서동재','김태민','이정미',
  '장주철','정현희','신인자','이성운','윤자호','신정희','장은성','김기홍','오호성','정희록',
  '이향화','정길찬','안희수','조두성','전민규','노정현','이성규','김창수','임재룡','한주희',
  '안찬희','전원오','김동주','이진호','이옥주','신주영','주경애','서난명','최덕준','박영림',
  '천성근','전재성','김미영','대인원'
);

-- ------------------------------------------------------------
-- STEP 1. 중복 신청인 사전 점검 (0 row 아니면 중단)
-- ------------------------------------------------------------
-- 아래 쿼리로 중복 이름이 몇 건인지 확인. 수동 tiebreaker 필요 여부 결정.
-- SELECT applicant_name, COUNT(*) AS vs_rows
-- FROM rehab_applications
-- WHERE applicant_name IN ('김기홍','계승일','조두성','이옥주','임경애','김한경')
-- GROUP BY applicant_name;

-- ------------------------------------------------------------
-- STEP 2. 고유 신청인 77명 벌크 교정 (이름 1:1 매칭 안전)
--   - 75 unique names + 김한경 2건(둘 다 target 동일하므로 collision 안전)
-- ------------------------------------------------------------
WITH truth(applicant_name, repay_months, repay_period_option) AS (
  VALUES
    -- capital36 (rps=6 frm=36): 법정 기본
    ('조재근',  36, 'capital36'::text), ('최병호',  36, 'capital36'),
    ('김현태',  36, 'capital36'),       ('조영모',  36, 'capital36'),
    ('이순덕',  36, 'capital36'),       ('박수인',  36, 'capital36'),
    ('김진한',  36, 'capital36'),       ('홍광래',  36, 'capital36'),
    ('김정아',  36, 'capital36'),       ('이상영',  36, 'capital36'),
    ('이미애',  36, 'capital36'),       ('권은지',  36, 'capital36'),
    ('김상수',  36, 'capital36'),       ('홍성우',  36, 'capital36'),
    ('안미선',  36, 'capital36'),       ('강지성',  36, 'capital36'),
    ('조병수',  36, 'capital36'),       ('이평주',  36, 'capital36'),
    ('박훈아',  36, 'capital36'),       ('김한경',  36, 'capital36'),  -- 2 rows, 동일 target, collision 안전
    ('이광수',  36, 'capital36'),       ('송애리',  36, 'capital36'),
    ('전진경',  36, 'capital36'),       ('노남희',  36, 'capital36'),
    ('김태연',  36, 'capital36'),       ('김성민',  36, 'capital36'),
    ('김도경',  36, 'capital36'),       ('박장수',  36, 'capital36'),
    ('이다빈',  36, 'capital36'),       ('정유미',  36, 'capital36'),
    ('김희정',  36, 'capital36'),       ('장다운',  36, 'capital36'),
    ('강미정',  36, 'capital36'),       ('이재훈',  36, 'capital36'),
    ('김란희',  36, 'capital36'),       ('김태민',  36, 'capital36'),
    ('이정미',  36, 'capital36'),       ('장주철',  36, 'capital36'),
    ('정현희',  36, 'capital36'),       ('신인자',  36, 'capital36'),
    ('이성운',  36, 'capital36'),       ('윤자호',  36, 'capital36'),
    ('신정희',  36, 'capital36'),       ('장은성',  36, 'capital36'),
    ('오호성',  36, 'capital36'),       ('이향화',  36, 'capital36'),
    ('정길찬',  36, 'capital36'),       ('안희수',  36, 'capital36'),
    ('전민규',  36, 'capital36'),       ('이성규',  36, 'capital36'),  -- NOTE: rps=1이지만 VS는 capital60으로 가야 함. 아래 재확인
    ('김창수',  36, 'capital36'),       ('전원오',  36, 'capital36'),
    ('김동주',  36, 'capital36'),       ('신주영',  60, 'capital60'),  -- rps=6 frm=60
    ('주경애',  36, 'capital36'),       ('서난명',  36, 'capital36'),
    ('박영림',  36, 'capital36'),       ('천성근',  36, 'capital36'),
    ('전재성',  36, 'capital36'),

    -- capital60 (rps=1 또는 rps=6 frm=60)
    ('차성혁',  60, 'capital60'),       ('현연수',  60, 'capital60'),
    ('이재현',  60, 'capital60'),       ('이호선',  60, 'capital60'),
    ('유원경',  60, 'capital60'),       ('박혜영',  60, 'capital60'),
    ('전철홍',  60, 'capital60'),       ('이재균',  60, 'capital60'),
    ('노정현',  60, 'capital60'),       ('이성규',  60, 'capital60'),  -- ⚠ 위 capital36 중복 항목 — 정답은 capital60 하나만
    ('임재룡',  60, 'capital60'),       ('한주희',  60, 'capital60'),
    ('안찬희',  60, 'capital60'),       ('최덕준',  60, 'capital60'),
    ('김미영',  60, 'capital60'),       ('대인원',  60, 'capital60'),

    -- custom months (rps=6 frm=45 or 48) → capital100_5y + frm 그대로
    ('이진호',  48, 'capital100_5y')
),
-- NOTE: 위 VALUES에 이성규 중복 실수 있음. 운영자가 최종 커밋 전 아래 단일 정정 사용:
-- DELETE FROM truth WHERE applicant_name='이성규' AND repay_months=36;
dedup AS (
  SELECT DISTINCT ON (applicant_name) applicant_name, repay_months, repay_period_option
  FROM truth
  WHERE NOT (applicant_name='이성규' AND repay_months=36)  -- 오타 방지 필터
  ORDER BY applicant_name, repay_months DESC
)
UPDATE rehab_income_settings ris
SET repay_months = d.repay_months,
    repay_period_option = d.repay_period_option,
    updated_at = now()
FROM dedup d
JOIN rehab_applications ra ON ra.applicant_name = d.applicant_name
WHERE ris.case_id = ra.case_id
  AND ra.applicant_name NOT IN (
    -- 중복 이름은 STEP 3 수동 블록에서 처리 (자동 UPDATE에서 제외)
    '김기홍','계승일','조두성','이옥주','임경애'
  );

-- ------------------------------------------------------------
-- STEP 3. 중복 신청인 수동 교정 (운영자 tiebreaker 필요)
-- ------------------------------------------------------------
-- 각 블록은 created_at 또는 COLAW cs 기반 mapping 필요.
-- 운영자 권장: rehab_applications 에 colaw_cs 컬럼이 없으면 created_at 순서로 구분
-- (truth.tsv n 번호가 클수록 최신 사건이므로 created_at DESC 순서와 일치 가정)

-- 3-1. 김기홍 (2건, 서로 다른 target)
--   n=33 (created 더 최신) → capital60, 60mo
--   n=23 (created 더 이전) → capital36, 36mo
-- TODO(operator): 아래 둘 중 하나 주석 해제 + case_id 확정
-- UPDATE rehab_income_settings SET repay_months=60, repay_period_option='capital60', updated_at=now()
-- WHERE case_id = '<<< 김기홍_n33_case_id >>>';
-- UPDATE rehab_income_settings SET repay_months=36, repay_period_option='capital36', updated_at=now()
-- WHERE case_id = '<<< 김기홍_n23_case_id >>>';

-- 3-2. 계승일 (2건)
--   n=65 → capital60, 60mo
--   n=13 → capital36, 36mo
-- UPDATE rehab_income_settings SET repay_months=60, repay_period_option='capital60', updated_at=now()
-- WHERE case_id = '<<< 계승일_n65_case_id >>>';
-- UPDATE rehab_income_settings SET repay_months=36, repay_period_option='capital36', updated_at=now()
-- WHERE case_id = '<<< 계승일_n13_case_id >>>';

-- 3-3. 조두성 (2건: n=27 data, n=26 empty)
--   n=27 → capital36, 36mo
--   n=26 → NULL, NULL (empty 유지)
-- UPDATE rehab_income_settings SET repay_months=36, repay_period_option='capital36', updated_at=now()
-- WHERE case_id = '<<< 조두성_n27_case_id >>>';
-- UPDATE rehab_income_settings SET repay_months=NULL, repay_period_option=NULL, updated_at=now()
-- WHERE case_id = '<<< 조두성_n26_case_id >>>';

-- 3-4. 이옥주 (2건: n=14 custom_45, n=12 empty)
--   n=14 → 45, capital100_5y
--   n=12 → NULL, NULL
-- UPDATE rehab_income_settings SET repay_months=45, repay_period_option='capital100_5y', updated_at=now()
-- WHERE case_id = '<<< 이옥주_n14_case_id >>>';
-- UPDATE rehab_income_settings SET repay_months=NULL, repay_period_option=NULL, updated_at=now()
-- WHERE case_id = '<<< 이옥주_n12_case_id >>>';

-- 3-5. 임경애 (2건: n=2 capital60, n=66 empty)
--   n=2  → 60, capital60
--   n=66 → NULL, NULL
-- UPDATE rehab_income_settings SET repay_months=60, repay_period_option='capital60', updated_at=now()
-- WHERE case_id = '<<< 임경애_n2_case_id >>>';
-- UPDATE rehab_income_settings SET repay_months=NULL, repay_period_option=NULL, updated_at=now()
-- WHERE case_id = '<<< 임경애_n66_case_id >>>';

-- ------------------------------------------------------------
-- STEP 4. empty 3건 (중복 아닌 단독 empty) null 강제
--   68 박복희, 62 문연자, 43 서동재 — 원래 VS에 72 garbage 있을 수 있음
-- ------------------------------------------------------------
UPDATE rehab_income_settings ris
SET repay_months = NULL,
    repay_period_option = NULL,
    updated_at = now()
FROM rehab_applications ra
WHERE ris.case_id = ra.case_id
  AND ra.applicant_name IN ('박복희','문연자','서동재');

-- ------------------------------------------------------------
-- STEP 5. 사후 검증 (COMMIT 전 반드시 확인)
-- ------------------------------------------------------------
-- 5-1. 범위 위반 0건
-- SELECT count(*) FROM rehab_income_settings WHERE repay_months > 60;  -- expect 0
-- SELECT count(*) FROM rehab_income_settings WHERE repay_months IS NOT NULL AND repay_months < 1; -- expect 0

-- 5-2. 분포 일치 (운영자 §7 기대값)
-- SELECT
--   count(*) FILTER (WHERE repay_months = 60)              AS cap60,  -- expect 21
--   count(*) FILTER (WHERE repay_months BETWEEN 36 AND 48) AS mid,    -- expect 63
--   count(*) FILTER (WHERE repay_months IS NULL)           AS nulls,  -- expect >=6
--   count(*) FILTER (WHERE repay_months = 72)              AS seventy_two  -- expect 0
-- FROM rehab_income_settings ris
-- JOIN rehab_applications ra ON ra.case_id = ris.case_id
-- WHERE ra.applicant_name IN ( /* 위 84명 list */ );

-- 5-3. updated_by 트리거 또는 audit log 체크
-- 5-4. ROLLBACK 테스트 — STEP 0 _backup_0092_* 테이블로 복원 가능한지

COMMIT;

-- ============================================================
-- ROLLBACK (운영자 별도 파일 audit/0092_rollback.sql 로 분리 권장)
-- ============================================================
-- BEGIN;
-- UPDATE rehab_income_settings ris
-- SET repay_months = b.repay_months,
--     repay_period_option = b.repay_period_option,
--     updated_at = b.updated_at
-- FROM _backup_0092_rehab_income_settings b
-- WHERE ris.case_id = b.case_id;
-- COMMIT;
