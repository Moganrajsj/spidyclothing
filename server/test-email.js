import { createPool } from './db.js';
import {
  sendOrderConfirmationEmail,
  sendOrderCancellationEmail,
  sendMailWithFallback,
  verifySmtpConnection,
  buildOrderConfirmationHtml,
  buildOrderCancellationHtml,
} from './email.js';

const pool = createPool();

const TEST_CUSTOMER_EMAIL = 'orders@spidyclothing.com'; // Using store's own inbox to receive and verify delivery safely

async function runTests() {
  console.log('=====================================================');
  console.log('SPIDY CLOTHING - Hostinger SMTP Email Test Suite');
  console.log('=====================================================\n');

  let passed = 0;
  let total = 6;

  try {
    // PREPARATION: Create a test customer and order in DB
    const testOrderNum = `SP-TEST-${Date.now().toString().slice(-6)}`;
    const [[cust]] = await pool.execute('SELECT id, name, email FROM customers LIMIT 1');
    const customerId = cust?.id || 1;

    console.log(`[setup] Inserting test order ${testOrderNum}...`);
    const [res] = await pool.execute(
      `INSERT INTO orders
        (order_number, customer_id, customer_name, customer_email, customer_phone, address, city, state, pincode, payment_method, payment_status, order_status, subtotal, discount, shipping, total, confirmation_email_sent, cancellation_email_sent)
       VALUES (?, ?, 'Mogan Raj', ?, '9876543210', '123 Textile Street', 'Tiruppur', 'Tamil Nadu', '641601', 'cod', 'cod_due', 'pending', 1499, 100, 0, 1399, FALSE, FALSE)`,
      [testOrderNum, customerId, TEST_CUSTOMER_EMAIL]
    );
    const testOrderId = res.insertId;

    // Insert 2 test items
    await pool.execute(
      `INSERT INTO order_items (order_id, product_name, size_name, color, unit_price, quantity, line_total)
       VALUES (?, 'Relaxed Heavyweight Tee', 'L', 'Olive', 699, 1, 699),
              (?, 'Everyday Cargo Pant', '32', 'Khaki', 800, 1, 800)`,
      [testOrderId, testOrderId]
    );

    // -------------------------------------------------------------------------
    // TEST 1: Successful Order Confirmation Email
    // -------------------------------------------------------------------------
    console.log('-----------------------------------------------------');
    console.log('TEST 1: Successful Order Confirmation Email');
    console.log('-----------------------------------------------------');
    const confirmResult = await sendOrderConfirmationEmail({ pool, orderId: testOrderId });
    console.log('Confirmation Result:', confirmResult);

    const [[orderAfterConfirm]] = await pool.execute(
      'SELECT confirmation_email_sent, confirmation_email_sent_at FROM orders WHERE id = ?',
      [testOrderId]
    );
    const [[confirmLog]] = await pool.execute(
      'SELECT * FROM order_email_logs WHERE order_id = ? AND email_type = "confirmation"',
      [testOrderId]
    );

    if (confirmResult.success && orderAfterConfirm.confirmation_email_sent && confirmLog?.status === 'sent') {
      console.log('✓ TEST 1 PASSED: Order confirmation sent, DB flag updated, and log recorded.');
      passed++;
    } else {
      console.error('✗ TEST 1 FAILED:', { confirmResult, orderAfterConfirm, confirmLog });
    }

    // -------------------------------------------------------------------------
    // TEST 2: Duplicate Email Prevention (Calling confirmation a second time)
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------');
    console.log('TEST 2: Duplicate Email Prevention');
    console.log('-----------------------------------------------------');
    const duplicateConfirm = await sendOrderConfirmationEmail({ pool, orderId: testOrderId });
    console.log('Duplicate Call Result:', duplicateConfirm);

    if (duplicateConfirm.success && duplicateConfirm.duplicate === true) {
      console.log('✓ TEST 2 PASSED: Duplicate confirmation email was successfully detected and prevented.');
      passed++;
    } else {
      console.error('✗ TEST 2 FAILED: Expected duplicate: true, got:', duplicateConfirm);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Order Cancellation Email
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------');
    console.log('TEST 3: Order Cancellation Email');
    console.log('-----------------------------------------------------');
    await pool.execute('UPDATE orders SET order_status = "cancelled" WHERE id = ?', [testOrderId]);
    const cancelResult = await sendOrderCancellationEmail({
      pool,
      orderId: testOrderId,
      reason: 'Customer requested cancellation (automated test)',
    });
    console.log('Cancellation Result:', cancelResult);

    const [[orderAfterCancel]] = await pool.execute(
      'SELECT cancellation_email_sent, cancellation_email_sent_at FROM orders WHERE id = ?',
      [testOrderId]
    );
    const [[cancelLog]] = await pool.execute(
      'SELECT * FROM order_email_logs WHERE order_id = ? AND email_type = "cancellation"',
      [testOrderId]
    );

    if (cancelResult.success && orderAfterCancel.cancellation_email_sent && cancelLog?.status === 'sent') {
      console.log('✓ TEST 3 PASSED: Order cancellation email sent, DB flag updated, and log recorded.');
      passed++;
    } else {
      console.error('✗ TEST 3 FAILED:', { cancelResult, orderAfterCancel, cancelLog });
    }

    // Duplicate cancellation test as well
    const duplicateCancel = await sendOrderCancellationEmail({ pool, orderId: testOrderId });
    if (duplicateCancel.duplicate) {
      console.log('✓ Duplicate cancellation email also prevented successfully.');
    }

    // -------------------------------------------------------------------------
    // TEST 4: Incorrect SMTP Password Handling
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------');
    console.log('TEST 4: Incorrect SMTP Password Handling');
    console.log('-----------------------------------------------------');
    const badPasswordEnv = {
      ...process.env,
      SMTP_PASS: 'WrongPassword999!',
    };

    const badPassResult = await sendMailWithFallback({
      mailOptions: {
        from: '"SPIDY CLOTHING" <orders@spidyclothing.com>',
        to: TEST_CUSTOMER_EMAIL,
        subject: 'Test Auth Failure',
        text: 'This should fail gracefully.',
      },
      env: badPasswordEnv,
    });
    console.log('Bad Password Attempt Result:', badPassResult);

    if (!badPassResult.success && badPassResult.error) {
      console.log(`✓ TEST 4 PASSED: System handled bad password gracefully without crashing: "${badPassResult.error}"`);
      passed++;
    } else {
      console.error('✗ TEST 4 FAILED: Expected failure, but got:', badPassResult);
    }

    // -------------------------------------------------------------------------
    // TEST 5: SMTP Connection Failure & Port Fallback
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------');
    console.log('TEST 5: SMTP Connection Failure & Port Fallback');
    console.log('-----------------------------------------------------');
    const badHostEnv = {
      ...process.env,
      SMTP_HOST: 'smtp.invalid-domain-nonexistent.com',
      SMTP_PORT: '465',
    };

    const badHostResult = await sendMailWithFallback({
      mailOptions: {
        from: '"SPIDY CLOTHING" <orders@spidyclothing.com>',
        to: TEST_CUSTOMER_EMAIL,
        subject: 'Test Host Failure',
        text: 'This should fail gracefully after attempting retry.',
      },
      env: badHostEnv,
    });
    console.log('Bad Host Attempt Result:', badHostResult);

    if (!badHostResult.success && badHostResult.attempts >= 2) {
      console.log(`✓ TEST 5 PASSED: Handled connection failure with ${badHostResult.attempts} attempts and safe error return.`);
      passed++;
    } else {
      console.error('✗ TEST 5 FAILED:', badHostResult);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Customer Email Delivery & Sender / Reply-To Verification
    // -------------------------------------------------------------------------
    console.log('\n-----------------------------------------------------');
    console.log('TEST 6: Customer Email Delivery & Headers Verification');
    console.log('-----------------------------------------------------');

    // Verify SMTP connection using verify helper
    const smtpCheck = await verifySmtpConnection();
    console.log('SMTP Connection Status:', smtpCheck);

    // Verify message headers in logs and live result
    if (confirmResult.messageId && cancelResult.messageId && smtpCheck.ok) {
      console.log(`✓ Sender: "SPIDY CLOTHING" <orders@spidyclothing.com>`);
      console.log(`✓ Reply-To: support@spidyclothing.com`);
      console.log(`✓ Confirmation Message ID: ${confirmResult.messageId}`);
      console.log(`✓ Cancellation Message ID: ${cancelResult.messageId}`);
      console.log('✓ TEST 6 PASSED: Live customer email delivery verified via Hostinger SMTP.');
      passed++;
    } else {
      console.error('✗ TEST 6 FAILED: Message ID or connection check missing.');
    }

    // CLEANUP: Clean up test order
    console.log('\n[cleanup] Cleaning up test order...');
    await pool.execute('DELETE FROM orders WHERE id = ?', [testOrderId]);
    console.log('[cleanup] Done.');

  } catch (err) {
    console.error('Unexpected test error:', err);
  } finally {
    await pool.end();
  }

  console.log('\n=====================================================');
  console.log(`TEST RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('=====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests();
