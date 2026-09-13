// =====================================================
// CAFEKIOSK - MENU.JS
// =====================================================

let order = [];
let selectedPaymentMethod = "Cash";
let currentCategory = "coffee";
let pendingItem = null;


// =====================================================
// CAFE CONFIGURATION
// =====================================================
// Change this for each cafe/kiosk later.
//
// Examples:
// cafe-1
// cafe-2
// cafe-3
// cafe-4
// cafe-5

const CAFE_ID =
  String(
    localStorage.getItem("cafeId") ||
    "cafe-1"
  ).trim() ||
  "cafe-1";

localStorage.setItem(
  "cafeId",
  CAFE_ID
);


// =====================================================
// BACKEND CONFIGURATION
// =====================================================

// The frontend and backend are being served by the
// same Express server.
//
// Because of that, we do NOT need to hard-code the
// laptop IP address here.

function resolveBackendOrigin() {

  if (
    window.location.port ===
    "5000"
  ) {
    return window.location.origin;
  }

  const protocol =
    window.location.protocol === "https:"
      ? "https:"
      : "http:";

  const hostname =
    window.location.hostname ||
    "127.0.0.1";

  return `${protocol}//${hostname}:5000`;
}


const API_URL =
  resolveBackendOrigin();


const LOCAL_ORDER_KEY =
  "cafe_orders";



// =========================================================
// SHARED MENU AVAILABILITY
// =========================================================

const MENU_AVAILABILITY_API =
    `${API_URL}/api/menu-availability`;

let remoteAvailabilityIndex =
    new Map();

let localAvailabilityIndex =
    new Map();

function normalizeManagedCategory(value) {
    const key =
        String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[_\s]+/g, "-");

    const map = {
        "coffee": "coffee",
        "coffees": "coffee",
        "non-coffee": "non-coffee",
        "non-coffees": "non-coffee",
        "noncoffee": "non-coffee",
        "milk-tea": "milktea",
        "milktea": "milktea",
        "food": "food",
        "foods": "food",
        "snack": "snack",
        "snacks": "snack",
        "dessert": "dessert",
        "desserts": "dessert"
    };

    return map[key] || key;
}

function managedAvailabilityKey(name, category) {
    return `${normalizeManagedCategory(category)}|${String(name || "").trim().toLowerCase()}`;
}

function rebuildLocalAvailabilityIndex() {
    const next =
        new Map();

    try {
        const saved =
            JSON.parse(
                localStorage.getItem(
                    "cafe_products"
                ) ||
                "[]"
            );

        if (
            Array.isArray(
                saved
            )
        ) {
            saved.forEach(
                product => {
                    next.set(
                        managedAvailabilityKey(
                            product.name,
                            product.category
                        ),
                        product.availability ===
                        "Unavailable"
                            ? "Unavailable"
                            : "Available"
                    );
                }
            );
        }
    } catch (error) {
        console.warn(
            "Could not read local menu availability:",
            error
        );
    }

    localAvailabilityIndex =
        next;
}

function isMenuItemAvailable(name, category) {
    const key =
        managedAvailabilityKey(
            name,
            category
        );

    let manuallyAvailable =
        true;

    if (
        remoteAvailabilityIndex.has(
            key
        )
    ) {
        manuallyAvailable =
            remoteAvailabilityIndex.get(
                key
            ) !==
            "Unavailable";
    } else if (
        localAvailabilityIndex.has(
            key
        )
    ) {
        manuallyAvailable =
            localAvailabilityIndex.get(
                key
            ) !==
            "Unavailable";
    }

    const inventoryStatus =
        getRecipeInventoryStatus(
            name,
            category
        );

    return (
        manuallyAvailable &&
        !inventoryStatus?.unavailable
    );
}

async function refreshSharedMenuAvailability(
    rerender =
        true
) {
    rebuildLocalAvailabilityIndex();

    try {
        const response =
            await fetch(
                `${MENU_AVAILABILITY_API}?cafeId=${encodeURIComponent(CAFE_ID)}`,
                {
                    method:
                        "GET",
                    headers: {
                        Accept:
                            "application/json"
                    },
                    credentials:
                        "include",
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `GET menu availability returned ${response.status}`
            );
        }

        const data =
            await response.json();

        const items =
            Array.isArray(data.items)
                ? data.items
                : [];

        remoteAvailabilityIndex =
            new Map(
                items.map(
                    item => [
                        managedAvailabilityKey(
                            item.name,
                            item.category
                        ),
                        item.availability ===
                        "Unavailable"
                            ? "Unavailable"
                            : "Available"
                    ]
                )
            );
    } catch (error) {
        console.warn(
            "Using local menu availability fallback:",
            error
        );
    }

    if (rerender) {
        refreshAvailabilityView();
    }
}


function refreshAvailabilityView() {

  const searchInput =
    document.getElementById(
      "menuSearch"
    );

  if (
    searchInput &&
    searchInput.value.trim()
  ) {
    searchMenuItems();
  } else {
    renderMenu(
      currentCategory
    );
  }
}



// =========================================================
// RECIPE-BASED INVENTORY STATUS
// =========================================================

const RECIPE_INVENTORY_STATUS_API =
  `${MENU_AVAILABILITY_API}/inventory-status`;

let inventoryStatusIndex =
  new Map();

function getRecipeInventoryStatus(
  name,
  category
) {
  return inventoryStatusIndex.get(
    managedAvailabilityKey(
      name,
      category
    )
  ) || null;
}

function inventoryOptionBlocked(
  name,
  category,
  fieldKey,
  value
) {
  const status =
    getRecipeInventoryStatus(
      name,
      category
    );

  if (!status) return false;

  const option =
    String(value || "")
      .trim()
      .toLowerCase();

  if (fieldKey === "size") {
    return (status.blockedSizes || [])
      .some(item => String(item).toLowerCase() === option);
  }

  return (status.blockedOptions || [])
    .some(item => String(item).toLowerCase() === option);
}

function renderInventoryLowStockBanner() {
  let banner =
    document.getElementById(
      "recipeInventoryAlert"
    );

  if (!banner) {
    banner = document.createElement("div");
    banner.id = "recipeInventoryAlert";
    banner.className = "recipe-inventory-alert";
    document.body.appendChild(banner);
  }

  const alerts = [];

  inventoryStatusIndex.forEach(item => {
    if (!item.lowStock && !(item.lowOptions || []).length) return;

    (item.alerts || []).forEach(alert => {
      alerts.push({ itemName: item.itemName, ...alert });
    });
  });

  const unique = Array.from(
    new Map(
      alerts.map(alert => [
        `${alert.itemName}|${alert.name}`,
        alert
      ])
    ).values()
  );

  if (!unique.length) {
    banner.classList.remove("active");
    banner.innerHTML = "";
    return;
  }

  banner.innerHTML = `
    <strong>⚠ Low Ingredient Stock</strong>
    <span>
      ${unique
        .slice(0, 4)
        .map(alert =>
          `${escapeHtml(alert.itemName)}: ${escapeHtml(alert.name)} (${Number(alert.stock || 0)} ${escapeHtml(alert.unit || "")})`
        )
        .join(" • ")}
      ${unique.length > 4 ? ` • +${unique.length - 4} more` : ""}
    </span>
  `;

  banner.classList.add("active");
}

