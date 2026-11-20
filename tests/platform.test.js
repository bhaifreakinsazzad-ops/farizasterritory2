const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const commerce = require('../assets/js/commerce.js');
const { createApp, loadCatalogInMemory } = require('../server.js');
const capiHandler = require('../api/capi.js');

function startTestServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`
      });
    });
    server.on('error', reject);
  });
}

function closeServer(server) {
  return new Promise((resolve) => {
    server.close(() => resolve());
    if (typeof server.closeAllConnections === 'function') {
      server.closeAllConnections();
    }
  });
}

function createInMemoryStore(options = {}) {
  const configured = options.configured !== false;
  const orders = new Map();
  const idempotencyIndex = new Map();
  const collections = new Map();
  const productAssets = new Map();
  const productOverrides = new Map(Object.entries(options.productOverrides || {}));
  const auditLogs = [];
  const capiOutbox = new Map();
  const staffUsers = new Map([
    [
      '11111111-1111-1111-1111-111111111111',
      { user_id: '11111111-1111-1111-1111-111111111111', email: 'faria@farizasterritory.com', full_name: 'Faria Owner', role: 'admin', is_active: true }
    ],
    [
      '22222222-2222-2222-2222-222222222222',
      { user_id: '22222222-2222-2222-2222-222222222222', email: 'staff@farizasterritory.com', full_name: 'Order Operator', role: 'staff', is_active: true }
    ]
  ]);
  const coupons = new Map(
    commerce.DEFAULT_COUPONS.map(c => [c.code, Object.assign({}, c)])
  );
  let storeSettings = Object.assign({
    id: 'default',
    store_name: "Fariza's Territory",
    whatsapp_number: '',
    messenger_username: 'farizasterritory143',
    facebook_url: 'https://www.facebook.com/farizasterritory143',
    meta_pixel_id: '1657670575734647',
    ga4_measurement_id: '',
    delivery_fee_dhaka: 80,
    delivery_fee_outside: 150,
    free_delivery_threshold: 3000,
    promo_text: 'First-order 25% OFF with code FIRST25 · Free delivery over ৳3,000 (FREESHIP)'
  }, options.settings || {});

  return {
    isDurableConfigured() {
      return configured;
    },
    getConfigSummary() {
      return {
        url: 'https://vjbhrdclcnxevunskodm.supabase.co',
        anonConfigured: true,
        serviceRoleConfigured: configured
      };
    },
    async verifyAdminBearerToken(authHeader) {
      const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
      if (!token) {
        return { ok: false, status: 401, error: 'Missing Bearer authentication token.' };
      }
      if (token === 'valid-admin-jwt') {
        return {
          ok: true,
          user: { id: '11111111-1111-1111-1111-111111111111', email: 'faria@farizasterritory.com', full_name: 'Faria Owner', role: 'admin' }
        };
      }
      if (token === 'valid-staff-jwt') {
        return {
          ok: true,
          user: { id: '22222222-2222-2222-2222-222222222222', email: 'staff@farizasterritory.com', full_name: 'Order Operator', role: 'staff' }
        };
      }
      if (token === 'non-admin-jwt') {
        return { ok: false, status: 403, error: 'Forbidden: Account does not hold active boutique staff permissions.' };
      }
      return { ok: false, status: 401, error: 'Invalid or expired authentication session.' };
    },
    async getStoreSettings() {
      return Object.assign({}, storeSettings);
    },
    async updateStoreSettings(patch) {
      if (!configured) return { ok: false, status: 503, error: 'Database unconfigured' };
      storeSettings = Object.assign({}, storeSettings, patch);
      return { ok: true, data: Object.assign({}, storeSettings) };
    },
    async listCollections() {
      return Array.from(collections.values());
    },
    async upsertCollection(col) {
      if (!configured) return { ok: false, status: 503, error: 'Database unconfigured' };
      const slug = String(col.slug || '').trim().toLowerCase();
      const saved = Object.assign({ is_active: true, sort_order: 99 }, col, { slug });
      collections.set(slug, saved);
      return { ok: true, data: Object.assign({}, saved) };
    },
    async listProducts() {
      return Array.from(productOverrides.entries()).map(([sku, row]) => Object.assign({ sku }, row));
    },
    async createProduct(prod, actorEmail) {
      if (!configured) return { ok: false, status: 503, error: 'Database unconfigured' };
      const sku = String(prod.sku || '').trim().toUpperCase();
      if (productOverrides.has(sku)) return { ok: false, status: 409, error: `SKU ${sku} exists.` };
      const saved = Object.assign(
        { reserved_count: 0, is_available: true, is_archived: false, approved_at: !prod.price_review && prod.stock_verified ? new Date().toISOString() : null, approved_by: actorEmail },
        prod,
        { sku }
      );
      productOverrides.set(sku, saved);
      return { ok: true, data: Object.assign({}, saved) };
    },
    async updateProduct(sku, updates, actorEmail) {
      if (!configured) return { ok: false, status: 503, error: 'Database unconfigured' };
      const existing = productOverrides.get(sku) || { sku };
      const nextPriceReview = updates.price_review !== undefined ? updates.price_review : existing.price_review;
      const nextStockVerified = updates.stock_verified !== undefined ? updates.stock_verified : existing.stock_verified;
      const extra = {};
      if (!nextPriceReview && nextStockVerified && !existing.approved_at) {
        extra.approved_at = new Date().toISOString();
        extra.approved_by = actorEmail || 'admin';
      } else if (updates.price_review === true || updates.stock_verified === false) {
        extra.approved_at = null;
      }
      const merged = Object.assign({}, existing, updates, extra, { sku });
      productOverrides.set(sku, merged);
      return { ok: true, data: Object.assign({}, merged), previous: Object.assign({}, existing) };
    },
    async listProductAssets() {
      return Array.from(productAssets.values());
    },
    async upsertProductAsset(asset) {
      const key = `${asset.sku}:${asset.asset_key}`;
      const saved = Object.assign({}, asset);
      productAssets.set(key, saved);
      const p = productOverrides.get(asset.sku);
      if (p && asset.asset_key === 'main') {
        p.main_image = asset.storage_path;
      }
      return { ok: true, data: saved };
    },
    async getCouponByCode(code) {
      const upper = String(code || '').trim().toUpperCase();
      return coupons.get(upper) || null;
    },
    async listCoupons() {
      return { ok: true, data: Array.from(coupons.values()) };
    },
    async upsertCoupon(coupon) {
      const upper = String(coupon.code || '').trim().toUpperCase();
      const saved = Object.assign({}, coupon, { code: upper });
      coupons.set(upper, saved);
      return { ok: true, data: saved };
    },
    async createOrder(orderRecord) {
      if (!configured) {
        return { ok: false, status: 503, error: 'Persistent order database is not configured on the server.' };
      }
      if (orderRecord.idempotency_key && idempotencyIndex.has(orderRecord.idempotency_key)) {
        const existingRef = idempotencyIndex.get(orderRecord.idempotency_key);
        return { ok: true, idempotent: true, data: Object.assign({}, orders.get(existingRef)) };
      }
      // Atomic check & reservation simulation for DB products with tracked stock
      let reservedAll = true;
      for (const item of orderRecord.items || []) {
        const row = productOverrides.get(item.sku);
        if (row) {
          if (row.is_available === false || row.is_archived === true) {
            return { ok: false, status: 409, error: `Product ${item.sku} unavailable.` };
          }
          const avail = Math.max(0, Number(row.stock_count ?? 0) - Number(row.reserved_count || 0));
          if (row.stock_verified === true && avail < item.qty) {
            return { ok: false, status: 409, error: `Insufficient verified stock for ${item.sku}.` };
          }
          if (Number(row.stock_count || 0) > 0 && avail < item.qty) {
            return { ok: false, status: 409, error: `Insufficient stock for ${item.sku}.` };
          }
          if (!row.stock_verified && Number(row.stock_count || 0) <= 0) reservedAll = false;
        } else {
          reservedAll = false;
        }
      }
      for (const item of orderRecord.items || []) {
        const row = productOverrides.get(item.sku);
        if (row && (row.stock_verified === true || Number(row.stock_count || 0) > 0)) {
          row.reserved_count = Number(row.reserved_count || 0) + Number(item.qty || 1);
        }
      }
      const copy = Object.assign({ inventory_state: reservedAll ? 'reserved' : 'none' }, orderRecord);
      orders.set(copy.order_ref, copy);
      if (copy.idempotency_key) {
        idempotencyIndex.set(copy.idempotency_key, copy.order_ref);
      }
      return { ok: true, idempotent: false, data: Object.assign({}, copy) };
    },
    async getOrderByRef(orderRef) {
      if (!configured) return { ok: false, status: 503, error: 'Database unconfigured' };
      const rec = orders.get(String(orderRef || '').trim().toUpperCase());
      if (!rec) return { ok: false, status: 404, error: 'Order not found' };
      return { ok: true, data: Object.assign({}, rec) };
    },
    async listOrders({ status } = {}) {
      const list = Array.from(orders.values()).filter(o => !status || status === 'all' || o.status === status);
      return { ok: true, data: list };
    },
    async updateOrder(orderRef, patch) {
      const key = String(orderRef || '').trim().toUpperCase();
      const existing = orders.get(key);
      if (!existing) return { ok: false, status: 404, error: 'Order not found' };
      const updated = Object.assign({}, existing, patch, { updated_at: new Date().toISOString() });
      orders.set(key, updated);
      return { ok: true, data: Object.assign({}, updated) };
    },
    async transitionOrder(orderRef, patch) {
      const key = String(orderRef || '').trim().toUpperCase();
      const existing = orders.get(key);
      if (!existing) return { ok: false, status: 404, error: 'Order not found' };
      const nextStatus = patch.status || existing.status;
      let invState = existing.inventory_state || 'none';
      if ((nextStatus === 'shipped' || nextStatus === 'delivered') && invState === 'reserved') {
        for (const it of existing.items || []) {
          const row = productOverrides.get(it.sku);
          if (row) {
            row.stock_count = Math.max(0, Number(row.stock_count || 0) - Number(it.qty || 1));
            row.reserved_count = Math.max(0, Number(row.reserved_count || 0) - Number(it.qty || 1));
            if (row.stock_count === 0) row.is_available = false;
          }
        }
        invState = 'deducted';
      } else if (nextStatus === 'cancelled' && invState === 'reserved') {
        for (const it of existing.items || []) {
          const row = productOverrides.get(it.sku);
          if (row) {
            row.reserved_count = Math.max(0, Number(row.reserved_count || 0) - Number(it.qty || 1));
          }
        }
        invState = 'released';
      }
      const updated = Object.assign({}, existing, patch, { inventory_state: invState, updated_at: new Date().toISOString() });
      orders.set(key, updated);
      return { ok: true, data: Object.assign({}, updated) };
    },
    async listStaffUsers() {
      return { ok: true, data: Array.from(staffUsers.values()) };
    },
    async upsertStaffUser(staff) {
      const saved = Object.assign({}, staff, { updated_at: new Date().toISOString() });
      staffUsers.set(saved.user_id, saved);
      return { ok: true, data: saved };
    },
    async recordAuditLog(entry) {
      const rec = Object.assign({ id: auditLogs.length + 1, created_at: new Date().toISOString() }, entry);
      auditLogs.unshift(rec);
      return { ok: true, data: rec };
    },
    async listAuditLogs(limit = 100) {
      return { ok: true, data: auditLogs.slice(0, limit) };
    },
    async enqueueCapiOutboxEvent(evt) {
      if (capiOutbox.has(evt.event_id)) {
        return { ok: true, created: false, data: Object.assign({}, capiOutbox.get(evt.event_id)) };
      }
      const row = Object.assign({ status: 'pending', attempts: 0, max_attempts: 5, next_retry_at: new Date().toISOString(), last_error: null, fbtrace_id: null, sent_at: null }, evt);
      capiOutbox.set(evt.event_id, row);
      return { ok: true, created: true, data: Object.assign({}, row) };
    },
    async claimDueCapiOutboxEvents(limit = 10) {
      const now = Date.now();
      const due = Array.from(capiOutbox.values()).filter(
        e => ['pending', 'failed'].includes(e.status) && Number(e.attempts) < Number(e.max_attempts || 5) && Date.parse(e.next_retry_at || 0) <= now
      ).slice(0, limit);
      due.forEach(e => { e.status = 'processing'; });
      return { ok: true, data: due.map(d => Object.assign({}, d)) };
    },
    async markCapiOutboxResult(eventId, outcome) {
      const cur = capiOutbox.get(eventId);
      if (!cur) return { ok: false, status: 404 };
      if (outcome.delivered && outcome.mode === 'live_production') {
        cur.status = 'sent';
        cur.attempts += 1;
        cur.sent_at = new Date().toISOString();
        cur.fbtrace_id = outcome.fbtrace_id || null;
        cur.last_error = null;
        const ord = orders.get(cur.order_ref);
        if (ord) ord.purchase_capi_sent_at = cur.sent_at;
      } else if (outcome.mode === 'preview_no_token') {
        cur.status = 'pending';
        cur.last_error = 'Preview mode (META_CAPI_ACCESS_TOKEN not configured).';
      } else {
        cur.attempts += 1;
        cur.status = cur.attempts >= (cur.max_attempts || 5) ? 'dead' : 'failed';
        cur.last_error = outcome.error || 'Error';
        cur.next_retry_at = new Date(Date.now() - 1000).toISOString();
      }
      return { ok: true, data: Object.assign({}, cur) };
    },
    async listCapiOutbox(limit = 100) {
      return { ok: true, data: Array.from(capiOutbox.values()).slice(0, limit) };
    },
    async resetCapiOutboxForRetry(eventId) {
      const cur = capiOutbox.get(eventId);
      if (!cur) return { ok: false, status: 404, error: 'Not found' };
      if (cur.status === 'sent') return { ok: true, alreadySent: true, data: cur };
      cur.status = 'pending';
      cur.next_retry_at = new Date().toISOString();
      return { ok: true, data: Object.assign({}, cur) };
    }
  };
}

// ===========================================================================
// 1. Catalog Integrity & Physical Assets
// ===========================================================================
test('Catalog contains 53 unique SKUs across 8 collections with existing disk assets', () => {
  const catalog = loadCatalogInMemory();
  assert.equal(catalog.COLLECTIONS.length, 8);
  assert.equal(catalog.PRODUCTS.length, 53);

  const fashion = catalog.PRODUCTS.filter(p => p.superCategory === 'Fashion');
  const accessories = catalog.PRODUCTS.filter(p => p.superCategory === 'Accessories');
  assert.equal(fashion.length, 18);
  assert.equal(accessories.length, 35);

  const skus = new Set();
  const slugs = new Set(catalog.COLLECTIONS.map(c => c.slug));
  assert.equal(slugs.size, 8);

  const rootDir = path.join(__dirname, '..');
  for (const p of catalog.PRODUCTS) {
    assert.ok(!skus.has(p.sku), `Duplicate SKU: ${p.sku}`);
    skus.add(p.sku);
    assert.ok(p.assets && p.assets.main, `Missing main asset for ${p.sku}`);
    assert.ok(fs.existsSync(path.join(rootDir, p.assets.main)), `Missing file: ${p.assets.main}`);
  }
});

// ===========================================================================
// 2. Shared Commerce Engine Unit Tests
// ===========================================================================
test('Commerce engine enforces BD phone normalization, zone calculation, and canonical coupon rules', () => {
  const p1 = commerce.normalizePhone('+8801712345678');
  assert.equal(p1.isBdMobile, true);
  assert.equal(p1.canonical11, '01712345678');
  assert.equal(p1.e164, '8801712345678');
  assert.equal(commerce.phonesMatch('01712-345678', '+880 1712 345678'), true);
  assert.equal(commerce.phonesMatch('01712345678', '01812345678'), false);

  const invalidPhone = commerce.normalizePhone('12345');
  assert.equal(invalidPhone.isBdMobile, false);

  const first25 = commerce.DEFAULT_COUPONS.find(c => c.code === 'FIRST25');
  const fariza200 = commerce.DEFAULT_COUPONS.find(c => c.code === 'FARIZA200');
  const freeship = commerce.DEFAULT_COUPONS.find(c => c.code === 'FREESHIP');

  assert.equal(commerce.evaluateCoupon(first25, 1999, 80).valid, false);
  assert.equal(commerce.evaluateCoupon(first25, 2400, 80).discountAmount, 500); // capped at 500
  assert.equal(commerce.evaluateCoupon(fariza200, 2000, 150).discountAmount, 200);
  assert.equal(commerce.evaluateCoupon(freeship, 2999, 150).valid, false);
  assert.equal(commerce.evaluateCoupon(freeship, 3000, 150).discountAmount, 150);

  const catalog = loadCatalogInMemory();
  const sampleSku = catalog.PRODUCTS[0].sku; // CAT-001 (2350)
  const expectedPrice = Number(catalog.PRODUCTS[0].priceBDT);
  const calc = commerce.computeOrderTotals({
    items: [{ sku: sampleSku, qty: 2 }],
    productsBySku: catalog.PRODUCTS_BY_SKU,
    zone: 'outside_dhaka',
    district: 'Sylhet',
    deliveryFees: { dhaka: 80, outside_dhaka: 150 },
    coupon: freeship
  });
  assert.equal(calc.ok, true);
  assert.equal(calc.subtotal, expectedPrice * 2);
  assert.equal(calc.delivery_fee, 150);
  assert.equal(calc.discount_amount, 150);
  assert.equal(calc.total, expectedPrice * 2);

  // Rejects zero quantity, unknown SKU, out of stock
  assert.equal(
    commerce.computeOrderTotals({ items: [{ sku: sampleSku, qty: 0 }], productsBySku: catalog.PRODUCTS_BY_SKU }).ok,
    false
  );
  assert.equal(
    commerce.computeOrderTotals({ items: [{ sku: 'FAKE-999', qty: 1 }], productsBySku: catalog.PRODUCTS_BY_SKU }).ok,
    false
  );
  assert.equal(
    commerce.computeOrderTotals({
      items: [{ sku: sampleSku, qty: 1 }],
      productsBySku: { [sampleSku]: Object.assign({}, catalog.PRODUCTS[0], { is_available: false }) }
    }).ok,
    false
  );

  // Valid vs invalid status transitions
  assert.equal(commerce.isValidStatusTransition('pending', 'confirmed'), true);
  assert.equal(commerce.isValidStatusTransition('delivered', 'pending'), false);
  assert.equal(commerce.isValidStatusTransition('cancelled', 'shipped'), false);
});

// ===========================================================================
// 3. Fail-Closed Unconfigured Persistence Test
// ===========================================================================
test('POST /api/orders fails closed with HTTP 503 when durable DB is unconfigured', async () => {
  const app = createApp({ store: createInMemoryStore({ configured: false }) });
  const { server, baseUrl } = await startTestServer(app);
  try {
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Faria Test',
        customer_phone: '01712345678',
        customer_address: 'Mirpur 10, Dhaka',
        delivery_zone: 'dhaka',
        items: [{ sku: 'CAT-001', qty: 1 }]
      })
    });
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.equal(data.ok, false);
  } finally {
    await closeServer(server);
  }
});

// ===========================================================================
// 4. Authoritative Order Creation, Tamper Rejection, Idempotency & Public Tracking
// ===========================================================================
test('Order API computes authoritative totals, enforces idempotency, and protects tracking PII', async () => {
  const store = createInMemoryStore({ configured: true });
  const app = createApp({ store, trackRateLimitMax: 5 });
  const { server, baseUrl } = await startTestServer(app);
  try {
    // Public config never leaks placeholder WhatsApp as active or any secret
    const cfgRes = await fetch(`${baseUrl}/api/public-config`);
    assert.equal(cfgRes.status, 200);
    const cfg = await cfgRes.json();
    assert.equal(cfg.officialChannels.whatsappActive, false);
    assert.equal(cfg.officialChannels.whatsappNumber, '');
    assert.equal(cfg.freeShippingThreshold, 3000);

    // Rejects invalid BD phone
    const badPhoneRes = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Bad Phone',
        customer_phone: '0110000',
        customer_address: 'Mirpur 10',
        items: [{ sku: 'CAT-001', qty: 1 }]
      })
    });
    assert.equal(badPhoneRes.status, 400);

    // Tampered client price/total/status is ignored; server prices (CAT-001 = 2350, Dhaka = 80, FIRST25 = 500 -> 1930) apply
    const idempKey = 'test-idem-key-001';
    const orderPayload = {
      customer_name: 'Nusrat Jahan',
      customer_phone: '+8801712345678',
      customer_address: 'House 12, Road 4, Mirpur 10',
      customer_district: 'Dhaka',
      delivery_zone: 'dhaka',
      discount_code: 'FIRST25',
      items: [{ sku: 'CAT-001', qty: 1, price: 1 }], // tampered price 1 BDT
      subtotal: 1,
      total: 1,
      status: 'delivered', // tampered status
      idempotency_key: idempKey
    };

    const create1 = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    assert.equal(create1.status, 201);
    const data1 = await create1.json();
    assert.equal(data1.ok, true);
    assert.equal(data1.idempotent, false);
    assert.equal(data1.order.status, 'pending');
    assert.equal(data1.order.delivery_fee, 80);
    assert.equal(data1.order.discount_amount, 500);
    assert.equal(data1.order.subtotal, 2350);
    assert.equal(data1.order.total, 1930);

    // Idempotent retry returns same order_ref with HTTP 200 and idempotent: true
    const create2 = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload)
    });
    assert.equal(create2.status, 200);
    const data2 = await create2.json();
    assert.equal(data2.idempotent, true);
    assert.equal(data2.order_ref, data1.order_ref);

    // Tracking requires BOTH ref and phone
    const missingPhoneTrack = await fetch(`${baseUrl}/api/track?ref=${encodeURIComponent(data1.order_ref)}`);
    assert.equal(missingPhoneTrack.status, 400);

    // Wrong phone returns generic 404 (same as unknown ref)
    const wrongPhoneTrack = await fetch(`${baseUrl}/api/track?ref=${encodeURIComponent(data1.order_ref)}&phone=01899999999`);
    assert.equal(wrongPhoneTrack.status, 404);
    const unknownRefTrack = await fetch(`${baseUrl}/api/track?ref=FT-999999-NONE&phone=01899999999`);
    assert.equal(unknownRefTrack.status, 404);
    assert.equal((await wrongPhoneTrack.json()).error, (await unknownRefTrack.json()).error);

    // Matching ref + phone returns 200 redacted response without customer_address or raw phone
    const okTrack = await fetch(`${baseUrl}/api/track?ref=${encodeURIComponent(data1.order_ref)}&phone=01712345678`);
    assert.equal(okTrack.status, 200);
    const trackBody = await okTrack.json();
    assert.equal(trackBody.ok, true);
    assert.equal(trackBody.order.order_ref, data1.order_ref);
    assert.equal(trackBody.order.customer_address, undefined);
    assert.equal(trackBody.order.customer_phone, undefined);
    assert.equal(trackBody.order.phone_masked, '017****678');
    assert.equal(trackBody.order.recipient_masked, 'Nu***');

    // Rate limiting check (5 allowed in test app, 6th returns 429)
    await fetch(`${baseUrl}/api/track?ref=FT-1&phone=01712345678`);
    const rateLimited = await fetch(`${baseUrl}/api/track?ref=FT-1&phone=01712345678`);
    assert.equal(rateLimited.status, 429);
  } finally {
    await closeServer(server);
  }
});

// ===========================================================================
// 5. Admin RBAC (401 / 403 / 200), Status Transitions, & Idempotent Server Purchase CAPI
// ===========================================================================
test('Admin APIs enforce 401/403 RBAC, valid transitions, and idempotent Purchase CAPI dispatch', async () => {
  const capiCalls = [];
  const mockCapiSender = async (params, opts) => {
    capiCalls.push({ params, opts });
    return {
      status: 200,
      body: {
        success: true,
        delivered: true,
        mode: 'live_production',
        events_received: 1,
        fbtrace_id: 'TRACE_MOCK_200',
        event_name: params.eventName,
        event_id: params.eventId
      }
    };
  };

  const store = createInMemoryStore({ configured: true });
  const app = createApp({ store, capiSender: mockCapiSender });
  const { server, baseUrl } = await startTestServer(app);
  try {
    // 401 when unauthenticated
    const unauthOrders = await fetch(`${baseUrl}/api/admin/orders`);
    assert.equal(unauthOrders.status, 401);
    assert.equal(unauthOrders.headers.get('x-robots-tag'), 'noindex, nofollow');

    // 403 when non-admin user calls admin API
    const nonAdminRes = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: 'Bearer non-admin-jwt' }
    });
    assert.equal(nonAdminRes.status, 403);

    // 401 when trying to mutate product without token
    const unauthPatch = await fetch(`${baseUrl}/api/admin/products/CAT-001`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stock_verified: true })
    });
    assert.equal(unauthPatch.status, 401);

    // Create a genuine order
    const created = await (await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Sadia Afrin',
        customer_phone: '01812345678',
        customer_address: 'Dhanmondi 27, Dhaka',
        items: [{ sku: 'CAT-001', qty: 1 }]
      })
    })).json();
    const orderRef = created.order_ref;

    // 200 when admin lists orders
    const adminOrdersRes = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: 'Bearer valid-admin-jwt' }
    });
    assert.equal(adminOrdersRes.status, 200);
    const adminOrders = await adminOrdersRes.json();
    assert.equal(adminOrders.orders.length, 1);

    // Invalid status transition pending -> delivered is rejected (400)
    const invalidTransition = await fetch(`${baseUrl}/api/admin/orders/${orderRef}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer valid-admin-jwt',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'delivered' })
    });
    assert.equal(invalidTransition.status, 400);
    assert.equal(capiCalls.length, 0);

    // Valid transition pending -> confirmed dispatches Purchase CAPI once
    const confirmRes = await fetch(`${baseUrl}/api/admin/orders/${orderRef}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer valid-admin-jwt',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'confirmed', note: 'Verified via Messenger' })
    });
    assert.equal(confirmRes.status, 200);
    const confirmBody = await confirmRes.json();
    assert.equal(confirmBody.order.status, 'confirmed');
    assert.ok(confirmBody.order.purchase_capi_sent_at);
    assert.equal(capiCalls.length, 1);
    assert.equal(capiCalls[0].params.eventName, 'Purchase');
    assert.equal(capiCalls[0].opts.allowPrivilegedEvents, true);
    assert.equal(capiCalls[0].opts.allowTestCode, false);

    // Subsequent update does NOT duplicate Purchase CAPI event
    const shipRes = await fetch(`${baseUrl}/api/admin/orders/${orderRef}`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer valid-admin-jwt',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: 'shipped', tracking_number: 'SF-123456' })
    });
    assert.equal(shipRes.status, 200);
    assert.equal(capiCalls.length, 1);
  } finally {
    await closeServer(server);
  }
});

// ===========================================================================
// 6. Feeds, SSR SEO Routes, Robots/Noindex & Internal Asset Protection
// ===========================================================================
test('Feeds exclude unverified SKUs, SSR product/collection routes return canonical SEO markup, and internal audit docs return 404', async () => {
  const store = createInMemoryStore({
    configured: true,
    productOverrides: {
      'CAT-001': {
        price_bdt: 2350,
        is_available: true,
        stock_count: 4,
        stock_verified: true,
        price_review: false
      }
    }
  });
  const app = createApp({ store });
  const { server, baseUrl } = await startTestServer(app);
  try {
    // Feeds only include verified & price-approved CAT-001 (1 of 53), not unverified 52 items
    const jsonFeedRes = await fetch(`${baseUrl}/api/catalog-feed.json`);
    assert.equal(jsonFeedRes.status, 200);
    const jsonFeed = await jsonFeedRes.json();
    assert.equal(jsonFeed.totalCatalogSkus, 53);
    assert.equal(jsonFeed.eligibleFeedSkus, 1);
    assert.equal(jsonFeed.products[0].id, 'CAT-001');
    assert.ok(jsonFeed.products[0].deepLink.endsWith('/products/CAT-001'));

    const csvFeedRes = await fetch(`${baseUrl}/api/catalog-feed.csv`);
    assert.equal(csvFeedRes.status, 200);
    const csvText = await csvFeedRes.text();
    assert.ok(csvText.includes('CAT-001'));
    assert.ok(!csvText.includes('FT-BA-001'));

    // SSR product & collection routes
    const prodPage = await fetch(`${baseUrl}/products/CAT-001`);
    assert.equal(prodPage.status, 200);
    const prodHtml = await prodPage.text();
    assert.ok(prodHtml.includes('<link rel="canonical"'));
    assert.ok(prodHtml.includes('/products/CAT-001'));
    assert.ok(prodHtml.includes('"@type":"Product"') || prodHtml.includes('"@type": "Product"'));
    assert.ok(prodHtml.includes('#/product/CAT-001'));

    const colPage = await fetch(`${baseUrl}/collections/bangles-accessories`);
    assert.equal(colPage.status, 200);
    const colHtml = await colPage.text();
    assert.ok(colHtml.includes('#/collection/bangles-accessories'));

    // Unknown SKU returns 404
    const missingProd = await fetch(`${baseUrl}/products/NOT-A-SKU`);
    assert.equal(missingProd.status, 404);

    // Sitemap lists all 62 URLs cleanly
    const sitemapRes = await fetch(`${baseUrl}/sitemap.xml`);
    assert.equal(sitemapRes.status, 200);
    const sitemapXml = await sitemapRes.text();
    assert.ok(sitemapXml.includes('/products/CAT-001'));
    assert.ok(sitemapXml.includes('/collections/bangles-accessories'));

    // Admin HTML sends noindex header
    const adminRes = await fetch(`${baseUrl}/admin`);
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.headers.get('x-robots-tag'), 'noindex, nofollow');

    // Internal engineering audit & raw JSON dump blocked (404), while official Brand Book PDF is accessible (200)
    const auditMd = await fetch(`${baseUrl}/assets/aistudio/01_REPO_AUDIT_AND_RELEASE_PLAN_968b26f6.md`);
    assert.equal(auditMd.status, 404);
    const masterJson = await fetch(`${baseUrl}/assets/aistudio/PRODUCTS_53_MASTER_DATABASE_d064c566.json`);
    assert.equal(masterJson.status, 404);
    const brandBookPdf = await fetch(`${baseUrl}/assets/aistudio/fariza_s_territory_brand_book_by_pomelli_1e38cd9b.pdf`);
    assert.equal(brandBookPdf.status, 200);
  } finally {
    await closeServer(server);
  }
});

test('Three.js collection card 3D parallax module is wired cleanly without Anime.js tilt conflicts', () => {
  const rootDir = path.join(__dirname, '..');
  const parallaxJs = fs.readFileSync(path.join(rootDir, 'assets/js/threeCollectionParallax.js'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const animeJs = fs.readFileSync(path.join(rootDir, 'assets/js/animePolish.js'), 'utf8');
  const appJs = fs.readFileSync(path.join(rootDir, 'assets/js/app.js'), 'utf8');

  assert.ok(parallaxJs.includes('ThreeCollectionParallax'));
  assert.ok(parallaxJs.includes('setScissorTest(true)'));
  assert.ok(parallaxJs.includes('initThreeCollections'));
  assert.ok(parallaxJs.includes('destroyThreeCollections'));
  assert.ok(indexHtml.includes('/assets/js/threeCollectionParallax.js'));
  assert.ok(appJs.includes('initThreeCollections'));
  assert.ok(appJs.includes('destroyThreeCollections'));

  const tiltMatch = animeJs.match(/initCardTilt\s*\(\)\s*\{[\s\S]*?const cards\s*=\s*document\.querySelectorAll\(([^)]+)\)/);
  assert.ok(tiltMatch, 'initCardTilt selector found');
  assert.ok(!tiltMatch[1].includes('.col-card'), 'animePolish initCardTilt must not compete with Three.js on .col-card');

  // Verify Anime.js staggered entrance for collection cards & dynamic product counts on the collections page
  assert.ok(animeJs.includes('animateCollectionsEntrance'), 'animePolish defines animateCollectionsEntrance');
  assert.ok(animeJs.includes('anime.stagger'), 'animePolish uses anime.stagger for staggered entrance');
  assert.ok(appJs.includes('computeDynamicCollectionStats'), 'app.js defines computeDynamicCollectionStats');
  assert.ok(appJs.includes('fetchAndSyncCollectionCounts'), 'app.js fetches and syncs dynamic collection counts');
  assert.ok(appJs.includes('collections-page-grid'), 'pageCollections renders #collections-page-grid');
  assert.ok(appJs.includes('Shop all ${stats.allCount} pieces'), 'pageCollections displays consistent Shop all 53 pieces CTA');
});

// ===========================================================================
// 8. Owner-Admin vs Staff RBAC & Sensitive Operation Audit Trail (SEC-01)
// ===========================================================================
test('Staff role receives 200 on order ops and 403 on owner-only settings/pricing/CMS/CAPI endpoints while admin actions log audit trail', async () => {
  const store = createInMemoryStore({ configured: true });
  const app = createApp({ store });
  const { server, baseUrl } = await startTestServer(app);
  try {
    // Staff can read orders & catalog
    const staffOrders = await fetch(`${baseUrl}/api/admin/orders`, {
      headers: { Authorization: 'Bearer valid-staff-jwt' }
    });
    assert.equal(staffOrders.status, 200);

    // Staff gets 403 on sensitive owner-only mutations
    const forbiddenChecks = [
      fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PUT',
        headers: { Authorization: 'Bearer valid-staff-jwt', 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivery_fee_dhaka: 50 })
      }),
      fetch(`${baseUrl}/api/admin/coupons`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-staff-jwt', 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'HACK50', discount_type: 'percentage', discount_value: 50 })
      }),
      fetch(`${baseUrl}/api/admin/products/CAT-001`, {
        method: 'PATCH',
        headers: { Authorization: 'Bearer valid-staff-jwt', 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_bdt: 1 })
      }),
      fetch(`${baseUrl}/api/admin/capi-test`, {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-staff-jwt', 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }),
      fetch(`${baseUrl}/api/admin/staff`, {
        headers: { Authorization: 'Bearer valid-staff-jwt' }
      }),
      fetch(`${baseUrl}/api/admin/audit-logs`, {
        headers: { Authorization: 'Bearer valid-staff-jwt' }
      })
    ];
    for (const resPromise of forbiddenChecks) {
      const r = await resPromise;
      assert.equal(r.status, 403);
    }

    // Owner admin succeeds and records audit trail
    const adminPut = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ promo_text: 'Eid Updated Banner' })
    });
    assert.equal(adminPut.status, 200);

    const logsRes = await fetch(`${baseUrl}/api/admin/audit-logs`, {
      headers: { Authorization: 'Bearer valid-admin-jwt' }
    });
    assert.equal(logsRes.status, 200);
    const logsBody = await logsRes.json();
    assert.ok(logsBody.logs.some(l => l.action === 'settings.update' && l.actor_role === 'admin'));
  } finally {
    await closeServer(server);
  }
});

// ===========================================================================
// 9. Durable CAPI Outbox: Preview Never Marked Sent + Meta 500 Retry -> 200 (ADS-01/02)
// ===========================================================================
test('CAPI outbox does not mark preview_no_token as sent and retries Meta 500 failure to live 200 without duplicating event_id', async () => {
  let attemptMode = 'preview';
  const store = createInMemoryStore({ configured: true });
  const dynamicSender = async (params) => {
    if (attemptMode === 'preview') {
      return { status: 200, body: { success: true, delivered: false, mode: 'preview_no_token', event_id: params.eventId } };
    }
    if (attemptMode === 'fail500') {
      return { status: 500, body: { success: false, delivered: false, mode: 'live_production', error: 'Graph temporary error', event_id: params.eventId } };
    }
    return { status: 200, body: { success: true, delivered: true, mode: 'live_production', events_received: 1, fbtrace_id: 'TRACE_OK', event_id: params.eventId } };
  };

  const app = createApp({ store, capiSender: dynamicSender });
  const { server, baseUrl } = await startTestServer(app);
  try {
    const order = await (await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Nadia Islam',
        customer_phone: '01711223344',
        customer_address: 'Banani Road 11, Dhaka',
        items: [{ sku: 'CAT-001', qty: 1 }]
      })
    })).json();
    const ref = order.order_ref;

    // 1) Confirm without live token (preview_no_token): purchase_capi_sent_at MUST remain null
    const confirmPreview = await (await fetch(`${baseUrl}/api/admin/orders/${ref}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' })
    })).json();
    assert.equal(confirmPreview.order.purchase_capi_sent_at, undefined);
    assert.equal(confirmPreview.capi_outbox.status, 'pending');

    // 2) Process under Graph 500 -> marks failed (never sent)
    attemptMode = 'fail500';
    await app.processCapiOutbox(5, baseUrl);
    let outboxRes = await (await fetch(`${baseUrl}/api/admin/capi-outbox`, {
      headers: { Authorization: 'Bearer valid-admin-jwt' }
    })).json();
    assert.equal(outboxRes.events[0].status, 'failed');

    // 3) Retry via operator endpoint under Meta 200 -> marks sent + updates order purchase_capi_sent_at
    attemptMode = 'live';
    const retryRes = await (await fetch(`${baseUrl}/api/admin/capi-outbox/${encodeURIComponent(`pur_${ref}`)}/retry`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: '{}'
    })).json();
    assert.equal(retryRes.event.status, 'sent');
    assert.equal(retryRes.event.event_id, `pur_${ref}`);

    const orderAfter = await store.getOrderByRef(ref);
    assert.ok(orderAfter.data.purchase_capi_sent_at);
  } finally {
    await closeServer(server);
  }
});

