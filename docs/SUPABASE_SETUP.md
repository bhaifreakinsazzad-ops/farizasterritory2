# Supabase Database Setup Guide — Fariza's Territory (v2.0 Production)

**Supabase Project URL:** `https://vjbhrdclcnxevunskodm.supabase.co`  
**Brand:** Fariza's Territory (Fashion & Accessories Brand by Faria & Saiful Islam Shuvo)

---

## 🌟 Overview

The Fariza's Territory e-commerce platform uses Supabase PostgreSQL to power:
1. **Collections**: 5 curated boutique collections with custom color palettes and descriptions.
2. **Products**: 18 verified boutique three-piece dress items with bilingual (English/Bengali) titles, descriptions, fabric specifications, and BDT pricing.
3. **Product Assets**: High-resolution studio photography records (8 perspectives/crops per product).
4. **Orders & Inquiries**: Real-time customer orders, customer details, delivery location (Inside/Outside Dhaka), delivery fees, line items, coupon discounts, courier dispatch numbers, and fulfillment statuses.
5. **Coupons & Promotions**: Active promotional discount vouchers (`FIRST25`, `FREESHIP`, `FARIZA200`).
6. **Store Settings**: WhatsApp number, Facebook Page/Messenger, Meta Pixel ID, delivery fees, and promo announcements.

---

## 🛠️ Step 1: Open Supabase SQL Editor

1. Navigate to your Supabase project: [https://supabase.com/dashboard/project/vjbhrdclcnxevunskodm](https://supabase.com/dashboard/project/vjbhrdclcnxevunskodm)
2. In the left navigation sidebar, click on **SQL Editor**.
3. Click **+ New Query**.

---

## 📋 Step 2: Run Database Migration (Schema)

1. Open the file `supabase/migrations/01_initial_schema.sql` from this repository.
2. Copy the entire contents and paste it into the Supabase SQL Editor.
3. Click **Run** (or press `Ctrl + Enter`).
4. You should see a success message: `Success. No rows returned`.

This creates the following tables with Row Level Security (RLS) policies and performance indexes:
- `public.collections`
- `public.products`
- `public.product_assets`
- `public.coupons`
- `public.orders`
- `public.store_settings`

---

## 📦 Step 3: Run Database Seed (Catalog, Coupons & Initial Orders)

1. In the Supabase SQL Editor, click **+ New Query**.
2. Open the file `supabase/seed.sql` from this repository.
3. Copy the entire contents and paste it into the editor.
4. Click **Run**.
5. All 5 collections, 18 boutique three-piece dress sets, active discount vouchers, and realistic orders will be populated immediately!

---

## 🔑 Step 4: Retrieve Your Supabase Anon Key

1. In your Supabase Dashboard, click on the **Project Settings** (gear icon) in the bottom-left corner.
2. Under **Configuration**, click **API**.
3. Under **Project API keys**, locate the `anon` / `public` key (a long string starting with `eyJhbGciOi...`).
4. Copy this key.

---

## 🚀 Step 5: Connect Your Storefront & Admin Portal

### Method A: Via Admin Portal (Fastest — 10 seconds)
1. Open `admin.html` in your browser.
2. Click **Store Settings** in the sidebar.
3. Paste your copied `anon` key into the **Supabase Anon Key** field.
4. Enter your official business **WhatsApp Number** (e.g., `8801700000000`).
5. Enter your **Meta Pixel ID** (if running Facebook/Instagram ads).
6. Click **Save Changes**.
7. The status indicator at the top will turn green: **Supabase Cloud: Connected & Synced**!

---

## 📊 Database Schema Reference

### Orders Table (`public.orders`)
| Column | Type | Description |
|---|---|---|
| `id` | UUID (PK) | Unique auto-generated identifier |
| `order_ref` | TEXT (Unique) | Formatted reference (e.g. `FT-261115-8821`) |
| `customer_name` | TEXT | Customer full name |
| `customer_phone` | TEXT | Customer phone / Messenger contact |
| `customer_address` | TEXT | Delivery street address and district |
| `delivery_zone` | TEXT | `'dhaka'` (৳80) or `'outside_dhaka'` (৳150) |
| `delivery_fee` | NUMERIC | Calculated delivery charge in BDT |
| `subtotal` | NUMERIC | Catalog item subtotal in BDT |
| `discount_code` | TEXT | Applied coupon voucher code (e.g. `FIRST25`) |
| `discount_amount` | NUMERIC | Deducted voucher discount amount in BDT |
| `total` | NUMERIC | Total cash on delivery amount in BDT |
| `items` | JSONB | Array of ordered items `[{sku, title, price, qty, image}]` |
| `status` | TEXT | `'pending'`, `'confirmed'`, `'processing'`, `'shipped'`, `'delivered'`, `'cancelled'` |
| `courier_name` | TEXT | Courier partner (e.g. Steadfast Courier, Pathao Courier) |
| `tracking_number` | TEXT | Courier tracking / consignment note ID |
| `status_history` | JSONB | Array of timestamps & status notes `[{status, note, time}]` |
| `customer_notes` | TEXT | Sizing notes, delivery time requests |
| `created_at` | TIMESTAMPTZ | Order submission timestamp |

### Coupons Table (`public.coupons`)
| Column | Type | Description |
|---|---|---|
| `code` | TEXT (PK) | Coupon voucher code (e.g. `FIRST25`, `FREESHIP`) |
| `discount_type` | TEXT | `'percentage'`, `'fixed'`, or `'free_shipping'` |
| `discount_value` | NUMERIC | Percentage (e.g. 25) or fixed BDT (e.g. 200) |
| `min_spend` | NUMERIC | Minimum cart subtotal in BDT |
| `max_discount` | NUMERIC | Maximum discount cap in BDT |
| `is_active` | BOOLEAN | Active flag |
