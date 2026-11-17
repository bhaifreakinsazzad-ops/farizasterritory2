/**
 * Fariza's Territory — Server-Side Supabase Repository & Staff Auth Verifier
 * Uses SUPABASE_SERVICE_ROLE_KEY strictly on server routes.
 * Never exposes service role key to browser clients.
 */
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const commerce = require('../assets/js/commerce.js');

/**
 * Zero-dependency .env parser & loader (supports CRLF/LF, comments, quotes, export prefix).
 * Never overwrites environment variables already set in targetEnv.
 */
function parseDotEnvContent(rawContent) {
  const parsed = {};
  if (!rawContent || typeof rawContent !== 'string') return parsed;
  const lines = rawContent.split(/\r?\n/);
  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const withoutExport = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed;
    const eqIdx = withoutExport.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = withoutExport.slice(0, eqIdx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let val = withoutExport.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    } else {
      const commentIdx = val.indexOf(' #');
      if (commentIdx !== -1) {
        val = val.slice(0, commentIdx).trim();
      }
    }
    parsed[key] = val;
  }
  return parsed;
}

function loadDotEnvFile(envFilePath = path.join(__dirname, '..', '.env'), targetEnv = process.env) {
  try {
    if (!envFilePath || !fs.existsSync(envFilePath)) return {};
    const raw = fs.readFileSync(envFilePath, 'utf8');
    const parsed = parseDotEnvContent(raw);
    for (const [k, v] of Object.entries(parsed)) {
      if (targetEnv[k] === undefined) {
        targetEnv[k] = v;
      }
    }
    return parsed;
  } catch (_) {
    return {};
  }
}

// Automatically load .env from project root if present
loadDotEnvFile();

/**
 * Detects whether a token is a privileged Supabase service_role secret
 * so it can never be exposed as a public browser anonKey.
 */
function isServiceRoleJwt(token) {
  const raw = String(token || '').trim();
  if (!raw) return false;
  if (/^sb_secret_/i.test(raw) || /service_role/i.test(raw)) return true;
  const parts = raw.split('.');
  if (parts.length === 3) {
    try {
      const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
      const payload = JSON.parse(payloadJson);
      if (payload && String(payload.role || '').toLowerCase() === 'service_role') {
        return true;
      }
    } catch (_) {}
  }
  return false;
}

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL || 'https://vjbhrdclcnxevunskodm.supabase.co').trim();
  const rawAnonKey = String(process.env.SUPABASE_ANON_KEY || '').trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  // Guard: never allow SUPABASE_SERVICE_ROLE_KEY or a service_role JWT to be served as anonKey
  const unsafeAnonKey =
    Boolean(rawAnonKey) &&
    ((serviceRoleKey && rawAnonKey === serviceRoleKey) || isServiceRoleJwt(rawAnonKey));

  const anonKey = unsafeAnonKey ? '' : rawAnonKey;

  return {
    url,
    anonKey,
    serviceRoleKey,
    anonKeySuppressed: unsafeAnonKey,
    isAdminConfigured: Boolean(url && serviceRoleKey),
    isAnonConfigured: Boolean(url && anonKey)
  };
}

