# Fariza's Territory — Seller Sign-Off Checklist

**Release Status Gate:** **NO-GO** for paid advertising & live public checkout until **every box below** is verified and signed by **Faria & Saiful Islam Shuvo**.

---

## 1. Official Channels & Support Policy
- [ ] **Official Business WhatsApp Number**: Currently unset (`8801700000000` placeholder disabled; storefront routes cleanly to `https://m.me/farizasterritory143`). Provide real active Bangladesh WhatsApp Business number (e.g., `8801XXXXXXXXX`) in **Admin ➔ Store Settings**.
- [ ] **Facebook Messenger**: Confirm active monitoring of `https://www.facebook.com/farizasterritory143` (`farizasterritory143`).
- [ ] **Return, Exchange & Cancellation Policy**: Confirm unboxing video / return window rules displayed to COD buyers before confirmation.

## 2. Commercial Catalog Truth (All 53 SKUs)
Use **Admin ➔ Catalog & Stock** (or Supabase `public.products`) to verify and mark `stock_verified = true` and `price_review = false` per SKU before enabling paid Meta catalog ads:

### Pillar I — Fashion Three-Piece Dresses (18 SKUs)
Source prices (`1,650–2,450 BDT`) are provisional catalog reference prices and require confirmation:
- [ ] `CAT-001` — Magenta Plum Printed Three Piece (`Aarong — Seller Label`, ref ৳2,350) — confirm final BDT, stock, and seller-label disclaimer acceptance
- [ ] `CAT-002`, `CAT-003` — Alfi Boutique (`02`) final BDT & stock
- [ ] `CAT-004` through `CAT-007` — Mome Boutique (`03`) final BDT & stock
- [ ] `CAT-008` through `CAT-013` — Zam Zam Swiss Lawn (`04`) final BDT & stock
- [ ] `CAT-014` through `CAT-018` — Cotton Mirror & Embroidery (`05`) final BDT & stock

### Pillar II — Artisan Accessories (35 SKUs)
Source PDF prices are suggested launch prices:
- [ ] `FT-HM-001` through `FT-HM-005` — Decorative Mirrors (Single mirror per unit; props excluded): confirm final BDT & stock
- [ ] `FT-JWL-001`, `FT-JWL-002`, `FT-JWL-005` — **High-Risk Pictured Groupings**: confirm exact included pieces (pendant + earrings + ring vs. single necklace) before dispatch
- [ ] `FT-JWL-003`, `FT-JWL-004`, `FT-JWL-006` through `FT-JWL-019` — Artisan Pendants & Jewelry: confirm final BDT & stock
- [ ] `FT-BA-001` — **High-Risk Tray Photo**: confirm selling unit strictly as **1 single chosen bangle** (৳219 suggested), NOT tray
- [ ] `FT-BA-002`, `FT-BA-007`, `FT-BA-008` — Confirm **1 pair (2 bangles)** pricing & stock
- [ ] `FT-BA-003` — Confirm **1 wide statement bangle** (folk medallion prop excluded)
- [ ] `FT-BA-004`, `FT-BA-005`, `FT-BA-006`, `FT-BA-009`, `FT-BA-010` — Confirm **3-bangle set** pricing & stock
- [ ] `FT-BA-011` — Confirm **1 chosen colorway pair (2 bangles)**, NOT all 4 colorways

## 3. Pricing, Delivery & Coupons Sign-Off
- [ ] **Delivery Inside Dhaka**: ৳80 (1–2 days via Steadfast / Pathao / RedX)
- [ ] **Delivery Outside Dhaka**: ৳150 (2–4 days via courier)
- [ ] **Coupon Policy**:
  - `FIRST25` — 25% off, min spend ৳2,000, max discount ৳500
  - `FARIZA200` — ৳200 off, min spend ৳2,000
  - `FREESHIP` — Free delivery on orders ≥ ৳3,000
- [ ] **Cash on Delivery Milestone**: Confirm `Purchase` conversion fires strictly when Admin marks order `confirmed` (after customer verification), never on unverified inquiry submit.

## 4. Production Smoke Sign-Off
- [ ] **Live Supabase Migration & RLS Test**: `02_security_hardening.sql` and `supabase/tests/rls_security.test.sql` passed against live `vjbhrdclcnxevunskodm` DB.
- [ ] **First Admin Login Verified**: Staff email added to `auth.users` & `public.staff_users` (`role = 'admin'`), logged in cleanly via `/admin`.
- [ ] **End-to-End Dry Run**: Test inquiry submitted on mobile -> visible in Admin -> marked `confirmed` -> Meta Events Manager shows 1 `Lead` + 1 `Purchase`.

**Signed Off By:** ___________________________ **Date:** _______________
