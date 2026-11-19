# Fariza's Territory — Client Operations Manual

**Welcome Faria & Saiful Islam Shuvo!**  
This non-technical guide explains every daily workflow for operating the storefront and Boutique Command Center (`/admin`).

---

## 1. Signing In Safely

1. Open **`https://farizasterritory.com/admin`** (replace domain with your live URL).
2. Enter your **email** and **password** created in Supabase Auth.
3. Notice your role badge at the bottom-left:
   - **Admin (Owner):** Full access — order management, product prices/stock/approvals, adding new products & collections, photo uploads, coupons, Meta CAPI retries, store settings, staff roles, and audit logs.
   - **Staff (Order Operator):** Can view orders, create phone/Messenger manual orders, update courier status/tracking (`pending → confirmed → processing → shipped → delivered`), and search catalog/customers. Staff receives **Access Denied (403)** on pricing, approvals, coupons, settings, and CAPI retries.

---

## 2. Approving the 53 SKUs & Selling Units Before Ads Go Live

1. Open **Product Catalog** in `/admin` (or edit `docs/SELLER_53_SKU_LEDGER.csv` and have engineering generate `supabase/04_seller_approvals.sql`).
2. Click **Edit / Approve** next to a SKU:
   - Verify the **Price (BDT)** and **Stock Count**.
   - Confirm the **Selling Unit** matches reality (for example: `CAT-001` 3-Piece Set stitched/unstitched note; `FT-HM-*` single mirror excluding props; `FT-JWL-001/002/005` exact pieces included; `FT-BA-001` single chosen bangle; `FT-BA-011` single chosen pair).
   - Tick **Stock Physically Verified** and **Final Price Approved for Ad Feeds**, then click **Save Product & Approval**.
3. Only pieces with both boxes ticked, positive price, and stock `> 0` appear in `/api/catalog-feed.csv` and `/api/catalog-feed.xml` for Meta Commerce Manager.

---

## 3. Adding New Products, Collections & Uploading Photos (No Coding Required)

- **New Collection:** Click **+ Collection** in **Product Catalog**, set a lowercase slug (e.g., `eid-silk-2026`), English name, Bangla name, and click **Save Collection**.
- **New Product:** Click **+ Add New Product**, enter a unique uppercase SKU (e.g., `CAT-019`), select collection, set BDT price, initial stock count, selling unit, and save.
- **Upload / Replace Product Photo:** Open **Edit / Approve** on any product and click **Upload/Replace Photo** (`WebP`, `PNG`, or `JPEG` under 4 MB). Uploaded photos appear automatically on the product page, shop grid, and SEO previews.
- **Hide / Discontinue an Item:** Open **Edit / Approve** and tick **Archive / Hide from Storefront**, or set stock count to `0` (`Out of Stock`). Archiving keeps historical order receipts intact while hiding the SKU from shoppers.

---

## 4. Managing COD Orders & Meta `Purchase` Attribution

1. When a shopper places an order online, inventory is reserved automatically (`available = stock_count - reserved_count`) and the order enters **Pending** status.
2. Call or message the customer on Messenger/WhatsApp to verify address and sizing.
   - Items marked **Pending manual stock confirmation** had unverified stock counts when ordered — confirm physical availability before locking the order.
3. Open the order row in `/admin` and change status to **Confirmed** & click **Save Updates**:
   - The server automatically queues a deduplicated `Purchase` event (`pur_<ORDER_REF>`) in **CAPI Outbox**.
   - Once Meta confirms live receipt (`mode = live_production`), the order displays **`CAPI ✓`**.
   - If Meta returns an error or token isn't configured, inspect **CAPI Outbox** in `/admin` and click **Retry Now** after fixing credentials.
4. Enter **Courier Partner** (`Steadfast`, `Pathao`, or `RedX`) + **Tracking #**, then transition to **Shipped** (deducts stock permanently) and **Delivered** (counted in **Delivered Realized Revenue**).
5. If a buyer cancels before shipment, transition to **Cancelled** so reserved stock returns cleanly to inventory.

---

## 5. Vouchers, Delivery Zones & Official Support Channels

- Default fees: **Inside Dhaka ৳80** (`24–72 hrs`) · **Outside Dhaka ৳150** (`3–5 business days`).
- Default codes: **`FIRST25`** (25% off, min spend ৳2,000, max discount ৳500), **`FARIZA200`** (৳200 off, min spend ৳2,000), **`FREESHIP`** (free delivery above ৳3,000).
- Update **WhatsApp Business Number**, **Meta Pixel ID**, or banner text anytime under **Store Settings** (`Save Changes`). Leaving WhatsApp blank routes buyers automatically to `https://m.me/farizasterritory143`.
