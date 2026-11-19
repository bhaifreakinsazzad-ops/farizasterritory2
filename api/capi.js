/**
 * Fariza's Territory — Meta Conversions API (CAPI) Handler & Server Dispatcher
 * Endpoint: /api/capi
 * Dataset / Pixel ID: 1657670575734647
 *
 * Security Hardening:
 * - Strict CORS origin validation (never pairs '*' with Allow-Credentials: true).
 * - Public POST /api/capi only accepts upper-funnel / inquiry events; Purchase
 *   and custom test_event_code overrides are blocked on unauthenticated calls.
 * - Authoritative Purchase events are dispatched server-side from verified
 *   admin confirmation milestones via dispatchCapiEvent(..., { allowPrivilegedEvents: true }).
 */

const crypto = require('crypto');

const PUBLIC_ALLOWED_EVENTS = Object.freeze([
  'PageView',
  'ViewContent',
  'Search',
  'AddToCart',
  'AddToWishlist',
  'InitiateCheckout',
  'Contact',
  'ApplyPromotion',
  'Lead'
]);

const PRIVILEGED_EVENTS = Object.freeze([
  'Purchase',
  'CompleteRegistration'
]);

const ipBuckets = new Map();

function checkCapiRateLimit(ip) {
  const now = Date.now();
  if (ipBuckets.size > 5000) {
    for (const [k, v] of ipBuckets.entries()) {
      if (!v || now > v.resetAt) ipBuckets.delete(k);
    }
  }
  const windowMs = 60 * 1000;
  const maxReqs = 80;
  const entry = ipBuckets.get(ip);
  if (!entry || now > entry.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  if (entry.count > maxReqs) {
    return false;
  }
  return true;
}

function hashValue(value) {
  if (value === undefined || value === null) return undefined;
  const clean = String(value).trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

function normalizePhoneHash(phone) {
  if (!phone) return undefined;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('00880')) digits = digits.slice(2);
  if (digits.startsWith('01') && digits.length === 11) {
    digits = '88' + digits;
  }
  return hashValue(digits);
}

function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  String(cookieHeader).split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = (parts.shift() || '').trim();
    if (!name) return;
    const rawVal = parts.join('=').trim();
    try {
      list[name] = decodeURIComponent(rawVal);
    } catch (_) {
      list[name] = rawVal;
    }
  });
  return list;
}

function getAllowedOriginsSet(req) {
  const set = new Set();
  const addOrigin = (urlStr) => {
    if (!urlStr) return;
    try {
      const parsed = new URL(urlStr);
      set.add(parsed.origin);
    } catch (_) {}
  };

  addOrigin(process.env.PUBLIC_SITE_URL);
  const envOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  for (const o of envOrigins) {
    addOrigin(o);
  }

  const host = req && req.headers ? (req.headers.host || '') : '';
  if (host) {
    const proto = String((req.headers['x-forwarded-proto'] || 'https').split(',')[0]).trim();
    addOrigin(`${proto}://${host}`);
    if (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host.startsWith('0.0.0.0')) {
      addOrigin(`http://${host}`);
    }
  }
  return set;
}

