/**
 * DANA Mandatory API Testing Script
 * Runs all 8 mandatory test scenarios required by DANA sandbox.
 */
require('dotenv/config');
const { Dana } = require('dana-node');
const crypto = require('crypto');

const client = new Dana({
  partnerId: process.env.DANA_CLIENT_ID,
  privateKey: process.env.DANA_PRIVATE_KEY,
  origin: process.env.DANA_ORIGIN,
  env: 'sandbox',
  clientSecret: process.env.DANA_CLIENT_SECRET,
  debugMode: 'true',
});

const MERCHANT_ID = process.env.DANA_MERCHANT_ID;
const WEBHOOK_URL = 'https://webhook.site/aabfebfd-7022-46f9-99b0-20a88c92711e';

function refNo() {
  return 'PANTO-' + Date.now() + '-' + crypto.randomUUID().slice(0, 8);
}

function jakartaExpiry(minutesFromNow = 25) {
  const d = new Date(Date.now() + minutesFromNow * 60000);
  const offset = 7 * 60 * 60 * 1000;
  const jakarta = new Date(d.getTime() + offset);
  const iso = jakarta.toISOString().slice(0, 19);
  return iso + '+07:00';
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTest(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));
  try {
    const result = await fn();
    console.log('✅ SUCCESS');
    console.log(JSON.stringify(result, null, 2));
    return result;
  } catch (err) {
    console.log('❌ ERROR:', err.message);
    if (err.response) console.log('Response:', JSON.stringify(err.response));
    if (err.errorCode) console.log('Code:', err.errorCode);
    if (err.errorMessage) console.log('Message:', err.errorMessage);
    return null;
  }
}

async function main() {
  console.log('DANA Mandatory API Testing');
  console.log('Client ID:', process.env.DANA_CLIENT_ID);
  console.log('Merchant ID:', MERCHANT_ID);
  console.log('Webhook:', WEBHOOK_URL);
  console.log('');

  // ──────────────────────────────────────────
  // Test 1: Create Order (Payment Gateway) - BALANCE
  // ──────────────────────────────────────────
  const orderRef1 = refNo();
  const order1 = await runTest('1. Create Order - BALANCE payment', () =>
    client.paymentGatewayApi.createOrder({
      partnerReferenceNo: orderRef1,
      merchantId: MERCHANT_ID,
      amount: { value: '10000.00', currency: 'IDR' },
      validUpTo: jakartaExpiry(60),
      payOptionDetails: [
        {
          payMethod: 'BALANCE',
          payOption: '',
          transAmount: { value: '10000.00', currency: 'IDR' },
        },
      ],
      urlParams: [
        { url: WEBHOOK_URL, type: 'PAY_RETURN', isDeeplink: 'N' },
        { url: WEBHOOK_URL, type: 'NOTIFICATION', isDeeplink: 'N' },
      ],
    })
  );

  await sleep(2000);

  // ──────────────────────────────────────────
  // Test 2: Query Payment
  // ──────────────────────────────────────────
  await runTest('2. Query Payment (order 1)', () =>
    client.paymentGatewayApi.queryPayment({
      originalPartnerReferenceNo: orderRef1,
      merchantId: MERCHANT_ID,
      serviceCode: '54',
    })
  );

  await sleep(1000);

  // ──────────────────────────────────────────
  // Test 3: Create Order - NETWORK_PAY (e-wallet)
  // ──────────────────────────────────────────
  const orderRef2 = refNo();
  const order2 = await runTest('3. Create Order - NETWORK_PAY QRIS', () =>
    client.paymentGatewayApi.createOrder({
      partnerReferenceNo: orderRef2,
      merchantId: MERCHANT_ID,
      amount: { value: '25000.00', currency: 'IDR' },
      validUpTo: jakartaExpiry(60),
      payOptionDetails: [
        {
          payMethod: 'NETWORK_PAY',
          payOption: 'NETWORK_PAY_PG_QRIS',
          transAmount: { value: '25000.00', currency: 'IDR' },
        },
      ],
      urlParams: [
        { url: WEBHOOK_URL, type: 'PAY_RETURN', isDeeplink: 'N' },
        { url: WEBHOOK_URL, type: 'NOTIFICATION', isDeeplink: 'N' },
      ],
    })
  );

  await sleep(2000);

  // ──────────────────────────────────────────
  // Test 4: Cancel Order
  // ──────────────────────────────────────────
  await runTest('4. Cancel Order (order 2)', () =>
    client.paymentGatewayApi.cancelOrder({
      originalPartnerReferenceNo: orderRef2,
      merchantId: MERCHANT_ID,
      reason: 'Testing cancel order',
    })
  );

  await sleep(1000);

  // ──────────────────────────────────────────
  // Test 5: Create Order + Refund
  // ──────────────────────────────────────────
  const orderRef3 = refNo();
  await runTest('5a. Create Order for Refund test', () =>
    client.paymentGatewayApi.createOrder({
      partnerReferenceNo: orderRef3,
      merchantId: MERCHANT_ID,
      amount: { value: '15000.00', currency: 'IDR' },
      validUpTo: jakartaExpiry(60),
      payOptionDetails: [
        {
          payMethod: 'BALANCE',
          payOption: '',
          transAmount: { value: '15000.00', currency: 'IDR' },
        },
      ],
      urlParams: [
        { url: WEBHOOK_URL, type: 'PAY_RETURN', isDeeplink: 'N' },
        { url: WEBHOOK_URL, type: 'NOTIFICATION', isDeeplink: 'N' },
      ],
    })
  );

  await sleep(2000);

  await runTest('5b. Refund Order', () =>
    client.paymentGatewayApi.refundOrder({
      originalPartnerReferenceNo: orderRef3,
      merchantId: MERCHANT_ID,
      partnerRefundNo: refNo(),
      refundAmount: { value: '15000.00', currency: 'IDR' },
      reason: 'Testing refund',
    })
  );

  await sleep(1000);

  // ──────────────────────────────────────────
  // Test 6: Consult Pay
  // ──────────────────────────────────────────
  await runTest('6. Consult Pay (list payment methods)', () =>
    client.paymentGatewayApi.consultPay({
      merchantId: MERCHANT_ID,
      additionalInfo: {},
    })
  );

  await sleep(1000);

  // ──────────────────────────────────────────
  // Test 7: Apply Token (Widget) - dummy authCode
  // ──────────────────────────────────────────
  await runTest('7. Apply Token (Widget API)', () =>
    client.widgetApi.applyToken({
      grantType: 'AUTHORIZATION_CODE',
      authCode: 'sandbox_test_code_' + Date.now(),
      additionalInfo: {},
    })
  );

  await sleep(1000);

  // ──────────────────────────────────────────
  // Test 8: Query Payment (second attempt)
  // ──────────────────────────────────────────
  await runTest('8. Query Payment (order 3)', () =>
    client.paymentGatewayApi.queryPayment({
      originalPartnerReferenceNo: orderRef3,
      merchantId: MERCHANT_ID,
      serviceCode: '54',
    })
  );

  console.log('\n' + '='.repeat(60));
  console.log('ALL TESTS COMPLETED');
  console.log('Check your DANA Dashboard to see which tests passed.');
  console.log('Check webhook.site for any notifications received.');
  console.log('='.repeat(60));
}

main().catch(console.error);
