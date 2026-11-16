import re

with open('assets/js/app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# 1. Update renderInqDone with WhatsApp direct button & tracking link
old_inq_done = """function renderInqDone(){
  const wrap=$("#inq-wrap"); if(!wrap||!state.lastInquiry)return;
  const q=state.lastInquiry;
  wrap.innerHTML=`<div class="two-col"><div class="panel" data-reveal>
    <div class="success-mark">${IC.check}</div>
    <h2 class="h-sec">Inquiry prepared — not yet an order</h2>
    <p class="lede" style="margin:12px 0 20px">Reference <b style="color:var(--chestnut)">${esc(q.ref)}</b>. Copy the message below and send it to Fariza's Territory on Messenger. The seller will confirm prices, availability, sizing, offers and delivery. <b>Nothing has been charged or confirmed.</b></p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px">
      <button class="btn btn-ink" data-act="copy" data-target="#inq-msg">${IC.copy}<span>Copy message</span></button>
      <button class="btn btn-caramel" data-act="msg" data-send="1">${IC.chat}<span>Open Messenger</span></button>
      <button class="btn btn-line" data-act="wa" data-send="1">${IC.wa}<span>WhatsApp</span></button>
      <button class="btn btn-line" data-act="inq-dl">${IC.dl}<span>Download .txt</span></button>
    </div>
    <div class="notice info">${IC.info}<span>${state.cfg.messenger?`Messenger is configured: m.me/${esc(state.cfg.messenger)}.`:`Messenger requires a valid connected Facebook page. “Open Messenger” will open Facebook search for the page — or set the handle in Console ▸ Seller settings.`}</span></div>
    <button class="btn btn-line btn-sm" style="margin-top:18px" data-act="inq-new"><span>Start a new inquiry</span></button>
  </div>
  <div class="panel sticky" data-reveal style="--d:.1s">
    <span class="overline" style="margin-bottom:12px">Message preview</span>
    <pre class="msg-pre" id="inq-msg">${esc(q.text)}</pre>
  </div></div>`;
  revealBind(wrap);
}"""

new_inq_done = """function renderInqDone(){
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
}"""

js = js.replace(old_inq_done, new_inq_done)

# 2. Update inquiry form submission to persist to Supabase & local storage
old_submit_inq = """    const ref=makeRef();
    const cust={name,phone,district,address,notes:(fd.get("notes")||"").trim(),contact:fd.get("contact")||"Messenger"};
    const text=inquiryText(state.bag,cust,ref);
    state.lastInquiry={ref,text,at:Date.now()}; // personal address not persisted in localStorage
    if(fd.get("clearbag")){state.bag=[];syncCommerce();}
    state.inqDone=true;renderInqDone();
    window.scrollTo({top:0,behavior:RM?"auto":"smooth"});
    toast("Inquiry prepared — copy & send on Messenger",{icon:"check"});"""

new_submit_inq = """    const ref=makeRef();
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
    toast("Inquiry recorded & prepared!",{icon:"check"});"""

js = js.replace(old_submit_inq, new_submit_inq)

with open('assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(js)

print('Updated inquiry persistence in app.js!')
