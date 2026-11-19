# Handover Changelog (`release/client-handover-v1`)

Audited baseline commit on `main`: `6d916ba6b3c3b3e772f17898577c70ca7b9b5d11`.  
Goal: Remediate all P0/P1/P2 engineering, security, inventory, CAPI, CMS, UI/accessibility, and documentation gaps identified in the Handover Readiness Audit while preserving honest `NO-GO` external gates until client secrets, live SQL execution, seller 53-SKU approvals, live hosting, and account ownership transfers occur.

---

## Database & Migrations (`supabase/`)
- **DB-01 Fix (`02_security_hardening.sql`, `03_handover_reconciliation.sql`)**: Added missing `staff_users.full_name` column cleanly; updated setup SQL examples & verification script.
- **DB-02 Reconciliation (`03_handover_reconciliation.sql`, `scripts/build_supabase_seed.js`)**: Reconciles pre-existing unapproved `public.products` rows (`approved_at IS NULL`) to `price_review = true`, `stock_verified = false`, `stock_count = 0`; clears residual `'8801700000000'` placeholder WhatsApp from `store_settings`; aligns `free_delivery_threshold = 3000`.
- **DB-03 Non-Recursive RBAC (`02_security_hardening.sql`, `03_handover_reconciliation.sql`)**: Replaced self-referencing `staff_users` RLS subqueries with non-exposed `private.is_staff_member()` and `private.is_super_admin()` `SECURITY DEFINER` helpers; separated owner-admin write policies on `store_settings`, `products`, `collections`, `coupons`, and `staff_users`.
- **Expanded `supabase/tests/rls_security.test.sql`**: Verifies schema invariants, zero `USING (true)` policies, zero self-referencing `staff_users` policies, zero DB-02 unapproved feed leaks, plus simulated JWT/role tests for `anon`, non-staff `authenticated`, inactive `admin`, active `staff`, and active `admin`.

## Server Security, Inventory, CAPI & CMS (`server.js`, `lib/supabaseServer.js`, `api/capi.js`, `assets/js/commerce.js`)
- **SEC-01 RBAC & Audit Logs**: Separated `requireOwnerAdmin` (`403` for `staff`) on settings, coupons, catalog CRUD/pricing/approval/media uploads, CAPI test/retries, staff management, and audit logs; records `public.audit_logs` with actor and before/after snapshots.
- **INV-01 Atomic Stock Control**: Added `reserved_count`, `inventory_state`, `ft_create_order_atomic`, and `ft_transition_order_inventory` (`409` on verified oversell, reservation on order creation, deduction on `shipped`/`delivered`, automatic restock on `cancelled`).
- **ADS-01 / ADS-02 Durable `capi_outbox`**: `api/capi.js` now returns `delivered: false` on `preview_no_token` or Graph errors (`10s` timeout); `server.js` enqueues `pur_<orderRef>` in `public.capi_outbox`, marks `purchase_capi_sent_at` strictly on `delivered === true && mode === 'live_production'`, and exposes automatic retry + `/admin` manual retry controls.
- **CMS-01 Full Catalog & Media CMS**: Added `POST/PATCH /api/admin/collections`, `POST/PATCH /api/admin/products` (including archive toggle), and `POST /api/admin/products/:sku/media` with binary magic-byte verification (`webp`/`png`/`jpeg` <= 4 MB), reflected live across `/api/catalog`, `/products/:sku`, `/collections/:slug`, and `/sitemap.xml`.
- **SEO & Vendor Security**: Self-hosted `@supabase/supabase-js@2.119.0` at `/vendor/supabase.js`, added `og:url` metadata + clean path SSR routes (`/shop`, `/track`, `/policies`, etc.), and blocked internal repo directories (`/docs`, `/supabase`, `/lib`, `/scripts`, `/tests`, `/package.json`, `/.env`) with `404`.

## Storefront, Admin Portal, Accessibility & GHL (`index.html`, `admin.html`, `ghl-bundle.html`, `assets/`)
- **Accessibility & Modern Web Standards**: Upgraded storefront modals (`#modal`, `#quick-view-ov`) to native `<dialog closedby="any">` with `overscroll-behavior: contain`; managed `inert` + focus restoration across drawers/search/lightbox/menu; darkened `--ink3` (`#574F44`) for WCAG contrast; added `:is(:user-invalid, .user-invalid-fallback)`, top-placed field hints, dynamic `aria-invalid` / `aria-describedby`, central live region (`#ft-live-announcer`), and accessible `.table-wrapper` + `<caption>` + `scope="col"` in `/admin`.
- **Commercial Truth & Bilingual UX**: Out-of-stock SKUs disable ordering; unverified SKUs disclose manual stock confirmation; checkout requires explicit policy acknowledgment and provides bilingual EN/বাংলা policy documentation covering returns, COD refusal, cancellation, SLA, vouchers, and cookie privacy (`#/policies`).
- **Three.js Compatibility Fix**: Fixed `beads.computeBoundingSphere()` r128 crash in `assets/js/threeHero.js` discovered during headless Edge E2E.
- **KPI & Consent Integrity**: `/admin` cleanly separates Pending Inquiries vs Confirmed COD Pipeline vs Delivered Realized Revenue vs CAPI Outbox; `scripts/build_ghl_bundle.js` regenerates `ghl-bundle.html` with pinned SDK (`2.119.0`), zero unconditional Pixel firing, and zero placeholder `8801700000000` numbers.

## Verification Tooling (`scripts/`, `tests/`)
- Generated 53-SKU sign-off spreadsheet `docs/SELLER_53_SKU_LEDGER.csv` and SQL generator `scripts/apply_seller_ledger.js`.
- Expanded `scripts/validate_platform.js` and `tests/platform.test.js` (11 Node tests) and added Playwright headless Microsoft Edge E2E suite `tests/e2e.playwright.js` (`npm run test:e2e`).
