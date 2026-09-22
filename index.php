<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CafeKiosk Login</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>

<main class="app">

  <!-- ROLE SELECTION -->
  <section id="rolePage" class="page active">
    <div class="card center">
      <div class="logo">
        <div class="logo-circle">☕</div>
      </div>

      <h1>CafeKiosk</h1>

      <button onclick="showLogin('Admin')" class="main-btn">Admin</button>
      <button onclick="showLogin('Staff')" class="main-btn">Staff</button>
    </div>
  </section>

  <!-- LOGIN PAGE -->
  <section id="loginPage" class="page">
    <div class="card login-card">
      <div class="logo">
        <div class="logo-circle">☕</div>
      </div>

      <h2>Welcome to CafeKiosk</h2>

      <div class="role-box" id="selectedRole">Admin</div>

      <form onsubmit="login(event)">
        <label>USER ID:</label>
        <input type="text" id="userId" required />

        <label>PASSWORD:</label>
        <input type="password" id="password" required />

        <button type="submit" class="login-btn">LOG IN</button>
      </form>

      <button class="forgot-btn" onclick="forgotPassword()">FORGOT PASSWORD</button>
      <button class="back-btn" onclick="goBack()">← Back</button>

      <p id="message"></p>
    </div>
  </section>

  <!-- ADMIN DASHBOARD -->
  <section id="dashboardPage" class="page">
    <div class="admin-layout">

      <aside class="sidebar">
        <div class="side-logo">☕</div>

        <button class="nav active" onclick="showDashboardPage()">Dashboard</button>
        <button class="nav" onclick="showOrderPage()">Order</button>
        <button class="nav" onclick="showMenuPage()">Menu Management</button>
        <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
        <button class="nav" onclick="showInventoryPage()">Inventory</button>
        <button class="nav" onclick="showReportPage()">Report</button>
        <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
        <button class="nav" onclick="showUserPage()">User</button>
        <button class="nav" onclick="showSettingsPage()">Settings</button>
      </aside>

      <section class="dashboard-content">

        <header class="top-bar">
          <div class="title-box">Admin Dashboard</div>

          <div class="profile-menu">
            <button class="profile-btn" onclick="toggleProfile()">
              👤 “Admin’s Name” ▼
            </button>

            <div id="profileDropdown" class="profile-dropdown">
              <button onclick="alert('Edit Profile clicked')">Edit Profile</button>
              <button onclick="logout()">Logout</button>
            </div>
          </div>
        </header>

        <div class="stats-grid">
          <div class="stat-card"><h3>Total Orders</h3><p>1,235 Today</p></div>
          <div class="stat-card"><h3>Today’s Revenue</h3><p>₱28,450.00</p></div>
          <div class="stat-card"><h3>Weekly Sales</h3><p>₱145,320</p></div>
          <div class="stat-card"><h3>Top Products</h3><p>Iced Caramel Macchiato</p></div>
        </div>

        <div class="dashboard-grid">
          <div class="panel sales-overview">
            <h4>Sales Overview</h4>
            <div class="fake-chart">📈</div>
          </div>

          <div class="panel">
            <h4>Top Selling Products</h4>
            <div class="product">Iced Caramel Macchiato <span><b style="width:95%"></b></span></div>
            <div class="product">Matcha Green Tea <span><b style="width:82%"></b></span></div>
            <div class="product">Chocolate Chip Muffin <span><b style="width:70%"></b></span></div>
            <div class="product">Espresso <span><b style="width:58%"></b></span></div>
            <div class="product">Iced Americano <span><b style="width:48%"></b></span></div>
          </div>

          <div class="panel recent-orders">
            <h4>Recent Orders</h4>
            <table>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Amount</th>
              </tr>

              <tr>
                <td>#1043</td>
                <td>Anna Reyes</td>
                <td><span class="status preparing">Preparing</span></td>
                <td>₱250.00</td>
              </tr>

              <tr>
                <td>#1042</td>
                <td>Mark Santos</td>
                <td><span class="status completed">Completed</span></td>
                <td>₱180.00</td>
              </tr>

              <tr>
                <td>#1041</td>
                <td>Jenna Cruz</td>
                <td><span class="status pending">Pending</span></td>
                <td>₱320.00</td>
              </tr>
            </table>
          </div>

          <div class="panel sales-summary">
            <h4>Sales Summary</h4>
            <p><span>Daily Sales</span><b>₱28,450.00</b></p>
            <p><span>Weekly Sales</span><b>₱145,320.00</b></p>
            <p><span>Monthly Sales</span><b>₱520,780.00</b></p>
          </div>
        </div>

      </section>
    </div>
  </section>

  <!-- ORDER MONITORING PAGE -->
  <section id="orderPage" class="page">
    <div class="admin-layout">

      <aside class="sidebar">
        <div class="side-logo">☕</div>

        <button class="nav" onclick="showDashboardPage()">Dashboard</button>
        <button class="nav active" onclick="showOrderPage()">Order</button>
        <button class="nav" onclick="showMenuPage()">Menu Management</button>
        <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
        <button class="nav" onclick="showInventoryPage()">Inventory</button>
        <button class="nav" onclick="showReportPage()">Report</button>
        <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
        <button class="nav" onclick="showUserPage()">User</button>
        <button class="nav" onclick="showSettingsPage()">Settings</button>
      </aside>

      <section class="dashboard-content">

        <header class="top-bar">
          <div class="title-box">Order Monitor</div>

          <div class="profile-menu">
            <button class="profile-btn" onclick="toggleProfile()">
              👤 “Admin’s Name” ▼
            </button>

            <div id="profileDropdownOrder" class="profile-dropdown">
              <button onclick="alert('Edit Profile clicked')">Edit Profile</button>
              <button onclick="logout()">Logout</button>
            </div>
          </div>
        </header>

        <div class="order-toolbar">
          <select>
            <option>All Status</option>
            <option>Pending</option>
            <option>Preparing</option>
            <option>Completed</option>
          </select>

          <select>
            <option>All Source</option>
            <option>POS System</option>
            <option>Kiosk</option>
          </select>

          <select>
            <option>Service Type</option>
            <option>Dine-In</option>
            <option>Take-Out</option>
          </select>

          <select>
            <option>Time</option>
            <option>Latest</option>
            <option>Older</option>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
          </select>

          <input type="text" placeholder="Search orders..." />
        </div>

        <div class="order-status-row">
          <div class="order-count pending-box">PENDING <span>5</span></div>
          <div class="order-count preparing-box">PREPARING <span>4</span></div>
          <div class="order-count completed-box">COMPLETED <span>11</span></div>
        </div>

        <div class="order-monitor-grid">

          <div class="panel live-orders">
            <h4>Live Order</h4>

            <table>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Time</th>
                <th>Source</th>
                <th>Serving</th>
                <th>Status</th>
                <th>Action</th>
              </tr>

              <tr>
                <td>#1052</td>
                <td>John Smith</td>
                <td>12:15 PM</td>
                <td>POS</td>
                <td>Takeout</td>
                <td><span class="status pending">Pending</span></td>
                <td>
                  <button class="view-btn" onclick="viewOrder('#1052','John Smith','POS','12:15 PM','Pending','Latte x2','250.00')">View</button>
                </td>
              </tr>

              <tr>
                <td>#1051</td>
                <td>Kiosk #1</td>
                <td>12:10 PM</td>
                <td>Kiosk</td>
                <td>Dine In</td>
                <td><span class="status preparing">Preparing</span></td>
                <td>
                  <button class="view-btn" onclick="viewOrder('#1051','Emily Johnson','Kiosk #1','12:10 PM','Preparing','Cookies & Cream Milktea x1, Club Sandwich x1','145.00')">View</button>
                </td>
              </tr>

              <tr>
                <td>#1050</td>
                <td>Emily Johnson</td>
                <td>11:45 AM</td>
                <td>POS</td>
                <td>Dine In</td>
                <td><span class="status preparing">Preparing</span></td>
                <td>
                  <button class="view-btn" onclick="viewOrder('#1050','Emily Johnson','POS','11:45 AM','Preparing','Iced Americano x1, Muffin x1','180.00')">View</button>
                </td>
              </tr>

              <tr>
                <td>#1049</td>
                <td>Michael Brown</td>
                <td>11:20 AM</td>
                <td>POS</td>
                <td>Dine In</td>
                <td><span class="status completed">Completed</span></td>
                <td>
                  <button class="view-btn" onclick="viewOrder('#1049','Michael Brown','POS','11:20 AM','Completed','Espresso x2','120.00')">View</button>
                </td>
              </tr>
            </table>
          </div>

          <div class="panel order-preview">
            <h4>Order Preview</h4>

            <div id="orderDetails">
              <div class="empty-preview">
                <p>📄</p>
                <p>Select an order by clicking <strong>View</strong>.</p>
              </div>
            </div>
          </div>

        </div>

      </section>
    </div>
  </section>

  <!-- REFUND / VOID MODAL -->
