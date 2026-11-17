# Fariza's Territory — Production Deployment & Rollback Runbook

> **CURRENT RELEASE GATE: NO-GO**
> External secrets (`SUPABASE_SERVICE_ROLE_KEY`, `META_CAPI_ACCESS_TOKEN`), live Supabase SQL execution access, first staff `auth.users` / `public.staff_users` provisioning, hosting deployment credentials, and seller price/stock/WhatsApp sign-off are outside this sandbox. Do NOT start paid advertising until every step below is completed on the target Node host and Supabase project.

---

## 1. Canonical Hosting Architecture

Fariza's Territory runs on **one canonical hosting architecture**:
- **Application Server**: Persistent **Node.js 20+ / Express** runtime executing `node server.js` on port `3000`.
- **Managed Database & Auth**: **Supabase PostgreSQL + Supabase Auth** (`https://vjbhrdclcnxevunskodm.supabase.co`).

Contradictory static catch-all host configurations (`vercel.json`, `netlify.toml`) have been removed because static-only hosts do not run `server.js` APIs (`/api/orders`, `/api/track`, `/api/admin/*`, SSR `/products/:sku`, or `/api/catalog-feed.*`). Recommended persistent Node hosts: Railway, Render, Fly.io, DigitalOcean App Platform, or VPS/Docker.

---

## 2. Database Migration & Admin Provisioning (Supabase)

1. Open [Supabase SQL Editor](https://supabase.com/dashboard/project/vjbhrdclcnxevunskodm/sql).
2. If initializing a fresh database, execute `supabase/migrations/01_initial_schema.sql` first.
3. Execute **`supabase/migrations/02_security_hardening.sql`**:
   - Creates `public.staff_users` for DB-backed admin/staff RBAC.
   - Adds `idempotency_key` (with unique partial index), `purchase_capi_sent_at`, `purchase_capi_event_id`, `attribution`, `stock_count`, `stock_verified`, and `price_review`.
   - Removes legacy plaintext `store_settings.admin_pin`.
   - Drops insecure `FOR SELECT USING (true)` on `orders` and `FOR ALL USING (true)` policies; enforces least-privilege RLS where PII and admin writes are denied to `anon`/`authenticated` non-staff sessions.
   - Reconciles `free_delivery_threshold` to `3000`.
4. Execute **`supabase/seed.sql`** to upsert collections, SKUs (without overwriting existing live `price_bdt` or `stock_verified`), and coupons (`FIRST25`, `FARIZA200`, `FREESHIP`).
5. Execute **`supabase/tests/rls_security.test.sql`** (verify all allow/deny RLS assertions pass inside a transaction block).
6. **Provision First Admin Staff User**:
   - In Supabase Dashboard ➔ **Authentication ➔ Users**, create the owner/admin user email + strong password (enable MFA/2FA for owner accounts).
   - Copy the user's UUID and insert into `public.staff_users`:
     ```sql
     INSERT INTO public.staff_users (user_id, email, full_name, role, is_active)
     VALUES ('<AUTH_USER_UUID>', 'owner@farizasterritory.com', 'Faria & Saiful', 'admin', true);
     ```

---

## 3. Environment Variables & Secret Rotation

Before launch, set these environment variables on your Node host (and rotate any previously shared credentials):

```env
PORT=3000
NODE_ENV=production
PUBLIC_SITE_URL=https://farizasterritory.com
ALLOWED_ORIGINS=https://farizasterritory.com

SUPABASE_URL=https://vjbhrdclcnxevunskodm.supabase.co
SUPABASE_ANON_KEY=<supabase-anon-public-key>
SUPABASE_SERVICE_ROLE_KEY=<server-only-service-role-key>
ADMIN_ALLOWED_EMAILS=owner@farizasterritory.com

META_DATASET_ID=1657670575734647
META_PIXEL_ID=1657670575734647
META_CAPI_ACCESS_TOKEN=<server-only-meta-capi-token>
META_TEST_EVENT_CODE=
```

Never place `SUPABASE_SERVICE_ROLE_KEY` or `META_CAPI_ACCESS_TOKEN` in client JS or browser storage.

---

## 4. Pre-Flight Automated Verification

Run locally and in GitHub Actions (`.github/workflows/ci.yml`):
```bash
npm ci
npm run lint
npm test
npm audit --audit-level=high
```

Verify live endpoints after starting `npm start`:
- `GET /api/health` -> returns `200`, `databaseConfigured: true`, `totalProducts: 53`
- `POST /api/orders` -> fails closed with `503` if `SUPABASE_SERVICE_ROLE_KEY` is missing; returns `201` with server-computed totals when configured
- `GET /api/admin/orders` (unauthenticated) -> returns `401`
- `GET /products/CAT-001` -> returns `200` with canonical `<link>`, `Product` JSON-LD, and `socialSquare.webp` OG image
- `GET /assets/aistudio/01_REPO_AUDIT_AND_RELEASE_PLAN_968b26f6.md` -> returns `404`
- `GET /assets/aistudio/fariza_s_territory_brand_book_by_pomelli_1e38cd9b.pdf` -> returns `200`

---

## 5. Emergency Rollback Strategy

### Database Migration Rollback
If `02_security_hardening.sql` introduces a compatibility issue while staging:
1. Run `supabase/migrations/02_security_hardening_rollback.sql` inside the Supabase SQL Editor (Note: never blindly roll back to insecure public PII policies in live production; prefer pausing traffic via maintenance mode / revoking `anon` table grants if needed).
2. Re-check `supabase/tests/rls_security.test.sql` after any schema intervention.

### Application / Marketing Emergency Freeze
1. Pause active Meta ad campaigns in Meta Ads Manager.
2. Redeploy the previous known-good Git commit tag on your Node host.
3. If an API credential or admin account was suspected compromised, immediately rotate `SUPABASE_SERVICE_ROLE_KEY`, `META_CAPI_ACCESS_TOKEN`, and revoke user sessions in Supabase Auth.
