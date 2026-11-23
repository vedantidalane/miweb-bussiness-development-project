// Enterprise360 – Dashboard JS
(function() {
  const { Storage } = window.E360;
  const { formatCurrency, statusBadge, timeAgo, avatarHtml, formatDate } = window.E360.Utils;
  const { getSampleData } = window.E360;

  let revenueChart, projectChart, deptChart;

  async function init() {
    const user = await window.initPage('Dashboard', 'dashboard.html');
    if (!user) return;

    document.getElementById('dateDisplay').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    document.getElementById('filterDate').value = new Date().toISOString().split('T')[0];

    const data = await getSampleData();
    const employees = Storage.get('employees', data.employees || []);
    const projects  = Storage.get('projects', data.projects || []);
    const tasks     = Storage.get('tasks', data.tasks || []);
    const customers = Storage.get('customers', data.customers || []);
    const transactions = Storage.get('transactions', data.transactions || []);
    const notifications = Storage.get('notifications', data.notifications || []);

    renderStats(employees, projects, tasks, customers, transactions);
    renderRevenueChart(transactions);
    renderProjectChart(projects);
    renderDeptChart(employees);
    renderActivity(notifications);
    renderActiveProjects(projects);
    renderPendingTasks(tasks);

    document.getElementById('chartPeriod')?.addEventListener('change', () => renderRevenueChart(transactions));
    document.getElementById('filterPeriod')?.addEventListener('change', () => renderStats(employees, projects, tasks, customers, transactions));
  }

  function renderStats(employees, projects, tasks, customers, transactions) {
    const totalIncome = transactions.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const pendingTasks = tasks.filter(t => t.status !== 'Done').length;
    const activeProjects = projects.filter(p => p.status === 'In Progress').length;

    const stats = [
      { label:'Total Employees', value: employees.length, icon:'bi-people', iconBg:'bg-primary-soft', change:'+2 this month', up:true },
      { label:'Active Projects', value: activeProjects, icon:'bi-kanban', iconBg:'bg-success-soft', change:`${projects.length} total`, up:true },
      { label:'Total Customers', value: customers.length, icon:'bi-person-check', iconBg:'bg-info-soft', change:'+1 new lead', up:true },
      { label:'Pending Tasks', value: pendingTasks, icon:'bi-check2-square', iconBg:'bg-warning-soft', change:`${tasks.length} total`, up:false },
      { label:'Total Revenue', value: formatCurrency(totalIncome), icon:'bi-graph-up-arrow', iconBg:'bg-success-soft', change:'+12% this month', up:true },
      { label:'Total Expenses', value: formatCurrency(totalExpense), icon:'bi-graph-down-arrow', iconBg:'bg-danger-soft', change:'-3% vs last month', up:false },
    ];

    const statEl = document.getElementById('statCards');
    if (statEl) {
      statEl.innerHTML = stats.map(s => `
        <div class="col-sm-6 col-xl-4">
          <div class="stat-card">
            <div class="stat-icon ${s.iconBg}"><i class="bi ${s.icon}"></i></div>
            <div class="stat-info">
              <div class="stat-value">${s.value}</div>
              <div class="stat-label">${s.label}</div>
              <div class="stat-change ${s.up ? 'up' : 'down'}">
                <i class="bi bi-arrow-${s.up ? 'up' : 'down'}-short"></i>${s.change}
              </div>
            </div>
          </div>
        </div>`).join('');
    }
  }

  function getChartColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return { grid: isDark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)', text: isDark ? '#94a3b8' : '#64748b' };
  }

  function renderRevenueChart(transactions) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    const months = parseInt(document.getElementById('chartPeriod')?.value || '6');
    const labels = [];
    const incomes = [];
    const expenses = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      labels.push(monthStr);
      incomes.push(transactions.filter(t => t.type === 'Income' && t.date.startsWith(ym)).reduce((s,t) => s+t.amount, 0));
      expenses.push(transactions.filter(t => t.type === 'Expense' && t.date.startsWith(ym)).reduce((s,t) => s+t.amount, 0));
    }

    const ctx = canvas.getContext('2d');
    const { grid, text } = getChartColors();
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label:'Revenue', data: incomes, backgroundColor:'rgba(79,70,229,.8)', borderRadius: 6, borderSkipped: false },
          { label:'Expenses', data: expenses, backgroundColor:'rgba(239,68,68,.7)', borderRadius: 6, borderSkipped: false }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: text, font: { size: 12 } } } },
        scales: {
          x: { grid: { color: grid }, ticks: { color: text } },
          y: { grid: { color: grid }, ticks: { color: text, callback: v => '$' + (v/1000).toFixed(0) + 'k' } }
        }
      }
    });
  }

  function renderProjectChart(projects) {
    const canvas = document.getElementById('projectChart');
    if (!canvas) return;
    const statuses = { 'Planning':0, 'In Progress':0, 'Completed':0 };
    projects.forEach(p => { if (statuses[p.status] !== undefined) statuses[p.status]++; });
    const colors = ['#f59e0b','#4f46e5','#10b981'];
    const ctx = canvas.getContext('2d');
    if (projectChart) projectChart.destroy();
    projectChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(statuses),
        datasets: [{ data: Object.values(statuses), backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
    const legEl = document.getElementById('projectLegend');
    if (legEl) {
      legEl.innerHTML = Object.keys(statuses).map((k,i) =>
        `<div class="d-flex align-items-center gap-1" style="font-size:.78rem">
          <span style="width:10px;height:10px;border-radius:50%;background:${colors[i]};display:inline-block"></span>
          ${k} (${statuses[k]})</div>`).join('');
    }
  }

  function renderDeptChart(employees) {
    const canvas = document.getElementById('deptChart');
    if (!canvas) return;
    const depts = {};
    employees.forEach(e => { depts[e.department] = (depts[e.department] || 0) + 1; });
    const ctx = canvas.getContext('2d');
    const { grid, text } = getChartColors();
    if (deptChart) deptChart.destroy();
    deptChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: Object.keys(depts),
        datasets: [{ label:'Employees', data: Object.values(depts), backgroundColor: '#06b6d4', borderRadius: 4 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: grid }, ticks: { color: text, stepSize: 1 } },
          y: { grid: { display: false }, ticks: { color: text, font: { size: 11 } } }
        }
      }
    });
  }

  function renderActivity(notifications) {
    const typeIcon = { info:'bi-info-circle-fill text-info', success:'bi-check-circle-fill text-success', warning:'bi-exclamation-triangle-fill text-warning', danger:'bi-x-circle-fill text-danger' };
    const html = notifications.slice(0, 8).map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}">
        <i class="bi ${typeIcon[n.type] || 'bi-bell-fill'}" style="font-size:1rem;margin-top:2px"></i>
        <div class="flex-1">
          <div style="font-size:.85rem;font-weight:${n.read ? 400 : 600}">${n.title}</div>
          <div class="text-muted" style="font-size:.78rem">${n.message}</div>
          <div class="text-muted mt-1" style="font-size:.72rem">${timeAgo(n.time)}</div>
        </div>
        ${!n.read ? '<span class="notif-dot bg-primary"></span>' : ''}
      </div>`).join('');
    const actEl = document.getElementById('activityList');
    if (actEl) actEl.innerHTML = html || '<div class="empty-state"><i class="bi bi-bell-slash"></i><h6>No activity</h6></div>';
  }

  function renderActiveProjects(projects) {
    const active = projects.filter(p => p.status !== 'Completed').slice(0, 4);
    const statusColors = { 'Planning':'warning', 'In Progress':'primary', 'Completed':'success' };
    const el = document.getElementById('activeProjects');
    if (!el) return;
    el.innerHTML = active.map(p => `
      <div class="mb-3">
        <div class="d-flex justify-content-between align-items-start mb-1">
          <div>
            <div style="font-size:.88rem;font-weight:600">${p.name}</div>
            <div class="text-muted" style="font-size:.75rem">Client: ${p.client} · Due: ${formatDate(p.dueDate)}</div>
          </div>
          <span class="badge bg-${statusColors[p.status] || 'secondary'} bg-opacity-10 text-${statusColors[p.status] || 'secondary'}" style="font-size:.72rem">${p.status}</span>
        </div>
        <div class="d-flex align-items-center gap-2">
          <div class="progress flex-1" style="height:5px"><div class="progress-bar bg-primary" style="width:${p.progress}%"></div></div>
          <span class="text-muted" style="font-size:.72rem">${p.progress}%</span>
        </div>
      </div>`).join('') || '<div class="empty-state"><i class="bi bi-kanban"></i><h6>No active projects</h6></div>';
  }

  function renderPendingTasks(tasks) {
    const pending = tasks.filter(t => t.status !== 'Done').slice(0, 6);
    const pColors = { High:'danger', Medium:'warning', Low:'success' };
    const el = document.getElementById('pendingTasks');
    if (!el) return;
    el.innerHTML = pending.map(t => `
      <div class="d-flex align-items-center gap-3 px-3 py-2 border-bottom">
        <i class="bi bi-circle text-muted"></i>
        <div class="flex-1">
          <div style="font-size:.85rem;font-weight:500">${t.title}</div>
          <div class="text-muted" style="font-size:.75rem">${t.assignee} · ${formatDate(t.dueDate)}</div>
        </div>
        <span class="badge bg-${pColors[t.priority] || 'secondary'} bg-opacity-10 text-${pColors[t.priority] || 'secondary'}" style="font-size:.72rem">${t.priority}</span>
      </div>`).join('') || '<div class="empty-state p-3"><i class="bi bi-check-all"></i><h6>All caught up!</h6></div>';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