<div id="voidModal" class="void-modal">
  <div class="void-modal-content">

    <button class="modal-x" onclick="closeVoidModal()">×</button>

    <div class="void-header">
      <h2 id="modalOrderId">Order #1051</h2>
      <p>March 14, 2025 11:45 AM</p>
    </div>

    <div class="void-body">

      <div class="void-left">
        <h3>Order Items: <span>3 Items</span></h3>

        <table class="void-table">
          <tr>
            <th>Items</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>

          <tr>
            <td>Ice Tea</td>
            <td>2</td>
            <td>₱90.00</td>
            <td>₱180.00</td>
          </tr>

          <tr>
            <td>Blueberry Muffin</td>
            <td>2</td>
            <td>₱60.00</td>
            <td>₱120.00</td>
          </tr>

          <tr>
            <td>Cheesecake</td>
            <td>1</td>
            <td>₱120.00</td>
            <td>₱120.00</td>
          </tr>
        </table>

        <div class="void-total-box">
          <p><b>Subtotal:</b> <span>₱420.00</span></p>
          <p><b>Discount:</b> <span class="discount">-₱20.00</span></p>
          <p><b>Total Paid:</b> <span>₱400.00</span></p>
        </div>

        <div class="warning-box">
          ❗ Voided items will be restocked automatically.
        </div>
      </div>

      <div class="void-right">
        <h3>Action Type:</h3>

        <div class="action-type">
          <button class="void-action">✕ Void</button>
          <button class="refund-action">Refund</button>
        </div>

        <h3>Void Option:</h3>

        <label><input type="radio" name="voidOption" checked> Void Entire Order</label>
        <label><input type="radio" name="voidOption"> Void Specific Order</label>
        <label><input type="radio" name="voidOption"> Void Payment</label>

        <h3>Reason:</h3>
        <select class="modal-select">
          <option>Select a Reason...</option>
          <option>Wrong Order</option>
          <option>Customer Request</option>
          <option>Duplicate Order</option>
        </select>

        <h3>Admin/Manager PIN:</h3>
        <input class="pin-input" type="password" placeholder="Enter 4-6 digit PIN">

        <div class="modal-buttons">
          <button onclick="closeVoidModal()" class="cancel-modal">Cancel</button>
          <button class="confirm-modal">Confirm</button>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- MENU MANAGEMENT PAGE -->
