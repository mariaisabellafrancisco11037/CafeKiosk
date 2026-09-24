<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Manager Dashboard</title>
  <link rel="stylesheet" href="../Assets/css/order-queue.css?v=6">
  <link rel="stylesheet" href="../Assets/css/staff-dashboard.css?v=19">
  <link rel="stylesheet" href="../Assets/css/manager-dashboard.css?v=1">
  <link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="../Assets/css/manager-sidebar-icons.css?v=2">
  <link rel="stylesheet" href="/Assets/css/pos-navbar-fix.css?v=pos-navbar-v3">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>
<body class="uniform-pos staff-dashboard-page manager-dashboard-page">
  <div class="queue-app staff-dashboard-shell manager-dashboard-shell">
    <aside class="sidebar manager-sidebar manager-sidebar-icons">
      <div class="logo"><img src="../Assets/images/logo.png" alt="CafeKiosk Logo"></div>
      <div class="manager-sidebar-cafe-name" data-cafe-identity>Current Cafe</div>
      <nav class="staff-navigation" aria-label="Manager navigation">
        <a href="/manager-dashboard" class="staff-nav-button active" aria-current="page" aria-label="Dashboard" title="Dashboard"><span class="staff-nav-icon" aria-hidden="true">▦</span><span class="manager-nav-label">Dashboard</span></a>
        <a href="/manager-pos" class="staff-nav-button" aria-label="POS" title="POS"><span class="staff-nav-icon" aria-hidden="true">☕</span><span class="manager-nav-label">POS</span></a>
        <a href="/manager-order-queue" class="staff-nav-button" aria-label="Order Queue" title="Order Queue"><span class="staff-nav-icon" aria-hidden="true">☷</span><span class="manager-nav-label">Order Queue</span></a>
      </nav>
    </aside>

    <main class="staff-dashboard-main manager-dashboard-main">
      <section class="staff-welcome-card manager-welcome-card">
        <div class="staff-welcome-copy">
          <span class="staff-overline">OPERATIONS CONTROL</span>
          <h2>Good day, <span id="staffDashboardName">Manager</span>.</h2>
          <p>Monitor the cafe floor, review sales and stock alerts, and step into POS operations when needed.</p>
        </div>
        <div class="staff-live-block">
          <span class="staff-live-pill"><i></i> Manager session</span>
          <strong id="staffDashboardClock">--:--</strong>
          <small id="staffDashboardDate">Loading date…</small>
        </div>
      </section>

      <section class="manager-role-strip" aria-label="Manager permissions">
        <div><strong>Higher than Staff</strong><span>Cafe-wide operational visibility</span></div>
        <div><strong>POS Access</strong><span>Take orders and manage the live queue</span></div>
        <div><strong>Protected Admin Areas</strong><span>Users, settings, audit logs and owner controls remain Admin-only</span></div>
      </section>

      <section class="staff-metric-grid" aria-label="Manager operations summary">
        <article class="staff-metric-card"><div class="staff-metric-icon">▤</div><div><span>My POS Orders Today</span><strong id="myOrdersToday">0</strong><small>Orders created using your Manager account</small></div></article>
        <article class="staff-metric-card"><div class="staff-metric-icon">₱</div><div><span>My POS Sales Today</span><strong id="mySalesToday">₱0.00</strong><small>Value of orders created by you</small></div></article>
        <article class="staff-metric-card"><div class="staff-metric-icon">✓</div><div><span>Completed By Me</span><strong id="completedByMe">0</strong><small>Orders you marked completed today</small></div></article>
        <article class="staff-metric-card accent"><div class="staff-metric-icon">●</div><div><span>Active Cafe Queue</span><strong id="activeQueueCount">0</strong><small>Pending, preparing and ready orders</small></div></article>
      </section>

      <section class="staff-dashboard-grid">
        <article class="staff-panel queue-overview-panel">
          <div class="staff-panel-head"><div><span class="staff-panel-kicker">LIVE OPERATIONS</span><h3>Cafe Order Queue</h3></div><a class="staff-text-link" href="/manager-order-queue">Manage Queue →</a></div>
          <div class="staff-status-grid">
            <div class="staff-status-card pending"><span>Pending</span><strong id="pendingOrders">0</strong></div>
            <div class="staff-status-card preparing"><span>Preparing</span><strong id="preparingOrders">0</strong></div>
            <div class="staff-status-card ready"><span>Ready</span><strong id="readyOrders">0</strong></div>
            <div class="staff-status-card completed"><span>Completed Today</span><strong id="completedOrders">0</strong></div>
          </div>
        </article>

        <article class="staff-panel quick-actions-panel">
          <div class="staff-panel-head"><div><span class="staff-panel-kicker">MANAGER TOOLS</span><h3>Quick Actions</h3></div></div>
          <div class="staff-quick-actions">
            <a href="/manager-pos" class="staff-action primary"><span class="staff-action-icon">＋</span><div><strong>Open POS</strong><small>Take over or assist with customer orders</small></div></a>
            <a href="/manager-order-queue" class="staff-action"><span class="staff-action-icon">☷</span><div><strong>Manage Order Queue</strong><small>Review and update live order statuses</small></div></a>
            <button type="button" class="staff-action" id="refreshStaffDashboard"><span class="staff-action-icon">↻</span><div><strong>Refresh Operations</strong><small>Reload the latest MySQL values</small></div></button>
          </div>
        </article>
      </section>

      <section class="staff-dashboard-grid lower-grid">
        <article class="staff-panel recent-orders-panel">
          <div class="staff-panel-head"><div><span class="staff-panel-kicker">MY ACTIVITY</span><h3>My Recent POS Orders</h3></div><span class="staff-panel-note" id="trackingNote">Tracked from your Manager account</span></div>
          <div class="staff-table-wrap">
            <table class="staff-orders-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Time</th></tr></thead>
              <tbody id="staffRecentOrders"><tr><td colspan="6" class="staff-empty-cell">Loading your recent orders…</td></tr></tbody>
            </table>
          </div>
        </article>

        <article class="staff-panel stock-alerts-panel">
          <div class="staff-panel-head"><div><span class="staff-panel-kicker">MANAGER AWARENESS</span><h3>Stock Alerts</h3></div><span class="staff-alert-count" id="stockAlertCount">0</span></div>
          <div id="staffStockAlerts" class="staff-stock-list"><div class="staff-empty-state">Loading stock alerts…</div></div>
        </article>
      </section>

      <section class="staff-panel shop-activity-panel">
        <div class="staff-panel-head"><div><span class="staff-panel-kicker">CAFE-WIDE ACTIVITY</span><h3>Latest Orders</h3></div><div class="staff-shop-summary"><span>Completed Sales Today</span><strong id="shopSalesToday">₱0.00</strong></div></div>
        <div id="latestShopOrders" class="staff-latest-orders"><div class="staff-empty-state">Loading latest orders…</div></div>
      </section>

      <div class="staff-dashboard-message" id="staffDashboardMessage" aria-live="polite"></div>
    </main>
  </div>
  <script src="../Assets/js/auth-session.js?v=manager1"></script>
  <script src="../Assets/js/manager-dashboard.js?v=manager-realtime-v3"></script>
  <script src="../Assets/js/uniform-theme.js?v=33"></script>
  <script src="../Assets/js/profile-menu.js?v=logout-confirm-v2"></script>
  <script src="../Assets/js/live-presence.js?v=manager-realtime-v3"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>
