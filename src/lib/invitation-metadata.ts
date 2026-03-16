const invitationTitlePrefix = '[membership_title]';

export function encodeInvitationNote(note: string | null | undefined, membershipTitle: string | null | undefined) {
  const trimmedTitle = membershipTitle?.trim();
  const trimmedNote = note?.trim();

  if (!trimmedTitle) {
    return trimmedNote || null;
  }

  return trimmedNote
    ? `${invitationTitlePrefix}${trimmedTitle}\n${trimmedNote}`
    : `${invitationTitlePrefix}${trimmedTitle}`;
}

export function decodeInvitationNote(note: string | null | undefined) {
  const trimmedNote = note?.trim();
  if (!trimmedNote) {
    return { membershipTitle: null, note: null };
  }

  if (!trimmedNote.startsWith(invitationTitlePrefix)) {
    return { membershipTitle: null, note: trimmedNote };
  }

  const remainder = trimmedNote.slice(invitationTitlePrefix.length);
  const [firstLine, ...rest] = remainder.split('\n');
  const membershipTitle = firstLine.trim() || null;
  const publicNote = rest.join('\n').trim() || null;

  return {
    membershipTitle,
    note: publicNote
  };
}