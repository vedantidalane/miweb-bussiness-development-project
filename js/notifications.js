// Enterprise360 – Notifications & Communication JS
(function() {
  const { Storage } = window.E360;
  const { showToast, genId, timeAgo, formatDateTime } = window.E360.Utils;
  const { getSampleData } = window.E360;

  let notifications = [];
  let announcements = [];
  let reminders = [];

  const typeIcon = {
    info: 'bi-info-circle-fill text-info',
    success: 'bi-check-circle-fill text-success',
    warning: 'bi-exclamation-triangle-fill text-warning',
    danger: 'bi-x-circle-fill text-danger'
  };

  async function init() {
    const user = await window.initPage('Notifications', 'notifications.html');
    if (!user) return;

    const data = await getSampleData();
    notifications = Storage.get('notifications', data.notifications || []);
    announcements = Storage.get('announcements', data.announcements || []);
    reminders = Storage.get('reminders', []);

    renderNotifs();
    renderAnnouncements();
    renderReminders();
    renderTimeline();

    document.getElementById('markAllRead')?.addEventListener('click', () => {
      notifications.forEach(n => n.read = true);
      Storage.set('notifications', notifications);
      renderNotifs();
      showToast('All notifications marked as read.', 'success');
    });

    document.getElementById('notifFilter')?.addEventListener('change', renderNotifs);
    document.getElementById('saveAnnBtn')?.addEventListener('click', saveAnnouncement);
    document.getElementById('saveRemBtn')?.addEventListener('click', saveReminder);
  }

  function renderNotifs() {
    const filter = document.getElementById('notifFilter')?.value || '';
    let list = [...notifications].sort((a, b) => new Date(b.time) - new Date(a.time));
    if (filter === 'unread') list = list.filter(n => !n.read);
    if (filter === 'read') list = list.filter(n => n.read);

    const unread = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('unreadBadge');
    if (badge) {
      badge.textContent = unread || '';
      badge.style.display = unread ? 'inline-block' : 'none';
    }

    const listEl = document.getElementById('notifList');
    if (listEl) {
      listEl.innerHTML = list.length ? list.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" id="notif-${n.id}">
          <i class="bi ${typeIcon[n.type] || 'bi-bell-fill'}" style="font-size:1.1rem;margin-top:3px"></i>
          <div class="flex-1">
            <div style="font-size:.88rem;font-weight:${n.read ? 500 : 700}">${n.title}</div>
            <div class="text-muted" style="font-size:.80rem">${n.message}</div>
            <div class="text-muted mt-1" style="font-size:.72rem">${timeAgo(n.time)}</div>
          </div>
          <div class="d-flex flex-column gap-1 align-items-end">
            ${!n.read ? `<button class="btn btn-sm btn-outline-primary py-0 mark-read" data-id="${n.id}" style="font-size:.72rem">Mark read</button>` : ''}
            <button class="btn-icon text-danger del-notif" data-id="${n.id}" style="width:24px;height:24px;font-size:.8rem" title="Delete"><i class="bi bi-trash"></i></button>
          </div>
          ${!n.read ? `<span class="notif-dot bg-${n.type === 'danger' ? 'danger' : n.type === 'warning' ? 'warning' : 'primary'}"></span>` : ''}
        </div>`).join('')
        : `<div class="empty-state py-4"><i class="bi bi-bell-slash fs-2 text-muted"></i><h6>No notifications match criteria</h6></div>`;
    }

    document.querySelectorAll('.mark-read').forEach(b => {
      b.addEventListener('click', () => {
        const n = notifications.find(n => n.id === +b.dataset.id);
        if (n) {
          n.read = true;
          Storage.set('notifications', notifications);
          renderNotifs();
        }
      });
    });

    document.querySelectorAll('.del-notif').forEach(b => {
      b.addEventListener('click', () => {
        notifications = notifications.filter(n => n.id !== +b.dataset.id);
        Storage.set('notifications', notifications);
        renderNotifs();
        showToast('Notification removed.', 'info');
      });
    });
  }

  function renderAnnouncements() {
    const pColors = { High: 'danger', Medium: 'warning', Low: 'success' };
    const annEl = document.getElementById('announceList');
    if (!annEl) return;

    annEl.innerHTML = announcements.length ? announcements.map(a => `
      <div class="d-flex gap-3 p-3 border-bottom">
        <div class="flex-shrink-0"><i class="bi bi-megaphone-fill text-${pColors[a.priority] || 'primary'}" style="font-size:1.15rem"></i></div>
        <div class="flex-1">
          <div class="d-flex justify-content-between align-items-start">
            <div class="fw-bold" style="font-size:.88rem">${a.title}</div>
            <span class="badge bg-${pColors[a.priority] || 'secondary'} bg-opacity-15 text-${pColors[a.priority] || 'secondary'}" style="font-size:.7rem">${a.priority} Priority</span>
          </div>
          <div class="text-muted mt-1" style="font-size:.82rem">${a.message}</div>
          <div class="text-muted mt-1" style="font-size:.72rem"><i class="bi bi-person me-1"></i>${a.author} · ${a.date}</div>
        </div>
      </div>`).join('')
      : `<div class="empty-state py-3"><i class="bi bi-megaphone fs-2 text-muted"></i><h6>No active announcements</h6></div>`;
  }

  function renderReminders() {
    const remEl = document.getElementById('reminderList');
    if (!remEl) return;

    remEl.innerHTML = reminders.length ? `
      <div class="timeline">
        ${reminders.map(r => `
          <div class="timeline-item">
            <div class="timeline-dot bg-warning"></div>
            <div class="timeline-content">
              <div style="font-size:.85rem;font-weight:600">${r.text}</div>
              <div class="text-muted timeline-time">${formatDateTime(r.dateTime)}</div>
            </div>
          </div>`).join('')}
      </div>`
      : `<div class="empty-state py-2"><i class="bi bi-alarm fs-2 text-muted"></i><h6>No pending reminders</h6></div>`;
  }

  function renderTimeline() {
    const allActivity = [
      ...notifications.map(n => ({ time: n.time, icon: typeIcon[n.type] || 'bi-bell-fill', title: n.title, desc: n.message })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    const tlEl = document.getElementById('timeline');
    if (!tlEl) return;

    tlEl.innerHTML = allActivity.length ? `
      <div class="timeline">
        ${allActivity.map(a => `
          <div class="timeline-item">
            <div class="timeline-dot bg-primary"></div>
            <div class="timeline-content">
              <div style="font-size:.85rem;font-weight:600">${a.title}</div>
              <div class="text-muted" style="font-size:.78rem">${a.desc}</div>
              <div class="timeline-time">${timeAgo(a.time)}</div>
            </div>
          </div>`).join('')}
      </div>`
      : `<div class="empty-state py-2"><i class="bi bi-clock-history fs-2 text-muted"></i><h6>No recent activity log</h6></div>`;
  }

  function saveAnnouncement() {
    const title = document.getElementById('annTitle')?.value.trim();
    const message = document.getElementById('annMessage')?.value.trim();
    if (!title || !message) {
      showToast('Title and message are required.', 'warning');
      return;
    }

    const ann = {
      id: genId(),
      title,
      message,
      priority: document.getElementById('annPriority')?.value || 'Medium',
      date: new Date().toISOString().split('T')[0],
      author: window.E360.Auth.getCurrentUser()?.name || 'Administrator'
    };

    announcements.unshift(ann);
    Storage.set('announcements', announcements);
    bootstrap.Modal.getInstance(document.getElementById('announceModal'))?.hide();
    document.getElementById('annTitle').value = '';
    document.getElementById('annMessage').value = '';
    renderAnnouncements();
    showToast('Announcement posted successfully!', 'success');
  }

  function saveReminder() {
    const text = document.getElementById('remText')?.value.trim();
    const dateTime = document.getElementById('remDateTime')?.value;
    if (!text || !dateTime) {
      showToast('Reminder text and scheduled date/time required.', 'warning');
      return;
    }

    reminders.push({ id: genId(), text, dateTime });
    Storage.set('reminders', reminders);
    bootstrap.Modal.getInstance(document.getElementById('reminderModal'))?.hide();
    document.getElementById('remText').value = '';
    document.getElementById('remDateTime').value = '';
    renderReminders();
    showToast('Reminder saved successfully!', 'success');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
