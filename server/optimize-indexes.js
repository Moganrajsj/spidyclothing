// ---------------------------------------------------------------------------
// FIX 7 – Database Query & Index Optimization
// ---------------------------------------------------------------------------
// Idempotently creates composite indexes to eliminate full table scans and
// filesorts on high-frequency e-commerce queries:
//
// 1. idx_products_active_created_id ON products(is_active, created_at, id)
//    Accelerates GET /api/products catalog listing (filters by is_active, sorts by created_at).
//
// 2. idx_orders_status_created ON orders(order_status, created_at)
//    Accelerates admin dashboard metrics, daily/monthly revenue aggregation, and order filtering.
//
// 3. idx_orders_customer_created ON orders(customer_id, created_at)
//    Accelerates customer profile / order history queries.
//
// 4. idx_variants_prod_avail_size ON product_variants(product_id, is_available, size_name)
//    Optimizes variant aggregation across products and stock availability checks.
//
// 5. idx_inv_movements_created ON inventory_movements(created_at)
//    Speeds up admin inventory audit log ordering (ORDER BY created_at DESC LIMIT 50).
//
// Usage:
//   npm run db:optimize-indexes
//   node --env-file=.env.local server/optimize-indexes.js
// ---------------------------------------------------------------------------

import { createPool } from './db.js';

const TARGET_INDEXES = [
  {
    table: 'products',
    indexName: 'idx_products_active_created_id',
    columns: ['is_active', 'created_at', 'id'],
    reason: 'Eliminates filesort on GET /api/products listing query',
  },
  {
    table: 'orders',
    indexName: 'idx_orders_status_created',
    columns: ['order_status', 'created_at'],
    reason: 'Speeds up admin dashboard order status aggregations & revenue calculations',
  },
  {
    table: 'orders',
    indexName: 'idx_orders_customer_created',
    columns: ['customer_id', 'created_at'],
    reason: 'Optimizes customer order history queries (WHERE customer_id=? ORDER BY created_at DESC)',
  },
  {
    table: 'product_variants',
    indexName: 'idx_variants_prod_avail_size',
    columns: ['product_id', 'is_available', 'size_name'],
    reason: 'Optimizes variant joins and availability checks in product catalog queries',
  },
  {
    table: 'inventory_movements',
    indexName: 'idx_inv_movements_created',
    columns: ['created_at'],
    reason: 'Eliminates filesort on admin inventory audit history query',
  },
];

async function checkIndexExists(pool, dbName, table, indexName) {
  const [rows] = await pool.query(
    `SELECT COUNT(1) AS count 
     FROM information_schema.STATISTICS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [dbName, table, indexName]
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function checkTableExists(pool, dbName, table) {
  const [rows] = await pool.query(
    `SELECT COUNT(1) AS count 
     FROM information_schema.TABLES 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [dbName, table]
  );
  return Number(rows[0]?.count || 0) > 0;
}

async function optimizeIndexes() {
  const pool = createPool(process.env);
  const dbName = process.env.DB_NAME;

  console.log(`[indexes] Checking database indexes for schema: ${dbName}...`);
  let addedCount = 0;
  let skippedCount = 0;

  try {
    for (const item of TARGET_INDEXES) {
      const tableExists = await checkTableExists(pool, dbName, item.table);
      if (!tableExists) {
        console.warn(`[indexes] Table "${item.table}" does not exist in schema. Skipping.`);
        continue;
      }

      const exists = await checkIndexExists(pool, dbName, item.table, item.indexName);
      if (exists) {
        console.log(`[indexes] OK: Index "${item.indexName}" on table "${item.table}" already exists. (Skipping)`);
        skippedCount++;
      } else {
        console.log(`[indexes] Adding index "${item.indexName}" ON ${item.table}(${item.columns.join(', ')})...`);
        console.log(`          Reason: ${item.reason}`);
        const colList = item.columns.map((c) => `\`${c}\``).join(', ');
        await pool.query(`ALTER TABLE \`${item.table}\` ADD INDEX \`${item.indexName}\` (${colList})`);
        console.log(`[indexes] SUCCESS: Index "${item.indexName}" created.`);
        addedCount++;
      }
    }

    console.log(`\n[indexes] Finished index optimization: ${addedCount} added, ${skippedCount} already present.`);
  } catch (error) {
    console.error('[indexes] Failed to optimize indexes:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

optimizeIndexes();

