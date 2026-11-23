// Enterprise360 – Projects JS
(function() {
  const { Storage } = window.E360;
  const { showToast, genId, formatDate, debounce, searchFilter, confirm } = window.E360.Utils;
  const { getSampleData } = window.E360;

  let projects = [];
  let employees = [];
  let editId = null;
  let projModal;
  let calendar = null;
  let currentView = 'cards'; // 'cards' | 'calendar'

  async function init() {
    const user = await window.initPage('Projects', 'projects.html');
    if (!user) return;

    const data = await getSampleData();
    projects = Storage.get('projects', data.projects || []);
    employees = Storage.get('employees', data.employees || []);
    projModal = new bootstrap.Modal(document.getElementById('projModal'));

    renderStats();
    renderProjects();
    populateManagerSelect();

    document.getElementById('addProjBtn')?.addEventListener('click', openAdd);
    document.getElementById('saveProjBtn')?.addEventListener('click', save);
    document.getElementById('projSearch')?.addEventListener('input', debounce(renderProjects, 300));
    document.getElementById('projStatusFilter')?.addEventListener('change', renderProjects);
    document.getElementById('projPriorityFilter')?.addEventListener('change', renderProjects);

    document.getElementById('viewCardsBtn')?.addEventListener('click', () => switchView('cards'));
    document.getElementById('viewCalBtn')?.addEventListener('click', () => switchView('calendar'));
  }

  function populateManagerSelect() {
    const mgrSel = document.getElementById('projManager');
    if (!mgrSel) return;
    mgrSel.innerHTML = '<option value="">Select Manager</option>';
    employees.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.name;
      opt.textContent = `${e.name} (${e.designation})`;
      mgrSel.appendChild(opt);
    });
  }

  function renderStats() {
    const total = projects.length;
    const inProg = projects.filter(p => p.status === 'In Progress').length;
    const done = projects.filter(p => p.status === 'Completed').length;
    const plan = projects.filter(p => p.status === 'Planning').length;

    const statEl = document.getElementById('projStats');
    if (statEl) {
      statEl.innerHTML = [
        { label: 'Total Projects', value: total, icon: 'bi-kanban', bg: 'bg-primary-soft' },
        { label: 'In Progress', value: inProg, icon: 'bi-play-circle', bg: 'bg-info-soft' },
        { label: 'Completed', value: done, icon: 'bi-check-circle', bg: 'bg-success-soft' },
        { label: 'Planning', value: plan, icon: 'bi-clipboard', bg: 'bg-warning-soft' },
      ].map(s => `
        <div class="col-sm-6 col-lg-3">
          <div class="stat-card">
            <div class="stat-icon ${s.bg}"><i class="bi ${s.icon}"></i></div>
            <div class="stat-info">
              <div class="stat-value">${s.value}</div>
              <div class="stat-label">${s.label}</div>
            </div>
          </div>
        </div>`).join('');
    }
  }

  function getFiltered() {
    let list = [...projects];
    const q = document.getElementById('projSearch')?.value || '';
    const st = document.getElementById('projStatusFilter')?.value || '';
    const pr = document.getElementById('projPriorityFilter')?.value || '';
    if (q) list = searchFilter(list, q, ['name', 'client', 'manager']);
    if (st) list = list.filter(p => p.status === st);
    if (pr) list = list.filter(p => p.priority === pr);
    return list;
  }

  function renderProjects() {
    if (currentView === 'calendar') {
      initOrUpdateCalendar();
      return;
    }

    const filtered = getFiltered();
    const statusColors = { Planning: 'warning', 'In Progress': 'primary', Completed: 'success' };
    const priorityColors = { High: 'danger', Medium: 'warning', Low: 'success' };

    const grid = document.getElementById('projGrid');
    if (!grid) return;

    grid.innerHTML = filtered.length ? filtered.map(p => `
      <div class="col-sm-6 col-xl-4">
        <div class="card h-100 shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between mb-2">
              <span class="badge bg-${statusColors[p.status] || 'secondary'} bg-opacity-15 text-${statusColors[p.status] || 'secondary'}" style="font-size:.72rem">${p.status}</span>
              <span class="badge bg-${priorityColors[p.priority] || 'secondary'} bg-opacity-15 text-${priorityColors[p.priority] || 'secondary'}" style="font-size:.72rem">${p.priority} Priority</span>
            </div>
            <h6 class="fw-bold mb-1">${p.name}</h6>
            <p class="text-muted mb-3" style="font-size:.8rem">${p.description || 'No description provided.'}</p>
            <div class="d-flex justify-content-between text-muted mb-2" style="font-size:.78rem">
              <span><i class="bi bi-person me-1"></i>${p.manager || 'Unassigned'}</span>
              <span><i class="bi bi-building me-1"></i>${p.client || 'Internal'}</span>
            </div>
            <div class="d-flex justify-content-between text-muted mb-2" style="font-size:.78rem">
              <span><i class="bi bi-calendar-event me-1"></i>${formatDate(p.startDate)}</span>
              <span><i class="bi bi-calendar-check me-1"></i>${formatDate(p.dueDate)}</span>
            </div>
            <div class="d-flex align-items-center gap-2 mt-3">
              <div class="progress flex-1" style="height:6px"><div class="progress-bar bg-primary" style="width:${p.progress}%"></div></div>
              <span class="text-muted" style="font-size:.75rem">${p.progress}%</span>
            </div>
          </div>
          <div class="card-body border-top py-2 d-flex justify-content-end gap-2">
            <button class="btn btn-sm btn-outline-secondary edit-proj" data-id="${p.id}"><i class="bi bi-pencil me-1"></i>Edit</button>
            <button class="btn btn-sm btn-outline-danger del-proj" data-id="${p.id}"><i class="bi bi-trash me-1"></i>Delete</button>
          </div>
        </div>
      </div>`).join('')
      : `<div class="col-12"><div class="empty-state card py-5"><i class="bi bi-kanban fs-1 text-muted mb-2"></i><h6>No projects found</h6><p class="text-muted">Add a new project to get started.</p></div></div>`;

    document.querySelectorAll('.edit-proj').forEach(b => b.addEventListener('click', () => openEdit(+b.dataset.id)));
    document.querySelectorAll('.del-proj').forEach(b => b.addEventListener('click', () => delProj(+b.dataset.id)));
  }

  function switchView(mode) {
    currentView = mode;
    const isCal = (mode === 'calendar');
    document.getElementById('viewCardsBtn')?.classList.toggle('active', !isCal);
    document.getElementById('viewCalBtn')?.classList.toggle('active', isCal);

    document.getElementById('projGrid')?.classList.toggle('d-none', isCal);
    document.getElementById('calendarContainer')?.classList.toggle('d-none', !isCal);

    if (isCal) {
      initOrUpdateCalendar();
    } else {
      renderProjects();
    }
  }

  function initOrUpdateCalendar() {
    const calEl = document.getElementById('fullCalendarEl');
    if (!calEl) return;

    const events = projects.map(p => ({
      id: String(p.id),
      title: p.name,
      start: p.startDate,
      end: p.dueDate,
      color: p.status === 'Completed' ? '#10b981' : p.status === 'In Progress' ? '#3b82f6' : '#f59e0b',
      extendedProps: { client: p.client, progress: p.progress }
    }));

    if (typeof FullCalendar !== 'undefined') {
      if (!calendar) {
        calendar = new FullCalendar.Calendar(calEl, {
          initialView: 'dayGridMonth',
          headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          },
          events: events,
          eventClick: function(info) {
            openEdit(+info.event.id);
          }
        });
        calendar.render();
      } else {
        calendar.removeAllEvents();
        calendar.addEventSource(events);
        calendar.render();
      }
    }
  }

  function openAdd() {
    editId = null;
    document.getElementById('projModalTitle').textContent = 'New Project';
    ['projName', 'projClient', 'projDesc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('projManager').selectedIndex = 0;
    document.getElementById('projStatus').value = 'Planning';
    document.getElementById('projPriority').value = 'Medium';
    document.getElementById('projProgress').value = 0;
    document.getElementById('projStart').value = new Date().toISOString().split('T')[0];
    document.getElementById('projDue').value = '';
    projModal.show();
  }

  function openEdit(id) {
    editId = id;
    const p = projects.find(p => p.id === id);
    if (!p) return;

    document.getElementById('projModalTitle').textContent = 'Edit Project';
    document.getElementById('projName').value = p.name;
    document.getElementById('projClient').value = p.client || '';
    document.getElementById('projManager').value = p.manager || '';
    document.getElementById('projStatus').value = p.status;
    document.getElementById('projPriority').value = p.priority;
    document.getElementById('projStart').value = p.startDate || '';
    document.getElementById('projDue').value = p.dueDate || '';
    document.getElementById('projProgress').value = p.progress || 0;
    document.getElementById('projDesc').value = p.description || '';
    projModal.show();
  }

  async function delProj(id) {
    const ok = await confirm('Delete this project? This action cannot be undone.', 'Delete Project');
    if (!ok) return;

    projects = projects.filter(p => p.id !== id);
    Storage.set('projects', projects);
    renderStats();
    renderProjects();
    if (calendar) calendar.refetchEvents();
    showToast('Project deleted successfully.', 'danger');
  }

  function save() {
    const name = document.getElementById('projName').value.trim();
    if (!name) {
      showToast('Project name is required.', 'warning');
      return;
    }

    const proj = {
      id: editId || genId(),
      name,
      client: document.getElementById('projClient').value.trim(),
      manager: document.getElementById('projManager').value,
      status: document.getElementById('projStatus').value,
      priority: document.getElementById('projPriority').value,
      startDate: document.getElementById('projStart').value,
      dueDate: document.getElementById('projDue').value,
      progress: parseInt(document.getElementById('projProgress').value) || 0,
      description: document.getElementById('projDesc').value.trim(),
      team: []
    };

    if (editId) {
      const idx = projects.findIndex(p => p.id === editId);
      if (idx !== -1) projects[idx] = { ...projects[idx], ...proj };
    } else {
      projects.push(proj);
    }

    Storage.set('projects', projects);
    projModal.hide();
    renderStats();
    renderProjects();
    showToast(editId ? 'Project updated successfully!' : 'Project created successfully!', 'success');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
