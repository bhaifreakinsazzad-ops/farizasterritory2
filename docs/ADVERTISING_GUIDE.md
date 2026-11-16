# Meta Advertising & Conversion Guide — Fariza's Territory

**Brand:** Fariza's Territory  
**Founders:** Faria & Saiful Islam Shuvo  
**Market:** Bangladesh (Dhaka & Nationwide)  
**Primary Channels:** Facebook, Instagram, Messenger & WhatsApp

---

## 1. Meta Pixel & Conversion Tracking Setup

The storefront includes built-in event tracking for the Meta Pixel (Facebook Pixel).

### How to Enable Meta Pixel
1. Get your Meta Pixel ID from [Meta Events Manager](https://business.facebook.com/events_manager2).
2. Enter your Pixel ID into `admin.html` under Settings, or set it in `assets/js/config.js`:
   ```javascript
   marketing: {
     metaPixelId: "YOUR_META_PIXEL_ID",
     ga4MeasurementId: "YOUR_GA4_ID"
   }
   ```
3. Once entered, the storefront automatically activates the Meta Pixel script and begins dispatching events.

---

## 2. Standard Events Dispatched by the Storefront

| Event Name | Trigger Point | Payload Data |
|---|---|---|
| `PageView` | On initial load and every route navigation | `{ page_name: "#/shop" }` |
| `ViewContent` | When customer views a product page | `{ content_name: title, content_ids: [sku], value: priceBDT, currency: 'BDT' }` |
| `AddToCart` | When customer clicks "Add to Bag" | `{ content_name: title, content_ids: [sku], value: priceBDT * qty, currency: 'BDT', num_items: qty }` |
| `InitiateCheckout` | When customer opens the Order Inquiry / Bag page | `{ content_ids: [sku1, sku2], num_items: count, value: subtotal, currency: 'BDT' }` |
| `Lead` / `Purchase` | When customer submits the inquiry form | `{ content_name: 'Boutique Order Inquiry', order_id: ref, value: total, currency: 'BDT' }` |

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