<section id="menuPage" class="page">
  <div class="admin-layout">

    <aside class="sidebar">
      <div class="side-logo">☕</div>

      <button class="nav" onclick="showDashboardPage()">Dashboard</button>
      <button class="nav" onclick="showOrderPage()">Order</button>
      <button class="nav active" onclick="showMenuPage()">Menu Management</button>
      <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
      <button class="nav" onclick="showInventoryPage()">Inventory</button>
      <button class="nav" onclick="showReportPage()">Report</button>
      <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
      <button class="nav" onclick="showUserPage()">User</button>
      <button class="nav" onclick="showSettingsPage()">Settings</button>
    </aside>

    <section class="dashboard-content">

      <header class="top-bar">
        <div class="title-box">Admin Menu Management</div>

        <div class="profile-menu">
          <button class="profile-btn" onclick="toggleProfile()">
            👤 “Admin’s Name” ▼
          </button>

          <div class="profile-dropdown">
            <button onclick="alert('Edit Profile clicked')">Edit Profile</button>
            <button onclick="logout()">Logout</button>
          </div>
        </div>
      </header>

      <div class="menu-actions">
        <h2>Categories</h2>

        <div class="category-actions">
          <button>⊕ Add New Category</button>
          <button>✎ Edit Category</button>
        </div>
      </div>

    <button class="category active" onclick="changeCategory('Coffees')">☕ Coffees</button>
    <button class="category" onclick="changeCategory('Non-Coffees')">🥤 Non-Coffees</button>
    <button class="category" onclick="changeCategory('Milk Tea')">🧋 Milk Tea</button>
    <button class="category" onclick="changeCategory('Foods')">🍽 Foods</button>
    <button class="category" onclick="changeCategory('Snacks')">🍪 Snacks</button>
    <button class="category" onclick="changeCategory('Dessert')">🍰 Dessert</button>

      <div class="menu-panel">

        <div class="menu-panel-top">
          <button class="add-item-btn" onclick="openCreationPage()">⊕ Add New Item</button>
          <input type="text" placeholder="Search menu..." />
        </div>

        <div class="menu-items-grid">

          <div class="menu-card">
            <div class="item-img">🖼</div>
            <h4>Caramel Macchiato</h4>
            <p>₱0.00</p>
            <div class="item-buttons">
              <button class="edit-item">Edit</button>
              <button class="delete-item">Delete</button>
            </div>
          </div>

          <div class="menu-card">
            <div class="item-img">🖼</div>
            <h4>Affogato</h4>
            <p>₱0.00</p>
            <div class="item-buttons">
              <button class="edit-item">Edit</button>
              <button class="delete-item">Delete</button>
            </div>
          </div>

          <div class="menu-card">
            <div class="item-img">🖼</div>
            <h4>Latte</h4>
            <p>₱0.00</p>
            <div class="item-buttons">
              <button class="edit-item">Edit</button>
              <button class="delete-item">Delete</button>
            </div>
          </div>

          <div class="menu-card">
            <div class="item-img">🖼</div>
            <h4>Matcha Espresso Fusion</h4>
            <p>₱0.00</p>
            <div class="item-buttons">
              <button class="edit-item">Edit</button>
              <button class="delete-item">Delete</button>
            </div>
          </div>

          <div class="menu-card">
            <div class="item-img">🖼</div>
            <h4>Spanish Latte</h4>
            <p>₱0.00</p>
            <div class="item-buttons">
              <button class="edit-item">Edit</button>
              <button class="delete-item">Delete</button>
            </div>
          </div>

          <div class="menu-card">
            <div class="item-img">🖼</div>
            <h4>Cappuccino</h4>
            <p>₱0.00</p>
            <div class="item-buttons">
              <button class="edit-item">Edit</button>
              <button class="delete-item">Delete</button>
            </div>
          </div>

          <div class="menu-card">
            <div class="item-img">🖼</div>
            <h4>Americano</h4>
            <p>₱0.00</p>
            <div class="item-buttons">
              <button class="edit-item">Edit</button>
              <button class="delete-item">Delete</button>
            </div>
          </div>

          <div class="menu-card">
            <div class="item-img">🖼</div>
            <h4>Espresso</h4>
            <p>₱0.00</p>
            <div class="item-buttons">
              <button class="edit-item">Edit</button>
              <button class="delete-item">Delete</button>
            </div>
          </div>

        </div>
      </div>

    </section>
  </div>