// ===========================================================================
// 10. Atomic Inventory Reservation, Oversell 409, Deduction & Cancel Restock (INV-01)
// ===========================================================================
test('Atomic inventory reserves on order, blocks oversell with 409, deducts on shipment, and restocks on cancellation', async () => {
  const store = createInMemoryStore({
    configured: true,
    productOverrides: {
      'CAT-001': { price_bdt: 2350, is_available: true, stock_count: 2, reserved_count: 0, stock_verified: true, price_review: false },
      'CAT-002': { price_bdt: 2150, is_available: true, stock_count: 2, reserved_count: 0, stock_verified: true, price_review: false }
    }
  });
  const app = createApp({ store });
  const { server, baseUrl } = await startTestServer(app);
  try {
    // Reserve all 2 units of CAT-001
    const o1Res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Buyer One',
        customer_phone: '01722334455',
        customer_address: 'Mirpur 10, Dhaka',
        items: [{ sku: 'CAT-001', qty: 2 }]
      })
    });
    assert.equal(o1Res.status, 201);
    const o1 = await o1Res.json();

    // Oversell attempt returns 409 Conflict
    const oversell = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Buyer Two',
        customer_phone: '01822334455',
        customer_address: 'Gulshan 1, Dhaka',
        items: [{ sku: 'CAT-001', qty: 1 }]
      })
    });
    assert.equal(oversell.status, 409);

    // Cancel o1 -> releases reservation back so 2 units can be ordered again
    await fetch(`${baseUrl}/api/admin/orders/${o1.order_ref}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' })
    });

    const o2Res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: 'Buyer Three',
        customer_phone: '01922334455',
        customer_address: 'Uttara Sector 7, Dhaka',
        items: [{ sku: 'CAT-002', qty: 2 }]
      })
    });
    assert.equal(o2Res.status, 201);
    const o2 = await o2Res.json();

    // Confirm then ship o2 -> deducts stock permanently down to 0
    const confirmO2 = await fetch(`${baseUrl}/api/admin/orders/${o2.order_ref}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed' })
    });
    assert.equal(confirmO2.status, 200);
    const shipO2 = await fetch(`${baseUrl}/api/admin/orders/${o2.order_ref}`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'shipped', tracking_number: 'SF-999' })
    });
    assert.equal(shipO2.status, 200);

    const catAfter = await (await fetch(`${baseUrl}/api/catalog`)).json();
    const cat1 = catAfter.products.find(p => p.sku === 'CAT-001');
    const cat2 = catAfter.products.find(p => p.sku === 'CAT-002');
    assert.equal(cat1.available_stock, 2);
    assert.equal(cat2.stock_count, 0);
    assert.equal(cat2.is_available, false);
  } finally {
    await closeServer(server);
  }
});

