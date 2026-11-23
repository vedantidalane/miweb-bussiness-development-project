// Enterprise360 – Utility Functions
window.E360 = window.E360 || {};

/* ---- ID Generation ---- */
const genId = () => Date.now() + Math.floor(Math.random() * 1000);

/* ---- Date Helpers ---- */
const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (dtStr) => {
  if (!dtStr) return '—';
  const d = new Date(dtStr);
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const timeAgo = (dtStr) => {
  const d = new Date(dtStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dtStr);
};

const today = () => new Date().toISOString().split('T')[0];

/* ---- Currency ---- */
const formatCurrency = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

/* ---- Avatar Initials ---- */
const getInitials = (name = '') =>
  name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();

/* ---- Avatar color by name ---- */
const AVATAR_COLORS = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6'];
const avatarColor = (name = '') => {
  let h = 0;
  for (let c of name) h = (h * 31 + c.charCodeAt(0)) & 0xFFFF;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

const avatarHtml = (name = '', size = '', imgSrc = '') => {
  const initials = getInitials(name);
  const color = avatarColor(name);
  if (imgSrc) {
    return `<div class="avatar ${size}" style="background:${color}"><img src="${imgSrc}" alt="${name}"></div>`;
  }
  return `<div class="avatar ${size}" style="background:${color}">${initials}</div>`;
};

/* ---- Badge Helpers ---- */
const statusBadge = (status = '') => {
  const cls = status.toLowerCase().replace(/\s+/g, '');
  return `<span class="badge-status badge-${cls}">${status}</span>`;
};

const priorityBadge = (priority = '') => {
  const cls = priority.toLowerCase();
  return `<span class="badge px-2 py-1 rounded-pill priority-${cls}" style="font-size:.75rem">${priority}</span>`;
};

/* ---- Debounce ---- */
const debounce = (fn, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

/* ---- Throttle ---- */
const throttle = (fn, limit = 300) => {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= limit) { last = now; fn(...args); }
  };
};

/* ---- Toast Notifications ---- */
const showToast = (message, type = 'info', title = '') => {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const icons = { info: 'bi-info-circle-fill', success: 'bi-check-circle-fill', warning: 'bi-exclamation-triangle-fill', danger: 'bi-x-circle-fill' };
  const titles = { info: 'Information', success: 'Success', warning: 'Warning', danger: 'Error' };
  const item = document.createElement('div');
  item.className = `toast-item toast-${type}`;
  item.innerHTML = `
    <i class="bi ${icons[type] || icons.info} toast-icon"></i>
    <div class="toast-body">
      <div class="toast-title">${title || titles[type] || type}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.closest('.toast-item').remove()"><i class="bi bi-x"></i></button>
  `;
  container.appendChild(item);
  setTimeout(() => item.style.opacity = '0', 3700);
  setTimeout(() => item.remove(), 4000);
};

/* ---- Confirm Dialog ---- */
const confirm = (message, title = 'Confirm') =>
  new Promise(resolve => {
    const id = 'confirm-' + genId();
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="modal fade" id="${id}" tabindex="-1">
        <div class="modal-dialog modal-sm modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header"><h6 class="modal-title">${title}</h6></div>
            <div class="modal-body"><p class="mb-0" style="font-size:.9rem">${message}</p></div>
            <div class="modal-footer gap-2">
              <button class="btn btn-sm btn-secondary" data-bs-dismiss="modal" id="${id}-no">Cancel</button>
              <button class="btn btn-sm btn-danger" id="${id}-yes">Confirm</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    const modal = new bootstrap.Modal(document.getElementById(id));
    modal.show();
    document.getElementById(id + '-yes').onclick = () => { modal.hide(); resolve(true); };
    document.getElementById(id + '-no').onclick = () => { modal.hide(); resolve(false); };
    document.getElementById(id).addEventListener('hidden.bs.modal', () => { el.remove(); resolve(false); });
  });

/* ---- Pagination ---- */
const paginate = (data, page, perPage = 10) => {
  const start = (page - 1) * perPage;
  return { items: data.slice(start, start + perPage), total: data.length, pages: Math.ceil(data.length / perPage), page };
};

const renderPagination = (pager, onPage) => {
  if (pager.pages <= 1) return '';
  let html = '<nav><ul class="pagination pagination-sm mb-0">';
  html += `<li class="page-item ${pager.page === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${pager.page - 1}">‹</a></li>`;
  for (let i = 1; i <= pager.pages; i++) {
    html += `<li class="page-item ${i === pager.page ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
  }
  html += `<li class="page-item ${pager.page === pager.pages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${pager.page + 1}">›</a></li>`;
  html += '</ul></nav>';
  setTimeout(() => {
    document.querySelectorAll('[data-page]').forEach(a => {
      a.addEventListener('click', e => { e.preventDefault(); onPage(+a.dataset.page); });
    });
  }, 0);
  return html;
};

/* ---- Data Search/Sort/Filter ---- */
const searchFilter = (data, query, keys) => {
  if (!query) return data;
  const q = query.toLowerCase();
  return data.filter(item => keys.some(k => String(item[k] || '').toLowerCase().includes(q)));
};

const sortBy = (data, key, dir = 'asc') =>
  [...data].sort((a, b) => {
    const va = a[key] ?? ''; const vb = b[key] ?? '';
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });

/* ---- Export CSV ---- */
const exportCSV = (data, filename = 'export.csv') => {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported successfully!', 'success');
};

/* ---- File upload preview ---- */
const previewImage = (input, imgEl) => {
  const file = input.files[0];
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = e => { if (imgEl) imgEl.src = e.target.result; };
  reader.readAsDataURL(file);
  return new Promise(resolve => { reader.onload = e => resolve(e.target.result); reader.readAsDataURL(file); });
};

/* ---- Data fetcher with error handling ---- */
const fetchData = async (url) => {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error('fetchData error:', err);
    return null;
  }
};

/* ---- Loading skeleton ---- */
const skeletonRow = (cols = 5) =>
  `<tr>${Array.from({length: cols}, () => `<td><div class="skeleton" style="height:16px;border-radius:4px"></div></td>`).join('')}</tr>`;

const showLoading = (containerId, rows = 5, cols = 5) => {
  const el = document.getElementById(containerId);
  if (el) el.innerHTML = Array.from({length: rows}, () => skeletonRow(cols)).join('');
};

window.E360.Utils = {
  genId, formatDate, formatDateTime, timeAgo, today, formatCurrency, getInitials,
  avatarColor, avatarHtml, statusBadge, priorityBadge, debounce, throttle,
  showToast, confirm, paginate, renderPagination, searchFilter, sortBy,
  exportCSV, previewImage, fetchData, skeletonRow, showLoading
};

// Global shortcuts
Object.assign(window, window.E360.Utils);
