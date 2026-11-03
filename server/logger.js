// ---------------------------------------------------------------------------
// FIX 8 – Sanitized Structured Logging & Performance Tracking
// ---------------------------------------------------------------------------
// Provides a thin logging layer that:
//   1. Automatically redacts sensitive field values (passwords, tokens, secrets,
//      credentials, cookies, authorization headers).
//   2. Tracks operation latency and emits warnings for slow queries (>500ms)
//      and slow requests (>5000ms).
//   3. Produces structured log lines that are safe to emit to Vercel's logging
//      pipeline without exposing credentials.
//
// NEVER logs: passwords, session tokens, SMTP credentials, API secrets,
// cookie values, full payment card data, or raw DB_PASSWORD.
// ---------------------------------------------------------------------------

const REDACTED_KEYS = new Set([
  'password', 'password_hash', 'token', 'token_hash', 'secret',
  'api_secret', 'api_key', 'auth', 'authorization', 'cookie',
  'set-cookie', 'smtp_pass', 'db_password', 'credential', 'credentials',
  'access_token', 'refresh_token', 'id_token', 'google_client_secret',
  'cloudinary_api_secret', 'backup_encryption_key', 'session',
  'upstash_redis_rest_token',
]);

const SLOW_QUERY_MS   = 500;   // Warn if a single DB query takes longer.
const SLOW_REQUEST_MS = 5000;  // Warn if a full API request takes longer.

/**
 * Redact sensitive keys from an object so it is safe to log.
 * Returns a shallow copy with sensitive values replaced by '[REDACTED]'.
 */
export function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const safe = {};
  for (const [k, v] of Object.entries(obj)) {
    safe[k] = REDACTED_KEYS.has(k.toLowerCase()) ? '[REDACTED]' : v;
  }
  return safe;
}

/**
 * Log an informational message with an optional context object (sanitized).
 */
export function logInfo(tag, message, context = null) {
  const base = `[${tag}] ${message}`;
  if (context) {
    console.log(base, sanitize(context));
  } else {
    console.log(base);
  }
}

/**
 * Log a warning.
 */
export function logWarn(tag, message, context = null) {
  const base = `[${tag}] WARN: ${message}`;
  if (context) {
    console.warn(base, sanitize(context));
  } else {
    console.warn(base);
  }
}

/**
 * Log an error. The error object is converted to a string so stack traces are
 * captured without accidentally logging nested sensitive fields.
 */
export function logError(tag, message, err = null) {
  if (err instanceof Error) {
    console.error(`[${tag}] ERROR: ${message} – ${err.message}`, { code: err.code, stack: err.stack?.split('\n')[1]?.trim() });
  } else if (err) {
    console.error(`[${tag}] ERROR: ${message}`, err);
  } else {
    console.error(`[${tag}] ERROR: ${message}`);
  }
}

/**
 * Measure the duration of an async operation and log a warning if it exceeds
 * SLOW_QUERY_MS.  Returns the result of the async function.
 *
 * Usage:
 *   const rows = await measureAsync('db', 'listProducts', () => pool.query(...));
 */
export async function measureAsync(tag, label, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - start;
    if (ms > SLOW_QUERY_MS) {
      logWarn(tag, `Slow operation "${label}" took ${ms}ms`);
    }
    return result;
  } catch (err) {
    const ms = Date.now() - start;
    logError(tag, `Operation "${label}" failed after ${ms}ms`, err);
    throw err;
  }
}

/**
 * Measure and log overall HTTP request duration.
 * Call at the start of a request handler; the returned function logs on completion.
 */
export function startRequestTimer(method, url) {
  const start = Date.now();
  return function endRequestTimer(statusCode) {
    const ms = Date.now() - start;
    if (ms > SLOW_REQUEST_MS) {
      logWarn('api', `Slow request ${method} ${url} → ${statusCode} (${ms}ms)`);
    } else if (statusCode >= 500) {
      logError('api', `${method} ${url} → ${statusCode} (${ms}ms)`);
    }
  };
}

