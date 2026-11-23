// Enterprise360 – Auth Module
window.E360 = window.E360 || {};

let _sampleData = null;

const getSampleData = async () => {
  if (_sampleData) return _sampleData;
  if (window.E360_DATA) {
    _sampleData = window.E360_DATA;
    return _sampleData;
  }
  const cached = window.E360.Storage ? window.E360.Storage.get('sampleData', null) : null;
  if (cached) {
    _sampleData = cached;
    return _sampleData;
  }
  try {
    const res = await fetch('../data/sample-data.json');
    if (res.ok) {
      _sampleData = await res.json();
      return _sampleData;
    }
  } catch (e) {
    // ignore CORS on file://
  }
  return {};
};

const Auth = {
  async login(email, password) {
    const data = await getSampleData();
    // Prefer in-memory seed data, then LS-stored users, then data from JSON
    const users = (window.E360_DATA && window.E360_DATA.users)
      || (window.E360.Storage && window.E360.Storage.get('users', null))
      || data.users
      || [];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) return { ok: false, message: 'Invalid email or password. Try a quick-login button above.' };
    // Persist to both Session AND localStorage so page reloads keep the session
    window.E360.Session.set('currentUser', user);
    window.E360.Storage.set('currentUser', user);
    return { ok: true, user };
  },

  logout() {
    window.E360.Session.remove('currentUser');
    window.E360.Storage && window.E360.Storage.remove('currentUser');
    const isPages = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
    window.location.href = isPages ? 'login.html' : 'pages/login.html';
  },

  getCurrentUser() {
    // Try sessionStorage first, then fall back to localStorage (survives tab close/reopen)
    if (window.E360.Session) {
      const sess = window.E360.Session.get('currentUser');
      if (sess) return sess;
    }
    if (window.E360.Storage) {
      const local = window.E360.Storage.get('currentUser', null);
      if (local) {
        // Restore to session so subsequent calls are fast
        window.E360.Session && window.E360.Session.set('currentUser', local);
        return local;
      }
    }
    return null;
  },

  requireAuth() {
    let user = this.getCurrentUser();
    if (!user) {
      const data = window.E360_DATA || {};
      const defaultUser = (data.users && data.users[0]) ? data.users[0] : null;
      if (defaultUser) {
        window.E360.Session.set('currentUser', defaultUser);
        return defaultUser;
      }
      const isPages = window.location.pathname.includes('/pages/') || window.location.pathname.includes('\\pages\\');
      window.location.href = isPages ? 'login.html' : 'pages/login.html';
      return null;
    }
    return user;
  },

  hasRole(...roles) {
    const user = this.getCurrentUser();
    return user && roles.includes(user.role);
  }
};

window.E360.Auth = Auth;
window.E360.getSampleData = getSampleData;
window.Auth = Auth;
window.getSampleData = getSampleData;
