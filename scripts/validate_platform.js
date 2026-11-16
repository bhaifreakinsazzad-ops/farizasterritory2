/**
 * Full Platform Verification Script
 */
const fs = require('fs');
const path = require('path');

// 1. Verify catalogData.js
require('../assets/js/catalogData.js');
const catalog = globalThis.FT_CATALOG;

if (!catalog) {
  console.error('FAIL: window.FT_CATALOG is not defined!');
  process.exit(1);
}

console.log('--- Catalog System Verification ---');
console.log('Total Collections:', catalog.COLLECTIONS.length);
console.log('Total Products:', catalog.PRODUCTS.length);

if (catalog.COLLECTIONS.length !== 8) {
  console.error(`FAIL: Expected exactly 8 collections, got ${catalog.COLLECTIONS.length}`);
  process.exit(1);
}

if (catalog.PRODUCTS.length !== 53) {
  console.error(`FAIL: Expected exactly 53 products, got ${catalog.PRODUCTS.length}`);
  process.exit(1);
}

// Check fashion vs accessories counts
const fashionCount = catalog.PRODUCTS.filter(p => p.superCategory === 'Fashion').length;
const accCount = catalog.PRODUCTS.filter(p => p.superCategory === 'Accessories').length;

console.log('Fashion SKUs:', fashionCount, '(Expected 18)');
console.log('Accessories SKUs:', accCount, '(Expected 35)');

if (fashionCount !== 18 || accCount !== 35) {
  console.error('FAIL: SKU counts do not match expected 18 fashion and 35 accessories!');
  process.exit(1);
}

// 2. Check image assets on disk
let missingAssets = 0;
let checkedAssets = 0;

catalog.PRODUCTS.forEach(p => {
  if (!p.assets || !p.assets.main) {
    console.error(`FAIL: Product ${p.sku} has no main asset defined!`);
    missingAssets++;
    return;
  }

  // Check main.webp
  checkedAssets++;
  if (!fs.existsSync(p.assets.main)) {
    console.error(`Missing main asset for ${p.sku}: ${p.assets.main}`);
    missingAssets++;
  }

  // Check socialSquare
  if (p.assets.socialSquare) {
    checkedAssets++;
    if (!fs.existsSync(p.assets.socialSquare)) {
      console.error(`Missing socialSquare asset for ${p.sku}: ${p.assets.socialSquare}`);
      missingAssets++;
    }
  }
});

console.log(`Checked ${checkedAssets} image assets on disk. Missing: ${missingAssets}`);

if (missingAssets > 0) {
  console.error('FAIL: Some image files are missing on disk!');
  process.exit(1);
}

// 3. Verify JavaScript files exist and have no syntax errors
const jsFiles = [
  'assets/js/config.js',
  'assets/js/supabaseClient.js',
  'assets/js/catalogData.js',
  'assets/js/threeHero.js',
  'assets/js/animePolish.js',
  'assets/js/app.js'
];

console.log('--- JavaScript Files Verification ---');
jsFiles.forEach(f => {
  if (!fs.existsSync(f)) {
    console.error(`FAIL: File does not exist: ${f}`);
    process.exit(1);
  }
  const code = fs.readFileSync(f, 'utf8');
  try {
    new Function(code);
    console.log(`PASS: ${f} (${(code.length / 1024).toFixed(1)} KB) syntax OK`);
  } catch (err) {
    console.error(`FAIL: Syntax error in ${f}:`, err.message);
    process.exit(1);
  }
});

// 4. Verify index.html and admin.html
console.log('--- HTML Pages Verification ---');
['index.html', 'admin.html', 'ghl-bundle.html'].forEach(f => {
  if (!fs.existsSync(f)) {
    console.error(`FAIL: HTML file does not exist: ${f}`);
    process.exit(1);
  }
  const content = fs.readFileSync(f, 'utf8');
  console.log(`PASS: ${f} (${(content.length / 1024).toFixed(1)} KB) present`);
});

console.log('\n=========================================');
console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
console.log('=========================================');