</section>

<!-- PRODUCT CREATION / EDIT PAGE -->
<section id="creationPage" class="page">
  <div class="admin-layout">

    <aside class="sidebar">
      <div class="side-logo">☕</div>

      <button class="nav" onclick="showDashboardPage()">Dashboard</button>
      <button class="nav" onclick="showOrderPage()">Order</button>
      <button class="nav active" onclick="showMenuPage()">Menu Management</button>
      <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
      <button class="nav" onclick="showInventoryPage()">Inventory</button>
      <button class="nav" onclick="showReportPage()">Report</button>
      <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
      <button class="nav" onclick="showUserPage()">User</button>
      <button class="nav" onclick="showSettingsPage()">Settings</button>
    </aside>

    <section class="dashboard-content">

      <header class="top-bar">
        <div class="title-box" id="creationTitle">Creation Page</div>

        <div class="profile-menu">
          <button class="profile-btn" onclick="toggleProfile()">
            👤 “Admin’s Name” ▼
          </button>

          <div class="profile-dropdown">
            <button onclick="alert('Edit Profile clicked')">Edit Profile</button>
            <button onclick="logout()">Logout</button>
          </div>
        </div>
      </header>

      <div class="creation-container">

        <div class="creation-form">

          <label>Product Name:</label>
          <input type="text" id="productName" placeholder="Name of Food/Beverages">

          <label>Category:</label>
          <select id="productCategory">
            <option>Coffees</option>
            <option>Non-Coffees</option>
            <option>Milk Tea</option>
            <option>Foods</option>
            <option>Snacks</option>
            <option>Dessert</option>
          </select>

          <label>Price:</label>
          <input type="number" id="productPrice" placeholder="Price of Food/Beverages">

          <label>Availability:</label>
          <select id="productAvailability">
            <option>Available</option>
            <option>Unavailable</option>
          </select>

          <label>Description:</label>
          <textarea id="productDescription" placeholder="Description of Food/Beverages"></textarea>

        </div>

        <div class="upload-box">
          <label>Upload Image:</label>

          <div class="image-preview">
            IMAGE
          </div>

          <div class="creation-buttons">
            <button class="cancel-product" onclick="showMenuPage()">Cancel</button>
            <button class="save-product" onclick="saveProduct()">Save Product</button>
          </div>
        </div>

      </div>

    </section>
  </div>
</section>

