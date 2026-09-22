<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Report & Analytics</title>
  <link rel="stylesheet" href="../Assets/css/report.css">
<link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
</head>
<body class="uniform-admin">
  <div class="menu-shell">
    <aside class="staff-sidebar">
      <a class="brand" href="../Admin/dashboard.php" aria-label="CafeKiosk Admin">
        <img src="../Assets/images/logo.png" alt="CafeKiosk Logo">
      </a>

      <div class="staff-label">ADMIN</div>

      <nav class="staff-nav" aria-label="Admin navigation">
        <a class="staff-nav-link" href="../Admin/dashboard.php">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
          <span>Dashboard</span>
        </a>
        <a class="staff-nav-link" href="/admin/order-monitor">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span>
          <span>Order</span>
        </a>
        <a class="staff-nav-link" href="../Admin/menu-management.php">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h11l5 5v13H3z"/><path d="M14 3v5h5"/><path d="M7 12h8M7 16h8"/></svg></span>
          <span>Menu Management</span>
        </a>
        <a class="staff-nav-link" href="../Admin/promotions-discount.php">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></span>
          <span>Promotions &amp; Discount</span>
        </a>
        <a class="staff-nav-link" href="../Admin/inventory.php">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg></span>
          <span>Inventory</span>
        </a>
        <a class="staff-nav-link active" href="../Admin/report.php" aria-current="page">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M8 17v-3M13 17V8M18 17V5"/></svg></span>
          <span>Report</span>
        </a>
        <a class="staff-nav-link" href="../Admin/audit-logs.php">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 2h6a2 2 0 0 1 2 2v1H7V4a2 2 0 0 1 2-2z"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 11h8M8 15h5"/></svg></span>
          <span>Audit Logs</span>
        </a>
        <a class="staff-nav-link" href="../Admin/user.php">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg></span>
          <span>User</span>
        </a>
        <a class="staff-nav-link" href="../Admin/settings.php">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></span>
          <span>Settings</span>
        </a>
      </nav>
    </aside>

    <main class="page-main">
      <header class="page-topbar">
        <div class="page-heading-card">
          <div>
            <span class="page-kicker">ADMIN ANALYTICS</span>
            <h1>Report &amp; Analytics</h1>
          </div>
        </div>
        <div class="admin-profile-card">
          <div class="admin-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5Zm0 2c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6Z"/></svg>
          </div>
          <div class="admin-copy">
            <strong id="adminName">Admin's Name</strong>
            <small>Administrator</small>
          </div>
          <button class="admin-caret" type="button" aria-label="Open admin menu">⌄</button>
        </div>
      </header>

      <section class="report-toolbar panel-card">
        <div class="date-filters">
          <label class="field"><span>From</span><input type="date" id="fromDate"></label>
          <label class="field"><span>To</span><input type="date" id="toDate"></label>
          <button class="primary-action" id="applyFilterBtn" type="button">Apply Filter</button>
          <button class="text-action" id="todayBtn" type="button">Today</button>
          <button class="text-action" id="last7Btn" type="button">Last 7 Days</button>
          <button class="text-action" id="last30Btn" type="button">Last 30 Days</button>
        </div>
        <div class="report-actions">
          <button class="text-action" id="printBtn" type="button">Print</button>
          <button class="text-action" id="exportBtn" type="button">Export CSV</button>
        </div>
      </section>

      <section class="metric-grid">
        <article class="metric-card panel-card"><span>Completed Sales</span><strong id="totalSales">—</strong><small id="salesRangeLabel">Selected range</small></article>
        <article class="metric-card panel-card"><span>Total Orders</span><strong id="totalOrders">—</strong><small>POS + Kiosk orders</small></article>
        <article class="metric-card panel-card"><span>Average Order Value</span><strong id="avgOrderValue">—</strong><small>Completed orders</small></article>
        <article class="metric-card panel-card"><span>Top Product</span><strong id="topProduct">—</strong><small id="topProductQty">No sales yet</small></article>
      </section>

      <section class="report-grid">
        <article class="chart-panel panel-card">
          <div class="section-head"><div><h2>Sales Overview</h2><p>Completed-order revenue across the selected date range.</p></div><span class="live-label" id="reportStatus">Loading...</span></div>
          <div class="chart-wrap"><canvas id="salesChart"></canvas></div>
          <div class="chart-legend"><span><i class="bar-key"></i>Orders</span><span><i class="line-key"></i>Revenue</span></div>
        </article>

        <article class="history-panel panel-card">
          <div class="section-head"><div><h2>Transaction History</h2><p>Latest transactions in the selected range.</p></div></div>
          <div class="transaction-list scroll-area" id="transactionList"><div class="empty-state">Loading transactions...</div></div>
        </article>
      </section>

      <section class="analytics-panel panel-card">
        <div class="section-head"><div><h2>Analytics Breakdown</h2><p>Actual order data grouped by source, status and payment method.</p></div></div>
        <div class="analytics-grid">
          <div class="analytics-box"><h3>Order Sources</h3><div id="sourceBreakdown"></div></div>
          <div class="analytics-box"><h3>Order Status</h3><div id="statusBreakdown"></div></div>
          <div class="analytics-box"><h3>Payment Methods</h3><div id="paymentBreakdown"></div></div>
          <div class="analytics-box"><h3>Top Products</h3><div id="productBreakdown"></div></div>
        </div>
      </section>

      <div class="page-message" id="reportMessage" hidden></div>
    </main>
  </div>
  <script src="../Assets/js/auth-session.js"></script>
  <script src="../Assets/js/report.js"></script>
<script src="../Assets/js/report-products.js"></script>
  <script src="../Assets/js/uniform-theme.js?v=33"></script>
  <script src="../Assets/js/profile-menu.js?v=31"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