// ===========================================================================
// 11. Owner CMS (Collection + Product + Media + Archive), Vendor Self-Hosting & Internal Path Blocking
// ===========================================================================
test('Owner CMS creates collection/product/media reflected in catalog & sitemap, archive hides SKU, and internal repo files return 404', async () => {
  const store = createInMemoryStore({ configured: true });
  const app = createApp({ store });
  const { server, baseUrl } = await startTestServer(app);
  const uploadDir = path.join(__dirname, '..', 'assets', 'uploads', 'CAT-099');
  try {
    // Self-hosted @supabase/supabase-js UMD bundle returns 200
    const vendorRes = await fetch(`${baseUrl}/vendor/supabase.js`);
    assert.equal(vendorRes.status, 200);

    // Internal repo files return 404
    for (const p of ['/docs/DEPLOYMENT_AND_ROLLBACK.md', '/supabase/seed.sql', '/lib/supabaseServer.js', '/package.json', '/.env']) {
      const blocked = await fetch(`${baseUrl}${p}`);
      assert.equal(blocked.status, 404, `Expected ${p} to return 404`);
    }

    // Create collection
    const colRes = await fetch(`${baseUrl}/api/admin/collections`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'eid-capsule-2026', name: 'Eid Capsule 2026', name_bn: 'ঈদ ক্যাপসুল ২০২৬' })
    });
    assert.equal(colRes.status, 201);

    // Create product
    const prodRes = await fetch(`${baseUrl}/api/admin/products`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: 'CAT-099',
        collection_slug: 'eid-capsule-2026',
        title: 'Jamuna Royal Muslin',
        price_bdt: 3400,
        stock_count: 6,
        stock_verified: true,
        price_review: false,
        selling_unit: '3-Piece Set'
      })
    });
    assert.equal(prodRes.status, 201);

    // Upload valid 1x1 PNG image (valid magic bytes)
    const tinyPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const mediaRes = await fetch(`${baseUrl}/api/admin/products/CAT-099/media`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_key: 'main', data_url: `data:image/png;base64,${tinyPngBase64}` })
    });
    assert.equal(mediaRes.status, 201);
    const mediaBody = await mediaRes.json();
    assert.ok(mediaBody.url.startsWith('/assets/uploads/CAT-099/main-'));

    // Reject spoofed executable masquerading as PNG
    const badMedia = await fetch(`${baseUrl}/api/admin/products/CAT-099/media`, {
      method: 'POST',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ asset_key: 'main', data_url: `data:image/png;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}` })
    });
    assert.equal(badMedia.status, 400);

    // Appears in public catalog, SSR route with og:url, and sitemap.xml
    const pubCat = await (await fetch(`${baseUrl}/api/catalog`)).json();
    assert.ok(pubCat.products.some(p => p.sku === 'CAT-099' && p.feed_eligible === true));
    const ssrHtml = await (await fetch(`${baseUrl}/products/CAT-099`)).text();
    assert.ok(ssrHtml.includes('og:url') && ssrHtml.includes('/products/CAT-099'));
    const sitemap = await (await fetch(`${baseUrl}/sitemap.xml`)).text();
    assert.ok(sitemap.includes('/products/CAT-099') && sitemap.includes('/collections/eid-capsule-2026'));

    // Archiving removes from public catalog & returns 404 on /products/CAT-099
    await fetch(`${baseUrl}/api/admin/products/CAT-099`, {
      method: 'PATCH',
      headers: { Authorization: 'Bearer valid-admin-jwt', 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_archived: true })
    });
    const archivedSsr = await fetch(`${baseUrl}/products/CAT-099`);
    assert.equal(archivedSsr.status, 404);
  } finally {
    fs.rmSync(uploadDir, { recursive: true, force: true });
    await closeServer(server);
  }
});

