const express = require('express');
const path = require('path');
const fs = require('fs');
const capiHandler = require('./api/capi.js');
const commerce = require('./assets/js/commerce.js');
const { createSupabaseServerStore, getSupabaseConfig } = require('./lib/supabaseServer.js');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_ALLOWED_AISTUDIO_FILES = new Set([
  'fariza_s_territory_brand_book_by_pomelli_1e38cd9b.pdf'
]);

function loadCatalogInMemory() {
  try {
    const catalogCode = fs.readFileSync(path.join(__dirname, 'assets/js/catalogData.js'), 'utf8');
    const sandbox = {};
    const fn = new Function('window', catalogCode);
    fn(sandbox);
    return sandbox.FT_CATALOG || { COLLECTIONS: [], PRODUCTS: [], PRODUCTS_BY_SKU: {} };
  } catch (err) {
    console.error('[Server] Failed to load catalogData.js:', err.message);
    return { COLLECTIONS: [], PRODUCTS: [], PRODUCTS_BY_SKU: {} };
  }
}

function getCanonicalBaseUrl(req) {
  const configured = String(process.env.PUBLIC_SITE_URL || '').trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      return parsed.origin.replace(/\/+$/, '');
    } catch (_) {}
  }
  if (req) {
    const host = String(req.get('host') || '').trim();
    if (host && (/^localhost(:\d+)?$/i.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host) || /^0\.0\.0\.0(:\d+)?$/.test(host))) {
      const proto = req.protocol === 'https' ? 'https' : 'http';
      return `${proto}://${host}`;
    }
    if (host && /^[a-z0-9.-]+(:\d+)?$/i.test(host)) {
      const proto = req.protocol === 'https' ? 'https' : 'http';
      return `${proto}://${host}`;
    }
  }
  return 'https://farizasterritory.com';
}

