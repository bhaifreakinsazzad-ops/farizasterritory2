with open('admin.html', 'r', encoding='utf-8') as f:
    adm = f.read()

capi_section = '''          </section>

          <section class="admin-panel" style="margin-top:20px">
            <div class="panel-header">
              <div>
                <h2>Meta Conversions API (CAPI) & Dataset Integration</h2>
                <p style="font-size:12px;color:var(--admin-text2);margin:4px 0 0">Server-Side Tracking with Event Deduplication & Meta Ads Optimization (Dataset ID: 1657670575734647)</p>
              </div>
              <button class="btn-admin btn-admin-gold" onclick="testMetaCapi()">🚀 Send Test CAPI Event</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:16px;">
              <div>
                <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px">Dataset / Pixel ID</label>
                <input type="text" id="capi-dataset" value="1657670575734647" readonly style="width:100%;padding:10px;background:var(--admin-surface2);border:1px solid var(--admin-border);color:var(--admin-text);border-radius:8px;">
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px">Test Event Code (Facebook Events Manager)</label>
                <input type="text" id="capi-test-code" value="TEST64994" style="width:100%;padding:10px;background:var(--admin-bg);border:1px solid var(--admin-border);color:var(--admin-text);border-radius:8px;">
              </div>
              <div>
                <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px">Server Endpoint (Vercel Serverless Function)</label>
                <input type="text" value="/api/capi" readonly style="width:100%;padding:10px;background:var(--admin-surface2);border:1px solid var(--admin-border);color:var(--admin-text);border-radius:8px;">
              </div>
            </div>
            <div style="margin-top:16px;background:var(--admin-bg);border:1px solid var(--admin-border);border-radius:8px;padding:12px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:11px;font-weight:600;text-transform:uppercase;color:var(--admin-gold)">CAPI Live Diagnostic Output</span>
                <span id="capi-status-badge" class="badge badge-pending">Ready to test</span>
              </div>
              <pre id="capi-output" style="margin:0;font-family:monospace;font-size:12px;color:rgba(253,240,221,0.8);white-space:pre-wrap;max-height:160px;overflow-y:auto;">Click "Send Test CAPI Event" to trigger an instant server-to-server conversion payload to Meta Graph API.</pre>
            </div>'''

capi_js = '''    async function testMetaCapi() {
      const out = document.getElementById('capi-output');
      const badge = document.getElementById('capi-status-badge');
      const testCode = document.getElementById('capi-test-code').value.trim() || 'TEST64994';
      badge.textContent = 'Sending...';
      badge.className = 'badge badge-processing';
      out.textContent = 'Sending serverless CAPI POST request to /api/capi with code ' + testCode + '...';

      try {
        const payload = {
          eventName: 'TestEvent',
          eventId: 'ft_admin_test_' + Date.now(),
          eventTime: Math.floor(Date.now() / 1000),
          eventSourceUrl: window.location.href,
          test_event_code: testCode,
          userData: {
            name: 'Fariza Admin',
            phone: '01700000000',
            district: 'Dhaka'
          },
          customData: {
            currency: 'BDT',
            value: 2450,
            content_name: 'Admin CAPI Verification Test',
            content_ids: ['CAT-001'],
            num_items: 1,
            order_id: 'TEST-ADMIN-' + Math.floor(Math.random() * 9000 + 1000)
          }
        };

        const res = await fetch('/api/capi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        badge.textContent = data.success ? 'Success' : 'Error';
        badge.className = data.success ? 'badge badge-delivered' : 'badge badge-cancelled';
        out.textContent = JSON.stringify(data, null, 2);
      } catch (err) {
        badge.textContent = 'Network Error';
        badge.className = 'badge badge-cancelled';
        out.textContent = 'Failed to connect to /api/capi: ' + err.message + '\\nNote: On local development without a node server running /api/capi, this endpoint will be live once deployed to Vercel.';
      }
    }

    function saveStoreSettings() {'''

if 'testMetaCapi' not in adm:
    adm = adm.replace('          </section>\n        </div>\n\n      </main>', capi_section + '\n          </section>\n        </div>\n\n      </main>', 1)
    adm = adm.replace('    function saveStoreSettings() {', capi_js, 1)

    with open('admin.html', 'w', encoding='utf-8') as f:
        f.write(adm)
    print("Added Meta CAPI controls to admin.html successfully!")
else:
    print("Meta CAPI already in admin.html")
