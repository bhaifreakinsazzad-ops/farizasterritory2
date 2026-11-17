# FARIZA'S TERRITORY — SOURCE-VERIFIED PRODUCTION RELEASE AUDIT

**Audited**: 2026-11-17  
**Repository**: https://github.com/notrealenginellc/Fariza-s-Territory  
**Ref**: `main` at `818cb60f1cfa74bfc351278397e2c7d1ebd70652`  
**Release decision**: **NO-GO for paid advertising and production handling of customer PII**.

## Scope and limits
Read-only GitHub connector review of catalog, repository tree, storefront, admin, Express API, Vercel/Netlify routes, Meta CAPI, Supabase client/migration, configuration, tests and launch documentation. The GitHub connection has `pull: true`, `push: false`. Supabase project `vjbhrdclcnxevunskodm` could not be accessed (permission denied). The declared Vercel website could not be reached for live testing. `npm test`, browser E2E tests and deployed API checks have **not** been executed. Findings below are code-level and configuration-level evidence, not claims about the state of a separately altered live database.

## What is already usable
- The committed master catalog contains **53 unique SKUs: 18 fashion, 35 accessories, eight collections**, without duplicate SKU declarations.
- Image files exist for `assets/products/<SKU>/main.webp` for all 53 records; all 35 accessory `.webp` images exist.
- A working-looking boutique UX is implemented in source: hero carousel, product details, galleries, filters, wishlist, inquiry bag, Bengali support, accessories pairing, and local assets.
- Meta Pixel/CAPI code, catalogs, order tracking and admin panels are present **as source**, but their presence does not prove correct production behavior.

## Blockers — required before advertising

