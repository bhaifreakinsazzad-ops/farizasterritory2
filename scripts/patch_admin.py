with open('admin.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Update title and count
html = html.replace(
    '<h2>Verified Boutique Products (18 Pieces)</h2>',
    '<h2>Complete Boutique Catalog (53 Verified SKUs across 8 Collections)</h2>'
)

# 2. Update collection dropdown options
old_select = """                <select class="filter-select" id="cat-col-filter" onchange="renderCatalogTable()">
                  <option value="all">All Collections</option>
                  <option value="01">Aarong Label (01)</option>
                  <option value="02">Alfi Boutique (02)</option>
                  <option value="03">Mome Boutique (03)</option>
                  <option value="04">Zam Zam Swiss Lawn (04)</option>
                  <option value="05">Cotton Mirror Embroidery (05)</option>
                </select>"""

new_select = """                <select class="filter-select" id="cat-col-filter" onchange="renderCatalogTable()">
                  <option value="all">All 8 Collections (53 SKUs)</option>
                  <option value="fashion_all">All Fashion Garments (18)</option>
                  <option value="acc_all">All Artisan Accessories (35)</option>
                  <option value="01">01 · Aarong Label (1)</option>
                  <option value="02">02 · Alfi Boutique (2)</option>
                  <option value="03">03 · Mome Boutique (4)</option>
                  <option value="04">04 · Zam Zam Swiss Lawn (6)</option>
                  <option value="05">05 · Cotton Mirror Embroidery (5)</option>
                  <option value="06">06 · Decorative Mirrors (5)</option>
                  <option value="07">07 · Pendants &amp; Jewelry (19)</option>
                  <option value="08">08 · Bangles &amp; Accessories (11)</option>
                </select>"""

html = html.replace(old_select, new_select)

# 3. Update renderCatalogTable implementation
old_render_cat = """    // Catalog Table
    function renderCatalogTable() {
      const col = document.getElementById('cat-col-filter').value;
      const tbody = document.getElementById('catalog-table-body');
      const products = window.FT_CATALOG ? window.FT_CATALOG.PRODUCTS : [];

      const filtered = products.filter(p => col === 'all' || p.colId === col);
      tbody.innerHTML = filtered.map(p => `
        <tr>
          <td><img src="${p.assets && p.assets.main ? p.assets.main.localUrl : ''}" style="width:40px;height:50px;object-fit:cover;border-radius:4px"></td>
          <td><strong>${p.sku}</strong></td>
          <td>${p.title}</td>
          <td><span class="badge" style="background:var(--admin-surface2)">${p.collectionShort}</span></td>
          <td><small style="color:var(--admin-text2)">${p.titleBn || ''}</small></td>
          <td><strong>৳ ${p.priceBDT.toLocaleString()}</strong></td>
          <td><span class="st-badge st-delivered">In Stock</span></td>
          <td>
            <button class="btn-admin" onclick="alert('Pricing for ${p.sku} verified at ৳ ${p.priceBDT}')">Edit</button>
          </td>
        </tr>
      `).join('');
    }"""

new_render_cat = """    // Catalog Table
    function renderCatalogTable() {
      const col = document.getElementById('cat-col-filter').value;
      const tbody = document.getElementById('catalog-table-body');
      const products = window.FT_CATALOG ? window.FT_CATALOG.PRODUCTS : [];

      const filtered = products.filter(p => {
        if (col === 'all') return true;
        if (col === 'fashion_all') return p.superCategory === 'Fashion';
        if (col === 'acc_all') return p.superCategory === 'Accessories';
        return p.colId === col || p.col === col;
      });

      tbody.innerHTML = filtered.map(p => {
        const imgSrc = (p.assets && typeof p.assets.main === 'string') 
          ? p.assets.main 
          : (p.assets && p.assets.main && p.assets.main.localUrl ? p.assets.main.localUrl : 'assets/products/' + p.sku + '/main.webp');
        const colShort = p.collection ? p.collection.short : (p.collectionShort || '');
        const pillar = p.superCategory || (p.collection ? p.collection.pillar : 'Fashion');
        const unit = p.unitBn || p.unit || '';
        return `
          <tr>
            <td><img src="${imgSrc}" style="width:40px;height:50px;object-fit:cover;border-radius:4px" onerror="this.style.display='none'"></td>
            <td><strong>${p.sku}</strong></td>
            <td>${p.title}<br><small style="color:var(--admin-text2)">${p.titleBn || ''}</small></td>
            <td>
              <span class="badge" style="background:var(--admin-surface2)">${colShort}</span>
              <span class="badge" style="background:rgba(209,128,58,0.2);color:var(--admin-gold);font-size:10px">${pillar}</span>
            </td>
            <td><small style="color:var(--admin-text2)">${unit}</small></td>
            <td><strong>৳ ${p.priceBDT ? p.priceBDT.toLocaleString() : 'Inquire'}</strong></td>
            <td><span class="st-badge st-delivered">Live</span></td>
            <td>
              <button class="btn-admin" onclick="alert('SKU: ${p.sku}\\nPrice: ৳ ${p.priceBDT}\\nUnit: ${unit}\\nCaution: ${p.cautionBn||'None'}')">Details</button>
            </td>
          </tr>
        `;
      }).join('');
    }"""

html = html.replace(old_render_cat, new_render_cat)

with open('admin.html', 'w', encoding='utf-8') as f:
    f.write(html)

print('Updated admin.html successfully!')