function csvEscape(val) {
  const s = String(val == null ? '' : val).replace(/\r?\n|\r/g, ' ').trim();
  if (s.includes(',') || s.includes('"') || s.includes(';')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function xmlEscape(val) {
  return String(val == null ? '' : val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function htmlAttrEscape(val) {
  return String(val == null ? '' : val)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function htmlTextEscape(val) {
  return String(val == null ? '' : val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function createRateLimiter(windowMs, maxRequests) {
  const buckets = new Map();
  return function rateLimiterMiddleware(req, res, next) {
    const rawIp = (req.ip || (req.socket && req.socket.remoteAddress) || '127.0.0.1').toString();
    const ip = rawIp.replace(/^::ffff:/i, '');
    const now = Date.now();
    if (buckets.size > 5000) {
      for (const [k, v] of buckets.entries()) {
        if (!v || now > v.resetAt) buckets.delete(k);
      }
    }
    const entry = buckets.get(ip);
    if (!entry || now > entry.resetAt) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > maxRequests) {
      return res.status(429).json({
        ok: false,
        error: 'Too many requests from this IP. Please wait a moment and try again.'
      });
    }
    return next();
  };
}

function createApp(options = {}) {
  const app = express();
  const store = options.store || createSupabaseServerStore();
  const catalog = options.catalog || loadCatalogInMemory();
  const capiSender = options.capiSender || capiHandler.dispatchCapiEvent;
  const indexHtmlPath = path.join(__dirname, 'index.html');
  let cachedIndexTemplate = null;

  function getIndexTemplate() {
    if (!cachedIndexTemplate || process.env.NODE_ENV !== 'production') {
      cachedIndexTemplate = fs.readFileSync(indexHtmlPath, 'utf8');
    }
    return cachedIndexTemplate;
  }

  app.set('trust proxy', 1);
  app.use(express.json({ limit: '1mb' }));

  // Global security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Block raw engineering docs, source audits, monolithic dumps, and JSON master dump on public asset routes
  app.use(['/assets/aistudio', '/public/assets/aistudio'], (req, res, next) => {
    const cleanRel = String(req.path || '').replace(/^\/+/, '');
    if (!cleanRel || !PUBLIC_ALLOWED_AISTUDIO_FILES.has(cleanRel)) {
      return res.status(404).json({ ok: false, error: 'Resource not found.' });
    }
    return next();
  });

  app.use('/assets/aistudio', express.static(path.join(__dirname, 'public/assets/aistudio'), {
    maxAge: '7d'
  }));
  app.use('/public/assets', express.static(path.join(__dirname, 'public/assets'), {
    maxAge: '7d'
  }));
  app.use('/assets', express.static(path.join(__dirname, 'assets'), {
    maxAge: 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.webp') || filePath.endsWith('.jpg') || filePath.endsWith('.png')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
    }
  }));
  app.use(['/assets', '/public/assets'], (req, res) => {
    res.status(404).json({ ok: false, error: 'Asset not found.' });
  });

  async function buildMergedCatalog() {
    const dbProducts = await store.listProducts();
    const dbMap = new Map();
    if (Array.isArray(dbProducts)) {
      for (const row of dbProducts) {
        if (row && row.sku) dbMap.set(row.sku, row);
      }
    }

    const products = catalog.PRODUCTS.map(p => {
      const dbRow = dbMap.get(p.sku);
      const merged = Object.assign({}, p, {
        priceBDT: dbRow && Number(dbRow.price_bdt) > 0 ? Number(dbRow.price_bdt) : Number(p.priceBDT || 0),
        is_available: dbRow && dbRow.is_available !== undefined ? Boolean(dbRow.is_available) : (p.is_available !== false),
        stock_count: dbRow && dbRow.stock_count !== undefined && dbRow.stock_count !== null ? Number(dbRow.stock_count) : 15,
        stock_verified: dbRow && dbRow.stock_verified !== undefined ? Boolean(dbRow.stock_verified) : false,
        price_review: dbRow && dbRow.price_review !== undefined ? Boolean(dbRow.price_review) : (p.priceStatus !== 'approved')
      });
      merged.feed_eligible = commerce.isFeedEligibleProduct(merged);
      return merged;
    });

    const productsBySku = {};
    for (const p of products) {
      productsBySku[p.sku] = p;
    }

    return {
      collections: catalog.COLLECTIONS,
      products,
      productsBySku
    };
  }

  async function requireAdminAuth(req, res, next) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    try {
      const result = await store.verifyAdminBearerToken(req.headers.authorization);
      if (!result.ok) {
        return res.status(result.status || 401).json({ ok: false, error: result.error || 'Unauthorized' });
      }
      req.adminUser = result.user;
      return next();
    } catch (err) {
      return res.status(500).json({ ok: false, error: 'Authentication verification failed.' });
    }
  }

  const orderCreateLimiter = createRateLimiter(10 * 60 * 1000, options.orderRateLimitMax || 25);
  const trackLimiter = createRateLimiter(10 * 60 * 1000, options.trackRateLimitMax || 40);
  const couponLimiter = createRateLimiter(10 * 60 * 1000, options.couponRateLimitMax || 60);

  // Meta Conversions API (CAPI) Endpoint (No unauthenticated Purchase / test_event_code)
  app.all('/api/capi', async (req, res) => {
    try {
      await capiHandler(req, res);
    } catch (err) {
      console.error('[CAPI Route Error]:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
      }
    }
  });

  // Safe Public Health Endpoint (no internal file URLs or secrets)
  app.get('/api/health', (req, res) => {
    const baseUrl = getCanonicalBaseUrl(req);
    const sbCfg = store.getConfigSummary ? store.getConfigSummary() : getSupabaseConfig();
    res.status(200).json({
      ok: true,
      brand: "Fariza's Territory",
      location: 'Mirpur, Dhaka, Bangladesh',
      catalog: {
        totalProducts: catalog.PRODUCTS.length,
        totalCollections: catalog.COLLECTIONS.length,
        fashionCount: catalog.PRODUCTS.filter(p => p.superCategory === 'Fashion').length,
        accessoriesCount: catalog.PRODUCTS.filter(p => p.superCategory === 'Accessories').length
      },
      databaseConfigured: store.isDurableConfigured ? store.isDurableConfigured() : false,
      supabaseAnonConfigured: Boolean(sbCfg && sbCfg.anonConfigured),
      metaCapiConfigured: Boolean(process.env.META_CAPI_ACCESS_TOKEN),
      pixelId: process.env.META_PIXEL_ID || '1657670575734647',
      feeds: {
        metaCommerceCsv: `${baseUrl}/api/catalog-feed.csv`,
        googleMetaXml: `${baseUrl}/api/catalog-feed.xml`,
        jsonCatalog: `${baseUrl}/api/catalog-feed.json`,
        brandBookPdf: `${baseUrl}/assets/aistudio/fariza_s_territory_brand_book_by_pomelli_1e38cd9b.pdf`
      }
    });
  });

  // Public Storefront Configuration (hydrates Supabase URL/AnonKey + non-secret store settings)
  app.get('/api/public-config', async (req, res) => {
    const sbCfg = getSupabaseConfig();
    const settings = await store.getStoreSettings();
    const rawWa = settings && settings.whatsapp_number ? settings.whatsapp_number : '';
    const whatsappActive = !commerce.isPlaceholderWhatsapp(rawWa);
    const dhakaFee = Number((settings && settings.delivery_fee_dhaka) ?? commerce.DEFAULT_DELIVERY_FEES.dhaka);
    const outsideFee = Number((settings && settings.delivery_fee_outside) ?? commerce.DEFAULT_DELIVERY_FEES.outside_dhaka);
    const freeThreshold = Number((settings && settings.free_delivery_threshold) ?? commerce.DEFAULT_FREE_SHIPPING_THRESHOLD);

    res.status(200).json({
      ok: true,
      supabaseUrl: sbCfg.url,
      supabaseAnonKey: sbCfg.anonKey,
      databaseConfigured: store.isDurableConfigured ? store.isDurableConfigured() : false,
      metaPixelId: (settings && settings.meta_pixel_id) || process.env.META_PIXEL_ID || '1657670575734647',
      ga4MeasurementId: (settings && settings.ga4_measurement_id) || '',
      deliveryFees: {
        dhaka: dhakaFee,
        outside_dhaka: outsideFee
      },
      freeShippingThreshold: freeThreshold,
      promoText: (settings && settings.promo_text) || 'First-order 25% OFF with code FIRST25 · Free delivery over ৳3,000 (FREESHIP)',
      officialChannels: {
        facebookPageUrl: (settings && settings.facebook_url) || 'https://www.facebook.com/farizasterritory143',
        messengerUsername: (settings && settings.messenger_username) || 'farizasterritory143',
        whatsappNumber: whatsappActive ? rawWa : '',
        whatsappActive
      }
    });
  });

  // Public merged catalog state (live prices & availability without PII)
  app.get('/api/catalog', async (req, res) => {
    const merged = await buildMergedCatalog();
    res.status(200).json({
      ok: true,
      totalSkus: merged.products.length,
      products: merged.products.map(p => ({
        sku: p.sku,
        priceBDT: p.priceBDT,
        is_available: p.is_available,
        stock_count: p.stock_count,
        stock_verified: p.stock_verified,
        price_review: p.price_review,
        feed_eligible: p.feed_eligible
      }))
    });
  });

  // Server-side Coupon Validation
  app.post('/api/coupons/validate', couponLimiter, async (req, res) => {
    const body = req.body || {};
    const cleanCode = String(body.code || '').trim().toUpperCase();
    const subtotal = Number(body.subtotal || 0);
    const zone = commerce.normalizeZone(body.zone || body.delivery_zone || body.deliveryZone, body.district);
    if (!cleanCode) {
      return res.status(400).json({ valid: false, message: 'Please enter a coupon code.' });
    }
    const settings = await store.getStoreSettings();
    const deliveryFee = commerce.getDeliveryFeeForZone(zone, {
      dhaka: settings && settings.delivery_fee_dhaka,
      outside_dhaka: settings && settings.delivery_fee_outside
    });
    const coupon = await store.getCouponByCode(cleanCode);
    const result = commerce.evaluateCoupon(coupon, subtotal, deliveryFee);
    return res.status(200).json(result);
  });

  // Authoritative Order / Inquiry Creation Endpoint
  app.post('/api/orders', orderCreateLimiter, async (req, res) => {
    try {
      const body = req.body || {};
      const customerName = String(body.customer_name || body.name || '').trim();
      const rawPhone = String(body.customer_phone || body.phone || '').trim();
      const customerEmail = String(body.customer_email || body.email || '').trim();
      const district = String(body.customer_district || body.district || '').trim();
      const customerAddress = String(body.customer_address || body.address || '').trim();
      const contactChannel = String(body.contact_channel || body.contactChannel || 'web_form').trim();
      const notes = String(body.customer_notes || body.notes || '').trim().slice(0, 1000);
      const idempotencyKey = String(body.idempotency_key || req.get('x-idempotency-key') || '').trim().slice(0, 120) || null;

      if (customerName.length < 2 || customerName.length > 120) {
        return res.status(400).json({ ok: false, error: 'Please provide a valid full name (at least 2 characters).' });
      }

      const phoneInfo = commerce.normalizePhone(rawPhone);
      if (!phoneInfo.isBdMobile) {
        return res.status(400).json({
          ok: false,
          error: 'Please enter a valid 11-digit Bangladeshi mobile number (e.g., 017XXXXXXXX or +88017XXXXXXXX).'
        });
      }

      if (customerAddress.length < 5 || customerAddress.length > 500) {
        return res.status(400).json({ ok: false, error: 'Please provide a complete delivery street address.' });
      }

      const allowedPaymentMethods = ['Cash on Delivery (COD)', 'COD'];
      const requestedPayment = String(body.payment_method || body.paymentMethod || 'Cash on Delivery (COD)').trim();
      if (!allowedPaymentMethods.includes(requestedPayment)) {
        return res.status(400).json({ ok: false, error: 'Only Cash on Delivery (COD) is currently supported.' });
      }

      const merged = await buildMergedCatalog();
      const settings = await store.getStoreSettings();
      const deliveryFees = {
        dhaka: settings && settings.delivery_fee_dhaka,
        outside_dhaka: settings && settings.delivery_fee_outside
      };

      const requestedCoupon = String(body.discount_code || body.discountCode || '').trim().toUpperCase();
      let couponObj = null;
      if (requestedCoupon) {
        couponObj = await store.getCouponByCode(requestedCoupon);
        if (!couponObj || !couponObj.is_active) {
          return res.status(400).json({ ok: false, error: `Coupon code '${requestedCoupon}' is invalid or inactive.` });
        }
      }

      const computed = commerce.computeOrderTotals({
        items: body.items,
        productsBySku: merged.productsBySku,
        zone: body.delivery_zone || body.deliveryZone,
        district,
        deliveryFees,
        coupon: couponObj
      });

      if (!computed.ok) {
        return res.status(400).json({ ok: false, error: computed.error });
      }

      // Generate server-authoritative order reference (or accept safe well-formed client ref if unique)
      const orderRef = commerce.generateOrderRef();
      const nowIso = new Date().toISOString();
      const fullAddress = district && !customerAddress.toLowerCase().includes(district.toLowerCase())
        ? `${district}, ${customerAddress}`
        : customerAddress;

      const orderRecord = {
        order_ref: orderRef,
        customer_name: customerName,
        customer_phone: phoneInfo.canonical11,
        customer_email: customerEmail || null,
        customer_district: district || (computed.delivery_zone === 'dhaka' ? 'Dhaka' : 'Outside Dhaka'),
        customer_address: fullAddress,
        delivery_zone: computed.delivery_zone,
        delivery_fee: computed.delivery_fee,
        subtotal: computed.subtotal,
        discount_code: computed.discount_code,
        discount_amount: computed.discount_amount,
        total: computed.total,
        payment_method: 'Cash on Delivery (COD)',
        contact_channel: ['web_form', 'messenger', 'whatsapp'].includes(contactChannel) ? contactChannel : 'web_form',
        items: computed.items,
        status: 'pending',
        courier_name: 'Steadfast Courier',
        tracking_number: '',
        customer_notes: notes,
        status_history: [
          {
            status: 'pending',
            note: 'Order inquiry registered with server-verified totals',
            time: nowIso
          }
        ],
        source: 'web_store',
        attribution: body.attribution && typeof body.attribution === 'object' ? body.attribution : null,
        idempotency_key: idempotencyKey,
        created_at: nowIso,
        updated_at: nowIso
      };

      const saved = await store.createOrder(orderRecord);
      if (!saved.ok) {
        return res.status(saved.status || 503).json({ ok: false, error: saved.error });
      }

      const redacted = commerce.redactOrderForPublicTracking(saved.data);
      redacted.payment_method = saved.data.payment_method || 'Cash on Delivery (COD)';

      return res.status(saved.idempotent ? 200 : 201).json({
        ok: true,
        idempotent: Boolean(saved.idempotent),
        order_ref: saved.data.order_ref,
        order: redacted
      });
    } catch (err) {
      console.error('[Order Create Error]:', err);
      return res.status(500).json({ ok: false, error: 'Failed to process order inquiry.' });
    }
  });

  // Challenge-Protected Public Order Tracking Endpoint (Requires BOTH Order Ref + Matching Phone)
  async function handlePublicTrack(req, res) {
    const input = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const rawRef = String(input.ref || input.order_ref || input.orderRef || '').trim().toUpperCase();
    const rawPhone = String(input.phone || input.customer_phone || '').trim();

    if (!rawRef || !rawPhone) {
      return res.status(400).json({
        ok: false,
        error: 'Both Order Reference and Phone Number are required to view order status.'
      });
    }

    const phoneInfo = commerce.normalizePhone(rawPhone);
    if (!phoneInfo.valid) {
      return res.status(400).json({
        ok: false,
        error: 'Please enter a valid 11-digit phone number associated with the order.'
      });
    }

    const found = await store.getOrderByRef(rawRef);
    if (!found.ok && found.status === 503) {
      return res.status(503).json({ ok: false, error: found.error });
    }
    if (!found.ok || !found.data || !commerce.phonesMatch(found.data.customer_phone, rawPhone)) {
      return res.status(404).json({
        ok: false,
        error: 'No matching order found for the provided Order Reference and Phone Number.'
      });
    }

    return res.status(200).json({
      ok: true,
      order: commerce.redactOrderForPublicTracking(found.data)
    });
  }

  app.get('/api/track', trackLimiter, handlePublicTrack);
  app.post('/api/track', trackLimiter, handlePublicTrack);

  // =========================================================================
  // AUTHENTICATED ADMIN & STAFF PORTAL APIs (/api/auth/session & /api/admin/*)
  // =========================================================================
  app.get('/api/auth/session', requireAdminAuth, (req, res) => {
    res.status(200).json({ ok: true, user: req.adminUser });
  });

  app.get('/api/admin/orders', requireAdminAuth, async (req, res) => {
    const status = String(req.query.status || 'all').trim();
    const result = await store.listOrders({ status });
    if (!result.ok) {
      return res.status(result.status || 500).json({ ok: false, error: result.error });
    }
    return res.status(200).json({ ok: true, orders: result.data });
  });

  app.post('/api/admin/orders', requireAdminAuth, async (req, res) => {
    const body = req.body || {};
    const customerName = String(body.customer_name || body.name || '').trim();
    const phoneInfo = commerce.normalizePhone(body.customer_phone || body.phone || '');
    const customerAddress = String(body.customer_address || body.address || '').trim();
    const district = String(body.customer_district || body.district || '').trim();
    if (customerName.length < 2 || !phoneInfo.isBdMobile || customerAddress.length < 4) {
      return res.status(400).json({ ok: false, error: 'Valid name, Bangladeshi mobile, and address are required.' });
    }
    const merged = await buildMergedCatalog();
    const settings = await store.getStoreSettings();
    const requestedCoupon = String(body.discount_code || body.discountCode || '').trim().toUpperCase();
    let couponObj = null;
    if (requestedCoupon) {
      couponObj = await store.getCouponByCode(requestedCoupon);
      if (!couponObj || !couponObj.is_active) {
        return res.status(400).json({ ok: false, error: `Coupon code '${requestedCoupon}' is invalid or inactive.` });
      }
    }
    const computed = commerce.computeOrderTotals({
      items: body.items,
      productsBySku: merged.productsBySku,
      zone: body.delivery_zone || body.deliveryZone,
      district,
      deliveryFees: {
        dhaka: settings && settings.delivery_fee_dhaka,
        outside_dhaka: settings && settings.delivery_fee_outside
      },
      coupon: couponObj
    });
    if (!computed.ok) {
      return res.status(400).json({ ok: false, error: computed.error });
    }
    const nowIso = new Date().toISOString();
    const fullAddress = district && !customerAddress.toLowerCase().includes(district.toLowerCase())
      ? `${district}, ${customerAddress}`
      : customerAddress;
    const orderRecord = {
      order_ref: commerce.generateOrderRef(),
      customer_name: customerName,
      customer_phone: phoneInfo.canonical11,
      customer_district: district || (computed.delivery_zone === 'dhaka' ? 'Dhaka' : 'Outside Dhaka'),
      customer_address: fullAddress,
      delivery_zone: computed.delivery_zone,
      delivery_fee: computed.delivery_fee,
      subtotal: computed.subtotal,
      discount_code: computed.discount_code,
      discount_amount: computed.discount_amount,
      total: computed.total,
      payment_method: 'Cash on Delivery (COD)',
      contact_channel: body.contact_channel || 'messenger',
      items: computed.items,
      status: 'pending',
      courier_name: body.courier_name || 'Steadfast Courier',
      tracking_number: '',
      customer_notes: String(body.customer_notes || body.notes || '').slice(0, 1000),
      status_history: [{ status: 'pending', note: `Created by ${req.adminUser.email}`, time: nowIso }],
      source: 'admin_manual',
      created_at: nowIso,
      updated_at: nowIso
    };
    const saved = await store.createOrder(orderRecord);
    if (!saved.ok) {
      return res.status(saved.status || 500).json({ ok: false, error: saved.error });
    }
    return res.status(201).json({ ok: true, order: saved.data });
  });

  app.patch('/api/admin/orders/:orderRef', requireAdminAuth, async (req, res) => {
    const orderRef = String(req.params.orderRef || '').trim();
    const body = req.body || {};
    const current = await store.getOrderByRef(orderRef);
    if (!current.ok) {
      return res.status(current.status || 404).json({ ok: false, error: current.error || 'Order not found.' });
    }

    const existing = current.data;
    const patch = {};
    const history = Array.isArray(existing.status_history) ? [...existing.status_history] : [];
    let transitionedToConfirmed = false;

    if (body.status !== undefined) {
      const nextStatus = String(body.status).trim().toLowerCase();
      if (!commerce.isValidStatusTransition(existing.status, nextStatus)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid status transition from '${existing.status}' to '${nextStatus}'.`
        });
      }
      if (nextStatus !== existing.status) {
        patch.status = nextStatus;
        history.push({
          status: nextStatus,
          note: String(body.note || `Updated to ${nextStatus} by ${req.adminUser.email}`).slice(0, 300),
          actor: req.adminUser.email,
          time: new Date().toISOString()
        });
        patch.status_history = history;
        if (nextStatus === 'confirmed') {
          transitionedToConfirmed = true;
        }
      }
    }

    if (body.courier_name !== undefined) patch.courier_name = String(body.courier_name).trim().slice(0, 100);
    if (body.tracking_number !== undefined) patch.tracking_number = String(body.tracking_number).trim().slice(0, 120);
    if (body.customer_notes !== undefined) patch.customer_notes = String(body.customer_notes).trim().slice(0, 1000);
    if (body.customer_address !== undefined) patch.customer_address = String(body.customer_address).trim().slice(0, 500);

    const updated = await store.updateOrder(orderRef, patch);
    if (!updated.ok) {
      return res.status(updated.status || 500).json({ ok: false, error: updated.error });
    }

    let capiResult = null;
    if (transitionedToConfirmed && !existing.purchase_capi_sent_at) {
      const baseUrl = getCanonicalBaseUrl(req);
      const purchaseEventId = `pur_${orderRef}`;
      try {
        capiResult = await capiSender(
          {
            eventName: 'Purchase',
            eventId: purchaseEventId,
            eventSourceUrl: `${baseUrl}/#/track`,
            userData: {
              name: existing.customer_name,
              phone: existing.customer_phone,
              email: existing.customer_email,
              district: existing.customer_district || 'Dhaka'
            },
            customData: {
              currency: 'BDT',
              value: Number(existing.total || 0),
              order_id: orderRef,
              content_type: 'product',
              content_ids: Array.isArray(existing.items) ? existing.items.map(i => i.sku) : [],
              num_items: Array.isArray(existing.items) ? existing.items.reduce((s, i) => s + Number(i.qty || 1), 0) : 1
            }
          },
          { allowPrivilegedEvents: true, allowTestCode: false }
        );
        if (capiResult && capiResult.status < 400 && capiResult.body && capiResult.body.success) {
          const sentAt = new Date().toISOString();
          await store.updateOrder(orderRef, {
            purchase_capi_sent_at: sentAt,
            purchase_capi_event_id: purchaseEventId
          });
          updated.data.purchase_capi_sent_at = sentAt;
          updated.data.purchase_capi_event_id = purchaseEventId;
        }
      } catch (err) {
        capiResult = { status: 500, body: { success: false, error: err.message } };
      }
    }

    return res.status(200).json({
      ok: true,
      order: updated.data,
      capi_purchase: capiResult ? capiResult.body : null
    });
  });

  app.get('/api/admin/catalog', requireAdminAuth, async (req, res) => {
    const merged = await buildMergedCatalog();
    return res.status(200).json({ ok: true, products: merged.products });
  });

  app.patch('/api/admin/products/:sku', requireAdminAuth, async (req, res) => {
    const sku = String(req.params.sku || '').trim().toUpperCase();
    if (!catalog.PRODUCTS_BY_SKU[sku]) {
      return res.status(404).json({ ok: false, error: `Unknown SKU: ${sku}` });
    }
    const body = req.body || {};
    const updates = {};
    if (body.price_bdt !== undefined) {
      const price = Number(body.price_bdt);
      if (!Number.isFinite(price) || price <= 0) {
        return res.status(400).json({ ok: false, error: 'price_bdt must be greater than 0.' });
      }
      updates.price_bdt = Math.round(price);
    }
    if (body.is_available !== undefined) updates.is_available = Boolean(body.is_available);
    if (body.stock_count !== undefined) {
      const count = Number(body.stock_count);
      if (!Number.isInteger(count) || count < 0) {
        return res.status(400).json({ ok: false, error: 'stock_count must be a non-negative integer.' });
      }
      updates.stock_count = count;
    }
    if (body.stock_verified !== undefined) updates.stock_verified = Boolean(body.stock_verified);
    if (body.price_review !== undefined) updates.price_review = Boolean(body.price_review);

    const updated = await store.updateProduct(sku, updates);
    if (!updated.ok) {
      return res.status(updated.status || 500).json({ ok: false, error: updated.error });
    }
    return res.status(200).json({ ok: true, product: updated.data });
  });

  app.get('/api/admin/coupons', requireAdminAuth, async (req, res) => {
    const result = await store.listCoupons();
    if (!result.ok) {
      return res.status(result.status || 500).json({ ok: false, error: result.error });
    }
    return res.status(200).json({ ok: true, coupons: result.data });
  });

  app.post('/api/admin/coupons', requireAdminAuth, async (req, res) => {
    const body = req.body || {};
    const code = String(body.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      return res.status(400).json({ ok: false, error: 'Coupon code must be 3-24 uppercase alphanumeric characters.' });
    }
    const discountType = String(body.discount_type || '').trim();
    if (!['percentage', 'fixed', 'free_shipping'].includes(discountType)) {
      return res.status(400).json({ ok: false, error: 'Invalid discount_type.' });
    }
    const discountValue = Number(body.discount_value ?? 0);
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      return res.status(400).json({ ok: false, error: 'discount_value must be a non-negative number.' });
    }
    if (discountType === 'percentage' && (discountValue <= 0 || discountValue > 100)) {
      return res.status(400).json({ ok: false, error: 'Percentage coupon discount_value must be between 1 and 100.' });
    }
    if (discountType === 'fixed' && discountValue <= 0) {
      return res.status(400).json({ ok: false, error: 'Fixed coupon discount_value must be greater than 0.' });
    }
    const minSpend = Number(body.min_spend ?? 0);
    if (!Number.isFinite(minSpend) || minSpend < 0) {
      return res.status(400).json({ ok: false, error: 'min_spend must be a non-negative number.' });
    }
    let maxDiscount = null;
    if (body.max_discount !== undefined && body.max_discount !== null && body.max_discount !== '') {
      const parsedMax = Number(body.max_discount);
      if (!Number.isFinite(parsedMax) || parsedMax < 0) {
        return res.status(400).json({ ok: false, error: 'max_discount must be a non-negative number.' });
      }
      maxDiscount = parsedMax;
    }
    const coupon = {
      code,
      discount_type: discountType,
      discount_value: discountValue,
      min_spend: minSpend,
      max_discount: maxDiscount,
      is_active: body.is_active !== false,
      notes: String(body.notes || '').slice(0, 200)
    };
    const saved = await store.upsertCoupon(coupon);
    if (!saved.ok) {
      return res.status(saved.status || 500).json({ ok: false, error: saved.error });
    }
    return res.status(200).json({ ok: true, coupon: saved.data });
  });

  app.get('/api/admin/settings', requireAdminAuth, async (req, res) => {
    const settings = await store.getStoreSettings();
    return res.status(200).json({ ok: true, settings: settings || {} });
  });

  app.put('/api/admin/settings', requireAdminAuth, async (req, res) => {
    const body = req.body || {};
    for (const numField of ['delivery_fee_dhaka', 'delivery_fee_outside', 'free_delivery_threshold']) {
      if (body[numField] !== undefined && body[numField] !== null && body[numField] !== '') {
        const val = Number(body[numField]);
        if (!Number.isFinite(val) || val < 0) {
          return res.status(400).json({ ok: false, error: `${numField} must be a non-negative number.` });
        }
      }
    }
    if (body.facebook_url !== undefined && String(body.facebook_url || '').trim() !== '') {
      const fbUrl = String(body.facebook_url).trim();
      if (!/^https?:\/\//i.test(fbUrl)) {
        return res.status(400).json({ ok: false, error: 'facebook_url must start with http:// or https://.' });
      }
    }
    const saved = await store.updateStoreSettings(body);
    if (!saved.ok) {
      return res.status(saved.status || 500).json({ ok: false, error: saved.error });
    }
    return res.status(200).json({ ok: true, settings: saved.data });
  });

  app.post('/api/admin/capi-test', requireAdminAuth, async (req, res) => {
    const body = req.body || {};
    const baseUrl = getCanonicalBaseUrl(req);
    const result = await capiSender(
      {
        eventName: body.eventName || 'Lead',
        eventId: body.eventId || `adm_test_${Date.now()}`,
        eventSourceUrl: body.eventSourceUrl || `${baseUrl}/`,
        userData: body.userData || { district: 'Dhaka' },
        customData: body.customData || { currency: 'BDT', value: 2350, content_ids: ['CAT-001'] },
        test_event_code: body.test_event_code || process.env.META_TEST_EVENT_CODE || ''
      },
      { allowPrivilegedEvents: true, allowTestCode: true }
    );
    return res.status(result.status).json(result.body);
  });

  app.get('/api/admin/catalog-feed-preview.json', requireAdminAuth, async (req, res) => {
    const merged = await buildMergedCatalog();
    return res.status(200).json({
      ok: true,
      totalSkus: merged.products.length,
      eligibleCount: merged.products.filter(p => p.feed_eligible).length,
      products: merged.products.map(p => ({
        sku: p.sku,
        title: p.title,
        priceBDT: p.priceBDT,
        is_available: p.is_available,
        stock_verified: p.stock_verified,
        price_review: p.price_review,
        feed_eligible: p.feed_eligible
      }))
    });
  });

  // =========================================================================
  // MARKETING FEEDS (Strictly gated by stock_verified & approved pricing)
  // =========================================================================
  app.get('/api/catalog-feed.csv', async (req, res) => {
    const baseUrl = getCanonicalBaseUrl(req);
    const merged = await buildMergedCatalog();
    const eligible = merged.products.filter(p => commerce.isFeedEligibleProduct(p));

    const headers = [
      'id',
      'title',
      'description',
      'availability',
      'condition',
      'price',
      'link',
      'image_link',
      'additional_image_link',
      'brand',
      'item_group_id',
      'google_product_category',
      'custom_label_0',
      'custom_label_1',
      'custom_label_2',
      'custom_label_3'
    ];

    const rows = [headers.join(',')];
    for (const p of eligible) {
      const colName = p.collection ? p.collection.name : p.superCategory;
      const unitDisclosure = p.unit ? ` [Selling Unit: ${p.unit}]` : '';
      const cautionDisclosure = p.cautionEn ? ` (${p.cautionEn})` : '';
      const fullDesc = `${p.descriptionEn || p.title}${unitDisclosure}${cautionDisclosure} — ${p.titleBn || ''}`.trim();
      const productLink = `${baseUrl}/products/${encodeURIComponent(p.sku)}`;
      const mainImage = `${baseUrl}/${String(p.assets?.socialSquare || p.assets?.main || '').replace(/^\/+/, '')}`;
      const altImage = p.assets?.storyReel ? `${baseUrl}/${String(p.assets.storyReel).replace(/^\/+/, '')}` : '';
      const googleCategory = p.superCategory === 'Fashion'
        ? 'Apparel & Accessories > Clothing > Traditional & Ceremonial Clothing'
        : (p.colId === '06'
          ? 'Home & Garden > Decor > Mirrors'
          : 'Apparel & Accessories > Jewelry');

      rows.push([
        csvEscape(p.sku),
        csvEscape(`${p.title} (${p.unit || '1 pc'})`),
        csvEscape(fullDesc),
        csvEscape(commerce.getProductFeedAvailability(p)),
        csvEscape('new'),
        csvEscape(`${p.priceBDT} BDT`),
        csvEscape(productLink),
        csvEscape(mainImage),
        csvEscape(altImage),
        csvEscape("Fariza's Territory"),
        csvEscape(`COL-${p.colId}`),
        csvEscape(googleCategory),
        csvEscape(p.superCategory),
        csvEscape(colName),
        csvEscape(p.unit || 'standard'),
        csvEscape('approved_price')
      ].join(','));
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="farizas-territory-catalog-feed.csv"');
    res.status(200).send(rows.join('\n'));
  });

  app.get(['/api/catalog-feed.xml', '/feed.xml'], async (req, res) => {
    const baseUrl = getCanonicalBaseUrl(req);
    const merged = await buildMergedCatalog();
    const eligible = merged.products.filter(p => commerce.isFeedEligibleProduct(p));

    const itemsXml = eligible.map(p => {
      const colName = p.collection ? p.collection.name : p.superCategory;
      const unitDisclosure = p.unit ? ` [Selling Unit: ${p.unit}]` : '';
      const cautionDisclosure = p.cautionEn ? ` (${p.cautionEn})` : '';
      const fullDesc = `${p.descriptionEn || p.title}${unitDisclosure}${cautionDisclosure}`;
      const productLink = `${baseUrl}/products/${encodeURIComponent(p.sku)}`;
      const mainImage = `${baseUrl}/${String(p.assets?.socialSquare || p.assets?.main || '').replace(/^\/+/, '')}`;
      const storyImage = `${baseUrl}/${String(p.assets?.storyReel || p.assets?.main || '').replace(/^\/+/, '')}`;

      return `    <item>
      <g:id>${xmlEscape(p.sku)}</g:id>
      <g:title>${xmlEscape(`${p.title} — ${p.titleBn || ''}`)}</g:title>
      <g:description>${xmlEscape(fullDesc)}</g:description>
      <g:link>${xmlEscape(productLink)}</g:link>
      <g:image_link>${xmlEscape(mainImage)}</g:image_link>
      <g:additional_image_link>${xmlEscape(storyImage)}</g:additional_image_link>
      <g:availability>${xmlEscape(commerce.getProductFeedAvailability(p))}</g:availability>
      <g:condition>new</g:condition>
      <g:price>${xmlEscape(`${p.priceBDT} BDT`)}</g:price>
      <g:brand>${xmlEscape("Fariza's Territory")}</g:brand>
      <g:item_group_id>${xmlEscape(`COL-${p.colId}`)}</g:item_group_id>
      <g:custom_label_0>${xmlEscape(p.superCategory)}</g:custom_label_0>
      <g:custom_label_1>${xmlEscape(colName)}</g:custom_label_1>
      <g:custom_label_2>${xmlEscape(p.unit || '')}</g:custom_label_2>
      <g:custom_label_3>approved</g:custom_label_3>
    </item>`;
    }).join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Fariza's Territory — Verified Product Feed (Dhaka, Bangladesh)</title>
    <link>${xmlEscape(baseUrl)}</link>
    <description>Fashion clothing &amp; handmade artisan accessories based in Mirpur, Dhaka, Bangladesh. Elegance in Every Detail.</description>
${itemsXml}
  </channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(xml);
  });

  app.get('/api/catalog-feed.json', async (req, res) => {
    const baseUrl = getCanonicalBaseUrl(req);
    const merged = await buildMergedCatalog();
    const eligible = merged.products.filter(p => commerce.isFeedEligibleProduct(p));
    const products = eligible.map(p => ({
      id: p.sku,
      sku: p.sku,
      title: p.title,
      titleBn: p.titleBn,
      superCategory: p.superCategory,
      collectionId: p.colId,
      collectionName: p.collection ? p.collection.name : '',
      collectionNameBn: p.collection ? p.collection.nameBn : '',
      priceBDT: p.priceBDT,
      currency: 'BDT',
      priceStatus: 'approved',
      sellingUnit: p.unit,
      sellingUnitBn: p.unitBn,
      cautionEn: p.cautionEn,
      cautionBn: p.cautionBn,
      availability: commerce.getProductFeedAvailability(p),
      condition: 'new',
      brand: "Fariza's Territory",
      deepLink: `${baseUrl}/products/${encodeURIComponent(p.sku)}`,
      images: {
        main: `${baseUrl}/${String(p.assets?.main || '').replace(/^\/+/, '')}`,
        socialSquare: `${baseUrl}/${String(p.assets?.socialSquare || p.assets?.main || '').replace(/^\/+/, '')}`,
        storyReel: `${baseUrl}/${String(p.assets?.storyReel || p.assets?.main || '').replace(/^\/+/, '')}`
      }
    }));

    res.status(200).json({
      brand: "Fariza's Territory",
      tagline: 'Elegance in Every Detail',
      location: 'Mirpur, Dhaka, Bangladesh',
      pixelId: process.env.META_PIXEL_ID || '1657670575734647',
      totalCatalogSkus: merged.products.length,
      eligibleFeedSkus: products.length,
      collectionsCount: catalog.COLLECTIONS.length,
      products
    });
  });

  // Return JSON 404 for unknown /api/* routes before SPA fallback
  app.use('/api', (req, res) => {
    res.status(404).json({ ok: false, error: 'API endpoint not found.' });
  });

  // =========================================================================
  // DYNAMIC CANONICAL SEO ROUTES (/products/:sku, /collections/:slug, sitemap)
  // =========================================================================
  app.get('/sitemap.xml', (req, res) => {
    const baseUrl = getCanonicalBaseUrl(req);
    const nowIso = new Date().toISOString().split('T')[0];
    const urls = [
      `${baseUrl}/`,
      ...catalog.COLLECTIONS.map(c => `${baseUrl}/collections/${encodeURIComponent(c.slug)}`),
      ...catalog.PRODUCTS.map(p => `${baseUrl}/products/${encodeURIComponent(p.sku)}`)
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${xmlEscape(u)}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u === `${baseUrl}/` ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.status(200).send(xml);
  });

  app.get('/robots.txt', (req, res) => {
    const baseUrl = getCanonicalBaseUrl(req);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(200).send(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin.html
Disallow: /api/
Disallow: /assets/aistudio/

Sitemap: ${baseUrl}/sitemap.xml
`
    );
  });

  function renderSsrPage(req, meta) {
    const baseUrl = getCanonicalBaseUrl(req);
    let html = getIndexTemplate();
    const fullTitle = `${meta.title} — Fariza's Territory`;
    const canonical = `${baseUrl}${meta.path}`;
    const imageUrl = meta.imagePath
      ? `${baseUrl}/${String(meta.imagePath).replace(/^\/+/, '')}`
      : `${baseUrl}/assets/products/CAT-001/socialSquare.webp`;

    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${htmlTextEscape(fullTitle)}</title>`);
    html = html.replace(
      /<meta name="description" content="[^"]*">/i,
      `<meta name="description" content="${htmlAttrEscape(meta.description)}">`
    );
    html = html.replace(
      /<link rel="canonical" href="[^"]*">/i,
      `<link rel="canonical" href="${htmlAttrEscape(canonical)}">`
    );
    html = html.replace(
      /<meta property="og:title" content="[^"]*">/i,
      `<meta property="og:title" content="${htmlAttrEscape(fullTitle)}">`
    );
    html = html.replace(
      /<meta property="og:description" content="[^"]*">/i,
      `<meta property="og:description" content="${htmlAttrEscape(meta.description)}">`
    );
    html = html.replace(
      /<meta property="og:image" content="[^"]*">/i,
      `<meta property="og:image" content="${htmlAttrEscape(imageUrl)}">`
    );
    html = html.replace(
      /<meta property="og:image:alt" content="[^"]*">/i,
      `<meta property="og:image:alt" content="${htmlAttrEscape(meta.imageAlt || fullTitle)}">`
    );
    html = html.replace(
      /<meta name="twitter:title" content="[^"]*">/i,
      `<meta name="twitter:title" content="${htmlAttrEscape(fullTitle)}">`
    );
    html = html.replace(
      /<meta name="twitter:description" content="[^"]*">/i,
      `<meta name="twitter:description" content="${htmlAttrEscape(meta.description)}">`
    );
    html = html.replace(
      /<meta name="twitter:image" content="[^"]*">/i,
      `<meta name="twitter:image" content="${htmlAttrEscape(imageUrl)}">`
    );

    const safeRouteScript = `<script>window.__FT_INITIAL_ROUTE__ = ${JSON.stringify(meta.initialHash || '')};</script>`;
    const extraLd = meta.jsonLd
      ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`
      : '';

    html = html.replace('</head>', `${safeRouteScript}\n${extraLd}\n</head>`);
    return html;
  }

  app.get('/products/:sku', async (req, res) => {
    const sku = String(req.params.sku || '').trim().toUpperCase();
    const merged = await buildMergedCatalog();
    const product = merged.productsBySku[sku];
    if (!product) {
      return res.status(404).send('Product not found');
    }
    const baseUrl = getCanonicalBaseUrl(req);
    const canonical = `${baseUrl}/products/${encodeURIComponent(product.sku)}`;
    const imagePath = product.assets?.socialSquare || product.assets?.main || 'assets/products/CAT-001/socialSquare.webp';
    const desc = `${product.descriptionEn || product.title}${product.unit ? ` (Selling Unit: ${product.unit})` : ''} — Order Cash on Delivery across Dhaka & Bangladesh.`;

    const html = renderSsrPage(req, {
      title: `${product.title} (${product.sku})`,
      description: desc,
      path: `/products/${encodeURIComponent(product.sku)}`,
      imagePath,
      imageAlt: product.title,
      initialHash: `#/product/${encodeURIComponent(product.sku)}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Product',
        sku: product.sku,
        name: product.title,
        description: desc,
        image: `${baseUrl}/${String(imagePath).replace(/^\/+/, '')}`,
        brand: {
          '@type': 'Brand',
          name: "Fariza's Territory"
        },
        offers: {
          '@type': 'Offer',
          url: canonical,
          priceCurrency: 'BDT',
          price: String(product.priceBDT || 0),
          availability: (product.is_available === false || (product.stock_count !== undefined && product.stock_count !== null && Number(product.stock_count) <= 0))
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition'
        }
      }
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  });

  app.get('/collections/:slug', (req, res) => {
    const slug = String(req.params.slug || '').trim().toLowerCase();
    const col = catalog.COLLECTIONS.find(c => c.slug === slug);
    if (!col) {
      return res.status(404).send('Collection not found');
    }
    const baseUrl = getCanonicalBaseUrl(req);
    const colProducts = catalog.PRODUCTS.filter(p => p.colId === col.id);
    const firstImg = colProducts[0]?.assets?.socialSquare || colProducts[0]?.assets?.main || 'assets/products/CAT-001/socialSquare.webp';

    const html = renderSsrPage(req, {
      title: `${col.name} Collection`,
      description: `${col.name} (${col.nameBn || ''}) — ${col.leadEn || "Curated Fariza's Territory pieces."} (${colProducts.length} pieces)`,
      path: `/collections/${encodeURIComponent(col.slug)}`,
      imagePath: firstImg,
      imageAlt: col.name,
      initialHash: `#/collection/${encodeURIComponent(col.slug)}`,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: col.name,
        url: `${baseUrl}/collections/${encodeURIComponent(col.slug)}`,
        description: col.leadEn || col.name
      }
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  });

  // Admin Portal Routes (noindex enforced)
  app.get(['/admin', '/admin.html'], (req, res) => {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'admin.html'));
  });

  // GHL Custom HTML Bundle Route
  app.get(['/ghl-bundle', '/ghl-bundle.html'], (req, res) => {
    res.sendFile(path.join(__dirname, 'ghl-bundle.html'));
  });

  // Storefront Home & SPA fallback
  app.get('/', (req, res) => {
    const html = renderSsrPage(req, {
      title: "Boutique Fashion & Artisan Accessories",
      description: "Fariza's Territory by Faria & Saiful Islam Shuvo — 53 curated pieces of South Asian boutique fashion & artisan accessories from Mirpur, Dhaka, Bangladesh.",
      path: '/',
      imagePath: 'assets/products/CAT-001/socialSquare.webp',
      imageAlt: "Fariza's Territory — Magenta Plum Printed Three Piece",
      initialHash: ''
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    res.status(200).send(html);
  });

  app.use((req, res) => {
    res.sendFile(indexHtmlPath);
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fariza's Territory Boutique Server running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = {
  createApp,
  loadCatalogInMemory,
  getCanonicalBaseUrl
};