<!-- PROMOTIONS PAGE -->
<section id="promotionsPage" class="page">
  <div class="admin-layout">

    <aside class="sidebar">
      <div class="side-logo">☕</div>
      <button class="nav" onclick="showDashboardPage()">Dashboard</button>
      <button class="nav" onclick="showOrderPage()">Order</button>
      <button class="nav" onclick="showMenuPage()">Menu Management</button>
      <button class="nav active" onclick="showPromotionsPage()">Promotions & Discount</button>
      <button class="nav" onclick="showInventoryPage()">Inventory</button>
      <button class="nav" onclick="showReportPage()">Report</button>
      <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
      <button class="nav" onclick="showUserPage()">User</button>
      <button class="nav" onclick="showSettingsPage()">Settings</button>
    </aside>

    <section class="dashboard-content">

      <header class="top-bar">
        <div class="title-box">Admin Promotions & Discount</div>

        <div class="profile-menu">
          <button class="profile-btn" onclick="toggleProfile()">👤 “Admin’s Name” ▼</button>
        </div>
      </header>

      <button class="promo-create-btn">⊕ Create New Promotion</button>

      <div class="promo-main-layout">

        <div class="promo-left">

          <div class="promo-box">
            <h4>Set Discount Rules</h4>

            <div class="promo-form-row">
              <label>Promo Name:</label>
              <input type="text" value="Capiztahan Promo">
            </div>

            <div class="promo-form-row">
              <label>Discount Type:</label>
              <div class="promo-options two-options">
                <label><input type="radio" checked> Percentage Discount</label>
                <label><input type="radio"> Fixed Amount Discount</label>
              </div>
            </div>

            <div class="promo-form-row">
              <label>Discount Value:</label>
              <input type="text" value="20">
              <span>%</span>
            </div>

            <div class="promo-form-row">
              <label>Apply to:</label>
              <div class="promo-options three-options">
                <label><input type="radio" checked> Specific Products</label>
                <label><input type="radio"> Entire Category</label>
                <label><input type="radio"> All Items</label>
              </div>
            </div>

            <div class="promo-form-row">
              <label>Select Products:</label>
              <div class="promo-checklist">
                <label><input type="checkbox" checked> Latte</label>
                <label><input type="checkbox" checked> Cappuccino</label>
                <label><input type="checkbox" checked> Cheesecake</label>
              </div>
            </div>

            <div class="promo-form-row">
              <label>Condition:</label>
              <input type="text">
            </div>
          </div>

          <div class="promo-box validity-box">
            <h4>Set Validity Period</h4>

            <div class="validity-grid">
              <label>Start Date:</label>
              <input type="text" value="04 / 13 / 2026">

              <label>End:</label>
              <input type="text" value="04 / 29 / 2026">

              <label>Start Time:</label>
              <select>
                <option></option>
                <option>7:00 AM</option>
                <option>8:00 AM</option>
              </select>

              <label>End:</label>
              <select>
                <option></option>
                <option>5:00 PM</option>
                <option>9:00 PM</option>
              </select>
            </div>
          </div>

        </div>

        <div class="promo-right">
          <div class="current-promo-box">
            <h4>Current Promotion</h4>

            <div class="current-promo-card">
              <b>Promo Name:</b> Capiztahan Promo 20% Off<br>
              <b>Type:</b> Percentage Discount<br>
              <b>Applies to:</b> Selected Items<br>
              <b>Validity:</b> April 13, 2026 - April 27, 2026
            </div>

            <div class="current-promo-card">
              <b>Promo Name:</b> Happy Hour 15% Off<br>
              <b>Type:</b> Percentage Discount<br>
              <b>Applies to:</b> All Coffee Drinks<br>
              <b>Validity:</b> Daily 3:00 PM - 5:00 PM
            </div>

            <div class="current-promo-card">
              <b>Promo Name:</b> Coffee + Pastry Combo<br>
              <b>Type:</b> Fixed Discount<br>
              <b>Applies to:</b> 1 Coffee + 1 Pastry<br>
              <b>Validity:</b> 1 Day 7:00 AM - 9:00 PM
            </div>

            <div class="current-promo-card">
              <b>Promo Name:</b> Student Discount<br>
              <b>Type:</b> Percentage Discount<br>
              <b>Condition:</b> With valid student ID<br>
              <b>Validity:</b> Monday - Friday
            </div>
          </div>

          <button class="save-promo-btn">Save Promotion</button>
        </div>

      </div>

    </section>
  </div>
</section>

