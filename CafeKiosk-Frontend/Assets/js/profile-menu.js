/* Load the shared eye-icon password visibility control on Admin/POS pages. */
(function loadCafeKioskPasswordVisibility() {
  if (window.CafeKioskPasswordVisibility || document.querySelector('script[data-cafekiosk-password-visibility]')) return;
  const current = document.currentScript?.src || '';
  const src = current ? new URL('password-visibility.js', current).href : '/Assets/js/password-visibility.js';
  const script = document.createElement('script');
  script.src = src;
  script.dataset.cafekioskPasswordVisibility = 'true';
  document.head.appendChild(script);
})();

/* ============================================================
   CAFEKIOSK - ADMIN / STAFF PROFILE MENU
   Common digital POS account controls:
   - Account/profile details
   - Active session information
   - Change password
   - Quick workspace shortcut
   - Logout
   ============================================================ */

(() => {
  'use strict';

  const PERSON_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>';
  const PROFILE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>';
  const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="16" cy="12" r="1"/></svg>';
  const LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  const SETTINGS_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 3.1h5l.3-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z"/></svg>';
  const DASHBOARD_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>';
  const QUEUE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 5h14M5 12h14M5 19h14"/><circle cx="3" cy="5" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="19" r="1"/></svg>';
  const LOGOUT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M13 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>';

  let detailedProfile = null;
  let menuShell = null;
  let observer = null;

  function parseJson(value) {
    try { return JSON.parse(value || 'null'); } catch (_) { return null; }
  }

  function area() {
    const path = String(location.pathname || '').toLowerCase();
    if (path.includes('/admin/')) return 'admin';
    if (path.includes('/manager/') || path.includes('manager-dashboard') || path.includes('manager-pos') || path.includes('manager-order-queue')) return 'manager';
    if (path.includes('/pos/') || path.endsWith('/pos') || path.includes('order-queue') || path.includes('staff-dashboard')) {
      const active = String(sessionStorage.getItem('cafeActiveRole') || '').toLowerCase();
      if (active === 'manager') return 'manager';
      return 'staff';
    }
    return '';
  }

  function session() {
    const currentArea = area();
    if (currentArea === 'admin') {
      return parseJson(localStorage.getItem('cafeAdminSession')) || window.CafeAuth?.session || null;
    }
    if (currentArea === 'manager') {
      return parseJson(localStorage.getItem('cafeManagerSession')) || window.CafeAuth?.session || null;
    }
    if (currentArea === 'staff') {
      return parseJson(localStorage.getItem('cafeStaffSession')) || parseJson(localStorage.getItem('cafeManagerSession')) || parseJson(localStorage.getItem('cafeAdminSession')) || window.CafeAuth?.session || null;
    }
    return null;
  }

  function esc(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function roleLabel(value) {
    const role = String(value || '').trim();
    if (/^admin$/i.test(role)) return 'Administrator';
    if (/^manager$/i.test(role)) return 'Manager';
    return role || (area() === 'admin' ? 'Administrator' : area() === 'manager' ? 'Manager' : 'Staff');
  }

  function basicProfile() {
    const s = session() || {};
    return {
      userId: s.userId || '—',
      username: s.username || '—',
      email: s.email || '',
      phone: s.phone || '',
      displayName: s.displayName || s.fullName || s.full_name || s.name || s.username || (area() === 'admin' ? 'CafeKiosk Administrator' : area() === 'manager' ? 'CafeKiosk Manager' : 'CafeKiosk Staff'),
      role: s.role || (area() === 'admin' ? 'Admin' : area() === 'manager' ? 'Manager' : 'Staff'),
      cafeId: s.cafeId || localStorage.getItem('cafeId') || 'cafe-1',
      cafeName: s.cafeName || '',
      isOwner: Boolean(s.isOwner),
      loginAt: s.loginAt || null,
      status: 'Active',
      databaseBacked: null
    };
  }

  function currentProfile() {
    return { ...basicProfile(), ...(detailedProfile || {}) };
  }

  // Only Admin/Owner and Manager accounts are allowed to configure the
  // Refund/Void approval PIN. Staff can use an Admin/Manager PIN for
  // approval, but must never see the PIN setup control.
  function canManageApprovalPin() {
    const p = currentProfile();
    const role = String(p.role || session()?.role || '').trim().toLowerCase();
    return role === 'admin' || role === 'manager';
  }


  function isCafeOwner() {
    const p = currentProfile();
    const role = String(p.role || session()?.role || '').trim().toLowerCase();
    return role === 'admin' && Boolean(p.isOwner);
  }

  function formatDateTime(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString([], {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  function sessionDuration(value) {
    if (!value) return 'Current session';
    const start = new Date(value).getTime();
    if (!Number.isFinite(start)) return 'Current session';
    const minutes = Math.max(0, Math.floor((Date.now() - start) / 60000));
    if (minutes < 1) return 'Just signed in';
    if (minutes < 60) return `${minutes} min session`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m session`;
  }

  function pathToAdminSettings() { return '/admin/settings'; }

  function pathToStaffDashboard() { return '/staff-dashboard'; }

  function pathToOrderQueue() { return area() === 'manager' ? '/manager-order-queue' : '/order-queue'; }

  function closeMenu() {
    if (!menuShell) return;
    menuShell.classList.remove('open');
    menuShell.querySelector('.ckp-trigger')?.setAttribute('aria-expanded', 'false');
  }

  function toggleMenu() {
    if (!menuShell) return;
    const opening = !menuShell.classList.contains('open');
    menuShell.classList.toggle('open', opening);
    menuShell.querySelector('.ckp-trigger')?.setAttribute('aria-expanded', String(opening));
    if (opening) refreshProfile();
  }

  async function refreshProfile() {
    const auth = window.CafeAuth;
    if (!auth?.apiFetch || !auth?.API_ORIGIN) {
      renderProfileEverywhere();
      return;
    }

    try {
      const response = await auth.apiFetch(`${auth.API_ORIGIN}/api/auth/me`, { method: 'GET' });
      if (!response.ok) return;
      const payload = await response.json();
      if (payload?.user) {
        detailedProfile = { ...payload.user, loginAt: session()?.loginAt || payload.user.loginAt || null };
        renderProfileEverywhere();
      }
    } catch (error) {
      console.warn('Could not refresh profile details:', error);
    }
  }

  function renderProfileEverywhere() {
    const p = currentProfile();
    const name = p.displayName || p.username || 'User';
    const role = roleLabel(p.role);

    document.querySelectorAll('[data-ckp-name]').forEach(el => { el.textContent = name; });
    document.querySelectorAll('[data-ckp-role]').forEach(el => { el.textContent = p.isOwner ? `${role} • Owner` : role; });
    document.querySelectorAll('[data-ckp-session]').forEach(el => { el.textContent = sessionDuration(p.loginAt); });

    const fields = {
      name,
      username: p.username || '—',
      email: p.email || 'Not set',
      phone: p.phone || 'Not set',
      role: p.isOwner ? `${role} / Cafe Owner` : role,
      cafe: p.cafeName || p.cafeId || '—',
      cafeId: p.cafeId || '—',
      lastLogin: formatDateTime(p.lastLogin || p.loginAt),
      status: p.status || 'Active'
    };

    Object.entries(fields).forEach(([key, value]) => {
      document.querySelectorAll(`[data-ckp-field="${key}"]`).forEach(el => { el.textContent = value; });
    });
  }

  function ensureProfileModal() {
    let modal = document.getElementById('ckpProfileModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'ckpProfileModal';
    modal.className = 'ckp-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <section class="ckp-dialog" role="dialog" aria-modal="true" aria-labelledby="ckpProfileTitle">
        <div class="ckp-dialog-head">
          <div>
            <span class="ckp-eyebrow">ACCOUNT</span>
            <h2 id="ckpProfileTitle">My Profile</h2>
          </div>
          <button type="button" class="ckp-close" data-ckp-close aria-label="Close profile">×</button>
        </div>
        <div class="ckp-profile-hero">
          <span class="ckp-hero-avatar">${PERSON_ICON}</span>
          <div>
            <strong data-ckp-name>User</strong>
            <span data-ckp-role>Role</span>
          </div>
          <span class="ckp-online-badge"><i></i> Signed in</span>
        </div>
        <div class="ckp-detail-grid">
          <div class="ckp-detail"><span>Full Name</span><strong data-ckp-field="name">—</strong></div>
          <div class="ckp-detail"><span>Username</span><strong data-ckp-field="username">—</strong></div>
          <div class="ckp-detail"><span>Email</span><strong data-ckp-field="email">—</strong></div>
          <div class="ckp-detail"><span>Phone</span><strong data-ckp-field="phone">—</strong></div>
          <div class="ckp-detail"><span>Role</span><strong data-ckp-field="role">—</strong></div>
          <div class="ckp-detail"><span>Cafe</span><strong data-ckp-field="cafe">—</strong></div>
          <div class="ckp-detail"><span>Cafe ID</span><strong data-ckp-field="cafeId">—</strong></div>
          <div class="ckp-detail"><span>Last Login</span><strong data-ckp-field="lastLogin">—</strong></div>
        </div>
        <div class="ckp-dialog-actions">
          <button type="button" class="ckp-secondary" data-ckp-userid hidden>Change User ID</button>
          <button type="button" class="ckp-secondary" data-ckp-password>Change Password</button>
          <button type="button" class="ckp-primary" data-ckp-close>Done</button>
        </div>
      </section>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('[data-ckp-close]')) closeProfileModal();
      if (event.target.closest('[data-ckp-password]')) {
        closeProfileModal();
        openPasswordModal();
      }
      if (event.target.closest('[data-ckp-userid]')) {
        closeProfileModal();
        openUserIdModal();
      }
    });
    return modal;
  }

  function openProfileModal() {
    closeMenu();
    const modal = ensureProfileModal();
    renderProfileEverywhere();
    const userIdButton = modal.querySelector('[data-ckp-userid]');
    if (userIdButton) userIdButton.hidden = !isCafeOwner();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    refreshProfile();
  }

  function closeProfileModal() {
    const modal = document.getElementById('ckpProfileModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }


  function ensureUserIdModal() {
    let modal = document.getElementById('ckpUserIdModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'ckpUserIdModal';
    modal.className = 'ckp-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <section class="ckp-dialog ckp-password-dialog" role="dialog" aria-modal="true" aria-labelledby="ckpUserIdTitle">
        <div class="ckp-dialog-head">
          <div><span class="ckp-eyebrow">OWNER ACCOUNT</span><h2 id="ckpUserIdTitle">Change User ID</h2></div>
          <button type="button" class="ckp-close" data-ckp-close-userid aria-label="Close User ID form">×</button>
        </div>
        <form id="ckpUserIdForm" class="ckp-password-form">
          <label>Current User ID<input name="currentUsername" type="text" readonly></label>
          <label>New User ID<input name="newUsername" type="text" minlength="3" maxlength="60" pattern="[A-Za-z0-9._-]{3,60}" autocomplete="username" required></label>
          <label>Current Password<input name="currentPassword" type="password" autocomplete="current-password" required></label>
          <p class="ckp-password-note">Owner User IDs may use letters, numbers, dots, underscores, and hyphens. You will stay signed in after the change.</p>
          <div class="ckp-form-message" id="ckpUserIdMessage" aria-live="polite"></div>
          <div class="ckp-dialog-actions">
            <button type="button" class="ckp-secondary" data-ckp-close-userid>Cancel</button>
            <button type="submit" class="ckp-primary">Update User ID</button>
          </div>
        </form>
      </section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('[data-ckp-close-userid]')) closeUserIdModal();
    });
    modal.querySelector('#ckpUserIdForm')?.addEventListener('submit', changeUserId);
    return modal;
  }

  function openUserIdModal() {
    closeMenu();
    if (!isCafeOwner()) return;
    const modal = ensureUserIdModal();
    const form = modal.querySelector('#ckpUserIdForm');
    const message = modal.querySelector('#ckpUserIdMessage');
    form?.reset();
    const testInput = modal.querySelector('#ckpTestPin'); if (testInput) testInput.value = '';
    const current = form?.querySelector('[name="currentUsername"]');
    if (current) current.value = currentProfile().username || '';
    if (message) { message.textContent = ''; message.className = 'ckp-form-message'; }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => form?.querySelector('[name="newUsername"]')?.focus(), 30);
  }

  function closeUserIdModal() {
    const modal = document.getElementById('ckpUserIdModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function updateStoredUsername(user) {
    if (!user) return;
    const role = String(user.role || currentProfile().role || 'Admin').toLowerCase();
    const key = role === 'admin' ? 'cafeAdminSession' : role === 'manager' ? 'cafeManagerSession' : 'cafeStaffSession';
    try {
      const stored = JSON.parse(localStorage.getItem(key) || '{}');
      const merged = { ...stored, ...user, username: user.username };
      localStorage.setItem(key, JSON.stringify(merged));
      const tab = JSON.parse(sessionStorage.getItem('cafeSession') || '{}');
      sessionStorage.setItem('cafeSession', JSON.stringify({ ...tab, ...user, username: user.username }));
    } catch (_) {}
  }

  async function changeUserId(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const message = document.getElementById('ckpUserIdMessage');
    const data = new FormData(form);
    const newUsername = String(data.get('newUsername') || '').trim();
    const currentPassword = String(data.get('currentPassword') || '');

    if (!/^[A-Za-z0-9._-]{3,60}$/.test(newUsername)) {
      if (message) { message.textContent = 'Use 3–60 letters, numbers, dots, underscores, or hyphens.'; message.className = 'ckp-form-message error'; }
      return;
    }
    if (!window.CafeAuth?.apiFetch || !window.CafeAuth?.API_ORIGIN) {
      if (message) { message.textContent = 'Authentication service is unavailable.'; message.className = 'ckp-form-message error'; }
      return;
    }

    if (submit) { submit.disabled = true; submit.textContent = 'Updating...'; }
    try {
      const response = await window.CafeAuth.apiFetch(`${window.CafeAuth.API_ORIGIN}/api/auth/change-user-id`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername, currentPassword })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to change User ID.');
      if (payload.authToken && window.CafeAuth?.replaceToken) window.CafeAuth.replaceToken(payload.authToken);
      if (payload.user) {
        detailedProfile = { ...(detailedProfile || {}), ...payload.user };
        updateStoredUsername(payload.user);
        renderProfileEverywhere();
      }
      if (message) { message.textContent = payload.message || 'User ID updated successfully.'; message.className = 'ckp-form-message success'; }
      form.querySelector('[name="currentPassword"]').value = '';
      form.querySelector('[name="currentUsername"]').value = payload.user?.username || newUsername;
      form.querySelector('[name="newUsername"]').value = '';
    } catch (error) {
      if (message) { message.textContent = error.message || 'Unable to change User ID.'; message.className = 'ckp-form-message error'; }
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = 'Update User ID'; }
    }
  }

  function ensurePasswordModal() {
    let modal = document.getElementById('ckpPasswordModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'ckpPasswordModal';
    modal.className = 'ckp-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <section class="ckp-dialog ckp-password-dialog" role="dialog" aria-modal="true" aria-labelledby="ckpPasswordTitle">
        <div class="ckp-dialog-head">
          <div>
            <span class="ckp-eyebrow">SECURITY</span>
            <h2 id="ckpPasswordTitle">Change Password</h2>
          </div>
          <button type="button" class="ckp-close" data-ckp-close-password aria-label="Close password form">×</button>
        </div>
        <form id="ckpPasswordForm" class="ckp-password-form">
          <label>Current Password<input type="password" name="currentPassword" autocomplete="current-password" required></label>
          <label>New Password<input type="password" name="newPassword" autocomplete="new-password" minlength="8" required></label>
          <label>Confirm New Password<input type="password" name="confirmPassword" autocomplete="new-password" minlength="8" required></label>
          <p class="ckp-password-note">Use at least 8 characters. Your current session will remain signed in after the password is changed.</p>
          <div class="ckp-form-message" id="ckpPasswordMessage" aria-live="polite"></div>
          <div class="ckp-dialog-actions">
            <button type="button" class="ckp-secondary" data-ckp-close-password>Cancel</button>
            <button type="submit" class="ckp-primary">Update Password</button>
          </div>
        </form>
      </section>`;
    document.body.appendChild(modal);

    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.closest('[data-ckp-close-password]')) closePasswordModal();
    });

    modal.querySelector('#ckpPasswordForm')?.addEventListener('submit', changePassword);
    return modal;
  }

  function openPasswordModal() {
    closeMenu();
    const modal = ensurePasswordModal();
    const form = modal.querySelector('#ckpPasswordForm');
    const msg = modal.querySelector('#ckpPasswordMessage');
    form?.reset();
    if (msg) { msg.textContent = ''; msg.className = 'ckp-form-message'; }
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => form?.querySelector('input')?.focus(), 30);
  }

  function closePasswordModal() {
    const modal = document.getElementById('ckpPasswordModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function changePassword(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    const msg = document.getElementById('ckpPasswordMessage');
    const data = new FormData(form);
    const currentPassword = String(data.get('currentPassword') || '');
    const newPassword = String(data.get('newPassword') || '');
    const confirmPassword = String(data.get('confirmPassword') || '');

    if (newPassword.length < 8) {
      if (msg) { msg.textContent = 'New password must be at least 8 characters.'; msg.className = 'ckp-form-message error'; }
      return;
    }
    if (newPassword !== confirmPassword) {
      if (msg) { msg.textContent = 'The new passwords do not match.'; msg.className = 'ckp-form-message error'; }
      return;
    }

    if (!window.CafeAuth?.apiFetch || !window.CafeAuth?.API_ORIGIN) {
      if (msg) { msg.textContent = 'Authentication service is unavailable.'; msg.className = 'ckp-form-message error'; }
      return;
    }

    if (submit) { submit.disabled = true; submit.textContent = 'Updating...'; }
    if (msg) { msg.textContent = ''; msg.className = 'ckp-form-message'; }

    try {
      const response = await window.CafeAuth.apiFetch(`${window.CafeAuth.API_ORIGIN}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.success) throw new Error(payload.message || 'Unable to change password.');
      if (msg) { msg.textContent = payload.message || 'Password updated successfully.'; msg.className = 'ckp-form-message success'; }
      form.reset();
    } catch (error) {
      if (msg) { msg.textContent = error.message || 'Unable to change password.'; msg.className = 'ckp-form-message error'; }
    } finally {
      if (submit) { submit.disabled = false; submit.textContent = 'Update Password'; }
    }
  }


  function setPinStatus(hasPin, message) {
    const status = document.getElementById('ckpPinStatus');
    const title = document.getElementById('ckpPinStatusTitle');
    const detail = document.getElementById('ckpPinStatusDetail');
    const verifySection = document.getElementById('ckpPinVerifySection');
    const submit = document.querySelector('#ckpPinForm button[type="submit"]');
    const isLoading = hasPin === null;

    if (status) {
      status.classList.remove('is-error');
      status.classList.toggle('is-set', hasPin === true);
      status.classList.toggle('is-empty', hasPin === false);
    }

    if (title) {
      title.textContent = isLoading
        ? 'Checking PIN status…'
        : hasPin
          ? 'Approval PIN is set'
          : 'No approval PIN set';
    }

    if (detail) {
      detail.textContent = message || (
        isLoading
          ? 'Please wait while CafeKiosk checks this account.'
          : hasPin
            ? 'Your saved PIN is protected and cannot be displayed. You can verify it below or replace it with a new PIN.'
            : 'Create a 4–6 digit PIN before Staff can request refund or void approval.'
      );
    }

    if (verifySection) verifySection.hidden = hasPin !== true;
    if (submit) submit.textContent = isLoading ? 'Save / Replace PIN' : hasPin ? 'Replace PIN' : 'Save PIN';
  }

  function ensurePinModal() {
    let modal = document.getElementById('ckpPinModal');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = 'ckpPinModal';
    modal.className = 'ckp-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `<section class="ckp-dialog ckp-pin-dialog" role="dialog" aria-modal="true" aria-labelledby="ckpPinTitle">
      <button type="button" class="ckp-dialog-close" data-ckp-close-pin aria-label="Close">×</button>

      <div class="ckp-pin-heading">
        <div class="ckp-dialog-icon">${PIN_ICON}</div>
        <div>
          <span class="ckp-eyebrow">SECURITY</span>
          <h2 id="ckpPinTitle">Refund &amp; Void Approval PIN</h2>
          <p class="ckp-dialog-subtitle">Create or replace the PIN Staff will request when a refund or void needs approval.</p>
        </div>
      </div>

      <div id="ckpPinStatus" class="ckp-pin-status" aria-live="polite">
        <span class="ckp-pin-status-dot" aria-hidden="true"></span>
        <div>
          <strong id="ckpPinStatusTitle">Checking PIN status…</strong>
          <span id="ckpPinStatusDetail">Please wait while CafeKiosk checks this account.</span>
        </div>
      </div>

      <section class="ckp-pin-section" aria-labelledby="ckpPinSetHeading">
        <div class="ckp-pin-section-head">
          <div>
            <span class="ckp-pin-step">1</span>
            <div>
              <h3 id="ckpPinSetHeading">Set or replace approval PIN</h3>
              <p>Enter a new 4–6 digit PIN twice. Saving here replaces the previous PIN.</p>
            </div>
          </div>
        </div>

        <form id="ckpPinForm" class="ckp-form ckp-pin-form">
          <div class="ckp-pin-fields">
            <label>New PIN
              <input name="pin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" autocomplete="new-password" placeholder="4–6 digits" required>
            </label>
            <label>Confirm new PIN
              <input name="confirmPin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" autocomplete="new-password" placeholder="Repeat PIN" required>
            </label>
          </div>

          <div class="ckp-dialog-actions ckp-pin-save-actions">
            <button type="button" class="ckp-secondary" data-ckp-close-pin>Cancel</button>
            <button type="submit" class="ckp-primary">Save PIN</button>
          </div>
          <div class="ckp-form-message ckp-pin-result" id="ckpPinSaveMessage" aria-live="polite"></div>
        </form>
      </section>

      <section id="ckpPinVerifySection" class="ckp-pin-section ckp-pin-verify-section" aria-labelledby="ckpPinVerifyHeading" hidden>
        <div class="ckp-pin-section-head">
          <div>
            <span class="ckp-pin-step">2</span>
            <div>
              <h3 id="ckpPinVerifyHeading">Verify saved PIN</h3>
              <p>Use this only when you want to check whether a PIN matches the one already saved.</p>
            </div>
          </div>
        </div>

        <div class="ckp-pin-verify-row">
          <label>Current saved PIN
            <input id="ckpTestPin" type="password" inputmode="numeric" maxlength="6" pattern="[0-9]{4,6}" autocomplete="off" placeholder="Enter current PIN">
          </label>
          <button type="button" class="ckp-secondary ckp-pin-verify-btn" id="ckpTestPinButton">Verify PIN</button>
        </div>
        <div class="ckp-form-message ckp-pin-result" id="ckpPinVerifyMessage" aria-live="polite"></div>
      </section>

      <p class="ckp-pin-security-note"><strong>Security:</strong> CafeKiosk stores only a one-way hash. The existing PIN cannot be viewed or recovered; if it is forgotten, replace it with a new PIN while signed in.</p>
    </section>`;

    document.body.appendChild(modal);

    modal.querySelectorAll('input[inputmode="numeric"]').forEach(input => {
      input.addEventListener('input', () => {
        input.value = String(input.value || '').replace(/\D/g, '').slice(0, 6);
      });
    });

    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.closest('[data-ckp-close-pin]')) closePinModal();
    });
    modal.querySelector('#ckpPinForm')?.addEventListener('submit', saveApprovalPin);
    modal.querySelector('#ckpTestPinButton')?.addEventListener('click', testCurrentApprovalPin);
    return modal;
  }

  async function openPinModal() {
    closeMenu();
    const modal = ensurePinModal();
    const form = modal.querySelector('#ckpPinForm');
    const saveMsg = modal.querySelector('#ckpPinSaveMessage');
    const verifyMsg = modal.querySelector('#ckpPinVerifyMessage');
    const testInput = modal.querySelector('#ckpTestPin');

    form?.reset();
    if (testInput) testInput.value = '';
    if (saveMsg) { saveMsg.textContent = ''; saveMsg.className = 'ckp-form-message ckp-pin-result'; }
    if (verifyMsg) { verifyMsg.textContent = ''; verifyMsg.className = 'ckp-form-message ckp-pin-result'; }

    setPinStatus(null);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    try {
      const response = await window.CafeAuth.apiFetch(
        `${window.CafeAuth.API_ORIGIN}/api/auth/approval-pin`,
        { cache: 'no-store' }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to read PIN status.');
      }
      setPinStatus(Boolean(data.hasPin));
    } catch (error) {
      const status = modal.querySelector('#ckpPinStatus');
      const title = modal.querySelector('#ckpPinStatusTitle');
      const detail = modal.querySelector('#ckpPinStatusDetail');
      if (status) {
        status.classList.remove('is-set', 'is-empty');
        status.classList.add('is-error');
      }
      if (title) title.textContent = 'Unable to check PIN status';
      if (detail) detail.textContent = error.message || 'Try again in a moment.';
      const submit = form?.querySelector('button[type="submit"]');
      if (submit) submit.textContent = 'Save / Replace PIN';
    }

    setTimeout(() => form?.querySelector('input')?.focus(), 30);
  }

  function closePinModal() {
    const modal = document.getElementById('ckpPinModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
  }

  async function testCurrentApprovalPin() {
    const input = document.getElementById('ckpTestPin');
    const msg = document.getElementById('ckpPinVerifyMessage');
    const btn = document.getElementById('ckpTestPinButton');
    const pin = String(input?.value || '').trim();

    if (!/^\d{4,6}$/.test(pin)) {
      if (msg) {
        msg.textContent = 'Enter your current 4–6 digit approval PIN.';
        msg.className = 'ckp-form-message ckp-pin-result error';
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Verifying…';
    }
    if (msg) {
      msg.textContent = '';
      msg.className = 'ckp-form-message ckp-pin-result';
    }

    try {
      const response = await window.CafeAuth.apiFetch(
        `${window.CafeAuth.API_ORIGIN}/api/auth/approval-pin/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin, scope: 'self' })
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'That PIN does not match the saved approval PIN.');
      }

      if (msg) {
        msg.textContent = 'Correct — this matches your saved approval PIN.';
        msg.className = 'ckp-form-message ckp-pin-result success';
      }
    } catch (error) {
      if (msg) {
        msg.textContent = error.message || 'That PIN does not match the saved approval PIN.';
        msg.className = 'ckp-form-message ckp-pin-result error';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Verify PIN';
      }
    }
  }

  async function saveApprovalPin(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const msg = document.getElementById('ckpPinSaveMessage');
    const fd = new FormData(form);
    const pin = String(fd.get('pin') || '').trim();
    const confirmPin = String(fd.get('confirmPin') || '').trim();

    if (!/^\d{4,6}$/.test(pin)) {
      if (msg) {
        msg.textContent = 'Use numbers only: enter a 4–6 digit PIN.';
        msg.className = 'ckp-form-message ckp-pin-result error';
      }
      return;
    }

    if (pin !== confirmPin) {
      if (msg) {
        msg.textContent = 'The confirmation PIN does not match the new PIN.';
        msg.className = 'ckp-form-message ckp-pin-result error';
      }
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const originalLabel = btn?.textContent || 'Save PIN';
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Saving…';
    }
    if (msg) {
      msg.textContent = '';
      msg.className = 'ckp-form-message ckp-pin-result';
    }

    try {
      const response = await window.CafeAuth.apiFetch(
        `${window.CafeAuth.API_ORIGIN}/api/auth/approval-pin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin, confirmPin })
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        const saveError = new Error(data.message || 'Unable to save PIN.');
        saveError.code = data.code || '';
        throw saveError;
      }

      setPinStatus(true);
      if (msg) {
        msg.textContent = 'Approval PIN saved successfully.';
        msg.className = 'ckp-form-message ckp-pin-result success';
      }
      form.reset();
    } catch (error) {
      /*
       * A response can be lost after MySQL commits (mobile connection drop,
       * proxy reset, etc.). Do one authoritative database verification before
       * reporting a failed save.
       */
      let confirmedInDatabase = false;

      try {
        const verifyResponse = await window.CafeAuth.apiFetch(
          `${window.CafeAuth.API_ORIGIN}/api/auth/approval-pin/verify`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin, scope: 'self' })
          }
        );
        const verifyData = await verifyResponse.json().catch(() => ({}));
        confirmedInDatabase = Boolean(verifyResponse.ok && verifyData.success);
      } catch (_verifyError) {}

      if (confirmedInDatabase) {
        setPinStatus(true);
        if (msg) {
          msg.textContent = 'Approval PIN saved successfully.';
          msg.className = 'ckp-form-message ckp-pin-result success';
        }
        form.reset();
      } else if (msg) {
        const suffix = error?.code ? ` (${error.code})` : '';
        msg.textContent = `${error.message || 'Unable to save PIN.'}${suffix}`;
        msg.className = 'ckp-form-message ckp-pin-result error';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        const hasPin = document.getElementById('ckpPinStatus')?.classList.contains('is-set');
        btn.textContent = hasPin ? 'Replace PIN' : originalLabel;
      }
    }
  }

  async function logout() {
    closeMenu();
    const roleName = area() === 'admin' ? 'Administrator' : area() === 'manager' ? 'Manager' : 'Staff';
    const confirmed = window.CafeMessageDialog?.confirm
      ? await window.CafeMessageDialog.confirm(
          `Are you sure you want to log out of your ${roleName} account?`,
          {
            title: 'Confirm Log Out',
            type: 'warning',
            cancelText: 'Cancel',
            confirmText: 'Log Out',
            danger: true
          }
        )
      : window.confirm('Are you sure you want to log out of CafeKiosk?');
    if (!confirmed) return;

    if (window.CafeAuth?.logout) {
      await window.CafeAuth.logout();
      return;
    }

    // Fallback for a page that somehow loaded without auth-session.js.
    const currentArea = area();
    if (currentArea === 'admin') {
      localStorage.removeItem('cafeAdminAuthToken');
      localStorage.removeItem('cafeAdminSession');
      location.href = '/admin-login';
    } else if (currentArea === 'manager') {
      localStorage.removeItem('cafeManagerAuthToken');
      localStorage.removeItem('cafeManagerSession');
      location.href = '/manager-login';
    } else {
      localStorage.removeItem('cafeStaffAuthToken');
      localStorage.removeItem('cafeStaffSession');
      location.href = '/staff-login';
    }
  }

  function menuMarkup() {
    const p = currentProfile();
    const shortcut = area() === 'admin'
      ? `<button type="button" class="ckp-menu-item" data-ckp-action="workspace">${SETTINGS_ICON}<span><strong>Settings</strong><small>Store and system preferences</small></span></button>`
      : `<button type="button" class="ckp-menu-item" data-ckp-action="staff-dashboard">${DASHBOARD_ICON}<span><strong>My Dashboard</strong><small>View your shift and order overview</small></span></button>
         <button type="button" class="ckp-menu-item" data-ckp-action="workspace">${QUEUE_ICON}<span><strong>Order Queue</strong><small>View and manage live orders</small></span></button>`;

    return `
      <div class="ckp-menu-head">
        <span class="ckp-menu-avatar">${PERSON_ICON}</span>
        <div><strong data-ckp-name>${esc(p.displayName)}</strong><small data-ckp-role>${esc(roleLabel(p.role))}</small></div>
      </div>
      <div class="ckp-session-row"><span class="ckp-session-status"><i></i> Active</span><span data-ckp-session>${esc(sessionDuration(p.loginAt))}</span></div>
      <div class="ckp-menu-divider"></div>
      <button type="button" class="ckp-menu-item" data-ckp-action="profile">${PROFILE_ICON}<span><strong>My Profile</strong><small>Account and cafe details</small></span></button>
      ${isCafeOwner() ? `<button type="button" class="ckp-menu-item" data-ckp-action="user-id">${PROFILE_ICON}<span><strong>Change User ID</strong><small>Update Owner login ID</small></span></button>` : ''}
      <button type="button" class="ckp-menu-item" data-ckp-action="password">${LOCK_ICON}<span><strong>Change Password</strong><small>Update account security</small></span></button>
      ${canManageApprovalPin() ? `<button type="button" class="ckp-menu-item" data-ckp-action="approval-pin">${PIN_ICON}<span><strong>Approval PIN</strong><small>Set PIN for Staff refund / void approval</small></span></button>` : ''}
      ${shortcut}
      <div class="ckp-menu-divider"></div>
      <button type="button" class="ckp-menu-item danger" data-ckp-action="logout">${LOGOUT_ICON}<span><strong>Log Out</strong><small>End this ${area() === 'admin' ? 'admin' : area() === 'manager' ? 'manager' : 'staff'} session</small></span></button>`;
  }

  function enhanceCard(card) {
    // If the shared header has not been created yet, keep waiting instead of
    // falsely reporting success. This fixes the intermittent dropdown race.
    if (!card) return false;

    const existingShell = card.closest('.ckp-profile-shell');
    if (existingShell) {
      menuShell = existingShell;
      return true;
    }

    const shell = document.createElement('div');
    shell.className = 'ckp-profile-shell';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = `${card.className} ckp-trigger`;
    trigger.innerHTML = card.innerHTML;
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-label', 'Open account menu');

    const menu = document.createElement('div');
    menu.className = 'ckp-menu';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = menuMarkup();

    card.replaceWith(shell);
    shell.append(trigger, menu);
    menuShell = shell;

    menu.addEventListener('click', event => {
      const actionButton = event.target.closest('[data-ckp-action]');
      if (!actionButton) return;
      const action = actionButton.dataset.ckpAction;
      if (action === 'profile') openProfileModal();
      if (action === 'password') openPasswordModal();
      if (action === 'user-id') openUserIdModal();
      if (action === 'approval-pin') openPinModal();
      if (action === 'staff-dashboard') location.href = area() === 'manager' ? (location.port === '5000' ? '/manager-dashboard' : '/manager-dashboard') : pathToStaffDashboard();
      if (action === 'workspace') location.href = area() === 'admin' ? pathToAdminSettings() : area() === 'manager' ? pathToOrderQueue() : pathToOrderQueue();
      if (action === 'logout') logout();
    });

    renderProfileEverywhere();
    refreshProfile();
    return true;
  }

  function install() {
    if (!area()) return;

    const bindProfiles = () => {
      let bound = false;
      document.querySelectorAll('.cku-topbar .cku-profile-card').forEach(card => {
        if (card.classList.contains('ckp-trigger')) {
          menuShell = card.closest('.ckp-profile-shell') || menuShell;
          bound = true;
          return;
        }
        if (enhanceCard(card)) bound = true;
      });
      return bound;
    };

    bindProfiles();

    // Keep watching for a rebuilt shared header. The responsive shell can be
    // regenerated by page/layout scripts, so a one-time listener is not enough.
    observer?.disconnect();
    observer = new MutationObserver(() => { bindProfiles(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  // Delegated profile click handling survives header/profile-card replacement.
  document.addEventListener('click', event => {
    const profileCard = event.target.closest('.cku-profile-card');
    if (profileCard && area()) {
      event.preventDefault();
      event.stopPropagation();

      if (!profileCard.classList.contains('ckp-trigger')) {
        enhanceCard(profileCard);
      }

      const activeTrigger = event.target.closest('.ckp-trigger')
        || document.querySelector('.cku-topbar .ckp-trigger');
      const shell = activeTrigger?.closest('.ckp-profile-shell');
      if (shell) {
        menuShell = shell;
        document.body.classList.remove('cku-mobile-nav-open');
        toggleMenu();
      }
      return;
    }

    if (menuShell && !menuShell.contains(event.target)) closeMenu();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenu();
      closeProfileModal();
      closePasswordModal();
      closeUserIdModal();
      closePinModal();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();
