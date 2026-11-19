import json
import re

with open('assets/js/catalogData.js', 'r', encoding='utf-8') as f:
    text = f.read()

col_match = re.search(r'const COLLECTIONS\s*=\s*(\[[\s\S]*?\]);\s*const PRODUCTS', text)
prod_match = re.search(r'const PRODUCTS\s*=\s*(\[[\s\S]*?\]);\s*const PRODUCTS_BY_SKU', text)

collections = json.loads(col_match.group(1))
products = json.loads(prod_match.group(1))

def esc_sql(val):
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"

sql_lines = [
    "-- ==============================================================================",
    "-- Fariza's Territory Catalog Seed Data (53 SKUs across 8 Collections)",
    "-- Generated from canonical catalogData.js",
    "-- Safe for production re-runs: preserves live price_bdt, stock_count, stock_verified,",
    "-- price_review, approved_by, and approved_at once seller-signed.",
    "-- ==============================================================================",
    "",
    "-- 1. Seed Store Settings (no placeholder WhatsApp number; threshold = 3000)",
    "INSERT INTO public.store_settings (id, store_name, tagline, whatsapp_number, messenger_username, facebook_url, meta_pixel_id, delivery_fee_dhaka, delivery_fee_outside, free_delivery_threshold, promo_text)",
    "VALUES ('default', 'Fariza''s Territory', 'Elegance in Every Detail. Made in BANGLADESH', '', 'farizasterritory143', 'https://www.facebook.com/farizasterritory143', '1657670575734647', 80, 150, 3000, 'First-order 25% OFF with code FIRST25 · Free delivery over ৳3,000 (FREESHIP)')",
    "ON CONFLICT (id) DO NOTHING;",
    "",
    "-- 2. Seed Collections (8 Collections: 5 Fashion + 3 Artisan Accessories)"
]

for c in collections:
    sql_lines.append(
        f"INSERT INTO public.collections (id, name, short_name, folder, accent_color, note, pillar, slug, name_bn) "
        f"VALUES ({esc_sql(c['id'])}, {esc_sql(c['name'])}, {esc_sql(c['short'])}, {esc_sql(c['slug'])}, {esc_sql(c['acc'])}, {esc_sql(c['note'])}, {esc_sql(c.get('pillar', 'Fashion'))}, {esc_sql(c['slug'])}, {esc_sql(c.get('nameBn', ''))}) "
        f"ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, accent_color = EXCLUDED.accent_color, note = EXCLUDED.note, pillar = EXCLUDED.pillar, slug = EXCLUDED.slug, name_bn = EXCLUDED.name_bn;"
    )

sql_lines.extend([
    "",
    "-- 3. Seed Products (53 SKUs: 18 Fashion + 35 Artisan Accessories)",
    "-- Defaults to unverified (price_review=true, stock_verified=false, stock_count=0) until seller sign-off."
])

