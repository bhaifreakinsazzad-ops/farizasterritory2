# Fariza's Territory — Luxury Fashion & Boutique E-Commerce Platform

> **Fashion & Accessories Brand by Faria & Saiful Islam Shuvo**  
> *Elegance in Every Detail. Made in Mirpur, Dhaka, Bangladesh.*  
> **Canonical Architecture:** Node.js + Express (`server.js` on port `3000`) + Managed Supabase PostgreSQL (`vjbhrdclcnxevunskodm`)  
> **Release Decision:** **NO-GO for paid advertising & live production traffic** until live Supabase secrets/migration, Meta CAPI token, hosting deployment, and Seller Sign-Off ([docs/SELLER_SIGNOFF_CHECKLIST.md](docs/SELLER_SIGNOFF_CHECKLIST.md)) are completed.

---

## Architecture & Security Model

Fariza's Territory combines a fast multi-angle storefront (`index.html`), authenticated staff portal (`admin.html`), shared catalog/validation engine (`assets/js/commerce.js`), and server-authoritative Express backend (`server.js` + `lib/supabaseServer.js` + `api/capi.js`):

- **Authoritative Server Checkout (`POST /api/orders`)**: Validates customer name, Bangladeshi mobile number (`01[3-9]XXXXXXXX`), stock availability, delivery zone (`dhaka` ৳80 / `outside_dhaka` ৳150), and canonical coupon vouchers (`FIRST25`, `FARIZA200`, `FREESHIP` over ৳3,000) strictly server-side using `FT_COMMERCE`. Enforces per-submission `idempotency_key` deduplication and **fails closed (`503`)** when `SUPABASE_SERVICE_ROLE_KEY` is unconfigured — never showing fake success when persistence fails.
- **Challenge-Protected Public Tracking (`GET|POST /api/track`)**: Requires BOTH `order_ref` and matching customer phone number, applies IP rate limiting, returns identical generic `404` on mismatch to prevent enumeration, and strips street addresses/full phones (`redactOrderForPublicTracking`).
- **Supabase Auth Admin RBAC (`/admin` & `/api/admin/*`)**: Replaces legacy client PIN gates with verified Supabase Auth Bearer tokens checked server-side against `public.staff_users` (`admin` / `staff`), enforces `X-Robots-Tag: noindex, nofollow`, validates order status transitions, and allows stock/price verification toggles.
- **Least-Privilege Database Hardening**: `supabase/migrations/02_security_hardening.sql` drops public order PII reads and open `FOR ALL USING (true)` policies, removes plaintext `admin_pin`, adds `staff_users`, `idempotency_key`, `attribution`, `purchase_capi_sent_at`, and `stock_verified` / `price_review`.
- **Consent-Aware Meta Pixel & Server-Side CAPI**: Analytics only initialize when the shopper grants consent (`ft_analytics_consent === 'granted'`). Client sessions cannot spoof `Purchase` or `test_event_code` (`403` on public `/api/capi`); `Purchase` dispatches exclusively server-side once when Admin transitions a COD order to `confirmed`.
- **Truthful Feeds & Canonical SSR SEO**: `/api/catalog-feed.csv|xml|json` exclude unverified or `price_review` SKUs until signed off by the seller; `/products/:sku`, `/collections/:slug`, and `/sitemap.xml` inject per-route canonical links, OpenGraph cards, and Schema.org JSON-LD.

---

## Official Channels & Known External Blockers

- **Facebook & Messenger**: `https://www.facebook.com/farizasterritory143` / `https://m.me/farizasterritory143` (active fallback channel; placeholder WhatsApp `8801700000000` is disabled until verified).
- **Pending Live Requirements (NO-GO Blockers)**:
  1. Provision `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and `META_CAPI_ACCESS_TOKEN` on the production Node host.
  2. Execute `supabase/migrations/02_security_hardening.sql`, `supabase/seed.sql`, and `supabase/tests/rls_security.test.sql` against live Supabase PostgreSQL, plus create the first `auth.users` + `staff_users` admin record.
  3. Seller sign-off on final BDT prices, verified stock counts, high-risk accessory selling units, and official WhatsApp Business number ([docs/SELLER_SIGNOFF_CHECKLIST.md](docs/SELLER_SIGNOFF_CHECKLIST.md)).

---

## Local Setup & Verification

```bash
npm ci
cp .env.example .env
# Populate SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, META_CAPI_ACCESS_TOKEN on server
npm start
```

- Storefront: `http://localhost:3000`
- Staff Admin Portal: `http://localhost:3000/admin` (requires Supabase Auth `staff_users` account)
- Verification & CI Tests:
```bash
npm run lint
npm test
npm audit --audit-level=high
```

---

## Documentation Index
- [docs/DEPLOYMENT_AND_ROLLBACK.md](docs/DEPLOYMENT_AND_ROLLBACK.md) — Production Node+Express deployment, env vars, migration order & rollback procedures
- [docs/SELLER_SIGNOFF_CHECKLIST.md](docs/SELLER_SIGNOFF_CHECKLIST.md) — 53-SKU pricing, stock, unit disclaimer & official WhatsApp sign-off gate
- [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) — PostgreSQL schema, hardened RLS & staff RBAC setup
- [docs/ADVERTISING_GUIDE.md](docs/ADVERTISING_GUIDE.md) — Consented Pixel + server-only `Purchase` CAPI & verified catalog feeds
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture & route inventory
- [SOURCE_CONFLICTS_AND_UNKNOWN_FIELDS.md](SOURCE_CONFLICTS_AND_UNKNOWN_FIELDS.md) — SKU asset audit & provisional pricing disclosures
