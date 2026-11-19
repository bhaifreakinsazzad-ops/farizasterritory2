/**
 * Generates supabase/seed.sql from canonical assets/js/catalogData.js
 * Safe for production re-runs: never overwrites signed seller approvals, prices, or stock.
 */
const fs = require('fs');
const path = require('path');

const catalogCode = fs.readFileSync(path.join(__dirname, '../assets/js/catalogData.js'), 'utf8');
const sandbox = {};
new Function('window', catalogCode)(sandbox);
const { COLLECTIONS, PRODUCTS } = sandbox.FT_CATALOG;

function escSql(val) {
  if (val === undefined || val === null) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

const sqlLines = [
  '-- ==============================================================================',
  "-- Fariza's Territory Catalog Seed Data (53 SKUs across 8 Collections)",
  '-- Generated from canonical assets/js/catalogData.js',
  '-- Safe for production re-runs: preserves live price_bdt, stock_count, stock_verified,',
  '-- price_review, approved_by, and approved_at once seller-signed.',
  '-- ==============================================================================',
  '',
  '-- 1. Seed Store Settings (no placeholder WhatsApp number; threshold = 3000)',
  'INSERT INTO public.store_settings (id, store_name, tagline, whatsapp_number, messenger_username, facebook_url, meta_pixel_id, delivery_fee_dhaka, delivery_fee_outside, free_delivery_threshold, promo_text)',
  "VALUES ('default', 'Fariza''s Territory', 'Elegance in Every Detail. Made in BANGLADESH', '', 'farizasterritory143', 'https://www.facebook.com/farizasterritory143', '1657670575734647', 80, 150, 3000, 'First-order 25% OFF with code FIRST25 · Free delivery over ৳3,000 (FREESHIP)')",
  'ON CONFLICT (id) DO NOTHING;',
  '',
  '-- 2. Seed Collections (8 Collections: 5 Fashion + 3 Artisan Accessories)'
];

for (const c of COLLECTIONS) {
  sqlLines.push(
    `INSERT INTO public.collections (id, name, short_name, folder, accent_color, note, pillar, slug, name_bn) ` +
      `VALUES (${escSql(c.id)}, ${escSql(c.name)}, ${escSql(c.short)}, ${escSql(c.slug)}, ${escSql(c.acc)}, ${escSql(c.note)}, ${escSql(c.pillar || 'Fashion')}, ${escSql(c.slug)}, ${escSql(c.nameBn || '')}) ` +
      `ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, accent_color = EXCLUDED.accent_color, note = EXCLUDED.note, pillar = EXCLUDED.pillar, slug = EXCLUDED.slug, name_bn = EXCLUDED.name_bn;`
  );
}

sqlLines.push(
  '',
  '-- 3. Seed Products (53 SKUs: 18 Fashion + 35 Artisan Accessories)',
  '-- Defaults to unverified (price_review=true, stock_verified=false, stock_count=0) until seller sign-off.'
);

for (const p of PRODUCTS) {
  const details = p.details || {};
  const price = p.priceBDT ? Number(p.priceBDT) : 'NULL';
  const priceConf = escSql(p.priceStatus === 'confirmed' ? 'high' : 'suggested');
  const fabricClaim = escSql(details.fabric || details.material || 'Artisanal Handcraft');
  const stitching = escSql(
    details.stitching || (p.superCategory === 'Accessories' ? 'Handcrafted Accessories' : 'Unstitched / Semi-stitched')
  );
  const isFeatured = ['01', '04', '06', '08'].includes(p.colId) ? 'true' : 'false';

  sqlLines.push(
    `INSERT INTO public.products (sku, collection_id, super_category, title, title_bn, slug, price_bdt, price_review, price_confidence, description_bn, description_en, selling_unit, selling_unit_bn, caution_en, caution_bn, kameez_bn, salwar_bn, dupatta_bn, fabric_claim, stitching, stock_count, stock_verified, accent_color, is_featured) ` +
      `VALUES (${escSql(p.sku)}, ${escSql(p.colId)}, ${escSql(p.superCategory || 'Fashion')}, ${escSql(p.title)}, ${escSql(p.titleBn || '')}, ${escSql(p.slug)}, ${price}, true, ${priceConf}, ${escSql(p.descriptionBn || '')}, ${escSql(p.descriptionEn || '')}, ${escSql(p.unit || '')}, ${escSql(p.unitBn || '')}, ${escSql(p.cautionEn || '')}, ${escSql(p.cautionBn || '')}, ${escSql(details.kameez || '')}, ${escSql(details.salwar || '')}, ${escSql(details.dupatta || '')}, ${fabricClaim}, ${stitching}, 0, false, ${escSql(p.accent || '#794722')}, ${isFeatured}) ` +
      `ON CONFLICT (sku) DO UPDATE SET title = EXCLUDED.title, title_bn = EXCLUDED.title_bn, description_bn = EXCLUDED.description_bn, description_en = EXCLUDED.description_en, selling_unit = EXCLUDED.selling_unit, selling_unit_bn = EXCLUDED.selling_unit_bn, caution_en = EXCLUDED.caution_en, caution_bn = EXCLUDED.caution_bn, super_category = EXCLUDED.super_category;`
  );
}

sqlLines.push('', '-- 4. Seed Product Assets for All 53 SKUs');
for (const p of PRODUCTS) {
  const assets = p.assets || {};
  for (const [key, assetPath] of Object.entries(assets)) {
    if (!assetPath) continue;
    const ratio =
      ['socialSquare', 'detailA', 'detailB'].includes(key) || p.superCategory === 'Accessories'
        ? 'r11'
        : key === 'storyReel'
        ? 'r916'
        : 'r45';
    const label = key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
    sqlLines.push(
      `INSERT INTO public.product_assets (product_sku, asset_key, asset_url, ratio, label) ` +
        `VALUES (${escSql(p.sku)}, ${escSql(key)}, ${escSql(assetPath)}, ${escSql(ratio)}, ${escSql(label)}) ` +
        `ON CONFLICT (product_sku, asset_key) DO UPDATE SET asset_url = EXCLUDED.asset_url;`
    );
  }
}

sqlLines.push(
  '',
  '-- 5. Seed Canonical Coupons',
  "INSERT INTO public.coupons (code, discount_type, discount_value, min_spend, max_discount, is_active, notes)",
  "VALUES ('FIRST25', 'percentage', 25.00, 2000.00, 500.00, true, 'First-order 25% discount (Max ৳500)')",
  'ON CONFLICT (code) DO UPDATE SET discount_type = EXCLUDED.discount_type, discount_value = EXCLUDED.discount_value, min_spend = EXCLUDED.min_spend, max_discount = EXCLUDED.max_discount, notes = EXCLUDED.notes;',
  '',
  "INSERT INTO public.coupons (code, discount_type, discount_value, min_spend, max_discount, is_active, notes)",
  "VALUES ('FREESHIP', 'free_shipping', 150.00, 3000.00, 150.00, true, 'Free delivery on orders above ৳3,000')",
  'ON CONFLICT (code) DO UPDATE SET discount_type = EXCLUDED.discount_type, discount_value = EXCLUDED.discount_value, min_spend = EXCLUDED.min_spend, max_discount = EXCLUDED.max_discount, notes = EXCLUDED.notes;',
  '',
  "INSERT INTO public.coupons (code, discount_type, discount_value, min_spend, max_discount, is_active, notes)",
  "VALUES ('FARIZA200', 'fixed', 200.00, 2000.00, 200.00, true, '৳200 flat boutique welcome voucher')",
  'ON CONFLICT (code) DO UPDATE SET discount_type = EXCLUDED.discount_type, discount_value = EXCLUDED.discount_value, min_spend = EXCLUDED.min_spend, max_discount = EXCLUDED.max_discount, notes = EXCLUDED.notes;'
);

fs.writeFileSync(path.join(__dirname, '../supabase/seed.sql'), sqlLines.join('\n') + '\n', 'utf8');
console.log(`Generated supabase/seed.sql with ${COLLECTIONS.length} collections and ${PRODUCTS.length} products.`);
