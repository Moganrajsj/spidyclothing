import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createPool, parseJson } from './db.js';

const pool = createPool();
const schemaPath = fileURLToPath(new URL('./admin-schema.sql', import.meta.url));
const categoryGroups = [
  ['Shirts', ['Cotton Shirts','Baggy Shirts','Party Wear Shirts','Linen Shirts','Embroidery Design Shirts','Body Fit Shirts','Trending Shirts']],
  ['Pants', ['Formal Pants','Linen Pants','Cargo Pants','Lycra Pants','Baggy Pants','Mom Fit Pants','Cotton Pants','Formal Baggy Pants']],
  ['T-Shirts', ['Printed T-Shirts','Oversized T-Shirts','Acid Wash T-Shirts','Collar T-Shirts']],
  ['Track Pants', ['All Track Pants']], ['Shorts', ['All Shorts']], ['Hoodies', ['Hoodies']],
  ['Shoes', ['Baggy Style Shoes','Formal Shoes','Casual Shoes']], ['Watches', ['All Watches']], ['Accessories', ['All Accessories']],
];
const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

async function ensureColumn(table, name, definition) {
  const [[column]] = await pool.execute(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [table, name]);
  if (!column) await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${definition}`);
}

try {
  const schema = await readFile(schemaPath, 'utf8');
  for (const statement of schema.split(';').map((sql) => sql.trim()).filter(Boolean)) await pool.query(statement);

  const productColumns = [
    ['sku', 'VARCHAR(80) NULL'], ['subcategory', 'VARCHAR(100) NULL'], ['category_id', 'BIGINT UNSIGNED NULL'],
    ['subcategory_id', 'BIGINT UNSIGNED NULL'], ['product_status', "ENUM('draft','active','archived') NOT NULL DEFAULT 'active'"],
    ['is_featured', 'BOOLEAN NOT NULL DEFAULT FALSE'], ['is_trending', 'BOOLEAN NOT NULL DEFAULT FALSE'],
    ['is_best_seller', 'BOOLEAN NOT NULL DEFAULT FALSE'], ['is_new_arrival', 'BOOLEAN NOT NULL DEFAULT FALSE'],
  ];
  for (const [name, definition] of productColumns) await ensureColumn('products', name, definition);
  await ensureColumn('order_items', 'variant_id', 'BIGINT UNSIGNED NULL');
  await ensureColumn('order_items', 'restocked', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await ensureColumn('orders', 'tracking_number', 'VARCHAR(100) NULL');
  await ensureColumn('customers', 'is_active', 'BOOLEAN NOT NULL DEFAULT TRUE');
  await pool.query(`ALTER TABLE orders MODIFY order_status ENUM('placed','pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled','returned') NOT NULL DEFAULT 'pending'`);
  await pool.query(`UPDATE orders SET order_status = 'pending' WHERE order_status = 'placed'`);
  const [[skuIndex]] = await pool.execute(`SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='products' AND INDEX_NAME='uq_products_sku' LIMIT 1`);
  if (!skuIndex) await pool.query('ALTER TABLE products ADD UNIQUE INDEX uq_products_sku (sku)');
  const foreignKeys = [
    ['fk_products_category_main','products','category_id','categories','id'],
    ['fk_products_category_sub','products','subcategory_id','categories','id'],
    ['fk_order_items_variant','order_items','variant_id','product_variants','id'],
  ];
  for (const [constraint,table,column,refTable,refColumn] of foreignKeys) {
    const [[found]] = await pool.execute(`SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=? LIMIT 1`,[table,constraint]);
    if(!found) await pool.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${constraint}\` FOREIGN KEY (\`${column}\`) REFERENCES \`${refTable}\`(\`${refColumn}\`) ON DELETE SET NULL`);
  }

  for (let i = 0; i < categoryGroups.length; i++) {
    const [name, children] = categoryGroups[i];
    await pool.execute('INSERT INTO categories (parent_id,name,slug,sort_order) VALUES (NULL,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)', [name, slug(name), i]);
    const [[parent]] = await pool.execute('SELECT id FROM categories WHERE slug = ?', [slug(name)]);
    for (let j = 0; j < children.length; j++) await pool.execute('INSERT INTO categories (parent_id,name,slug,sort_order) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), parent_id=VALUES(parent_id)', [parent.id, children[j], slug(children[j]), j]);
  }

  const [products] = await pool.query('SELECT id,name,category,colors FROM products');
  for (const p of products) {
    const group = p.category === 'shirts' ? 'Shirts' : p.category === 't-shirts' ? 'T-Shirts' : 'Pants';
    const sub = p.category === 'cargos' ? 'Cargo Pants' : null;
    const [[main]] = await pool.execute('SELECT id FROM categories WHERE slug = ?', [slug(group)]);
    const [[child]] = sub ? await pool.execute('SELECT id FROM categories WHERE slug = ?', [slug(sub)]) : [[null]];
    const [[skuRow]] = await pool.execute('SELECT sku FROM products WHERE id = ?', [p.id]);
    const sku = skuRow.sku || `SP-${p.id}`.toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 80);
    await pool.execute('UPDATE products SET category_id=?, subcategory_id=?, subcategory=?, sku=?, product_status=IF(is_active=TRUE,\'active\',\'archived\') WHERE id=?', [main.id, child?.id || null, sub, sku, p.id]);
    const colors = parseJson(p.colors, []);
    if (!colors.length) colors.push('Default');
    const [sizes] = await pool.execute('SELECT size_name,stock FROM product_sizes WHERE product_id=?', [p.id]);
    for (const size of sizes) for (let c = 0; c < colors.length; c++) {
      const variantSku = `${sku}-${String(size.size_name).toUpperCase()}-${slug(colors[c]).toUpperCase()}`.slice(0, 80);
      await pool.execute(`INSERT INTO product_variants (product_id,size_name,color,sku,stock,is_available)
        VALUES (?,?,?,?,?,TRUE) ON DUPLICATE KEY UPDATE sku=IF(sku='',VALUES(sku),sku)`, [p.id, size.size_name, colors[c], variantSku, c === 0 ? Number(size.stock) : 0]);
    }
  }

  await pool.query(`UPDATE order_items oi JOIN product_variants pv ON pv.product_id=oi.product_id AND pv.size_name=oi.size_name AND pv.color=oi.color SET oi.variant_id=pv.id WHERE oi.variant_id IS NULL`);
  await pool.query(`INSERT INTO inventory_movements(variant_id,delta,reason,note) SELECT pv.id,pv.stock,'migration','Initial stock carried forward from size inventory' FROM product_variants pv WHERE NOT EXISTS(SELECT 1 FROM inventory_movements im WHERE im.variant_id=pv.id AND im.reason='migration')`);
  await pool.query(`INSERT INTO payment_records(order_id,method,status) SELECT o.id,'cod',IF(o.payment_status='paid','paid',IF(o.payment_status='refunded','refunded','pending')) FROM orders o LEFT JOIN payment_records pr ON pr.order_id=o.id WHERE pr.id IS NULL`);
  await pool.execute(`INSERT INTO store_settings(setting_key,setting_value) VALUES('store',JSON_OBJECT('storeName','Spidy Clothing','currency','INR')) ON DUPLICATE KEY UPDATE setting_key=VALUES(setting_key)`);
  await pool.execute(`INSERT INTO coupons(code,discount_type,discount_value,minimum_order_amount,is_active) VALUES('SPIDY10','percentage',10,0,TRUE) ON DUPLICATE KEY UPDATE code=VALUES(code)`);
  await pool.execute(`INSERT INTO coupons(code,discount_type,discount_value,minimum_order_amount,is_active) VALUES('WELCOME100','fixed',100,0,TRUE) ON DUPLICATE KEY UPDATE code=VALUES(code)`);

  console.log(`Admin schema ready. Existing ${products.length} products preserved; size stock assigned to each product's first colour.`);
} finally { await pool.end(); }
