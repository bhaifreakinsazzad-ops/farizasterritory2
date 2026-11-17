# FARIZA'S TERRITORY — COMPLETE INTERACTIVE FASHION & ACCESSORIES COMMERCE
## QWEN AI / CODING AGENT — MASTER DEVELOPMENT & VERIFICATION DIRECTIVE v3.0
**Date:** 16 November 2026  
**Output required:** A real, running, fully integrated, visually premium, mobile-first commerce experience and a GoHighLevel-compatible deployment variant.  
**Build mode:** Implementation, not concept generation. Do not substitute a static mockup, screenshot, pseudocode, generic theme, proposal, or unfinished scaffold.

---

## 0. YOUR ROLE AND NON-NEGOTIABLE MISSION

Act as a coordinated team of Principal Frontend Architect, Creative Director, Senior Product Designer, Full-Stack Commerce Engineer, Interaction/Motion Engineer, Image-Pipeline Engineer, QA Automation Engineer, Accessibility Specialist, and Deployment Engineer.

**Build the actual Fariza's Territory brand website with exactly 53 catalogued SKUs:** **18 fashion garments** + **35 artisan accessories**. Design it as an **interactive, high-end South Asian fashion boutique**, not a commodity e-commerce template. Follow the visual interaction idea in the attached fashion-reference video when supplied, but use **this brand's genuine provided product assets**, not fictitious garments or random models. Preserve and improve the attached existing website/source code if it is supplied. Reuse working commerce and interface behaviors rather than regress them.

User-facing language: **Bangla-first with elegant English support**, culturally appropriate for Bangladesh; semantic multilingual structure and proper Unicode Bengali fonts. Currency: **Bangladeshi taka (BDT)**. Initial market: Bangladesh, architect for future internationalization.

You are expected to inspect and implement, run actual tests, fix defects, and deliver code and handoff now. Do not end with a plan. If external credentials, payment configuration, confirmed pricing, customer contact, or deployment permission are absent, fully implement everything that can be built; expose only honest inquiry/availability flows, list exact blocked integrations, and do not claim those are live.

---

## 1. INPUT ATTACHMENTS — SOURCE OF TRUTH

Read **every attached asset**, enumerate it, and record any missing/unreadable file. Expected attachments, which may arrive individually or via the supplied ZIP:

1. `SOURCE_OFFICIAL_BRAND_BOOK.pdf` / `fariza_s_territory_brand_book_by_pomelli(1).pdf` — 7-page official brand identity; authoritative for visual identity, logo, typography, color, mood and brand voice.
2. `SOURCE_ACCESSORIES_35_MASTER_CATALOG.pdf` / `Farizas_Territory_35_Products_Master_Catalog_2026(1).pdf` — 47-page artisan accessories catalog; authoritative for **35 accessories** (SKUs, names, descriptions, reference images, **suggested—not confirmed—prices**, units and product set contents).
3. `FASHION_18_ORIGINAL_ASSET_MANIFEST.json` / `FARIZA_PRODUCT_ASSET_MANIFEST(1).json` — authoritative mapping for **18 garments**, including 7 actual/derived photo roles and optional AI illustrations; prices and inventory are null or unverified.
4. `FASHION_18_ORIGINAL_IMAGE_LINKS.csv` / `Fariza's Territory — LIVE 18 Product Image Links - PRODUCT_LINKS(3).csv` — source of exact Google Drive file IDs and references. Drive view URLs are **not** reliable public image URLs.
5. `PRODUCTS_53_UNIFIED_MASTER_MANIFEST.json` — agent-friendly normalization combining precisely 18 clothing records and 35 accessory records. Cross-check with original sources before use; if a difference is detected, prefer the original source and report it.
6. `ACCESSORIES_35_SKU_MANIFEST.json` + `ACCESSORIES_35_SKU_INDEX.csv` — explicit source-page, suggested price, unit and content cautions for accessories. Use as an index, but the PDF remains authoritative.
7. `ACCESSORY_PRODUCT_IMAGES_35/FT-..._CATALOG_PHOTO.jpg` — **35 crops of the supplied catalog's own visible product photography**. These are PDF-derived catalog visuals, *not* independent extra camera angles or proof of material/scale. Each crop is tied to its exact SKU; preserve them. Do not confuse them with additional real-life product angles.
8. `EXISTING_STOREFRONT_SOURCE.html` (when supplied) — previous interactive GHL one-block website. Audit it and keep all working interactions and existing 18 garment assets while expanding the catalog to 53.
9. Optional reference `.mp4` video / keyframe contact sheet from the prior interactive-fashion reference. Understand the interaction; do not copy foreign branding.

