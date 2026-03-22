import { describe, expect, it } from 'vitest';
import { toLoginErrorFeedback } from '@/components/forms/credential-login-form';

describe('toLoginErrorFeedback', () => {
  it('이메일 로그인 실패를 원인과 해결 방법으로 풀어쓴다', () => {
    const feedback = toLoginErrorFeedback(new Error('Invalid login credentials'), 'email');

    expect(feedback.title).toContain('이메일 로그인');
    expect(feedback.cause).toContain('이메일');
    expect(feedback.resolution).toContain('비밀번호 재설정');
  });

  it('임시 아이디 로그인 실패를 조직 정보 기준으로 안내한다', () => {
    const feedback = toLoginErrorFeedback(new Error('조직 식별값 또는 임시 아이디를 확인해 주세요.'), 'temp');

    expect(feedback.title).toContain('임시 아이디');
    expect(feedback.cause).toContain('조직 식별값');
    expect(feedback.resolution).toContain('조직 관리자');
  });

  it('반복 로그인 제한은 대기 시간을 안내한다', () => {
    const feedback = toLoginErrorFeedback(new Error('Too many requests'), 'email');

    expect(feedback.title).toContain('잠시 로그인');
    expect(feedback.cause).toContain('반복');
    expect(feedback.resolution).toContain('5분');
  });
});
