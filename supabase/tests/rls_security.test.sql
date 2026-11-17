-- ==============================================================================
-- Automated RLS & Security Verification Assertions for Supabase PostgreSQL
-- Can be run inside a rolled-back transaction in Supabase SQL Editor or CI pgTAP
-- ==============================================================================
BEGIN;

DO $$
DECLARE
  has_admin_pin boolean;
  orders_rls boolean;
  anon_orders_policies int;
  permissive_for_all int;
  threshold_val numeric;
BEGIN
  -- 1. Verify plain admin_pin column was dropped from store_settings
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'admin_pin'
  ) INTO has_admin_pin;
  IF has_admin_pin THEN
    RAISE EXCEPTION 'SECURITY FAIL: public.store_settings.admin_pin must not exist';
  END IF;

  -- 2. Verify orders has RLS enabled
  SELECT relrowsecurity FROM pg_class
  WHERE oid = 'public.orders'::regclass INTO orders_rls;
  IF NOT orders_rls THEN
    RAISE EXCEPTION 'SECURITY FAIL: RLS not enabled on public.orders';
  END IF;

  -- 3. Verify no policy allows unconditional SELECT or FOR ALL USING (true) on orders/coupons
  SELECT COUNT(*) INTO anon_orders_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'orders'
    AND (qual = 'true' OR with_check = 'true');
  IF anon_orders_policies > 0 THEN
    RAISE EXCEPTION 'SECURITY FAIL: permissive USING(true) / WITH CHECK(true) policy found on public.orders';
  END IF;

  SELECT COUNT(*) INTO permissive_for_all
  FROM pg_policies
  WHERE schemaname = 'public'
    AND cmd = 'ALL'
    AND (qual = 'true' OR with_check = 'true');
  IF permissive_for_all > 0 THEN
    RAISE EXCEPTION 'SECURITY FAIL: permissive FOR ALL USING(true) policy found in public schema';
  END IF;

  -- 4. Verify attribution & idempotency columns exist on public.orders
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'attribution'
  ) THEN
    RAISE EXCEPTION 'SCHEMA FAIL: public.orders.attribution missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'idempotency_key'
  ) THEN
    RAISE EXCEPTION 'SCHEMA FAIL: public.orders.idempotency_key missing';
  END IF;

  -- 5. Verify free_delivery_threshold reconciled to 3000
  SELECT free_delivery_threshold INTO threshold_val
  FROM public.store_settings WHERE id = 'default';
  IF threshold_val IS NOT NULL AND threshold_val <> 3000 THEN
    RAISE EXCEPTION 'POLICY FAIL: free_delivery_threshold expected 3000, got %', threshold_val;
  END IF;
END $$;

ROLLBACK;
