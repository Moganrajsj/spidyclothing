import { randomBytes } from 'node:crypto';

const STATE_COOKIE = 'spidy_oauth_state';
const NEXT_COOKIE = 'spidy_oauth_next';
const COOKIE_PATH = '/api/auth/google';
const COOKIE_AGE = 600;

const send = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
};

function requestOrigin(req, env) {
  const appOrigin = (env.APP_ORIGIN || '').trim().replace(/\/$/, '');
  const isLocalAppOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(appOrigin);
  const isProd = env.NODE_ENV === 'production';

  const forwardedProto = req.headers['x-forwarded-proto']?.split(',')[0]?.trim();
  const protocol = forwardedProto || (isProd ? 'https' : 'http');
  const forwardedHost = req.headers['x-forwarded-host']?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.host;

  // In production, never return a localhost origin even if APP_ORIGIN was mistakenly set to localhost
  if (host && (isProd || !appOrigin || isLocalAppOrigin)) {
    return `${protocol}://${host}`.replace(/\/$/, '');
  }

  if (appOrigin && (!isProd || !isLocalAppOrigin)) {
    return appOrigin;
  }

  return `${protocol}://${host || 'spidyclothing.com'}`.replace(/\/$/, '');
}

function safeNext(value) {
  const next = String(value || '/account');
  return next.startsWith('/') && !next.startsWith('//') ? next.slice(0, 200) : '/account';
}

function oauthCookie(name, value, secure, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Path=${COOKIE_PATH}; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

async function jsonRequest(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
}

export function googleConfigured(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}

/**
 * Handles /api/auth/providers and the Google OAuth start/callback routes.
 * Returns true when the request was handled.
 */
export async function handleGoogleAuth({ req, res, url, pool, env, secureCookie, makeSession, cookieValue }) {
  if (url.pathname === '/api/auth/providers') {
    send(res, 200, { google: googleConfigured(env) });
    return true;
  }

  if (url.pathname === '/api/auth/google/start') {
    if (!googleConfigured(env)) {
      send(res, 503, { error: 'Google sign-in is not configured yet.' });
      return true;
    }
    const state = randomBytes(24).toString('base64url');
    const next = safeNext(url.searchParams.get('next'));
    const target = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    target.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    target.searchParams.set('redirect_uri', `${requestOrigin(req, env)}/api/auth/google/callback`);
    target.searchParams.set('response_type', 'code');
    target.searchParams.set('scope', 'openid email profile');
    target.searchParams.set('state', state);
    target.searchParams.set('prompt', 'select_account');
    res.writeHead(302, {
      location: target.toString(),
      'cache-control': 'no-store',
      'set-cookie': [
        oauthCookie(STATE_COOKIE, state, secureCookie, COOKIE_AGE),
        oauthCookie(NEXT_COOKIE, next, secureCookie, COOKIE_AGE),
      ],
    });
    res.end();
    return true;
  }

  if (url.pathname === '/api/auth/google/callback') {
    const clear = [
      oauthCookie(STATE_COOKIE, '', secureCookie, 0),
      oauthCookie(NEXT_COOKIE, '', secureCookie, 0),
    ];
    const fail = (message) => {
      res.writeHead(302, {
        location: `${requestOrigin(req, env)}/account?authError=${encodeURIComponent(message)}`,
        'cache-control': 'no-store',
        'set-cookie': clear,
      });
      res.end();
    };
    try {
      if (!googleConfigured(env)) throw new Error('Google sign-in is not configured yet.');
      const state = url.searchParams.get('state') || '';
      const expected = cookieValue(req, STATE_COOKIE);
      if (!state || !expected || state !== expected) throw new Error('Your sign-in session expired. Please try again.');
      const next = safeNext(cookieValue(req, NEXT_COOKIE));
      const code = url.searchParams.get('code');
      if (!code) throw new Error('Google sign-in was cancelled.');

      const { response: tokenResponse, data: tokenData } = await jsonRequest('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${requestOrigin(req, env)}/api/auth/google/callback`,
          grant_type: 'authorization_code',
        }).toString(),
      });
      if (!tokenResponse.ok || !tokenData.access_token) throw new Error(tokenData.error_description || 'Google sign-in could not be completed.');

      const { response: profileResponse, data: profile } = await jsonRequest('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!profileResponse.ok || !profile.sub || !profile.email) throw new Error('Google did not share your account details.');
      if (profile.email_verified === false) throw new Error('Your Google email address is not verified.');

      const email = String(profile.email).trim().toLowerCase().slice(0, 254);
      const name = String(profile.name || email.split('@')[0]).trim().slice(0, 120) || 'Spidy customer';
      const avatarUrl = typeof profile.picture === 'string' ? profile.picture.slice(0, 512) : null;

      const [rows] = await pool.execute('SELECT id, name, email, phone, avatar_url FROM customers WHERE google_id = ? OR email = ? LIMIT 1', [profile.sub, email]);
      let customer = rows[0];
      if (customer) {
        const keepName = customer.name && customer.name.trim().length >= 2 ? customer.name : name;
        await pool.execute('UPDATE customers SET google_id = ?, avatar_url = ?, name = ? WHERE id = ?', [profile.sub, avatarUrl, keepName, customer.id]);
        customer = { ...customer, name: keepName };
      } else {
        const [result] = await pool.execute('INSERT INTO customers (name, email, google_id, avatar_url) VALUES (?, ?, ?, ?)', [name, email, profile.sub, avatarUrl]);
        customer = { id: result.insertId, name, email, phone: '', avatar_url: avatarUrl };
      }

      await makeSession(pool, customer.id, res, secureCookie);
      const session = res.getHeader('set-cookie');
      res.writeHead(302, {
        location: `${requestOrigin(req, env)}${next}`,
        'cache-control': 'no-store',
        'set-cookie': [...clear, ...(Array.isArray(session) ? session : session ? [session] : [])],
      });
      res.end();
    } catch (error) {
      fail(error instanceof Error ? error.message : 'Google sign-in failed.');
    }
    return true;
  }

  return false;
}