function applyCorsHeaders(req, res) {
  const origin = req && req.headers ? req.headers.origin : undefined;
  res.setHeader('Vary', 'Origin');
  if (!origin) {
    return;
  }
  const allowed = getAllowedOriginsSet(req);
  if (allowed.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

function getCapiConfig() {
  const datasetId =
    process.env.META_DATASET_ID ||
    process.env.META_PIXEL_ID ||
    '1657670575734647';

  const accessToken =
    process.env.META_CAPI_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    process.env.FB_ACCESS_TOKEN ||
    process.env.FACEBOOK_ACCESS_TOKEN ||
    process.env.META_PIXEL_ACCESS_TOKEN ||
    '';

  const envTestCode = String(process.env.META_TEST_EVENT_CODE || '').trim();
  return { datasetId, accessToken, envTestCode };
}

function buildCapiPayload(params, options = {}) {
  const body = params || {};
  const { allowTestCode = false } = options;
  const { envTestCode } = getCapiConfig();

  const eventName = String(body.eventName || body.event_name || 'PageView').trim();
  const eventId = String(
    body.eventId ||
      body.event_id ||
      `ft_capi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  ).trim();
  const eventTime = Number(body.eventTime || body.event_time) || Math.floor(Date.now() / 1000);
  const canonicalBase = String(process.env.PUBLIC_SITE_URL || 'https://farizasterritory.com').replace(/\/+$/, '');
  const eventSourceUrl = String(body.eventSourceUrl || body.event_source_url || body.url || `${canonicalBase}/`).slice(0, 500);

  const rawUserData = body.userData || body.user_data || {};
  const userData = {};

  if (body.clientIp) userData.client_ip_address = String(body.clientIp);
  if (body.userAgent) userData.client_user_agent = String(body.userAgent);
  if (rawUserData.fbp || body.fbp) userData.fbp = String(rawUserData.fbp || body.fbp);
  if (rawUserData.fbc || body.fbc) userData.fbc = String(rawUserData.fbc || body.fbc);

  const emailHash = hashValue(rawUserData.email || rawUserData.em);
  if (emailHash) userData.em = [emailHash];

  const phoneHash = normalizePhoneHash(rawUserData.phone || rawUserData.ph || rawUserData.customer_phone);
  if (phoneHash) userData.ph = [phoneHash];

  const fullName = String(rawUserData.name || rawUserData.fn || rawUserData.firstName || rawUserData.customer_name || '').trim();
  if (fullName) {
    const parts = fullName.split(/\s+/);
    const fnHash = hashValue(parts[0]);
    if (fnHash) userData.fn = [fnHash];
    if (parts.length > 1) {
      const lnHash = hashValue(parts.slice(1).join(' '));
      if (lnHash) userData.ln = [lnHash];
    }
  }

  const city = rawUserData.city || rawUserData.district;
  const cityHash = city ? hashValue(city) : undefined;
  if (cityHash) userData.ct = [cityHash];
  userData.country = [hashValue('bd')];

  const rawCustom = body.customData || body.custom_data || {};
  const customData = {
    currency: String(rawCustom.currency || 'BDT').toUpperCase()
  };

  if (rawCustom.value !== undefined && rawCustom.value !== null && Number.isFinite(Number(rawCustom.value))) {
    customData.value = Number(rawCustom.value);
  }
  if (rawCustom.content_name) customData.content_name = String(rawCustom.content_name).slice(0, 200);
  if (rawCustom.content_category) customData.content_category = String(rawCustom.content_category).slice(0, 120);
  if (rawCustom.content_ids) {
    customData.content_ids = Array.isArray(rawCustom.content_ids)
      ? rawCustom.content_ids.map(String).slice(0, 50)
      : [String(rawCustom.content_ids)];
  }
  if (rawCustom.content_type) customData.content_type = String(rawCustom.content_type);
  if (rawCustom.num_items !== undefined && rawCustom.num_items !== null && Number.isFinite(Number(rawCustom.num_items))) {
    customData.num_items = Number(rawCustom.num_items);
  }
  if (rawCustom.order_id) customData.order_id = String(rawCustom.order_id).slice(0, 80);
  if (rawCustom.promo_code) customData.promo_code = String(rawCustom.promo_code).slice(0, 40);
  if (rawCustom.contact_channel) customData.contact_channel = String(rawCustom.contact_channel).slice(0, 40);
  if (rawCustom.search_string) customData.search_string = String(rawCustom.search_string).slice(0, 120);

  const requestedTestCode = allowTestCode
    ? String(body.test_event_code || body.testEventCode || envTestCode || '').trim()
    : envTestCode;

  const payload = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        event_source_url: eventSourceUrl,
        action_source: 'website',
        user_data: userData,
        custom_data: customData
      }
    ]
  };

  if (requestedTestCode) {
    payload.test_event_code = requestedTestCode;
  }

  return {
    eventName,
    eventId,
    requestedTestCode: requestedTestCode || null,
    payload
  };
}

async function dispatchCapiEvent(params, options = {}) {
  const { allowPrivilegedEvents = false, allowTestCode = false } = options;
  const { datasetId, accessToken } = getCapiConfig();
  const built = buildCapiPayload(params, { allowTestCode });

  if (!allowPrivilegedEvents && !PUBLIC_ALLOWED_EVENTS.includes(built.eventName)) {
    return {
      status: 403,
      body: {
        success: false,
        error: `Event '${built.eventName}' cannot be submitted from an unauthenticated browser session.`
      }
    };
  }

  if (!accessToken) {
    return {
      status: 200,
      body: {
        success: true,
        mode: 'preview_no_token',
        message: 'Event constructed according to Meta CAPI specification. Set META_CAPI_ACCESS_TOKEN on server to push live.',
        dataset_id: datasetId,
        event_name: built.eventName,
        event_id: built.eventId,
        test_event_code: built.requestedTestCode,
        payload: built.payload
      }
    };
  }

  const metaUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(datasetId)}/events?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(metaUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(built.payload)
  });

  const result = await response.json();
  if (!response.ok) {
    return {
      status: response.status,
      body: {
        success: false,
        error: result.error || 'Meta API returned error',
        event_name: built.eventName,
        event_id: built.eventId,
        fb_trace_id: result.error && result.error.fbtrace_id
      }
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      mode: built.requestedTestCode ? 'test_event' : 'live_production',
      events_received: result.events_received,
      event_name: built.eventName,
      event_id: built.eventId,
      fbtrace_id: result.fbtrace_id,
      test_event_code: built.requestedTestCode
    }
  };
}

async function handler(req, res) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { datasetId, accessToken, envTestCode } = getCapiConfig();

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: "Fariza's Territory Meta Conversions API (CAPI)",
      dataset_id: datasetId,
      token_configured: Boolean(accessToken),
      mode: accessToken ? (envTestCode ? 'live_with_env_test_code' : 'live_production') : 'preview_no_token',
      test_event_code_configured: Boolean(envTestCode),
      public_allowed_events: PUBLIC_ALLOWED_EVENTS,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST or GET.' });
  }

  try {
    const body = req.body || {};
    const forwarded = req.headers && req.headers['x-forwarded-for'];
    const rawIp = forwarded ? String(forwarded).split(',')[0].trim() : (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const clientIp = String(rawIp).replace(/^::ffff:/i, '');

    if (!checkCapiRateLimit(clientIp)) {
      return res.status(429).json({ success: false, error: 'Too many analytics requests. Please slow down.' });
    }

    const eventName = String(body.eventName || body.event_name || '').trim();
    if (!eventName || eventName.length > 64) {
      return res.status(400).json({ success: false, error: 'Valid eventName is required.' });
    }

    if (!PUBLIC_ALLOWED_EVENTS.includes(eventName)) {
      return res.status(403).json({
        success: false,
        error: `Event '${eventName}' is restricted to verified server-side transitions and authenticated admin endpoints.`
      });
    }

    const cookies = parseCookies((req.headers && req.headers.cookie) || '');
    const rawUserData = Object.assign({}, body.userData || body.user_data || {});
    if (!rawUserData.fbp && !body.fbp && cookies._fbp) rawUserData.fbp = cookies._fbp;
    if (!rawUserData.fbc && !body.fbc && cookies._fbc) rawUserData.fbc = cookies._fbc;

    const result = await dispatchCapiEvent(
      Object.assign({}, body, {
        eventName,
        userData: rawUserData,
        clientIp,
        userAgent: (req.headers && req.headers['user-agent']) || body.userAgent || '',
        eventSourceUrl:
          body.eventSourceUrl ||
          body.event_source_url ||
          body.url ||
          (req.headers && req.headers.referer) ||
          process.env.PUBLIC_SITE_URL ||
          'https://farizasterritory.com/'
      }),
      { allowPrivilegedEvents: false, allowTestCode: false }
    );

    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('[Meta CAPI] Exception handling conversion event:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error processing CAPI event'
    });
  }
}

module.exports = handler;
module.exports.PUBLIC_ALLOWED_EVENTS = PUBLIC_ALLOWED_EVENTS;
module.exports.PRIVILEGED_EVENTS = PRIVILEGED_EVENTS;
module.exports.dispatchCapiEvent = dispatchCapiEvent;
module.exports.buildCapiPayload = buildCapiPayload;
module.exports.getAllowedOriginsSet = getAllowedOriginsSet;
