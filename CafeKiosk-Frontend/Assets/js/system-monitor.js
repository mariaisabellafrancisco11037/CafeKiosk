(function () {
  const state = {
    cafes: [],
    approvals: [],
    issues: [],
    loading: false,
    autoRefreshId: null
  };

  const el = (id) => document.getElementById(id);

  function apiOrigin() {
    if (window.CAFEKIOSK_API_ORIGIN) return String(window.CAFEKIOSK_API_ORIGIN).replace(/\/$/, '');
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      const port = location.port;
      if (!port || port === '80' || port === '443' || port === '5000') return location.origin;
      return `${location.protocol}//${location.hostname}:5000`;
    }
    return 'http://127.0.0.1:5000';
  }

  function backendUrl(path) {
    return new URL(path, `${apiOrigin()}/`).href;
  }

  function goToSystemLogin() {
    window.location.href = backendUrl('/system-admin-login');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    if (!value) return 'No activity yet';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return new Intl.DateTimeFormat('en-PH', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  }

  function formatUptime(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    const days = Math.floor(total / 86400);
    const hours = Math.floor((total % 86400) / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function statusClass(status) {
    const key = String(status || '').toLowerCase();
    if (key === 'online') return 'status-online';
    if (key === 'warning') return 'status-warning';
    if (key === 'inactive') return 'status-inactive';
    return 'status-offline';
  }

  function setIndicator(id, online) {
    const indicator = el(id);
    if (!indicator) return;
    indicator.classList.remove('online', 'offline');
    indicator.classList.add(online ? 'online' : 'offline');
  }

  function renderSummary(data) {
    el('totalCafes').textContent = Number(data.summary?.totalCafes || 0);
    if (el('pendingApprovals')) el('pendingApprovals').textContent = Number(data.summary?.pendingApprovals || 0);
    el('onlineCafes').textContent = Number(data.summary?.onlineCafes || 0);
    el('needsAttention').textContent = Number(data.summary?.needsAttention || 0);
    el('activeConnections').textContent = Number(data.summary?.activeConnections || 0);

    const backendOnline = data.system?.backend === 'Online';
    const databaseOnline = data.system?.database === 'Online';
    const websocketOnline = data.system?.websocket === 'Online';

    el('backendStatus').textContent = data.system?.backend || 'Unknown';
    el('databaseStatus').textContent = data.system?.database || 'Unknown';
    el('websocketStatus').textContent = data.system?.websocket || 'Unknown';
    setIndicator('backendIndicator', backendOnline);
    setIndicator('databaseIndicator', databaseOnline);
    setIndicator('websocketIndicator', websocketOnline);

    el('uptimeText').textContent = `Uptime ${formatUptime(data.system?.uptimeSeconds)}`;
    const dbInfo = data.system?.databaseInfo || {};
    el('databaseMeta').textContent = databaseOnline
      ? `${dbInfo.databaseName || 'MySQL'}${dbInfo.version ? ` • ${dbInfo.version}` : ''}`
      : `${dbInfo.databaseName || 'MySQL'} unavailable`;

    const serverDot = el('serverDot');
    serverDot?.classList.remove('online', 'offline', 'syncing');
    serverDot?.classList.add(backendOnline && databaseOnline ? 'online' : 'offline');
    el('serverLabel').textContent = backendOnline && databaseOnline ? 'System Online' : 'Needs Attention';

    el('lastUpdated').textContent = `Updated ${formatDate(data.generatedAt)}`;
  }

  function mainIssue(cafe) {
    const important = (cafe.issues || []).find((issue) => issue.severity === 'high' || issue.severity === 'medium');
    const first = important || (cafe.issues || [])[0];
    return first?.message || 'No technical issue detected.';
  }

  function renderApprovals() {
    const body = el('approvalBody');
    if (!body) return;
    const approvals = Array.isArray(state.approvals) ? state.approvals : [];
    if (el('approvalCountPill')) el('approvalCountPill').textContent = `${approvals.length} pending`;
    if (!approvals.length) {
      body.innerHTML = '<tr><td colspan="6" class="monitor-empty">No cafe registrations are waiting for approval.</td></tr>';
      return;
    }
    body.innerHTML = approvals.map((row) => `
      <tr>
        <td class="cafe-name-cell"><strong>${escapeHtml(row.cafeName)}</strong><span>${escapeHtml(row.cafeId)}</span></td>
        <td class="owner-cell"><strong>${escapeHtml(row.ownerName || '—')}</strong><span>@${escapeHtml(row.ownerUsername || 'owner')}</span></td>
        <td class="owner-cell"><strong>${escapeHtml(row.ownerEmail || row.cafeEmail || '—')}</strong><span>${escapeHtml(row.ownerPhone || '')}</span></td>
        <td>${escapeHtml(formatDate(row.requestedAt || row.createdAt))}</td>
        <td><span class="approval-state">Pending Review</span></td>
        <td><div class="approval-actions"><button class="approve-account-btn" type="button" data-approve-cafe="${escapeHtml(row.cafeId)}">Approve</button><button class="reject-account-btn" type="button" data-reject-cafe="${escapeHtml(row.cafeId)}">Reject</button></div></td>
      </tr>`).join('');
  }

  async function loadApprovals() {
    try {
      const response = await fetch(backendUrl('/api/system-admin/approvals'), { credentials: 'include', cache: 'no-store' });
      if (response.status === 401) return goToSystemLogin();
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to load registrations.');
      state.approvals = Array.isArray(data.approvals) ? data.approvals : [];
      renderApprovals();
      if (el('pendingApprovals')) el('pendingApprovals').textContent = state.approvals.length;
    } catch (error) {
      if (el('approvalBody')) el('approvalBody').innerHTML = `<tr><td colspan="6" class="monitor-empty">${escapeHtml(error.message || 'Unable to load registrations.')}</td></tr>`;
    }
  }

  function openApprovalDecision(cafeId, action) {
    const row = state.approvals.find(item => String(item.cafeId) === String(cafeId));
    if (!row) return;
    const approving = action === 'approve';
    el('approvalCafeId').value = row.cafeId;
    el('approvalAction').value = action;
    el('approvalCafeName').textContent = row.cafeName || row.cafeId;
    el('approvalOwnerName').textContent = row.ownerName || 'Cafe owner';
    el('approvalOwnerEmail').textContent = row.ownerEmail || row.cafeEmail || '—';
    el('approvalDecisionTitle').textContent = approving ? 'Approve Cafe Account' : 'Reject Cafe Account';
    el('approvalDecisionMessage').textContent = approving
      ? 'Approving this registration activates the cafe owner account. The owner can then log in and invite staff or managers.'
      : 'Rejecting this registration keeps the cafe and owner account inactive. Provide a reason so the owner knows why access was not approved.';
    el('approvalReasonWrap').hidden = approving;
    el('approvalReason').value = '';
    el('approvalError').textContent = '';
    const button = el('confirmApprovalBtn');
    button.textContent = approving ? 'Approve Account' : 'Reject Account';
    button.classList.toggle('reject-mode', !approving);
    const modal = el('approvalDecisionModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => approving ? button.focus() : el('approvalReason')?.focus(), 50);
  }

  function closeApprovalDecision() {
    const modal = el('approvalDecisionModal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
  }

  async function confirmApprovalDecision() {
    const cafeId = String(el('approvalCafeId')?.value || '').trim();
    const action = String(el('approvalAction')?.value || '').trim();
    const reason = String(el('approvalReason')?.value || '').trim();
    const errorBox = el('approvalError');
    const button = el('confirmApprovalBtn');
    if (!cafeId || !['approve','reject'].includes(action)) return;
    if (action === 'reject' && reason.length < 5) {
      errorBox.textContent = 'Please enter a short reason for rejection.';
      return;
    }
    button.disabled = true;
    button.textContent = action === 'approve' ? 'Approving...' : 'Rejecting...';
    errorBox.textContent = '';
    try {
      const response = await fetch(backendUrl(`/api/system-admin/approvals/${encodeURIComponent(cafeId)}/${action}`), {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to update registration.');
      closeApprovalDecision();
      alert(data.message || 'Cafe registration updated.');
      await Promise.all([loadApprovals(), refreshOverview()]);
    } catch (error) {
      errorBox.textContent = error.message || 'Unable to update registration.';
    } finally {
      button.disabled = false;
      button.textContent = action === 'approve' ? 'Approve Account' : 'Reject Account';
    }
  }

  function renderCafeRows() {
    const body = el('cafeStatusBody');
    if (!body) return;

    const search = String(el('cafeSearchInput')?.value || '').trim().toLowerCase();
    const cafes = state.cafes.filter((cafe) => {
      if (!search) return true;
      return [cafe.cafeName, cafe.cafeId, cafe.ownerName, cafe.ownerUsername]
        .some((value) => String(value || '').toLowerCase().includes(search));
    });

    if (!cafes.length) {
      body.innerHTML = `<tr><td colspan="9" class="monitor-empty">${state.cafes.length ? 'No cafe matches your search.' : 'No registered cafes found.'}</td></tr>`;
      return;
    }

    body.innerHTML = cafes.map((cafe) => {
      const posOnline = Number(cafe.connections?.pos || 0) > 0;
      const kioskOnline = Boolean(cafe.kioskOnline);
      const kioskDeviceOnline = Boolean(cafe.kioskDeviceOnline || Number(cafe.connections?.kiosk || 0) > 0);
      const issueCount = Array.isArray(cafe.issues) ? cafe.issues.length : 0;
      return `
        <tr>
          <td class="cafe-name-cell"><strong>${escapeHtml(cafe.cafeName)}</strong><span>${escapeHtml(cafe.cafeId)}</span></td>
          <td class="owner-cell"><strong>${escapeHtml(cafe.ownerName || '—')}</strong><span>${escapeHtml(cafe.ownerUsername || 'Owner account')}</span></td>
          <td><span class="status-badge ${statusClass(cafe.overallStatus)}">${escapeHtml(cafe.overallStatus)}</span></td>
          <td><span class="device-badge ${posOnline ? 'device-online' : 'device-offline'}">${posOnline ? 'POS: Online' : 'POS: Offline'}</span></td>
          <td><span class="device-badge ${kioskOnline ? 'device-online' : 'device-offline'}" title="${kioskDeviceOnline ? 'Kiosk service online • live kiosk device connected' : kioskOnline ? 'Kiosk service online • waiting for a kiosk device connection' : 'Kiosk access is offline'}">${kioskOnline ? 'Kiosk: Online' : 'Kiosk: Offline'}</span></td>
          <td>${Number(cafe.connections?.total || 0)}</td>
          <td>${escapeHtml(formatDate(cafe.lastActivity))}</td>
          <td title="${escapeHtml(mainIssue(cafe))}"><span class="issue-badge ${issueCount ? '' : 'clear'}">${issueCount ? `${issueCount} check${issueCount === 1 ? '' : 's'}` : 'Clear'}</span></td>
          <td><div class="monitor-row-actions"><button class="view-status-btn" type="button" data-cafe-status="${escapeHtml(cafe.cafeId)}">View Status</button><button class="delete-account-btn" type="button" data-delete-cafe="${escapeHtml(cafe.cafeId)}">Delete Account</button></div></td>
        </tr>
      `;
    }).join('');
  }

  function renderIssues() {
    const list = el('issueList');
    if (!list) return;

    if (!state.issues.length) {
      list.innerHTML = '<div class="monitor-empty">No technical issues detected right now.</div>';
      return;
    }

    list.innerHTML = state.issues.map((issue) => `
      <article class="issue-row">
        <span class="issue-severity ${escapeHtml(issue.severity)}">${escapeHtml(issue.severity)}</span>
        <strong class="issue-cafe">${escapeHtml(issue.cafeName)}</strong>
        <span class="issue-message">${escapeHtml(issue.message)}</span>
        <span class="issue-time">${escapeHtml(formatDate(issue.lastActivity))}</span>
      </article>
    `).join('');
  }

  function openCafeStatus(cafeId) {
    const cafe = state.cafes.find((item) => String(item.cafeId) === String(cafeId));
    if (!cafe) return;

    el('statusModalTitle').textContent = cafe.cafeName;
    const issues = Array.isArray(cafe.issues) ? cafe.issues : [];
    el('statusModalContent').innerHTML = `
      <div class="status-detail-grid">
        <div class="status-detail-card"><span>Overall Status</span><strong>${escapeHtml(cafe.overallStatus)}</strong></div>
        <div class="status-detail-card"><span>Account Status</span><strong>${escapeHtml(cafe.accountStatus)}</strong></div>
        <div class="status-detail-card"><span>Registration Approval</span><strong>${escapeHtml(cafe.approvalStatus || 'Approved')}</strong></div>
        <div class="status-detail-card"><span>POS Connections</span><strong>${Number(cafe.connections?.pos || 0)}</strong></div>
        <div class="status-detail-card"><span>Kiosk Service</span><strong>${cafe.kioskOnline ? 'Online' : 'Offline'}</strong></div>
        <div class="status-detail-card"><span>Live Kiosk Devices</span><strong>${Number(cafe.connections?.kiosk || 0)}</strong></div>
        <div class="status-detail-card"><span>Admin Connections</span><strong>${Number(cafe.connections?.admin || 0)}</strong></div>
        <div class="status-detail-card"><span>Order Queue Connections</span><strong>${Number(cafe.connections?.orderQueue || 0)}</strong></div>
        <div class="status-detail-card"><span>Failed Logins (24h)</span><strong>${Number(cafe.failedLogins24h || 0)}</strong></div>
        <div class="status-detail-card"><span>Delayed Orders</span><strong>${Number(cafe.delayedOrders || 0)}</strong></div>
        <div class="status-detail-card"><span>Last Activity</span><strong>${escapeHtml(formatDate(cafe.lastActivity))}</strong></div>
        <div class="status-detail-card"><span>Owner</span><strong>${escapeHtml(cafe.ownerName || '—')}</strong></div>
      </div>
      <div class="status-modal-issues">
        <h3>Technical Checks</h3>
        ${issues.length
          ? `<ul>${issues.map((issue) => `<li>${escapeHtml(issue.message)}</li>`).join('')}</ul>`
          : '<p class="health-meta">No technical issue detected for this cafe.</p>'}
      </div>
    `;

    const modal = el('statusModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    const modal = el('statusModal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
  }


  function openDeleteModal(cafeId) {
    const cafe = state.cafes.find((item) => String(item.cafeId) === String(cafeId));
    if (!cafe) return;
    el('deleteCafeId').value = cafe.cafeId;
    el('deleteCafeName').textContent = cafe.cafeName;
    el('deleteOwnerName').textContent = cafe.ownerName || 'Owner account';
    el('deleteReason').value = '';
    el('deleteError').textContent = '';
    const modal = el('deleteAccountModal');
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(() => el('deleteReason')?.focus(), 50);
  }

  function closeDeleteModal() {
    const modal = el('deleteAccountModal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
  }

  async function confirmDeleteAccount() {
    const cafeId = String(el('deleteCafeId')?.value || '').trim();
    const reason = String(el('deleteReason')?.value || '').trim();
    const errorBox = el('deleteError');
    const button = el('confirmDeleteAccountBtn');

    if (reason.length < 8) {
      errorBox.textContent = 'Please enter a clear reason with at least 8 characters.';
      return;
    }

    button.disabled = true;
    button.textContent = 'Deleting...';
    errorBox.textContent = '';
    try {
      const response = await fetch(backendUrl(`/api/system-admin/cafes/${encodeURIComponent(cafeId)}`), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to delete account.');
      closeDeleteModal();
      closeApprovalDecision();
      alert(data.message || 'Cafe account deleted.');
      await refreshOverview();
      loadDeletionLog();
    } catch (error) {
      errorBox.textContent = error.message || 'Unable to delete account.';
    } finally {
      button.disabled = false;
      button.textContent = 'Permanently Delete Account';
    }
  }

  async function loadDeletionLog() {
    const body = el('deletionLogBody');
    if (!body) return;
    try {
      const response = await fetch(backendUrl('/api/system-admin/deletion-log'), { credentials: 'include', cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to load deletion history.');
      const rows = Array.isArray(data.deletions) ? data.deletions : [];
      body.innerHTML = rows.length ? rows.map((row) => `
        <tr>
          <td><strong>${escapeHtml(row.cafeName)}</strong><span>${escapeHtml(row.cafeId)}</span></td>
          <td><strong>${escapeHtml(row.ownerName || '—')}</strong><span>${escapeHtml(row.ownerUsername || '')}</span></td>
          <td>${escapeHtml(row.reason)}</td>
          <td>${escapeHtml(row.deletedBy || 'System Administrator')}</td>
          <td>${escapeHtml(formatDate(row.deletedAt))}</td>
        </tr>
      `).join('') : '<tr><td colspan="5" class="monitor-empty">No deleted cafe accounts.</td></tr>';
    } catch (error) {
      body.innerHTML = `<tr><td colspan="5" class="monitor-empty">${escapeHtml(error.message)}</td></tr>`;
    }
  }

  async function loadProfile() {
    try {
      const response = await fetch(backendUrl('/api/system-admin/me'), { credentials: 'include' });
      if (response.status === 401) {
        goToSystemLogin();
        return;
      }
      const data = await response.json();
      if (data.user?.displayName) el('systemAdminName').textContent = data.user.displayName;
    } catch (_) {}
  }

  async function refreshOverview() {
    if (state.loading) return;
    state.loading = true;

    const refreshButton = el('systemRefreshBtn');
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = 'Refreshing...';
    }

    try {
      const response = await fetch(backendUrl('/api/system-admin/overview'), {
        credentials: 'include',
        cache: 'no-store'
      });

      if (response.status === 401) {
        goToSystemLogin();
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to load monitor data.');

      state.cafes = Array.isArray(data.cafes) ? data.cafes : [];
      state.issues = Array.isArray(data.recentIssues) ? data.recentIssues : [];
      renderSummary(data);
      renderCafeRows();
      renderIssues();
    } catch (error) {
      const serverDot = el('serverDot');
      serverDot?.classList.remove('online', 'syncing');
      serverDot?.classList.add('offline');
      el('serverLabel').textContent = 'Monitor Unavailable';
      el('cafeStatusBody').innerHTML = `<tr><td colspan="9" class="monitor-empty">${escapeHtml(error.message || 'Unable to load system status.')}</td></tr>`;
      el('issueList').innerHTML = `<div class="monitor-empty">${escapeHtml(error.message || 'Unable to load system issues.')}</div>`;
    } finally {
      state.loading = false;
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = 'Refresh';
      }
    }
  }

  async function logout() {
    try {
      await fetch(backendUrl('/api/system-admin/logout'), {
        method: 'POST',
        credentials: 'include'
      });
    } catch (_) {}
    goToSystemLogin();
  }

  const profileButton = el('systemProfileButton');
  const profileMenu = el('systemProfileMenu');

  function closeProfileMenu() {
    if (!profileMenu || !profileButton) return;
    profileMenu.hidden = true;
    profileButton.setAttribute('aria-expanded', 'false');
  }

  profileButton?.addEventListener('click', (event) => {
    event.stopPropagation();
    const opening = profileMenu.hidden;
    profileMenu.hidden = !opening;
    profileButton.setAttribute('aria-expanded', String(opening));
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.system-profile-wrap')) closeProfileMenu();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeProfileMenu();
      closeModal();
      closeDeleteModal();
    }
  });

  document.addEventListener('click', (event) => {
    const logoutButton = event.target.closest('[data-system-logout]');
    if (logoutButton) {
      logout();
      return;
    }

    const statusButton = event.target.closest('[data-cafe-status]');
    if (statusButton) openCafeStatus(statusButton.dataset.cafeStatus);

    const deleteButton = event.target.closest('[data-delete-cafe]');
    if (deleteButton) openDeleteModal(deleteButton.dataset.deleteCafe);

    const approveButton = event.target.closest('[data-approve-cafe]');
    if (approveButton) openApprovalDecision(approveButton.dataset.approveCafe, 'approve');

    const rejectButton = event.target.closest('[data-reject-cafe]');
    if (rejectButton) openApprovalDecision(rejectButton.dataset.rejectCafe, 'reject');

    const scrollButton = event.target.closest('[data-scroll-target]');
    if (scrollButton) {
      document.getElementById(scrollButton.dataset.scrollTarget)?.scrollIntoView({ behavior: 'smooth' });
      closeProfileMenu();
    }
  });

  el('statusModalClose')?.addEventListener('click', closeModal);
  el('statusModal')?.addEventListener('click', (event) => {
    if (event.target === el('statusModal')) closeModal();
  });
  el('systemRefreshBtn')?.addEventListener('click', refreshOverview);
  el('profileRefreshBtn')?.addEventListener('click', () => {
    closeProfileMenu();
    refreshOverview();
  });
  el('cafeSearchInput')?.addEventListener('input', renderCafeRows);
  el('deleteAccountModalClose')?.addEventListener('click', closeDeleteModal);
  el('cancelDeleteAccountBtn')?.addEventListener('click', closeDeleteModal);
  el('confirmDeleteAccountBtn')?.addEventListener('click', confirmDeleteAccount);
  el('deleteAccountModal')?.addEventListener('click', (event) => { if (event.target === el('deleteAccountModal')) closeDeleteModal(); });
  el('approvalDecisionClose')?.addEventListener('click', closeApprovalDecision);
  el('cancelApprovalBtn')?.addEventListener('click', closeApprovalDecision);
  el('confirmApprovalBtn')?.addEventListener('click', confirmApprovalDecision);
  el('approvalDecisionModal')?.addEventListener('click', (event) => { if (event.target === el('approvalDecisionModal')) closeApprovalDecision(); });

  loadProfile();
  refreshOverview();
  loadApprovals();
  loadDeletionLog();
  state.autoRefreshId = window.setInterval(() => { refreshOverview(); loadApprovals(); }, 15000);
})();