<!-- INVENTORY PAGE -->
<section id="inventoryPage" class="page">
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="side-logo">☕</div>
      <button class="nav" onclick="showDashboardPage()">Dashboard</button>
      <button class="nav" onclick="showOrderPage()">Order</button>
      <button class="nav" onclick="showMenuPage()">Menu Management</button>
      <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
      <button class="nav active" onclick="showInventoryPage()">Inventory</button>
      <button class="nav" onclick="showReportPage()">Report</button>
      <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
      <button class="nav" onclick="showUserPage()">User</button>
      <button class="nav" onclick="showSettingsPage()">Settings</button>
    </aside>

    <section class="dashboard-content">
      <header class="top-bar">
        <div class="title-box">Admin Inventory Monitor</div>
        <div class="profile-menu"><button class="profile-btn">👤 “Admin’s Name” ▼</button></div>
      </header>

      <button class="add-item-btn" onclick="showAddStockPage()">⊕ Add Stock</button>

      <div class="inventory-layout">
        <div class="panel">
          <div class="filter-row">
            <input placeholder="Search orders...">
            <select><option>All Categories</option></select>
            <button class="low-stock">🔔 Low Stock: 6</button>
          </div>

          <table>
            <tr><th>Product</th><th>Category</th><th>Stock Level</th><th>Status</th><th>Actions</th></tr>
            <tr><td>Latte</td><td>Coffee</td><td>120</td><td><span class="stock-good">In Stock</span></td><td><button class="view-btn">Edit</button></td></tr>
            <tr><td>Black Forest</td><td>Milktea</td><td>32</td><td><span class="stock-low">Low Stock: 32</span></td><td><button class="view-btn">Edit</button></td></tr>
            <tr><td>Okinawa</td><td>Milktea</td><td>5</td><td><span class="stock-low">Low Stock: 5</span></td><td><button class="view-btn">Edit</button></td></tr>
            <tr><td>Club House Sandwich</td><td>Snack</td><td>3</td><td><span class="stock-low">Low Stock: 3</span></td><td><button class="view-btn">Edit</button></td></tr>
          </table>
        </div>

        <div class="panel adjust-box">
          <h4>Adjust Stocks</h4>
          <label>Product Name:</label><input value="Black Forest">
          <label>Adjustment Type:</label><select><option>Decreased (-)</option></select>
          <label>Quantity:</label><input placeholder="Enter Quantity">
          <label>Reason:</label><select><option>Select Reason</option></select>
          <label>Date:</label><input value="Today's Date">
          <textarea placeholder="Enter notes (Optional)"></textarea>
          <button class="save-product">Apply Adjustment</button>
        </div>
      </div>
    </section>
  </div>
</section>

<!-- ADD STOCK PAGE -->
<section id="addStockPage" class="page">
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="side-logo">☕</div>

      <button class="nav" onclick="showDashboardPage()">Dashboard</button>
      <button class="nav" onclick="showOrderPage()">Order</button>
      <button class="nav" onclick="showMenuPage()">Menu Management</button>
      <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
      <button class="nav active" onclick="showInventoryPage()">Inventory</button>
      <button class="nav" onclick="showReportPage()">Report</button>
      <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
      <button class="nav" onclick="showUserPage()">User</button>
      <button class="nav" onclick="showSettingsPage()">Settings</button>
    </aside>

    <section class="dashboard-content">
      <header class="top-bar">
        <div class="title-box">Add Stock (Record Delivery)</div>

        <div class="profile-menu">
          <button class="profile-btn" onclick="toggleProfile()">👤 “Admin’s Name” ▼</button>
        </div>
      </header>

      <div class="add-stock-box">

        <div class="delivery-info">
          <div class="field-row">
            <label>Delivery Reference:</label>
            <input type="text" value="Black Forest">
          </div>

          <div class="field-row">
            <label>Supplier:</label>
            <select>
              <option>Supplier A</option>
            </select>
          </div>

          <div class="field-row">
            <label>Date Received:</label>
            <input type="text" value="03 / 28 / 2026">
          </div>

          <div class="field-row">
            <label>Received By:</label>
            <select>
              <option>Admin</option>
            </select>
          </div>
        </div>

        <div class="delivery-bottom">
          <div class="items-received">
            <h2>Items Received:</h2>

            <table>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit</th>
              </tr>

              <tr>
                <td><input value="Latte Beans"></td>
                <td><input value="50"></td>
                <td><select><option>pcs</option></select></td>
              </tr>

              <tr>
                <td><input value="Milk"></td>
                <td><input value="30"></td>
                <td><select><option>bottles</option></select></td>
              </tr>

              <tr>
                <td><input value="Syrup (Vanilla)"></td>
                <td><input value="10"></td>
                <td><select><option>bottles</option></select></td>
              </tr>

              <tr>
                <td><input value="Syrup (Caramel)"></td>
                <td><input value="10"></td>
                <td><select><option>bottles</option></select></td>
              </tr>
            </table>

            <button class="add-another-btn">⊕ Add Another Item</button>

            <p class="total-received">
              Total Item Received:
              <strong>100</strong>
            </p>
          </div>

          <div class="delivery-notes">
            <h2>Notes:</h2>
            <textarea>Morning delivery from Supplier A.</textarea>

            <div class="stock-buttons">
              <button class="cancel-stock" onclick="showInventoryPage()">Cancel</button>
              <button class="save-stock">Save Delivery</button>
            </div>
          </div>
        </div>

      </div>
    </section>
  </div>
</section>

