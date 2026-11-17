/**
 * Verification script for hardened Meta Conversions API (CAPI) endpoint & dispatcher
 */
const assert = require('assert');
const handler = require('../api/capi.js');

function createMockRes() {
  const headers = {};
  let statusCode = 0;
  let body = null;
  let ended = false;
  return {
    headers,
    get statusCode() { return statusCode; },
    get body() { return body; },
    get ended() { return ended; },
    setHeader(name, value) {
      headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      statusCode = code;
      return {
        json(data) {
          body = data;
        },
        end() {
          ended = true;
        }
      };
    }
  };
}

async function runTest() {
  console.log('--- 1. Testing GET /api/capi metadata ---');
  const getRes = createMockRes();
  await handler({ method: 'GET', headers: {} }, getRes);
  assert.strictEqual(getRes.statusCode, 200);
  assert.strictEqual(getRes.body.dataset_id, '1657670575734647');
  assert.ok(Array.isArray(getRes.body.public_allowed_events));
  assert.ok(!getRes.body.public_allowed_events.includes('Purchase'), 'Purchase must not be publicly allowed');
  console.log('PASS: GET /api/capi -> 200 OK');

  console.log('--- 2. Testing POST /api/capi with allowed Lead event & body test_event_code stripping ---');
  const prevTestCode = process.env.META_TEST_EVENT_CODE;
  delete process.env.META_TEST_EVENT_CODE;
  const leadRes = createMockRes();
  await handler({
    method: 'POST',
    headers: {
      origin: 'https://farizasterritory.com',
      host: 'farizasterritory.com',
      'x-forwarded-for': '103.230.106.12',
      'user-agent': 'FarizaTestAgent/1.0',
      cookie: '_fbp=fb.1.1710000000.123456789'
    },
    body: {
      eventName: 'Lead',
      eventId: 'ft_lead_test_1',
      eventSourceUrl: 'https://farizasterritory.com/#/inquiry',
      userData: { name: 'Faria Rahman', phone: '01712345678', district: 'Dhaka' },
      customData: { currency: 'BDT', value: 2350, content_ids: ['CAT-001'], num_items: 1 },
      test_event_code: 'SPOOFED_TEST'
    }
  }, leadRes);
  if (prevTestCode !== undefined) process.env.META_TEST_EVENT_CODE = prevTestCode;

  assert.strictEqual(leadRes.statusCode, 200);
  assert.strictEqual(leadRes.body.success, true);
  assert.strictEqual(leadRes.body.event_name, 'Lead');
  assert.strictEqual(leadRes.body.test_event_code, null, 'Client test_event_code must be ignored on public POST');
  assert.strictEqual(leadRes.headers['access-control-allow-origin'], 'https://farizasterritory.com');
  console.log('PASS: POST /api/capi Lead -> 200 OK, test_event_code stripped');

  console.log('--- 3. Testing POST /api/capi rejects unauthenticated Purchase (403) ---');
  const purchaseBlockRes = createMockRes();
  await handler({
    method: 'POST',
    headers: {
      origin: 'https://evil.example',
      host: 'farizasterritory.com',
      'x-forwarded-for': '103.230.106.13'
    },
    body: {
      eventName: 'Purchase',
      eventId: 'pur_spoof_1',
      customData: { currency: 'BDT', value: 99999 }
    }
  }, purchaseBlockRes);
  assert.strictEqual(purchaseBlockRes.statusCode, 403);
  assert.strictEqual(purchaseBlockRes.body.success, false);
  assert.strictEqual(purchaseBlockRes.headers['access-control-allow-origin'], undefined, 'Untrusted origin must not receive CORS allow header');
  console.log('PASS: Unauthenticated Purchase blocked (403) & untrusted CORS origin rejected');

  console.log('--- 4. Testing server-side privileged Purchase dispatcher ---');
  const serverPurchase = await handler.dispatchCapiEvent(
    {
      eventName: 'Purchase',
      eventId: 'pur_FT-261117-TEST',
      eventSourceUrl: 'https://farizasterritory.com/#/track',
      userData: { name: 'Nusrat Jahan', phone: '01812345678', district: 'Dhaka' },
      customData: { currency: 'BDT', value: 2430, order_id: 'FT-261117-TEST', content_ids: ['CAT-001'], num_items: 1 }
    },
    { allowPrivilegedEvents: true, allowTestCode: false }
  );
  assert.strictEqual(serverPurchase.status, 200);
  assert.strictEqual(serverPurchase.body.success, true);
  assert.strictEqual(serverPurchase.body.event_name, 'Purchase');
  const eventPayload = serverPurchase.body.payload.data[0];
  assert.ok(Array.isArray(eventPayload.user_data.ph) && eventPayload.user_data.ph[0].length === 64, 'Phone must be SHA-256 hashed');
  console.log('PASS: Server-side privileged Purchase dispatch verified');
}

runTest().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
