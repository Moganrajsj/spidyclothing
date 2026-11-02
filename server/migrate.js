import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createPool } from './db.js';

const pool = createPool();
const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
const productPath = path.resolve('src/data/products.json');

try {
  const schema = await readFile(schemaPath, 'utf8');
  for (const statement of schema.split(';').map((sql) => sql.trim()).filter(Boolean)) await pool.query(statement);

  const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM products');
  if (Number(count) === 0) {
    const products = JSON.parse(await readFile(productPath, 'utf8'));
    const insertProduct = `INSERT INTO products
      (id, slug, name, category, fit, price, old_price, badge, colors, images, rating, review_count, description, fabric_care)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const insertSize = 'INSERT INTO product_sizes (product_id, size_name, stock) VALUES (?, ?, ?)';
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const product of products) {
        await connection.execute(insertProduct, [product.id, product.slug, product.name, product.category, product.fit, product.price, product.oldPrice, product.badge || '', JSON.stringify(product.colors), JSON.stringify(product.images), product.rating, product.reviewCount, product.description, product.fabricCare]);
        for (const size of product.sizes) await connection.execute(insertSize, [product.id, size.name, size.stock]);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    console.log(`Created schema and imported ${products.length} starter products.`);
  } else {
    console.log('Created schema. Existing products found; starter catalog was not imported.');
  }
} finally {
  await pool.end();
}
