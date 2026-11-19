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
- **Supabase Auth Admin RBAC (`/admin` & `/api/admin/*`)**: Verified Supabase Auth Bearer tokens checked server-side against `public.staff_users` (`admin` vs `staff`), enforcing owner-only `403` boundaries on settings/coupons/product pricing/CMS/media/CAPI retry/staff routes, writing `public.audit_logs`, and enforcing `X-Robots-Tag: noindex, nofollow`.
- **Owner Catalog & Media CMS (`POST/PATCH /api/admin/collections`, `POST/PATCH /api/admin/products`, `/media`)**: Owners can create collections, add/edit/archive SKUs, update stock/variant/unit metadata, and upload WebP/PNG/JPEG photos (verified by binary magic bytes) reflected live on `/api/catalog`, `/products/:sku`, `/collections/:slug`, and `/sitemap.xml`.
- **Atomic Inventory & Reconciliation**: `ft_create_order_atomic` locks SKUs and increments `reserved_count` (blocking verified oversell with `409`), `ft_transition_order_inventory` deducts stock on `shipped`/`delivered` and releases reservations on `cancelled`; unverified SKUs clearly disclose manual confirmation.
- **Least-Privilege Database Hardening & Reconciliation**: `supabase/migrations/02_security_hardening.sql` + additive `03_handover_reconciliation.sql` use non-exposed `private.is_staff_member()` / `private.is_super_admin()` helpers (eliminating RLS recursion), reconcile historical unapproved SKUs, provision `public.capi_outbox` & `public.audit_logs`, and verify zero permissive policies in `supabase/tests/rls_security.test.sql`.
- **Consent-Aware Meta Pixel & Durable `capi_outbox`**: Browser SDK is self-hosted (`/vendor/supabase.js`), analytics initialize only on consent (`ft_analytics_consent === 'granted'`), and confirmed COD orders enqueue immutable `pur_<orderRef>` Purchase events in `public.capi_outbox`, marking `purchase_capi_sent_at` **only** after Meta Graph HTTP 200 confirmation in `live_production` mode (never `preview_no_token`).
- **Truthful Feeds & Canonical SSR SEO**: `/api/catalog-feed.csv|xml|json` exclude unverified, archived, or zero-stock SKUs until seller-approved via Admin CMS or `docs/SELLER_53_SKU_LEDGER.csv`; `/products/:sku`, `/collections/:slug`, `/policies`, `/shop`, `/track`, and `/sitemap.xml` inject per-route canonical `<link>`, `og:url`, OpenGraph, and JSON-LD.

---

## Official Channels & Known External Blockers

- **Facebook & Messenger**: `https://www.facebook.com/farizasterritory143` / `https://m.me/farizasterritory143` (active fallback channel; placeholder WhatsApp `8801700000000` removed/disabled until verified).
- **Pending Live Requirements (NO-GO Blockers)**:
  1. Provision real `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, and `META_CAPI_ACCESS_TOKEN` on the production Node host.
  2. Execute `02_security_hardening.sql`, `03_handover_reconciliation.sql`, `seed.sql`, and `supabase/tests/rls_security.test.sql` against live Supabase PostgreSQL, plus create the first `auth.users` + `staff_users` admin record.
  3. Complete and apply `docs/SELLER_53_SKU_LEDGER.csv` (`node scripts/apply_seller_ledger.js`) and confirm the official WhatsApp Business number ([docs/SELLER_SIGNOFF_CHECKLIST.md](docs/SELLER_SIGNOFF_CHECKLIST.md)).
  4. Complete live Node host deployment, DNS cutover, and full account ownership transfer ([docs/OWNERSHIP_AND_TRANSFER_REGISTER.md](docs/OWNERSHIP_AND_TRANSFER_REGISTER.md)).

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
npm run test:e2e
npm audit --audit-level=high
```

---

## Documentation Index
- [docs/DEPLOYMENT_AND_ROLLBACK.md](docs/DEPLOYMENT_AND_ROLLBACK.md) — Production Node+Express deployment, env vars, migration order (`02` + `03`) & rollback procedures
- [docs/CLIENT_OPERATIONS_MANUAL.md](docs/CLIENT_OPERATIONS_MANUAL.md) — Non-technical daily operations manual for owners & staff
- [docs/OWNERSHIP_AND_TRANSFER_REGISTER.md](docs/OWNERSHIP_AND_TRANSFER_REGISTER.md) — GitHub, Domain, Supabase, Hosting & Meta account transfer register
- [docs/SELLER_SIGNOFF_CHECKLIST.md](docs/SELLER_SIGNOFF_CHECKLIST.md) — 53-SKU pricing, stock, unit disclaimer & official WhatsApp sign-off gate ([docs/SELLER_53_SKU_LEDGER.csv](docs/SELLER_53_SKU_LEDGER.csv))
- [docs/CHANGELOG_HANDOVER_V1.md](docs/CHANGELOG_HANDOVER_V1.md) — Handover v1 engineering remediation & verification changelog
- [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md) — PostgreSQL schema, hardened non-recursive RLS, atomic inventory & staff RBAC setup
- [docs/ADVERTISING_GUIDE.md](docs/ADVERTISING_GUIDE.md) — Consented Pixel + durable `capi_outbox` `Purchase` CAPI & verified catalog feeds
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — System architecture & route inventory
- [SOURCE_CONFLICTS_AND_UNKNOWN_FIELDS.md](SOURCE_CONFLICTS_AND_UNKNOWN_FIELDS.md) — SKU asset audit & provisional pricing disclosures
