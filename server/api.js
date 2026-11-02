import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { parseJson } from './db.js';
import { createAdminApi } from './admin-api.js';
import { handleGoogleAuth } from './google-auth.js';

const scrypt = promisify(scryptCallback);
const SESSION_COOKIE = 'spidy_session';
const SESSION_DAYS = 30;
const authAttempts = new Map();

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(body));
};

function cookieValue(req, key) {
  const value = req.headers.cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${key}=`));
  return value ? decodeURIComponent(value.slice(key.length + 1)) : '';
}

function sessionCookie(token, secure) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}

function hashToken(token) { return createHash('sha256').update(token).digest('hex'); }
function publicCustomer(row) { return { id: Number(row.id), name: row.name, email: row.email, phone: row.phone || '', avatarUrl: row.avatar_url || '' }; }

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1024 * 1024) throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  }
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { throw Object.assign(new Error('Invalid JSON body.'), { status: 400 }); }
}

function validateOrigin(req, env) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const protocol = req.headers['x-forwarded-proto']?.split(',')[0]?.trim() || (env.NODE_ENV === 'production' ? 'https' : 'http');
  const expected = env.APP_ORIGIN || `${protocol}://${req.headers.host}`;
  return origin === expected;
}

function rateLimit(req, res) {
  const now = Date.now();
  const ip = req.socket.remoteAddress || 'unknown';
  const current = authAttempts.get(ip);
  if (!current || current.resetAt < now) {
    authAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  if (current.count <= 12) return true;
  send(res, 429, { error: 'Too many attempts. Please try again in a few minutes.' });
  return false;
}

async function passwordHash(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  const [algorithm, saltHex, hashHex] = String(encoded).split('$');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

async function makeSession(pool, customerId, res, secure) {
  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString().slice(0, 19).replace('T', ' ');
  await pool.execute('INSERT INTO customer_sessions (token_hash, customer_id, expires_at) VALUES (?, ?, ?)', [hashToken(token), customerId, expires]);
  res.setHeader('set-cookie', sessionCookie(token, secure));
}

async function findSession(pool, req) {
  const token = cookieValue(req, SESSION_COOKIE);
  if (!token) return null;
  const [rows] = await pool.execute(`SELECT c.id, c.name, c.email, c.phone, c.avatar_url
    FROM customer_sessions s JOIN customers c ON c.id = s.customer_id
    WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND c.is_active=TRUE LIMIT 1`, [hashToken(token)]);
  return rows[0] || null;
}

function requireCustomer(customer) {
  if (!customer) throw Object.assign(new Error('Sign in to continue.'), { status: 401 });
}

async function productSizes(pool, productId) {
  const [rows] = await pool.execute('SELECT size_name AS name, SUM(stock) AS stock FROM product_variants WHERE product_id = ? AND is_available=TRUE GROUP BY size_name ORDER BY size_name', [productId]);
  return rows.map((row) => ({ name: row.name, stock: Number(row.stock) }));
}

async function listProducts(pool, slug = null) {
  const [rows] = slug
    ? await pool.execute('SELECT * FROM products WHERE is_active = TRUE AND slug = ? LIMIT 1', [slug])
    : await pool.query('SELECT * FROM products WHERE is_active = TRUE ORDER BY created_at, id');
  if (!rows.length) return slug ? null : [];
  const ids = rows.map((row) => row.id);
  const [sizes] = await pool.query(`SELECT product_id, size_name AS name, SUM(stock) AS stock FROM product_variants WHERE product_id IN (${ids.map(() => '?').join(',')}) AND is_available=TRUE GROUP BY product_id,size_name ORDER BY size_name`, ids);
  const sizesByProduct = new Map();
  for (const size of sizes) {
    if (!sizesByProduct.has(size.product_id)) sizesByProduct.set(size.product_id, []);
    sizesByProduct.get(size.product_id).push({ name: size.name, stock: Number(size.stock) });
  }
  const result = rows.map((row) => ({
    id: row.id, slug: row.slug, name: row.name, category: row.category, fit: row.fit,
    price: Number(row.price), oldPrice: Number(row.old_price), badge: row.badge,
    colors: parseJson(row.colors, []), sizes: sizesByProduct.get(row.id) || [],
    images: parseJson(row.images, []), rating: Number(row.rating), reviewCount: Number(row.review_count),
    description: row.description, fabricCare: row.fabric_care, subcategory: row.subcategory || '',
  }));
  return slug ? result[0] || null : result;
}

async function readCart(pool, customerId) {
  const [rows] = await pool.execute(`SELECT product_id AS productId, size_name AS size, color, quantity
    FROM cart_items WHERE customer_id = ? ORDER BY updated_at`, [customerId]);
  return rows.map((row) => ({ ...row, quantity: Number(row.quantity) }));
}

async function replaceCart(pool, customerId, items) {
  if (!Array.isArray(items) || items.length > 50) throw Object.assign(new Error('Cart must contain no more than 50 items.'), { status: 400 });
  const normalized = new Map();
  for (const item of items) {
    const productId = String(item.productId || '').slice(0, 64);
    const size = String(item.size || '').slice(0, 24);
    const color = String(item.color || '').slice(0, 48);
    const quantity = Number(item.quantity);
    if (!productId || !size || !color || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw Object.assign(new Error('One or more cart items are invalid.'), { status: 400 });
    const key = `${productId}\u0000${size}\u0000${color}`;
    normalized.set(key, { productId, size, color, quantity: (normalized.get(key)?.quantity || 0) + quantity });
  }
  if ([...normalized.values()].some((item) => item.quantity > 99)) throw Object.assign(new Error('Item quantities cannot exceed 99.'), { status: 400 });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const item of normalized.values()) {
      const [[variant]] = await connection.execute(`SELECT pv.stock,p.is_active,pv.is_available FROM product_variants pv JOIN products p ON p.id=pv.product_id
        WHERE pv.product_id=? AND pv.size_name=? AND pv.color=? FOR UPDATE`, [item.productId, item.size, item.color]);
      if (!variant || !variant.is_active || !variant.is_available || Number(variant.stock) < item.quantity) {
        throw Object.assign(new Error('A selected size or color is no longer available. Please review your cart.'), { status: 409 });
      }
    }
    await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [customerId]);
    for (const item of normalized.values()) await connection.execute(`INSERT INTO cart_items (customer_id, product_id, size_name, color, quantity) VALUES (?, ?, ?, ?, ?)`, [customerId, item.productId, item.size, item.color, item.quantity]);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
  return readCart(pool, customerId);
}

async function readWishlist(pool, customerId) {
  const [rows] = await pool.execute('SELECT product_id FROM wishlist_items WHERE customer_id = ? ORDER BY created_at DESC', [customerId]);
  return rows.map((row) => row.product_id);
}

async function replaceWishlist(pool, customerId, productIds) {
  if (!Array.isArray(productIds) || productIds.length > 100) throw Object.assign(new Error('Wishlist must contain no more than 100 items.'), { status: 400 });
  const ids = [...new Set(productIds.map((id) => String(id).slice(0, 64)).filter(Boolean))];
  if (ids.length) {
    const [rows] = await pool.query(`SELECT id FROM products WHERE is_active = TRUE AND id IN (${ids.map(() => '?').join(',')})`, ids);
    if (rows.length !== ids.length) throw Object.assign(new Error('A wishlist product is unavailable.'), { status: 409 });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute('DELETE FROM wishlist_items WHERE customer_id = ?', [customerId]);
    for (const id of ids) await connection.execute('INSERT INTO wishlist_items (customer_id, product_id) VALUES (?, ?)', [customerId, id]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
  return readWishlist(pool, customerId);
}

function checkoutError(message, status = 400) { return Object.assign(new Error(message), { status }); }

async function createOrder(pool, customer, body) {
  const name = String(body.name || '').trim();
  const phone = String(body.phone || '').replace(/\D/g, '');
  const address = String(body.address || '').trim();
  const city = String(body.city || '').trim();
  const state = String(body.state || '').trim();
  const pincode = String(body.pincode || '').trim();
  if (name.length < 2 || name.length > 120) throw checkoutError('Enter your full name.');
  if (!/^[6-9]\d{9}$/.test(phone)) throw checkoutError('Enter a valid 10-digit Indian mobile number.');
  if (address.length < 6 || address.length > 255 || city.length < 2 || city.length > 100 || state.length < 2 || state.length > 100 || !/^[1-9]\d{5}$/.test(pincode)) throw checkoutError('Check your delivery address and pincode.');
  if (String(body.paymentMethod || 'cod') !== 'cod') throw checkoutError('Online payments are not connected yet. Choose Cash on Delivery.', 409);
  const coupon = String(body.couponCode || '').trim().toUpperCase();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [items] = await connection.execute(`SELECT ci.product_id, ci.size_name, ci.color, ci.quantity,
      p.name, COALESCE(pv.price_override,p.price) AS price, pv.stock,pv.id AS variant_id FROM cart_items ci
      JOIN products p ON p.id = ci.product_id AND p.is_active = TRUE
      JOIN product_variants pv ON pv.product_id=ci.product_id AND pv.size_name=ci.size_name AND pv.color=ci.color AND pv.is_available=TRUE
      WHERE ci.customer_id = ? FOR UPDATE`, [customer.id]);
    if (!items.length) throw checkoutError('Your cart is empty.', 409);
    if (items.some((item) => Number(item.stock) < Number(item.quantity))) throw checkoutError('An item in your cart no longer has enough stock.', 409);
    const subtotal = items.reduce((total, item) => total + Number(item.price) * Number(item.quantity), 0);
    let discount = 0;
    let couponRow = null;
    if (coupon) {
      const [[row]] = await connection.execute('SELECT * FROM coupons WHERE code=? AND is_active=TRUE FOR UPDATE', [coupon]);
      const expired = row?.expires_at && new Date(row.expires_at).getTime() < Date.now();
      if (!row || expired || (row.usage_limit && Number(row.usage_count)>=Number(row.usage_limit)) || subtotal<Number(row.minimum_order_amount)) throw checkoutError('That coupon code is not valid for this order.');
      couponRow=row;
      discount = row.discount_type==='percentage' ? Math.round(subtotal*Number(row.discount_value)/100) : Math.round(Number(row.discount_value));
      if (row.maximum_discount) discount=Math.min(discount,Number(row.maximum_discount));
      discount=Math.min(discount,subtotal);
    }
    const shipping = subtotal >= 1499 ? 0 : 79;
    const total = Math.max(0, subtotal - discount + shipping);
    const orderNumber = `SP-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${randomBytes(4).toString('hex').toUpperCase()}`;
    const [orderResult] = await connection.execute(`INSERT INTO orders
      (order_number, customer_id, customer_name, customer_email, customer_phone, address, city, state, pincode, payment_method, payment_status, order_status, coupon_code, subtotal, discount, shipping, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'cod_due', 'pending', ?, ?, ?, ?, ?)`,
    [orderNumber, customer.id, name, customer.email, phone, address, city, state, pincode, coupon || null, subtotal, discount, shipping, total]);
    for (const item of items) {
      const quantity = Number(item.quantity);
      const [orderItem] = await connection.execute('INSERT INTO order_items (order_id, product_id, variant_id, product_name, size_name, color, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [orderResult.insertId, item.product_id, item.variant_id, item.name, item.size_name, item.color, item.price, quantity, Number(item.price) * quantity]);
      const [changed] = await connection.execute('UPDATE product_variants SET stock = stock - ? WHERE id = ? AND stock >= ?', [quantity, item.variant_id, quantity]);
      if (!changed.affectedRows) throw checkoutError('An item in your cart no longer has enough stock.', 409);
      await connection.execute(`INSERT INTO inventory_movements(variant_id,order_id,delta,reason,note) VALUES(?,?,?,'sale','Customer order')`, [item.variant_id,orderResult.insertId,-quantity]);
    }
    await connection.execute('INSERT INTO payment_records(order_id,method,status) VALUES(? ,\'cod\',\'pending\')',[orderResult.insertId]);
    if(couponRow) await connection.execute('UPDATE coupons SET usage_count=usage_count+1 WHERE id=?',[couponRow.id]);
    await connection.execute('DELETE FROM cart_items WHERE customer_id = ?', [customer.id]);
    await connection.execute('UPDATE customers SET name = ?, phone = ? WHERE id = ?', [name, phone, customer.id]);
    await connection.commit();
    return {
      orderNumber, name, email: customer.email, phone, paymentMethod: 'cod', paymentStatus: 'cod_due',
      orderStatus: 'pending', subtotal, discount, shipping, total,
      items: items.map((item) => ({ name: item.name, productId: item.product_id, size: item.size_name, color: item.color, quantity: Number(item.quantity), total: Number(item.price) * Number(item.quantity) })),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function getOrder(pool, customerId, orderNumber = null) {
  const [orders] = orderNumber
    ? await pool.execute('SELECT * FROM orders WHERE customer_id = ? AND order_number = ? LIMIT 1', [customerId, orderNumber])
    : await pool.execute('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50', [customerId]);
  if (!orders.length) return orderNumber ? null : [];
  const ids = orders.map((order) => order.id);
  const [items] = await pool.query(`SELECT order_id, product_id AS productId, product_name AS name, size_name AS size, color, unit_price AS unitPrice, quantity, line_total AS total FROM order_items WHERE order_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`, ids);
  return orders.map((order) => ({
    orderNumber: order.order_number, name: order.customer_name, email: order.customer_email, phone: order.customer_phone,
    address: order.address, city: order.city, state: order.state, pincode: order.pincode,
    paymentMethod: order.payment_method, paymentStatus: order.payment_status, orderStatus: order.order_status,
    couponCode: order.coupon_code, subtotal: Number(order.subtotal), discount: Number(order.discount),
    shipping: Number(order.shipping), total: Number(order.total), createdAt: order.created_at,
    items: items.filter((item) => Number(item.order_id) === Number(order.id)).map((item) => ({ ...item, unitPrice: Number(item.unitPrice), quantity: Number(item.quantity), total: Number(item.total) })),
  }));
}

export function createApiHandler(pool, env = process.env) {
  const secureCookie = env.NODE_ENV === 'production';
  const adminApi = createAdminApi(pool, env);
  return async function handleApi(req, res) {
    if (req.url?.split('?')[0].startsWith('/api/admin')) return adminApi(req, res);
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const method = req.method || 'GET';
    try {
      if (method === 'GET' && url.pathname === '/api/health') {
        await pool.query('SELECT 1');
        return send(res, 200, { ok: true, database: 'connected' });
      }
      if (method === 'GET' && url.pathname === '/api/products') return send(res, 200, { products: await listProducts(pool) });
      if (method === 'GET' && url.pathname.startsWith('/api/products/')) {
        const product = await listProducts(pool, decodeURIComponent(url.pathname.slice('/api/products/'.length)));
        return product ? send(res, 200, { product }) : send(res, 404, { error: 'Product not found.' });
      }
      if (await handleGoogleAuth({ req, res, url, pool, env, secureCookie, makeSession, cookieValue })) return;
      if (method === 'POST' && url.pathname === '/api/coupons/validate') {
        if (!validateOrigin(req, env)) return send(res, 403, { error: 'Request origin is not allowed.' });
        const body = await readBody(req);
        const code = String(body.code || '').trim().toUpperCase();
        const subtotal = Number(body.subtotal);
        if (!Number.isFinite(subtotal) || subtotal < 0) return send(res, 400, { error: 'Order subtotal is invalid.' });
        const [[coupon]] = await pool.execute('SELECT * FROM coupons WHERE code=? AND is_active=TRUE', [code]);
        const expired = coupon?.expires_at && new Date(coupon.expires_at).getTime() < Date.now();
        if (!coupon || expired || (coupon.usage_limit && Number(coupon.usage_count)>=Number(coupon.usage_limit)) || subtotal<Number(coupon.minimum_order_amount)) return send(res, 400, { error: 'That coupon code is not valid for this order.' });
        let discount = coupon.discount_type==='percentage' ? Math.round(subtotal*Number(coupon.discount_value)/100) : Math.round(Number(coupon.discount_value));
        if(coupon.maximum_discount) discount=Math.min(discount,Number(coupon.maximum_discount));
        return send(res, 200, { code, discount: Math.min(discount,subtotal) });
      }

      const isAuthAttempt = method === 'POST' && ['/api/auth/register', '/api/auth/login'].includes(url.pathname);
      if (isAuthAttempt && !rateLimit(req, res)) return;
      if (method !== 'GET' && !validateOrigin(req, env)) return send(res, 403, { error: 'Request origin is not allowed.' });
      const body = method === 'GET' ? {} : await readBody(req);

      if (method === 'POST' && url.pathname === '/api/newsletter') {
        const email = String(body.email || '').trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return send(res, 400, { error: 'Enter a valid email address.' });
        await pool.execute('INSERT INTO newsletter_subscribers (email, source) VALUES (?, ?) ON DUPLICATE KEY UPDATE source = ?', [email, 'home', 'home']);
        return send(res, 200, { ok: true });
      }

      if (method === 'POST' && url.pathname === '/api/auth/register') {
        const name = String(body.name || '').trim();
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        if (name.length < 2 || name.length > 120) return send(res, 400, { error: 'Enter a name between 2 and 120 characters.' });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return send(res, 400, { error: 'Enter a valid email address.' });
        if (password.length < 8 || password.length > 128) return send(res, 400, { error: 'Password must be 8 to 128 characters long.' });
        const encodedPassword = await passwordHash(password);
        const [result] = await pool.execute('INSERT INTO customers (name, email, password_hash) VALUES (?, ?, ?)', [name, email, encodedPassword]).catch((error) => {
          if (error.code === 'ER_DUP_ENTRY') throw Object.assign(new Error('An account with that email already exists.'), { status: 409 });
          throw error;
        });
        const customer = { id: Number(result.insertId), name, email, phone: '', avatarUrl: '' };
        await makeSession(pool, customer.id, res, secureCookie);
        return send(res, 201, { user: customer });
      }
      if (method === 'POST' && url.pathname === '/api/auth/login') {
        const email = String(body.email || '').trim().toLowerCase();
        const password = String(body.password || '');
        if (password.length > 128) return send(res, 400, { error: 'Password is too long.' });
        const [rows] = await pool.execute('SELECT id, name, email, phone, avatar_url, password_hash, google_id, is_active FROM customers WHERE email = ? LIMIT 1', [email]);
        const account = rows[0];
        if (!account || !account.is_active) return send(res, 401, { error: 'Email or password is incorrect.' });
        if (!account.password_hash) return send(res, 401, { error: 'This account uses Google sign-in. Continue with Google instead.' });
        if (!await verifyPassword(password, account.password_hash)) return send(res, 401, { error: 'Email or password is incorrect.' });
        await makeSession(pool, account.id, res, secureCookie);
        return send(res, 200, { user: publicCustomer(account) });
      }

      const customer = await findSession(pool, req);
      if (method === 'GET' && url.pathname === '/api/auth/me') return send(res, 200, { user: customer ? publicCustomer(customer) : null });
      if (method === 'PUT' && url.pathname === '/api/auth/profile') {
        requireCustomer(customer);
        const name = String(body.name || '').trim();
        const phone = String(body.phone || '').trim();
        if (name.length < 2 || name.length > 120) return send(res, 400, { error: 'Enter a name between 2 and 120 characters.' });
        if (phone && !/^[6-9][0-9]{9}$/.test(phone)) return send(res, 400, { error: 'Enter a valid 10-digit mobile number.' });
        await pool.execute('UPDATE customers SET name = ?, phone = ? WHERE id = ?', [name, phone || null, customer.id]);
        return send(res, 200, { user: { ...publicCustomer(customer), name, phone } });
      }
      if (method === 'POST' && url.pathname === '/api/auth/logout') {
        const token = cookieValue(req, SESSION_COOKIE);
        if (token) await pool.execute('DELETE FROM customer_sessions WHERE token_hash = ?', [hashToken(token)]);
        return send(res, 200, { ok: true }, { 'set-cookie': `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookie ? '; Secure' : ''}` });
      }

      if (url.pathname === '/api/cart' && method === 'GET') {
        requireCustomer(customer);
        return send(res, 200, { items: await readCart(pool, customer.id) });
      }
      if (url.pathname === '/api/cart' && method === 'PUT') {
        requireCustomer(customer);
        return send(res, 200, { items: await replaceCart(pool, customer.id, body.items) });
      }
      if (url.pathname === '/api/wishlist' && method === 'GET') {
        requireCustomer(customer);
        return send(res, 200, { productIds: await readWishlist(pool, customer.id) });
      }
      if (url.pathname === '/api/wishlist' && method === 'PUT') {
        requireCustomer(customer);
        return send(res, 200, { productIds: await replaceWishlist(pool, customer.id, body.productIds) });
      }
      if (url.pathname === '/api/orders' && method === 'POST') {
        requireCustomer(customer);
        return send(res, 201, { order: await createOrder(pool, customer, body) });
      }
      if (url.pathname === '/api/orders' && method === 'GET') {
        requireCustomer(customer);
        return send(res, 200, { orders: await getOrder(pool, customer.id) });
      }
      if (url.pathname.startsWith('/api/orders/') && method === 'GET') {
        requireCustomer(customer);
        const order = await getOrder(pool, customer.id, decodeURIComponent(url.pathname.slice('/api/orders/'.length)));
        return order ? send(res, 200, { order }) : send(res, 404, { error: 'Order not found.' });
      }
      return send(res, 404, { error: 'API route not found.' });
    } catch (error) {
      const status = Number(error.status) || (error.code === 'ER_DUP_ENTRY' ? 409 : 500);
      if (status >= 500) {
        console.error('[api]', error.code || error.name || 'Error', '-', error.message);
        if (error.code === 'ER_NO_SUCH_TABLE') console.error('[api] Database schema is incomplete. Run "npm run db:migrate" and restart the server.');
      }
      return send(res, status, { error: status >= 500 ? 'The request could not be completed. Please try again.' : error.message });
    }
  };
}
