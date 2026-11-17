/**
 * ============================================================================
 * FARIZA'S TERRITORY — GLOBAL CONFIGURATION & CONVERSION ENGINE
 * Brand Book Palette: #FDF0DD, #1E1D1C, #D1803A, #794722, #5E522B
 * Typography: Actor (Display/Sans) + Noto Sans Bengali
 * ============================================================================
 */
(function (window) {
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
    messengerUsername: "farizasterritory143",
    whatsappNumber: "8801700000000",

    // Delivery & Currency Settings
    currency: "BDT",
    currencySymbol: "৳",
    deliveryFeeDhaka: 80,
    deliveryFeeOutside: 150,
    freeShippingThreshold: 3500,

    // Supabase Integration
    supabase: {
      url: "https://vjbhrdclcnxevunskodm.supabase.co",
      anonKey: "sb_publishable_p212a31c2L6f4b3L6f4b3_xYz"
    },

    // Analytics & Ad Pixels
    analytics: {
      metaPixelId: "1657670575734647",
      ga4MeasurementId: "",
      capiEndpoint: (function () {
        try {
          const host = window.location.hostname || '';
          if (host.includes('github.io') || host.includes('githack.com')) {
            return "https://farizas-territory.vercel.app/api/capi";
          }
        } catch (e) {}
        return "/api/capi";
      })()
    },

    // Official Brand Assets & Provenance Files
    brandAssets: {
      logo: "assets/brand/brand_logo_1.webp",
      logoMinWidthPx: 152,
      logoClearSpacePx: 95,
      masterDatabaseJson: "assets/aistudio/PRODUCTS_53_MASTER_DATABASE_d064c566.json",
      brandBookPdf: "assets/aistudio/fariza_s_territory_brand_book_by_pomelli_1e38cd9b.pdf"
    }
  };

  function getSavedOverrides() {
    try {
      const saved = localStorage.getItem('ft_boutique_config_overrides');
      const parsed = saved ? JSON.parse(saved) : {};
      const keyOverride = localStorage.getItem('ft_supabase_anon_key');
      if (keyOverride) {
        parsed.supabase = parsed.supabase || {};
        parsed.supabase.anonKey = keyOverride;
      }
      const waOverride = localStorage.getItem('ft_whatsapp_number');
      if (waOverride) parsed.whatsappNumber = waOverride;
      const fbOverride = localStorage.getItem('ft_messenger_username');
      if (fbOverride) parsed.messengerUsername = fbOverride;
      const pxOverride = localStorage.getItem('ft_meta_pixel_id');
      if (pxOverride) {
        parsed.analytics = parsed.analytics || {};
        parsed.analytics.metaPixelId = pxOverride;
      }
      const capiUrlOverride = localStorage.getItem('ft_capi_endpoint');
      if (capiUrlOverride) {
        parsed.analytics = parsed.analytics || {};
        parsed.analytics.capiEndpoint = capiUrlOverride;
      }
      return parsed;
    } catch (e) {
      return {};
    }
  }

  const overrides = getSavedOverrides();
  window.FT_CONFIG = Object.assign({}, DEFAULT_CONFIG, overrides, {
    supabase: Object.assign({}, DEFAULT_CONFIG.supabase, overrides.supabase || {}),
    analytics: Object.assign({}, DEFAULT_CONFIG.analytics, overrides.analytics || {}),
    brandAssets: Object.assign({}, DEFAULT_CONFIG.brandAssets, overrides.brandAssets || {})
  });

  // --------------------------------------------------------------------------
  // AD CAMPAIGN ATTRIBUTION & FBCLID / UTM TRACKER
  // Automatically captures UTM parameters & fbclid on ad landing, synthesizes
  // Meta _fbc cookie when landing from Facebook/Instagram Ads, and supports
  // query-string deep links (?sku=CAT-001 or ?collection=bangles-accessories).
  // --------------------------------------------------------------------------
  function captureAdAttribution() {
    let existing = {};
    try {
      const raw = localStorage.getItem('ft_ad_attribution');
      if (raw) existing = JSON.parse(raw) || {};
    } catch (e) {}

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
          captured[k] = val.trim();
          hasNewParam = true;
        }
      });

      if (hasNewParam) {
        captured.landing_page = window.location.href;
        captured.captured_at = new Date().toISOString();
        if (!captured.first_touch_at) {
          captured.first_touch_at = captured.captured_at;
        }
        try {
          localStorage.setItem('ft_ad_attribution', JSON.stringify(captured));
        } catch (e) {}
      }

      // Synthesize _fbc cookie if fbclid is present in URL so Meta CAPI gets 100% click attribution
      const fbclid = params.get('fbclid') || captured.fbclid;
      if (fbclid) {
        const fbcVal = 'fb.1.' + Date.now() + '.' + fbclid;
        try {
          if (!document.cookie.includes('_fbc=')) {
            document.cookie = '_fbc=' + fbcVal + '; path=/; max-age=7776000; SameSite=Lax';
          }
          localStorage.setItem('ft_fbc_fallback', fbcVal);
        } catch (e) {}
      }

      // Support query-param deep linking for Facebook/Instagram Dynamic Product Ads
      // e.g., /?sku=FT-BA-001 or /?collection=bangles-accessories
      const skuParam = params.get('sku') || params.get('product');
      const colParam = params.get('collection');
      if (skuParam && (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/')) {
        window.location.hash = '#/product/' + encodeURIComponent(skuParam.trim().toUpperCase());
      } else if (colParam && (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/')) {
        window.location.hash = '#/collection/' + encodeURIComponent(colParam.trim());
      }

      return captured;
    } catch (e) {
      return existing;
    }
  }

  const initialAttribution = captureAdAttribution();

  // --------------------------------------------------------------------------
  // ANALYTICS & CONVERSION TRACKING HELPER (META PIXEL + CAPI + GA4 + LOG)
  // --------------------------------------------------------------------------
  window.FT_ANALYTICS = {
    eventsLog: [],

    getAttribution: function () {
      try {
        const raw = localStorage.getItem('ft_ad_attribution');
        return raw ? JSON.parse(raw) : (initialAttribution || {});
      } catch (e) {
        return initialAttribution || {};
      }
    },

    init: function () {
      const pixelId = window.FT_CONFIG.analytics.metaPixelId;
      const ga4Id = window.FT_CONFIG.analytics.ga4MeasurementId;

      if (pixelId && !window.fbq) {
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
        window.fbq('init', pixelId);
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

      const initEventId = window.__FT_INITIAL_PAGEVIEW_ID || ('pv_init_' + Date.now());
      this.sendToCAPI('PageView', {}, initEventId);
    },

    getCookie: function (name) {
      try {
        const value = '; ' + document.cookie;
        const parts = value.split('; ' + name + '=');
        if (parts.length === 2) return parts.pop().split(';').shift();
        if (name === '_fbc') {
          return localStorage.getItem('ft_fbc_fallback') || null;
        }
      } catch (e) {}
      return null;
    },

    getSavedUserData: function () {
      try {
        const saved = localStorage.getItem('ft_customer_profile');
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    },

    saveUserData: function (profile) {
      try {
        const current = this.getSavedUserData();
        const merged = Object.assign({}, current, profile);
        localStorage.setItem('ft_customer_profile', JSON.stringify(merged));
        return merged;
      } catch (e) {
        return profile || {};
      }
    },

    sendToCAPI: function (eventName, payload, eventId, explicitUserData) {
      const endpoint = (window.FT_CONFIG && window.FT_CONFIG.analytics && window.FT_CONFIG.analytics.capiEndpoint) || '/api/capi';
      const savedUser = this.getSavedUserData();
      const userObj = Object.assign({}, savedUser, explicitUserData || {});
      const attribution = this.getAttribution();

      let testCode = undefined;
      try {
        testCode = localStorage.getItem('ft_meta_test_event_code') || undefined;
      } catch (e) {}

      const customDataPayload = Object.assign({}, payload || {});
      if (attribution && attribution.utm_source) {
        customDataPayload.utm_source = attribution.utm_source;
      }
      if (attribution && attribution.utm_campaign) {
        customDataPayload.utm_campaign = attribution.utm_campaign;
      }

      const body = {
        eventName: eventName,
        eventId: eventId,
        eventTime: Math.floor(Date.now() / 1000),
        eventSourceUrl: window.location.href,
        actionSource: 'website',
        pixelId: window.FT_CONFIG && window.FT_CONFIG.analytics ? window.FT_CONFIG.analytics.metaPixelId : '1657670575734647',
        testEventCode: testCode,
        userData: {
          phone: userObj.phone || undefined,
          email: userObj.email || undefined,
          firstName: userObj.name || userObj.firstName || undefined,
          city: userObj.district || userObj.city || 'Dhaka',
          country: 'bd',
          externalId: userObj.orderRef || userObj.phone || undefined,
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
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.success) {
            try {
              const logs = JSON.parse(localStorage.getItem('ft_capi_logs') || '[]');
              logs.unshift({
                time: new Date().toISOString(),
                event: eventName,
                eventId: eventId,
                status: 'sent',
                eventsReceived: res.metaResponse ? res.metaResponse.events_received : 1
              });
              localStorage.setItem('ft_capi_logs', JSON.stringify(logs.slice(0, 40)));
            } catch (e) {}
          }
        })
        .catch(function () {});
    },

    track: function (eventName, payload, explicitUserData) {
      payload = payload || {};
      const eventId = 'ev_' + eventName.toLowerCase() + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const attribution = this.getAttribution();
      const entry = {
        event: eventName,
        eventId: eventId,
        payload: payload,
        attribution: attribution,
        timestamp: new Date().toISOString()
      };
      this.eventsLog.push(entry);

      const standardMetaEvents = [
        'PageView',
        'ViewContent',
        'Search',
        'AddToCart',
        'AddToWishlist',
        'InitiateCheckout',
        'AddPaymentInfo',
        'Purchase',
        'Lead',
        'CompleteRegistration',
        'Contact',
        'CustomizeProduct',
        'FindLocation',
        'Schedule',
        'StartTrial',
        'SubmitApplication',
        'Subscribe'
      ];

      if (typeof window.fbq === 'function') {
        try {
          if (standardMetaEvents.indexOf(eventName) !== -1) {
            window.fbq('track', eventName, payload, { eventID: eventId });
          } else {
            window.fbq('trackCustom', eventName, payload, { eventID: eventId });
          }
        } catch (e) {}
      }

      this.sendToCAPI(eventName, payload, eventId, explicitUserData);

      if (typeof window.gtag === 'function') {
        try { window.gtag('event', eventName, payload); } catch (e) {}
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
      this.track('Purchase', eventPayload, customerInfo);
    },

    // Direct aliases used across storefront & quick-conversion actions
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
      if (!orderRecord) return;
      const custInfo = {
        name: orderRecord.customer_name || orderRecord.name,
        phone: orderRecord.customer_phone || orderRecord.phone,
        district: orderRecord.district || 'Dhaka',
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
})(window);
