import re

with open('assets/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update TITLES dictionary
old_titles = "const TITLES={home:\"Fariza's Territory — The Interactive Boutique | Elegance in Every Detail\",shop:\"Shop All 18 Pieces — Fariza's Territory\",collections:\"Five Collections — Fariza's Territory\",lookbook:\"Lookbook — Fariza's Territory\",about:\"Our Story — Fariza's Territory\",bag:\"Inquiry Bag — Fariza's Territory\",inquiry:\"Order Inquiry — Fariza's Territory\",contact:\"Contact & Ordering — Fariza's Territory\",faq:\"FAQ — Fariza's Territory\",policies:\"Policies & Offer Terms — Fariza's Territory\"};"
new_titles = """const TITLES={
  home: "Fariza's Territory — Luxury Fashion & Artisan Accessories Boutique (53 SKUs)",
  shop: "Shop All 53 Pieces — Fariza's Territory",
  fashion: "Fashion Garments (18 Pieces) — Fariza's Territory",
  accessories: "Artisan Accessories (35 Pieces) — Fariza's Territory",
  collections: "Eight Collections — Fariza's Territory",
  lookbook: "Lookbook & Reels — Fariza's Territory",
  about: "Our Story — Fariza's Territory",
  bag: "Inquiry Bag — Fariza's Territory",
  inquiry: "Order Inquiry — Fariza's Territory",
  track: "Track Order — Fariza's Territory",
  contact: "Contact & Ordering — Fariza's Territory",
  faq: "FAQ — Fariza's Territory",
  policies: "Policies & Offer Terms — Fariza's Territory"
};"""
js = js.replace(old_titles, new_titles)

# 2. Update pageHome()
old_page_home_regex = r'function pageHome\(\)\{[\s\S]*?return `[\s\S]*?<\/section>`;\s*\}'

new_page_home = """function pageHome(){
  const st=state.stage;
  const currentPillar = st.pillar || 'all';
  const availableCols = currentPillar === 'all' ? COLLECTIONS : COLLECTIONS.filter(c => c.pillar === currentPillar);
  const tabs=[{id:"all",name:"All (" + (currentPillar==='all'?53:currentPillar==='Fashion'?18:35) + ")",count:currentPillar==='all'?53:currentPillar==='Fashion'?18:35}]
    .concat(availableCols.map(c=>({id:c.id,name:c.short,count:c.count})));
  
  return `
  <section class="hero">
    <canvas id="hero-3d-canvas"></canvas>
    <svg class="hero-orn" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M48 10c17 8 24 28 18 45-5 15-19 22-31 16-10-5-13-18-6-26 5-7 14-7 18-1 3 5 1 11-5 12"/><circle cx="45" cy="54" r="3" fill="currentColor" stroke="none"/><path d="M62 14c4-3 9-4 13-2M70 24c4-1 8 0 11 3"/></svg>
    <div class="container">
      <div class="hero-head">
        <div>
          <span class="overline" data-reveal>The Interactive Boutique · Mirpur, Dhaka</span>
          <h1 class="h-display kinetic-title" data-reveal style="--d:.08s;margin-top:14px">Elegance in<br>Every <span class="accent stitch-u">Detail.</span></h1>
          <p class="hero-bn bn" data-reveal style="--d:.16s">মিরপুর, ঢাকা থেকে — ভালোবাসা দিয়ে বোনা পোশাক ও হস্তশিল্পের অলঙ্কার।</p>
        </div>
        <div>
          <p class="lede" data-reveal style="--d:.2s">53 verified pieces across 8 collections — 18 luxury studio garments and 35 handcrafted artisan mirrors, pendants & bangles. Real product photography with honest pricing.</p>
          <div class="pillar-switch" data-reveal style="--d:.24s;margin-top:14px">
            <button class="pillar-btn ${currentPillar==='all'?'on':''}" data-act="stage-pillar" data-pillar="all">All 53 Pieces</button>
            <button class="pillar-btn ${currentPillar==='Fashion'?'on':''}" data-act="stage-pillar" data-pillar="Fashion">Fashion (18)</button>
            <button class="pillar-btn ${currentPillar==='Accessories'?'on':''}" data-act="stage-pillar" data-pillar="Accessories">Accessories (35)</button>
          </div>
        </div>
      </div>
      <div class="stage-tabs" data-reveal style="--d:.26s" role="tablist" aria-label="Choose collection">
        ${tabs.map(t=>`<button class="chip${st.col===t.id?" on":""}" role="tab" aria-selected="${st.col===t.id}" data-act="stage-col" data-col="${t.id}">${esc(t.name)} <span class="n">${t.count}</span></button>`).join("")}
      </div>
      <div class="stage-grid">
        <div class="stage-col" data-reveal style="--d:.3s">
          <div class="stage-meta"><span class="sm-l" id="stage-col-label"></span><span class="sm-t" id="stage-title"></span></div>
          <div class="stage" id="stage" tabindex="0" role="listbox" aria-label="Interactive product floor — use arrow keys or swipe"></div>
          <div class="stage-bar">
            <button class="stage-arrow" data-act="stage-prev" aria-label="Previous piece">${IC.left}</button>
            <div class="stage-progress"><i id="stage-prog"></i></div>
            <span class="stage-hint">swipe ↔</span>
            <span class="stage-count" id="stage-count" aria-live="polite"></span>
            <button class="stage-arrow" data-act="stage-next" aria-label="Next piece">${IC.right}</button>
          </div>
          <div class="trio-bar" id="trio-bar"></div>
        </div>
        <aside class="piece-panel" id="piece-panel" data-reveal style="--d:.38s" aria-live="polite"></aside>
      </div>
    </div>
  </section>

  <div class="marquee" aria-hidden="true"><div class="marquee-in">
    ${[0,1].map(()=>`<div class="mq-set">${COLLECTIONS.map(c=>`<span>${esc(c.name)}</span>${IC.flower}`).join("")}<span>Elegance in Every Detail</span>${IC.flower}</div>`).join("")}
  </div></div>

  <section class="sec sec-tint" id="collections">
    <div class="container">
      <div class="sec-head">
        <div><span class="overline" data-reveal>Eight houses of craft</span><h2 class="h-sec kinetic-title" data-reveal style="--d:.08s">The Collections</h2></div>
        <a class="btn btn-line" href="#/collections" data-reveal style="--d:.14s"><span>View all 8 collections</span>${IC.arrow}</a>
      </div>
      <div class="col-grid-8">
        ${COLLECTIONS.map((c,i)=>{
          const items=PRODUCTS.filter(p=>p.colId===c.id || p.col===c.id);
          return `<article class="col-card" data-reveal style="--d:${(i%4)*.08}s;--acc:${c.acc}">
            <div class="cc-num">
              <span>N° ${c.id}</span>
              <span class="tag tiny" style="background:color-mix(in srgb,${c.acc} 15%,transparent);color:var(--ink)">${esc(c.pillar)}</span>
            </div>
            <h3 class="cc-name">${esc(c.name)}</h3>
            ${c.nameBn ? `<div class="tiny bn" style="color:var(--chestnut)">${esc(c.nameBn)}</div>` : ''}
            <span class="cc-count">${c.count} piece${c.count>1?"s":""}${c.id==="01"?" · label unverified":""}</span>
            <div class="cc-thumbs">${items.slice(0,3).map(p=>ph(p,"main",{mini:true,w:200,dot:false})).join("")}</div>
            <a class="cc-go" href="#/shop?c=${c.id}">Explore collection ${IC.arrow}</a>
          </article>`;
        }).join("")}
      </div>
    </div>
  </section>

  <section class="sec">
    <div class="container">
      <div class="sec-head">
        <div><span class="overline" data-reveal>Wearable folk art & home decor</span><h2 class="h-sec kinetic-title" data-reveal style="--d:.08s">Artisan Accessories Spotlight</h2></div>
        <a class="btn btn-line" href="#/accessories" data-reveal style="--d:.14s"><span>All 35 accessories</span>${IC.arrow}</a>
      </div>
      <div class="pgrid">${PRODUCTS.filter(p=>p.superCategory==="Accessories").slice(0,4).map((p,i)=>pcard(p,i)).join("")}</div>
    </div>
  </section>

  <section class="sec sec-tint">
    <div class="container">
      <div class="sec-head">
        <div><span class="overline" data-reveal>Curated style pairings</span><h2 class="h-sec kinetic-title" data-reveal style="--d:.08s">Pair Your Look</h2></div>
        <p class="lede" data-reveal style="--d:.12s">Aesthetic harmony between heritage three-piece garments and handcrafted artisan jewelry & bangles. Each piece inquired individually.</p>
      </div>
      <div class="pair-grid">
        ${(window.FT_CATALOG ? window.FT_CATALOG.PAIR_LOOKS : []).map((look, i) => {
          const dress = bySku(look.dressSku);
          const acc = bySku(look.accSku);
          if (!dress || !acc) return '';
          return `
            <div class="pair-card" data-reveal style="--d:${i*0.08}s">
              <div class="pair-stages">
                <a href="#/product/${dress.sku}" title="${esc(dress.title)}">${ph(dress, "main", { w: 300, dot: false })}</a>
                <span class="pair-plus">+</span>
                <a href="#/product/${acc.sku}" title="${esc(acc.title)}">${ph(acc, "main", { w: 300, dot: false })}</a>
              </div>
              <p class="bn" style="font-size:13.5px;color:var(--ink2);margin-top:6px">${esc(look.noteBn)}</p>
              <div class="pair-meta">
                <span class="tiny">${dress.sku} + ${acc.sku}</span>
                <div style="display:flex;gap:8px">
                  <a class="btn btn-line btn-sm" href="#/product/${dress.sku}"><span>View Look</span></a>
                  <button class="btn btn-ink btn-sm" data-act="trio" data-skus="${dress.sku},${acc.sku}"><span>Add Both</span></button>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    </div>
  </section>

  <section class="sec sec-olive">
    <div class="container">
      <div class="story-grid">
        <div class="story-orn" data-reveal>
          <svg class="big" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M48 10c17 8 24 28 18 45-5 15-19 22-31 16-10-5-13-18-6-26 5-7 14-7 18-1 3 5 1 11-5 12"/><circle cx="45" cy="54" r="3" fill="currentColor" stroke="none"/><path d="M62 14c4-3 9-4 13-2M70 24c4-1 8 0 11 3"/><path d="M20 78c8 6 20 8 30 6M14 66c2 4 5 7 9 10" stroke-dasharray="3 5"/></svg>
          <div class="story-stats">
            <div class="stat"><b>53</b><span>Pieces live</span></div>
            <div class="stat"><b>8</b><span>Collections</span></div>
            <div class="stat"><b>13k+</b><span>Community</span></div>
            <div class="stat"><b>ঢাকা</b><span>Mirpur · Dhaka</span></div>
          </div>
        </div>
        <div>
          <span class="overline" data-reveal>Our story</span>
          <h2 class="h-sec kinetic-title" data-reveal style="--d:.08s;margin:12px 0 18px">From Mirpur,<br>with love.</h2>
          <p class="lede" data-reveal style="--d:.14s">Fariza's Territory is a fashion clothing &amp; accessories house based in Mirpur, Dhaka — connecting with over 13,000 followers through genuine craftsmanship, authentic photography, and dedicated concierge ordering. Every product shown is photographed from the actual catalog.</p>
          <div class="value-chips" data-reveal style="--d:.2s"><span>Boutique Fashion</span><span>Artisan Crafts</span><span>Community</span></div>
          <ul class="aes-list" data-reveal style="--d:.26s">
            ${["Folk-art ornamentation","Heritage patternwork","Artisanal tactility","Botanical intricacy","Traditional flourish","Warm minimalism"].map(a=>`<li>${IC.flower}${a}</li>`).join("")}
          </ul>
          <a class="btn btn-cream" href="#/about" data-reveal style="--d:.3s"><span>Read the full story</span>${IC.arrow}</a>
        </div>
      </div>
    </div>
  </section>

  <section class="sec">
    <div class="container">
      <div class="divider" data-reveal>${IC.flower}</div>
      <div style="text-align:center;max-width:640px;margin:22px auto 0">
        <span class="overline" style="justify-content:center" data-reveal>How ordering works</span>
        <h2 class="h-sec kinetic-title" data-reveal style="--d:.08s;margin-top:12px">One inquiry. Everything confirmed.</h2>
      </div>
      <div class="offer-grid">
        <div class="offer" data-reveal><span>${IC.tag}</span><b>First-order offer up to 25%<span class="ast">*</span></b><p>As advertised on our Facebook page. The seller confirms eligibility per order — no discount is auto-applied at inquiry.</p></div>
        <div class="offer" data-reveal style="--d:.1s"><span>${IC.truck}</span><b>Free delivery<span class="ast">*</span></b><p>Advertised by the brand. Coverage and conditions are confirmed by the seller when your inquiry is answered.</p></div>
        <div class="offer" data-reveal style="--d:.2s"><span>${IC.chat}</span><b>WhatsApp &amp; Messenger</b><p>Fill your bag, prepare an inquiry with your delivery details, and send it directly on WhatsApp or Messenger. We reply promptly with availability.</p></div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap" data-reveal>
        <a class="btn btn-ink" href="#/shop"><span>Browse all 53 pieces</span>${IC.arrow}</a>
        ${messengerBtn("Ask us anything")}
      </div>
      <p class="tiny" style="text-align:center;margin-top:16px" data-reveal>*Brand-advertised offers — final terms confirmed by the seller. <a href="#/policies" style="text-decoration:underline">Read offer terms</a>.</p>
    </div>
  </section>`;
}"""

js = re.sub(old_page_home_regex, new_page_home, js)

# 3. Update shopFiltered to handle 53 pieces and pillars
old_shop_filtered = """function shopFiltered(){
  let list=PRODUCTS.slice();
  const f=state.shop;
  if(f.c!=="all")list=list.filter(p=>p.col===f.c);
  if(f.q){const q=f.q.toLowerCase();list=list.filter(p=>p.title.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q)||p.collection.name.toLowerCase().includes(q));}
  if(f.sort==="name")list.sort((a,b)=>a.title.localeCompare(b.title));
  if(f.sort==="sku")list.sort((a,b)=>a.sku.localeCompare(b.sku));
  if(f.sort==="collection")list.sort((a,b)=>a.col.localeCompare(b.col)||a.sku.localeCompare(b.sku));
  return list;
}"""

new_shop_filtered = """function shopFiltered(){
  let list=PRODUCTS.slice();
  const f=state.shop;
  if(f.pillar && f.pillar !== "all") {
    list = list.filter(p => p.superCategory === f.pillar);
  }
  if(f.c && f.c !== "all") {
    list = list.filter(p => (p.colId === f.c || p.col === f.c));
  }
  if(f.q){
    const q=f.q.toLowerCase().trim();
    list=list.filter(p=>(
      p.title.toLowerCase().includes(q) ||
      (p.titleBn && p.titleBn.toLowerCase().includes(q)) ||
      p.sku.toLowerCase().includes(q) ||
      (p.collection && p.collection.name.toLowerCase().includes(q)) ||
      (p.descriptionBn && p.descriptionBn.toLowerCase().includes(q))
    ));
  }
  if(f.sort==="name")list.sort((a,b)=>a.title.localeCompare(b.title));
  if(f.sort==="sku")list.sort((a,b)=>a.sku.localeCompare(b.sku));
  if(f.sort==="price-asc")list.sort((a,b)=>(a.priceBDT||0)-(b.priceBDT||0));
  if(f.sort==="price-desc")list.sort((a,b)=>(b.priceBDT||0)-(a.priceBDT||0));
  if(f.sort==="collection")list.sort((a,b)=>(a.colId||'').localeCompare(b.colId||'')||a.sku.localeCompare(b.sku));
  return list;
}"""

js = js.replace(old_shop_filtered, new_shop_filtered)

# 4. Update pageShop() to support pillar tabs and all 8 collections
old_page_shop_regex = r'function pageShop\(\)\{[\s\S]*?return `[\s\S]*?<\/div><\/div>`;\s*\}'

new_page_shop = """function pageShop(){
  const c=state.route.query.c; if(c&&colById(c))state.shop.c=c;
  const pillar = state.shop.pillar || (state.route.page === 'fashion' ? 'Fashion' : state.route.page === 'accessories' ? 'Accessories' : 'all');
  state.shop.pillar = pillar;
  const availableCols = pillar === 'all' ? COLLECTIONS : COLLECTIONS.filter(col => col.pillar === pillar);

  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>${pillar === 'Fashion' ? 'Fashion Garments' : pillar === 'Accessories' ? 'Artisan Accessories' : 'The Complete Catalog'}</span>
    <h1 class="h-display kinetic-title" data-reveal style="--d:.06s;margin-top:12px">${pillar === 'Fashion' ? 'Fashion Garments (18 Pieces)' : pillar === 'Accessories' ? 'Artisan Accessories (35 Pieces)' : 'Shop All 53 Pieces'}</h1>
    <p class="lede" data-reveal style="--d:.12s;margin-top:10px">Explore handcrafted boutique fashion and wearable artisan accessories from Mirpur, Dhaka. Provisional catalog prices shown; availability and final details verified by seller.</p>
  </div></div>
  <div class="page-body"><div class="container">
    <div class="toolbar" data-reveal>
      <div class="search-field">${IC.zoom}<input type="search" placeholder="Search title, SKU, collection…" value="${esc(state.shop.q)}" data-input="shop-q" aria-label="Filter products"></div>
      
      <div class="chips" role="group" aria-label="Filter by pillar">
        <button class="chip${state.shop.pillar==="all"?" on":""}" data-act="shop-pillar" data-pillar="all">All <span class="n">53</span></button>
        <button class="chip${state.shop.pillar==="Fashion"?" on":""}" data-act="shop-pillar" data-pillar="Fashion">Fashion <span class="n">18</span></button>
        <button class="chip${state.shop.pillar==="Accessories"?" on":""}" data-act="shop-pillar" data-pillar="Accessories">Accessories <span class="n">35</span></button>
      </div>

      <div class="chips" role="group" aria-label="Filter by collection" style="margin-top:8px">
        <button class="chip${state.shop.c==="all"?" on":""}" data-act="shop-col" data-col="all">All Collections</button>
        ${availableCols.map(cl=>`<button class="chip${state.shop.c===cl.id?" on":""}" data-act="shop-col" data-col="${cl.id}">${esc(cl.short)} <span class="n">${cl.count}</span></button>`).join("")}
      </div>

      <select class="sel" data-input="shop-sort" aria-label="Sort products">
        <option value="featured"${state.shop.sort==="featured"?" selected":""}>Sort · Catalog order</option>
        <option value="price-asc"${state.shop.sort==="price-asc"?" selected":""}>Price: Low to High</option>
        <option value="price-desc"${state.shop.sort==="price-desc"?" selected":""}>Price: High to Low</option>
        <option value="name"${state.shop.sort==="name"?" selected":""}>Sort · Name A–Z</option>
        <option value="sku"${state.shop.sort==="sku"?" selected":""}>Sort · SKU</option>
      </select>
      <span class="result-count" id="shop-count"></span>
    </div>
    <div id="shop-grid-wrap"></div>
  </div></div>`;
}"""

js = re.sub(old_page_shop_regex, new_page_shop, js)

# 5. Update renderShopGrid count text
js = js.replace('$("#shop-count").textContent=`${list.length} / 18 pieces`;', 'const tot = state.shop.pillar==="Fashion"?18:state.shop.pillar==="Accessories"?35:53; $("#shop-count").textContent=`${list.length} / ${tot} pieces`;')

# 6. Update stage-pillar and shop-pillar click handling
event_target = 'case "stage-next":focusStage(state.stage.idx+1);break;'
new_event_target = """case "stage-next":focusStage(state.stage.idx+1);break;
    case "stage-pillar":{
      state.stage.pillar=t.dataset.pillar;
      state.stage.col="all";
      state.stage.idx=0;
      $$(".pillar-switch .pillar-btn").forEach(b=>b.classList.toggle("on",b.dataset.pillar===t.dataset.pillar));
      buildStage();
      break;
    }
    case "shop-pillar":{
      state.shop.pillar=t.dataset.pillar;
      state.shop.c="all";
      renderShopGrid();
      break;
    }"""
js = js.replace(event_target, new_event_target)

# 7. Update router parseRoute and render to handle #/fashion and #/accessories
render_switch = """switch(r.page){
    case "home":html=pageHome();break;
    case "shop":html=pageShop();break;
    case "fashion":state.shop.pillar="Fashion";html=pageShop();break;
    case "accessories":state.shop.pillar="Accessories";html=pageShop();break;"""

js = js.replace('switch(r.page){\n    case "home":html=pageHome();break;\n    case "shop":html=pageShop();break;', render_switch)

# 8. Update hydrate() to call Anime and ThreeJS polish
old_hydrate = """function hydrate(){
  bindImages(document);
  revealBind(document);
  if(state.route.page==="home"){buildStage();initStageInput();}
  if(state.route.page==="shop")renderShopGrid();
  if(state.route.page==="lookbook")renderLookGrid();
  if(state.route.page==="product"&&bySku(state.route.param))renderGallery();
  if(state.route.page==="bag")renderBagPageList();
  if(state.route.page==="inquiry"&&!state.inqDone)renderInqSummary();
  syncCommerce();
}"""

new_hydrate = """function hydrate(){
  bindImages(document);
  revealBind(document);
  if(state.route.page==="home"){
    buildStage();
    initStageInput();
    if(window.initThreeHero) window.initThreeHero();
  }
  if(state.route.page==="shop"||state.route.page==="fashion"||state.route.page==="accessories")renderShopGrid();
  if(state.route.page==="lookbook")renderLookGrid();
  if(state.route.page==="product"&&bySku(state.route.param))renderGallery();
  if(state.route.page==="bag")renderBagPageList();
  if(state.route.page==="inquiry"&&!state.inqDone)renderInqSummary();
  syncCommerce();

  // Anime.js UI/UX Polish
  if(window.FT_ANIME){
    window.FT_ANIME.initKineticTypography();
    window.FT_ANIME.initCardTilt();
    window.FT_ANIME.initStitchTracing();
  }
}"""

js = js.replace(old_hydrate, new_hydrate)

# 9. Update pageProduct prev and next calculation to use PRODUCTS.length
js = js.replace(
  'const idx=PRODUCTS.indexOf(p), prev=PRODUCTS[(idx-1+18)%18], next=PRODUCTS[(idx+1)%18];',
  'const nProds=PRODUCTS.length, idx=PRODUCTS.indexOf(p), prev=PRODUCTS[(idx-1+nProds)%nProds], next=PRODUCTS[(idx+1)%nProds];'
)

with open('assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Updated app.js with pageHome, pageShop, and animations!')
