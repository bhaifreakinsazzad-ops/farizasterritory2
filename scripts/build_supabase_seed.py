import json
import re

# Read catalogData.js
with open('assets/js/catalogData.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract COLLECTIONS and PRODUCTS json
col_match = re.search(r'const COLLECTIONS = (\[[\s\S]*?\]);\s*const PRODUCTS', text)
prod_match = re.search(r'const PRODUCTS = (\[[\s\S]*?\]);\s*const PRODUCTS_BY_SKU', text)

collections = json.loads(col_match.group(1))
products = json.loads(prod_match.group(1))

sql_lines = [
    "-- ==============================================================================",
    "-- Fariza's Territory Catalog Seed Data (53 SKUs across 8 Collections)",
    "-- Generated from verified boutique catalog",
    "-- ==============================================================================",
    "",
    "-- 1. Seed Store Settings",
    "INSERT INTO public.store_settings (id, store_name, tagline, whatsapp_number, messenger_username, facebook_url, meta_pixel_id, delivery_fee_dhaka, delivery_fee_outside, promo_text)",
    "VALUES ('default', 'Fariza''s Territory', 'Elegance in Every Detail. Made in BANGLADESH', '8801700000000', 'farizasterritory143', 'https://www.facebook.com/farizasterritory143', '', 80, 150, 'Welcome to Fariza''s Territory · Fast Dhaka & Nationwide Cash-on-Delivery Delivery')",
    "ON CONFLICT (id) DO UPDATE SET",
    "  store_name = EXCLUDED.store_name,",
    "  messenger_username = EXCLUDED.messenger_username,",
    "  facebook_url = EXCLUDED.facebook_url;",
    "",
    "-- 2. Seed Collections (8 Collections: 5 Fashion + 3 Artisan Accessories)"
]

def esc_sql(val):
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"

for c in collections:
    sql_lines.append(
        f"INSERT INTO public.collections (id, name, short_name, folder, accent_color, note) "
        f"VALUES ({esc_sql(c['id'])}, {esc_sql(c['name'])}, {esc_sql(c['short'])}, {esc_sql(c['slug'])}, {esc_sql(c['acc'])}, {esc_sql(c['note'])}) "
        f"ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, short_name = EXCLUDED.short_name, accent_color = EXCLUDED.accent_color, note = EXCLUDED.note;"
    )

sql_lines.extend([
    "",
    "-- 3. Seed Products (53 SKUs: 18 Fashion + 35 Artisan Accessories)"
])

for p in products:
    sku = esc_sql(p['sku'])
    col_id = esc_sql(p['colId'])
    title = esc_sql(p['title'])
    title_bn = esc_sql(p['titleBn'])
    slug = esc_sql(p['slug'])
    price = p['priceBDT'] if p['priceBDT'] else "NULL"
    price_conf = esc_sql('high' if p['priceStatus'] == 'confirmed' else 'suggested')
    desc_bn = esc_sql(p.get('descriptionBn', ''))
    accent = esc_sql(p.get('accent', '#794722'))
    is_featured = "true" if p.get('colId') in ['01', '04', '06', '08'] else "false"
    
    # Optional details
    details = p.get('details', {})
    kameez_bn = esc_sql(details.get('kameez', ''))
    salwar_bn = esc_sql(details.get('salwar', ''))
    dupatta_bn = esc_sql(details.get('dupatta', ''))
    fabric_claim = esc_sql(details.get('fabric', details.get('material', 'Artisanal Handcraft')))
    stitching = esc_sql(details.get('stitching', 'Handcrafted Accessories' if p['superCategory'] == 'Accessories' else 'Unstitched / Semi-stitched'))

    sql_lines.append(
        f"INSERT INTO public.products (sku, collection_id, title, title_bn, slug, price_bdt, price_confidence, description_bn, kameez_bn, salwar_bn, dupatta_bn, fabric_claim, stitching, accent_color, is_featured) "
        f"VALUES ({sku}, {col_id}, {title}, {title_bn}, {slug}, {price}, {price_conf}, {desc_bn}, {kameez_bn}, {salwar_bn}, {dupatta_bn}, {fabric_claim}, {stitching}, {accent}, {is_featured}) "
        f"ON CONFLICT (sku) DO UPDATE SET title = EXCLUDED.title, title_bn = EXCLUDED.title_bn, price_bdt = EXCLUDED.price_bdt, description_bn = EXCLUDED.description_bn;"
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
            ratio = 'r11' if key in ['socialSquare', 'detailA', 'detailB'] or p['superCategory'] == 'Accessories' else ('r916' if key == 'storyReel' else 'r45')
            label = key.capitalize()
            sql_lines.append(
                f"INSERT INTO public.product_assets (product_sku, asset_key, asset_url, ratio, label) "
                f"VALUES ({sku}, {esc_sql(key)}, {esc_sql(path)}, {esc_sql(ratio)}, {esc_sql(label)}) "
                f"ON CONFLICT (product_sku, asset_key) DO UPDATE SET asset_url = EXCLUDED.asset_url;"
            )

sql_lines.extend([
    "",
    "-- 5. Seed Verified Coupons",
    "INSERT INTO public.coupons (code, discount_type, discount_value, min_spend, max_discount, is_active, notes)",
    "VALUES ('FIRST25', 'percentage', 25.00, 2000.00, 500.00, true, 'First order advertised discount up to 25% (max ৳500)')",
    "ON CONFLICT (code) DO NOTHING;",
    "",
    "INSERT INTO public.coupons (code, discount_type, discount_value, min_spend, max_discount, is_active, notes)",
    "VALUES ('FREESHIP', 'fixed', 80.00, 1500.00, 150.00, true, 'Free delivery coupon for orders over ৳1500')",
    "ON CONFLICT (code) DO NOTHING;",
    "",
    "INSERT INTO public.coupons (code, discount_type, discount_value, min_spend, max_discount, is_active, notes)",
    "VALUES ('FARIZA200', 'fixed', 200.00, 3000.00, 200.00, true, 'Festive flat ৳200 discount for multi-item orders')",
    "ON CONFLICT (code) DO NOTHING;"
])

with open('supabase/seed.sql', 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines) + '\n')

print(f"Generated supabase/seed.sql with {len(collections)} collections and {len(products)} products!")
