let currentRole = "";
let selectedOrderId = "";
let currentCategory = "Coffees";

const accounts = {
  Admin: {
    userId: "auser123",
    password: "apass456"
  },
  Staff: {
    userId: "suser123",
    password: "spass456"
  }
};

const orders = [
  {
    id: "#1052",
    customer: "John Smith",
    source: "POS",
    time: "12:15 PM",
    serving: "Takeout",
    status: "Pending",
    items: "Latte x2",
    total: "250.00"
  },
  {
    id: "#1051",
    customer: "Emily Johnson",
    source: "Kiosk",
    time: "12:10 PM",
    serving: "Dine In",
    status: "Preparing",
    items: "Cookies & Cream Milktea x1, Club Sandwich x1",
    total: "145.00"
  },
  {
    id: "#1050",
    customer: "Emily Johnson",
    source: "POS",
    time: "11:45 AM",
    serving: "Dine In",
    status: "Preparing",
    items: "Iced Americano x1, Muffin x1",
    total: "180.00"
  },
  {
    id: "#1049",
    customer: "Michael Brown",
    source: "POS",
    time: "11:20 AM",
    serving: "Dine In",
    status: "Completed",
    items: "Espresso x2",
    total: "120.00"
  },
  {
    id: "#1053",
    customer: "Maria Santos",
    source: "Kiosk",
    time: "12:35 PM",
    serving: "Takeout",
    status: "Pending",
    items: "Caramel Macchiato x1, Cheese Sandwich x1",
    total: "260.00"
  }
];

const menuItems = {
  Coffees: [
    "Caramel Macchiato",
    "Affogato",
    "Latte",
    "Matcha Espresso Fusion",
    "Spanish Latte",
    "Cappuccino",
    "Americano",
    "Espresso"
  ],

  "Non-Coffees": [
    "Hot Chocolate",
    "Iced Chocolate",
    "Strawberry Smoothie",
    "Mango Smoothie",
    "Matcha Latte",
    "Lemonade",
    "Blueberry Soda",
    "Green Apple Soda"
  ],

  "Milk Tea": [
    "Classic Milk Tea",
    "Wintermelon Milk Tea",
    "Okinawa Milk Tea",
    "Cookies & Cream Milk Tea",
    "Taro Milk Tea",
    "Brown Sugar Milk Tea",
    "Matcha Milk Tea",
    "Chocolate Milk Tea"
  ],

  Foods: [
    "Club Sandwich",
    "Chicken Sandwich",
    "Tuna Sandwich",
    "Burger",
    "Carbonara",
    "Spaghetti",
    "Chicken Rice Meal",
    "Nachos"
  ],

  Snacks: [
    "French Fries",
    "Onion Rings",
    "Mozzarella Sticks",
    "Nuggets",
    "Siomai",
    "Takoyaki",
    "Waffles",
    "Pancakes"
  ],

  Dessert: [
    "Cheesecake",
    "Chocolate Cake",
    "Caramel Fudge Cake",
    "Blueberry Muffin",
    "Chocolate Chip Muffin",
    "Brownies",
    "Cookies",
    "Cupcake"
  ]
};

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.remove("active");
  });

  const page = document.getElementById(pageId);

  if (page) {
    page.classList.add("active");
  }

  closeAllDropdowns();
}

function showLogin(role) {
  currentRole = role;

  document.getElementById("selectedRole").textContent = role;
  document.getElementById("userId").value = "";
  document.getElementById("password").value = "";
  document.getElementById("message").textContent = "";

  showPage("loginPage");
}

function login(event) {
  event.preventDefault();

  const userId = document.getElementById("userId").value.trim();
  const password = document.getElementById("password").value.trim();
  const message = document.getElementById("message");

  const account = accounts[currentRole];

  if (!account) {
    message.textContent = "Please select a role first.";
    return;
  }

  if (userId === account.userId && password === account.password) {
    if (currentRole === "Admin") {
      showDashboardPage();
    } else {
      alert("Staff dashboard will open here.");
    }
  } else {
    message.textContent = "Invalid User ID or Password.";
  }
}

function showDashboardPage() {
  showPage("dashboardPage");
}

function showOrderPage() {
  showPage("orderPage");
  renderOrders();
  if (orders.length > 0) {
    viewOrder(orders[0].id);
  } else {
    clearPreview();
  }
}

function showMenuPage() {
  showPage("menuPage");
  renderMenuItems();
}

function showPromotionsPage() {
  showPage("promotionsPage");
}

function showInventoryPage() {
  showPage("inventoryPage");
}

function showReportPage() {
  showPage("reportPage");
}

function showAuditLogsPage() {
  showPage("auditLogsPage");
}

function showUserPage() {
  showPage("userPage");
}

function showSettingsPage() {
  showPage("settingsPage");
}

function showAddStockPage() {
  showPage("addStockPage");
}

/* ORDER MONITORING */

