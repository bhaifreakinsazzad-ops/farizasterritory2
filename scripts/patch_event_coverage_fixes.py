import re

# 1. Update index.html, admin.html, and scripts/build_ghl_bundle.py with deduplicated PageView script
pixel_snippet_dedup = """  <!-- Meta Pixel Code with Deduplication ID -->
  <script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', '1657670575734647');
  window.__FT_INITIAL_PAGEVIEW_ID = 'pv_init_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  fbq('track', 'PageView', {}, { eventID: window.__FT_INITIAL_PAGEVIEW_ID });
  </script>
  <noscript><img height="1" width="1" style="display:none"
  src="https://www.facebook.com/tr?id=1657670575734647&ev=PageView&noscript=1"
  /></noscript>
  <!-- End Meta Pixel Code -->"""

# Update index.html
with open('index.html', 'r', encoding='utf-8') as f:
    idx = f.read()

idx = re.sub(r'  <!-- Meta Pixel Code -->[\s\S]*?<!-- End Meta Pixel Code -->', pixel_snippet_dedup.strip(), idx)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(idx)
print("Updated index.html with deduplicated initial PageView!")

# Update admin.html
with open('admin.html', 'r', encoding='utf-8') as f:
    adm = f.read()

adm = re.sub(r'  <!-- Meta Pixel Code -->[\s\S]*?<!-- End Meta Pixel Code -->', pixel_snippet_dedup.strip(), adm)
with open('admin.html', 'w', encoding='utf-8') as f:
    f.write(adm)
print("Updated admin.html with deduplicated initial PageView!")

# 2. Update config.js with cookie extraction and initial sync
with open('assets/js/config.js', 'r', encoding='utf-8') as f:
    cfg = f.read()

