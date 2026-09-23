<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - System Monitor</title>
  <link rel="stylesheet" href="../Assets/css/dashboard.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/system-monitor.css?v=2">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
</head>
<body class="uniform-admin system-monitor-body">
  <div class="queue-shell">
    <aside class="staff-sidebar">
      <a class="brand" href="dashboard.php" aria-label="CafeKiosk System Monitor">
        <img src="../Assets/images/logo.png" alt="CafeKiosk Logo">
      </a>
      <div class="staff-label">SYSTEM ADMIN</div>
      <nav class="staff-nav" aria-label="System Administrator navigation">
        <a class="staff-nav-link active" href="#overview">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
          <span>Dashboard</span>
        </a>
        <a class="staff-nav-link" href="#approvals">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg></span>
          <span>Account Approval</span>
        </a>
        <a class="staff-nav-link" href="#cafes">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20V8l8-5 8 5v12"/><path d="M8 20v-6h8v6M3 20h18"/></svg></span>
          <span>Cafe Status</span>
        </a>
        <a class="staff-nav-link" href="#issues">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 18h.01"/></svg></span>
          <span>System Issues</span>
        </a>
      </nav>
      <div class="monitor-readonly-note"><strong>Platform control</strong><span>Review new cafe registrations, monitor technical status, and record reasons for rejected/deleted accounts.</span></div>
    </aside>

    <main class="monitor-main" id="overview">
      <header class="monitor-header dashboard-header">
        <div>
          <span class="eyebrow">PLATFORM HEALTH</span>
          <h1>System Monitoring</h1>
          <p>Review new cafe registrations, monitor live POS/Kiosk activity and technical issues, with controlled account access and deletion.</p>
        </div>
        <div class="header-actions">
          <div class="connection-pill" id="serverPill"><span class="connection-dot syncing" id="serverDot"></span><span id="serverLabel">Checking System...</span></div>
          <button class="refresh-btn" id="systemRefreshBtn" type="button">Refresh</button>
          <div class="system-profile-wrap">
            <button class="admin-profile system-profile-button" id="systemProfileButton" type="button" aria-haspopup="menu" aria-expanded="false">
              <div class="profile-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg></div>
              <div class="profile-copy"><strong id="systemAdminName">System Admin</strong><span>IT Monitor</span></div>
              <span class="profile-chevron" aria-hidden="true">⌄</span>
            </button>
            <div class="system-profile-menu" id="systemProfileMenu" role="menu" hidden>
              <button type="button" role="menuitem" data-scroll-target="overview">System Monitor</button>
              <button type="button" role="menuitem" id="profileRefreshBtn">Refresh Status</button>
              <div class="profile-menu-separator"></div>
              <button class="danger-menu-item" type="button" role="menuitem" data-system-logout>Log Out</button>
            </div>
          </div>
        </div>
      </header>

      <section class="status-cards dashboard-status-cards system-summary-cards" aria-label="System summary">
        <article class="status-card"><div><span class="card-kicker">REGISTERED</span><span class="card-label">Total Cafes</span></div><strong id="totalCafes">—</strong></article>
        <article class="status-card"><div><span class="card-kicker">APPROVAL</span><span class="card-label">Pending Accounts</span></div><strong id="pendingApprovals">—</strong></article>
        <article class="status-card"><div><span class="card-kicker">LIVE NOW</span><span class="card-label">Online Cafes</span></div><strong id="onlineCafes">—</strong></article>
        <article class="status-card"><div><span class="card-kicker">CHECK</span><span class="card-label">Needs Attention</span></div><strong id="needsAttention">—</strong></article>
        <article class="status-card"><div><span class="card-kicker">REALTIME</span><span class="card-label">Active Connections</span></div><strong id="activeConnections">—</strong></article>
      </section>

      <section class="system-health-grid" aria-label="Platform service status">
        <article class="monitor-panel compact-health-card"><span class="eyebrow">BACKEND</span><div class="health-line"><span class="health-indicator" id="backendIndicator"></span><strong id="backendStatus">Checking...</strong></div><span class="health-meta" id="uptimeText">Uptime —</span></article>
        <article class="monitor-panel compact-health-card"><span class="eyebrow">DATABASE</span><div class="health-line"><span class="health-indicator" id="databaseIndicator"></span><strong id="databaseStatus">Checking...</strong></div><span class="health-meta" id="databaseMeta">MySQL —</span></article>
        <article class="monitor-panel compact-health-card"><span class="eyebrow">WEBSOCKET</span><div class="health-line"><span class="health-indicator" id="websocketIndicator"></span><strong id="websocketStatus">Checking...</strong></div><span class="health-meta">POS / Kiosk realtime connection</span></article>
      </section>

      <section class="monitor-panel approval-panel" id="approvals">
        <div class="monitor-panel-header">
          <div><span class="eyebrow">NEW ACCOUNT CONTROL</span><h2>Cafe Registration Approval</h2><p>New cafe-owner registrations cannot sign in until the System Administrator approves them.</p></div>
          <span class="approval-count-pill" id="approvalCountPill">0 pending</span>
        </div>
        <div class="monitor-table-wrap">
          <table class="system-monitor-table approval-table">
            <thead><tr><th>Cafe</th><th>Owner</th><th>Contact</th><th>Requested</th><th>Status</th><th>Action</th></tr></thead>
            <tbody id="approvalBody"><tr><td colspan="6" class="monitor-empty">Loading pending registrations...</td></tr></tbody>
          </table>
        </div>
      </section>

      <section class="monitor-panel cafe-monitor-panel" id="cafes">
        <div class="monitor-panel-header">
          <div><span class="eyebrow">CAFE MONITORING</span><h2>Registered Cafe Status</h2><p>Technical indicators only. Sales totals, customer details and private cafe records are not shown here.</p></div>
          <div class="table-tools"><label class="monitor-search"><span class="sr-only">Search cafes</span><input id="cafeSearchInput" type="search" placeholder="Search cafe or owner"></label><span class="last-updated" id="lastUpdated">Not updated yet</span></div>
        </div>
        <div class="monitor-table-wrap">
          <table class="system-monitor-table">
            <thead><tr><th>Cafe</th><th>Owner</th><th>Overall</th><th>POS</th><th>Kiosk</th><th>Connections</th><th>Last Activity</th><th>Issue</th><th></th></tr></thead>
            <tbody id="cafeStatusBody"><tr><td colspan="9" class="monitor-empty">Loading cafe status...</td></tr></tbody>
          </table>
        </div>
      </section>


      <section class="monitor-panel deletion-log-panel" id="deletedAccounts">
        <div class="monitor-panel-header"><div><span class="eyebrow">ACCOUNT AUDIT</span><h2>Deleted Cafe Accounts</h2><p>Permanent account deletions are recorded here with the required reason.</p></div></div>
        <div class="monitor-table-wrap">
          <table class="system-monitor-table deletion-log-table">
            <thead><tr><th>Cafe</th><th>Deleted Owner</th><th>Reason</th><th>Deleted By</th><th>Date</th></tr></thead>
            <tbody id="deletionLogBody"><tr><td colspan="5" class="monitor-empty">Loading deletion history...</td></tr></tbody>
          </table>
        </div>
      </section>

      <section class="monitor-panel issues-panel" id="issues">
        <div class="monitor-panel-header"><div><span class="eyebrow">RECENT CHECKS</span><h2>System Issues</h2><p>Generated from connection status, delayed order processing and failed login activity.</p></div></div>
        <div class="issue-list" id="issueList"><div class="monitor-empty">Checking technical issues...</div></div>
      </section>
    </main>
  </div>

  <div class="status-modal-backdrop" id="statusModal" aria-hidden="true">
    <section class="status-modal-card" role="dialog" aria-modal="true" aria-labelledby="statusModalTitle">
      <button class="status-modal-close" id="statusModalClose" type="button" aria-label="Close">×</button>
      <span class="eyebrow">TECHNICAL STATUS</span>
      <h2 id="statusModalTitle">Cafe Status</h2>
      <div id="statusModalContent"></div>
    </section>
  </div>


  <div class="status-modal-backdrop" id="approvalDecisionModal" aria-hidden="true">
    <section class="status-modal-card approval-decision-card" role="dialog" aria-modal="true" aria-labelledby="approvalDecisionTitle">
      <button class="status-modal-close" id="approvalDecisionClose" type="button" aria-label="Close">×</button>
      <span class="eyebrow">NEW CAFE REGISTRATION</span>
      <h2 id="approvalDecisionTitle">Review Cafe Account</h2>
      <div class="delete-account-summary"><span>Cafe</span><strong id="approvalCafeName">—</strong><span>Owner</span><strong id="approvalOwnerName">—</strong><span>Email</span><strong id="approvalOwnerEmail">—</strong></div>
      <input type="hidden" id="approvalCafeId">
      <input type="hidden" id="approvalAction">
      <p class="approval-decision-message" id="approvalDecisionMessage"></p>
      <div id="approvalReasonWrap" hidden>
        <label class="delete-reason-label" for="approvalReason">Reason for rejection <strong>*</strong></label>
        <textarea id="approvalReason" rows="4" maxlength="1000" placeholder="Example: Registration details could not be verified."></textarea>
        <p class="delete-reason-help">This reason is shown if the cafe owner attempts to sign in.</p>
      </div>
      <div class="delete-error" id="approvalError" role="alert"></div>
      <div class="delete-modal-actions"><button type="button" class="cancel-delete-btn" id="cancelApprovalBtn">Cancel</button><button type="button" class="confirm-approval-btn" id="confirmApprovalBtn">Approve Account</button></div>
    </section>
  </div>

  <div class="status-modal-backdrop" id="deleteAccountModal" aria-hidden="true">
    <section class="status-modal-card delete-account-modal-card" role="dialog" aria-modal="true" aria-labelledby="deleteAccountModalTitle">
      <button class="status-modal-close" id="deleteAccountModalClose" type="button" aria-label="Close">×</button>
      <span class="eyebrow">PERMANENT ACCOUNT DELETION</span>
      <h2 id="deleteAccountModalTitle">Delete Cafe Account</h2>
      <p class="delete-warning">This permanently deletes the cafe account and its associated users, menu, orders, inventory, promotions, settings and other cafe records. This cannot be undone.</p>
      <div class="delete-account-summary"><span>Cafe</span><strong id="deleteCafeName">—</strong><span>Owner</span><strong id="deleteOwnerName">—</strong></div>
      <input type="hidden" id="deleteCafeId">
      <label class="delete-reason-label" for="deleteReason">Reason for deletion <strong>*</strong></label>
      <textarea id="deleteReason" rows="4" maxlength="1000" placeholder="Example: Cafe owner requested permanent account closure."></textarea>
      <p class="delete-reason-help">Required. This reason is preserved in the System Administrator deletion history even after the cafe data is removed.</p>
      <div class="delete-error" id="deleteError" role="alert"></div>
      <div class="delete-modal-actions"><button type="button" class="cancel-delete-btn" id="cancelDeleteAccountBtn">Cancel</button><button type="button" class="confirm-delete-btn" id="confirmDeleteAccountBtn">Permanently Delete Account</button></div>
    </section>
  </div>


  <script src="../Assets/js/system-monitor.js?v=5"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
