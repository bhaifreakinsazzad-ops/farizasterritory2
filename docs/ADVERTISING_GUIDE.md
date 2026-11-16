# Meta Advertising & Conversion Guide — Fariza's Territory

**Brand:** Fariza's Territory  
**Founders:** Faria & Saiful Islam Shuvo  
**Market:** Bangladesh (Dhaka & Nationwide)  
**Primary Channels:** Facebook, Instagram, Messenger & WhatsApp

---

## 1. Meta Pixel & Conversions API (CAPI) Setup

The platform includes **Dual-Layer Conversion Tracking** combining both client-side Meta Pixel and server-side Conversions API (CAPI) on Vercel with automatic event deduplication (via matching `eventID`):

* **Dataset / Pixel ID:** `1657670575734647`
* **Test Event Code:** `TEST64994`
* **Vercel Serverless CAPI Endpoint:** `/api/capi`
* **CAPI Access Token:** Managed via Vercel Project Environment Variable (`META_CAPI_ACCESS_TOKEN`)

### How Dual-Layer Tracking Works:
1. **Client-Side Pixel:** Loaded in `<head>` of `index.html`, `admin.html`, and `ghl-bundle.html`. Fires real-time browser events (`PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`, `Lead`, `Contact`).
2. **Server-Side Conversions API (CAPI):** Dispatches identical events directly from the serverless edge to Meta Graph API (`https://graph.facebook.com/v19.0/1657670575734647/events`), bypassing ad blockers, Safari ITP, and network dropouts.
3. **Event Deduplication:** Every browser event and server event shares an identical `event_id` (e.g. `ft_atc_...` or the order reference `ORD-FT-...`). Meta automatically merges them, ensuring 100% accurate attribution without double-counting.
4. **Data Normalization & SHA-256 Hashing:** Customer phone numbers are normalized to E.164 (`88017XXXXXXXX`), emails are lowercase-trimmed, and names/cities are securely SHA-256 hashed to guarantee Event Match Quality (EMQ) scores of 8.5+ to 10 out of 10.

---

## 2. Standard Events Dispatched by the Storefront

| Event Name | Trigger Point | Meta Pixel Payload | CAPI Deduplication ID |
|---|---|---|---|
| `PageView` | On initial load and every SPA route change | `{ page_name: "#/shop" }` | `pv_timestamp_rand` |
| `ViewContent` | When customer views a product page | `{ content_name, content_ids: [sku], value, currency: 'BDT' }` | `vc_timestamp_rand` |
| `AddToCart` | When customer adds an item to bag | `{ content_name, content_ids: [sku], value: price * qty, num_items }` | `atc_timestamp_rand` |
| `InitiateCheckout` | When customer opens inquiry bag / checkout | `{ content_ids: [skus], num_items, value: subtotal, currency: 'BDT' }` | `ic_timestamp_rand` |
| `Purchase` | When customer submits order inquiry | `{ content_name, content_ids, num_items, value: total, order_id }` | Order Reference (`ORD-...`) |
| `Lead` | When customer submits inquiry | `{ content_name: 'Boutique Order Inquiry Lead', value: total }` | `ORD-..._lead` |
| `Contact` | When customer clicks WhatsApp or Messenger | `{ contact_channel: 'WhatsApp' \| 'Messenger' }` | `cnt_timestamp_rand` |

---

## 3. High-Converting Creative Assets in the Repository

The repository comes with pre-cropped, high-resolution photography ready for ad campaigns:

1. **Instagram & Facebook Stories / Reels (9:16 Aspect Ratio)**:
   - Located in: `assets/products/<SKU>/storyReel.webp`
   - Optimized for mobile vertical full-screen video and image carousels.
2. **Facebook Feed & Instagram Grid (1:1 Square Ratio)**:
   - Located in: `assets/products/<SKU>/socialSquare.webp`
   - Crisp focus on fabric patterns, color contrasts, and draping.
3. **Product Detail Close-Ups (1:1 Ratio)**:
   - Located in: `assets/products/<SKU>/detailA.webp` and `detailB.webp`
   - Highlights embroidery, mirror work, and neckline craftsmanship.
4. **AI Styling & Lifestyle Illustrations (4:5 Ratio)**:
   - Located in: `assets/products/<SKU>/aiStylingPreview.webp`
   - Gives lifestyle aesthetic context for premium positioning.

---

## 4. Recommended Meta Ad Campaigns for Bangladesh

### Campaign Strategy 1: Click-to-WhatsApp / Messenger Ad
- **Objective:** Leads / Messages
- **Placement:** Facebook Feed, Instagram Feed, Reels
- **Ad Copy:**
  > ✨ *এলিগ্যান্স যখন প্রতি ফ্যাব্রিকে ফুটে ওঠে।*  
  > ফারিজাস টেরিটরি (Fariza's Territory) নিয়ে এলো এক্সক্লুসিভ থ্রি-পিস কালেকশন — সুইস লন, বাটিক আর্ট ও কটন মিরর ওয়ার্ক।  
  > 🌸 প্রিমিয়াম ফেব্রিক ও ইউনিক ডিজাইন  
  > 🚚 ক্যাশ অন ডেলিভারি (ঢাকা ও সারা বাংলাদেশে)  
  > 🎁 প্রথম অর্ডারে আকর্ষণীয় অফার!  
  > সরাসরি মেসেজে অর্ডার করুন অথবা ভিজিট করুন আমাদের ওয়েবসাইট।
- **Destination:**
  - WhatsApp: `https://wa.me/8801XXXXXXXXX`
  - Or Website Product URL: `https://yourdomain.com/#/shop`

### Campaign Strategy 2: Catalog / Dynamic Product Ads (DPA)
- **Objective:** Sales / Conversions (Optimize for `AddToCart` or `Lead`)
- **Audience:**
  - Gender: Female
  - Age: 18 - 45
  - Locations: Dhaka, Chittagong, Sylhet, Rajshahi, Khulna
  - Interests: Aarong, Taaga, Yellow, Anjan's, Salwar Kameez, Boutique Clothing, Eid shopping, Lawn cloth.

---

## 5. Delivery & Trust Signals
Ensure your ad copy and landing page always highlight:
- **Cash on Delivery (COD)** available nationwide.
- **Inside Dhaka:** ৳80 delivery fee (1-2 days).
- **Outside Dhaka:** ৳150 delivery fee (2-4 days via Steadfast / Pathao / RedX courier).
- **Free delivery on 3+ pieces**.
- Direct seller verification before shipping.
