/**
 * Validates a seller-signed docs/SELLER_53_SKU_LEDGER.csv and either outputs
 * reconciliation SQL (--sql-out <path>) or applies it directly to Supabase (--apply)
 * when SUPABASE_SERVICE_ROLE_KEY is set.
 *
 * Usage:
 *   node scripts/apply_seller_ledger.js [--csv docs/SELLER_53_SKU_LEDGER.csv] [--sql-out path.sql] [--apply]
 */
const fs = require('fs');
const path = require('path');

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function loadLedger(csvPath) {
  const raw = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
  const headers = parseCsvLine(raw[0]);
  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    if (!raw[i].trim()) continue;
    const cols = parseCsvLine(raw[i]);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (cols[idx] || '').trim();
    });
    rows.push(obj);
  }
  return rows;
}

function escSql(val) {
  if (val === undefined || val === null || val === '') return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

async function main() {
  const args = process.argv.slice(2);
  const csvIdx = args.indexOf('--csv');
  const sqlIdx = args.indexOf('--sql-out');
  const apply = args.includes('--apply');
  const csvPath = csvIdx !== -1 ? args[csvIdx + 1] : path.join(__dirname, '../docs/SELLER_53_SKU_LEDGER.csv');

  const rows = loadLedger(csvPath);
  const approvedRows = [];
  const pendingSkus = [];

  for (const r of rows) {
    const finalPrice = Number(r.final_BDT_price);
    const stockCount = Number(r.stock_count);
    const stockVerified = String(r.stock_verified).toLowerCase() === 'true';
    const imageApproved = String(r.image_approved).toLowerCase() === 'true';
    const hasSigner = Boolean(r.approved_by && r.approved_at);

    if (
      Number.isFinite(finalPrice) &&
      finalPrice > 0 &&
      Number.isInteger(stockCount) &&
      stockCount >= 0 &&
      stockVerified &&
      imageApproved &&
      hasSigner
    ) {
      approvedRows.push({
        sku: r.SKU.toUpperCase(),
        price_bdt: Math.round(finalPrice),
        stock_count: stockCount,
        stock_verified: true,
        price_review: false,
        is_available: stockCount > 0,
        selling_unit: r.selling_unit,
        available_variants: r.available_sizes_or_colors,
        image_approved: true,
        return_policy_scope: r.return_policy_scope,
        approved_by: r.approved_by,
        approved_at: r.approved_at
      });
    } else {
      pendingSkus.push(r.SKU.toUpperCase());
    }
  }

  console.log(`Ledger rows parsed: ${rows.length}`);
  console.log(`Fully signed & eligible for live catalog/feeds: ${approvedRows.length}`);
  console.log(`Pending seller sign-off (kept unverified/blocked from ads): ${pendingSkus.length}`);

  const sql = approvedRows
    .map(
      a =>
        `UPDATE public.products SET ` +
        `price_bdt = ${a.price_bdt}, stock_count = ${a.stock_count}, stock_verified = true, price_review = false, ` +
        `is_available = ${a.is_available}, selling_unit = ${escSql(a.selling_unit)}, available_variants = ${escSql(a.available_variants)}, ` +
        `image_approved = true, return_policy_scope = ${escSql(a.return_policy_scope)}, approved_by = ${escSql(a.approved_by)}, ` +
        `approved_at = ${escSql(a.approved_at)}::timestamptz, updated_at = TIMEZONE('utc'::text, NOW()) ` +
        `WHERE sku = ${escSql(a.sku)};`
    )
    .join('\n');

  if (sqlIdx !== -1 && args[sqlIdx + 1]) {
    fs.writeFileSync(args[sqlIdx + 1], sql + '\n', 'utf8');
    console.log(`Wrote SQL reconciliation statements to ${args[sqlIdx + 1]}`);
  }

  if (apply) {
    if (approvedRows.length === 0) {
      console.error('ABORT: 0 approved rows in ledger. Nothing to apply.');
      process.exit(1);
    }
    const { createSupabaseServerStore } = require('../lib/supabaseServer.js');
    const store = createSupabaseServerStore();
    if (!store.isDurableConfigured()) {
      console.error('ABORT: SUPABASE_SERVICE_ROLE_KEY is missing.');
      process.exit(1);
    }
    for (const a of approvedRows) {
      const res = await store.updateProduct(a.sku, a);
      if (!res.ok) {
        console.error(`Failed updating ${a.sku}:`, res.error);
        process.exit(1);
      }
    }
    console.log(`Applied ${approvedRows.length} signed SKU approvals to live Supabase.`);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { loadLedger };
