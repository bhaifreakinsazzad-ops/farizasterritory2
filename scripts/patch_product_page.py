import re

with open('assets/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update related pieces in pageProduct
old_related = 'const related=PRODUCTS.filter(x=>x.col===p.col&&x.sku!==p.sku).concat(PRODUCTS.filter(x=>x.col!==p.col)).slice(0,4);'
new_related = """const sameCol = PRODUCTS.filter(x => (x.colId === p.colId || x.col === p.col) && x.sku !== p.sku).slice(0, 2);
  const crossCategory = PRODUCTS.filter(x => x.superCategory !== p.superCategory).slice(0, 2);
  const related = [...sameCol, ...crossCategory].slice(0, 4);"""
js = js.replace(old_related, new_related)

# 2. Update piece details rendering in pageProduct
old_details_pattern = r'<details class="acc" open><summary>Piece details \$\{IC\.chev\}<\/summary><div class="acc-body">[\s\S]*?<\/div><\/details>'

new_details = """<details class="acc" open><summary>Piece details &amp; Craft Specifications ${IC.chev}</summary><div class="acc-body">
          <div class="prov-row"><span>Category</span><span>${esc(p.superCategory)} · ${esc(p.collection ? p.collection.name : '')}</span></div>
          <div class="prov-row"><span>SKU</span><span>${p.sku}</span></div>
          <div class="prov-row"><span>Selling Unit</span><span>${esc(p.unitBn || p.unit || '১টি পণ্য')}</span></div>
          ${p.cautionBn ? `<div class="notice warn" style="margin:10px 0">${IC.alert}<span><b>সতর্কবার্তা:</b> ${esc(p.cautionBn)}</span></div>` : ''}
          ${p.superCategory === 'Accessories' ? `
            ${p.details && p.details.material ? `<div class="prov-row"><span>উপাদান / Material</span><span>${esc(p.details.material)}</span></div>` : ''}
            ${p.details && p.details.dimensions ? `<div class="prov-row"><span>পরিমাপ / Dimensions</span><span>${esc(p.details.dimensions)}</span></div>` : ''}
            ${p.details && p.details.setCaution ? `<div class="prov-row"><span>সেট সতর্কবার্তা</span><span>${esc(p.details.setCaution)}</span></div>` : ''}
          ` : `
            ${p.details && p.details.kameez ? `<div class="prov-row"><span>কামিজ / Kameez</span><span>${esc(p.details.kameez)}</span></div>` : ''}
            ${p.details && p.details.salwar ? `<div class="prov-row"><span>সালোয়ার / Salwar</span><span>${esc(p.details.salwar)}</span></div>` : ''}
            ${p.details && p.details.dupatta ? `<div class="prov-row"><span>ওড়না / Dupatta</span><span>${esc(p.details.dupatta)}</span></div>` : ''}
            ${p.details && p.details.stitching ? `<div class="prov-row"><span>Stitching</span><span>${esc(p.details.stitching)}</span></div>` : ''}
            ${p.details && p.details.fabric ? `<div class="prov-row"><span>Fabric</span><span>${esc(p.details.fabric)}</span></div>` : ''}
          `}
          ${p.descriptionBn ? `<p class="bn" style="color:var(--ink2);margin-top:12px;line-height:1.8">${esc(p.descriptionBn)}</p>` : ''}
          <div class="prov-row"><span>Availability</span><span>Confirmed by seller on inquiry</span></div>
        </div></details>"""

js = re.sub(old_details_pattern, new_details, js)

# 3. Add WhatsApp inquiry button to product actions
old_actions = """        <div class="pi-buy">
          ${messengerBtn("Ask about this piece",p.sku)}
          <button class="btn btn-line wish-line${inWish(p.sku)?" on":""}" style="justify-content:center" data-act="wish" data-sku="${p.sku}" data-heart="${p.sku}" aria-pressed="${inWish(p.sku)}">${IC.heart}<span>Wishlist</span></button>
        </div>"""

new_actions = """        <div class="pi-buy" style="flex-wrap:wrap">
          ${messengerBtn("Ask on Messenger",p.sku)}
          <a href="https://wa.me/8801700000000?text=${encodeURIComponent("Hello Fariza's Territory, I would like to inquire about " + p.sku + " — " + p.title + " (" + priceText(p) + ")")}" target="_blank" rel="noopener" class="btn btn-line" style="display:inline-flex;align-items:center;gap:8px">${IC.wa}<span>WhatsApp Inquiry</span></a>
          <button class="btn btn-line wish-line${inWish(p.sku)?" on":""}" style="justify-content:center" data-act="wish" data-sku="${p.sku}" data-heart="${p.sku}" aria-pressed="${inWish(p.sku)}">${IC.heart}<span>Wishlist</span></button>
        </div>"""

js = js.replace(old_actions, new_actions)

with open('assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Updated pageProduct in app.js!')
