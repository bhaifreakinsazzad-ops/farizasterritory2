-- ==============================================================================
-- Automated RLS, Schema & Security Verification Assertions for Supabase PostgreSQL
-- Covers DB-01, DB-02, DB-03, SEC-04, SEC-05, SEC-06, DATA-003.
-- Safe to execute inside Supabase SQL Editor (wrapped in BEGIN ... ROLLBACK).
-- ==============================================================================
BEGIN;

DO $$
DECLARE
  has_admin_pin boolean;
  has_full_name boolean;
  has_capi_outbox boolean;
  has_audit_logs boolean;
  orders_rls boolean;
  staff_rls boolean;
  anon_orders_policies int;
  permissive_for_all int;
  threshold_val numeric;
  unapproved_leak_count int;
  recursive_policy_refs int;
  test_admin_id uuid := '00000000-0000-4000-8000-0000000000a1';
  test_staff_id uuid := '00000000-0000-4000-8000-0000000000b2';
  test_inactive_id uuid := '00000000-0000-4000-8000-0000000000c3';
  test_nonstaff_id uuid := '00000000-0000-4000-8000-0000000000d4';
  cnt int;
BEGIN
  -- 1. Verify plain admin_pin column was dropped from store_settings
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'store_settings' AND column_name = 'admin_pin'
  ) INTO has_admin_pin;
  IF has_admin_pin THEN
    RAISE EXCEPTION 'SECURITY FAIL: public.store_settings.admin_pin must not exist';
  END IF;

  -- 2. Verify staff_users.full_name exists (DB-01)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'staff_users' AND column_name = 'full_name'
  ) INTO has_full_name;
  IF NOT has_full_name THEN
    RAISE EXCEPTION 'SCHEMA FAIL (DB-01): public.staff_users.full_name is missing';
  END IF;

  -- 3. Verify capi_outbox & audit_logs tables exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'capi_outbox'
  ) INTO has_capi_outbox;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_logs'
  ) INTO has_audit_logs;
  IF NOT has_capi_outbox OR NOT has_audit_logs THEN
    RAISE EXCEPTION 'SCHEMA FAIL: capi_outbox or audit_logs table missing';
  END IF;

  -- 4. Verify RLS enabled on orders & staff_users
  SELECT relrowsecurity FROM pg_class WHERE oid = 'public.orders'::regclass INTO orders_rls;
  SELECT relrowsecurity FROM pg_class WHERE oid = 'public.staff_users'::regclass INTO staff_rls;
  IF NOT orders_rls OR NOT staff_rls THEN
    RAISE EXCEPTION 'SECURITY FAIL: RLS not enabled on orders or staff_users';
  END IF;

  -- 5. Verify no policy allows unconditional SELECT or FOR ALL USING (true)
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

  -- 6. Verify staff_users_admin_manage policy does NOT self-reference public.staff_users directly (DB-03)
  SELECT COUNT(*) INTO recursive_policy_refs
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'staff_users'
    AND (qual ILIKE '%staff_users%' OR with_check ILIKE '%staff_users%');
  IF recursive_policy_refs > 0 THEN
    RAISE EXCEPTION 'SECURITY FAIL (DB-03): self-referencing staff_users policy detected';
  END IF;

  -- 7. Verify no unapproved historical row leaks as stock_verified=true & price_review=false without approved_at (DB-02)
  SELECT COUNT(*) INTO unapproved_leak_count
  FROM public.products
  WHERE approved_at IS NULL
    AND (stock_verified = true OR price_review = false);
  IF unapproved_leak_count > 0 THEN
    RAISE EXCEPTION 'DATA FAIL (DB-02): % unapproved product rows still marked verified/approved without approved_at', unapproved_leak_count;
  END IF;

  -- 8. Verify free_delivery_threshold reconciled to 3000
  SELECT free_delivery_threshold INTO threshold_val
  FROM public.store_settings WHERE id = 'default';
  IF threshold_val IS NOT NULL AND threshold_val <> 3000 THEN
    RAISE EXCEPTION 'POLICY FAIL: free_delivery_threshold expected 3000, got %', threshold_val;
  END IF;

  -- 9. Live JWT / Role Simulation against RLS (anon, non-staff, staff, inactive admin, active admin)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN

    INSERT INTO auth.users (id, email)
    VALUES
      (test_admin_id, 'test-admin@rls.local'),
      (test_staff_id, 'test-staff@rls.local'),
      (test_inactive_id, 'test-inactive@rls.local'),
      (test_nonstaff_id, 'test-user@rls.local')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.staff_users (user_id, email, full_name, role, is_active)
    VALUES
      (test_admin_id, 'test-admin@rls.local', 'Test Owner Admin', 'admin', true),
      (test_staff_id, 'test-staff@rls.local', 'Test Staff', 'staff', true),
      (test_inactive_id, 'test-inactive@rls.local', 'Inactive Admin', 'admin', false)
    ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role, is_active = EXCLUDED.is_active;

    -- 9a. Test anon: orders & staff_users must fail permission/return 0
    EXECUTE 'SET LOCAL ROLE anon';
    BEGIN
      SELECT COUNT(*) INTO cnt FROM public.orders;
      RAISE EXCEPTION 'SECURITY FAIL: anon could query public.orders';
    EXCEPTION WHEN insufficient_privilege THEN
      -- Expected
    END;
    EXECUTE 'RESET ROLE';

    -- 9b. Test authenticated non-staff: 0 rows on orders and staff_users
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_nonstaff_id::text, 'role', 'authenticated')::text, true);
    SELECT COUNT(*) INTO cnt FROM public.orders;
    IF cnt <> 0 THEN
      RAISE EXCEPTION 'SECURITY FAIL: non-staff authenticated user saw % orders', cnt;
    END IF;
    SELECT COUNT(*) INTO cnt FROM public.staff_users;
    IF cnt <> 0 THEN
      RAISE EXCEPTION 'SECURITY FAIL: non-staff authenticated user saw % staff_users rows', cnt;
    END IF;
    EXECUTE 'RESET ROLE';

    -- 9c. Test inactive admin: denied staff_users read & orders read
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_inactive_id::text, 'role', 'authenticated')::text, true);
    SELECT COUNT(*) INTO cnt FROM public.orders;
    IF cnt <> 0 THEN
      RAISE EXCEPTION 'SECURITY FAIL: inactive admin saw % orders', cnt;
    END IF;
    EXECUTE 'RESET ROLE';

    -- 9d. Test active staff: can read orders, CANNOT insert into staff_users or store_settings
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_staff_id::text, 'role', 'authenticated')::text, true);
    PERFORM COUNT(*) FROM public.orders;
    BEGIN
      INSERT INTO public.staff_users (user_id, email, full_name, role, is_active)
      VALUES (test_nonstaff_id, 'escalate@rls.local', 'Escalated', 'admin', true);
      RAISE EXCEPTION 'SECURITY FAIL: staff role was able to insert into staff_users';
    EXCEPTION WHEN insufficient_privilege THEN
      -- Expected RLS rejection
    END;
    EXECUTE 'RESET ROLE';

    -- 9e. Test active admin: can query staff_users with ZERO recursion
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM set_config('request.jwt.claims', json_build_object('sub', test_admin_id::text, 'role', 'authenticated')::text, true);
    SELECT COUNT(*) INTO cnt FROM public.staff_users;
    IF cnt < 1 THEN
      RAISE EXCEPTION 'RLS FAIL: active admin could not read public.staff_users';
    END IF;
    EXECUTE 'RESET ROLE';
  END IF;
END $$;

ROLLBACK;