<!-- REPORT PAGE -->
<section id="reportPage" class="page">
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="side-logo">☕</div>
      <button class="nav" onclick="showDashboardPage()">Dashboard</button>
      <button class="nav" onclick="showOrderPage()">Order</button>
      <button class="nav" onclick="showMenuPage()">Menu Management</button>
      <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
      <button class="nav" onclick="showInventoryPage()">Inventory</button>
      <button class="nav active" onclick="showReportPage()">Report</button>
      <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
      <button class="nav" onclick="showUserPage()">User</button>
      <button class="nav" onclick="showSettingsPage()">Settings</button>
    </aside>

    <section class="dashboard-content">
      <header class="top-bar">
        <div class="title-box">Admin Report Monitor</div>
        <div class="profile-menu"><button class="profile-btn">👤 “Admin’s Name” ▼</button></div>
      </header>

      <div class="filter-row">
        <input value="03 / 01 / 2026">
        <input value="03 / 31 / 2026">
        <button class="save-product">Apply Filter</button>
        <button class="cancel-product">Import</button>
        <button class="cancel-product">Export</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card"><h3>Top Sales</h3><p>₱12,450.00</p></div>
        <div class="stat-card"><h3>Total Orders</h3><p>345 orders</p></div>
        <div class="stat-card"><h3>Average Order Value</h3><p>₱36.09</p></div>
      </div>

      <div class="report-grid">
        <div class="panel chart-box">📊 Sales Overview</div>
        <div class="panel">
          <h4>Transaction History</h4>
          <div class="promo-card">Order ID: ORD-10234<br>POS System<br>₱36.00</div>
          <div class="promo-card">Order ID: ORD-10230<br>Self-Service Kiosk<br>₱250.00</div>
          <button class="save-product">View Full History</button>
        </div>
      </div>
    </section>
  </div>
</section>

<!-- AUDIT LOGS PAGE -->
<section id="auditLogsPage" class="page">
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="side-logo">☕</div>
      <button class="nav" onclick="showDashboardPage()">Dashboard</button>
      <button class="nav" onclick="showOrderPage()">Order</button>
      <button class="nav" onclick="showMenuPage()">Menu Management</button>
      <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
      <button class="nav" onclick="showInventoryPage()">Inventory</button>
      <button class="nav" onclick="showReportPage()">Report</button>
      <button class="nav active" onclick="showAuditLogsPage()">Audit Logs</button>
      <button class="nav" onclick="showUserPage()">User</button>
      <button class="nav" onclick="showSettingsPage()">Settings</button>
    </aside>

    <section class="dashboard-content">
      <header class="top-bar">
        <div class="title-box">Admin Audit Logs Monitor</div>
        <div class="profile-menu"><button class="profile-btn">👤 “Admin’s Name” ▼</button></div>
      </header>

      <div class="panel">
        <h4>Audit Log History</h4>

        <div class="filter-row">
          <select><option>All Users</option><option>Admin</option><option>Staff #1</option><option>Manager</option></select>
          <select><option>Last 30 days</option><option>Today</option><option>This Week</option></select>
          <select><option>Any Action</option><option>Login</option><option>Logout</option><option>Menu Update</option></select>
          <button class="save-product">Search</button>
        </div>

        <table>
          <tr>
            <th>Date/Time</th>
            <th>User</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
          <tr><td>03 / 23 / 2026 10:45 AM</td><td>Admin</td><td>Login</td><td>User Logged in</td></tr>
          <tr><td>03 / 23 / 2026 09:32 AM</td><td>Staff #1</td><td>Login</td><td>User Logged in via Kiosk #1</td></tr>
          <tr><td>03 / 22 / 2026 05:15 PM</td><td>Manager</td><td>Menu Update</td><td>Modified menu items</td></tr>
          <tr><td>03 / 22 / 2026 03:27 PM</td><td>Staff #2</td><td>Logout</td><td>User Logged out</td></tr>
          <tr><td>03 / 22 / 2026 08:50 AM</td><td>Staff #1</td><td>Password Change</td><td>Changed Password</td></tr>
          <tr><td>03 / 21 / 2026 06:00 PM</td><td>Admin</td><td>Promo Update</td><td>Set Promo</td></tr>
          <tr><td>03 / 20 / 2026 5:45 PM</td><td>Manager</td><td>Inventory Update</td><td>Adjusted inventory stocks</td></tr>
        </table>

        <div class="pagination">
          <button class="active-page">1</button>
          <button>2</button>
          <button>3</button>
          <button>Next</button>
        </div>
      </div>
    </section>
  </div>
</section>