**Source precedence and conflicts:** (a) seller's explicit confirmed updates, if provided, (b) the product's own source PDF/manifest/CSV, (c) official brand book for brand design, (d) existing code for functioning technical behavior, (e) suggested improvements. Do not silently invent missing data or override authoritative product content. Produce a `SOURCE_CONFLICTS_AND_UNKNOWN_FIELDS.md` file.

---

## 2. PRECISE INVENTORY CONTRACT — 53 PRODUCTS, 8 COLLECTIONS

### 2.1 Fashion — exactly 18 garment SKUs (CAT-001 through CAT-018)

| Collection | Quantity | Required SKUs |
| --- | ---: | --- |
| Aarong seller-labeled, unverified affiliation | 1 | CAT-001 |
| Alfi Boutique | 2 | CAT-002, CAT-003 |
| Mome Boutique | 4 | CAT-004 through CAT-007 |
| Zam Zam Swiss Lawn | 6 | CAT-008 through CAT-013 |
| Cotton Mirror & Embroidery | 5 | CAT-014 through CAT-018 |

Use the actual `titleEN`, `slug`, `assets`, and source collection fields in the fashion JSON. Store collection identity without presenting the Aarong name as evidence of an authorized relationship with the external Aarong brand; use a neutral `Seller-labeled collection` disclosure until a seller confirmation exists. Do not assume a full ready-made size range, fabric guarantee, or three-piece completeness if not verified per SKU.

### 2.2 Accessories — exactly 35 distinct SKUs, source catalog pages 4–44

**Decorative Mirrors: 5** — `FT-HM-001` through `FT-HM-005` (catalog detail pages 4–8).  
**Pendants & Jewelry: 19** — `FT-JWL-001` through `FT-JWL-019` (detail pages 13–31).  
**Bangles & Accessories: 11** — `FT-BA-001` through `FT-BA-011` (detail pages 34–44).

Do not turn pictured color choices, matching ornaments or props into extra SKUs. Do not discard or merge any existing SKU. The accessory PDF has suggested launch prices of, for example, `FT-HM-001` ৳499 per mirror; `FT-JWL-001` ৳699 for a pictured jewelry grouping, pending set verification; and `FT-BA-001` ৳219 **per selected bangle**, not the entire photograph. These are **proposal prices**, never automatic payable amounts.

**High-risk selling unit rules (enforce, test and display correctly):**
- `FT-HM-001`–`005`: price refers to **one decorative mirror**. Do not include stands, gift boxes, flowers or unrelated props unless seller confirms.
- `FT-JWL-001`, `FT-JWL-002`, `FT-JWL-005`: photographed matching jewelry grouping. Exact number of sellable pieces is **not yet confirmed**. Show a set-content confirmation notice.
- Other `FT-JWL` items: one pendant necklace. Decorative styling props not included.
- `FT-BA-001`: per **one** chosen-color bangle, NOT all pictured colors.
- `FT-BA-002`, `FT-BA-007`, `FT-BA-008`: proposed price for a pair of two bangles.
- `FT-BA-003`: one statement bangle; separate round photographed folk ornament is **not included**.
- `FT-BA-004`, `005`, `006`, `009`, `010`: proposed price for the **three-bangle set** shown.
- `FT-BA-011`: proposed price for **one colorway pair** (two bangles). Four visible colorways are options, not four included pairs.
- Size, exact base material, dimensions, weight, available color, quantity, stock, delivery price and payment terms require confirmation for most accessories.
- Mirror-color customization may be **requested** via inquiry; never auto-promise customization, lead time or price. For jewelry/bangles do not imply customization is guaranteed.

Build two top-level pillars (`Fashion`, `Accessories`) and eight browseable subcollections with accurate counts. Implement unified search, wishlist, cart/inquiry bag and related-item discovery across both pillars, without converting two distinct categories into fictitious product bundles.

### 2.3 Required canonical data model

Build a typed, normalized database/API model with fields such as:

