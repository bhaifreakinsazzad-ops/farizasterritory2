# FARIZA'S TERRITORY — SOURCE CONFLICTS, UNKNOWN FIELDS & COMMERCIAL AUDIT
**Canonical Catalog:** 53 Unique SKUs across 8 Collections (18 Fashion Three-Pieces + 35 Artisan Accessories)

---

## 1. Inventory & Selling Unit Safeguards

Every high-risk selling unit rule from the 35-item Master PDF and Fashion 18 manifest is encoded into `assets/js/catalogData.js` and rendered in both English and Bengali:

| SKU / Range | Pictured Context | Strict Selling Unit | Feed & Checkout Status |
| :--- | :--- | :--- | :--- |
| `CAT-001` – `CAT-018` | Fashion Three-Piece Dresses | 1 stitched/unstitched 3-piece set (`priceStatus: reference`) | Provisional catalog prices (`৳1,650–৳2,450`); excluded from ad feeds (`price_review = true`, `stock_verified = false`) until seller approval |
| `FT-HM-001` – `005` | Decorative Mirrors | **1 single mirror** (easels/props excluded) | Suggested launch prices; pending seller approval |
| `FT-JWL-001`, `002`, `005` | Necklace + earrings + ring grouping | **Pending verification** | Exact piece count must be confirmed by seller prior to dispatch |
| `FT-JWL-003`, `004`, `006`–`019` | Folk pendants | **1 pendant necklace** (stands excluded) | Suggested launch prices; pending seller approval |
| `FT-BA-001` | Multi-tier wooden tray | **1 single chosen bangle (১টি একক বালা)** (৳219 suggested, NOT tray) | Pending seller approval |
| `FT-BA-002`, `007`, `008` | Pair of bangles | **1 pair / 2 bangles** | Pending seller approval |
| `FT-BA-003` | Wide statement bangle beside folk medallion | **1 wide statement bangle** (medallion prop excluded) | Pending seller approval |
| `FT-BA-004`, `005`, `006`, `009`, `010` | 3 coordinated bangles | **3-bangle set** | Pending seller approval |
| `FT-BA-011` | Four colorway pairs shown | **1 chosen colorway pair (2 bangles)** | Pending seller approval |

---

## 2. Reconciled Store Policies & Architecture

- **WhatsApp Channel**: `8801700000000` is a placeholder. Storefront (`index.html`, `config.js`, `app.js`, `/api/public-config`) treats it as inactive and routes customer assistance exclusively to `https://m.me/farizasterritory143` until a verified Bangladeshi WhatsApp Business number is configured.
- **Shipping & Free-Shipping Threshold**: Reconciled across `assets/js/commerce.js`, `assets/js/config.js`, `server.js`, and `supabase/migrations/02_security_hardening.sql`:
  - Inside Dhaka: `৳80`
  - Outside Dhaka: `৳150`
  - `FIRST25`: 25% off (min spend `৳2,000`, max discount `৳500`)
  - `FARIZA200`: `৳200` off (min spend `৳2,000`)
  - `FREESHIP`: Free delivery on orders `≥ ৳3,000`
- **Durable Server Persistence**: Legacy browser `localStorage` PII storage and `.data/orders.json` are removed. Orders persist strictly via server-side `POST /api/orders` -> Supabase `public.orders` (fail-closed `503` if unconfigured).
- **Third-Party Label Disclosure**: `CAT-001` ("Aarong — Seller Label") retains explicit non-affiliation disclaimer notices.
- **Asset Verification**: All 53 SKUs have verified physical `.webp` assets on disk; internal markdown/CSV/JSON source artifacts under `/assets/aistudio/` are blocked (`404`) on public HTTP routes, while the Brand Book PDF remains accessible.
