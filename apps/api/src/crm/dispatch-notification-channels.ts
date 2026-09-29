type Channel = 'push' | 'whatsapp';

// Keep recipients sequential within each provider, but never block one provider
// behind another provider's network requests.
export async function dispatchNotificationChannels(
  recipients: readonly string[],
  channels: Partial<Record<Channel, (userId: string) => Promise<unknown>>>,
  onError: (channel: Channel, userId: string, error: unknown) => void,
) {
  const counts = { push: 0, whatsapp: 0 };
  await Promise.all((['push', 'whatsapp'] as const).map(async channel => {
    const send = channels[channel];
    if (!send) return;
    for (const userId of recipients) {
      try {
        await send(userId);
        counts[channel]++;
      } catch (error: unknown) {
        onError(channel, userId, error);
      }
    }
  }));
  // These count completed dispatch calls, not confirmed device deliveries.
  return counts;
}
