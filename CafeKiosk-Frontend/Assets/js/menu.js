let order = [];
let selectedPaymentMethod = 'Cash';
let currentCategory = 'coffee';
let pendingItem = null;

const customizationConfig = {
  coffee: [
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'radio',
      options: [
        { label: 'Hot', value: 'Hot', price: 0 },
        { label: 'Iced', value: 'Iced', price: 0 }
      ]
    },
    {
      key: 'size',
      label: 'Size',
      type: 'radio',
      options: [
        { label: 'Tall', value: 'Tall', price: 0 },
        { label: 'Grande', value: 'Grande', price: 20 },
        { label: 'Venti', value: 'Venti', price: 40 }
      ]
    },
    {
      key: 'milk',
      label: 'Milk',
      type: 'select',
      options: [
        { label: 'Whole', value: 'Whole', price: 0 },
        { label: 'Skim', value: 'Skim', price: 0 },
        { label: 'Almond', value: 'Almond', price: 15 },
        { label: 'Oat', value: 'Oat', price: 20 }
      ]
    },
    {
      key: 'addOns',
      label: 'Add-ons',
      type: 'checkbox',
      options: [
        { label: 'Extra shot', value: 'Extra shot', price: 25 },
        { label: 'Vanilla syrup', value: 'Vanilla syrup', price: 20 },
        { label: 'Caramel syrup', value: 'Caramel syrup', price: 20 },
        { label: 'Whipped cream', value: 'Whipped cream', price: 15 }
      ]
    }
  ],
  'non-coffee': [
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'radio',
      options: [
        { label: 'Hot', value: 'Hot', price: 0 },
        { label: 'Iced', value: 'Iced', price: 0 }
      ]
    },
    {
      key: 'size',
      label: 'Size',
      type: 'radio',
      options: [
        { label: 'Small', value: 'Small', price: 0 },
        { label: 'Regular', value: 'Regular', price: 15 },
        { label: 'Large', value: 'Large', price: 25 }
      ]
    },
    {
      key: 'flavor',
      label: 'Flavor',
      type: 'select',
      options: [
        { label: 'Classic', value: 'Classic', price: 0 },
        { label: 'Hazelnut', value: 'Hazelnut', price: 20 },
        { label: 'Mocha', value: 'Mocha', price: 20 }
      ]
    },
    {
      key: 'addOns',
      label: 'Add-ons',
      type: 'checkbox',
      options: [
        { label: 'Boba', value: 'Boba', price: 25 },
        { label: 'Pearls', value: 'Pearls', price: 15 }
      ]
    }
  ],
  milktea: [
    {
      key: 'sweetness',
      label: 'Sweetness',
      type: 'select',
      options: [
        { label: 'Regular', value: 'Regular', price: 0 },
        { label: 'Less sugar', value: 'Less sugar', price: 0 },
        { label: 'Half sugar', value: 'Half sugar', price: 0 },
        { label: 'No sugar', value: 'No sugar', price: 0 }
      ]
    },
    {
      key: 'ice',
      label: 'Ice Level',
      type: 'radio',
      options: [
        { label: 'Regular', value: 'Regular', price: 0 },
        { label: 'Less ice', value: 'Less ice', price: 0 },
        { label: 'No ice', value: 'No ice', price: 0 }
      ]
    },
    {
      key: 'toppings',
      label: 'Toppings',
      type: 'checkbox',
      options: [
        { label: 'Pearls', value: 'Pearls', price: 15 },
        { label: 'Grass jelly', value: 'Grass jelly', price: 15 },
        { label: 'Pudding', value: 'Pudding', price: 20 }
      ]
    }
  ],
  food: [
    {
      key: 'side',
      label: 'Side',
      type: 'select',
      options: [
        { label: 'No side', value: 'No side', price: 0 },
        { label: 'Fries', value: 'Fries', price: 35 },
        { label: 'Salad', value: 'Salad', price: 35 }
      ]
    },
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'radio',
      options: [
        { label: 'Hot', value: 'Hot', price: 0 },
        { label: 'Warm', value: 'Warm', price: 0 }
      ]
    },
    {
      key: 'extras',
      label: 'Extras',
      type: 'checkbox',
      options: [
        { label: 'Cheese', value: 'Cheese', price: 20 },
        { label: 'Egg', value: 'Egg', price: 15 }
      ]
    }
  ],
  snack: [
    {
      key: 'pack',
      label: 'Pack',
      type: 'radio',
      options: [
        { label: 'Single', value: 'Single', price: 0 },
        { label: 'Bundle', value: 'Bundle', price: 20 }
      ]
    },
    {
      key: 'addOns',
      label: 'Add-ons',
      type: 'checkbox',
      options: [
        { label: 'Dip sauce', value: 'Dip sauce', price: 10 },
        { label: 'Extra crisp', value: 'Extra crisp', price: 15 }
      ]
    }
  ],
  dessert: [
    {
      key: 'serve',
      label: 'Serve Style',
      type: 'select',
      options: [
        { label: 'Single', value: 'Single', price: 0 },
        { label: 'Plated', value: 'Plated', price: 10 }
      ]
    },
    {
      key: 'toppings',
      label: 'Toppings',
      type: 'checkbox',
      options: [
        { label: 'Chocolate drizzle', value: 'Chocolate drizzle', price: 15 },
        { label: 'Fruit', value: 'Fruit', price: 20 }
      ]
    }
  ]
};

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
  currentCategory = category;
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
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.addEventListener('click', () => showItemModal(item.name, item.price, category));
    card.innerHTML = `
      <div class="menu-img"></div>
      <h4>${item.name}</h4>
      <p>₱${item.price}</p>
    `;
    grid.appendChild(card);
  });
}


