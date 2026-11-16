import re

with open('assets/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Fix testAsset
old_test_asset = """function testAsset(sku,key){
  return new Promise(res=>{
    const p=bySku(sku), a=p.assets[key];
    if(!a.id){setAssetStatus(sku,key,"na");res("na");return;}
    setAssetStatus(sku,key,"pending");
    const im=new Image(); let done=false;
    const fin=st=>{if(done)return;done=true;setAssetStatus(sku,key,st);res(st);};
    im.onload=()=>fin(im.naturalWidth>1?"ok":"err");
    im.onerror=()=>fin("err");
    setTimeout(()=>fin("err"),10000);
    im.src=assetSrc(p,key,400);
  });
}"""

new_test_asset = """function testAsset(sku,key){
  return new Promise(res=>{
    const p=bySku(sku), a=p.assets?p.assets[key]:null;
    if(!a){setAssetStatus(sku,key,"na");res("na");return;}
    setAssetStatus(sku,key,"pending");
    const im=new Image(); let done=false;
    const fin=st=>{if(done)return;done=true;setAssetStatus(sku,key,st);res(st);};
    im.onload=()=>fin(im.naturalWidth>1?"ok":"err");
    im.onerror=()=>fin("err");
    setTimeout(()=>fin("err"),10000);
    im.src=assetSrc(p,key,400);
  });
}"""
js = js.replace(old_test_asset, new_test_asset)

# 2. Fix renderPiecePanel assets array
old_piece_assets = 'const assets=["main","detailA","detailB"].filter(k=>p.assets[k].id);'
new_piece_assets = 'const assets=["main","original","detailA","socialSquare"].filter(k=>p.assets&&p.assets[k]);'
js = js.replace(old_piece_assets, new_piece_assets)

old_piece_ai_note = '${p.assets.aiStylingPreview.id?"An AI styling illustration exists for this piece and is clearly labelled on its page.":"No AI preview supplied for this piece."}'
new_piece_ai_note = '${(p.assets&&p.assets.aiStylingPreview)?"An AI styling illustration exists for this piece and is clearly labelled on its page.":"Genuine product photography only."}'
js = js.replace(old_piece_ai_note, new_piece_ai_note)

# 3. Fix pageProduct AI block & gal-thumbs
old_page_prod_ai = """          ${p.assets.aiStylingPreview.id?
            `<div style="max-width:280px" data-act="lb-open" data-sku="${p.sku}" data-key="aiStylingPreview" role="button" tabindex="0" aria-label="Enlarge AI styling illustration">${ph(p,"aiStylingPreview",{w:600,tag:true})}</div>
             <p class="small" style="margin-top:10px">Illustrative styling concept only. Always refer to the real photographs above for the actual garment.</p>`:
            `<p class="small">No AI styling preview was supplied for this piece in the source catalog (asset status: <code>not_supplied</code>).</p>`}"""

new_page_prod_ai = """          ${(p.assets&&p.assets.aiStylingPreview)?
            `<div style="max-width:280px" data-act="lb-open" data-sku="${p.sku}" data-key="aiStylingPreview" role="button" tabindex="0" aria-label="Enlarge AI styling illustration">${ph(p,"aiStylingPreview",{w:600,tag:true})}</div>
             <p class="small" style="margin-top:10px">Illustrative styling concept only. Always refer to the real photographs above for the actual garment.</p>`:
            `<p class="small">Authentic source catalog photography. No AI concept preview generated for this piece.</p>`}"""
js = js.replace(old_page_prod_ai, new_page_prod_ai)

old_gal_thumbs = """        <div class="gal-thumbs" id="gal-thumbs" data-reveal style="--d:.08s" role="tablist" aria-label="Photo gallery">
          ${PHOTO_KEYS.map(k=>`<button role="tab" data-act="gal" data-key="${k}" data-sku="${p.sku}" class="${k==="main"?"on":""}" aria-selected="${k==="main"}" aria-label="${KEY_META[k].label}">
            ${ph(p,k,{mini:true,w:200,dot:false,ratio:"r45"})}<span class="gt-l">${k==="socialSquare"?"1:1":k==="storyReel"?"9:16":k==="detailA"?"Det A":k==="detailB"?"Det B":k}</span>
          </button>`).join("")}
        </div>"""

new_gal_thumbs = """        <div class="gal-thumbs" id="gal-thumbs" data-reveal style="--d:.08s" role="tablist" aria-label="Photo gallery">
          ${PHOTO_KEYS.filter(k=>p.assets&&p.assets[k]).map(k=>`<button role="tab" data-act="gal" data-key="${k}" data-sku="${p.sku}" class="${k==="main"?"on":""}" aria-selected="${k==="main"}" aria-label="${KEY_META[k].label}">
            ${ph(p,k,{mini:true,w:200,dot:false,ratio:(p.superCategory==="Accessories"||k==="socialSquare"||k==="detailA")?"r11":"r45"})}<span class="gt-l">${k==="socialSquare"?"1:1":k==="storyReel"?"9:16":k==="detailA"?"Close-up":k==="original"?"Original":k==="alternate"?"Alt":k}</span>
          </button>`).join("")}
        </div>"""
js = js.replace(old_gal_thumbs, new_gal_thumbs)

# 4. Fix pageLookbook AI filter
old_look_ai = '${PRODUCTS.filter(p=>p.assets.aiStylingPreview.id).map((p,i)=>`'
new_look_ai = '${PRODUCTS.filter(p=>p.assets&&p.assets.aiStylingPreview).map((p,i)=>`'
js = js.replace(old_look_ai, new_look_ai)

# 5. Fix lbList and renderLB
old_lb_list = 'function lbList(sku){const p=bySku(sku);const l=PHOTO_KEYS.slice();if(p.assets.aiStylingPreview.id)l.push("aiStylingPreview");return l;}'
new_lb_list = 'function lbList(sku){const p=bySku(sku);const l=PHOTO_KEYS.filter(k=>p.assets&&p.assets[k]);return l.length?l:["main"];}'
js = js.replace(old_lb_list, new_lb_list)

old_lb_src = '$("#lb-src").innerHTML=p.assets[key].id?`<a href="${driveView(p.assets[key].id)}" target="_blank" rel="noopener" style="text-decoration:underline">Open source Drive file ↗</a>`:"Asset not supplied";'
new_lb_src = 'const lbPath=assetSrc(p,key,1600); $("#lb-src").innerHTML=lbPath?`<a href="${lbPath}" target="_blank" rel="noopener" style="text-decoration:underline">View high-resolution photo ↗</a>`:"Asset not supplied";'
js = js.replace(old_lb_src, new_lb_src)

# 6. Fix selfTest
old_self_test = 'const ids=PRODUCTS.reduce((a,p)=>a+KEYS.filter(k=>p.assets[k].id).length,0);'
new_self_test = 'const ids=PRODUCTS.reduce((a,p)=>a+PHOTO_KEYS.filter(k=>p.assets&&p.assets[k]).length,0);'
js = js.replace(old_self_test, new_self_test)

# 7. Update pageCollections header and cards
old_page_cols_regex = r'function pageCollections\(\)\{[\s\S]*?return `[\s\S]*?<\/div><\/div>`;\s*\}'

new_page_cols = """function pageCollections(){
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>Eight houses of craft</span>
    <h1 class="h-display kinetic-title" data-reveal style="--d:.06s;margin-top:12px">The Collections</h1>
    <p class="lede" data-reveal style="--d:.12s;margin-top:10px">53 verified pieces across 8 collections — 5 boutique fashion houses and 3 artisan accessory workshops based in Mirpur, Dhaka.</p>
  </div></div>
  <div class="page-body"><div class="container">
    ${COLLECTIONS.map((c,i)=>{
      const items=PRODUCTS.filter(p=>p.col===c.id || p.colId===c.id);
      return `<div class="crow" data-reveal style="--d:${i*.06}s;--acc:${c.acc}">
        <div class="crow-num">${c.id}</div>
        <div>
          <div style="display:flex;align-items:center;gap:8px">
            <h2 class="crow-name">${esc(c.name)}</h2>
            <span class="tag tiny" style="background:color-mix(in srgb,${c.acc} 15%,transparent);color:var(--ink)">${esc(c.pillar)}</span>
          </div>
          ${c.nameBn ? `<div class="tiny bn" style="color:var(--chestnut);margin:2px 0 6px">${esc(c.nameBn)}</div>` : ''}
          <p class="crow-note">${esc(c.note)}</p>
          <span class="tiny" style="display:block;margin-top:6px">${c.count} verified piece${c.count>1?"s":""}</span>
        </div>
        <div class="crow-thumbs">${items.slice(0,3).map(p=>ph(p,"main",{mini:true,w:240,dot:false})).join("")}</div>
        <a class="btn btn-ink" href="#/shop?c=${c.id}"><span>Explore ${c.count}</span>${IC.arrow}</a>
      </div>`;}).join("")}
    <div style="margin-top:36px">${offerNote()}</div>
  </div></div>`;
}"""

js = re.sub(old_page_cols_regex, new_page_cols, js)

# 8. Add collection deep-linking in render()
if 'case "collection":' not in js:
    col_route = """    case "collection":{
      const targetCol = colById(r.param);
      if(targetCol && targetCol.id){
        state.shop.c = targetCol.id;
        state.shop.pillar = targetCol.pillar;
        html = pageShop();
        title = `${targetCol.name} (${targetCol.count} pieces) — Fariza's Territory`;
      } else {
        html = pageCollections();
      }
      break;
    }"""
    js = js.replace('case "collections":html=pageCollections();break;', 'case "collections":html=pageCollections();break;\n' + col_route)

# 9. Improve colById to handle slug and id matching
old_col_by_id = "const colById = id => COLLECTIONS.find(c => c.id === id) || { name: 'Collection', short: 'Collection', acc: '#8E3B66' };"
new_col_by_id = "const colById = id => COLLECTIONS.find(c => c.id === id || c.id === String(id).padStart(2, '0') || c.slug === id) || { name: 'Collection', short: 'Collection', acc: '#8E3B66' };"
js = js.replace(old_col_by_id, new_col_by_id)

with open('assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Updated asset access and collection handling in app.js!')
