# Supabase Database & Auth Setup Guide — Fariza's Territory

**Supabase Project URL:** `https://vjbhrdclcnxevunskodm.supabase.co`

---

## 1. Required SQL Execution Order

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/vjbhrdclcnxevunskodm/sql).
2. Run **`supabase/migrations/01_initial_schema.sql`** (only if starting from an empty database).
3. Run **`supabase/migrations/02_security_hardening.sql`**:
   - Creates `public.staff_users` (`user_id`, `email`, `full_name`, `role`, `is_active`) and non-exposed `private` schema helpers (`private.is_staff_member()`, `private.is_super_admin()`), avoiding self-referencing `staff_users` RLS recursion.
   - Adds `orders.idempotency_key` (with unique partial index `idx_orders_idempotency_key`), `orders.attribution`, `orders.purchase_capi_sent_at`, `orders.purchase_capi_event_id`.
   - Adds `products.stock_count` (`0` unverified default) and `products.price_review` (`true` default until seller-approved).
   - Drops legacy plaintext `store_settings.admin_pin` and open `FOR ALL USING (true)` policies.
   - Reconciles `store_settings.free_delivery_threshold` to `3000`.
4. Run **`supabase/migrations/03_handover_reconciliation.sql`** (additive production reconciliation):
   - Safely reconciles existing pre-migration databases (`full_name` column, non-recursive `private.*` RBAC helpers, owner-only table separation).
   - Reconciles unapproved historical rows (`approved_at IS NULL`) to `price_review=true, stock_verified=false, stock_count=0`.
   - Provisions `public.audit_logs` and durable `public.capi_outbox` + `public.ft_claim_capi_outbox()`.
   - Adds `reserved_count`, `inventory_state`, `ft_create_order_atomic()`, and `ft_transition_order_inventory()` for race-free stock reservation, shipment deduction, and cancellation restock.
   - Adds CMS columns (`collections.description/hero_image/is_active`, `products.main_image/is_archived`) and clears any residual placeholder `'8801700000000'`.
5. Run **`supabase/seed.sql`** to upsert collections, baseline SKUs (preserving live seller-signed `price_bdt`, `stock_verified`, and `approved_at`), and coupons (`FIRST25`, `FARIZA200`, `FREESHIP`).
6. Run **`supabase/tests/rls_security.test.sql`** to verify zero recursive policies, zero unapproved feed leaks, and strict `anon`, `staff`, non-staff `authenticated`, and `admin` RLS boundaries inside a rolled-back transaction.

---

## 2. Provision Staff Admin Users

1. In Supabase Dashboard ➔ **Authentication ➔ Users**, invite or create each staff/owner email and strong password (enable MFA/2FA for owners).
2. Register the user in `public.staff_users`:
   ```sql
   INSERT INTO public.staff_users (user_id, email, full_name, role, is_active)
   VALUES ('<USER_UUID_FROM_AUTH_USERS>', 'faria@farizasterritory.com', 'Faria', 'admin', true);
   ```

---

## 3. Server & Browser Keys

- **`SUPABASE_ANON_KEY`**: Safe public key used only by `/api/public-config` and Supabase Auth login on `/admin`.
- **`SUPABASE_SERVICE_ROLE_KEY`**: Strictly server-only environment variable used by `lib/supabaseServer.js`. Never place it in client JS, HTML, or `localStorage`.
