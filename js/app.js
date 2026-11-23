// Enterprise360 – App Shell (shared sidebar/topbar/theme)
window.E360 = window.E360 || {};

const NAV_ITEMS = [
  { icon: 'bi-grid-1x2-fill', text: 'Dashboard',   href: 'dashboard.html',   roles: ['Super Admin','HR Manager','Project Manager','Employee','Finance Manager'] },
  { section: 'People' },
  { icon: 'bi-people',        text: 'HR Management', href: 'employees.html',  roles: ['Super Admin','HR Manager'] },
  { icon: 'bi-calendar-check', text: 'Attendance',    href: 'attendance.html', roles: ['Super Admin','HR Manager','Employee'] },
  { section: 'Work & Projects' },
  { icon: 'bi-kanban',        text: 'Projects',       href: 'projects.html',   roles: ['Super Admin','Project Manager','Employee'] },
  { icon: 'bi-check2-square', text: 'Tasks & Kanban', href: 'tasks.html',      roles: ['Super Admin','Project Manager','Employee'] },
  { section: 'Business & CRM' },
  { icon: 'bi-person-lines-fill', text: 'CRM Customers', href: 'customers.html', roles: ['Super Admin','Project Manager'] },
  { icon: 'bi-currency-dollar',   text: 'Finance',       href: 'finance.html',    roles: ['Super Admin','Finance Manager'] },
  { icon: 'bi-box-seam',          text: 'Inventory',     href: 'inventory.html',  roles: ['Super Admin','Finance Manager'] },
  { section: 'Analytics' },
  { icon: 'bi-bar-chart-line',    text: 'Reports & Analytics', href: 'reports.html', roles: ['Super Admin','Finance Manager','HR Manager','Project Manager'] },
  { section: 'Settings' },
  { icon: 'bi-bell',              text: 'Notifications',  href: 'notifications.html', roles: ['Super Admin','HR Manager','Project Manager','Employee','Finance Manager'], badgeKey: 'notifs' },
  { icon: 'bi-gear',              text: 'Settings',       href: 'settings.html',      roles: ['Super Admin','HR Manager','Project Manager','Employee','Finance Manager'] },
];