for p in products:
    sku = esc_sql(p['sku'])
    col_id = esc_sql(p['colId'])
    super_cat = esc_sql(p.get('superCategory', 'Fashion'))
    title = esc_sql(p['title'])
    title_bn = esc_sql(p.get('titleBn', ''))
    slug = esc_sql(p['slug'])
    price = p['priceBDT'] if p.get('priceBDT') else "NULL"
    price_conf = esc_sql('high' if p.get('priceStatus') == 'confirmed' else 'suggested')
    desc_bn = esc_sql(p.get('descriptionBn', ''))
    desc_en = esc_sql(p.get('descriptionEn', ''))
    unit = esc_sql(p.get('unit', ''))
    unit_bn = esc_sql(p.get('unitBn', ''))
    caution_en = esc_sql(p.get('cautionEn', ''))
    caution_bn = esc_sql(p.get('cautionBn', ''))
    accent = esc_sql(p.get('accent', '#794722'))
    is_featured = "true" if p.get('colId') in ['01', '04', '06', '08'] else "false"

    details = p.get('details', {})
    kameez_bn = esc_sql(details.get('kameez', ''))
    salwar_bn = esc_sql(details.get('salwar', ''))
    dupatta_bn = esc_sql(details.get('dupatta', ''))
    fabric_claim = esc_sql(details.get('fabric', details.get('material', 'Artisanal Handcraft')))
    stitching = esc_sql(details.get('stitching', 'Handcrafted Accessories' if p.get('superCategory') == 'Accessories' else 'Unstitched / Semi-stitched'))

    sql_lines.append(
        f"INSERT INTO public.products (sku, collection_id, super_category, title, title_bn, slug, price_bdt, price_review, price_confidence, description_bn, description_en, selling_unit, selling_unit_bn, caution_en, caution_bn, kameez_bn, salwar_bn, dupatta_bn, fabric_claim, stitching, stock_count, stock_verified, accent_color, is_featured) "
        f"VALUES ({sku}, {col_id}, {super_cat}, {title}, {title_bn}, {slug}, {price}, true, {price_conf}, {desc_bn}, {desc_en}, {unit}, {unit_bn}, {caution_en}, {caution_bn}, {kameez_bn}, {salwar_bn}, {dupatta_bn}, {fabric_claim}, {stitching}, 0, false, {accent}, {is_featured}) "
        f"ON CONFLICT (sku) DO UPDATE SET title = EXCLUDED.title, title_bn = EXCLUDED.title_bn, description_bn = EXCLUDED.description_bn, description_en = EXCLUDED.description_en, selling_unit = EXCLUDED.selling_unit, selling_unit_bn = EXCLUDED.selling_unit_bn, caution_en = EXCLUDED.caution_en, caution_bn = EXCLUDED.caution_bn, super_category = EXCLUDED.super_category;"
    )

sql_lines.extend([
    "",
    "-- 4. Seed Product Assets for All 53 SKUs"
])

for p in products:
    sku = esc_sql(p['sku'])
    assets = p.get('assets', {})
    for key, path in assets.items():
        if path:
            ratio = 'r11' if key in ['socialSquare', 'detailA', 'detailB'] or p.get('superCategory') == 'Accessories' else ('r916' if key == 'storyReel' else 'r45')
            label = key.capitalize()
            sql_lines.append(
                f"INSERT INTO public.product_assets (product_sku, asset_key, asset_url, ratio, label) "
                f"VALUES ({sku}, {esc_sql(key)}, {esc_sql(path)}, {esc_sql(ratio)}, {esc_sql(label)}) "
                f"ON CONFLICT (product_sku, asset_key) DO UPDATE SET asset_url = EXCLUDED.asset_url;"
            )

sql_lines.extend([
    "",
    "-- 5. Seed Canonical Coupons",
    "INSERT INTO public.coupons (code, discount_type, discount_value, min_spend, max_discount, is_active, notes)",
    "VALUES ('FIRST25', 'percentage', 25.00, 2000.00, 500.00, true, 'First-order 25% discount (Max ৳500)')",
    "ON CONFLICT (code) DO UPDATE SET discount_type = EXCLUDED.discount_type, discount_value = EXCLUDED.discount_value, min_spend = EXCLUDED.min_spend, max_discount = EXCLUDED.max_discount, notes = EXCLUDED.notes;",
    "",
    "INSERT INTO public.coupons (code, discount_type, discount_value, min_spend, max_discount, is_active, notes)",
    "VALUES ('FREESHIP', 'free_shipping', 150.00, 3000.00, 150.00, true, 'Free delivery on orders above ৳3,000')",
    "ON CONFLICT (code) DO UPDATE SET discount_type = EXCLUDED.discount_type, discount_value = EXCLUDED.discount_value, min_spend = EXCLUDED.min_spend, max_discount = EXCLUDED.max_discount, notes = EXCLUDED.notes;",
    "",
    "INSERT INTO public.coupons (code, discount_type, discount_value, min_spend, max_discount, is_active, notes)",
    "VALUES ('FARIZA200', 'fixed', 200.00, 2000.00, 200.00, true, '৳200 flat boutique welcome voucher')",
    "ON CONFLICT (code) DO UPDATE SET discount_type = EXCLUDED.discount_type, discount_value = EXCLUDED.discount_value, min_spend = EXCLUDED.min_spend, max_discount = EXCLUDED.max_discount, notes = EXCLUDED.notes;"
])

with open('supabase/seed.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines) + '\n')

print(f"Generated supabase/seed.sql with {len(collections)} collections and {len(products)} products!")