// ===========================================================================
// 12. Canonical .env.example Parser, Secret Leak Guard & Production CAPI Guard
// ===========================================================================
test('Environment parser, service_role leak guard, and production META_TEST_EVENT_CODE guard operate securely', async () => {
  const { parseDotEnvContent, getSupabaseConfig, isServiceRoleJwt } = require('../lib/supabaseServer.js');
  const rootDir = path.join(__dirname, '..');

  // 1. Parse both /.env.example and /public/assets/aistudio/.env_ae6e09f3.example (CRLF)
  const rootEnvRaw = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
  const parsedRootEnv = parseDotEnvContent(rootEnvRaw);
  assert.equal(parsedRootEnv.PORT, '3000');
  assert.equal(parsedRootEnv.NODE_ENV, 'production');
  assert.equal(parsedRootEnv.PUBLIC_SITE_URL, 'https://farizasterritory.com');
  assert.equal(parsedRootEnv.ALLOWED_ORIGINS, 'https://farizasterritory.com');
  assert.equal(parsedRootEnv.SUPABASE_URL, 'https://vjbhrdclcnxevunskodm.supabase.co');
  assert.equal(parsedRootEnv.META_DATASET_ID, '1657670575734647');
  assert.equal(parsedRootEnv.META_PIXEL_ID, '1657670575734647');
  assert.equal(parsedRootEnv.SUPABASE_SERVICE_ROLE_KEY, '');
  assert.equal(parsedRootEnv.META_CAPI_ACCESS_TOKEN, '');
  assert.equal(parsedRootEnv.META_TEST_EVENT_CODE, '');

  const attachedEnvPath = path.join(rootDir, 'public/assets/aistudio/.env_ae6e09f3.example');
  if (fs.existsSync(attachedEnvPath)) {
    const attachedParsed = parseDotEnvContent(fs.readFileSync(attachedEnvPath, 'utf8'));
    assert.deepEqual(attachedParsed, parsedRootEnv);
  }

  // 2. Service role JWT leak guard prevents accidental exposure via SUPABASE_ANON_KEY
  const fakeServiceRolePayload = Buffer.from(JSON.stringify({ role: 'service_role', iss: 'supabase' })).toString('base64url');
  const fakeServiceRoleJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakeServiceRolePayload}.sig`;
  assert.equal(isServiceRoleJwt(fakeServiceRoleJwt), true);

  const fakeAnonPayload = Buffer.from(JSON.stringify({ role: 'anon', iss: 'supabase' })).toString('base64url');
  const fakeAnonJwt = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${fakeAnonPayload}.sig`;
  assert.equal(isServiceRoleJwt(fakeAnonJwt), false);

  const prevAnon = process.env.SUPABASE_ANON_KEY;
  const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const prevNodeEnv = process.env.NODE_ENV;
  const prevTestCode = process.env.META_TEST_EVENT_CODE;

  try {
    process.env.SUPABASE_ANON_KEY = fakeServiceRoleJwt;
    process.env.SUPABASE_SERVICE_ROLE_KEY = fakeServiceRoleJwt;
    const guardedCfg = getSupabaseConfig();
    assert.equal(guardedCfg.anonKey, '', 'anonKey must be suppressed if set to a service_role token');
    assert.equal(guardedCfg.anonKeySuppressed, true);
    assert.equal(guardedCfg.isAdminConfigured, true);
    assert.equal(guardedCfg.isAnonConfigured, false);

    // 3. In NODE_ENV=production, stray META_TEST_EVENT_CODE is suppressed on live events but allowed on admin diagnostics
    process.env.NODE_ENV = 'production';
    process.env.META_TEST_EVENT_CODE = 'TEST99999';

    const liveBuilt = capiHandler.buildCapiPayload({ eventName: 'Lead' }, { allowTestCode: false });
    assert.equal(liveBuilt.requestedTestCode, null);
    assert.equal(liveBuilt.payload.test_event_code, undefined);

    const adminTestBuilt = capiHandler.buildCapiPayload({ eventName: 'Lead' }, { allowTestCode: true });
    assert.equal(adminTestBuilt.requestedTestCode, 'TEST99999');
    assert.equal(adminTestBuilt.payload.test_event_code, 'TEST99999');
  } finally {
    if (prevAnon === undefined) delete process.env.SUPABASE_ANON_KEY;
    else process.env.SUPABASE_ANON_KEY = prevAnon;
    if (prevService === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
    if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNodeEnv;
    if (prevTestCode === undefined) delete process.env.META_TEST_EVENT_CODE;
    else process.env.META_TEST_EVENT_CODE = prevTestCode;
  }
});

