# Fariza's Territory — Technical Architecture & Engineering Documentation

**Brand:** Fariza's Territory  
**Platform Version:** 2.0.0 Production  
**Stack:** Vanilla Modern JavaScript (ES6+), Supabase PostgreSQL, Motion.dev, Anime.js, Scoped CSS3 Architecture

---

## 1. Architectural Philosophy

Fariza's Territory is designed with five core engineering principles:

1. **Zero-Build, Instant Deployment**:
   - The application runs purely in the browser using modern ES6+ standards without requiring a complex Webpack/Vite bundler build step to run or deploy.
   - It can be hosted immediately on GitHub Pages, Vercel, Netlify, Cloudflare Pages, or dropped into a GoHighLevel funnel.

2. **Offline-First & Resilient Continuity**:
   - Even if the Supabase anon key is not yet set or the user is in an area with spotty network connectivity, the application continues to run flawlessly.
   - Products are served instantly from the verified client catalog fallback.
   - Orders are queued in browser `localStorage` and synchronized automatically when connection to Supabase is established.

3. **High-Speed Static Media Delivery**:
   - Studio product and accessory photos are served as standalone optimized `.webp` images with progressive loading.
   - This keeps page bundles fast and enables browser-level lazy loading (`loading="lazy"`), caching, and edge CDN distribution.

4. **Bi-directional Order Routing**:
   - Every order submitted through the boutique storefront is simultaneously:
     1. Inserted into Supabase table `public.orders` with full line item details and pricing.
     2. Formatted for direct transmission via WhatsApp API (`https://wa.me/...`) and Facebook Messenger (`https://m.me/farizasterritory143`).
     3. Available in `admin.html` for status updates, dispatch tracking, and fulfillment.

5. **Integrated Advertising Telemetry**:
   - Built-in Meta Pixel (Facebook Pixel) and Google Analytics 4 event dispatcher that tracks user journeys across catalog browsing, cart operations, checkout initiation, and lead completion.

---

## 2. Directory Structure

```
Fariza-s-Territory/
├── index.html                  # Main production boutique web storefront
├── admin.html                  # Boutique Order & Catalog Management Dashboard
├── ghl-bundle.html             # GoHighLevel custom code drop-in block
├── assets/
│   ├── css/
│   │   └── style.css           # Luxury boutique styling, animations, responsive design
│   ├── js/
│   │   ├── config.js           # Brand config, Supabase URL, Meta Pixel, CAPI, GA4 Analytics
│   │   ├── supabaseClient.js   # Supabase client wrapper & database CRUD operations
│   │   ├── catalogData.js      # Verified catalog data, 53 products across 8 collections
│   │   ├── threeHero.js        # Three.js hero canvas animation
│   │   ├── animePolish.js      # Motion & ripple micro-interactions
│   │   └── app.js              # Complete boutique e-commerce application logic & routing
│   ├── brand/
│   │   └── brand_logo_1.webp   # Fariza's Territory official luxury brand mark
│   ├── accessories/            # 35 artisan accessory .webp & .jpg images (FT-HM/JWL/BA)
│   └── products/
│       ├── CAT-001/ ... CAT-018/
│       │   ├── main.webp
│       │   ├── original.webp
│       │   ├── alternate.webp
│       │   ├── socialSquare.webp
│       │   ├── storyReel.webp
│       │   ├── detailA.webp
│       │   ├── detailB.webp
│       │   └── aiStylingPreview.webp
├── robots.txt                  # Search engine crawler directives (blocks /admin)
├── sitemap.xml                 # XML sitemap
├── supabase/
│   ├── migrations/
│   │   └── 01_initial_schema.sql # Complete Supabase PostgreSQL schema with RLS and indexes
│   └── seed.sql                # Seed script with collections, products & active coupons
├── docs/
│   ├── SUPABASE_SETUP.md       # Step-by-step database setup guide
│   ├── ADVERTISING_GUIDE.md    # Meta Pixel & Facebook Ad campaign setup guide
│   └── ARCHITECTURE.md         # Technical architecture documentation
├── README.md                   # Comprehensive repository documentation
├── vercel.json                 # Vercel deployment configuration
├── netlify.toml                # Netlify deployment configuration
└── package.json                # Project metadata & local dev scripts
```

