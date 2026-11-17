/**
 * Fariza's Territory — Storefront API & Auth Client
 * Security Hardened:
 * - All public order submission routes through authoritative POST /api/orders.
 * - Order tracking requires verified ref + phone challenge via GET /api/track.
 * - Coupon validation routes through POST /api/coupons/validate.
 * - Zero customer PII stored in localStorage or demo-seeded on public pages.
 * - Admin authentication uses real Supabase Auth sessions (for /admin portal).
 */

(function (window) {
  'use strict';

  let client = null;
  let connectionStatus = 'idle';

  function normalizeZone(zone, district) {
    if (window.FT_COMMERCE && typeof window.FT_COMMERCE.normalizeZone === 'function') {
      return window.FT_COMMERCE.normalizeZone(zone, district);
    }
    const z = String(zone || '').toLowerCase().trim();
    if (z === 'outside' || z === 'outside_dhaka') return 'outside_dhaka';
    if (z === 'dhaka' || z === 'inside_dhaka') return 'dhaka';
    if (district && String(district).toLowerCase().includes('dhaka')) return 'dhaka';
    return district ? 'outside_dhaka' : 'dhaka';
  }

  const StorefrontService = {
    normalizeZone: normalizeZone,

    init(customUrl, customKey) {
      const cfg = window.FT_CONFIG || {};
      const url = customUrl || (cfg.supabase && cfg.supabase.url) || '';
      const key = customKey || (cfg.supabase && cfg.supabase.anonKey) || '';

      if (!url || !key) {
        connectionStatus = 'unconfigured';
        return null;
      }

      try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          client = window.supabase.createClient(url, key);
          connectionStatus = 'connected';
          return client;
        }
        connectionStatus = 'unconfigured';
        return null;
      } catch (err) {
        console.error('[Supabase Auth] Error initializing client:', err);
        connectionStatus = 'error';
        return null;
      }
    },

    async ensureAuthClient() {
      if (client) return client;
      if (window.FT_CONFIG_READY) {
        try { await window.FT_CONFIG_READY; } catch (_) {}
      }
      return this.init();
    },

    getStatus() {
      return connectionStatus;
    },

    getClient() {
      if (!client) {
        this.init();
      }
      return client;
    },

    // Authoritative Order / Inquiry Creation via Server API
    async createOrder(orderPayload) {
      try {
        const resp = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(orderPayload && orderPayload.idempotency_key
              ? { 'X-Idempotency-Key': String(orderPayload.idempotency_key) }
              : {})
          },
          body: JSON.stringify(orderPayload || {})
        });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok || !json.ok) {
          return {
            success: false,
            status: resp.status,
            error: (json && json.error) || `Order registration failed (HTTP ${resp.status}).`
          };
        }
        return {
          success: true,
          idempotent: Boolean(json.idempotent),
          order_ref: json.order_ref || (json.order && json.order.order_ref),
          data: json.order
        };
      } catch (err) {
        return {
          success: false,
          status: 0,
          error: 'Network error communicating with boutique server. Please try again or contact us on Messenger.'
        };
      }
    },

    // Challenged Order Tracking (requires BOTH Order Reference and Phone Number)
    async trackOrder(orderRef, phone) {
      const cleanRef = String(orderRef || '').trim().toUpperCase();
      const cleanPhone = String(phone || '').trim();
      if (!cleanRef || !cleanPhone) {
        return {
          ok: false,
          status: 400,
          error: 'Both Order Reference and Phone Number are required to view order status.'
        };
      }
      try {
        const qs = new URLSearchParams({ ref: cleanRef, phone: cleanPhone }).toString();
        const resp = await fetch('/api/track?' + qs, { credentials: 'same-origin' });
        const json = await resp.json().catch(() => ({}));
        if (!resp.ok || !json.ok) {
          return {
            ok: false,
            status: resp.status,
            error: (json && json.error) || 'No matching order found.'
          };
        }
        return { ok: true, order: json.order };
      } catch (_) {
        return {
          ok: false,
          status: 0,
          error: 'Could not reach order tracking server. Please try again.'
        };
      }
    },

    // Server-side Coupon Validation
    async validateCoupon(code, subtotal, deliveryFeeOpt, zoneOpt) {
      const cleanCode = String(code || '').trim().toUpperCase();
      if (!cleanCode) return { valid: false, message: 'Please enter a coupon code.' };

      try {
        const resp = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: cleanCode,
            subtotal: Number(subtotal || 0),
            deliveryFee: deliveryFeeOpt,
            zone: zoneOpt || 'dhaka'
          })
        });
        const json = await resp.json().catch(() => null);
        if (json && typeof json.valid === 'boolean') {
          return json;
        }
      } catch (_) {}

      // Offline preview fallback using shared commerce rules (server re-validates on submit)
      if (window.FT_COMMERCE) {
        const c = window.FT_COMMERCE.DEFAULT_COUPONS.find(x => x.code === cleanCode);
        return window.FT_COMMERCE.evaluateCoupon(c, subtotal, deliveryFeeOpt);
      }
      return { valid: false, message: 'Unable to validate coupon right now.' };
    },

    // Live Public Catalog Overrides (price & availability)
    async getProducts() {
      try {
        const resp = await fetch('/api/catalog', { credentials: 'same-origin' });
        if (!resp.ok) return null;
        const json = await resp.json();
        return json && Array.isArray(json.products) ? json.products : null;
      } catch (_) {
        return null;
      }
    },

    // Public Store Settings
    async getStoreSettings() {
      try {
        const resp = await fetch('/api/public-config', { credentials: 'same-origin' });
        if (!resp.ok) return null;
        const json = await resp.json();
        if (!json || !json.ok) return null;
        return {
          messenger_username: json.officialChannels && json.officialChannels.messengerUsername,
          whatsapp_number: json.officialChannels && json.officialChannels.whatsappNumber,
          whatsapp_active: json.officialChannels && json.officialChannels.whatsappActive,
          facebook_url: json.officialChannels && json.officialChannels.facebookPageUrl,
          meta_pixel_id: json.metaPixelId,
          ga4_measurement_id: json.ga4MeasurementId,
          delivery_fee_dhaka: json.deliveryFees && json.deliveryFees.dhaka,
          delivery_fee_outside: json.deliveryFees && json.deliveryFees.outside_dhaka,
          free_delivery_threshold: json.freeShippingThreshold,
          promo_text: json.promoText
        };
      } catch (_) {
        return null;
      }
    }
  };

  window.FT_SUPABASE = StorefrontService;
})(window);
