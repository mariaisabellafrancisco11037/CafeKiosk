let order = [];

// =======================
// CATEGORY DATA (30 EACH)
// =======================

const menuData = {
  coffee: Array.from({ length: 30 }, (_, i) => ({
    name: `Coffee ${i + 1}`,
    price: 80 + (i % 5) * 10
  })),

  "non-coffee": Array.from({ length: 30 }, (_, i) => ({
    name: `Non Coffee ${i + 1}`,
    price: 70 + (i % 5) * 10
  })),

  milktea: Array.from({ length: 30 }, (_, i) => ({
    name: `Milk Tea ${i + 1}`,
    price: 90 + (i % 5) * 10
  })),

  food: Array.from({ length: 30 }, (_, i) => ({
    name: `Food Item ${i + 1}`,
    price: 120 + (i % 5) * 20
  })),

  snack: Array.from({ length: 30 }, (_, i) => ({
    name: `Snack ${i + 1}`,
    price: 60 + (i % 5) * 10
  })),

  dessert: Array.from({ length: 30 }, (_, i) => ({
    name: `Dessert ${i + 1}`,
    price: 100 + (i % 5) * 15
  }))
};


// =======================
// CATEGORY SWITCH
// =======================

function selectCategory(category, btn) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  document.getElementById("categoryTitle").innerText = category;
  document.getElementById("categoryIcon").src = `../Assets/images/${category}.png`;

  renderMenu(category);
}


// =======================
// RENDER MENU GRID
// =======================

function renderMenu(category) {
  const grid = document.getElementById("menuGrid");
  grid.innerHTML = "";

  menuData[category].forEach(item => {
    grid.innerHTML += `
      <div class="menu-card">
        <div class="menu-img"></div>
        <h4>${item.name}</h4>
        <p>₱${item.price}</p>
        <button onclick="addItem('${item.name}', ${item.price})">
          Add
        </button>
      </div>
    `;
  });
}


// =======================
// ORDER SYSTEM (YOUR CODE)
// =======================

function addItem(name, price) {
  const existing = order.find(item => item.name === name);

  if (existing) {
    existing.qty++;
  } else {
    order.push({ name, price, qty: 1 });
  }

  renderOrder();

  // vibration feedback only
  if (navigator.vibrate) navigator.vibrate(30);
}


function renderOrder() {
  const list = document.getElementById("orderList");
  list.innerHTML = "";

  order.forEach((item, index) => {
    list.innerHTML += `
      <div class="order-item">
        <strong>${item.name}</strong> - ₱${item.price}
        <div class="qty-controls">
          <button onclick="changeQty(${index}, -1)">-</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${index}, 1)">+</button>
        </div>
      </div>
    `;
  });
}


function changeQty(index, change) {
  order[index].qty += change;

  if (order[index].qty <= 0) {
    order.splice(index, 1);
  }

  renderOrder();
}


function confirmOrder() {
  if (order.length === 0) {
    alert("No items selected.");
    return;
  }

  localStorage.setItem("order", JSON.stringify(order));
  window.location.href = "checkout.html";
}


// =======================
// DEFAULT LOAD
// =======================

window.onload = () => {
  const firstBtn = document.querySelector(".nav-btn");
  if (firstBtn) {
    selectCategory("coffee", firstBtn);
  }
};