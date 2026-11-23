// Enterprise360 – App Shell (shared sidebar/topbar/theme)
window.E360 = window.E360 || {};

const NAV_ITEMS = [
  { icon: 'bi-speedometer2', text: 'Dashboard',   href: 'dashboard.html',   section: null,          roles: ['Super Admin','HR Manager','Project Manager','Employee','Finance Manager'] },
  { section: 'People' },
  { icon: 'bi-people',       text: 'Employees',   href: 'employees.html',   roles: ['Super Admin','HR Manager'] },
  { icon: 'bi-calendar-check',text:'Attendance',  href: 'attendance.html',  roles: ['Super Admin','HR Manager','Employee'] },
  { section: 'Work' },
  { icon: 'bi-kanban',       text: 'Projects',    href: 'projects.html',    roles: ['Super Admin','Project Manager','Employee'] },
  { icon: 'bi-check2-square',text: 'Tasks',       href: 'tasks.html',       roles: ['Super Admin','Project Manager','Employee'] },
  { section: 'Business' },
  { icon: 'bi-people-fill',  text: 'Customers',   href: 'customers.html',   roles: ['Super Admin','Project Manager'] },
  { icon: 'bi-currency-dollar',text:'Finance',    href: 'finance.html',     roles: ['Super Admin','Finance Manager'] },
  { icon: 'bi-box-seam',     text: 'Inventory',   href: 'inventory.html',   roles: ['Super Admin','Finance Manager'] },
  { section: 'Reports' },
  { icon: 'bi-bar-chart-line',text:'Reports',     href: 'reports.html',     roles: ['Super Admin','Finance Manager','HR Manager','Project Manager'] },
  { section: 'System' },
  { icon: 'bi-bell',         text: 'Notifications',href:'notifications.html',roles: ['Super Admin','HR Manager','Project Manager','Employee','Finance Manager'] },
  { icon: 'bi-gear',         text: 'Settings',    href: 'settings.html',    roles: ['Super Admin','HR Manager','Project Manager','Employee','Finance Manager'] },
];

function renderSidebar(currentPage) {
  const user = window.E360.Auth.getCurrentUser();
  if (!user) return;

  const initials = window.E360.Utils.getInitials(user.name);
  const color = window.E360.Utils.avatarColor(user.name);

  let navHtml = '';
  NAV_ITEMS.forEach(item => {
    if (item.section) {
      navHtml += `<li class="nav-section-title">${item.section}</li>`;
      return;
    }
    if (!item.roles.includes(user.role)) return;
    const isActive = item.href === currentPage;
    navHtml += `
      <li class="nav-item">
        <a href="${item.href}" class="nav-link ${isActive ? 'active' : ''}">
          <i class="bi ${item.icon}"></i>
          <span class="nav-text">${item.text}</span>
        </a>
      </li>`;
  });

  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-icon"><i class="bi bi-buildings text-white"></i></div>
      <span class="brand-text">Enterprise360</span>
    </div>
    <ul class="sidebar-nav list-unstyled">${navHtml}</ul>
    <div class="sidebar-footer">
      <div class="avatar avatar-sm" style="background:${color};flex-shrink:0">${initials}</div>
      <div class="user-info overflow-hidden">
        <div style="font-size:.82rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.name}</div>
        <div style="font-size:.72rem;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user.role}</div>
      </div>
    </div>`;
}

function renderTopbar(title) {
  const topbar = document.getElementById('topbar');
  if (!topbar) return;
  const user = window.E360.Auth.getCurrentUser();
  const color = window.E360.Utils.avatarColor(user?.name || '');
  const initials = window.E360.Utils.getInitials(user?.name || '');

  const data = window.E360.Storage.get('notifications', []);
  const unread = data.filter(n => !n.read).length;

  topbar.innerHTML = `
    <button class="btn-icon" id="sidebarToggle" aria-label="Toggle sidebar">
      <i class="bi bi-list fs-5"></i>
    </button>
    <div class="topbar-title">${title}</div>
    <div class="topbar-actions">
      <button class="btn-icon position-relative" id="notifBtn" title="Notifications" onclick="window.location='notifications.html'">
        <i class="bi bi-bell fs-5"></i>
        ${unread > 0 ? `<span class="badge-dot"></span>` : ''}
      </button>
      <button class="btn-icon" id="themeToggle" title="Toggle theme">
        <i class="bi bi-moon fs-5" id="themeIcon"></i>
      </button>
      <div class="dropdown">
        <button class="btn-icon" data-bs-toggle="dropdown" aria-expanded="false">
          <div class="avatar avatar-sm" style="background:${color}">${initials}</div>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><div class="px-3 py-2">
            <div style="font-size:.85rem;font-weight:600">${user?.name}</div>
            <div style="font-size:.78rem;color:var(--text-muted)">${user?.role}</div>
          </div></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item" href="settings.html"><i class="bi bi-person me-2"></i>My Profile</a></li>
          <li><a class="dropdown-item" href="settings.html"><i class="bi bi-gear me-2"></i>Settings</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><a class="dropdown-item text-danger" href="#" id="logoutBtn"><i class="bi bi-box-arrow-right me-2"></i>Logout</a></li>
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
