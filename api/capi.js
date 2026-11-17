/**
 * Fariza's Territory — Meta Conversions API (CAPI) Serverless Function
 * Endpoint: /api/capi
 * Dataset / Pixel ID: 1657670575734647
 *
 * Implements server-side conversion tracking with automatic deduplication
 * against browser Meta Pixel (via shared event_id).
 * Note: test_event_code is only attached when explicitly requested (e.g., query,
 * request body, or META_TEST_EVENT_CODE env var) so live ad traffic is never flagged as test data.
 */

const crypto = require('crypto');

// SHA-256 Hashing helper per Meta CAPI standard specifications
function hashValue(value) {
  if (value === undefined || value === null) return undefined;
  const clean = String(value).trim().toLowerCase();
  if (!clean) return undefined;
  return crypto.createHash('sha256').update(clean).digest('hex');
}

// Clean and normalize phone number to E.164 without '+' symbol (e.g. Bangladesh: 88017XXXXXXXX)
function normalizePhone(phone) {
  if (!phone) return undefined;
  let digits = String(phone).replace(/\D/g, '');
  if (!digits) return undefined;
  // If starts with 01 (local Bangladeshi mobile format 11 digits: 01XXXXXXXXX)
  if (digits.startsWith('01') && digits.length === 11) {
    digits = '88' + digits;
  }
  return hashValue(digits);
}

// Safe cookie parser
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    const name = (parts.shift() || '').trim();
    if (!name) return;
    const rawVal = parts.join('=').trim();
    try {
      list[name] = decodeURIComponent(rawVal);
    } catch (e) {
      list[name] = rawVal;
    }
  });
  return list;
}