```ts
type CatalogProduct = {
  sku: string;                         // immutable: CAT-001, FT-HM-001 etc.
  slug: string;
  title: { en: string; bn?: string | null };
  superCategory: 'Fashion' | 'Accessories';
  collectionKey: string;
  description: { en?: string; bn?: string };
  colorOptions: Array<{ name: string; confirmedAvailable: boolean | null }>;
  sizeOptions: Array<{ label: string; confirmedAvailable: boolean | null }>;
  sellingUnit?: { label: string; quantityIncluded?: number | null; caveat?: string };
  media: Array<{
    role: 'main' | 'original' | 'alternate' | 'detail' | 'social' | 'story' | 'aiPreview' | 'catalogDerived';
    source: string; publicUrl?: string | null; localPath?: string | null;
    provenance: string; verifiedForPublicDisplay: boolean;
  }>;
  proposedLaunchPriceBDT?: number | null;
  confirmedSellPriceBDT?: number | null;
  discount?: { type: 'percent' | 'fixed'; value: number; confirmed: boolean } | null;
  inventory: { status: 'confirmed_in_stock' | 'confirmed_out_of_stock' | 'unknown'; quantity?: number | null };
  purchaseMode: 'enquiry' | 'verified_checkout';
  sourceReference: string;
};
```

**Do not equate `proposedLaunchPriceBDT` with `confirmedSellPriceBDT`.** Keep exact SKU mapping and provenance. No guessed ratings, review counts, stock badges, crossed-out MRPs, countdown clocks or fake urgency.

---

## 3. OFFICIAL BRAND IMPLEMENTATION — NOT GENERIC LUXURY

Brand name **Fariza's Territory**. Primary product line **Fashion Clothing & Artisan Accessories, based in Mirpur, Dhaka, Bangladesh**. Tagline from garment manifest: **“Elegance in Every Detail.”** Brand Book describes a casual, modern and trendy voice with folk-art ornamentation, heritage patternwork, artisanal tactility, botanical intricacy and traditional flourish. The aesthetic should feel expressive, distinctly Bangladeshi and crafted, yet have a sophisticated editorial interface.

Official palette **exactly:**
- Parchment Cream `#FDF0DD`: backgrounds.
- Obsidian Black `#1E1D1C`: main typography/strong contrast.
- Caramel Brown `#D1803A`: CTA accent, fine borders, selected states.
- Chestnut Brown `#794722`: secondary text, brand warmth.
- Olive Brown `#5E522B`: editorial and heritage sections.

Primary Latin typeface **Actor**; use **Noto Sans Bengali or a properly licensed comparable Bengali typeface** for legible Bangla copy. Use true Bengali glyph shaping and avoid faux Bengali transliteration. Use tasteful modular typographic hierarchy, plenty of whitespace, dramatic layouts and carefully restrained ornamentation. Follow the **brand book page 3** logo use rules: original detailed floral/folk-art logo, minimum **152px** when used in its full detailed form; preserve its clear space and proportions. Do not substitute a generic paisley icon and call it the official logo. If an independent production-quality logo asset is unavailable, extract it faithfully where permitted or render a properly labeled clean text wordmark until an approved SVG/PNG is provided; report the issue rather than pretending a recreated symbol is official.

Use the **Brand Book imagery examples (page 6)** as styling/mood references only; do not assume those garments are among the 53 products unless SKU-level proof exists. Prioritize the current cataloged images in the product journey. No generic stock female models, inaccurate AI-try-on as factual proof, or altered patterns masquerading as exact products.

---

## 4. VISUAL DIRECTION — IMMERSIVE INTERACTIVE COMMERCE

The visual goal is **“The Interactive Boutique — Fashion Meets Wearable Art.”** Borrow the *behavioral pattern* from the supplied short reference video: horizontal collection of looks, active selection, centered/enlarged focus, synchronized info panel, smooth repositioning and contextual product hotspots. Do not recreate another brand's graphics or assets.

