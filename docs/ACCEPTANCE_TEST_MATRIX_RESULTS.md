# Fariza's Territory — Acceptance Test Matrix Execution Record

**Branch:** `release/client-handover-v1` (branched from audited `main` SHA `6d916ba6b3c3b3e772f17898577c70ca7b9b5d11`)  
**Release Gate:** **ENGINEERING READY — NO-GO for live paid traffic until external client blockers (`OPS-001`..`OPS-010`, `DATA-004`/`005`, live `META_CAPI_ACCESS_TOKEN`, live Supabase SQL execution) are completed.**

---

## Automated Verification Summary
- `npm run lint` (`scripts/validate_platform.js`): Static JS compilation (`new Function`), 106 disk asset check across 53 SKUs / 8 collections, SQL & bundle regression invariants.
- `node scripts/test_capi_locally.js`: Public `Purchase` blocking (`403`), untrusted origin blocking, `preview_no_token` (`delivered: false`), mocked Graph 200 live receipt (`delivered: true`).
- `npm test` (`tests/platform.test.js` — 11 Node tests): In-memory & server API suites covering fails-closed `503`, `idempotency_key`, phone challenge `404`/`200`, `admin` vs `staff` RBAC `403`, `audit_logs`, `capi_outbox` retries, atomic inventory reserve/oversell `409`/deduct/restock, CMS collection/product/media/archive, `/vendor/supabase.js`, and internal repo `404`.
- `npm run test:e2e` (`tests/e2e.playwright.js` in headless Microsoft Edge): Desktop `1440x900`, Mobile `390x844` & `360x780` (`prefers-reduced-motion: reduce`), all 53 SKU images HTTP `200`, consent declined vs granted, native `<dialog>` Quick View, accessible form validation, live order creation -> PII-free localStorage -> phone tracking, `503` fail-closed cart preservation, bilingual `EN`/`বাংলা` policies, and Admin Portal RBAC + KPI separation + CMS creation + photo upload + CAPI Outbox.
- `npm audit --audit-level=high`: Security vulnerability check on Node dependencies.

---

## Test Case Matrix Status

