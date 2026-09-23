<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Admin Dashboard</title>
  <link rel="stylesheet" href="../Assets/css/dashboard.css">
<link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>

<body class="uniform-admin">
  <div class="queue-shell">

    <!-- =====================================================
         ADMIN SIDEBAR
         Styled to match the current Order Monitor page.
    ====================================================== -->
    <aside class="staff-sidebar">
      <a class="brand" href="/admin/dashboard" aria-label="CafeKiosk Dashboard">
        <img src="../Assets/images/logo.png" alt="CafeKiosk Logo">
      </a>

      <div class="staff-label">ADMIN</div>

      <nav class="staff-nav" aria-label="Admin navigation">
        <a class="staff-nav-link active" href="/admin/dashboard" aria-current="page">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </span>
          <span>Dashboard</span>
        </a>

        <a class="staff-nav-link" href="/admin/order-monitor">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <path d="M3 6h18"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </span>
          <span>Order</span>
        </a>

        <a class="staff-nav-link" href="/admin/menu-management">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 3h11l5 5v13H3z"/>
              <path d="M14 3v5h5"/>
              <path d="M7 12h8M7 16h8"/>
            </svg>
          </span>
          <span>Menu Management</span>
        </a>

        <a class="staff-nav-link" href="/admin/promotions">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M19 5 5 19"/>
              <circle cx="6.5" cy="6.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          </span>
          <span>Promotions &amp; Discount</span>
        </a>

        <a class="staff-nav-link" href="/admin/inventory">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 8h18v12H3z"/>
              <path d="M7 8V4h10v4"/>
              <path d="M7 13h10M7 17h6"/>
            </svg>
          </span>
          <span>Inventory</span>
        </a>

        <a class="staff-nav-link" href="/admin/report">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M5 3h14v18H5z"/>
              <path d="M8 7h8M8 11h8M8 15h5"/>
              <path d="m14 18 2 2 4-4"/>
            </svg>
          </span>
          <span>Report</span>
        </a>

        <a class="staff-nav-link" href="/admin/audit-logs">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M8 3h8l2 3v15H6V6z"/>
              <path d="M9 11h6M9 15h6M9 6h6"/>
            </svg>
          </span>
          <span>Audit Logs</span>
        </a>

        <a class="staff-nav-link" href="/admin/users">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
            </svg>
          </span>
          <span>User</span>
        </a>

        <a class="staff-nav-link" href="/admin/settings">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5l-.3 3.1a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1l.3 3.1h5l.3-3.1a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5c.1-.3.1-.7.1-1z"/>
            </svg>
          </span>
          <span>Settings</span>
        </a>
      </nav>
    </aside>

    <!-- =====================================================
         MAIN DASHBOARD
    ====================================================== -->
    <main class="monitor-main">

      <!-- Header -->
      <header class="monitor-header dashboard-header">
        <div>
          <span class="eyebrow">SYSTEM OVERVIEW</span>
          <h1>Admin Dashboard</h1>
          <p>Live overview of orders, sales, POS, Kiosk, menu and inventory.</p>
        </div>

        <div class="header-actions">
          <div class="connection-pill" id="connectionPill">
            <span class="connection-dot" id="connectionDot"></span>
            <span id="connectionLabel">Checking Server...</span>
          </div>

          <button class="refresh-btn" id="refreshBtn" type="button">
            Refresh
          </button>

          <div class="admin-profile">
            <div class="profile-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <div class="profile-copy">
              <strong id="adminName">Admin</strong>
              <span>Administrator</span>
            </div>
          </div>
        </div>
      </header>

      <!-- Summary cards -->
      <section class="status-cards dashboard-status-cards">
        <article class="status-card">
          <div>
            <span class="card-kicker">TODAY</span>
            <span class="card-label">Total Orders</span>
          </div>
          <strong id="todayOrders">—</strong>
        </article>

        <article class="status-card">
          <div>
            <span class="card-kicker">SALES</span>
            <span class="card-label">Today's Revenue</span>
          </div>
          <strong class="money-count" id="todayRevenue">—</strong>
        </article>

        <article class="status-card">
          <div>
            <span class="card-kicker">THIS WEEK</span>
            <span class="card-label">Weekly Sales</span>
          </div>
          <strong class="money-count" id="weeklySales">—</strong>
        </article>

        <article class="status-card">
          <div>
            <span class="card-kicker">BEST SELLER</span>
            <span class="card-label">Top Product</span>
          </div>
          <strong class="top-product-count" id="topProduct">—</strong>
        </article>
      </section>
<!-- Main dashboard content -->
      <section class="dashboard-content-grid">

        <article class="dashboard-card sales-card">
          <div class="card-header">
            <div>
              <span class="eyebrow">SALES</span>
              <h2>Sales Overview</h2>
            </div>
            <span class="updated-text" id="updatedText">—</span>
          </div>

          <div class="chart-area">
            <canvas id="salesChart"></canvas>
          </div>

          <div class="chart-legend">
            <span><i class="this-week"></i>This Week</span>
            <span><i class="last-week"></i>Last Week</span>
          </div>
        </article>

        <article class="dashboard-card product-card">
          <div class="card-header">
            <div>
              <span class="eyebrow">PRODUCTS</span>
              <h2>Top Selling Products</h2>
            </div>
          </div>

          <div id="topProductsList" class="top-products-list">
            <div class="empty-state">Loading products...</div>
          </div>
        </article>

        <article class="dashboard-card recent-card">
          <div class="card-header">
            <div>
              <span class="eyebrow">ORDERS</span>
              <h2>Recent Orders</h2>
            </div>

            <a class="view-all-btn" href="/admin/order-monitor">
              View All
            </a>
          </div>

          <div class="recent-order-scroll">
            <table class="recent-order-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody id="recentOrdersBody">
                <tr>
                  <td colspan="5" class="table-message">
                    Loading received POS and Kiosk orders...
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="dashboard-card summary-card">
          <div class="card-header">
            <div>
              <span class="eyebrow">SUMMARY</span>
              <h2>System Summary</h2>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-item">
              <span>POS Orders Today</span>
              <strong id="posOrdersToday">—</strong>
            </div>

            <div class="summary-item">
              <span>Kiosk Orders Today</span>
              <strong id="kioskOrdersToday">—</strong>
            </div>

            <div class="summary-item">
              <span>Pending Orders</span>
              <strong id="pendingOrders">—</strong>
            </div>

            <div class="summary-item">
              <span>Preparing Orders</span>
              <strong id="preparingOrders">—</strong>
            </div>

            <div class="summary-item">
              <span>Completed Today</span>
              <strong id="completedToday">—</strong>
            </div>

            <div class="summary-item">
              <span>Monthly Revenue</span>
              <strong id="monthlyRevenue">—</strong>
            </div>
          </div>
        </article>

      </section>

      <div class="dashboard-message" id="dashboardMessage" hidden></div>

    </main>
  </div>

  <!-- Existing CafeKiosk authentication helper -->
  <script src="../Assets/js/auth-session.js"></script>
  <script src="../Assets/js/dashboard.js"></script>
<script src="../Assets/js/dashboard-products.js"></script>
  <script src="../Assets/js/uniform-theme.js?v=33"></script>
  <script src="../Assets/js/profile-menu.js?v=31"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
