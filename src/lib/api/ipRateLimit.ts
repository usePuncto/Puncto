/**
 * IP / key rate limiter for public and abuse-prone endpoints.
 *
 * Prefer Firestore (shared across serverless instances). Falls back to
 * in-memory when Firestore is unavailable so local/dev still has a floor.
 */

import { createHash } from 'crypto';
import { db } from '@/lib/firebaseAdmin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

type Bucket = { count: number; resetAt: number };

const memoryStore = new Map<string, Bucket>();

function checkMemoryRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  let bucket = memoryStore.get(key);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    memoryStore.set(key, bucket);
  }
  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

function rateLimitDocId(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 40);
}

async function checkFirestoreRateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  const ref = db.collection('_rateLimits').doc(rateLimitDocId(key));
  const nowMs = Date.now();

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data() as { count?: number; resetAtMs?: number } | undefined;
    let count = data?.count ?? 0;
    let resetAtMs = data?.resetAtMs ?? 0;

    if (!snap.exists || nowMs >= resetAtMs) {
      count = 0;
      resetAtMs = nowMs + windowMs;
    }

    if (count >= limit) {
      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000)),
      };
    }

    count += 1;
    tx.set(
      ref,
      {
        keyPrefix: key.slice(0, 80),
        count,
        resetAtMs,
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt: Timestamp.fromMillis(resetAtMs + 60_000),
      },
      { merge: true }
    );

    return { allowed: true, retryAfterSec: 0 };
  });
}

/**
 * Durable rate limit check. Uses Firestore when possible; memory fallback otherwise.
 */
export async function checkIpRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<{ allowed: boolean; retryAfterSec: number }> {
  if (process.env.RATE_LIMIT_MEMORY_ONLY === 'true') {
    return checkMemoryRateLimit(key, opts);
  }

  try {
    return await checkFirestoreRateLimit(key, opts);
  } catch (err) {
    console.warn('[rateLimit] Firestore unavailable, using memory fallback:', err);
    return checkMemoryRateLimit(key, opts);
  }
}

export function clientIpFromRequest(request: Request): string {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}
