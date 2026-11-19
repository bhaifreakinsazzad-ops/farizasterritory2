# Meta Advertising, Consent & Conversion Tracking Guide — Fariza's Territory

**Dataset / Pixel ID:** `1657670575734647`  
**Market:** Bangladesh (Dhaka & Nationwide COD)

---

## 1. Privacy-First, Server-Verified Conversion Funnel

1. **Consent-Gated Browser Pixel**:
   - Storefront analytics (`assets/js/config.js` + `index.html`) wait for explicit visitor consent (`ft_analytics_consent === 'granted'`) via the consent bar before loading Meta Pixel (`fbq`), GA4, or calling `/api/capi`.
2. **Upper-Funnel & Inquiry Events (`/api/capi`)**:
   - Browser + CAPI share deduplicated `eventID`s for: `PageView`, `ViewContent`, `Search`, `AddToCart`, `AddToWishlist`, `InitiateCheckout`, `Contact`, `ApplyPromotion`, and `Lead`.
   - `Lead` fires **only after** `POST /api/orders` confirms durable persistence (`201`).
   - Public `/api/capi` rejects `Purchase` and `CompleteRegistration` with HTTP `403`, enforces origin checks, and ignores client-injected `test_event_code`.
3. **Authoritative Server-Side `Purchase` Event & Durable `capi_outbox`**:
   - Dispatched server-side via durable `public.capi_outbox` (`event_id = pur_<ORDER_REF>`) when boutique staff transitions a COD order to `confirmed`.
   - `purchase_capi_sent_at` is recorded **strictly and exclusively** when `mode === 'live_production'` AND Meta Graph API confirms positive receipt (`delivered === true`, `events_received >= 1`). `preview_no_token` (missing token) and HTTP 5xx errors stay queued in `capi_outbox` for automatic exponential-backoff retry or operator retry in **Admin ➔ CAPI Outbox**.
   - Authenticated owner test runs use `POST /api/admin/capi-test` (`403` for `staff` role).

---

## 2. Verified Catalog Feeds

- CSV feed: `/api/catalog-feed.csv`
- XML feed: `/api/catalog-feed.xml` (alias `/feed.xml`)
- JSON feed: `/api/catalog-feed.json`

All public feeds strictly filter through `FT_COMMERCE.isFeedEligibleProduct(product)` (`is_available === true`, `stock_verified === true`, `price_review === false`, `priceBDT > 0`), linking each item to its canonical SSR URL `/products/<SKU>`. Unverified/provisional SKUs remain excluded until signed off by the seller in Admin.

---

## 3. Pre-Campaign Gate

Do **not** launch paid conversion campaigns until all checks in [docs/SELLER_SIGNOFF_CHECKLIST.md](SELLER_SIGNOFF_CHECKLIST.md) and [docs/DEPLOYMENT_AND_ROLLBACK.md](DEPLOYMENT_AND_ROLLBACK.md) are green.
