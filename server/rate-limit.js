// ---------------------------------------------------------------------------
// FIX 3 – Distributed Rate Limiting with Fail-Open Safety
// ---------------------------------------------------------------------------
// The original implementation used in-memory JavaScript Maps to track request
// counts per IP address.  On Vercel Serverless each container instance has its
// own independent Map, so limits are not shared between instances.  An attacker
// can trivially bypass the limit by retrying across different Vercel containers.
//
// This module provides:
//   1. Upstash Redis REST-based distributed limiting (primary).
//      Uses only Node's built-in fetch() – no SDK install required.
//      Executes an atomic INCR + EXPIRE pipeline over HTTPS.
//   2. In-process sliding-window fallback (when Upstash is not configured or
//      temporarily unavailable).  This restores the original behaviour so
//      existing users are NEVER accidentally blocked by a rate-limiter outage.
//
// Rate limits per endpoint:
//   customer_login    : 5 attempts / 15 min
//   customer_register : 3 attempts / 60 min
//   admin_login       : 5 attempts / 15 min
//   coupon_validate   : 30 requests / 1 min
//   admin_sensitive   : 30 requests / 1 min  (stock, status updates, etc.)
//
// Fail-open design: if the external service times out or is unavailable the
// request is ALLOWED through and a warning is logged.  This prevents a Redis
// outage from taking down the checkout flow.
// ---------------------------------------------------------------------------

// Per-action limits: [maxAttempts, windowSeconds]
const LIMITS = {
  customer_login:    [5,  15 * 60],
  customer_register: [3,  60 * 60],
  admin_login:       [5,  15 * 60],
  coupon_validate:   [30,      60],
  admin_sensitive:   [30,      60],
};

// ---------------------------------------------------------------------------
// IP extraction – safe: only trust the first value from x-forwarded-for
// (Vercel guarantees this is set and the leftmost IP is the client).
// ---------------------------------------------------------------------------
export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.length > 0) return realIp.trim();
  return req.socket?.remoteAddress || '127.0.0.1';
}

// ---------------------------------------------------------------------------
// In-process sliding-window fallback (Map<key, {count, resetAt}>)
// ---------------------------------------------------------------------------
const memoryStore = new Map();

function memoryCheck(key, maxAttempts, windowMs) {
  const now = Date.now();
  let entry = memoryStore.get(key);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryStore.set(key, entry);
  }
  entry.count += 1;
  // Cleanup stale entries periodically to avoid memory leaks in long-lived containers.
  if (memoryStore.size > 5000) {
    for (const [k, v] of memoryStore) { if (v.resetAt < now) memoryStore.delete(k); }
  }
  return { allowed: entry.count <= maxAttempts, remaining: Math.max(0, maxAttempts - entry.count), resetAt: entry.resetAt };
}

// ---------------------------------------------------------------------------
// Upstash Redis REST atomic INCR + EXPIRE pipeline
// ---------------------------------------------------------------------------
async function upstashCheck(url, token, key, maxAttempts, windowSeconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);
  try {
    const resp = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, windowSeconds, 'NX'], // NX: only set TTL on first increment
      ]),
      signal: controller.signal,
    });
    if (!resp.ok) throw new Error(`Upstash responded with HTTP ${resp.status}`);
    const results = await resp.json();
    const count = Number(results?.[0]?.result ?? 1);
    return { allowed: count <= maxAttempts, remaining: Math.max(0, maxAttempts - count) };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Factory – call once per serverless cold-start; reuse the returned checker.
// ---------------------------------------------------------------------------
export function createRateLimiter(env = process.env) {
  const upstashUrl = (env.UPSTASH_REDIS_REST_URL || '').trim();
  const upstashToken = (env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  const useUpstash = Boolean(upstashUrl && upstashToken);

  if (useUpstash) {
    console.log('[rate-limit] Using Upstash Redis for distributed rate limiting.');
  } else {
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not configured. ' +
      'Falling back to in-process rate limiting (not shared across Vercel instances).');
  }

  /**
   * Check rate limit for a given action and client IP.
   * Writes a 429 response and returns false if the limit is exceeded.
   * Returns true if the request should be allowed through.
   *
   * @param {import('http').IncomingMessage} req
   * @param {import('http').ServerResponse}  res
   * @param {'customer_login'|'customer_register'|'admin_login'|'coupon_validate'|'admin_sensitive'} action
   */
  return async function checkRateLimit(req, res, action) {
    const [maxAttempts, windowSeconds] = LIMITS[action] || [10, 60];
    const windowMs = windowSeconds * 1000;
    const ip = getClientIp(req);
    const key = `rl:${action}:${ip}`;

    let result;
    if (useUpstash) {
      try {
        result = await upstashCheck(upstashUrl, upstashToken, key, maxAttempts, windowSeconds);
      } catch (err) {
        // Fail-open: log warning but allow the request through.
        console.warn(`[rate-limit] Upstash check failed (${err.message}); falling back to in-process limiter.`);
        result = memoryCheck(key, maxAttempts, windowMs);
      }
    } else {
      result = memoryCheck(key, maxAttempts, windowMs);
    }

    if (!result.allowed) {
      res.writeHead(429, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-ratelimit-limit': String(maxAttempts),
        'x-ratelimit-remaining': '0',
        'retry-after': String(windowSeconds),
      });
      res.end(JSON.stringify({ error: 'Too many attempts. Please try again in a few minutes.' }));
      return false;
    }
    return true;
  };
}

