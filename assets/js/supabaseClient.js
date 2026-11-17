/**
 * Fariza's Territory — Enhanced Supabase Client & Database Management Integration
 * Supabase URL: https://vjbhrdclcnxevunskodm.supabase.co
 * Supports: Orders, Order Tracking, Coupons, Catalog Sync, Inventory, Admin Dashboard
 */

(function (window) {
  'use strict';

  let client = null;
  let connectionStatus = 'idle'; // 'idle', 'connecting', 'connected', 'error', 'unconfigured'

  // Default seed orders stored locally for immediate demonstration & fallback
  const SEED_ORDERS = [
    {
      order_ref: 'FT-261115-8821',
      customer_name: 'Tahmina Akter',
      customer_phone: '01712345678',
      customer_address: 'House 42, Road 7, Block D, Mirpur 12, Dhaka',
      delivery_zone: 'dhaka',
      delivery_fee: 80.00,
      subtotal: 2350.00,
      discount_code: 'FIRST25',
      discount_amount: 500.00,
      total: 1930.00,
      payment_method: 'Cash on Delivery (COD)',
      items: [{ sku: 'CAT-001', title: 'Magenta Plum Printed Three Piece', price: 2350, qty: 1, image: 'assets/products/CAT-001/main.webp' }],
      status: 'pending',
      courier_name: 'Steadfast Courier',
      tracking_number: '',
      customer_notes: 'Please deliver in afternoon between 3 PM to 6 PM',
      status_history: [{ status: 'pending', note: 'Order inquiry placed via web store', time: new Date(Date.now() - 86400000*2).toISOString() }],
      created_at: new Date(Date.now() - 86400000*2).toISOString()
    },
    {
      order_ref: 'FT-261114-4190',
      customer_name: 'Nusrat Jahan',
      customer_phone: '01898765432',
      customer_address: 'Flat 4B, Green Heritage, Nasirabad Housing, Chittagong',
      delivery_zone: 'outside_dhaka',
      delivery_fee: 150.00,
      subtotal: 4200.00,
      discount_code: 'FREESHIP',
      discount_amount: 150.00,
      total: 4200.00,
      payment_method: 'Cash on Delivery (COD)',
      items: [
        { sku: 'CAT-002', title: 'Emerald Teal Batik', price: 2150, qty: 1, image: 'assets/products/CAT-002/main.webp' },
        { sku: 'CAT-003', title: 'Dusty Mauve Floral Batik', price: 2050, qty: 1, image: 'assets/products/CAT-003/main.webp' }
      ],
      status: 'confirmed',
      courier_name: 'Steadfast Courier',
      tracking_number: 'STF-98231',
      customer_notes: 'Confirmed via WhatsApp with customer. Fabric verified.',
      status_history: [
        { status: 'pending', note: 'Order placed', time: new Date(Date.now() - 86400000*3).toISOString() },
        { status: 'confirmed', note: 'Confirmed with customer on WhatsApp', time: new Date(Date.now() - 86400000*3 + 7200000).toISOString() }
      ],
      created_at: new Date(Date.now() - 86400000*3).toISOString()
    },
    {
      order_ref: 'FT-261112-6534',
      customer_name: 'Sharmin Sultana',
      customer_phone: '01911223344',
      customer_address: 'House 15, Road 3, Dhanmondi, Dhaka',
      delivery_zone: 'dhaka',
      delivery_fee: 80.00,
      subtotal: 1850.00,
      discount_code: null,
      discount_amount: 0.00,
      total: 1930.00,
      payment_method: 'Cash on Delivery (COD)',
      items: [{ sku: 'CAT-004', title: 'Forest Elegance', price: 1850, qty: 1, image: 'assets/products/CAT-004/main.webp' }],
      status: 'shipped',
      courier_name: 'Pathao Courier',
      tracking_number: 'PTH-647190',
      customer_notes: 'Leave with building security if not answering phone',
      status_history: [
        { status: 'pending', time: new Date(Date.now() - 86400000*5).toISOString() },
        { status: 'confirmed', time: new Date(Date.now() - 86400000*5 + 3600000).toISOString() },
        { status: 'shipped', note: 'Handed over to Pathao Courier hub', time: new Date(Date.now() - 86400000*4).toISOString() }
      ],
      created_at: new Date(Date.now() - 86400000*5).toISOString()
    },
    {
      order_ref: 'FT-261110-3108',
      customer_name: 'Farhana Islam',
      customer_phone: '01755667788',
      customer_address: 'Zindabazar Point, Sylhet Sadar, Sylhet',
      delivery_zone: 'outside_dhaka',
      delivery_fee: 150.00,
      subtotal: 2250.00,
      discount_code: 'FARIZA200',
      discount_amount: 200.00,
      total: 2200.00,
      payment_method: 'Cash on Delivery (COD)',
      items: [{ sku: 'CAT-017', title: 'Electric Blue Mirror Blossom', price: 2250, qty: 1, image: 'assets/products/CAT-017/main.webp' }],
      status: 'delivered',
      courier_name: 'Steadfast Courier',
      tracking_number: 'STF-87102',
      customer_notes: 'Delivered and cash collected in full.',
      status_history: [
        { status: 'pending', time: new Date(Date.now() - 86400000*7).toISOString() },
        { status: 'confirmed', time: new Date(Date.now() - 86400000*7 + 3600000).toISOString() },
        { status: 'shipped', time: new Date(Date.now() - 86400000*6).toISOString() },
        { status: 'delivered', note: 'Customer received package & paid COD', time: new Date(Date.now() - 86400000*4).toISOString() }
      ],
      created_at: new Date(Date.now() - 86400000*7).toISOString()
    }
  ];

  // Initialize local orders if empty
  if (!localStorage.getItem('ft_local_orders')) {
    localStorage.setItem('ft_local_orders', JSON.stringify(SEED_ORDERS));
  }

  // Active coupons default
  const DEFAULT_COUPONS = [
    { code: 'FIRST25', discount_type: 'percentage', discount_value: 25, min_spend: 2000, max_discount: 500, is_active: true, notes: 'First-order 25% discount (Max ৳500)' },
    { code: 'FREESHIP', discount_type: 'free_shipping', discount_value: 150, min_spend: 3000, max_discount: 150, is_active: true, notes: 'Free delivery on orders above ৳3,000' },
    { code: 'FARIZA200', discount_type: 'fixed', discount_value: 200, min_spend: 2000, max_discount: 200, is_active: true, notes: '৳200 flat boutique welcome voucher' }
  ];

  if (!localStorage.getItem('ft_coupons')) {
    localStorage.setItem('ft_coupons', JSON.stringify(DEFAULT_COUPONS));
  }

  const SupabaseService = {
    init(customUrl, customKey) {
      const url = customUrl || (window.FT_CONFIG && window.FT_CONFIG.supabase.url);
      const key = customKey || (window.FT_CONFIG && window.FT_CONFIG.supabase.anonKey) || localStorage.getItem('ft_supabase_anon_key');

      if (!url || !key) {
        connectionStatus = 'unconfigured';
        console.warn('[Supabase] Missing URL or Anon Key. Using local resilient data store.');
        return null;
      }

      try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          client = window.supabase.createClient(url, key);
          connectionStatus = 'connected';
          console.log('[Supabase] Initialized successfully with project:', url);
          this.testConnection();
          this.syncOfflineOrders();
          return client;
        } else {
          connectionStatus = 'unconfigured';
          return null;
        }
      } catch (err) {
        console.error('[Supabase] Error creating client:', err);
        connectionStatus = 'error';
        return null;
      }
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

    async testConnection() {
      const sb = this.getClient();
      if (!sb) return { success: false, message: 'Supabase client not configured' };

      try {
        const { data, error } = await sb.from('store_settings').select('*').limit(1);
        if (error) throw error;
        connectionStatus = 'connected';
        return { success: true, data: data };
      } catch (err) {
        console.warn('[Supabase] Connection test failed:', err.message);
        connectionStatus = 'error';
        return { success: false, error: err.message };
      }
    },

    // 1. ORDERS: Save Customer Order / Inquiry
    async createOrder(orderPayload) {
      const sb = this.getClient();

      const record = {
        order_ref: orderPayload.order_ref || orderPayload.orderRef || orderPayload.ref,
        customer_name: orderPayload.customer_name || orderPayload.name,
        customer_phone: orderPayload.customer_phone || orderPayload.phone,
        customer_address: orderPayload.customer_address || ((orderPayload.district ? orderPayload.district + ', ' : '') + (orderPayload.address || '')),
        delivery_zone: orderPayload.delivery_zone || orderPayload.deliveryZone || ((orderPayload.district && orderPayload.district.toLowerCase().includes('dhaka')) ? 'dhaka' : 'outside'),
        delivery_fee: orderPayload.delivery_fee !== undefined ? orderPayload.delivery_fee : (orderPayload.deliveryFee !== undefined ? orderPayload.deliveryFee : ((orderPayload.district && orderPayload.district.toLowerCase().includes('dhaka')) ? 80 : 150)),
        subtotal: orderPayload.subtotal || 0,
        discount_code: orderPayload.discount_code || orderPayload.discountCode || null,
        discount_amount: orderPayload.discount_amount !== undefined ? orderPayload.discount_amount : (orderPayload.discountAmount || 0),
        total: orderPayload.total !== undefined ? orderPayload.total : (orderPayload.subtotal || 0),
        payment_method: orderPayload.payment_method || orderPayload.paymentMethod || 'Cash on Delivery (COD)',
        items: orderPayload.items || [],
        status: orderPayload.status || 'pending',
        courier_name: orderPayload.courier_name || 'Steadfast Courier',
        tracking_number: orderPayload.tracking_number || '',
        customer_notes: orderPayload.customer_notes || orderPayload.notes || '',
        status_history: orderPayload.status_history || [{ status: 'pending', note: 'Order inquiry placed via web store', time: new Date().toISOString() }],
        source: 'web_store',
        created_at: orderPayload.created_at || new Date().toISOString()
      };

      // Save to local cache
      try {
        const localOrders = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
        localOrders.unshift(record);
        localStorage.setItem('ft_local_orders', JSON.stringify(localOrders.slice(0, 100)));

        // Also save to customer personal order history for tracking
        const myOrders = JSON.parse(localStorage.getItem('ft_my_orders') || '[]');
        myOrders.unshift(record);
        localStorage.setItem('ft_my_orders', JSON.stringify(myOrders));
      } catch (e) {
        console.error('[Supabase] Error saving local order backup:', e);
      }

      if (!sb) {
        return { success: true, mode: 'local', data: record };
      }

      try {
        const { data, error } = await sb.from('orders').insert([record]).select();
        if (error) throw error;
        console.log('[Supabase] Order saved to Supabase:', record.order_ref);
        return { success: true, mode: 'supabase', data: data[0] };
      } catch (err) {
        console.error('[Supabase] Failed to write order to Supabase:', err.message);
        return { success: true, mode: 'local_fallback', data: record, error: err.message };
      }
    },

    // 2. ORDERS: Fetch Orders for Admin Management
    async getOrders(statusFilter) {
      const sb = this.getClient();
      if (!sb) {
        let local = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
        if (statusFilter && statusFilter !== 'all') {
          local = local.filter(o => o.status === statusFilter);
        }
        return { success: true, data: local, source: 'local' };
      }

      try {
        let query = sb.from('orders').select('*').order('created_at', { ascending: false });
        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data: data, source: 'supabase' };
      } catch (err) {
        console.error('[Supabase] Error fetching orders:', err);
        let local = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
        if (statusFilter && statusFilter !== 'all') {
          local = local.filter(o => o.status === statusFilter);
        }
        return { success: false, data: local, source: 'local_fallback', error: err.message };
      }
    },

    // 3. ORDERS: Look Up Order by Ref or Phone (Customer Order Tracking)
    async getOrderByRef(orderRef) {
      if (!orderRef) return null;
      const cleanRef = orderRef.trim().toUpperCase();
      const numOnly = cleanRef.replace(/\D/g, '');

      // Check Supabase first
      const sb = this.getClient();
      if (sb) {
        try {
          const filter = numOnly.length >= 6
            ? `order_ref.eq.${cleanRef},customer_phone.eq.${cleanRef},customer_phone.ilike.%${numOnly.slice(-10)}%`
            : `order_ref.eq.${cleanRef},customer_phone.eq.${cleanRef}`;
          const { data, error } = await sb
            .from('orders')
            .select('*')
            .or(filter)
            .order('created_at', { ascending: false })
            .limit(1);
          if (!error && data && data.length > 0) {
            return data[0];
          }
        } catch (e) {
          console.warn('[Supabase] Order lookup query failed:', e);
        }
      }

      // Check local cache
      const local = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
      const match = local.find(o => {
        if (!o) return false;
        if (o.order_ref === cleanRef || o.ref === cleanRef || o.orderRef === cleanRef) return true;
        const phone = (o.customer_phone || o.phone || '').toString();
        if (phone === cleanRef) return true;
        const pNum = phone.replace(/\D/g, '');
        if (numOnly.length >= 6 && pNum.length >= 6 && (pNum.endsWith(numOnly.slice(-10)) || numOnly.endsWith(pNum.slice(-10)))) return true;
        return false;
      });
      return match || null;
    },

    // 4. ORDERS: Update Order Status & History
    async updateOrderStatus(orderRef, newStatus, optionalNote) {
      const historyEntry = {
        status: newStatus,
        note: optionalNote || ('Status updated to ' + newStatus),
        time: new Date().toISOString()
      };

      // Always update local storage
      const local = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
      const target = local.find(o => o.order_ref === orderRef);
      if (target) {
        target.status = newStatus;
        target.status_history = target.status_history || [];
        target.status_history.push(historyEntry);
        localStorage.setItem('ft_local_orders', JSON.stringify(local));
      }

      const sb = this.getClient();
      if (!sb) return { success: true, source: 'local' };

      try {
        const { data: cur } = await sb.from('orders').select('status_history').eq('order_ref', orderRef).limit(1);
        let updatedHistory = (cur && cur[0] && Array.isArray(cur[0].status_history)) ? cur[0].status_history : [];
        updatedHistory.push(historyEntry);

        const { data, error } = await sb
          .from('orders')
          .update({
            status: newStatus,
            status_history: updatedHistory,
            updated_at: new Date().toISOString()
          })
          .eq('order_ref', orderRef)
          .select();
        if (error) throw error;
        return { success: true, data: data, source: 'supabase' };
      } catch (err) {
        console.error('[Supabase] Error updating status in cloud:', err);
        return { success: true, source: 'local_only', error: err.message };
      }
    },

    // 5. ORDERS: Update Order Details (Address, Courier, Tracking)
    async updateOrderDetails(orderRef, updates) {
      const local = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
      const target = local.find(o => o.order_ref === orderRef);
      if (target) {
        Object.assign(target, updates);
        localStorage.setItem('ft_local_orders', JSON.stringify(local));
      }

      const sb = this.getClient();
      if (!sb) return { success: true, source: 'local' };

      try {
        const { data, error } = await sb
          .from('orders')
          .update(Object.assign({}, updates, { updated_at: new Date().toISOString() }))
          .eq('order_ref', orderRef)
          .select();
        if (error) throw error;
        return { success: true, data: data, source: 'supabase' };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // 6. SYNC: Sync offline local orders to Supabase
    async syncOfflineOrders() {
      const sb = this.getClient();
      if (!sb) return;

      const local = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
      if (local.length === 0) return;

      try {
        const { data: existing } = await sb.from('orders').select('order_ref');
        const existingRefs = new Set((existing || []).map(o => o.order_ref));

        const unsynced = local.filter(o => !existingRefs.has(o.order_ref));
        if (unsynced.length > 0) {
          console.log('[Supabase Sync] Syncing ' + unsynced.length + ' offline orders to cloud...');
          await sb.from('orders').insert(unsynced);
          console.log('[Supabase Sync] Sync complete.');
        }
      } catch (e) {
        console.warn('[Supabase Sync] Error during background sync:', e);
      }
    },

    // 7. COUPONS: Validate and Apply Coupon
    async validateCoupon(code, subtotal) {
      if (!code) return { valid: false, message: 'Please enter a coupon code' };
      const cleanCode = code.trim().toUpperCase();

      let coupon = null;
      const sb = this.getClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('coupons').select('*').eq('code', cleanCode).eq('is_active', true).limit(1);
          if (!error && data && data.length > 0) coupon = data[0];
        } catch (e) {}
      }

      if (!coupon) {
        const localCoupons = JSON.parse(localStorage.getItem('ft_coupons') || '[]');
        coupon = localCoupons.find(c => c.code === cleanCode && c.is_active);
      }

      if (!coupon) {
        return { valid: false, message: 'Invalid or expired coupon code' };
      }

      if (coupon.min_spend && subtotal < Number(coupon.min_spend)) {
        return { valid: false, message: 'Minimum order amount of ৳' + Number(coupon.min_spend).toLocaleString() + ' required for this coupon' };
      }

      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = (subtotal * Number(coupon.discount_value)) / 100;
        if (coupon.max_discount && discountAmount > Number(coupon.max_discount)) {
          discountAmount = Number(coupon.max_discount);
        }
      } else if (coupon.discount_type === 'fixed') {
        discountAmount = Number(coupon.discount_value);
      } else if (coupon.discount_type === 'free_shipping') {
        discountAmount = 150;
      }

      return {
        valid: true,
        coupon: coupon,
        discountAmount: Math.round(discountAmount),
        message: 'Coupon ' + cleanCode + ' applied successfully!'
      };
    },

    async getCoupons() {
      const sb = this.getClient();
      if (sb) {
        try {
          const { data, error } = await sb.from('coupons').select('*').order('created_at', { ascending: false });
          if (!error && data) return data;
        } catch (e) {}
      }
      return JSON.parse(localStorage.getItem('ft_coupons') || '[]');
    },

    async saveCoupon(coupon) {
      const local = JSON.parse(localStorage.getItem('ft_coupons') || '[]');
      const idx = local.findIndex(c => c.code === coupon.code);
      if (idx >= 0) local[idx] = coupon; else local.push(coupon);
      localStorage.setItem('ft_coupons', JSON.stringify(local));

      const sb = this.getClient();
      if (sb) {
        try {
          await sb.from('coupons').upsert([coupon]);
        } catch (e) {}
      }
      return { success: true };
    },

    // 8. CATALOG: Fetch products with cloud sync
    async getProducts() {
      const sb = this.getClient();
      if (!sb) return null;

      try {
        const { data, error } = await sb.from('products').select('*, product_assets(*)').order('sku');
        if (error) throw error;
        return data;
      } catch (err) {
        return null;
      }
    },

    async toggleProductStock(sku, isAvailable) {
      const sb = this.getClient();
      if (!sb) return { success: false, error: 'Not connected' };

      try {
        const { data, error } = await sb
          .from('products')
          .update({ is_available: isAvailable, updated_at: new Date().toISOString() })
          .eq('sku', sku)
          .select();
        if (error) throw error;
        return { success: true, data: data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    async updateProductPrice(sku, newPrice) {
      const sb = this.getClient();
      if (!sb) return { success: false, error: 'Not connected' };

      try {
        const { data, error } = await sb
          .from('products')
          .update({ price_bdt: newPrice, updated_at: new Date().toISOString() })
          .eq('sku', sku)
          .select();
        if (error) throw error;
        return { success: true, data: data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  };

  window.FT_SUPABASE = SupabaseService;
})(window);