function renderSidebar(currentPage) {
  const user = window.E360.Auth.getCurrentUser();
  if (!user) return;

  const initials = window.E360.Utils.getInitials(user.name);
  const color = window.E360.Utils.avatarColor(user.name);

  // Unread count
  const notifs = window.E360.Storage.get('notifications', []);
  const unreadCount = notifs.filter(n => !n.read).length;

  let navHtml = '';
  NAV_ITEMS.forEach(item => {
    if (item.section) {
      navHtml += `<li class="nav-section-title">${item.section}</li>`;
      return;
    }
    if (!item.roles.includes(user.role)) return;
    const isActive = item.href === currentPage;
    const badgeHtml = (item.badgeKey === 'notifs' && unreadCount > 0)
      ? `<span class="badge bg-danger ms-auto rounded-pill" style="font-size:0.7rem">${unreadCount}</span>`
      : '';

    navHtml += `
      <li class="nav-item">
        <a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}">
          <i class="bi ${item.icon}"></i>
          <span class="nav-text">${item.text}</span>
          ${badgeHtml}
        </a>
      </li>`;
  });

  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon"><i class="bi bi-shield-check text-white"></i></div>
      <div class="brand-text-wrap">
        <div class="brand-text">Enterprise360</div>
        <div class="brand-subtext">Grow Together</div>
      </div>
    </div>
    <ul class="sidebar-nav list-unstyled">${navHtml}</ul>
    <div class="sidebar-theme-switch px-3 py-2 d-flex align-items-center justify-content-between">
      <div class="d-flex align-items-center gap-2" style="font-size:0.78rem;color:#94a3b8">
        <i class="bi bi-sun"></i> Light
      </div>
      <div class="form-check form-switch mb-0">
        <input class="form-check-input" type="checkbox" id="sidebarThemeSwitch">
      </div>
      <div class="d-flex align-items-center gap-2" style="font-size:0.78rem;color:#94a3b8">
        Dark <i class="bi bi-moon"></i>
      </div>
    </div>
    <div class="sidebar-upgrade-card">
      <div class="sidebar-upgrade-icon"><i class="bi bi-rocket-takeoff-fill"></i></div>
      <div class="sidebar-upgrade-title">Upgrade to Pro</div>
      <div class="sidebar-upgrade-desc">Get more features and unlimited access.</div>
      <button class="btn btn-upgrade" onclick="window.location.href='settings.html'">Upgrade Now</button>
    </div>
    <div class="sidebar-footer">
      <div class="avatar avatar-sm" style="background:${color};flex-shrink:0">${initials}</div>
      <div class="user-info overflow-hidden flex-1">
        <div style="font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.name}</div>
        <div style="font-size:.72rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.role}</div>
      </div>
      <i class="bi bi-chevron-down text-muted" style="font-size:.75rem"></i>
    </div>`;

  // Bind sidebar theme switch
  const sideSwitch = document.getElementById('sidebarThemeSwitch');
  if (sideSwitch) {
    const curTheme = document.documentElement.getAttribute('data-theme') || 'light';
    sideSwitch.checked = curTheme === 'dark';
    sideSwitch.addEventListener('change', () => {
      const next = sideSwitch.checked ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('e360_theme', next);
      const icon = document.getElementById('themeIcon');
      if (icon) icon.className = next === 'dark' ? 'bi bi-sun fs-5' : 'bi bi-moon fs-5';
    });
  }
}

function renderTopbar(title) {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;
  const user = window.E360.Auth.getCurrentUser();
  const color = window.E360.Utils.avatarColor(user?.name || '');
  const initials = window.E360.Utils.getInitials(user?.name || '');

  const notifs = window.E360.Storage.get('notifications', []);
  const unread = notifs.filter(n => !n.read).length;

  topbar.innerHTML = `
    <button class="btn-icon" id="sidebarToggle" aria-label="Toggle sidebar">
      <i class="bi bi-list fs-5"></i>
    </button>
    <div class="topbar-search flex-1 max-w-md">
      <div class="search-bar" style="max-width: 420px;">
        <i class="bi bi-search"></i>
        <input type="text" class="form-control" id="globalSearch" placeholder="Search anything... (e.g. employees, projects)">
      </div>
    </div>
    <div class="topbar-actions">
      <div class="dropdown d-none d-md-block">
        <button class="btn btn-sm btn-outline-primary d-flex align-items-center gap-1 dropdown-toggle" data-bs-toggle="dropdown">
          <i class="bi bi-lightning-charge"></i> Quick Actions
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow">
          <li><a class="dropdown-item py-2" href="employees.html"><i class="bi bi-person-plus me-2 text-primary"></i>Add Employee</a></li>
          <li><a class="dropdown-item py-2" href="projects.html"><i class="bi bi-kanban me-2 text-success"></i>Create Project</a></li>
          <li><a class="dropdown-item py-2" href="tasks.html"><i class="bi bi-check2-square me-2 text-warning"></i>New Task</a></li>
          <li><a class="dropdown-item py-2" href="finance.html"><i class="bi bi-receipt me-2 text-info"></i>Create Invoice</a></li>
          <li><a class="dropdown-item py-2" href="inventory.html"><i class="bi bi-box-seam me-2 text-secondary"></i>Record Stock</a></li>
        </ul>
      </div>
      <button class="btn-icon position-relative" id="notifBtn" title="Notifications" onclick="window.location.href='notifications.html'">
        <i class="bi bi-bell fs-5"></i>
        ${unread > 0 ? `<span class="badge bg-danger position-absolute top-0 start-100 translate-middle badge-pill" style="font-size:0.65rem">${unread}</span>` : ''}
      </button>
      <button class="btn-icon" id="themeToggle" title="Toggle theme">
        <i class="bi bi-moon fs-5" id="themeIcon"></i>
      </button>
      <div class="dropdown">
        <button class="btn d-flex align-items-center gap-2 p-1 border-0" data-bs-toggle="dropdown" aria-expanded="false">
          <div class="avatar avatar-sm" style="background:${color}">${initials}</div>
          <div class="d-none d-lg-block text-start" style="line-height:1.2">
            <div style="font-size:.82rem;font-weight:600">${user?.name || 'User'}</div>
            <div style="font-size:.70rem;color:var(--text-muted)">${user?.role || 'Guest'}</div>
          </div>
          <i class="bi bi-chevron-down text-muted d-none d-lg-block" style="font-size:.7rem"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end shadow">
          <li><div class="px-3 py-2 border-bottom">
            <div style="font-size:.85rem;font-weight:600">${user?.name}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${user?.email}</div>
            <span class="badge bg-primary bg-opacity-10 text-primary mt-1" style="font-size:.7rem">${user?.role}</span>
          </div></li>
          <li><a class="dropdown-item py-2" href="settings.html"><i class="bi bi-person me-2"></i>My Profile</a></li>
          <li><a class="dropdown-item py-2" href="settings.html"><i class="bi bi-gear me-2"></i>Settings & Themes</a></li>
          <li><hr class="dropdown-divider my-1"></li>
          <li><a class="dropdown-item py-2 text-danger" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
        </ul>
      </div>
    </div>`;

  const sidebarEl = document.getElementById('sidebar');
  const mainEl = document.getElementById('mainContent');
  const overlay = document.getElementById('sidebarOverlay');

  document.getElementById('sidebarToggle').addEventListener('click', () => {
    if (window.innerWidth < 992) {
      sidebarEl.classList.toggle('mobile-open');
      overlay?.classList.toggle('show');
    } else {
      sidebarEl.classList.toggle('collapsed');
      mainEl?.classList.toggle('sidebar-collapsed');
      window.E360.Storage.set('sidebarCollapsed', sidebarEl.classList.contains('collapsed'));
    }
  });

  overlay?.addEventListener('click', () => {
    sidebarEl.classList.remove('mobile-open');
    overlay.classList.remove('show');
  });

  if (window.E360.Storage.get('sidebarCollapsed') && window.innerWidth >= 992) {
    sidebarEl?.classList.add('collapsed');
    mainEl?.classList.add('sidebar-collapsed');
  }

  const updateThemeIcon = () => {
    const t = document.documentElement.getAttribute('data-theme');
    const icon = document.getElementById('themeIcon');
    if (icon) icon.className = t === 'dark' ? 'bi bi-sun fs-5' : 'bi bi-moon fs-5';
    const sideSwitch = document.getElementById('sidebarThemeSwitch');
    if (sideSwitch) sideSwitch.checked = (t === 'dark');
  };
  updateThemeIcon();

  document.getElementById('themeToggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('e360_theme', next);
    updateThemeIcon();
  });

  document.getElementById('logoutBtn').addEventListener('click', e => {
    e.preventDefault();
    window.E360.Auth.logout();
  });

  // Global search handler
  const globalSearch = document.getElementById('globalSearch');
  if (globalSearch) {
    globalSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = globalSearch.value.trim().toLowerCase();
        if (query) {
          if (query.includes('emp') || query.includes('staff')) window.location.href = 'employees.html';
          else if (query.includes('proj')) window.location.href = 'projects.html';
          else if (query.includes('task')) window.location.href = 'tasks.html';
          else if (query.includes('cust') || query.includes('crm') || query.includes('client')) window.location.href = 'customers.html';
          else if (query.includes('fin') || query.includes('inv') || query.includes('money')) window.location.href = 'finance.html';
          else if (query.includes('stock') || query.includes('item')) window.location.href = 'inventory.html';
          else if (query.includes('rep') || query.includes('chart')) window.location.href = 'reports.html';
          else window.location.href = 'dashboard.html';
        }
      }
    });
  }
}

async function initPage(title, currentPage) {
  const theme = localStorage.getItem('e360_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);

  const user = window.E360.Auth.requireAuth();
  if (!user) return null;

  if (!window.E360.Storage.get('notifications')) {
    const data = await window.E360.getSampleData();
    if (data?.notifications) window.E360.Storage.set('notifications', data.notifications);
  }

  renderSidebar(currentPage);
  renderTopbar(title);

  return user;
}

window.E360.App = { renderSidebar, renderTopbar, initPage, NAV_ITEMS };
window.initPage = initPage;
window.renderSidebar = renderSidebar;
window.renderTopbar = renderTopbar;
