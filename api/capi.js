/**
 * Fariza's Territory — Meta Conversions API (CAPI) Serverless Function
 * Vercel Serverless Endpoint: /api/capi
 * Dataset / Pixel ID: 1657670575734647
 * Test Event Code: TEST64994
 *
 * Implements server-side conversion tracking with automatic deduplication
 * against browser Meta Pixel (via shared event_id).
 */

const crypto = require('crypto');

// SHA-256 Hashing helper per Meta CAPI standard specifications
function hashValue(value) {
  if (!value) return undefined;
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

// Extract cookies helper
function parseCookies(cookieHeader) {
  const list = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach(cookie => {
    let [name, ...rest] = cookie.split('=');
    name = name.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    list[name] = decodeURIComponent(value);
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

  const DEFAULT_TEST_CODE =
    process.env.META_TEST_EVENT_CODE ||
    'TEST64994';

  // 2. Health check / Diagnostics on GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      service: "Fariza's Territory Meta Conversions API (CAPI)",
      dataset_id: DATASET_ID,
      token_configured: Boolean(ACCESS_TOKEN),
      test_event_code: DEFAULT_TEST_CODE,
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
    const eventTime = body.eventTime || body.event_time || Math.floor(Date.now() / 1000);
    const eventSourceUrl = body.eventSourceUrl || body.event_source_url || body.url || req.headers['referer'] || 'https://farizasterritory.com/';

    // Client IP & User Agent
    const forwarded = req.headers['x-forwarded-for'];
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || body.userAgent || '';

    // Cookies
    const cookies = parseCookies(req.headers['cookie'] || '');
    const fbp = body.fbp || cookies['_fbp'] || undefined;
    const fbc = body.fbc || cookies['_fbc'] || undefined;

    // Build user_data with proper SHA-256 hashes
    const rawUserData = body.userData || body.user_data || {};
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

    const nameHash = hashValue(rawUserData.name || rawUserData.fn || rawUserData.customer_name);
    if (nameHash) userData.fn = [nameHash];

    // City & Country (Default to Dhaka, Bangladesh)
    const city = rawUserData.city || rawUserData.district || 'dhaka';
    userData.ct = [hashValue(city)];
    userData.country = [hashValue('bd')];

    // Build custom_data
    const rawCustom = body.customData || body.custom_data || {};
    const customData = {
      currency: rawCustom.currency || 'BDT'
    };

    if (rawCustom.value !== undefined) {
      customData.value = Number(rawCustom.value) || 0;
    }
    if (rawCustom.content_name) customData.content_name = rawCustom.content_name;
    if (rawCustom.content_category) customData.content_category = rawCustom.content_category;
    if (rawCustom.content_ids) customData.content_ids = Array.isArray(rawCustom.content_ids) ? rawCustom.content_ids : [rawCustom.content_ids];
    if (rawCustom.content_type) customData.content_type = rawCustom.content_type || 'product';
    if (rawCustom.num_items !== undefined) customData.num_items = Number(rawCustom.num_items);
    if (rawCustom.order_id) customData.order_id = rawCustom.order_id;

    // Test Event Code (Supports passed query, body, or default TEST64994)
    const testEventCode = query.test_event_code || body.test_event_code || DEFAULT_TEST_CODE;

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

    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    // If Access Token is not available (e.g. local offline dev), return preview
    if (!ACCESS_TOKEN) {
      console.warn('[Meta CAPI] Warning: META_CAPI_ACCESS_TOKEN is not configured in Vercel environment.');
      return res.status(200).json({
        success: true,
        mode: 'preview_no_token',
        message: 'Event constructed according to Meta CAPI specification. Set META_CAPI_ACCESS_TOKEN in Vercel Project Settings > Environment Variables to push live.',
        dataset_id: DATASET_ID,
        test_event_code: testEventCode,
        payload: payload
      });
    }

    // Send to Meta Graph API
    const metaUrl = `https://graph.facebook.com/v19.0/${DATASET_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN)}`;
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
        fb_trace_id: result.error?.fbtrace_id
      });
    }

    console.log('[Meta CAPI] Successfully sent event to Meta:', eventName, 'ID:', eventId, 'Trace:', result.fbtrace_id);
    return res.status(200).json({
      success: true,
      events_received: result.events_received,
      event_name: eventName,
      event_id: eventId,
      fbtrace_id: result.fbtrace_id,
      test_event_code: testEventCode
    });
  } catch (err) {
    console.error('[Meta CAPI] Exception handling conversion event:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal server error processing CAPI event'
    });
  }
};
