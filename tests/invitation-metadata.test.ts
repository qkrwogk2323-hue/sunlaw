import { describe, expect, it } from 'vitest';
import { decodeInvitationNote, encodeInvitationNote } from '@/lib/invitation-metadata';

describe('invitation metadata encoding', () => {
  it('preserves title and public note when both exist', () => {
    const encoded = encodeInvitationNote('현장 지원 담당입니다.', '플랫폼 지원 테스트');
    const decoded = decodeInvitationNote(encoded);

    expect(decoded.membershipTitle).toBe('플랫폼 지원 테스트');
    expect(decoded.note).toBe('현장 지원 담당입니다.');
  });

  it('returns a plain note when no membership title is embedded', () => {
    const decoded = decodeInvitationNote('메모만 있습니다.');

    expect(decoded.membershipTitle).toBeNull();
    expect(decoded.note).toBe('메모만 있습니다.');
  });

  it('collapses empty values to null', () => {
    expect(encodeInvitationNote('   ', '   ')).toBeNull();
    expect(decodeInvitationNote('   ')).toEqual({ membershipTitle: null, note: null });
  });
});