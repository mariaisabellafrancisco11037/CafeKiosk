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
    if (!table) return;

    const q = String($('userSearch')?.value || '').trim().toLowerCase();
    const role = $('roleFilter')?.value || '';
    const status = $('statusFilter')?.value || '';
    const me = currentUserId();

    const rows = users.filter(user => {
      const haystack = `${user.name || ''} ${user.username || ''} ${user.email || ''}`.toLowerCase();
      return (!q || haystack.includes(q)) && (!role || user.role === role) && (!status || user.status === status);
    });

    if (!rows.length) {
      table.innerHTML = '<div class="ck-empty">No user accounts match the current filters.</div>';
      return;
    }

    table.innerHTML = `
      <div class="ck-table-wrap">
        <table class="ck-table users-table">
          <thead><tr><th>User</th><th>User ID</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>${rows.map(user => {
            const isSelf = user.isCurrentUser || (me && String(user.id) === me);
            const active = user.status === 'Active';
            return `<tr>
              <td><div class="user-name-cell"><div class="user-name-line"><strong>${esc(user.name)}</strong>${user.isOwner ? '<span class="user-owner-pill">OWNER</span>' : ''}${isSelf ? '<span class="user-self-pill">YOU</span>' : ''}</div><span class="ck-muted">${esc(user.phone || 'No phone number')}</span></div></td>
              <td>${esc(user.username)}</td>
              <td>${esc(user.email || '—')}</td>
              <td>${esc(user.role)}</td>
              <td><span class="ck-pill ${active ? '' : 'off'}">${esc(user.status)}</span></td>
              <td>${esc(fmtDate(user.lastLogin))}</td>
              <td><div class="ck-actions">
                <button class="ck-btn" data-edit="${esc(user.id)}">Edit</button>
                <button class="ck-btn status-action-btn ${active ? 'danger' : 'primary'}" data-status="${esc(user.id)}" data-new-status="${active ? 'Inactive' : 'Active'}" ${isSelf && active ? 'disabled title="You cannot deactivate the account you are currently using."' : ''}>${active ? 'Deactivate' : 'Activate'}</button>
              </div></td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>`;

    table.querySelectorAll('[data-edit]').forEach(button => {
      button.addEventListener('click', () => openUser(users.find(user => String(user.id) === String(button.dataset.edit))));
    });
    table.querySelectorAll('[data-status]:not([disabled])').forEach(button => {
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
    const deactivate = newStatus === 'Inactive';
    $('statusUserId').value = user.id;
    $('statusNewValue').value = newStatus;
    $('statusAccountName').textContent = user.name;
    $('statusAccountMeta').textContent = `${user.role} • ${user.username} • ${user.email || 'No email'}`;
    $('statusModalTitle').textContent = deactivate ? 'Deactivate Account' : 'Activate Account';
    $('statusReasonLabel').textContent = deactivate ? 'Deactivation Note' : 'Activation Note';
    $('statusReason').placeholder = deactivate
      ? 'Example: Employee is no longer assigned to the cafe.'
      : 'Example: Employee returned to active duty.';
    if ($('statusNoteHelp')) {
      $('statusNoteHelp').textContent = deactivate
        ? 'Add a short administrative note explaining why this account is being deactivated. The note will appear in the Audit Logs.'
        : 'Add a short administrative note explaining why this account is being activated again. The note will appear in the Audit Logs.';
    }
    $('statusReason').value = '';
    $('reasonCount').textContent = '0';
    $('statusWarning').classList.toggle('activate', !deactivate);
    $('statusWarning').textContent = deactivate
      ? 'This account will be disabled immediately. If the user is currently signed in on POS or Admin, CafeKiosk will kick them out automatically.'
      : 'This account will be allowed to sign in again. The admin note will be saved in the Audit Logs.';
    const confirm = $('confirmStatus');
    confirm.textContent = deactivate ? 'Deactivate Account' : 'Activate Account';
    confirm.classList.toggle('danger', deactivate);
    confirm.classList.toggle('primary', !deactivate);
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
      alert(`Please write a short admin note before ${status === 'Inactive' ? 'deactivating' : 'activating'} this account.`);
      $('statusReason').focus();
      return;
    }

    busy = true;
    const button = $('confirmStatus');
    const original = button.textContent;
    button.disabled = true;
    button.textContent = status === 'Inactive' ? 'Deactivating...' : 'Activating...';
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
      setMessage(data.message || `Account is now ${status.toLowerCase()}.`);
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
