-- ==============================================================================
-- Fariza's Territory — Security & Schema Hardening Migration (02)
-- Fixes SEC-02, SEC-03, DATA-01, OPS-02:
--   1. Adds staff_users RBAC table + is_staff_admin() security definer function
--   2. Adds missing orders columns (attribution, idempotency_key, customer_email,
--      customer_district, contact_channel, purchase_capi_sent_at, purchase_capi_event_id)
--   3. Removes plain admin_pin from public.store_settings
--   4. Reconciles free_delivery_threshold to 3000.00 (matching FREESHIP min_spend)
--   5. Replaces permissive RLS policies (USING (true) / public orders read) with strict
--      least-privilege policies and revokes unsafe anon/authenticated table grants
-- ==============================================================================

-- 1. STAFF RBAC TABLE
CREATE TABLE IF NOT EXISTS public.staff_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

-- 2. SECURITY DEFINER ADMIN HELPER
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.staff_users su
      WHERE su.user_id = auth.uid()
        AND su.is_active = true
        AND su.role IN ('admin', 'staff')
    );
$$;

REVOKE ALL ON FUNCTION public.is_staff_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_staff_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1
      FROM public.staff_users su
      WHERE su.user_id = auth.uid()
        AND su.is_active = true
        AND su.role = 'admin'
    );
$$;

REVOKE ALL ON FUNCTION public.is_staff_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_super_admin() TO authenticated, service_role;

-- 3. RECONCILE ORDERS COLUMNS FOR SERVER-SIDE VALIDATION, IDEMPOTENCY & ATTRIBUTION
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_district TEXT,
  ADD COLUMN IF NOT EXISTS contact_channel TEXT DEFAULT 'web_form',
  ADD COLUMN IF NOT EXISTS attribution JSONB,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS purchase_capi_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchase_capi_event_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency_key
  ON public.orders(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 4. RECONCILE PRODUCTS DEFAULTS (UNVERIFIED UNTIL SELLER SIGN-OFF)
ALTER TABLE public.products
  ALTER COLUMN price_review SET DEFAULT true,
  ALTER COLUMN stock_verified SET DEFAULT false;

-- 5. REMOVE PLAIN-TEXT ADMIN PIN & RECONCILE FREE SHIPPING THRESHOLD
ALTER TABLE public.store_settings
  DROP COLUMN IF EXISTS admin_pin;

ALTER TABLE public.store_settings
  ALTER COLUMN free_delivery_threshold SET DEFAULT 3000.00;

UPDATE public.store_settings
  SET free_delivery_threshold = 3000.00,
      updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = 'default' AND free_delivery_threshold = 5000.00;

-- 6. DROP ALL OVERLY PERMISSIVE LEGACY POLICIES
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view own order by ref" ON public.orders;
DROP POLICY IF EXISTS "Admin full access orders" ON public.orders;
DROP POLICY IF EXISTS "Admin full access collections" ON public.collections;
DROP POLICY IF EXISTS "Admin full access products" ON public.products;
DROP POLICY IF EXISTS "Admin full access product_assets" ON public.product_assets;
DROP POLICY IF EXISTS "Admin full access coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admin full access store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Public active coupons are viewable by everyone" ON public.coupons;
DROP POLICY IF EXISTS "Public store settings are viewable by everyone" ON public.store_settings;
DROP POLICY IF EXISTS "Public collections are viewable by everyone" ON public.collections;
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Public product assets are viewable by everyone" ON public.product_assets;

-- 7. EXPLICIT REVOKE / MINIMAL GRANTS
REVOKE ALL ON TABLE public.orders FROM anon, authenticated;
REVOKE ALL ON TABLE public.coupons FROM anon, authenticated;
REVOKE ALL ON TABLE public.staff_users FROM anon, authenticated;
REVOKE ALL ON TABLE public.store_settings FROM anon, authenticated;
REVOKE ALL ON TABLE public.products FROM anon, authenticated;
REVOKE ALL ON TABLE public.collections FROM anon, authenticated;
REVOKE ALL ON TABLE public.product_assets FROM anon, authenticated;

GRANT SELECT ON TABLE public.collections TO anon, authenticated;
GRANT SELECT ON TABLE public.products TO anon, authenticated;
GRANT SELECT ON TABLE public.product_assets TO anon, authenticated;
GRANT SELECT ON TABLE public.store_settings TO anon, authenticated;

-- Authenticated staff may manage catalog, settings, coupons & orders within RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coupons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_settings TO authenticated;
GRANT SELECT ON TABLE public.staff_users TO authenticated;

-- 8. STRICT LEAST-PRIVILEGE RLS POLICIES
-- Catalog & public settings (read-only for public; writes restricted to staff)
CREATE POLICY "collections_public_select" ON public.collections
  FOR SELECT USING (true);
CREATE POLICY "collections_staff_write" ON public.collections
  FOR ALL USING (public.is_staff_admin()) WITH CHECK (public.is_staff_admin());

CREATE POLICY "products_public_select" ON public.products
  FOR SELECT USING (true);
CREATE POLICY "products_staff_write" ON public.products
  FOR ALL USING (public.is_staff_admin()) WITH CHECK (public.is_staff_admin());

CREATE POLICY "product_assets_public_select" ON public.product_assets
  FOR SELECT USING (true);
CREATE POLICY "product_assets_staff_write" ON public.product_assets
  FOR ALL USING (public.is_staff_admin()) WITH CHECK (public.is_staff_admin());

CREATE POLICY "store_settings_public_select" ON public.store_settings
  FOR SELECT USING (true);
CREATE POLICY "store_settings_staff_write" ON public.store_settings
  FOR ALL USING (public.is_staff_admin()) WITH CHECK (public.is_staff_admin());

-- Coupons: server-side service_role or active staff only (prevents coupon scraping & tampering)
CREATE POLICY "coupons_staff_only" ON public.coupons
  FOR ALL USING (public.is_staff_admin()) WITH CHECK (public.is_staff_admin());

-- Orders: NO anonymous SELECT/INSERT/UPDATE/DELETE; server uses service_role, portal uses verified staff
CREATE POLICY "orders_staff_only" ON public.orders
  FOR ALL USING (public.is_staff_admin()) WITH CHECK (public.is_staff_admin());

-- Staff Users: self-read own row, or active admin full access
CREATE POLICY "staff_users_self_select" ON public.staff_users
  FOR SELECT USING (auth.uid() = user_id OR public.is_staff_admin());
CREATE POLICY "staff_users_admin_manage" ON public.staff_users
  FOR ALL USING (public.is_staff_super_admin())
  WITH CHECK (public.is_staff_super_admin());
