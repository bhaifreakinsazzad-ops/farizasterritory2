# Fariza's Territory — Luxury Fashion & Boutique E-Commerce Platform

> **Fashion & Accessories Brand by Faria & Saiful Islam Shuvo**  
> *Elegance in Every Detail. Made in Mirpur, Dhaka, Bangladesh.*  
> **Database:** [Supabase PostgreSQL (vjbhrdclcnxevunskodm)](https://vjbhrdclcnxevunskodm.supabase.co)  
> **Repository:** [https://github.com/notrealenginellc/Fariza-s-Territory](https://github.com/notrealenginellc/Fariza-s-Territory)

---

## 🌟 Overview

**Fariza's Territory** is a bespoke, high-performance boutique e-commerce web platform engineered for luxury Bangladeshi three-piece fashion. Featuring artisanal prints, authentic embroidery, verified BDT pricing, and seamless multi-channel ordering via **Supabase Database**, **WhatsApp**, and **Facebook Messenger**.

The platform is designed to be **100% production-ready for general public access and advertising campaigns**.

---

## ✨ Key Features & Facilities

### 🛍️ Luxury Boutique Storefront (`index.html`)
- **Curated Collections**: 5 boutique lines (Aarong Seller Label, Alfi Boutique Batik, Mome Noir, Zam Zam Swiss Lawn, Cotton Mirror & Embroidery).
- **18 Studio-Verified Pieces**: Detailed bilingual descriptions (English & Bengali), authentic fabric breakdown (Kameez, Salwar, Dupatta), and verified BDT pricing (৳1,650 – ৳2,450).
- **140 High-Resolution WebP Images**: 8 custom perspectives/crops per product (Main, Original, Alternate, Social Square 1:1, Story/Reel 9:16, Close-up Detail A & B, and AI Styling Illustrations).
- **Interactive Hero Carousel & 3D Fluid Lightbox**: Touch-friendly, 60fps hardware-accelerated fluid zoom using Motion.dev & Anime.js.
- **Inquiry & Checkout Engine**: Fast client bag, Dhaka (৳80) / Outside Dhaka (৳150) delivery calculation, Cash on Delivery support, and automated unique order reference generation (`FT-YYMMDD-XXXX`).
- **Promotional Coupons & Voucher Codes**: Real-time discount application at checkout (`FIRST25` for up to 25% off, `FREESHIP` for free shipping, `FARIZA200` for ৳200 welcome gift).
- **Live Customer Order Tracking (`#/track` & `#/track/:ref`)**: Dedicated order lookup page where customers can enter their Order Reference or phone number to view live verification, workshop tailoring, and courier tracking status!

### 📊 Comprehensive Boutique Admin Dashboard (`admin.html`)
- **Multi-Tab Command Center**:
  - 📦 **Orders & Inquiries Pipeline**: Filter by status (`Pending`, `Confirmed`, `Processing`, `Shipped`, `Delivered`, `Cancelled`) and zone (`Dhaka` / `Outside Dhaka`), search by customer name, phone or reference, and view line item breakdowns.
  - 🖨️ **Print Invoice & Packing Slips**: One-click generation of branded, print-ready A4/thermal invoice receipts with customer delivery addresses, line items, and courier COD cash collection amounts.
  - 🚚 **Courier Dispatch Helper**: Formatted one-click copy for pasting into **Steadfast Courier**, **Pathao Courier**, or **RedX** merchant panels.
  - 💬 **One-Click WhatsApp Templates**: Pre-filled customer outreach messages for Order Confirmation, Courier Tracking ID, and Delivery Complete.
  - 📝 **Manual Order Creation**: Form for the boutique team to manually enter orders placed over phone calls, Facebook DMs, or physical visits.
  - 📥 **Export to CSV**: Download all orders into an Excel/Google Sheets-compatible `.csv` file.
  - 👗 **Product Catalog & Stock Controls**: View all 18 pieces, check pricing, and toggle in-stock/out-of-stock.
  - 🏷️ **Coupon Code Manager**: Create, edit, and toggle discount vouchers with minimum spend and percentage/fixed rules.
  - 👥 **Customer CRM**: Searchable directory of past shoppers with order counts, lifetime spend, and direct WhatsApp chat links.
  - ⚙️ **Storefront & Database Settings**: Manage Supabase keys, WhatsApp number, Facebook Messenger handle, Meta Pixel ID, and promo announcement bar.

### 🗄️ Supabase Cloud Database Integration
- **Real-time Order Recording**: Every customer order inquiry is automatically stored in the Supabase PostgreSQL `orders` table.
- **Relational Catalog Architecture**: Normalized schema with `collections`, `products`, `product_assets`, `coupons`, `orders`, and `store_settings`.
- **Row Level Security (RLS)**: Public read access for catalog browsing, public insert access for shopper orders, and authenticated admin privileges.
- **Offline-First Resilience**: If the database key is pending or offline, orders are safely stored in browser `localStorage` and queued for sync.

### 🎯 Ready for Advertising & Growth
- **Built-in Meta Pixel (Facebook Pixel)**: Automatic tracking for `PageView`, `ViewContent`, `AddToCart`, `InitiateCheckout`, and `Lead` / `Purchase` events.
- **OpenGraph & Twitter Card Tags**: Rich preview cards with images when shared on WhatsApp, Facebook, Instagram, and Twitter.
- **Schema.org Structured Data**: JSON-LD `ClothingStore` and `Product` markup for Google search engine indexing and Meta catalog feeds.
- **Floating WhatsApp Order CTA**: Sticky mobile-responsive button for quick ordering and customer inquiries.

---

## 📁 Repository Structure

```
.
├── index.html                  # Main production boutique web storefront (with Order Tracking & Coupons)
├── admin.html                  # Full-featured Boutique Admin Dashboard & Order Command Center
├── ghl-bundle.html             # GoHighLevel custom code drop-in block
├── assets/
│   ├── css/
│   │   └── style.css           # Luxury boutique styling, animations, responsive design
│   ├── js/
│   │   ├── config.js           # Brand config, Supabase URL, Meta Pixel, Analytics
│   │   ├── supabaseClient.js   # Supabase client wrapper & database CRUD operations
│   │   ├── catalogData.js      # Verified catalog data, 18 products across 5 collections
│   │   └── app.js              # Complete boutique e-commerce application logic & routing
│   ├── brand/
│   │   └── brand_logo_1.webp   # Fariza's Territory official luxury brand mark
│   └── products/
│       ├── CAT-001/ ... CAT-018/ (140 high-resolution WebP product photos)
├── supabase/
│   ├── migrations/
│   │   └── 01_initial_schema.sql # PostgreSQL schema DDL with RLS and indexes
│   └── seed.sql                # Seed script with 5 collections, 18 products, coupons & sample orders
├── docs/
│   ├── SUPABASE_SETUP.md       # Step-by-step database setup guide
│   ├── ADVERTISING_GUIDE.md    # Meta Pixel & Facebook Ad campaign setup guide
│   └── ARCHITECTURE.md         # Technical architecture documentation
├── README.md                   # Repository documentation
├── vercel.json                 # Vercel deployment configuration
├── netlify.toml                # Netlify deployment configuration
└── package.json                # Project metadata & local dev scripts
```

---

## 🚀 Quick Start Guide

### 1. Run Locally
```bash
git clone https://github.com/notrealenginellc/Fariza-s-Territory.git
cd Fariza-s-Territory

# Start local server (Node.js)
npm start
# Or using Python
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) for the storefront and [http://localhost:3000/admin.html](http://localhost:3000/admin.html) for the admin dashboard.

---

### 2. Configure Supabase Database
1. Go to your Supabase project: [https://supabase.com/dashboard/project/vjbhrdclcnxevunskodm](https://supabase.com/dashboard/project/vjbhrdclcnxevunskodm)
2. In the **SQL Editor**, execute `supabase/migrations/01_initial_schema.sql`.
3. In the **SQL Editor**, execute `supabase/seed.sql` to populate products, coupons, and orders.
4. Copy your project **anon key** from **Project Settings ➔ API**.
5. Open `admin.html`, go to **Store Settings**, paste the anon key, and click **Save Changes**.
6. Full guide available in [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

---

### 3. Launch Advertising
1. Enter your **Meta Pixel ID** in `admin.html` (or `assets/js/config.js`).
2. Run Facebook/Instagram Click-to-WhatsApp or Conversion ads targeting women interested in boutique fashion in Dhaka and nationwide.
3. Use the pre-cropped story/reel assets in `assets/products/<SKU>/storyReel.webp` and feed squares in `assets/products/<SKU>/socialSquare.webp`.
4. Full guide available in [docs/ADVERTISING_GUIDE.md](docs/ADVERTISING_GUIDE.md).

---

## 🌐 Deployment Options

- **Vercel**: Configured via `vercel.json` (`/admin` routes directly to `admin.html`).
- **Netlify**: Configured via `netlify.toml` with caching rules.
- **GitHub Pages**: Source branch `main` root `/`.
- **GoHighLevel**: Copy `ghl-bundle.html` directly into any GHL Custom HTML element.

---

## 📜 Brand & Ownership
- **Brand:** Fariza's Territory
- **Founders:** Faria & Saiful Islam Shuvo
- **Origin:** Mirpur, Dhaka, Bangladesh
- **Facebook:** [https://www.facebook.com/farizasterritory143](https://www.facebook.com/farizasterritory143)
