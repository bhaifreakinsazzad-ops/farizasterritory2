const express = require('express');
const path = require('path');
const fs = require('fs');
const capiHandler = require('./api/capi.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);
app.use(express.json({ limit: '2mb' }));

// Load 53-SKU Master Catalog into server memory for Dynamic Product Ad (DPA) feeds & SEO
function loadCatalogInMemory() {
  try {
    const catalogCode = fs.readFileSync(path.join(__dirname, 'assets/js/catalogData.js'), 'utf8');
    const sandbox = {};
    const fn = new Function('window', catalogCode);
    fn(sandbox);
    return sandbox.FT_CATALOG || { COLLECTIONS: [], PRODUCTS: [], PRODUCTS_BY_SKU: {} };
  } catch (err) {
    console.error('[Server] Failed to load catalogData.js:', err.message);
    return { COLLECTIONS: [], PRODUCTS: [], PRODUCTS_BY_SKU: {} };
  }
}

const FT_CATALOG = loadCatalogInMemory();

// Lightweight server-side order backup store so orders persist on server even before Supabase key setup
const DATA_DIR = path.join(__dirname, '.data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

function readServerOrders() {
  try {
    if (!fs.existsSync(ORDERS_FILE)) return [];
    const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

function writeServerOrders(orders) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders.slice(0, 500), null, 2), 'utf8');
  } catch (e) {
    console.warn('[Server] Could not write local order backup:', e.message);
  }
}

function getBaseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.get('host') || 'farizasterritory.com';
  return `${proto}://${host}`;
}

