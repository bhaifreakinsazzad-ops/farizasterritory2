/**
 * ============================================================================
 * FARIZA'S TERRITORY — GLOBAL CONFIGURATION & CONVERSION ENGINE
 * Brand Book Palette: #FDF0DD, #1E1D1C, #D1803A, #794722, #5E522B
 * Typography: Actor (Display/Sans) + Noto Sans Bengali
 * ============================================================================
 */
(function (window, document) {
  'use strict';

  const DEFAULT_CONFIG = {
    brandName: "Fariza's Territory",
    brandNameBn: "ফারিজা’স টেরিটরি",
    taglineEn: "Elegance in Every Detail",
    taglineBn: "প্রতিটি খুঁটিনাটিতে মার্জিত রুচি",
    brandQuote: "Fashion clothing & accessories based in Dhaka, Bangladesh.",
    brandValues: "Style, Trendy Fashion, Community",
    location: "Mirpur, Dhaka, Bangladesh",
    founders: "Faria & Saiful Islam Shuvo",
    communityFollowers: "13,000+",

    // Social & Direct Ordering Channels
    facebookPageUrl: "https://www.facebook.com/farizasterritory143",
    fbSearch: "https://www.facebook.com/farizasterritory143",
    messengerUsername: "farizasterritory143",
    whatsappNumber: "",
    whatsappActive: false,

    // Delivery & Currency Settings
    currency: "BDT",
    currencySymbol: "৳",
    deliveryFeeDhaka: 80,
    deliveryFeeOutside: 150,
    freeShippingThreshold: 3000,
    promoText: "",

    // Supabase Integration (hydrated from /api/public-config)
    supabase: {
      url: "https://vjbhrdclcnxevunskodm.supabase.co",
      anonKey: ""
    },

    // Analytics & Ad Pixels
    analytics: {
      metaPixelId: "1657670575734647",
      ga4MeasurementId: "",
      capiEndpoint: "/api/capi"
    },

    // Official Brand Assets
    brandAssets: {
      logo: "assets/brand/brand_logo_1.webp",
      logoMinWidthPx: 152,
      logoClearSpacePx: 95,
      brandBookPdf: "assets/aistudio/fariza_s_territory_brand_book_by_pomelli_1e38cd9b.pdf"
    }
  };

  // Clear legacy unencrypted PII / insecure admin keys if left over in visitor storage
  (function purgeLegacySensitiveStorage() {
    const legacyKeys = [
      'ft_customer_profile',
      'ft_local_orders',
      'ft_my_orders',
      'ft_supabase_anon_key',
      'ft_admin_pin',
      'ft_meta_test_event_code'
    ];
    for (let i = 0; i < legacyKeys.length; i++) {
      try {
        localStorage.removeItem(legacyKeys[i]);
      } catch (_) {}
    }
    try {
      sessionStorage.removeItem('ft_admin_unlocked');
    } catch (_) {}
  })();

  window.FT_CONFIG = Object.assign({}, DEFAULT_CONFIG, {
    supabase: Object.assign({}, DEFAULT_CONFIG.supabase),
    analytics: Object.assign({}, DEFAULT_CONFIG.analytics),
    brandAssets: Object.assign({}, DEFAULT_CONFIG.brandAssets)
  });

  window.FT_CONFIG.hydrateFromServer = function () {
    return fetch('/api/public-config', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !data.ok) return window.FT_CONFIG;
        if (data.supabaseUrl) window.FT_CONFIG.supabase.url = data.supabaseUrl;
        if (data.supabaseAnonKey) window.FT_CONFIG.supabase.anonKey = data.supabaseAnonKey;
        if (data.metaPixelId) window.FT_CONFIG.analytics.metaPixelId = data.metaPixelId;
        if (data.ga4MeasurementId !== undefined) window.FT_CONFIG.analytics.ga4MeasurementId = data.ga4MeasurementId || '';
        if (data.deliveryFees) {
          if (data.deliveryFees.dhaka !== undefined) window.FT_CONFIG.deliveryFeeDhaka = Number(data.deliveryFees.dhaka);
          if (data.deliveryFees.outside_dhaka !== undefined) window.FT_CONFIG.deliveryFeeOutside = Number(data.deliveryFees.outside_dhaka);
        }
        if (data.freeShippingThreshold !== undefined) {
          window.FT_CONFIG.freeShippingThreshold = Number(data.freeShippingThreshold);
        }
        if (data.promoText) {
          window.FT_CONFIG.promoText = data.promoText;
        }
        if (data.officialChannels) {
          if (data.officialChannels.facebookPageUrl) {
            window.FT_CONFIG.facebookPageUrl = data.officialChannels.facebookPageUrl;
            window.FT_CONFIG.fbSearch = data.officialChannels.facebookPageUrl;
          }
          if (data.officialChannels.messengerUsername) {
            window.FT_CONFIG.messengerUsername = data.officialChannels.messengerUsername;
          }
          window.FT_CONFIG.whatsappActive = Boolean(data.officialChannels.whatsappActive);
          window.FT_CONFIG.whatsappNumber = data.officialChannels.whatsappActive
            ? String(data.officialChannels.whatsappNumber || '')
            : '';
        }
        return window.FT_CONFIG;
      })
      .catch(function () { return window.FT_CONFIG; });
  };

  window.FT_CONFIG_READY = window.FT_CONFIG.hydrateFromServer();

  // --------------------------------------------------------------------------
  // AD CAMPAIGN ATTRIBUTION & FBCLID / UTM TRACKER
  // --------------------------------------------------------------------------
  function captureAdAttribution() {
    let existing = {};
    try {
      const raw = sessionStorage.getItem('ft_ad_attribution');
      if (raw) existing = JSON.parse(raw) || {};
    } catch (_) {}

    try {
      const params = new URLSearchParams(window.location.search || '');
      const trackedKeys = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'fbclid',
        'gclid',
        'ad_id',
        'adset_id',
        'campaign_id',
        'placement'
      ];
      let hasNewParam = false;
      const captured = Object.assign({}, existing);

      trackedKeys.forEach(function (k) {
        const val = params.get(k);
        if (val) {
          captured[k] = val.trim().slice(0, 180);
          hasNewParam = true;
        }
      });

      if (hasNewParam) {
        captured.landing_page = window.location.pathname + window.location.search;
        captured.captured_at = new Date().toISOString();
        if (!captured.first_touch_at) {
          captured.first_touch_at = captured.captured_at;
        }
        try {
          sessionStorage.setItem('ft_ad_attribution', JSON.stringify(captured));
        } catch (_) {}
      }

      const skuParam = params.get('sku') || params.get('product');
      const colParam = params.get('collection');
      if (skuParam && (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/')) {
        window.location.hash = '#/product/' + encodeURIComponent(skuParam.trim().toUpperCase());
      } else if (colParam && (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/')) {
        window.location.hash = '#/collection/' + encodeURIComponent(colParam.trim());
      }

      return captured;
    } catch (_) {
      return existing;
    }
  }

  const initialAttribution = captureAdAttribution();

  // --------------------------------------------------------------------------
  // CONSENT-GATED ANALYTICS & CAPI HELPER (NO CLIENT-SIDE PURCHASE SPOOFING)
  // --------------------------------------------------------------------------
  let sessionUserData = {};

  window.FT_ANALYTICS = {
    eventsLog: [],
    pixelInitialized: false,
    _initPromise: null,

    getConsent: function () {
      try {
        return localStorage.getItem('ft_analytics_consent') || 'unset';
      } catch (_) {
        return 'unset';
      }
    },

    hasConsent: function () {
      return this.getConsent() === 'granted';
    },

    setConsent: function (choice) {
      const val = choice === 'granted' ? 'granted' : 'denied';
      try {
        localStorage.setItem('ft_analytics_consent', val);
      } catch (_) {}
      if (val === 'granted') {
        this.init();
      }
      return val;
    },

    getAttribution: function () {
      try {
        const raw = sessionStorage.getItem('ft_ad_attribution');
        return raw ? JSON.parse(raw) : (initialAttribution || {});
      } catch (_) {
        return initialAttribution || {};
      }
    },

    init: function () {
      if (!this.hasConsent()) return Promise.resolve();
      if (this._initPromise) return this._initPromise;
      const self = this;
      const readyPromise = window.FT_CONFIG_READY && typeof window.FT_CONFIG_READY.then === 'function'
        ? window.FT_CONFIG_READY
        : Promise.resolve();

      this._initPromise = Promise.resolve(readyPromise)
        .catch(function () {})
        .then(function () {
          if (!self.hasConsent()) return;
          const attribution = self.getAttribution();
          if (attribution && attribution.fbclid) {
            try {
              if (!document.cookie.includes('_fbc=')) {
                const fbcVal = 'fb.1.' + Date.now() + '.' + attribution.fbclid;
                document.cookie = '_fbc=' + fbcVal + '; path=/; max-age=7776000; SameSite=Lax';
              }
            } catch (_) {}
          }

          const pixelId = window.FT_CONFIG.analytics.metaPixelId;
          const ga4Id = window.FT_CONFIG.analytics.ga4MeasurementId;

          if (pixelId && !self.pixelInitialized) {
            self.pixelInitialized = true;
            if (!window.fbq) {
              !function (f, b, e, v, n, t, s) {
                if (f.fbq) return;
                n = f.fbq = function () {
                  n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
                };
                if (!f._fbq) f._fbq = n;
                n.push = n;
                n.loaded = !0;
                n.version = '2.0';
                n.queue = [];
                t = b.createElement(e);
                t.async = !0;
                t.src = v;
                s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s);
              }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
            }
            window.fbq('init', pixelId);
            const initEventId = window.__FT_INITIAL_PAGEVIEW_ID || ('pv_init_' + Date.now());
            window.fbq('track', 'PageView', {}, { eventID: initEventId });
            self.sendToCAPI('PageView', {}, initEventId);
          }

          if (ga4Id && !window.gtag) {
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga4Id);
            document.head.appendChild(script);
            window.dataLayer = window.dataLayer || [];
            window.gtag = function () { window.dataLayer.push(arguments); };
            window.gtag('js', new Date());
            window.gtag('config', ga4Id);
          }
        });
      return this._initPromise;
    },

    getCookie: function (name) {
      try {
        const value = '; ' + document.cookie;
        const parts = value.split('; ' + name + '=');
        if (parts.length === 2) return parts.pop().split(';').shift();
      } catch (_) {}
      return null;
    },

    // Ephemeral session-only user data (never persisted as PII in localStorage)
    getSavedUserData: function () {
      return Object.assign({}, sessionUserData);
    },

    saveUserData: function (profile) {
      sessionUserData = Object.assign({}, sessionUserData, profile || {});
      return sessionUserData;
    },

    sendToCAPI: function (eventName, payload, eventId, explicitUserData) {
      if (!this.hasConsent()) return;
      if (eventName === 'Purchase') return; // Purchase is server-authoritative on confirmation only

      const endpoint = (window.FT_CONFIG && window.FT_CONFIG.analytics && window.FT_CONFIG.analytics.capiEndpoint) || '/api/capi';
      const userObj = Object.assign({}, sessionUserData, explicitUserData || {});
      const attribution = this.getAttribution();

      const customDataPayload = Object.assign({}, payload || {});
      if (attribution && attribution.utm_source) customDataPayload.utm_source = attribution.utm_source;
      if (attribution && attribution.utm_campaign) customDataPayload.utm_campaign = attribution.utm_campaign;

      const body = {
        eventName: eventName,
        eventId: eventId,
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl: window.location.href,
        actionSource: 'website',
        userData: {
          phone: userObj.phone || undefined,
          email: userObj.email || undefined,
          firstName: userObj.name || userObj.firstName || undefined,
          city: userObj.district || userObj.city || undefined,
          country: 'bd',
          fbp: this.getCookie('_fbp') || undefined,
          fbc: this.getCookie('_fbc') || undefined
        },
        customData: customDataPayload
      };

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true
      }).catch(function () {});
    },

    track: function (eventName, payload, explicitUserData) {
      if (!this.hasConsent()) return;
      if (eventName === 'Purchase') return; // Never fire unverified Purchase from client browser

      payload = payload || {};
      const eventId = 'ev_' + eventName.toLowerCase() + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const attribution = this.getAttribution();
      this.eventsLog.push({
        event: eventName,
        eventId: eventId,
        payload: payload,
        attribution: attribution,
        timestamp: new Date().toISOString()
      });

      const standardMetaEvents = [
        'PageView',
        'ViewContent',
        'Search',
        'AddToCart',
        'AddToWishlist',
        'InitiateCheckout',
        'Lead',
        'Contact'
      ];

      if (typeof window.fbq === 'function') {
        try {
          if (standardMetaEvents.indexOf(eventName) !== -1) {
            window.fbq('track', eventName, payload, { eventID: eventId });
          } else {
            window.fbq('trackCustom', eventName, payload, { eventID: eventId });
          }
        } catch (_) {}
      }

      this.sendToCAPI(eventName, payload, eventId, explicitUserData);

      if (typeof window.gtag === 'function') {
        try { window.gtag('event', eventName, payload); } catch (_) {}
      }
    },

    viewProduct: function (product) {
      if (!product) return;
      this.track('ViewContent', {
        content_ids: [product.sku],
        content_name: product.title,
        content_category: product.collection ? product.collection.name : product.superCategory,
        content_type: 'product',
        value: product.priceBDT || 0,
        currency: 'BDT'
      });
    },

    addToCart: function (product, qty) {
      qty = qty || 1;
      if (!product) return;
      this.track('AddToCart', {
        content_ids: [product.sku],
        content_name: product.title,
        content_category: product.collection ? product.collection.name : product.superCategory,
        content_type: 'product',
        contents: [{ id: product.sku, quantity: qty, item_price: product.priceBDT || 0 }],
        num_items: qty,
        value: (product.priceBDT || 0) * qty,
        currency: 'BDT'
      });
    },

    addToWishlist: function (product) {
      if (!product) return;
      this.track('AddToWishlist', {
        content_ids: [product.sku],
        content_name: product.title,
        content_category: product.collection ? product.collection.name : product.superCategory,
        content_type: 'product',
        value: product.priceBDT || 0,
        currency: 'BDT'
      });
    },

    initiateCheckout: function (items, totalValue) {
      items = items || [];
      this.track('InitiateCheckout', {
        content_ids: items.map(function (i) { return i.sku; }),
        contents: items.map(function (i) {
          return { id: i.sku, quantity: i.qty || 1, item_price: i.priceBDT || i.price || 0 };
        }),
        content_type: 'product',
        num_items: items.reduce(function (acc, i) { return acc + (i.qty || 1); }, 0),
        value: totalValue || 0,
        currency: 'BDT'
      });
    },

    // Web inquiries register a verified Lead; Purchase fires server-side on admin confirmation
    leadOrOrder: function (orderRef, items, totalValue, channel, customerInfo) {
      items = items || [];
      if (customerInfo) {
        this.saveUserData(Object.assign({}, customerInfo, { orderRef: orderRef }));
      }
      const eventPayload = {
        order_id: orderRef,
        channel: channel,
        content_ids: items.map(function (i) { return i.sku; }),
        contents: items.map(function (i) {
          return { id: i.sku, quantity: i.qty || 1, item_price: i.priceBDT || i.price || 0 };
        }),
        content_type: 'product',
        num_items: items.reduce(function (acc, i) { return acc + (i.qty || 1); }, 0),
        value: totalValue || 0,
        currency: 'BDT'
      };
      this.track('Lead', eventPayload, customerInfo);
    },

    trackEvent: function (eventName, payload, explicitUserData) {
      return this.track(eventName, payload, explicitUserData);
    },
    trackPageView: function (pageName) {
      return this.track('PageView', { page: pageName || window.location.hash || 'home' });
    },
    trackViewContent: function (product) {
      return this.viewProduct(product);
    },
    trackAddToCart: function (product, qty) {
      return this.addToCart(product, qty);
    },
    trackSearch: function (query) {
      return this.track('Search', { search_string: String(query || '').slice(0, 100) });
    },
    trackInitiateCheckout: function (bagItems, subtotalVal) {
      const enriched = (bagItems || []).map(function (b) {
        const prod = window.FT_CATALOG && window.FT_CATALOG.PRODUCTS_BY_SKU ? window.FT_CATALOG.PRODUCTS_BY_SKU[b.sku] : null;
        return {
          sku: b.sku,
          qty: b.qty || 1,
          priceBDT: b.priceBDT || b.price || (prod ? prod.priceBDT : 0)
        };
      });
      return this.initiateCheckout(enriched, subtotalVal);
    },
    trackPurchase: function (orderRecord) {
      // Redirected cleanly to Lead on storefront; Purchase fires exclusively from verified server order confirmation
      if (!orderRecord) return;
      const custInfo = {
        name: orderRecord.customer_name || orderRecord.name,
        phone: orderRecord.customer_phone || orderRecord.phone,
        district: orderRecord.district || orderRecord.customer_district || 'Dhaka',
        orderRef: orderRecord.order_ref || orderRecord.ref
      };
      return this.leadOrOrder(
        orderRecord.order_ref || orderRecord.ref,
        orderRecord.items || [],
        orderRecord.total || orderRecord.total_bdt || 0,
        orderRecord.contact_channel || 'Cash on Delivery (COD)',
        custInfo
      );
    },
    trackContact: function (channel) {
      return this.track('Contact', { content_name: 'Concierge Inquiry', contact_channel: channel || 'Messenger' });
    }
  };
})(window, document);