### 4.1 Homepage (desktop and mobile)
1. Quiet announcement bar for seller-advertised offers: “First order up to 25% OFF*” and “Free delivery*”, with **seller confirmation / eligibility disclaimer**. No auto-applied discount or universal shipping promise.
2. Sticky premium navbar with functional `Shop Fashion`, `Explore Accessories`, `Collections`, `Lookbook`, `Our Story`, `Contact`, search, wishlist, inquiry bag, language switcher. Accessible mobile navigation.
3. Hero with premium real-product visuals: **two modes** or one unified stage that can select garments and artisan pieces. Show active SKU, product/collection name, image, fabric/craft detail and direct “Explore this piece” / “Ask Availability” CTAs.
4. Interaction: selecting different visual tiles smoothly recedes neighbors, moves selected item into focus and updates title, subtitle, accent and detail drawer in synchronization. Support mouse, touch/swipe, arrow keys and reduced-motion users.
5. A fashion editorial story and a separate accessory-artisan story. Accessories are not background decorations; they are a first-class purchasable catalog.
6. Eight collection discovery tiles with actual product imagery, accurate product counts and meaningful category hierarchy.
7. Curated `Pair Your Look` recommendations (dress + color-compatible jewelry/bangles). **Recommendations are style suggestions, NOT bundles with automatic discount or guaranteed matching material.** Every SKU remains separately priced/inquired.
8. Shop and Search modules featuring all 53, product count, filters, sorting and quick view.
9. Real imagery / transparency section distinguishing catalog-provided photography, seller-provided original photo variants and AI concept previews.
10. Trust and conversion: authentic Facebook page link provided by the user (`https://www.facebook.com/farizasterritory143`), inquiry ordering, FAQ, policies, and editable legal/contact fields only where confirmed.
11. Rich, respectful branded footer, not a grid of random filler links.

### 4.2 Interaction features: functional, not decorative
- Cinematic but restrained `Fashion Look Selector`: focus item scale/position choreography; selected item accessible and keyboard-operable; `is-selected` ARIA state.
- `Accessory Spotlight`: rotating/slider gallery of decorative mirrors, pendant designs and bangles, featuring texture and color without simulated 3D of unmodeled products.
- `Shop the Detail`: accurate photo hotspots with informative labels such as *embroidery*, *dupattā print*, *bangle stitched beads*, or *painted mirror frame*, only when visibly supported; tapping opens relevant image detail/description. Do not imply separate checkout items unless SKU exists.
- `Editorial Photo Lightbox`: pinch/scroll zoom, pan, thumbnail progression, ESC to close, trap focus, reset button.
- Motion choreography on collection switch, hero reveal, card hover/focus and contextual modal; all effects degrade gracefully with JavaScript or animation library failures.
- Optional tasteful micro-interaction via Anime.js / Motion; **Three.js only when justified by a genuinely meaningful 3D use case with assets to support it**. No heavy fake 3D ecommerce theater.
- Category previews must expose real linked products rather than hardcoded cards with dead `Shop now` actions.

### 4.3 Mobile & performance
Design first for 360–430px devices, then 768/1024/1440+px. Responsive hero becomes swipeable with tactile dots/thumbnail strip and easy button targeting, not an oversized clipped desktop animation. Avoid horizontal overflow, giant image downloads, cramped Bangla, hover-only CTA and carousels that hijack vertical scroll. Use CSS containment and transform/opacity animations. Respect `prefers-reduced-motion` and keyboard navigation.

---

## 5. COMPLETE SITE STRUCTURE — CREATE REAL ROUTES

Create the following real navigable pages and functions:

- `/` — interactive home / look selector and cross-category discovery.
- `/shop` — all 53 SKUs, pagination or progressive loading, search, sorting, filtering, status/count.
- `/fashion` — complete 18 fashion products.
- `/accessories` — complete 35 accessory products.
- `/collections` — all eight collections.
- `/collections/[slug]` — actual collection landing page with product counts and SEO.
- `/products/[slug]` or `/product/[sku]` — individual shareable product-detail URL for every SKU, all 53.
- `/lookbook` — editorial visual discovery **only using attached catalog assets**.
- `/wishlist` — saved products, persisted locally and reflected accurately.
- `/bag` — working cross-category inquiry bag with quantity and remove/edit controls.
- `/inquiry` — structured pre-order/availability request flow, with explicit seller-confirmation pending status.
- `/about` — actual Brand Book story and verified context.
- `/contact` — actual Facebook/Messenger and known verified contact channels.
- `/faq`, `/delivery`, `/returns`, `/privacy`, `/terms` — policy pages honest about what has/has not been confirmed; do not fabricate legal terms.
- `/not-found` and unavailable-media/empty-list states.

If implementing entirely inside a *single* GHL custom code element, route through a self-contained accessible view state/hash router with deep-link fallback, without clashing with host routes. If implementing as a standalone Next.js website, use normal indexable SSR/SSG routes and clean deep links. Keep one shared normalized product data source and feature parity across delivery modes as far as platform allows.

