// Enterprise360 – Storage Utility
window.E360 = window.E360 || {};

const Storage = {
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem('e360_' + key);
      return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
  },

  set(key, value) {
    try {
      localStorage.setItem('e360_' + key, JSON.stringify(value));
      return true;
    } catch { return false; }
  },

  remove(key) {
    localStorage.removeItem('e360_' + key);
  },

  clear() {
    Object.keys(localStorage)
      .filter(k => k.startsWith('e360_'))
      .forEach(k => localStorage.removeItem(k));
  }
};

const Session = {
  get(key, fallback = null) {
    try {
      const item = sessionStorage.getItem('e360_' + key);
      return item ? JSON.parse(item) : fallback;
    } catch { return fallback; }
  },
  set(key, value) {
    try {
      sessionStorage.setItem('e360_' + key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    sessionStorage.removeItem('e360_' + key);
  }
};

window.E360.Storage = Storage;
window.E360.Session = Session;
