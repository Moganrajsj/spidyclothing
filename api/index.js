import { createPool } from '../server/db.js';
import { createApiHandler } from '../server/api.js';

// ---------------------------------------------------------------------------
// FIX 1 – Serverless pool singleton + connection error handling
// ---------------------------------------------------------------------------
// The pool is created once per warm Vercel container and reused across all
// invocations within that container.  On cold-start a new pool is created.
// Connection exhaustion errors and pool queue limit errors are caught here and
// returned as HTTP 503 with a Retry-After header so the client knows to retry.
// ---------------------------------------------------------------------------

let api;

function getApi() {
  if (!api) {
    const pool = createPool(process.env);
    api = createApiHandler(pool, process.env);
  }
  return api;
}

// Vercel parses JSON request bodies before invoking the function. The store API
// reads the raw stream, so expose the already-parsed body as a single chunk.
function exposeParsedBody(req) {
  const method = req.method || 'GET';
  if (method === 'GET' || method === 'HEAD') return;
  if (req.body === undefined || req.body === null) return;
  if (String(req.headers['content-type'] || '').includes('multipart/form-data')) return;
  const raw = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  let sent = false;
  req[Symbol.asyncIterator] = async function* () {
    if (!sent) {
      sent = true;
      yield raw;
    }
  };
}

// Determine if an error is a connection pool exhaustion / queue limit error
// from mysql2 so we can respond with a proper 503 instead of a generic 500.
function isPoolError(err) {
  if (!err) return false;
  const code = err.code || '';
  const msg = err.message || '';
  return (
    code === 'ER_CON_COUNT_ERROR' ||
    code === 'POOL_ENQUEUELIMIT' ||
    code === 'ETIMEDOUT' ||
    msg.includes('Pool is exhausted') ||
    msg.includes('Too many connections')
  );
}

export default async function handler(req, res) {
  const startMs = Date.now();
  exposeParsedBody(req);
  try {
    await getApi()(req, res);
  } catch (err) {
    const method = req.method || 'GET';
    const url = req.url || '/';
    const durationMs = Date.now() - startMs;
    if (isPoolError(err)) {
      console.error(`[api] Pool exhausted – ${method} ${url} (${durationMs}ms):`, err.message);
      if (!res.headersSent) {
        res.writeHead(503, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
          'retry-after': '3',
        });
        res.end(JSON.stringify({ error: 'The service is temporarily busy. Please try again in a moment.' }));
      }
    } else {
      console.error(`[api] Unhandled error – ${method} ${url} (${durationMs}ms):`, err.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify({ error: 'The request could not be completed. Please try again.' }));
      }
    }
  }
  if (Date.now() - startMs > 15000) {
    console.warn(`[api] Slow request – ${req.method} ${req.url} took ${Date.now() - startMs}ms`);
  }
}