---

## 6. PRODUCT LISTING / PRODUCT DETAIL REQUIREMENTS

Every product needs:

1. Exact original SKU and correct collection.
2. Exact verified English product name; Bangla name only if provided or accurately translated and clearly a UI translation, not a made-up manufacturer name.
3. Source-based description and color/design facts; source reference or metadata available in internal admin manifest.
4. Actual verified hero image and thumbnails. Fashion: original, alternate, detail A/B, social or story derivatives as useful. Accessories: catalog crop plus related catalog visual only; do not generate fictional additional angles.
5. On-image badges only when factually true: `Product photo`, `Catalog crop`, `AI Styling Illustration`, `Availability on request`, and possibly `Suggested price — confirm with seller`.
6. Price semantics: show **confirmed price** when available. For accessories' PDF suggested price show `Suggested ৳X — final price on inquiry` if owner elects to display proposals. Clothing with null price shows `Ask for price`. Never label proposed prices as confirmed at checkout.
7. Appropriate unit: one mirror, one pendant, verified two-bangle pair, three-bangle set, or seller-confirmed jewelry grouping. Prevent misunderstood multipacks.
8. Color/size options only when provided and seller-confirmed; otherwise `Request a size / color` is a free-text inquiry, not a false live stock selector.
9. Image zoom, favorites, share/copy link, variant inquiry, quantity controls.
10. Explicit `Add to inquiry bag`, `Ask about this piece`, and `Request order` actions. If real payment provider/confirmed price is absent, DO NOT display a misleading final “Payment Successful” message.
11. `You may also like`: relevant suggestions within same collection and safe cross-category stylistic pairings, never showing missing products.
12. Accessibility, schema when appropriate, and correct product alt text.

Product reviews and customer counts: do not fabricate social proof. The Brand Book mentions **13,000+ social followers** as a contextual community number, not sales or customer testimonials. Do not label followers as happy customers, purchasers or endorsements.

---

## 7. IMAGE AND ASSET PIPELINE — CRITICAL

**The image issue is a potential launch blocker; solve it before claiming production readiness.**

### 7.1 Fashion: 18 existing source products
- Parse both 18-product JSON and CSV; validate every `CAT-` SKU and image role against exact Google Drive file IDs.
- Google Drive `file/d/.../view` links are for viewing, not guaranteed embeddable as `<img src>`; `drive.google.com/thumbnail` endpoints may be private, rate-limited or inconsistent. All 18 records currently flag `NEEDS PUBLIC PERMISSION TEST`.
- If prior `EXISTING_STOREFRONT_SOURCE.html` is attached, inspect whether authentic fashion imagery has already been embedded in the HTML/media dataset. Reuse/decouple those assets into actual optimized local image files when permitted.
- Otherwise read local media attachments if supplied; if remote-only and inaccessible, preserve the exact mapping, create a SKU-specific branded fallback, produce a CSV of blocked photos and a precise owner action list. Never falsely report images as loaded.
- Separate exact garment photo vs derived crop vs AI styling illustration in data and UI. Never elevate an AI preview into "real product" status.

### 7.2 Accessories: 35 PDF catalog products
- Use the included **35 SKU-named JPEG crops** as primary product media, sourced directly from the brand's uploaded 47-page catalog. Verify each crop against the PDF's matching detail page before publishing.
- Enhance via lossless/resized/optimized output without inventing patterns, colors, dimensions or new product angles; keep photo identification exact.
- Generate responsive AVIF/WebP/JPEG derivatives with correct `srcset`, meaningful alt text, art direction (4:5 product, 1:1 cards), lazy loading and stable aspect ratios.
- Do not auto-relabel the PDF's catalog imagery as independent raw factory photos; where necessary disclose the origin as `Catalog photograph`.
- For Bangles and Jewelry, make a clear note that additional pieces, floral props, decorative wooden boards or gift packaging appearing in photos are not automatically included.

### 7.3 Production hosting
- Prefer copied/optimized public image files served from the site's own `/public/products/...` on a standalone deployment; for GHL use a verified public CDN or legitimately authorized hosted assets.
- CDN/image links must return actual `image/*` MIME, HTTP success, correct CORS/CSP expectations and render in a logged-out incognito browser.
- Implement robust error image fallback, status logging and an administrator-only asset audit report. Do not publish a broken preview as production-ready.