function csvEscape(val) {
  const s = String(val == null ? '' : val).replace(/\r?\n|\r/g, ' ').trim();
  if (s.includes(',') || s.includes('"') || s.includes(';')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function xmlEscape(val) {
  return String(val == null ? '' : val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Serve static assets from /assets and /public/assets
app.use('/assets/aistudio', express.static(path.join(__dirname, 'public/assets/aistudio'), {
  maxAge: '7d'
}));
app.use('/public/assets', express.static(path.join(__dirname, 'public/assets'), {
  maxAge: '7d'
}));
app.use('/assets', express.static(path.join(__dirname, 'assets'), {
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.webp') || filePath.endsWith('.jpg') || filePath.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));

// Meta Conversions API (CAPI) Endpoint
app.all('/api/capi', async (req, res) => {
  try {
    await capiHandler(req, res);
  } catch (err) {
    console.error('[CAPI Route Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
  }
});

// Health & Advertising Readiness Endpoint
app.get('/api/health', (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.status(200).json({
    ok: true,
    brand: "Fariza's Territory",
    location: 'Mirpur, Dhaka, Bangladesh',
    catalog: {
      totalProducts: FT_CATALOG.PRODUCTS.length,
      totalCollections: FT_CATALOG.COLLECTIONS.length,
      fashionCount: FT_CATALOG.PRODUCTS.filter(p => p.superCategory === 'Fashion').length,
      accessoriesCount: FT_CATALOG.PRODUCTS.filter(p => p.superCategory === 'Accessories').length
    },
    metaCapiConfigured: Boolean(process.env.META_CAPI_ACCESS_TOKEN),
    pixelId: process.env.META_PIXEL_ID || '1657670575734647',
    feeds: {
      metaCommerceCsv: `${baseUrl}/api/catalog-feed.csv`,
      googleMetaXml: `${baseUrl}/api/catalog-feed.xml`,
      jsonCatalog: `${baseUrl}/api/catalog-feed.json`,
      masterDatabaseJson: `${baseUrl}/assets/aistudio/PRODUCTS_53_MASTER_DATABASE_d064c566.json`,
      brandBookPdf: `${baseUrl}/assets/aistudio/fariza_s_territory_brand_book_by_pomelli_1e38cd9b.pdf`
    }
  });
});

// Server-side Order Persistence Backup API
app.get('/api/orders', (req, res) => {
  res.status(200).json({ ok: true, orders: readServerOrders() });
});

app.post('/api/orders', (req, res) => {
  const body = req.body || {};
  if (!body.order_ref && !body.orderRef) {
    return res.status(400).json({ ok: false, error: 'Missing order_ref' });
  }
  const orders = readServerOrders();
  const normalizedRef = body.order_ref || body.orderRef;
  const record = {
    id: body.id || ('srv-' + Date.now()),
    order_ref: normalizedRef,
    customer_name: body.customer_name || body.name || '',
    customer_phone: body.customer_phone || body.phone || '',
    customer_email: body.customer_email || body.email || '',
    customer_district: body.customer_district || body.district || '',
    customer_address: body.customer_address || body.address || '',
    delivery_zone: body.delivery_zone || body.deliveryZone || 'dhaka',
    delivery_fee: body.delivery_fee ?? body.deliveryFee ?? 80,
    subtotal_bdt: body.subtotal_bdt ?? body.subtotal ?? 0,
    discount_code: body.discount_code || body.discountCode || null,
    discount_bdt: body.discount_bdt ?? body.discountAmount ?? 0,
    total_bdt: body.total_bdt ?? body.total ?? 0,
    payment_method: body.payment_method || body.paymentMethod || 'Cash on Delivery (COD)',
    status: body.status || 'pending',
    items: Array.isArray(body.items) ? body.items : [],
    notes: body.notes || '',
    source: body.source || 'website_inquiry',
    attribution: body.attribution || null,
    created_at: body.created_at || new Date().toISOString()
  };

  const existingIdx = orders.findIndex(o => o.order_ref === normalizedRef);
  if (existingIdx >= 0) {
    orders[existingIdx] = { ...orders[existingIdx], ...record };
  } else {
    orders.unshift(record);
  }
  writeServerOrders(orders);
  return res.status(200).json({ ok: true, order: record });
});

app.patch('/api/orders/:orderRef', (req, res) => {
  const { orderRef } = req.params;
  const { status } = req.body || {};
  const orders = readServerOrders();
  const idx = orders.findIndex(o => o.order_ref === orderRef || o.id === orderRef);
  if (idx >= 0 && status) {
    orders[idx].status = status;
    orders[idx].updated_at = new Date().toISOString();
    writeServerOrders(orders);
    return res.status(200).json({ ok: true, order: orders[idx] });
  }
  return res.status(200).json({ ok: false });
});

// Meta Commerce Manager / Dynamic Product Ads (DPA) CSV Feed (All 53 SKUs)
app.get('/api/catalog-feed.csv', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const headers = [
    'id',
    'title',
    'description',
    'availability',
    'condition',
    'price',
    'link',
    'image_link',
    'additional_image_link',
    'brand',
    'item_group_id',
    'google_product_category',
    'custom_label_0',
    'custom_label_1',
    'custom_label_2',
    'custom_label_3'
  ];

  const rows = [headers.join(',')];
  for (const p of FT_CATALOG.PRODUCTS) {
    const colName = p.collection ? p.collection.name : p.superCategory;
    const unitDisclosure = p.unit ? ` [Selling Unit: ${p.unit}]` : '';
    const cautionDisclosure = p.cautionEn ? ` (${p.cautionEn})` : '';
    const fullDesc = `${p.descriptionEn || p.title}${unitDisclosure}${cautionDisclosure} — ${p.titleBn || ''}`.trim();
    const productLink = `${baseUrl}/?sku=${encodeURIComponent(p.sku)}#/product/${encodeURIComponent(p.sku)}`;
    const mainImage = `${baseUrl}/${String(p.assets?.socialSquare || p.assets?.main || '').replace(/^\/+/, '')}`;
    const altImage = p.assets?.storyReel ? `${baseUrl}/${String(p.assets.storyReel).replace(/^\/+/, '')}` : '';
    const googleCategory = p.superCategory === 'Fashion'
      ? 'Apparel & Accessories > Clothing > Traditional & Ceremonial Clothing'
      : (p.colId === '06'
        ? 'Home & Garden > Decor > Mirrors'
        : 'Apparel & Accessories > Jewelry');

    rows.push([
      csvEscape(p.sku),
      csvEscape(`${p.title} (${p.unit || '1 pc'})`),
      csvEscape(fullDesc),
      csvEscape('in stock'),
      csvEscape('new'),
      csvEscape(`${p.priceBDT || 0} BDT`),
      csvEscape(productLink),
      csvEscape(mainImage),
      csvEscape(altImage),
      csvEscape("Fariza's Territory"),
      csvEscape(`COL-${p.colId}`),
      csvEscape(googleCategory),
      csvEscape(p.superCategory),
      csvEscape(colName),
      csvEscape(p.unit || 'standard'),
      csvEscape(`${p.priceStatus || 'suggested'}_price`)
    ].join(','));
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="farizas-territory-53-catalog-feed.csv"');
  res.status(200).send(rows.join('\n'));
});

// Meta Commerce Manager & Google Merchant Center RSS 2.0 XML Product Feed
app.get(['/api/catalog-feed.xml', '/feed.xml'], (req, res) => {
  const baseUrl = getBaseUrl(req);
  const itemsXml = FT_CATALOG.PRODUCTS.map(p => {
    const colName = p.collection ? p.collection.name : p.superCategory;
    const unitDisclosure = p.unit ? ` [Selling Unit: ${p.unit}]` : '';
    const cautionDisclosure = p.cautionEn ? ` (${p.cautionEn})` : '';
    const fullDesc = `${p.descriptionEn || p.title}${unitDisclosure}${cautionDisclosure}`;
    const productLink = `${baseUrl}/?sku=${encodeURIComponent(p.sku)}#/product/${encodeURIComponent(p.sku)}`;
    const mainImage = `${baseUrl}/${String(p.assets?.socialSquare || p.assets?.main || '').replace(/^\/+/, '')}`;
    const storyImage = `${baseUrl}/${String(p.assets?.storyReel || p.assets?.main || '').replace(/^\/+/, '')}`;

    return `    <item>
      <g:id>${xmlEscape(p.sku)}</g:id>
      <g:title>${xmlEscape(`${p.title} — ${p.titleBn || ''}`)}</g:title>
      <g:description>${xmlEscape(fullDesc)}</g:description>
      <g:link>${xmlEscape(productLink)}</g:link>
      <g:image_link>${xmlEscape(mainImage)}</g:image_link>
      <g:additional_image_link>${xmlEscape(storyImage)}</g:additional_image_link>
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:price>${xmlEscape(`${p.priceBDT || 0} BDT`)}</g:price>
      <g:brand>${xmlEscape("Fariza's Territory")}</g:brand>
      <g:item_group_id>${xmlEscape(`COL-${p.colId}`)}</g:item_group_id>
      <g:custom_label_0>${xmlEscape(p.superCategory)}</g:custom_label_0>
      <g:custom_label_1>${xmlEscape(colName)}</g:custom_label_1>
      <g:custom_label_2>${xmlEscape(p.unit || '')}</g:custom_label_2>
      <g:custom_label_3>${xmlEscape(p.priceStatus || 'suggested')}</g:custom_label_3>
    </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>Fariza's Territory — Official 53-SKU Product Catalog (Dhaka, Bangladesh)</title>
    <link>${xmlEscape(baseUrl)}</link>
    <description>Fashion clothing &amp; handmade artisan accessories based in Mirpur, Dhaka, Bangladesh. Elegance in Every Detail.</description>
${itemsXml}
  </channel>
</rss>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.status(200).send(xml);
});

// JSON Ad Catalog Feed
app.get('/api/catalog-feed.json', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const products = FT_CATALOG.PRODUCTS.map(p => ({
    id: p.sku,
    sku: p.sku,
    title: p.title,
    titleBn: p.titleBn,
    superCategory: p.superCategory,
    collectionId: p.colId,
    collectionName: p.collection ? p.collection.name : '',
    collectionNameBn: p.collection ? p.collection.nameBn : '',
    priceBDT: p.priceBDT,
    currency: 'BDT',
    priceStatus: p.priceStatus,
    sellingUnit: p.unit,
    sellingUnitBn: p.unitBn,
    cautionEn: p.cautionEn,
    cautionBn: p.cautionBn,
    availability: 'in stock',
    condition: 'new',
    brand: "Fariza's Territory",
    deepLink: `${baseUrl}/?sku=${encodeURIComponent(p.sku)}#/product/${encodeURIComponent(p.sku)}`,
    images: {
      main: `${baseUrl}/${String(p.assets?.main || '').replace(/^\/+/, '')}`,
      socialSquare: `${baseUrl}/${String(p.assets?.socialSquare || p.assets?.main || '').replace(/^\/+/, '')}`,
      storyReel: `${baseUrl}/${String(p.assets?.storyReel || p.assets?.main || '').replace(/^\/+/, '')}`
    }
  }));

  res.status(200).json({
    brand: "Fariza's Territory",
    tagline: 'Elegance in Every Detail',
    location: 'Mirpur, Dhaka, Bangladesh',
    pixelId: '1657670575734647',
    totalSkus: products.length,
    collectionsCount: FT_CATALOG.COLLECTIONS.length,
    products
  });
});

// Dynamic XML Sitemap for Search & Social Ad Indexing
app.get('/sitemap.xml', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const nowIso = new Date().toISOString().split('T')[0];
  const urls = [
    `${baseUrl}/`,
    ...FT_CATALOG.COLLECTIONS.map(c => `${baseUrl}/?collection=${encodeURIComponent(c.slug)}#/collection/${encodeURIComponent(c.slug)}`),
    ...FT_CATALOG.PRODUCTS.map(p => `${baseUrl}/?sku=${encodeURIComponent(p.sku)}#/product/${encodeURIComponent(p.sku)}`)
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${xmlEscape(u)}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u === `${baseUrl}/` ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.status(200).send(xml);
});

app.get('/robots.txt', (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.status(200).send(
`User-agent: *
Allow: /
Disallow: /api/orders

Sitemap: ${baseUrl}/sitemap.xml
`
  );
});

// Admin Portal Routes
app.get(['/admin', '/admin.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// GHL Custom HTML Bundle Route
app.get(['/ghl-bundle', '/ghl-bundle.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'ghl-bundle.html'));
});

// Storefront Entry & SPA Fallback (Express 5 compatible)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fariza's Territory Boutique Server running on http://0.0.0.0:${PORT}`);
});
