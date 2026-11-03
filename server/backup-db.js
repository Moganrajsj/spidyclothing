// ---------------------------------------------------------------------------
// FIX 6 – Pure Node.js Database Backup Script
// ---------------------------------------------------------------------------
// This script exports all tables and rows from the MySQL database into a
// valid SQL dump file, with optional AES-256-GCM encryption.
//
// Why pure Node.js?
//   Hostinger shared hosting and Vercel environments do NOT have the `mysqldump`
//   CLI binary installed. This standalone script uses mysql2 to stream tables
//   and generate portable SQL statements.
//
// Usage:
//   npm run db:backup
//   node --env-file=.env.local server/backup-db.js
//
// Optional Encryption:
//   Set BACKUP_ENCRYPTION_KEY in .env.local (must be a 32-character string or 64-hex key).
//   If present, the backup is saved as .sql.enc using AES-256-GCM.
//
// Restoration Procedure:
//   1. Unencrypted backup:
//      mysql -h $DB_HOST -u $DB_USER -p $DB_NAME < backups/spidy-backup-YYYY-MM-DD-HHmmss.sql
//      Or via Hostinger cPanel / phpMyAdmin -> Import tab.
//
//   2. Encrypted backup:
//      Decrypt first using node:
//      node -e "
//        const crypto = require('crypto');
//        const fs = require('fs');
//        const raw = fs.readFileSync('backups/spidy-backup-....sql.enc');
//        const iv = raw.subarray(0, 12);
//        const tag = raw.subarray(12, 28);
//        const ciphertext = raw.subarray(28);
//        const key = crypto.createHash('sha256').update(process.env.BACKUP_ENCRYPTION_KEY).digest();
//        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
//        decipher.setAuthTag(tag);
//        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
//        fs.writeFileSync('restored.sql', decrypted);
//      "
//      Then import restored.sql.
// ---------------------------------------------------------------------------

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { createPool } from './db.js';

function escapeSqlValue(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return 'NULL';
    return String(val);
  }
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  if (Buffer.isBuffer(val)) {
    return `X'${val.toString('hex')}'`;
  }
  if (typeof val === 'object') {
    val = JSON.stringify(val);
  }
  // Escape string for SQL literal
  const escaped = String(val)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\0/g, '\\0')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\x1a/g, '\\Z');
  return `'${escaped}'`;
}

function encryptBuffer(buffer, secretKey) {
  const key = createHash('sha256').update(secretKey).digest(); // 32 bytes
  const iv = randomBytes(12); // 12-byte IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const tag = cipher.getAuthTag(); // 16 bytes
  return Buffer.concat([iv, tag, ciphertext]);
}

async function runBackup() {
  const startTime = Date.now();
  console.log('[backup] Starting database backup...');

  const pool = createPool(process.env);
  const backupDir = path.resolve(process.cwd(), 'backups');
  await mkdir(backupDir, { recursive: true });

  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const baseFilename = `spidy-backup-${timestamp}`;

  const sqlLines = [];
  sqlLines.push('-- ============================================================');
  sqlLines.push(`-- SPIDY CLOTHING Database Dump`);
  sqlLines.push(`-- Generated: ${now.toISOString()}`);
  sqlLines.push('-- ============================================================');
  sqlLines.push('SET FOREIGN_KEY_CHECKS=0;');
  sqlLines.push('SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";');
  sqlLines.push('SET NAMES utf8mb4;\n');

  try {
    const [tables] = await pool.query('SHOW TABLES');
    const tableNames = tables.map((row) => Object.values(row)[0]);
    console.log(`[backup] Found ${tableNames.length} tables to export.`);

    for (const tableName of tableNames) {
      console.log(`[backup] Exporting table: ${tableName}`);
      sqlLines.push(`-- ------------------------------------------------------------`);
      sqlLines.push(`-- Table structure & data for: \`${tableName}\``);
      sqlLines.push(`-- ------------------------------------------------------------`);
      sqlLines.push(`DROP TABLE IF EXISTS \`${tableName}\`;`);

      const [[createResult]] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
      const createTableSql = createResult['Create Table'];
      sqlLines.push(`${createTableSql};\n`);

      // Export rows in batches of 200
      const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]).map((col) => `\`${col}\``).join(', ');
        const batchSize = 200;
        for (let i = 0; i < rows.length; i += batchSize) {
          const chunk = rows.slice(i, i + batchSize);
          const valuesList = chunk.map((row) => {
            const vals = Object.values(row).map(escapeSqlValue).join(', ');
            return `(${vals})`;
          });
          sqlLines.push(`INSERT INTO \`${tableName}\` (${columns}) VALUES\n  ${valuesList.join(',\n  ')};`);
        }
        sqlLines.push('');
      }
    }

    sqlLines.push('SET FOREIGN_KEY_CHECKS=1;');
    sqlLines.push('-- Dump completed successfully.\n');

    const sqlContent = sqlLines.join('\n');
    const buffer = Buffer.from(sqlContent, 'utf8');

    const encryptionKey = (process.env.BACKUP_ENCRYPTION_KEY || '').trim();
    let finalPath;

    if (encryptionKey) {
      console.log('[backup] BACKUP_ENCRYPTION_KEY provided. Encrypting with AES-256-GCM...');
      const encrypted = encryptBuffer(buffer, encryptionKey);
      finalPath = path.join(backupDir, `${baseFilename}.sql.enc`);
      await writeFile(finalPath, encrypted);
      console.log(`[backup] Encrypted backup written: ${finalPath} (${(encrypted.length / 1024).toFixed(1)} KB)`);
    } else {
      finalPath = path.join(backupDir, `${baseFilename}.sql`);
      await writeFile(finalPath, buffer);
      console.log(`[backup] Backup written: ${finalPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[backup] Database backup completed successfully in ${elapsed}s.`);
  } catch (error) {
    console.error('[backup] Backup failed:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runBackup();

