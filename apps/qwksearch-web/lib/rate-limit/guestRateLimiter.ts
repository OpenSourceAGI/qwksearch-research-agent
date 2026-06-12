/**
 * In-memory rate limiter for guest users using global env API keys.
 * Limits usage to 100 requests per day per IP address.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp when the limit resets
}

const DAILY_LIMIT = 100;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Opportunistic cleanup of expired entries. The Cloudflare Workers runtime
// disallows timers (setInterval) in global scope, so instead of a periodic
// timer we sweep expired entries lazily, at most once per CLEANUP_INTERVAL,
// from within the request-handling code paths below.
const CLEANUP_INTERVAL = 60 * 60 * 1000;
let lastCleanup = 0;

function cleanupExpired(stores: Map<string, RateLimitEntry>[], now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const store of stores) {
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Check and consume one request from the rate limit for a given IP.
 * Returns whether the request is allowed and remaining quota.
 */
export function checkGuestRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  cleanupExpired([rateLimitStore, ttsRateLimitStore], now);
  let entry = rateLimitStore.get(ip);

  // If no entry or entry has expired, create a new one
  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + DAY_IN_MS,
    };
    rateLimitStore.set(ip, entry);
  }

  const remaining = Math.max(0, DAILY_LIMIT - entry.count);
  const allowed = entry.count < DAILY_LIMIT;

  if (allowed) {
    entry.count++;
  }

  return {
    allowed,
    remaining: allowed ? remaining - 1 : 0,
    resetAt: entry.resetAt,
    limit: DAILY_LIMIT,
  };
}

/**
 * Get current rate limit status without consuming a request.
 */
export function getGuestRateLimitStatus(ip: string): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt <= now) {
    return {
      allowed: true,
      remaining: DAILY_LIMIT,
      resetAt: now + DAY_IN_MS,
      limit: DAILY_LIMIT,
    };
  }

  const remaining = Math.max(0, DAILY_LIMIT - entry.count);

  return {
    allowed: entry.count < DAILY_LIMIT,
    remaining,
    resetAt: entry.resetAt,
    limit: DAILY_LIMIT,
  };
}

/**
 * Get the number of tracked IPs (for debugging/monitoring).
 */
export function getTrackedIPCount(): number {
  return rateLimitStore.size;
}

// -------------------- TTS rate limit --------------------
// 10/day for every caller — keyed by userId for auth'd users, IP for guests.

const TTS_DAILY_LIMIT = 50;
const ttsRateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check and consume one TTS request for the given key.
 * Pass the authenticated userId when available, otherwise the client IP.
 */
export function checkTTSRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  cleanupExpired([rateLimitStore, ttsRateLimitStore], now);
  let entry = ttsRateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + DAY_IN_MS };
    ttsRateLimitStore.set(key, entry);
  }

  const remaining = Math.max(0, TTS_DAILY_LIMIT - entry.count);
  const allowed = entry.count < TTS_DAILY_LIMIT;

  if (allowed) {
    entry.count++;
  }

  return {
    allowed,
    remaining: allowed ? remaining - 1 : 0,
    resetAt: entry.resetAt,
    limit: TTS_DAILY_LIMIT,
  };
}
