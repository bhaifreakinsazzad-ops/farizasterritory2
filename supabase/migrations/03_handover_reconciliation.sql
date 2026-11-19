-- ==============================================================================
-- Fariza's Territory — Handover Readiness Reconciliation Migration (03)
-- Idempotent & additive migration closing all P0/P1 database gaps:
--   DB-01: Adds full_name to public.staff_users
--   DB-02: Reconciles pre-existing unapproved products (approved_at IS NULL)
--          back to price_review = true, stock_verified = false, stock_count = 0
--   DB-03: Replaces self-referencing staff_users_admin_manage policy with
--          non-exposed private.is_staff_member() / private.is_super_admin()
--   SEC-01: Adds public.audit_logs for actor + before/after change tracking
--   ADS-02: Adds public.capi_outbox + SKIP LOCKED claim RPC for durable CAPI retry
--   INV-01: Adds reserved_count, inventory_state, and atomic order reservation,
--           fulfillment deduction, and cancellation restock RPCs
--   CMS-01: Adds extended catalog & collection CMS metadata columns
-- ==============================================================================

-- 1. NON-EXPOSED PRIVATE SCHEMA & NON-RECURSIVE RBAC FUNCTIONS (DB-01 & DB-03)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS full_name TEXT;

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

-- Replace recursive staff_users policies & enforce owner-admin separation on catalog/settings/coupons
DROP POLICY IF EXISTS "staff_users_self_select" ON public.staff_users;
DROP POLICY IF EXISTS "staff_users_admin_manage" ON public.staff_users;
CREATE POLICY "staff_users_self_select" ON public.staff_users
  FOR SELECT USING (auth.uid() = user_id OR private.is_super_admin());
CREATE POLICY "staff_users_admin_manage" ON public.staff_users
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.staff_users TO authenticated;

DROP POLICY IF EXISTS "collections_staff_write" ON public.collections;
CREATE POLICY "collections_staff_write" ON public.collections
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "products_staff_write" ON public.products;
CREATE POLICY "products_staff_write" ON public.products
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "product_assets_staff_write" ON public.product_assets;
CREATE POLICY "product_assets_staff_write" ON public.product_assets
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "store_settings_staff_write" ON public.store_settings;
CREATE POLICY "store_settings_staff_write" ON public.store_settings
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "coupons_staff_only" ON public.coupons;
CREATE POLICY "coupons_staff_only" ON public.coupons
  FOR ALL USING (private.is_super_admin()) WITH CHECK (private.is_super_admin());

DROP POLICY IF EXISTS "orders_staff_only" ON public.orders;
CREATE POLICY "orders_staff_only" ON public.orders
  FOR ALL USING (private.is_staff_member()) WITH CHECK (private.is_staff_member());

-- 2. EXTEND COLLECTIONS & PRODUCTS FOR CMS, APPROVAL LOGGING & INVENTORY (DB-02, INV-01, CMS-01)
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS pillar TEXT DEFAULT 'Fashion',
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS name_bn TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS super_category TEXT DEFAULT 'Fashion',
  ADD COLUMN IF NOT EXISTS description_en TEXT,
  ADD COLUMN IF NOT EXISTS selling_unit TEXT,
  ADD COLUMN IF NOT EXISTS selling_unit_bn TEXT,
  ADD COLUMN IF NOT EXISTS available_variants TEXT,
  ADD COLUMN IF NOT EXISTS caution_en TEXT,
  ADD COLUMN IF NOT EXISTS caution_bn TEXT,
  ADD COLUMN IF NOT EXISTS reserved_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_approved BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_policy_scope TEXT,
  ADD COLUMN IF NOT EXISTS approved_by TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.products
  ALTER COLUMN price_review SET DEFAULT true,
  ALTER COLUMN stock_verified SET DEFAULT false,
  ALTER COLUMN stock_count SET DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_stock_nonneg') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_stock_nonneg CHECK (stock_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_products_reserved_nonneg') THEN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_reserved_nonneg CHECK (reserved_count >= 0);
  END IF;
