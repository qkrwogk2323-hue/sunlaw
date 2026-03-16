import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildCoordinationPlan, buildTaskPlan } from '@/lib/ai/task-planner';

const cases = [
  { id: 'case-1', title: '동명테크 용역대금 청구' },
  { id: 'case-2', title: '세림상사 가압류 본안 대응' }
];

describe('task planner rule fallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T09:00:00+09:00'));
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds a rule-based hearing plan from explicit date text', async () => {
    const result = await buildTaskPlan('동명테크 용역대금 청구 2026-04-03 14:30 변론 준비', cases);
    const dueAt = new Date(result.dueAt ?? '');

    expect(result.provider).toBe('rules');
    expect(result.title).toContain('[동명테크 용역대금 청구]');
    expect(result.scheduleKind).toBe('hearing');
    expect(result.isImportant).toBe(true);
    expect(dueAt.getFullYear()).toBe(2026);
    expect(dueAt.getMonth()).toBe(3);
    expect(dueAt.getDate()).toBe(3);
    expect(dueAt.getHours()).toBe(14);
    expect(dueAt.getMinutes()).toBe(30);
  });

  it('builds a reminder when no explicit schedule keyword exists', async () => {
    const result = await buildTaskPlan('세림상사 가압류 본안 대응 자료 확인', cases);

    expect(result.provider).toBe('rules');
    expect(result.scheduleKind).toBe('reminder');
    expect(result.reason).toContain('수동 확인');
  });

  it('builds a coordination checklist with manager escalation for urgent items', async () => {
    const result = await buildCoordinationPlan('동명테크 용역대금 청구 오늘 승인, 팀 공유, 담당자 지정', cases);

    expect(result.provider).toBe('rules');
    expect(result.recommendedRecipientMode).toBe('managers');
    expect(result.checklist.length).toBeGreaterThan(0);
    expect(result.checklist.some((item) => item.priority === 'high')).toBe(true);
    expect(result.checklist.some((item) => item.notifyTarget === 'team')).toBe(true);
    expect(result.checklist.some((item) => item.notifyTarget === 'assignee')).toBe(true);
  });

  it('rejects empty planner input', async () => {
    await expect(buildTaskPlan('   ', cases)).rejects.toThrow('요청 내용을 입력해 주세요.');
    await expect(buildCoordinationPlan('', cases)).rejects.toThrow('요청 내용을 입력해 주세요.');
  });
});