<!-- USER MANAGEMENT PAGE -->
<section id="userPage" class="page">
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="side-logo">☕</div>
      <button class="nav" onclick="showDashboardPage()">Dashboard</button>
      <button class="nav" onclick="showOrderPage()">Order</button>
      <button class="nav" onclick="showMenuPage()">Menu Management</button>
      <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
      <button class="nav" onclick="showInventoryPage()">Inventory</button>
      <button class="nav" onclick="showReportPage()">Report</button>
      <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
      <button class="nav active" onclick="showUserPage()">User</button>
      <button class="nav" onclick="showSettingsPage()">Settings</button>
    </aside>

    <section class="dashboard-content">
      <header class="top-bar">
        <div class="title-box">Admin Users Monitor</div>
        <div class="profile-menu"><button class="profile-btn">👤 “Admin’s Name” ▼</button></div>
      </header>

      <div class="panel">
        <div class="user-top">
          <button class="add-item-btn">⊕ Add Staff</button>
        </div>

        <div class="filter-row">
          <select><option>All Users</option><option>Admin</option><option>Staff</option><option>Manager</option></select>
          <select><option>Active</option><option>Inactive</option></select>
          <input placeholder="Search user...">
        </div>

        <table>
          <tr>
            <th>Name</th>
            <th>User ID</th>
            <th>Roles</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>

          <tr>
            <td>John Smith</td>
            <td>A-1001</td>
            <td>Admin</td>
            <td><span class="user-active">Active</span></td>
            <td class="user-actions">✎ 🔍 <span class="toggle-on"></span></td>
          </tr>

          <tr>
            <td>Sarah Lee</td>
            <td>S-3901</td>
            <td>Staff</td>
            <td><span class="user-inactive">Inactive</span></td>
            <td class="user-actions">✎ 🔍 <span class="toggle-off"></span></td>
          </tr>

          <tr>
            <td>David Brown</td>
            <td>S-4005</td>
            <td>Staff</td>
            <td><span class="user-active">Active</span></td>
            <td class="user-actions">✎ 🔍 <span class="toggle-on"></span></td>
          </tr>

          <tr>
            <td>Lisa Turner</td>
            <td>A-2984</td>
            <td>Admin</td>
            <td><span class="user-inactive">Inactive</span></td>
            <td class="user-actions">✎ 🔍 <span class="toggle-off"></span></td>
          </tr>

          <tr>
            <td>Mark Wilson</td>
            <td>A-8701</td>
            <td>Manager</td>
            <td><span class="user-active">Active</span></td>
            <td class="user-actions">✎ 🔍 <span class="toggle-on"></span></td>
          </tr>
        </table>

        <div class="pagination">
          <button class="active-page">1</button>
          <button>2</button>
          <button>3</button>
          <button>Next</button>
        </div>
      </div>
    </section>
  </div>
</section>

<!-- SETTINGS PAGE -->
<section id="settingsPage" class="page">
  <div class="admin-layout">
    <aside class="sidebar">
      <div class="side-logo">☕</div>
      <button class="nav" onclick="showDashboardPage()">Dashboard</button>
      <button class="nav" onclick="showOrderPage()">Order</button>
      <button class="nav" onclick="showMenuPage()">Menu Management</button>
      <button class="nav" onclick="showPromotionsPage()">Promotions & Discount</button>
      <button class="nav" onclick="showInventoryPage()">Inventory</button>
      <button class="nav" onclick="showReportPage()">Report</button>
      <button class="nav" onclick="showAuditLogsPage()">Audit Logs</button>
      <button class="nav" onclick="showUserPage()">User</button>
      <button class="nav active" onclick="showSettingsPage()">Settings</button>
    </aside>

    <section class="dashboard-content">
      <header class="top-bar">
        <div class="title-box">Admin Settings Monitor</div>
        <div class="profile-menu"><button class="profile-btn">👤 “Admin’s Name” ▼</button></div>
      </header>

      <div class="panel">
        <h4>System Settings</h4>

        <div class="settings-card">
          <div class="settings-icon">💳</div>
          <div>
            <h2>Payment Method</h2>
            <p>Configure payment options...</p>
          </div>
          <button class="save-product">Configure</button>
        </div>

        <div class="settings-card">
          <div class="settings-icon">🏪</div>
          <div>
            <h2>Store Information</h2>
            <p>Add or update business name, address, contact info, operating hours...</p>
          </div>
          <button class="save-product">Manage</button>
        </div>

        <div class="settings-card">
          <div class="settings-icon">%</div>
          <div>
            <h2>Tax & Service Charges</h2>
            <p>Set up tax rates and service charges for orders...</p>
          </div>
          <button class="save-product">Configure</button>
        </div>

        <div class="settings-card">
          <div class="settings-icon">⚙</div>
          <div>
            <h2>System Preferences</h2>
            <p>Customize system preference...</p>
          </div>
          <button class="save-product">Manage</button>
        </div>
      </div>
    </section>
  </div>
</section>

</main>

<script src="script.js"></script>
</body>
</html>