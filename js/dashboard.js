// Enterprise360 – Dashboard JS
// Renders stat cards, charts, activity feed, Kanban widget and mini-calendar
(function () {
  'use strict';

  /* ── helpers ── */
  const { Storage }                                      = window.E360;
  const { formatCurrency, timeAgo, formatDate, showToast } = window.E360.Utils;
  const { getSampleData }                                = window.E360;

  let revenueChart = null;
  let projectChart = null;
  let calState     = { year: 0, month: 0 };

  /* ═══════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════ */
  async function init() {
    const user = await window.initPage('Dashboard', 'dashboard.html');
    if (!user) return;

    /* load data (LS → seed fallback) */
    const seed       = await getSampleData();
    const employees  = Storage.get('employees',    seed.employees    || []);
    const projects   = Storage.get('projects',     seed.projects     || []);
    const tasks      = Storage.get('tasks',        seed.tasks        || []);
    const customers  = Storage.get('customers',    seed.customers    || []);
    const txns       = Storage.get('transactions', seed.transactions || []);
    const notifs     = Storage.get('notifications',seed.notifications|| []);

    /* render all sections */
    renderStatCards(employees, projects, tasks, customers, txns);
    renderRevenueChart(txns);
    renderProjectChart(projects);
    renderActivity(notifs);
    renderKanban(tasks, projects);
    initCalendar(projects);

    /* date filter dropdown */
    document.querySelectorAll('.date-opt').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.date-opt').forEach(x => x.classList.remove('active'));
        el.classList.add('active');
        const btn = document.getElementById('dateFilterBtn');
        if (btn) btn.innerHTML = `<i class="bi bi-calendar3 me-2"></i>${el.textContent}`;
        const range = +el.dataset.range;
        renderStatCards(employees, projects, tasks, customers, txns, range);
        renderRevenueChart(txns, range);
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     STAT CARDS  (6 cards in 2×3 on xl, 2×3 on sm)
  ═══════════════════════════════════════════════════ */
  function renderStatCards(employees, projects, tasks, customers, txns, days) {
    const cut     = days ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : null;
    const fTxns   = cut ? txns.filter(t => t.date >= cut) : txns;
    const revenue = fTxns.filter(t => t.type === 'Income').reduce((s, t) => s + t.amount, 0);
    const expense = fTxns.filter(t => t.type === 'Expense').reduce((s, t) => s + t.amount, 0);
    const pending = tasks.filter(t => t.status !== 'Done').length;
    const active  = projects.filter(p => p.status === 'In Progress').length;

    const cards = [
      {
        label: 'Total Employees', value: employees.length,
        icon: 'bi-people-fill', cls: 'stat-icon-blue',
        trend: '+2 this month', up: true,
        wave: 'M0,30 C20,10 40,50 60,30 C80,10 100,50 120,30 L120,45 L0,45 Z'
      },
      {
        label: 'Active Projects', value: active,
        icon: 'bi-kanban-fill', cls: 'stat-icon-green',
        trend: `${projects.length} total`, up: true,
        wave: 'M0,35 C15,15 35,45 60,25 C85,5 105,40 120,20 L120,45 L0,45 Z'
      },
      {
        label: 'Total Customers', value: customers.length,
        icon: 'bi-person-check-fill', cls: 'stat-icon-purple',
        trend: '+3 new leads', up: true,
        wave: 'M0,40 C30,20 60,50 90,25 C100,18 110,30 120,15 L120,45 L0,45 Z'
      },
      {
        label: 'Pending Tasks', value: pending,
        icon: 'bi-check2-square', cls: 'stat-icon-orange',
        trend: `${tasks.length} total`, up: false,
        wave: 'M0,20 C20,40 50,15 80,35 C100,48 110,30 120,42 L120,45 L0,45 Z'
      },
      {
        label: 'Total Revenue', value: formatCurrency(revenue),
        icon: 'bi-graph-up-arrow', cls: 'stat-icon-cyan',
        trend: '+12% vs last period', up: true,
        wave: 'M0,30 C10,45 30,10 60,30 C90,50 110,20 120,35 L120,45 L0,45 Z'
      },
      {
        label: 'Total Expenses', value: formatCurrency(expense),
        icon: 'bi-graph-down-arrow', cls: 'stat-icon-red',
        trend: '-3% vs last period', up: false,
        wave: 'M0,15 C20,35 50,20 80,40 C100,52 110,25 120,30 L120,45 L0,45 Z'
      },
    ];

    const waveColors = ['#3b82f6','#10b981','#8b5cf6','#f97316','#06b6d4','#ef4444'];

    const el = document.getElementById('statCards');
    if (!el) return;

    el.innerHTML = cards.map((c, i) => `
      <div class="col-sm-6 col-xl-4">
        <div class="stat-card-modern">
          <div class="stat-header">
            <div class="stat-icon-square ${c.cls}">
              <i class="bi ${c.icon}"></i>
            </div>
            <div>
              <div class="stat-title">${c.label}</div>
            </div>
          </div>
          <div class="stat-main-val">${c.value}</div>
          <div class="d-flex align-items-center justify-content-between mt-2">
            <span class="stat-badge-trend ${c.up ? 'trend-up' : 'trend-down'}">
              <i class="bi bi-arrow-${c.up ? 'up' : 'down'}-short"></i>${c.trend}
            </span>
          </div>
          <svg class="stat-wave" viewBox="0 0 120 45" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path d="${c.wave}" fill="${waveColors[i]}"/>
          </svg>
        </div>
      </div>`).join('');
  }

  /* ═══════════════════════════════════════════════════
     BUSINESS OVERVIEW CHART  (area/line spline)
  ═══════════════════════════════════════════════════ */
  function renderRevenueChart(txns, days) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;

    const months   = days ? Math.ceil(days / 30) : 6;
    const labels   = [];
    const revenues = [];
    const expenses = [];

    for (let i = months - 1; i >= 0; i--) {
      const d  = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const ym  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const lbl = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      labels.push(lbl);
      revenues.push(txns.filter(t => t.type === 'Income'  && t.date.startsWith(ym)).reduce((s, t) => s + t.amount, 0));
      expenses.push(txns.filter(t => t.type === 'Expense' && t.date.startsWith(ym)).reduce((s, t) => s + t.amount, 0));
    }

    const dark  = document.documentElement.getAttribute('data-theme') === 'dark';
    const grid  = dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.07)';
    const ticks = dark ? '#94a3b8' : '#64748b';

    if (revenueChart) revenueChart.destroy();

    const ctx = canvas.getContext('2d');
    const gradient1 = ctx.createLinearGradient(0, 0, 0, 250);
    gradient1.addColorStop(0,   'rgba(79,70,229,.35)');
    gradient1.addColorStop(1,   'rgba(79,70,229,.0)');
    const gradient2 = ctx.createLinearGradient(0, 0, 0, 250);
    gradient2.addColorStop(0,   'rgba(139,92,246,.35)');
    gradient2.addColorStop(1,   'rgba(139,92,246,.0)');

    revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Revenue',
            data: revenues,
            borderColor: '#4f46e5',
            backgroundColor: gradient1,
            borderWidth: 2.5,
            tension: 0.45,
            fill: true,
            pointBackgroundColor: '#4f46e5',
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Expenses',
            data: expenses,
            borderColor: '#8b5cf6',
            backgroundColor: gradient2,
            borderWidth: 2.5,
            tension: 0.45,
            fill: true,
            pointBackgroundColor: '#8b5cf6',
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: dark ? '#1e293b' : '#fff',
            titleColor: dark ? '#e2e8f0' : '#1e293b',
            bodyColor: dark ? '#94a3b8' : '#475569',
            borderColor: dark ? '#334155' : '#e2e8f0',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
            }
          }
        },
        scales: {
          x: { grid: { color: grid }, ticks: { color: ticks, font: { size: 11 } } },
          y: {
            grid: { color: grid },
            ticks: {
              color: ticks,
              font: { size: 11 },
              callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
            }
          }
        }
      }
    });
  }

  /* ═══════════════════════════════════════════════════
     PROJECT PROGRESS DONUT
  ═══════════════════════════════════════════════════ */
  function renderProjectChart(projects) {
    const canvas = document.getElementById('projectChart');
    if (!canvas) return;

    const statuses = { 'Planning': 0, 'In Progress': 0, 'Completed': 0 };
    projects.forEach(p => { if (statuses[p.status] !== undefined) statuses[p.status]++; });

    const total     = projects.length || 1;
    const completed = statuses['Completed'];
    const overall   = Math.round((completed / total) * 100);

    const pctEl = document.getElementById('overallProgressPercent');
    if (pctEl) pctEl.textContent = overall + '%';

    const colors = ['#f59e0b', '#4f46e5', '#10b981'];

    if (projectChart) projectChart.destroy();

    projectChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: Object.keys(statuses),
        datasets: [{
          data: Object.values(statuses),
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 10
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%',
        plugins: { legend: { display: false } }
      }
    });

    const legEl = document.getElementById('projectLegend');
    if (legEl) {
      legEl.innerHTML = Object.keys(statuses).map((k, i) => `
        <div class="d-flex align-items-center justify-content-between" style="font-size:.8rem">
          <div class="d-flex align-items-center gap-2">
            <span style="width:10px;height:10px;border-radius:50%;background:${colors[i]};display:inline-block;flex-shrink:0"></span>
            <span>${k}</span>
          </div>
          <span class="fw-semibold">${statuses[k]}</span>
        </div>`).join('');
    }
  }

  /* ═══════════════════════════════════════════════════
     RECENT ACTIVITY FEED
  ═══════════════════════════════════════════════════ */
  function renderActivity(notifs) {
    const actEl = document.getElementById('activityList');
    if (!actEl) return;

    const typeCfg = {
      info:    { bg: 'rgba(59,130,246,.12)',   color: '#3b82f6', icon: 'bi-info-circle-fill' },
      success: { bg: 'rgba(16,185,129,.12)',   color: '#10b981', icon: 'bi-check-circle-fill' },
      warning: { bg: 'rgba(245,158,11,.12)',   color: '#f59e0b', icon: 'bi-exclamation-triangle-fill' },
      danger:  { bg: 'rgba(239,68,68,.12)',    color: '#ef4444', icon: 'bi-x-circle-fill' },
    };

    const items = notifs.slice(0, 7);
    if (!items.length) {
      actEl.innerHTML = `<div class="empty-state"><i class="bi bi-bell-slash"></i><h6>No recent activity</h6></div>`;
      return;
    }

    actEl.innerHTML = items.map(n => {
      const cfg = typeCfg[n.type] || typeCfg.info;
      return `
        <div class="activity-item-card">
          <div class="activity-icon-badge" style="background:${cfg.bg};color:${cfg.color}">
            <i class="bi ${cfg.icon}"></i>
          </div>
          <div class="activity-body">
            <div class="activity-text${n.read ? '' : ' fw-semibold'}">${n.title}</div>
            <div class="activity-time">${n.message}</div>
            <div class="activity-time">${timeAgo(n.time)}</div>
          </div>
          ${!n.read ? '<span class="notif-dot bg-primary flex-shrink-0 mt-1"></span>' : ''}
        </div>`;
    }).join('');
  }

  /* ═══════════════════════════════════════════════════
     KANBAN WIDGET  (3 columns on dashboard)
  ═══════════════════════════════════════════════════ */
  function renderKanban(tasks, projects) {
    const el = document.getElementById('dashKanbanRow');
    if (!el) return;

    const cols = [
      { key: 'Todo',        label: 'To Do',       color: '#f59e0b', bg: 'rgba(245,158,11,.1)'  },
      { key: 'In Progress', label: 'In Progress',  color: '#4f46e5', bg: 'rgba(79,70,229,.1)'   },
      { key: 'Done',        label: 'Done',         color: '#10b981', bg: 'rgba(16,185,129,.1)'  },
    ];

    const pColors = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
    const projectName = id => (projects.find(p => p.id === +id) || {}).name || 'General';

    el.innerHTML = cols.map(col => {
      const colTasks = tasks.filter(t => t.status === col.key).slice(0, 3);
      const cards = colTasks.length ? colTasks.map(t => `
        <div class="dash-kanban-item">
          <div class="dash-kanban-title">${t.title}</div>
          <div class="d-flex align-items-center justify-content-between mt-2">
            <span style="font-size:.72rem;color:var(--text-muted)">${projectName(t.projectId)}</span>
            <span style="width:8px;height:8px;border-radius:50%;background:${pColors[t.priority]||'#64748b'};display:inline-block" title="${t.priority}"></span>
          </div>
          <div class="d-flex align-items-center justify-content-between mt-2">
            <div class="avatar-stack">
              <div class="avatar avatar-xs" style="background:${window.E360.Utils.avatarColor(t.assignee||'?')};font-size:.6rem">
                ${window.E360.Utils.getInitials(t.assignee||'?')}
              </div>
            </div>
            <span style="font-size:.72rem;color:var(--text-muted)">${t.dueDate ? formatDate(t.dueDate) : 'No due date'}</span>
          </div>
        </div>`).join('') : `<div class="text-muted text-center py-3" style="font-size:.8rem">No tasks</div>`;

      return `
        <div class="col-4">
          <div class="dash-kanban-col">
            <div class="dash-kanban-header">
              <span style="color:${col.color}">${col.label}</span>
              <span class="badge" style="background:${col.bg};color:${col.color};font-size:.72rem">${tasks.filter(t=>t.status===col.key).length}</span>
            </div>
            ${cards}
          </div>
        </div>`;
    }).join('');
  }

  /* ═══════════════════════════════════════════════════
     MINI CALENDAR WIDGET
  ═══════════════════════════════════════════════════ */
  function initCalendar(projects) {
    const now = new Date();
    calState  = { year: now.getFullYear(), month: now.getMonth() };

    renderCalendar(projects);

    document.getElementById('prevCalMonth')?.addEventListener('click', () => {
      calState.month--;
      if (calState.month < 0) { calState.month = 11; calState.year--; }
      renderCalendar(projects);
    });
    document.getElementById('nextCalMonth')?.addEventListener('click', () => {
      calState.month++;
      if (calState.month > 11) { calState.month = 0; calState.year++; }
      renderCalendar(projects);
    });
  }

  function renderCalendar(projects) {
    const { year, month } = calState;
    const now     = new Date();
    const isNow   = year === now.getFullYear() && month === now.getMonth();
    const today   = now.getDate();

    /* month label */
    const lbl = document.getElementById('calMonthLabel');
    if (lbl) lbl.textContent = new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

    /* project due-dates this month */
    const monthStr  = `${year}-${String(month + 1).padStart(2, '0')}`;
    const dueDates  = new Set(
      projects
        .filter(p => p.dueDate && p.dueDate.startsWith(monthStr))
        .map(p => +p.dueDate.split('-')[2])
    );

    /* build grid */
    const firstDay  = new Date(year, month, 1).getDay();  // 0=Sun
    const daysInMo  = new Date(year, month + 1, 0).getDate();
    const prevDays  = new Date(year, month, 0).getDate(); // prev month total days

    let cells = '';

    /* leading empty cells (prev month tail) */
    for (let i = firstDay - 1; i >= 0; i--) {
      cells += `<div class="cal-cell cal-muted">${prevDays - i}</div>`;
    }

    /* current month days */
    for (let d = 1; d <= daysInMo; d++) {
      const isToday = isNow && d === today;
      const hasEvent = dueDates.has(d);
      const cls = isToday ? 'cal-active' : '';
      const dot = (!isToday && hasEvent)
        ? `<span style="display:block;width:4px;height:4px;border-radius:50%;background:#4f46e5;margin:0 auto;margin-top:-2px"></span>`
        : '';
      cells += `<div class="cal-cell ${cls}" data-day="${d}" title="${hasEvent ? 'Project deadline' : ''}">${d}${dot}</div>`;
    }

    /* trailing empty cells */
    const totalCells = firstDay + daysInMo;
    const trailing   = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let d = 1; d <= trailing; d++) {
      cells += `<div class="cal-cell cal-muted">${d}</div>`;
    }

    const grid = document.getElementById('calDaysGrid');
    if (grid) grid.innerHTML = cells;
  }

  /* ═══════════════════════════════════════════════════
     BOOT
  ═══════════════════════════════════════════════════ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
