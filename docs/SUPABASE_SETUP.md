# Supabase Database Setup Guide — Fariza's Territory

**Supabase Project URL:** `https://vjbhrdclcnxevunskodm.supabase.co`  
**Brand:** Fariza's Territory (Fashion & Accessories Brand by Faria & Saiful Islam Shuvo)

---

## Overview

The Fariza's Territory e-commerce platform uses Supabase PostgreSQL to manage:
1. **Collections**: 5 curated boutique collections with custom color palettes and descriptions.
2. **Products**: 18 verified boutique three-piece dress items with bilingual (English/Bengali) titles, descriptions, fabric specifications, and BDT pricing.
3. **Product Assets**: High-resolution studio photography records (8 perspectives/crops per product).
4. **Orders & Inquiries**: Real-time customer orders, customer details, delivery location (Inside/Outside Dhaka), delivery fees, line items, and fulfillment statuses.
5. **Store Settings**: WhatsApp number, Facebook Page/Messenger, Meta Pixel ID, delivery fees, and promo announcements.

---

## Step 1: Open Supabase SQL Editor

1. Navigate to your Supabase project: [https://supabase.com/dashboard/project/vjbhrdclcnxevunskodm](https://supabase.com/dashboard/project/vjbhrdclcnxevunskodm)
2. In the left navigation sidebar, click on **SQL Editor**.
3. Click **+ New Query**.

---

## Step 2: Run Database Migration (Schema)

1. Open the file `supabase/migrations/01_initial_schema.sql` from this repository.
2. Copy the entire contents and paste it into the Supabase SQL Editor.
3. Click **Run** (or press `Ctrl + Enter`).
4. You should see a success message: `Success. No rows returned`.

This creates the following tables with Row Level Security (RLS) policies and performance indexes:
- `public.collections`
- `public.products`
- `public.product_assets`
- `public.orders`
- `public.store_settings`

---

## Step 3: Run Database Seed (Catalog Data)

1. In the Supabase SQL Editor, click **+ New Query**.
2. Open the file `supabase/seed.sql` from this repository.
3. Copy the entire contents and paste it into the editor.
4. Click **Run**.
5. All 5 collections and 18 boutique three-piece dress sets will be populated immediately!

---

## Step 4: Retrieve Your Supabase Anon Key

1. In your Supabase Dashboard, click on the **Project Settings** (gear icon) in the bottom-left corner.
2. Under **Configuration**, click **API**.
3. Under **Project API keys**, locate the `anon` / `public` key (a long string starting with `eyJhbGciOi...`).
4. Copy this key.

---

## Step 5: Connect Your Storefront & Admin Portal

You can connect your store in any of the following ways:

### Method A: Via Admin Portal (Fastest — 10 seconds)
1. Open `admin.html` in your browser.
2. Scroll to the **Store & Database Settings** section.
3. Paste your copied `anon` key into the **Supabase Anon Key** field.
4. Enter your official business **WhatsApp Number** (e.g., `88017XXXXXXXX`).
5. Enter your **Meta Pixel ID** (if running Facebook/Instagram ads).
6. Click **Save Configuration**.
7. The status indicator will turn green: **Supabase Cloud: Connected**!

### Method B: Via `assets/js/config.js`
Open `assets/js/config.js` and set the `anonKey` property:
```javascript
supabase: {
  url: "https://vjbhrdclcnxevunskodm.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_KEY_HERE"
}
```

---

## Database Schema Reference

### Orders Table (`public.orders`)
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique auto-generated identifier |
| `order_ref` | TEXT (Unique) | Formatted reference (e.g. `FT-261117-9842`) |
| `customer_name` | TEXT | Customer full name |
| `customer_phone` | TEXT | Customer phone / Messenger contact |
| `customer_address` | TEXT | Delivery street address and district |
| `delivery_zone` | TEXT | `'dhaka'` (৳80) or `'outside_dhaka'` (৳150) |
| `delivery_fee` | NUMERIC | Calculated delivery charge in BDT |
| `subtotal` | NUMERIC | Catalog item subtotal in BDT |
| `total` | NUMERIC | Total order amount in BDT |
| `items` | JSONB | Array of ordered items `[{sku, title, price, qty, image}]` |
| `status` | TEXT | `'pending'`, `'confirmed'`, `'processing'`, `'shipped'`, `'delivered'`, `'cancelled'` |
| `customer_notes` | TEXT | Sizing notes, color preferences, preferred contact |
| `created_at` | TIMESTAMPTZ | Order submission timestamp |

---

## Row Level Security (RLS) Rules
- **Public (Shoppers)**: Can read all collections, products, assets, and store settings. Can submit new orders (`INSERT` on `orders`).
- **Admin**: Can read, update, and manage all orders, products, and settings using Supabase authentication or service role.
