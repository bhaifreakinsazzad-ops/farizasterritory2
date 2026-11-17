# Fariza's Territory — Technical Architecture & Security Architecture

**Brand:** Fariza's Territory  
**Canonical Production Runtime:** Persistent Node.js 20+ / Express (`server.js`) + Managed Supabase PostgreSQL + Supabase Auth

---

## 1. Architectural Principles

1. **Single Canonical Node.js + Express Backend**:
   - `server.js` exports `createApp({ store, catalog, capiSender })` and binds port `3000` (`process.env.PORT`) when executed directly.
   - Contradictory static catch-all configs (`vercel.json`, `netlify.toml`) were removed; all public storefront, SEO SSR routes, order APIs, tracking, feeds, and admin APIs run from one Express host backed by Supabase.
2. **Fail-Closed Durable Persistence (Zero Browser PII / Zero `.data/orders.json`)**:
   - Orders write exclusively through `POST /api/orders` -> `lib/supabaseServer.js` using server-only `SUPABASE_SERVICE_ROLE_KEY`.
   - When durable DB credentials are absent, order creation fails closed with HTTP `503` and preserves the shopper's bag intact for retry — never displaying fake order confirmation.
3. **Server-Authoritative Pricing, Zones & Coupons (`assets/js/commerce.js`)**:
   - Shared UMD module `FT_COMMERCE` enforces identical logic in browser preview and Express APIs:
     - Bangladesh mobile validation (`01[3-9]XXXXXXXX`)
     - Zones: Dhaka `৳80` / Outside Dhaka `৳150`
     - Coupons: `FIRST25` (25%, min ৳2,000, cap ৳500), `FARIZA200` (৳200 off, min ৳2,000), `FREESHIP` (free shipping ≥ ৳3,000)
     - Client-supplied prices, subtotals, totals, or statuses are discarded/recomputed server-side.
4. **Supabase Auth & Staff RBAC**:
   - `admin.html` authenticates via Supabase Auth email/password and passes `Authorization: Bearer <jwt>` to `/api/admin/*`.
   - `lib/supabaseServer.js` validates the JWT with `auth.getUser(token)` and checks `public.staff_users` (`is_active = true`, `role IN ('admin','staff')`).
5. **Dual-Factor Redacted Tracking (`GET|POST /api/track`)**:
   - Requires both `order_ref` and matching customer phone; enforces per-IP rate limiting; masks names/phones and omits street addresses.
6. **Consent-Gated Pixel & Privileged Server-Side `Purchase` CAPI**:
   - Browser tracking (`index.html`, `assets/js/config.js`) activates only when `ft_analytics_consent === 'granted'`.
   - Public `POST /api/capi` restricts callers to upper-funnel events (`PageView`, `ViewContent`, `Search`, `AddToCart`, `AddToWishlist`, `InitiateCheckout`, `Contact`, `ApplyPromotion`, `Lead`) and ignores `test_event_code` injection.
   - `Purchase` fires strictly server-side once when Admin transitions a verified COD order to `confirmed` (recorded via `purchase_capi_sent_at`).
7. **SSR SEO & Internal Asset Isolation**:
   - `GET /products/:sku` and `GET /collections/:slug` inject per-route `<title>`, `<link rel="canonical">`, OpenGraph meta tags, Schema.org JSON-LD, and `window.__FT_INITIAL_ROUTE__`.
   - `server.js` blocks public access (`404`) to internal audit markdown/CSVs/HTML dumps under `/assets/aistudio/` while permitting only the official Brand Book PDF.

---

## 2. API & Route Inventory

| Route | Auth | Purpose |
|---|---|---|
| `GET /` / `/products/:sku` / `/collections/:slug` | Public | SSR SEO storefront & deep-linked SKU/collection views (`404` on unknown SKU/slug) |
| `GET /robots.txt` / `/sitemap.xml` | Public | Canonical crawler directives and dynamic 62-URL XML sitemap |
| `GET /api/health` | Public | Safe runtime health & catalog count summary (no secrets) |
| `GET /api/public-config` | Public | Non-secret runtime config, delivery fees, active Messenger/WhatsApp state |
| `GET /api/catalog` | Public | Live price & availability overlay merged over the 53 verified SKUs |
| `POST /api/coupons/validate` | Public (rate-limited) | Server-authoritative voucher validation |
| `POST /api/orders` | Public (rate-limited) | Authoritative idempotent COD order creation (`201`/`200`/`400`/`503`) |
| `GET\|POST /api/track` | Public (rate-limited) | Order Ref + matching phone challenge returning redacted tracking status |
| `GET\|POST /api/capi` | Public (origin & rate-limited) | Upper-funnel CAPI events (`Purchase` blocked with `403`) |
| `GET /api/catalog-feed.csv\|xml\|json` | Public | Filtered feeds publishing ONLY `stock_verified && !price_review` SKUs |
| `GET /api/auth/session` | Staff Bearer JWT | Verifies admin/staff session (`401`/`403`) |
| `GET\|POST /api/admin/orders` | Staff Bearer JWT | Lists customer orders & creates verified manual staff orders |
| `PATCH /api/admin/orders/:orderRef` | Staff Bearer JWT | Validates status transitions; dispatches idempotent `Purchase` CAPI on `confirmed` |
| `GET /api/admin/catalog` & `PATCH /api/admin/products/:sku` | Staff Bearer JWT | Catalog stock/price approval toggles (`stock_verified`, `price_review`, `stock_count`) |
| `GET\|POST /api/admin/coupons` | Staff Bearer JWT | Manage discount vouchers |
| `GET\|PUT /api/admin/settings` | Staff Bearer JWT | Manage non-secret storefront settings |
| `POST /api/admin/capi-test` | Staff Bearer JWT | Trigger authenticated CAPI test event |