// =======================
// ORDER SYSTEM (YOUR CODE)
// =======================

function addItem(name, price, customizations = [], customizationCost = 0, category = 'coffee', qty = 1) {
  const key = `${name}|${category}|${customizations.join('|')}`;
  const existing = order.find(item => item.key === key);

  if (existing) {
    existing.qty += qty;
  } else {
    order.push({ name, price, qty, customizations, customizationCost, category, key });
  }

  renderOrder();

  // vibration feedback only
  if (navigator.vibrate) navigator.vibrate(30);
}

function showItemModal(name, price, category) {
  pendingItem = {
    name,
    price,
    category,
    selectedOptions: {}
  };

  pendingItem.qty = 1;
  const categoryLabel = category.replace(/-/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
  document.getElementById('itemModalTitle').innerText = `${name}`;
  document.getElementById('itemModalMessage').innerText = `Select your options for this ${categoryLabel}.`;
  document.getElementById('itemModalName').innerText = name;
  document.getElementById('itemModalPrice').innerText = `₱${price}`;
  document.getElementById('itemModalCategory').innerText = categoryLabel;
  document.getElementById('itemModalQty').innerText = pendingItem.qty;
  document.getElementById('itemModalQtyDisplay').innerText = pendingItem.qty;
  document.getElementById('itemModalTotal').innerText = price;

  const modalBox = document.getElementById('itemModalBox');
  modalBox.className = `modal-box category-${category}`;

  renderItemModalOptions();
  document.getElementById('itemModal').classList.add('active');
}

function renderItemModalOptions() {
  const container = document.getElementById('itemModalOptions');
  container.innerHTML = '';
  const fields = customizationConfig[pendingItem.category] || [];

  fields.forEach(field => {
    const fieldEl = document.createElement('div');
    fieldEl.className = 'modal-field';

    const labelEl = document.createElement('div');
    labelEl.className = 'modal-field-label';
    labelEl.innerText = field.label;
    fieldEl.appendChild(labelEl);

    if (field.type === 'select') {
      const select = document.createElement('select');
      select.className = 'modal-select';
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = `${opt.label}${opt.price ? ` (+₱${opt.price})` : ''}`;
        select.appendChild(option);
      });
      select.value = field.options[0].value;
      pendingItem.selectedOptions[field.key] = select.value;
      select.addEventListener('change', () => {
        pendingItem.selectedOptions[field.key] = select.value;
        updateItemModalTotal();
      });
      fieldEl.appendChild(select);
    }

    if (field.type === 'radio') {
      const group = document.createElement('div');
      group.className = 'modal-radio-group';
      field.options.forEach((opt, index) => {
        const optionLabel = document.createElement('label');
        optionLabel.className = 'modal-option';
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = field.key;
        input.value = opt.value;
        input.checked = index === 0;
        if (input.checked) pendingItem.selectedOptions[field.key] = opt.value;
        input.addEventListener('change', () => {
          pendingItem.selectedOptions[field.key] = opt.value;
          updateItemModalTotal();
        });
        const span = document.createElement('span');
        span.innerText = `${opt.label}${opt.price ? ` (+₱${opt.price})` : ''}`;
        optionLabel.appendChild(input);
        optionLabel.appendChild(span);
        group.appendChild(optionLabel);
      });
      fieldEl.appendChild(group);
    }

    if (field.type === 'checkbox') {
      const group = document.createElement('div');
      group.className = 'modal-checkbox-group';
      pendingItem.selectedOptions[field.key] = [];
      field.options.forEach(opt => {
        const optionLabel = document.createElement('label');
        optionLabel.className = 'modal-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = opt.value;
        input.addEventListener('change', () => {
          const selected = pendingItem.selectedOptions[field.key];
          if (input.checked) {
            selected.push(opt.value);
          } else {
            const index = selected.indexOf(opt.value);
            if (index > -1) selected.splice(index, 1);
          }
          updateItemModalTotal();
        });
        const span = document.createElement('span');
        span.innerText = `${opt.label}${opt.price ? ` (+₱${opt.price})` : ''}`;
        optionLabel.appendChild(input);
        optionLabel.appendChild(span);
        group.appendChild(optionLabel);
      });
      fieldEl.appendChild(group);
    }

    container.appendChild(fieldEl);
  });
}