---

## 3. Database Schema

### Entity-Relationship Diagram

```
+--------------------+           +----------------------+
|    collections     | 1       * |       products       |
|--------------------|-----------|----------------------|
| id (PK, TEXT)      |           | sku (PK, TEXT)       |
| name (TEXT)        |           | collection_id (FK)   |
| short_name (TEXT)  |           | title (TEXT)         |
| folder (TEXT)      |           | title_bn (TEXT)      |
| accent_color (TEXT)|           | slug (TEXT)          |
| note (TEXT)        |           | price_bdt (NUMERIC)  |
| created_at (TZ)    |           | description_bn (TEXT)|
+--------------------+           | kameez_bn (TEXT)     |
                                 | salwar_bn (TEXT)     |
                                 | dupatta_bn (TEXT)    |
                                 | fabric_claim (TEXT)  |
                                 | stitching (TEXT)     |
                                 | stock_verified (BOOL)|
                                 | is_available (BOOL)  |
                                 | accent_color (TEXT)  |
                                 | is_featured (BOOL)   |
                                 +----------------------+
                                             | 1
                                             |
                                             | *
                                 +----------------------+
                                 |    product_assets    |
                                 |----------------------|
                                 | id (PK, UUID)        |
                                 | product_sku (FK)     |
                                 | asset_key (TEXT)     |
                                 | asset_url (TEXT)     |
                                 | ratio (TEXT)         |
                                 | label (TEXT)         |
                                 +----------------------+

+------------------------+       +------------------------+
|         orders         |       |     store_settings     |
|------------------------|       |------------------------|
| id (PK, UUID)          |       | id (PK, TEXT)          |
| order_ref (TEXT, UK)   |       | store_name (TEXT)      |
| customer_name (TEXT)   |       | tagline (TEXT)         |
| customer_phone (TEXT)  |       | whatsapp_number (TEXT) |
| customer_address (TEXT)|       | messenger_username (TX)|
| delivery_zone (TEXT)   |       | facebook_url (TEXT)    |
| delivery_fee (NUMERIC) |       | meta_pixel_id (TEXT)   |
| subtotal (NUMERIC)     |       | ga4_measurement_id (TX)|
| total (NUMERIC)        |       | delivery_fee_dhaka     |
| payment_method (TEXT)  |       | delivery_fee_outside   |
| items (JSONB)          |       | promo_text (TEXT)      |
| status (TEXT)          |       +------------------------+
| customer_notes (TEXT)  |
| source (TEXT)          |
| created_at (TZ)        |
| updated_at (TZ)        |
+------------------------+
```

---

## 4. API and Event Life Cycle

1. **Catalog Load**:
   - `assets/js/catalogData.js` registers `window.FT_CATALOG`.
   - `assets/js/app.js` checks `window.FT_SUPABASE.getProducts()`.
   - If connected, synchronizes live prices and availability; otherwise serves verified static catalog.

2. **Inquiry / Order Flow**:
   - Customer adds items to Inquiry Bag (`ft_bag` in `localStorage`).
   - Customer navigates to `#/inquiry`.
   - On submission:
     1. Form fields validated (Phone, Name, District, Address).
     2. Unique reference generated: `FT-YYMMDD-XXXX`.
     3. Delivery fee calculated: ৳80 (Dhaka) or ৳150 (Outside Dhaka).
     4. Record saved to Supabase `orders` table (with local queue backup).
     5. Telemetry fired: `Purchase` (`eventID = orderRef`) + `Lead` (`eventID = orderRef + '_lead'`) across Meta Pixel, CAPI `/api/capi`, and GA4.
     6. Success screen shows pre-filled WhatsApp (with Messenger fallback when placeholder) dispatch buttons.