module.exports = async function handler(req, res) {
  // 1. Set CORS Headers to allow storefront & GHL custom code block
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Configuration from Environment Variables
  const DATASET_ID =
    process.env.META_DATASET_ID ||
    process.env.META_PIXEL_ID ||
    '1657670575734647';

  const ACCESS_TOKEN =
    process.env.META_CAPI_ACCESS_TOKEN ||
    process.env.META_ACCESS_TOKEN ||
    process.env.FB_ACCESS_TOKEN ||
    process.env.FACEBOOK_ACCESS_TOKEN ||
    process.env.META_PIXEL_ACCESS_TOKEN ||
    '';

  // Only default to a test event code when explicitly configured in env
  const ENV_TEST_CODE = (process.env.META_TEST_EVENT_CODE || '').trim();

  // 2. Health check / Diagnostics on GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: "Fariza's Territory Meta Conversions API (CAPI)",
      dataset_id: DATASET_ID,
      token_configured: Boolean(ACCESS_TOKEN),
      mode: ACCESS_TOKEN ? (ENV_TEST_CODE ? 'live_with_env_test_code' : 'live_production') : 'preview_no_token',
      test_event_code: ENV_TEST_CODE || null,
      timestamp: Math.floor(Date.now() / 1000)
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST or GET.' });
  }

  try {
    const body = req.body || {};
    const query = req.query || {};

    // Determine event fields
    const eventName = body.eventName || body.event_name || 'PageView';
    const eventId = body.eventId || body.event_id || `ft_capi_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const eventTime = Number(body.eventTime || body.event_time) || Math.floor(Date.now() / 1000);
    const eventSourceUrl = body.eventSourceUrl || body.event_source_url || body.url || req.headers['referer'] || 'https://farizasterritory.com/';

    // Client IP & User Agent
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = forwarded ? forwarded.split(',')[0].trim() : (req.socket && req.socket.remoteAddress) || '127.0.0.1';
    const clientIp = String(rawIp).replace(/^::ffff:/i, '');
    const userAgent = req.headers['user-agent'] || body.userAgent || '';

    // Cookies & User Data
    const cookies = parseCookies(req.headers['cookie'] || '');
    const rawUserData = body.userData || body.user_data || {};
    const fbp = rawUserData.fbp || body.fbp || cookies['_fbp'] || undefined;
    const fbc = rawUserData.fbc || body.fbc || cookies['_fbc'] || undefined;

    const userData = {
      client_ip_address: clientIp,
      client_user_agent: userAgent
    };

    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;

    const emailHash = hashValue(rawUserData.email || rawUserData.em);
    if (emailHash) userData.em = [emailHash];

    const phoneHash = normalizePhone(rawUserData.phone || rawUserData.ph || rawUserData.customer_phone);
    if (phoneHash) userData.ph = [phoneHash];

    const fullName = String(rawUserData.name || rawUserData.fn || rawUserData.customer_name || '').trim();
    if (fullName) {
      const parts = fullName.split(/\s+/);
      const fnHash = hashValue(parts[0]);
      if (fnHash) userData.fn = [fnHash];
      if (parts.length > 1) {
        const lnHash = hashValue(parts.slice(1).join(' '));
        if (lnHash) userData.ln = [lnHash];
      }
    }

    // City & Country (only hash city when supplied by caller)
    const city = rawUserData.city || rawUserData.district;
    const cityHash = city ? hashValue(city) : undefined;
    if (cityHash) userData.ct = [cityHash];
    userData.country = [hashValue('bd')];

    // Build custom_data
    const rawCustom = body.customData || body.custom_data || {};
    const customData = {
      currency: rawCustom.currency || 'BDT'
    };

    if (rawCustom.value !== undefined && rawCustom.value !== null) {
      customData.value = Number(rawCustom.value) || 0;
    }
    if (rawCustom.content_name) customData.content_name = rawCustom.content_name;
    if (rawCustom.content_category) customData.content_category = rawCustom.content_category;
    if (rawCustom.content_ids) {
      customData.content_ids = Array.isArray(rawCustom.content_ids) ? rawCustom.content_ids : [rawCustom.content_ids];
    }
    if (rawCustom.content_type) customData.content_type = rawCustom.content_type || 'product';
    if (rawCustom.num_items !== undefined && rawCustom.num_items !== null) customData.num_items = Number(rawCustom.num_items);
    if (rawCustom.order_id) customData.order_id = rawCustom.order_id;
    if (rawCustom.promo_code) customData.promo_code = rawCustom.promo_code;
    if (rawCustom.contact_channel) customData.contact_channel = rawCustom.contact_channel;
    if (rawCustom.search_string) customData.search_string = rawCustom.search_string;

    // Test Event Code: ONLY attached if explicitly passed via query, body, or env var
    const requestedTestCode = String(query.test_event_code || body.test_event_code || ENV_TEST_CODE || '').trim();

    // Prepare full Meta CAPI Payload
    const singleEvent = {
      event_name: eventName,
      event_time: eventTime,
      event_id: eventId, // Deduplication key with browser pixel
      event_source_url: eventSourceUrl,
      action_source: 'website',
      user_data: userData,
      custom_data: customData
    };

    const payload = {
      data: [singleEvent]
    };

    if (requestedTestCode) {
      payload.test_event_code = requestedTestCode;
    }

    // If Access Token is not available (e.g. local/preview without CAPI token), return diagnostic preview
    if (!ACCESS_TOKEN) {
      console.warn('[Meta CAPI] Note: META_CAPI_ACCESS_TOKEN is not configured in environment.');
      return res.status(200).json({
        success: true,
        mode: 'preview_no_token',
        message: 'Event constructed according to Meta CAPI specification. Set META_CAPI_ACCESS_TOKEN in server environment variables to push live.',
        dataset_id: DATASET_ID,
        test_event_code: requestedTestCode || null,
        payload: payload
      });
    }

    // Send to Meta Graph API
    const metaUrl = `https://graph.facebook.com/v19.0/${encodeURIComponent(DATASET_ID)}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
    const response = await fetch(metaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Meta CAPI] Error from Meta Graph API:', result);
      return res.status(response.status).json({
        success: false,
        error: result.error || 'Meta API returned error',
        event_id: eventId,
        fb_trace_id: result.error && result.error.fbtrace_id
      });
    }

    console.log('[Meta CAPI] Successfully sent event to Meta:', eventName, 'ID:', eventId, 'Trace:', result.fbtrace_id);
    return res.status(200).json({
      success: true,
      mode: requestedTestCode ? 'test_event' : 'live_production',
      events_received: result.events_received,
      event_name: eventName,
      event_id: eventId,
      fbtrace_id: result.fbtrace_id,
      test_event_code: requestedTestCode || null
    });
  } catch (err) {
    console.error('[Meta CAPI] Exception handling conversion event:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error processing CAPI event'
    });
  }
};
