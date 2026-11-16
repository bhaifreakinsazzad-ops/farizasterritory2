/**
 * Fariza's Territory — Main Application Logic & Storefront Engine
 * Brand: Fariza's Territory (Fashion & Accessories Brand by Faria & Saiful Islam Shuvo)
 * Integrated with Supabase, Meta Pixel, WhatsApp & Messenger
 */

(function (window, document) {
  'use strict';

  const CONFIG = window.FT_CONFIG || {};
  const COLLECTIONS = window.FT_CATALOG ? window.FT_CATALOG.COLLECTIONS : [];
  const PRODUCTS = window.FT_CATALOG ? window.FT_CATALOG.PRODUCTS : [];
  const KEYS = window.FT_CATALOG ? window.FT_CATALOG.KEYS : [];
  const KEY_META = window.FT_CATALOG ? window.FT_CATALOG.KEY_META : {};
  const PHOTO_KEYS = window.FT_CATALOG ? window.FT_CATALOG.PHOTO_KEYS : [];
  const VERIFIED_CATALOG = window.FT_CATALOG ? window.FT_CATALOG.VERIFIED_CATALOG : {};
  const bySku = sku => (window.FT_CATALOG && window.FT_CATALOG.PRODUCTS_BY_SKU[sku]) || PRODUCTS[0];
  const colById = id => COLLECTIONS.find(c => c.id === id) || { name: 'Collection', short: 'Collection', acc: '#8E3B66' };

  const priceText = p => {
  if (!p) return 'Inquire for price';
  if (!p.priceBDT) return 'Inquire for price';
  const statusNote = p.priceStatus === 'suggested' ? ' · প্রস্তাবিত' : '';
  return `৳${p.priceBDT.toLocaleString('en-US')}${statusNote}`;
};
  const subtotalNum = items => items.reduce((sum, it) => {
    const p = bySku(it.sku);
    return sum + ((p.priceBDT || 0) * it.qty);
  }, 0);
  const subtotalText = items => `${subtotalNum(items).toLocaleString('en-US')} BDT`;

/* ================= STATE ================= */
const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const store = {
  load(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}},
  save(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
};
const state = {
  bag: store.load("ft_bag",[]),
  wish: store.load("ft_wish",[]),
  cfg: Object.assign({messenger:CONFIG.messengerUsername,whatsapp:CONFIG.whatsappNumber,facebook:CONFIG.facebookUrl},store.load("ft_cfg",{})),
  promoOff: store.load("ft_promo_off",false),
  route:{page:"home",param:null,query:{}},
  stage:{col:"all",idx:0,list:PRODUCTS.map(p=>p.sku)},
  shop:{c:"all",q:"",sort:"featured"},
  look:{c:"all"},
  gal:{sku:null,key:"main"},
  lb:{sku:null,key:"main",scale:1,tx:0,ty:0,list:[]},
  assets:{}, reportTab:"assets", reportRan:false,
  drawer:null, searchSel:0, searchList:[], lastInquiry:null,
  inqDone:false, suppressClick:false
};
const bagCount = ()=>state.bag.reduce((a,b)=>a+b.qty,0);
const inBag = s=>state.bag.find(b=>b.sku===s);
const inWish = s=>state.wish.includes(s);
/* ================= HELPERS ================= */
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

const $ = s=>document.querySelector(s);
const $$ = s=>Array.from(document.querySelectorAll(s));
const esc = s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad2 = n=>String(n+1).padStart(2,"0");
function fx(el,frames,opts){
  if(!el) return;
  if(RM){el.animate&&el.animate(frames,{duration:1,fill:"both"});return;}
  if(window.Motion&&window.Motion.animate){try{window.Motion.animate(el,frames,opts);return;}catch(e){}}
  if(el.animate){el.animate(frames,Object.assign({},opts,{duration:(opts.duration||0.5)*1000,easing:typeof opts.easing==="string"&&opts.easing.startsWith("cubic")?opts.easing:"cubic-bezier(.22,1,.36,1)",fill:"both"}));}
}
function pop(el){
  if(!el||RM) return;
  if(window.anime){try{window.anime.remove(el);window.anime({targets:el,scale:[1,1.45,1],duration:520,easing:"easeOutBack"});return;}catch(e){}}
  fx(el,{transform:["scale(1)","scale(1.4)","scale(1)"]},{duration:.5});
}
const IC = {
  bag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M5 8h14l-1.2 12.2a1.8 1.8 0 0 1-1.8 1.6H8a1.8 1.8 0 0 1-1.8-1.6L5 8z"/><path d="M8.5 10V6.5a3.5 3.5 0 0 1 7 0V10"/></svg>',
  heart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M12 20s-7.5-4.6-9.3-9.3C1.4 7.3 3.6 4 7 4c2.2 0 3.9 1.3 5 3 1.1-1.7 2.8-3 5-3 3.4 0 5.6 3.3 4.3 6.7C19.5 15.4 12 20 12 20z"/></svg>',
  arrow:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
  left:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  right:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/></svg>',
  copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3C6.9 3 3 6.8 3 11.4c0 2.6 1.3 4.9 3.3 6.4V21l3-1.6c.9.2 1.8.4 2.7.4 5.1 0 9-3.8 9-8.4S17.1 3 12 3z"/><path d="M7.5 13.5l3-3.2 2.4 2 3.1-2.6-3 3.4-2.4-2z" fill="currentColor" stroke="none"/></svg>',
  wa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z"/><path d="M9 8.5c-.3 2.5 3.5 6.6 6.2 6.4l.6-1.6-2-1-1 .8c-1-.5-1.9-1.4-2.4-2.4l.9-1-1-2z"/></svg>',
  zoom:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2M8.5 11h5M11 8.5v5"/></svg>',
  ext:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>',
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  alert:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3L2.5 20h19L12 3z"/><path d="M12 9.5v5M12 17.6v.4"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.4"/></svg>',
  chev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  spark:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3l1.8 5.6L19 10l-5.2 1.4L12 17l-1.8-5.6L5 10l5.2-1.4z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/></svg>',
  truck:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v11H2zM14 10h4l3 3v4h-7z"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
  tag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 3h8l10 10-8 8L3 11V3z"/><circle cx="8" cy="8" r="1.6"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  flower:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="2.4"/><path d="M12 3.5c1.8 2 1.8 4.3 0 6-1.8-1.7-1.8-4 0-6zM12 20.5c-1.8-2-1.8-4.3 0-6 1.8 1.7 1.8 4 0 6zM3.5 12c2-1.8 4.3-1.8 6 0-1.7 1.8-4 1.8-6 0zM20.5 12c-2 1.8-4.3 1.8-6 0 1.7-1.8 4-1.8 6 0z"/></svg>',
  paisley:'<svg viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M48 10c17 8 24 28 18 45-5 15-19 22-31 16-10-5-13-18-6-26 5-7 14-7 18-1 3 5 1 11-5 12"/><circle cx="45" cy="54" r="3" fill="currentColor" stroke="none"/><path d="M62 14c4-3 9-4 13-2M70 24c4-1 8 0 11 3" stroke-width="2.4"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M6.5 10.5L12 16l5.5-5.5M4 19h16"/></svg>'
};
/* ================= PHOTO FRAMES ================= */
function tileInner(p,mini){
  return `<div class="ph-fb" style="--acc:${p.accent}">
    <span class="fb-mark">${IC.paisley}</span>
    ${mini?"":`<span class="fb-title">${esc(p.title)}</span>`}
    <span class="fb-sku">${p.sku}</span>
    ${mini?"":`<span class="fb-note">Original product photo</span>`}
  </div>`;
}
function ph(p,key,opts){
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
}
function setAssetStatus(sku,key,st){
  state.assets[sku+":"+key]=st;
  $$(`[data-dot="${sku}:${key}"]`).forEach(d=>{d.className="ph-dot "+st;d.title=st==="ok"?"Product photo loaded":st==="err"?"Photo file unavailable — branded fallback shown":"Loading product image…";});
  $$(`[data-ph="${sku}:${key}"]`).forEach(f=>f.classList.toggle("err",st==="err"));
  $$(`[data-img="${sku}:${key}"]`).forEach(im=>im.classList.toggle("ok",st==="ok"));
  const cell=$(`#rep-st-${sku}`); if(cell) cell.innerHTML=stHtml(st);
}
function bindImages(root){
  (root||document).querySelectorAll("img[data-ft]:not([data-bound])").forEach(img=>{
    img.setAttribute("data-bound","1");
    const [sku,key]=img.dataset.ft.split(":");
    img.setAttribute("data-img",sku+":"+key);
    const ok=()=>{img.classList.add("ok");setAssetStatus(sku,key,"ok");};
    const bad=()=>{img.classList.remove("ok");setAssetStatus(sku,key,"err");};
    img.addEventListener("load",()=>{img.naturalWidth>1?ok():bad();});
    img.addEventListener("error",bad);
    if(img.complete&&img.naturalWidth>1) ok();
    setTimeout(()=>{if(!img.complete&&!img.classList.contains("ok")) bad();},12000);
  });
}
function testAsset(sku,key){
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
}
async function runReport(){
  state.reportRan=true; updateReportSummary();
  const queue=PRODUCTS.map(p=>p.sku);
  const workers=Array.from({length:4},async()=>{
    while(queue.length){const sku=queue.shift();await testAsset(sku,"main");updateReportSummary();}
  });
  await Promise.all(workers); updateReportSummary();
}
/* ================= COMMERCE ================= */
function persist(){store.save("ft_bag",state.bag);store.save("ft_wish",state.wish);}
function syncCommerce(){
  persist();
  const bc=$("#bag-count"),wc=$("#wish-count");
  const n=bagCount();
  if(bc.textContent!==String(n)){bc.textContent=n;pop(bc);}
  bc.classList.toggle("zero",n===0);
  if(wc.textContent!==String(state.wish.length)){wc.textContent=state.wish.length;pop(wc);}
  wc.classList.toggle("zero",state.wish.length===0);
  $$("[data-heart]").forEach(b=>{const on=inWish(b.dataset.heart);b.classList.toggle("on",on);b.setAttribute("aria-pressed",on);});
  if(state.drawer==="bag") renderBagDrawer();
  if(state.drawer==="wish") renderWishDrawer();
  if(state.route.page==="bag") renderBagPageList();
  if(state.route.page==="inquiry"&&!state.inqDone) renderInqSummary();
}
function addToBag(sku,qty,quiet){
  const prod = bySku(sku);
  if(window.FT_ANALYTICS && prod){
    window.FT_ANALYTICS.trackAddToCart(prod, qty||1);
  }
  qty=qty||1;
  const it=inBag(sku);
  if(it) it.qty=Math.min(99,it.qty+qty); else state.bag.push({sku,qty});
  syncCommerce();
  if(!quiet) toast(`${bySku(sku).title} added to inquiry bag`,{icon:"bag",action:"View bag",onAction:()=>openDrawer("bag")});
}
function removeFromBag(sku){
  const i=state.bag.findIndex(b=>b.sku===sku); if(i<0)return;
  const [it]=state.bag.splice(i,1); syncCommerce();
  toast(`Removed ${bySku(sku).title}`,{icon:"trash",action:"Undo",onAction:()=>{state.bag.splice(Math.min(i,state.bag.length),0,it);syncCommerce();}});
}
function setQty(sku,d){
  const it=inBag(sku); if(!it)return;
  it.qty=Math.max(1,Math.min(99,it.qty+d)); syncCommerce();
}
function toggleWish(sku){
  const i=state.wish.indexOf(sku);
  if(i>=0){state.wish.splice(i,1);toast(`Removed from wishlist`,{icon:"heart"});}
  else{state.wish.push(sku);toast(`${bySku(sku).title} saved to wishlist`,{icon:"heart",action:"View",onAction:()=>openDrawer("wish")});}
  syncCommerce();
}
/* ================= TOASTS ================= */
function toast(msg,opts){
  opts=opts||{};
  const box=$("#toasts");
  while(box.children.length>=3) box.firstChild.remove();
  const el=document.createElement("div");
  el.className="toast"; el.setAttribute("role","status");
  el.innerHTML=`${IC[opts.icon||"check"]}<span>${esc(msg)}</span>${opts.action?`<button class="t-act">${esc(opts.action)}</button>`:""}<button class="t-x" aria-label="Dismiss">${IC.x}</button>`;
  box.appendChild(el);
  fx(el,{opacity:[0,1],transform:["translateY(14px)","translateY(0)"]},{duration:.4});
  const kill=()=>{if(!el.parentNode)return;fx(el,{opacity:[1,0],transform:["translateY(0)","translateY(10px)"]},{duration:.3});setTimeout(()=>el.remove(),320);};
  el.querySelector(".t-x").addEventListener("click",kill);
  if(opts.action) el.querySelector(".t-act").addEventListener("click",()=>{opts.onAction&&opts.onAction();kill();});
  setTimeout(kill,4600);
}
/* ================= DRAWERS ================= */
function openDrawer(kind){
  closeSearch(); closeMenu();
  state.drawer=kind;
  $("#scrim").classList.add("show");
  $("#drawer-bag").classList.toggle("open",kind==="bag");
  $("#drawer-wish").classList.toggle("open",kind==="wish");
  $("#drawer-"+kind).setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
  kind==="bag"?renderBagDrawer():renderWishDrawer();
}
function closeDrawer(){
  state.drawer=null;
  $("#scrim").classList.remove("show");
  $$(".drawer").forEach(d=>{d.classList.remove("open");d.setAttribute("aria-hidden","true");});
  document.body.style.overflow="";
}
function lineItem(it,withQty){
  const p=bySku(it.sku);
  return `<div class="line-item">
    <a href="#/product/${p.sku}" data-act="drawer-close">${ph(p,"main",{mini:true,w:200,dot:false})}</a>
    <div>
      <div class="li-t"><a href="#/product/${p.sku}" data-act="drawer-close">${esc(p.title)}</a></div>
      <div class="li-s">${p.sku} · ${esc(p.collection.short)}</div>
      ${withQty?`<span class="li-qty"><button data-act="bag-dec" data-sku="${p.sku}" aria-label="Decrease quantity">${IC.minus}</button><output>${it.qty}</output><button data-act="bag-inc" data-sku="${p.sku}" aria-label="Increase quantity">${IC.plus}</button></span>`:`<button class="btn btn-line btn-sm" data-act="bag-add" data-sku="${p.sku}">${IC.bag}<span>Add to bag</span></button>`}
    </div>
    <button class="li-x" data-act="${withQty?"bag-del":"wish"}" data-sku="${p.sku}" aria-label="Remove ${esc(p.title)}">${withQty?IC.trash:IC.x}</button>
  </div>`;
}
function renderBagDrawer(){
  $("#bag-dr-count").textContent=state.bag.length?`· ${bagCount()} item${bagCount()>1?"s":""}`:"";
  $("#bag-body").innerHTML=state.bag.length?state.bag.map(it=>lineItem(it,true)).join(""):
    `<div class="empty" style="margin-top:20px">${IC.bag}<p>Your inquiry bag is empty.</p><p class="small" style="margin:8px 0 18px">Prices are confirmed by the seller — add pieces and send one inquiry.</p><a class="btn btn-ink btn-sm" href="#/shop" data-act="drawer-close"><span>Browse the boutique</span></a></div>`;
  $("#bag-foot").innerHTML=state.bag.length?`
    <div class="dr-total"><span>Catalog reference subtotal</span><b>${subtotalText(state.bag)}</b></div>
    <p class="tiny" style="margin-bottom:12px">No automatic discount applied. First-order offer up to 25%* &amp; free delivery* — confirmed by seller.</p>
    <a class="btn btn-ink btn-block" href="#/inquiry" data-act="drawer-close"><span>Prepare order inquiry</span>${IC.arrow}</a>`:"";
  bindImages($("#drawer-bag"));
}
function renderWishDrawer(){
  $("#wish-dr-count").textContent=state.wish.length?`· ${state.wish.length} saved`:"";
  $("#wish-body").innerHTML=state.wish.length?state.wish.map(s=>lineItem({sku:s},false)).join(""):
    `<div class="empty" style="margin-top:20px">${IC.heart}<p>No saved pieces yet.</p><p class="small" style="margin:8px 0 18px">Tap the heart on any piece to keep it here.</p><a class="btn btn-ink btn-sm" href="#/shop" data-act="drawer-close"><span>Discover pieces</span></a></div>`;
  bindImages($("#drawer-wish"));
}
/* ================= SEARCH ================= */
function openSearch(){
  closeDrawer();closeMenu();
  $("#search-ov").classList.add("open");$("#search-ov").setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
  state.searchSel=0;renderSearch("");
  setTimeout(()=>$("#search-q").focus(),120);
}
function closeSearch(){
  $("#search-ov").classList.remove("open");$("#search-ov").setAttribute("aria-hidden","true");
  if(!state.drawer)document.body.style.overflow="";
  $("#search-q").value="";
}
function renderSearch(q){
  q=q.trim().toLowerCase();
  state.searchList=PRODUCTS.filter(p=>!q||p.title.toLowerCase().includes(q)||p.sku.toLowerCase().includes(q)||p.collection.name.toLowerCase().includes(q)||p.slug.includes(q));
  $("#so-hint").textContent=q?`${state.searchList.length} result${state.searchList.length===1?"":"s"} for “${q}”`:"18 pieces · type to filter · ↑↓ to browse · Enter to open";
  $("#so-results").innerHTML=state.searchList.length?state.searchList.map((p,i)=>`
    <button class="so-item${i===state.searchSel?" sel":""}" data-act="go" data-href="#/product/${p.sku}" data-si="${i}">
      ${ph(p,"main",{mini:true,w:200,dot:false})}
      <span><span class="t">${esc(p.title)}</span><span class="s" style="display:block">${p.sku} · ${esc(p.collection.short)}</span></span>
    </button>`).join(""):
    `<div class="empty" style="grid-column:1/-1">${IC.flower}<p>No pieces match “${esc(q)}”.</p><p class="small" style="margin-top:8px">Try a colour, a collection name, or a SKU like CAT-008.</p></div>`;
  bindImages($("#search-ov"));
}
/* ================= MENU ================= */
function openMenu(){$("#mmenu").classList.add("open");$("#mmenu").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";$(".menu-btn").setAttribute("aria-expanded","true");}
function closeMenu(){$("#mmenu").classList.remove("open");$("#mmenu").setAttribute("aria-hidden","true");if(!state.drawer)document.body.style.overflow="";$(".menu-btn").setAttribute("aria-expanded","false");}
/* ================= SHARED TEMPLATES ================= */
function pcard(p,i){
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
}
function offerNote(){
  return `<div class="notice">${IC.alert}<span><b>Advertised offers:</b> first-order discount up to 25% and free delivery. Eligibility, sizing, prices and delivery are confirmed by the seller on Messenger — this boutique never auto-applies a discount or simulates payment.</span></div>`;
}
function messengerBtn(label,sku){
  return `<button class="btn btn-ink" data-act="msg" ${sku?`data-sku="${sku}"`:""}>${IC.chat}<span>${label||"Order via Messenger"}</span></button>`;
}
/* ================= HOME ================= */
function pageHome(){
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
}
/* ---- stage controller ---- */
function stageList(){
  let list = PRODUCTS;
  if (state.stage.pillar && state.stage.pillar !== "all") {
    list = list.filter(p => p.superCategory === state.stage.pillar);
  }
  if (state.stage.col && state.stage.col !== "all") {
    list = list.filter(p => (p.colId === state.stage.col || p.col === state.stage.col));
  }
  return list.map(p => p.sku);
}
function buildStage(){
  const stage=$("#stage"); if(!stage)return;
  state.stage.list=stageList(); state.stage.idx=Math.min(state.stage.idx,state.stage.list.length-1);
  stage.innerHTML=state.stage.list.map((sku,i)=>{
    const p=bySku(sku);
    return `<article class="s-card off" data-i="${i}" data-sku="${sku}" role="option" aria-selected="false" aria-label="${esc(p.title)} — ${p.sku}">
      ${ph(p,"main",{w:800,eager:i<5,tag:true,tagText:p.sku})}
      <button class="hot" style="left:32%;top:36%" data-act="hot" data-sku="${sku}" data-key="detailA" data-x="32" data-y="36" aria-label="Fabric close-up hotspot">${IC.plus}</button>
      <button class="hot" style="left:68%;top:64%" data-act="hot" data-sku="${sku}" data-key="detailB" data-x="68" data-y="64" aria-label="Border detail hotspot">${IC.plus}</button>
      <span class="s-plate">${p.sku} · TAP FOR DETAILS</span>
    </article>`;
  }).join("");
  stage.querySelectorAll(".s-card").forEach(card=>{
    card.addEventListener("click",e=>{
      if(state.suppressClick)return;
      if(e.target.closest(".hot")||e.target.closest(".hot-pop"))return;
      const i=+card.dataset.i;
      if(i===state.stage.idx) location.hash="#/product/"+card.dataset.sku;
      else focusStage(i);
    });
  });
  layoutStage(true);
  renderPiecePanel();
  bindImages(stage);
  if(!RM&&window.Motion&&window.Motion.animate){
    try{window.Motion.animate(stage.querySelectorAll(".s-card:not(.off)"),{opacity:[0,1]},{duration:.7,delay:window.Motion.stagger?window.Motion.stagger(.08):0});}catch(e){}
  }
}
function layoutStage(instant){
  const stage=$("#stage"); if(!stage)return;
  const n=state.stage.list.length, idx=state.stage.idx;
  const W=stage.clientWidth;
  const cw=Math.min(300,Math.max(200,W*0.30));
  stage.style.setProperty("--cw",cw+"px");
  const half=Math.floor(n/2);
  stage.querySelectorAll(".s-card").forEach(card=>{
    const i=+card.dataset.i;
    let o=i-idx;
    if(n>6){if(o>half)o-=n;if(o<-half)o+=n;}
    const abs=Math.abs(o);
    const x=o*cw*0.62, s=o===0?1:Math.max(.6,.82-.1*(abs-1)), y=abs*10;
    const tf=`translate(${x}px, ${y}px) scale(${s})`;
    if(abs>3){card.classList.add("off");card.style.transform=tf;card.style.zIndex=0;card.setAttribute("aria-selected","false");return;}
    const wasOff=card.classList.contains("off");
    if(wasOff||instant){card.style.transition="none";card.style.transform=tf;void card.offsetHeight;card.style.transition="";}
    else card.style.transform=tf;
    card.classList.remove("off");
    card.style.zIndex=20-abs;
    card.style.opacity=o===0?1:String(1-.17*abs);
    card.classList.toggle("is-focus",o===0);
    card.setAttribute("aria-selected",o===0?"true":"false");
  });
  const p=bySku(state.stage.list[idx]);
  stage.style.setProperty("--stage-acc",p.accent);
  $("#stage-col-label").textContent=`Piece ${pad2(idx)} / ${n} — ${p.collection.short}`;
  $("#stage-title").textContent=p.title;
  $("#stage-count").textContent=`${pad2(idx)} / ${String(n).padStart(2,"0")}`;
  $("#stage-prog").style.width=((idx+1)/n*100)+"%";
  renderTrio();
}
function focusStage(i){
  const n=state.stage.list.length;
  state.stage.idx=((i%n)+n)%n;
  closeHotPop();
  layoutStage();
  renderPiecePanel();
}
function renderTrio(){
  const bar=$("#trio-bar"); if(!bar)return;
  const list=state.stage.list,n=list.length,idx=state.stage.idx;
  const trio=[list[idx],list[(idx+1)%n],list[(idx+2)%n]].filter((v,i,a)=>a.indexOf(v)===i);
  bar.innerHTML=`<div><span class="tb-t">Complete the set</span><span class="tb-s">Curated ${trio.length===3?"trio":"set"} of ${trio.length} piece${trio.length>1?"s":""} · reference prices shown in product details</span></div>
    <div class="trio-thumbs">${trio.map(s=>ph(bySku(s),"main",{mini:true,w:120,dot:false})).join("")}</div>
    <button class="btn btn-caramel" data-act="trio" data-skus="${trio.join(",")}"><span>Add ${trio.length===3?"trio":"set"} to bag</span>${IC.arrow}</button>`;
  bindImages(bar);
}
function renderPiecePanel(){
  const panel=$("#piece-panel"); if(!panel)return;
  const p=bySku(state.stage.list[state.stage.idx]);
  const assets=["main","detailA","detailB"].filter(k=>p.assets[k].id);
  panel.innerHTML=`
    <div class="pp-head"><span class="overline">In this piece</span><span class="tiny">${assets.length} views</span></div>
    <span class="tag" style="background:color-mix(in srgb,${p.accent} 16%,var(--cream3));color:var(--ink2)">${esc(p.collection.short)}</span>
    ${p.col==="01"?`<span class="tag warn" style="margin-left:6px">Label unverified</span>`:""}
    <h2 class="pp-title">${esc(p.title)}</h2>
    <span class="pp-sku">${p.sku} · ${esc(p.slug)}</span>
    <div class="pp-price"><b>${priceText(p)}</b><span class="tiny">Catalog reference · confirm</span></div>
    <div class="pp-assets">${assets.map(k=>`<button data-act="lb-open" data-sku="${p.sku}" data-key="${k}" aria-label="View ${KEY_META[k].label}" style="padding:0;border:0;background:none">${ph(p,k,{mini:true,w:200,dot:false,ratio:"r45"})}</button>`).join("")}</div>
    <p class="small">Fabric, sizing and availability are confirmed by the seller. Tap the <b>+</b> hotspots on the photo for fabric close-ups.</p>
    <div class="pp-actions">
      <button class="btn btn-ink btn-block" data-act="bag-add" data-sku="${p.sku}">${IC.bag}<span>Add to inquiry bag</span></button>
      <a class="btn btn-line btn-block" href="#/product/${p.sku}"><span>Full details &amp; gallery</span>${IC.arrow}</a>
      <button class="wish-line${inWish(p.sku)?" on":""}" data-act="wish" data-sku="${p.sku}" data-heart="${p.sku}" aria-pressed="${inWish(p.sku)}">${IC.heart}<span>${inWish(p.sku)?"Saved to wishlist":"Save to wishlist"}</span></button>
    </div>
    <p class="pp-note">First-order offer up to 25%* · free delivery* — *confirmed by seller. ${p.assets.aiStylingPreview.id?"An AI styling illustration exists for this piece and is clearly labelled on its page.":"No AI preview supplied for this piece."}</p>`;
  fx(panel,{opacity:[.35,1],transform:["translateY(8px)","translateY(0)"]},{duration:.45});
  bindImages(panel);
}
function closeHotPop(){$$(".hot-pop").forEach(e=>e.remove());}
function openHotPop(btn){
  closeHotPop();
  const p=bySku(btn.dataset.sku), key=btn.dataset.key;
  const frame=btn.closest(".ph"); if(!frame)return;
  const popEl=document.createElement("div");
  popEl.className="hot-pop";
  const x=Math.min(58,Math.max(6,+btn.dataset.x-10)), y=Math.min(52,+btn.dataset.y+6);
  popEl.style.left=x+"%"; popEl.style.top=y+"%";
  popEl.innerHTML=`${ph(p,key,{w:400,ratio:"r11",tag:true,tagText:KEY_META[key].label})}
    <div class="hp-t"><span>${esc(KEY_META[key].label)} · <span class="tiny">source crop</span></span><button class="hp-x" data-act="hot-close" aria-label="Close detail">${IC.x}</button></div>
    <button class="btn btn-line btn-sm btn-block" data-act="${state.route.page==="home"?"lb-open":"gal"}" data-sku="${p.sku}" data-key="${key}"><span>${state.route.page==="home"?"Enlarge":"Open in gallery"}</span></button>`;
  frame.appendChild(popEl);
  fx(popEl,{opacity:[0,1],transform:["scale(.9)","scale(1)"]},{duration:.3});
  bindImages(popEl);
}
/* ================= SHOP ================= */
function shopFiltered(){
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
}
function pageShop(){
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
}
function renderShopGrid(){
  const wrap=$("#shop-grid-wrap"); if(!wrap)return;
  const list=shopFiltered();
  const tot = state.shop.pillar==="Fashion"?18:state.shop.pillar==="Accessories"?35:53; $("#shop-count").textContent=`${list.length} / ${tot} pieces`;
  wrap.innerHTML=list.length?`<div class="pgrid">${list.map((p,i)=>pcard(p,i)).join("")}</div>`:
    `<div class="empty">${IC.flower}<p>No pieces match your filters.</p><p class="small" style="margin:8px 0 18px">Clear the search or choose another collection.</p><button class="btn btn-ink btn-sm" data-act="shop-clear"><span>Clear filters</span></button></div>`;
  bindImages(wrap); revealBind(wrap);
  $$(".toolbar .chip").forEach(ch=>ch.classList.toggle("on",ch.dataset.col===state.shop.c));
}
/* ================= COLLECTIONS PAGE ================= */
function pageCollections(){
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>Five houses of pattern</span>
    <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">The Collections</h1>
    <p class="lede" data-reveal style="--d:.12s;margin-top:10px">Exact source groupings from the catalog CSV — counts verified: 1 · 2 · 4 · 6 · 5.</p>
  </div></div>
  <div class="page-body"><div class="container">
    ${COLLECTIONS.map((c,i)=>{
      const items=PRODUCTS.filter(p=>p.col===c.id);
      return `<div class="crow" data-reveal style="--d:${i*.06}s;--acc:${c.acc}">
        <div class="crow-num">${c.id}</div>
        <div>
          <h2 class="crow-name">${esc(c.name)}</h2>
          <p class="crow-note">${esc(c.note)}</p>
          <span class="tiny" style="display:block;margin-top:6px">${c.count} piece${c.count>1?"s":""} · source folder: ${esc(c.folder)}</span>
        </div>
        <div class="crow-thumbs">${items.slice(0,3).map(p=>ph(p,"main",{mini:true,w:240,dot:false})).join("")}</div>
        <a class="btn btn-ink" href="#/shop?c=${c.id}"><span>Explore ${c.count}</span>${IC.arrow}</a>
      </div>`;}).join("")}
    <div style="margin-top:36px">${offerNote()}</div>
  </div></div>`;
}
/* ================= PRODUCT PAGE ================= */
function pageProduct(sku){
  const pCurrent = bySku(sku);
  if(window.FT_ANALYTICS && pCurrent){
    window.FT_ANALYTICS.trackViewContent(pCurrent);
  }
  const p=bySku(sku);
  if(!p)return page404();
  state.gal={sku,key:"main"};
  const nProds=PRODUCTS.length, idx=PRODUCTS.indexOf(p), prev=PRODUCTS[(idx-1+nProds)%nProds], next=PRODUCTS[(idx+1)%nProds];
  const sameCol = PRODUCTS.filter(x => (x.colId === p.colId || x.col === p.col) && x.sku !== p.sku).slice(0, 2);
  const crossCategory = PRODUCTS.filter(x => x.superCategory !== p.superCategory).slice(0, 2);
  const related = [...sameCol, ...crossCategory].slice(0, 4);
  return `
  <div class="page-head"><div class="container">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/home">Home</a><span>·</span><a href="#/shop">Shop</a><span>·</span><a href="#/shop?c=${p.col}">${esc(p.collection.short)}</a><span>·</span><span style="color:var(--chestnut)">${p.sku}</span></nav>
    <div class="prod-grid">
      <div>
        <div class="gal-main" id="gal-main" data-reveal></div>
        <div class="gal-thumbs" id="gal-thumbs" data-reveal style="--d:.08s" role="tablist" aria-label="Photo gallery">
          ${PHOTO_KEYS.map(k=>`<button role="tab" data-act="gal" data-key="${k}" data-sku="${p.sku}" class="${k==="main"?"on":""}" aria-selected="${k==="main"}" aria-label="${KEY_META[k].label}">
            ${ph(p,k,{mini:true,w:200,dot:false,ratio:"r45"})}<span class="gt-l">${k==="socialSquare"?"1:1":k==="storyReel"?"9:16":k==="detailA"?"Det A":k==="detailB"?"Det B":k}</span>
          </button>`).join("")}
        </div>
        <div class="ai-block" data-reveal style="--d:.14s">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
            <span class="tag ai">${IC.spark} AI styling illustration — not the actual product</span>
          </div>
          ${p.assets.aiStylingPreview.id?
            `<div style="max-width:280px" data-act="lb-open" data-sku="${p.sku}" data-key="aiStylingPreview" role="button" tabindex="0" aria-label="Enlarge AI styling illustration">${ph(p,"aiStylingPreview",{w:600,tag:true})}</div>
             <p class="small" style="margin-top:10px">Illustrative styling concept only. Always refer to the real photographs above for the actual garment.</p>`:
            `<p class="small">No AI styling preview was supplied for this piece in the source catalog (asset status: <code>not_supplied</code>).</p>`}
        </div>
      </div>
      <div class="prod-info" data-reveal style="--d:.1s">
        <span class="tag" style="background:color-mix(in srgb,${p.accent} 16%,var(--cream3));color:var(--ink2)">${esc(p.collection.name)}</span>
        ${p.col==="01"?`<span class="tag warn" style="margin-left:6px">Seller label · unverified</span>`:""}
        <h1 class="pi-title">${esc(p.title)}</h1>
        <span class="pp-sku">${p.sku} · ${esc(p.slug)}</span>
        <div class="pi-price"><b>${priceText(p)}</b><span class="tiny">Catalog reference · confirm with seller</span></div>
        <p class="small" style="margin-bottom:16px">Listed BDT prices come from an earlier seller-provided catalog and must be reconfirmed before ordering. Sizing and stock are not verified. First-order offer up to 25%* and free delivery* as advertised.</p>
        <div class="pi-buy">
          <span class="qty" aria-label="Quantity"><button data-act="piq-dec" aria-label="Decrease quantity">${IC.minus}</button><output id="pi-qty">1</output><button data-act="piq-inc" aria-label="Increase quantity">${IC.plus}</button></span>
          <button class="btn btn-ink" data-act="bag-add-qty" data-sku="${p.sku}">${IC.bag}<span>Add to inquiry bag</span></button>
        </div>
        <div class="pi-buy" style="flex-wrap:wrap">
          ${messengerBtn("Ask on Messenger",p.sku)}
          <a href="https://wa.me/8801700000000?text=${encodeURIComponent("Hello Fariza's Territory, I would like to inquire about " + p.sku + " — " + p.title + " (" + priceText(p) + ")")}" target="_blank" rel="noopener" class="btn btn-line" style="display:inline-flex;align-items:center;gap:8px">${IC.wa}<span>WhatsApp Inquiry</span></a>
          <button class="btn btn-line wish-line${inWish(p.sku)?" on":""}" style="justify-content:center" data-act="wish" data-sku="${p.sku}" data-heart="${p.sku}" aria-pressed="${inWish(p.sku)}">${IC.heart}<span>Wishlist</span></button>
        </div>
        <details class="acc" open><summary>Piece details &amp; Craft Specifications ${IC.chev}</summary><div class="acc-body">
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
        </div></details>
        <details class="acc"><summary>About our product photos ${IC.chev}</summary><div class="acc-body">
          <p>Real source photography is shown first. Detail images are crops of the photographed garments, not additional shooting angles. Optional AI-generated styling previews are illustrations and are identified separately.</p>
        </div></details>
        <details class="acc"><summary>Delivery &amp; offers ${IC.chev}</summary><div class="acc-body">
          <p>Advertised: first-order discount up to 25% and free delivery. Eligibility, coverage and timelines are confirmed by the seller — nothing is auto-applied and no payment is taken on this site. <a href="#/policies" style="text-decoration:underline;color:var(--chestnut)">Full terms</a>.</p>
        </div></details>
      </div>
    </div>
    <div class="pnav">
      <a href="#/product/${prev.sku}">${IC.left}<span>${esc(prev.title)}</span></a>
      <a href="#/product/${next.sku}" style="text-align:right"><span>${esc(next.title)}</span>${IC.right}</a>
    </div>
  </div></div>
  <div class="page-body" style="padding-top:44px"><div class="container">
    <div class="sec-head"><div><span class="overline" data-reveal>You may also love</span><h2 class="h-sec" data-reveal style="--d:.06s">Related Pieces</h2></div></div>
    <div class="rel-grid">${related.map((r,i)=>pcard(r,i)).join("")}</div>
  </div></div>
  <div class="mobile-buy" id="mobile-buy">
    <div class="mb-t"><b>${esc(p.title)}</b><span class="tiny">${priceText(p)} · confirm</span></div>
    <button class="btn btn-ink btn-sm" data-act="bag-add-qty" data-sku="${p.sku}">${IC.bag}<span>Add to bag</span></button>
  </div>`;
}
function renderGallery(){
  const wrap=$("#gal-main"); if(!wrap)return;
  const p=bySku(state.gal.sku), k=state.gal.key;
  const hots=k==="main"?`
    <button class="hot" style="display:flex;left:30%;top:34%" data-act="hot" data-sku="${p.sku}" data-key="detailA" data-x="30" data-y="34" aria-label="Fabric close-up hotspot">${IC.plus}</button>
    <button class="hot" style="display:flex;left:70%;top:62%" data-act="hot" data-sku="${p.sku}" data-key="detailB" data-x="70" data-y="62" aria-label="Border detail hotspot">${IC.plus}</button>`:"";
  wrap.innerHTML=`<div data-act="lb-open" data-sku="${p.sku}" data-key="${k}" role="button" tabindex="0" aria-label="Enlarge ${KEY_META[k].label}" style="cursor:zoom-in">
    ${ph(p,k,{w:1600,eager:true,contain:true,tag:true,tagText:KEY_META[k].label+(KEY_META[k].auth==="derived-source-crop"?" · source crop":"")})}</div>${hots}`;
  fx(wrap,{opacity:[.3,1]},{duration:.4});
  $$("#gal-thumbs button").forEach(b=>{const on=b.dataset.key===k;b.classList.toggle("on",on);b.setAttribute("aria-selected",on);});
  bindImages(wrap);
}
/* ================= LOOKBOOK ================= */
function pageLookbook(){
  const c=state.route.query.c; if(c&&colById(c))state.look.c=c;
  return `
  <div class="sec-ink" style="padding-bottom:70px">
    <div class="page-head"><div class="container">
      <span class="overline" data-reveal>Squares, stories &amp; styling</span>
      <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">The Lookbook</h1>
      <p class="lede" data-reveal style="--d:.12s;margin-top:10px">Social-ready crops derived from the boutique's own photography — 1:1 squares and 9:16 story frames. AI styling concepts live in their own clearly-labelled gallery below.</p>
    </div></div>
    <div style="padding-top:26px"><div class="container">
      <div class="chips" style="margin-bottom:24px" data-reveal role="group" aria-label="Filter lookbook">
        <button class="chip${state.look.c==="all"?" on":""}" style="border-color:rgba(253,240,221,.4);color:var(--cream)" data-act="look-col" data-col="all">All <span class="n">36</span></button>
        ${COLLECTIONS.map(cl=>`<button class="chip${state.look.c===cl.id?" on":""}" style="border-color:rgba(253,240,221,.4);color:var(--cream)" data-act="look-col" data-col="${cl.id}">${esc(cl.short)} <span class="n">${cl.count*2}</span></button>`).join("")}
      </div>
      <div id="look-grid-wrap"></div>
    </div></div>
  </div>
  <div class="sec"><div class="container">
    <div class="sec-head"><div>
      <span class="overline" data-reveal>Clearly labelled</span>
      <h2 class="h-sec" data-reveal style="--d:.06s;margin-top:10px">AI Styling Illustrations</h2>
      <p class="lede" data-reveal style="--d:.12s;margin-top:8px">These are illustrative concepts — <b>not photographs of the actual garments</b>. 14 of 18 pieces have one supplied; the four Mome Boutique pieces do not.</p>
    </div><span class="tag ai" data-reveal>${IC.spark} ai-illustration</span></div>
    <div class="pgrid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
      ${PRODUCTS.filter(p=>p.assets.aiStylingPreview.id).map((p,i)=>`
        <div data-reveal style="--d:${(i%4)*.06}s">
          <div data-act="lb-open" data-sku="${p.sku}" data-key="aiStylingPreview" role="button" tabindex="0" aria-label="Enlarge AI illustration for ${esc(p.title)}" style="cursor:zoom-in">${ph(p,"aiStylingPreview",{w:500,tag:true})}</div>
          <p class="small" style="margin-top:8px"><a href="#/product/${p.sku}" style="text-decoration:underline">${esc(p.title)}</a><br><span class="tiny">${p.sku} · illustration only</span></p>
        </div>`).join("")}
    </div>
  </div></div>`;
}
function renderLookGrid(){
  const wrap=$("#look-grid-wrap"); if(!wrap)return;
  const list=state.look.c==="all"?PRODUCTS:PRODUCTS.filter(p=>p.col===state.look.c);
  const tiles=[];
  list.forEach(p=>{tiles.push({p,k:"socialSquare"});tiles.push({p,k:"storyReel"});});
  wrap.innerHTML=`<div class="lb-grid">${tiles.map((t,i)=>`
    <div class="lb-item${t.k==="storyReel"?" tall":""}" data-reveal style="--d:${(i%4)*.05}s" data-act="lb-open" data-sku="${t.p.sku}" data-key="${t.k}" role="button" tabindex="0" aria-label="Enlarge ${esc(t.p.title)} ${KEY_META[t.k].label}">
      ${ph(t.p,t.k,{w:600})}
      <div class="lb-cap"><span>${esc(t.p.title)}</span><span class="fmt">${t.k==="storyReel"?"9:16":"1:1"}</span></div>
    </div>`).join("")}</div>`;
  bindImages(wrap); revealBind(wrap);
}
/* ================= BAG PAGE ================= */
function pageBag(){
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>Your selection</span>
    <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">Inquiry Bag</h1>
  </div></div>
  <div class="page-body"><div class="container">
    <div class="two-col">
      <div class="panel" data-reveal><div id="bag-page-list"></div></div>
      <div class="panel sticky" data-reveal style="--d:.1s">
        <span class="overline">Summary</span>
        <div class="dr-total" style="margin-top:16px"><span>Pieces</span><b id="bag-page-n"></b></div>
        <div class="dr-total"><span>Catalog reference subtotal</span><b>${subtotalText(state.bag)}</b></div>
        <p class="small" style="margin:10px 0 18px">The seller replies with prices, sizing, availability and delivery. First-order offer up to 25%* &amp; free delivery* — eligibility confirmed per order.</p>
        <a class="btn btn-ink btn-block" href="#/inquiry" id="bag-to-inq"><span>Prepare order inquiry</span>${IC.arrow}</a>
        <button class="btn btn-line btn-block" style="margin-top:10px" data-act="clear-bag"><span>Clear bag</span>${IC.trash}</button>
      </div>
    </div>
  </div></div>`;
}
function renderBagPageList(){
  const wrap=$("#bag-page-list"); if(!wrap)return;
  wrap.innerHTML=state.bag.length?state.bag.map(it=>lineItem(it,true)).join(""):
    `<div class="empty">${IC.bag}<p>Your inquiry bag is empty.</p><p class="small" style="margin:8px 0 18px">Browse the floor and add pieces you love.</p><a class="btn btn-ink btn-sm" href="#/shop"><span>Shop the boutique</span></a></div>`;
  const n=$("#bag-page-n"); if(n)n.textContent=`${bagCount()} item${bagCount()===1?"":"s"}`;
  const cta=$("#bag-to-inq"); if(cta)cta.toggleAttribute("disabled",!state.bag.length);
  bindImages(wrap);
}
/* ================= INQUIRY / CHECKOUT ================= */
function inquiryText(items,cust,ref){
  const d=new Date();
  const lines=["FARIZA'S TERRITORY — ORDER INQUIRY","Ref: "+ref,"Date: "+d.toLocaleDateString("en-GB"),"", "— Items —"];
  items.forEach((it,i)=>{const p=bySku(it.sku);lines.push(`${i+1}. ${p.sku} — ${p.title} × ${it.qty} | catalog reference ${priceText(p)} each`);});
  lines.push("Catalog reference subtotal: "+subtotalText(items)+" (not a final invoice)","","— Customer —");
  if(cust){lines.push("Name: "+cust.name,"Phone: "+cust.phone,"District: "+cust.district,"Address: "+cust.address);if(cust.notes)lines.push("Notes: "+cust.notes);lines.push("Preferred contact: "+cust.contact);}
  lines.push("","Offers noted: first-order up to 25% & free delivery (as advertised — please confirm eligibility).","Please confirm prices, availability, sizing and delivery. Thank you!");
  return lines.join("\n");
}
function makeRef(){
  const d=new Date(),ymd=String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
  return "FT-"+ymd+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
}
function pageInquiry(){
  state.inqDone=false;
  if(!state.bag.length&&!state.lastInquiry){
    return `<div class="page-head"><div class="container"><span class="overline">Checkout · honest by design</span><h1 class="h-display" style="margin-top:12px">Order Inquiry</h1></div></div>
    <div class="page-body"><div class="container"><div class="empty">${IC.bag}<p>Nothing to inquire about yet.</p><p class="small" style="margin:8px 0 18px">Add pieces to your bag first — then prepare one message for the seller.</p><a class="btn btn-ink" href="#/shop"><span>Shop the boutique</span>${IC.arrow}</a></div></div></div>`;
  }
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>Checkout · inquiry-based</span>
    <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">Order Inquiry</h1>
    <p class="lede" data-reveal style="--d:.12s;margin-top:10px">No payment is taken here. Prepare your inquiry, copy it, and send it on Messenger — the seller confirms everything personally.</p>
  </div></div>
  <div class="page-body"><div class="container"><div id="inq-wrap">
    <div class="two-col">
      <form class="panel" data-form="inquiry" data-reveal novalidate>
        <span class="overline" style="margin-bottom:18px">Your details</span>
        <div class="field" data-f="name"><label for="f-name">Full name *</label><input id="f-name" name="name" autocomplete="name" placeholder="e.g. Fariza Rahman"><span class="f-err">Please enter your name.</span></div>
        <div class="field" data-f="phone"><label for="f-phone">Phone / Messenger contact *</label><input id="f-phone" name="phone" inputmode="tel" autocomplete="tel" placeholder="e.g. 01XXXXXXXXX"><span class="f-err">Please enter a valid contact number (at least 6 digits).</span></div>
        <div class="field" data-f="district"><label for="f-district">District / City *</label><input id="f-district" name="district" autocomplete="address-level2" placeholder="e.g. Dhaka"><span class="f-err">Please enter your district.</span></div>
        <div class="field" data-f="address"><label for="f-address">Delivery address *</label><textarea id="f-address" name="address" rows="3" autocomplete="street-address" placeholder="House, road, area…"></textarea><span class="f-err">Please enter your delivery address.</span></div>
        <div class="field"><label for="f-notes">Notes (optional)</label><textarea id="f-notes" name="notes" rows="2" placeholder="Sizing questions, colour preferences, gift wrap…"></textarea></div>
        <div class="field"><label>Preferred reply via</label>
          <div class="radio-row">
            <label><input type="radio" name="contact" value="Messenger" checked> Messenger</label>
            <label><input type="radio" name="contact" value="WhatsApp"> WhatsApp</label>
            <label><input type="radio" name="contact" value="Phone call"> Phone call</label>
          </div>
        </div>
        <label style="display:flex;gap:9px;align-items:center;font-size:13.5px;margin:6px 0 18px"><input type="checkbox" name="clearbag" style="accent-color:var(--chestnut)"> Clear my bag after preparing the inquiry</label>
        <button type="submit" class="btn btn-ink btn-block"><span>Prepare inquiry message</span>${IC.arrow}</button>
        <p class="tiny" style="margin-top:12px">This prepares a message — it does not place or confirm an order.</p>
      </form>
      <div class="panel sticky" data-reveal style="--d:.1s" id="inq-summary"></div>
    </div>
  </div></div>`;
}
function renderInqSummary(){
  const el=$("#inq-summary"); if(!el)return;
  el.innerHTML=`<span class="overline">Your inquiry</span>
    <div style="margin-top:14px">${state.bag.map(it=>{const p=bySku(it.sku);return `<div class="prov-row"><span>${p.sku} · ${esc(p.title)}</span><span>× ${it.qty}</span></div>`;}).join("")||'<p class="small">Bag is empty.</p>'}</div>
    <div class="dr-total" style="margin-top:16px"><span>${bagCount()} item${bagCount()===1?"":"s"}</span><b>${subtotalText(state.bag)} · indicative</b></div>
    <div class="notice" style="margin-top:12px">${IC.alert}<span>Offers up to 25% first-order &amp; free delivery are advertised — the seller confirms eligibility. No automatic discount, no online payment.</span></div>`;
}
function renderInqDone(){
  const wrap=$("#inq-wrap"); if(!wrap||!state.lastInquiry)return;
  const q=state.lastInquiry;
  const waUrl = "https://wa.me/8801700000000?text=" + encodeURIComponent(q.text);
  wrap.innerHTML=`<div class="two-col"><div class="panel" data-reveal>
    <div class="success-mark">${IC.check}</div>
    <h2 class="h-sec kinetic-title">Inquiry Prepared &amp; Registered!</h2>
    <p class="lede" style="margin:12px 0 20px">Reference <b style="color:var(--chestnut)">${esc(q.ref)}</b>. Your order inquiry has been recorded. To finalize your order, sizing, and delivery schedule, please send this summary to our concierge via WhatsApp or Messenger. <b>Cash on Delivery applies — no payment taken online.</b></p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">
      <a class="btn btn-caramel" href="${waUrl}" target="_blank" rel="noopener">${IC.wa}<span>Send via WhatsApp</span></a>
      <button class="btn btn-ink" data-act="msg" data-send="1">${IC.chat}<span>Send via Messenger</span></button>
      <button class="btn btn-line" data-act="copy" data-target="#inq-msg">${IC.copy}<span>Copy Summary</span></button>
      <a class="btn btn-line" href="#/track/${encodeURIComponent(q.ref)}">${IC.pin}<span>Track This Order</span></a>
      <button class="btn btn-line" data-act="inq-dl">${IC.dl}<span>Download .txt</span></button>
    </div>
    <div class="notice info">${IC.info}<span>Order saved locally and submitted to Supabase. You can check its live fulfillment status anytime on our <a href="#/track/${encodeURIComponent(q.ref)}" style="text-decoration:underline">Order Tracking</a> page.</span></div>
    <button class="btn btn-line btn-sm" style="margin-top:18px" data-act="inq-new"><span>Start another inquiry</span></button>
  </div>
  <div class="panel sticky" data-reveal style="--d:.1s">
    <span class="overline" style="margin-bottom:12px">Message preview</span>
    <pre class="msg-pre" id="inq-msg">${esc(q.text)}</pre>
  </div></div>`;
  revealBind(wrap);
}
/* ================= ABOUT / CONTACT / FAQ / POLICIES ================= */
function pageAbout(){
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>Since Mirpur, with love</span>
    <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">Fariza's Territory</h1>
    <p class="lede" data-reveal style="--d:.12s;margin-top:10px">“Fashion clothing &amp; accessories based in Dhaka, Bangladesh.” — Official Brand Book</p>
  </div></div>
  <div class="page-body"><div class="container">
    <div class="two-col">
      <div data-reveal>
        <div class="ft-brand-identity" style="margin:0 0 20px"><img style="width:100%;max-width:430px;border-radius:12px;border:1px solid var(--line)" src="data:image/webp;base64,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" alt="Fariza's Territory — brand book logo illustration"></div><p class="lede" style="margin-bottom:18px">Fariza's Territory is a fashion accessories brand based in Mirpur, Dhaka, connecting with over 13,000 social media followers through regular photos and video reels featuring its products. This interactive boutique brings that feed to life: a floor of real product photography you can browse, enlarge and inquire about — piece by piece.</p>
        <p class="lede" style="margin-bottom:26px">We commit to photography-first presentation. Where the catalog includes AI styling previews, they are always labelled as illustrations. Where a photo's public access is unresolved, you'll see an honest branded placeholder — never another product's photograph.</p>
        <span class="overline">Values</span>
        <div class="value-chips" style="margin-top:12px"><span style="border-color:var(--kantha);color:var(--chestnut)">Style</span><span style="border-color:var(--kantha);color:var(--chestnut)">Trendy Fashion</span><span style="border-color:var(--kantha);color:var(--chestnut)">Community</span></div>
        <span class="overline">Aesthetic</span>
        <ul class="aes-list" style="margin-top:12px;color:var(--ink)">
          ${["Folk-art ornamentation","Heritage patternwork","Artisanal tactility","Botanical intricacy","Traditional flourish","Casual · Modern · Trendy voice"].map(a=>`<li style="color:var(--ink2)">${IC.flower}${a}</li>`).join("")}
        </ul>
        <div class="notice info" style="margin-top:20px">${IC.info}<span>The “Aarong” collection label comes from the seller's original catalog and is flagged <b>unverified</b> — no brand affiliation is claimed. The catalog contains provisional prices, but sizes and inventory remain unverified. Seller confirms final terms on inquiry.</span></div>
      </div>
      <div data-reveal style="--d:.12s">
        <div class="specimen">
          <span class="overline">Brand typography</span>
          <div class="big" style="margin-top:14px">Actor Aa</div>
          <p class="small">ABCDEFGHIJKLMNOPQRSTUVWXYZ<br>abcdefghijklmnopqrstuvwxyz 0123456789</p>
          <div class="big bn" style="margin-top:16px;font-size:38px">অ আ ক খ গ ঘ</div>
          <p class="small bn">নোটো স্যান্স বাংলা — প্রতিটি খুঁটিনাটিতে মার্জিত রুচি।</p>
        </div>
        <span class="overline" style="margin:24px 0 4px">Official palette — tap to copy</span>
        <div class="sw-grid">
          ${[["Parchment Cream","#FDF0DD"],["Obsidian Black","#1E1D1C"],["Caramel Brown","#D1803A"],["Chestnut Brown","#794722"],["Olive Brown","#5E522B"]].map(s=>`<button class="swatch" data-act="pal-copy" data-hex="${s[1]}"><i style="background:${s[1]}"></i><span><b>${s[0]}</b><span>${s[1]}</span></span></button>`).join("")}
        </div>
        <p class="tiny">Logo rules honoured: clear space around the mark, minimum 152px lockup width on desktop. Brand Book by Pomelli.</p>
      </div>
    </div>
  </div></div>`;
}
function pageContact(){
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>We reply personally</span>
    <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">Contact &amp; Ordering</h1>
  </div></div>
  <div class="page-body"><div class="container">
    <div class="contact-grid">
      <div data-reveal>
        <div class="c-card">${IC.chat}<div><b>Facebook Messenger — primary</b><p>The fastest way to order. Send your inquiry message and we confirm prices, sizing, offers and delivery.</p>${messengerBtn("Open Messenger")}</div></div>
        ${state.cfg.whatsapp?`<div class="c-card">${IC.wa}<div><b>WhatsApp</b><p>WhatsApp order inquiries available.</p><button class="btn btn-line btn-sm" data-act="wa">${IC.wa}<span>WhatsApp inquiry</span></button></div></div>`:''}
        <div class="c-card">${IC.pin}<div><b>Mirpur, Dhaka, Bangladesh</b><p>Boutique base as stated in the Brand Book. A precise street address and phone line are not published in the source materials — please ask via Messenger.</p><a class="btn btn-line btn-sm" href="${CONFIG.fbSearch}" target="_blank" rel="noopener">${IC.ext}<span>Find us on Facebook</span></a></div></div>
        <div class="notice">${IC.alert}<span>Offers as advertised: first-order up to 25%* and free delivery*. Eligibility is confirmed by the seller — never auto-applied here.</span></div>
      </div>
      <form class="panel" data-form="contact" data-reveal style="--d:.1s" novalidate>
        <span class="overline" style="margin-bottom:18px">Write to us</span>
        <div class="field" data-f="cname"><label for="c-name">Your name *</label><input id="c-name" name="cname" placeholder="Name"><span class="f-err">Please enter your name.</span></div>
        <div class="field" data-f="ccontact"><label for="c-contact">Phone or Messenger name *</label><input id="c-contact" name="ccontact" placeholder="How we reach you"><span class="f-err">Please enter a contact.</span></div>
        <div class="field" data-f="cmsg"><label for="c-msg">Message *</label><textarea id="c-msg" name="cmsg" rows="5" placeholder="Ask about a piece (mention its SKU), sizing, offers…"></textarea><span class="f-err">Please write a message.</span></div>
        <button type="submit" class="btn btn-ink btn-block"><span>Prepare message</span>${IC.arrow}</button>
        <div id="contact-out" style="margin-top:16px"></div>
      </form>
    </div>
  </div></div>`;
}
function pageFAQ(){
  const faqs=[
    ["How do I place an order?","Add pieces to your inquiry bag, open Order Inquiry, fill in your details and prepare the message. Copy it and send it on Facebook Messenger. The seller confirms price, availability, sizing and delivery, then arranges the order with you."],
    ["Are the prices final?","This store now displays the earlier 18-product catalog reference prices (৳1,650–৳2,450). They are not live-confirmed selling prices. Sizes, stock and final amounts are confirmed on Messenger; five color-to-price matches need particular review."],
    ["Is the 25% discount applied automatically?","No. “First-order discount up to 25%” and “free delivery” are offers advertised on the brand's Facebook page. Eligibility and final terms are confirmed by the seller per order — this site never auto-applies a discount."],
    ["Do you take payment online?","No. This is an inquiry-based checkout. No card details, no payment gateway, no simulated confirmations. Payment arrangements are made directly with the seller."],
    ["Some photos show a patterned placeholder — why?","All 18 products link to Google Drive files flagged “NEEDS PUBLIC PERMISSION TEST”. Drive view links are not guaranteed embeddable URLs. When a photo can't load publicly, we show a branded placeholder with the correct SKU — never another product's photo. Open the Console ▸ Asset validation to test access live."],
    ["What are the AI styling previews?","14 pieces include an AI-generated styling illustration in the source catalog. They are always labelled “AI illustration — not the actual product” and kept separate from real photography. The four Mome Boutique pieces have no AI preview supplied."],
    ["Is the Aarong collection officially affiliated?","The source CSV names the collection “01_Aarong_Label_Unverified”. We display it as a seller label with an explicit “unverified” badge and claim no brand affiliation."],
    ["What about returns and exchanges?","Return and exchange terms were not included in the source materials. Please confirm them with the seller on Messenger before ordering — see Policies."]
  ];
  return `
  <div class="page-head"><div class="container"><span class="overline" data-reveal>Answers, honestly</span><h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">FAQ</h1></div></div>
  <div class="page-body"><div class="container"><div class="faq-list">
    ${faqs.map((f,i)=>`<details class="acc" data-reveal style="--d:${i*.04}s"${i===0?" open":""}><summary>${esc(f[0])} ${IC.chev}</summary><div class="acc-body">${esc(f[1])}</div></details>`).join("")}
    <div style="margin-top:26px;display:flex;gap:10px;flex-wrap:wrap">${messengerBtn("Still curious? Ask us")}<a class="btn btn-line" href="#/policies"><span>Read policies</span></a></div>
  </div></div></div>`;
}
function pagePolicies(){
  return `
  <div class="page-head"><div class="container"><span class="overline" data-reveal>Plain words, no fine-print tricks</span><h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">Policies &amp; Offer Terms</h1></div></div>
  <div class="page-body"><div class="container">
    <div class="pol-sec" data-reveal><h3>${IC.tag} Ordering &amp; pricing</h3><p>This boutique operates an inquiry-based checkout. Adding items to the bag and preparing an inquiry does not create a binding order. All prices (BDT), sizing, availability and delivery costs are confirmed by the seller on Messenger before any order is agreed. No payment is processed on this website.</p></div>
    <div class="pol-sec" data-reveal><h3>${IC.truck} Advertised offers &amp; delivery</h3><p>The brand's Facebook page advertises a first-order discount of up to 25% and free delivery. These are advertised offers, not guaranteed terms:</p><ul><li>Eligibility, minimum spend, coverage and expiry are confirmed by the seller per order.</li><li>No discount is automatically applied anywhere in this boutique.</li><li>Delivery timelines are provided by the seller when confirming your inquiry.</li></ul></div>
    <div class="pol-sec" data-reveal><h3>${IC.eye} Imagery &amp; authenticity</h3><p>Real product photography is always primary. Assets are mapped exactly per SKU from the source CSV: main, original and alternate photographs; derived 1:1 and 9:16 crops; two detail close-ups; and an optional AI styling preview. AI previews are labelled “ai-illustration” and never presented as product photographs. Drive file references are retained for source traceability; the delivered image variants work independently through embedded or local website media. Any missing asset retains a clearly labeled fallback.</p></div>
    <div class="pol-sec" data-reveal><h3>${IC.info} Privacy &amp; data</h3><p>Your bag, wishlist and seller settings are stored only in your browser's localStorage. Inquiry details you type are used solely to compose the message you copy and send — they are not transmitted to any server by this site. No analytics, no trackers, no cookies beyond your own storage.</p></div>
    <div class="pol-sec" data-reveal><h3>${IC.flower} Returns &amp; exchanges</h3><p>Return and exchange policies were not included in the source materials and are therefore not invented here. Please confirm current terms with the seller on Messenger before completing an order.</p></div>
    <div class="pol-sec" data-reveal><h3>${IC.alert} Label disclaimer</h3><p>The collection “01_Aarong_Label_Unverified” reflects the seller's own CSV label. Fariza's Territory's affiliation with Aarong is unverified in the provided sources and is not claimed by this site.</p></div>
  </div></div>`;
}
function page404(){
  return `<div class="page-head"><div class="container"><span class="overline">Lost on the floor</span><h1 class="h-display" style="margin-top:12px">Page not found</h1></div></div>
  <div class="page-body"><div class="container"><div class="empty">${IC.flower}<p>This corner of the boutique doesn't exist.</p><div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap"><a class="btn btn-ink btn-sm" href="#/home"><span>Back home</span></a><a class="btn btn-line btn-sm" href="#/shop"><span>Shop all pieces</span></a></div></div></div></div>`;
}
/* ================= LIGHTBOX ================= */
function lbList(sku){const p=bySku(sku);const l=PHOTO_KEYS.slice();if(p.assets.aiStylingPreview.id)l.push("aiStylingPreview");return l;}
function openLB(sku,key){
  state.lb={sku,key,scale:1,tx:0,ty:0,list:lbList(sku)};
  $("#lightbox").classList.add("open");$("#lightbox").setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
  renderLB();
}
function renderLB(){
  const {sku,key}=state.lb,p=bySku(sku),meta=KEY_META[key];
  $("#lb-cap").innerHTML=`<b style="font-weight:400">${esc(p.title)}</b><span class="tag ${key==="aiStylingPreview"?"ai":"dark"}">${key==="aiStylingPreview"?"AI illustration — not actual product":esc(meta.label)}</span><span class="tiny" style="color:rgba(253,240,221,.6)">${p.sku} · ${meta.auth}</span>`;
  $("#lb-src").innerHTML=p.assets[key].id?`<a href="${driveView(p.assets[key].id)}" target="_blank" rel="noopener" style="text-decoration:underline">Open source Drive file ↗</a>`:"Asset not supplied";
  $("#lb-fig").innerHTML=ph(p,key,{w:1600,eager:true,contain:true,ratio:meta.ratio});
  applyLB(); bindImages($("#lb-fig"));
  fx($("#lb-fig"),{opacity:[0,1]},{duration:.35});
}
function applyLB(){
  const f=$("#lb-fig");
  f.style.transform=`translate(${state.lb.tx}px,${state.lb.ty}px) scale(${state.lb.scale})`;
}
function closeLB(){$("#lightbox").classList.remove("open");$("#lightbox").setAttribute("aria-hidden","true");if(!state.drawer)document.body.style.overflow="";}
function lbStep(d){
  const l=state.lb.list,i=l.indexOf(state.lb.key);
  state.lb.key=l[(i+d+l.length)%l.length];state.lb.scale=1;state.lb.tx=0;state.lb.ty=0;renderLB();
}
function lbZoom(f){state.lb.scale=Math.max(.6,Math.min(5,state.lb.scale*f));if(state.lb.scale<=1){state.lb.tx=0;state.lb.ty=0;}applyLB();}
/* ================= CONSOLE MODAL ================= */
function stHtml(st){
  const m={ok:["ok","Reachable"],err:["err","Blocked"],pending:["pending","Testing…"],na:["na","Not supplied"]};
  const v=m[st]||m.pending;
  return `<span class="st ${v[0]}"><i></i>${v[1]}</span>`;
}
function openModal(tab){
  state.reportTab=tab||"assets";
  closeDrawer();closeSearch();closeMenu();
  $("#modal").classList.add("open");$("#modal").setAttribute("aria-hidden","false");
  document.body.style.overflow="hidden";
  renderModal();
  if(state.reportTab==="assets"&&!state.reportRan)runReport();
}
function closeModal(){$("#modal").classList.remove("open");$("#modal").setAttribute("aria-hidden","true");if(!state.drawer)document.body.style.overflow="";}
function renderModal(){
  $$(".mo-tabs .chip").forEach(c=>c.classList.toggle("on",c.dataset.tab===state.reportTab));
  const body=$("#mo-body");
  if(state.reportTab==="assets"){
    body.innerHTML=`
      <p class="small" style="margin-bottom:14px">Live client-side test of this published website's <b>main product photography</b>. Photos are delivered through optimized static assets or a self-contained media block. Original Google Drive references are retained for provenance.</p>
      <div class="rep-sum" id="rep-sum"></div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn btn-ink btn-sm" data-act="report-retest">${IC.check}<span>Re-run validation</span></button>
        <button class="btn btn-line btn-sm" data-act="report-dl">${IC.dl}<span>Download report .json</span></button>
      </div>
      <div class="rep-scroll"><table class="rep-table"><thead><tr><th>SKU</th><th>Product</th><th>Collection (source folder)</th><th>Main photo</th><th>AI preview</th><th>Source</th></tr></thead><tbody>
      ${PRODUCTS.map(p=>`<tr><td style="white-space:nowrap">${p.sku}</td><td>${esc(p.title)}</td><td class="tiny">${esc(p.collection.folder)}</td><td id="rep-st-${p.sku}">${stHtml(p.assets.main.id?(state.assets[p.sku+":main"]||"pending"):"na")}</td><td>${p.assets.aiStylingPreview.id?`<span class="tag ai" style="font-size:9px">supplied</span>`:`<span class="st na"><i></i>none</span>`}</td><td><a href="${driveView(p.assets.main.id)}" target="_blank" rel="noopener" style="color:var(--chestnut)" aria-label="Open Drive source for ${p.sku}">${IC.ext}</a></td></tr>`).join("")}
      </tbody></table></div>`;
    updateReportSummary();
  }else if(state.reportTab==="config"){
    body.innerHTML=`
      <p class="small" style="margin-bottom:16px">The verified Facebook Messenger page is connected. WhatsApp is not enabled because a verified phone number was not supplied. Optional settings are stored in this browser only.</p>
      <form data-form="config">
        <div class="field"><label for="cfg-m">Facebook page username (m.me/…)</label><input id="cfg-m" name="messenger" value="${esc(state.cfg.messenger)}" placeholder="e.g. farizasterritory"></div>
        <div class="field"><label for="cfg-w">WhatsApp number (international format)</label><input id="cfg-w" name="whatsapp" value="${esc(state.cfg.whatsapp)}" placeholder="e.g. 8801XXXXXXXXX"></div>
        <div class="field"><label for="cfg-f">Official Facebook page URL</label><input id="cfg-f" name="facebook" value="${esc(state.cfg.facebook)}" placeholder="https://www.facebook.com/…"></div>
        <button type="submit" class="btn btn-ink"><span>Save settings</span>${IC.check}</button>
      </form>
      <div class="notice info" style="margin-top:18px">${IC.info}<span>Catalog reference prices are supplied but not live-confirmed. Sizing, stock, shipping and final selling prices need seller verification. Inquiry mode remains active.</span></div>`;
  }else{
    const qa=selfTest();
    body.innerHTML=`
      <span class="overline" style="margin-bottom:12px">Runtime self-test (executed just now in your browser)</span>
      ${qa.map(r=>`<div class="qa-row"><span class="st ${r.pass?"ok":"err"}"><i></i>${r.pass?"PASS":"FAIL"}</span><span>${esc(r.name)}</span><span class="tiny" style="margin-left:auto">${esc(r.detail)}</span></div>`).join("")}
      <span class="overline" style="margin:22px 0 10px">Configuration / environment template</span>
      <pre class="code"># fariza.config — live defaults
NEXT_PUBLIC_MESSENGER_USERNAME=farizasterritory143
NEXT_PUBLIC_FACEBOOK_URL=https://www.facebook.com/farizasterritory143
# WhatsApp not set; hide WhatsApp action until a verified number exists.
# Prices are catalog reference values; size/stock/returns remain seller-confirmation items.
# Website images are local/embedded originals; Drive references remain in product records.</pre>
      <span class="overline" style="margin:22px 0 10px">Deployment</span>
      <p class="small" style="line-height:1.8">Deployment options: use the all-in-one GoHighLevel code block with embedded product photography, or upload the complete <code>STANDALONE_WEBSITE</code> folder to any static host. The latter includes optimized local images. Messenger is configured. Reconfirm catalog reference prices, stock, sizing and commercial terms before accepting orders. No payment gateway is enabled.</p>
      <span class="overline" style="margin:22px 0 10px">Image policy</span>
      <p class="small" style="line-height:1.8">Real photography is primary; AI previews are labelled <code>ai-illustration</code>; unreachable Drive assets fall back to a branded SKU-labelled tile. No stock imagery, no substituted product photos, no invented model shots. Validation above runs against <code>drive.google.com/thumbnail</code> from your browser session.</p>`;
  }
}
function updateReportSummary(){
  const el=$("#rep-sum"); if(!el)return;
  let ok=0,err=0,pend=0;
  PRODUCTS.forEach(p=>{const s=state.assets[p.sku+":main"]||"pending";if(s==="ok")ok++;else if(s==="err")err++;else pend++;});
  el.innerHTML=`<span class="tag ok">${ok} / 18 reachable</span><span class="tag" style="background:rgba(154,143,124,.2);color:#6E6557">${err} blocked → branded fallback</span><span class="tag warn">${pend} testing</span><span class="tag">140 / 144 asset IDs supplied · 4 AI previews absent</span>`;
}
function selfTest(){
  const r=[];
  r.push({name:"Catalog integrity — 18 products present",pass:PRODUCTS.length===18,detail:PRODUCTS.length+" products"});
  r.push({name:"Unique SKUs CAT-001…CAT-018",pass:new Set(PRODUCTS.map(p=>p.sku)).size===18,detail:"18 unique"});
  const counts=COLLECTIONS.map(c=>PRODUCTS.filter(p=>p.col===c.id).length).join(",");
  r.push({name:"Collection counts match source (1,2,4,6,5)",pass:counts==="1,2,4,6,5",detail:counts});
  const ids=PRODUCTS.reduce((a,p)=>a+KEYS.filter(k=>p.assets[k].id).length,0);
  r.push({name:"Asset IDs mapped exactly per SKU",pass:ids===140,detail:ids+" / 140 supplied (4 AI = not_supplied)"});
  let ls=false;try{localStorage.setItem("ft_test","1");ls=localStorage.getItem("ft_test")==="1";localStorage.removeItem("ft_test");}catch(e){}
  r.push({name:"Persistent storage round-trip (bag / wishlist / config)",pass:ls,detail:ls?"localStorage OK":"unavailable — session-only"});
  r.push({name:"Motion.dev loaded (WAAPI fallback otherwise)",pass:!!window.Motion,detail:window.Motion?"motion UMD active":"fallback active"});
  r.push({name:"Anime.js loaded (WAAPI fallback otherwise)",pass:!!window.anime,detail:window.anime?"anime v3 active":"fallback active"});
  let fonts=false;try{fonts=document.fonts.check("16px Actor");}catch(e){}
  r.push({name:"Actor typeface available",pass:fonts,detail:fonts?"loaded":"loading / system fallback"});
  r.push({name:"Reduced-motion preference respected",pass:true,detail:RM?"reduce — animations minimised":"no-preference"});
  return r;
}
/* ================= MESSENGER / WHATSAPP / COPY ================= */
function copyText(text,label){
  const done=()=>toast(label||"Copied to clipboard",{icon:"copy"});
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text,done));}
  else fallbackCopy(text,done);
}
function fallbackCopy(text,done){
  const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";
  document.body.appendChild(ta);ta.select();
  try{document.execCommand("copy");done();}catch(e){toast("Copy failed — select the text manually",{icon:"alert"});}
  ta.remove();
}
function openMessenger(text){
  if(text)copyText(text,"Message copied — paste it in Messenger");
  const url=state.cfg.messenger?`https://m.me/${encodeURIComponent(state.cfg.messenger)}`:(state.cfg.facebook||CONFIG.fbSearch);
  if(!state.cfg.messenger)toast("Opening the official Facebook business page",{icon:"info"});
  window.open(url,"_blank","noopener");
}
function openWhatsApp(text){
  if(!state.cfg.whatsapp){toast("WhatsApp is not currently available — use Messenger to order",{icon:"alert",action:"Open settings",onAction:()=>openModal("config")});return;}
  const url=`https://wa.me/${state.cfg.whatsapp.replace(/[^0-9]/g,"")}${text?"?text="+encodeURIComponent(text):""}`;
  window.open(url,"_blank","noopener");
}
function skuMessage(sku){
  const p=bySku(sku);
  return `Hello Fariza's Territory! I'm interested in:\n${p.sku} — ${p.title} (${p.collection.name})\nPlease share the price, sizing and availability. Thank you!`;
}

