<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>CafeKiosk - Admin Order Monitor</title>

  <link
    rel="stylesheet"
    href="../Assets/css/order-monitor.css?v=20260913"
  >
<link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
</head>

<body class="uniform-admin">

  <div class="queue-app admin-order-app">

    <!-- =====================================================
         ADMIN SIDEBAR
    ====================================================== -->
    <aside class="sidebar admin-sidebar">

      <div class="logo">
        <img
          src="../Assets/images/logo.png"
          alt="CafeKiosk Logo"
        >
      </div>

      <div class="staff-label">
        ADMIN
      </div>

      <nav
        class="staff-navigation admin-navigation"
        aria-label="Admin navigation"
      >

        <a
          href="../Admin/dashboard.php"
          class="staff-nav-button"
        >
          <span
            class="staff-nav-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              <rect x="14" y="14" width="7" height="7" rx="1"></rect>
            </svg>
          </span>

          <span>
            Dashboard
          </span>
        </a>


        <a
          href="/admin/order-monitor"
          class="staff-nav-button active"
          aria-current="page"
        >
          <span
            class="staff-nav-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M5 5h3v3H5zM5 11h3v3H5zM5 17h3v3H5z"></path>
              <path d="M11 6.5h8M11 12.5h8M11 18.5h8"></path>
            </svg>
          </span>

          <span>
            Order
          </span>
        </a>


        <a
          href="../Admin/menu-management.php"
          class="staff-nav-button"
        >
          <span
            class="staff-nav-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M4 4h16v16H4z"></path>
              <path d="M8 9h8M8 13h8M8 17h5"></path>
            </svg>
          </span>

          <span>
            Menu Management
          </span>
        </a>


        <a
          href="../Admin/promotions-discount.php"
          class="staff-nav-button"
        >
          <span
            class="staff-nav-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M19 5 5 19"></path>
              <circle cx="6.5" cy="6.5" r="2.5"></circle>
              <circle cx="17.5" cy="17.5" r="2.5"></circle>
            </svg>
          </span>

          <span>
            Promotions &amp; Discount
          </span>
        </a>


        <a
          href="../Admin/inventory.php"
          class="staff-nav-button"
        >
          <span
            class="staff-nav-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <path d="M3.3 7 12 12l8.7-5M12 22V12"></path>
            </svg>
          </span>

          <span>
            Inventory
          </span>
        </a>


        <a
          href="../Admin/report.php"
          class="staff-nav-button"
        >
          <span
            class="staff-nav-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M3 3v18h18"></path>
              <path d="M8 17v-3M13 17V8M18 17V5"></path>
            </svg>
          </span>

          <span>
            Report
          </span>
        </a>


        <a
          href="../Admin/audit-logs.php"
          class="staff-nav-button"
        >
          <span
            class="staff-nav-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <path d="M9 2h6a2 2 0 0 1 2 2v1H7V4a2 2 0 0 1 2-2z"></path>
              <rect x="4" y="5" width="16" height="16" rx="2"></rect>
              <path d="M8 11h8M8 15h5"></path>
            </svg>
          </span>

          <span>
            Audit Logs
          </span>
        </a>


        <a
          href="../Admin/user.php"
          class="staff-nav-button"
        >
          <span
            class="staff-nav-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <circle cx="12" cy="8" r="4"></circle>
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7"></path>
            </svg>
          </span>

          <span>
            User
          </span>
        </a>


        <a
          href="../Admin/settings.php"
          class="staff-nav-button"
        >
          <span
            class="staff-nav-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path>
            </svg>
          </span>

          <span>
            Settings
          </span>
        </a>

      </nav>

    </aside>


    <!-- =====================================================
         MAIN ORDER MONITOR
    ====================================================== -->
    <main class="queue-main">

      <div class="page-title-box">

        <h1>
          Order Monitor
        </h1>

        <div
          id="conn-status"
          class="live-indicator"
          aria-label="Live connection status"
          aria-live="polite"
        >
          <span
            id="conn-dot"
            class="live-dot"
          ></span>

          <span id="conn-label">
            Connecting...
          </span>
        </div>

      </div>


      <!-- FILTERS -->
      <section class="filters-row">

        <label class="select-box">
          <select
            id="status-filter"
            aria-label="Filter by status"
          >
            <option value="ALL">
              All Status
            </option>

            <option value="PENDING">
              Pending
            </option>

            <option value="PREPARING">
              Preparing
            </option>

            <option value="COMPLETED">
              Completed
            </option>
          </select>
        </label>


        <label class="select-box">
          <select
            id="source-filter"
            aria-label="Filter by source"
          >
            <option value="ALL">
              All Source
            </option>

            <option value="POS">
              POS
            </option>

            <option value="KIOSK">
              Kiosk
            </option>
          </select>
        </label>


        <label class="select-box service-filter">
          <select
            id="service-filter"
            aria-label="Filter by service type"
          >
            <option value="ALL">
              Service Type
            </option>

            <option value="DINE IN">
              Dine In
            </option>

            <option value="TAKE OUT">
              Take Out
            </option>
          </select>
        </label>


        <label class="select-box time-filter">
          <select
            id="time-filter"
            aria-label="Sort by time"
          >
            <option value="NEWEST">
              Time
            </option>

            <option value="NEWEST">
              Newest First
            </option>

            <option value="OLDEST">
              Oldest First
            </option>
          </select>
        </label>


        <div class="date-box">
          <input
            id="date-display"
            type="text"
            value="Live orders"
            aria-label="Order date range"
            readonly
          >
        </div>

      </section>


      <!-- STATUS SUMMARY -->
      <section
        class="status-tabs"
        aria-label="Order status summary"
      >

        <button
          type="button"
          class="status-tab pending"
          data-status-tab="PENDING"
        >
          <span>
            PENDING
          </span>

          <strong id="count-pending">
            0
          </strong>
        </button>


        <button
          type="button"
          class="status-tab preparing"
          data-status-tab="PREPARING"
        >
          <span>
            PREPARING
          </span>

          <strong id="count-preparing">
            0
          </strong>
        </button>


        <button
          type="button"
          class="status-tab completed"
          data-status-tab="COMPLETED"
        >
          <span>
            COMPLETED
          </span>

          <strong id="count-completed">
            0
          </strong>
        </button>

      </section>


      <!-- LIVE ORDERS -->
      <section class="live-order-card">

        <div class="section-caption">
          Live Order
        </div>

        <div class="table-wrap">

          <table class="order-table">

            <thead>
              <tr>
                <th>
                  Order ID
                </th>

                <th>
                  Customer
                </th>

                <th>
                  Time
                </th>

                <th>
                  Source
                </th>

                <th>
                  Serving
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody id="order-tbody"></tbody>

          </table>

        </div>

      </section>


      <nav
        id="pagination"
        class="pagination"
        aria-label="Order pages"
      ></nav>

    </main>


    <!-- =====================================================
         RIGHT DETAILS PANEL
    ====================================================== -->
    <aside class="queue-right">

      <button
        id="admin-profile-button"
        class="staff-profile"
        type="button"
      >

        <span
          class="profile-icon"
          aria-hidden="true"
        ></span>

        <strong>
          “Admin's Name”
        </strong>

      </button>


      <label class="order-search">

        <span
          class="search-symbol"
          aria-hidden="true"
        ></span>

        <input
          id="search-input"
          type="search"
          placeholder="Search orders..."
          autocomplete="off"
        >

      </label>


      <section
        id="detail-card"
        class="order-detail"
      >

        <div class="empty-order-detail">
          Select an order to view its details.
        </div>

      </section>

    </aside>

  </div>


  <!-- =====================================================
       VOID / REFUND MODAL
       ADMIN VERSION: NO MANAGER PIN
  ====================================================== -->
  <div
    id="order-modal"
    class="modal-overlay"
    aria-hidden="true"
  >

    <section
      class="void-modal admin-void-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adminModalOrderTitle"
    >

      <header class="modal-header">

        <div>

          <h2 id="adminModalOrderTitle">
            Order
            <span id="modal-order-id">
              #—
            </span>
          </h2>

          <p id="modal-order-date">
            —
          </p>

        </div>


        <button
          id="modal-close"
          type="button"
          class="modal-close"
          aria-label="Close"
        >
          ×
        </button>

      </header>


      <div class="modal-body">

        <!-- LEFT SIDE -->
        <div class="modal-left">

          <div class="order-items-heading">

            <h3>
              Order Items:
            </h3>

            <span id="modal-item-count">
              0 Items
            </span>

          </div>


          <div class="modal-items-table-wrap">

            <table class="modal-items-table">

              <thead>
                <tr>
                  <th>
                    Items
                  </th>

                  <th>
                    Qty
                  </th>

                  <th>
                    Price
                  </th>

                  <th>
                    Total
                  </th>
                </tr>
              </thead>

              <tbody id="modal-items"></tbody>

            </table>

          </div>


          <div class="payment-summary">

            <div>
              <span>
                Subtotal:
              </span>

              <strong id="modal-subtotal">
                ₱0.00
              </strong>
            </div>


            <div>
              <span>
                Discount:
              </span>

              <strong
                id="modal-discount"
                class="discount-value"
              >
                -₱0.00
              </strong>
            </div>


            <div class="paid-row">
              <span>
                Total Paid:
              </span>

              <strong id="modal-total">
                ₱0.00
              </strong>
            </div>

          </div>


          <div class="restock-note">

            <span class="note-icon">
              !
            </span>

            <span id="modal-warning-text">
              Voided items will be restocked automatically.
            </span>

          </div>

        </div>


        <!-- RIGHT SIDE -->
        <div class="modal-right">

          <div class="action-panel">

            <h3>
              Action Type:
            </h3>


            <div class="action-type-row">

              <button
                type="button"
                class="action-type-btn void active"
                id="void-btn"
              >
                <span class="action-circle">
                  ×
                </span>

                <span>
                  Void
                </span>
              </button>


              <button
                type="button"
                class="action-type-btn refund"
                id="refund-btn"
              >
                <span class="refund-symbol">
                  ◎
                </span>

                <span>
                  Refund
                </span>
              </button>

            </div>


            <h3 id="scope-heading">
              Void Option:
            </h3>


            <div class="void-options">

              <label class="radio-option">

                <input
                  type="radio"
                  name="void-option"
                  value="entire"
                  checked
                >

                <span class="fake-radio"></span>

                <span>
                  <strong
                    data-label-void="Void Entire Order"
                    data-label-refund="Refund Entire Order"
                  >
                    Void Entire Order
                  </strong>

                  <small
                    data-label-void="Cancel the whole order"
                    data-label-refund="Refund the whole order"
                  >
                    Cancel the whole order
                  </small>
                </span>

              </label>


              <label class="radio-option">

                <input
                  type="radio"
                  name="void-option"
                  value="specific"
                >

                <span class="fake-radio"></span>

                <span>
                  <strong
                    data-label-void="Void Specific Items"
                    data-label-refund="Refund Specific Items"
                  >
                    Void Specific Items
                  </strong>

                  <small
                    data-label-void="Cancel selected items"
                    data-label-refund="Refund selected items"
                  >
                    Cancel selected items
                  </small>
                </span>

              </label>


              <label class="radio-option">

                <input
                  type="radio"
                  name="void-option"
                  value="payment"
                >

                <span class="fake-radio"></span>

                <span>
                  <strong
                    data-label-void="Void Payment"
                    data-label-refund="Refund Payment"
                  >
                    Void Payment
                  </strong>

                  <small
                    data-label-void="Cancel the payment record"
                    data-label-refund="Refund the payment record"
                  >
                    Cancel the payment record
                  </small>
                </span>

              </label>

            </div>


            <label
              class="field-label"
              for="void-reason"
            >
              Reason:
            </label>


            <div class="reason-control">

              <select id="void-reason">

                <option value="">
                  Select a Reason...
                </option>

                <option value="customer-request">
                  Customer Request
                </option>

                <option value="wrong-order">
                  Wrong Order
                </option>

                <option value="duplicate">
                  Duplicate Order
                </option>

                <option value="out-of-stock">
                  Item Out of Stock
                </option>

                <option value="payment-error">
                  Payment Error
                </option>

                <option value="other">
                  Other
                </option>

              </select>

            </div>

          </div>


          <div class="modal-footer-actions">

            <button
              type="button"
              id="modal-cancel"
              class="cancel-modal-btn"
            >
              Cancel
            </button>


            <button
              type="button"
              id="modal-confirm"
              class="confirm-modal-btn"
            >

              <span
                class="trash-symbol"
                aria-hidden="true"
              >
                ✓
              </span>

              <span id="confirm-action-text">
                Confirm Void
              </span>

            </button>

          </div>

        </div>

      </div>

    </section>

  </div>


  <!-- =====================================================
       FRONTEND-ONLY AUTH + REALTIME
  ====================================================== -->

  <script src="/socket.io/socket.io.js"></script>

  <script src="/Assets/js/auth-session.js?v=20260913"></script>

  <script src="../Assets/js/order-monitor.js?v=20260913"></script>

  <script src="../Assets/js/uniform-theme.js?v=33"></script>
  <script src="../Assets/js/profile-menu.js?v=31"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
