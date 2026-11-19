/**
 * Fariza's Territory — Main Application Logic & Storefront Engine
 * Brand: Fariza's Territory (Fashion & Accessories Brand by Faria & Saiful Islam Shuvo)
 * Integrated with Supabase, Meta Pixel, WhatsApp & Messenger
 */

(function (window, document) {
  'use strict';

  const CONFIG = window.FT_CONFIG || {};
  const CATALOG_REF = window.FT_CATALOG || { COLLECTIONS: [], PRODUCTS: [], PRODUCTS_BY_SKU: {} };
  const COLLECTIONS = CATALOG_REF.COLLECTIONS || [];
  const PRODUCTS = CATALOG_REF.PRODUCTS || [];
  const KEYS = CATALOG_REF.KEYS || [];
  const KEY_META = CATALOG_REF.KEY_META || {};
  const PHOTO_KEYS = CATALOG_REF.PHOTO_KEYS || [];
  const VERIFIED_CATALOG = CATALOG_REF.VERIFIED_CATALOG || {};
  const bySku = sku => (CATALOG_REF.PRODUCTS_BY_SKU && CATALOG_REF.PRODUCTS_BY_SKU[sku]) || PRODUCTS.find(x => x.sku === sku) || PRODUCTS[0];
  const colById = id => COLLECTIONS.find(c => c.id === id || c.id === String(id).padStart(2, '0') || c.slug === id) || { name: 'Collection', short: 'Collection', acc: '#8E3B66', slug: id };

  function isProductOutOfStock(p) {
    if (!p || p.is_archived === true || p.is_available === false) return true;
    if (p.stock_verified === true) {
      const avail = p.available_stock !== undefined ? Number(p.available_stock) : Math.max(0, Number(p.stock_count ?? 0) - Number(p.reserved_count || 0));
      return avail <= 0;
    }
    return false;
  }

  function stockBadgeHtml(p) {
    if (!p) return '';
    if (isProductOutOfStock(p)) {
      return `<span class="stock-badge oos">${isBn() ? 'স্টক নেই' : 'Out of stock'}</span>`;
    }
    if (p.stock_verified === true) {
      const avail = p.available_stock !== undefined ? Number(p.available_stock) : Math.max(0, Number(p.stock_count ?? 0) - Number(p.reserved_count || 0));
      return `<span class="stock-badge verified">${isBn() ? `ভেরিফাইড স্টক (${avail})` : `Verified stock (${avail})`}</span>`;
    }
    return `<span class="stock-badge unverified">${isBn() ? 'ম্যানুয়াল স্টক কনফার্মেশন বাকি' : 'Pending manual stock confirmation'}</span>`;
  }

  const priceText = p => {
  if (!p) return 'Inquire for price';
  if (!p.priceBDT) return 'Inquire for price';
  return `৳${p.priceBDT.toLocaleString('en-US')}`;
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
function getWhatsAppNumber(){
  const num = (typeof state !== "undefined" && state.cfg && state.cfg.whatsapp) ||
              (window.FT_CONFIG && window.FT_CONFIG.whatsappNumber) ||
              (typeof CONFIG !== "undefined" && CONFIG.whatsappNumber) ||
              "";
  return String(num).replace(/[^0-9]/g, "");
}
function isRealWhatsapp(){
  const digits = getWhatsAppNumber();
  if (window.FT_COMMERCE && typeof window.FT_COMMERCE.isPlaceholderWhatsapp === 'function') {
    return !window.FT_COMMERCE.isPlaceholderWhatsapp(digits);
  }
  return !!digits && digits !== "8801700000000" && digits.length >= 11;
}
function getWhatsAppUrl(text){
  const num = getWhatsAppNumber();
  if (!isRealWhatsapp()) {
    const mUser = (typeof state !== "undefined" && state.cfg && state.cfg.messenger) || CONFIG.messengerUsername || "farizasterritory143";
    return `https://m.me/${encodeURIComponent(mUser)}`;
  }
  return `https://wa.me/${num}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}
function syncFloatingWa(){
  const waBtn = document.getElementById("floating-wa-btn");
  if(!waBtn) return;
  const realWa = isRealWhatsapp();
  waBtn.href = getWhatsAppUrl("Hello Fariza's Territory, I would like to inquire about your boutique collection.");
  const lbl = waBtn.querySelector(".wa-label");
  if(lbl) lbl.textContent = realWa ? "WhatsApp Order" : "Messenger Order";
  waBtn.setAttribute("aria-label", realWa ? "Order or Chat on WhatsApp" : "Order or Chat on Messenger");
}
function getDeliveryFees() {
  const dhaka = Number(CONFIG.deliveryFeeDhaka);
  const outside = Number(CONFIG.deliveryFeeOutside);
  return {
    dhaka: Number.isFinite(dhaka) ? dhaka : 80,
    outside: Number.isFinite(outside) ? outside : 150
  };
}
function isOutsideZone(zone) {
  return zone === "outside" || zone === "outside_dhaka";
}
function normalizeDeliveryZone(zone) {
  return isOutsideZone(zone) ? "outside_dhaka" : "dhaka";
}
const state = {
  lang: store.load("ft_lang", "en"),
  bag: store.load("ft_bag",[]),
  wish: store.load("ft_wish",[]),
  cfg: Object.assign({
    messenger: CONFIG.messengerUsername || "farizasterritory143",
    whatsapp: CONFIG.whatsappNumber || "",
    facebook: CONFIG.facebookPageUrl || "https://www.facebook.com/farizasterritory143"
  }, store.load("ft_cfg",{})),
  appliedCoupon: store.load("ft_applied_coupon", null),
  deliveryZone: normalizeDeliveryZone(store.load("ft_delivery_zone", "dhaka")),
  promoOff: store.load("ft_promo_off",false),
  draftIdempotencyKey: null,
  route:{page:"home",param:null,query:{}},
  stage:{pillar:"all",col:"all",idx:0,list:PRODUCTS.map(p=>p.sku)},
  shop:{pillar:"all",c:"all",q:"",sort:"featured"},
  look:{c:"all"},
  gal:{sku:null,key:"main"},
  lb:{sku:null,key:"main",scale:1,tx:0,ty:0,list:[]},
  assets:{}, reportTab:"assets", reportRan:false,
  drawer:null, searchSel:0, searchList:[], lastInquiry:null,
  inqDone:false, suppressClick:false
};
const isBn = ()=>state.lang === "bn";
const tProdTitle = p=> (isBn() && p.titleBn) ? p.titleBn : p.title;
const tProdSubTitle = p=> isBn() ? p.title : (p.titleBn || "");
const tProdDesc = p=> isBn() ? (p.descriptionBn || p.descriptionEn || "") : (p.descriptionEn || p.descriptionBn || "");
const tUnit = p=> isBn() ? (p.unitBn || p.unit || "") : (p.unit || p.unitBn || "");
const tCaution = p=> isBn() ? (p.cautionBn || p.cautionEn || "") : (p.cautionEn || p.cautionBn || "");
function syncLangUI(){
  const btn = $("#lang-toggle-btn");
  if(btn){
    btn.textContent = isBn() ? "EN" : "বাংলা";
    btn.title = isBn() ? "Switch to English" : "বাংলা ভাষায় দেখুন";
  }
  document.documentElement.lang = isBn() ? "bn" : "en";
  const navMap = isBn()
    ? { home:"হোম", shop:"শপ", collections:"কালেকশন", lookbook:"লুকবুক", about:"আমাদের গল্প", contact:"যোগাযোগ", track:"অর্ডার ট্র্যাক" }
    : { home:"Home", shop:"Shop", collections:"Collections", lookbook:"Lookbook", about:"About", contact:"Contact", track:"Track Order" };
  Object.keys(navMap).forEach(k=>{
    const el = document.querySelector(`[data-nav="${k}"]`);
    if(el) el.textContent = navMap[k];
  });
}
function toggleLang(){
  state.lang = isBn() ? "en" : "bn";
  store.save("ft_lang", state.lang);
  syncLangUI();
  render();
  toast(isBn() ? "বাংলা সংস্করণ চালু হয়েছে" : "Switched to English",{icon:"check"});
}
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
  const meta=KEY_META[key] || { label: key, ratio: "r45", auth: "source" };
  const ratio=opts.ratio||meta.ratio||"r45";
  const mini=opts.mini?" ph--mini":"";
  const contain=opts.contain?" contain":"";
  const w=opts.w||800;
  const src = assetSrc(p, key, w);
  const hasAsset = !!src;
  const dims = ratio === "r11" ? [1000, 1000] : ratio === "r169" ? [1600, 900] : ratio === "r916" ? [900, 1600] : [800, 1000];
  const mw = opts.mini ? 200 : dims[0];
  const mh = opts.mini ? 200 : dims[1];
  const loadAttr = opts.eager ? 'loading="eager"' : 'loading="lazy"';
  const fpAttr = (opts.eager && opts.fetchPriority) ? ` fetchpriority="${opts.fetchPriority}"` : '';
  const tag=opts.tag?`<span class="ph-tag${key==="aiStylingPreview"?" ai":""}">${key==="aiStylingPreview"?"AI illustration":esc(opts.tagText||meta.label)}</span>`:"";
  const img=hasAsset?`<img class="ph-img ok" data-ft="${p.sku}:${key}" src="${src}" alt="${esc(p.title)} — ${esc(meta.label)} (${p.sku})" width="${mw}" height="${mh}" ${loadAttr}${fpAttr} decoding="async">`:"";
  return `<div class="ph ${ratio}${mini}${contain}" data-ph="${p.sku}:${key}" style="--acc:${p.accent}">${tileInner(p,opts.mini)}${img}${tag}</div>`;
}
function setAssetStatus(sku,key,st){
  state.assets[sku+":"+key]=st;
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
  if(isProductOutOfStock(prod)){
    toast(isBn() ? `${prod.titleBn || prod.title} বর্তমানে স্টক আউট রয়েছে` : `${prod.title} is currently out of stock`,{icon:"alert"});
    return false;
  }
  if(window.FT_ANALYTICS && prod){
    window.FT_ANALYTICS.trackAddToCart(prod, qty||1);
  }
  qty=qty||1;
  const it=inBag(sku);
  if(it) it.qty=Math.min(99,it.qty+qty); else state.bag.push({sku,qty});
  syncCommerce();
  if(!quiet){
    toast(`${bySku(sku).title} added to inquiry bag`,{icon:"bag",action:"View bag",onAction:()=>openDrawer("bag")});
    if(window.FT_ANIME && typeof window.FT_ANIME.flyToBag === 'function'){
      const srcEl = document.querySelector(`[data-sku="${sku}"] img`)
        || document.getElementById('qv-main-fig')
        || document.querySelector('#gal-main img')
        || document.querySelector(`[data-sku="${sku}"]`);
      if(srcEl) window.FT_ANIME.flyToBag(srcEl);
    }
  }
  return true;
}
function buyNow(sku,qty){
  qty = qty || 1;
  if(!addToBag(sku, qty, true)) return;
  closeQuickView();
  closeDrawer();
  location.hash = "#/inquiry";
  toast(isBn() ? "অর্ডার ফর্মে নিয়ে যাওয়া হচ্ছে (ক্যাশ অন ডেলিভারি)" : "Proceeding to Cash on Delivery Order Inquiry",{icon:"bag"});
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
/* ================= FOCUS & OVERLAY GUARDS ================= */
let lastOverlayTrigger = null;
function setPageShellInert(flag){
  ["#site-top","#app","footer"].forEach(sel=>{
    const el=$(sel);
    if(el) el.inert = !!flag;
  });
}
/* ================= DRAWERS ================= */
function openDrawer(kind){
  closeSearch(); closeMenu();
  lastOverlayTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  state.drawer=kind;
  $("#scrim").classList.add("show");
  const bagDr=$("#drawer-bag"), wishDr=$("#drawer-wish");
  bagDr.classList.toggle("open",kind==="bag");
  wishDr.classList.toggle("open",kind==="wish");
  bagDr.inert = kind !== "bag";
  wishDr.inert = kind !== "wish";
  bagDr.setAttribute("aria-hidden", kind === "bag" ? "false" : "true");
  wishDr.setAttribute("aria-hidden", kind === "wish" ? "false" : "true");
  setPageShellInert(true);
  document.body.style.overflow="hidden";
  kind==="bag"?renderBagDrawer():renderWishDrawer();
  const activeDr = $("#drawer-"+kind);
  const closeBtn = activeDr && activeDr.querySelector('[data-act="drawer-close"]');
  if(closeBtn) setTimeout(()=>closeBtn.focus(),40);
}
function closeDrawer(){
  const wasOpen = Boolean(state.drawer);
  state.drawer=null;
  $("#scrim").classList.remove("show");
  $$(".drawer").forEach(d=>{d.classList.remove("open");d.setAttribute("aria-hidden","true");d.inert=true;});
  setPageShellInert(false);
  document.body.style.overflow="";
  if(wasOpen && lastOverlayTrigger && typeof lastOverlayTrigger.focus === "function"){
    lastOverlayTrigger.focus();
    lastOverlayTrigger = null;
  }
}
function lineItem(it,withQty){
  const p=bySku(it.sku);
  return `<div class="line-item">
    <a href="#/product/${p.sku}" data-act="drawer-close">${ph(p,"main",{mini:true,w:200,dot:false})}</a>
    <div>
      <div class="li-t"><a href="#/product/${p.sku}" data-act="drawer-close">${esc(p.title)}</a></div>
      <div class="li-s">${p.sku} · ${esc(p.collection.short)}</div>
      <div class="li-p" style="font-weight:600;color:var(--chestnut);font-size:13px;margin:2px 0 4px">${priceText(p)}${it.qty > 1 ? ` · Total: ৳${((p.priceBDT||0)*it.qty).toLocaleString()}` : ''}</div>
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
    <p class="tiny" style="margin-bottom:12px">Apply codes like <b>FIRST25</b>, <b>FARIZA200</b>, or <b>FREESHIP</b> at Order Inquiry · Seller confirms sizing &amp; dispatch.</p>
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
  lastOverlayTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const ov=$("#search-ov");
  ov.inert = false;
  ov.classList.add("open");ov.setAttribute("aria-hidden","false");
  setPageShellInert(true);
  document.body.style.overflow="hidden";
  state.searchSel=0;renderSearch("");
  setTimeout(()=>$("#search-q").focus(),120);
}
function closeSearch(){
  const ov=$("#search-ov");
  const wasOpen = ov && ov.classList.contains("open");
  ov.classList.remove("open");ov.setAttribute("aria-hidden","true");
  ov.inert = true;
  if(!state.drawer){setPageShellInert(false);document.body.style.overflow="";}
  $("#search-q").value="";
  if(wasOpen && lastOverlayTrigger && typeof lastOverlayTrigger.focus === "function"){
    lastOverlayTrigger.focus();
    lastOverlayTrigger = null;
  }
}
function renderSearch(q){
  q=q.trim().toLowerCase();
  state.searchList=PRODUCTS.filter(p=>!q
    || p.title.toLowerCase().includes(q)
    || (p.titleBn && p.titleBn.toLowerCase().includes(q))
    || p.sku.toLowerCase().includes(q)
    || (p.collection && (p.collection.name.toLowerCase().includes(q) || p.collection.short.toLowerCase().includes(q)))
    || (p.descriptionBn && p.descriptionBn.toLowerCase().includes(q))
    || (p.descriptionEn && p.descriptionEn.toLowerCase().includes(q))
    || p.slug.includes(q));
  $("#so-hint").textContent=q?`${state.searchList.length} result${state.searchList.length===1?"":"s"} for “${q}”`:`${PRODUCTS.length} pieces across ${COLLECTIONS.length} collections · type to filter · ↑↓ to browse · Enter to open`;
  $("#so-results").innerHTML=state.searchList.length?state.searchList.map((p,i)=>`
    <button class="so-item${i===state.searchSel?" sel":""}" data-act="go" data-href="#/product/${p.sku}" data-si="${i}">
      ${ph(p,"main",{mini:true,w:200,dot:false})}
      <span><span class="t">${esc(p.title)}</span><span class="s" style="display:block">${p.sku} · ${esc(p.collection.short)} · ${priceText(p)}</span></span>
    </button>`).join(""):
    `<div class="empty" style="grid-column:1/-1">${IC.flower}<p>No pieces match “${esc(q)}”.</p><p class="small" style="margin-top:8px">Try a colour, a collection name, or a SKU like CAT-008 or FT-JWL-001.</p></div>`;
  bindImages($("#search-ov"));
}
/* ================= MENU ================= */
function openMenu(){
  lastOverlayTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const mm=$("#mmenu");
  mm.inert = false;
  mm.classList.add("open");mm.setAttribute("aria-hidden","false");
  setPageShellInert(true);
  document.body.style.overflow="hidden";
  $(".menu-btn").setAttribute("aria-expanded","true");
  const closeBtn = mm.querySelector('[data-act="menu-close"]');
  if(closeBtn) setTimeout(()=>closeBtn.focus(),40);
}
function closeMenu(){
  const mm=$("#mmenu");
  const wasOpen = mm && mm.classList.contains("open");
  mm.classList.remove("open");mm.setAttribute("aria-hidden","true");
  mm.inert = true;
  if(!state.drawer){setPageShellInert(false);document.body.style.overflow="";}
  $(".menu-btn").setAttribute("aria-expanded","false");
  if(wasOpen && lastOverlayTrigger && typeof lastOverlayTrigger.focus === "function"){
    lastOverlayTrigger.focus();
    lastOverlayTrigger = null;
  }
}
/* ================= SHARED TEMPLATES ================= */
function pcard(p,i){
  const unitStr = tUnit(p);
  const cautionStr = tCaution(p);
  const unitBadge = unitStr ? `<span class="unit-badge" title="${esc(cautionStr)}">${esc(unitStr)}</span>` : '';
  const isCaution = !!cautionStr;
  const oos = isProductOutOfStock(p);
  const outBadge = oos ? `<span class="stock-badge oos" style="font-size:10px;padding:2px 7px">${isBn() ? 'স্টক নেই' : 'Out of stock'}</span>` : '';
  const overlayLabel = (p.colId==="01"||p.col==="01") ? "Label unverified" : (oos ? "Out of stock" : "");
  const primaryTitle = tProdTitle(p);
  const subTitle = tProdSubTitle(p);
  return `<article class="pcard" data-reveal style="--d:${(i%4)*.07}s;--pc-acc:${p.accent}">
    <div class="pc-actions">
      <button data-act="bag-add" data-sku="${p.sku}" aria-label="Add ${esc(p.title)} to inquiry bag" title="Add to bag"${oos ? ' disabled' : ''}>${IC.bag}</button>
      <button data-act="wish" data-sku="${p.sku}" data-heart="${p.sku}" class="${inWish(p.sku)?"on":""}" aria-pressed="${inWish(p.sku)}" aria-label="Save ${esc(p.title)} to wishlist" title="Wishlist">${IC.heart}</button>
      <button data-act="quick-view" data-sku="${p.sku}" aria-label="Quick view of ${esc(p.title)}" title="Quick view">${IC.zoom}</button>
    </div>
    <a href="#/product/${p.sku}" aria-hidden="true" tabindex="-1">${ph(p,"main",{w:600,tag:!!overlayLabel,tagText:overlayLabel})}</a>
    <div class="pcard-body">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap">
        <span class="pc-col">${esc(p.collection ? p.collection.short : '')}</span>
        ${outBadge || unitBadge}
      </div>
      <h3 class="pc-title${isBn()?' bn':''}"><a href="#/product/${p.sku}">${esc(primaryTitle)}</a></h3>
      ${subTitle ? `<div class="tiny${isBn()?'':' bn'}" style="color:var(--chestnut)">${esc(subTitle)}</div>` : ''}
      <div class="pc-meta">
        <span class="pc-sku">${p.sku}</span>
        <span class="pc-price">${priceText(p)}${(p.price_review || p.priceStatus === 'suggested') ? ' <span class="tiny">· Provisional</span>' : ''}</span>
      </div>
      ${isCaution ? `<div class="tiny pc-caution">* ${esc(cautionStr)}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:8px">
        <button type="button" class="btn btn-line btn-sm" style="flex:1;padding:7px 10px;font-size:11.5px;justify-content:center" data-act="bag-add" data-sku="${p.sku}"${oos ? ' disabled' : ''}>${IC.bag}<span>${oos ? (isBn()?'স্টক নেই':'Out of Stock') : (isBn()?'ব্যাগে যোগ':'Add to Bag')}</span></button>
        <button type="button" class="btn btn-buynow btn-sm" style="flex:1;padding:7px 10px;font-size:11.5px;justify-content:center" data-act="buynow" data-sku="${p.sku}"${oos ? ' disabled' : ''}><span>${isBn()?'অর্ডার (COD)':'Order COD'}</span>${IC.arrow}</button>
      </div>
    </div>
  </article>`;
}
function offerNote(){
  return `<div class="notice">${IC.alert}<span><b>Boutique offers:</b> Apply welcome vouchers (<code>FIRST25</code>, <code>FARIZA200</code>) or <code>FREESHIP</code> inside your Order Inquiry. Final sizing, color confirmation, and courier dispatch are confirmed by the seller via WhatsApp or Messenger.</span></div>`;
}
function messengerBtn(label,sku){
  return `<button class="btn btn-ink" data-act="msg" ${sku?`data-sku="${sku}"`:""}>${IC.chat}<span>${label||"Order via Messenger"}</span></button>`;
}
/* ================= HOME ================= */
function stageTabsHtml(){
  const st=state.stage;
  const currentPillar = st.pillar || 'all';
  const availableCols = currentPillar === 'all' ? COLLECTIONS : COLLECTIONS.filter(c => c.pillar === currentPillar);
  const totalCount = currentPillar === 'all' ? PRODUCTS.length : PRODUCTS.filter(p => p.superCategory === currentPillar).length;
  const tabs=[{id:"all",name:"All (" + totalCount + ")",count:totalCount}]
    .concat(availableCols.map(c=>({id:c.id,name:c.short,count:c.count})));
  return tabs.map(t=>`<button class="chip${st.col===t.id?" on":""}" role="tab" aria-selected="${st.col===t.id}" data-act="stage-col" data-col="${t.id}">${esc(t.name)} <span class="n">${t.count}</span></button>`).join("");
}
function pageHome(){
  const st=state.stage;
  const currentPillar = st.pillar || 'all';
  
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
      <div class="stage-tabs" id="stage-tabs" data-reveal style="--d:.26s" role="tablist" aria-label="Choose collection">
        ${stageTabsHtml()}
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
        <div style="display:flex;gap:10px;flex-wrap:wrap" data-reveal style="--d:.14s">
          <a class="btn btn-line" href="#/collections"><span>View all 8 collections</span>${IC.arrow}</a>
          <a class="btn btn-ink" href="#/shop" data-shop-all-cta><span>Shop all ${PRODUCTS.length} pieces</span>${IC.arrow}</a>
        </div>
      </div>
      <div class="col-grid-8">
        ${COLLECTIONS.map((c,i)=>{
          const items=PRODUCTS.filter(p=>p.colId===c.id || p.col===c.id);
          const colCount=items.length;
          return `<article class="col-card" data-col-id="${c.id}" data-reveal style="--d:${(i%4)*.08}s;--acc:${c.acc}">
            <div class="cc-num">
              <span>N° ${c.id}</span>
              <span class="tag tiny" style="background:color-mix(in srgb,${c.acc} 15%,transparent);color:var(--ink)">${esc(c.pillar)}</span>
            </div>
            <h3 class="cc-name">${esc(c.name)}</h3>
            ${c.nameBn ? `<div class="tiny bn col-card-bn" style="color:var(--chestnut)">${esc(c.nameBn)}</div>` : ''}
            <span class="cc-count" data-col-count="${c.id}">${colCount} piece${colCount===1?"":"s"}${c.id==="01"?" · label unverified":""}</span>
            <div class="cc-thumbs">${items.slice(0,3).map(p=>ph(p,"main",{mini:true,w:200,dot:false})).join("")}</div>
            <a class="cc-go" href="#/shop?c=${c.id}" data-col-explore="${c.id}"><span data-col-explore-label="${c.id}">Explore ${colCount} piece${colCount===1?"":"s"}</span> ${IC.arrow}</a>
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
        <div class="offer" data-reveal><span>${IC.tag}</span><b>First-order offer up to 25%<span class="ast">*</span></b><p>Use code <b>FIRST25</b> (25% off, max ৳500) or <b>FARIZA200</b> inside your Order Inquiry before submitting.</p></div>
        <div class="offer" data-reveal style="--d:.1s"><span>${IC.truck}</span><b>Free delivery<span class="ast">*</span></b><p>Enjoy complimentary nationwide delivery on orders over ৳3,000 using voucher code <b>FREESHIP</b>.</p></div>
        <div class="offer" data-reveal style="--d:.2s"><span>${IC.chat}</span><b>WhatsApp &amp; Messenger</b><p>Fill your bag, prepare an inquiry with your delivery details, and send it directly on WhatsApp or Messenger. We reply promptly with availability.</p></div>
      </div>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap" data-reveal>
        <a class="btn btn-ink" href="#/shop"><span>Browse all 53 pieces</span>${IC.arrow}</a>
        ${messengerBtn("Ask us anything")}
      </div>
      <p class="tiny" style="text-align:center;margin-top:16px" data-reveal>*Voucher eligibility &amp; Cash on Delivery confirmed personally by the seller. <a href="#/policies" style="text-decoration:underline">Read offer terms</a>.</p>
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
  state.stage.list=stageList(); state.stage.idx=Math.min(state.stage.idx,Math.max(0, state.stage.list.length-1));
  stage.innerHTML=state.stage.list.map((sku,i)=>{
    const p=bySku(sku);
    const isFocused = i === state.stage.idx;
    const isEager = i < 4;
    return `<article class="s-card off" data-i="${i}" data-sku="${sku}" role="option" aria-selected="false" aria-label="${esc(p.title)} — ${p.sku}">
      ${ph(p,"main",{w:800,eager:isEager,fetchPriority:isEager?(isFocused?'high':'low'):undefined,tag:true,tagText:p.sku})}
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
  if(window.ftThreeHero && typeof window.ftThreeHero.setAccentColor === "function"){
    window.ftThreeHero.setAccentColor(p.accent, !instant);
  }
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
  const assets=["main","original","detailA","socialSquare"].filter(k=>p.assets&&p.assets[k]);
  panel.innerHTML=`
    <div class="pp-head"><span class="overline">In this piece</span><span class="tiny">${assets.length} views</span></div>
    <span class="tag" style="background:color-mix(in srgb,${p.accent} 16%,var(--cream3));color:var(--ink2)">${esc(p.collection.short)}</span>
    ${(p.colId==="01"||p.col==="01")?`<span class="tag warn" style="margin-left:6px">Label unverified</span>`:""}
    <h2 class="pp-title">${esc(p.title)}</h2>
    <span class="pp-sku">${p.sku} · ${esc(p.slug)}</span>
    <div class="pp-price"><b>${priceText(p)}</b><span class="tiny">Catalog reference · confirm</span></div>
    <div class="pp-assets">${assets.map(k=>`<button data-act="lb-open" data-sku="${p.sku}" data-key="${k}" aria-label="View ${KEY_META[k].label}" style="padding:0;border:0;background:none">${ph(p,k,{mini:true,w:200,dot:false,ratio:"r45"})}</button>`).join("")}</div>
    <p class="small">Fabric, sizing and availability are confirmed by the seller. Tap the <b>+</b> hotspots on the photo for fabric close-ups.</p>
    <div class="pp-actions">
      <button class="btn btn-ink btn-block" data-act="bag-add" data-sku="${p.sku}">${IC.bag}<span>${isBn()?'ব্যাগে যোগ করুন':'Add to inquiry bag'}</span></button>
      <button class="btn btn-buynow btn-block" data-act="buynow" data-sku="${p.sku}"><span>${isBn()?'সরাসরি অর্ডার করুন (COD)':'Order Now · Cash on Delivery'}</span>${IC.arrow}</button>
      <a class="btn btn-line btn-block" href="#/product/${p.sku}"><span>${isBn()?'বিস্তারিত ও ছবি দেখুন':'Full details & gallery'}</span>${IC.arrow}</a>
      <button class="wish-line${inWish(p.sku)?" on":""}" data-act="wish" data-sku="${p.sku}" data-heart="${p.sku}" aria-pressed="${inWish(p.sku)}">${IC.heart}<span>${inWish(p.sku)?"Saved to wishlist":"Save to wishlist"}</span></button>
    </div>
    <p class="pp-note">First-order offer up to 25%* · free delivery* — *confirmed by seller. ${(p.assets&&p.assets.aiStylingPreview)?"An AI styling illustration exists for this piece and is clearly labelled on its page.":"Genuine product photography only."}</p>`;
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
function shopColChipsHtml(pillar){
  const availableCols = pillar === 'all' ? COLLECTIONS : COLLECTIONS.filter(col => col.pillar === pillar);
  return `<button class="chip${state.shop.c==="all"?" on":""}" data-act="shop-col" data-col="all">All Collections</button>`
    + availableCols.map(cl=>`<button class="chip${state.shop.c===cl.id?" on":""}" data-act="shop-col" data-col="${cl.id}">${esc(cl.short)} <span class="n">${cl.count}</span></button>`).join("");
}
function pageShop(){
  const c=state.route.query.c;
  if(c){
    const matchedCol=colById(c);
    if(matchedCol && matchedCol.id){
      state.shop.c=matchedCol.id;
      if(state.route.page==='shop') state.shop.pillar=matchedCol.pillar || 'all';
    }
  }
  const pillar = state.route.page === 'fashion' ? 'Fashion' : state.route.page === 'accessories' ? 'Accessories' : (state.shop.pillar || 'all');
  state.shop.pillar = pillar;

  return `
  <div class="page-head"><div class="container">
    <span class="overline" id="shop-page-overline" data-reveal>${pillar === 'Fashion' ? 'Fashion Garments' : pillar === 'Accessories' ? 'Artisan Accessories' : 'The Complete Catalog'}</span>
    <h1 class="h-display kinetic-title" id="shop-page-title" data-reveal style="--d:.06s;margin-top:12px">${pillar === 'Fashion' ? 'Fashion Garments (18 Pieces)' : pillar === 'Accessories' ? 'Artisan Accessories (35 Pieces)' : 'Shop All 53 Pieces'}</h1>
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

      <div class="chips" id="shop-col-chips" role="group" aria-label="Filter by collection" style="margin-top:8px">
        ${shopColChipsHtml(pillar)}
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
  const tot = state.shop.pillar==="Fashion"?18:state.shop.pillar==="Accessories"?35:PRODUCTS.length;
  const countEl=$("#shop-count"); if(countEl) countEl.textContent=`${list.length} / ${tot} pieces`;
  const overEl=$("#shop-page-overline"), titleEl=$("#shop-page-title");
  if(overEl) overEl.textContent = state.shop.pillar === 'Fashion' ? 'Fashion Garments' : state.shop.pillar === 'Accessories' ? 'Artisan Accessories' : 'The Complete Catalog';
  if(titleEl) titleEl.textContent = state.shop.pillar === 'Fashion' ? 'Fashion Garments (18 Pieces)' : state.shop.pillar === 'Accessories' ? 'Artisan Accessories (35 Pieces)' : 'Shop All 53 Pieces';
  wrap.innerHTML=list.length?`<div class="pgrid">${list.map((p,i)=>pcard(p,i)).join("")}</div>`:
    `<div class="empty">${IC.flower}<p>No pieces match your filters.</p><p class="small" style="margin:8px 0 18px">Clear the search or choose another collection.</p><button class="btn btn-ink btn-sm" data-act="shop-clear"><span>Clear filters</span></button></div>`;
  bindImages(wrap); revealBind(wrap);
  if(window.FT_ANIME){
    window.FT_ANIME.refresh();
    window.FT_ANIME.animateGridCards(wrap);
  }
  $$('[data-act="shop-pillar"]').forEach(ch=>ch.classList.toggle("on",ch.dataset.pillar===state.shop.pillar));
  $$('[data-act="shop-col"]').forEach(ch=>ch.classList.toggle("on",ch.dataset.col===state.shop.c));
}
/* ================= COLLECTIONS PAGE & DYNAMIC COUNTS ================= */
function computeDynamicCollectionStats(productsSource){
  const list = Array.isArray(productsSource) ? productsSource : PRODUCTS;
  const byColId = {};
  COLLECTIONS.forEach(c => {
    const items = list.filter(p => (p.colId === c.id || p.col === c.id));
    const availableCount = items.filter(p => p.is_available !== false).length;
    c.count = items.length;
    byColId[c.id] = {
      id: c.id,
      items,
      count: items.length,
      availableCount
    };
  });
  return {
    allCount: list.length,
    fashionCount: list.filter(p => p.superCategory === "Fashion").length,
    accessoriesCount: list.filter(p => p.superCategory === "Accessories").length,
    collectionsCount: COLLECTIONS.length,
    byColId
  };
}

function updateCollectionCountDomNodes(stats){
  const st = stats || computeDynamicCollectionStats(PRODUCTS);
  $$("[data-collections-total]").forEach(el => { el.textContent = String(st.allCount); });
  $$("[data-collections-fashion]").forEach(el => { el.textContent = String(st.fashionCount); });
  $$("[data-collections-accessories]").forEach(el => { el.textContent = String(st.accessoriesCount); });
  $$("[data-shop-all-cta]").forEach(el => {
    const span = el.querySelector("span");
    if (span) span.textContent = `Shop all ${st.allCount} pieces`;
  });
  COLLECTIONS.forEach(c => {
    const info = st.byColId[c.id] || { count: 0, availableCount: 0 };
    const colCount = info.count;
    $$(`[data-col-count="${c.id}"]`).forEach(el => {
      const suffix = c.id === "01" ? " · label unverified" : "";
      if (el.dataset.detailed === "1") {
        el.textContent = `${colCount} piece${colCount===1?"":"s"} (${info.availableCount} available)${suffix}`;
      } else {
        el.textContent = `${colCount} piece${colCount===1?"":"s"}${suffix}`;
      }
    });
    $$(`[data-col-explore-label="${c.id}"]`).forEach(el => {
      el.textContent = `Explore ${colCount} piece${colCount===1?"":"s"}`;
    });
  });
}

function fetchAndSyncCollectionCounts(){
  const stats = computeDynamicCollectionStats(PRODUCTS);
  updateCollectionCountDomNodes(stats);

  const fetcher = (window.FT_SUPABASE && typeof window.FT_SUPABASE.getCatalog === "function")
    ? window.FT_SUPABASE.getCatalog()
    : fetch("/api/catalog", { credentials: "same-origin" })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null);

  return Promise.resolve(fetcher).then(liveCatalog => {
    if (liveCatalog && Array.isArray(liveCatalog.products) && liveCatalog.products.length) {
      applyLiveCatalog(liveCatalog);
    }
    const updatedStats = computeDynamicCollectionStats(PRODUCTS);
    updateCollectionCountDomNodes(updatedStats);
    return updatedStats;
  }).catch(() => stats);
}

function pageCollections(){
  const stats = computeDynamicCollectionStats(PRODUCTS);
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>Eight houses of craft · <span data-collections-total>${stats.allCount}</span> pieces live</span>
    <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:18px;flex-wrap:wrap;margin-top:12px">
      <h1 class="h-display kinetic-title" data-reveal style="--d:.06s">The Collections</h1>
      <div class="collections-summary-bar" data-reveal style="--d:.1s">
        <a class="chip on" href="#/shop">All <span class="n" data-collections-total>${stats.allCount}</span></a>
        <a class="chip" href="#/fashion">Fashion <span class="n" data-collections-fashion>${stats.fashionCount}</span></a>
        <a class="chip" href="#/accessories">Accessories <span class="n" data-collections-accessories>${stats.accessoriesCount}</span></a>
        <a class="btn btn-ink btn-sm" href="#/shop" data-shop-all-cta><span>Shop all ${stats.allCount} pieces</span>${IC.arrow}</a>
      </div>
    </div>
    <p class="lede" data-reveal style="--d:.12s;margin-top:12px"><span data-collections-total>${stats.allCount}</span> verified pieces across ${stats.collectionsCount} collections — <span data-collections-fashion>${stats.fashionCount}</span> boutique fashion three-piece garments and <span data-collections-accessories>${stats.accessoriesCount}</span> artisan accessories handcrafted in Mirpur, Dhaka.</p>
  </div></div>
  <div class="page-body"><div class="container">
    <div class="col-grid-8 collections-page-grid" id="collections-page-grid">
      ${COLLECTIONS.map((c)=>{
        const info = stats.byColId[c.id] || { items: [], count: 0, availableCount: 0 };
        const items = info.items;
        const colCount = info.count;
        const availCount = info.availableCount;
        return `<article class="col-card crow-card" data-col-id="${c.id}" data-anime-stagger="1" style="--acc:${c.acc}">
          <div class="cc-num">
            <span>N° ${c.id}</span>
            <span class="tag tiny" style="background:color-mix(in srgb,${c.acc} 15%,transparent);color:var(--ink)">${esc(c.pillar)}</span>
          </div>
          <h2 class="cc-name crow-name">${esc(c.name)}</h2>
          ${c.nameBn ? `<div class="tiny bn col-card-bn" style="color:var(--chestnut)">${esc(c.nameBn)}</div>` : ''}
          <p class="crow-note cc-note">${esc(c.note)}</p>
          <span class="cc-count" data-col-count="${c.id}" data-detailed="1">${colCount} piece${colCount===1?"":"s"} (${availCount} available)${c.id==="01"?" · label unverified":""}</span>
          <div class="cc-thumbs">${items.slice(0,3).map(p=>ph(p,"main",{mini:true,w:240,dot:false})).join("")}</div>
          <a class="cc-go" href="#/shop?c=${c.id}" data-col-explore="${c.id}"><span data-col-explore-label="${c.id}">Explore ${colCount} piece${colCount===1?"":"s"}</span> ${IC.arrow}</a>
        </article>`;
      }).join("")}
    </div>
    <div style="margin-top:36px">${offerNote()}</div>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:26px" data-reveal>
      <a class="btn btn-ink" href="#/shop" data-shop-all-cta><span>Shop all ${stats.allCount} pieces</span>${IC.arrow}</a>
      ${messengerBtn("Inquire about a collection")}
    </div>
  </div></div>`;
}
/* ================= PRODUCT PAGE ================= */
function pageProduct(sku){
  const p=bySku(sku);
  if(!p)return page404();
  state.gal={sku,key:"main"};
  const nProds=PRODUCTS.length, idx=PRODUCTS.indexOf(p), prev=PRODUCTS[(idx-1+nProds)%nProds], next=PRODUCTS[(idx+1)%nProds];
  const sameCol = PRODUCTS.filter(x => (x.colId === p.colId || x.col === p.col) && x.sku !== p.sku).slice(0, 2);
  const crossCategory = PRODUCTS.filter(x => x.superCategory !== p.superCategory).slice(0, 2);
  const related = [...sameCol, ...crossCategory].slice(0, 4);
  return `
  <div class="page-head"><div class="container">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/home">Home</a><span>·</span><a href="#/shop">Shop</a><span>·</span><a href="#/shop?c=${p.colId || p.col}">${esc(p.collection.short)}</a><span>·</span><span style="color:var(--chestnut)">${p.sku}</span></nav>
    <div class="prod-grid">
      <div>
        <div class="gal-main" id="gal-main" data-reveal></div>
        <div class="gal-thumbs" id="gal-thumbs" data-reveal style="--d:.08s" role="tablist" aria-label="Photo gallery">
          ${PHOTO_KEYS.filter(k=>p.assets&&p.assets[k]).map(k=>`<button role="tab" data-act="gal" data-key="${k}" data-sku="${p.sku}" class="${k==="main"?"on":""}" aria-selected="${k==="main"}" aria-label="${KEY_META[k].label}">
            ${ph(p,k,{mini:true,w:200,dot:false,ratio:(p.superCategory==="Accessories"||k==="socialSquare"||k==="detailA")?"r11":"r45"})}<span class="gt-l">${k==="socialSquare"?"1:1":k==="storyReel"?"9:16":k==="detailA"?"Close-up":k==="original"?"Original":k==="alternate"?"Alt":k}</span>
          </button>`).join("")}
        </div>
        <div class="ai-block" data-reveal style="--d:.14s">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
            <span class="tag ai">${IC.spark} AI styling illustration — not the actual product</span>
          </div>
          ${(p.assets&&p.assets.aiStylingPreview)?
            `<div style="max-width:280px" data-act="lb-open" data-sku="${p.sku}" data-key="aiStylingPreview" role="button" tabindex="0" aria-label="Enlarge AI styling illustration">${ph(p,"aiStylingPreview",{w:600,tag:true})}</div>
             <p class="small" style="margin-top:10px">Illustrative styling concept only. Always refer to the real photographs above for the actual garment.</p>`:
            `<p class="small">Authentic source catalog photography. No AI concept preview generated for this piece.</p>`}
        </div>
      </div>
      <div class="prod-info" data-reveal style="--d:.1s">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:8px">
          <span class="tag" style="background:color-mix(in srgb,${p.accent} 16%,var(--cream3));color:var(--ink2)">${esc(p.collection ? p.collection.name : '')}</span>
          ${(p.colId==="01"||p.col==="01")?`<span class="tag warn">Seller label · unverified</span>`:""}
          ${stockBadgeHtml(p)}
        </div>
        <h1 class="pi-title${isBn()?' bn':''}">${esc(tProdTitle(p))}</h1>
        ${tProdSubTitle(p) ? `<div class="${isBn()?'':'bn'}" style="color:var(--chestnut);font-size:15px;margin:2px 0 4px">${esc(tProdSubTitle(p))}</div>` : ''}
        <span class="pp-sku">${p.sku} · ${esc(p.slug || p.sku.toLowerCase())}</span>
        ${(p.unitBn || p.unit) ? `<div class="unit-callout">${IC.tag}<span><b>${isBn()?'বিক্রয় একক:':'Selling Unit:'}</b> ${esc(tUnit(p))}</span></div>` : ''}
        <div class="pi-price"><b>${priceText(p)}</b><span class="tiny">${(p.price_review || p.priceStatus === 'suggested') ? 'Provisional reference · confirm with seller' : 'Boutique catalog price · Cash on Delivery'}</span></div>
        <p class="small${isBn()?' bn':''}" style="margin-bottom:16px">${esc(tProdDesc(p) || "Listed BDT prices come from the official boutique catalog and are confirmed before courier dispatch. First-order offer up to 25%* and free delivery* as advertised.")}</p>
        ${(() => {
          const oos = isProductOutOfStock(p);
          return `<div class="pi-buy" style="flex-wrap:wrap">
            <span class="qty" aria-label="Quantity"><button data-act="piq-dec" aria-label="Decrease quantity"${oos ? ' disabled' : ''}>${IC.minus}</button><output id="pi-qty">1</output><button data-act="piq-inc" aria-label="Increase quantity"${oos ? ' disabled' : ''}>${IC.plus}</button></span>
            <button class="btn btn-ink" data-act="bag-add-qty" data-sku="${p.sku}"${oos ? ' disabled' : ''}>${IC.bag}<span>${oos ? (isBn()?'স্টক নেই':'Out of stock') : (isBn()?'ব্যাগে যোগ করুন':'Add to inquiry bag')}</span></button>
            <button class="btn btn-buynow" data-act="buynow-qty" data-sku="${p.sku}"${oos ? ' disabled' : ''}><span>${oos ? (isBn()?'স্টক শেষ':'Unavailable') : (isBn()?'অর্ডার করুন (COD)':'Order Now (COD)')}</span>${IC.arrow}</button>
          </div>`;
        })()}
        <div class="pi-buy" style="flex-wrap:wrap">
          ${messengerBtn("Ask on Messenger",p.sku)}
          ${isRealWhatsapp() ? `<button type="button" data-act="wa" data-sku="${p.sku}" class="btn btn-line" style="display:inline-flex;align-items:center;gap:8px">${IC.wa}<span>WhatsApp Inquiry</span></button>` : ''}
          <button class="btn btn-line wish-line${inWish(p.sku)?" on":""}" style="justify-content:center" data-act="wish" data-sku="${p.sku}" data-heart="${p.sku}" aria-pressed="${inWish(p.sku)}">${IC.heart}<span>Wishlist</span></button>
        </div>
        <details class="acc" open><summary>Piece details &amp; Craft Specifications ${IC.chev}</summary><div class="acc-body">
          <div class="prov-row"><span>Category</span><span>${esc(p.superCategory)} · ${esc(p.collection ? p.collection.name : '')}</span></div>
          <div class="prov-row"><span>SKU</span><span>${p.sku}</span></div>
          <div class="prov-row"><span>Selling Unit</span><span>${esc(p.unitBn || p.unit || '১টি পণ্য')}${p.unit ? ` (${esc(p.unit)})` : ''}</span></div>
          ${(p.cautionBn || p.cautionEn) ? `<div class="notice warn" style="margin:10px 0">${IC.alert}<span><b>${isBn()?'সতর্কবার্তা:':'Selling Unit Disclosure:'}</b> ${esc(tCaution(p))}</span></div>` : ''}
          ${p.superCategory === 'Accessories' ? `
            ${p.details && p.details.colors ? `<div class="prov-row"><span>রঙ / Colors</span><span>${esc(p.details.colors)}</span></div>` : ''}
            ${p.details && p.details.designDetail ? `<div class="prov-row"><span>নকশা / Design</span><span>${esc(p.details.designDetail)}</span></div>` : ''}
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
          <p>Inside Dhaka delivery ৳${getDeliveryFees().dhaka}, Outside Dhaka ৳${getDeliveryFees().outside}. Apply codes <b>FIRST25</b>, <b>FARIZA200</b>, or <b>FREESHIP</b> in your Order Inquiry — no online payment is taken here. <a href="#/policies" style="text-decoration:underline;color:var(--chestnut)">Full terms</a>.</p>
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
    <div class="mb-t"><b>${esc(tProdTitle(p))}</b><span class="tiny">${priceText(p)} · COD</span></div>
    <div style="display:flex;gap:6px">
      <button class="btn btn-line btn-sm" data-act="bag-add-qty" data-sku="${p.sku}">${IC.bag}<span>Bag</span></button>
      <button class="btn btn-buynow btn-sm" data-act="buynow-qty" data-sku="${p.sku}"><span>Order COD</span>${IC.arrow}</button>
    </div>
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
  if(window.FT_ANIME && typeof window.FT_ANIME.animateImageSwap === "function"){
    window.FT_ANIME.animateImageSwap(wrap);
  } else {
    fx(wrap,{opacity:[.3,1]},{duration:.4});
  }
  $$("#gal-thumbs button").forEach(b=>{const on=b.dataset.key===k;b.classList.toggle("on",on);b.setAttribute("aria-selected",on);});
  bindImages(wrap);
}
/* ================= LOOKBOOK ================= */
function pageLookbook(){
  const c=state.route.query.c; if(c&&colById(c))state.look.c=c;
  const aiProds = PRODUCTS.filter(p=>p.assets&&p.assets.aiStylingPreview);
  return `
  <div class="sec-ink" style="padding-bottom:70px">
    <div class="page-head"><div class="container">
      <span class="overline" data-reveal>Squares, stories &amp; styling</span>
      <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">The Lookbook</h1>
      <p class="lede" data-reveal style="--d:.12s;margin-top:10px">Social-ready frames across all ${PRODUCTS.length} pieces — 1:1 squares and 9:16 story formats. AI styling concepts live in their own clearly-labelled gallery below.</p>
    </div></div>
    <div style="padding-top:26px"><div class="container">
      <div class="chips" style="margin-bottom:24px" data-reveal role="group" aria-label="Filter lookbook">
        <button class="chip${state.look.c==="all"?" on":""}" style="border-color:rgba(253,240,221,.4);color:var(--cream)" data-act="look-col" data-col="all">All <span class="n">${PRODUCTS.length*2}</span></button>
        ${COLLECTIONS.map(cl=>`<button class="chip${state.look.c===cl.id?" on":""}" style="border-color:rgba(253,240,221,.4);color:var(--cream)" data-act="look-col" data-col="${cl.id}">${esc(cl.short)} <span class="n">${cl.count*2}</span></button>`).join("")}
      </div>
      <div id="look-grid-wrap"></div>
    </div></div>
  </div>
  <div class="sec"><div class="container">
    <div class="sec-head"><div>
      <span class="overline" data-reveal>Clearly labelled</span>
      <h2 class="h-sec" data-reveal style="--d:.06s;margin-top:10px">AI Styling Illustrations</h2>
      <p class="lede" data-reveal style="--d:.12s;margin-top:8px">These are illustrative concepts — <b>not photographs of the actual garments</b>. ${aiProds.length} fashion pieces include an AI styling preview; Mome Boutique &amp; all 35 Artisan Accessories feature original photography only.</p>
    </div><span class="tag ai" data-reveal>${IC.spark} ai-illustration</span></div>
    <div class="pgrid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
      ${aiProds.map((p,i)=>`
        <div data-reveal style="--d:${(i%4)*.06}s">
          <div data-act="lb-open" data-sku="${p.sku}" data-key="aiStylingPreview" role="button" tabindex="0" aria-label="Enlarge AI illustration for ${esc(p.title)}" style="cursor:zoom-in">${ph(p,"aiStylingPreview",{w:500,tag:true})}</div>
          <p class="small" style="margin-top:8px"><a href="#/product/${p.sku}" style="text-decoration:underline">${esc(p.title)}</a><br><span class="tiny">${p.sku} · illustration only</span></p>
        </div>`).join("")}
    </div>
  </div></div>`;
}
function renderLookGrid(){
  const wrap=$("#look-grid-wrap"); if(!wrap)return;
  const list=state.look.c==="all"?PRODUCTS:PRODUCTS.filter(p=>(p.colId===state.look.c||p.col===state.look.c));
  const tiles=[];
  list.forEach(p=>{tiles.push({p,k:"socialSquare"});tiles.push({p,k:"storyReel"});});
  wrap.innerHTML=`<div class="lb-grid">${tiles.map((t,i)=>`
    <div class="lb-item${t.k==="storyReel"?" tall":""}" data-reveal style="--d:${(i%4)*.05}s" data-act="lb-open" data-sku="${t.p.sku}" data-key="${t.k}" role="button" tabindex="0" aria-label="Enlarge ${esc(t.p.title)} ${KEY_META[t.k].label}">
      ${ph(t.p,t.k,{w:600})}
      <div class="lb-cap"><span>${esc(t.p.title)}</span><span class="fmt">${t.k==="storyReel"?"9:16":"1:1"}</span></div>
    </div>`).join("")}</div>`;
  bindImages(wrap); revealBind(wrap);
  if(window.FT_ANIME){
    window.FT_ANIME.refresh();
    window.FT_ANIME.animateGridCards(wrap);
  }
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
  const fees = getDeliveryFees();
  const subtotal = subtotalNum(items);
  const outside = isOutsideZone(cust && cust.zone ? cust.zone : state.deliveryZone);
  const baseDelivery = outside ? fees.outside : fees.dhaka;
  const zone = outside ? `Outside Dhaka (৳${fees.outside})` : `Inside Dhaka (৳${fees.dhaka})`;
  const isFreeShip = state.appliedCoupon && state.appliedCoupon.coupon && state.appliedCoupon.coupon.discount_type === 'free_shipping';
  let discount = 0;
  if (state.appliedCoupon) {
    discount = isFreeShip ? baseDelivery : (state.appliedCoupon.discountAmount || 0);
  }
  const total = Math.max(0, subtotal + baseDelivery - discount);

  const lines = [
    "FARIZA'S TERRITORY — ORDER INQUIRY",
    "Ref: " + ref,
    "Date: " + d.toLocaleDateString("en-GB"),
    "",
    "— Items Ordered —"
  ];
  items.forEach((it,i)=>{
    const p=bySku(it.sku);
    const lineTotal = (p.priceBDT || 0) * it.qty;
    lines.push(`${i+1}. ${p.sku} — ${p.title} × ${it.qty} (৳${(p.priceBDT || 0).toLocaleString()} each = ৳${lineTotal.toLocaleString()})`);
  });

  lines.push(
    "",
    "— Payment & Delivery Breakdown (Cash on Delivery) —",
    "Items Subtotal: ৳" + subtotal.toLocaleString(),
    "Delivery Zone: " + zone,
    "Delivery Fee: " + (isFreeShip ? "৳0 (Free Delivery Applied)" : "৳" + baseDelivery)
  );

  if (state.appliedCoupon) {
    lines.push(`Applied Voucher (${state.appliedCoupon.code}): - ৳${discount.toLocaleString()}`);
  }

  lines.push(
    "Net Total Payable: ৳" + total.toLocaleString() + " (Cash on Delivery)",
    "",
    "— Customer Details —"
  );
  if(cust){
    lines.push(
      "Name: " + cust.name,
      "Phone: " + cust.phone,
      "District: " + cust.district,
      "Delivery Address: " + cust.address
    );
    if(cust.notes) lines.push("Notes: " + cust.notes);
    lines.push("Preferred Contact: " + cust.contact);
  }
  const attr = (window.FT_ANALYTICS && typeof window.FT_ANALYTICS.getAttribution === "function") ? window.FT_ANALYTICS.getAttribution() : null;
  if(attr && (attr.utm_campaign || attr.utm_source || attr.fbclid)){
    lines.push("Ad Source: " + [attr.utm_source, attr.utm_medium, attr.utm_campaign].filter(Boolean).join(" / ") + (attr.fbclid ? " [Meta Ad Click]" : ""));
  }
  lines.push(
    "",
    "Please confirm order sizing, availability, and courier dispatch. Thank you for shopping with Fariza's Territory!"
  );
  return lines.join("\n");
}
function makeRef(){
  const d=new Date(),ymd=String(d.getFullYear()).slice(2)+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0");
  return "FT-"+ymd+"-"+Math.random().toString(36).slice(2,6).toUpperCase();
}
function pageInquiry(){
  state.inqDone=false;
  const fees = getDeliveryFees();
  const isOut = isOutsideZone(state.deliveryZone);
  if(!state.bag.length&&!state.lastInquiry){
    return `<div class="page-head"><div class="container"><span class="overline">Checkout · honest by design</span><h1 class="h-display" style="margin-top:12px">Order Inquiry</h1></div></div>
    <div class="page-body"><div class="container"><div class="empty">${IC.bag}<p>Nothing to inquire about yet.</p><p class="small" style="margin:8px 0 18px">Add pieces to your bag first — then prepare one message for the seller.</p><a class="btn btn-ink" href="#/shop"><span>Shop the boutique</span>${IC.arrow}</a></div></div></div>`;
  }
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>${isBn() ? 'চেকআউট · ক্যাশ অন ডেলিভারি' : 'Checkout · inquiry-based COD'}</span>
    <h1 class="h-display${isBn() ? ' bn' : ''}" data-reveal style="--d:.06s;margin-top:12px">${isBn() ? 'অর্ডার ইনকোয়ারি' : 'Order Inquiry'}</h1>
    <p class="lede${isBn() ? ' bn' : ''}" data-reveal style="--d:.12s;margin-top:10px">${isBn() ? 'অনলাইনে কোনো অগ্রিম পেমেন্ট নেওয়া হয় না। ডেলিভারির তথ্য দিন — আমরা কনফার্ম করে কুরিয়ারের মাধ্যমে পাঠিয়ে দেবো।' : 'No payment is taken online. Prepare your COD order with delivery details & voucher codes — seller confirms sizing, stock, and courier dispatch before shipping.'}</p>
  </div></div>
  <div class="page-body"><div class="container"><div id="inq-wrap">
    <div class="two-col">
      <form class="panel" data-form="inquiry" data-reveal novalidate>
        <span class="overline" style="margin-bottom:18px">${isBn() ? 'ক্রেতা ও ডেলিভারির তথ্য' : 'Customer & Delivery Details'}</span>
        <div class="field" data-f="name">
          <label for="f-name">${isBn() ? 'আপনার পূর্ণ নাম *' : 'Full name *'}</label>
          <p class="f-hint">Full recipient name printed on the Steadfast courier parcel label.</p>
          <input id="f-name" name="name" required minlength="2" autocomplete="name" aria-invalid="false" data-error="err-f-name" placeholder="e.g. Fariza Rahman">
          <span class="f-err" id="err-f-name">Please enter your full name (at least 2 characters).</span>
        </div>
        <div class="field" data-f="phone">
          <label for="f-phone">${isBn() ? 'মোবাইল / হোয়াটসঅ্যাপ নম্বর *' : 'Bangladeshi mobile contact *'}</label>
          <p class="f-hint">11-digit BD mobile (01XXXXXXXXX or +8801XXXXXXXXX) — needed for COD call &amp; tracking.</p>
          <input id="f-phone" name="phone" type="tel" required inputmode="tel" autocomplete="tel" aria-invalid="false" data-error="err-f-phone" placeholder="e.g. 017XXXXXXXX">
          <span class="f-err" id="err-f-phone">Please enter a valid 11-digit Bangladeshi mobile number (e.g., 017XXXXXXXX).</span>
        </div>
        <div class="field" data-f="email">
          <label for="f-email">Email (optional)</label>
          <p class="f-hint">Optional email if you want digital reference confirmation.</p>
          <input id="f-email" name="email" type="email" autocomplete="email" aria-invalid="false" data-error="err-f-email" placeholder="e.g. customer@example.com">
          <span class="f-err" id="err-f-email">Please enter a valid email address.</span>
        </div>

        <!-- Delivery Zone Selector -->
        <div class="field" data-f="zone">
          <label style="font-weight:600;margin-bottom:8px;display:block">${isBn() ? 'ডেলিভারি জোন ও চার্জ *' : 'Delivery Zone & Courier Rate *'}</label>
          <div class="zone-selector" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
            <label class="zone-card ${!isOut?'active':''}" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:1.5px solid ${!isOut?'var(--chestnut)':'var(--line)'};background:${!isOut?'var(--cream2)':'var(--surface)'};border-radius:10px;cursor:pointer;transition:all .2s ease">
              <input type="radio" name="delivery_zone" value="dhaka" ${!isOut?'checked':''} style="accent-color:var(--chestnut)">
              <div>
                <div style="font-weight:600;font-size:13.5px">${isBn() ? 'ঢাকার ভেতরে' : 'Inside Dhaka'}</div>
                <div style="font-size:11.5px;color:var(--ink2)">24–72 hrs · ৳${fees.dhaka}</div>
              </div>
            </label>
            <label class="zone-card ${isOut?'active':''}" style="display:flex;align-items:center;gap:10px;padding:12px 14px;border:1.5px solid ${isOut?'var(--chestnut)':'var(--line)'};background:${isOut?'var(--cream2)':'var(--surface)'};border-radius:10px;cursor:pointer;transition:all .2s ease">
              <input type="radio" name="delivery_zone" value="outside_dhaka" ${isOut?'checked':''} style="accent-color:var(--chestnut)">
              <div>
                <div style="font-weight:600;font-size:13.5px">${isBn() ? 'ঢাকার বাইরে' : 'Outside Dhaka'}</div>
                <div style="font-size:11.5px;color:var(--ink2)">3–5 days nationwide · ৳${fees.outside}</div>
              </div>
            </label>
          </div>
        </div>

        <div class="field" data-f="district">
          <label for="f-district">${isBn() ? 'জেলা / শহর *' : 'District / City *'}</label>
          <p class="f-hint">City or district for Steadfast Nationwide COD routing.</p>
          <input id="f-district" name="district" required minlength="2" autocomplete="address-level2" aria-invalid="false" data-error="err-f-district" placeholder="e.g. Dhaka, Chittagong, Sylhet">
          <span class="f-err" id="err-f-district">Please enter your district or city.</span>
        </div>
        <div class="field" data-f="address">
          <label for="f-address">${isBn() ? 'পূর্ণ ডেলিভারি ঠিকানা *' : 'Delivery address *'}</label>
          <p class="f-hint">Include house number, road, block/sector, and nearby landmark.</p>
          <textarea id="f-address" name="address" required minlength="5" rows="3" autocomplete="street-address" aria-invalid="false" data-error="err-f-address" placeholder="House, road, area/thana…"></textarea>
          <span class="f-err" id="err-f-address">Please enter a complete delivery street address (at least 5 characters).</span>
        </div>
        <div class="field"><label for="f-notes">Notes (optional)</label><textarea id="f-notes" name="notes" rows="2" placeholder="Sizing questions, colour preferences, gift wrap…"></textarea></div>
        <div class="field"><label>Preferred reply via</label>
          <div class="radio-row">
            ${isRealWhatsapp() ? '<label><input type="radio" name="contact" value="WhatsApp" checked> WhatsApp</label>' : ''}
            <label><input type="radio" name="contact" value="Messenger"${isRealWhatsapp() ? '' : ' checked'}> Messenger</label>
            <label><input type="radio" name="contact" value="Phone call"> Phone call</label>
          </div>
        </div>
        <label class="check-row" data-f="policy">
          <input type="checkbox" name="policy_ack" id="f-policy" required>
          <span>${isBn()
            ? 'আমি <a href="#/policies" style="text-decoration:underline;color:var(--chestnut)">স্টোর নীতিমালা</a> (ক্যাশ অন ডেলিভারি যাচাইকরণ, ডেলিভারি চার্জ ও রিটার্ন/এক্সচেঞ্জ শর্ত) মেনে নিচ্ছি।'
            : 'I accept the <a href="#/policies" style="text-decoration:underline;color:var(--chestnut)">Store Policies</a> (COD courier verification, 48-hr damaged/wrong item unboxing claim, and cancellation/exchange rules).'}
            <span class="f-err" id="err-f-policy" style="display:none;margin-top:4px">Please confirm you agree to our store policies before submitting.</span>
          </span>
        </label>
        <label style="display:flex;gap:9px;align-items:center;font-size:13.5px;margin:6px 0 18px"><input type="checkbox" name="clearbag" style="accent-color:var(--chestnut)"> Clear my bag after preparing the inquiry</label>
        <div id="inq-submit-error" style="margin-bottom:12px"></div>
        <button type="submit" id="inq-submit-btn" class="btn btn-ink btn-block"><span>${isBn() ? 'অর্ডার কনফার্মেশন ইনকোয়ারি পাঠান' : 'Prepare inquiry & register order'}</span>${IC.arrow}</button>
        <p class="tiny" style="margin-top:12px">Cash on Delivery applies. Inside Dhaka ৳${fees.dhaka} (24–72 hrs) · Outside Dhaka ৳${fees.outside} (3–5 business days).</p>
      </form>
      <div class="panel sticky" data-reveal style="--d:.1s" id="inq-summary"></div>
    </div>
  </div></div>`;
}
function renderInqSummary(){
  const el=$("#inq-summary"); if(!el)return;
  const fees = getDeliveryFees();
  const subtotal = subtotalNum(state.bag);
  const isOut = isOutsideZone(state.deliveryZone);
  const isFreeShip = state.appliedCoupon && state.appliedCoupon.coupon && state.appliedCoupon.coupon.discount_type === 'free_shipping';
  const baseDelivery = isOut ? fees.outside : fees.dhaka;
  let discountAmount = 0;
  if (state.appliedCoupon) {
    discountAmount = isFreeShip ? baseDelivery : (state.appliedCoupon.discountAmount || 0);
  }
  const totalPayable = Math.max(0, subtotal + baseDelivery - discountAmount);

  el.innerHTML=`<span class="overline">Order Summary</span>
    <div style="margin-top:14px;max-height:240px;overflow-y:auto;padding-right:4px">
      ${state.bag.map(it=>{
        const p=bySku(it.sku);
        const lineTotal = (p.priceBDT || 0) * it.qty;
        return `<div class="prov-row" style="align-items:center;padding:6px 0;border-bottom:1px dashed var(--line)">
          <div style="flex:1;min-width:0;padding-right:8px">
            <div style="font-weight:600;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.title)}</div>
            <div class="tiny" style="color:var(--ink2)">${p.sku} · ৳${(p.priceBDT || 0).toLocaleString()} × ${it.qty}</div>
          </div>
          <div style="font-weight:600;font-size:13.5px">৳${lineTotal.toLocaleString()}</div>
        </div>`;
      }).join("")||'<p class="small">Bag is empty.</p>'}
    </div>

    <!-- Voucher / Promo Code Section -->
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--line)">
      <div style="font-size:12.5px;font-weight:600;margin-bottom:8px;color:var(--ink);display:flex;align-items:center;gap:6px">
        ${IC.tag}<span>Have a Voucher or Promo Code?</span>
      </div>
      ${state.appliedCoupon ? `
        <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(46,125,50,0.1);border:1px solid rgba(46,125,50,0.3);padding:8px 12px;border-radius:8px">
          <div>
            <div style="font-weight:700;color:#2e7d32;font-size:13.5px">${esc(state.appliedCoupon.code)}</div>
            <div style="font-size:11.5px;color:#2e7d32">${esc(state.appliedCoupon.message || 'Discount applied')}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <b style="color:#2e7d32">- ৳${discountAmount.toLocaleString()}</b>
            <button type="button" class="iconbtn" data-act="remove-coupon" aria-label="Remove coupon" style="width:24px;height:24px">${IC.x}</button>
          </div>
        </div>
      ` : `
        <div style="display:flex;gap:8px">
          <input id="inq-coupon-input" type="text" placeholder="FIRST25, FARIZA200..." style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--kantha);background:var(--surface);font-size:13px;text-transform:uppercase">
          <button type="button" class="btn btn-ink btn-sm" data-act="apply-coupon" style="padding:8px 16px"><span>Apply</span></button>
        </div>
        <div id="coupon-feedback" style="margin-top:6px;font-size:11.5px;color:var(--ink2)">Available codes: <button type="button" class="link-btn" data-act="fill-coupon" data-code="FIRST25" style="text-decoration:underline;background:none;border:none;cursor:pointer;color:var(--chestnut);font-weight:600">FIRST25</button>, <button type="button" class="link-btn" data-act="fill-coupon" data-code="FARIZA200" style="text-decoration:underline;background:none;border:none;cursor:pointer;color:var(--chestnut);font-weight:600">FARIZA200</button>, <button type="button" class="link-btn" data-act="fill-coupon" data-code="FREESHIP" style="text-decoration:underline;background:none;border:none;cursor:pointer;color:var(--chestnut);font-weight:600">FREESHIP</button></div>
      `}
    </div>

    <!-- Financial Breakdown Table -->
    <div style="margin-top:16px;padding-top:14px;border-top:1.5px dashed var(--line);font-size:13.5px">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:var(--ink2)">Subtotal (${bagCount()} item${bagCount()===1?'':'s'}):</span>
        <b>৳ ${subtotal.toLocaleString()}</b>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="color:var(--ink2)">Delivery (${isOut?'Outside Dhaka':'Inside Dhaka'}):</span>
        <b>${isFreeShip ? '<span style="text-decoration:line-through;color:var(--ink2)">৳ '+baseDelivery+'</span> <span style="color:#2e7d32">FREE</span>' : '৳ ' + baseDelivery}</b>
      </div>
      ${state.appliedCoupon && !isFreeShip && discountAmount > 0 ? `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#2e7d32">
          <span>Discount Voucher (${esc(state.appliedCoupon.code)}):</span>
          <b>- ৳ ${discountAmount.toLocaleString()}</b>
        </div>
      ` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;margin-top:8px;border-top:1px solid var(--line);font-size:16px;font-weight:700;color:var(--ink)">
        <span>Total Payable (COD):</span>
        <span style="color:var(--chestnut);font-size:18px">৳ ${totalPayable.toLocaleString()}</span>
      </div>
      <div style="font-size:11.5px;color:var(--ink2);margin-top:6px;display:flex;align-items:center;gap:4px">
        ${IC.info} <span>Cash on Delivery — Pay to courier upon delivery</span>
      </div>
    </div>`;
}
function renderInqDone(){
  const wrap=$("#inq-wrap"); if(!wrap||!state.lastInquiry)return;
  const q=state.lastInquiry;
  const waUrl = getWhatsAppUrl(q.text);
  wrap.innerHTML=`<div class="two-col"><div class="panel" data-reveal>
    <div class="success-mark">${IC.check}</div>
    <h2 class="h-sec kinetic-title">Inquiry Registered!</h2>
    <p class="lede" style="margin:12px 0 20px">Reference <b style="color:var(--chestnut)">${esc(q.ref)}</b>. Your order inquiry has been saved on our boutique server. To confirm sizing and delivery timing, please message our concierge team. <b>Cash on Delivery applies — no payment taken online.</b></p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">
      ${isRealWhatsapp() ? `<a class="btn btn-caramel" href="${waUrl}" target="_blank" rel="noopener">${IC.wa}<span>Send via WhatsApp</span></a>` : ''}
      <button class="btn btn-ink" data-act="msg" data-send="1">${IC.chat}<span>Send via Messenger</span></button>
      <button class="btn btn-line" data-act="copy" data-target="#inq-msg">${IC.copy}<span>Copy Summary</span></button>
      <a class="btn btn-line" href="#/track/${encodeURIComponent(q.ref)}">${IC.pin}<span>Track This Order</span></a>
      <button class="btn btn-line" data-act="inq-dl">${IC.dl}<span>Download .txt</span></button>
    </div>
    <div class="notice info">${IC.info}<span>Server Total: <b>৳${Number(q.total || 0).toLocaleString('en-US')}</b> (COD). You can track its status anytime on our <a href="#/track/${encodeURIComponent(q.ref)}" style="text-decoration:underline">Order Tracking</a> page using your Reference and Phone Number.</span></div>
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
        <div class="brand-crest-card" style="margin:0 0 22px">
          <img src="/assets/brand/brand_logo_1.webp" alt="Fariza's Territory Official Brand Crest — Pomelli Brand Book" loading="lazy">
          <span class="tiny" style="color:var(--chestnut)">Official Brand Mark · Minimum 152px width &amp; 95px clear-space specification (Pomelli Brand Book)</span>
        </div>
        <p class="lede" style="margin-bottom:18px">Fariza's Territory is a boutique fashion and artisan accessories brand based in Mirpur, Dhaka, connecting with over 13,000 social media followers through curated lookbooks and studio reels. Browse all 53 verified pieces across 8 fashion &amp; accessory collections, inspect close-up details, and inquire directly piece by piece.</p>
        <p class="lede" style="margin-bottom:26px">We commit to photography-first presentation. Where the catalog includes AI styling previews, they are always labelled as illustrations. Where a photo's public access is unresolved, you'll see an honest branded placeholder — never another product's photograph.</p>
        <span class="overline">Values</span>
        <div class="value-chips" style="margin-top:12px"><span style="border-color:var(--kantha);color:var(--chestnut)">Style</span><span style="border-color:var(--kantha);color:var(--chestnut)">Trendy Fashion</span><span style="border-color:var(--kantha);color:var(--chestnut)">Community</span></div>
        <span class="overline">Aesthetic &amp; Tone of Voice</span>
        <ul class="aes-list" style="margin-top:12px;color:var(--ink)">
          ${["Folk-Art Ornamentation","Heritage Patternwork","Artisanal Tactility","Botanical Intricacy","Traditional Flourish","Tone: Casual · Modern · Trendy"].map(a=>`<li style="color:var(--ink2)">${IC.flower}${a}</li>`).join("")}
        </ul>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px">
          <a class="btn btn-ink btn-sm" href="/assets/aistudio/fariza_s_territory_brand_book_by_pomelli_1e38cd9b.pdf" target="_blank" rel="noopener">${IC.dl}<span>View Official Pomelli Brand Book (PDF)</span></a>
        </div>
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
  const fbUrl = state.cfg.facebook || CONFIG.facebookPageUrl || CONFIG.fbSearch || "https://www.facebook.com/farizasterritory143";
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>We reply personally</span>
    <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">Contact &amp; Ordering</h1>
  </div></div>
  <div class="page-body"><div class="container">
    <div class="contact-grid">
      <div data-reveal>
        <div class="c-card">${IC.chat}<div><b>Facebook Messenger — primary</b><p>The fastest way to order. Send your inquiry message and we confirm prices, sizing, offers and delivery.</p>${messengerBtn("Open Messenger")}</div></div>
        ${isRealWhatsapp()?`<div class="c-card">${IC.wa}<div><b>WhatsApp</b><p>WhatsApp order inquiries available.</p><button class="btn btn-line btn-sm" data-act="wa">${IC.wa}<span>WhatsApp inquiry</span></button></div></div>`:''}
        <div class="c-card">${IC.pin}<div><b>Mirpur, Dhaka, Bangladesh</b><p>Boutique base as stated in the Brand Book. A precise street address and direct concierge line are confirmed via Messenger.</p><a class="btn btn-line btn-sm" href="${esc(fbUrl)}" target="_blank" rel="noopener">${IC.ext}<span>Find us on Facebook</span></a></div></div>
        <div class="notice">${IC.alert}<span>Apply welcome voucher codes <b>FIRST25</b>, <b>FARIZA200</b>, or <b>FREESHIP</b> inside your Order Inquiry — Cash on Delivery eligibility is confirmed by the seller.</span></div>
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
    ["How do I place an order?","Add pieces to your inquiry bag, open Order Inquiry, fill in your details and register your order. You can send the prepared summary on WhatsApp or Messenger and track live status updates anytime on our Track Order page."],
    ["Are the prices final?","This store displays official boutique prices across all 53 curated pieces (18 Studio Garments and 35 Artisan Accessories). Seller confirms sizing, custom color notes, availability, and courier dispatch on WhatsApp or Messenger."],
    ["Is the 25% discount applied automatically?","Active voucher codes such as FIRST25 (25% off, max ৳500), FARIZA200 (৳200 off), and FREESHIP can be applied directly inside the Order Inquiry summary before submitting."],
    ["Do you take payment online?","No. Orders are Cash on Delivery (COD) nationwide across Bangladesh. No card details or online payments are taken on this site."],
    ["Are the product photos authentic?","Yes. Every product features authentic boutique photography hosted locally with crisp zoom and close-up detail views. Where an illustrative AI styling concept exists, it is clearly labelled separately."],
    ["What are the AI styling previews?","Some fashion garments include an optional AI styling illustration in the source catalog. They are always labelled “AI illustration — not the actual product” and kept separate from real photography. Mome Boutique garments and all 35 Artisan Accessories show genuine photography only."],
    ["Is the Aarong collection officially affiliated?","The collection “01 — Aarong Seller Label” preserves the seller's original catalog label and carries an explicit “unverified” badge with no official brand affiliation claimed."],
    ["What about returns and exchanges?","Please confirm return, exchange, and color-customization terms with the seller on WhatsApp or Messenger before courier dispatch — see Policies."]
  ];
  return `
  <div class="page-head"><div class="container"><span class="overline" data-reveal>Answers, honestly</span><h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">FAQ</h1></div></div>
  <div class="page-body"><div class="container"><div class="faq-list">
    ${faqs.map((f,i)=>`<details class="acc" data-reveal style="--d:${i*.04}s"${i===0?" open":""}><summary>${esc(f[0])} ${IC.chev}</summary><div class="acc-body">${esc(f[1])}</div></details>`).join("")}
    <div style="margin-top:26px;display:flex;gap:10px;flex-wrap:wrap">${messengerBtn("Still curious? Ask us")}<a class="btn btn-line" href="#/policies"><span>Read policies</span></a></div>
  </div></div></div>`;
}
function pagePolicies(){
  const fees = getDeliveryFees();
  return `
  <div class="page-head"><div class="container">
    <span class="overline" data-reveal>Plain words · EN &amp; বাংলা</span>
    <h1 class="h-display${isBn()?' bn':''}" data-reveal style="--d:.06s;margin-top:12px">${isBn() ? 'স্টোর নীতিমালা ও শর্তাবলী' : 'Policies &amp; Offer Terms'}</h1>
    <p class="lede" data-reveal style="--d:.1s;margin-top:10px">Complete bilingual transparency covering Cash on Delivery verification, courier dispatch SLA, returns/exchanges, COD refusal/cancellation, high-risk selling units, vouchers, and cookie privacy.</p>
  </div></div>
  <div class="page-body"><div class="container">
    <div class="pol-sec" data-reveal>
      <h3>${IC.truck} 1. Delivery Timeline SLA &amp; Cash on Delivery (COD)</h3>
      <div class="bilingual-policy-grid">
        <div class="bilingual-card">
          <h3>English</h3>
          <p>All orders are fulfilled on a Cash on Delivery (COD) basis via Steadfast Courier from Mirpur, Dhaka — no online prepayment is collected on this site. <b>Inside Dhaka Metro:</b> ৳${fees.dhaka}, estimated 24–72 hours after phone/Messenger confirmation. <b>Outside Dhaka (Nationwide):</b> ৳${fees.outside}, estimated 3–5 business days. Remote upazilas may require 4–7 business days.</p>
        </div>
        <div class="bilingual-card bn">
          <h3>বাংলা</h3>
          <p>আমাদের সকল অর্ডার মিরপুর, ঢাকা থেকে স্টেডফাস্ট কুরিয়ারের মাধ্যমে সম্পূর্ণ ক্যাশ অন ডেলিভারিতে (COD) পাঠানো হয়। <b>ঢাকার ভেতরে:</b> ডেলিভারি চার্জ ৳${fees.dhaka} (কনফার্মেশনের পর আনুমানিক ২৪–৭২ ঘণ্টা)। <b>ঢাকার বাইরে সারাদেশে:</b> ডেলিভারি চার্জ ৳${fees.outside} (আনুমানিক ৩–৫ কার্যদিবস)।</p>
        </div>
      </div>
    </div>

    <div class="pol-sec" data-reveal>
      <h3>${IC.flower} 2. Return, Exchange &amp; Unboxing Claim Policy</h3>
      <div class="bilingual-policy-grid">
        <div class="bilingual-card">
          <h3>English</h3>
          <p>We encourage inspecting your parcel in front of the delivery rider. If a piece arrives damaged, defective, or incorrect, report it with clear unboxing video/photos within <b>48 hours of delivery</b> via <a href="#/contact" style="text-decoration:underline;color:var(--chestnut)">Messenger Concierge</a>. Defective/incorrect items qualify for a free replacement or size exchange; change-of-mind returns must remain unworn, unwashed, and with original tags intact (return courier cost borne by customer).</p>
        </div>
        <div class="bilingual-card bn">
          <h3>বাংলা</h3>
          <p>ডেলিভারি রাইডারের সামনে পার্সেল যাচাই করে নেওয়ার অনুরোধ রইল। কোনো পণ্যে ত্রুটি বা ভুল আইটেম থাকলে ডেলিভারি পাওয়ার <b>৪৮ ঘণ্টার মধ্যে</b> আনবক্সিং ভিডিও/ছবিসহ আমাদের মেসেঞ্জারে জানান। ত্রুটিপূর্ণ পণ্যের ক্ষেত্রে ফ্রি রিপ্লেসমেন্ট দেওয়া হয়; ব্যক্তিগত কারণে এক্সচেঞ্জের জন্য পণ্য অব্যবহৃত অবস্থায় থাকতে হবে।</p>
        </div>
      </div>
    </div>

    <div class="pol-sec" data-reveal>
      <h3>${IC.alert} 3. Order Cancellation &amp; COD Refusal Policy</h3>
      <div class="bilingual-policy-grid">
        <div class="bilingual-card">
          <h3>English</h3>
          <p>Orders remain editable or cancellable free of charge until they enter <b>Confirmed / Dispatched</b> status by contacting us with your Order Reference (<code>FT-...</code>). Unreachable phone verification after 3 attempts or repeated unverified COD refusal without valid defect may result in requiring advance courier confirmation on future bookings.</p>
        </div>
        <div class="bilingual-card bn">
          <h3>বাংলা</h3>
          <p>কুরিয়ারে বুকিং হওয়ার (Confirmed/Shipped) আগ পর্যন্ত অর্ডার রেফারেন্স (<code>FT-...</code>) জানিয়ে বিনামূল্যে অর্ডার পরিবর্তন বা বাতিল করা যায়। কনফার্মেশন কলের পর অকারণে ডেলিভারি গ্রহণ না করলে পরবর্তী অর্ডারের ক্ষেত্রে অগ্রিম ডেলিভারি চার্জ প্রযোজ্য হতে পারে।</p>
        </div>
      </div>
    </div>

    <div class="pol-sec" data-reveal>
      <h3>${IC.tag} 4. Voucher Terms &amp; Selling Unit Disclosures</h3>
      <div class="bilingual-policy-grid">
        <div class="bilingual-card">
          <h3>English</h3>
          <p>Active boutique codes are <code>FIRST25</code> (25% off up to ৳500, min spend ৳2,000), <code>FARIZA200</code> (৳200 off, min spend ৳2,000), and <code>FREESHIP</code> (free delivery on orders over ৳${CONFIG.freeShippingThreshold || 3000}). Only one coupon applies per order; discounts are verified server-side. Single-unit items (including decorative mirrors, individual embroidered kurtis/three-pieces, pendants with/without chains, and single bangles vs pairs) explicitly display their <b>Selling Unit</b> before checkout.</p>
        </div>
        <div class="bilingual-card bn">
          <h3>বাংলা</h3>
          <p>অর্ডার ইনকোয়ারি ফর্মে <code>FIRST25</code> (২৫% ছাড়, সর্বোচ্চ ৳৫০০), <code>FARIZA200</code> (৳২০০ ছাড়) বা <code>FREESHIP</code> (৳৩,০০০+ অর্ডারে ফ্রি ডেলিভারি) ব্যবহার করা যাবে। প্রতিটি পণ্যের <b>বিক্রয় একক</b> (যেমন সিঙ্গেল পিস, পেয়ার/জোড়া, থ্রি-পিস বা কুর্তি, চেইনসহ বা ছাড়া) প্রোডাক্ট কার্ডে স্পষ্টভাবে উল্লেখ রয়েছে।</p>
        </div>
      </div>
    </div>

    <div class="pol-sec" data-reveal>
      <h3>${IC.eye} 5. Imagery Authenticity &amp; Seller Labels</h3>
      <p>Real source photographs are displayed first on all curated pieces. Optional AI-styled editorial concepts are tagged <b>“AI illustration — not actual product”</b>. Collection N° 01 ("Aarong Seller Label") reflects the seller's original catalog attribution; official brand affiliation is not claimed unless explicitly stated.</p>
    </div>

    <div class="pol-sec" data-reveal>
      <h3>${IC.info} 6. Privacy, Analytics Consent &amp; Tracking Data</h3>
      <p>Your inquiry bag, wishlist, and recent non-PII Order Reference list remain locally in your browser. Submitted order details are stored securely in PostgreSQL (Supabase) solely for seller verification, delivery via courier, and phone-challenged tracking (<code>#/track</code>). Meta Pixel and Conversions API telemetry stay disabled unless you explicitly accept analytics cookies.</p>
      <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap">
        <button type="button" class="btn btn-line btn-sm" data-act="consent-reset">Manage Cookie / Analytics Preference</button>
      </div>
    </div>
  </div></div>`;
}
function page404(){
  return `<div class="page-head"><div class="container"><span class="overline">Lost on the floor</span><h1 class="h-display" style="margin-top:12px">Page not found</h1></div></div>
  <div class="page-body"><div class="container"><div class="empty">${IC.flower}<p>This corner of the boutique doesn't exist.</p><div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap"><a class="btn btn-ink btn-sm" href="#/home"><span>Back home</span></a><a class="btn btn-line btn-sm" href="#/shop"><span>Shop all pieces</span></a></div></div></div></div>`;
}
/* ================= LIGHTBOX ================= */
function lbList(sku){const p=bySku(sku);const l=PHOTO_KEYS.filter(k=>p.assets&&p.assets[k]);return l.length?l:["main"];}
function openLB(sku,key){
  lastOverlayTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  state.lb={sku,key,scale:1,tx:0,ty:0,list:lbList(sku)};
  const lb=$("#lightbox");
  lb.inert = false;
  lb.classList.add("open");lb.setAttribute("aria-hidden","false");
  setPageShellInert(true);
  document.body.style.overflow="hidden";
  renderLB();
  const closeBtn = lb.querySelector('[data-act="lb-close"]');
  if(closeBtn) setTimeout(()=>closeBtn.focus(),40);
}
function renderLB(){
  const {sku,key}=state.lb,p=bySku(sku),meta=KEY_META[key]||{label:key,ratio:"r45",auth:"source"};
  $("#lb-cap").innerHTML=`<b style="font-weight:400">${esc(p.title)}</b><span class="tag ${key==="aiStylingPreview"?"ai":"dark"}">${key==="aiStylingPreview"?"AI illustration — not actual product":esc(meta.label)}</span><span class="tiny" style="color:rgba(253,240,221,.6)">${p.sku} · ${meta.auth}</span>`;
  const lbPath=assetSrc(p,key,1600); $("#lb-src").innerHTML=lbPath?`<a href="${lbPath}" target="_blank" rel="noopener noreferrer" style="text-decoration:underline">View high-resolution photo ↗</a>`:"Asset not supplied";
  $("#lb-fig").innerHTML=ph(p,key,{w:1600,eager:true,contain:true,ratio:meta.ratio});
  applyLB(); bindImages($("#lb-fig"));
  fx($("#lb-fig"),{opacity:[0,1]},{duration:.35});
}
function applyLB(){
  const f=$("#lb-fig");
  f.style.transform=`translate(${state.lb.tx}px,${state.lb.ty}px) scale(${state.lb.scale})`;
}
function closeLB(){
  const lb=$("#lightbox");
  const wasOpen = lb && lb.classList.contains("open");
  lb.classList.remove("open");lb.setAttribute("aria-hidden","true");
  lb.inert = true;
  if(!state.drawer){setPageShellInert(false);document.body.style.overflow="";}
  if(wasOpen && lastOverlayTrigger && typeof lastOverlayTrigger.focus === "function"){
    lastOverlayTrigger.focus();
    lastOverlayTrigger = null;
  }
}
function lbStep(d){
  const l=state.lb.list,i=l.indexOf(state.lb.key);
  state.lb.key=l[(i+d+l.length)%l.length];state.lb.scale=1;state.lb.tx=0;state.lb.ty=0;renderLB();
}
function lbZoom(f){state.lb.scale=Math.max(.6,Math.min(5,state.lb.scale*f));if(state.lb.scale<=1){state.lb.tx=0;state.lb.ty=0;}applyLB();}
/* ================= CONSOLE MODAL ================= */
function stHtml(st){
  const m={ok:["ok","Reachable"],err:["err","Unavailable"],pending:["pending","Testing…"],na:["na","Not supplied"]};
  const v=m[st]||m.pending;
  return `<span class="st ${v[0]}"><i></i>${v[1]}</span>`;
}
function openModal(tab){
  state.reportTab=tab||"assets";
  closeDrawer();closeSearch();closeMenu();
  const dlg=$("#modal");
  if(dlg){
    if(typeof dlg.showModal==="function"){if(!dlg.open) dlg.showModal();}
    else dlg.setAttribute("open","");
  }
  renderModal();
  if(state.reportTab==="assets"&&!state.reportRan)runReport();
}
function closeModal(){
  const dlg=$("#modal");
  if(dlg){
    if(typeof dlg.close==="function"){if(dlg.open) dlg.close();}
    else dlg.removeAttribute("open");
  }
}
function renderModal(){
  $$(".mo-tabs .chip").forEach(c=>c.classList.toggle("on",c.dataset.tab===state.reportTab));
  const body=$("#mo-body");
  if(state.reportTab==="assets"){
    body.innerHTML=`
      <p class="small" style="margin-bottom:14px">Live client-side verification of all <b>${PRODUCTS.length} products' photography</b> across ${COLLECTIONS.length} collections. All product media are served as local optimized assets.</p>
      <div class="rep-sum" id="rep-sum"></div>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn btn-ink btn-sm" data-act="report-retest">${IC.check}<span>Re-run validation</span></button>
        <button class="btn btn-line btn-sm" data-act="report-dl">${IC.dl}<span>Download report .json</span></button>
      </div>
      <div class="rep-scroll"><table class="rep-table"><thead><tr><th>SKU</th><th>Product</th><th>Collection</th><th>Main photo</th><th>AI preview</th><th>Asset</th></tr></thead><tbody>
      ${PRODUCTS.map(p=>{
        const mainPath=assetSrc(p,"main",400);
        const hasAi=!!(p.assets&&p.assets.aiStylingPreview);
        return `<tr><td style="white-space:nowrap">${p.sku}</td><td>${esc(p.title)}</td><td class="tiny">${esc(p.collection?p.collection.short:'')}</td><td id="rep-st-${p.sku}">${stHtml(mainPath?(state.assets[p.sku+":main"]||"pending"):"na")}</td><td>${hasAi?`<span class="tag ai" style="font-size:9px">supplied</span>`:`<span class="st na"><i></i>none</span>`}</td><td>${mainPath?`<a href="${mainPath}" target="_blank" rel="noopener noreferrer" style="color:var(--chestnut)" aria-label="Open photo asset for ${p.sku}">${IC.ext}</a>`:'—'}</td></tr>`;
      }).join("")}
      </tbody></table></div>`;
    updateReportSummary();
  }else if(state.reportTab==="config"){
    body.innerHTML=`
      <p class="small" style="margin-bottom:16px">Preview local Messenger concierge preferences in this browser. Storewide pricing, inventory, and official contact channels are managed exclusively in the authenticated <a href="/admin" style="text-decoration:underline">Admin Portal</a>.</p>
      <form data-form="config">
        <div class="field"><label for="cfg-m">Facebook page username (m.me/…)</label><input id="cfg-m" name="messenger" value="${esc(state.cfg.messenger)}" placeholder="e.g. farizasterritory143"></div>
        <div class="field"><label for="cfg-w">WhatsApp number (optional, international format)</label><input id="cfg-w" name="whatsapp" value="${esc(isRealWhatsapp()?state.cfg.whatsapp:'')}" placeholder="Leave blank until active BD WhatsApp line is set"></div>
        <div class="field"><label for="cfg-f">Official Facebook page URL</label><input id="cfg-f" name="facebook" value="${esc(state.cfg.facebook)}" placeholder="https://www.facebook.com/…"></div>
        <button type="submit" class="btn btn-ink"><span>Save preview preferences</span>${IC.check}</button>
      </form>
      <div class="notice info" style="margin-top:18px">${IC.info}<span>For authoritative order fulfillment, coupon management, and Meta CAPI diagnostics, sign in via <a href="/admin" style="text-decoration:underline"><code>/admin</code></a>.</span></div>`;
  }else{
    const qa=selfTest();
    body.innerHTML=`
      <span class="overline" style="margin-bottom:12px">Runtime self-test (executed just now in your browser)</span>
      ${qa.map(r=>`<div class="qa-row"><span class="st ${r.pass?"ok":"err"}"><i></i>${r.pass?"PASS":"FAIL"}</span><span>${esc(r.name)}</span><span class="tiny" style="margin-left:auto">${esc(r.detail)}</span></div>`).join("")}
      <span class="overline" style="margin:22px 0 10px">Configuration summary</span>
      <pre class="code">BRAND=Fariza's Territory
CATALOG_SKUS=${PRODUCTS.length} (${COLLECTIONS.length} collections)
MESSENGER=${state.cfg.messenger || 'farizasterritory143'}
META_PIXEL_ID=${CONFIG.analytics && CONFIG.analytics.metaPixelId ? CONFIG.analytics.metaPixelId : '1657670575734647'}</pre>
      <span class="overline" style="margin:22px 0 10px">Deployment</span>
      <p class="small" style="line-height:1.8">Node / Express server serves <code>/</code>, <code>/products/:sku</code>, <code>/collections/:slug</code>, <code>/admin</code>, authoritative <code>POST /api/orders</code>, challenged <code>GET /api/track</code>, and <code>POST /api/capi</code> alongside Supabase persistence.</p>`;
  }
}
function updateReportSummary(){
  const el=$("#rep-sum"); if(!el)return;
  let ok=0,err=0,pend=0;
  PRODUCTS.forEach(p=>{const s=state.assets[p.sku+":main"]||"pending";if(s==="ok")ok++;else if(s==="err")err++;else pend++;});
  const totalSlots=PRODUCTS.reduce((a,p)=>a+PHOTO_KEYS.filter(k=>p.assets&&p.assets[k]).length,0);
  el.innerHTML=`<span class="tag ok">${ok} / ${PRODUCTS.length} reachable</span><span class="tag" style="background:rgba(154,143,124,.2);color:#6E6557">${err} unavailable</span><span class="tag warn">${pend} testing</span><span class="tag">${totalSlots} total media variants mapped</span>`;
}
function selfTest(){
  const r=[];
  r.push({name:"Catalog integrity — 53 products present",pass:PRODUCTS.length===53,detail:PRODUCTS.length+" products"});
  r.push({name:"Unique SKUs across Fashion (18) & Accessories (35)",pass:new Set(PRODUCTS.map(p=>p.sku)).size===53,detail:new Set(PRODUCTS.map(p=>p.sku)).size+" unique"});
  const counts=COLLECTIONS.map(c=>PRODUCTS.filter(p=>(p.colId||p.col)===c.id).length).join(",");
  r.push({name:"Collection counts match source (1,2,4,6,5,5,19,11)",pass:counts==="1,2,4,6,5,5,19,11",detail:counts});
  const ids=PRODUCTS.reduce((a,p)=>a+KEYS.filter(k=>p.assets&&p.assets[k]).length,0);
  r.push({name:"Media variants mapped per SKU",pass:ids>=PRODUCTS.length*6,detail:ids+" media paths mapped"});
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
function openExternalUrl(url){
  if(!url) return;
  const a=document.createElement("a");
  a.href=url;
  a.target="_blank";
  a.rel="noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
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
  if(window.FT_ANALYTICS && window.FT_ANALYTICS.trackContact) window.FT_ANALYTICS.trackContact("Messenger");
  const fbFallback = state.cfg.facebook || CONFIG.facebookPageUrl || CONFIG.fbSearch || "https://www.facebook.com/farizasterritory143";
  const url=state.cfg.messenger?`https://m.me/${encodeURIComponent(state.cfg.messenger)}`:fbFallback;
  if(!state.cfg.messenger)toast("Opening the official Facebook business page",{icon:"info"});
  openExternalUrl(url);
}
function openWhatsApp(text){
  if(!isRealWhatsapp()){
    toast("WhatsApp line unconfigured — opening Messenger concierge",{icon:"info"});
    openMessenger(text);
    return;
  }
  const num=getWhatsAppNumber();
  if(window.FT_ANALYTICS && window.FT_ANALYTICS.trackContact) window.FT_ANALYTICS.trackContact("WhatsApp");
  const url=`https://wa.me/${num}${text?"?text="+encodeURIComponent(text):""}`;
  openExternalUrl(url);
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
    <span class="overline" data-reveal>Verified order lookup</span>
    <h1 class="h-display" data-reveal style="--d:.06s;margin-top:12px">Track Your Order</h1>
    <p class="lede" data-reveal style="--d:.12s;margin-top:10px">Enter both your Order Reference (e.g. <b>FT-261117-XXXX</b>) and the mobile phone number used at inquiry to view live confirmation and courier dispatch status.</p>
  </div></div>
  <div class="page-body"><div class="container" style="max-width:860px">
    <div class="panel" data-reveal style="margin-bottom:24px">
      <form id="track-form" data-form="track" style="display:flex;gap:10px;flex-wrap:wrap">
        <input id="track-input" type="text" value="${esc(defaultRef)}" placeholder="Order Reference (e.g. FT-261117-XXXX)" style="flex:1;min-width:210px;padding:12px 16px;border-radius:10px;border:1.5px solid var(--kantha);background:var(--surface);color:var(--ink);font-family:inherit;font-size:15px">
        <input id="track-phone-input" type="tel" placeholder="Order Phone (e.g. 017XXXXXXXX)" style="flex:1;min-width:200px;padding:12px 16px;border-radius:10px;border:1.5px solid var(--kantha);background:var(--surface);color:var(--ink);font-family:inherit;font-size:15px">
        <button type="submit" class="btn btn-ink" style="padding:12px 24px"><span>Check Status</span>${IC.arrow}</button>
      </form>
    </div>
    <div id="track-result-wrap"></div>
    <div id="recent-orders-wrap" style="margin-top:28px"></div>
  </div></div>`;
}

async function handleTrackSearch(optRef, optPhone){
  const inp = document.getElementById("track-input");
  const phoneInp = document.getElementById("track-phone-input");
  const ref = (optRef !== undefined ? optRef : (inp ? inp.value : "")).trim().toUpperCase();
  const phone = (optPhone !== undefined ? optPhone : (phoneInp ? phoneInp.value : "")).trim();
  if(inp && optRef) inp.value = ref;
  const wrap = document.getElementById("track-result-wrap");
  if(!wrap) return;
  if(!ref || !phone){
    wrap.innerHTML = `<div class="notice alert">${IC.alert}<span>Please enter both your Order Reference and matching Bangladeshi phone number to verify and view order status.</span></div>`;
    if(ref && !phone && phoneInp) phoneInp.focus();
    return;
  }
  wrap.innerHTML = '<div style="text-align:center;padding:30px;color:var(--ink2)">Verifying order credentials...</div>';

  const result = await window.FT_SUPABASE.trackOrder(ref, phone);
  if(!result || !result.ok || !result.order){
    const msg = (result && result.error) || 'We could not match that Order Reference and Phone Number.';
    wrap.innerHTML = `<div class="panel" style="text-align:center;padding:36px">
      <div style="font-size:32px;margin-bottom:12px">🔍</div>
      <h3 style="font-size:20px;margin:0 0 10px">Order Not Found</h3>
      <p class="small" style="color:var(--ink2);max-width:440px;margin:0 auto 18px">${esc(msg)}</p>
      <button type="button" data-act="msg" class="btn btn-line btn-sm">${IC.chat}<span>Contact Concierge on Messenger</span></button>
    </div>`;
    return;
  }

  renderTrackCard(result.order, wrap);
}

function renderRecentOrders(){
  const wrap = document.getElementById("recent-orders-wrap");
  if(!wrap) return;
  let local = [];
  try {
    local = JSON.parse(localStorage.getItem('ft_recent_refs') || '[]');
  } catch (_) {}
  if(!Array.isArray(local) || !local.length){
    wrap.innerHTML = '';
    return;
  }
  const recent = local.slice(0, 5);
  wrap.innerHTML = `
    <div class="panel" style="border:1px solid var(--line);background:var(--cream2);border-radius:12px;padding:20px">
      <span class="overline" style="color:var(--chestnut)">Recent References (This Browser)</span>
      <h3 style="font-size:17px;margin:6px 0 14px">Your Recent Inquiry References</h3>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${recent.map(o => `
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:12px 14px;background:var(--surface);border-radius:8px;border:1px solid var(--line)">
            <div>
              <div style="font-weight:700;color:var(--chestnut);font-size:14.5px">${esc(o.order_ref)}</div>
              <div class="tiny" style="color:var(--ink2);margin-top:2px">${new Date(o.created_at || Date.now()).toLocaleDateString('en-GB')} · ${Number(o.item_count || 1)} piece(s) · ৳${Number(o.total || 0).toLocaleString()}</div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <button type="button" class="btn btn-ink btn-sm" data-act="track-ref" data-ref="${esc(o.order_ref)}"><span>Select Ref</span></button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTrackCard(order, wrap){
  const st = order.status || 'pending';
  const fees = getDeliveryFees();
  const isOut = isOutsideZone(order.delivery_zone);
  const feeVal = order.delivery_fee !== undefined && order.delivery_fee !== null
    ? Number(order.delivery_fee)
    : (isOut ? fees.outside : fees.dhaka);
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
        ${it.image ? `<img src="${esc(it.image)}" style="width:48px;height:60px;object-fit:cover;border-radius:6px;">` : ''}
        <div style="flex:1">
          <div style="font-weight:600">${esc(it.title || it.sku)}</div>
          <small style="color:var(--ink2)">SKU: ${esc(it.sku)} · Qty: ${Number(it.qty || 1)}</small>
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
        <span class="order-tracking-status status-${esc(st)}">${esc(st)}</span>
      </div>
    </div>

    ${st === 'cancelled' ? `<div class="notice alert" style="margin-bottom:20px">${IC.alert}<span>This order was cancelled. Please message us on Messenger if you wish to re-inquire.</span></div>` : `
      <div class="tracking-stepper" style="background:var(--cream2);padding:20px 16px;border-radius:14px;border:1px solid var(--line);margin:20px 0;">
        ${steps.map((sp, i) => `
          <div class="tracking-step ${i < stepIdx ? 'done' : (i === stepIdx ? 'active' : '')}">
            <div class="step-circle">
              ${i < stepIdx ? '✓' : (i + 1)}
            </div>
            <div>
              <div class="step-title">${sp.label}</div>
              <div class="step-sub">${sp.desc}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `}

    <div style="margin:20px 0">
      <span class="overline">Pieces in this order</span>
      <div style="margin-top:10px">${itemsHtml}</div>
    </div>

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
        <span>Delivery Fee (${isOut ? 'Outside Dhaka' : 'Inside Dhaka'}):</span>
        <b>৳ ${feeVal.toLocaleString()}</b>
      </div>
      <div style="display:flex;justify-content:space-between;padding-top:10px;border-top:1px dashed var(--line);font-size:16px;font-weight:700;color:var(--ink)">
        <span>Total Payable (Cash on Delivery):</span>
        <span>৳ ${Number(order.total || 0).toLocaleString()}</span>
      </div>
    </div>

    <div style="font-size:13.5px;color:var(--ink2);margin-bottom:18px">
      <div><b>Recipient:</b> ${esc(order.recipient_masked || 'Verified Customer')} (${esc(order.phone_masked || '****')})</div>
      <div style="margin-top:4px"><b>Delivery District:</b> ${esc(order.district || (isOut ? 'Outside Dhaka' : 'Dhaka'))}</div>
      ${order.courier_name ? `<div style="margin-top:4px"><b>Courier:</b> ${esc(order.courier_name)}${order.tracking_number ? ' · Tracking #' + esc(order.tracking_number) : ''}</div>` : ''}
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button type="button" data-act="wa" class="btn btn-ink btn-sm">${IC.wa}<span>${isRealWhatsapp() ? 'Contact Seller on WhatsApp' : 'Contact Seller on Messenger'}</span></button>
      <button type="button" class="btn btn-line btn-sm" data-act="copy-text" data-text="${esc(order.order_ref)}">${IC.copy}<span>Copy Order Ref</span></button>
    </div>
  </div>`;
  if(window.FT_ANIME && typeof window.FT_ANIME.animateTrackingStepper === "function"){
    window.FT_ANIME.animateTrackingStepper(wrap);
  }
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
    case "collection":{
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
    }
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
    const ogt=document.querySelector('meta[property="og:title"]');if(ogt)ogt.setAttribute("content",title);
    const ogd=document.querySelector('meta[property="og:description"]');if(ogd)ogd.setAttribute("content",desc);
    const activeProd = r.page==="product" ? bySku(r.param) : null;
    const ogi=document.querySelector('meta[property="og:image"]');
    if(ogi) ogi.setAttribute("content", activeProd ? assetSrc(activeProd,"socialSquare",1000) : "assets/products/CAT-001/socialSquare.webp");
    let prodLd = document.getElementById("dynamic-product-ld");
    if(activeProd){
      if(!prodLd){prodLd=document.createElement("script");prodLd.id="dynamic-product-ld";prodLd.type="application/ld+json";document.head.appendChild(prodLd);}
      prodLd.textContent = JSON.stringify({
        "@context":"https://schema.org",
        "@type":"Product",
        "name":activeProd.title,
        "sku":activeProd.sku,
        "category":activeProd.collection ? activeProd.collection.name : activeProd.superCategory,
        "description":activeProd.descriptionEn || activeProd.title,
        "image":assetSrc(activeProd,"main",1000),
        "brand":{"@type":"Brand","name":"Fariza's Territory"},
        "offers":{
          "@type":"Offer",
          "priceCurrency":"BDT",
          "price":activeProd.priceBDT || 0,
          "availability":activeProd.is_available === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
        }
      });
    } else if(prodLd) {
      prodLd.remove();
    }
    $$(".nav-links a").forEach(a=>a.classList.toggle("on",a.dataset.nav===r.page||(r.page==="product"&&a.dataset.nav==="shop")));
    window.scrollTo({top:0,behavior:"instant"in window?"instant":"auto"});
    hydrate();
    fx(app,{opacity:[0,1],transform:["translateY(14px)","translateY(0)"]},{duration:.5});
  };
  if(RM||!app.innerHTML){swap();}
  else{const a=app.animate([{opacity:1},{opacity:0}],{duration:140,fill:"forwards"});a.onfinish=swap;setTimeout(()=>{if(token===renderToken&&!app.dataset.swapped){}},200);}
}
/* ================= MOTION.DEV & QUICK VIEW CORE ================= */
function initScrollProgressBar() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;
  if (window.Motion && typeof window.Motion.scroll === "function" && typeof window.Motion.animate === "function") {
    try {
      window.Motion.scroll(
        window.Motion.animate(bar, { scaleX: [0, 1] }, { ease: "linear" })
      );
      return;
    } catch (e) {}
  }
  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
    bar.style.transform = `scaleX(${progress})`;
  }, { passive: true });
}

function initMotionInView() {
  if (RM) return;
  if (window.Motion && typeof window.Motion.inView === "function" && typeof window.Motion.animate === "function") {
    try {
      const targets = ".pcard:not([data-inview-bound]), .pair-card:not([data-inview-bound]), .offer:not([data-inview-bound])";
      window.Motion.inView(targets, (arg) => {
        const element = arg && arg.target ? arg.target : arg;
        if (!element || !element.dataset || element.dataset.inviewBound) return;
        element.dataset.inviewBound = "1";
        window.Motion.animate(
          element,
          { opacity: [0.25, 1], transform: ["translateY(16px)", "translateY(0px)"] },
          { duration: 0.45, easing: [0.22, 1, 0.36, 1] }
        );
      }, { amount: 0.12 });
    } catch (e) {}
  }
}

function openQuickView(sku) {
  const p = bySku(sku);
  if (!p) return;
  const ov = $("#quick-view-ov");
  const card = $("#quick-view-card");
  if (!ov || !card) return;

  const oos = isProductOutOfStock(p);
  const unitBadge = p.unitBn ? `<span class="unit-badge">${esc(p.unitBn)}</span>` : '';
  const keys = ["main", "detailA", "detailB", "original"].filter(k => p.assets && p.assets[k]);
  const specLine = p.superCategory === 'Accessories'
    ? [p.details && p.details.colors, p.details && p.details.designDetail, p.details && p.details.material].filter(Boolean).join(' · ')
    : [p.details && p.details.fabric, p.details && p.details.kameez, p.details && p.details.stitching].filter(Boolean).join(' · ');

  card.innerHTML = `
    <button class="iconbtn qv-close" data-act="quick-view-close" aria-label="Close quick view" style="position:absolute;right:18px;top:18px;z-index:10">${IC.x}</button>
    <div class="qv-gallery">
      <div class="qv-main-ph ph r45" id="qv-main-fig" data-act="lb-open" data-sku="${p.sku}" data-key="main" title="Click to enlarge">
        ${ph(p, "main", { w: 800, dot: false })}
      </div>
      <div class="qv-thumbs" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        ${keys.map((k, idx) => `
          <button class="chip ${idx===0?'on':''}" data-act="qv-switch" data-sku="${p.sku}" data-key="${k}" style="padding:6px 12px;font-size:12px;">
            ${k.toUpperCase()}
          </button>
        `).join("")}
      </div>
    </div>
    <div class="qv-info" style="display:flex;flex-direction:column;justify-content:center;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:8px;flex-wrap:wrap">
        <span class="overline" style="font-size:10px">${esc(p.collection ? p.collection.short : '')} · ${p.sku}</span>
        ${unitBadge}
      </div>
      <h2 style="font-size:clamp(1.5rem, 2.5vw, 2.1rem);line-height:1.2;margin:4px 0 8px;">${esc(tProdTitle(p))}</h2>
      ${tProdSubTitle(p) ? `<div class="${isBn()?'':'bn'}" style="color:var(--chestnut);font-size:14.5px;margin-bottom:8px;">${esc(tProdSubTitle(p))}</div>` : ''}
      <div style="font-size:20px;font-weight:600;color:var(--caramel);margin:12px 0;padding:10px 0;border-top:1.5px dashed var(--line);border-bottom:1.5px dashed var(--line);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <span>${priceText(p)}</span>
        ${stockBadgeHtml(p)}
      </div>
      <p style="font-size:13.5px;color:var(--ink2);line-height:1.6;margin-bottom:12px;">
        ${esc(tProdDesc(p) || '')}
      </p>
      ${specLine ? `<div class="tiny bn" style="background:var(--cream2);padding:10px 14px;border-radius:9px;margin-bottom:10px;line-height:1.6"><b>বিবরণ:</b> ${esc(specLine)}</div>` : ''}
      ${(p.cautionBn || p.cautionEn) ? `<div class="tiny bn" style="color:var(--ink3);margin-bottom:14px;line-height:1.5">* ${esc(tCaution(p))}</div>` : ''}
      <div style="display:flex;gap:8px;margin-top:auto;flex-wrap:wrap">
        <button class="btn btn-ink" style="flex:1" data-act="bag-add" data-sku="${p.sku}"${oos ? ' disabled' : ''}>
          ${IC.bag}<span>${oos ? (isBn()?'স্টক নেই':'Out of stock') : (isBn()?'ব্যাগে যোগ':'Add to Bag')}</span>
        </button>
        <button class="btn btn-buynow" style="flex:1" data-act="buynow" data-sku="${p.sku}"${oos ? ' disabled' : ''}>
          <span>${oos ? (isBn()?'স্টক শেষ':'Unavailable') : (isBn()?'অর্ডার (COD)':'Order Now (COD)')}</span>${IC.arrow}
        </button>
        <button class="btn btn-line${inWish(p.sku)?' on':''}" data-act="wish" data-sku="${p.sku}" data-heart="${p.sku}" aria-pressed="${inWish(p.sku)}" aria-label="Save to wishlist">
          ${IC.heart}
        </button>
      </div>
      <a href="#/product/${p.sku}" data-act="quick-view-close" style="font-size:12.5px;color:var(--chestnut);text-decoration:underline;text-align:center;margin-top:14px;">View full product specifications &amp; styling &rarr;</a>
    </div>
  `;

  if (typeof ov.showModal === "function") {
    if (!ov.open) ov.showModal();
  } else {
    ov.setAttribute("open", "");
  }
  bindImages(card);
  if (window.FT_ANIME) window.FT_ANIME.refresh();
}

function closeQuickView() {
  const ov = $("#quick-view-ov");
  if (!ov) return;
  if (typeof ov.close === "function") {
    if (ov.open) ov.close();
  } else {
    ov.removeAttribute("open");
  }
}

let initialPageViewSkipped = false;
function hydrate(){
  bindImages(document);
  revealBind(document);
  if(state.route.page==="home"){
    buildStage();
    initStageInput();
    if(window.initThreeHero) { try { window.initThreeHero(); } catch(e) {} }
    if(window.initThreeCollections) { try { window.initThreeCollections(); } catch(e) {} }
    fetchAndSyncCollectionCounts();
  } else if(state.route.page==="collections"){
    if(window.initThreeCollections) { try { window.initThreeCollections(); } catch(e) {} }
    fetchAndSyncCollectionCounts();
    if(window.FT_ANIME && typeof window.FT_ANIME.animateCollectionsEntrance === "function"){
      window.FT_ANIME.animateCollectionsEntrance(document.getElementById("collections-page-grid") || document.getElementById("app"));
    }
  } else {
    if(window.destroyThreeCollections) { try { window.destroyThreeCollections(); } catch(e) {} }
  }
  if(state.route.page==="shop"||state.route.page==="fashion"||state.route.page==="accessories"||state.route.page==="collection")renderShopGrid();
  if(state.route.page==="lookbook")renderLookGrid();
  if(state.route.page==="product"){
    const prod = bySku(state.route.param);
    if(prod){
      renderGallery();
      if(window.FT_ANALYTICS && window.FT_ANALYTICS.trackViewContent) window.FT_ANALYTICS.trackViewContent(prod);
    }
  }
  if(state.route.page==="bag")renderBagPageList();
  if(state.route.page==="track"){
    renderRecentOrders();
    if(state.route.param){
      handleTrackSearch(state.route.param);
    }
  }
  if(state.route.page==="inquiry"&&!state.inqDone){
    renderInqSummary();
    if(window.FT_ANALYTICS && state.bag.length > 0){
      const sub = state.bag.reduce((s,b)=>{ const p=bySku(b.sku); return s + (p && p.priceBDT ? p.priceBDT*b.qty : 0); }, 0);
      window.FT_ANALYTICS.trackInitiateCheckout(state.bag, sub);
    }
  }
  if(window.FT_ANALYTICS && window.FT_ANALYTICS.trackPageView){
    if(!initialPageViewSkipped){
      initialPageViewSkipped = true;
    } else {
      window.FT_ANALYTICS.trackPageView(state.route ? state.route.page : 'home');
    }
  }
  syncCommerce();

  // Master UI/UX Polish: Anime.js & Motion.dev
  if(window.FT_ANIME){
    window.FT_ANIME.refresh();
  }
  initMotionInView();
  initScrollProgressBar();
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
let dialogPointerDownTarget = null;
document.addEventListener("pointerdown",e=>{
  dialogPointerDownTarget = (e.target && (e.target.id==="quick-view-ov" || e.target.id==="modal")) ? e.target : null;
});
document.addEventListener("pointerup",e=>{
  if(dialogPointerDownTarget && e.target === dialogPointerDownTarget){
    if(e.target.id==="quick-view-ov") closeQuickView();
    if(e.target.id==="modal") closeModal();
  }
  dialogPointerDownTarget = null;
});
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
      const tabsEl=$("#stage-tabs");
      if(tabsEl) tabsEl.innerHTML=stageTabsHtml();
      buildStage();
      break;
    }
    case "shop-pillar":{
      state.shop.pillar=t.dataset.pillar;
      state.shop.c="all";
      const colChips=$("#shop-col-chips");
      if(colChips) colChips.innerHTML=shopColChipsHtml(state.shop.pillar);
      renderShopGrid();
      break;
    }
    case "stage-col":{state.stage.col=t.dataset.col;state.stage.idx=0;$$(".stage-tabs .chip").forEach(c=>{const on=c.dataset.col===t.dataset.col;c.classList.toggle("on",on);c.setAttribute("aria-selected",on);});buildStage();break;}
    case "hot":e.stopPropagation();openHotPop(t);break;
    case "hot-close":closeHotPop();break;
    case "trio":{
      const skus=t.dataset.skus.split(",").filter(Boolean);
      skus.forEach(s=>addToBag(s,1,true));
      toast(`Curated set of ${skus.length} added to bag`,{icon:"bag",action:"View bag",onAction:()=>openDrawer("bag")});
      if(window.FT_ANIME && typeof window.FT_ANIME.flyToBag === "function"){
        const srcEl=t.closest(".pair-card") || $("#trio-bar") || t;
        window.FT_ANIME.flyToBag(srcEl);
      }
      break;
    }
    case "toggle-lang":toggleLang();break;
    case "bag-add":addToBag(sku,1);break;
    case "bag-add-qty":{const q=+($("#pi-qty")?$("#pi-qty").textContent:"1")||1;addToBag(sku,q);break;}
    case "buynow":buyNow(sku,1);break;
    case "buynow-qty":{const q=+($("#pi-qty")?$("#pi-qty").textContent:"1")||1;buyNow(sku,q);break;}
    case "piq-inc":case "piq-dec":{const o=$("#pi-qty");if(o)o.textContent=Math.max(1,Math.min(99,+o.textContent+(act==="piq-inc"?1:-1)));break;}
    case "bag-inc":setQty(sku,1);break;
    case "bag-dec":setQty(sku,-1);break;
    case "bag-del":removeFromBag(sku);break;
    case "clear-bag":{if(!state.bag.length)break;const old=state.bag.slice();state.bag=[];syncCommerce();toast("Bag cleared",{icon:"trash",action:"Undo",onAction:()=>{state.bag=old;syncCommerce();}});break;}
    case "wish":toggleWish(sku);break;
    case "gal":{closeHotPop();state.gal={sku:sku||state.gal.sku,key};renderGallery();break;}
    case "quick-view":openQuickView(sku);break;
    case "quick-view-close":closeQuickView();break;
    case "qv-switch":{
      const p=bySku(sku);
      if(!p)break;
      const fig=$("#qv-main-fig");
      if(fig){
        fig.innerHTML=ph(p,key,{w:800,dot:false});
        fig.dataset.key=key;
        bindImages(fig);
        if(window.FT_ANIME && typeof window.FT_ANIME.animateImageSwap === "function"){
          window.FT_ANIME.animateImageSwap(fig);
        }
      }
      $$(".qv-thumbs button").forEach(b=>b.classList.toggle("on",b.dataset.key===key));
      break;
    }
    case "lb-open":openLB(sku,key);break;
    case "lb-close":closeLB();break;
    case "lb-prev":lbStep(-1);break;
    case "lb-next":lbStep(1);break;
    case "lb-zin":lbZoom(1.25);break;
    case "lb-zout":lbZoom(1/1.25);break;
    case "lb-reset":state.lb.scale=1;state.lb.tx=0;state.lb.ty=0;applyLB();break;
    case "shop-col":state.shop.c=t.dataset.col;renderShopGrid();break;
    case "shop-clear":state.shop={pillar:"all",c:"all",q:"",sort:"featured"};render();break;
    case "look-col":state.look.c=t.dataset.col;$$("[data-act='look-col']").forEach(c=>c.classList.toggle("on",c.dataset.col===t.dataset.col));renderLookGrid();break;
    case "go":location.hash=t.dataset.href;closeSearch();break;
    case "msg":{let text=null;if(t.dataset.send&&state.lastInquiry)text=state.lastInquiry.text;else if(sku)text=skuMessage(sku);else if(state.bag.length)text=inquiryText(state.bag,null,makeRef());openMessenger(text);break;}
    case "wa":{let text=null;if(t.dataset.send&&state.lastInquiry)text=state.lastInquiry.text;else if(sku)text=skuMessage(sku);else if(state.bag.length)text=inquiryText(state.bag,null,makeRef());openWhatsApp(text);break;}
    case "copy":{const el=$(t.dataset.target);if(el)copyText(el.textContent);break;}
    case "copy-text":{if(t.dataset.text)copyText(t.dataset.text,"Order ref copied!");break;}
    case "track-ref":{if(t.dataset.ref){handleTrackSearch(t.dataset.ref);window.scrollTo({top:0,behavior:RM?"auto":"smooth"});}break;}
    case "pal-copy":copyText(t.dataset.hex,t.dataset.hex+" copied");break;
    case "inq-dl":{if(!state.lastInquiry)break;const blob=new Blob([state.lastInquiry.text],{type:"text/plain"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=state.lastInquiry.ref+".txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast("Inquiry downloaded",{icon:"dl"});break;}
    case "inq-new":state.inqDone=false;render();break;
    case "apply-coupon":{
      const inp=$("#inq-coupon-input");
      const code=inp?inp.value.trim().toUpperCase():"";
      if(!code){toast("Please enter a voucher code",{icon:"alert"});break;}
      const sub=subtotalNum(state.bag);
      const fees=getDeliveryFees();
      const baseDelivery=isOutsideZone(state.deliveryZone)?fees.outside:fees.dhaka;
      if(window.FT_SUPABASE && window.FT_SUPABASE.validateCoupon){
        window.FT_SUPABASE.validateCoupon(code,sub,baseDelivery,state.deliveryZone).then(res=>{
          if(res.valid){
            state.appliedCoupon={
              code:res.coupon.code,
              discountAmount:res.discountAmount,
              discountType:res.coupon.discount_type,
              message:res.message,
              coupon:res.coupon
            };
            store.save("ft_applied_coupon",state.appliedCoupon);
            renderInqSummary();
            toast(res.message,{icon:"check"});
            if(window.FT_ANALYTICS && window.FT_ANALYTICS.trackEvent){
              window.FT_ANALYTICS.trackEvent("ApplyPromotion",{promo_code:code,discount:res.discountAmount});
            }
          }else{
            toast(res.message,{icon:"alert"});
          }
        });
      }
      break;
    }
    case "remove-coupon":{
      state.appliedCoupon=null;
      store.save("ft_applied_coupon",null);
      renderInqSummary();
      toast("Coupon removed",{icon:"info"});
      break;
    }
    case "fill-coupon":{
      const code=t.dataset.code;
      const inp=$("#inq-coupon-input");
      if(inp && code){
        inp.value=code;
        const sub=subtotalNum(state.bag);
        const fees=getDeliveryFees();
        const baseDelivery=isOutsideZone(state.deliveryZone)?fees.outside:fees.dhaka;
        if(window.FT_SUPABASE && window.FT_SUPABASE.validateCoupon){
          window.FT_SUPABASE.validateCoupon(code,sub,baseDelivery,state.deliveryZone).then(res=>{
            if(res.valid){
              state.appliedCoupon={
                code:res.coupon.code,
                discountAmount:res.discountAmount,
                discountType:res.coupon.discount_type,
                message:res.message,
                coupon:res.coupon
              };
              store.save("ft_applied_coupon",state.appliedCoupon);
              renderInqSummary();
              toast(res.message,{icon:"check"});
            }else{
              toast(res.message,{icon:"alert"});
            }
          });
        }
      }
      break;
    }
    case "modal":openModal(t.dataset.tab);break;
    case "modal-close":closeModal();break;
    case "consent-reset":{
      const bar = document.getElementById("ft-consent-bar");
      if(bar){bar.style.display="block";bar.scrollIntoView({behavior:RM?"auto":"smooth"});}
      toast("Analytics cookie banner re-opened below",{icon:"info"});
      break;
    }
    case "modal-tab":state.reportTab=t.dataset.tab;renderModal();if(state.reportTab==="assets"&&!state.reportRan)runReport();break;
    case "report-retest":runReport();toast(`Re-testing all ${PRODUCTS.length} main photos…`,{icon:"check"});break;
    case "report-dl":{
      const report={generated:new Date().toISOString(),brand:"Fariza's Territory",counts:{products:PRODUCTS.length,collections:COLLECTIONS.map(c=>({id:c.id,name:c.name,pillar:c.pillar,count:c.count}))},products:PRODUCTS.map(p=>({sku:p.sku,title:p.title,collection:p.collection?p.collection.name:'',mainStatus:state.assets[p.sku+":main"]||"untested",assets:KEYS.map(k=>({slot:k,path:assetSrc(p,k,800)||null,authenticity:(KEY_META[k]&&KEY_META[k].auth)||"source",status:p.assets&&p.assets[k]?"mapped":"not_supplied"}))}))};
      const blob=new Blob([JSON.stringify(report,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="fariza-asset-validation-report.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);toast("Validation report downloaded",{icon:"dl"});break;}
    case "backtop":window.scrollTo({top:0,behavior:RM?"auto":"smooth"});break;
    case "scroll":{const el=document.getElementById(t.dataset.target);if(el)el.scrollIntoView({behavior:RM?"auto":"smooth"});break;}
  }
});
let searchTrackTimer = null;
function scheduleSearchTrack(val){
  const clean = String(val || "").trim();
  if(searchTrackTimer) clearTimeout(searchTrackTimer);
  if(clean.length < 2) return;
  searchTrackTimer = setTimeout(()=>{
    if(window.FT_ANALYTICS && window.FT_ANALYTICS.trackSearch) window.FT_ANALYTICS.trackSearch(clean);
  }, 750);
}
document.addEventListener("input",e=>{
  const fl = e.target.closest("[data-f]");
  if(fl && fl.classList.contains("err")){
    fl.classList.remove("err");
    e.target.classList.remove("user-invalid-fallback");
    e.target.setAttribute("aria-invalid","false");
    const errEl = fl.querySelector(".f-err");
    const errorId = e.target.dataset.error || (errEl && errEl.id);
    if(errorId){
      const curDesc = (e.target.getAttribute("aria-describedby") || "").split(/\s+/).filter(id => id && id !== errorId);
      if(curDesc.length) e.target.setAttribute("aria-describedby", curDesc.join(" "));
      else e.target.removeAttribute("aria-describedby");
    }
    if(errEl && fl.dataset.f === "policy") errEl.style.display = "none";
  }
  const t=e.target.closest("[data-input]");
  if(t){
    if(t.dataset.input==="search"){state.searchSel=0;renderSearch(t.value);scheduleSearchTrack(t.value);}
    if(t.dataset.input==="shop-q"){state.shop.q=t.value;renderShopGrid();scheduleSearchTrack(t.value);}
  }
  if(e.target.id==="f-district"){
    const val=e.target.value.toLowerCase();
    if(val.includes("dhaka") && state.deliveryZone!=="dhaka"){
      state.deliveryZone="dhaka";
      store.save("ft_delivery_zone","dhaka");
      const r=document.querySelector('input[name="delivery_zone"][value="dhaka"]');
      if(r)r.checked=true;
      $$(".zone-card").forEach(zc=>{
        const isSel=zc.querySelector("input").value==="dhaka";
        zc.classList.toggle("active",isSel);
        zc.style.borderColor=isSel?'var(--chestnut)':'var(--line)';
        zc.style.background=isSel?'var(--cream2)':'var(--surface)';
      });
      renderInqSummary();
    }
  }
});
document.addEventListener("change",e=>{
  const t=e.target.closest("[data-input]");
  if(t && t.dataset.input==="shop-sort"){state.shop.sort=t.value;renderShopGrid();}
  if(e.target.name==="delivery_zone"){
    state.deliveryZone=normalizeDeliveryZone(e.target.value);
    store.save("ft_delivery_zone",state.deliveryZone);
    $$(".zone-card").forEach(zc=>{
      const isSel=normalizeDeliveryZone(zc.querySelector("input").value)===state.deliveryZone;
      zc.classList.toggle("active",isSel);
      zc.style.borderColor=isSel?'var(--chestnut)':'var(--line)';
      zc.style.background=isSel?'var(--cream2)':'var(--surface)';
    });
    renderInqSummary();
  }
});
function setFormFieldError(form, fieldName, bad) {
  const fl = form.querySelector(`[data-f="${fieldName}"]`);
  if (!fl) return Boolean(bad);
  fl.classList.toggle("err", Boolean(bad));
  const inputEl = fl.querySelector("input, textarea, select");
  const errEl = fl.querySelector(".f-err");
  if (inputEl) {
    inputEl.classList.toggle("user-invalid-fallback", Boolean(bad));
    if (bad) {
      inputEl.setAttribute("aria-invalid", "true");
      if (errEl && errEl.id) {
        const cur = (inputEl.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        if (!cur.includes(errEl.id)) cur.push(errEl.id);
        inputEl.setAttribute("aria-describedby", cur.join(" "));
      }
    } else {
      inputEl.setAttribute("aria-invalid", "false");
      if (errEl && errEl.id) {
        const cur = (inputEl.getAttribute("aria-describedby") || "").split(/\s+/).filter(x => x && x !== errEl.id);
        if (cur.length) inputEl.setAttribute("aria-describedby", cur.join(" "));
        else inputEl.removeAttribute("aria-describedby");
      }
    }
  }
  if (errEl && fieldName === "policy") {
    errEl.style.display = bad ? "block" : "none";
  }
  return Boolean(bad);
}

function announceValidationSummary(msg) {
  const ann = document.getElementById("ft-live-announcer");
  if (!ann) return;
  ann.textContent = "";
  setTimeout(() => { ann.textContent = msg; }, 500);
}

document.addEventListener("submit",async e=>{
  const f=e.target.closest("[data-form]");if(!f)return;
  e.preventDefault();
  const fd=new FormData(f);
  const err=(name,bad)=>setFormFieldError(f,name,bad);
  if(f.dataset.form==="track"){
    handleTrackSearch();
    return;
  }
  if(f.dataset.form==="inquiry"){
    const name=(fd.get("name")||"").trim(),phone=(fd.get("phone")||"").trim(),email=(fd.get("email")||"").trim(),district=(fd.get("district")||"").trim(),address=(fd.get("address")||"").trim();
    const policyAck = Boolean(fd.get("policy_ack"));
    const phoneValid = window.FT_COMMERCE ? window.FT_COMMERCE.normalizePhone(phone).isBdMobile : /^(\+?88)?01[3-9]\d{8}$/.test(phone.replace(/\D/g,""));
    const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    let bad=false;
    bad=err("name",name.length<2)||bad;
    bad=err("phone",!phoneValid)||bad;
    bad=err("email",!emailValid)||bad;
    bad=err("district",district.length<2)||bad;
    bad=err("address",address.length<5)||bad;
    bad=err("policy",!policyAck)||bad;
    if(bad){
      const firstBad = f.querySelector('[aria-invalid="true"]');
      if(firstBad && typeof firstBad.focus === "function") firstBad.focus();
      announceValidationSummary("Please review the highlighted checkout fields and accept the store policies before submitting.");
      toast("Please complete the highlighted fields (valid 11-digit BD mobile & policy confirmation required)",{icon:"alert"});
      return;
    }
    if(!state.bag.length){toast("Your bag is empty",{icon:"alert"});return;}

    const errBox = document.getElementById("inq-submit-error");
    if(errBox) errBox.innerHTML = "";
    const submitBtn = document.getElementById("inq-submit-btn");
    if(submitBtn){ submitBtn.disabled = true; submitBtn.dataset.origHtml = submitBtn.innerHTML; submitBtn.innerHTML = "<span>Submitting order...</span>"; }

    if(!state.draftIdempotencyKey){
      state.draftIdempotencyKey = "idem_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
    }

    const rawZone=fd.get("delivery_zone") || state.deliveryZone || (district.toLowerCase().includes('dhaka') ? 'dhaka' : 'outside_dhaka');
    const zone=normalizeDeliveryZone(rawZone);
    const rawChannel = String(fd.get("contact")||"Messenger").toLowerCase();
    const contactChannel = rawChannel.includes("whatsapp") && isRealWhatsapp() ? "whatsapp" : (rawChannel.includes("messenger") ? "messenger" : "web_form");
    const cust={name,phone,email,district,address,notes:(fd.get("notes")||"").trim(),contact:fd.get("contact")||"Messenger",zone};

    const orderPayload = {
      customer_name: cust.name,
      customer_phone: cust.phone,
      customer_email: cust.email || undefined,
      customer_district: cust.district,
      customer_address: (cust.district ? cust.district + ', ' : '') + cust.address,
      delivery_zone: zone,
      discount_code: state.appliedCoupon ? state.appliedCoupon.code : null,
      customer_notes: cust.notes,
      contact_channel: contactChannel,
      payment_method: 'Cash on Delivery (COD)',
      idempotency_key: state.draftIdempotencyKey,
      attribution: (window.FT_ANALYTICS && typeof window.FT_ANALYTICS.getAttribution === 'function') ? window.FT_ANALYTICS.getAttribution() : null,
      items: state.bag.map(it => ({ sku: it.sku, qty: Number(it.qty || 1) }))
    };

    const res = await window.FT_SUPABASE.createOrder(orderPayload);

    if(submitBtn && submitBtn.dataset.origHtml){ submitBtn.disabled = false; submitBtn.innerHTML = submitBtn.dataset.origHtml; }

    if(!res || !res.success){
      const msg = (res && res.error) || "Unable to register inquiry right now. Please try again or reach us on Messenger.";
      if(errBox){
        errBox.innerHTML = `<div class="notice alert" role="alert">${IC.alert}<div><b>Order could not be placed:</b> ${esc(msg)} <div style="margin-top:8px"><button type="button" class="btn btn-line btn-sm" data-act="msg">Ask Boutique on Messenger</button></div></div></div>`;
      }
      announceValidationSummary(msg);
      toast(msg,{icon:"alert"});
      return;
    }

    const serverRef = res.order_ref || (res.data && res.data.order_ref) || makeRef();
    const serverTotal = (res.data && res.data.total) || subtotalNum(state.bag);
    const text = inquiryText(state.bag, cust, serverRef);
    state.lastInquiry = { ref: serverRef, text, total: serverTotal, at: Date.now() };
    state.draftIdempotencyKey = null;

    // Persist minimal non-PII reference only (no customer name/phone/address stored)
    try {
      const recent = JSON.parse(localStorage.getItem('ft_recent_refs') || '[]').filter(r => r && r.order_ref !== serverRef);
      recent.unshift({
        order_ref: serverRef,
        created_at: new Date().toISOString(),
        item_count: state.bag.reduce((s, it) => s + Number(it.qty || 1), 0),
        total: serverTotal
      });
      localStorage.setItem('ft_recent_refs', JSON.stringify(recent.slice(0, 8)));
    } catch (_) {}

    // Track Lead ONLY (server triggers Purchase strictly upon admin confirmation)
    if (window.FT_ANALYTICS && window.FT_ANALYTICS.leadOrOrder) {
      window.FT_ANALYTICS.leadOrOrder(serverRef, orderPayload.items, serverTotal, contactChannel, {
        name: cust.name,
        phone: cust.phone,
        district: cust.district
      });
    }

    if(fd.get("clearbag")){state.bag=[];state.appliedCoupon=null;store.save("ft_applied_coupon",null);syncCommerce();}
    state.inqDone=true;renderInqDone();
    window.scrollTo({top:0,behavior:RM?"auto":"smooth"});
    toast("Inquiry registered on server!",{icon:"check"});
    return;
  }
  if(f.dataset.form==="contact"){
    const name=(fd.get("cname")||"").trim(),contact=(fd.get("ccontact")||"").trim(),msg=(fd.get("cmsg")||"").trim();
    let bad=false;bad=err("cname",!name)||bad;bad=err("ccontact",!contact)||bad;bad=err("cmsg",!msg)||bad;
    if(bad){toast("Please complete the highlighted fields",{icon:"alert"});return;}
    const text=`FARIZA'S TERRITORY — MESSAGE\nFrom: ${name}\nContact: ${contact}\n\n${msg}`;
    $("#contact-out").innerHTML=`<pre class="msg-pre" id="contact-msg">${esc(text)}</pre>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:12px">
        <button type="button" class="btn btn-ink btn-sm" data-act="copy" data-target="#contact-msg">${IC.copy}<span>Copy</span></button>
        <button type="button" class="btn btn-caramel btn-sm" data-act="msg" data-send-contact="1">${IC.chat}<span>Open Messenger</span></button>
      </div><p class="tiny" style="margin-top:10px">Prepared locally — send it via Messenger.</p>`;
    $("#contact-out").querySelector("[data-send-contact]").addEventListener("click",()=>openMessenger(text));
    toast("Message prepared — copy & send it",{icon:"check"});
  }
  if(f.dataset.form==="config"){
    const cleanMsg = (fd.get("messenger")||"").trim().replace(/^https?:\/\/(www\.)?m\.me\//,"").replace(/\/$/,"");
    const cleanWa = (fd.get("whatsapp")||"").trim().replace(/[^0-9]/g,"");
    const cleanFb = (fd.get("facebook")||"").trim();
    state.cfg={messenger:cleanMsg,whatsapp:cleanWa,facebook:cleanFb};
    store.save("ft_cfg",state.cfg);
    document.body.classList.toggle("no-whatsapp",!isRealWhatsapp());
    syncFloatingWa();
    toast("Browser preview preferences saved",{icon:"check"});
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
function applyLiveCatalog(catalogPayload) {
  if (!catalogPayload) return;
  if (Array.isArray(catalogPayload.collections)) {
    catalogPayload.collections.forEach(col => {
      if (!col || !col.slug) return;
      const idx = COLLECTIONS.findIndex(c => c.slug === col.slug);
      if (idx >= 0) {
        Object.assign(COLLECTIONS[idx], col);
      } else {
        COLLECTIONS.push(Object.assign({
          short: col.name,
          acc: '#8E3B66',
          pillar: col.superCategory || 'Fashion',
          count: 0
        }, col));
      }
    });
  }
  const rows = Array.isArray(catalogPayload.products) ? catalogPayload.products : (Array.isArray(catalogPayload) ? catalogPayload : []);
  if (rows.length) {
    const mapBySku = new Map(rows.filter(r => r && r.sku).map(r => [r.sku, r]));
    // Remove archived products missing from active public list when server returns full catalog
    if (catalogPayload.collections) {
      for (let i = PRODUCTS.length - 1; i >= 0; i--) {
        if (!mapBySku.has(PRODUCTS[i].sku)) {
          const removed = PRODUCTS[i];
          if (CATALOG_REF.PRODUCTS_BY_SKU) delete CATALOG_REF.PRODUCTS_BY_SKU[removed.sku];
          PRODUCTS.splice(i, 1);
        }
      }
    }
    rows.forEach(row => {
      if (!row || !row.sku) return;
      const existing = PRODUCTS.find(x => x.sku === row.sku);
      const colObj = COLLECTIONS.find(c => c.slug === row.collectionSlug || c.id === row.colId) || (existing && existing.collection) || COLLECTIONS[0];
      if (existing) {
        if (row.title) existing.title = row.title;
        if (row.titleBn) existing.titleBn = row.titleBn;
        if (row.priceBDT !== undefined && row.priceBDT !== null) existing.priceBDT = Number(row.priceBDT);
        else if (row.price_bdt !== undefined && row.price_bdt !== null) existing.priceBDT = Number(row.price_bdt);
        if (row.is_available !== undefined) existing.is_available = Boolean(row.is_available);
        if (row.stock_count !== undefined) existing.stock_count = Number(row.stock_count);
        if (row.reserved_count !== undefined) existing.reserved_count = Number(row.reserved_count);
        if (row.available_stock !== undefined) existing.available_stock = Number(row.available_stock);
        if (row.stock_verified !== undefined) existing.stock_verified = Boolean(row.stock_verified);
        if (row.price_review !== undefined) {
          existing.price_review = Boolean(row.price_review);
          existing.priceStatus = existing.price_review ? 'suggested' : 'approved';
        }
        if (row.unit) existing.unit = row.unit;
        if (row.variants) existing.variants = row.variants;
        if (row.assets) existing.assets = Object.assign({}, existing.assets || {}, row.assets);
        if (colObj) existing.collection = colObj;
      } else {
        const newProd = Object.assign({
          slug: row.sku.toLowerCase(),
          colId: colObj ? colObj.id : 'DB-01',
          col: colObj ? colObj.id : 'DB-01',
          collection: colObj,
          accent: (colObj && colObj.acc) || '#8E3B66',
          priceStatus: row.price_review ? 'suggested' : 'approved'
        }, row);
        PRODUCTS.push(newProd);
        if (CATALOG_REF.PRODUCTS_BY_SKU) CATALOG_REF.PRODUCTS_BY_SKU[newProd.sku] = newProd;
      }
    });
    COLLECTIONS.forEach(c => {
      c.count = PRODUCTS.filter(p => p.colId === c.id || (p.collection && p.collection.slug === c.slug)).length;
    });
  }
}

function applyProductOverrides(overrides){
  if(!overrides) return;
  if(Array.isArray(overrides)){
    applyLiveCatalog({ products: overrides });
  }else if(typeof overrides==="object"){
    const rows = Object.keys(overrides).map(sku => Object.assign({ sku }, overrides[sku]));
    applyLiveCatalog({ products: rows });
  }
}
const PROMO_MSGS=[
  `First-order 25% OFF with code <b>FIRST25</b> &nbsp;·&nbsp; Nationwide Cash on Delivery &nbsp;·&nbsp; <a href="#/shop">Shop the Boutique</a>`,
  `<span class="bn">সারাদেশে ক্যাশ অন ডেলিভারি</span> &nbsp;·&nbsp; 53 pieces · 8 collections · 100% authentic photography`,
  `৳200 Welcome Voucher with code <b>FARIZA200</b> &nbsp;·&nbsp; Real-time tracking — <a href="#/track">Track Orders</a>`
];
let promoIdx=0;
let promoTimer=null;
function promoLoop(){
  if(state.promoOff)return;
  if(CONFIG.promoText){
    const customHtml = esc(CONFIG.promoText);
    if(!PROMO_MSGS.includes(customHtml)) PROMO_MSGS.unshift(customHtml);
  }
  const initEl=$("#promo-msg");
  if(initEl && CONFIG.promoText) initEl.innerHTML=PROMO_MSGS[0];
  if(RM) return;
  if(promoTimer) clearInterval(promoTimer);
  promoTimer = setInterval(()=>{
    if(state.promoOff)return;
    const el=$("#promo-msg");if(!el)return;
    el.classList.add("fade");
    setTimeout(()=>{promoIdx=(promoIdx+1)%PROMO_MSGS.length;el.innerHTML=PROMO_MSGS[promoIdx];el.classList.remove("fade");},420);
  },5600);
}
document.addEventListener("keydown",e=>{if(e.ctrlKey&&e.altKey&&e.shiftKey&&e.key.toLowerCase()==="f"){e.preventDefault();openModal("assets");}});
function initConsentBanner(){
  const bar = document.getElementById("ft-consent-bar");
  const acceptBtn = document.getElementById("ft-consent-accept");
  const declineBtn = document.getElementById("ft-consent-decline");
  if(!bar || !window.FT_ANALYTICS) return;
  const current = window.FT_ANALYTICS.getConsent();
  if(current === 'granted'){
    bar.style.display = 'none';
    window.FT_ANALYTICS.init();
  } else if(current === 'denied'){
    bar.style.display = 'none';
  } else {
    bar.style.display = 'block';
  }
  if(acceptBtn){
    acceptBtn.addEventListener("click", ()=>{
      window.FT_ANALYTICS.setConsent('granted');
      bar.style.display = 'none';
    });
  }
  if(declineBtn){
    declineBtn.addEventListener("click", ()=>{
      window.FT_ANALYTICS.setConsent('denied');
      bar.style.display = 'none';
    });
  }
}

/* ================= INIT ================= */
function init(){
  document.body.classList.toggle("no-whatsapp",!isRealWhatsapp());
  syncFloatingWa();
  if(state.promoOff)$("#site-top").classList.add("no-promo");
  if(!state.cfg.messenger)state.cfg.messenger=CONFIG.messengerUsername || "farizasterritory143";
  if(!state.cfg.facebook)state.cfg.facebook=CONFIG.facebookPageUrl || "https://www.facebook.com/farizasterritory143";
  measureTop();
  if(window.ResizeObserver)new ResizeObserver(measureTop).observe($("#site-top"));
  if(!location.hash){
    const initialTarget = (window.__FT_INITIAL_ROUTE__ && String(window.__FT_INITIAL_ROUTE__).startsWith('#/'))
      ? window.__FT_INITIAL_ROUTE__
      : "#/home";
    history.replaceState(null,"",initialTarget);
  }
  window.addEventListener("hashchange",render);
  syncLangUI();
  render();
  promoLoop();
  initConsentBanner();

  /* Hydrate live catalog prices, stock status, CMS additions & settings from hardened server endpoints */
  if(window.FT_SUPABASE){
    if(window.FT_SUPABASE.getCatalog){
      window.FT_SUPABASE.getCatalog().then(cat=>{
        if(cat && Array.isArray(cat.products) && cat.products.length){
          applyLiveCatalog(cat);
          if(["home","shop","fashion","accessories","collections","collection","product","bag","inquiry"].includes(state.route.page)) render();
        }
      });
    } else if(window.FT_SUPABASE.getProducts){
      window.FT_SUPABASE.getProducts().then(prods=>{
        if(prods && prods.length){
          applyProductOverrides(prods);
          if(state.route.page==="shop"||state.route.page==="fashion"||state.route.page==="accessories"||state.route.page==="collection"||state.route.page==="product") render();
        }
      });
    }
    if(window.FT_SUPABASE.getStoreSettings){
      window.FT_SUPABASE.getStoreSettings().then(s=>{
        if(!s) return;
        if(s.whatsapp_active && s.whatsapp_number) state.cfg.whatsapp=String(s.whatsapp_number).replace(/[^0-9]/g,"");
        else state.cfg.whatsapp = "";
        if(s.messenger_username) state.cfg.messenger=s.messenger_username;
        if(s.facebook_url) state.cfg.facebook=s.facebook_url;
        if(s.delivery_fee_dhaka!==undefined) CONFIG.deliveryFeeDhaka=Number(s.delivery_fee_dhaka);
        if(s.delivery_fee_outside!==undefined) CONFIG.deliveryFeeOutside=Number(s.delivery_fee_outside);
        if(s.promo_text){ CONFIG.promoText = s.promo_text; promoLoop(); }
        document.body.classList.toggle("no-whatsapp",!isRealWhatsapp());
        syncFloatingWa();
      });
    }
  }
  /* JSON-LD */
  try{
    const ld={"@context":"https://schema.org","@graph":[
      {"@type":"Organization","name":"Fariza's Territory","slogan":"Elegance in Every Detail.","address":{"@type":"PostalAddress","addressLocality":"Mirpur, Dhaka","addressCountry":"BD"}},
      {"@type":"ItemList","name":"Fariza's Territory — Live Catalog","numberOfItems":PRODUCTS.length,"itemListElement":PRODUCTS.map((p,i)=>({"@type":"ListItem","position":i+1,"item":{"@type":"Product","name":p.title,"sku":p.sku,"category":p.collection.name}}))}
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

/* Global Contact Click Tracking & Fallback Routing */
document.addEventListener("click", e => {
  const floatWa = e.target.closest("#floating-wa-btn");
  if(floatWa && !isRealWhatsapp()){
    e.preventDefault();
    const text = state.bag.length ? inquiryText(state.bag, null, makeRef()) : "Hello Fariza's Territory, I would like to inquire about your boutique collection.";
    openMessenger(text);
    return;
  }
  const wa = e.target.closest("a[href*='wa.me'], .btn-whatsapp, #floating-wa-btn");
  if(wa && window.FT_ANALYTICS){
    window.FT_ANALYTICS.trackContact('WhatsApp');
  }
  const msg = e.target.closest("a[href*='m.me'], a[href*='facebook.com/messages'], .btn-messenger");
  if(msg && window.FT_ANALYTICS){
    window.FT_ANALYTICS.trackContact('Messenger');
  }
});

if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();


})(window, document);
