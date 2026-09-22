<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Staff Dashboard</title>
  <link rel="stylesheet" href="../Assets/css/order-queue.css?v=6">
  <link rel="stylesheet" href="../Assets/css/staff-dashboard.css?v=19">
  <link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
</head>
<body class="uniform-pos staff-dashboard-page">
  <div class="queue-app staff-dashboard-shell">
    <aside class="sidebar">
      <div class="logo"><img src="../Assets/images/logo.png" alt="CafeKiosk Logo"></div>
      <div class="staff-label">STAFF</div>
      <nav class="staff-navigation" aria-label="Staff navigation">
        <a href="/staff-dashboard" class="staff-nav-button active" aria-current="page"><span class="staff-nav-icon" aria-hidden="true">▦</span><span>Dashboard</span></a>
        <a href="/pos" class="staff-nav-button"><span class="staff-nav-icon" aria-hidden="true">☕</span><span>Menu</span></a>
        <a href="/order-queue" class="staff-nav-button"><span class="staff-nav-icon" aria-hidden="true">☷</span><span>Order Queue</span></a>
      </nav>
    </aside>

    <main class="staff-dashboard-main">
      <section class="staff-welcome-card">
        <div class="staff-welcome-copy">
          <span class="staff-overline">YOUR WORKSPACE</span>
          <h2>Good day, <span id="staffDashboardName">Staff</span>.</h2>
          <p>Here is your shift overview and the current CafeKiosk activity.</p>
        </div>
        <div class="staff-live-block">
          <span class="staff-live-pill"><i></i> Active session</span>
          <strong id="staffDashboardClock">--:--</strong>
          <small id="staffDashboardDate">Loading date…</small>
        </div>
      </section>

      <section class="staff-metric-grid" aria-label="Staff shift summary">
        <article class="staff-metric-card"><div class="staff-metric-icon">▤</div><div><span>My POS Orders Today</span><strong id="myOrdersToday">0</strong><small>Orders created from your staff account</small></div></article>
        <article class="staff-metric-card"><div class="staff-metric-icon">₱</div><div><span>My POS Sales Today</span><strong id="mySalesToday">₱0.00</strong><small>Value of orders created by you</small></div></article>
        <article class="staff-metric-card"><div class="staff-metric-icon">✓</div><div><span>Completed By Me</span><strong id="completedByMe">0</strong><small>Orders you marked completed today</small></div></article>
        <article class="staff-metric-card accent"><div class="staff-metric-icon">●</div><div><span>Active Queue</span><strong id="activeQueueCount">0</strong><small>Pending, preparing and ready</small></div></article>
      </section>

      <section class="staff-dashboard-grid">
        <article class="staff-panel queue-overview-panel">
          <div class="staff-panel-head"><div><span class="staff-panel-kicker">LIVE OPERATIONS</span><h3>Order Queue Overview</h3></div><a class="staff-text-link" href="/order-queue">Open Queue →</a></div>
          <div class="staff-status-grid">
            <div class="staff-status-card pending"><span>Pending</span><strong id="pendingOrders">0</strong></div>
            <div class="staff-status-card preparing"><span>Preparing</span><strong id="preparingOrders">0</strong></div>
            <div class="staff-status-card ready"><span>Ready</span><strong id="readyOrders">0</strong></div>
            <div class="staff-status-card completed"><span>Completed Today</span><strong id="completedOrders">0</strong></div>
          </div>
        </article>

        <article class="staff-panel quick-actions-panel">
          <div class="staff-panel-head"><div><span class="staff-panel-kicker">SHORTCUTS</span><h3>Quick Actions</h3></div></div>
          <div class="staff-quick-actions">
            <a href="/pos" class="staff-action primary"><span class="staff-action-icon">＋</span><div><strong>New POS Order</strong><small>Start taking a customer order</small></div></a>
            <a href="/order-queue" class="staff-action"><span class="staff-action-icon">☷</span><div><strong>Manage Queue</strong><small>Update live order statuses</small></div></a>
            <button type="button" class="staff-action" id="refreshStaffDashboard"><span class="staff-action-icon">↻</span><div><strong>Refresh Dashboard</strong><small>Reload the latest database values</small></div></button>
          </div>
        </article>
      </section>

      <section class="staff-dashboard-grid lower-grid">
        <article class="staff-panel recent-orders-panel">
          <div class="staff-panel-head"><div><span class="staff-panel-kicker">MY ACTIVITY</span><h3>My Recent POS Orders</h3></div><span class="staff-panel-note" id="trackingNote">Tracked from your account</span></div>
          <div class="staff-table-wrap">
            <table class="staff-orders-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th></tr></thead>
              <tbody id="staffRecentOrders"><tr><td colspan="6" class="staff-empty-cell">Loading your recent orders…</td></tr></tbody>
            </table>
          </div>
        </article>

        <article class="staff-panel stock-alerts-panel">
          <div class="staff-panel-head"><div><span class="staff-panel-kicker">INVENTORY AWARENESS</span><h3>Stock Alerts</h3></div><span class="staff-alert-count" id="stockAlertCount">0</span></div>
          <div id="staffStockAlerts" class="staff-stock-list"><div class="staff-empty-state">Loading stock alerts…</div></div>
        </article>
      </section>

      <section class="staff-panel shop-activity-panel">
        <div class="staff-panel-head"><div><span class="staff-panel-kicker">CAFE ACTIVITY</span><h3>Latest Orders</h3></div><div class="staff-shop-summary"><span>Completed Sales Today</span><strong id="shopSalesToday">₱0.00</strong></div></div>
        <div id="latestShopOrders" class="staff-latest-orders"><div class="staff-empty-state">Loading latest orders…</div></div>
      </section>
      <div class="staff-dashboard-message" id="staffDashboardMessage" aria-live="polite"></div>
    </main>
  </div>
  <script src="../Assets/js/auth-session.js"></script>
  <script src="../Assets/js/staff-dashboard.js?v=19"></script>
  <script src="../Assets/js/uniform-theme.js?v=33"></script>
  <script src="../Assets/js/profile-menu.js?v=31"></script>
  <script src="../Assets/js/live-presence.js?v=3"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
