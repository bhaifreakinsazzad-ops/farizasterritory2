# Supabase Database & Auth Setup Guide — Fariza's Territory

**Supabase Project URL:** `https://vjbhrdclcnxevunskodm.supabase.co`

---

## 1. Required SQL Execution Order

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/vjbhrdclcnxevunskodm/sql).
2. Run **`supabase/migrations/01_initial_schema.sql`** (only if starting from an empty database).
3. Run **`supabase/migrations/02_security_hardening.sql`**:
   - Creates `public.staff_users` (`user_id`, `email`, `role`, `is_active`) for verified admin/staff RBAC.
   - Adds `orders.idempotency_key` (with unique partial index `idx_orders_idempotency_key`), `orders.attribution`, `orders.purchase_capi_sent_at`, `orders.purchase_capi_event_id`.
   - Adds `products.stock_count` and `products.price_review` (default `true` until seller-approved).
   - Drops legacy plaintext `store_settings.admin_pin`.
   - Removes insecure public `orders` reads and `FOR ALL USING (true)` policies; enforces least-privilege grants where `service_role` performs server-trusted order writes and staff RBAC gates admin mutations.
   - Reconciles `store_settings.free_delivery_threshold` to `3000`.
4. Run **`supabase/seed.sql`** to upsert collections, baseline SKUs (without overwriting existing live `price_bdt` or `stock_verified`), and coupons (`FIRST25`, `FARIZA200`, `FREESHIP`).
5. Run **`supabase/tests/rls_security.test.sql`** to verify anonymous callers cannot read customer PII or mutate admin tables.

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
