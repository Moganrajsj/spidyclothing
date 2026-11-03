import nodemailer from 'nodemailer';

/**
 * Standard RFC 5322 compatible email validator
 */
export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const clean = email.trim();
  if (clean.length < 5 || clean.length > 254) return false;
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(clean);
}

/**
 * Currency formatter for emails (₹)
 */
function formatMoney(amount) {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

/**
 * Formats date into readable string (e.g. 02 Nov 2026, 05:30 PM)
 */
function formatDate(date) {
  try {
    const d = date ? new Date(date) : new Date();
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return String(date || 'Recent');
  }
}

/**
 * Escape HTML to prevent injection in email templates
 */
function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Creates a Nodemailer transport with timeout protections
 */
function createTransporter(env = process.env, overridePort = null) {
  const host = env.SMTP_HOST || 'smtp.hostinger.com';
  const defaultPort = Number(env.SMTP_PORT || 465);
  const port = overridePort !== null ? Number(overridePort) : defaultPort;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;

  // Port 465 uses direct SSL (secure: true). Port 587 uses STARTTLS (secure: false).
  const secure = overridePort !== null
    ? port === 465
    : (env.SMTP_SECURE === 'true' || env.SMTP_SECURE === true || port === 465);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
    },
  });
}

/**
 * Reusable mail sender with automatic fallback (port 465 -> 587) and retry
 */
export async function sendMailWithFallback({ mailOptions, env = process.env }) {
  const configuredPort = Number(env.SMTP_PORT || 465);
  let attempts = 0;
  let lastError = null;

  // First attempt with configured port
  try {
    attempts += 1;
    const transporter = createTransporter(env);
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId, attempts, port: configuredPort };
  } catch (err) {
    lastError = err;
    console.warn(`[email] Attempt 1 failed on port ${configuredPort}: ${err.message}`);
  }

  // Fallback to port 587 (if configured port was 465) or port 465 (if configured was 587)
  const fallbackPort = configuredPort === 465 ? 587 : 465;
  try {
    attempts += 1;
    console.log(`[email] Retrying via fallback port ${fallbackPort}...`);
    // Brief backoff
    await new Promise((r) => setTimeout(r, 1000));
    const fallbackTransporter = createTransporter(env, fallbackPort);
    const info = await fallbackTransporter.sendMail(mailOptions);
    console.log(`[email] Sent successfully via fallback port ${fallbackPort}`);
    return { success: true, messageId: info.messageId, attempts, port: fallbackPort };
  } catch (fallbackErr) {
    attempts += 1;
    lastError = fallbackErr;
    console.error(`[email] Fallback attempt failed on port ${fallbackPort}: ${fallbackErr.message}`);
  }

  return { success: false, error: lastError?.message || 'Email delivery failed', attempts };
}

/**
 * Builds HTML for Order Confirmation
 */