function updateItemModalTotal() {
  const fields = customizationConfig[pendingItem.category] || [];
  let total = pendingItem.price;

  fields.forEach(field => {
    const selected = pendingItem.selectedOptions[field.key];
    if (!selected) return;
    if (field.type === 'checkbox') {
      selected.forEach(value => {
        const opt = field.options.find(opt => opt.value === value);
        if (opt) total += opt.price;
      });
    } else {
      const opt = field.options.find(opt => opt.value === selected);
      if (opt) total += opt.price;
    }
  });

  total = total * (pendingItem.qty || 1);
  document.getElementById('itemModalQty').innerText = pendingItem.qty;
  document.getElementById('itemModalQtyDisplay').innerText = pendingItem.qty;
  document.getElementById('itemModalTotal').innerText = total;
}

function updateItemQuantity(change) {
  if (!pendingItem) return;
  pendingItem.qty = Math.max(1, (pendingItem.qty || 1) + change);
  updateItemModalTotal();
}

function confirmAddItem() {
  if (!pendingItem) return;

  const fields = customizationConfig[pendingItem.category] || [];
  const customizations = [];
  let customizationCost = 0;

  fields.forEach(field => {
    const selected = pendingItem.selectedOptions[field.key];
    if (!selected) return;
    if (field.type === 'checkbox' && selected.length > 0) {
      const selectedOptions = field.options.filter(opt => selected.includes(opt.value));
      selectedOptions.forEach(opt => { customizationCost += opt.price; });
      customizations.push(`${field.label}: ${selectedOptions.map(opt => opt.label).join(', ')}`);
    } else {
      const opt = field.options.find(opt => opt.value === selected);
      if (opt) {
        customizationCost += opt.price;
        customizations.push(`${field.label}: ${opt.label}`);
      }
    }
  });

  addItem(pendingItem.name, pendingItem.price, customizations, customizationCost, pendingItem.category, pendingItem.qty);
  pendingItem = null;
  closeItemModal();
}

function closeItemModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('itemModal').classList.remove('active');
  pendingItem = null;
}

