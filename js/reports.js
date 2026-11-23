// Enterprise360 – Reports & Analytics JS
(function() {
  const { Storage } = window.E360;
  const { formatDate, formatCurrency, exportCSV, showToast } = window.E360.Utils;
  const { getSampleData } = window.E360;

  let employees = [];
  let projects = [];
  let customers = [];
  let transactions = [];
  let attendance = [];
  let leaves = [];
  let activeTab = 'employee';

  async function init() {
    const user = await window.initPage('Reports', 'reports.html');
    if (!user) return;

    const data = await getSampleData();
    employees = Storage.get('employees', data.employees || []);
    projects = Storage.get('projects', data.projects || []);
    customers = Storage.get('customers', data.customers || []);
    transactions = Storage.get('transactions', data.transactions || []);
    attendance = Storage.get('attendance', data.attendance || []);
    leaves = Storage.get('leaves', data.leaves || []);

    const today = new Date();
    const fromD = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('fromDate').value = fromD;
    document.getElementById('toDate').value = today.toISOString().split('T')[0];

    renderEmployeeReport();

    document.querySelectorAll('#reportTabs .nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#reportTabs .nav-link').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTab = btn.dataset.tab;
        ['employee', 'project', 'sales', 'financial', 'attendance'].forEach(t => {
          const el = document.getElementById(t + '-panel');
          if (el) el.classList.toggle('d-none', t !== activeTab);
        });
        renderActiveReport();
      });
    });

    document.getElementById('fromDate')?.addEventListener('change', renderActiveReport);
    document.getElementById('toDate')?.addEventListener('change', renderActiveReport);
    document.getElementById('exportAllBtn')?.addEventListener('click', exportCurrent);
    document.getElementById('exportPdfBtn')?.addEventListener('click', exportPDF);
  }

  function renderActiveReport() {
    const fns = {
      employee: renderEmployeeReport,
      project: renderProjectReport,
      sales: renderSalesReport,
      financial: renderFinancialReport,
      attendance: renderAttReport
    };
    if (fns[activeTab]) fns[activeTab]();
  }

  function makeChart(id, type, labels, datasets, opts = {}) {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (Chart.getChart(id)) Chart.getChart(id).destroy();
    const textColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#94a3b8' : '#64748b';
    new Chart(canvas.getContext('2d'), {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: textColor, font: { size: 11 } } } },
        scales: (type === 'pie' || type === 'doughnut') ? {} : {
          x: { ticks: { color: textColor } },
          y: { ticks: { color: textColor } }
        },
        ...opts
      }
    });
  }

  function renderEmployeeReport() {
    const depts = {}, statuses = {};
    employees.forEach(e => {
      depts[e.department] = (depts[e.department] || 0) + 1;
      statuses[e.status] = (statuses[e.status] || 0) + 1;
    });

    makeChart('empDeptChart', 'bar', Object.keys(depts), [{ label: 'Employees', data: Object.values(depts), backgroundColor: '#4f46e5', borderRadius: 4 }]);
    makeChart('empStatusChart', 'doughnut', Object.keys(statuses), [{ data: Object.values(statuses), backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }]);

    const statusCls = { Active: 'badge-active', Inactive: 'badge-inactive' };
    const tb = document.getElementById('empReportTable');
    if (tb) {
      tb.innerHTML = employees.map(e => `
        <tr>
          <td style="font-size:.85rem;font-weight:600">${e.name}</td>
          <td style="font-size:.82rem">${e.department}</td>
          <td style="font-size:.82rem">${e.designation}</td>
          <td style="font-size:.82rem">${formatDate(e.joinDate)}</td>
          <td style="font-size:.85rem">${formatCurrency(e.salary)}</td>
          <td><span class="badge-status ${statusCls[e.status] || 'badge-pending'}">${e.status}</span></td>
        </tr>`).join('');
    }
  }

  function renderProjectReport() {
    const statuses = { Planning: 0, 'In Progress': 0, Completed: 0 };
    projects.forEach(p => { if (statuses[p.status] !== undefined) statuses[p.status]++; });
    makeChart('projStatusChart', 'doughnut', Object.keys(statuses), [{ data: Object.values(statuses), backgroundColor: ['#f59e0b', '#4f46e5', '#10b981'], borderWidth: 0 }]);

    const overview = document.getElementById('projProgressOverview');
    if (overview) {
      overview.innerHTML = projects.map(p => `
        <div class="d-flex align-items-center gap-2 mb-2">
          <div style="font-size:.82rem;width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.name}</div>
          <div class="progress flex-1" style="height:6px"><div class="progress-bar bg-primary" style="width:${p.progress}%"></div></div>
          <span class="text-muted" style="font-size:.75rem;width:34px">${p.progress}%</span>
        </div>`).join('');
    }

    const statusCls = { Planning: 'badge-pending', 'In Progress': 'badge-inprogress', Completed: 'badge-completed' };
    const pCls = { High: 'priority-high', Medium: 'priority-medium', Low: 'priority-low' };
    const tb = document.getElementById('projReportTable');
    if (tb) {
      tb.innerHTML = projects.map(p => `
        <tr>
          <td style="font-size:.85rem;font-weight:600">${p.name}</td>
          <td style="font-size:.82rem">${p.client}</td>
          <td style="font-size:.82rem">${p.manager}</td>
          <td><span class="badge-status ${statusCls[p.status] || 'badge-pending'}">${p.status}</span></td>
          <td><span class="badge px-2 py-1 rounded ${pCls[p.priority] || ''}" style="font-size:.72rem">${p.priority}</span></td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <div class="progress" style="width:60px;height:5px"><div class="progress-bar bg-primary" style="width:${p.progress}%"></div></div>
              <span style="font-size:.75rem">${p.progress}%</span>
            </div>
          </td>
          <td style="font-size:.82rem">${formatDate(p.dueDate)}</td>
        </tr>`).join('');
    }
  }

  function renderSalesReport() {
    const stages = ['Prospect', 'Negotiation', 'Won', 'Lost'];
    const vals = stages.map(s => customers.filter(c => c.leadStatus === s).reduce((t, c) => t + (c.value || 0), 0));
    makeChart('salesChart', 'bar', stages, [{ label: 'Pipeline Value', data: vals, backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'], borderRadius: 4 }]);
    const lData = stages.map(s => customers.filter(c => c.leadStatus === s).length);
    makeChart('leadChart', 'doughnut', stages, [{ data: lData, backgroundColor: ['#3b82f6', '#f59e0b', '#10b981', '#ef4444'], borderWidth: 0 }]);

    const leadCls = { Won: 'badge-won', Lost: 'badge-lost', Prospect: 'badge-prospect', Negotiation: 'badge-pending' };
    const tb = document.getElementById('custReportTable');
    if (tb) {
      tb.innerHTML = customers.map(c => `
        <tr>
          <td style="font-size:.85rem;font-weight:600">${c.name}</td>
          <td style="font-size:.82rem">${c.contact || '—'}</td>
          <td style="font-size:.82rem">${c.type}</td>
          <td><span class="badge-status ${leadCls[c.leadStatus] || 'badge-pending'}">${c.leadStatus}</span></td>
          <td style="font-size:.85rem;font-weight:600">${formatCurrency(c.value)}</td>
        </tr>`).join('');
    }
  }

  function renderFinancialReport() {
    const labels = [], incomes = [], expenses = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(d.toLocaleString('en-US', { month: 'short' }));
      incomes.push(transactions.filter(t => t.type === 'Income' && t.date.startsWith(ym)).reduce((s, t) => s + (t.amount || 0), 0));
      expenses.push(transactions.filter(t => t.type === 'Expense' && t.date.startsWith(ym)).reduce((s, t) => s + (t.amount || 0), 0));
    }
    makeChart('finTrendChart', 'line', labels, [
      { label: 'Income', data: incomes, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)', fill: true, tension: .4 },
      { label: 'Expenses', data: expenses, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.1)', fill: true, tension: .4 }
    ]);

    const totalIn = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + (t.amount || 0), 0);
    const totalEx = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + (t.amount || 0), 0);
    makeChart('finPieChart', 'doughnut', ['Income', 'Expenses'], [{ data: [totalIn, totalEx], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0 }]);

    const leg = document.getElementById('finPieLegend');
    if (leg) {
      leg.innerHTML = `<div style="font-size:.78rem;text-align:center"><span style="color:#10b981;font-weight:600">Income: ${formatCurrency(totalIn)}</span><br><span style="color:#ef4444;font-weight:600">Expenses: ${formatCurrency(totalEx)}</span></div>`;
    }

    const sCls = { Paid: 'badge-paid', Pending: 'badge-pending' };
    const tb = document.getElementById('finReportTable');
    if (tb) {
      tb.innerHTML = transactions.map(t => `
        <tr>
          <td style="font-size:.82rem">${formatDate(t.date)}</td>
          <td style="font-size:.85rem">${t.description}</td>
          <td style="font-size:.82rem">${t.category}</td>
          <td><span class="badge ${t.type === 'Income' ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${t.type === 'Income' ? 'text-success' : 'text-danger'}" style="font-size:.75rem">${t.type}</span></td>
          <td style="font-size:.85rem;font-weight:600;color:${t.type === 'Income' ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(t.amount)}</td>
          <td><span class="badge-status ${sCls[t.status] || 'badge-pending'}">${t.status}</span></td>
        </tr>`).join('');
    }
  }

  function renderAttReport() {
    const statuses = { Present: 0, Absent: 0, Late: 0, 'Half Day': 0 };
    attendance.forEach(a => { if (statuses[a.status] !== undefined) statuses[a.status]++; });
    makeChart('attChart', 'bar', Object.keys(statuses), [{ label: 'Count', data: Object.values(statuses), backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'], borderRadius: 4 }]);

    const lStatus = { Pending: 0, Approved: 0, Rejected: 0 };
    leaves.forEach(l => { if (lStatus[l.status] !== undefined) lStatus[l.status]++; });
    makeChart('leaveChart', 'doughnut', Object.keys(lStatus), [{ data: Object.values(lStatus), backgroundColor: ['#f59e0b', '#10b981', '#ef4444'], borderWidth: 0 }]);

    const sCls = { Present: 'badge-present', Absent: 'badge-inactive', Late: 'badge-late', 'Half Day': 'badge-pending' };
    const tb = document.getElementById('attReportTable');
    if (tb) {
      tb.innerHTML = attendance.map(a => `
        <tr>
          <td style="font-size:.85rem;font-weight:600">${a.employeeName}</td>
          <td style="font-size:.82rem">${formatDate(a.date)}</td>
          <td style="font-size:.82rem">${a.checkIn || '—'}</td>
          <td style="font-size:.82rem">${a.checkOut || '—'}</td>
          <td><span class="badge-status ${sCls[a.status] || 'badge-pending'}">${a.status}</span></td>
        </tr>`).join('');
    }
  }

  function exportCurrent() {
    const dataMap = {
      employee: employees,
      project: projects,
      sales: customers,
      financial: transactions,
      attendance: attendance
    };
    exportCSV(dataMap[activeTab] || [], `${activeTab}-report.csv`);
  }

  function exportPDF() {
    const targetElement = document.getElementById(`${activeTab}-panel`);
    if (!targetElement) return;

    if (typeof html2pdf !== 'undefined') {
      showToast('Generating PDF report...', 'info');
      const opt = {
        margin: 10,
        filename: `enterprise360-${activeTab}-report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };
      html2pdf().set(opt).from(targetElement).save().then(() => {
        showToast('PDF downloaded successfully!', 'success');
      });
    } else {
      window.print();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
