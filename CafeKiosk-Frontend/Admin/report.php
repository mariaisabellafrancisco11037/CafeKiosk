<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Report & Analytics</title>
  <link rel="stylesheet" href="../Assets/css/report.css?v=compact-print-v2">
<link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=20260928-mobile-v1">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
  <link rel="stylesheet" href="/Assets/css/admin-final-responsive.css?v=20260928-rootfix-v1">
</head>
<body class="uniform-admin">
  <div class="menu-shell">
    <aside class="staff-sidebar">
      <a class="brand" href="/admin/dashboard" aria-label="CafeKiosk Admin">
        <img src="../Assets/images/logo.png" alt="CafeKiosk Logo">
      </a>

      <div class="staff-label">ADMIN</div>

      <nav class="staff-nav" aria-label="Admin navigation">
        <a class="staff-nav-link" href="/admin/dashboard">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>
          <span>Dashboard</span>
        </a>
        <a class="staff-nav-link" href="/admin/order-monitor">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></span>
          <span>Order</span>
        </a>
        <a class="staff-nav-link" href="/admin/menu-management">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3h11l5 5v13H3z"/><path d="M14 3v5h5"/><path d="M7 12h8M7 16h8"/></svg></span>
          <span>Menu Management</span>
        </a>
        <a class="staff-nav-link" href="/admin/promotions">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg></span>
          <span>Promotions &amp; Discount</span>
        </a>
        <a class="staff-nav-link" href="/admin/inventory">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/></svg></span>
          <span>Inventory</span>
        </a>
        <a class="staff-nav-link active" href="/admin/report" aria-current="page">
          <span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M8 17v-3M13 17V8M18 17V5"/></svg></span>
          <span>Report</span>
        </a>
        <a class="staff-nav-link" href="/admin/settings">
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

      <div class="print-options-modal" id="printOptionsModal" aria-hidden="true">
        <div class="print-options-backdrop" data-close-print-options></div>
        <section class="print-options-dialog" role="dialog" aria-modal="true" aria-labelledby="printOptionsTitle">
          <div class="print-options-head">
            <div>
              <span class="page-kicker">TRANSACTION HISTORY</span>
              <h2 id="printOptionsTitle">Print Options</h2>
              <p>Choose whether to print one transaction or the complete transaction history for the selected date range.</p>
            </div>
            <button class="print-options-close" id="closePrintOptionsBtn" type="button" aria-label="Close print options">&times;</button>
          </div>

          <div class="print-choice-list">
            <label class="print-choice-card" data-print-choice-card="single">
              <input type="radio" name="transactionPrintMode" value="single" checked>
              <span class="print-choice-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h9l3 3v17H6z"/><path d="M15 2v4h4M9 11h6M9 15h6"/></svg>
              </span>
              <span class="print-choice-copy"><strong>Print One Transaction</strong><small>Print a single order with its complete transaction details.</small></span>
            </label>

            <div class="print-transaction-picker" id="printTransactionPicker">
              <label for="printTransactionSelect">Select transaction</label>
              <select id="printTransactionSelect"></select>
            </div>

            <label class="print-choice-card" data-print-choice-card="all">
              <input type="radio" name="transactionPrintMode" value="all">
              <span class="print-choice-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
              </span>
              <span class="print-choice-copy"><strong>Print Entire Transaction History</strong><small id="printAllDescription">Print every transaction in the selected date range.</small></span>
            </label>
          </div>

          <div class="print-options-actions">
            <button class="text-action" id="cancelPrintOptionsBtn" type="button">Cancel</button>
            <button class="primary-action print-confirm-action" id="confirmPrintBtn" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Print
            </button>
          </div>
        </section>
      </div>

      <div class="page-message" id="reportMessage" hidden></div>
    </main>
  </div>
  <script src="../Assets/js/auth-session.js"></script>
  <script src="../Assets/js/report.js?v=no-analytics-breakdown-v3"></script>
<script src="../Assets/js/report-products.js"></script>
  <script src="../Assets/js/uniform-theme.js?v=20260928-mobile-v1"></script>
  <script src="../Assets/js/profile-menu.js?v=logout-confirm-v2"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>
