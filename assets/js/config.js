/**
 * Fariza's Territory — Application Configuration & Environment Settings
 * Brand: Fariza's Territory (Fashion & Accessories Brand by Faria & Saiful Islam Shuvo)
 * Supabase Project URL: https://vjbhrdclcnxevunskodm.supabase.co
 */

(function (window) {
  'use strict';

  // Base Configuration
  const CONFIG = {
    // Brand & Contact
    brandName: "Fariza's Territory",
    tagline: "Elegance in Every Detail. Made in BANGLADESH.",
    madeIn: "Mirpur, Dhaka, Bangladesh",
    messengerUsername: "farizasterritory143",
    whatsappNumber: "8801700000000", // Update with official business WhatsApp
    facebookUrl: "https://www.facebook.com/farizasterritory143",

    // Pricing & Delivery (Bangladeshi Taka BDT)
    currency: "BDT",
    currencySymbol: "৳",
    deliveryFeeDhaka: 80,
    deliveryFeeOutside: 150,
    freeDeliveryThresholdItems: 3,

    // Supabase Database Integration
    supabase: {
      url: "https://vjbhrdclcnxevunskodm.supabase.co",
      // Anon key loaded from localStorage or runtime environment
      anonKey: localStorage.getItem("ft_supabase_anon_key") || window.SUPABASE_ANON_KEY || ""
    },

    // Advertising & Marketing Tracking
    marketing: {
      metaPixelId: localStorage.getItem("ft_meta_pixel_id") || window.META_PIXEL_ID || "",
      ga4MeasurementId: localStorage.getItem("ft_ga4_id") || window.GA4_ID || ""
    },

    // Drive Thumbnail Fallback
    driveThumb: (id, w) => `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`,
    fbSearch: "https://www.facebook.com/farizasterritory143"
  };

  // Advertising Analytics Event Dispatcher (Meta Pixel & GA4)
  const ANALYTICS = {
    init() {
      // Check if Meta Pixel is configured and inject
      if (CONFIG.marketing.metaPixelId && !window.fbq) {
        /* eslint-disable */
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable */
        window.fbq('init', CONFIG.marketing.metaPixelId);
        window.fbq('track', 'PageView');
        console.log('[Analytics] Meta Pixel Initialized:', CONFIG.marketing.metaPixelId);
      }
    },

    trackPageView(pageName) {
      if (window.fbq) {
        window.fbq('track', 'PageView', { page_name: pageName });
      }
      if (window.gtag && CONFIG.marketing.ga4MeasurementId) {
        window.gtag('event', 'page_view', { page_title: pageName });
      }
    },

    trackViewContent(product) {
      if (window.fbq) {
        window.fbq('track', 'ViewContent', {
          content_name: product.title,
          content_category: product.collectionName || 'Boutique',
          content_ids: [product.sku],
          content_type: 'product',
          value: product.priceBDT,
          currency: 'BDT'
        });
      }
      console.log('[Analytics] ViewContent tracked:', product.sku);
    },

    trackAddToCart(product, qty) {
      if (window.fbq) {
        window.fbq('track', 'AddToCart', {
          content_name: product.title,
          content_ids: [product.sku],
          content_type: 'product',
          value: product.priceBDT * qty,
          currency: 'BDT',
          num_items: qty
        });
      }
      console.log('[Analytics] AddToCart tracked:', product.sku, 'Qty:', qty);
    },

    trackInitiateCheckout(bag, subtotal) {
      if (window.fbq) {
        window.fbq('track', 'InitiateCheckout', {
          content_ids: bag.map(item => item.sku),
          num_items: bag.length,
          value: subtotal,
          currency: 'BDT'
        });
      }
      console.log('[Analytics] InitiateCheckout tracked. Value:', subtotal);
    },

    trackOrderInquiry(order) {
      if (window.fbq) {
        window.fbq('track', 'Lead', {
          content_name: 'Boutique Order Inquiry',
          value: order.total,
          currency: 'BDT',
          order_id: order.orderRef
        });
      }
      console.log('[Analytics] Lead/Order Inquiry tracked:', order.orderRef);
    }
  };

  // Expose to window
  window.FT_CONFIG = CONFIG;
  window.FT_ANALYTICS = ANALYTICS;

  // Initialize analytics on load
  ANALYTICS.init();
})(window);
