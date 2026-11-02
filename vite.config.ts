import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createPool } from './server/db.js';
import { createApiHandler } from './server/api.js';

const REQUIRED_TABLES = ['products', 'product_variants', 'categories', 'customers', 'orders'];

async function verifySchema(pool: ReturnType<typeof createPool>) {
  try {
    const [rows] = await pool.query('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()');
    const existing = new Set((rows as { TABLE_NAME: string }[]).map((row) => row.TABLE_NAME));
    const missing = REQUIRED_TABLES.filter((table) => !existing.has(table));
    if (missing.length) {
      console.warn(`\n\x1b[33m[db] Missing tables: ${missing.join(', ')}\x1b[0m`);
      console.warn('\x1b[33m[db] Run "npm run db:migrate" to create the schema, then restart the dev server.\x1b[0m\n');
    }
  } catch (error) {
    console.warn(`\n\x1b[33m[db] Could not verify the database schema: ${(error as Error).message}\x1b[0m\n`);
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), {
      name: 'spidy-database-api',
      configureServer(server) {
        const pool = createPool(env);
        const api = createApiHandler(pool, env);
        void verifySchema(pool);
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/api/')) return next();
          void api(req, res);
        });
        server.httpServer?.on('close', () => { void pool.end(); });
      },
    }],
  };
});
