-- ==============================================================================
-- Rollback Script for 02_security_hardening.sql
-- Restores schema structure prior to migration 02 if emergency rollback is required.
-- NOTE: Does NOT re-open public SELECT on public.orders to avoid re-exposing PII.
-- ==============================================================================

DROP POLICY IF EXISTS "staff_users_admin_manage" ON public.staff_users;
DROP POLICY IF EXISTS "staff_users_self_select" ON public.staff_users;
DROP POLICY IF EXISTS "orders_staff_only" ON public.orders;
DROP POLICY IF EXISTS "coupons_staff_only" ON public.coupons;
DROP POLICY IF EXISTS "store_settings_staff_write" ON public.store_settings;
DROP POLICY IF EXISTS "store_settings_public_select" ON public.store_settings;
DROP POLICY IF EXISTS "product_assets_staff_write" ON public.product_assets;
DROP POLICY IF EXISTS "product_assets_public_select" ON public.product_assets;
DROP POLICY IF EXISTS "products_staff_write" ON public.products;
DROP POLICY IF EXISTS "products_public_select" ON public.products;
DROP POLICY IF EXISTS "collections_staff_write" ON public.collections;
DROP POLICY IF EXISTS "collections_public_select" ON public.collections;

DROP INDEX IF EXISTS idx_orders_idempotency_key;
DROP FUNCTION IF EXISTS public.is_staff_super_admin();
DROP FUNCTION IF EXISTS public.is_staff_admin();
DROP TABLE IF EXISTS public.staff_users;

ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS admin_pin TEXT DEFAULT '1430';
