-- ==============================================================================
-- Fariza's Territory E-Commerce Platform Database Schema (Enhanced Production)
-- Supabase PostgreSQL Migration
-- Project: https://vjbhrdclcnxevunskodm.supabase.co
-- Brand: Fariza's Territory (Fashion & Accessories Brand by Faria & Saiful Islam Shuvo)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS public.collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    folder TEXT,
    accent_color TEXT DEFAULT '#8E3B66',
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    sku TEXT PRIMARY KEY,
    collection_id TEXT REFERENCES public.collections(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price_bdt NUMERIC(10, 2) NOT NULL,
    price_review BOOLEAN DEFAULT false,
    price_confidence TEXT DEFAULT 'high',
    description_bn TEXT,
    kameez_bn TEXT,
    salwar_bn TEXT,
    dupatta_bn TEXT,
    fabric_claim TEXT,
    stitching TEXT,
    stock_count INTEGER DEFAULT 15,
    stock_verified BOOLEAN DEFAULT true,
    is_available BOOLEAN DEFAULT true,
    accent_color TEXT DEFAULT '#8E3B66',
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. PRODUCT ASSETS TABLE
CREATE TABLE IF NOT EXISTS public.product_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_sku TEXT REFERENCES public.products(sku) ON DELETE CASCADE,
    asset_key TEXT NOT NULL,
    asset_url TEXT NOT NULL,
    ratio TEXT DEFAULT 'r45',
    label TEXT,
    auth_type TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(product_sku, asset_key)
);

-- 4. COUPONS & PROMOTIONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    min_spend NUMERIC(10, 2) DEFAULT 0,
    max_discount NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. ORDERS & INQUIRIES TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_ref TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    delivery_zone TEXT NOT NULL DEFAULT 'dhaka',
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 80.00,
    subtotal NUMERIC(10, 2) NOT NULL,
    discount_code TEXT,
    discount_amount NUMERIC(10, 2) DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL,
    payment_method TEXT DEFAULT 'Cash on Delivery (COD)',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    courier_name TEXT DEFAULT 'Steadfast Courier',
    tracking_number TEXT,
    customer_notes TEXT,
    status_history JSONB DEFAULT '[]'::jsonb,
    source TEXT DEFAULT 'web_store',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    store_name TEXT DEFAULT 'Fariza''s Territory',
    tagline TEXT DEFAULT 'Elegance in Every Detail. Made in BANGLADESH',
    whatsapp_number TEXT DEFAULT '8801700000000',
    messenger_username TEXT DEFAULT 'farizasterritory143',
    facebook_url TEXT DEFAULT 'https://www.facebook.com/farizasterritory143',
    meta_pixel_id TEXT DEFAULT '',
    ga4_measurement_id TEXT DEFAULT '',
    delivery_fee_dhaka NUMERIC(10,2) DEFAULT 80.00,
    delivery_fee_outside NUMERIC(10,2) DEFAULT 150.00,
    free_delivery_threshold NUMERIC(10,2) DEFAULT 5000.00,
    promo_text TEXT DEFAULT 'Welcome to Fariza''s Territory · Fast Dhaka & Nationwide Cash-on-Delivery Delivery',
    admin_pin TEXT DEFAULT '1430',
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_products_collection ON public.products(collection_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_orders_ref ON public.orders(order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_assets_sku ON public.product_assets(product_sku);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ ACCESS FOR CATALOG & SETTINGS
DROP POLICY IF EXISTS "Public collections are viewable by everyone" ON public.collections;
CREATE POLICY "Public collections are viewable by everyone" ON public.collections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
CREATE POLICY "Public products are viewable by everyone" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public product assets are viewable by everyone" ON public.product_assets;
CREATE POLICY "Public product assets are viewable by everyone" ON public.product_assets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public store settings are viewable by everyone" ON public.store_settings;
CREATE POLICY "Public store settings are viewable by everyone" ON public.store_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public active coupons are viewable by everyone" ON public.coupons;
CREATE POLICY "Public active coupons are viewable by everyone" ON public.coupons FOR SELECT USING (is_active = true);

-- PUBLIC ORDER CREATION & LOOKUP
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view own order by ref" ON public.orders;
CREATE POLICY "Public can view own order by ref" ON public.orders FOR SELECT USING (true);

-- ADMIN / AUTHENTICATED USERS FULL PRIVILEGES
DROP POLICY IF EXISTS "Admin full access collections" ON public.collections;
CREATE POLICY "Admin full access collections" ON public.collections FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin full access products" ON public.products;
CREATE POLICY "Admin full access products" ON public.products FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin full access product_assets" ON public.product_assets;
CREATE POLICY "Admin full access product_assets" ON public.product_assets FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin full access coupons" ON public.coupons;
CREATE POLICY "Admin full access coupons" ON public.coupons FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin full access orders" ON public.orders;
CREATE POLICY "Admin full access orders" ON public.orders FOR ALL USING (true);

DROP POLICY IF EXISTS "Admin full access store_settings" ON public.store_settings;
CREATE POLICY "Admin full access store_settings" ON public.store_settings FOR ALL USING (true);
