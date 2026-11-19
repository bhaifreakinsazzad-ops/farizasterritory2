-- ==============================================================================
-- Fariza's Territory — Security & Schema Hardening Migration (02)
-- Fixes DB-01, DB-02, DB-03, SEC-02, SEC-03, DATA-01, OPS-02:
--   1. Adds staff_users RBAC table (including optional full_name) + non-exposed
--      private.is_staff_member() & private.is_super_admin() SECURITY DEFINER helpers
--   2. Adds missing orders columns (attribution, idempotency_key, customer_email,
--      customer_district, contact_channel, purchase_capi_sent_at, purchase_capi_event_id)
--   3. Removes plain admin_pin from public.store_settings
--   4. Reconciles free_delivery_threshold to 3000.00 (matching FREESHIP min_spend)
--   5. Replaces permissive RLS policies (USING (true) / public orders read) and
--      eliminates self-referencing RLS recursion on public.staff_users
-- ==============================================================================

-- 0. NON-EXPOSED PRIVATE SCHEMA FOR SECURITY DEFINER HELPERS
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 1. STAFF RBAC TABLE (includes full_name to match onboarding docs)
CREATE TABLE IF NOT EXISTS public.staff_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS full_name TEXT;

ALTER TABLE public.staff_users ENABLE ROW LEVEL SECURITY;

-- 2. NON-RECURSIVE SECURITY DEFINER HELPERS IN NON-EXPOSED SCHEMA
-- Owned by migration executor (table owner / postgres), so querying public.staff_users
-- inside SECURITY DEFINER does not re-enter RLS and avoids infinite recursion.
CREATE OR REPLACE FUNCTION private.is_staff_member()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
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

CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
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

REVOKE ALL ON FUNCTION private.is_staff_member() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_staff_member() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated, service_role;

-- Backward-compatible public wrapper delegating to private.is_staff_member()
CREATE OR REPLACE FUNCTION public.is_staff_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = private, public, pg_temp
AS $$
  SELECT private.is_staff_member();
$$;

REVOKE ALL ON FUNCTION public.is_staff_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff_admin() TO authenticated, service_role;

-- 3. RECONCILE ORDERS COLUMNS FOR SERVER-SIDE VALIDATION, IDEMPOTENCY & ATTRIBUTION
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_district TEXT,
  ADD COLUMN IF NOT EXISTS contact_channel TEXT DEFAULT 'WhatsApp',
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
  ALTER COLUMN stock_verified SET DEFAULT false,
  ALTER COLUMN stock_count SET DEFAULT 0;

-- 5. REMOVE PLAIN-TEXT ADMIN PIN & RECONCILE FREE SHIPPING THRESHOLD
ALTER TABLE public.store_settings
  DROP COLUMN IF EXISTS admin_pin;

ALTER TABLE public.store_settings
  ALTER COLUMN free_delivery_threshold SET DEFAULT 3000.00;

UPDATE public.store_settings
  SET free_delivery_threshold = 3000.00,
      updated_at = TIMEZONE('utc'::text, NOW())
  WHERE id = 'default' AND free_delivery_threshold = 5000.00;

-- 6. DROP ALL OVERLY PERMISSIVE LEGACY POLICIES & PREVIOUS POLICIES
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
DROP POLICY IF EXISTS "collections_public_select" ON public.collections;
DROP POLICY IF EXISTS "collections_staff_write" ON public.collections;
DROP POLICY IF EXISTS "products_public_select" ON public.products;
DROP POLICY IF EXISTS "products_staff_write" ON public.products;
DROP POLICY IF EXISTS "product_assets_public_select" ON public.product_assets;
DROP POLICY IF EXISTS "product_assets_staff_write" ON public.product_assets;
DROP POLICY IF EXISTS "store_settings_public_select" ON public.store_settings;
DROP POLICY IF EXISTS "store_settings_staff_write" ON public.store_settings;
DROP POLICY IF EXISTS "coupons_staff_only" ON public.coupons;
DROP POLICY IF EXISTS "orders_staff_only" ON public.orders;
DROP POLICY IF EXISTS "staff_users_self_select" ON public.staff_users;
DROP POLICY IF EXISTS "staff_users_admin_manage" ON public.staff_users;

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

-- Authenticated staff/admins may operate within strict RLS boundaries
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.coupons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff_users TO authenticated;

-- 8. STRICT LEAST-PRIVILEGE RLS POLICIES
-- Catalog & public settings (read-only for public; writes restricted to active owner/admin)
CREATE POLICY "collections_public_select" ON public.collections
  FOR SELECT USING (true);
CREATE POLICY "collections_staff_write" ON public.collections
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

CREATE POLICY "products_public_select" ON public.products
  FOR SELECT USING (true);
CREATE POLICY "products_staff_write" ON public.products
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

CREATE POLICY "product_assets_public_select" ON public.product_assets
  FOR SELECT USING (true);
CREATE POLICY "product_assets_staff_write" ON public.product_assets
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

CREATE POLICY "store_settings_public_select" ON public.store_settings
  FOR SELECT USING (true);
CREATE POLICY "store_settings_staff_write" ON public.store_settings
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

-- Coupons: server-side service_role or active super-admin only
CREATE POLICY "coupons_staff_only" ON public.coupons
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

-- Orders: NO anonymous SELECT/INSERT/UPDATE/DELETE; active staff/admin read & fulfill
CREATE POLICY "orders_staff_only" ON public.orders
  FOR ALL USING (private.is_staff_member()) WITH CHECK (private.is_staff_member());

-- Staff Users: active self-read own row or super-admin read/write via non-recursive SECURITY DEFINER
CREATE POLICY "staff_users_self_select" ON public.staff_users
  FOR SELECT USING (auth.uid() = user_id OR private.is_super_admin());
CREATE POLICY "staff_users_admin_manage" ON public.staff_users
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());
