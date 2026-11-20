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
        .select('user_id, email, full_name, role, is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!staffErr && staffRow) {
        if (!staffRow.is_active || !['admin', 'staff'].includes(staffRow.role)) {
          return { ok: false, status: 403, error: 'Staff account is inactive or lacks privileges.' };
        }
        return {
          ok: true,
          user: {
            id: user.id,
            email: user.email,
            full_name: staffRow.full_name || (user.user_metadata && user.user_metadata.full_name) || '',
            role: staffRow.role
          }
        };
      }
    }

    // 2. Fallback check: signed app_metadata.role or explicit env ADMIN_ALLOWED_EMAILS allowlist
    const allowlist = getAllowedAdminEmails();
    if (['admin', 'staff'].includes(appRole) || (emailLower && allowlist.has(emailLower))) {
      return {
        ok: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: (user.user_metadata && user.user_metadata.full_name) || '',
          role: appRole || 'admin'
        }
      };
    }

    return {
      ok: false,
      status: 403,
      error: 'Forbidden: authenticated user is not registered as an active boutique staff or admin user.'
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
    const existing = (await getStoreSettings()) || {};
    const pickText = (field, fallback) => {
      if (updates && updates[field] !== undefined) return String(updates[field] ?? '').trim();
      if (existing[field] !== undefined && existing[field] !== null) return existing[field];
      return fallback;
    };
    const pickNum = (field, fallback) => {
      if (updates && updates[field] !== undefined && updates[field] !== null && updates[field] !== '') {
        return Number(updates[field]);
      }
      if (existing[field] !== undefined && existing[field] !== null) {
        return Number(existing[field]);
      }
      return fallback;
    };
    const safePayload = {
      id: 'default',
      whatsapp_number: pickText('whatsapp_number', ''),
      messenger_username: pickText('messenger_username', 'farizasterritory143') || 'farizasterritory143',
      facebook_url: pickText('facebook_url', 'https://www.facebook.com/farizasterritory143'),
      meta_pixel_id: pickText('meta_pixel_id', '1657670575734647') || '1657670575734647',
      ga4_measurement_id: pickText('ga4_measurement_id', ''),
      delivery_fee_dhaka: pickNum('delivery_fee_dhaka', commerce.DEFAULT_DELIVERY_FEES.dhaka),
      delivery_fee_outside: pickNum('delivery_fee_outside', commerce.DEFAULT_DELIVERY_FEES.outside_dhaka),
      free_delivery_threshold: pickNum('free_delivery_threshold', commerce.DEFAULT_FREE_SHIPPING_THRESHOLD),
      promo_text: pickText('promo_text', ''),
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

  async function listCollections() {
    const client = adminClient || publicClient;
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('collections')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('slug', { ascending: true });
      if (error) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  async function upsertCollection(col) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const payload = {
      slug: String(col.slug || '').trim().toLowerCase(),
      name: String(col.name || '').trim(),
      name_bn: col.name_bn ? String(col.name_bn).trim() : null,
      description: col.description ? String(col.description).trim() : null,
      description_bn: col.description_bn ? String(col.description_bn).trim() : null,
      hero_image: col.hero_image ? String(col.hero_image).trim() : null,
      sort_order: Number.isFinite(Number(col.sort_order)) ? Math.floor(Number(col.sort_order)) : 0,
      is_active: col.is_active !== false,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await adminClient
      .from('collections')
      .upsert([payload], { onConflict: 'slug' })
      .select()
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

  async function createProduct(prod, actorEmail) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const priceReview = prod.price_review !== undefined ? Boolean(prod.price_review) : true;
    const stockVerified = prod.stock_verified !== undefined ? Boolean(prod.stock_verified) : false;
    const nowIso = new Date().toISOString();
    const record = {
      sku: String(prod.sku || '').trim().toUpperCase(),
      collection_slug: String(prod.collection_slug || '').trim().toLowerCase(),
      title: String(prod.title || '').trim(),
      title_bn: prod.title_bn ? String(prod.title_bn).trim() : null,
      price_bdt: Number(prod.price_bdt || 0),
      is_available: prod.is_available !== false,
      stock_count: Math.max(0, Math.floor(Number(prod.stock_count ?? 0))),
      reserved_count: 0,
      stock_verified: stockVerified,
      price_review: priceReview,
      selling_unit: prod.selling_unit ? String(prod.selling_unit).trim() : null,
      available_variants: Array.isArray(prod.available_variants) ? prod.available_variants : null,
      badge: prod.badge ? String(prod.badge).trim() : null,
      badge_bn: prod.badge_bn ? String(prod.badge_bn).trim() : null,
      material: prod.material ? String(prod.material).trim() : null,
      color: prod.color ? String(prod.color).trim() : null,
      care: prod.care ? String(prod.care).trim() : null,
      description: prod.description ? String(prod.description).trim() : null,
      alt: prod.alt ? String(prod.alt).trim() : null,
      main_image: prod.main_image ? String(prod.main_image).trim() : null,
      is_archived: Boolean(prod.is_archived),
      approved_at: !priceReview && stockVerified ? nowIso : null,
      approved_by: !priceReview && stockVerified ? (actorEmail || 'admin') : null,
      metadata: prod.metadata && typeof prod.metadata === 'object' ? prod.metadata : {},
      updated_at: nowIso
    };
    const { data, error } = await adminClient
      .from('products')
      .insert([record])
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return { ok: false, status: 409, error: `SKU ${record.sku} already exists.` };
      return { ok: false, status: 500, error: error.message };
    }
    return { ok: true, data };
  }

  async function updateProduct(sku, updates, actorEmail) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const { data: existing, error: fetchErr } = await adminClient
      .from('products')
      .select('*')
      .eq('sku', sku)
      .maybeSingle();
    if (fetchErr) return { ok: false, status: 500, error: fetchErr.message };
    if (!existing) return { ok: false, status: 404, error: `SKU ${sku} not found in database.` };

    const nowIso = new Date().toISOString();
    const patch = { updated_at: nowIso };
    const stringFields = [
      'collection_slug',
      'title',
      'title_bn',
      'selling_unit',
      'badge',
      'badge_bn',
      'material',
      'color',
      'care',
      'description',
      'alt',
      'main_image'
    ];
    for (const f of stringFields) {
      if (updates[f] !== undefined) {
        patch[f] = updates[f] === null ? null : String(updates[f]).trim();
      }
    }
    if (updates.price_bdt !== undefined) patch.price_bdt = Number(updates.price_bdt);
    if (updates.is_available !== undefined) patch.is_available = Boolean(updates.is_available);
    if (updates.stock_count !== undefined) patch.stock_count = Math.max(0, Math.floor(Number(updates.stock_count)));
    if (updates.reserved_count !== undefined) patch.reserved_count = Math.max(0, Math.floor(Number(updates.reserved_count)));
    if (updates.stock_verified !== undefined) patch.stock_verified = Boolean(updates.stock_verified);
    if (updates.price_review !== undefined) patch.price_review = Boolean(updates.price_review);
    if (updates.is_archived !== undefined) patch.is_archived = Boolean(updates.is_archived);
    if (updates.available_variants !== undefined) {
      patch.available_variants = Array.isArray(updates.available_variants) ? updates.available_variants : null;
    }
    if (updates.metadata !== undefined && typeof updates.metadata === 'object') {
      patch.metadata = updates.metadata;
    }

    const nextPriceReview = patch.price_review !== undefined ? patch.price_review : existing.price_review;
    const nextStockVerified = patch.stock_verified !== undefined ? patch.stock_verified : existing.stock_verified;
    if (!nextPriceReview && nextStockVerified) {
      if (!existing.approved_at) {
        patch.approved_at = nowIso;
        patch.approved_by = actorEmail || existing.approved_by || 'admin';
      }
    } else if (patch.price_review === true || patch.stock_verified === false) {
      patch.approved_at = null;
    }

    const { data, error } = await adminClient
      .from('products')
      .update(patch)
      .eq('sku', sku)
      .select()
      .maybeSingle();
    if (error) return { ok: false, status: 500, error: error.message };
    if (!data) return { ok: false, status: 404, error: `SKU ${sku} not found in database.` };
    return { ok: true, data, previous: existing };
  }

  async function listProductAssets() {
    const client = adminClient || publicClient;
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('product_assets')
        .select('*')
        .order('sku', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  async function upsertProductAsset(asset) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const cleanSku = String(asset.sku || '').trim().toUpperCase();
    const assetKey = String(asset.asset_key || 'main').trim().toLowerCase();
    const storagePath = String(asset.storage_path || '').trim();
    const sortOrder = Number.isFinite(Number(asset.sort_order)) ? Math.floor(Number(asset.sort_order)) : 0;

    const { data, error } = await adminClient
      .from('product_assets')
      .upsert(
        [{ sku: cleanSku, asset_key: assetKey, storage_path: storagePath, sort_order: sortOrder }],
        { onConflict: 'sku,asset_key' }
      )
      .select()
      .single();
    if (error) return { ok: false, status: 500, error: error.message };

    if (assetKey === 'main' && storagePath) {
      await adminClient
        .from('products')
        .update({ main_image: storagePath, updated_at: new Date().toISOString() })
        .eq('sku', cleanSku);
    }

    return { ok: true, data };
  }

  let storageBucketChecked = false;
  async function uploadMediaToStorage({ sku, assetKey, buffer, mimeType, ext }) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    if (!storageBucketChecked) {
      storageBucketChecked = true;
      try {
        await adminClient.storage.createBucket('product-media', { public: true });
      } catch (_) {
        // Bucket may already exist
      }
    }
    const objectPath = `${sku}/${assetKey}-${Date.now()}.${ext}`;
    const { error } = await adminClient.storage
      .from('product-media')
      .upload(objectPath, buffer, { contentType: mimeType, upsert: true });
    if (error) return { ok: false, status: 500, error: error.message };
    const { data: pubData } = adminClient.storage.from('product-media').getPublicUrl(objectPath);
    if (!pubData || !pubData.publicUrl) {
      return { ok: false, status: 500, error: 'Uploaded to storage but public URL unavailable.' };
    }
    return { ok: true, url: pubData.publicUrl };
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

  function isMissingRpcError(err) {
    if (!err) return false;
    const msg = String(err.message || '');
    return err.code === 'PGRST202' || /could not find the function/i.test(msg);
  }

  async function createOrder(record) {
    if (!adminClient) {
      return {
        ok: false,
        status: 503,
        error: 'Durable database persistence is not configured (SUPABASE_SERVICE_ROLE_KEY missing).'
      };
    }

    const { data: rpcRes, error: rpcErr } = await adminClient.rpc('ft_create_order_atomic', {
      p_order: record
    });

    if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
      if (rpcRes.ok) {
        return { ok: true, idempotent: Boolean(rpcRes.idempotent), data: rpcRes.data };
      }
      return {
        ok: false,
        status: Number(rpcRes.status || 409),
        error: rpcRes.error || 'Unable to reserve inventory for order.'
      };
    }

    if (rpcErr && !isMissingRpcError(rpcErr)) {
      return { ok: false, status: 500, error: rpcErr.message };
    }

    // Fallback when migration 03 RPC is not yet deployed on an older staging DB
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

  async function transitionOrder(orderRef, patch) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const { data: rpcRes, error: rpcErr } = await adminClient.rpc('ft_transition_order_inventory', {
      p_order_ref: orderRef,
      p_patch: patch
    });
    if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
      if (rpcRes.ok) {
        return { ok: true, data: rpcRes.data };
      }
      return {
        ok: false,
        status: Number(rpcRes.status || 400),
        error: rpcRes.error || 'Order transition rejected.'
      };
    }
    if (rpcErr && !isMissingRpcError(rpcErr)) {
      return { ok: false, status: 500, error: rpcErr.message };
    }
    return updateOrder(orderRef, patch);
  }

  async function listStaffUsers() {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const { data, error } = await adminClient
      .from('staff_users')
      .select('user_id, email, full_name, role, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) return { ok: false, status: 500, error: error.message };
    return { ok: true, data: data || [] };
  }

  async function upsertStaffUser(staff) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const payload = {
      user_id: staff.user_id,
      email: String(staff.email || '').trim().toLowerCase(),
      full_name: staff.full_name ? String(staff.full_name).trim() : null,
      role: staff.role === 'admin' ? 'admin' : 'staff',
      is_active: staff.is_active !== false,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await adminClient
      .from('staff_users')
      .upsert([payload], { onConflict: 'user_id' })
      .select('user_id, email, full_name, role, is_active, created_at, updated_at')
      .single();
    if (error) return { ok: false, status: 500, error: error.message };
    return { ok: true, data };
  }

  async function recordAuditLog(entry) {
    if (!adminClient) return { ok: false, status: 503 };
    try {
      const payload = {
        actor_id: entry.actor_id || null,
        actor_email: entry.actor_email || null,
        actor_role: entry.actor_role || null,
        action: String(entry.action || '').trim(),
        target_type: String(entry.target_type || '').trim(),
        target_id: entry.target_id ? String(entry.target_id) : null,
        before_state: entry.before_state !== undefined ? entry.before_state : null,
        after_state: entry.after_state !== undefined ? entry.after_state : null,
        metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {}
      };
      const { data, error } = await adminClient.from('audit_logs').insert([payload]).select().single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, data };
    } catch (_) {
      return { ok: false };
    }
  }

  async function listAuditLogs(limit = 100) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const safeLimit = Math.max(1, Math.min(Number(limit || 100), 300));
    const { data, error } = await adminClient
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(safeLimit);
    if (error) return { ok: false, status: 500, error: error.message };
    return { ok: true, data: data || [] };
  }

  async function enqueueCapiOutboxEvent(evt) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const payload = {
      event_id: String(evt.event_id || '').trim(),
      event_name: String(evt.event_name || 'Purchase').trim(),
      order_ref: evt.order_ref ? String(evt.order_ref).trim() : null,
      payload: evt.payload || {},
      status: 'pending',
      attempts: 0,
      max_attempts: Number(evt.max_attempts || 5),
      next_retry_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await adminClient
      .from('capi_outbox')
      .upsert([payload], { onConflict: 'event_id', ignoreDuplicates: true })
      .select()
      .maybeSingle();
    if (error) return { ok: false, status: 500, error: error.message };
    if (data) return { ok: true, created: true, data };
    const existing = await adminClient
      .from('capi_outbox')
      .select('*')
      .eq('event_id', payload.event_id)
      .maybeSingle();
    return { ok: true, created: false, data: existing.data || payload };
  }

  async function claimDueCapiOutboxEvents(limit = 10) {
    if (!adminClient) return { ok: false, status: 503, data: [] };
    const { data, error } = await adminClient.rpc('ft_claim_capi_outbox', { p_limit: limit });
    if (!error && Array.isArray(data)) {
      return { ok: true, data };
    }
    return { ok: false, status: 500, data: [], error: error && error.message };
  }

  async function markCapiOutboxResult(eventId, outcome) {
    if (!adminClient) return { ok: false, status: 503 };
    const { data: cur } = await adminClient
      .from('capi_outbox')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();
    if (!cur) return { ok: false, status: 404, error: 'Outbox event not found.' };

    const attempts = Number(cur.attempts || 0) + 1;
    const maxAttempts = Number(cur.max_attempts || 5);
    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const patch = {
      attempts,
      updated_at: nowIso,
      last_error: outcome.error ? String(outcome.error).slice(0, 500) : null,
      fbtrace_id: outcome.fbtrace_id || cur.fbtrace_id || null
    };

    if (outcome.delivered && outcome.mode === 'live_production') {
      patch.status = 'sent';
      patch.sent_at = nowIso;
      patch.last_error = null;
    } else if (outcome.mode === 'preview_no_token') {
      patch.status = 'pending';
      patch.attempts = cur.attempts || 0;
      patch.next_retry_at = new Date(now + 15 * 60 * 1000).toISOString();
      patch.last_error = 'Preview mode (META_CAPI_ACCESS_TOKEN not configured on server).';
    } else if (attempts >= maxAttempts) {
      patch.status = 'dead';
    } else {
      patch.status = 'failed';
      const backoffMs = Math.min(60 * 60 * 1000, Math.pow(2, attempts) * 15 * 1000);
      patch.next_retry_at = new Date(now + backoffMs).toISOString();
    }

    const { data, error } = await adminClient
      .from('capi_outbox')
      .update(patch)
      .eq('event_id', eventId)
      .select()
      .single();
    if (error) return { ok: false, status: 500, error: error.message };

    if (patch.status === 'sent' && cur.order_ref) {
      await adminClient
        .from('orders')
        .update({ purchase_capi_sent_at: nowIso, updated_at: nowIso })
        .eq('order_ref', cur.order_ref);
    }

    return { ok: true, data };
  }

  async function listCapiOutbox(limit = 100) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const { data, error } = await adminClient
      .from('capi_outbox')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(Number(limit || 100), 300)));
    if (error) return { ok: false, status: 500, error: error.message };
    return { ok: true, data: data || [] };
  }

  async function resetCapiOutboxForRetry(eventId) {
    if (!adminClient) {
      return { ok: false, status: 503, error: 'SUPABASE_SERVICE_ROLE_KEY not configured.' };
    }
    const { data: existing } = await adminClient
      .from('capi_outbox')
      .select('*')
      .eq('event_id', eventId)
      .maybeSingle();
    if (!existing) return { ok: false, status: 404, error: 'Outbox event not found.' };
    if (existing.status === 'sent') {
      return { ok: true, alreadySent: true, data: existing };
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await adminClient
      .from('capi_outbox')
      .update({
        status: 'pending',
        attempts: Math.min(Number(existing.attempts || 0), Math.max(0, Number(existing.max_attempts || 5) - 1)),
        next_retry_at: nowIso,
        updated_at: nowIso
      })
      .eq('event_id', eventId)
      .select()
      .single();
    if (error) return { ok: false, status: 500, error: error.message };
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
    listCollections,
    upsertCollection,
    listProducts,
    createProduct,
    updateProduct,
    listProductAssets,
    upsertProductAsset,
    uploadMediaToStorage,
    getCouponByCode,
    listCoupons,
    upsertCoupon,
    findOrderByIdempotencyKey,
    createOrder,
    getOrderByRef,
    listOrders,
    updateOrder,
    transitionOrder,
    listStaffUsers,
    upsertStaffUser,
    recordAuditLog,
    listAuditLogs,
    enqueueCapiOutboxEvent,
    claimDueCapiOutboxEvents,
    markCapiOutboxResult,
    listCapiOutbox,
    resetCapiOutboxForRetry
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
