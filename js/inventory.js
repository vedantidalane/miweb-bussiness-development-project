// Enterprise360 – Inventory Management JS
(function() {
  const { Storage } = window.E360;
  const { showToast, genId, formatCurrency, debounce, searchFilter, paginate, renderPagination, exportCSV, confirm } = window.E360.Utils;
  const { getSampleData } = window.E360;

  let products = [];
  let stockLog = [];
  let prodModal, stockModal;
  let editProdId = null;
  let curPage = 1;
  const PER = 8;

  async function init() {
    const user = await window.initPage('Inventory', 'inventory.html');
    if (!user) return;

    const data = await getSampleData();
    products = Storage.get('products', data.products || []);
    stockLog = Storage.get('stockLog', []);
    prodModal = new bootstrap.Modal(document.getElementById('prodModal'));
    stockModal = new bootstrap.Modal(document.getElementById('stockModal'));

    populateCatFilter();
    renderStats();
    renderTable();
    renderStockLog();
    checkLowStock();

    document.getElementById('addProdBtn')?.addEventListener('click', openAdd);
    document.getElementById('saveProdBtn')?.addEventListener('click', save);
    document.getElementById('stockMovBtn')?.addEventListener('click', openStockMov);
    document.getElementById('saveStockBtn')?.addEventListener('click', saveStockMov);
    document.getElementById('prodSearch')?.addEventListener('input', debounce(() => { curPage = 1; renderTable(); }, 300));
    document.getElementById('catFilter')?.addEventListener('change', () => { curPage = 1; renderTable(); });
    document.getElementById('stockFilter')?.addEventListener('change', () => { curPage = 1; renderTable(); });
    document.getElementById('exportInvBtn')?.addEventListener('click', () => exportCSV(products, 'inventory.csv'));
  }

  function populateCatFilter() {
    const cats = [...new Set(products.map(p => p.category))];
    const sel = document.getElementById('catFilter');
    if (!sel) return;
    cats.forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.textContent = c;
      sel.appendChild(o);
    });
  }

  function checkLowStock() {
    const low = products.filter(p => p.quantity <= p.minStock && p.quantity > 0);
    const out = products.filter(p => p.quantity === 0);
    const alert = document.getElementById('lowStockAlert');
    const msg = document.getElementById('lowStockMsg');
    if (alert && msg) {
      if (low.length || out.length) {
        alert.style.display = 'flex';
        msg.textContent = `${out.length} product(s) out of stock, ${low.length} product(s) below minimum stock threshold. Restocking recommended.`;
      } else {
        alert.style.display = 'none';
      }
    }
  }

  function getStockStatus(p) {
    if (p.quantity === 0) return 'Out of Stock';
    if (p.quantity <= p.minStock) return 'Low Stock';
    return 'In Stock';
  }

  function renderStats() {
    products.forEach(p => p.status = getStockStatus(p));
    const total = products.length;
    const inStock = products.filter(p => p.status === 'In Stock').length;
    const low = products.filter(p => p.status === 'Low Stock').length;
    const out = products.filter(p => p.status === 'Out of Stock').length;
    const totalVal = products.reduce((s, p) => s + (p.price * p.quantity), 0);

    const statEl = document.getElementById('invStats');
    if (statEl) {
      statEl.innerHTML = [
        { label: 'Total Products', value: total, icon: 'bi-box-seam', bg: 'bg-primary-soft' },
        { label: 'In Stock Items', value: inStock, icon: 'bi-check-circle', bg: 'bg-success-soft' },
        { label: 'Low Stock Alerts', value: low, icon: 'bi-exclamation-triangle', bg: 'bg-warning-soft' },
        { label: 'Out of Stock', value: out, icon: 'bi-x-circle', bg: 'bg-danger-soft' },
        { label: 'Inventory Value', value: formatCurrency(totalVal), icon: 'bi-currency-dollar', bg: 'bg-info-soft' },
      ].map(s => `
        <div class="col-sm-6 col-lg">
          <div class="stat-card">
            <div class="stat-icon ${s.bg}"><i class="bi ${s.icon}"></i></div>
            <div class="stat-info">
              <div class="stat-value">${s.value}</div>
              <div class="stat-label">${s.label}</div>
            </div>
          </div>
        </div>`).join('');
    }
  }

  function getFiltered() {
    let list = [...products];
    const q = document.getElementById('prodSearch')?.value || '';
    const cat = document.getElementById('catFilter')?.value || '';
    const st = document.getElementById('stockFilter')?.value || '';
    if (q) list = searchFilter(list, q, ['name', 'sku', 'supplier', 'category']);
    if (cat) list = list.filter(p => p.category === cat);
    if (st) list = list.filter(p => getStockStatus(p) === st);
    return list;
  }

  function renderTable() {
    const filtered = getFiltered();
    const pager = paginate(filtered, curPage, PER);
    const countEl = document.getElementById('prodCount');
    if (countEl) countEl.textContent = `Products (${filtered.length})`;

    const pageInfo = document.getElementById('prodPageInfo');
    if (pageInfo) pageInfo.textContent = `Showing ${(curPage - 1) * PER + 1}–${Math.min(curPage * PER, filtered.length)} of ${filtered.length}`;

    const statusCls = { 'In Stock': 'badge-instock', 'Low Stock': 'badge-lowstock', 'Out of Stock': 'badge-outofstock' };
    const tb = document.getElementById('prodTable');
    if (tb) {
      tb.innerHTML = pager.items.length ? pager.items.map(p => {
        const st = getStockStatus(p);
        return `
          <tr>
            <td><div class="fw-semibold" style="font-size:.85rem">${p.name}</div></td>
            <td><code style="font-size:.78rem">${p.sku}</code></td>
            <td style="font-size:.82rem">${p.category}</td>
            <td style="font-size:.82rem">${p.supplier || '—'}</td>
            <td style="font-size:.85rem;font-weight:600">${formatCurrency(p.price)}</td>
            <td><span class="fw-bold" style="font-size:.85rem;color:${p.quantity === 0 ? 'var(--danger)' : p.quantity <= p.minStock ? 'var(--warning)' : 'var(--success)'}">${p.quantity}</span></td>
            <td style="font-size:.82rem">${p.minStock}</td>
            <td><span class="badge-status ${statusCls[st] || 'badge-pending'}">${st}</span></td>
            <td>
              <div class="d-flex gap-1">
                <button class="btn-icon edit-prod" data-id="${p.id}" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon text-danger del-prod" data-id="${p.id}" title="Delete"><i class="bi bi-trash"></i></button>
              </div>
            </td>
          </tr>`;
      }).join('')
      : `<tr><td colspan="9"><div class="empty-state py-4"><i class="bi bi-box-seam fs-2 text-muted"></i><h6>No products found</h6></div></td></tr>`;
    }

    const pagEl = document.getElementById('prodPagination');
    if (pagEl) pagEl.innerHTML = renderPagination(pager, p => { curPage = p; renderTable(); });

    document.querySelectorAll('.edit-prod').forEach(b => b.addEventListener('click', () => openEdit(+b.dataset.id)));
    document.querySelectorAll('.del-prod').forEach(b => b.addEventListener('click', () => delProd(+b.dataset.id)));
  }

  function renderStockLog() {
    const container = document.getElementById('stockLog');
    if (!container) return;
    if (!stockLog.length) {
      container.innerHTML = '<div class="empty-state py-3"><i class="bi bi-clipboard-data fs-2 text-muted"></i><h6>No stock movements recorded yet</h6><p class="text-muted small">Record stock-in or stock-out events to maintain an audit trail.</p></div>';
      return;
    }
    container.innerHTML = `
      <div class="timeline">
        ${stockLog.slice().reverse().map(s => `
          <div class="timeline-item">
            <div class="timeline-dot ${s.type === 'in' ? 'bg-success' : 'bg-danger'}"></div>
            <div class="timeline-content">
              <span class="fw-semibold" style="font-size:.85rem">${s.product}</span>
              <span class="ms-2 badge ${s.type === 'in' ? 'bg-success' : 'bg-danger'} bg-opacity-15 ${s.type === 'in' ? 'text-success' : 'text-danger'}" style="font-size:.72rem">
                ${s.type === 'in' ? '+' + s.qty : '-' + s.qty} Units
              </span>
              <div class="text-muted" style="font-size:.78rem">${s.note || 'Regular inventory adjustment'}</div>
              <div class="timeline-time">${s.date}</div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  function openAdd() {
    editProdId = null;
    document.getElementById('prodModalTitle').textContent = 'Add Product';
    ['prodName', 'prodSku', 'prodSupplier'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    ['prodPrice', 'prodQty', 'prodMin'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '0';
    });
    document.getElementById('prodCat').selectedIndex = 0;
    prodModal.show();
  }

  function openEdit(id) {
    editProdId = id;
    const p = products.find(p => p.id === id);
    if (!p) return;

    document.getElementById('prodModalTitle').textContent = 'Edit Product';
    document.getElementById('prodName').value = p.name;
    document.getElementById('prodSku').value = p.sku;
    document.getElementById('prodCat').value = p.category;
    document.getElementById('prodSupplier').value = p.supplier || '';
    document.getElementById('prodPrice').value = p.price;
    document.getElementById('prodQty').value = p.quantity;
    document.getElementById('prodMin').value = p.minStock;
    prodModal.show();
  }

  async function delProd(id) {
    const ok = await confirm('Delete this inventory product item?', 'Delete Product');
    if (!ok) return;

    products = products.filter(p => p.id !== id);
    Storage.set('products', products);
    renderStats();
    renderTable();
    checkLowStock();
    showToast('Product deleted.', 'danger');
  }

  function save() {
    const name = document.getElementById('prodName').value.trim();
    if (!name) {
      showToast('Product name is required.', 'warning');
      return;
    }

    const prod = {
      id: editProdId || genId(),
      name,
      sku: document.getElementById('prodSku').value.trim(),
      category: document.getElementById('prodCat').value,
      supplier: document.getElementById('prodSupplier').value.trim(),
      price: parseFloat(document.getElementById('prodPrice').value) || 0,
      quantity: parseInt(document.getElementById('prodQty').value) || 0,
      minStock: parseInt(document.getElementById('prodMin').value) || 0
    };
    prod.status = getStockStatus(prod);

    if (editProdId) {
      const idx = products.findIndex(p => p.id === editProdId);
      if (idx !== -1) products[idx] = { ...products[idx], ...prod };
    } else {
      products.push(prod);
    }

    Storage.set('products', products);
    prodModal.hide();
    renderStats();
    renderTable();
    checkLowStock();
    showToast(editProdId ? 'Product updated successfully!' : 'Product added successfully!', 'success');
  }

  function openStockMov() {
    const sel = document.getElementById('stockProduct');
    if (!sel) return;
    sel.innerHTML = '';
    products.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = `${p.name} (Current: ${p.quantity})`;
      sel.appendChild(o);
    });
    document.getElementById('stockQty').value = '1';
    document.getElementById('stockNote').value = '';
    stockModal.show();
  }

  function saveStockMov() {
    const id = +document.getElementById('stockProduct').value;
    const type = document.getElementById('stockMovType').value;
    const qty = parseInt(document.getElementById('stockQty').value) || 0;
    const note = document.getElementById('stockNote').value.trim();

    if (!qty || qty <= 0) {
      showToast('Quantity must be greater than 0.', 'warning');
      return;
    }

    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return;

    if (type === 'out' && products[idx].quantity < qty) {
      showToast('Insufficient stock for this deduction!', 'danger');
      return;
    }

    products[idx].quantity += (type === 'in' ? qty : -qty);
    products[idx].status = getStockStatus(products[idx]);

    stockLog.push({
      id: genId(),
      product: products[idx].name,
      type,
      qty,
      note,
      date: new Date().toLocaleString()
    });

    Storage.set('products', products);
    Storage.set('stockLog', stockLog);

    stockModal.hide();
    renderStats();
    renderTable();
    renderStockLog();
    checkLowStock();
    showToast(`Stock ${type === 'in' ? 'added' : 'deducted'} successfully!`, 'success');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