function renderOrder() {
  const list = document.getElementById("orderList");
  list.innerHTML = "";

  let subtotal = 0;

  order.forEach((item, index) => {
    const customText = item.customizations && item.customizations.length
      ? `<ul>${item.customizations.map(opt => `<li>${opt}</li>`).join('')}</ul>`
      : '<span>None</span>';

    const itemTotal = (item.price + (item.customizationCost || 0)) * item.qty;
    subtotal += itemTotal;

    list.innerHTML += `
      <div class="order-item">
        <div class="order-name">${item.name}</div>
        <div class="order-addons">${customText}</div>
        <div class="order-line">
          <span>Qty: ${item.qty}</span>
          <span class="order-price">₱${itemTotal}</span>
        </div>
        <div class="qty-controls">
          <button class="qty-decrease" onclick="changeQty(${index}, -1)">-</button>
          <span>${item.qty}</span>
          <button class="qty-increase" onclick="changeQty(${index}, 1)">+</button>
        </div>
      </div>
    `;
  });

  document.getElementById('subtotalAmount').innerText = `₱${subtotal}`;
  document.getElementById('totalAmount').innerText = `₱${subtotal}`;
}

function updatePaymentMethod(value) {
  selectedPaymentMethod = value;
}

function showOrderModal() {
  if (order.length === 0) {
    alert('Please add items before confirming.');
    return;
  }

  const categoryInfo = {
    coffee: {
      title: 'Confirm Coffee Order',
      message: 'This order will be recorded under Coffee. Review before saving.',
      label: 'Coffee',
      icon: '../Assets/images/coffee.png',
      theme: '#7baa8f'
    },
    'non-coffee': {
      title: 'Confirm Non-Coffee Order',
      message: 'Record this non-coffee sale for finance tracking.',
      label: 'Non-Coffee',
      icon: '../Assets/images/non-coffee.png',
      theme: '#c68b3d'
    },
    milktea: {
      title: 'Confirm Milk Tea Order',
      message: 'Record this milk tea order for daily totals.',
      label: 'Milk Tea',
      icon: '../Assets/images/milktea.png',
      theme: '#d48fb4'
    },
    food: {
      title: 'Confirm Food Order',
      message: 'Record this food order separately for kitchen tracking.',
      label: 'Food',
      icon: '../Assets/images/food.png',
      theme: '#d9684a'
    },
    snack: {
      title: 'Confirm Snack Order',
      message: 'Record this snack sale for inventory and finance.',
      label: 'Snack',
      icon: '../Assets/images/snack.png',
      theme: '#8f6d4b'
    },
    dessert: {
      title: 'Confirm Dessert Order',
      message: 'Record this dessert order for reporting.',
      label: 'Dessert',
      icon: '../Assets/images/dessert.png',
      theme: '#a96eb5'
    }
  };

  const info = categoryInfo[currentCategory] || categoryInfo.coffee;
  document.getElementById('modalTitle').innerText = 'Do you want to confirm order?';
  document.getElementById('modalMessage').innerText = info.message;
  document.getElementById('modalIcon').src = info.icon;
  document.getElementById('modalTotalAmount').innerText = document.getElementById('totalAmount').innerText;

  const orderItemsHtml = order.map(item => {
    const customizationHtml = item.customizations && item.customizations.length
      ? `<ul class="modal-order-addons">${item.customizations.map(opt => `<li>${opt}</li>`).join('')}</ul>`
      : '<div class="modal-order-none">None</div>';

    const itemTotal = (item.price + (item.customizationCost || 0)) * item.qty;
    return `
      <div class="modal-order-item">
        <div class="modal-order-header">
          <span class="modal-order-name">${item.name}</span>
          <span class="modal-order-total">₱${itemTotal}</span>
        </div>
        <div class="modal-order-meta">Qty: ${item.qty}</div>
        ${customizationHtml}
      </div>
    `;
  }).join('');
  document.getElementById('modalOrderItems').innerHTML = orderItemsHtml;

  const modalBox = document.getElementById('orderModalBox');
  modalBox.className = `modal-box category-${currentCategory}`;

  document.getElementById('orderModal').classList.add('active');
}

function closeOrderModal(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById('orderModal').classList.remove('active');
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
  localStorage.setItem("paymentMethod", selectedPaymentMethod);
  window.location.href = "checkout.html";
}

function cancelOrder() {
  order = [];
  selectedPaymentMethod = 'Cash';
  document.getElementById('paymentMethod').value = 'Cash';
  renderOrder();
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