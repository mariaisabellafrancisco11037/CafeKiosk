<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Audit Logs</title>
  <link rel="stylesheet" href="../Assets/css/audit-logs.css?v=10">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>
<body class="uniform-admin">
  <div class="menu-shell">
    <aside class="staff-sidebar">
      <a class="brand" href="/admin/dashboard" aria-label="CafeKiosk Admin">
        <img src="../Assets/images/logo.png" alt="CafeKiosk Logo">
      </a>
      <div class="staff-label">ADMIN</div>
      <nav class="staff-nav" aria-label="Admin navigation">
        <a class="staff-nav-link" href="/admin/dashboard"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span><span>Dashboard</span></a>
        <a class="staff-nav-link" href="/admin/order-monitor"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span><span>Order</span></a>
        <a class="staff-nav-link" href="/admin/menu-management"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h11l5 5v13H3z"/><path d="M14 3v5h5"/><path d="M7 12h8M7 16h8"/></svg></span><span>Menu Management</span></a>
        <a class="staff-nav-link" href="/admin/promotions"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></span><span>Promotions &amp; Discount</span></a>
        <a class="staff-nav-link" href="/admin/inventory"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg></span><span>Inventory</span></a>
        <a class="staff-nav-link" href="/admin/report"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M8 17v-3M13 17V8M18 17V5"/></svg></span><span>Report</span></a>
        <a class="staff-nav-link active" href="/admin/audit-logs" aria-current="page"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 2h6a2 2 0 0 1 2 2v1H7V4a2 2 0 0 1 2-2z"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 11h8M8 15h5"/></svg></span><span>Audit Logs</span></a>
        <a class="staff-nav-link" href="/admin/users"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg></span><span>User</span></a>
        <a class="staff-nav-link" href="/admin/settings"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></span><span>Settings</span></a>
      </nav>
    </aside>

    <main class="page-main">
      <header class="page-topbar">
        <div class="page-heading-card">
          <div>
            <span class="page-kicker">ADMIN SECURITY</span>
            <h1>Audit Logs</h1>
          </div>
        </div>
        <div class="admin-profile-card">
          <div class="admin-avatar" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5Zm0 2c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6Z"/></svg></div>
          <div class="admin-copy"><strong id="adminName">Admin's Name</strong><small>Administrator</small></div>
          <button class="admin-caret" type="button" aria-label="Open admin menu">⌄</button>
        </div>
      </header>

      <section class="panel-card audit-panel">
        <div class="section-head">
          <div>
            <span class="section-kicker">SYSTEM ACTIVITY</span>
            <h2>Audit Log History</h2>
            <p>Server-side record of important system activity.</p>
          </div>
          <button class="text-action" id="exportAuditBtn" type="button">Export CSV</button>
        </div>

        <div class="audit-toolbar">
          <label class="field"><span>User</span><select id="userFilter"><option value="">All Users</option></select></label>
          <label class="field"><span>Date Range</span><select id="dateFilter"><option value="1">Today</option><option value="7">Last 7 days</option><option value="30" selected>Last 30 days</option><option value="90">Last 90 days</option><option value="all">All Time</option></select></label>
          <label class="field"><span>Action</span><select id="actionFilter"><option value="">Any Action</option></select></label>
          <label class="search-field"><span>⌕</span><input id="searchInput" type="text" placeholder="Search details, route, user..."></label>
          <button class="primary-action" id="searchBtn" type="button">Search</button>
        </div>

        <div class="audit-table-wrap scroll-area">
          <table class="audit-table">
            <thead><tr><th>Date / Time</th><th>User</th><th>Role</th><th>Action</th><th>Details</th><th>Source</th></tr></thead>
            <tbody id="auditBody"><tr><td colspan="6" class="table-message">Loading audit logs...</td></tr></tbody>
          </table>
        </div>

        <div class="pagination" id="pagination"></div>
      </section>

      <div class="page-message" id="auditMessage" hidden></div>
    </main>
  </div>
  <script src="../Assets/js/auth-session.js"></script>
  <script src="../Assets/js/audit-logs.js"></script>
  <script src="../Assets/js/uniform-theme.js?v=33"></script>
  <script src="../Assets/js/profile-menu.js?v=31"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
