/**
 * Fariza's Territory — Supabase Client & Database Management Integration
 * Supabase URL: https://vjbhrdclcnxevunskodm.supabase.co
 */

(function (window) {
  'use strict';

  let client = null;
  let connectionStatus = 'idle'; // 'idle', 'connecting', 'connected', 'error', 'unconfigured'

  const SupabaseService = {
    // Initialize or reconfigure Supabase client
    init(customUrl, customKey) {
      const url = customUrl || (window.FT_CONFIG && window.FT_CONFIG.supabase.url);
      const key = customKey || (window.FT_CONFIG && window.FT_CONFIG.supabase.anonKey);

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
          return client;
        } else {
          console.warn('[Supabase] Supabase JS library not loaded on page.');
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

    // Test connection by checking store_settings or products
    async testConnection() {
      const sb = this.getClient();
      if (!sb) return { success: false, message: 'Supabase client not configured' };

      try {
        const { data, error } = await sb.from('store_settings').select('*').limit(1);
        if (error) throw error;
        connectionStatus = 'connected';
        return { success: true, data };
      } catch (err) {
        console.warn('[Supabase] Connection test failed:', err.message);
        connectionStatus = 'error';
        return { success: false, error: err.message };
      }
    },

    // 1. ORDERS: Save Customer Order / Inquiry
    async createOrder(orderPayload) {
      const sb = this.getClient();

      // Structure clean payload matching Supabase orders schema
      const record = {
        order_ref: orderPayload.orderRef || orderPayload.ref,
        customer_name: orderPayload.name,
        customer_phone: orderPayload.phone,
        customer_address: `${orderPayload.district || ''}, ${orderPayload.address || ''}`,
        delivery_zone: (orderPayload.district && orderPayload.district.toLowerCase().includes('dhaka')) ? 'dhaka' : 'outside_dhaka',
        delivery_fee: (orderPayload.district && orderPayload.district.toLowerCase().includes('dhaka')) ? 80 : 150,
        subtotal: orderPayload.subtotal || 0,
        total: orderPayload.total || orderPayload.subtotal || 0,
        payment_method: orderPayload.paymentMethod || 'Cash on Delivery (COD)',
        items: orderPayload.items || [],
        status: 'pending',
        customer_notes: `Notes: ${orderPayload.notes || 'None'} | Preferred reply: ${orderPayload.contact || 'Messenger'}`,
        source: 'web_store'
      };

      // Always save to LocalStorage backup first so no order is ever lost
      try {
        const localOrders = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
        localOrders.unshift({ ...record, saved_at: new Date().toISOString() });
        localStorage.setItem('ft_local_orders', JSON.stringify(localOrders.slice(0, 50)));
      } catch (e) {
        console.error('[Supabase] Error saving local order backup:', e);
      }

      if (!sb) {
        console.log('[Supabase] Order stored locally (Supabase unconfigured):', record.order_ref);
        return { success: true, mode: 'local', data: record };
      }

      try {
        const { data, error } = await sb.from('orders').insert([record]).select();
        if (error) throw error;
        console.log('[Supabase] Order successfully saved to Supabase database:', record.order_ref);
        return { success: true, mode: 'supabase', data: data[0] };
      } catch (err) {
        console.error('[Supabase] Failed to write order to database:', err.message);
        return { success: true, mode: 'local_fallback', data: record, error: err.message };
      }
    },

    // 2. ORDERS: Fetch Orders for Admin Management
    async getOrders(statusFilter) {
      const sb = this.getClient();
      if (!sb) {
        // Return local orders
        const local = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
        return { success: true, data: local, source: 'local' };
      }

      try {
        let query = sb.from('orders').select('*').order('created_at', { ascending: false });
        if (statusFilter && statusFilter !== 'all') {
          query = query.eq('status', statusFilter);
        }
        const { data, error } = await query;
        if (error) throw error;
        return { success: true, data, source: 'supabase' };
      } catch (err) {
        console.error('[Supabase] Error fetching orders:', err);
        const local = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
        return { success: false, data: local, source: 'local_fallback', error: err.message };
      }
    },

    // 3. ORDERS: Update Order Status (Pending -> Confirmed -> Shipped -> Delivered -> Cancelled)
    async updateOrderStatus(orderId, newStatus) {
      const sb = this.getClient();
      if (!sb) {
        // Update local orders
        const local = JSON.parse(localStorage.getItem('ft_local_orders') || '[]');
        const updated = local.map(o => (o.id === orderId || o.order_ref === orderId) ? { ...o, status: newStatus } : o);
        localStorage.setItem('ft_local_orders', JSON.stringify(updated));
        return { success: true, source: 'local' };
      }

      try {
        const { data, error } = await sb
          .from('orders')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .or(`id.eq.${orderId},order_ref.eq.${orderId}`)
          .select();
        if (error) throw error;
        return { success: true, data, source: 'supabase' };
      } catch (err) {
        console.error('[Supabase] Error updating order status:', err);
        return { success: false, error: err.message };
      }
    },

    // 4. CATALOG: Fetch Products (with fallback to catalogData.js)
    async getProducts() {
      const sb = this.getClient();
      if (!sb) return null;

      try {
        const { data, error } = await sb.from('products').select('*, product_assets(*)').order('sku');
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('[Supabase] Catalog fetch failed, using built-in catalog:', err.message);
        return null;
      }
    },

    // 5. CATALOG: Toggle Stock Availability
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
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    },

    // 6. STORE SETTINGS: Update store configuration
    async updateSettings(settings) {
      const sb = this.getClient();
      if (!sb) return { success: false, error: 'Not connected' };

      try {
        const { data, error } = await sb
          .from('store_settings')
          .upsert([{ id: 'default', ...settings, updated_at: new Date().toISOString() }])
          .select();
        if (error) throw error;
        return { success: true, data };
      } catch (err) {
        return { success: false, error: err.message };
      }
    }
  };

  window.FT_SUPABASE = SupabaseService;
})(window);
