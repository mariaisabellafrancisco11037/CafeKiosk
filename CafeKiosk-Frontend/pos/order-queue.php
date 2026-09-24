<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Order Queue</title>
  <link rel="stylesheet" href="../Assets/css/order-queue.css?v=6">
<link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>
<body class="uniform-pos">
  <div class="queue-app">
    <!-- LEFT STAFF SIDEBAR - SAME STYLE AS POS MENU -->
    <aside class="sidebar">
      <div class="logo">
        <img src="../Assets/images/logo.png" alt="CafeKiosk Logo">
      </div>

      <div class="staff-label">STAFF</div>

      <nav class="staff-navigation" aria-label="Staff navigation">
<a href="/staff-dashboard" class="staff-nav-button"><span class="staff-nav-icon" aria-hidden="true">▦</span><span>Dashboard</span></a>
<a href="/pos" class="staff-nav-button"><span class="staff-nav-icon" aria-hidden="true">☕</span><span>Menu</span></a>
<a href="/order-queue" class="staff-nav-button active" aria-current="page"><span class="staff-nav-icon" aria-hidden="true">☷</span><span>Order Queue</span></a>
</nav>
    </aside>

    <!-- MAIN QUEUE CONTENT -->
    <main class="queue-main">
      <div class="page-title-box">
        <h1>Order Monitor</h1>
        <div class="live-indicator" aria-label="Live connection status">
          <span class="live-dot"></span>
          <span id="liveStatusText">Live</span>
        </div>
      </div>

      <section class="filters-row">
        <label class="select-box">
          <select id="statusFilter" aria-label="Filter by status">
            <option value="all">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Preparing">Preparing</option>
            <option value="Completed">Completed</option>
          </select>
        </label>

        <label class="select-box">
          <select id="sourceFilter" aria-label="Filter by source">
            <option value="all">All Source</option>
            <option value="POS">POS</option>
            <option value="Kiosk">Kiosk</option>
          </select>
        </label>

        <label class="select-box service-filter">
          <select id="serviceFilter" aria-label="Filter by service type">
            <option value="all">Service Type</option>
            <option value="Dine In">Dine In</option>
            <option value="Takeout">Takeout</option>
          </select>
        </label>

        <label class="select-box time-filter">
          <select id="timeFilter" aria-label="Filter by time">
            <option value="all">Time</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </label>

        <div class="date-box">
          <input id="dateFilter" type="text" value="01 / 02 / 2026 - 01 / 10 / 2026" aria-label="Date range">
        </div>
      </section>

      <section class="status-tabs" aria-label="Order status summary">
        <button class="status-tab pending active" data-status="Pending">
          <span>PENDING</span>
          <strong id="pendingCount">5</strong>
        </button>
        <button class="status-tab preparing" data-status="Preparing">
          <span>PREPARING</span>
          <strong id="preparingCount">4</strong>
        </button>
        <button class="status-tab completed" data-status="Completed">
          <span>COMPLETED</span>
          <strong id="completedCount">11</strong>
        </button>
      </section>

      <section class="live-order-card">
        <div class="section-caption">Live Order</div>

        <div class="table-wrap">
          <table class="order-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Time</th>
                <th>Source</th>
                <th>Serving</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody id="orderTableBody"></tbody>
          </table>
        </div>
      </section>

      <div class="pagination" aria-label="Pagination">
        <button class="page-btn active">1</button>
        <button class="page-btn">2</button>
        <button class="page-btn">3</button>
        <button class="next-btn">Next</button>
      </div>
    </main>

    <!-- RIGHT SIDE -->
    <aside class="queue-right">
      <button id="staffButton" class="staff-profile" type="button">
        <span class="profile-icon" aria-hidden="true"><span></span></span>
        <strong>“Staff’s Name”</strong>
      </button>

      <label class="order-search">
        <span class="search-symbol" aria-hidden="true"></span>
        <input id="orderSearch" name="cafekiosk_pos_order_search" type="search" placeholder="Search orders..." autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" readonly>
      </label>

      <section id="orderDetail" class="order-detail">
        <div id="emptyOrderDetail" class="empty-order-detail">
          Select an order to view its details.
        </div>

        <div id="orderDetailContent" class="order-detail-content" hidden>
          <div class="detail-title" id="detailOrderNumber">Order</div>

          <div class="detail-info">
            <div class="detail-row"><strong>Customer:</strong><span id="detailCustomer">—</span></div>
            <div class="detail-row"><strong>Source:</strong><span id="detailSource">—</span></div>
            <div class="detail-row"><strong>Time:</strong><span id="detailTime">—</span></div>
            <div class="detail-row status-detail-row"><strong>Status:</strong><span id="detailStatus" class="detail-status pending">Pending</span></div>
          </div>

          <div class="detail-items">
            <strong class="items-label">Item:</strong>
            <div id="detailItems"></div>
          </div>

          <div class="detail-total">Total: <strong id="detailTotal">₱0.00</strong></div>

          <div class="detail-actions">
            <button id="updateStatusButton" type="button" class="detail-btn light">Update Status</button>
            <button id="closeDetailButton" type="button" class="detail-btn green">Close</button>
          </div>
        </div>
      </section>
    </aside>
  </div>

  <!-- VOID / REFUND MODAL -->
  <div id="voidRefundModal" class="modal-overlay" aria-hidden="true">
    <section class="void-modal" role="dialog" aria-modal="true" aria-labelledby="modalOrderTitle">
      <header class="modal-header">
        <div>
          <h2 id="modalOrderTitle">Order #1051</h2>
          <p id="modalOrderDate">March 14, 2025 11:45 AM</p>
        </div>
        <button id="closeVoidModal" type="button" class="modal-close" aria-label="Close">×</button>
      </header>

      <div class="modal-body">
        <div class="modal-left">
          <div class="order-items-heading">
            <h3>Order Items:</h3>
            <span id="modalItemCount">3 Items</span>
          </div>

          <div class="modal-items-table-wrap">
            <table class="modal-items-table">
              <thead>
                <tr>
                  <th>Items</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody id="modalItemsBody"></tbody>
            </table>
          </div>

          <div class="payment-summary">
            <div><span>Subtotal:</span><strong id="modalSubtotal">₱420.00</strong></div>
            <div><span>Discount:</span><strong id="modalDiscount" class="discount-value">-₱20.00</strong></div>
            <div class="paid-row"><span>Total Paid:</span><strong id="modalTotalPaid">₱400.00</strong></div>
          </div>

          <div class="restock-note">
            <span class="note-icon">!</span>
            <span id="restockText">Voided Items will be restocked automatically.</span>
          </div>
        </div>

        <div class="modal-right">
          <div class="action-panel">
            <h3>Action Type:</h3>
            <div class="action-type-row">
              <button id="voidAction" type="button" class="action-type-btn void active">
                <span class="action-circle">×</span> Void
              </button>
              <button id="refundAction" type="button" class="action-type-btn refund">
                <span class="refund-symbol">◎</span> Refund
              </button>
            </div>

            <h3 id="optionHeading">Void Option:</h3>
            <div class="void-options">
              <label class="radio-option">
                <input type="radio" name="voidOption" value="entire" checked>
                <span class="fake-radio"></span>
                <span><strong id="entireLabel">Void Entire Order</strong><small id="entireHelp">Cancel the Whole Order</small></span>
              </label>
              <label class="radio-option">
                <input type="radio" name="voidOption" value="specific">
                <span class="fake-radio"></span>
                <span><strong id="specificLabel">Void Specific Order</strong><small id="specificHelp">Cancel Selected Items</small></span>
              </label>
              <label class="radio-option">
                <input type="radio" name="voidOption" value="payment">
                <span class="fake-radio"></span>
                <span><strong id="paymentLabel">Void Payment</strong><small id="paymentHelp">Cancel the Payment record</small></span>
              </label>
            </div>

            <label class="field-label" for="reasonSelect">Reason:</label>
            <div class="reason-control">
              <select id="reasonSelect">
                <option value="">Select a Reason...</option>
                <option>Customer request</option>
                <option>Wrong order</option>
                <option>Duplicate order</option>
                <option>Item unavailable</option>
                <option>Payment error</option>
                <option>Other</option>
              </select>
            </div>

            <label class="field-label" for="managerPin">Admin/Manager Approval PIN:</label>
            <div class="pin-control">
              <input id="managerPin" type="password" inputmode="numeric" maxlength="6" placeholder="Ask Admin/Manager for approval PIN">
              <button id="togglePin" type="button" aria-label="Show PIN" title="Show PIN"><span class="eye-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6S2.25 12 2.25 12Z"/><circle cx="12" cy="12" r="2.75"/></svg></span></button>
            </div>
          </div>

          <div class="modal-footer-actions">
            <button id="cancelVoidButton" type="button" class="cancel-modal-btn">Cancel</button>
            <button id="confirmVoidRefundButton" type="button" class="confirm-modal-btn">
              <span class="trash-symbol" aria-hidden="true">✓</span>
              <span id="confirmActionText">Confirm Void</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>

  <script src="../Assets/js/auth-session.js"></script>
  <script src="../Assets/js/order-queue.js?v=manager-realtime-v3"></script>

  <script src="../Assets/js/uniform-theme.js?v=33"></script>
  <script src="../Assets/js/profile-menu.js?v=logout-confirm-v2"></script>
  <script src="../Assets/js/live-presence.js?v=manager-realtime-v3"></script>
  <script src="../Assets/js/pos-search-autofill-guard.js?v=1"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>
