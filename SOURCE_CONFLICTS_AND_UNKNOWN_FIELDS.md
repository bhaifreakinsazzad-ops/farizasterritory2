# FARIZA'S TERRITORY — SOURCE CONFLICTS, UNKNOWN FIELDS & PRICING AUDIT
**Boutique Identity & Multi-Category Commerce Architecture**  
**Date:** 17 November 2026  
**Auditor / Architect:** Fariza's Territory Full-Stack Commerce Team  
**Governing Documents:**
1. `fariza_s_territory_brand_book_by_pomelli.pdf` (Official Brand Book v1)
2. `Farizas_Territory_35_Products_Master_Catalog_2026.pdf` (Accessories 35 Master Catalog)
3. `FARIZA_PRODUCT_ASSET_MANIFEST.json` & `Fariza's Territory — LIVE 18 Product Image Links` (Fashion 18 Records)
4. `All_35_Products_UTF8.csv` & `Farizas_Territory_35_Product_Pricing_and_Inventory.xlsx`

---

## 1. CATALOG OVERVIEW & INVENTORY RECONCILIATION

The canonical boutique catalog consists of **exactly 53 SKUs across 8 collections**:
- **Fashion Garments:** 18 SKUs (`CAT-001` through `CAT-018`) across 5 collections (`01_Aarong_Label_Unverified`, `02_Alfi_Boutique`, `03_Mome_Boutique`, `04_Zam_Zam_Swiss_Lawn`, `05_Cotton_Mirror_Embroidery`).
- **Artisan Accessories:** 35 SKUs across 3 collections:
  - **Decorative Mirrors (5 SKUs):** `FT-HM-001` through `FT-HM-005` (Catalog pages 4–8)
  - **Pendants & Jewelry (19 SKUs):** `FT-JWL-001` through `FT-JWL-019` (Catalog pages 13–31)
  - **Bangles & Accessories (11 SKUs):** `FT-BA-001` through `FT-BA-011` (Catalog pages 34–44)

---

## 2. HIGH-RISK SELLING UNIT RULES & CONSUMER SAFEGUARDS

To eliminate consumer confusion, misleading multi-pack expectations, and checkout disputes, the following strict selling unit rules are encoded directly into the product models and displayed prominently in both English and Bengali:

| SKU Range / SKU | Pictured Context | Strict Selling Unit | Mandatory Customer Notice |
| :--- | :--- | :--- | :--- |
| `FT-HM-001` – `005` | Decorative wall/table mirror displayed with stands, flowers & books | **One single decorative mirror** | Price applies to 1 mirror only. Stands, easels and display props are photo styling items and not included. |
| `FT-JWL-001`, `002`, `005` | Grouping of pendant necklace, earrings, and finger ring | **Pictured grouping — pending verification** | Pictured matching set. Exact number of included items must be confirmed with the seller prior to dispatch. |
| `FT-JWL-003`, `004`, `006`–`019` | Statement folk pendant necklace on neckform/surface | **One pendant necklace** | Price is for 1 pendant necklace. Display stands/props not included. |
| `FT-BA-001` | Multi-tier wooden tray showcasing dozens of colorful bangles | **One selected bangle (১টি একক বালা)** | **Critical:** ৳219 price applies to ONE single chosen bangle, NOT the entire pictured display tray. |
| `FT-BA-002`, `007`, `008` | Pair of bangles | **Pair of two bangles (১ জোড়া / ২টি চুড়ি)** | Proposed price is for the pair of 2 bangles. |
| `FT-BA-003` | Wide statement bangle shown next to round folk ornament | **One statement bangle (১টি চওড়া বালা)** | Separate round folk medallion is a photo styling prop and not included. |
| `FT-BA-004`, `005`, `006`, `009`, `010` | 3 coordinated bangles styled together | **Three-bangle set (৩টি চুড়ির সেট)** | Proposed price covers the complete 3-bangle set. |
| `FT-BA-011` | Four distinct colorway pairs displayed together | **One chosen colorway pair (১ জোড়া)** | Proposed price ৳449 covers 1 colorway pair (2 bangles), NOT all four colorways shown. |

---

## 3. PRICING STATUS & PROVISIONAL VALUE DISCLOSURES

1. **Fashion Garments (`CAT-001` – `CAT-018`):**
   - Source CSV values represent earlier catalog reference prices ranging from ৳1,650 to ৳2,450 BDT.
   - Prices are displayed as **provisional catalog reference prices** with the explicit notice: *"ক্যাটালগ রেফারেন্স মূল্য — অর্ডারের পূর্বে বিক্রেতার সাথে চূড়ান্ত মূল্য নিশ্চিত করুন"*.
2. **Artisan Accessories (`FT-HM-001` – `FT-BA-011`):**
   - Prices in the Master Accessories PDF are **suggested launch prices** (e.g. ৳499 for `FT-HM-001`, ৳699 for `FT-JWL-001`, ৳219 for `FT-BA-001`).
   - Prices are displayed with the explicit notice: *"ক্যাটালগ প্রস্তাবিত লঞ্চ মূল্য — চূড়ান্ত মূল্য মেসেঞ্জার/হোয়াটসঅ্যাপে নিশ্চিত হবে"*.
3. **Checkout Semantics:**
   - No mock payment gateways or simulated "Order Paid / Transaction Successful" screens exist.
   - All orders route through Cash on Delivery (COD) inquiry with instant courier dispatch preparation and WhatsApp/Messenger notification.

---

## 4. BRAND BOOK COMPLIANCE & ASSET PROVENANCE

1. **Brand Identity:**
   - Name: **Fariza's Territory**
   - Tagline: *"Elegance in Every Detail"* (প্রতিটি খুঁটিনাটিতে মার্জিত রুচি)
   - Founded by: Faria & Saiful Islam Shuvo
   - Base of Operations: Mirpur, Dhaka, Bangladesh
   - Social Community: 13,000+ followers on Facebook (`facebook.com/farizasterritory143`)
2. **Brand Book Palette:**
   - Background: Parchment Cream `#FDF0DD`
   - Primary Text & Contrast: Obsidian Black `#1E1D1C`
   - Accent & CTA: Caramel Brown `#D1803A`
   - Secondary Warmth: Chestnut Brown `#794722`
   - Heritage & Editorial: Olive Brown `#5E522B`
3. **Typography:**
   - Latin: `Actor` (Google Fonts)
   - Bengali: `Noto Sans Bengali` (Unicode compliant, standard Bengali glyphs)
4. **Third-Party Brand Disclaimers:**
   - `CAT-001` carries the label *"Aarong — Seller Label"*. As unverified in source documents, it carries an explicit consumer notice: *"Seller-labeled collection. The Aarong label is unverified in the source CSV — affiliation is not claimed."*

---

## 5. TECHNICAL & PLATFORM VERIFICATION

- **Three.js Canvas:** Silk wave background throttled to 60fps with IntersectionObserver pausing and `prefers-reduced-motion` graceful degradation.
- **Anime.js Motion:** Kinetic headline reveals, 3D interactive card tilt with dynamic specular glare, quadratic bezier fly-to-cart particle trajectory, and Kantha embroidery stitch tracing.
- **Dual-Layer Persistence:** Orders recorded locally in `localStorage` and synchronized with Supabase database (`vjbhrdclcnxevunskodm.supabase.co`).
- **All 53 Products Validated:** 100% verified asset presence on disk in `assets/products/<SKU>/` and `assets/accessories/<SKU>.webp`.