function getAllowedAdminEmails() {
  const raw = String(process.env.ADMIN_ALLOWED_EMAILS || '').trim();
  if (!raw) return new Set();
  return new Set(
    raw
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function createSupabaseServerStore() {
  const cfg = getSupabaseConfig();
  const adminClient = cfg.isAdminConfigured
    ? createClient(cfg.url, cfg.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

  const publicClient = cfg.isAnonConfigured
    ? createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      })
    : null;

  async function verifyAdminBearerToken(authHeader) {
    const header = String(authHeader || '').trim();
    if (!header.toLowerCase().startsWith('bearer ')) {
      return { ok: false, status: 401, error: 'Missing Bearer authorization token.' };
    }
    const token = header.slice(7).trim();
    if (!token) {
      return { ok: false, status: 401, error: 'Empty Bearer token.' };
    }

    const authVerifier = adminClient || publicClient;
    if (!authVerifier) {
      return {
        ok: false,
        status: 503,
        error: 'Authentication backend unconfigured: missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.'
      };
    }

    const { data, error } = await authVerifier.auth.getUser(token);
    if (error || !data || !data.user) {
      return { ok: false, status: 401, error: 'Invalid or expired Supabase session token.' };
    }

    const user = data.user;
    const emailLower = String(user.email || '').toLowerCase();
    const appRole = user.app_metadata && user.app_metadata.role;

    // 1. Authoritative check against public.staff_users via service_role
    if (adminClient) {
      const { data: staffRow, error: staffErr } = await adminClient
        .from('staff_users')
        .select('user_id, email, role, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!staffErr && staffRow) {
        if (!staffRow.is_active || !['admin', 'staff'].includes(staffRow.role)) {
          return { ok: false, status: 403, error: 'Staff account is inactive or lacks admin privileges.' };
        }
        return {
          ok: true,
          user: { id: user.id, email: user.email, role: staffRow.role }
        };
      }
    }

    // 2. Fallback check: signed app_metadata.role or explicit env ADMIN_ALLOWED_EMAILS allowlist
    const allowlist = getAllowedAdminEmails();
    if (['admin', 'staff'].includes(appRole) || (emailLower && allowlist.has(emailLower))) {
      return {
        ok: true,
        user: { id: user.id, email: user.email, role: appRole || 'admin' }
      };
    }

    return {
      ok: false,
      status: 403,
      error: 'Forbidden: authenticated user is not registered as an active boutique admin.'
    };
  }

  async function getStoreSettings() {
    const client = adminClient || publicClient;
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('store_settings')
        .select('id, store_name, tagline, whatsapp_number, messenger_username, facebook_url, meta_pixel_id, ga4_measurement_id, delivery_fee_dhaka, delivery_fee_outside, free_delivery_threshold, promo_text, updated_at')
        .eq('id', 'default')
        .maybeSingle();
      if (error || !data) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  async function updateStoreSettings(updates) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const safePayload = {
      id: 'default',
      whatsapp_number: updates.whatsapp_number,
      messenger_username: updates.messenger_username,
      facebook_url: updates.facebook_url,
      meta_pixel_id: updates.meta_pixel_id,
      ga4_measurement_id: updates.ga4_measurement_id,
      delivery_fee_dhaka: Number(updates.delivery_fee_dhaka ?? 80),
      delivery_fee_outside: Number(updates.delivery_fee_outside ?? 150),
      free_delivery_threshold: Number(updates.free_delivery_threshold ?? commerce.DEFAULT_FREE_SHIPPING_THRESHOLD),
      promo_text: updates.promo_text,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await adminClient
      .from('store_settings')
      .upsert([safePayload])
      .select('id, store_name, tagline, whatsapp_number, messenger_username, facebook_url, meta_pixel_id, ga4_measurement_id, delivery_fee_dhaka, delivery_fee_outside, free_delivery_threshold, promo_text, updated_at')
      .single();
    if (error) return { ok: false, status: 500, error: error.message };
    return { ok: true, data };
  }

  async function listProducts() {
    const client = adminClient || publicClient;
    if (!client) return null;
    try {
      const { data, error } = await client.from('products').select('*').order('sku');
      if (error) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  async function updateProduct(sku, updates) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const patch = { updated_at: new Date().toISOString() };
    if (updates.price_bdt !== undefined) patch.price_bdt = Number(updates.price_bdt);
    if (updates.is_available !== undefined) patch.is_available = Boolean(updates.is_available);
    if (updates.stock_count !== undefined) patch.stock_count = Number(updates.stock_count);
    if (updates.stock_verified !== undefined) patch.stock_verified = Boolean(updates.stock_verified);
    if (updates.price_review !== undefined) patch.price_review = Boolean(updates.price_review);

    const { data, error } = await adminClient
      .from('products')
      .update(patch)
      .eq('sku', sku)
      .select()
      .maybeSingle();
    if (error) return { ok: false, status: 500, error: error.message };
    if (!data) return { ok: false, status: 404, error: `SKU ${sku} not found in database.` };
    return { ok: true, data };
  }

  async function getCouponByCode(code) {
    if (!adminClient) {
      // Allow read-only fallback to canonical catalog coupon rules if DB unconfigured
      const fallback = commerce.DEFAULT_COUPONS.find(c => c.code === code);
      return fallback || null;
    }
    const { data, error } = await adminClient
      .from('coupons')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  }

  async function listCoupons() {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const { data, error } = await adminClient
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return { ok: false, status: 500, error: error.message };
    return { ok: true, data: data || [] };
  }

  async function upsertCoupon(coupon) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const { data, error } = await adminClient
      .from('coupons')
      .upsert([coupon])
      .select()
      .single();
    if (error) return { ok: false, status: 500, error: error.message };
    return { ok: true, data };
  }

  async function findOrderByIdempotencyKey(key) {
    if (!adminClient || !key) return null;
    const { data, error } = await adminClient
      .from('orders')
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  }

  async function createOrder(record) {
    if (!adminClient) {
      return {
        ok: false,
        status: 503,
        error: 'Durable database persistence is not configured (SUPABASE_SERVICE_ROLE_KEY missing).'
      };
    }
    if (record.idempotency_key) {
      const existing = await findOrderByIdempotencyKey(record.idempotency_key);
      if (existing) {
        return { ok: true, idempotent: true, data: existing };
      }
    }
    const { data, error } = await adminClient
      .from('orders')
      .insert([record])
      .select()
      .single();
    if (error) {
      return { ok: false, status: 500, error: error.message };
    }
    return { ok: true, idempotent: false, data };
  }

  async function getOrderByRef(orderRef) {
    if (!adminClient) {
      return {
        ok: false,
        status: 503,
        error: 'Durable database persistence is not configured (SUPABASE_SERVICE_ROLE_KEY missing).'
      };
    }
    const { data, error } = await adminClient
      .from('orders')
      .select('*')
      .eq('order_ref', orderRef)
      .maybeSingle();
    if (error) return { ok: false, status: 500, error: error.message };
    if (!data) return { ok: false, status: 404, error: 'Order not found.' };
    return { ok: true, data };
  }

  async function listOrders(filters = {}) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    let query = adminClient.from('orders').select('*').order('created_at', { ascending: false }).limit(500);
    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    const { data, error } = await query;
    if (error) return { ok: false, status: 500, error: error.message };
    return { ok: true, data: data || [] };
  }

  async function updateOrder(orderRef, patch) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const { data, error } = await adminClient
      .from('orders')
      .update(Object.assign({}, patch, { updated_at: new Date().toISOString() }))
      .eq('order_ref', orderRef)
      .select()
      .maybeSingle();
    if (error) return { ok: false, status: 500, error: error.message };
    if (!data) return { ok: false, status: 404, error: 'Order not found.' };
    return { ok: true, data };
  }

  return {
    isDurableConfigured: () => cfg.isAdminConfigured,
    getConfigSummary: () => ({
      supabaseUrl: cfg.url,
      anonConfigured: cfg.isAnonConfigured,
      serviceRoleConfigured: cfg.isAdminConfigured
    }),
    verifyAdminBearerToken,
    getStoreSettings,
    updateStoreSettings,
    listProducts,
    updateProduct,
    getCouponByCode,
    listCoupons,
    upsertCoupon,
    findOrderByIdempotencyKey,
    createOrder,
    getOrderByRef,
    listOrders,
    updateOrder
  };
}

module.exports = {
  parseDotEnvContent,
  loadDotEnvFile,
  isServiceRoleJwt,
  getSupabaseConfig,
  getAllowedAdminEmails,
  createSupabaseServerStore
};