async function refreshRecipeInventoryStatus(
  rerender = true
) {
  try {
    const response = await fetch(
      `${RECIPE_INVENTORY_STATUS_API}?cafeId=${encodeURIComponent(CAFE_ID)}`,
      {
        headers: { Accept: "application/json" },
        credentials: "include",
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`Inventory status returned ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data.items) ? data.items : [];

    inventoryStatusIndex = new Map(
      items.map(item => [
        managedAvailabilityKey(item.itemName, item.category),
        item
      ])
    );

    renderInventoryLowStockBanner();

    if (rerender) refreshAvailabilityView();
  } catch (error) {
    console.warn("Recipe inventory status unavailable:", error);
  }
}

function getLocalOrderSnapshots() {

  try {

    const parsed =
      JSON.parse(
        localStorage.getItem(
          LOCAL_ORDER_KEY
        ) ||
        "[]"
      );

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {

    console.warn(
      "Could not read local orders:",
      error
    );

    return [];
  }
}


function saveLocalOrderSnapshot(
  rawOrder,
  localOnly = true
) {

  if (
    !rawOrder ||
    typeof rawOrder !== "object"
  ) {
    return;
  }

  const snapshot = {
    ...rawOrder,

    cafeId:
      rawOrder.cafeId ||
      CAFE_ID,

    status:
      rawOrder.status ||
      "Pending",

    createdAt:
      rawOrder.createdAt ||
      new Date().toISOString(),

    localOnly:
      Boolean(localOnly)
  };

  const identifier =
    String(
      snapshot.orderNumber ||
      snapshot.id ||
      ""
    );

  const existing =
    getLocalOrderSnapshots();

  const filtered =
    existing.filter(
      order =>
        String(
          order.orderNumber ||
          order.id ||
          ""
        ) !== identifier
    );

  filtered.unshift(
    snapshot
  );

  localStorage.setItem(
    LOCAL_ORDER_KEY,
    JSON.stringify(
      filtered.slice(
        0,
        250
      )
    )
  );

  try {

    const channel =
      new BroadcastChannel(
        "cafekiosk-orders"
      );

    channel.postMessage({
      type:
        "order-updated",

      cafeId:
        snapshot.cafeId,

      order:
        snapshot
    });

    channel.close();

  } catch (_) {
    // Optional.
  }
}



function removeLocalOrderSnapshot(
  identifier
) {
  const target = String(identifier || "");
  const filtered = getLocalOrderSnapshots().filter(
    order =>
      String(
        order.orderNumber ||
        order.id ||
        ""
      ) !== target
  );

  localStorage.setItem(
    LOCAL_ORDER_KEY,
    JSON.stringify(filtered)
  );
}


function goToKioskPage(
  liveServerFile,
  backendRoute
) {

  if (
    window.location.port ===
    "5000"
  ) {

    window.location.href =
      backendRoute;

    return;
  }

  window.location.href =
    liveServerFile;
}


// =====================================================
// ITEM CUSTOMIZATION CONFIGURATION
// =====================================================

const customizationConfig = {

  // ===================================================
  // COFFEE
  // ===================================================

  coffee: [
    {
      key: "temperature",
      label: "Temperature",
      type: "radio",
      options: [
        { label: "Hot", value: "Hot", price: 0 },
        { label: "Iced", value: "Iced", price: 0 }
      ]
    },

    {
      key: "size",
      label: "Size",
      type: "radio",
      options: [
        { label: "Tall", value: "Tall", price: 0 },
        { label: "Grande", value: "Grande", price: 20 },
        { label: "Venti", value: "Venti", price: 40 }
      ]
    },

    {
      key: "milk",
      label: "Milk",
      type: "select",
      options: [
        { label: "Whole", value: "Whole", price: 0 },
        { label: "Skim", value: "Skim", price: 0 },
        { label: "Almond", value: "Almond", price: 15 },
        { label: "Oat", value: "Oat", price: 20 }
      ]
    },

    {
      key: "addOns",
      label: "Add-ons",
      type: "checkbox",
      options: [
        {
          label: "Extra shot",
          value: "Extra shot",
          price: 25
        },
        {
          label: "Vanilla syrup",
          value: "Vanilla syrup",
          price: 20
        },
        {
          label: "Caramel syrup",
          value: "Caramel syrup",
          price: 20
        },
        {
          label: "Whipped cream",
          value: "Whipped cream",
          price: 15
        }
      ]
    }
  ],


  // ===================================================
  // NON-COFFEE
  // ===================================================

  "non-coffee": [
    {
      key: "temperature",
      label: "Temperature",
      type: "radio",
      options: [
        { label: "Hot", value: "Hot", price: 0 },
        { label: "Iced", value: "Iced", price: 0 }
      ]
    },

    {
      key: "size",
      label: "Size",
      type: "radio",
      options: [
        { label: "Small", value: "Small", price: 0 },
        { label: "Regular", value: "Regular", price: 15 },
        { label: "Large", value: "Large", price: 25 }
      ]
    },

    {
      key: "addOns",
      label: "Add-ons",
      type: "checkbox",
      options: [
        { label: "Boba", value: "Boba", price: 25 },
        { label: "Pearls", value: "Pearls", price: 15 },
        {
          label: "Whipped Cream",
          value: "Whipped Cream",
          price: 15
        }
      ]
    }
  ],


  // ===================================================
  // MILK TEA
  // ===================================================

  milktea: [
    {
      key: "size",
      label: "Size",
      type: "radio",
      options: [
        { label: "Regular", value: "Regular", price: 0 },
        { label: "Large", value: "Large", price: 25 }
      ]
    },

    {
      key: "sweetness",
      label: "Sweetness",
      type: "select",
      options: [
        { label: "100%", value: "100%", price: 0 },
        { label: "75%", value: "75%", price: 0 },
        { label: "50%", value: "50%", price: 0 },
        { label: "25%", value: "25%", price: 0 },
        { label: "0%", value: "0%", price: 0 }
      ]
    },

    {
      key: "ice",
      label: "Ice Level",
      type: "radio",
      options: [
        { label: "Regular", value: "Regular", price: 0 },
        { label: "Less Ice", value: "Less Ice", price: 0 },
        { label: "No Ice", value: "No Ice", price: 0 }
      ]
    },

    {
      key: "toppings",
      label: "Toppings",
      type: "checkbox",
      options: [
        { label: "Pearls", value: "Pearls", price: 15 },
        {
          label: "Grass Jelly",
          value: "Grass Jelly",
          price: 15
        },
        { label: "Pudding", value: "Pudding", price: 20 },
        {
          label: "Cream Cheese",
          value: "Cream Cheese",
          price: 25
        }
      ]
    }
  ],


  // ===================================================
  // FOOD
  // ===================================================

  food: [
    {
      key: "side",
      label: "Side",
      type: "select",
      options: [
        { label: "No Side", value: "No Side", price: 0 },
        { label: "Fries", value: "Fries", price: 35 },
        { label: "Salad", value: "Salad", price: 35 }
      ]
    },

    {
      key: "temperature",
      label: "Serving",
      type: "radio",
      options: [
        { label: "Hot", value: "Hot", price: 0 },
        { label: "Warm", value: "Warm", price: 0 }
      ]
    },

    {
      key: "extras",
      label: "Extras",
      type: "checkbox",
      options: [
        { label: "Cheese", value: "Cheese", price: 20 },
        { label: "Egg", value: "Egg", price: 15 },
        { label: "Bacon", value: "Bacon", price: 30 }
      ]
    }
  ],


  // ===================================================
  // SNACK
  // ===================================================

  snack: [
    {
      key: "pack",
      label: "Serving",
      type: "radio",
      options: [
        { label: "Single", value: "Single", price: 0 },
        { label: "Bundle", value: "Bundle", price: 20 }
      ]
    },

    {
      key: "addOns",
      label: "Add-ons",
      type: "checkbox",
      options: [
        {
          label: "Dip Sauce",
          value: "Dip Sauce",
          price: 10
        },
        {
          label: "Extra Cheese",
          value: "Extra Cheese",
          price: 20
        }
      ]
    }
  ],


  // ===================================================
  // DESSERT
  // ===================================================

  dessert: [
    {
      key: "serve",
      label: "Serve Style",
      type: "select",
      options: [
        { label: "Single", value: "Single", price: 0 },
        { label: "Plated", value: "Plated", price: 10 }
      ]
    },

    {
      key: "toppings",
      label: "Toppings",
      type: "checkbox",
      options: [
        {
          label: "Chocolate Drizzle",
          value: "Chocolate Drizzle",
          price: 15
        },
        { label: "Fruit", value: "Fruit", price: 20 },
        {
          label: "Whipped Cream",
          value: "Whipped Cream",
          price: 15
        }
      ]
    }
  ]
};


// =====================================================
// MENU DATA
// 30 ITEMS PER CATEGORY
// 6 CATEGORIES = 180 ITEMS
// =====================================================

const menuData = {

  // ===================================================
  // COFFEE - 30
  // ===================================================

  coffee: [
    { name: "Espresso", price: 90 },
    { name: "Double Espresso", price: 120 },
    { name: "Americano", price: 110 },
    { name: "Cafe Latte", price: 140 },
    { name: "Cappuccino", price: 130 },

    { name: "Flat White", price: 150 },
    { name: "Cafe Mocha", price: 150 },
    { name: "White Chocolate Mocha", price: 170 },
    { name: "Caramel Macchiato", price: 170 },
    { name: "Vanilla Latte", price: 160 },

    { name: "Caramel Latte", price: 170 },
    { name: "Hazelnut Latte", price: 160 },
    { name: "Spanish Latte", price: 160 },
    { name: "Brown Sugar Latte", price: 170 },
    { name: "Salted Caramel Latte", price: 180 },

    { name: "Cinnamon Latte", price: 160 },
    { name: "Honey Cinnamon Latte", price: 170 },
    { name: "Pistachio Latte", price: 180 },
    { name: "Toffee Nut Latte", price: 170 },
    { name: "Dark Chocolate Mocha", price: 180 },

    { name: "Black Coffee", price: 100 },
    { name: "Cafe Au Lait", price: 140 },
    { name: "Vietnamese Coffee", price: 150 },
    { name: "Macchiato", price: 110 },
    { name: "Affogato", price: 180 },

    { name: "Cold Brew", price: 150 },
    { name: "Iced Americano", price: 120 },
    { name: "Iced Cafe Latte", price: 150 },
    { name: "Iced Cafe Mocha", price: 160 },
    { name: "Iced Caramel Macchiato", price: 180 }
  ],


  // ===================================================
  // NON-COFFEE - 30
  // ===================================================

  "non-coffee": [
    { name: "Classic Hot Chocolate", price: 120 },
    { name: "Dark Hot Chocolate", price: 140 },
    { name: "White Hot Chocolate", price: 140 },
    { name: "Iced Chocolate", price: 130 },
    { name: "Chocolate Milk", price: 110 },

    { name: "Matcha Latte", price: 150 },
    { name: "Iced Matcha Latte", price: 160 },
    { name: "Strawberry Matcha Latte", price: 170 },
    { name: "Mango Matcha Latte", price: 170 },
    { name: "Vanilla Matcha Latte", price: 160 },

    { name: "Strawberry Milk", price: 130 },
    { name: "Mango Milk", price: 130 },
    { name: "Banana Milk", price: 130 },
    { name: "Cookies and Cream", price: 150 },
    { name: "Chocolate Oreo", price: 150 },

    { name: "Strawberry Smoothie", price: 160 },
    { name: "Mango Smoothie", price: 160 },
    { name: "Banana Smoothie", price: 150 },
    { name: "Mixed Berry Smoothie", price: 170 },
    { name: "Avocado Smoothie", price: 170 },

    { name: "Fresh Lemonade", price: 110 },
    { name: "Strawberry Lemonade", price: 130 },
    { name: "Honey Lemon", price: 120 },
    { name: "Peach Iced Tea", price: 120 },
    { name: "Lemon Iced Tea", price: 110 },

    { name: "Lychee Iced Tea", price: 130 },
    { name: "Passion Fruit Tea", price: 130 },
    { name: "Green Apple Soda", price: 120 },
    { name: "Strawberry Soda", price: 120 },
    { name: "Blueberry Soda", price: 120 }
  ],


  // ===================================================
  // MILK TEA - 30
  // ===================================================

  milktea: [
    { name: "Classic Milk Tea", price: 100 },
    { name: "Pearl Milk Tea", price: 120 },
    { name: "Brown Sugar Milk Tea", price: 130 },
    { name: "Wintermelon Milk Tea", price: 120 },
    { name: "Okinawa Milk Tea", price: 130 },

    { name: "Hokkaido Milk Tea", price: 130 },
    { name: "Thai Milk Tea", price: 130 },
    { name: "Taro Milk Tea", price: 130 },
    { name: "Matcha Milk Tea", price: 140 },
    { name: "Chocolate Milk Tea", price: 130 },

    { name: "Strawberry Milk Tea", price: 130 },
    { name: "Mango Milk Tea", price: 130 },
    { name: "Honeydew Milk Tea", price: 130 },
    { name: "Vanilla Milk Tea", price: 120 },
    { name: "Caramel Milk Tea", price: 130 },

    { name: "Hazelnut Milk Tea", price: 130 },
    { name: "Cookies and Cream Milk Tea", price: 140 },
    { name: "Cheesecake Milk Tea", price: 150 },
    { name: "Red Velvet Milk Tea", price: 150 },
    { name: "Dark Chocolate Milk Tea", price: 140 },

    { name: "Salted Caramel Milk Tea", price: 150 },
    { name: "Brown Sugar Pearl Milk", price: 150 },
    { name: "Taro Pearl Milk Tea", price: 150 },
    { name: "Matcha Pearl Milk Tea", price: 150 },
    { name: "Wintermelon Pearl Milk Tea", price: 140 },

    { name: "Oreo Milk Tea", price: 150 },
    { name: "Cream Cheese Milk Tea", price: 150 },
    { name: "Pudding Milk Tea", price: 140 },
    { name: "Grass Jelly Milk Tea", price: 140 },
    { name: "Honey Pearl Milk Tea", price: 140 }
  ],


  // ===================================================
  // FOOD - 30
  // ===================================================

  food: [
    { name: "Classic Club Sandwich", price: 160 },
    { name: "Ham and Cheese Sandwich", price: 140 },
    { name: "Chicken Sandwich", price: 160 },
    { name: "Tuna Sandwich", price: 150 },
    { name: "Egg Sandwich", price: 120 },

    { name: "Grilled Cheese Sandwich", price: 130 },
    { name: "Chicken Pesto Sandwich", price: 180 },
    { name: "BLT Sandwich", price: 170 },
    { name: "Chicken Wrap", price: 170 },
    { name: "Tuna Wrap", price: 160 },

    { name: "Chicken Burger", price: 180 },
    { name: "Classic Beef Burger", price: 190 },
    { name: "Cheeseburger", price: 210 },
    { name: "Bacon Cheeseburger", price: 230 },
    { name: "Mushroom Burger", price: 220 },

    { name: "Carbonara", price: 190 },
    { name: "Spaghetti Bolognese", price: 190 },
    { name: "Chicken Alfredo Pasta", price: 210 },
    { name: "Pesto Pasta", price: 190 },
    { name: "Baked Mac and Cheese", price: 180 },

    { name: "Chicken Rice Bowl", price: 180 },
    { name: "Beef Rice Bowl", price: 200 },
    { name: "Teriyaki Chicken Bowl", price: 190 },
    { name: "Garlic Chicken Rice", price: 180 },
    { name: "Beef Tapa Rice", price: 190 },

    { name: "Chicken Caesar Salad", price: 180 },
    { name: "Garden Salad", price: 150 },
    { name: "Breakfast Plate", price: 190 },
    { name: "Bacon and Egg Breakfast", price: 180 },
    { name: "Sausage and Egg Breakfast", price: 180 }
  ],


  // ===================================================
  // SNACK - 30
  // ===================================================

  snack: [
    { name: "French Fries", price: 90 },
    { name: "Cheese Fries", price: 110 },
    { name: "Loaded Fries", price: 140 },
    { name: "Potato Wedges", price: 100 },
    { name: "Onion Rings", price: 100 },

    { name: "Nachos", price: 120 },
    { name: "Cheesy Nachos", price: 140 },
    { name: "Loaded Nachos", price: 160 },
    { name: "Mozzarella Sticks", price: 140 },
    { name: "Chicken Nuggets", price: 130 },

    { name: "Chicken Wings", price: 180 },
    { name: "Buffalo Wings", price: 190 },
    { name: "Garlic Parmesan Wings", price: 190 },
    { name: "Chicken Tenders", price: 160 },
    { name: "Popcorn Chicken", price: 140 },

    { name: "Cheese Sticks", price: 100 },
    { name: "Spring Rolls", price: 100 },
    { name: "Fish and Chips", price: 180 },
    { name: "Hash Browns", price: 90 },
    { name: "Potato Croquettes", price: 110 },

    { name: "Garlic Bread", price: 90 },
    { name: "Cheesy Garlic Bread", price: 110 },
    { name: "Mini Pizza", price: 150 },
    { name: "Ham and Cheese Croissant", price: 140 },
    { name: "Sausage Roll", price: 120 },

    { name: "Chocolate Chip Cookie", price: 70 },
    { name: "Oatmeal Cookie", price: 70 },
    { name: "Chocolate Muffin", price: 90 },
    { name: "Blueberry Muffin", price: 90 },
    { name: "Banana Muffin", price: 90 }
  ],


  // ===================================================
  // DESSERT - 30
  // ===================================================

  dessert: [
    { name: "Classic Cheesecake", price: 150 },
    { name: "Blueberry Cheesecake", price: 160 },
    { name: "Strawberry Cheesecake", price: 160 },
    { name: "Oreo Cheesecake", price: 170 },
    { name: "Basque Burnt Cheesecake", price: 180 },

    { name: "Chocolate Cake", price: 150 },
    { name: "Red Velvet Cake", price: 160 },
    { name: "Carrot Cake", price: 150 },
    { name: "Mocha Cake", price: 160 },
    { name: "Ube Cake", price: 160 },

    { name: "Tiramisu", price: 180 },
    { name: "Chocolate Brownie", price: 110 },
    { name: "Walnut Brownie", price: 120 },
    { name: "Chocolate Lava Cake", price: 170 },
    { name: "Banana Bread", price: 100 },

    { name: "Chocolate Donut", price: 90 },
    { name: "Glazed Donut", price: 80 },
    { name: "Strawberry Donut", price: 90 },
    { name: "Cinnamon Roll", price: 120 },
    { name: "Chocolate Croissant", price: 120 },

    { name: "Chocolate Sundae", price: 120 },
    { name: "Strawberry Sundae", price: 120 },
    { name: "Vanilla Ice Cream", price: 100 },
    { name: "Chocolate Ice Cream", price: 100 },
    {
      name: "Cookies and Cream Ice Cream",
      price: 110
    },

    { name: "Mango Graham", price: 130 },
    { name: "Mango Float", price: 130 },
    { name: "Leche Flan", price: 120 },
    { name: "Chocolate Mousse", price: 140 },
    { name: "Panna Cotta", price: 150 }
  ]
};

// =====================================================
// CATEGORY SWITCH
// =====================================================

function selectCategory(category, btn) {

  currentCategory = category;

  document
    .querySelectorAll(".nav-btn")
    .forEach(button => {
      button.classList.remove("active");
    });

  if (btn) {
    btn.classList.add("active");
  }

  const title =
    category
      .replace(/-/g, " ")
      .replace(/\b\w/g, char =>
        char.toUpperCase()
      );

  const categoryTitle =
    document.getElementById("categoryTitle");

  if (categoryTitle) {
    categoryTitle.innerText = title;
  }

  const categoryIcon =
    document.getElementById("categoryIcon");

  if (categoryIcon) {
    categoryIcon.src =
      `../Assets/images/${category}.png`;

    categoryIcon.alt = title;
  }

  const searchInput =
    document.getElementById("menuSearch");

  if (searchInput) {
    searchInput.value = "";
  }

  renderMenu(category);
}


// =====================================================
// RENDER MENU
// =====================================================

function renderMenu(category) {

  const grid =
    document.getElementById("menuGrid");

  if (!grid) return;

  grid.innerHTML = "";

  const items =
    menuData[category] || [];

  items.forEach(item => {

    const available =
      isMenuItemAvailable(
        item.name,
        category
      );

    const card =
      document.createElement(
        "div"
      );

    card.className =
      `menu-card${
        available
          ? ""
          : " menu-card-unavailable"
      }`;

    card.setAttribute(
      "aria-disabled",
      available
        ? "false"
        : "true"
    );

    if (available) {
      card.addEventListener(
        "click",
        () => {
          showItemModal(
            item.name,
            item.price,
            category
          );
        }
      );
    }

    const categoryImage =
      `../Assets/images/${category}.png`;

    card.innerHTML = `
      ${
        available
          ? ""
          : `
            <span class="menu-unavailable-badge">
              🔒 UNAVAILABLE
            </span>
          `
      }

      ${
        available &&
        getRecipeInventoryStatus(
          item.name,
          category
        )?.lowStock
          ? `
            <span class="menu-low-stock-badge">
              ⚠ LOW STOCK
            </span>
          `
          : ""
      }

      <img
        class="menu-img"
        src="${categoryImage}"
        alt="${item.name}"
      >

      <h4>${item.name}</h4>

      <p>₱${item.price}</p>
    `;

    grid.appendChild(
      card
    );

  });
}


// =====================================================
// ADD ITEM TO ORDER
// =====================================================

function addItem(
  name,
  price,
  customizations = [],
  customizationCost = 0,
  category = "coffee",
  qty = 1
) {

  if (
    !isMenuItemAvailable(
      name,
      category
    )
  ) {
    console.warn(
      `Blocked unavailable Kiosk item: ${name}`
    );
    return;
  }


  const key =
    `${name}|${category}|${customizations.join("|")}`;

  const existing =
    order.find(item =>
      item.key === key
    );

  if (existing) {

    existing.qty += qty;

  } else {

    order.push({
      name,
      price,
      qty,
      customizations,
      customizationCost,
      category,
      key
    });

  }

  renderOrder();

  if (navigator.vibrate) {
    navigator.vibrate(30);
  }
}


// =====================================================
// SHOW ITEM MODAL
// =====================================================

function showItemModal(
  name,
  price,
  category
) {

  if (
    !isMenuItemAvailable(
      name,
      category
    )
  ) {
    console.warn(
      `Unavailable item cannot be opened: ${name}`
    );
    return;
  }


  pendingItem = {
    name,
    price,
    category,
    selectedOptions: {},
    qty: 1
  };

  const categoryLabel =
    category
      .replace(/-/g, " ")
      .replace(/\b\w/g, char =>
        char.toUpperCase()
      );

  const categoryDisplayNames = {
    coffee: "Coffees",
    "non-coffee": "Non-Coffee",
    milktea: "Milktea",
    food: "Food",
    snack: "Snack",
    dessert: "Dessert"
  };

  const categoryDisplay =
    categoryDisplayNames[category] || categoryLabel;

  const title =
    document.getElementById(
      "itemModalTitle"
    );

  if (title) {
    title.innerText = "Item Selection";
  }

  const message =
    document.getElementById(
      "itemModalMessage"
    );

  if (message) {
    message.innerText =
      `Select your options for this ${categoryLabel}.`;
  }

  const nameEl =
    document.getElementById(
      "itemModalName"
    );

  if (nameEl) {
    nameEl.innerText = name;
  }

  const priceEl =
    document.getElementById(
      "itemModalPrice"
    );

  if (priceEl) {
    priceEl.innerText = `₱${price}`;
  }

  const categoryEl =
    document.getElementById(
      "itemModalCategory"
    );

  if (categoryEl) {
    categoryEl.innerText = categoryDisplay;
  }

  const qtyHidden =
    document.getElementById(
      "itemModalQty"
    );

  if (qtyHidden) {
    qtyHidden.innerText = 1;
  }

  const qtyDisplay =
    document.getElementById(
      "itemModalQtyDisplay"
    );

  if (qtyDisplay) {
    qtyDisplay.innerText = 1;
  }

  const totalEl =
    document.getElementById(
      "itemModalTotal"
    );

  if (totalEl) {
    totalEl.innerText = Number(price).toFixed(2);
  }

  const addPriceEl =
    document.getElementById(
      "itemModalAddPrice"
    );

  if (addPriceEl) {
    addPriceEl.innerText = Number(price).toFixed(2);
  }

  const icon =
    document.getElementById(
      "itemModalIcon"
    );

  if (icon) {
    icon.src =
      `../Assets/images/${category}.png`;

    icon.alt = categoryLabel;
  }

  const modalBox =
    document.getElementById(
      "itemModalBox"
    );

  if (modalBox) {
    modalBox.className =
      `item-customization-box category-${category}`;
  }

  renderItemModalOptions();
  updateItemModalTotal();

  const modal =
    document.getElementById(
      "itemModal"
    );

  if (modal) {
    modal.classList.add("active");
    modal.setAttribute(
      "aria-hidden",
      "false"
    );
  }

}


// =====================================================
// RENDER ITEM CUSTOMIZATION OPTIONS
// =====================================================

function renderItemModalOptions() {

  if (!pendingItem) return;

  const container =
    document.getElementById(
      "itemModalOptions"
    );

  if (!container) return;

  container.innerHTML = "";

  const fields =
    customizationConfig[
      pendingItem.category
    ] || [];

  fields.forEach(field => {

    const section =
      document.createElement("section");

    section.className =
      "item-custom-section";

    const heading =
      document.createElement("h4");

    heading.className =
      "item-custom-section-title";

    heading.innerHTML =
      field.type === "checkbox"
        ? `${field.label} <span>(Optional)</span>`
        : `Select ${field.label}`;

    section.appendChild(heading);


    // =============================================
    // RADIO / SELECT
    // Both are displayed as the large selectable
    // cards shown in the reference screenshot.
    // =============================================

    if (
      field.type === "radio" ||
      field.type === "select"
    ) {

      const group =
        document.createElement("div");

      group.className =
        `item-custom-choice-grid item-custom-choice-count-${field.options.length}`;

      field.options.forEach(
        (opt, index) => {

          const blocked =
            inventoryOptionBlocked(
              pendingItem.name,
              pendingItem.category,
              field.key,
              opt.value
            );

          const choice =
            document.createElement(
              "button"
            );

          choice.type = "button";

          choice.className =
            "item-custom-choice";

          if (blocked) {
            choice.disabled = true;
            choice.classList.add(
              "inventory-option-unavailable"
            );
          }

          if (
            !blocked &&
            pendingItem.selectedOptions[
              field.key
            ] === undefined
          ) {
            choice.classList.add("selected");
            pendingItem.selectedOptions[
              field.key
            ] = opt.value;
          }

          choice.dataset.fieldKey =
            field.key;

          choice.dataset.value =
            opt.value;

          const priceText =
            blocked
              ? "OUT OF STOCK"
              : Number(opt.price) > 0
                ? `+ ₱${Number(opt.price).toFixed(2)}`
                : "Included";

          choice.innerHTML = `
            <span class="item-custom-check">✓</span>
            <span class="item-custom-choice-label">
              ${escapeHtml(opt.label)}
            </span>
            <span class="item-custom-choice-price">
              ${priceText}
            </span>
          `;

          choice.addEventListener(
            "click",
            () => {

              if (blocked) return;

              group
                .querySelectorAll(
                  ".item-custom-choice"
                )
                .forEach(button => {
                  button.classList.remove(
                    "selected"
                  );
                });

              choice.classList.add(
                "selected"
              );

              pendingItem.selectedOptions[
                field.key
              ] = opt.value;

              updateItemModalTotal();
            }
          );

          group.appendChild(choice);
        }
      );

      section.appendChild(group);
    }


    // =============================================
    // CHECKBOX
    // =============================================

    if (field.type === "checkbox") {

      const group =
        document.createElement("div");

      group.className =
        "item-custom-addon-grid";

      pendingItem.selectedOptions[
        field.key
      ] = [];

      field.options.forEach(opt => {

        const blocked =
          inventoryOptionBlocked(
            pendingItem.name,
            pendingItem.category,
            field.key,
            opt.value
          );

        const optionLabel =
          document.createElement(
            "label"
          );

        optionLabel.className =
          "item-custom-addon-row";

        const left =
          document.createElement(
            "span"
          );

        left.className =
          "item-custom-addon-left";

        const input =
          document.createElement(
            "input"
          );

        input.type = "checkbox";
        input.value = opt.value;
        input.disabled = blocked;

        if (blocked) {
          optionLabel.classList.add(
            "inventory-option-unavailable"
          );
        }

        const text =
          document.createElement(
            "span"
          );

        text.textContent = opt.label;

        const price =
          document.createElement(
            "strong"
          );

        price.textContent =
          blocked
            ? "OUT OF STOCK"
            : Number(opt.price) > 0
              ? `+ ₱${Number(opt.price).toFixed(2)}`
              : "Included";

        input.addEventListener(
          "change",
          () => {

            const selected =
              pendingItem.selectedOptions[
                field.key
              ];

            if (input.checked) {

              if (
                !selected.includes(
                  opt.value
                )
              ) {
                selected.push(opt.value);
              }

            } else {

              const index =
                selected.indexOf(
                  opt.value
                );

              if (index > -1) {
                selected.splice(index, 1);
              }
            }

            optionLabel.classList.toggle(
              "checked",
              input.checked
            );

            updateItemModalTotal();
          }
        );

        left.appendChild(input);
        left.appendChild(text);

        optionLabel.appendChild(left);
        optionLabel.appendChild(price);

        group.appendChild(optionLabel);
      });

      section.appendChild(group);
    }

    container.appendChild(section);
  });

}


// =====================================================
// SAFE TEXT FOR DYNAMIC OPTION LABELS
// =====================================================

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


// =====================================================
// UPDATE ITEM MODAL TOTAL
// =====================================================

function updateItemModalTotal() {

  if (!pendingItem) return;

  const fields =
    customizationConfig[
      pendingItem.category
    ] || [];

  let unitTotal =
    Number(pendingItem.price) || 0;

  fields.forEach(field => {

    const selected =
      pendingItem.selectedOptions[
        field.key
      ];

    if (
      selected === undefined ||
      selected === null
    ) {
      return;
    }

    if (field.type === "checkbox") {

      selected.forEach(value => {

        const option =
          field.options.find(
            opt =>
              opt.value === value
          );

        if (option) {
          unitTotal +=
            Number(option.price) || 0;
        }
      });

    } else {

      const option =
        field.options.find(
          opt =>
            opt.value === selected
        );

      if (option) {
        unitTotal +=
          Number(option.price) || 0;
      }
    }
  });

  const qty =
    pendingItem.qty || 1;

  const total =
    unitTotal * qty;

  const hiddenQty =
    document.getElementById(
      "itemModalQty"
    );

  if (hiddenQty) {
    hiddenQty.innerText = qty;
  }

  const qtyDisplay =
    document.getElementById(
      "itemModalQtyDisplay"
    );

  if (qtyDisplay) {
    qtyDisplay.innerText = qty;
  }

  const totalDisplay =
    document.getElementById(
      "itemModalTotal"
    );

  if (totalDisplay) {
    totalDisplay.innerText =
      total.toFixed(2);
  }

  const addPriceDisplay =
    document.getElementById(
      "itemModalAddPrice"
    );

  if (addPriceDisplay) {
    addPriceDisplay.innerText =
      total.toFixed(2);
  }

}


// =====================================================
// UPDATE ITEM QUANTITY
// =====================================================

function updateItemQuantity(change) {

  if (!pendingItem) return;

  pendingItem.qty =
    Math.max(
      1,
      Math.min(
        99,
        (pendingItem.qty || 1) + change
      )
    );

  updateItemModalTotal();
}


// =====================================================
// CONFIRM ADD ITEM
// =====================================================

function confirmAddItem() {

  if (!pendingItem) return;

  const fields =
    customizationConfig[
      pendingItem.category
    ] || [];

  const customizations = [];
  let customizationCost = 0;

  fields.forEach(field => {

    const selected =
      pendingItem.selectedOptions[
        field.key
      ];

    if (
      selected === undefined ||
      selected === null
    ) {
      return;
    }

    if (field.type === "checkbox") {

      if (
        !Array.isArray(selected) ||
        selected.length === 0
      ) {
        return;
      }

      const selectedOptions =
        field.options.filter(opt =>
          selected.includes(opt.value)
        );

      selectedOptions.forEach(opt => {
        customizationCost +=
          Number(opt.price) || 0;
      });

      customizations.push(
        `${field.label}: ${
          selectedOptions
            .map(opt => opt.label)
            .join(", ")
        }`
      );

      return;
    }

    const option =
      field.options.find(
        opt =>
          opt.value === selected
      );

    if (option) {

      customizationCost +=
        Number(option.price) || 0;

      customizations.push(
        `${field.label}: ${option.label}`
      );
    }
  });

  addItem(
    pendingItem.name,
    pendingItem.price,
    customizations,
    customizationCost,
    pendingItem.category,
    pendingItem.qty
  );

  pendingItem = null;
  closeItemModal();
}


// =====================================================
// CLOSE ITEM MODAL
// =====================================================

function closeItemModal(event) {

  if (
    event &&
    event.target !==
      event.currentTarget
  ) {
    return;
  }

  const modal =
    document.getElementById(
      "itemModal"
    );

  if (modal) {
    modal.classList.remove("active");
    modal.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  pendingItem = null;
}


// =====================================================
// RENDER ORDER
// =====================================================

function renderOrder() {

  const list =
    document.getElementById(
      "orderList"
    );

  if (!list) return;

  list.innerHTML = "";

  let subtotal = 0;

  order.forEach(
    (item, index) => {

      const customText =
        item.customizations &&
        item.customizations.length
          ? `
            <ul>
              ${item.customizations
                .map(
                  option =>
                    `<li>${option}</li>`
                )
                .join("")}
            </ul>
          `
          : "<span>None</span>";

      const itemTotal =
        (
          Number(item.price) +
          Number(
            item.customizationCost ||
              0
          )
        ) *
        Number(item.qty);

      subtotal += itemTotal;

      list.innerHTML += `
        <div class="order-item">

          <div class="order-name">
            ${item.name}
          </div>

          <div class="order-addons">
            ${customText}
          </div>

          <div class="order-line">

            <span>
              Qty: ${item.qty}
            </span>

            <span class="order-price">
              ₱${itemTotal}
            </span>

          </div>

          <div class="qty-controls">

            <button
              class="qty-decrease"
              type="button"
              onclick="changeQty(${index}, -1)"
            >
              -
            </button>

            <span>
              ${item.qty}
            </span>

            <button
              class="qty-increase"
              type="button"
              onclick="changeQty(${index}, 1)"
            >
              +
            </button>

          </div>

        </div>
      `;
    }
  );

  const subtotalElement =
    document.getElementById(
      "subtotalAmount"
    );

  const totalElement =
    document.getElementById(
      "totalAmount"
    );

  if (subtotalElement) {

    subtotalElement.innerText =
      `₱${subtotal}`;

  }

  if (totalElement) {

    totalElement.innerText =
      `₱${subtotal}`;

  }

}


// =====================================================
// PAYMENT METHOD
// =====================================================

function updatePaymentMethod(
  value
) {

  selectedPaymentMethod =
    value;

}


// =====================================================
// SHOW ORDER CONFIRMATION MODAL
// =====================================================

function showOrderModal() {

  if (order.length === 0) {

    alert(
      "Please add items before confirming."
    );

    return;

  }

  const categoryInfo = {

    coffee: {
      message:
        "Review your order before confirming.",
      icon:
        "../Assets/images/coffee.png"
    },

    "non-coffee": {
      message:
        "Review your order before confirming.",
      icon:
        "../Assets/images/non-coffee.png"
    },

    milktea: {
      message:
        "Review your order before confirming.",
      icon:
        "../Assets/images/milktea.png"
    },

    food: {
      message:
        "Review your food order before confirming.",
      icon:
        "../Assets/images/food.png"
    },

    snack: {
      message:
        "Review your snack order before confirming.",
      icon:
        "../Assets/images/snack.png"
    },

    dessert: {
      message:
        "Review your dessert order before confirming.",
      icon:
        "../Assets/images/dessert.png"
    }

  };

  const info =
    categoryInfo[
      currentCategory
    ] ||
    categoryInfo.coffee;

  const modalTitle =
    document.getElementById(
      "modalTitle"
    );

  if (modalTitle) {

    modalTitle.innerText =
      "Do you want to confirm order?";

  }

  const modalMessage =
    document.getElementById(
      "modalMessage"
    );

  if (modalMessage) {

    modalMessage.innerText =
      info.message;

  }

  const modalIcon =
    document.getElementById(
      "modalIcon"
    );

  if (modalIcon) {

    modalIcon.src =
      info.icon;

  }

  const modalTotal =
    document.getElementById(
      "modalTotalAmount"
    );

  const totalAmount =
    document.getElementById(
      "totalAmount"
    );

  if (
    modalTotal &&
    totalAmount
  ) {

    modalTotal.innerText =
      totalAmount.innerText;

  }

  const orderItemsHtml =
    order.map(item => {

      const customizationHtml =
        item.customizations &&
        item.customizations.length
          ? `
            <ul class="modal-order-addons">
              ${item.customizations
                .map(
                  option =>
                    `<li>${option}</li>`
                )
                .join("")}
            </ul>
          `
          : `
            <div class="modal-order-none">
              None
            </div>
          `;

      const itemTotal =
        (
          Number(item.price) +
          Number(
            item.customizationCost ||
              0
          )
        ) *
        Number(item.qty);

      return `
        <div class="modal-order-item">

          <div class="modal-order-header">

            <span class="modal-order-name">
              ${item.name}
            </span>

            <span class="modal-order-total">
              ₱${itemTotal}
            </span>

          </div>

          <div class="modal-order-meta">
            Qty: ${item.qty}
          </div>

          ${customizationHtml}

        </div>
      `;

    }).join("");

  const modalOrderItems =
    document.getElementById(
      "modalOrderItems"
    );

  if (modalOrderItems) {

    modalOrderItems.innerHTML =
      orderItemsHtml;

  }

  const modalBox =
    document.getElementById(
      "orderModalBox"
    );

  if (modalBox) {

    modalBox.className =
      `modal-box category-${currentCategory}`;

  }

  const modal =
    document.getElementById(
      "orderModal"
    );

  if (modal) {

    modal.classList.add(
      "active"
    );

  }

}


// =====================================================
// CLOSE ORDER MODAL
// =====================================================

function closeOrderModal(event) {

  if (
    event &&
    event.target !==
      event.currentTarget
  ) {

    return;

  }

  const modal =
    document.getElementById(
      "orderModal"
    );

  if (modal) {

    modal.classList.remove(
      "active"
    );

  }

}


// =====================================================
// CHANGE ORDER QUANTITY
// =====================================================

function changeQty(
  index,
  change
) {

  if (!order[index]) return;

  order[index].qty +=
    change;

  if (
    order[index].qty <= 0
  ) {

    order.splice(
      index,
      1
    );

  }

  renderOrder();

}


// =====================================================
// GENERATE ORDER NUMBER
// =====================================================

function generateOrderNumber() {

  const timestamp =
    Date.now()
      .toString()
      .slice(-6);

  const random =
    Math.floor(
      100 +
      Math.random() * 900
    );

  return `${CAFE_ID}-${timestamp}-${random}`;

}


// =====================================================
// CONFIRM ORDER
// =====================================================

async function confirmOrder() {

  if (order.length === 0) {

    alert(
      "No items selected."
    );

    return;

  }


  // ===================================================
  // COPY ORDER
  // ===================================================

  const orderToSave =
    JSON.parse(
      JSON.stringify(order)
    );


  // ===================================================
  // CALCULATE TOTAL
  // ===================================================

  const subtotal =
    orderToSave.reduce(
      (sum, item) => {

        const itemTotal =
          (
            Number(item.price) ||
            0
          ) +
          (
            Number(
              item.customizationCost
            ) ||
            0
          );

        return (
          sum +
          itemTotal *
          (
            Number(item.qty) ||
            1
          )
        );

      },
      0
    );


  // ===================================================
  // ORDER PAYLOAD SENT TO BACKEND
  // ===================================================

  const orderPayload = {

    cafeId:
      CAFE_ID,

    source:
      "kiosk",

    orderNumber:
      generateOrderNumber(),

    serviceType:
      localStorage.getItem(
        "serviceType"
      ) ||
      sessionStorage.getItem(
        "serviceType"
      ) ||
      "Dine In",

    paymentMethod:
      selectedPaymentMethod,

    status:
      "Pending",

    createdAt:
      new Date().toISOString(),

    items:
      orderToSave.map(
        item => ({

          name:
            item.name,

          category:
            item.category,

          price:
            Number(
              item.price
            ) || 0,

          // Keep qty for checkout/front-end compatibility.
          qty:
            Number(
              item.qty
            ) || 1,

          // Also send quantity so the backend can
          // understand the quantity consistently.
          quantity:
            Number(
              item.qty
            ) || 1,

          customizationCost:
            Number(
              item.customizationCost
            ) || 0,

          total:
            (
              (
                Number(
                  item.price
                ) || 0
              ) +
              (
                Number(
                  item.customizationCost
                ) || 0
              )
            ) *
            (
              Number(
                item.qty
              ) || 1
            ),

          customizations:
            item.customizations ||
            []

        })
      ),

    total:
      subtotal

  };


  // ===================================================
  // SAVE ORDER LOCALLY
  // ===================================================

  sessionStorage.setItem(
    "cafeKioskOrder",
    JSON.stringify(
      orderToSave
    )
  );

  sessionStorage.setItem(
    "paymentMethod",
    selectedPaymentMethod
  );

  sessionStorage.setItem(
    "serviceType",
    orderPayload.serviceType
  );

  sessionStorage.setItem(
    "orderNumber",
    orderPayload.orderNumber
  );

  sessionStorage.setItem(
    "cafeId",
    CAFE_ID
  );


  localStorage.setItem(
    "order",
    JSON.stringify(
      orderToSave
    )
  );

  localStorage.setItem(
    "paymentMethod",
    selectedPaymentMethod
  );

  localStorage.setItem(
    "serviceType",
    orderPayload.serviceType
  );


  // ===================================================
  // DEBUG - SHOW ORDER BEFORE SENDING
  // ===================================================

  console.log(
    "======================================"
  );

  console.log(
    "📦 CafeKiosk Order"
  );

  console.log(
    "Cafe:",
    CAFE_ID
  );

  console.log(
    "Order Number:",
    orderPayload.orderNumber
  );

  console.log(
    "Service Type:",
    orderPayload.serviceType
  );

  console.log(
    "Payment:",
    orderPayload.paymentMethod
  );

  console.log(
    "Items:",
    orderPayload.items
  );

  console.log(
    "Total:",
    orderPayload.total
  );

  console.log(
    "======================================"
  );


  // ===================================================
  // GUARANTEED LOCAL ORDER DELIVERY
  // ===================================================

  saveLocalOrderSnapshot(
    orderPayload,
    true
  );


  // ===================================================
  // SEND ORDER TO BACKEND
  // ===================================================

  try {

    const response =
      await fetch(
        `${API_URL}/api/orders`,
        {

          method:
            "POST",

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          credentials:
            "include",

          body:
            JSON.stringify(
              orderPayload
            )

        }
      );


    // =============================================
    // CHECK BACKEND RESPONSE
    // =============================================

    if (!response.ok) {

      let errorMessage =
        "Unable to submit order.";

      let errorCode =
        "";

      try {
        const errorData =
          await response.json();

        if (
          errorData &&
          errorData.message
        ) {
          errorMessage =
            errorData.message;
        }

        errorCode =
          errorData?.code ||
          "";

      } catch (_) {
        // Ignore JSON parsing error.
      }

      const requestError =
        new Error(
          errorMessage
        );

      requestError.code =
        errorCode;

      throw requestError;
    }


    // =============================================
    // READ SUCCESS RESPONSE
    // =============================================

    const result =
      await response.json();


    console.log(
      "✅ Order submitted:",
      result
    );


    // =============================================
    // STORE BACKEND ORDER
    // =============================================

    if (result.order) {

      sessionStorage.setItem(
        "backendOrder",
        JSON.stringify(
          result.order
        )
      );

      saveLocalOrderSnapshot(
        result.order,
        false
      );

    }


    // =============================================
    // CLOSE CONFIRMATION MODAL
    // =============================================

    closeOrderModal();


    // =============================================
    // GO TO CHECKOUT
    // =============================================

    goToKioskPage(
      "checkout.html",
      "/checkout"
    );


  } catch (error) {

    console.error(
      "❌ Unable to send order:",
      error
    );

    if (
      error?.code ===
      "INSUFFICIENT_STOCK"
    ) {
      removeLocalOrderSnapshot(
        orderPayload.orderNumber
      );

      alert(
        "This order cannot be submitted because one or more ingredients are out of stock.\n\n" +
        error.message
      );

      await refreshRecipeInventoryStatus(
        true
      );

      return;
    }

    console.warn(
      "Backend did not receive the Kiosk order, " +
      "but the order was saved locally for the POS queue."
    );

    alert(
      "Order saved. The POS Order Queue can receive it locally."
    );

    goToKioskPage(
      "checkout.html",
      "/checkout"
    );

  }
}


// =====================================================
// CANCEL ORDER
// =====================================================

function cancelOrder() {

  order = [];

  selectedPaymentMethod =
    "Cash";


  // ===================================================
  // CLEAR CURRENT ORDER DATA
  // ===================================================

  sessionStorage.removeItem(
    "cafeKioskOrder"
  );

  sessionStorage.removeItem(
    "backendOrder"
  );

  sessionStorage.removeItem(
    "orderNumber"
  );

  localStorage.removeItem(
    "order"
  );


  // ===================================================
  // RESET PAYMENT METHOD
  // ===================================================

  const paymentMethod =
    document.getElementById(
      "paymentMethod"
    );

  if (paymentMethod) {

    paymentMethod.value =
      "Cash";

  }


  renderOrder();


  // ===================================================
  // RETURN TO ORDER TYPE
  // ===================================================

  goToKioskPage(
    "order-type.html",
    "/order-type"
  );

}

// =====================================================
// CLEAR MENU SEARCH
// =====================================================

function clearMenuSearch() {

  const searchInput =
    document.getElementById(
      "menuSearch"
    );

  if (!searchInput) return;

  searchInput.value = "";

  searchMenuItems();

}


// =====================================================
// SETUP MENU SEARCH
// =====================================================

function setupMenuSearch() {

  const searchInput =
    document.getElementById(
      "menuSearch"
    );

  const clearButton =
    document.getElementById(
      "clearSearch"
    );

  if (
    searchInput &&
    !searchInput.dataset.bound
  ) {

    searchInput.addEventListener(
      "input",
      searchMenuItems
    );

    searchInput.dataset.bound =
      "true";

  }

  if (
    clearButton &&
    !clearButton.dataset.bound
  ) {

    clearButton.addEventListener(
      "click",
      clearMenuSearch
    );

    clearButton.dataset.bound =
      "true";

  }

}


// =====================================================
// SEARCH MENU ITEMS
// =====================================================

function searchMenuItems() {

  const searchInput =
    document.getElementById(
      "menuSearch"
    );

  const grid =
    document.getElementById(
      "menuGrid"
    );

  if (
    !searchInput ||
    !grid
  ) {
    return;
  }

  const searchTerm =
    searchInput.value
      .trim()
      .toLowerCase();

  const filteredItems =
    (
      menuData[
        currentCategory
      ] || []
    ).filter(
      item =>
        item.name
          .toLowerCase()
          .includes(
            searchTerm
          )
    );

  grid.innerHTML = "";

  if (
    filteredItems.length === 0
  ) {

    grid.innerHTML = `
      <div class="no-search-results">

        <h3>
          No items found
        </h3>

        <p>
          Try searching for another menu item.
        </p>

      </div>
    `;

    return;

  }

  filteredItems.forEach(
    item => {

      const available =
        isMenuItemAvailable(
          item.name,
          currentCategory
        );

      const card =
        document.createElement(
          "div"
        );

      card.className =
        `menu-card${
          available
            ? ""
            : " menu-card-unavailable"
        }`;

      card.setAttribute(
        "aria-disabled",
        available
          ? "false"
          : "true"
      );

      if (available) {
        card.addEventListener(
          "click",
          () => {
            showItemModal(
              item.name,
              item.price,
              currentCategory
            );
          }
        );
      }

      const categoryImage =
        `../Assets/images/${currentCategory}.png`;

      card.innerHTML = `
        ${
          available
            ? ""
            : `
              <span class="menu-unavailable-badge">
                🔒 UNAVAILABLE
              </span>
            `
        }

        <img
          class="menu-img"
          src="${categoryImage}"
          alt="${item.name}"
        >

        <h4>
          ${item.name}
        </h4>

        <p>
          ₱${item.price}
        </p>
      `;

      grid.appendChild(
        card
      );

    }
  );

}


// =====================================================
// KEYBOARD SUPPORT FOR ITEM MODAL
// =====================================================

document.addEventListener(
  "keydown",
  event => {
    if (
      event.key === "Escape" &&
      document
        .getElementById("itemModal")
        ?.classList.contains("active")
    ) {
      closeItemModal();
    }
  }
);


// =====================================================
// DEFAULT PAGE LOAD
// =====================================================

window.addEventListener(
  "load",
  () => {

    // -------------------------------------------------
    // SETUP SEARCH
    // -------------------------------------------------

    setupMenuSearch();


    rebuildLocalAvailabilityIndex();

    refreshSharedMenuAvailability(
      true
    );


    refreshRecipeInventoryStatus(
      true
    );


    window.setInterval(
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          refreshRecipeInventoryStatus(
            true
          );
        }
      },
      3000
    );


    window.setInterval(
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          refreshSharedMenuAvailability(
            true
          );
        }
      },
      5000
    );


    window.addEventListener(
      "storage",
      event => {
        if (
          event.key ===
          "cafe_products"
        ) {
          rebuildLocalAvailabilityIndex();
          refreshAvailabilityView();
        }
      }
    );


    // -------------------------------------------------
    // GET PAYMENT METHOD
    // -------------------------------------------------

    const paymentMethod =
      document.getElementById(
        "paymentMethod"
      );

    if (paymentMethod) {

      selectedPaymentMethod =
        paymentMethod.value ||
        "Cash";

    }


    // -------------------------------------------------
    // MAKE SURE CAFE ID EXISTS
    // -------------------------------------------------

    if (
      !localStorage.getItem(
        "cafeId"
      )
    ) {

      localStorage.setItem(
        "cafeId",
        "cafe-1"
      );

    }


    // -------------------------------------------------
    // LOAD FIRST CATEGORY
    // -------------------------------------------------

    const firstBtn =
      document.querySelector(
        ".nav-btn"
      );

    selectCategory(
      "coffee",
      firstBtn
    );


    // -------------------------------------------------
    // RENDER EMPTY ORDER
    // -------------------------------------------------

    renderOrder();


    // -------------------------------------------------
    // DEBUG
    // -------------------------------------------------

    console.log(
      "======================================"
    );

    console.log(
      "☕ CafeKiosk Menu Loaded"
    );

    console.log(
      `🏪 Cafe: ${CAFE_ID}`
    );

    console.log(
      "🌐 Backend: Same Express server"
    );

    console.log(
      "API endpoint: /api/orders"
    );

    console.log(
      "======================================"
    );

  }
);