END $$;

-- Reconcile historical rows created before migration 02/03 unless independently signed off
UPDATE public.products
SET
  price_review = true,
  stock_verified = false,
  stock_count = CASE
    WHEN approved_at IS NULL AND stock_verified = true AND stock_count = 15 THEN 0
    ELSE GREATEST(0, COALESCE(stock_count, 0))
  END,
  image_approved = false,
  updated_at = TIMEZONE('utc'::text, NOW())
WHERE approved_at IS NULL;

-- Clear placeholder WhatsApp number if still set from initial seed
UPDATE public.store_settings
SET whatsapp_number = '',
    updated_at = TIMEZONE('utc'::text, NOW())
WHERE id = 'default' AND whatsapp_number = '8801700000000';

-- 3. AUDIT LOGS TABLE (SEC-01 / E05)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID,
    actor_email TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_state JSONB,
    after_state JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.audit_logs FROM anon, authenticated;
GRANT SELECT ON TABLE public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "audit_logs_staff_select" ON public.audit_logs;
CREATE POLICY "audit_logs_staff_select" ON public.audit_logs
  FOR SELECT USING (private.is_staff_member());

-- 4. DURABLE META CAPI EVENT OUTBOX (ADS-01 / ADS-02 / E06)
CREATE TABLE IF NOT EXISTS public.capi_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id TEXT UNIQUE NOT NULL,
    order_ref TEXT NOT NULL,
    event_name TEXT NOT NULL DEFAULT 'Purchase',
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'dead_letter')),
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_retry_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    last_error TEXT,
    last_http_status INTEGER,
    fbtrace_id TEXT,
    claimed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_capi_outbox_due ON public.capi_outbox(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_capi_outbox_order ON public.capi_outbox(order_ref);

ALTER TABLE public.capi_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.capi_outbox FROM anon, authenticated;
GRANT SELECT ON TABLE public.capi_outbox TO authenticated;

DROP POLICY IF EXISTS "capi_outbox_staff_read" ON public.capi_outbox;
CREATE POLICY "capi_outbox_staff_read" ON public.capi_outbox
  FOR SELECT USING (private.is_staff_member());

CREATE OR REPLACE FUNCTION public.ft_claim_capi_outbox(p_limit INTEGER DEFAULT 10)
RETURNS SETOF public.capi_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH due AS (
    SELECT id
    FROM public.capi_outbox
    WHERE status IN ('pending', 'failed')
      AND attempts < max_attempts
      AND next_retry_at <= TIMEZONE('utc'::text, NOW())
    ORDER BY next_retry_at ASC, created_at ASC
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50))
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.capi_outbox o
  SET status = 'processing',
      claimed_at = TIMEZONE('utc'::text, NOW()),
      updated_at = TIMEZONE('utc'::text, NOW())
  FROM due
  WHERE o.id = due.id
  RETURNING o.*;
END;
$$;

