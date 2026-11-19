/**
 * Fariza's Territory — Canonical Commerce & Validation Engine (Shared Node + Browser UMD)
 * Single source of truth for delivery zones, BD phone validation, coupon rules,
 * authoritative pricing/order calculation, status transitions, and safe public redaction.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.FT_COMMERCE = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_DELIVERY_FEES = Object.freeze({
    dhaka: 80,
    outside_dhaka: 150
  });

  const DEFAULT_FREE_SHIPPING_THRESHOLD = 3000;

  const DEFAULT_COUPONS = Object.freeze([
    {
      code: 'FIRST25',
      discount_type: 'percentage',
      discount_value: 25,
      min_spend: 2000,
      max_discount: 500,
      is_active: true,
      notes: 'First-order 25% discount (Max ৳500)'
    },
    {
      code: 'FARIZA200',
      discount_type: 'fixed',
      discount_value: 200,
      min_spend: 2000,
      max_discount: 200,
      is_active: true,
      notes: '৳200 flat boutique welcome voucher'
    },
    {
      code: 'FREESHIP',
      discount_type: 'free_shipping',
      discount_value: 150,
      min_spend: 3000,
      max_discount: 150,
      is_active: true,
      notes: 'Free delivery on orders above ৳3,000'
    }
  ]);

  const VALID_ORDER_STATUSES = Object.freeze([
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled'
  ]);

  const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
    pending: ['pending', 'confirmed', 'processing', 'cancelled'],
    confirmed: ['confirmed', 'processing', 'shipped', 'cancelled'],
    processing: ['processing', 'shipped', 'delivered', 'cancelled'],
    shipped: ['shipped', 'delivered', 'cancelled'],
    delivered: ['delivered'],
    cancelled: ['cancelled']
  });

  function isPlaceholderWhatsapp(num) {
    const digits = String(num || '').replace(/\D/g, '');
    return !digits || digits === '8801700000000' || digits.length < 11;
  }

  function normalizeZone(zone, district) {
    const z = String(zone || '').toLowerCase().trim();
    if (z === 'outside' || z === 'outside_dhaka') return 'outside_dhaka';
    if (z === 'dhaka' || z === 'inside_dhaka') return 'dhaka';
    if (district && String(district).toLowerCase().includes('dhaka')) return 'dhaka';
    return district ? 'outside_dhaka' : 'dhaka';
  }

  function normalizePhone(rawPhone) {
    const raw = String(rawPhone || '').trim();
    let digits = raw.replace(/\D/g, '');
    if (!digits) {
      return { valid: false, digits: '', canonical11: '', e164: '', last4: '', masked: '' };
    }
    if (digits.startsWith('00880')) {
      digits = digits.slice(2);
    }
    // Bangladeshi mobile normalization: +8801XXXXXXXXX or 8801XXXXXXXXX -> 01XXXXXXXXX
    let canonical11 = digits;
    if (digits.startsWith('8801') && digits.length === 13) {
      canonical11 = '0' + digits.slice(3);
    }
    const isBdMobile = /^01[3-9]\d{8}$/.test(canonical11);
    const e164 = isBdMobile ? '88' + canonical11 : digits;
    const valid = isBdMobile || (digits.length >= 10 && digits.length <= 15);
    const last4 = canonical11.slice(-4);
    const masked = canonical11.length >= 7
      ? canonical11.slice(0, 3) + '****' + canonical11.slice(-3)
      : '****' + last4;

    return {
      valid,
      isBdMobile,
      digits,
      canonical11,
      e164,
      last4,
      masked
    };
  }

  function phonesMatch(phoneA, phoneB) {
    const a = normalizePhone(phoneA);
    const b = normalizePhone(phoneB);
    if (!a.digits || !b.digits) return false;
    if (a.canonical11 && b.canonical11 && a.canonical11 === b.canonical11) return true;
    if (a.digits.length >= 10 && b.digits.length >= 10 && a.digits.slice(-10) === b.digits.slice(-10)) {
      return true;
    }
    return false;
  }

  function getDeliveryFeeForZone(zone, customFees) {
    const norm = normalizeZone(zone);
    const dhaka = Number(customFees && customFees.dhaka);
    const outside = Number(customFees && (customFees.outside_dhaka ?? customFees.outside));
    if (norm === 'outside_dhaka') {
      return Number.isFinite(outside) && outside >= 0 ? outside : DEFAULT_DELIVERY_FEES.outside_dhaka;
    }
    return Number.isFinite(dhaka) && dhaka >= 0 ? dhaka : DEFAULT_DELIVERY_FEES.dhaka;
  }

  function evaluateCoupon(coupon, subtotal, deliveryFee) {
    if (!coupon || !coupon.is_active) {
      return { valid: false, discountAmount: 0, message: 'Invalid or inactive voucher code.' };
    }
    const cleanSubtotal = Math.max(0, Number(subtotal) || 0);
    const cleanDelivery = Math.max(0, Number(deliveryFee) || 0);
    const minSpend = Number(coupon.min_spend || 0);

    if (cleanSubtotal < minSpend) {
      return {
        valid: false,
        discountAmount: 0,
        message: `Minimum order amount of ৳${minSpend.toLocaleString('en-US')} required for ${coupon.code}.`
      };
    }

    let discountAmount = 0;
    if (coupon.discount_type === 'percentage') {
      discountAmount = (cleanSubtotal * Number(coupon.discount_value || 0)) / 100;
      if (coupon.max_discount !== null && coupon.max_discount !== undefined && Number(coupon.max_discount) > 0) {
        discountAmount = Math.min(discountAmount, Number(coupon.max_discount));
      }
      discountAmount = Math.min(discountAmount, cleanSubtotal);
    } else if (coupon.discount_type === 'fixed') {
      discountAmount = Math.min(Number(coupon.discount_value || 0), cleanSubtotal);
    } else if (coupon.discount_type === 'free_shipping') {
      discountAmount = cleanDelivery;
    } else {
      return { valid: false, discountAmount: 0, message: 'Unsupported voucher type.' };
    }

    discountAmount = Math.max(0, Math.round(discountAmount));
    return {
      valid: true,
      discountAmount,
      coupon,
      message: `Voucher ${coupon.code} applied (-৳${discountAmount.toLocaleString('en-US')}).`
    };
  }

  function computeOrderTotals(params) {
    const {
      items,
      productsBySku,
      zone,
      district,
      deliveryFees,
      coupon
    } = params || {};

    if (!Array.isArray(items) || items.length === 0) {
      return { ok: false, error: 'Order must contain at least one item.' };
    }
    if (items.length > 30) {
      return { ok: false, error: 'Too many line items in a single order.' };
    }

    const mergedBySku = new Map();
    for (const rawItem of items) {
      const sku = String(rawItem && rawItem.sku ? rawItem.sku : '').trim().toUpperCase();
      const qty = Number(rawItem && rawItem.qty);
      if (!sku) {
        return { ok: false, error: 'Item SKU is required.' };
      }
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
        return { ok: false, error: `Invalid quantity for SKU ${sku}. Must be an integer between 1 and 20.` };
      }
      mergedBySku.set(sku, (mergedBySku.get(sku) || 0) + qty);
    }

    const normalizedItems = [];
    let subtotal = 0;

    for (const [sku, qty] of mergedBySku.entries()) {
      const product = productsBySku && (productsBySku instanceof Map ? productsBySku.get(sku) : productsBySku[sku]);
      if (!product) {
        return { ok: false, error: `Unknown product SKU: ${sku}.` };
      }
      if (
        product.is_available === false ||
        (product.stock_count !== undefined && product.stock_count !== null && Number(product.stock_count) <= 0)
      ) {
        return { ok: false, error: `Product ${sku} is currently marked out of stock.` };
      }
      if (
        product.stock_count !== undefined &&
        product.stock_count !== null &&
        Number.isFinite(Number(product.stock_count)) &&
        qty > Number(product.stock_count)
      ) {
        return {
          ok: false,
          error: `Requested quantity (${qty}) exceeds available stock (${Number(product.stock_count)}) for ${sku}.`
        };
      }
      const unitPrice = Number(product.priceBDT ?? product.price_bdt ?? 0);
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        return { ok: false, error: `Product ${sku} does not have an active price configured.` };
      }
      const lineTotal = unitPrice * qty;
      subtotal += lineTotal;
      const imagePath = (product.assets && (typeof product.assets.main === 'string' ? product.assets.main : product.assets.main?.src))
        || `assets/products/${sku}/main.webp`;

      normalizedItems.push({
        sku,
        title: product.title || sku,
        price: unitPrice,
        qty,
        unit: product.unitBn || product.unit || '',
        image: imagePath
      });
    }

    const deliveryZone = normalizeZone(zone, district);
    const deliveryFee = getDeliveryFeeForZone(deliveryZone, deliveryFees);

    let discountCode = null;
    let discountAmount = 0;
    if (coupon) {
      const evalRes = evaluateCoupon(coupon, subtotal, deliveryFee);
      if (!evalRes.valid) {
        return { ok: false, error: evalRes.message };
      }
      discountCode = coupon.code;
      discountAmount = evalRes.discountAmount;
    }

    const total = Math.max(0, Math.round(subtotal + deliveryFee - discountAmount));

    return {
      ok: true,
      items: normalizedItems,
      delivery_zone: deliveryZone,
      delivery_fee: deliveryFee,
      subtotal: Math.round(subtotal),
      discount_code: discountCode,
      discount_amount: discountAmount,
      total
    };
  }

  function isValidStatusTransition(currentStatus, nextStatus) {
    if (!VALID_ORDER_STATUSES.includes(nextStatus)) return false;
    const cur = VALID_ORDER_STATUSES.includes(currentStatus) ? currentStatus : 'pending';
    const allowed = ALLOWED_STATUS_TRANSITIONS[cur] || [];
    return allowed.includes(nextStatus);
  }

  function isFeedEligibleProduct(product) {
    if (!product) return false;
    const isAvail = product.is_available !== false;
    const hasStockCount = product.stock_count === undefined || product.stock_count === null || Number(product.stock_count) > 0;
    const stockVerified = product.stock_verified === true;
    const priceApproved = product.price_review === false || product.priceStatus === 'approved';
    const price = Number(product.priceBDT ?? product.price_bdt ?? 0);
    return isAvail && hasStockCount && stockVerified && priceApproved && Number.isFinite(price) && price > 0;
  }

  function getProductFeedAvailability(product) {
    if (!product || product.is_available === false) return 'out of stock';
    if (product.stock_count !== undefined && product.stock_count !== null && Number(product.stock_count) <= 0) return 'out of stock';
    if (product.stock_verified !== true) return 'out of stock';
    return 'in stock';
  }

  function maskName(name) {
    const clean = String(name || '').trim();
    if (!clean) return 'Valued Customer';
    const parts = clean.split(/\s+/);
    const first = parts[0];
    if (first.length <= 2) return first[0] + '***';
    return first.slice(0, 2) + '***';
  }

  function redactOrderForPublicTracking(order) {
    if (!order) return null;
    const phoneInfo = normalizePhone(order.customer_phone);
    const zone = normalizeZone(order.delivery_zone);
    const history = Array.isArray(order.status_history)
      ? order.status_history.map(h => ({
          status: h && h.status ? String(h.status) : 'pending',
          note: h && h.note ? String(h.note) : '',
          time: h && h.time ? String(h.time) : null
        }))
      : [];

    const items = Array.isArray(order.items)
      ? order.items.map(it => ({
          sku: String(it.sku || ''),
          title: String(it.title || it.sku || ''),
          qty: Number(it.qty || 1),
          price: Number(it.price || 0),
          image: String(it.image || '')
        }))
      : [];

    return {
      order_ref: order.order_ref,
      status: order.status || 'pending',
      courier_name: order.courier_name || 'Steadfast Courier',
      tracking_number: order.tracking_number || '',
      delivery_zone: zone,
      delivery_fee: Number(order.delivery_fee ?? getDeliveryFeeForZone(zone)),
      subtotal: Number(order.subtotal ?? order.subtotal_bdt ?? 0),
      discount_code: order.discount_code || null,
      discount_amount: Number(order.discount_amount ?? order.discount_bdt ?? 0),
      total: Number(order.total ?? order.total_bdt ?? 0),
      recipient_masked: maskName(order.customer_name),
      phone_masked: phoneInfo.masked,
      district: order.customer_district || (zone === 'dhaka' ? 'Dhaka' : 'Outside Dhaka'),
      items,
      status_history: history,
      created_at: order.created_at,
      updated_at: order.updated_at || order.created_at
    };
  }

  function generateOrderRef(dateObj) {
    const d = dateObj || new Date();
    const ymd = String(d.getFullYear()).slice(2)
      + String(d.getMonth() + 1).padStart(2, '0')
      + String(d.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `FT-${ymd}-${rand}`;
  }

  return {
    DEFAULT_DELIVERY_FEES,
    DEFAULT_FREE_SHIPPING_THRESHOLD,
    DEFAULT_COUPONS,
    VALID_ORDER_STATUSES,
    ALLOWED_STATUS_TRANSITIONS,
    isPlaceholderWhatsapp,
    normalizeZone,
    normalizePhone,
    phonesMatch,
    getDeliveryFeeForZone,
    evaluateCoupon,
    computeOrderTotals,
    isValidStatusTransition,
    isFeedEligibleProduct,
    getProductFeedAvailability,
    redactOrderForPublicTracking,
    generateOrderRef
  };
});
