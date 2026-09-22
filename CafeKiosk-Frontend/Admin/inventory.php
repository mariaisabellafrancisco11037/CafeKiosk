<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Inventory Monitor</title>
  <link rel="stylesheet" href="../Assets/css/inventory.css">
<link rel="stylesheet" href="../Assets/css/inventory-responsive-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=33">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
</head>
<body class="uniform-admin">
  <div class="inventory-shell">
    <!-- ADMIN SIDEBAR - SAME AS MENU MANAGEMENT -->
    <aside class="staff-sidebar">
      <a class="brand" href="../Admin/dashboard.php" aria-label="CafeKiosk Admin">
        <img src="../Assets/images/logo.png" alt="CafeKiosk Logo">
      </a>

      <div class="staff-label">ADMIN</div>

      <nav class="staff-nav" aria-label="Admin navigation">
        <a class="staff-nav-link" href="../Admin/dashboard.php">
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

        <a class="staff-nav-link" href="../Admin/menu-management.php">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 3h11l5 5v13H3z"/>
              <path d="M14 3v5h5"/>
              <path d="M7 12h8M7 16h8"/>
            </svg>
          </span>
          <span>Menu Management</span>
        </a>

        <a class="staff-nav-link" href="../Admin/promotions-discount.php">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M19 5 5 19"/>
              <circle cx="6.5" cy="6.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          </span>
          <span>Promotions &amp; Discount</span>
        </a>

        <a class="staff-nav-link active" href="../Admin/inventory.php" aria-current="page">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <path d="M3.3 7 12 12l8.7-5M12 22V12"/>
            </svg>
          </span>
          <span>Inventory</span>
        </a>

        <a class="staff-nav-link" href="../Admin/report.php">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 3v18h18"/>
              <path d="M8 17v-3M13 17V8M18 17V5"/>
            </svg>
          </span>
          <span>Report</span>
        </a>

        <a class="staff-nav-link" href="../Admin/audit-logs.php">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M9 2h6a2 2 0 0 1 2 2v1H7V4a2 2 0 0 1 2-2z"/>
              <rect x="4" y="5" width="16" height="16" rx="2"/>
              <path d="M8 11h8M8 15h5"/>
            </svg>
          </span>
          <span>Audit Logs</span>
        </a>

        <a class="staff-nav-link" href="../Admin/user.php">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
            </svg>
          </span>
          <span>User</span>
        </a>

        <a class="staff-nav-link" href="../Admin/settings.php">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
            </svg>
          </span>
          <span>Settings</span>
        </a>
      </nav>
    </aside>

    <main class="inventory-main">
      <!-- EXACT MENU MANAGEMENT HEADER STYLE -->
      <header class="inventory-topbar">
        <section class="page-heading-card">
          <div>
            <span class="page-kicker">STOCK CONTROL</span>
            <h1>Inventory Monitor</h1>
          </div>

          <div class="catalog-state live-state connecting" aria-label="Inventory connection status">
            <span class="catalog-dot"></span>
            <span id="inventoryLiveText">Connecting...</span>
          </div>
        </section>

        <section class="admin-profile-card">
          <span class="admin-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
            </svg>
          </span>

          <div class="admin-copy">
            <strong>“Admin's Name”</strong>
            <small>Administrator</small>
          </div>

          <button class="admin-caret" type="button" aria-label="Admin menu">
            <span></span>
          </button>
        </section>
      </header>

      <section class="inventory-dashboard">
        <!-- INGREDIENT STOCK PANEL -->
        <section class="inventory-panel">
          <div class="section-heading inventory-panel-head">
            <div>
              <span class="section-kicker">INGREDIENT STOCK</span>
              <h2>Inventory Ingredients</h2>
              <p><span id="ingredientCount">0 ingredients</span> · <span id="lastSyncText">Synced just now</span></p>
            </div>

            <div class="inventory-head-actions">
              <button type="button" class="outline-action" id="loadSampleStockBtn">
                Load Sample Stock
              </button>

              <button type="button" class="primary-action" id="addIngredientBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add Ingredient
              </button>
            </div>
          </div>

          <div class="inventory-content-grid">
            <div class="inventory-list-panel">
              <div class="list-toolbar">
                <label class="search-box" aria-label="Search ingredients">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <circle cx="11" cy="11" r="7"/>
                    <path d="m20 20-3.5-3.5"/>
                  </svg>
                  <input id="inventorySearch" type="search" placeholder="Search ingredients...">
                </label>

                <select id="categoryFilter" class="filter-select" aria-label="Filter inventory category">
                  <option value="all">All Categories</option>
                </select>

                <button type="button" class="low-stock-chip" id="lowStockFilter">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/>
                    <path d="M10 21h4"/>
                  </svg>
                  Low Stock: <b id="lowStockCount">0</b>
                </button>
              </div>

              <div class="table-wrap">
                <table class="inventory-table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Category</th>
                      <th>Unit</th>
                      <th>Stock Level</th>
                      <th>Low Alert</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody id="inventoryTableBody"></tbody>
                </table>
              </div>

              <div class="pagination" id="inventoryPagination"></div>
            </div>

            <!-- ADJUST STOCK CARD -->
            <aside class="adjust-panel">
              <div class="adjust-panel-head">
                <div>
                  <span class="section-kicker">STOCK UPDATE</span>
                  <h3>Adjust Stocks</h3>
                </div>
                <span class="current-stock-badge">Current: <strong id="currentStockValue">—</strong></span>
              </div>

              <form id="adjustStockForm">
                <label>
                  <span>Ingredient</span>
                  <input id="adjustIngredientName" type="text" readonly placeholder="Select an ingredient">
                </label>

                <label>
                  <span>Adjustment Type</span>
                  <select id="adjustmentType">
                    <option value="increase">Increase (+)</option>
                    <option value="decrease">Decrease (-)</option>
                    <option value="set">Set exact stock</option>
                  </select>
                </label>

                <label>
                  <span>Quantity</span>
                  <div class="quantity-with-unit">
                    <input id="adjustmentQuantity" type="number" min="0" step="0.001" placeholder="Enter quantity" required>
                    <b id="adjustmentUnit">—</b>
                  </div>
                </label>

                <label>
                  <span>Reason</span>
                  <select id="adjustmentReason" required>
                    <option value="">Select reason</option>
                    <option>Supplier Delivery</option>
                    <option>Manual Stock Count</option>
                    <option>Waste / Spillage</option>
                    <option>Spoilage / Expired</option>
                    <option>Correction</option>
                    <option>Returned Stock</option>
                    <option>Other</option>
                  </select>
                </label>

                <label>
                  <span>Date</span>
                  <input id="adjustmentDate" type="date" required>
                </label>

                <label class="notes-field">
                  <span>Notes</span>
                  <textarea id="adjustmentNotes" placeholder="Enter notes (optional)"></textarea>
                </label>

                <button type="submit" class="primary-action apply-btn" id="applyAdjustmentBtn">
                  Apply Adjustment
                </button>
              </form>

              <button type="button" class="outline-action edit-details-btn" id="editIngredientBtn" disabled>
                Edit Ingredient Details
              </button>
            </aside>
          </div>
        </section>

        <!-- RECENT ACTIVITY -->
        <section class="activity-panel">
          <div class="section-heading activity-head">
            <div>
              <span class="section-kicker">RECENT ACTIVITY</span>
              <h2>Stock Movements</h2>
              <p>Order deductions, void/refund returns, and manual adjustments.</p>
            </div>
          </div>
          <div id="activityList" class="activity-list"></div>
        </section>
      </section>
    </main>
  </div>

  <!-- ADD / EDIT INGREDIENT MODAL -->
  <div class="modal-backdrop hidden" id="ingredientModal">
    <div class="ingredient-modal" role="dialog" aria-modal="true" aria-labelledby="ingredientModalTitle">
      <div class="modal-head">
        <div>
          <span class="section-kicker">INVENTORY ITEM</span>
          <h2 id="ingredientModalTitle">Add Ingredient</h2>
        </div>
        <button type="button" id="closeIngredientModal" aria-label="Close">×</button>
      </div>

      <form id="ingredientForm">
        <input type="hidden" id="ingredientEditId">

        <label>
          <span>Ingredient Name</span>
          <input id="ingredientName" type="text" placeholder="e.g. Coffee Beans" required>
        </label>

        <div class="modal-two-col">
          <label>
            <span>Category</span>
            <select id="ingredientCategory">
              <option>Coffee</option><option>Dairy</option><option>Tea</option><option>Syrup</option>
              <option>Topping</option><option>Powder</option><option>Pastry</option><option>Food</option>
              <option>Packaging</option><option>Other</option>
            </select>
          </label>

          <label>
            <span>Measurement Unit</span>
            <select id="ingredientUnit">
              <option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option>
              <option value="l">L</option><option value="pcs">pcs</option><option value="shot">shot</option>
              <option value="scoop">scoop</option><option value="tbsp">tbsp</option><option value="tsp">tsp</option>
            </select>
          </label>
        </div>

        <div class="modal-two-col">
          <label id="initialStockField">
            <span>Initial Stock</span>
            <input id="ingredientStock" type="number" min="0" step="0.001" value="0">
          </label>

          <label>
            <span>Low Stock Alert At</span>
            <input id="ingredientLowThreshold" type="number" min="0" step="0.001" value="0" required>
          </label>
        </div>

        <p class="modal-help">This ingredient will become available in the Menu Management recipe dropdown.</p>

        <div class="modal-actions">
          <button type="button" class="outline-action" id="cancelIngredientModal">Cancel</button>
          <button type="submit" class="primary-action">Save Ingredient</button>
        </div>
      </form>
    </div>
  </div>

  <script src="/socket.io/socket.io.js"></script>
  <script src="../Assets/js/auth-session.js"></script>
  <script src="../Assets/js/inventory.js"></script>
  <script src="../Assets/js/uniform-theme.js?v=33"></script>
  <script src="../Assets/js/profile-menu.js?v=31"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>
