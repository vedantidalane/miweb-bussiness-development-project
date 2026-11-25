// Enterprise360 – Auth Module
// Multi-layer session persistence:
// 1. URL parameter (?u=ID)
// 2. window.name (guaranteed same-tab persistence across file:// and HTTP)
// 3. localStorage (e360_session_user)
// 4. sessionStorage (e360_session_user)
window.E360 = window.E360 || {};

const SESSION_KEY = 'e360_session_user';

/* ─── Sample Data Loader ─────────────────────────────────── */
let _sampleData = null;

const getSampleData = async () => {
  if (_sampleData) return _sampleData;
  if (window.E360_DATA) {
    _sampleData = window.E360_DATA;
    return _sampleData;
  }
  try {
    const base = window.location.pathname.includes('/pages/') ? '../data/sample-data.json' : 'data/sample-data.json';
    const res = await fetch(base);
    if (res.ok) {
      _sampleData = await res.json();
      return _sampleData;
    }
  } catch (_) {}
  return {};
};

/* ─── Session Helpers (Multi-Storage) ─────────────────────── */
function saveSessionUser(user) {
  if (!user) return;
  try { window.name = JSON.stringify(user); } catch (_) {}
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (_) {}
  try { localStorage.setItem('e360_currentUser', JSON.stringify(user)); } catch (_) {}
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (_) {}
  try { sessionStorage.setItem('e360_currentUser', JSON.stringify(user)); } catch (_) {}
}

function clearSessionUser() {
  try { window.name = ''; } catch (_) {}
  try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  try { localStorage.removeItem('e360_currentUser'); } catch (_) {}
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
  try { sessionStorage.removeItem('e360_currentUser'); } catch (_) {}
}

function getSessionUser() {
  // 1. Try URL parameter ?u=ID or ?user=ID or ?email=...
  try {
    const params = new URLSearchParams(window.location.search);
    const uid = params.get('u') || params.get('user');
    const uemail = params.get('email');
    const users = (window.E360_DATA && window.E360_DATA.users) || [];

    if (uid) {
      const found = users.find(u => String(u.id) === String(uid));
      if (found) {
        saveSessionUser(found);
        return found;
      }
    }
    if (uemail) {
      const found = users.find(u => u.email.toLowerCase() === uemail.toLowerCase());
      if (found) {
        saveSessionUser(found);
        return found;
      }
    }
  } catch (_) {}

  // 2. Try window.name (persists reliably in same tab across all protocols including file://)
  try {
    if (window.name && window.name.startsWith('{') && window.name.includes('"email"')) {
      const parsed = JSON.parse(window.name);
      if (parsed && parsed.email) return parsed;
    }
  } catch (_) {}

  // 3. Try localStorage
  try {
    const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem('e360_currentUser');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) return parsed;
    }
  } catch (_) {}

  // 4. Try sessionStorage
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || sessionStorage.getItem('e360_currentUser');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) return parsed;
    }
  } catch (_) {}

  return null;
}

/* ─── Auth Object ────────────────────────────────────────── */
const Auth = {

  async login(email, password) {
    const seed = (window.E360_DATA && window.E360_DATA.users) || [];
    let stored = [];
    try {
      const raw = localStorage.getItem('e360_users');
      if (raw) stored = JSON.parse(raw) || [];
    } catch (_) {}

    const users = [...seed];
    stored.forEach(su => {
      if (!users.some(u => u.email.toLowerCase() === su.email.toLowerCase())) {
        users.push(su);
      }
    });

    const trimEmail = (email || '').trim().toLowerCase();
    const trimPass  = (password || '').trim();

    const user = users.find(u =>
      u.email.toLowerCase() === trimEmail && u.password === trimPass
    );

    if (!user) {
      return { ok: false, message: 'Invalid email or password. Please verify credentials or click a Quick Login demo badge.' };
    }

    saveSessionUser(user);
    return { ok: true, user };
  },

  logout() {
    clearSessionUser();
    const isPages = window.location.pathname.includes('/pages/') ||
                    window.location.pathname.includes('\\pages\\');
    window.location.href = (isPages ? 'login.html' : 'pages/login.html') + '?logout=1';
  },

  getCurrentUser() {
    return getSessionUser();
  },

  requireAuth() {
    const user = this.getCurrentUser();
    if (user) {
      saveSessionUser(user);
      return user;
    }

    // Fallback: If opening a page directly in demo mode without session,
    // default to Super Admin so preview/testing never breaks or redirects in a loop
    const defaultUser = (window.E360_DATA && window.E360_DATA.users && window.E360_DATA.users[0]) || null;
    if (defaultUser) {
      saveSessionUser(defaultUser);
      return defaultUser;
    }

    // No session – redirect to login
    const isPages = window.location.pathname.includes('/pages/') ||
                    window.location.pathname.includes('\\pages\\');
    window.location.replace(isPages ? 'login.html' : 'pages/login.html');
    return null;
  },

  hasRole(...roles) {
    const user = this.getCurrentUser();
    return user && roles.includes(user.role);
  }
};

window.E360.Auth          = Auth;
window.E360.getSampleData = getSampleData;
window.Auth               = Auth;
window.getSampleData      = getSampleData;
