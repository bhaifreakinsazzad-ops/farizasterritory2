/**
 * Generates docs/SELLER_53_SKU_LEDGER.csv from canonical assets/js/catalogData.js
 * Matches required handover schema:
 * SKU,product_name,category,reference_or_suggested_BDT,final_BDT_price,stock_count,stock_verified,selling_unit,available_sizes_or_colors,image_approved,return_policy_scope,approved_by,approved_at
 */
const fs = require('fs');
const path = require('path');

const catalogCode = fs.readFileSync(path.join(__dirname, '../assets/js/catalogData.js'), 'utf8');
const sandbox = {};
new Function('window', catalogCode)(sandbox);
const { PRODUCTS } = sandbox.FT_CATALOG;

function csvCell(val) {
  const s = String(val == null ? '' : val).replace(/\r?\n|\r/g, ' ').trim();
  if (s.includes(',') || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const headers = [
  'SKU',
  'product_name',
  'category',
  'reference_or_suggested_BDT',
  'final_BDT_price',
  'stock_count',
  'stock_verified',
  'selling_unit',
  'available_sizes_or_colors',
  'image_approved',
  'return_policy_scope',
  'approved_by',
  'approved_at'
];

const rows = [headers.join(',')];

for (const p of PRODUCTS) {
  const category = `${p.superCategory} / ${p.collection ? p.collection.name : p.colId}`;
  const variants =
    p.superCategory === 'Fashion'
      ? (p.details && p.details.stitching) || 'Unstitched — confirm sizes/availability'
      : (p.details && p.details.colors) || 'Confirm colorway';
  const highRiskNote =
    ['FT-JWL-001', 'FT-JWL-002', 'FT-JWL-005', 'FT-BA-001', 'FT-BA-011'].includes(p.sku)
      ? `VERIFY_UNIT: ${p.unit}`
      : p.unit || '1 pc';

  rows.push(
    [
      csvCell(p.sku),
      csvCell(p.title),
      csvCell(category),
      csvCell(p.priceBDT || ''),
      csvCell(''), // final_BDT_price blank until seller confirms
      csvCell('0'), // stock_count 0 until verified
      csvCell('false'), // stock_verified false until verified
      csvCell(highRiskNote),
      csvCell(variants),
      csvCell('PENDING_SELLER'),
      csvCell('Standard COD unboxing inspection'),
      csvCell(''), // approved_by
      csvCell('') // approved_at
    ].join(',')
  );
}

const outPath = path.join(__dirname, '../docs/SELLER_53_SKU_LEDGER.csv');
fs.writeFileSync(outPath, rows.join('\n') + '\n', 'utf8');
console.log(`Generated ${outPath} with ${PRODUCTS.length} SKU rows.`);