// ===========================================================================
// 13. 3D Admin Cockpit, Three.js, ThreeUI.js, Anime.js & Motion.dev Verification
// ===========================================================================
test('Admin Cockpit integrates Three.js, ThreeUI.js, Anime.js, Motion.dev, and complete store operations', () => {
  const rootDir = path.join(__dirname, '..');
  const adminHtml = fs.readFileSync(path.join(rootDir, 'admin.html'), 'utf8');

  // Verify required libraries are loaded in admin.html
  assert.ok(adminHtml.includes('three.min.js'), 'admin.html must load Three.js');
  assert.ok(adminHtml.includes('/assets/js/threeui.js'), 'admin.html must load ThreeUI.js');
  assert.ok(adminHtml.includes('/assets/js/threeAdminCockpit.js'), 'admin.html must load threeAdminCockpit.js');
  assert.ok(adminHtml.includes('anime.min.js'), 'admin.html must load Anime.js');
  assert.ok(adminHtml.includes('motion@'), 'admin.html must load Motion.dev');

  // Verify key cockpit operational canvases and modules exist
  assert.ok(adminHtml.includes('id="cockpit-3d-canvas"'), 'admin.html must include the 3D spatial cockpit canvas');
  assert.ok(adminHtml.includes('id="sku-3d-inspector-canvas"'), 'admin.html must include the 3D SKU inspector turntable canvas');
  assert.ok(adminHtml.includes('id="cmd-palette-modal"'), 'admin.html must include the Command Palette');
  assert.ok(adminHtml.includes('bulkApproveAllCatalogForFeed'), 'admin.html must support 1-click bulk approval for all 53 SKUs');
  assert.ok(adminHtml.includes('exportCourierManifestCSV'), 'admin.html must support Courier Manifest CSV export');

  // Verify ThreeUI and FT_COCKPIT_3D modules load cleanly in Node
  const threeUiMod = require('../assets/js/threeui.js');
  const cockpit3dMod = require('../assets/js/threeAdminCockpit.js');
  assert.equal(typeof threeUiMod.SpatialCanvasPanel, 'function');
  assert.equal(typeof threeUiMod.SpatialDialGauge, 'function');
  assert.equal(typeof threeUiMod.createCompositePillar, 'function');
  assert.equal(typeof cockpit3dMod.AdminCockpit3D, 'function');
  assert.equal(typeof cockpit3dMod.SkuInspector3D, 'function');

  // Verify threeHero.js guards InstancedMesh.computeBoundingSphere for Three.js r128
  const threeHeroJs = fs.readFileSync(path.join(rootDir, 'assets/js/threeHero.js'), 'utf8');
  assert.ok(
    threeHeroJs.includes("typeof beads.computeBoundingSphere === 'function'"),
    'threeHero.js must guard computeBoundingSphere() for Three.js r128 compatibility'
  );
});

