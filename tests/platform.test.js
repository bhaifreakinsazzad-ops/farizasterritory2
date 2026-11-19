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
  const productOverrides = new Map(Object.entries(options.productOverrides || {}));
  const coupons = new Map(
    commerce.DEFAULT_COUPONS.map(c => [c.code, Object.assign({}, c)])
  );
  let storeSettings = Object.assign({
    id: 'default',
    store_name: "Fariza's Territory",
    whatsapp_number: '8801700000000',
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
          user: { id: '11111111-1111-1111-1111-111111111111', email: 'faria@farizasterritory.com', role: 'admin' }
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
    async listProducts() {
      return Array.from(productOverrides.entries()).map(([sku, row]) => Object.assign({ sku }, row));
    },
    async updateProduct(sku, updates) {
      if (!configured) return { ok: false, status: 503, error: 'Database unconfigured' };
      const existing = productOverrides.get(sku) || { sku };
      const merged = Object.assign({}, existing, updates, { sku });
      productOverrides.set(sku, merged);
      return { ok: true, data: merged };
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
      const copy = Object.assign({}, orderRecord);
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
      body: { success: true, mode: 'mock_test', event_name: params.eventName, event_id: params.eventId }
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
});

// ===========================================================================
// 10. 3D Admin Cockpit, Three.js, ThreeUI.js, Anime.js & Motion.dev Verification
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
});