export function buildOrderConfirmationHtml({ order, items, env = process.env }) {
  const appOrigin = env.APP_ORIGIN || 'https://spidyclothing.com';
  const customerName = escapeHtml(order.customer_name || 'Valued Customer');
  const orderNumber = escapeHtml(order.order_number);
  const orderDate = formatDate(order.created_at);
  const paymentMethod = order.payment_method === 'cod' ? 'Cash on Delivery (COD)' : escapeHtml(order.payment_method?.toUpperCase() || 'COD');
  const paymentStatus = order.payment_status === 'paid' ? 'Paid' : 'Due on Delivery';

  const rows = items.map((item) => `
    <tr>
      <td style="padding: 12px 10px; border-bottom: 1px solid #EEF2F9; vertical-align: middle;">
        <strong style="color: #0A1A3F; font-size: 14px; display: block;">${escapeHtml(item.product_name)}</strong>
        <span style="color: #70798A; font-size: 12px; display: block; margin-top: 3px;">
          Size: <b style="color: #182136;">${escapeHtml(item.size_name)}</b> &nbsp;·&nbsp;
          Colour: <b style="color: #182136;">${escapeHtml(item.color)}</b>
        </span>
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #EEF2F9; text-align: center; color: #182136; font-size: 13px;">
        ${escapeHtml(item.quantity)}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #EEF2F9; text-align: right; color: #182136; font-size: 13px;">
        ${formatMoney(item.unit_price)}
      </td>
      <td style="padding: 12px 10px; border-bottom: 1px solid #EEF2F9; text-align: right; color: #0A1A3F; font-weight: 700; font-size: 13px;">
        ${formatMoney(item.line_total)}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order #${orderNumber} Confirmed</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #182136; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F6FA; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 10px; overflow: hidden; border: 1px solid #E2E7EF; box-shadow: 0 4px 16px rgba(10, 26, 63, 0.06);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #0A1A3F; padding: 26px 30px; text-align: center;">
              <table role="presentation" align="center" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #E02438; color: #FFFFFF; font-weight: 800; font-size: 20px; width: 34px; height: 34px; border-radius: 6px 2px 6px 2px; text-align: center; vertical-align: middle; line-height: 34px;">
                    S
                  </td>
                  <td style="padding-left: 10px; text-align: left;">
                    <span style="color: #FFFFFF; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; display: block; line-height: 1.1;">SPIDY CLOTHING</span>
                    <span style="color: #A8C0FF; font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Everyday Essentials</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Confirmation Banner -->
          <tr>
            <td style="background-color: #F0FDF4; border-bottom: 1px solid #DCFCE7; padding: 18px 30px; text-align: center;">
              <span style="display: inline-block; background-color: #16A34A; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px;">✓ Order Confirmed</span>
              <h1 style="margin: 6px 0 2px; color: #0A1A3F; font-size: 22px; font-weight: 700;">Thanks for your order, ${customerName}!</h1>
              <p style="margin: 0; color: #4B5563; font-size: 13px;">We have received your order and are preparing it with care.</p>
            </td>
          </tr>

          <!-- Order Summary Meta Box -->
          <tr>
            <td style="padding: 24px 30px 10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px;">
                <tr>
                  <td width="50%" style="vertical-align: top; padding: 4px 8px;">
                    <span style="color: #70798A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Order Number</span>
                    <strong style="color: #0A1A3F; font-size: 15px;">#${orderNumber}</strong>
                  </td>
                  <td width="50%" style="vertical-align: top; padding: 4px 8px;">
                    <span style="color: #70798A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Order Date</span>
                    <strong style="color: #0A1A3F; font-size: 14px;">${orderDate}</strong>
                  </td>
                </tr>
                <tr>
                  <td width="50%" style="vertical-align: top; padding: 10px 8px 4px;">
                    <span style="color: #70798A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Payment Method</span>
                    <strong style="color: #0A1A3F; font-size: 14px;">${paymentMethod}</strong>
                  </td>
                  <td width="50%" style="vertical-align: top; padding: 10px 8px 4px;">
                    <span style="color: #70798A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Payment Status</span>
                    <strong style="color: #D97706; font-size: 14px;">${paymentStatus}</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 15px 30px;">
              <h2 style="margin: 0 0 12px; color: #0A1A3F; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Items Ordered</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                    <th align="left" style="padding: 10px; color: #4B5563; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Product</th>
                    <th align="center" style="padding: 10px; color: #4B5563; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
                    <th align="right" style="padding: 10px; color: #4B5563; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
                    <th align="right" style="padding: 10px; color: #4B5563; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Totals Section -->
          <tr>
            <td style="padding: 10px 30px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #0A1A3F; padding-top: 12px;">
                <tr>
                  <td style="padding: 4px 0; color: #70798A; font-size: 13px;">Subtotal</td>
                  <td align="right" style="padding: 4px 0; color: #182136; font-size: 13px; font-weight: 600;">${formatMoney(order.subtotal)}</td>
                </tr>
                ${Number(order.discount) > 0 ? `
                <tr>
                  <td style="padding: 4px 0; color: #E02438; font-size: 13px;">Discount ${order.coupon_code ? `(${escapeHtml(order.coupon_code)})` : ''}</td>
                  <td align="right" style="padding: 4px 0; color: #E02438; font-size: 13px; font-weight: 600;">−${formatMoney(order.discount)}</td>
                </tr>` : ''}
                <tr>
                  <td style="padding: 4px 0; color: #70798A; font-size: 13px;">Delivery Charges</td>
                  <td align="right" style="padding: 4px 0; color: #182136; font-size: 13px; font-weight: 600;">${Number(order.shipping) === 0 ? '<span style="color: #16A34A; font-weight: 700;">FREE</span>' : formatMoney(order.shipping)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0 6px; border-top: 1px solid #E2E7EF; color: #0A1A3F; font-size: 16px; font-weight: 800;">Final Amount</td>
                  <td align="right" style="padding: 12px 0 6px; border-top: 1px solid #E2E7EF; color: #E02438; font-size: 18px; font-weight: 800;">${formatMoney(order.total)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Address Box -->
          <tr>
            <td style="padding: 10px 30px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 8px; color: #0A1A3F; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📍 Delivery Address</h3>
                    <p style="margin: 0; color: #374151; font-size: 13px; line-height: 1.6;">
                      <strong>${customerName}</strong><br>
                      ${escapeHtml(order.address)}<br>
                      ${escapeHtml(order.city)}, ${escapeHtml(order.state)} - <strong>${escapeHtml(order.pincode)}</strong><br>
                      Phone: <strong>+91 ${escapeHtml(order.customer_phone)}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Support & Help -->
          <tr>
            <td style="background-color: #EEF2F9; padding: 20px 30px; text-align: center;">
              <h3 style="margin: 0 0 6px; color: #0A1A3F; font-size: 14px; font-weight: 700;">Need Help With Your Order?</h3>
              <p style="margin: 0 0 12px; color: #4B5563; font-size: 12px; line-height: 1.5;">
                Our customer care team is available Monday–Saturday, 10:00 AM–8:00 PM.<br>
                Reply directly to this email or contact us at <a href="mailto:support@spidyclothing.com" style="color: #2F6BFF; font-weight: 600; text-decoration: none;">support@spidyclothing.com</a>.
              </p>
              <a href="${appOrigin}/account" style="display: inline-block; background-color: #0A1A3F; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 10px 18px; border-radius: 6px; text-decoration: none; letter-spacing: 0.5px; text-transform: uppercase;">View Order in My Account</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #07132E; color: #9AA4B4; padding: 22px 30px; text-align: center; font-size: 11px; line-height: 1.6;">
              <strong style="color: #FFFFFF; font-size: 12px;">SPIDY CLOTHING</strong><br>
              Good clothes for every day.<br>
              <span style="color: #6B7280; font-size: 10px;">This automated confirmation was sent to ${escapeHtml(order.customer_email)}.</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Builds Plaintext for Order Confirmation fallback
 */
export function buildOrderConfirmationText({ order, items }) {
  const customerName = order.customer_name || 'Valued Customer';
  const orderNumber = order.order_number;
  const orderDate = formatDate(order.created_at);

  const itemLines = items
    .map((item) => `- ${item.product_name} | Size: ${item.size_name} | Colour: ${item.color} | Qty: ${item.quantity} | Total: ${formatMoney(item.line_total)}`)
    .join('\n');

  return `
SPIDY CLOTHING - ORDER CONFIRMED

Hi ${customerName},

Thank you for your order! We have received your order #${orderNumber} placed on ${orderDate}.

ORDER DETAILS:
Order Number: #${orderNumber}
Order Date: ${orderDate}
Payment Method: ${order.payment_method === 'cod' ? 'Cash on Delivery (COD)' : order.payment_method}
Payment Status: ${order.payment_status === 'paid' ? 'Paid' : 'Due on Delivery'}

ITEMS:
${itemLines}

SUMMARY:
Subtotal: ${formatMoney(order.subtotal)}
Discount: -${formatMoney(order.discount || 0)}
Shipping: ${Number(order.shipping) === 0 ? 'FREE' : formatMoney(order.shipping)}
Total: ${formatMoney(order.total)}

DELIVERY ADDRESS:
${customerName}
${order.address}
${order.city}, ${order.state} - ${order.pincode}
Phone: ${order.customer_phone}

CUSTOMER SUPPORT:
Need help? Reply to this email or write to support@spidyclothing.com.
Store Hours: Monday–Saturday, 10:00 AM–8:00 PM.

SPIDY CLOTHING · Good clothes for every day.
`.trim();
}

/**
 * Builds HTML for Order Cancellation
 */
export function buildOrderCancellationHtml({ order, items, reason, env = process.env }) {
  const appOrigin = env.APP_ORIGIN || 'https://spidyclothing.com';
  const customerName = escapeHtml(order.customer_name || 'Valued Customer');
  const orderNumber = escapeHtml(order.order_number);
  const cancelDate = formatDate(new Date());

  const rows = items.map((item) => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid #EEF2F9;">
        <strong style="color: #0A1A3F; font-size: 13px;">${escapeHtml(item.product_name)}</strong>
        <span style="color: #70798A; font-size: 11px; display: block;">Size: ${escapeHtml(item.size_name)} · Colour: ${escapeHtml(item.color)}</span>
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #EEF2F9; text-align: center; color: #182136; font-size: 12px;">
        ${escapeHtml(item.quantity)}
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #EEF2F9; text-align: right; color: #0A1A3F; font-weight: 600; font-size: 12px;">
        ${formatMoney(item.line_total)}
      </td>
    </tr>
  `).join('');

  const isPaid = order.payment_status === 'paid';
  const refundInfo = isPaid
    ? `<div style="background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 6px; padding: 12px 14px; margin-top: 14px;">
        <strong style="color: #92400E; font-size: 13px; display: block; margin-bottom: 4px;">💳 Refund Initiated</strong>
        <p style="margin: 0; color: #78350F; font-size: 12px; line-height: 1.5;">
          A full refund of <strong>${formatMoney(order.total)}</strong> has been initiated and will be credited to your original payment method within <strong>5–7 business days</strong>.
        </p>
      </div>`
    : `<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 12px 14px; margin-top: 14px;">
        <strong style="color: #0A1A3F; font-size: 13px; display: block; margin-bottom: 4px;">💵 Payment & Refund Status</strong>
        <p style="margin: 0; color: #4B5563; font-size: 12px; line-height: 1.5;">
          This order was placed under <strong>Cash on Delivery (COD)</strong>. No payment was collected, and no refund is required.
        </p>
      </div>`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order #${orderNumber} Cancelled</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F6FA; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #182136; line-height: 1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F4F6FA; padding: 30px 15px;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 10px; overflow: hidden; border: 1px solid #E2E7EF; box-shadow: 0 4px 16px rgba(10, 26, 63, 0.06);">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #0A1A3F; padding: 26px 30px; text-align: center;">
              <table role="presentation" align="center" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #E02438; color: #FFFFFF; font-weight: 800; font-size: 20px; width: 34px; height: 34px; border-radius: 6px 2px 6px 2px; text-align: center; vertical-align: middle; line-height: 34px;">
                    S
                  </td>
                  <td style="padding-left: 10px; text-align: left;">
                    <span style="color: #FFFFFF; font-size: 18px; font-weight: 800; letter-spacing: 0.5px; display: block; line-height: 1.1;">SPIDY CLOTHING</span>
                    <span style="color: #A8C0FF; font-size: 8px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;">Everyday Essentials</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Cancellation Header Banner -->
          <tr>
            <td style="background-color: #FFF1F2; border-bottom: 1px solid #FFE4E6; padding: 20px 30px; text-align: center;">
              <span style="display: inline-block; background-color: #E02438; color: #FFFFFF; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 20px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px;">Order Cancelled</span>
              <h1 style="margin: 6px 0 4px; color: #0A1A3F; font-size: 22px; font-weight: 700;">Order #${orderNumber} Has Been Cancelled</h1>
              <p style="margin: 0; color: #4B5563; font-size: 13px;">Hi ${customerName}, your cancellation request has been processed successfully.</p>
            </td>
          </tr>

          <!-- Cancellation Metadata -->
          <tr>
            <td style="padding: 24px 30px 10px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 14px 16px;">
                <tr>
                  <td width="50%" style="vertical-align: top; padding: 4px 8px;">
                    <span style="color: #70798A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Order Number</span>
                    <strong style="color: #0A1A3F; font-size: 14px;">#${orderNumber}</strong>
                  </td>
                  <td width="50%" style="vertical-align: top; padding: 4px 8px;">
                    <span style="color: #70798A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Cancellation Date</span>
                    <strong style="color: #0A1A3F; font-size: 14px;">${cancelDate}</strong>
                  </td>
                </tr>
                ${reason ? `
                <tr>
                  <td colspan="2" style="vertical-align: top; padding: 10px 8px 4px;">
                    <span style="color: #70798A; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: block;">Cancellation Reason</span>
                    <span style="color: #182136; font-size: 13px;">${escapeHtml(reason)}</span>
                  </td>
                </tr>` : ''}
              </table>

              <!-- Refund Details Block -->
              ${refundInfo}
            </td>
          </tr>

          <!-- Cancelled Products -->
          <tr>
            <td style="padding: 16px 30px;">
              <h2 style="margin: 0 0 10px; color: #0A1A3F; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Cancelled Items</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #F8FAFC; border-bottom: 2px solid #E2E8F0;">
                    <th align="left" style="padding: 8px; color: #4B5563; font-size: 11px; text-transform: uppercase;">Product</th>
                    <th align="center" style="padding: 8px; color: #4B5563; font-size: 11px; text-transform: uppercase;">Qty</th>
                    <th align="right" style="padding: 8px; color: #4B5563; font-size: 11px; text-transform: uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Shop Again CTA -->
          <tr>
            <td style="padding: 10px 30px 24px; text-align: center;">
              <p style="margin: 0 0 14px; color: #4B5563; font-size: 13px;">
                Looking for something else? Explore our newest arrivals and everyday essentials.
              </p>
              <a href="${appOrigin}/shop" style="display: inline-block; background-color: #E02438; color: #FFFFFF; font-size: 12px; font-weight: 700; padding: 11px 22px; border-radius: 6px; text-decoration: none; letter-spacing: 0.6px; text-transform: uppercase;">Browse Catalog</a>
            </td>
          </tr>

          <!-- Support Contact -->
          <tr>
            <td style="background-color: #EEF2F9; padding: 18px 30px; text-align: center;">
              <h3 style="margin: 0 0 4px; color: #0A1A3F; font-size: 13px; font-weight: 700;">Questions About Your Cancellation?</h3>
              <p style="margin: 0; color: #4B5563; font-size: 12px; line-height: 1.5;">
                Contact our support team at <a href="mailto:support@spidyclothing.com" style="color: #2F6BFF; font-weight: 600; text-decoration: none;">support@spidyclothing.com</a>.<br>
                Reply-To address is monitored during business hours (Mon–Sat, 10 AM–8 PM).
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #07132E; color: #9AA4B4; padding: 20px 30px; text-align: center; font-size: 11px; line-height: 1.6;">
              <strong style="color: #FFFFFF; font-size: 12px;">SPIDY CLOTHING</strong><br>
              Good clothes for every day.<br>
              <span style="color: #6B7280; font-size: 10px;">Sent to ${escapeHtml(order.customer_email)}.</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Builds Plaintext for Order Cancellation fallback
 */
export function buildOrderCancellationText({ order, items, reason }) {
  const customerName = order.customer_name || 'Valued Customer';
  const orderNumber = order.order_number;
  const cancelDate = formatDate(new Date());

  const itemLines = items
    .map((item) => `- ${item.product_name} | Size: ${item.size_name} | Colour: ${item.color} | Qty: ${item.quantity} | Amount: ${formatMoney(item.line_total)}`)
    .join('\n');

  const isPaid = order.payment_status === 'paid';
  const refundText = isPaid
    ? `Refund of ${formatMoney(order.total)} has been initiated and will credit within 5-7 business days.`
    : `Payment was Cash on Delivery (COD). No payment was collected and no refund is required.`;

  return `
SPIDY CLOTHING - ORDER CANCELLED

Hi ${customerName},

Your order #${orderNumber} has been cancelled on ${cancelDate}.

ORDER DETAILS:
Order Number: #${orderNumber}
Cancellation Date: ${cancelDate}
${reason ? `Reason: ${reason}` : ''}

PAYMENT & REFUND:
${refundText}

CANCELLED ITEMS:
${itemLines}

Total Order Value: ${formatMoney(order.total)}

QUESTIONS?
If you have any questions or cancelled by mistake, write to support@spidyclothing.com.

SPIDY CLOTHING · Good clothes for every day.
`.trim();
}

/**
 * Send Order Confirmation Email
 * Strictly checks for duplicates before sending.
 * Only marks sent upon successful delivery.
 * Logs failure without disrupting the customer checkout flow.
 */
export async function sendOrderConfirmationEmail({ pool, orderId, env = process.env }) {
  try {
    // 1. Fetch order details with FOR UPDATE lock or check flags
    const [[order]] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? OR order_number = ? LIMIT 1',
      [Number(orderId) || -1, String(orderId)]
    );

    if (!order) {
      console.warn(`[email] Order ${orderId} not found. Skipping confirmation email.`);
      return { success: false, error: 'Order not found' };
    }

    // 2. Duplicate Prevention
    if (order.confirmation_email_sent) {
      console.log(`[email] Confirmation email for order #${order.order_number} already sent. Skipping.`);
      return { success: true, duplicate: true };
    }

    // 3. Email validation
    const recipient = String(order.customer_email || '').trim();
    if (!isValidEmail(recipient)) {
      console.error(`[email] Invalid customer email '${recipient}' for order #${order.order_number}.`);
      await pool.execute(
        `INSERT INTO order_email_logs (order_id, order_number, email_type, recipient_email, status, error_message)
         VALUES (?, ?, 'confirmation', ?, 'failed', ?)`,
        [order.id, order.order_number, recipient || 'unknown', 'Invalid email address format']
      );
      return { success: false, error: 'Invalid email address format' };
    }

    // 4. Fetch order items
    const [items] = await pool.execute(
      'SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC',
      [order.id]
    );

    const fromAddress = env.MAIL_FROM || 'orders@spidyclothing.com';
    const fromName = env.MAIL_FROM_NAME || 'SPIDY CLOTHING';
    const replyTo = env.MAIL_REPLY_TO || 'support@spidyclothing.com';
    const subject = `Your SPIDY CLOTHING Order #${order.order_number} is Confirmed!`;

    const html = buildOrderConfirmationHtml({ order, items, env });
    const text = buildOrderConfirmationText({ order, items });

    const mailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      to: recipient,
      replyTo,
      subject,
      html,
      text,
    };

    // 5. Send with safe fallback
    const result = await sendMailWithFallback({ mailOptions, env });

    if (result.success) {
      // Mark order as sent
      await pool.execute(
        'UPDATE orders SET confirmation_email_sent = TRUE, confirmation_email_sent_at = NOW() WHERE id = ?',
        [order.id]
      );
      // Log success
      await pool.execute(
        `INSERT INTO order_email_logs (order_id, order_number, email_type, recipient_email, status, attempts, sent_at)
         VALUES (?, ?, 'confirmation', ?, 'sent', ?, NOW())`,
        [order.id, order.order_number, recipient, result.attempts || 1]
      );
      console.log(`[email] Order confirmation sent successfully to ${recipient} for order #${order.order_number} (Message-ID: ${result.messageId})`);
      return { success: true, messageId: result.messageId };
    } else {
      // Log failure in database
      await pool.execute(
        `INSERT INTO order_email_logs (order_id, order_number, email_type, recipient_email, status, attempts, error_message)
         VALUES (?, ?, 'confirmation', ?, 'failed', ?, ?)`,
        [order.id, order.order_number, recipient, result.attempts || 1, String(result.error).slice(0, 500)]
      );
      console.error(`[email] Failed to send order confirmation to ${recipient}: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error(`[email] Unexpected error sending confirmation for order ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send Order Cancellation Email
 * Strictly checks for duplicates before sending.
 * Only marks sent upon successful delivery.
 * Logs failure without disrupting cancellation transactions.
 */
export async function sendOrderCancellationEmail({ pool, orderId, reason = '', env = process.env }) {
  try {
    // 1. Fetch order details
    const [[order]] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? OR order_number = ? LIMIT 1',
      [Number(orderId) || -1, String(orderId)]
    );

    if (!order) {
      console.warn(`[email] Order ${orderId} not found. Skipping cancellation email.`);
      return { success: false, error: 'Order not found' };
    }

    // 2. Duplicate Prevention
    if (order.cancellation_email_sent) {
      console.log(`[email] Cancellation email for order #${order.order_number} already sent. Skipping.`);
      return { success: true, duplicate: true };
    }

    // 3. Email validation
    const recipient = String(order.customer_email || '').trim();
    if (!isValidEmail(recipient)) {
      console.error(`[email] Invalid customer email '${recipient}' for cancelled order #${order.order_number}.`);
      await pool.execute(
        `INSERT INTO order_email_logs (order_id, order_number, email_type, recipient_email, status, error_message)
         VALUES (?, ?, 'cancellation', ?, 'failed', ?)`,
        [order.id, order.order_number, recipient || 'unknown', 'Invalid email address format']
      );
      return { success: false, error: 'Invalid email address format' };
    }

    // 4. Fetch order items
    const [items] = await pool.execute(
      'SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC',
      [order.id]
    );

    const fromAddress = env.MAIL_FROM || 'orders@spidyclothing.com';
    const fromName = env.MAIL_FROM_NAME || 'SPIDY CLOTHING';
    const replyTo = env.MAIL_REPLY_TO || 'support@spidyclothing.com';
    const subject = `Your SPIDY CLOTHING Order #${order.order_number} Has Been Cancelled`;

    const html = buildOrderCancellationHtml({ order, items, reason, env });
    const text = buildOrderCancellationText({ order, items, reason });

    const mailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      to: recipient,
      replyTo,
      subject,
      html,
      text,
    };

    // 5. Send with safe fallback
    const result = await sendMailWithFallback({ mailOptions, env });

    if (result.success) {
      // Mark order as sent
      await pool.execute(
        'UPDATE orders SET cancellation_email_sent = TRUE, cancellation_email_sent_at = NOW() WHERE id = ?',
        [order.id]
      );
      // Log success
      await pool.execute(
        `INSERT INTO order_email_logs (order_id, order_number, email_type, recipient_email, status, attempts, sent_at)
         VALUES (?, ?, 'cancellation', ?, 'sent', ?, NOW())`,
        [order.id, order.order_number, recipient, result.attempts || 1]
      );
      console.log(`[email] Order cancellation email sent successfully to ${recipient} for order #${order.order_number} (Message-ID: ${result.messageId})`);
      return { success: true, messageId: result.messageId };
    } else {
      // Log failure in database
      await pool.execute(
        `INSERT INTO order_email_logs (order_id, order_number, email_type, recipient_email, status, attempts, error_message)
         VALUES (?, ?, 'cancellation', ?, 'failed', ?, ?)`,
        [order.id, order.order_number, recipient, result.attempts || 1, String(result.error).slice(0, 500)]
      );
      console.error(`[email] Failed to send order cancellation to ${recipient}: ${result.error}`);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error(`[email] Unexpected error sending cancellation email for order ${orderId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Verify SMTP connection and credentials
 */
export async function verifySmtpConnection(env = process.env) {
  try {
    const transporter = createTransporter(env);
    await transporter.verify();
    return { ok: true, port: Number(env.SMTP_PORT || 465) };
  } catch (error) {
    // Try fallback
    const fallbackPort = Number(env.SMTP_PORT || 465) === 465 ? 587 : 465;
    try {
      const fallback = createTransporter(env, fallbackPort);
      await fallback.verify();
      return { ok: true, port: fallbackPort, note: `Primary port failed; verified on fallback port ${fallbackPort}` };
    } catch (fallbackError) {
      return { ok: false, error: error.message, fallbackError: fallbackError.message };
    }
  }
}