---

## 8. COMMERCE, CHECKOUT, LEAD CAPTURE AND ORDER FLOWS

### 8.1 Default mode: honest and fully functional inquiry commerce

Because pricing, stock, shipping terms, payment tokens and product-size details are **not confirmed in the attached sources**, implement a complete inquiry-first flow that actually works without pretending to process payment:

`Product → select known option or request unknown option → Add to Inquiry Bag → Review SKU/qty/notes → Fill contact details with privacy notice → Generate exact product request summary → Copy / Share to Messenger → Seller confirms price, size, stock, delivery, payment and order. `

Use the previously provided Facebook page URL `https://www.facebook.com/farizasterritory143` and Messenger entry point `https://m.me/farizasterritory143` as **provided contact endpoints**, subject to live browser verification. Do not assume Messenger universal message-prefill support. Provide **Copy order details** and **Open Messenger** as distinct reliable actions. If an actual backend endpoint is available, persist the request server-side and return a real ID. If not, use an unmistakably local draft state and make it clear that the seller receives nothing until the customer submits/sends the message. Never claim an inquiry/order was submitted solely because it was stored in `localStorage`.

### 8.2 Upgrade path: real paid checkout when provided

Architect seller-managed price/stock and actual checkout as pluggable modules (GHL native products/checkout when verified, or trusted standalone server/payment provider). Do **not** ask for API keys in the source code, commit keys, or place secrets in client bundles. Use server-side env and test webhooks, order persistence, payment confirmation, cancellation and idempotency once credentials are provided. Add COD only when seller confirms it is offered. Never turn on live charge collection with suggested/unverified prices.

### 8.3 Seller-side product management

Provide a simple validated `products.json`/CSV edit workflow or a properly authenticated admin interface for updating selling price, availability, sizes, set contents, special offers, image URL and inventory. No fake static front-end-only password. Offer terms are configurable: up to 25% first order and free delivery were advertised elsewhere by the brand, but do **not** apply them to the 35 new accessory SKUs by default without confirmation.

---

## 9. ENGINEERING ARCHITECTURE — TWO DISTINCT BUILD TARGETS

**Primary deliverable: standalone complete website.** Preferred stack: modern stable **Next.js App Router**, React, TypeScript, modular CSS or Tailwind CSS, Motion (from official Motion docs), and Anime.js if it has a non-overlapping purpose. Implement appropriate SSR/SSG for SKU pages, optimized images, typed data, accessibility, `sitemap.xml`, robots and metadata. React animation import syntax must match the pinned installed version; do not mix Motion React API with plain JS API.

**Second deliverable: GoHighLevel embed variant**, because the user operates a custom-code storefront in GoHighLevel:

- Export a build artifact specifically suited to `Sites → Websites/Funnels → Custom Code` and a `GHL_DEPLOYMENT.md` guide. Do not paste a raw Next.js project or nested `<!doctype html><html><head><body>` into an existing GHL element.
- Scope DOM/CSS to an application root like `#ft-app-root` or Shadow DOM where practical; avoid broad selectors rewriting the GHL editor's global `<body>`, `<header>`, `.container`, `.modal`, Nuxt classes, etc.
- Initialize after relevant DOM/hydration events; GHL documentation describes a `hydrationDone` custom event for its funnel preview. Use a safe idempotent initializer that also works after normal DOM ready. Prevent duplicate event handlers, duplicate overlays or infinite hydration refresh loops.
- Avoid a single multi-megabyte inline base64 code block when a stable asset/CDN bundle can be used. Generate a small self-contained loader plus separately hosted CSS/JS/media where possible; supply an honest all-inline fallback ONLY if platform constraints permit it. Validate size limits in the real GHL editor rather than guessing.
- Existing GHL page may be a full exported HTML containing Nuxt/LeadConnector wrappers. Modify only the relevant inner custom code and do not overwrite platform-generated routing/checkout globals.
- External libraries must be pinned and loaded safely, respecting CSP and the platform lifecycle.
- If the full platform cannot be implemented securely in one GHL code element, use a supported **hosted standalone app** with compatible integration/embed and explain the actual tradeoff. Never claim native Next.js backend works inside a static GHL snippet.

**Suggested directories:**

