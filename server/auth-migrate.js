import { createPool } from './db.js';

const pool = createPool();

async function ensureColumn(table, name, definition) {
  const [[column]] = await pool.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, name]
  );
  if (!column) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${definition}`);
}

try {
  await ensureColumn('customers', 'google_id', 'VARCHAR(64) NULL');
  await ensureColumn('customers', 'avatar_url', 'VARCHAR(512) NULL');

  const [[passwordColumn]] = await pool.execute(
    `SELECT IS_NULLABLE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND COLUMN_NAME = 'password_hash'`
  );
  if (passwordColumn && passwordColumn.IS_NULLABLE !== 'YES') {
    await pool.query('ALTER TABLE customers MODIFY password_hash VARCHAR(255) NULL');
  }

  const [[googleIndex]] = await pool.execute(
    `SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customers' AND INDEX_NAME = 'uq_customers_google_id' LIMIT 1`
  );
  if (!googleIndex) await pool.query('ALTER TABLE customers ADD UNIQUE INDEX uq_customers_google_id (google_id)');

  console.log('Customer account schema ready (Google sign-in + editable profile).');
} finally {
  await pool.end();
}