analytics_enhanced = """  // Advertising Analytics Event Dispatcher (Meta Pixel & Server-Side Conversions API)
  const ANALYTICS = {
    init() {
      // Check if Meta Pixel is configured and inject if not already loaded in DOM
      if (CONFIG.marketing.metaPixelId && !window.fbq) {
        /* eslint-disable */
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
        window.fbq('init', CONFIG.marketing.metaPixelId);
        const initEventId = window.__FT_INITIAL_PAGEVIEW_ID || this.generateEventId('pv_init');
        window.fbq('track', 'PageView', {}, { eventID: initEventId });
        this.sendCapi('PageView', initEventId, { page_name: 'Initial Load' });
        console.log('[Analytics] Meta Pixel Initialized dynamically:', CONFIG.marketing.metaPixelId);
      } else if (window.fbq && CONFIG.marketing.metaPixelId) {
        console.log('[Analytics] Meta Pixel active from head script with ID:', CONFIG.marketing.metaPixelId);
        // Sync initial PageView to CAPI with the exact matching eventID generated in head
        if (window.__FT_INITIAL_PAGEVIEW_ID && !window.__FT_INITIAL_PAGEVIEW_SYNCED) {
          window.__FT_INITIAL_PAGEVIEW_SYNCED = true;
          this.sendCapi('PageView', window.__FT_INITIAL_PAGEVIEW_ID, { page_name: 'Initial Load' });
        }
      }
    },

    getMetaCookie(name) {
      if (typeof document === 'undefined' || !document.cookie) return undefined;
      const match = document.cookie.match(new RegExp('(^|;\\\\s*)(' + name + ')=([^;]*)'));
      return match ? decodeURIComponent(match[3]) : undefined;
    },

    getFbclid() {
      if (typeof window === 'undefined' || !window.location) return undefined;
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const fbclid = urlParams.get('fbclid');
        if (!fbclid) return undefined;
        return 'fb.1.' + Math.floor(Date.now() / 1000) + '.' + fbclid;
      } catch (e) {
        return undefined;
      }
    },

    // Generate unique event ID for Meta Pixel + CAPI Deduplication
    generateEventId(prefix) {
      return (prefix || 'ft') + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    },

    // Dispatch Server-side CAPI event to /api/capi
    sendCapi(eventName, eventId, customData, userData) {
      try {
        const fbp = this.getMetaCookie('_fbp');
        const fbc = this.getMetaCookie('_fbc') || this.getFbclid();
        const enrichedUserData = Object.assign({
          fbp: fbp,
          fbc: fbc
        }, userData || {});

        const payload = {
          eventName: eventName,
          eventId: eventId,
          eventTime: Math.floor(Date.now() / 1000),
          eventSourceUrl: window.location.href,
          customData: customData || {},
          userData: enrichedUserData,
          test_event_code: window.FT_TEST_EVENT_CODE || 'TEST64994'
        };

        if (typeof fetch === 'function') {
          fetch('/api/capi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
          }).then(r => r.json()).then(res => {
            console.log('[Meta CAPI] Server dispatch response for ' + eventName + ':', res);
          }).catch(err => {
            console.warn('[Meta CAPI] Dispatch note:', err.message);
          });
        }
      } catch (e) {
        console.warn('[Meta CAPI] Exception:', e);
      }
    },

    trackPageView(pageName) {
      const eventId = this.generateEventId('pv');
      if (window.fbq) {
        window.fbq('track', 'PageView', { page_name: pageName }, { eventID: eventId });
      }
      this.sendCapi('PageView', eventId, { page_name: pageName });
      if (window.gtag && CONFIG.marketing.ga4MeasurementId) {
        window.gtag('event', 'page_view', { page_title: pageName });
      }
      console.log('[Analytics] PageView tracked:', pageName, 'EventID:', eventId);
    },

    trackViewContent(product) {
      if (!product) return;
      const eventId = this.generateEventId('vc');
      const customData = {
        content_name: product.title,
        content_category: product.collectionName || (product.collection && product.collection.name) || 'Boutique',
        content_ids: [product.sku],
        content_type: 'product',
        value: product.priceBDT || 0,
        currency: 'BDT'
      };
      if (window.fbq) {
        window.fbq('track', 'ViewContent', customData, { eventID: eventId });
      }
      this.sendCapi('ViewContent', eventId, customData);
      console.log('[Analytics] ViewContent tracked:', product.sku, 'EventID:', eventId);
    },

    trackAddToCart(product, qty) {
      if (!product) return;
      const eventId = this.generateEventId('atc');
      const quantity = qty || 1;
      const customData = {
        content_name: product.title,
        content_ids: [product.sku],
        content_type: 'product',
        value: (product.priceBDT || 0) * quantity,
        currency: 'BDT',
        num_items: quantity
      };
      if (window.fbq) {
        window.fbq('track', 'AddToCart', customData, { eventID: eventId });
      }
      this.sendCapi('AddToCart', eventId, customData);
      console.log('[Analytics] AddToCart tracked:', product.sku, 'Qty:', quantity, 'EventID:', eventId);
    },

    trackInitiateCheckout(bag, subtotal) {
      const eventId = this.generateEventId('ic');
      const customData = {
        content_ids: (bag || []).map(item => item.sku),
        num_items: (bag || []).length,
        value: subtotal || 0,
        currency: 'BDT'
      };
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', customData, { eventID: eventId });
      }
      this.sendCapi('InitiateCheckout', eventId, customData);
      console.log('[Analytics] InitiateCheckout tracked. Value:', subtotal, 'EventID:', eventId);
    },

    trackOrderInquiry(order) {
      this.trackPurchase(order);
    },

    trackPurchase(order) {
      if (!order) return;
      const eventId = order.orderRef || order.order_ref || order.ref || this.generateEventId('pur');
      const items = order.items || [];
      const totalVal = order.total || order.total_bdt || order.subtotal || 0;
      const customData = {
        content_name: 'Boutique Order Purchase',
        content_type: 'product',
        content_ids: items.map(i => i.sku),
        num_items: items.reduce((sum, i) => sum + (i.qty || 1), 0),
        value: totalVal,
        currency: 'BDT',
        order_id: eventId
      };
      const userData = {
        name: order.customer_name || order.name || '',
        phone: order.customer_phone || order.phone || '',
        district: order.district || 'Dhaka',
        address: order.delivery_address || order.address || ''
      };

      if (window.fbq) {
        window.fbq('track', 'Purchase', customData, { eventID: eventId });
        window.fbq('track', 'Lead', {
          content_name: 'Boutique Order Inquiry Lead',
          value: totalVal,
          currency: 'BDT'
        }, { eventID: eventId + '_lead' });
      }

      this.sendCapi('Purchase', eventId, customData, userData);
      this.sendCapi('Lead', eventId + '_lead', customData, userData);

      if (window.gtag && CONFIG.marketing.ga4MeasurementId) {
        window.gtag('event', 'purchase', {
          transaction_id: eventId,
          value: totalVal,
          currency: 'BDT',
          items: items.map(i => ({
            item_id: i.sku,
            item_name: i.title,
            price: i.price,
            quantity: i.qty
          }))
        });
      }
      console.log('[Analytics] Purchase & Lead tracked with CAPI deduplication:', eventId, 'Amount: ৳' + totalVal);
    },

    trackContact(channel) {
      const eventId = this.generateEventId('cnt');
      const customData = { contact_channel: channel || 'WhatsApp' };
      if (window.fbq) {
        window.fbq('track', 'Contact', customData, { eventID: eventId });
      }
      this.sendCapi('Contact', eventId, customData);
      console.log('[Analytics] Contact tracked:', channel, 'EventID:', eventId);
    }
  };"""