| Test ID | Area | Status | Verification Scope / Notes |
|---|---|---|---|
| SEC-001 | Security | **PASS (Automated API + E2E)** | Anonymous `GET /api/admin/orders` returns `401` + `X-Robots-Tag: noindex, nofollow`. |
| SEC-002 | Security | **PASS (Automated API + E2E)** | `staff` JWT receives `403` on `/api/admin/settings`, `/api/admin/coupons`, `/api/admin/products/:sku`, `/api/admin/capi-test`, `/api/admin/staff`, `/api/admin/audit-logs`. |
| SEC-003 | Security | **PASS (SQL Test Harness)** / **BLOCKED LIVE DB** | Inactive admin denied in `supabase/tests/rls_security.test.sql` + `lib/supabaseServer.js` check; live Supabase DB execution pending credentials. |
| SEC-004 | Security | **PASS (SQL Test Harness)** / **BLOCKED LIVE DB** | `02_security_hardening.sql` + `03_handover_reconciliation.sql` + `rls_security.test.sql` verify anonymous read denied; pending live Supabase run. |
| SEC-005 | Security | **PASS (SQL Test Harness)** / **BLOCKED LIVE DB** | Eliminated `staff_users` recursive self-select via `private.is_staff_member()` & `private.is_super_admin()`; tested in `rls_security.test.sql`. |
| SEC-006 | Security | **PASS (SQL Schema Reconciled)** / **BLOCKED LIVE DB** | Fixed `staff_users.full_name` in `02_security_hardening.sql` & `03_handover_reconciliation.sql`; awaiting execution against live `vjbhrdclcnxevunskodm`. |
| SEC-007 | Security | **PASS (Static + Server)** | `validate_platform.js` confirms no `service_role` or anon JWT in client JS/HTML; `/docs`, `/supabase`, `/lib`, `/package.json`, `/.env` return `404`. |
| SEC-008 | Security | **PASS (Automated API + E2E)** | Wrong phone on `/api/track` returns identical `404` error message to unknown order ref. |
| SEC-009 | Security | **PASS (Automated API)** | Public `POST /api/capi` rejects `Purchase` & `CompleteRegistration` with `403` and ignores client `test_event_code`. |
| SEC-010 | Security | **PASS (Playwright E2E)** | Declining consent keeps `connect.facebook.net` & `facebook.com/tr` requests at `0`. |
| DATA-001 | Catalog | **PASS (Automated + Static)** | 53 unique SKUs across 8 collections (`18` Fashion + `35` Accessories). |
| DATA-002 | Catalog | **PASS (Playwright E2E + Static)** | All 53 main images and 106 mapped assets verified on disk & HTTP `200` in headless Edge. |
| DATA-003 | Catalog | **PASS (SQL + Seed + Feed)** | `03_handover_reconciliation.sql` resets `approved_at IS NULL` rows to unverified `0` stock; feeds exclude unverified SKUs (`1/53` test verified). |
| DATA-004 | Catalog | **PARTIAL (Tooling Ready) — BLOCKED CLIENT SIGN-OFF** | `docs/SELLER_53_SKU_LEDGER.csv` + `scripts/apply_seller_ledger.js` + Admin UI built; awaits owner pricing sign-off. |
| DATA-005 | Catalog | **PARTIAL (UI Shown) — BLOCKED CLIENT SIGN-OFF** | `selling_unit`, bilingual notices, and high-risk accessory warnings displayed cleanly; awaits owner commercial confirmation. |
| DATA-006 | Catalog | **PASS (Automated API + E2E)** | Out-of-stock buttons disabled (`CAT-002`); verified oversell blocked (`409`); unverified SKUs labeled *Pending manual stock confirmation*. |
| DATA-007 | Catalog | **PASS (Automated API + E2E)** | Admin CMS creates collections/products (`CAT-099`), uploads magic-byte-verified photos, archives cleanly, reflected live on `/api/catalog` & `/sitemap.xml`. |
| ORD-001 | Orders | **PASS (In-Memory Store)** / **BLOCKED LIVE DB** | `POST /api/orders` validates, computes authoritative totals, returns `201` with `FT-...`; live Supabase write awaits live env keys. |
| ORD-002 | Orders | **PASS (Automated API)** | Duplicate `idempotency_key` returns `200` with same `order_ref` and single stored record. |
| ORD-003 | Orders | **PASS (Automated API + E2E)** | Invalid BD phone and unknown SKU return `400` and create no order. |
| ORD-004 | Orders | **PASS (Automated API)** | Server ignores client-submitted prices/discounts and computes totals from catalog/DB rules. |
| ORD-005 | Orders | **PASS (Automated API + E2E)** | Unconfigured persistence returns `503`, preserves cart items in browser storage, and renders Messenger fallback alert. |
| ORD-006 | Orders | **PASS (Automated API + E2E)** | Matching `ref + phone` returns `200` redacted tracking response with masked name/phone & timeline. |
| ORD-007 | Orders | **PASS (Automated API + E2E)** | Admin confirms order (`pending -> confirmed`), logs audit trail, updates customer tracking status. |
| ORD-008 | Orders | **PASS (Automated API)** | Cancelling reserved order restores available stock (`available_stock: 0 -> 2`); shipping deducts stock permanently. |
| ORD-009 | Orders | **PASS (Playwright E2E)** | Admin table, courier partner/tracking fields, CSV export & invoice view functional. |
| ORD-010 | Orders | **PASS (Automated E2E)** | `/admin` KPI cards strictly separate `Leads / Pending Inquiries`, `Confirmed COD Pipeline`, and `Delivered (Realized Revenue)`. |
| MKT-001 | Advertising | **PASS (Automated Unit + API)** | `FIRST25`: 25%, min spend `2000`, max cap `500` verified. |
| MKT-002 | Advertising | **PASS (Automated Unit + API)** | `FARIZA200`: ৳200 fixed off, min spend `2000` verified. |
| MKT-003 | Advertising | **PASS (Automated Unit + API + Seed)** | `FREESHIP` min threshold aligned to `3000` across `commerce.js`, `seed.sql`, `02`, `03`; Dhaka `80` / Outside `150`. |
| MKT-004 | Advertising | **PASS (Automated API + E2E)** | `preview_no_token` returns `delivered: false`; `purchase_capi_sent_at` remains unset & outbox shows preview status. |
| MKT-005 | Advertising | **PASS (Automated API)** | Mock Meta `500` marks outbox `failed`; retry under Meta `200` delivers once with immutable `pur_<ref>` & sets `purchase_capi_sent_at`. |
| MKT-006 | Advertising | **PASS (Automated E2E + Code Audit)** | Client checkout fires `Lead` only on `201` success and blocks client `Purchase` calls (`403`). |
| MKT-007 | Advertising | **PASS (Mocked Graph)** / **BLOCKED LIVE TOKEN** | Live Graph API `200` receipt with real `META_CAPI_ACCESS_TOKEN` blocked outside sandbox without production Meta token. |
| MKT-008 | Advertising | **PASS (Automated API)** | Feeds (`/api/catalog-feed.csv|xml|json`) output only verified, price-approved, in-stock, non-archived SKUs. |
| MKT-009 | Advertising | **BLOCKED (External Meta Access)** | Meta Business Portfolio dataset (`1657670575734647`) access & client System User token transfer tracked in `docs/OWNERSHIP_AND_TRANSFER_REGISTER.md`. |
| MKT-010 | Advertising | **PASS (Automated API)** | `/products/:sku` & `/collections/:slug` render `<link rel="canonical">`, `og:url`, `og:image`, and JSON-LD Schema. |
| UI-001 | UX/SEO | **PASS (Playwright E2E)** | `360x780` checkout & storefront verified `0` horizontal overflow and full form usability. |
| UI-002 | UX/SEO | **PASS (Playwright E2E)** | `390x844` home & product pages verified `0` horizontal overflow & touch target sizing (`>= 44px` on coarse pointer). |
| UI-003 | UX/SEO | **PASS (Playwright E2E)** | `1440x900` desktop hero, Quick View `<dialog>`, shop, policies, checkout & `/admin` inspected via screenshots. |
| UI-004 | UX/SEO | **PASS (Playwright E2E)** | English and `বাংলা` toggle switches UI copy cleanly and renders bilingual Legal/Commercial policy cards. |
| UI-005 | UX/SEO | **PASS (Playwright E2E)** | Reduced-motion emulation tested (`360x780`); native `<dialog>` Esc dismissal & focus management; accessible form validation hints & `aria-invalid`/`aria-describedby`. |
| UI-006 | UX/SEO | **PASS (Playwright E2E + Code)** | Search overlay, shop filters, collections, and SKU deep links verified across 53+ SKUs. |
| UI-007 | UX/SEO | **NOT RUN LIVE HARDWARE** | Reduced-motion disables WebGL collection parallax & Three.js CSS/animation load; real budget Android FPS test pending client UAT device. |
| UI-008 | UX/SEO | **PASS (Automated + Code)** | All 53 primary images return `200` cleanly; fallback tile cards present for any missing optional slots. |
| UI-009 | UX/SEO | **PASS (Automated API)** | Canonical product/collection/policy SSR HTML, `/vendor/supabase.js` self-hosted UMD, and dynamic `/sitemap.xml` verified. |
| OPS-001..008, OPS-010 | Handover/Ops | **BLOCKED (External Client Actions)** | Requires live Node hosting, DNS cutover, Supabase SQL execution, backup drill, client staff training walkthrough, legal/courier sign-off & account transfer. |
| OPS-009 | Handover/Ops | **PASS (Local CI Suite)** | `npm run lint`, `npm test`, `npm audit --audit-level=high`, and `npm run test:e2e` execute cleanly on branch `release/client-handover-v1`. |