REVOKE ALL ON FUNCTION public.ft_claim_capi_outbox(INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ft_claim_capi_outbox(INTEGER) TO service_role;

-- 5. ATOMIC INVENTORY RESERVATION, DEDUCTION & CANCELLATION RESTOCK (INV-01 / E07)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS inventory_state TEXT NOT NULL DEFAULT 'none'
    CHECK (inventory_state IN ('none', 'reserved', 'deducted', 'released'));

CREATE OR REPLACE FUNCTION public.ft_create_order_atomic(p_order JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_idem TEXT := NULLIF(BTRIM(p_order->>'idempotency_key'), '');
  v_existing public.orders%ROWTYPE;
  v_inserted public.orders%ROWTYPE;
  v_item JSONB;
  v_sku TEXT;
  v_qty INTEGER;
  v_prod public.products%ROWTYPE;
  v_avail INTEGER;
  v_reserved_all BOOLEAN := true;
  v_inv_state TEXT := 'none';
BEGIN
  IF v_idem IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.orders WHERE idempotency_key = v_idem LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object('ok', true, 'idempotent', true, 'data', to_jsonb(v_existing));
    END IF;
  END IF;

  -- Lock & validate all SKUs in deterministic SKU order to prevent deadlocks
  FOR v_item IN
    SELECT elem FROM jsonb_array_elements(COALESCE(p_order->'items', '[]'::jsonb)) elem
    ORDER BY UPPER(COALESCE(elem->>'sku', ''))
  LOOP
    v_sku := UPPER(BTRIM(COALESCE(v_item->>'sku', '')));
    v_qty := GREATEST(1, COALESCE((v_item->>'qty')::INTEGER, 1));
    SELECT * INTO v_prod FROM public.products WHERE sku = v_sku FOR UPDATE;
    IF FOUND THEN
      IF v_prod.is_available = false OR v_prod.is_archived = true THEN
        RETURN jsonb_build_object('ok', false, 'status', 409, 'error', format('Product %s is currently unavailable.', v_sku));
      END IF;
      v_avail := GREATEST(0, COALESCE(v_prod.stock_count, 0) - COALESCE(v_prod.reserved_count, 0));
      IF v_prod.stock_verified = true THEN
        IF v_avail < v_qty THEN
          RETURN jsonb_build_object('ok', false, 'status', 409, 'error', format('Insufficient verified stock for %s (requested %s, available %s).', v_sku, v_qty, v_avail));
        END IF;
      ELSIF COALESCE(v_prod.stock_count, 0) > 0 THEN
        IF v_avail < v_qty THEN
          RETURN jsonb_build_object('ok', false, 'status', 409, 'error', format('Insufficient stock for %s (requested %s, available %s).', v_sku, v_qty, v_avail));
        END IF;
      ELSE
        -- Unverified catalog item with 0 recorded stock: pending manual seller confirmation
        v_reserved_all := false;
      END IF;
    ELSE
      v_reserved_all := false;
    END IF;
  END LOOP;

  -- Reserve stock where tracked/available
  IF v_reserved_all THEN
    FOR v_item IN SELECT elem FROM jsonb_array_elements(COALESCE(p_order->'items', '[]'::jsonb)) elem
    LOOP
      v_sku := UPPER(BTRIM(COALESCE(v_item->>'sku', '')));
      v_qty := GREATEST(1, COALESCE((v_item->>'qty')::INTEGER, 1));
      UPDATE public.products
      SET reserved_count = reserved_count + v_qty,
          updated_at = TIMEZONE('utc'::text, NOW())
      WHERE sku = v_sku;
    END LOOP;
    v_inv_state := 'reserved';
  END IF;

  INSERT INTO public.orders (
    order_ref, customer_name, customer_phone, customer_email,
    customer_district, customer_address, delivery_zone, delivery_fee,
    subtotal, discount_code, discount_amount, total,
    payment_method, contact_channel, items, status,
    courier_name, tracking_number, customer_notes, status_history,
    source, attribution, idempotency_key, inventory_state,
    created_at, updated_at
  ) VALUES (
    p_order->>'order_ref',
    p_order->>'customer_name',
    p_order->>'customer_phone',
    NULLIF(p_order->>'customer_email', ''),
    p_order->>'customer_district',
    p_order->>'customer_address',
    COALESCE(p_order->>'delivery_zone', 'dhaka'),
    COALESCE((p_order->>'delivery_fee')::NUMERIC, 80),
    COALESCE((p_order->>'subtotal')::NUMERIC, 0),
    NULLIF(p_order->>'discount_code', ''),
    COALESCE((p_order->>'discount_amount')::NUMERIC, 0),
    COALESCE((p_order->>'total')::NUMERIC, 0),
    COALESCE(p_order->>'payment_method', 'Cash on Delivery (COD)'),
    COALESCE(p_order->>'contact_channel', 'web_form'),
    COALESCE(p_order->'items', '[]'::jsonb),
    COALESCE(p_order->>'status', 'pending'),
    COALESCE(p_order->>'courier_name', 'Steadfast Courier'),
    COALESCE(p_order->>'tracking_number', ''),
    COALESCE(p_order->>'customer_notes', ''),
    COALESCE(p_order->'status_history', '[]'::jsonb),
    COALESCE(p_order->>'source', 'web_store'),
    p_order->'attribution',
    v_idem,
    v_inv_state,
    COALESCE((p_order->>'created_at')::TIMESTAMPTZ, TIMEZONE('utc'::text, NOW())),
    COALESCE((p_order->>'updated_at')::TIMESTAMPTZ, TIMEZONE('utc'::text, NOW()))
  )
  RETURNING * INTO v_inserted;

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'data', to_jsonb(v_inserted));
END;
$$;

REVOKE ALL ON FUNCTION public.ft_create_order_atomic(JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ft_create_order_atomic(JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.ft_transition_order_inventory(p_order_ref TEXT, p_next_status TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item JSONB;
  v_sku TEXT;
  v_qty INTEGER;
  v_new_inv_state TEXT;
BEGIN
  SELECT * INTO v_order FROM public.orders WHERE order_ref = p_order_ref FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;

  v_new_inv_state := v_order.inventory_state;

  IF p_next_status IN ('shipped', 'delivered') AND v_order.inventory_state = 'reserved' THEN
    FOR v_item IN SELECT elem FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) elem
    LOOP
      v_sku := UPPER(BTRIM(COALESCE(v_item->>'sku', '')));
      v_qty := GREATEST(1, COALESCE((v_item->>'qty')::INTEGER, 1));
      UPDATE public.products
      SET stock_count = GREATEST(0, stock_count - v_qty),
          reserved_count = GREATEST(0, reserved_count - v_qty),
          updated_at = TIMEZONE('utc'::text, NOW())
      WHERE sku = v_sku;
    END LOOP;
    v_new_inv_state := 'deducted';
  ELSIF p_next_status = 'cancelled' AND v_order.inventory_state = 'reserved' THEN
    FOR v_item IN SELECT elem FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) elem
    LOOP
      v_sku := UPPER(BTRIM(COALESCE(v_item->>'sku', '')));
      v_qty := GREATEST(1, COALESCE((v_item->>'qty')::INTEGER, 1));
      UPDATE public.products
      SET reserved_count = GREATEST(0, reserved_count - v_qty),
          updated_at = TIMEZONE('utc'::text, NOW())
      WHERE sku = v_sku;
    END LOOP;
    v_new_inv_state := 'released';
  ELSIF p_next_status = 'cancelled' AND v_order.inventory_state = 'deducted' THEN
    FOR v_item IN SELECT elem FROM jsonb_array_elements(COALESCE(v_order.items, '[]'::jsonb)) elem
    LOOP
      v_sku := UPPER(BTRIM(COALESCE(v_item->>'sku', '')));
      v_qty := GREATEST(1, COALESCE((v_item->>'qty')::INTEGER, 1));
      UPDATE public.products
      SET stock_count = stock_count + v_qty,
          updated_at = TIMEZONE('utc'::text, NOW())
      WHERE sku = v_sku;
    END LOOP;
    v_new_inv_state := 'released';
  END IF;

  IF v_new_inv_state <> v_order.inventory_state THEN
    UPDATE public.orders
    SET inventory_state = v_new_inv_state,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE order_ref = p_order_ref;
  END IF;

  RETURN v_new_inv_state;
END;
$$;

REVOKE ALL ON FUNCTION public.ft_transition_order_inventory(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ft_transition_order_inventory(TEXT, TEXT) TO service_role;
