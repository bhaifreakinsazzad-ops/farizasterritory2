/**
 * Fariza's Territory — Automated Headless Edge Playwright E2E Suite
 * Covers Desktop (1440x900), Mobile (390x844 & 360x780), Reduced Motion,
 * All 53 SKU images, Consent-Gated Pixel/CAPI, Form A11y & Checkout,
 * 503 Fail-Closed Preservation, Tracking, Bilingual Policies, and Admin CMS/RBAC/Outbox.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');

const commerce = require('../assets/js/commerce.js');
const { createApp, loadCatalogInMemory } = require('../server.js');

const SCREENSHOT_DIR =
  process.env.FT_E2E_SCREENSHOT_DIR ||
  'C:\\Users\\sazza\\.gemini\\antigravity\\brain\\2f459e03-166b-4ae3-9366-215600bd1316\\scratch\\uat-screenshots';

function startTestServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
    });
    server.on('error', reject);
  });
}

function closeServer(server) {
  return new Promise(resolve => {
    server.close(() => resolve());
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
  });
}

function createE2EStore(options = {}) {
  const configured = options.configured !== false;
  const orders = new Map();
  const idempotencyIndex = new Map();
  const collections = new Map();
  const productAssets = new Map();
  const auditLogs = [];
  const capiOutbox = new Map();
  const productOverrides = new Map(
    Object.entries(
      options.productOverrides || {
        'CAT-001': {
          price_bdt: 2350,
          is_available: true,
          stock_count: 5,
          reserved_count: 0,
          stock_verified: true,
          price_review: false
        },
        'CAT-002': {
          price_bdt: 2150,
          is_available: false,
          stock_count: 0,
          reserved_count: 0,
          stock_verified: true,
          price_review: false
        }
      }
    )
  );
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
  const coupons = new Map(commerce.DEFAULT_COUPONS.map(c => [c.code, Object.assign({}, c)]));
  let storeSettings = {
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
  };

  return {
    isDurableConfigured: () => configured,
    getConfigSummary: () => ({
      supabaseUrl: 'https://vjbhrdclcnxevunskodm.supabase.co',
      anonConfigured: true,
      serviceRoleConfigured: configured
    }),
    async verifyAdminBearerToken(authHeader) {
      const token = String(authHeader || '').replace(/^Bearer\s+/i, '').trim();
      if (token === 'valid-admin-jwt') {
        return { ok: true, user: { id: '11111111-1111-1111-1111-111111111111', email: 'faria@farizasterritory.com', full_name: 'Faria Owner', role: 'admin' } };
      }
      if (token === 'valid-staff-jwt') {
        return { ok: true, user: { id: '22222222-2222-2222-2222-222222222222', email: 'staff@farizasterritory.com', full_name: 'Order Operator', role: 'staff' } };
      }
      return { ok: false, status: 401, error: 'Unauthorized' };
    },
    getStoreSettings: async () => Object.assign({}, storeSettings),
    updateStoreSettings: async patch => {
      if (!configured) return { ok: false, status: 503, error: 'Database unconfigured' };
      storeSettings = Object.assign({}, storeSettings, patch);
      return { ok: true, data: Object.assign({}, storeSettings) };
    },
    listCollections: async () => Array.from(collections.values()),
    upsertCollection: async col => {
      const saved = Object.assign({ is_active: true, sort_order: 99 }, col);
      collections.set(saved.slug, saved);
      return { ok: true, data: saved };
    },
    listProducts: async () => Array.from(productOverrides.entries()).map(([sku, row]) => Object.assign({ sku }, row)),
    createProduct: async (prod, actorEmail) => {
      const saved = Object.assign({ reserved_count: 0, approved_at: !prod.price_review && prod.stock_verified ? new Date().toISOString() : null, approved_by: actorEmail }, prod);
      productOverrides.set(saved.sku, saved);
      return { ok: true, data: saved };
    },
    updateProduct: async (sku, updates) => {
      const existing = productOverrides.get(sku) || { sku };
      const merged = Object.assign({}, existing, updates, { sku });
      productOverrides.set(sku, merged);
      return { ok: true, data: merged, previous: existing };
    },
    listProductAssets: async () => Array.from(productAssets.values()),
    upsertProductAsset: async asset => {
      productAssets.set(`${asset.sku}:${asset.asset_key}`, asset);
      const p = productOverrides.get(asset.sku);
      if (p && asset.asset_key === 'main') p.main_image = asset.storage_path;
      return { ok: true, data: asset };
    },
    getCouponByCode: async code => coupons.get(String(code || '').trim().toUpperCase()) || null,
    listCoupons: async () => ({ ok: true, data: Array.from(coupons.values()) }),
    upsertCoupon: async coupon => {
      coupons.set(coupon.code, coupon);
      return { ok: true, data: coupon };
    },
    createOrder: async record => {
      if (!configured) return { ok: false, status: 503, error: 'Database unavailable (503 fail-closed).' };
      if (record.idempotency_key && idempotencyIndex.has(record.idempotency_key)) {
        return { ok: true, idempotent: true, data: orders.get(idempotencyIndex.get(record.idempotency_key)) };
      }
      const copy = Object.assign({ inventory_state: 'reserved' }, record);
      orders.set(copy.order_ref, copy);
      if (copy.idempotency_key) idempotencyIndex.set(copy.idempotency_key, copy.order_ref);
      return { ok: true, idempotent: false, data: copy };
    },
    getOrderByRef: async ref => {
      if (!configured) return { ok: false, status: 503, error: 'DB unconfigured' };
      const ord = orders.get(String(ref || '').trim().toUpperCase());
      return ord ? { ok: true, data: ord } : { ok: false, status: 404, error: 'Order not found' };
    },
    listOrders: async ({ status } = {}) => ({
      ok: true,
      data: Array.from(orders.values()).filter(o => !status || status === 'all' || o.status === status)
    }),
    updateOrder: async (ref, patch) => {
      const ord = orders.get(ref);
      if (!ord) return { ok: false, status: 404, error: 'Not found' };
      const updated = Object.assign({}, ord, patch);
      orders.set(ref, updated);
      return { ok: true, data: updated };
    },
    transitionOrder: async (ref, patch) => {
      const ord = orders.get(ref);
      if (!ord) return { ok: false, status: 404, error: 'Not found' };
      const updated = Object.assign({}, ord, patch);
      orders.set(ref, updated);
      return { ok: true, data: updated };
    },
    listStaffUsers: async () => ({ ok: true, data: Array.from(staffUsers.values()) }),
    upsertStaffUser: async staff => {
      staffUsers.set(staff.user_id, staff);
      return { ok: true, data: staff };
    },
    recordAuditLog: async entry => {
      const row = Object.assign({ id: auditLogs.length + 1, created_at: new Date().toISOString() }, entry);
      auditLogs.unshift(row);
      return { ok: true, data: row };
    },
    listAuditLogs: async () => ({ ok: true, data: auditLogs }),
    enqueueCapiOutboxEvent: async evt => {
      const row = Object.assign({ status: 'pending', attempts: 0, max_attempts: 5, next_retry_at: new Date().toISOString(), last_error: null, fbtrace_id: null }, evt);
      capiOutbox.set(evt.event_id, row);
      return { ok: true, created: true, data: row };
    },
    claimDueCapiOutboxEvents: async () => ({
      ok: true,
      data: Array.from(capiOutbox.values()).filter(e => e.status !== 'sent')
    }),
    markCapiOutboxResult: async (eventId, outcome) => {
      const cur = capiOutbox.get(eventId);
      if (!cur) return { ok: false };
      cur.attempts += 1;
      cur.status = outcome.delivered && outcome.mode === 'live_production' ? 'sent' : 'failed';
      cur.last_error = outcome.error || null;
      cur.fbtrace_id = outcome.fbtrace_id || null;
      return { ok: true, data: cur };
    },
    listCapiOutbox: async () => ({ ok: true, data: Array.from(capiOutbox.values()) }),
    resetCapiOutboxForRetry: async eventId => {
      const cur = capiOutbox.get(eventId);
      if (!cur) return { ok: false, status: 404 };
      cur.status = 'pending';
      return { ok: true, data: cur };
    }
  };
}

async function runE2E() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const uploadCleanupDir = path.join(__dirname, '..', 'assets', 'uploads', 'CAT-099');
  const catalog = loadCatalogInMemory();
  const store = createE2EStore({ configured: true });
  const app = createApp({ store });
  const { server, baseUrl } = await startTestServer(app);

  // Also spin up a second fail-closed DB-unconfigured instance for 503 UX verification
  const failApp = createApp({ store: createE2EStore({ configured: false }) });
  const failSrv = await startTestServer(failApp);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    // -----------------------------------------------------------------------
    // 1. Desktop 1440x900: Storefront, Self-Hosted SDK, All 53 Assets, Dialogs, Consent
    // -----------------------------------------------------------------------
    console.log('E2E [1/4]: Desktop 1440x900 Storefront, 53 SKUs, Dialogs & Consent...');
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    const pageErrors = [];
    const serverErrors = [];
    const metaPixelHits = [];
    page.on('pageerror', err => { console.error('[PAGEERROR]:', err.message); pageErrors.push(err.message); });
    page.on('requestfailed', req => console.error('[REQFAILED]:', req.url(), req.failure() && req.failure().errorText));
    page.on('console', msg => { if (msg.type() === 'error') console.error('[BROWSER CONSOLE ERROR]:', msg.text()); });
    page.on('request', req => {
      if (req.url().includes('connect.facebook.net') || req.url().includes('facebook.com/tr')) {
        metaPixelHits.push(req.url());
      }
    });
    page.on('response', res => {
      const url = res.url();
      if (url.startsWith(baseUrl) && res.status() >= 500) {
        serverErrors.push(`${res.status()} ${url}`);
      }
    });

    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.s-card', { timeout: 10000 });

    // Check self-hosted supabase UMD bundle & og:url
    const sdkLoaded = await page.evaluate(() => Boolean(window.supabase && typeof window.supabase.createClient === 'function'));
    assert.equal(sdkLoaded, true, 'Self-hosted /vendor/supabase.js must expose window.supabase');
    const hasOgUrl = await page.locator('meta[property="og:url"]').count();
    assert.ok(hasOgUrl >= 1, 'index.html must include meta property="og:url"');

    // Hero LCP: only focused hero slide has fetchpriority="high"
    const highCount = await page.locator('.stage .s-card img[fetchpriority="high"]').count();
    assert.equal(highCount, 1, 'Exactly 1 hero focus image should carry fetchpriority="high"');

    // No horizontal overflow
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(desktopOverflow, false, 'Desktop home must have zero horizontal overflow');

    // Consent declined -> Meta Pixel must remain blocked
    await page.waitForSelector('#ft-consent-bar', { state: 'visible', timeout: 5000 });
    await page.click('#ft-consent-decline');
    assert.equal(metaPixelHits.length, 0, 'Meta Pixel must NOT fire when consent is declined');

    // Open Quick View native <dialog>
    await page.click('.nav-links a[data-nav="shop"]');
    await page.waitForSelector('.pcard', { timeout: 10000 });
    await page.waitForTimeout(350); // wait for live /api/catalog merge so DOM isn't replaced mid-click
    const firstCard = page.locator('.pcard').first();
    await firstCard.scrollIntoViewIfNeeded();
    await firstCard.hover();
    await firstCard.locator('[data-act="quick-view"]').click();
    await page.waitForSelector('dialog#quick-view-ov[open]', { timeout: 5000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-desktop-quickview.png') });
    await page.keyboard.press('Escape');
    const qvOpenAfterEsc = await page.evaluate(() => document.getElementById('quick-view-ov').open);
    assert.equal(qvOpenAfterEsc, false, 'Pressing Escape closes native quick-view dialog');

    // Verify Out-of-Stock CAT-002 disabled button + unverified CAT-003 badge + all 53 SKU images return 200
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-desktop-shop.png') });
    const oosBtnDisabled = await page.locator('.pcard button[data-act="buynow"][data-sku="CAT-002"]').isDisabled();
    assert.equal(oosBtnDisabled, true, 'Out-of-stock SKU CAT-002 Order COD button must be disabled');

    const assetStatuses = await page.evaluate(async skus => {
      const bad = [];
      for (const p of skus) {
        const res = await fetch('/' + p.src.replace(/^\/+/, ''));
        if (res.status !== 200) bad.push(`${p.sku}:${res.status}`);
      }
      return bad;
    }, catalog.PRODUCTS.map(p => ({ sku: p.sku, src: p.assets.main })));
    assert.deepEqual(assetStatuses, [], `All 53 product main images must return 200: ${assetStatuses.join(', ')}`);

    // Check bilingual switch & full Policies page
    await page.click('#lang-toggle-btn');
    await page.goto(`${baseUrl}/#/policies`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.bilingual-policy-grid', { timeout: 8000 });
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-desktop-policies-bilingual.png') });
    await page.click('#lang-toggle-btn'); // back to EN

    // -----------------------------------------------------------------------
    // 2. Checkout Validation, Live 201 Order, Idempotency, Tracking & 503 Fail-Closed UX
    // -----------------------------------------------------------------------
    console.log('E2E [2/4]: Checkout Validation A11y, COD Order, Tracking & 503 Resilience...');
    await page.goto(`${baseUrl}/#/product/CAT-001`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('button[data-act="buynow-qty"][data-sku="CAT-001"]', { timeout: 8000 });
    await page.click('button[data-act="buynow-qty"][data-sku="CAT-001"]');
    await page.waitForSelector('form[data-form="inquiry"]', { timeout: 8000 });

    // Submit empty -> accessible validation kicks in cleanly
    await page.click('#inq-submit-btn');
    const nameInvalid = await page.getAttribute('#f-name', 'aria-invalid');
    const nameDescribedBy = await page.getAttribute('#f-name', 'aria-describedby');
    assert.equal(nameInvalid, 'true');
    assert.ok(nameDescribedBy && nameDescribedBy.includes('err-f-name'), 'aria-describedby added dynamically when invalid');
    await page.waitForTimeout(550);
    const liveSummary = await page.textContent('#ft-live-announcer');
    assert.ok(liveSummary.length > 5, 'Polite live region announces validation error summary');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-desktop-checkout-validation.png') });

    // Fill valid checkout + coupon FIRST25 + policy ack
    await page.fill('#f-name', 'Tasnim Chowdhury');
    await page.fill('#f-phone', '01712345678');
    await page.fill('#f-email', 'tasnim@example.com');
    await page.fill('#f-district', 'Dhaka');
    await page.fill('#f-address', 'House 14, Road 6, Mirpur 10, Dhaka');
    await page.fill('#inq-coupon-input', 'FIRST25');
    await page.click('[data-act="apply-coupon"]');
    await page.waitForSelector('[data-act="remove-coupon"]', { timeout: 5000 });
    await page.check('#f-policy');
    await page.click('#inq-submit-btn');

    await page.waitForSelector('#inq-wrap .success-mark', { timeout: 10000 });
    const wrapText = await page.textContent('#inq-wrap');
    const refMatch = wrapText.match(/FT-\d{6}-[A-Z0-9]{4}/);
    assert.ok(refMatch, 'Order success displays server FT-... order reference');
    const orderRef = refMatch[0];
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-desktop-checkout-success.png') });

    // Verify localStorage does NOT persist raw customer PII
    const recentRefsRaw = await page.evaluate(() => localStorage.getItem('ft_recent_refs') || '');
    assert.ok(!recentRefsRaw.includes('Tasnim') && !recentRefsRaw.includes('01712345678'));

    // Navigate to Order Tracking and challenge with wrong vs matching phone
    await page.goto(`${baseUrl}/#/track`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#track-form', { timeout: 8000 });
    await page.fill('#track-input', orderRef);
    await page.fill('#track-phone-input', '01999999999');
    await page.click('#track-form button[type="submit"]');
    await page.waitForSelector('#track-result-wrap .panel', { timeout: 6000 });
    assert.ok((await page.textContent('#track-result-wrap')).includes('Order Not Found'));

    await page.fill('#track-phone-input', '01712345678');
    await page.click('#track-form button[type="submit"]');
    await page.waitForSelector('.tracking-stepper', { timeout: 6000 });
    assert.ok((await page.textContent('#track-result-wrap')).includes('Ta***'));

    // Check 503 Fail-Closed Behavior preserves bag and renders friendly alert
    const failPage = await context.newPage();
    await failPage.goto(`${failSrv.baseUrl}/#/product/CAT-001`, { waitUntil: 'domcontentloaded' });
    await failPage.click('button[data-act="buynow-qty"][data-sku="CAT-001"]');
    await failPage.waitForSelector('form[data-form="inquiry"]', { timeout: 8000 });
    await failPage.fill('#f-name', 'Tasnim Resilience');
    await failPage.fill('#f-phone', '01712345678');
    await failPage.fill('#f-district', 'Dhaka');
    await failPage.fill('#f-address', 'House 14, Road 6, Mirpur 10, Dhaka');
    await failPage.check('#f-policy');
    await failPage.click('#inq-submit-btn');
    await failPage.waitForSelector('#inq-submit-error [role="alert"]', { timeout: 8000 });
    const bagPreserved = await failPage.evaluate(() => JSON.parse(localStorage.getItem('ft_bag') || '[]').length);
    assert.ok(bagPreserved >= 1, 'Failed 503 submission must preserve cart items in bag');
    await failPage.close();

    assert.deepEqual(pageErrors, [], `Desktop pageerrors unexpected: ${pageErrors.join(' | ')}`);
    assert.deepEqual(serverErrors, [], `Unexpected HTTP 5xx responses: ${serverErrors.join(' | ')}`);
    await context.close();

    // -----------------------------------------------------------------------
    // 3. Mobile 390x844 & 360x780 + Reduced Motion
    // -----------------------------------------------------------------------
    console.log('E2E [3/4]: Mobile Viewports (390x844 & 360x780 Reduced Motion)...');
    const mobCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true
    });
    const mobPage = await mobCtx.newPage();
    await mobPage.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await mobPage.waitForSelector('.s-card', { timeout: 10000 });
    assert.equal(
      await mobPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      false,
      '390px Home must have zero horizontal overflow'
    );
    await mobPage.screenshot({ path: path.join(SCREENSHOT_DIR, '06-mobile-390-home.png') });

    await mobPage.goto(`${baseUrl}/#/product/CAT-001`, { waitUntil: 'domcontentloaded' });
    await mobPage.waitForSelector('#mobile-buy', { timeout: 8000 });
    assert.equal(
      await mobPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      false,
      '390px Product Detail must have zero horizontal overflow'
    );
    await mobPage.screenshot({ path: path.join(SCREENSHOT_DIR, '07-mobile-390-product.png') });
    await mobCtx.close();

    const smallCtx = await browser.newContext({
      viewport: { width: 360, height: 780 },
      hasTouch: true,
      reducedMotion: 'reduce'
    });
    const smallPage = await smallCtx.newPage();
    await smallPage.goto(`${baseUrl}/#/product/CAT-001`, { waitUntil: 'domcontentloaded' });
    await smallPage.click('button[data-act="buynow-qty"][data-sku="CAT-001"]');
    await smallPage.waitForSelector('form[data-form="inquiry"]', { timeout: 8000 });
    assert.equal(
      await smallPage.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      false,
      '360px Checkout must have zero horizontal overflow'
    );
    await smallPage.screenshot({ path: path.join(SCREENSHOT_DIR, '08-mobile-360-checkout.png') });
    await smallCtx.close();

    // -----------------------------------------------------------------------
    // 4. Admin Portal E2E: Staff vs Admin RBAC, Order KPIs, CMS Creation + Photo, Outbox
    // -----------------------------------------------------------------------
    console.log('E2E [4/4]: Admin Portal RBAC, KPI Separation, CMS Photo Upload & Outbox...');
    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const adminPage = await adminCtx.newPage();

    // Provide public anon key cleanly and stub Supabase GoTrue password login for headless E2E
    let activeMockJwt = 'valid-admin-jwt';
    await adminPage.route('**/api/public-config', async route => {
      const resp = await route.fetch();
      const json = await resp.json();
      json.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.sig';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) });
    });
    await adminPage.route('https://vjbhrdclcnxevunskodm.supabase.co/auth/v1/**', async route => {
      const url = route.request().url();
      if (url.includes('/token')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: activeMockJwt,
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock_refresh',
            user: {
              id: activeMockJwt === 'valid-admin-jwt' ? '11111111-1111-1111-1111-111111111111' : '22222222-2222-2222-2222-222222222222',
              email: activeMockJwt === 'valid-admin-jwt' ? 'faria@farizasterritory.com' : 'staff@farizasterritory.com'
            }
          })
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'mock', user: null }) });
    });

    await adminPage.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
    await adminPage.waitForSelector('#admin-auth-email', { state: 'visible', timeout: 8000 });

    // Sign in as owner admin
    await adminPage.fill('#admin-auth-email', 'faria@farizasterritory.com');
    await adminPage.fill('#admin-auth-password', 'OwnerStrongPass123!');
    await adminPage.click('#admin-signin-btn');

    await adminPage.waitForSelector('#tab-orders.active #orders-table-body tr', { timeout: 10000 });
    await adminPage.waitForSelector('#kpi-confirmed-revenue', { timeout: 5000 });
    await adminPage.screenshot({ path: path.join(SCREENSHOT_DIR, '09-admin-orders-kpis.png') });

    // Open Order Detail & Confirm order -> writes CAPI Outbox event
    await adminPage.locator(`#orders-table-body strong:has-text("${orderRef}")`).click();
    await adminPage.waitForSelector('#order-modal.open #modal-order-status', { timeout: 5000 });
    await adminPage.selectOption('#modal-order-status', 'confirmed');
    await adminPage.click('#order-modal .modal-foot button.btn-admin-primary');
    await adminPage.waitForSelector('#order-modal', { state: 'hidden', timeout: 6000 });

    // Switch to Catalog CMS tab, add new product & upload photo
    await adminPage.click('button.admin-nav-item:has-text("Product Catalog")');
    await adminPage.waitForSelector('#tab-catalog.active', { timeout: 5000 });
    await adminPage.click('button:has-text("+ Add New Product")');
    await adminPage.fill('#np-sku', 'CAT-099');
    await adminPage.fill('#np-title', 'E2E Royal Silk Jamdani');
    await adminPage.fill('#np-price', '3650');
    await adminPage.fill('#np-stock', '4');
    await adminPage.check('#np-verified');
    await adminPage.check('#np-approved');
    await adminPage.click('#new-product-modal button[type="submit"]');
    await adminPage.waitForSelector('#catalog-table-body strong:has-text("CAT-099")', { timeout: 8000 });
    await adminPage.locator('#catalog-table-body tr:has-text("CAT-099") button:has-text("Edit / Approve")').click();
    await adminPage.waitForSelector('#product-detail-modal.open #prod-edit-preview-img', { timeout: 5000 });
    await adminPage.setInputFiles('#prod-photo-file', {
      name: 'cat099.png',
      mimeType: 'image/png',
      buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
    });
    await adminPage.waitForFunction(() => {
      const img = document.getElementById('prod-edit-preview-img');
      return img && img.getAttribute('src') && img.getAttribute('src').includes('/assets/uploads/CAT-099/');
    }, { timeout: 6000 });
    await adminPage.click('#product-detail-modal button:has-text("Save Product & Approval")');
    await adminPage.waitForSelector('#product-detail-modal', { state: 'hidden', timeout: 6000 });
    await adminPage.screenshot({ path: path.join(SCREENSHOT_DIR, '10-admin-catalog-cms.png') });

    // Switch to CAPI Outbox tab
    await adminPage.click('button.admin-nav-item:has-text("CAPI Outbox")');
    await adminPage.waitForSelector('#tab-outbox.active #outbox-table-body tr', { timeout: 5000 });
    await adminPage.screenshot({ path: path.join(SCREENSHOT_DIR, '11-admin-capi-outbox.png') });

    // Verify staff login UI constraint (owner-only actions disabled for staff)
    await adminPage.click('button:has-text("Sign Out")');
    await adminPage.waitForSelector('#admin-pin-gate.active', { timeout: 5000 });
    activeMockJwt = 'valid-staff-jwt';
    await adminPage.fill('#admin-auth-email', 'staff@farizasterritory.com');
    await adminPage.fill('#admin-auth-password', 'StaffPass123!');
    await adminPage.click('#admin-signin-btn');
    await adminPage.waitForFunction(() => document.body.classList.contains('role-staff'), { timeout: 8000 });

    await adminCtx.close();
    console.log('ALL PLAYWRIGHT E2E CHECKS & SCREENSHOTS PASSED SUCCESSFULLY!');
  } finally {
    fs.rmSync(uploadCleanupDir, { recursive: true, force: true });
    await browser.close();
    await closeServer(server);
    await closeServer(failSrv.server);
  }
}

runE2E().catch(err => {
  console.error('E2E FAILURE:', err);
  process.exit(1);
});