```text
farizas-territory/
  app/                 # homepage, shop, fashion, accessories, collections, products, inquiry, policies
  components/          # interactive showcase, nav, card, product modal, inquiry bag
  data/                # canonical normalized 53-SKU manifest and validations
  public/products/     # optimized images with exact SKU names
  lib/                 # currency, search, inventory and image resolvers
  tests/               # SKU integrity, UI behavior and end-to-end
  ghl-export/          # scoped embedded custom code or compact loader
  reports/             # QA, source unknowns, assets and final launch checklist
```

---

## 10. MOTION TECHNOLOGIES — USE VERIFIED, COMPATIBLE APIS

Use **Motion.dev** for layout transforms, focus transitions, stagger and kinetic browsing; **Anime.js** for any specific timelines, SVG/path/text-detail treatment where it adds value. Don't animate the same DOM property from two engines simultaneously, leading to jitter/race conditions. Do not make functional navigation dependent on animation loading.

Reference current official documentation rather than copying outdated CDN syntax:
- https://motion.dev/docs/quick-start
- https://motion.dev/docs/animate
- https://animejs.com/documentation/getting-started/imports
- https://animejs.com/documentation/timeline

If you pin Anime.js v4 use named `animate` / `createTimeline` ESM-compatible APIs; if the legacy code uses Anime.js v3 `anime()` global, either preserve that version intentionally or migrate fully. Do not mix version-specific code. Use Three.js only for a real product interaction with assets warranting it; otherwise save bandwidth and browser memory.

Deliver high-quality visual motion with a consistent curve, no obstructive preloader, no long mandatory scroll-jacking and no fake 3D clothing simulation without actual modeled product geometry.

---

## 11. CONTENT, SEO, TRUST, ANALYTICS AND LOCALIZATION

- All category and product headings, descriptions, SKU metadata and displayed prices must derive from source data; create accurate editorial storytelling without adding unsupported product guarantees.
- Homepage copy direction: `Every Detail Has a Story`, `Discover Your Signature Look`, `Wearable Art, Everyday Elegance`, `From Mirpur, Dhaka`, `Find the Detail You Love`. Bangla equivalent should read naturally, not as literal translation.
- Real SEO routes, canonical links, metadata, OG images derived from actual products, `hreflang` only where localized equivalents exist, sitemap, product/collection breadcrumb data. Use Product structured data **only for fields actually known**. Do not emit fictitious `AggregateRating`, customer reviews or confirmed `Offer` price/availability when unknown.
- Accessible semantic HTML, sufficient color contrast, accessible carousels/hotspots, keyboard support, `aria-live` for bag updates, focus management, adequate 44px touch targets and motion preferences.
- Respect consent and privacy: no covert analytics, unnecessary personal data collection or leaked customer messages in URLs; add Meta Pixel/GA4 only when IDs and permission are supplied. Provide an events map: `view_item`, `view_item_list`, `select_item`, `add_to_wishlist`, `add_to_inquiry_bag`, `begin_inquiry`, `copy_inquiry`, `open_messenger` — never fake `purchase` on non-paid inquiries.
- For the accessories, take ordering FAQ, care, customization and set/disclaimer guidance from PDF pages **45–46**, not invented legal policies.

---

## 12. VALIDATION: REQUIRED TESTS AND ACCEPTANCE CRITERIA

**Do not call the project complete until the code is actually executed and verified in the available environment.**

### Automated catalog verification (must execute)
- Exactly **53** unique SKU records in output.
- Exactly **18** `CAT-` fashion SKUs and **35** accessory SKUs.
- Exactly **5 fashion collections + 3 accessory collections**.
- All 35 accessory records have the expected `FT-HM-`, `FT-JWL-`, `FT-BA-` grouping, accurate suggested prices and `sellerConfirmationRequired=true`.
- Each of the 35 SKU image paths corresponds to the same SKU, image actually exists and has valid dimensions; no accidental colorway/image swaps.
- Fashion images match source Drive IDs; there is no false assertion that they are externally public; any missing resolved public image is recorded.
- `FT-BA-001`, `FT-BA-003`, `FT-BA-011`, `FT-JWL-001`, `FT-JWL-002`, `FT-JWL-005` have the required units/content warnings.
- If size/stock/price missing, no simulated `Buy now paid` route exists.