cfg_new = re.sub(r'  // Advertising Analytics Event Dispatcher[\s\S]*?  \};\n\n  // Expose to window', analytics_enhanced + '\n\n  // Expose to window', cfg)
with open('assets/js/config.js', 'w', encoding='utf-8') as f:
    f.write(cfg_new)
print("Updated config.js with enriched cookie matching & PageView deduplication!")

# 3. Update app.js hydrate() to track SPA page views and initiate checkout
with open('assets/js/app.js', 'r', encoding='utf-8') as f:
    app_code = f.read()

hydrate_target = """  if(state.route.page==="bag")renderBagPageList();
  if(state.route.page==="inquiry"&&!state.inqDone)renderInqSummary();
  syncCommerce();"""

hydrate_replacement = """  if(state.route.page==="bag")renderBagPageList();
  if(state.route.page==="inquiry"&&!state.inqDone){
    renderInqSummary();
    if(window.FT_ANALYTICS && state.bag.length > 0){
      const sub = state.bag.reduce((s,b)=>{ const p=bySku(b.sku); return s + (p && p.priceBDT ? p.priceBDT*b.qty : 0); }, 0);
      window.FT_ANALYTICS.trackInitiateCheckout(state.bag, sub);
    }
  }
  if(window.FT_ANALYTICS && window.FT_ANALYTICS.trackPageView && state.route && state.route.page !== "home"){
    window.FT_ANALYTICS.trackPageView(state.route.page);
  }
  syncCommerce();"""

if 'trackInitiateCheckout' not in app_code:
    app_code = app_code.replace(hydrate_target, hydrate_replacement, 1)

# Add global click listener for WhatsApp and Messenger contact tracking if not present
contact_listener = """
/* Global Contact Click Tracking for Meta Pixel & CAPI */
document.addEventListener("click", e => {
  const wa = e.target.closest("a[href*='wa.me'], .btn-whatsapp, #floating-wa-btn");
  if(wa && window.FT_ANALYTICS){
    window.FT_ANALYTICS.trackContact('WhatsApp');
  }
  const msg = e.target.closest("a[href*='m.me'], a[href*='facebook.com/messages'], .btn-messenger");
  if(msg && window.FT_ANALYTICS){
    window.FT_ANALYTICS.trackContact('Messenger');
  }
});
"""

if 'Global Contact Click Tracking' not in app_code:
    app_code = app_code.replace('if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();', contact_listener + '\nif(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();')

with open('assets/js/app.js', 'w', encoding='utf-8') as f:
    f.write(app_code)
print("Updated app.js with SPA PageView, InitiateCheckout, and WhatsApp/Messenger tracking!")

# 4. Regenerate ghl-bundle.html
import subprocess
subprocess.run(['py', 'scripts/build_ghl_bundle.py'], check=True)
print("Regenerated ghl-bundle.html successfully!")
