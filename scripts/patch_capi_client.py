import re

with open('assets/js/config.js', 'r', encoding='utf-8') as f:
    content = f.read()

analytics_block = """  // Advertising Analytics Event Dispatcher (Meta Pixel & Server-Side Conversions API)
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
        window.fbq('track', 'PageView');
        console.log('[Analytics] Meta Pixel Initialized dynamically:', CONFIG.marketing.metaPixelId);
      } else if (window.fbq && CONFIG.marketing.metaPixelId) {
        console.log('[Analytics] Meta Pixel active from head script with ID:', CONFIG.marketing.metaPixelId);
      }
    },

    // Generate unique event ID for Meta Pixel + CAPI Deduplication
    generateEventId(prefix) {
      return (prefix || 'ft') + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    },

    // Dispatch Server-side CAPI event to /api/capi
    sendCapi(eventName, eventId, customData, userData) {
      try {
        const payload = {
          eventName: eventName,
          eventId: eventId,
          eventTime: Math.floor(Date.now() / 1000),
          eventSourceUrl: window.location.href,
          customData: customData || {},
          userData: userData || {},
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

content_new = re.sub(r'  // Advertising Analytics Event Dispatcher[\s\S]*?  \};\n\n  // Expose to window', analytics_block + '\n\n  // Expose to window', content)

with open('assets/js/config.js', 'w', encoding='utf-8') as f:
    f.write(content_new)

print("Updated config.js with Meta CAPI dual-layer tracking successfully!")