### Functional UI tests (must execute)
- Browse 53 products and all eight collections.
- Open all 53 product detail routes, check SKU/name/category/img matching.
- Search by SKU, English name, collection, Bangla text where available.
- Filter Fashion/Accessories and all subcollections; sort without crash, including unknown prices.
- Select/swipe/keyboard navigate the interactive hero; hotspot details open/collapse.
- Add/update/remove products from inquiry bag, including a mixed Fashion + Accessories bag; persist and reload; no duplicate quantity errors.
- Wishlist toggles and persistent state.
- Copy exact inquiry text with mixed SKUs and product units; Messenger opens and is not falsely reported as sent.
- Gallery thumbnails, zoom/lightbox and fallback image behavior; tab/keyboard close.
- Test 320, 390, 768, 1024, 1440 px, touch simulator, reduced-motion; no horizontal overflow.
- Navigation, deep-link reload, back button, loading/empty/error states, favicon/meta.
- `npm run typecheck`, lint, unit tests, build and Playwright/Cypress end-to-end tests as available. Provide actual command results; never say passes if not executed.
- GHL preview/test-page smoke test **if account access is available**; if no live GHL account, explicitly list it as an untested deployment dependency.

**Performance targets (goals, not claims):** LCP ≤ 2.5s on mobile at realistic conditions, CLS ≤ 0.1, INP ≤ 200ms, appropriate image compression and minimal JS; measure with actual tools when available and report failures transparently.

---

## 13. REQUIRED DELIVERABLES — DO NOT STOP AT A TEXT REPLY

Provide all available artifacts, not just instructions:

1. **Complete runnable website source code**, all components, data, styles and routes.
2. **Exact 53-product normalized catalog** with image manifest and source references.
3. **Main homepage + interactive hero** with working fashion/accessories modes.
4. **53 detail pages** with real SKU-specific media/accurate color/units and inquiry CTAs.
5. **Working bag, wishlist, search, filters, responsive interactions and inquiry-copy-to-Messenger flow**.
6. **Image hosting/media pipeline** for every accessible asset; detailed unresolved image report.
7. **GHL Custom Code Block deliverable** or GHL-compatible deployed loader, plus deployment instructions. Document editor or CSP limits if unverified.
8. **`.env.example`** without secrets; optional seller-update file/admin interface.
9. **Desktop + mobile screenshots** from actual running browser.
10. **Test output/QA matrix**, performance findings, browser compatibility and `SOURCE_CONFLICTS_AND_UNKNOWN_FIELDS.md`.
11. **Launch gates checklist** for confirmed prices, set sizes, shipping and payment configuration, accurate policies and photo provenance.
12. **ZIP/source archive** and real verified preview/deployment URL if the environment actually supports building/deployment. Do not invent URLs or say “100% deployed” without deploying.

**No essential missing-field question should block development.** Proceed with verified source information, implement inquiry-mode states, and document exact remaining seller inputs. Do not generate fake testimonials, fake stock/discount, misleading order confirmation, wrong product imagery or nonexistent payment success.

---

## 14. REQUIRED EXECUTION ORDER — RUN NOW

**Phase A · Inspect:** Inventory all attachments and validate the 18 + 35 SKU contract. Review brand book and reference video/source HTML. Output a concise asset/data reconciliation report.

**Phase B · Construct:** Create typed combined catalog + image pipeline; reconcile each fashion Drive ID and accessory PDF crop. Set correct price/availability status.

**Phase C · Design & Build:** Implement premium brand system, motion language, responsive pages, product gallery, search, filters, wishlist and mixed inquiry bag. Reuse the attached existing storefront's proven interactions if supplied.

**Phase D · Commerce:** Wire user actions to functioning inquiry flow with copy and Messenger open; build integration-ready price/stock management without pretending payment exists.

**Phase E · QA:** Run all data invariants, build/test, e2e shopping scenarios, image checks, desktop/mobile screenshots and accessibility checks; repair all observed defects.

**Phase F · Handoff:** Export runnable source, GHL adaptation, exact 53-SKU assets, preview/screenshots, test evidence and blocked-items launch checklist.

### ACCEPTANCE STATEMENT

> You have not completed this assignment by providing a design concept, static landing-page picture, only 18 garments, only 35 accessories, a non-functional shopping cart, a fake checkout, or a site with broken product photographs. Completion means a runnable, visually refined, genuinely interactive **53-SKU fashion + artisan accessories experience** with honest availability/price semantics and documented deployment dependencies.

**BEGIN IMPLEMENTATION. DO THE WORK IN THE CURRENT SESSION.**
