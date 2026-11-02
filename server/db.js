import mysql from 'mysql2/promise';

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
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
    decimalNumbers: true,
    connectTimeout: 10000,
  });
}

export function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}
