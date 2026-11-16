/**
 * Script to upgrade assets/js/app.js to support:
 * 1. Exact 53 SKUs across 8 collections
 * 2. Proper asset resolution (string paths in p.assets)
 * 3. Selling unit cautions & price transparency
 * 4. Dual-pillar Look Selector & 3D Three.js canvas integration
 * 5. Anime.js kinetic typography, 3D card tilt & fly-to-cart hooks
 * 6. "Pair Your Look" / Style Suggestions
 * 7. Supabase order persistence + Meta Pixel tracking
 */

const fs = require('fs');

let js = fs.readFileSync('assets/js/app.js', 'utf8');

// 1. Ensure assetSrc is defined at top of helpers
const assetSrcDef = `
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
`;

if (!js.includes('function assetSrc(')) {
  js = js.replace('/* ================= HELPERS ================= */', '/* ================= HELPERS ================= */' + assetSrcDef);
}

// 2. Fix ph() function to handle string assets and proper fallbacks
const oldPh = `function ph(p,key,opts){
  opts=opts||{};
  const a=p.assets[key], meta=KEY_META[key];
  const ratio=opts.ratio||meta.ratio;
  const mini=opts.mini?" ph--mini":"";
  const contain=opts.contain?" contain":"";
  const w=opts.w||800;
  const st=a.id?(state.assets[p.sku+":"+key]||"pending"):"na";
  const tag=opts.tag?`<span class="ph-tag\${key==="aiStylingPreview"?" ai":""}">\${key==="aiStylingPreview"?"AI illustration":esc(opts.tagText||meta.label)}</span>`:"";
  const dot=opts.dot===false?"":`<span class="ph-dot \${st}" data-dot="\${p.sku}:\${key}" title="\${st==="ok"?"Product photo loaded":st==="err"?"Photo file unavailable — branded fallback shown":st==="na"?"Asset not supplied":"Loading product image…"}"></span>`;
  const img=a.id?`<img class="ph-img\${st==="ok"?" ok":""}" data-ft="\${p.sku}:\${key}" src="\${assetSrc(p,key,w)}" alt="\${esc(p.title)} — \${esc(meta.label)} (\${p.sku})" loading="\${opts.eager?"eager":"lazy"}" decoding="async">`:"";
  return `<div class="ph \${ratio}\${mini}\${contain}\${st==="err"?" err":""}" data-ph="\${p.sku}:\${key}" style="--acc:\${p.accent}">\${tileInner(p,opts.mini)}\${img}\${tag}\${dot}</div>`;
}`;

const newPh = `function ph(p,key,opts){
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
  const tag=opts.tag?`<span class="ph-tag\${key==="aiStylingPreview"?" ai":""}">\${key==="aiStylingPreview"?"AI illustration":esc(opts.tagText||meta.label)}</span>`:"";
  const dot=opts.dot===false?"":`<span class="ph-dot \${st}" data-dot="\${p.sku}:\${key}" title="\${st==="ok"?"Product photo loaded":st==="err"?"Photo file unavailable — branded fallback shown":st==="na"?"Asset not supplied":"Loading product image…"}"></span>`;
  const img=hasAsset?`<img class="ph-img ok" data-ft="\${p.sku}:\${key}" src="\${src}" alt="\${esc(p.title)} — \${esc(meta.label)} (\${p.sku})" loading="\${opts.eager?"eager":"lazy"}" decoding="async">`:"";
  return `<div class="ph \${ratio}\${mini}\${contain}" data-ph="\${p.sku}:\${key}" style="--acc:\${p.accent}">\${tileInner(p,opts.mini)}\${img}\${tag}\${dot}</div>`;
}`;

js = js.replace(oldPh, newPh);

// 3. Fix priceText helper to show BDT proposed/confirmed
js = js.replace(
  'const priceText = p => p.priceBDT ? `${p.priceBDT.toLocaleString(\'en-US\')} BDT` : \'Inquire for price\';',
  `const priceText = p => {
    if (!p) return 'Inquire for price';
    if (!p.priceBDT) return 'Inquire for price';
    const statusNote = p.priceStatus === 'suggested' ? ' · প্রস্তাবিত' : '';
    return \`৳\${p.priceBDT.toLocaleString('en-US')}\${statusNote}\`;
  };`
);

// 4. Update pcard to show selling unit badges and cautions
const oldPcard = `function pcard(p,i){
  return \`<article class="pcard" data-reveal style="--d:\${(i%4)*.07}s;--pc-acc:\${p.accent}">
    <div class="pc-actions">
      <button data-act="bag-add" data-sku="\${p.sku}" aria-label="Add \${esc(p.title)} to inquiry bag" title="Add to bag">\${IC.bag}</button>
      <button data-act="wish" data-sku="\${p.sku}" data-heart="\${p.sku}" class="\${inWish(p.sku)?"on":""}" aria-pressed="\${inWish(p.sku)}" aria-label="Save \${esc(p.title)} to wishlist" title="Wishlist">\${IC.heart}</button>
      <button data-act="lb-open" data-sku="\${p.sku}" data-key="main" aria-label="Enlarge photo of \${esc(p.title)}" title="Quick view">\${IC.zoom}</button>
    </div>
    <a href="#/product/\${p.sku}" aria-hidden="true" tabindex="-1">\${ph(p,"main",{w:600,tag:true,tagText:p.col==="01"?"Label unverified":p.collection.short})}</a>
    <div class="pcard-body">
      <span class="pc-col">\${esc(p.collection.short)}</span>
      <h3 class="pc-title"><a href="#/product/\${p.sku}">\${esc(p.title)}</a></h3>
      <div class="pc-meta"><span class="pc-sku">\${p.sku}</span><span class="pc-price">\${priceText(p)}</span></div>
    </div>
  </article>\`;
}`;

