// Enterprise360 – Employees JS
(function() {
  const { Storage } = window.E360;
  const { showToast, genId, formatDate, formatCurrency, avatarHtml, avatarColor, getInitials, statusBadge, debounce, paginate, renderPagination, searchFilter, sortBy, exportCSV, confirm } = window.E360.Utils;
  const { getSampleData } = window.E360;

  let allEmployees = [], allDepts = [], allDesigs = [];
  let empModal, profileModal;
  let currentPage = 1; const PER_PAGE = 8;
  let editingId = null;
  let avatarData = '';
  let sortKey = 'name', sortDir = 'asc';
  let viewMode = 'table';

  async function init() {
    const user = await window.initPage('Employees', 'employees.html');
    if (!user) return;

    const data = await getSampleData();
    allEmployees = Storage.get('employees', data.employees || []);
    allDepts     = data.departments || [];
    allDesigs    = data.designations || [];

    empModal     = new bootstrap.Modal(document.getElementById('empModal'));
    profileModal = new bootstrap.Modal(document.getElementById('profileModal'));

    populateFilters();
    renderStats();
    renderTable();

    // Events
    document.getElementById('addEmpBtn')?.addEventListener('click', openAddModal);
    document.getElementById('saveEmpBtn')?.addEventListener('click', saveEmployee);
    document.getElementById('empSearch')?.addEventListener('input', debounce(() => { currentPage=1; renderTable(); }, 300));
    document.getElementById('deptFilter')?.addEventListener('change', () => { currentPage=1; renderTable(); });
    document.getElementById('statusFilter')?.addEventListener('change', () => { currentPage=1; renderTable(); });
    document.getElementById('sortSelect')?.addEventListener('change', e => { sortKey = e.target.value; renderTable(); });
    document.getElementById('exportEmpBtn')?.addEventListener('click', () => exportCSV(getFiltered(), 'employees.csv'));
    document.getElementById('avatarInput')?.addEventListener('change', handleAvatarUpload);
    document.getElementById('tableView')?.addEventListener('click', () => { viewMode='table'; toggleView(); });
    document.getElementById('gridView')?.addEventListener('click', () => { viewMode='grid'; toggleView(); });
  }

  function populateFilters() {
    const deptSel = document.getElementById('deptFilter');
    if (deptSel) allDepts.forEach(d => { const o = document.createElement('option'); o.value=d; o.textContent=d; deptSel.appendChild(o); });
    const deptModal = document.getElementById('empDept');
    if (deptModal) allDepts.forEach(d => { const o = document.createElement('option'); o.value=d; o.textContent=d; deptModal.appendChild(o); });
    const desigModal = document.getElementById('empDesig');
    if (desigModal) allDesigs.forEach(d => { const o = document.createElement('option'); o.value=d; o.textContent=d; desigModal.appendChild(o); });
  }

  function renderStats() {
    const total = allEmployees.length;
    const active = allEmployees.filter(e => e.status==='Active').length;
    const depts = [...new Set(allEmployees.map(e => e.department))].length;
    const avgSalary = allEmployees.reduce((s,e) => s+e.salary,0) / (total||1);
    const statEl = document.getElementById('empStats');
    if (statEl) {
      statEl.innerHTML = [
        { label:'Total Employees', value:total, icon:'bi-people', bg:'bg-primary-soft' },
        { label:'Active', value:active, icon:'bi-person-check', bg:'bg-success-soft' },
        { label:'Inactive', value:total-active, icon:'bi-person-x', bg:'bg-danger-soft' },
        { label:'Departments', value:depts, icon:'bi-building', bg:'bg-info-soft' },
        { label:'Avg Salary', value:formatCurrency(avgSalary), icon:'bi-currency-dollar', bg:'bg-warning-soft' },
      ].map(s => `<div class="col-sm-6 col-lg"><div class="stat-card"><div class="stat-icon ${s.bg}"><i class="bi ${s.icon}"></i></div><div class="stat-info"><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div></div></div>`).join('');
    }
  }

  function getFiltered() {
    let list = [...allEmployees];
    const q = document.getElementById('empSearch')?.value.trim() || '';
    const dept = document.getElementById('deptFilter')?.value || '';
    const status = document.getElementById('statusFilter')?.value || '';
    if (q) list = searchFilter(list, q, ['name','email','department','designation']);
    if (dept) list = list.filter(e => e.department === dept);
    if (status) list = list.filter(e => e.status === status);
    list = sortBy(list, sortKey, sortDir);
    return list;
  }

  function renderTable() {
    const filtered = getFiltered();
    const pager = paginate(filtered, currentPage, PER_PAGE);
    const countEl = document.getElementById('empCount');
    if (countEl) countEl.textContent = `Employees (${filtered.length})`;
    const infoEl = document.getElementById('pageInfo');
    if (infoEl) infoEl.textContent = `Showing ${(currentPage-1)*PER_PAGE+1}–${Math.min(currentPage*PER_PAGE, filtered.length)} of ${filtered.length}`;

    if (viewMode === 'table') {
      const tb = document.getElementById('empTableBody');
      if (tb) tb.innerHTML = pager.items.length
        ? pager.items.map(e => empRow(e)).join('')
        : `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-people"></i><h6>No employees found</h6></div></td></tr>`;
    } else {
      const gr = document.getElementById('empGrid');
      if (gr) gr.innerHTML = pager.items.length
        ? pager.items.map(e => empCard(e)).join('')
        : `<div class="col-12"><div class="empty-state"><i class="bi bi-people"></i><h6>No employees found</h6></div></div>`;
    }

    const pagEl = document.getElementById('pagination');
    if (pagEl) pagEl.innerHTML = renderPagination(pager, p => { currentPage=p; renderTable(); });
    bindTableActions();
  }

  function empRow(e) {
    const color = avatarColor(e.name);
    const initials = getInitials(e.name);
    const statusCls = e.status === 'Active' ? 'badge-active' : 'badge-inactive';
    return `<tr>
      <td><div class="d-flex align-items-center gap-2">
        <div class="avatar avatar-sm" style="background:${color}">${e.avatar ? `<img src="${e.avatar}">` : initials}</div>
        <div><div style="font-size:.85rem;font-weight:600">${e.name}</div><div class="text-muted" style="font-size:.75rem">${e.email}</div></div>
      </div></td>
      <td style="font-size:.85rem">${e.department}</td>
      <td style="font-size:.85rem">${e.designation}</td>
      <td style="font-size:.85rem">${e.phone || '—'}</td>
      <td style="font-size:.85rem">${formatDate(e.joinDate)}</td>
      <td style="font-size:.85rem">${formatCurrency(e.salary)}</td>
      <td><span class="badge-status ${statusCls}">${e.status}</span></td>
      <td>
        <div class="d-flex gap-1">
          <button class="btn-icon view-emp" data-id="${e.id}" title="View"><i class="bi bi-eye"></i></button>
          <button class="btn-icon edit-emp" data-id="${e.id}" title="Edit"><i class="bi bi-pencil"></i></button>
          <button class="btn-icon text-danger del-emp" data-id="${e.id}" title="Delete"><i class="bi bi-trash"></i></button>
        </div>
      </td></tr>`;
  }

  function empCard(e) {
    const color = avatarColor(e.name);
    const initials = getInitials(e.name);
    const statusCls = e.status === 'Active' ? 'badge-active' : 'badge-inactive';
    return `<div class="col-sm-6 col-lg-4 col-xl-3">
      <div class="card text-center p-3">
        <div class="avatar avatar-xl mx-auto mb-2" style="background:${color}">${e.avatar ? `<img src="${e.avatar}">` : initials}</div>
        <div class="fw-semibold" style="font-size:.88rem">${e.name}</div>
        <div class="text-muted" style="font-size:.78rem">${e.designation}</div>
        <div class="text-muted" style="font-size:.75rem">${e.department}</div>
        <div class="mt-2"><span class="badge-status ${statusCls}">${e.status}</span></div>
        <div class="d-flex justify-content-center gap-2 mt-3">
          <button class="btn btn-sm btn-outline-primary view-emp" data-id="${e.id}"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-outline-secondary edit-emp" data-id="${e.id}"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-outline-danger del-emp" data-id="${e.id}"><i class="bi bi-trash"></i></button>
        </div>
      </div>
    </div>`;
  }

  function bindTableActions() {
    document.querySelectorAll('.view-emp').forEach(btn => btn.addEventListener('click', () => viewEmployee(+btn.dataset.id)));
    document.querySelectorAll('.edit-emp').forEach(btn => btn.addEventListener('click', () => editEmployee(+btn.dataset.id)));
    document.querySelectorAll('.del-emp').forEach(btn => btn.addEventListener('click', () => deleteEmployee(+btn.dataset.id)));
  }

  function toggleView() {
    document.getElementById('tableContainer')?.classList.toggle('d-none', viewMode !== 'table');
    document.getElementById('gridContainer')?.classList.toggle('d-none', viewMode !== 'grid');
    document.getElementById('tableView')?.classList.toggle('active', viewMode === 'table');
    document.getElementById('gridView')?.classList.toggle('active', viewMode === 'grid');
    renderTable();
  }

  function openAddModal() {
    editingId = null; avatarData = '';
    document.getElementById('empModalTitle').textContent = 'Add Employee';
    document.getElementById('empName').value = '';
    document.getElementById('empEmail').value = '';
    document.getElementById('empPhone').value = '';
    document.getElementById('empDept').selectedIndex = 0;
    document.getElementById('empDesig').selectedIndex = 0;
    document.getElementById('empSalary').value = '';
    document.getElementById('empJoinDate').value = '';
    document.getElementById('empStatus').value = 'Active';
    document.getElementById('avatarPreview').innerHTML = 'AV';
    document.getElementById('avatarPreview').style.backgroundImage = '';
    empModal.show();
  }

  function editEmployee(id) {
    const e = allEmployees.find(e => e.id === id);
    if (!e) return;
    editingId = id; avatarData = e.avatar || '';
    document.getElementById('empModalTitle').textContent = 'Edit Employee';
    document.getElementById('empName').value = e.name;
    document.getElementById('empEmail').value = e.email;
    document.getElementById('empPhone').value = e.phone || '';
    document.getElementById('empDept').value = e.department;
    document.getElementById('empDesig').value = e.designation;
    document.getElementById('empSalary').value = e.salary;
    document.getElementById('empJoinDate').value = e.joinDate;
    document.getElementById('empStatus').value = e.status;
    const prev = document.getElementById('avatarPreview');
    if (e.avatar) { prev.innerHTML = `<img src="${e.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`; }
    else { prev.textContent = getInitials(e.name); }
    empModal.show();
  }

  async function deleteEmployee(id) {
    const ok = await confirm('Delete this employee? This action cannot be undone.', 'Delete Employee');
    if (!ok) return;
    allEmployees = allEmployees.filter(e => e.id !== id);
    Storage.set('employees', allEmployees);
    renderStats(); renderTable();
    showToast('Employee deleted.', 'danger');
  }

  function saveEmployee() {
    const name   = document.getElementById('empName').value.trim();
    const email  = document.getElementById('empEmail').value.trim();
    const phone  = document.getElementById('empPhone').value.trim();
    const dept   = document.getElementById('empDept').value;
    const desig  = document.getElementById('empDesig').value;
    const salary = parseFloat(document.getElementById('empSalary').value) || 0;
    const joinDate = document.getElementById('empJoinDate').value;
    const status = document.getElementById('empStatus').value;

    if (!name || !email) { showToast('Name and email are required.', 'warning'); return; }

    if (editingId) {
      const idx = allEmployees.findIndex(e => e.id === editingId);
      if (idx !== -1) allEmployees[idx] = { ...allEmployees[idx], name, email, phone, department:dept, designation:desig, salary, joinDate, status, avatar:avatarData };
      showToast('Employee updated!', 'success');
    } else {
      allEmployees.push({ id:genId(), name, email, phone, department:dept, designation:desig, salary, joinDate, status, avatar:avatarData });
      showToast('Employee added!', 'success');
    }

    Storage.set('employees', allEmployees);
    empModal.hide();
    renderStats(); renderTable();
  }

  function viewEmployee(id) {
    const e = allEmployees.find(e => e.id === id);
    if (!e) return;
    const color = avatarColor(e.name);
    const initials = getInitials(e.name);
    document.getElementById('profileBody').innerHTML = `
      <div class="text-center mb-3">
        <div class="avatar avatar-xl mx-auto mb-2" style="background:${color}">${e.avatar ? `<img src="${e.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : initials}</div>
        <h6 class="mb-1">${e.name}</h6>
        <span class="text-muted" style="font-size:.82rem">${e.designation} · ${e.department}</span>
      </div>
      <hr>
      <div class="row g-2">
        ${[['Email',e.email,'bi-envelope'],['Phone',e.phone||'—','bi-phone'],['Join Date',formatDate(e.joinDate),'bi-calendar'],['Salary',formatCurrency(e.salary),'bi-currency-dollar'],['Status',e.status,'bi-circle-fill']].map(([l,v,i])=>`
        <div class="col-6 d-flex align-items-center gap-2 py-1">
          <i class="bi ${i} text-primary"></i>
          <div><div class="text-muted" style="font-size:.72rem">${l}</div><div style="font-size:.85rem;font-weight:500">${v}</div></div>
        </div>`).join('')}
      </div>`;
    profileModal.show();
  }

  function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      avatarData = ev.target.result;
      const prev = document.getElementById('avatarPreview');
      prev.innerHTML = `<img src="${avatarData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    };
    reader.readAsDataURL(file);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