function getFilteredOrders() {
  const statusFilter = document.querySelector(".order-toolbar select:nth-child(1)")?.value || "All Status";
  const sourceFilter = document.querySelector(".order-toolbar select:nth-child(2)")?.value || "All Source";
  const serviceFilter = document.querySelector(".order-toolbar select:nth-child(3)")?.value || "Service Type";
  const timeFilter = document.querySelector(".order-toolbar select:nth-child(4)")?.value || "Time";
  const searchText = document.querySelector(".order-toolbar input")?.value.toLowerCase() || "";

  let filteredOrders = [...orders];

  if (statusFilter !== "All Status") {
    filteredOrders = filteredOrders.filter(order => order.status === statusFilter);
  }

  if (sourceFilter !== "All Source") {
    filteredOrders = filteredOrders.filter(order => {
      if (sourceFilter === "POS System") return order.source === "POS";
      return order.source === sourceFilter;
    });
  }

  if (serviceFilter !== "Service Type") {
    filteredOrders = filteredOrders.filter(order => order.serving === serviceFilter);
  }

  if (searchText !== "") {
    filteredOrders = filteredOrders.filter(order =>
      order.id.toLowerCase().includes(searchText) ||
      order.customer.toLowerCase().includes(searchText) ||
      order.status.toLowerCase().includes(searchText) ||
      order.source.toLowerCase().includes(searchText) ||
      order.serving.toLowerCase().includes(searchText)
    );
  }

  if (timeFilter === "Latest") {
    filteredOrders.reverse();
  }

  return filteredOrders;
}