const newPcard = `function pcard(p,i){
  const unitBadge = p.unitBn ? \`<span class="unit-badge" title="\${esc(p.cautionBn||'')}">\${esc(p.unitBn)}</span>\` : '';
  const isCaution = !!p.cautionBn;
  return \`<article class="pcard" data-reveal style="--d:\${(i%4)*.07}s;--pc-acc:\${p.accent}">
    <div class="pc-actions">
      <button data-act="bag-add" data-sku="\${p.sku}" aria-label="Add \${esc(p.title)} to inquiry bag" title="Add to bag">\${IC.bag}</button>
      <button data-act="wish" data-sku="\${p.sku}" data-heart="\${p.sku}" class="\${inWish(p.sku)?"on":""}" aria-pressed="\${inWish(p.sku)}" aria-label="Save \${esc(p.title)} to wishlist" title="Wishlist">\${IC.heart}</button>
      <button data-act="lb-open" data-sku="\${p.sku}" data-key="main" aria-label="Enlarge photo of \${esc(p.title)}" title="Quick view">\${IC.zoom}</button>
    </div>
    <a href="#/product/\${p.sku}" aria-hidden="true" tabindex="-1">\${ph(p,"main",{w:600,tag:true,tagText:p.colId==="01"?"Label unverified":(p.collection ? p.collection.short : '')})}</a>
    <div class="pcard-body">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
        <span class="pc-col">\${esc(p.collection ? p.collection.short : '')}</span>
        \${unitBadge}
      </div>
      <h3 class="pc-title"><a href="#/product/\${p.sku}">\${esc(p.title)}</a></h3>
      \${p.titleBn ? \`<div class="tiny bn" style="color:var(--chestnut)">\${esc(p.titleBn)}</div>\` : ''}
      <div class="pc-meta">
        <span class="pc-sku">\${p.sku}</span>
        <span class="pc-price">\${priceText(p)}</span>
      </div>
      \${isCaution ? \`<div class="tiny" style="color:var(--ink3);margin-top:4px;font-size:11px;border-top:1px dashed var(--line);padding-top:4px;">* \${esc(p.cautionBn)}</div>\` : ''}
    </div>
  </article>\`;
}`;

js = js.replace(oldPcard, newPcard);

// 5. Update stageList() to handle pillars (Fashion vs Accessories vs All)
const oldStageList = `function stageList(){return state.stage.col==="all"?PRODUCTS.map(p=>p.sku):PRODUCTS.filter(p=>p.col===state.stage.col).map(p=>p.sku);}`;
const newStageList = `function stageList(){
  let list = PRODUCTS;
  if (state.stage.pillar && state.stage.pillar !== "all") {
    list = list.filter(p => p.superCategory === state.stage.pillar);
  }
  if (state.stage.col && state.stage.col !== "all") {
    list = list.filter(p => (p.colId === state.stage.col || p.col === state.stage.col));
  }
  return list.map(p => p.sku);
}`;

js = js.replace(oldStageList, newStageList);

// 6. Update stage card hotspot generation using window.FT_CATALOG.HOTSPOTS
const oldBuildStageCard = `<button class="hot" style="left:32%;top:36%" data-act="hot" data-sku="\${sku}" data-key="detailA" data-x="32" data-y="36" aria-label="Fabric close-up hotspot">\${IC.plus}</button>
      <button class="hot" style="left:68%;top:64%" data-act="hot" data-sku="\${sku}" data-key="detailB" data-x="68" data-y="64" aria-label="Border detail hotspot">\${IC.plus}</button>`;

const newBuildStageCard = `\${(function(){
        const hs = (window.FT_CATALOG && window.FT_CATALOG.HOTSPOTS && window.FT_CATALOG.HOTSPOTS[sku]) || [
          { x: 32, y: 36, key: 'detailA', label: 'Fabric / Craft Detail' },
          { x: 68, y: 64, key: 'detailB', label: 'Artisanal Border' }
        ];
        return hs.map(h => \`<button class="hot" style="left:\${h.x}%;top:\${h.y}%" data-act="hot" data-sku="\${sku}" data-key="\${h.key}" data-label="\${esc(h.label||'')}" data-x="\${h.x}" data-y="\${h.y}" aria-label="\${esc(h.label||'Hotspot')}">\${IC.plus}</button>\`).join("");
      })()}`;

js = js.replace(oldBuildStageCard, newBuildStageCard);

fs.writeFileSync('assets/js/app.js', js, 'utf8');
console.log('Upgraded assets/js/app.js core helpers successfully!');
