import { describe, expect, it } from 'vitest';
import {
  adjustLivingCost,
  minimumLivingCost,
  getMedianIncome,
} from '@/lib/rehabilitation/median-income';

describe('생계비 자동 조정 (P1-1)', () => {
  it('2026 1인 가구 = 1,538,542원 (floor)', () => {
    expect(minimumLivingCost(1, 2026)).toBe(1_538_542);
  });

  it('2026 3인 가구 = 3,215,421원 (floor)', () => {
    expect(minimumLivingCost(3, 2026)).toBe(3_215_421);
  });

  it('2025 3인 가구 = 3,015,211원', () => {
    expect(minimumLivingCost(3, 2025)).toBe(3_015_211);
  });

  it('입력값이 권장선 이상이면 belowRecommendedFloor=false', () => {
    const result = adjustLivingCost(2_000_000, 1, 2026);
    expect(result.belowRecommendedFloor).toBe(false);
    expect(result.adjusted).toBe(2_000_000);
    expect(result.floor).toBe(1_538_542);
  });

  it('입력값이 권장선 미만이면 belowRecommendedFloor=true (UP-clamp 안 함)', () => {
    const result = adjustLivingCost(1_000_000, 1, 2026);
    expect(result.belowRecommendedFloor).toBe(true);
    expect(result.adjusted).toBe(1_000_000); // 사용자 입력 보존
    expect(result.floor).toBe(1_538_542);
  });

  // minimumLivingCost(size, year, rate) — rate=median × N% (스탠드얼론 의미론)
  // UI는 colaw computeLivingCost 사용 (별도 식). 본 함수는 직접 % 계산용.
  it('rate=50 — 1인 가구 1,282,119원 (median × 50%)', () => {
    expect(minimumLivingCost(1, 2026, 50)).toBe(1_282_119);
  });

  it('rate=70 — 1인 가구 1,794,966원 (median × 70%)', () => {
    expect(minimumLivingCost(1, 2026, 70)).toBe(1_794_966);
  });

  it('adjustLivingCost rate=70 — 1,800,000 통과', () => {
    const result = adjustLivingCost(1_800_000, 1, 2026, 70);
    expect(result.belowRecommendedFloor).toBe(false);
    expect(result.adjusted).toBe(1_800_000);
  });
});

describe('minimumLivingCost — 연도별 (2022~2026)', () => {
  it('2022 3인 = 2,516,820원', () => {
    expect(minimumLivingCost(3, 2022)).toBe(2_516_820);
  });

  it('2023 3인 = 2,660,889원', () => {
    expect(minimumLivingCost(3, 2023)).toBe(2_660_889);
  });

  it('2024 3인 = 2,828,794원', () => {
    expect(minimumLivingCost(3, 2024)).toBe(2_828_794);
  });

  it('2025 3인 = 3,015,211원', () => {
    expect(minimumLivingCost(3, 2025)).toBe(3_015_211);
  });

  it('2026 3인 = 3,215,421원', () => {
    expect(minimumLivingCost(3, 2026)).toBe(3_215_421);
  });
});

describe('getMedianIncome — 8인 이상 증분 산출', () => {
  it('2024 7인 = 8,514,994원 (고시 직접)', () => {
    expect(getMedianIncome(7, 2024)).toBe(8_514_994);
  });

  it('2024 8인 = 9,411,619원 (7인 + 증분 896,625)', () => {
    expect(getMedianIncome(8, 2024)).toBe(9_411_619);
  });

  it('2026 9인 = 11,553,651원 (7인 + 증분 999,233 × 2)', () => {
    expect(getMedianIncome(9, 2026)).toBe(11_553_651);
  });

  it('미등록 연도는 2025 fallback', () => {
    // 2099년 → 2025 테이블 사용
    expect(getMedianIncome(3, 2099)).toBe(5_025_353);
  });
});