function renderOrders() {
  const table = document.querySelector(".live-orders table");

  if (!table) return;

  const filteredOrders = getFilteredOrders();

  updateStatusCounts(filteredOrders);

  table.innerHTML = `
    <tr>
      <th>Order ID</th>
      <th>Customer</th>
      <th>Time</th>
      <th>Source</th>
      <th>Serving</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  if (filteredOrders.length === 0) {
    table.innerHTML += `
      <tr>
        <td colspan="7">No orders found.</td>
      </tr>
    `;
    return;
  }

  filteredOrders.forEach(order => {
    table.innerHTML += `
      <tr>
        <td>${order.id}</td>
        <td>${order.customer}</td>
        <td>${order.time}</td>
        <td>${order.source}</td>
        <td>${order.serving}</td>

        <td>
          <span class="status ${order.status.toLowerCase()}">
            ${order.status}
          </span>
        </td>

        <td class="action-buttons">
          <button class="view-btn" onclick="viewOrder('${order.id}')">
            View
          </button>

          <button class="void-btn" onclick="openVoidModal('${order.id}', '${order.customer}', '${order.items}', '${order.total}')">
            ✕
          </button>
        </td>
      </tr>
    `;
  });
}

function updateStatusCounts(orderList = orders) {
  const pendingCount = orderList.filter(order => order.status === "Pending").length;
  const preparingCount = orderList.filter(order => order.status === "Preparing").length;
  const completedCount = orderList.filter(order => order.status === "Completed").length;

  const pendingBox = document.querySelector(".pending-box span");
  const preparingBox = document.querySelector(".preparing-box span");
  const completedBox = document.querySelector(".completed-box span");

  if (pendingBox) pendingBox.textContent = pendingCount;
  if (preparingBox) preparingBox.textContent = preparingCount;
  if (completedBox) completedBox.textContent = completedCount;
}

function setupFilters() {
  const filters = document.querySelectorAll(".order-toolbar select");
  const searchInput = document.querySelector(".order-toolbar input");

  filters.forEach(filter => {
    filter.addEventListener("change", renderOrders);
  });

  if (searchInput) {
    searchInput.addEventListener("input", renderOrders);
  }
}

function viewOrder(id) {
  const order = orders.find(order => order.id === id);
  const orderDetails = document.getElementById("orderDetails");

  if (!order || !orderDetails) return;

  selectedOrderId = id;

  orderDetails.innerHTML = `
    <div class="order-info">
      <h2>Order ${order.id}</h2>

      <div class="order-row">
        <b>Customer:</b>
        <span>${order.customer}</span>
      </div>

      <div class="order-row">
        <b>Source:</b>
        <span>${order.source}</span>
      </div>

      <div class="order-row">
        <b>Time:</b>
        <span>${order.time}</span>
      </div>

      <div class="order-row">
        <b>Serving:</b>
        <span>${order.serving}</span>
      </div>

      <div class="order-row">
        <b>Status:</b>
        <select id="statusDropdown" class="status-dropdown">
          <option value="Pending" ${order.status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Preparing" ${order.status === "Preparing" ? "selected" : ""}>Preparing</option>
          <option value="Completed" ${order.status === "Completed" ? "selected" : ""}>Completed</option>
        </select>
      </div>

      <div class="order-items">
        <b>Item:</b>
        <p>${order.items}</p>
      </div>

      <div class="order-total">
        Total: ₱${order.total}
      </div>

      <div class="preview-buttons">
        <button class="update-btn" onclick="updateOrderStatus()">Update Status</button>
        <button class="close-btn" onclick="clearPreview()">Close</button>
      </div>
    </div>
  `;
}

function updateOrderStatus() {
  const statusDropdown = document.getElementById("statusDropdown");
  const order = orders.find(order => order.id === selectedOrderId);

  if (!statusDropdown || !order) return;

  order.status = statusDropdown.value;

  renderOrders();
  viewOrder(selectedOrderId);
}

function clearPreview() {
  selectedOrderId = "";

  const orderDetails = document.getElementById("orderDetails");

  if (!orderDetails) return;

  orderDetails.innerHTML = `
    <div class="empty-preview">
      <p>📄</p>
      <p>Select an order by clicking <strong>View</strong>.</p>
    </div>
  `;
}

function openVoidModal(id, customer, items, total) {
  const modal = document.getElementById("voidModal");

  if (!modal) return;

  modal.classList.add("show");

  document.getElementById("modalOrderId").innerText = `Order ${id}`;

  document.getElementById("modalItems").innerHTML = `
    <p><strong>Customer:</strong> ${customer}</p>
    <p><strong>Items:</strong> ${items}</p>
    <p><strong>Total:</strong> ₱${total}</p>
  `;
}

function closeVoidModal() {
  const modal = document.getElementById("voidModal");

  if (modal) {
    modal.classList.remove("show");
  }
}

/* MENU MANAGEMENT */

function changeCategory(categoryName) {
  currentCategory = categoryName;

  document.querySelectorAll(".category").forEach(button => {
    button.classList.remove("active");
  });

  const clickedButton = Array.from(document.querySelectorAll(".category"))
    .find(button => button.textContent.includes(categoryName));

  if (clickedButton) {
    clickedButton.classList.add("active");
  }

  renderMenuItems();
}

function renderMenuItems() {
  const menuGrid = document.querySelector(".menu-items-grid");

  if (!menuGrid) return;

  const searchInput = document.querySelector(".menu-panel-top input");
  const searchText = searchInput ? searchInput.value.toLowerCase() : "";

  let items = menuItems[currentCategory] || [];

  if (searchText !== "") {
    items = items.filter(item => item.toLowerCase().includes(searchText));
  }

  menuGrid.innerHTML = "";

  if (items.length === 0) {
    menuGrid.innerHTML = `<p>No menu items found.</p>`;
    return;
  }

  items.forEach(item => {
    menuGrid.innerHTML += `
      <div class="menu-card">
        <div class="item-img">🖼</div>
        <h4>${item}</h4>
        <p>₱0.00</p>

        <div class="item-buttons">
            <button class="edit-item" onclick="openEditPage('${item}')">Edit</button>
            <button class="delete-item">Delete</button>
        </div>
    `;
  });
}

function setupMenuSearch() {
  const searchInput = document.querySelector(".menu-panel-top input");

  if (searchInput) {
    searchInput.addEventListener("input", renderMenuItems);
  }
}

/* PROFILE */

function toggleProfile() {
  const dropdowns = document.querySelectorAll(".profile-dropdown");

  dropdowns.forEach(dropdown => {
    dropdown.classList.toggle("show");
  });
}

function closeAllDropdowns() {
  document.querySelectorAll(".profile-dropdown").forEach(dropdown => {
    dropdown.classList.remove("show");
  });
}

window.addEventListener("click", function(event) {
  if (!event.target.closest(".profile-menu")) {
    closeAllDropdowns();
  }
});

/* LOGIN HELPERS */

function forgotPassword() {
  document.getElementById("message").textContent =
    "Please contact the system administrator.";
}

function goBack() {
  showPage("rolePage");
}

function logout() {
  currentRole = "";
  closeAllDropdowns();
  clearPreview();
  closeVoidModal();
  showPage("rolePage");
}

document.addEventListener("DOMContentLoaded", function() {
  setupFilters();
  setupMenuSearch();
  updateStatusCounts();
  renderMenuItems();
});

function openCreationPage() {
  document.getElementById("creationTitle").textContent = "Creation Page";

  document.getElementById("productName").value = "";
  document.getElementById("productCategory").value = currentCategory;
  document.getElementById("productPrice").value = "";
  document.getElementById("productAvailability").value = "Available";
  document.getElementById("productDescription").value = "";

  showPage("creationPage");
}

function openEditPage(productName) {
  document.getElementById("creationTitle").textContent = "Edit Product Page";

  document.getElementById("productName").value = productName;
  document.getElementById("productCategory").value = currentCategory;
  document.getElementById("productPrice").value = "0";
  document.getElementById("productAvailability").value = "Available";
  document.getElementById("productDescription").value =
    `Description of ${productName}`;

  showPage("creationPage");
}

function saveProduct() {
  const name = document.getElementById("productName").value.trim();
  const category = document.getElementById("productCategory").value;

  if (name === "") {
    alert("Please enter product name.");
    return;
  }

  if (!menuItems[category].includes(name)) {
    menuItems[category].push(name);
  }

  currentCategory = category;
  showMenuPage();
}