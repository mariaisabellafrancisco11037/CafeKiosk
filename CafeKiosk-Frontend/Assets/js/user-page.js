(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  let users = [];
  let busy = false;

  function apiOrigin() {
    return window.CafeAuth?.API_ORIGIN ||
      ((location.protocol === 'http:' || location.protocol === 'https:')
        ? ((!location.port || location.port === '80' || location.port === '443' || location.port === '5000') ? location.origin : `${location.protocol}//${location.hostname}:5000`)
        : 'http://127.0.0.1:5000');
  }

  async function af(url, options = {}) {
    if (window.CafeAuth?.apiFetch) return window.CafeAuth.apiFetch(url, options);
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem('cafeAdminAuthToken') || sessionStorage.getItem('cafeAuthToken') || '';
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers, credentials: 'include' });
  }

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[c]);
  }

  function fmtDate(value) {
    if (!value) return 'Never';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 'Never' : d.toLocaleString([], {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function setMessage(message, error = false) {
    const el = $('usersMessage');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = error ? '#a84d47' : '';
  }

  function currentUserId() {
    const fromSession = window.CafeAuth?.session?.userId;
    if (fromSession != null && String(fromSession).trim()) return String(fromSession);
    try {
      const saved = JSON.parse(localStorage.getItem('cafeAdminSession') || 'null');
      return saved?.userId != null ? String(saved.userId) : '';
    } catch { return ''; }
  }

  function render() {
    const table = $('usersTable');
    const archiveTable = $('archivedUsersTable');
    if (!table) return;

    const q = String($('userSearch')?.value || '').trim().toLowerCase();
    const role = $('roleFilter')?.value || '';
    const status = $('statusFilter')?.value || '';
    const me = currentUserId();

    const matchesCommon = user => {
      const haystack = `${user.name || ''} ${user.username || ''} ${user.email || ''}`.toLowerCase();
      return (!q || haystack.includes(q)) && (!role || user.role === role);
    };

    const currentRows = users.filter(user => user.status !== 'Inactive' && matchesCommon(user) && (!status || user.status === status));
    const archivedRows = users.filter(user => user.status === 'Inactive' && matchesCommon(user));

    if (!currentRows.length) {
      table.innerHTML = '<div class="ck-empty">No current employee accounts match the current filters.</div>';
    } else {
      table.innerHTML = `
        <div class="ck-table-wrap">
          <table class="ck-table users-table">
            <thead><tr><th>User</th><th>User ID</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
            <tbody>${currentRows.map(user => {
              const isSelf = user.isCurrentUser || (me && String(user.id) === me);
              const active = user.status === 'Active';
              const canArchive = !isSelf && !user.isOwner && (user.role === 'Staff' || user.role === 'Manager' || user.role === 'Admin');
              return `<tr>
                <td><div class="user-name-cell"><div class="user-name-line"><strong>${esc(user.name)}</strong>${user.isOwner ? '<span class="user-owner-pill">OWNER</span>' : ''}${isSelf ? '<span class="user-self-pill">YOU</span>' : ''}</div><span class="ck-muted">${esc(user.phone || 'No phone number')}</span></div></td>
                <td>${esc(user.username)}</td>
                <td>${esc(user.email || '—')}</td>
                <td>${esc(user.role)}</td>
                <td><span class="ck-pill ${active ? '' : 'off'}">${esc(user.status)}</span></td>
                <td>${esc(fmtDate(user.lastLogin))}</td>
                <td><div class="ck-actions">
                  <button class="ck-btn" data-edit="${esc(user.id)}">Edit</button>
                  ${canArchive
                    ? `<button class="ck-btn danger status-action-btn fire-btn" data-status="${esc(user.id)}" data-new-status="Inactive">Fire &amp; Archive</button>`
                    : (!active && !user.isOwner ? `<button class="ck-btn primary status-action-btn" data-status="${esc(user.id)}" data-new-status="Active">Activate</button>` : '')}
                </div></td>
              </tr>`;
            }).join('')}</tbody>
          </table>
        </div>`;
    }

    if ($('archiveCount')) $('archiveCount').textContent = String(archivedRows.length);
    if (archiveTable) {
      if (!archivedRows.length) {
        archiveTable.innerHTML = '<div class="ck-empty">No former employees are currently archived.</div>';
      } else {
        archiveTable.innerHTML = `
          <div class="ck-table-wrap">
            <table class="ck-table archives-table">
              <thead><tr><th>Former Employee</th><th>User ID</th><th>Email</th><th>Role</th><th>Archived</th><th>Reason</th><th>Archived By</th><th>Action</th></tr></thead>
              <tbody>${archivedRows.map(user => `<tr>
                <td><div class="user-name-cell"><strong>${esc(user.name)}</strong><span class="ck-muted">${esc(user.phone || 'No phone number')}</span></div></td>
                <td>${esc(user.username)}</td>
                <td>${esc(user.email || '—')}</td>
                <td>${esc(user.role)}</td>
                <td><div class="archive-meta"><span>${esc(fmtDate(user.archivedAt || user.updatedAt))}</span><small>Account inactive</small></div></td>
                <td class="archive-reason">${esc(user.archiveReason || 'No archive reason recorded.')}</td>
                <td>${esc(user.archivedBy || 'Administrator')}</td>
                <td><button class="ck-btn primary status-action-btn" data-status="${esc(user.id)}" data-new-status="Active">Restore</button></td>
              </tr>`).join('')}</tbody>
            </table>
          </div>`;
      }
    }

    document.querySelectorAll('[data-edit]').forEach(button => {
      button.addEventListener('click', () => openUser(users.find(user => String(user.id) === String(button.dataset.edit))));
    });
    document.querySelectorAll('[data-status]:not([disabled])').forEach(button => {
      button.addEventListener('click', () => openStatus(users.find(user => String(user.id) === String(button.dataset.status)), button.dataset.newStatus));
    });
  }

  async function loadUsers() {
    setMessage('Loading user accounts...');
    try {
      const response = await af(`${apiOrigin()}/api/auth/users`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
      if (data.authToken && window.CafeAuth?.replaceToken) window.CafeAuth.replaceToken(data.authToken);
      users = Array.isArray(data.users) ? data.users : [];
      setMessage(`${users.length} database-backed account${users.length === 1 ? '' : 's'} loaded.`);
      render();
    } catch (error) {
      users = [];
      render();
      setMessage(`Unable to load users: ${error.message}`, true);
    }
  }

  function openUser(user = null) {
    $('editUserDbId').value = user?.id || '';
    $('userName').value = user?.name || '';
    $('userId').value = user?.username || '';
    $('userEmail').value = user?.email || '';
    $('userPhone').value = user?.phone || '';
    $('userRole').value = user?.role || 'Staff';
    $('userPassword').value = '';
    $('userModalTitle').textContent = user ? 'Edit User Account' : 'Add User Account';
    $('passwordLabel').textContent = user ? 'Reset Password (optional)' : 'Temporary Password';
    $('passwordHelp').textContent = user
      ? 'Leave blank to keep the current password. If entered, the user will be required to change it.'
      : 'Required for a new account. Minimum 8 characters.';
    $('userPassword').required = !user;
    $('userModal').classList.add('open');
  }

  function closeUser() { $('userModal')?.classList.remove('open'); }

  function openStatus(user, newStatus) {
    if (!user) return;
    const archive = newStatus === 'Inactive';
    $('statusUserId').value = user.id;
    $('statusNewValue').value = newStatus;
    $('statusAccountName').textContent = user.name;
    $('statusAccountMeta').textContent = `${user.role} • ${user.username} • ${user.email || 'No email'}`;
    $('statusModalTitle').textContent = archive ? 'Fire & Archive Employee' : 'Restore Employee';
    $('statusReasonLabel').textContent = archive ? 'Archive / Firing Reason' : 'Restore Note';
    $('statusReason').placeholder = archive
      ? 'Example: Employment ended on September 23, 2026.'
      : 'Example: Employee was rehired and returned to active duty.';
    if ($('statusNoteHelp')) {
      $('statusNoteHelp').textContent = archive
        ? 'This reason will be kept in Former Employee Archives and recorded in the Audit Logs.'
        : 'This note explains why the former employee account is being restored. It will be recorded in the Audit Logs.';
    }
    $('statusReason').value = '';
    $('reasonCount').textContent = '0';
    $('statusWarning').classList.toggle('activate', !archive);
    $('statusWarning').textContent = archive
      ? 'The employee will be signed out immediately and moved to Former Employee Archives. They will no longer be able to log in.'
      : 'The employee account will return to the current employee list and will be allowed to sign in again.';
    const confirm = $('confirmStatus');
    confirm.textContent = archive ? 'Fire & Archive' : 'Restore Employee';
    confirm.classList.toggle('danger', archive);
    confirm.classList.toggle('primary', !archive);
    $('statusModal').classList.add('open');
    setTimeout(() => $('statusReason')?.focus(), 50);
  }

  function closeStatus() { $('statusModal')?.classList.remove('open'); }

  async function saveUser(event) {
    event.preventDefault();
    if (busy) return;
    const dbId = $('editUserDbId').value.trim();
    const payload = {
      name: $('userName').value.trim(),
      username: $('userId').value.trim(),
      email: $('userEmail').value.trim(),
      phone: $('userPhone').value.trim(),
      role: $('userRole').value,
      password: $('userPassword').value
    };
    if (!payload.name || !payload.username || !payload.email || (!dbId && !payload.password)) {
      alert('Please complete all required fields.');
      return;
    }

    busy = true;
    const button = $('saveUser');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = 'Saving...';
    try {
      const response = await af(`${apiOrigin()}/api/auth/users${dbId ? `/${encodeURIComponent(dbId)}` : ''}`, {
        method: dbId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to save user.');
      if (data.authToken && window.CafeAuth?.replaceToken) window.CafeAuth.replaceToken(data.authToken);
      closeUser();
      setMessage(data.message || 'User saved.');
      await loadUsers();
    } catch (error) {
      alert(error.message);
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function saveStatus(event) {
    event.preventDefault();
    if (busy) return;
    const userId = $('statusUserId').value;
    const status = $('statusNewValue').value;
    const reason = $('statusReason').value.trim();
    if (reason.length < 3) {
      alert(`Please write a short admin note before ${status === 'Inactive' ? 'archiving' : 'restoring'} this employee.`);
      $('statusReason').focus();
      return;
    }

    busy = true;
    const button = $('confirmStatus');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = status === 'Inactive' ? 'Archiving...' : 'Restoring...';
    try {
      const response = await af(`${apiOrigin()}/api/auth/users/${encodeURIComponent(userId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to change account status.');
      if (data.authToken && window.CafeAuth?.replaceToken) window.CafeAuth.replaceToken(data.authToken);
      closeStatus();
      setMessage(data.message || (status === 'Inactive' ? 'Employee moved to archives.' : 'Employee restored.'));
      await loadUsers();
    } catch (error) {
      alert(error.message);
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = original;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('addUser')?.addEventListener('click', () => openUser());
    $('closeUser')?.addEventListener('click', closeUser);
    $('cancelUser')?.addEventListener('click', closeUser);
    $('userForm')?.addEventListener('submit', saveUser);

    $('closeStatus')?.addEventListener('click', closeStatus);
    $('cancelStatus')?.addEventListener('click', closeStatus);
    $('statusForm')?.addEventListener('submit', saveStatus);
    $('statusReason')?.addEventListener('input', event => { $('reasonCount').textContent = String(event.target.value.length); });

    ['userSearch', 'roleFilter', 'statusFilter'].forEach(id => {
      $(id)?.addEventListener(id === 'userSearch' ? 'input' : 'change', render);
    });

    $('userModal')?.addEventListener('click', event => { if (event.target === $('userModal')) closeUser(); });
    $('statusModal')?.addEventListener('click', event => { if (event.target === $('statusModal')) closeStatus(); });

    loadUsers();
  });
})();
