// Enterprise360 – Customers & CRM JS
(function() {
  const { Storage } = window.E360;
  const { showToast, genId, formatCurrency, debounce, searchFilter, paginate, renderPagination, exportCSV, confirm } = window.E360.Utils;
  const { getSampleData } = window.E360;

  let customers = [];
  let editId = null;
  let custModal;
  let curPage = 1;
  const PER = 8;

  async function init() {
    const user = await window.initPage('Customers', 'customers.html');
    if (!user) return;

    const data = await getSampleData();
    customers = Storage.get('customers', data.customers || []);
    custModal = new bootstrap.Modal(document.getElementById('custModal'));

    renderStats();
    renderPipeline();
    renderTable();

    document.getElementById('addCustBtn')?.addEventListener('click', openAdd);
    document.getElementById('saveCustBtn')?.addEventListener('click', save);
    document.getElementById('custSearch')?.addEventListener('input', debounce(() => { curPage = 1; renderTable(); }, 300));
    document.getElementById('custTypeFilter')?.addEventListener('change', () => { curPage = 1; renderTable(); });
    document.getElementById('custStatusFilter')?.addEventListener('change', () => { curPage = 1; renderTable(); });
    document.getElementById('exportCustBtn')?.addEventListener('click', () => exportCSV(getFiltered(), 'customers.csv'));
  }

  function renderStats() {
    const total = customers.length;
    const clients = customers.filter(c => c.type === 'Client').length;
    const leads = customers.filter(c => c.type === 'Lead').length;
    const totalVal = customers.reduce((s, c) => s + (c.value || 0), 0);
    const won = customers.filter(c => c.leadStatus === 'Won').length;

    const statEl = document.getElementById('crmStats');
    if (statEl) {
      statEl.innerHTML = [
        { label: 'Total Accounts', value: total, icon: 'bi-people', bg: 'bg-primary-soft' },
        { label: 'Active Clients', value: clients, icon: 'bi-person-check', bg: 'bg-success-soft' },
        { label: 'Pipeline Leads', value: leads, icon: 'bi-funnel', bg: 'bg-info-soft' },
        { label: 'Pipeline Value', value: formatCurrency(totalVal), icon: 'bi-currency-dollar', bg: 'bg-warning-soft' },
        { label: 'Won Deals', value: won, icon: 'bi-trophy', bg: 'bg-success-soft' },
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

  function renderPipeline() {
    const stages = ['Prospect', 'Negotiation', 'Won', 'Lost'];
    const colors = { 'Prospect': '#3b82f6', 'Negotiation': '#f59e0b', 'Won': '#10b981', 'Lost': '#ef4444' };
    const pipeEl = document.getElementById('pipeline');
    if (!pipeEl) return;

    pipeEl.innerHTML = stages.map(s => {
      const items = customers.filter(c => c.leadStatus === s);
      const val = items.reduce((t, c) => t + (c.value || 0), 0);
      return `
        <div class="card flex-shrink-0 shadow-sm" style="min-width: 170px;">
          <div class="card-body text-center py-3">
            <div style="width: 42px; height: 4px; border-radius: 2px; background: ${colors[s]}; margin: 0 auto 10px;"></div>
            <div class="fw-bold" style="font-size: 1.25rem;">${items.length}</div>
            <div style="font-size: .8rem; color: var(--text-muted); font-weight: 500;">${s}</div>
            <div style="font-size: .82rem; font-weight: 700; color: ${colors[s]}; margin-top: 4px;">${formatCurrency(val)}</div>
          </div>
        </div>`;
    }).join('');
  }

  function getFiltered() {
    let list = [...customers];
    const q = document.getElementById('custSearch')?.value || '';
    const tp = document.getElementById('custTypeFilter')?.value || '';
    const st = document.getElementById('custStatusFilter')?.value || '';
    if (q) list = searchFilter(list, q, ['name', 'contact', 'email', 'phone']);
    if (tp) list = list.filter(c => c.type === tp);
    if (st) list = list.filter(c => c.status === st);
    return list;
  }

  function renderTable() {
    const filtered = getFiltered();
    const pager = paginate(filtered, curPage, PER);
    const countEl = document.getElementById('custCount');
    if (countEl) countEl.textContent = `Customers (${filtered.length})`;

    const pageInfo = document.getElementById('custPageInfo');
    if (pageInfo) pageInfo.textContent = `Showing ${(curPage - 1) * PER + 1}–${Math.min(curPage * PER, filtered.length)} of ${filtered.length}`;

    const statusCls = { Active: 'badge-active', Inactive: 'badge-inactive' };
    const leadCls = { Won: 'badge-won', Lost: 'badge-lost', Prospect: 'badge-prospect', Negotiation: 'badge-pending' };

    const tb = document.getElementById('custTable');
    if (tb) {
      tb.innerHTML = pager.items.length ? pager.items.map(c => `
        <tr>
          <td><div class="fw-semibold" style="font-size:.85rem">${c.name}</div><div class="text-muted" style="font-size:.75rem">${c.email || '—'}</div></td>
          <td><div style="font-size:.85rem">${c.contact || '—'}</div><div class="text-muted" style="font-size:.75rem">${c.phone || ''}</div></td>
          <td><span class="badge bg-secondary bg-opacity-10 text-secondary" style="font-size:.75rem">${c.type}</span></td>
          <td><span class="badge-status ${leadCls[c.leadStatus] || 'badge-pending'}">${c.leadStatus}</span></td>
          <td style="font-size:.85rem;font-weight:600">${formatCurrency(c.value)}</td>
          <td><span class="badge-status ${statusCls[c.status] || 'badge-pending'}">${c.status}</span></td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn-icon edit-cust" data-id="${c.id}" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn-icon text-danger del-cust" data-id="${c.id}" title="Delete"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>`).join('')
        : `<tr><td colspan="7"><div class="empty-state py-4"><i class="bi bi-people fs-2 text-muted"></i><h6>No customers found</h6></div></td></tr>`;
    }

    const pagEl = document.getElementById('custPagination');
    if (pagEl) pagEl.innerHTML = renderPagination(pager, p => { curPage = p; renderTable(); });

    document.querySelectorAll('.edit-cust').forEach(b => b.addEventListener('click', () => openEdit(+b.dataset.id)));
    document.querySelectorAll('.del-cust').forEach(b => b.addEventListener('click', () => delCust(+b.dataset.id)));
  }

  function openAdd() {
    editId = null;
    document.getElementById('custModalTitle').textContent = 'Add Customer';
    ['custName', 'custContact', 'custEmail', 'custPhone', 'custNotes'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('custType').value = 'Lead';
    document.getElementById('custLeadStatus').value = 'Prospect';
    document.getElementById('custValue').value = '';
    document.getElementById('custActive').value = 'Active';
    custModal.show();
  }

  function openEdit(id) {
    editId = id;
    const c = customers.find(c => c.id === id);
    if (!c) return;

    document.getElementById('custModalTitle').textContent = 'Edit Customer';
    document.getElementById('custName').value = c.name;
    document.getElementById('custContact').value = c.contact || '';
    document.getElementById('custEmail').value = c.email || '';
    document.getElementById('custPhone').value = c.phone || '';
    document.getElementById('custType').value = c.type;
    document.getElementById('custLeadStatus').value = c.leadStatus;
    document.getElementById('custValue').value = c.value || '';
    document.getElementById('custActive').value = c.status;
    document.getElementById('custNotes').value = c.notes || '';
    custModal.show();
  }

  async function delCust(id) {
    const ok = await confirm('Delete this customer account?', 'Delete Customer');
    if (!ok) return;

    customers = customers.filter(c => c.id !== id);
    Storage.set('customers', customers);
    renderStats();
    renderPipeline();
    renderTable();
    showToast('Customer deleted successfully.', 'danger');
  }

  function save() {
    const name = document.getElementById('custName').value.trim();
    if (!name) {
      showToast('Company name is required.', 'warning');
      return;
    }

    const cust = {
      id: editId || genId(),
      name,
      contact: document.getElementById('custContact').value.trim(),
      email: document.getElementById('custEmail').value.trim(),
      phone: document.getElementById('custPhone').value.trim(),
      type: document.getElementById('custType').value,
      leadStatus: document.getElementById('custLeadStatus').value,
      value: parseFloat(document.getElementById('custValue').value) || 0,
      status: document.getElementById('custActive').value,
      notes: document.getElementById('custNotes').value.trim()
    };

    if (editId) {
      const idx = customers.findIndex(c => c.id === editId);
      if (idx !== -1) customers[idx] = { ...customers[idx], ...cust };
    } else {
      customers.push(cust);
    }

    Storage.set('customers', customers);
    custModal.hide();
    renderStats();
    renderPipeline();
    renderTable();
    showToast(editId ? 'Customer updated successfully!' : 'Customer added successfully!', 'success');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
