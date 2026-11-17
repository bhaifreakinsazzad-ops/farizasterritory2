# Fariza's Territory — Production Release Fix Agent Directive

You are responsible for hardening and shipping `https://github.com/notrealenginellc/Fariza-s-Territory` for 53-product Bangladesh fashion + accessories sales. Read `RELEASE_AUDIT_AND_REMEDIATION_PLAN.md` first. Work from a new GitHub branch and create a PR; NEVER merge directly to `main` or modify production data without review.

## Source-of-truth and preservation
- Preserve existing branded UI/UX, SKU set, media files, selling-unit disclaimers and existing visual animation design. Do not rewrite the entire front end by default.
- Reconcile code with verified catalog, source PDFs, product manifest and seller-confirmed commercial data. Prices labeled `reference`/`suggested` are not approved. Do not invent missing contacts, stock, testimonials or payment methods.
- Strictly separate static production files from source PDFs/internal data in public assets.
- No browser-side service-role key, plain-text admin PIN, hardcoded secrets or optimistic fake order confirmation.

## Mandatory implementation work
1. Fix RLS policies and role grants for Supabase. Public can read approved catalog only; order PII and store admin settings require true authorization. Use server-side trusted order creation, role-verified staff mutations, and least privilege. Add tests proving unauthorized callers cannot list/read/update orders or mutate settings. Store migrations in repository; never blindly overwrite live data.
2. Replace PIN-based admin login with Supabase Auth and explicit admin-role enforcement on every API/database operation. Public admin HTML access alone must never give data access.
3. Replace unprotected `GET /api/orders`, `PATCH /api/orders/:ref`, and overwrite-on-POST logic. Validate payload server side, calculate item totals and delivery from approved SKU/stock records, enforce coupons, and use idempotency keys. Use durable database, not `.data/orders.json` or browser PII storage.
4. Fix `attribution` schema mismatch between Supabase client and migration; align every API field with actual DB schema, deploy test migration to staging, verify end-to-end persistence. Do not show 'registered' until server confirmation.
5. Choose ONE supported production host. For Vercel create platform-native order/feed/health routes (or deploy an actual persistent Express host). Verify every endpoint exists on the deployment target; revise Vercel/Netlify claims accordingly.
6. Implement secure order tracking: reference plus validated phone challenge or OTP; return limited fields only; test enumeration resistance and rate limits. Fix unescaped customer-controlled values interpolated in HTML.
7. Correct conversion funnel: PageView, ViewContent, Search, AddToCart, InitiateCheckout, Lead after stored inquiry; Purchase only at a server-verified commercial milestone with stable event ID. Remove public ability to send arbitrary CAPI events; verify event deduplication and non-test production mode. Use consent and privacy controls appropriate to target markets.
8. Fix marketing feed truth: no unconditional `in stock`, no unapproved prices, only live product URLs and accessible HTTPS media. Provide stable SEO routes with correct OG tags and dynamic sitemap.
9. Reconcile `FIRST25`, `FARIZA200`, `FREESHIP` with seller-approved threshold, cap, eligibility and shipping zones. Ensure the full client/server calculation matches under tests. Verify official contact URLs.
10. Add automated CI gates: static validation, dependency scanning, DB RLS tests, API auth/validation tests, Playwright mobile+desktop tests, image/route/SEO checks and advertising event tests. Add reproducible deployment/rollback instructions.

## Required proof and output
- Branch and PR with changes and risk-focused diffs, not a plan-only response.
- Migration and seed changes with staging rollout test and safe rollback strategy.
- A fixed `README.md` describing actual verified capabilities and honest limitations.
- Automated test logs showing no P0/P1 release blockers.
- Screenshots of mobile and desktop product browsing, cart, COD inquiry, order confirmation, tracking and staff fulfillment flow.
- A verified list of all 53 SKUs and 8 collections with correct public images.
- Verified authenticated admin access and 401/403 unauthorized access checks.
- Pixel/CAPI Test Events evidence: Lead once, Purchase only after verified milestone.
- Production candidate preview URL and route status reports; do not claim a release is live without a verified deployment.
- Seller sign-off checklist for final prices, stock, bundles/units, discounts, shipping and returns.

If external credentials, live database rights or hosting permissions are missing, complete all nonprivileged code and tests, mark the exact missing access and keep the release NO-GO. Do not improvise production secrets, pricing or stock.