// ===========================================================================
// 11. Stock Caps, Admin Order Coupons, Validation, 404 Assets & Zero-Stock SSR
// ===========================================================================
test('Stock caps, admin manual order coupons, coupon/settings validation, missing asset 404s, and zero-stock SSR', async () => {
  const catalog = loadCatalogInMemory();
  const sampleSku = 'CAT-001';
  const lowStockMap = {
    [sampleSku]: Object.assign({}, catalog.PRODUCTS_BY_SKU[sampleSku], {
      stock_count: 2,
      stock_verified: true,
      price_review: false,
      is_available: true
    }),
    'CAT-002': Object.assign({}, catalog.PRODUCTS_BY_SKU['CAT-002'], {
      stock_count: 0,
      stock_verified: true,
      price_review: false,
      is_available: true
    })
  };

  // Commerce stock cap & feed eligibility checks
  assert.equal(
    commerce.computeOrderTotals({ items: [{ sku: sampleSku, qty: 3 }], productsBySku: lowStockMap }).ok,
    false
  );
  assert.equal(
    commerce.computeOrderTotals({ items: [{ sku: sampleSku, qty: 2 }], productsBySku: lowStockMap }).ok,
    true
  );
  assert.equal(commerce.isFeedEligibleProduct(lowStockMap['CAT-002']), false);
  assert.equal(commerce.getProductFeedAvailability(lowStockMap['CAT-002']), 'out of stock');

  const store = createInMemoryStore({
    configured: true,
    productOverrides: {
      'CAT-001': {
        price_bdt: 2350,
        is_available: true,
        stock_count: 0,
        stock_verified: true,
        price_review: false
      }
    }
  });
  const app = createApp({ store });
  const { server, baseUrl } = await startTestServer(app);
  try {
    // Missing asset returns 404 JSON instead of SPA fallback HTML
    const missingAssetRes = await fetch(`${baseUrl}/assets/js/does-not-exist.js`);
    assert.equal(missingAssetRes.status, 404);
    const missingAssetJson = await missingAssetRes.json();
    assert.equal(missingAssetJson.ok, false);

    // SSR product page emits OutOfStock when stock_count === 0
    const ssrZeroStock = await fetch(`${baseUrl}/products/CAT-001`);
    assert.equal(ssrZeroStock.status, 200);
    const ssrHtml = await ssrZeroStock.text();
    assert.ok(ssrHtml.includes('https://schema.org/OutOfStock'));

    // Admin manual order rejects invalid coupon
    const badCouponOrder = await fetch(`${baseUrl}/api/admin/orders`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-jwt',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: 'Manual Buyer',
        customer_phone: '01712345678',
        customer_address: 'Mirpur 11',
        delivery_zone: 'dhaka',
        discount_code: 'NO_SUCH_CODE',
        items: [{ sku: 'CAT-002', qty: 1 }]
      })
    });
    assert.equal(badCouponOrder.status, 400);

    // Admin manual order applies valid coupon FIRST25 (CAT-002 = 2150 -> 500 discount + 80 dhaka = 1730)
    const goodCouponOrder = await fetch(`${baseUrl}/api/admin/orders`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-jwt',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customer_name: 'Manual Buyer',
        customer_phone: '01712345678',
        customer_address: 'Mirpur 11',
        delivery_zone: 'dhaka',
        discount_code: 'FIRST25',
        items: [{ sku: 'CAT-002', qty: 1 }]
      })
    });
    assert.equal(goodCouponOrder.status, 201);
    const goodBody = await goodCouponOrder.json();
    assert.equal(goodBody.order.discount_code, 'FIRST25');
    assert.equal(goodBody.order.discount_amount, 500);
    assert.equal(goodBody.order.total, 1730);

    // Admin coupon endpoint rejects invalid percentage > 100
    const badPctRes = await fetch(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-admin-jwt',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code: 'OVER100',
        discount_type: 'percentage',
        discount_value: 150,
        min_spend: 0
      })
    });
    assert.equal(badPctRes.status, 400);

    // Admin settings rejects negative fee and bad facebook URL
    const badSettingsFee = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer valid-admin-jwt',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ delivery_fee_dhaka: -10 })
    });
    assert.equal(badSettingsFee.status, 400);

    const badSettingsUrl = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer valid-admin-jwt',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ facebook_url: 'javascript:alert(1)' })
    });
    assert.equal(badSettingsUrl.status, 400);

    // Partial settings update preserves existing untouched fields
    const partialSettingsRes = await fetch(`${baseUrl}/api/admin/settings`, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer valid-admin-jwt',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ delivery_fee_dhaka: 90 })
    });
    assert.equal(partialSettingsRes.status, 200);
    const partialSettingsBody = await partialSettingsRes.json();
    assert.equal(partialSettingsBody.settings.delivery_fee_dhaka, 90);
    assert.equal(partialSettingsBody.settings.delivery_fee_outside, 150);
    assert.equal(partialSettingsBody.settings.meta_pixel_id, '1657670575734647');
  } finally {
    await closeServer(server);
  }
});
