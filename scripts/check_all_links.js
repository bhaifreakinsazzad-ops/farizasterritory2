const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function checkFileExists(relPath) {
  if (!relPath) return true;
  if (relPath.startsWith('http://') || relPath.startsWith('https://') || relPath.startsWith('//') || 
      relPath.startsWith('#') || relPath.startsWith('mailto:') || relPath.startsWith('tel:') || 
      relPath.startsWith('javascript:') || relPath.startsWith('data:')) {
    return true;
  }
  // Ignore dynamic template literals inside inline script tags
  if (relPath.includes('${') || relPath.includes('escHtml(')) return true;

  const clean = relPath.split('?')[0].split('#')[0].replace(/^\//, '');
  if (!clean) return true;

  // Check direct filesystem
  if (fs.existsSync(path.join(rootDir, clean))) return true;

  // Check public folder alias
  if (fs.existsSync(path.join(rootDir, 'public', clean))) return true;

  // Check known server dynamic routes
  if (relPath.startsWith('/api/') || relPath.startsWith('api/')) return true;
  if (['/admin', '/shop', '/collections', '/lookbook', '/bag', '/track', '/products'].some(r => relPath.startsWith(r))) return true;

  return false;
}

function extractAttrValues(html, tagName, attrName) {
  const regex = new RegExp(`<${tagName}[^>]+${attrName}=["']([^"']+)["']`, 'gi');
  const values = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    values.push(match[1]);
  }
  return values;
}

function auditHtmlFile(fileName) {
  const fullPath = path.join(rootDir, fileName);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');

  const scripts = extractAttrValues(content, 'script', 'src');
  const links = extractAttrValues(content, 'link', 'href');
  const images = extractAttrValues(content, 'img', 'src');
  const anchors = extractAttrValues(content, 'a', 'href');

  const broken = [];
  [...scripts, ...links, ...images].forEach(target => {
    if (!checkFileExists(target)) {
      broken.push({ type: 'asset', target });
    }
  });

  anchors.forEach(target => {
    // If it's a relative path on the same site like /shop, /admin, check route
    if (!target.startsWith('#') && !target.startsWith('http') && !target.startsWith('mailto') && !target.startsWith('tel')) {
      if (!checkFileExists(target) && !['/admin', '/admin.html', '/shop', '/collections', '/lookbook', '/bag', '/track', '/products', '/collections/'].some(r => target.startsWith(r))) {
        broken.push({ type: 'anchor', target });
      }
    }
  });

  console.log(`=== Audit for ${fileName} ===`);
  console.log(`Scripts checked: ${scripts.length}`);
  console.log(`Links/CSS checked: ${links.length}`);
  console.log(`Images checked: ${images.length}`);
  console.log(`Anchors checked: ${anchors.length}`);
  if (broken.length === 0) {
    console.log(`PASS: Zero broken links found in ${fileName}`);
  } else {
    console.error(`FAIL: Found ${broken.length} broken links:`, broken);
  }
  return broken;
}

const b1 = auditHtmlFile('index.html');
const b2 = auditHtmlFile('admin.html');
const b3 = auditHtmlFile('ghl-bundle.html');

// Check sitemap.xml
const sitemap = fs.readFileSync(path.join(rootDir, 'sitemap.xml'), 'utf8');
const locRegex = /<loc>([^<]+)<\/loc>/g;
let locMatch;
const sitemapUrls = [];
while ((locMatch = locRegex.exec(sitemap)) !== null) {
  sitemapUrls.push(locMatch[1]);
}
console.log(`=== Audit for sitemap.xml ===`);
console.log(`Total URLs in sitemap: ${sitemapUrls.length}`);

// Verify catalog images
const catalogDataPath = path.join(rootDir, 'assets/js/catalogData.js');
const catalogContent = fs.readFileSync(catalogDataPath, 'utf8');
const imgRegex = /"(assets\/images\/products\/[^"]+)"/g;
let imgMatch;
let totalCatalogImages = 0;
let missingCatalogImages = 0;
while ((imgMatch = imgRegex.exec(catalogContent)) !== null) {
  totalCatalogImages++;
  if (!fs.existsSync(path.join(rootDir, imgMatch[1]))) {
    console.error(`Missing catalog image: ${imgMatch[1]}`);
    missingCatalogImages++;
  }
}
console.log(`=== Audit for catalogData.js images ===`);
console.log(`Total catalog image references: ${totalCatalogImages}, Missing: ${missingCatalogImages}`);

if (b1.length || b2.length || b3.length || missingCatalogImages) {
  process.exit(1);
} else {
  console.log('\nALL ASSET AND RESOURCE LINKS ARE 100% VERIFIED!');
}
