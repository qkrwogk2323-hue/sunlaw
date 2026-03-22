import { Suspense } from 'react';
import { ModeAwareNav } from '@/components/mode-aware-nav';
import { getNavUnreadCounts } from '@/lib/queries/notifications';
import type { Membership, Profile } from '@/lib/types';

type Props = {
  memberships: Membership[];
  profile: Profile;
};

async function NavWithBadges({ memberships, profile }: Props) {
  const counts = await getNavUnreadCounts().catch(() => ({
    unreadCount: 0,
    actionRequiredCount: 0,
    unreadConversationCount: 0,
  }));
  return (
    <ModeAwareNav
      memberships={memberships}
      profile={profile}
      unreadNotificationCount={counts.unreadCount}
      actionRequiredCount={counts.actionRequiredCount}
      unreadConversationCount={counts.unreadConversationCount}
    />
  );
}

// Fallback: nav renders immediately without badges while counts load
function NavFallback({ memberships, profile }: Props) {
  return (
    <ModeAwareNav
      memberships={memberships}
      profile={profile}
      unreadNotificationCount={0}
      actionRequiredCount={0}
      unreadConversationCount={0}
    />
  );
}

export function NavBadgesAsync({ memberships, profile }: Props) {
  return (
    <Suspense fallback={<NavFallback memberships={memberships} profile={profile} />}>
      <NavWithBadges memberships={memberships} profile={profile} />
    </Suspense>
  );
}
