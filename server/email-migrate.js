import { createPool } from './db.js';

const pool = createPool();

async function ensureColumn(table, name, definition) {
  const [[column]] = await pool.execute(
    'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
    [table, name]
  );
  if (!column) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${definition}`);
    console.log(`[db] Added column ${name} to ${table}`);
  }
}

try {
  // Ensure email tracking columns on orders
  await ensureColumn('orders', 'confirmation_email_sent', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await ensureColumn('orders', 'confirmation_email_sent_at', 'DATETIME NULL');
  await ensureColumn('orders', 'cancellation_email_sent', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await ensureColumn('orders', 'cancellation_email_sent_at', 'DATETIME NULL');

  // Create email logs table for delivery tracking & audit
  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_email_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id BIGINT UNSIGNED NOT NULL,
      order_number VARCHAR(32) NOT NULL,
      email_type ENUM('confirmation', 'cancellation', 'test') NOT NULL,
      recipient_email VARCHAR(254) NOT NULL,
      status ENUM('sent', 'failed') NOT NULL,
      attempts INT UNSIGNED NOT NULL DEFAULT 1,
      error_message TEXT NULL,
      sent_at DATETIME NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order_email_lookup (order_id, email_type, status),
      CONSTRAINT fk_email_log_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('[db] Email tracking schema is ready.');
} catch (error) {
  console.error('[db] Email migration failed:', error.message);
  throw error;
} finally {
  await pool.end();
}
