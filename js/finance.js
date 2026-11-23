// Enterprise360 – Finance & Invoicing JS
(function() {
  const { Storage } = window.E360;
  const { showToast, genId, formatDate, formatCurrency, debounce, searchFilter, paginate, renderPagination, exportCSV, confirm } = window.E360.Utils;
  const { getSampleData } = window.E360;

  let transactions = [];
  let invoices = [];
  let txnModal, invModal, previewModal;
  let txnPage = 1;
  const PER = 8;
  let editTxnId = null;

  async function init() {
    const user = await window.initPage('Finance', 'finance.html');
    if (!user) return;

    const data = await getSampleData();
    transactions = Storage.get('transactions', data.transactions || []);
    invoices = Storage.get('invoices', data.invoices || []);

    txnModal = new bootstrap.Modal(document.getElementById('txnModal'));
    invModal = new bootstrap.Modal(document.getElementById('invModal'));
    previewModal = new bootstrap.Modal(document.getElementById('invoicePreviewModal'));

    renderStats();
    renderTxnTable();
    renderInvoices();

    document.getElementById('addTxnBtn')?.addEventListener('click', openAddTxn);
    document.getElementById('createInvBtn')?.addEventListener('click', openCreateInvoice);
    document.getElementById('saveTxnBtn')?.addEventListener('click', saveTxn);
    document.getElementById('saveInvBtn')?.addEventListener('click', saveInvoice);
    document.getElementById('txnSearch')?.addEventListener('input', debounce(() => { txnPage = 1; renderTxnTable(); }, 300));
    document.getElementById('txnTypeFilter')?.addEventListener('change', () => { txnPage = 1; renderTxnTable(); });
    document.getElementById('txnStatusFilter')?.addEventListener('change', () => { txnPage = 1; renderTxnTable(); });
    document.getElementById('exportTxnBtn')?.addEventListener('click', () => exportCSV(transactions, 'transactions.csv'));
    document.getElementById('printInvoiceBtn')?.addEventListener('click', () => window.print());

    // Tab switching
    document.querySelectorAll('#finTabs .nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#finTabs .nav-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        ['txn', 'invoices', 'budget'].forEach(t => {
          const el = document.getElementById(t + '-panel');
          if (el) el.classList.toggle('d-none', tab !== t);
        });
        if (tab === 'budget') renderBudgetCharts();
      });
    });
  }

  function renderStats() {
    const income = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0);
    const expense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0);
    const profit = income - expense;
    const pending = invoices.filter(i => i.status === 'Pending').length;
    const overdue = invoices.filter(i => i.status === 'Overdue').length;

    const statEl = document.getElementById('finStats');
    if (statEl) {
      statEl.innerHTML = [
        { label: 'Total Revenue', value: formatCurrency(income), icon: 'bi-graph-up', bg: 'bg-success-soft' },
        { label: 'Total Expenses', value: formatCurrency(expense), icon: 'bi-graph-down', bg: 'bg-danger-soft' },
        { label: 'Net Profit', value: formatCurrency(profit), icon: 'bi-currency-dollar', bg: profit >= 0 ? 'bg-primary-soft' : 'bg-warning-soft' },
        { label: 'Pending Invoices', value: pending, icon: 'bi-file-earmark-text', bg: 'bg-warning-soft' },
        { label: 'Overdue Invoices', value: overdue, icon: 'bi-exclamation-triangle', bg: 'bg-danger-soft' },
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

  function getTxnFiltered() {
    let list = [...transactions];
    const q = document.getElementById('txnSearch')?.value || '';
    const tp = document.getElementById('txnTypeFilter')?.value || '';
    const st = document.getElementById('txnStatusFilter')?.value || '';
    if (q) list = searchFilter(list, q, ['description', 'category']);
    if (tp) list = list.filter(t => t.type === tp);
    if (st) list = list.filter(t => t.status === st);
    return list;
  }

  function renderTxnTable() {
    const filtered = getTxnFiltered();
    const pager = paginate(filtered, txnPage, PER);
    const pageInfo = document.getElementById('txnPageInfo');
    if (pageInfo) pageInfo.textContent = `Showing ${(txnPage - 1) * PER + 1}–${Math.min(txnPage * PER, filtered.length)} of ${filtered.length}`;

    const statusCls = { Paid: 'badge-paid', Pending: 'badge-pending' };
    const tb = document.getElementById('txnTable');
    if (tb) {
      tb.innerHTML = pager.items.length ? pager.items.map(t => `
        <tr>
          <td style="font-size:.82rem">${formatDate(t.date)}</td>
          <td style="font-size:.85rem;font-weight:500">${t.description}</td>
          <td><span class="badge bg-secondary bg-opacity-10 text-secondary" style="font-size:.75rem">${t.category}</span></td>
          <td><span class="badge ${t.type === 'Income' ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${t.type === 'Income' ? 'text-success' : 'text-danger'}" style="font-size:.75rem">${t.type}</span></td>
          <td style="font-size:.85rem;font-weight:600;color:${t.type === 'Income' ? 'var(--success)' : 'var(--danger)'}">
            ${t.type === 'Income' ? '+' : '-'}${formatCurrency(t.amount)}
          </td>
          <td><span class="badge-status ${statusCls[t.status] || 'badge-pending'}">${t.status}</span></td>
          <td>
            <div class="d-flex gap-1">
              <button class="btn-icon edit-txn" data-id="${t.id}" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn-icon text-danger del-txn" data-id="${t.id}" title="Delete"><i class="bi bi-trash"></i></button>
            </div>
          </td>
        </tr>`).join('')
        : `<tr><td colspan="7"><div class="empty-state py-4"><i class="bi bi-receipt fs-2 text-muted"></i><h6>No transactions found</h6></div></td></tr>`;
    }

    const pagEl = document.getElementById('txnPagination');
    if (pagEl) pagEl.innerHTML = renderPagination(pager, p => { txnPage = p; renderTxnTable(); });

    document.querySelectorAll('.edit-txn').forEach(b => b.addEventListener('click', () => openEditTxn(+b.dataset.id)));
    document.querySelectorAll('.del-txn').forEach(b => b.addEventListener('click', () => delTxn(+b.dataset.id)));
  }

  function renderInvoices() {
    const statusColors = { Paid: 'success', Pending: 'warning', Overdue: 'danger' };
    const grid = document.getElementById('invoiceGrid');
    if (!grid) return;

    grid.innerHTML = invoices.map(inv => `
      <div class="col-sm-6 col-lg-4">
        <div class="card shadow-sm h-100">
          <div class="card-body">
            <div class="d-flex justify-content-between mb-3">
              <div>
                <div class="fw-bold" style="font-size:.9rem">${inv.id}</div>
                <div class="text-muted" style="font-size:.8rem">${inv.client}</div>
              </div>
              <span class="badge bg-${statusColors[inv.status] || 'secondary'} bg-opacity-15 text-${statusColors[inv.status] || 'secondary'}">${inv.status}</span>
            </div>
            <div class="d-flex justify-content-between text-muted mb-1" style="font-size:.8rem">
              <span>Sub-total</span><span>${formatCurrency(inv.amount)}</span>
            </div>
            <div class="d-flex justify-content-between text-muted mb-1" style="font-size:.8rem">
              <span>Tax (10%)</span><span>${formatCurrency(inv.tax)}</span>
            </div>
            <div class="d-flex justify-content-between text-muted mb-2" style="font-size:.8rem">
              <span>Discount</span><span>-${formatCurrency(inv.discount)}</span>
            </div>
            <div class="d-flex justify-content-between fw-bold border-top pt-2">
              <span>Total Due</span><span style="color:var(--primary);font-size:1.05rem;">${formatCurrency(inv.total)}</span>
            </div>
            <div class="mt-2 text-muted" style="font-size:.75rem">
              Issued: ${formatDate(inv.date)} · Due: ${formatDate(inv.dueDate)}
            </div>
          </div>
          <div class="card-body border-top py-2 d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary flex-1 view-inv" data-id="${inv.id}"><i class="bi bi-eye me-1"></i>Preview</button>
            <button class="btn btn-sm btn-outline-${statusColors[inv.status]} mark-paid" data-id="${inv.id}" title="Toggle Paid">
              ${inv.status === 'Paid' ? '<i class="bi bi-check-circle-fill"></i>' : '<i class="bi bi-check"></i>'}
            </button>
            <button class="btn btn-sm btn-outline-danger del-inv" data-id="${inv.id}"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>`).join('') || `<div class="col-12"><div class="empty-state card py-4"><i class="bi bi-file-earmark-text fs-2 text-muted"></i><h6>No invoices generated yet</h6></div></div>`;

    document.querySelectorAll('.view-inv').forEach(b => b.addEventListener('click', () => previewInvoice(b.dataset.id)));
    document.querySelectorAll('.mark-paid').forEach(b => b.addEventListener('click', () => {
      const inv = invoices.find(i => i.id === b.dataset.id);
      if (inv) {
        inv.status = (inv.status === 'Paid') ? 'Pending' : 'Paid';
        Storage.set('invoices', invoices);
        renderInvoices();
        renderStats();
        showToast(`Invoice ${inv.id} marked as ${inv.status}!`, 'success');
      }
    }));
    document.querySelectorAll('.del-inv').forEach(b => b.addEventListener('click', async () => {
      const ok = await confirm('Delete this invoice record?', 'Delete Invoice');
      if (!ok) return;
      invoices = invoices.filter(i => i.id !== b.dataset.id);
      Storage.set('invoices', invoices);
      renderInvoices();
      renderStats();
      showToast('Invoice deleted.', 'danger');
    }));
  }

  function previewInvoice(invId) {
    const inv = invoices.find(i => i.id === invId);
    if (!inv) return;

    document.getElementById('prevInvNumber').textContent = inv.id;
    document.getElementById('prevInvDate').textContent = formatDate(inv.date);
    document.getElementById('prevInvDue').textContent = formatDate(inv.dueDate);
    document.getElementById('prevInvClient').textContent = inv.client;
    document.getElementById('prevInvSubtotal').textContent = formatCurrency(inv.amount);
    document.getElementById('prevInvTax').textContent = formatCurrency(inv.tax);
    document.getElementById('prevInvDiscount').textContent = `-${formatCurrency(inv.discount)}`;
    document.getElementById('prevInvTotal').textContent = formatCurrency(inv.total);
    document.getElementById('prevInvStatus').textContent = inv.status;

    const statusBadge = document.getElementById('prevInvStatusBadge');
    if (statusBadge) {
      statusBadge.className = `badge bg-${inv.status === 'Paid' ? 'success' : inv.status === 'Overdue' ? 'danger' : 'warning'} px-3 py-2 fs-6`;
      statusBadge.textContent = inv.status.toUpperCase();
    }

    previewModal.show();
  }

  function renderBudgetCharts() {
    const incomeByCat = {}, expByCat = {};
    transactions.forEach(t => {
      if (t.type === 'Income') incomeByCat[t.category] = (incomeByCat[t.category] || 0) + t.amount;
      else expByCat[t.category] = (expByCat[t.category] || 0) + t.amount;
    });

    const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
    ['incomeChart', 'expenseChart'].forEach((id, idx) => {
      const data = idx === 0 ? incomeByCat : expByCat;
      const canvas = document.getElementById(id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (Chart.getChart(id)) Chart.getChart(id).destroy();
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(data),
          datasets: [{ data: Object.values(data), backgroundColor: COLORS, borderWidth: 0 }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right', labels: { font: { size: 11 }, color: 'var(--text-muted)' } } }
        }
      });
    });
  }

  function openAddTxn() {
    editTxnId = null;
    document.getElementById('txnModalTitle').textContent = 'Add Transaction';
    document.getElementById('txnDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('txnDesc').value = '';
    document.getElementById('txnAmount').value = '';
    document.getElementById('txnType').value = 'Income';
    document.getElementById('txnStatus').value = 'Paid';
    txnModal.show();
  }

  function openEditTxn(id) {
    editTxnId = id;
    const t = transactions.find(t => t.id === id);
    if (!t) return;

    document.getElementById('txnModalTitle').textContent = 'Edit Transaction';
    document.getElementById('txnDate').value = t.date;
    document.getElementById('txnDesc').value = t.description;
    document.getElementById('txnAmount').value = t.amount;
    document.getElementById('txnType').value = t.type;
    document.getElementById('txnCat').value = t.category;
    document.getElementById('txnStatus').value = t.status;
    txnModal.show();
  }

  async function delTxn(id) {
    const ok = await confirm('Delete this transaction?', 'Delete Transaction');
    if (!ok) return;

    transactions = transactions.filter(t => t.id !== id);
    Storage.set('transactions', transactions);
    renderStats();
    renderTxnTable();
    showToast('Transaction deleted.', 'danger');
  }

  function saveTxn() {
    const desc = document.getElementById('txnDesc').value.trim();
    const amt = parseFloat(document.getElementById('txnAmount').value);
    if (!desc || !amt) {
      showToast('Description and amount required.', 'warning');
      return;
    }

    const txn = {
      id: editTxnId || genId(),
      type: document.getElementById('txnType').value,
      description: desc,
      category: document.getElementById('txnCat').value,
      amount: amt,
      date: document.getElementById('txnDate').value,
      status: document.getElementById('txnStatus').value
    };

    if (editTxnId) {
      const idx = transactions.findIndex(t => t.id === editTxnId);
      if (idx !== -1) transactions[idx] = { ...transactions[idx], ...txn };
    } else {
      transactions.unshift(txn);
    }

    Storage.set('transactions', transactions);
    txnModal.hide();
    renderStats();
    renderTxnTable();
    showToast(editTxnId ? 'Transaction updated!' : 'Transaction added!', 'success');
  }

  function openCreateInvoice() {
    document.getElementById('invClient').value = '';
    document.getElementById('invDate').value = new Date().toISOString().split('T')[0];
    const due = new Date();
    due.setDate(due.getDate() + 30);
    document.getElementById('invDue').value = due.toISOString().split('T')[0];
    document.getElementById('invAmount').value = '';
    document.getElementById('invTax').value = 10;
    document.getElementById('invDiscount').value = 0;
    calcInvoiceTotal();
    invModal.show();
  }

  function saveInvoice() {
    const client = document.getElementById('invClient').value.trim();
    const amount = parseFloat(document.getElementById('invAmount').value) || 0;
    if (!client || !amount) {
      showToast('Client name and amount are required.', 'warning');
      return;
    }

    const tax = amount * (parseFloat(document.getElementById('invTax').value) || 0) / 100;
    const disc = parseFloat(document.getElementById('invDiscount').value) || 0;
    const invNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;

    const inv = {
      id: invNumber,
      client,
      amount,
      tax: Math.round(tax),
      discount: disc,
      total: Math.round(amount + tax - disc),
      date: document.getElementById('invDate').value,
      dueDate: document.getElementById('invDue').value,
      status: document.getElementById('invStatus').value
    };

    invoices.unshift(inv);
    Storage.set('invoices', invoices);
    invModal.hide();
    renderInvoices();
    renderStats();
    showToast(`Invoice ${invNumber} created successfully!`, 'success');
  }

  function calcInvoiceTotal() {
    const amount = parseFloat(document.getElementById('invAmount')?.value) || 0;
    const taxPct = parseFloat(document.getElementById('invTax')?.value) || 0;
    const disc = parseFloat(document.getElementById('invDiscount')?.value) || 0;
    const total = amount + (amount * taxPct / 100) - disc;
    const el = document.getElementById('invTotal');
    if (el) el.textContent = formatCurrency(Math.max(0, total));
  }

  window.calcTotal = calcInvoiceTotal;

  document.getElementById('invAmount')?.addEventListener('input', calcInvoiceTotal);
  document.getElementById('invTax')?.addEventListener('input', calcInvoiceTotal);
  document.getElementById('invDiscount')?.addEventListener('input', calcInvoiceTotal);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