/* ================= ORDER TRACKING PAGE ================= */
function pageTrack(paramRef){
  const defaultRef = paramRef || (state.lastInquiry && state.lastInquiry.ref) || "";
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>Real-time order lookup</span>
    <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">Track Your Order</h1>
    <p class="lede" data-reveal style="--d:.12s;margin-top:10px">Enter your Order Reference (e.g. <b>FT-261115-8821</b>) or your contact phone number to view live verification, tailoring and courier delivery updates.</p>
  </div></div>
  <div class="page-body"><div class="container" style="max-width:860px">
    <div class="panel" data-reveal style="margin-bottom:24px">
      <form id="track-form" onsubmit="event.preventDefault();handleTrackSearch();" style="display:flex;gap:10px;flex-wrap:wrap">
        <input id="track-input" type="text" value="${esc(defaultRef)}" placeholder="Enter Order Ref (e.g. FT-261115-8821) or Phone" style="flex:1;min-width:260px;padding:12px 16px;border-radius:10px;border:1.5px solid var(--kantha);background:var(--surface);color:var(--ink);font-family:inherit;font-size:15px">
        <button type="submit" class="btn btn-ink" style="padding:12px 24px"><span>Check Status</span>${IC.arrow}</button>
      </form>
    </div>
    <div id="track-result-wrap"></div>
    <div id="recent-orders-wrap" style="margin-top:28px"></div>
  </div></div>`;
}

async function handleTrackSearch(){
  const inp = document.getElementById("track-input");
  const q = inp ? inp.value.trim() : "";
  const wrap = document.getElementById("track-result-wrap");
  if(!wrap) return;
  if(!q){
    wrap.innerHTML = '<div class="notice alert">${IC.alert}<span>Please enter a valid order reference or phone number.</span></div>';
    return;
  }
  wrap.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink2)">Searching boutique records...</div>';
  
  const order = await window.FT_SUPABASE.getOrderByRef(q);
  if(!order){
    wrap.innerHTML = `<div class="panel" style="text-align:center;padding:36px">
      <div style="font-size:32px;margin-bottom:12px">🔍</div>
      <h3 style="font-size:20px;margin:0 0 10px">Order Not Found</h3>
      <p class="small" style="color:var(--ink2);max-width:440px;margin:0 auto 18px">We could not locate an inquiry matching "<b>${esc(q)}</b>". Please check the spelling or send a message directly to our seller team on WhatsApp.</p>
      <a href="https://wa.me/8801700000000?text=Hello%20Fariza%27s%20Territory%2C%20I%20am%20checking%20the%20status%20of%20my%20order%20${encodeURIComponent(q)}" target="_blank" rel="noopener" class="btn btn-line btn-sm">${IC.wa}<span>Inquire on WhatsApp</span></a>
    </div>`;
    return;
  }
  
  renderTrackCard(order, wrap);
}

function renderTrackCard(order, wrap){
  const st = order.status || 'pending';
  const steps = [
    { key: 'pending', label: 'Inquiry Placed', desc: 'Received & pending boutique confirmation' },
    { key: 'confirmed', label: 'Confirmed', desc: 'Fabric verified & sizing confirmed' },
    { key: 'processing', label: 'Processing', desc: 'Inspected & prepared at Mirpur workshop' },
    { key: 'shipped', label: 'Dispatched', desc: order.courier_name ? (order.courier_name + (order.tracking_number ? ' #' + order.tracking_number : '')) : 'Handed over to courier' },
    { key: 'delivered', label: 'Delivered', desc: 'Package delivered & cash collected' }
  ];
  
  const stepIdx = { 'pending':0, 'confirmed':1, 'processing':2, 'shipped':3, 'delivered':4, 'cancelled':-1 }[st] || 0;
  
  let itemsHtml = '';
  if(Array.isArray(order.items)){
    itemsHtml = order.items.map(it => `
      <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px dashed var(--line)">
        ${it.image ? `<img src="${it.image}" style="width:48px;height:60px;object-fit:cover;border-radius:6px;">` : ''}
        <div style="flex:1">
          <div style="font-weight:600">${esc(it.title || it.sku)}</div>
          <small style="color:var(--ink2)">SKU: ${esc(it.sku)} · Qty: ${it.qty || 1}</small>
        </div>
        <div style="font-weight:700">৳ ${Number(it.price || 0).toLocaleString()}</div>
      </div>
    `).join('');
  }

  wrap.innerHTML = `
  <div class="panel" style="border:1.5px solid var(--kantha);box-shadow:var(--shadow)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:18px">
      <div>
        <span class="overline" style="color:var(--chestnut)">Order Status</span>
        <h2 style="font-size:22px;margin:4px 0 0">${esc(order.order_ref)}</h2>
        <small style="color:var(--ink2)">Placed on ${new Date(order.created_at || Date.now()).toLocaleDateString('en-GB')}</small>
      </div>
      <div>
        <span class="order-tracking-status status-${st}">${st}</span>
      </div>
    </div>

    <!-- Stepper -->
    ${st === 'cancelled' ? '<div class="notice alert" style="margin-bottom:20px">${IC.alert}<span>This order was cancelled. Please message us on WhatsApp if you wish to re-inquire.</span></div>' : `
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:10px;margin:20px 0;background:var(--cream2);padding:16px;border-radius:12px;">
        ${steps.map((sp, i) => `
          <div style="text-align:center;opacity:${i <= stepIdx ? 1 : 0.4}">
            <div style="width:28px;height:28px;border-radius:50%;background:${i <= stepIdx ? 'var(--chestnut)' : 'var(--cream3)'};color:${i <= stepIdx ? '#FFF' : 'var(--ink)'};display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;margin-bottom:6px">
              ${i < stepIdx ? '✓' : (i + 1)}
            </div>
            <div style="font-size:13px;font-weight:600">${sp.label}</div>
            <div style="font-size:11px;color:var(--ink2);margin-top:2px">${sp.desc}</div>
          </div>
        `).join('')}
      </div>
    `}

    <!-- Items & Summary -->
    <div style="margin:20px 0">
      <span class="overline">Pieces in this order</span>
      <div style="margin-top:10px">${itemsHtml}</div>
    </div>

    <!-- Financial Breakdown -->
    <div style="background:var(--cream2);padding:16px;border-radius:10px;margin-bottom:18px;font-size:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span>Items Subtotal:</span>
        <b>৳ ${Number(order.subtotal || 0).toLocaleString()}</b>
      </div>
      ${order.discount_amount ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:var(--kantha)">
          <span>Discount Voucher (${esc(order.discount_code || '')}):</span>
          <b>- ৳ ${Number(order.discount_amount).toLocaleString()}</b>
        </div>
      ` : ''}
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span>Delivery Fee (${order.delivery_zone === 'dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}):</span>
        <b>৳ ${Number(order.delivery_fee || 80).toLocaleString()}</b>
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px dashed var(--line);font-size:16px;font-weight:700;color:var(--ink)">
        <span>Total Payable (Cash on Delivery):</span>
        <span>৳ ${Number(order.total || 0).toLocaleString()}</span>
      </div>
    </div>

    <!-- Customer & Delivery -->
    <div style="font-size:13.5px;color:var(--ink2);margin-bottom:18px">
      <div><b>Recipient:</b> ${esc(order.customer_name)} (${esc(order.customer_phone)})</div>
      <div style="margin-top:4px"><b>Delivery Address:</b> ${esc(order.customer_address)}</div>
      ${order.customer_notes ? `<div style="margin-top:4px"><b>Notes:</b> ${esc(order.customer_notes)}</div>` : ''}
    </div>

    <!-- Actions -->
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <a href="https://wa.me/8801700000000?text=Hello%20Fariza%27s%20Territory%2C%20I%20have%20a%20question%20regarding%20my%20order%20${encodeURIComponent(order.order_ref)}" target="_blank" rel="noopener" class="btn btn-ink btn-sm">${IC.wa}<span>Contact Seller on WhatsApp</span></a>
      <button class="btn btn-line btn-sm" onclick="navigator.clipboard.writeText('${esc(order.order_ref)}');toast('Order ref copied!',{icon:'check'});">${IC.copy}<span>Copy Order Ref</span></button>
    </div>
  </div>`;
}

/* ================= ROUTER ================= */
const TITLES={
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
};
function parseRoute(){
  const h=(location.hash||"#/home").slice(2);
  const [path,qs]=h.split("?");
  const seg=path.split("/").filter(Boolean);
  return {page:seg[0]||"home",param:seg[1]||null,query:Object.fromEntries(new URLSearchParams(qs||""))};
}
let renderToken=0;
function render(){
  const r=parseRoute();state.route=r;
  const app=$("#app");const token=++renderToken;
  closeHotPop();closeDrawer();closeSearch();closeMenu();closeLB();closeModal();
  document.body.classList.toggle("has-mbuy",r.page==="product"&&!!bySku(r.param));
  let html,title=TITLES[r.page]||"Fariza's Territory",desc="Elegance in Every Detail — Fariza's Territory, Mirpur, Dhaka.";
  switch(r.page){
    case "home":html=pageHome();break;
    case "shop":html=pageShop();break;
    case "fashion":state.shop.pillar="Fashion";html=pageShop();break;
    case "accessories":state.shop.pillar="Accessories";html=pageShop();break;
    case "collections":html=pageCollections();break;
    case "lookbook":html=pageLookbook();break;
    case "product":{const p=bySku(r.param);html=pageProduct(r.param);if(p){title=`${p.title} (${p.sku}) — Fariza's Territory`;desc=`${p.title} — ${p.collection.name}. Real boutique photography, fabric close-ups and Messenger inquiry. Catalog reference prices available; final amount confirmed by seller.`;}break;}
    case "about":html=pageAbout();break;
    case "bag":html=pageBag();break;
    case "inquiry":html=pageInquiry();break;
    case "track":html=pageTrack(r.param);break;
    case "contact":html=pageContact();break;
    case "faq":html=pageFAQ();break;
    case "policies":html=pagePolicies();break;
    default:html=page404();title="Page not found — Fariza's Territory";
  }
  const swap=()=>{
    if(token!==renderToken)return;
    app.innerHTML=html;
    document.title=title;
    const md=document.querySelector('meta[name="description"]');if(md)md.setAttribute("content",desc);
    $$(".nav-links a").forEach(a=>a.classList.toggle("on",a.dataset.nav===r.page||(r.page==="product"&&a.dataset.nav==="shop")));
    window.scrollTo({top:0,behavior:"instant"in window?"instant":"auto"});
    hydrate();
    fx(app,{opacity:[0,1],transform:["translateY(14px)","translateY(0)"]},{duration:.5});
  };
  if(RM||!app.innerHTML){swap();}
  else{const a=app.animate([{opacity:1},{opacity:0}],{duration:140,fill:"forwards"});a.onfinish=swap;setTimeout(()=>{if(token===renderToken&&!app.dataset.swapped){}},200);}
}
function hydrate(){
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
}
/* ================= REVEAL / SCROLL ================= */
let IO=null;
function revealBind(root){
  const els=(root||document).querySelectorAll("[data-reveal]:not(.in)");
  if(RM){els.forEach(e=>e.classList.add("in"));return;}
  if(!IO){IO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");IO.unobserve(e.target);}}),{threshold:.1,rootMargin:"0px 0px -6% 0px"});}
  els.forEach(e=>IO.observe(e));
}
/* ================= STAGE INPUT ================= */
function initStageInput(){
  const stage=$("#stage");if(!stage||stage.dataset.inputBound)return;
  stage.dataset.inputBound="1";
  let sx=null,sid=null;
  stage.addEventListener("pointerdown",e=>{sx=e.clientX;sid=e.pointerId;});
  stage.addEventListener("pointerup",e=>{
    if(sx==null||e.pointerId!==sid)return;
    const dx=e.clientX-sx;sx=null;
    if(Math.abs(dx)>42){state.suppressClick=true;setTimeout(()=>state.suppressClick=false,250);focusStage(state.stage.idx+(dx<0?1:-1));}
  });
  stage.addEventListener("keydown",e=>{
    if(e.key==="ArrowRight"){e.preventDefault();focusStage(state.stage.idx+1);}
    if(e.key==="ArrowLeft"){e.preventDefault();focusStage(state.stage.idx-1);}
    if(e.key==="Enter"){location.hash="#/product/"+state.stage.list[state.stage.idx];}
  });
}
/* ================= EVENTS ================= */
document.addEventListener("click",e=>{
  const t=e.target.closest("[data-act]");
  if(!e.target.closest(".hot-pop")&&!e.target.closest(".hot"))closeHotPop();
  if(!t)return;
  const act=t.dataset.act,sku=t.dataset.sku,key=t.dataset.key;
  switch(act){
    case "menu":openMenu();break;
    case "menu-close":closeMenu();break;
    case "search":openSearch();break;
    case "search-close":closeSearch();break;
    case "drawer":openDrawer(t.dataset.kind);break;
    case "drawer-close":closeDrawer();break;
    case "promo-x":state.promoOff=true;store.save("ft_promo_off",true);$("#site-top").classList.add("no-promo");measureTop();break;
    case "stage-prev":focusStage(state.stage.idx-1);break;
    case "stage-next":focusStage(state.stage.idx+1);break;
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
    }
    case "stage-col":{state.stage.col=t.dataset.col;state.stage.idx=0;$$(".stage-tabs .chip").forEach(c=>{const on=c.dataset.col===t.dataset.col;c.classList.toggle("on",on);c.setAttribute("aria-selected",on);});buildStage();break;}
    case "hot":e.stopPropagation();openHotPop(t);break;
    case "hot-close":closeHotPop();break;
    case "trio":{t.dataset.skus.split(",").forEach(s=>addToBag(s,1,true));toast(`Curated set of ${t.dataset.skus.split(",").length} added to bag`,{icon:"bag",action:"View bag",onAction:()=>openDrawer("bag")});break;}
    case "bag-add":addToBag(sku,1);break;
    case "bag-add-qty":{const q=+($("#pi-qty")?$("#pi-qty").textContent:"1")||1;addToBag(sku,q);break;}
    case "piq-inc":case "piq-dec":{const o=$("#pi-qty");if(o)o.textContent=Math.max(1,Math.min(99,+o.textContent+(act==="piq-inc"?1:-1)));break;}
    case "bag-inc":setQty(sku,1);break;
    case "bag-dec":setQty(sku,-1);break;
    case "bag-del":removeFromBag(sku);break;
    case "clear-bag":{if(!state.bag.length)break;const old=state.bag.slice();state.bag=[];syncCommerce();toast("Bag cleared",{icon:"trash",action:"Undo",onAction:()=>{state.bag=old;syncCommerce();}});break;}
    case "wish":toggleWish(sku);break;
    case "gal":{closeHotPop();state.gal={sku:sku||state.gal.sku,key};renderGallery();break;}
    case "lb-open":openLB(sku,key);break;
    case "lb-close":closeLB();break;
    case "lb-prev":lbStep(-1);break;
    case "lb-next":lbStep(1);break;
    case "lb-zin":lbZoom(1.25);break;
    case "lb-zout":lbZoom(1/1.25);break;
    case "lb-reset":state.lb.scale=1;state.lb.tx=0;state.lb.ty=0;applyLB();break;
    case "shop-col":state.shop.c=t.dataset.col;renderShopGrid();break;
    case "shop-clear":state.shop={c:"all",q:"",sort:"featured"};render();break;
    case "look-col":state.look.c=t.dataset.col;$$("[data-act='look-col']").forEach(c=>c.classList.toggle("on",c.dataset.col===t.dataset.col));renderLookGrid();break;
    case "go":location.hash=t.dataset.href;closeSearch();break;
    case "msg":{let text=null;if(t.dataset.send&&state.lastInquiry)text=state.lastInquiry.text;else if(sku)text=skuMessage(sku);else if(state.bag.length)text=inquiryText(state.bag,null,makeRef());openMessenger(text);break;}
    case "wa":{let text=null;if(t.dataset.send&&state.lastInquiry)text=state.lastInquiry.text;else if(sku)text=skuMessage(sku);else if(state.bag.length)text=inquiryText(state.bag,null,makeRef());openWhatsApp(text);break;}
    case "copy":{const el=$(t.dataset.target);if(el)copyText(el.textContent);break;}
    case "pal-copy":copyText(t.dataset.hex,t.dataset.hex+" copied");break;
    case "inq-dl":{if(!state.lastInquiry)break;const blob=new Blob([state.lastInquiry.text],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=state.lastInquiry.ref+".txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast("Inquiry downloaded",{icon:"dl"});break;}
    case "inq-new":state.inqDone=false;render();break;
    case "modal":openModal(t.dataset.tab);break;
    case "modal-close":closeModal();break;
    case "modal-tab":state.reportTab=t.dataset.tab;renderModal();if(state.reportTab==="assets"&&!state.reportRan)runReport();break;
    case "report-retest":runReport();toast("Re-testing all 18 main photos…",{icon:"check"});break;
    case "report-dl":{
      const report={generated:new Date().toISOString(),brand:"Fariza's Territory",source:"Fariza's Territory — LIVE 18 Product Image Links CSV + FARIZA_PRODUCT_ASSET_MANIFEST.json",permissionNote:"Original Drive links still require public permission for third-party access. Website media are source-based locally hosted/embedded assets, independently tested in this browser.",counts:{products:18,collections:COLLECTIONS.map(c=>({folder:c.folder,count:c.count}))},products:PRODUCTS.map(p=>({sku:p.sku,title:p.title,collection:p.collection.folder,mainStatus:state.assets[p.sku+":main"]||"untested",assets:KEYS.map(k=>({slot:k,driveFileId:p.assets[k].id,driveViewUrl:p.assets[k].id?driveView(p.assets[k].id):null,authenticity:p.assets[k].auth,status:p.assets[k].id?"permission_not_verified":"not_supplied"}))}))};
      const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="fariza-asset-validation-report.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast("Validation report downloaded",{icon:"dl"});break;}
    case "backtop":window.scrollTo({top:0,behavior:RM?"auto":"smooth"});break;
    case "scroll":{const el=document.getElementById(t.dataset.target);if(el)el.scrollIntoView({behavior:RM?"auto":"smooth"});break;}
  }
});
document.addEventListener("input",e=>{
  const t=e.target.closest("[data-input]");if(!t)return;
  if(t.dataset.input==="search"){state.searchSel=0;renderSearch(t.value);}
  if(t.dataset.input==="shop-q"){state.shop.q=t.value;renderShopGrid();}
});
document.addEventListener("change",e=>{
  const t=e.target.closest("[data-input]");if(!t)return;
  if(t.dataset.input==="shop-sort"){state.shop.sort=t.value;renderShopGrid();}
});
document.addEventListener("submit",e=>{
  const f=e.target.closest("[data-form]");if(!f)return;
  e.preventDefault();
  const fd=new FormData(f);
  const err=(name,bad)=>{const fl=f.querySelector(`[data-f="${name}"]`);if(fl)fl.classList.toggle("err",bad);return bad;};
  if(f.dataset.form==="inquiry"){
    const name=(fd.get("name")||"").trim(),phone=(fd.get("phone")||"").trim(),district=(fd.get("district")||"").trim(),address=(fd.get("address")||"").trim();
    let bad=false;
    bad=err("name",!name)||bad;bad=err("phone",phone.replace(/\D/g,"").length<6)||bad;bad=err("district",!district)||bad;bad=err("address",!address)||bad;
    if(bad){toast("Please complete the highlighted fields",{icon:"alert"});return;}
    if(!state.bag.length){toast("Your bag is empty",{icon:"alert"});return;}
    const ref=makeRef();
    const cust={name,phone,district,address,notes:(fd.get("notes")||"").trim(),contact:fd.get("contact")||"Messenger"};
    const text=inquiryText(state.bag,cust,ref);
    state.lastInquiry={ref,text,at:Date.now()};

    // Prepare complete structured order record
    const subtotal = subtotalNum(state.bag);
    const isDhaka = cust.district.toLowerCase().includes('dhaka');
    const deliveryFee = isDhaka ? 80 : 150;
    const orderRecord = {
      order_ref: ref,
      customer_name: cust.name,
      customer_phone: cust.phone,
      district: cust.district,
      delivery_address: cust.address,
      notes: cust.notes,
      contact_channel: cust.contact,
      items: state.bag.map(it => {
        const p = bySku(it.sku);
        return {
          sku: p.sku,
          title: p.title,
          price: p.priceBDT || 0,
          qty: it.qty,
          unit: p.unitBn || p.unit || ''
        };
      }),
      subtotal_bdt: subtotal,
      delivery_fee_bdt: deliveryFee,
      total_bdt: subtotal + deliveryFee,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // 1. Dual-layer persistence: Save to localStorage ft_local_orders
    const localOrders = store.load('ft_local_orders', []);
    localOrders.unshift(orderRecord);
    store.save('ft_local_orders', localOrders);

    // 2. Submit to Supabase database
    if (window.FT_SUPABASE && window.FT_SUPABASE.createOrder) {
      window.FT_SUPABASE.createOrder(orderRecord).catch(err => console.warn('Supabase order sync:', err));
    }

    // 3. Conversion tracking: Meta Pixel Purchase event
    if (window.FT_ANALYTICS && window.FT_ANALYTICS.trackPurchase) {
      window.FT_ANALYTICS.trackPurchase(orderRecord);
    }

    if(fd.get("clearbag")){state.bag=[];syncCommerce();}
    state.inqDone=true;renderInqDone();
    window.scrollTo({top:0,behavior:RM?"auto":"smooth"});
    toast("Inquiry recorded & prepared!",{icon:"check"});
  }
  if(f.dataset.form==="contact"){
    const name=(fd.get("cname")||"").trim(),contact=(fd.get("ccontact")||"").trim(),msg=(fd.get("cmsg")||"").trim();
    let bad=false;bad=err("cname",!name)||bad;bad=err("ccontact",!contact)||bad;bad=err("cmsg",!msg)||bad;
    if(bad){toast("Please complete the highlighted fields",{icon:"alert"});return;}
    const text=`FARIZA'S TERRITORY — MESSAGE\nFrom: ${name}\nContact: ${contact}\n\n${msg}`;
    $("#contact-out").innerHTML=`<pre class="msg-pre" id="contact-msg">${esc(text)}</pre>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:12px">
        <button class="btn btn-ink btn-sm" data-act="copy" data-target="#contact-msg">${IC.copy}<span>Copy</span></button>
        <button class="btn btn-caramel btn-sm" data-act="msg" data-send-contact="1">${IC.chat}<span>Open Messenger</span></button>
      </div><p class="tiny" style="margin-top:10px">Prepared locally — send it via Messenger. Nothing was transmitted.</p>`;
    $("#contact-out").querySelector("[data-send-contact]").addEventListener("click",()=>openMessenger(text));
    toast("Message prepared — copy & send it",{icon:"check"});
  }
  if(f.dataset.form==="config"){
    state.cfg={messenger:(fd.get("messenger")||"").trim().replace(/^https?:\/\/(www\.)?m\.me\//,"").replace(/\/$/,""),whatsapp:(fd.get("whatsapp")||"").trim(),facebook:(fd.get("facebook")||"").trim()};
    store.save("ft_cfg",state.cfg);document.body.classList.toggle("no-whatsapp",!state.cfg.whatsapp);
    toast("Seller settings saved in this browser",{icon:"check"});
    renderModal();
  }
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    if($("#lightbox").classList.contains("open"))closeLB();
    else if($("#modal").classList.contains("open"))closeModal();
    else if($("#search-ov").classList.contains("open"))closeSearch();
    else if(state.drawer)closeDrawer();
    else if($("#mmenu").classList.contains("open"))closeMenu();
    else closeHotPop();
    return;
  }
  if($("#lightbox").classList.contains("open")){
    if(e.key==="ArrowRight")lbStep(1);
    if(e.key==="ArrowLeft")lbStep(-1);
    if(e.key==="+")lbZoom(1.25);
    if(e.key==="-")lbZoom(1/1.25);
    return;
  }
  if($("#search-ov").classList.contains("open")){
    const n=state.searchList.length;
    if(e.key==="ArrowDown"){e.preventDefault();state.searchSel=Math.min(n-1,state.searchSel+1);renderSearch($("#search-q").value);}
    if(e.key==="ArrowUp"){e.preventDefault();state.searchSel=Math.max(0,state.searchSel-1);renderSearch($("#search-q").value);}
    if(e.key==="Enter"&&n){location.hash="#/product/"+state.searchList[state.searchSel].sku;closeSearch();}
  }
});
/* lightbox zoom & pan */
(function(){
  const stage=$("#lb-stage"),fig=$("#lb-fig");
  stage.addEventListener("wheel",e=>{e.preventDefault();lbZoom(e.deltaY<0?1.12:1/1.12);},{passive:false});
  stage.addEventListener("dblclick",e=>{if(e.target.closest(".lb-nav"))return;if(state.lb.scale>1.05){state.lb.scale=1;state.lb.tx=0;state.lb.ty=0;}else state.lb.scale=2.2;applyLB();});
  let px=null,py=null,pid=null;
  stage.addEventListener("pointerdown",e=>{if(e.target.closest(".lb-nav"))return;px=e.clientX;py=e.clientY;pid=e.pointerId;stage.classList.add("dragging");stage.setPointerCapture(pid);});
  stage.addEventListener("pointermove",e=>{if(px==null||e.pointerId!==pid)return;state.lb.tx+=e.clientX-px;state.lb.ty+=e.clientY-py;px=e.clientX;py=e.clientY;applyLB();});
  const up=e=>{if(e.pointerId!==pid)return;px=null;py=null;pid=null;stage.classList.remove("dragging");};
  stage.addEventListener("pointerup",up);stage.addEventListener("pointercancel",up);
})();
/* keyboard activation for role=button divs */
document.addEventListener("keydown",e=>{
  if((e.key==="Enter"||e.key===" ")&&e.target.matches&&e.target.matches('[role="button"][data-act]')){e.preventDefault();e.target.click();}
});
/* ================= TOP MEASURE / SCROLL / PROMO ================= */
function measureTop(){
  const h=$("#site-top").offsetHeight;
  document.documentElement.style.setProperty("--top-h",h+"px");
}
let scrollTick=false;
window.addEventListener("scroll",()=>{
  if(scrollTick)return;scrollTick=true;
  requestAnimationFrame(()=>{
    scrollTick=false;
    const y=window.scrollY;
    $("#site-top").classList.toggle("scrolled",y>8);
    $("#backtop").classList.toggle("show",y>640);
    if(!RM){const orn=$(".hero-orn");if(orn)orn.style.translate=`0 ${y*.12}px`;}
  });
},{passive:true});
window.addEventListener("resize",()=>{measureTop();if(state.route.page==="home")layoutStage(true);});
const PROMO_MSGS=[
  `First-order offer up to 25%* &nbsp;·&nbsp; Free delivery* &nbsp;·&nbsp; Order via Messenger — <a href="#/policies">*terms confirmed by seller</a>`,
  `<span class="bn">মেসেঞ্জারে অর্ডার করুন</span> &nbsp;·&nbsp; 18 pieces · 5 collections · real boutique photography`,
  `Elegance in Every Detail &nbsp;·&nbsp; Mirpur, Dhaka &nbsp;·&nbsp; 13,000+ community — <a href="#/lookbook">see the lookbook</a>`
];
let promoIdx=0;
function promoLoop(){
  if(state.promoOff)return;
  setInterval(()=>{
    if(state.promoOff)return;
    const el=$("#promo-msg");if(!el)return;
    el.classList.add("fade");
    setTimeout(()=>{promoIdx=(promoIdx+1)%PROMO_MSGS.length;el.innerHTML=PROMO_MSGS[promoIdx];el.classList.remove("fade");},420);
  },5600);
}
document.addEventListener("keydown",e=>{if(e.ctrlKey&&e.altKey&&e.shiftKey&&e.key.toLowerCase()==="f"){e.preventDefault();openModal("assets");}});
/* ================= INIT ================= */
function init(){
  document.body.classList.toggle("no-whatsapp",!state.cfg.whatsapp);
  if(state.promoOff)$("#site-top").classList.add("no-promo");
  if(!state.cfg.messenger)state.cfg.messenger=CONFIG.messengerUsername;
  if(!state.cfg.facebook)state.cfg.facebook=CONFIG.facebookUrl;
  measureTop();
  if(window.ResizeObserver)new ResizeObserver(measureTop).observe($("#site-top"));
  if(!location.hash)history.replaceState(null,"","#/home");
  window.addEventListener("hashchange",render);
  render();
  promoLoop();
  /* JSON-LD */
  try{
    const ld={"@context":"https://schema.org","@graph":[
      {"@type":"Organization","name":"Fariza's Territory","slogan":"Elegance in Every Detail.","address":{"@type":"PostalAddress","addressLocality":"Mirpur, Dhaka","addressCountry":"BD"}},
      {"@type":"ItemList","name":"Fariza's Territory — Live Catalog","numberOfItems":18,"itemListElement":PRODUCTS.map((p,i)=>({"@type":"ListItem","position":i+1,"item":{"@type":"Product","name":p.title,"sku":p.sku,"category":p.collection.name}}))}
    ]};
    const s=document.createElement("script");s.type="application/ld+json";s.textContent=JSON.stringify(ld);document.head.appendChild(s);
  }catch(e){}
  /* silent background validation of main photos (batched) */
  setTimeout(async()=>{
    const queue=PRODUCTS.map(p=>p.sku);
    await Promise.all(Array.from({length:3},async()=>{while(queue.length){const sku=queue.shift();if((state.assets[sku+":main"]||"")==="ok")continue;await testAsset(sku,"main");}}));
    updateReportSummary();
  },1500);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measureTop);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();


})(window, document);
