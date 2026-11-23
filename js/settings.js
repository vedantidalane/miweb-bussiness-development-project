// Enterprise360 – Settings & Customization JS
(function() {
  const { Storage } = window.E360;
  const { showToast, avatarColor, getInitials, formatDate, confirm } = window.E360.Utils;
  const { Auth } = window.E360;

  async function init() {
    const user = await window.initPage('Settings', 'settings.html');
    if (!user) return;

    loadProfile(user);
    loadAppearance();
    loadStorageUsage();

    // Navigation between settings tabs
    document.querySelectorAll('[data-panel]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-panel]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('[id^="panel-"]').forEach(p => p.classList.add('d-none'));
        const panelEl = document.getElementById('panel-' + btn.dataset.panel);
        if (panelEl) panelEl.classList.remove('d-none');
        if (btn.dataset.panel === 'data') loadStorageUsage();
      });
    });

    document.getElementById('saveProfileBtn')?.addEventListener('click', saveProfile);
    document.getElementById('saveCompBtn')?.addEventListener('click', () => showToast('Company profile saved successfully!', 'success'));
    document.getElementById('saveNotifPrefsBtn')?.addEventListener('click', () => showToast('Notification preferences saved!', 'success'));
    document.getElementById('saveLangBtn')?.addEventListener('click', () => showToast('Language and region preferences saved!', 'success'));
    document.getElementById('changePassBtn')?.addEventListener('click', changePassword);
    document.getElementById('exportDataBtn')?.addEventListener('click', exportData);
    document.getElementById('resetDataBtn')?.addEventListener('click', resetData);

    // Appearance Theme Radio Buttons
    document.querySelectorAll('input[name="theme"]').forEach(inp => {
      inp.addEventListener('change', () => {
        document.documentElement.setAttribute('data-theme', inp.value);
        localStorage.setItem('e360_theme', inp.value);
        const icon = document.getElementById('themeIcon');
        if (icon) icon.className = inp.value === 'dark' ? 'bi bi-sun fs-5' : 'bi bi-moon fs-5';
        showToast(`${inp.value.charAt(0).toUpperCase() + inp.value.slice(1)} theme applied!`, 'info');
      });
    });

    // Accent Color Swatches
    document.querySelectorAll('.color-swatch').forEach(sw => {
      sw.addEventListener('click', () => {
        document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        sw.classList.add('active');
        document.documentElement.style.setProperty('--primary', sw.dataset.color);
        document.documentElement.style.setProperty('--primary-dark', sw.dataset.color);
        Storage.set('accentColor', sw.dataset.color);
        showToast('Accent color updated!', 'success');
      });
    });

    // Profile photo upload
    document.getElementById('profileAvatarInput')?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        const u = Auth.getCurrentUser();
        const avEl = document.getElementById('profileAvatar');
        if (avEl) avEl.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
        if (u) {
          u.avatar = ev.target.result;
          sessionStorage.setItem('e360_currentUser', JSON.stringify(u));
        }
        showToast('Profile photo updated!', 'success');
      };
      reader.readAsDataURL(file);
    });
  }

  function loadProfile(user) {
    const color = avatarColor(user.name);
    const avEl = document.getElementById('profileAvatar');
    if (avEl) {
      avEl.style.background = color;
      if (user.avatar) {
        avEl.innerHTML = `<img src="${user.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
      } else {
        avEl.textContent = getInitials(user.name);
      }
    }

    const setText = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };

    setText('profileName', user.name);
    setText('profileRole', user.role);
    setText('profileEmail', user.email);

    setVal('settingName', user.name);
    setVal('settingEmail', user.email);
    setVal('settingPhone', user.phone || '+1-555-0100');
    setVal('settingDept', user.department || 'Management');
    setVal('settingRoleInp', user.role);
    setVal('settingJoin', formatDate(user.joinDate || new Date()));
  }

  function loadAppearance() {
    const theme = localStorage.getItem('e360_theme') || 'light';
    const radio = document.getElementById(theme === 'dark' ? 'themeDark' : 'themeLight');
    if (radio) radio.checked = true;

    const accent = Storage.get('accentColor', '#4f46e5');
    document.querySelectorAll('.color-swatch').forEach(sw => {
      sw.classList.toggle('active', sw.dataset.color === accent);
    });
    if (accent !== '#4f46e5') {
      document.documentElement.style.setProperty('--primary', accent);
      document.documentElement.style.setProperty('--primary-dark', accent);
    }

    const collapseInp = document.getElementById('collapseSidebar');
    if (collapseInp) {
      collapseInp.checked = Storage.get('sidebarCollapsed', false);
      collapseInp.addEventListener('change', e => {
        Storage.set('sidebarCollapsed', e.target.checked);
        const sidebar = document.getElementById('sidebar');
        const main = document.getElementById('mainContent');
        sidebar?.classList.toggle('collapsed', e.target.checked);
        main?.classList.toggle('sidebar-collapsed', e.target.checked);
        showToast('Sidebar preference saved!', 'info');
      });
    }
  }

  function saveProfile() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    user.name = document.getElementById('settingName')?.value.trim() || user.name;
    user.email = document.getElementById('settingEmail')?.value.trim() || user.email;
    user.phone = document.getElementById('settingPhone')?.value.trim() || user.phone;

    sessionStorage.setItem('e360_currentUser', JSON.stringify(user));

    const pName = document.getElementById('profileName');
    const pEmail = document.getElementById('profileEmail');
    if (pName) pName.textContent = user.name;
    if (pEmail) pEmail.textContent = user.email;

    showToast('Profile information updated successfully!', 'success');
  }

  function changePassword() {
    const cur = document.getElementById('curPass')?.value;
    const nw = document.getElementById('newPass')?.value;
    const cnf = document.getElementById('confPass')?.value;

    if (!cur) {
      showToast('Please enter your current password.', 'warning');
      return;
    }
    if (!nw || nw.length < 6) {
      showToast('New password must be at least 6 characters long.', 'warning');
      return;
    }
    if (nw !== cnf) {
      showToast('Password confirmation does not match.', 'warning');
      return;
    }

    const user = Auth.getCurrentUser();
    if (user && cur !== user.password) {
      showToast('Current password is incorrect.', 'danger');
      return;
    }

    if (user) {
      user.password = nw;
      sessionStorage.setItem('e360_currentUser', JSON.stringify(user));
    }

    document.getElementById('curPass').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('confPass').value = '';
    showToast('Password updated successfully!', 'success');
  }

  function loadStorageUsage() {
    let totalBytes = 0;
    for (const key in localStorage) {
      if (key.startsWith('e360_')) {
        totalBytes += (localStorage[key].length * 2);
      }
    }
    const kb = (totalBytes / 1024).toFixed(2);
    const usageEl = document.getElementById('storageUsage');
    if (usageEl) {
      usageEl.innerHTML = `
        <div class="d-flex align-items-center gap-3 mb-2">
          <div class="progress flex-1" style="height:10px;max-width:240px">
            <div class="progress-bar bg-primary" style="width:${Math.min(100, Math.max(5, (totalBytes / 51200) * 100)).toFixed(0)}%"></div>
          </div>
          <span class="fw-bold">${kb} KB stored</span>
        </div>
        <div class="text-muted" style="font-size:.78rem">Active sandbox: HTML5 LocalStorage persistence (capacity: ~5 MB)</div>`;
    }
  }

  function exportData() {
    const data = {};
    for (const key in localStorage) {
      if (key.startsWith('e360_')) {
        try {
          data[key.replace('e360_', '')] = JSON.parse(localStorage[key]);
        } catch {
          data[key] = localStorage[key];
        }
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enterprise360-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Complete application backup exported as JSON!', 'success');
  }

  async function resetData() {
    const ok = await confirm('Reset all local data? This will restore factory defaults and wipe locally modified sample data.', 'Reset All Data');
    if (!ok) return;

    Storage.clear();
    showToast('Data reset complete. Reloading default state...', 'info');
    setTimeout(() => window.location.reload(), 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