| ID | Severity | Source evidence | Problem | Required fix and acceptance |
|---|---|---|---|---|
| SEC-01 | **P0** | [`server.js` 130–185](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/server.js#L130-L185) | `GET /api/orders` returns all order records; `PATCH /api/orders/:orderRef` changes status without authentication; POST trusts values and can overwrite refs. | Remove unprotected endpoints immediately; authenticated admin-only list/update; public create limited and validated; no overwrite of existing orders; status transition checks; 401/403 negative tests. |
| SEC-02 | **P0** | [`01_initial_schema.sql` 120–165](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/supabase/migrations/01_initial_schema.sql#L120-L165) | RLS `FOR SELECT USING(true)` on orders and `FOR ALL USING(true)` policies with no role scope are inappropriate for customer PII/admin writes. Actual exposure depends on live grants/schema, which were inaccessible. | Restrict table privileges plus role-scoped RLS; remove public orders SELECT, admin FOR ALL; server-side order creation with scoped privileged key; authenticated server-trusted staff role; pgtap allow/deny tests; audit existing exposure. |
| SEC-03 | **P0** | [`admin.html` 1164–1218](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/admin.html#L1164-L1218); [`01_initial_schema.sql` store_settings](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/supabase/migrations/01_initial_schema.sql#L95-L112) | Admin protection is browser `localStorage`/`sessionStorage` PIN, fallback known default `1430`; a plain admin PIN field also resides in `store_settings`, which is marked public-readable. | Replace client PIN with Supabase Auth or hosted authentication; server-side admin claim/role enforcement; 2FA for owners; remove public PIN and client-only gate as security boundary. |
| SEC-04 | **P0** | [`supabaseClient.js` 231–297](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/supabaseClient.js#L231-L297); [`app.js` 2220–2314](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/app.js#L2220-L2314) | Client submits untrusted totals, discounts, shipping, status; store shows success without awaiting persistence; local fallback returns success even when cloud insert fails. | Trusted backend validates SKU/price/qty/voucher/delivery from server data; reject tampered totals; atomically store order; await result before confirmation; show distinct 'saved', 'pending offline', and 'failed' states. |
| DATA-01 | **P0** | [`supabaseClient.js` 240–261](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/supabaseClient.js#L240-L261); [`01_initial_schema.sql` 68–94](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/supabase/migrations/01_initial_schema.sql#L68-L94) | Client writes `attribution` field absent from committed `orders` table migration. A freshly provisioned DB would reject this write. | Add well-specified migration column or remove the field pending server ingestion; run schema-level integration test and verify persisted order/readback. |
| DEP-01 | **P0** | [`vercel.json`](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/vercel.json); [`server.js` routes](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/server.js#L130-L185); [`api/` directory](https://github.com/notrealenginellc/Fariza-s-Territory/tree/main/api) | Express defines `/api/orders`, feeds and health, but Vercel static/serverless rules target `/api/*` and the repository only contains `api/capi.js`; these Express routes are not assured on Vercel. File-backed `.data/orders.json` also cannot be treated as durable serverless storage. | Commit platform-native backend functions OR deploy the actual Express server to suitable Node hosting; single authoritative Supabase data store; integration-test every `/api/*` route on selected host. |
| SEC-05 | **P1** | [`supabaseClient.js` 372–414](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/supabaseClient.js#L372-L414) | Order lookup by reference or partial phone number directly selects entire order row and can reveal personal details. | Server-side status-only tracking by order ref + verified phone/OTP; no public all-column query; rate limit; prevent enumeration. |
| SEC-06 | **P1** | [`api/capi.js` 53–60, 100–115](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/api/capi.js#L53-L115) | CAPI endpoint accepts caller-supplied events with permissive CORS; unauthorized senders can pollute ad events if configured. Wildcard Origin with credentials header is inconsistent. | Validate trusted origin/context, restrict event types, apply rate limit/body schema, rely on server-confirmed conversions for economic events, use trusted platform config. |
| ADS-01 | **P1** | [`assets/js/config.js` 435–455](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/config.js#L435-L455); [`app.js` 2297–2314](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/app.js#L2297-L2314) | Both `Lead` and `Purchase` fire at *inquiry submission* before seller acceptance or successful persistence; reports can overcount sales. | Send `Lead/SubmitApplication` only after accepted inquiry persistence; send Purchase only when defined purchase milestone is server-verified, deduplicate by stable order ID; test Meta Event Manager. |
| ADS-02 | **P1** | [`server.js` 189–335](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/server.js#L189-L335) | All 53 catalog feed items are labeled `in stock` with provisional prices; stock status is not verified. Ad feeds depend on Express route availability and canonical URL. | Restrict feeds to seller-confirmed price/inventory/units; stable public HTTPS image URLs; verify retailer feed diagnostics and product URL 200s; serve feeds on deployment host. |
| OPS-01 | **P1** | [`catalogData.js` priceStatus](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/catalogData.js) and [`SOURCE_CONFLICTS...`](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/SOURCE_CONFLICTS_AND_UNKNOWN_FIELDS.md) | Fashion prices marked `reference`; accessory prices `suggested`. Seller approval/stock/correct selling-unit confirmation not proven. | Confirm final BDT price and actual stock for each of 53 SKUs, jewelry grouping, bangle pairs/single, shipping, discount eligibility; prevent checkout for unavailable items. |
| OPS-02 | **P1** | [`config.js` 25–33](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/config.js#L25-L33); [`store_settings` default](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/supabase/migrations/01_initial_schema.sql#L95-L112) | Placeholder WhatsApp number; `FREESHIP` threshold appears as 3,000 BDT while config threshold is 3,500 and DB default is 5,000. Coupon rules differ between sources. | Verify real official WhatsApp number, published promos, delivery zones/fees and cutoff; centralize offer policy in server DB and tests. |
| OPS-03 | **P1** | [`app.js` renderInqDone](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/app.js#L1253-L1275) | UI promises order 'recorded' and submitted to Supabase while network write is not awaited; Messenger copy/redirect alone does not guarantee delivery. | Only display confirmed order reference after server acknowledgment; preserve retryable draft otherwise; distinct CTA 'Send message' and acceptance statuses. |
| OPS-04 | **P1** | [`assets/js/supabaseClient.js` order writes](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/assets/js/supabaseClient.js#L232-L296) | Unprotected local copies of customer names, phone, addresses and order data retained in browser localStorage. | Retain minimal non-sensitive cart state; avoid local PII persistence or encrypt/server-session where truly needed; publish accurate privacy/retention policy. |
| QA-01 | **P1** | [GitHub Actions workflows](https://github.com/notrealenginellc/Fariza-s-Territory/actions); [`package.json`](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/package.json) | No workflow files or recorded runs at audit. `npm build`, `lint`, and `test` use lightweight asset/syntax checks, not browser end-to-end, security, or DB integration tests. | CI: syntax/lint, dependency audit, unit price/coupon tests, RLS tests, API auth tests, Playwright mobile & desktop, CAPI event assertions, preview smoke and production gate. |
| SEO-01 | **P2** | [`index.html` head](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/index.html#L1-L38); [`sitemap.xml`](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/sitemap.xml) | Shared root canonical/OG image is relative; static sitemap lists only homepage; dynamic URLs with fragments (`#`) are poor for product discovery. | Deploy stable `/products/<slug>` pages with server-rendered/product-specific metadata and absolute OG images; accurate sitemap, products schema, canonical URLs. |
| PERF-01 | **P2** | [`index.html` external scripts](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/index.html#L67-L88), `assets/js/threeHero.js` | Multiple third-party UI libraries, WebGL, and broad static asset corpus; actual Core Web Vitals untested. | Profile mobile throttled; lazy-load optional 3D, use reduced-motion and error fallback, defer unnecessary scripts, responsive image sizes; target p75 LCP <= 2.5s, INP <= 200ms, CLS <= 0.1. |
| DEP-02 | **P2** | [`netlify.toml`](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/netlify.toml) | Netlify catchall sends non-static paths to HTML; no Netlify function implementation of CAPI/order/feed routes is present. | Select one production host and implement its backend routes; do not advertise cross-host parity without platform-specific smoke tests. |
| SEC-07 | **P2** | [`server.js` 55–58](https://github.com/notrealenginellc/Fariza-s-Territory/blob/818cb60f1cfa74bfc351278397e2c7d1ebd70652/server.js#L55-L58) | Absolute feed URLs use forwarded host headers; should come from fixed canonical origin. | Configure `PUBLIC_SITE_URL` and trusted proxies; reject unexpected hosts. |
| REPO-01 | **P2** | [`public/assets/aistudio/`](https://github.com/notrealenginellc/Fariza-s-Territory/tree/main/public/assets/aistudio) | Large reference PDFs/HTML publicly shipped in production, expanding bandwidth and potentially confusing source-of-truth. | Move internal source materials to private storage or exclude from deployed public directory; preserve verified real photos and canonical manifests. |

## Recommended target architecture (minimal rebuild)
1. Keep brand UI, 53-SKU catalog, and media as visual foundation. **Do not rewrite the fashion interface solely for novelty.**
2. Pick one deployment target: Vercel (platform-native endpoints) or a persistent Node host (Express); make all backend functionality work on that target first.
3. Move critical operations to a server API: `POST /api/orders`, `POST /api/coupons/validate`, `GET /api/track` (ref + verified phone/OTP), authenticated `GET/PATCH /api/admin/orders`, price/stock updates.
4. Use managed Supabase as the durable order store; secret credential only server side; RLS and grants deny direct anonymous PII access. Admin uses Supabase Auth + server-enforced role, not PIN.
5. Server computes all economic figures from seller-approved catalog. Use order idempotency keys, verified stock rules, transaction-safe state changes and event logs.
6. Use Meta Pixel for browser intent events. A **real** inquiry yields Lead only after persisted. A confirmed business sale yields Purchase based on chosen COD milestone and cancellation policy; server-side CAPI protected.
7. Generate catalog feeds from approved products and verified pricing only. Provide canonical stable product URLs and public HTTPS images.
8. Keep WhatsApp/Messenger as assisted sales channels. If no official WhatsApp is configured, show Messenger only and avoid fake phone numbers.

## Five release gates

### Gate 1 — Privacy and security (mandatory)
- [ ] Anonymous visitor cannot read order listing, PII, admin settings or any admin write path.
- [ ] Every privileged endpoint enforces authenticated staff authorization server-side.
- [ ] Order tracking returns minimal status only after verified ownership challenge.
- [ ] CAPI and order endpoints have validation, abuse protection and origin rules.
- [ ] Test any incident exposure of preexisting order records and rotate admin credentials if relevant.

### Gate 2 — Commercial truth (mandatory)
- [ ] All 53 SKU names, images and selling units verified.
- [ ] All 53 prices approved in BDT; stock verified, zero-stock products blocked.
- [ ] One canonical coupon policy: `FIRST25`, `FARIZA200`, `FREESHIP` as actually authorized; tested min spend and max cap.
- [ ] COD zones, delivery charges and support contacts verified; public returns/exchange/privacy policies confirmed by owner.

### Gate 3 — Order lifecycle (mandatory)
- [ ] Anonymous real-world order saves once to database and returns a durable reference after persistence.
- [ ] Browser refresh/other device/admin dashboard sees the same order.
- [ ] A failed database write never displays 'recorded/success' as final.
- [ ] Tampered subtotal, coupon, shipping, order status, reference and qty are rejected or safely recalculated.
- [ ] Track status requires ref + verified customer info and reveals no other customer details.

### Gate 4 — Marketing integrity (mandatory)
- [ ] Meta Test Events show one deduplicated Lead for accepted inquiry and **no Purchase on unaccepted inquiry**.
- [ ] Server-origin Purchase only from trusted order state.
- [ ] Feed returns correct active/approved SKUs with 200 image URLs, live product pages, accurate stock and final prices.
- [ ] Domain verification, privacy disclosures, consent handling, Pixel/CAPI destination and UTM attribution checked.

### Gate 5 — Deployment, performance and advertising (mandatory)
- [ ] All production API routes respond correctly on selected host; avoid serverless filesystem storage.
- [ ] Continuous integration and automated security/checkout tests pass; no hardcoded admin defaults.
- [ ] Mobile E2E order flow, multiple viewport checks, accessibility, broken images and Core Web Vitals tested.
- [ ] Seller performs test inquiry, dashboard acceptance, COD fulfillment and customer notification.
- [ ] Ad links tested in in-app Facebook/Instagram browsers; only then start limited-budget conversion experiment.

## Suggested fix order and responsibilities

**Phase 0: Emergency containment** — disable unprotected order API, remove public PII policies, remove default PIN auth; review existing exposure; freeze ads.

**Phase 1: Durable commerce backend** — choose host, implement authenticated server functions, validate payloads, repair schema mismatch, implement idempotency, stock/pricing rules, status tracking and accurate UX.

**Phase 2: Revenue instrumentation** — correct Lead/Purchase definitions, lock CAPI, confirm Meta Pixel and event dedupe, verify catalog feeds and domain.

**Phase 3: Commercial merchandising** — approve all 53 SKU prices, stock and accessories selling units; shipping/returns; trust pages and promo messages.

**Phase 4: QA and launch** — CI, Playwright, mobile accessibility, load/performance, security regression tests, preview deployment, owner sign-off, low-budget ads pilot and verified conversion review.

## Final release definition
**Publish only after all P0s and high-impact P1s above are closed with reproducible tests.** A polished UI and a 53-item file manifest are not substitutes for secure persistence, truthful catalog claims, and trustworthy ad attribution.

## Access restrictions encountered
- GitHub connector is **read-only**, so no branches, commits, issues or PRs were written.
- The referenced Supabase project's live database/advisors returned **permission denied**; schema findings concern repository SQL.
- The declared Vercel URL was not accessible for live testing through the available browsing tool.
- Tests described in the repository were **inspected but not executed** in this audit.
