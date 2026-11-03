import mysql from 'mysql2/promise';

// ---------------------------------------------------------------------------
// FIX 1 – MySQL Connection Pool Optimization
// ---------------------------------------------------------------------------
// Vercel serverless scales by spawning independent Node.js container instances.
// Each warm container holds its own connection pool. With the original limit of
// 10 per container, even 5 concurrent Vercel instances would attempt 50
// simultaneous connections, easily exhausting Hostinger's shared MySQL quota
// (typically 30–50 max_user_connections per database account).
//
// Optimised configuration:
//   connectionLimit : 3  — Up to 10 warm Vercel containers = 30 connections max.
//   queueLimit      : 20 — Bounded backpressure. Excess requests fail fast with
//                          a 503 instead of silently queuing until Vercel's 30s
//                          timeout fires.
//   enableKeepAlive : true / keepAliveInitialDelay: 10s
//                        — Prevents Hostinger from silently dropping idle TCP
//                          connections (common on shared hosting behind NAT).
//   idleTimeout     : 30s — Release connections that have been idle for 30s so
//                          that Hostinger's server-side wait_timeout does not
//                          close them first.
//   maxIdle         : 2  — Keep at most 2 idle connections warm per container.
//
// Both connectionLimit and queueLimit are configurable via environment variables
// (DB_CONNECTION_LIMIT / DB_QUEUE_LIMIT) so they can be tuned per deployment
// tier without a code change.
// ---------------------------------------------------------------------------

export function createPool(env = process.env) {
  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) throw new Error(`Missing database configuration: ${missing.join(', ')}`);
  return mysql.createPool({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    waitForConnections: true,
    // Reduced from 10 → 3 to prevent connection exhaustion across Vercel instances.
    connectionLimit: Number(env.DB_CONNECTION_LIMIT || 3),
    // Bounded queue: reject excessive backlog with PoolQueueError instead of hanging.
    queueLimit: Number(env.DB_QUEUE_LIMIT || 20),
    charset: 'utf8mb4',
    decimalNumbers: true,
    connectTimeout: 10000,
    // TCP keep-alive prevents Hostinger NAT/firewall from silently dropping idle sockets.
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    // Release idle connections before Hostinger's server-side wait_timeout fires.
    idleTimeout: 30000,
    maxIdle: 2,
  });
}

export function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}
