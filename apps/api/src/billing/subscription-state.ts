const DAY_MS = 86400000;
export function subscriptionState(
  org: {
    status: string;
    setupFeePaid?: boolean;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
  },
  now = new Date(),
) {
  const isTrial =
    org.status === 'TRIAL' ||
    (org.setupFeePaid === false && org.trialEndsAt !== null);
  const expiresAt = isTrial ? org.trialEndsAt : org.currentPeriodEnd;
  const daysRemaining = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / DAY_MS))
    : null;
  const expiryState =
    org.status === 'PAST_DUE' || (expiresAt && expiresAt <= now)
      ? 'EXPIRED'
      : daysRemaining !== null && daysRemaining <= 14
      ? 'DUE_SOON'
      : expiresAt
      ? 'CURRENT'
      : 'NOT_CONFIGURED';
  return { isTrial, expiresAt, daysRemaining, expiryState };
}
