// Enterprise360 – Attendance Module
// Standalone JS file for attendance.html
(function () {
  'use strict';

  const { Storage }                                   = window.E360;
  const { formatDate, showToast, genId, formatCurrency } = window.E360.Utils;

  let employees  = [];
  let attendance = [];
  let leaves     = [];
  let searchQ    = '';

  /* ═══════════════════════════════════════════════════
     INIT
  ═══════════════════════════════════════════════════ */
  async function init() {
    const user = await window.initPage('Attendance', 'attendance.html');
    if (!user) return;

    const seed  = await window.E360.getSampleData();
    employees   = Storage.get('employees',  seed.employees  || []);
    attendance  = Storage.get('attendance', seed.attendance || []);
    leaves      = Storage.get('leaves',     seed.leaves     || []);

    /* set today's date in date picker */
    const today = new Date().toISOString().split('T')[0];
    const datePicker = document.getElementById('attDate');
    if (datePicker) datePicker.value = today;

    populateSelects();
    renderStats();
    renderAttendance();
    renderLeaves();
    bindEvents();
  }

  /* ═══════════════════════════════════════════════════
     POPULATE SELECTS
  ═══════════════════════════════════════════════════ */
  function populateSelects() {
    const opts = employees.map(e => `<option value="${e.id}">${e.name} – ${e.department}</option>`).join('');
    const selEls = ['attEmployee', 'leaveEmployee'];
    selEls.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<option value="">— Select Employee —</option>` + opts;
    });
    // Set default date in attendance modal
    const attDateInp = document.getElementById('attDateInp');
    if (attDateInp) attDateInp.value = new Date().toISOString().split('T')[0];
  }

  /* ═══════════════════════════════════════════════════
     STAT CARDS
  ═══════════════════════════════════════════════════ */
  function renderStats() {
    const today = new Date().toISOString().split('T')[0];
    const todays = attendance.filter(a => a.date === today);
    const present = todays.filter(a => a.status === 'Present').length;
    const absent  = todays.filter(a => a.status === 'Absent').length;
    const late    = todays.filter(a => a.status === 'Late').length;
    const pendingLeaves = leaves.filter(l => l.status === 'Pending').length;

    const cards = [
      { label: 'Present Today', value: present, icon: 'bi-person-check-fill', cls: 'stat-icon-green' },
      { label: 'Absent Today',  value: absent,  icon: 'bi-person-x-fill',     cls: 'stat-icon-red'   },
      { label: 'Late Arrivals', value: late,    icon: 'bi-clock-fill',         cls: 'stat-icon-orange'},
      { label: 'Leave Pending', value: pendingLeaves, icon: 'bi-calendar-x-fill', cls: 'stat-icon-purple' },
    ];

    const el = document.getElementById('attStats');
    if (!el) return;

    el.innerHTML = cards.map(c => `
      <div class="col-sm-6 col-xl-3">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body d-flex align-items-center gap-3">
            <div class="stat-icon-square ${c.cls}">
              <i class="bi ${c.icon}"></i>
            </div>
            <div>
              <div class="stat-title">${c.label}</div>
              <div class="stat-main-val">${c.value}</div>
            </div>
          </div>
        </div>
      </div>`).join('');
  }

  /* ═══════════════════════════════════════════════════
     ATTENDANCE TABLE
  ═══════════════════════════════════════════════════ */
  function renderAttendance() {
    const filterDate = document.getElementById('attDate')?.value || '';
    const q = searchQ.toLowerCase();

    let rows = attendance.filter(a => {
      const dateOk = !filterDate || a.date === filterDate;
      const nameOk = !q || a.employeeName.toLowerCase().includes(q);
      return dateOk && nameOk;
    }).sort((a, b) => b.date.localeCompare(a.date));

    const statusBadgeClass = {
      Present:  'badge-approved',
      Absent:   'badge-rejected',
      Late:     'badge-pending',
      'Half Day': 'badge bg-info bg-opacity-20 text-info',
    };

    const tbody = document.getElementById('attTable');
    if (!tbody) return;

    tbody.innerHTML = rows.length ? rows.map(a => {
      const hrs = (a.checkIn && a.checkOut) ? calcHours(a.checkIn, a.checkOut) : '—';
      return `
        <tr>
          <td>
            <div class="d-flex align-items-center gap-2">
              <div class="avatar avatar-xs" style="background:${window.E360.Utils.avatarColor(a.employeeName)};font-size:.6rem">
                ${window.E360.Utils.getInitials(a.employeeName)}
              </div>
              <span style="font-size:.85rem;font-weight:600">${a.employeeName}</span>
            </div>
          </td>
          <td style="font-size:.82rem">${employees.find(e => e.id === a.employeeId)?.department || '—'}</td>
          <td style="font-size:.82rem">${formatDate(a.date)}</td>
          <td style="font-size:.82rem">${a.checkIn || '—'}</td>
          <td style="font-size:.82rem">${a.checkOut || '—'}</td>
          <td style="font-size:.82rem">${hrs}</td>
          <td><span class="badge-status ${statusBadgeClass[a.status] || 'badge-pending'}">${a.status}</span></td>
          <td>
            <button class="btn-icon text-danger del-att" data-id="${a.id}" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
    }).join('') : `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-calendar"></i><h6>No attendance records for this date</h6></div></td></tr>`;

    tbody.querySelectorAll('.del-att').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this attendance record?')) return;
        attendance = attendance.filter(a => a.id !== +btn.dataset.id);
        Storage.set('attendance', attendance);
        renderAttendance();
        renderStats();
        showToast('Record deleted.', 'danger');
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     LEAVE TABLE
  ═══════════════════════════════════════════════════ */
  function renderLeaves() {
    const tbody = document.getElementById('leaveTable');
    if (!tbody) return;

    const statusBadgeClass = {
      Pending:  'badge-pending',
      Approved: 'badge-approved',
      Rejected: 'badge-rejected',
    };

    tbody.innerHTML = leaves.length ? leaves.map(l => `
      <tr>
        <td style="font-size:.85rem;font-weight:600">${l.employeeName}</td>
        <td style="font-size:.82rem">${l.type}</td>
        <td style="font-size:.82rem">${formatDate(l.from)}</td>
        <td style="font-size:.82rem">${formatDate(l.to)}</td>
        <td style="font-size:.82rem">${l.days} day${l.days > 1 ? 's' : ''}</td>
        <td style="font-size:.82rem;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.reason || '—'}</td>
        <td><span class="badge-status ${statusBadgeClass[l.status] || 'badge-pending'}">${l.status}</span></td>
        <td>
          <div class="d-flex gap-1">
            ${l.status === 'Pending' ? `
              <button class="btn btn-sm btn-outline-success approve-leave py-0 px-2" data-id="${l.id}" title="Approve">
                <i class="bi bi-check-lg"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger reject-leave py-0 px-2" data-id="${l.id}" title="Reject">
                <i class="bi bi-x-lg"></i>
              </button>` : ''}
            <button class="btn btn-sm btn-outline-secondary del-leave py-0 px-2" data-id="${l.id}" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>`).join('') : `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-calendar-x"></i><h6>No leave requests</h6></div></td></tr>`;

    tbody.querySelectorAll('.approve-leave').forEach(btn =>
      btn.addEventListener('click', () => updateLeave(+btn.dataset.id, 'Approved'))
    );
    tbody.querySelectorAll('.reject-leave').forEach(btn =>
      btn.addEventListener('click', () => updateLeave(+btn.dataset.id, 'Rejected'))
    );
    tbody.querySelectorAll('.del-leave').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Delete this leave request?')) return;
        leaves = leaves.filter(l => l.id !== +btn.dataset.id);
        Storage.set('leaves', leaves);
        renderLeaves();
        renderStats();
        showToast('Leave request deleted.', 'danger');
      });
    });
  }

  function updateLeave(id, status) {
    const idx = leaves.findIndex(l => l.id === id);
    if (idx !== -1) {
      leaves[idx].status = status;
      Storage.set('leaves', leaves);
      renderLeaves();
      renderStats();
      showToast(`Leave ${status.toLowerCase()}!`, status === 'Approved' ? 'success' : 'danger');
    }
  }

  /* ═══════════════════════════════════════════════════
     SAVE ATTENDANCE
  ═══════════════════════════════════════════════════ */
  function saveAttendance() {
    const empId = document.getElementById('attEmployee').value;
    const date  = document.getElementById('attDateInp').value;
    if (!empId || !date) { showToast('Please select employee and date.', 'warning'); return; }

    const emp  = employees.find(e => e.id === +empId);
    const ci   = document.getElementById('attCheckIn').value;
    const co   = document.getElementById('attCheckOut').value;
    const stat = document.getElementById('attStatus').value;

    if (ci && co && ci >= co) { showToast('Check-out time must be after check-in.', 'warning'); return; }

    attendance.push({
      id: genId(),
      employeeId: +empId,
      employeeName: emp?.name || 'Unknown',
      date,
      checkIn: ci || null,
      checkOut: co || null,
      status: stat,
    });

    Storage.set('attendance', attendance);
    bootstrap.Modal.getInstance(document.getElementById('attModal'))?.hide();
    renderAttendance();
    renderStats();
    showToast('Attendance marked successfully!', 'success');
  }

  /* ═══════════════════════════════════════════════════
     SAVE LEAVE
  ═══════════════════════════════════════════════════ */
  function saveLeave() {
    const empId  = document.getElementById('leaveEmployee').value;
    const from   = document.getElementById('leaveFrom').value;
    const to     = document.getElementById('leaveTo').value;
    const reason = document.getElementById('leaveReason').value.trim();

    if (!empId) { showToast('Please select an employee.', 'warning'); return; }
    if (!from || !to) { showToast('Please select both dates.', 'warning'); return; }
    if (from > to)    { showToast('From date cannot be after To date.', 'warning'); return; }

    const emp  = employees.find(e => e.id === +empId);
    const days = Math.ceil((new Date(to) - new Date(from)) / 86400000) + 1;

    leaves.push({
      id: genId(),
      employeeId: +empId,
      employeeName: emp?.name || 'Unknown',
      type: document.getElementById('leaveType').value,
      from,
      to,
      days,
      reason,
      status: 'Pending',
      appliedAt: new Date().toISOString(),
    });

    Storage.set('leaves', leaves);
    bootstrap.Modal.getInstance(document.getElementById('leaveModal'))?.hide();
    renderLeaves();
    renderStats();
    showToast('Leave application submitted!', 'success');
  }

  /* ═══════════════════════════════════════════════════
     HELPERS
  ═══════════════════════════════════════════════════ */
  function calcHours(inT, outT) {
    const [ih, im] = inT.split(':').map(Number);
    const [oh, om] = outT.split(':').map(Number);
    const diff = (oh * 60 + om) - (ih * 60 + im);
    if (diff <= 0) return '—';
    return `${Math.floor(diff / 60)}h ${diff % 60}m`;
  }

  /* ═══════════════════════════════════════════════════
     BIND EVENTS
  ═══════════════════════════════════════════════════ */
  function bindEvents() {
    /* tab switching */
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-tab]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('tab-daily-content')?.classList.toggle('d-none', tab !== 'daily');
        document.getElementById('tab-leaves-content')?.classList.toggle('d-none', tab !== 'leaves');
      });
    });

    /* search */
    const searchEl = document.getElementById('attSearch');
    if (searchEl) {
      searchEl.addEventListener('input', () => {
        searchQ = searchEl.value.trim();
        renderAttendance();
      });
    }

    /* date filter */
    const attDate = document.getElementById('attDate');
    if (attDate) {
      attDate.addEventListener('change', renderAttendance);
    }

    /* save buttons */
    document.getElementById('saveAttBtn')?.addEventListener('click', saveAttendance);
    document.getElementById('saveLeaveBtn')?.addEventListener('click', saveLeave);
  }

  /* boot */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
