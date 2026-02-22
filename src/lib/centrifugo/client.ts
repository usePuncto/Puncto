import { Centrifuge, State } from 'centrifuge';
import { auth } from '@/lib/firebase';

let centrifugeClient: Centrifuge | null = null;

/**
 * Get or create Centrifuge client instance
 * Call this after user is authenticated to get a token
 */
export function getCentrifugeClient(token: string): Centrifuge {
  if (centrifugeClient && centrifugeClient.state === State.Connected) {
    return centrifugeClient;
  }

  const centrifugoUrl = process.env.NEXT_PUBLIC_CENTRIFUGO_URL || 'ws://localhost:8000/connection/websocket';

  centrifugeClient = new Centrifuge(centrifugoUrl, {
    token: token,
    debug: process.env.NODE_ENV === 'development',
  });

  return centrifugeClient;
}

/**
 * Disconnect Centrifuge client
 */
export function disconnectCentrifuge(): void {
  if (centrifugeClient) {
    centrifugeClient.disconnect();
    centrifugeClient = null;
  }
}

/**
 * Subscribe to a channel for real-time updates
 */
export async function subscribeToChannel(
  client: Centrifuge,
  channel: string,
  callback: (data: any) => void
) {
  const subscription = client.newSubscription(channel);

  subscription.on('publication', (ctx) => {
    callback(ctx.data);
  });

  subscription.on('subscribed', () => {
    console.log(`[Centrifuge] Subscribed to channel: ${channel}`);
  });

  subscription.on('unsubscribed', () => {
    console.log(`[Centrifuge] Unsubscribed from channel: ${channel}`);
  });

  subscription.on('error', (ctx) => {
    console.error(`[Centrifuge] Error on channel ${channel}:`, ctx);
  });

  subscription.subscribe();

  return subscription;
}
