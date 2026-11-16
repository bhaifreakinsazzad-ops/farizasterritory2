import re

with open('assets/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Add assetSrc helper if missing
asset_src_def = """
function assetSrc(p, key, w) {
  if (!p || !p.assets) return '';
  const a = p.assets[key];
  if (typeof a === 'string') return a;
  if (a && a.src) return a.src;
  if (a && a.id) return a.id;
  if (p.assets.main) {
    return typeof p.assets.main === 'string' ? p.assets.main : (p.assets.main.src || '');
  }
  return 'assets/products/' + p.sku + '/main.webp';
}
"""

if 'function assetSrc(' not in js:
    js = js.replace('/* ================= HELPERS ================= */', '/* ================= HELPERS ================= */' + asset_src_def)

# 2. Fix ph() function to handle string paths and WebP loading reliably
old_ph_pattern = r'function ph\(p,key,opts\)\{[\s\S]*?return `<div class="ph \$\{ratio\}\$\{mini\}\$\{contain\}\$\{st==="err"\?" err":""\}" data-ph="\$\{p\.sku\}:\$\{key\}" style="--acc:\$\{p\.accent\}">\$\{tileInner\(p,opts\.mini\)\}\$\{img\}\$\{tag\}\$\{dot\}</div>`;\s*\}'

new_ph = """function ph(p,key,opts){
  opts=opts||{};
  const a=p.assets ? p.assets[key] : null;
  const meta=KEY_META[key] || { label: key, ratio: "r45", auth: "source" };
  const ratio=opts.ratio||meta.ratio||"r45";
  const mini=opts.mini?" ph--mini":"";
  const contain=opts.contain?" contain":"";
  const w=opts.w||800;
  const src = assetSrc(p, key, w);
  const hasAsset = !!src;
  const st = hasAsset ? (state.assets[p.sku+":"+key]||"ok") : "na";
  const tag=opts.tag?`<span class="ph-tag${key==="aiStylingPreview"?" ai":""}">${key==="aiStylingPreview"?"AI illustration":esc(opts.tagText||meta.label)}</span>`:"";
  const dot=opts.dot===false?"":`<span class="ph-dot ${st}" data-dot="${p.sku}:${key}" title="${st==="ok"?"Product photo loaded":st==="err"?"Photo file unavailable — branded fallback shown":st==="na"?"Asset not supplied":"Loading product image…"}"></span>`;
  const img=hasAsset?`<img class="ph-img ok" data-ft="${p.sku}:${key}" src="${src}" alt="${esc(p.title)} — ${esc(meta.label)} (${p.sku})" loading="${opts.eager?"eager":"lazy"}" decoding="async">`:"";
  return `<div class="ph ${ratio}${mini}${contain}" data-ph="${p.sku}:${key}" style="--acc:${p.accent}">${tileInner(p,opts.mini)}${img}${tag}${dot}</div>`;
}"""

js = re.sub(old_ph_pattern, new_ph, js)

# 3. Update priceText helper
old_price_text = 'const priceText = p => p.priceBDT ? `${p.priceBDT.toLocaleString(\'en-US\')} BDT` : \'Inquire for price\';'
new_price_text = """const priceText = p => {
  if (!p) return 'Inquire for price';
  if (!p.priceBDT) return 'Inquire for price';
  const statusNote = p.priceStatus === 'suggested' ? ' · প্রস্তাবিত' : '';
  return `৳${p.priceBDT.toLocaleString('en-US')}${statusNote}`;
};"""
js = js.replace(old_price_text, new_price_text)

# 4. Update pcard to show selling unit badges and cautions
old_pcard_pattern = r'function pcard\(p,i\)\{[\s\S]*?return `<article class="pcard"[\s\S]*?<\/article>`;\s*\}'
new_pcard = """function pcard(p,i){
  const unitBadge = p.unitBn ? `<span class="unit-badge" title="${esc(p.cautionBn||'')}">${esc(p.unitBn)}</span>` : '';
  const isCaution = !!p.cautionBn;
  return `<article class="pcard" data-reveal style="--d:${(i%4)*.07}s;--pc-acc:${p.accent}">
    <div class="pc-actions">
      <button data-act="bag-add" data-sku="${p.sku}" aria-label="Add ${esc(p.title)} to inquiry bag" title="Add to bag">${IC.bag}</button>
      <button data-act="wish" data-sku="${p.sku}" data-heart="${p.sku}" class="${inWish(p.sku)?"on":""}" aria-pressed="${inWish(p.sku)}" aria-label="Save ${esc(p.title)} to wishlist" title="Wishlist">${IC.heart}</button>
      <button data-act="lb-open" data-sku="${p.sku}" data-key="main" aria-label="Enlarge photo of ${esc(p.title)}" title="Quick view">${IC.zoom}</button>
    </div>
    <a href="#/product/${p.sku}" aria-hidden="true" tabindex="-1">${ph(p,"main",{w:600,tag:true,tagText:(p.colId==="01"||p.col==="01")?"Label unverified":(p.collection ? p.collection.short : '')})}</a>
    <div class="pcard-body">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <span class="pc-col">${esc(p.collection ? p.collection.short : '')}</span>
        ${unitBadge}
      </div>
      <h3 class="pc-title"><a href="#/product/${p.sku}">${esc(p.title)}</a></h3>
      ${p.titleBn ? `<div class="tiny bn" style="color:var(--chestnut)">${esc(p.titleBn)}</div>` : ''}
      <div class="pc-meta">
        <span class="pc-sku">${p.sku}</span>
        <span class="pc-price">${priceText(p)}</span>
      </div>
      ${isCaution ? `<div class="tiny" style="color:var(--ink3);margin-top:4px;font-size:11px;border-top:1px dashed var(--line);padding-top:4px;">* ${esc(p.cautionBn)}</div>` : ''}
    </div>
  </article>`;
}"""
js = re.sub(old_pcard_pattern, new_pcard, js)

# 5. Update stageList
old_stage_list = 'function stageList(){return state.stage.col==="all"?PRODUCTS.map(p=>p.sku):PRODUCTS.filter(p=>p.col===state.stage.col).map(p=>p.sku);}'
new_stage_list = """function stageList(){
  let list = PRODUCTS;
  if (state.stage.pillar && state.stage.pillar !== "all") {
    list = list.filter(p => p.superCategory === state.stage.pillar);
  }
  if (state.stage.col && state.stage.col !== "all") {
    list = list.filter(p => (p.colId === state.stage.col || p.col === state.stage.col));
  }
  return list.map(p => p.sku);
}"""
js = js.replace(old_stage_list, new_stage_list)

with open('assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Updated app.js with basic fixes')
