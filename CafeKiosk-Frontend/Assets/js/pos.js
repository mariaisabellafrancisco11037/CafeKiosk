// =========================================================
// CAFE POS
// 30 PRODUCTS x 6 CATEGORIES = 180
// =========================================================


const $ = (id) =>
    document.getElementById(id);


let CAFE_ID =
    String(
        localStorage.getItem(
            "cafeId"
        ) ||
        "cafe-1"
    ).trim() ||
    "cafe-1";


localStorage.setItem(
    "cafeId",
    CAFE_ID
);


/*
 * SAME BACKEND CONNECTION STYLE AS ORDER MONITOR
 *
 * Live Server:
 *   http://127.0.0.1:5500  -> http://127.0.0.1:5000
 *   http://localhost:5500  -> http://localhost:5000
 *
 * Express:
 *   http://localhost:5000  -> same origin
 */
function resolveBackendOrigin() {
  // LAN-safe rule: when the page is opened through HTTP/HTTPS, always use
  // the exact hostname the browser used (localhost on laptop, LAN IP on tablet).
  // This avoids stale localStorage IP overrides after Wi-Fi/hotspot changes.
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    if (window.location.port === "5000") return window.location.origin;
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
  if (saved) return saved.replace(/\/$/, "");
  return "http://127.0.0.1:5000";
}


const API_URL =
    resolveBackendOrigin();


function getAuthToken() {

    return (
        window.CafeAuth?.token ||
        localStorage.getItem(
            "cafeAuthToken"
        ) ||
        ""
    );

}


async function authenticatedFetch(
    url,
    options = {}
) {

    if (
        window.CafeAuth?.apiFetch
    ) {

        return window.CafeAuth.apiFetch(
            url,
            options
        );

    }


    const headers =
        new Headers(
            options.headers ||
            {}
        );


    const token =
        getAuthToken();


    if (token) {

        headers.set(
            "Authorization",
            `Bearer ${token}`
        );

    }


    return fetch(
        url,
        {
            ...options,

            credentials:
                "include",

            headers
        }
    );

}


console.log(
    "POS API:",
    API_URL
);



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
                localStorage.getItem(`cafe_products:${CAFE_ID}`) ||
                (CAFE_ID === "cafe-1" ? localStorage.getItem("cafe_products") : null) ||
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
    renderMenu();
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

    if (!status) {
        return false;
    }

    const option =
        String(value || "")
            .trim()
            .toLowerCase();

    if (
        fieldKey ===
        "size"
    ) {
        return (
            status.blockedSizes ||
            []
        ).some(
            item =>
                String(item)
                    .toLowerCase() ===
                option
        );
    }

    return (
        status.blockedOptions ||
        []
    ).some(
        item =>
            String(item)
                .toLowerCase() ===
            option
    );
}

function renderInventoryLowStockBanner() {
    let banner =
        document.getElementById(
            "recipeInventoryAlert"
        );

    if (!banner) {
        banner =
            document.createElement(
                "div"
            );

        banner.id =
            "recipeInventoryAlert";

        banner.className =
            "recipe-inventory-alert";

        document.body.appendChild(
            banner
        );
    }

    const alerts = [];

    inventoryStatusIndex.forEach(
        item => {
            if (
                !item.lowStock &&
                !(item.lowOptions || []).length
            ) {
                return;
            }

            (item.alerts || []).forEach(
                alert => {
                    alerts.push({
                        itemName:
                            item.itemName,
                        ...alert
                    });
                }
            );
        }
    );

    const unique =
        Array.from(
            new Map(
                alerts.map(
                    alert => [
                        `${alert.itemName}|${alert.name}`,
                        alert
                    ]
                )
            ).values()
        );

    if (!unique.length) {
        banner.classList.remove(
            "active"
        );
        banner.innerHTML =
            "";
        return;
    }

    banner.innerHTML = `
        <strong>⚠ Low Ingredient Stock</strong>
        <span>
            ${unique
                .slice(0, 4)
                .map(
                    alert =>
                        `${escapeHTML(alert.itemName)}: ${escapeHTML(alert.name)} (${Number(alert.stock || 0)} ${escapeHTML(alert.unit || "")})`
                )
                .join(" • ")}
            ${unique.length > 4 ? ` • +${unique.length - 4} more` : ""}
        </span>
    `;

    banner.classList.add(
        "active"
    );
}

async function refreshRecipeInventoryStatus(
    rerender = true
) {
    try {
        const response =
            await fetch(
                `${RECIPE_INVENTORY_STATUS_API}?cafeId=${encodeURIComponent(CAFE_ID)}`,
                {
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
                `Inventory status returned ${response.status}`
            );
        }

        const data =
            await response.json();

        const items =
            Array.isArray(
                data.items
            )
                ? data.items
                : [];

        inventoryStatusIndex =
            new Map(
                items.map(
                    item => [
                        managedAvailabilityKey(
                            item.itemName,
                            item.category
                        ),
                        item
                    ]
                )
            );

        renderInventoryLowStockBanner();

        if (rerender) {
            renderMenu();
        }

    } catch (error) {
        console.warn(
            "Recipe inventory status unavailable:",
            error
        );
    }
}


let currentCategory =
    "coffee";

let cart =
    [];

let pendingItem =
    null;

let selectedPaymentMethod =
    "Cash";


// =========================================================
// HELPERS
// =========================================================

function money(value) {
    return `₱${Number(value || 0).toFixed(2)}`;
}


function escapeHTML(value) {

    return String(value).replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    );

}


// =========================================================
// CATEGORIES
// =========================================================

const categoryConfig = {

    coffee: {
        title: "Coffees",
        image: "/Assets/images/coffee.png"
    },

    "non-coffee": {
        title: "Non-Coffees",
        image: "/Assets/images/non-coffee.png"
    },

    milktea: {
        title: "Milk Tea",
        image: "/Assets/images/milktea.png"
    },

    food: {
        title: "Foods",
        image: "/Assets/images/food.png"
    },

    snack: {
        title: "Snacks",
        image: "/Assets/images/snack.png"
    },

    dessert: {
        title: "Dessert",
        image: "/Assets/images/dessert.png"
    }

};

function categoryMeta(category) {
    return categoryConfig[String(category || "")] || {
        title: String(category || "Menu").replace(/-/g," ").replace(/\b\w/g,c=>c.toUpperCase()),
        image: "/Assets/images/logo.png"
    };
}

function rebuildPosCategories(categories) {
    const nav = document.querySelector(".category-navigation");
    if (!nav) return;
    nav.innerHTML = "";
    const list = Array.isArray(categories) ? categories : [];

    list.forEach((category, index) => {
        const key = String(category.canonicalKey || category.key || category.name || "").trim();
        if (!key) return;
        categoryConfig[key] = {
            title: String(category.name || key),
            image: category.image || category.imagePath || categoryMeta(key).image
        };
        if (!menuData[key]) menuData[key] = [];

        const button = document.createElement("button");
        button.type = "button";
        button.className = `category-button${index === 0 ? " active" : ""}`;
        button.dataset.category = key;
        const img = document.createElement("img");
        img.src = categoryConfig[key].image;
        img.alt = "";
        const label = document.createElement("span");
        label.textContent = categoryConfig[key].title;
        button.append(img, label);
        button.addEventListener("click", () => selectCategory(key, button));
        nav.appendChild(button);
    });

    currentCategory = list.length
        ? String(list[0].canonicalKey || list[0].key || list[0].name || "").trim()
        : "";
}


// =========================================================
// PRODUCTS
// =========================================================

const menuData = {

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
        { name: "Cookies and Cream Ice Cream", price: 110 },
        { name: "Mango Graham", price: 130 },
        { name: "Mango Float", price: 130 },
        { name: "Leche Flan", price: 120 },
        { name: "Chocolate Mousse", price: 140 },
        { name: "Panna Cotta", price: 150 }
    ]

};


// =========================================================
// CUSTOMIZATIONS
// =========================================================

const customizationConfig = {

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
            type: "radio",
            options: [
                { label: "Whole Milk", value: "Whole Milk", price: 0 },
                { label: "Skim Milk", value: "Skim Milk", price: 0 },
                { label: "Almond Milk", value: "Almond Milk", price: 15 },
                { label: "Oat Milk", value: "Oat Milk", price: 20 }
            ]
        },

        {
            key: "addons",
            label: "Add-Ons",
            type: "checkbox",
            options: [
                { label: "Extra Shot", value: "Extra Shot", price: 25 },
                { label: "Vanilla Syrup", value: "Vanilla Syrup", price: 20 },
                { label: "Caramel Drizzle", value: "Caramel Drizzle", price: 20 },
                { label: "Hazelnut Syrup", value: "Hazelnut Syrup", price: 20 }
            ]
        }
    ],


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
            key: "addons",
            label: "Add-Ons",
            type: "checkbox",
            options: [
                { label: "Boba", value: "Boba", price: 25 },
                { label: "Pearls", value: "Pearls", price: 15 },
                { label: "Whipped Cream", value: "Whipped Cream", price: 15 }
            ]
        }
    ],


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
            type: "radio",
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
                { label: "Regular Ice", value: "Regular Ice", price: 0 },
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
                { label: "Grass Jelly", value: "Grass Jelly", price: 15 },
                { label: "Pudding", value: "Pudding", price: 20 },
                { label: "Cream Cheese", value: "Cream Cheese", price: 25 }
            ]
        }
    ],


    food: [
        {
            key: "side",
            label: "Side",
            type: "radio",
            options: [
                { label: "No Side", value: "No Side", price: 0 },
                { label: "Fries", value: "Fries", price: 35 },
                { label: "Salad", value: "Salad", price: 35 }
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


    snack: [
        {
            key: "serving",
            label: "Serving",
            type: "radio",
            options: [
                { label: "Single", value: "Single", price: 0 },
                { label: "Bundle", value: "Bundle", price: 20 }
            ]
        },

        {
            key: "addons",
            label: "Add-Ons",
            type: "checkbox",
            options: [
                { label: "Dip Sauce", value: "Dip Sauce", price: 10 },
                { label: "Extra Cheese", value: "Extra Cheese", price: 20 }
            ]
        }
    ],


    dessert: [
        {
            key: "serve",
            label: "Serve Style",
            type: "radio",
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
                { label: "Chocolate Drizzle", value: "Chocolate Drizzle", price: 15 },
                { label: "Fruit", value: "Fruit", price: 20 },
                { label: "Whipped Cream", value: "Whipped Cream", price: 15 }
            ]
        }
    ]

};


// =========================================================
// PRODUCTS BY CATEGORY
// =========================================================

function getCategoryItems(category) {

    return (
        menuData[category] ||
        []
    ).map(
        (product, index) => ({
            id: `${category}-${index}`,
            category,
            name: product.name,
            price: Number(product.price),
            image: categoryMeta(category).image,
            available:
                isMenuItemAvailable(
                    product.name,
                    category
                )
        })
    );

}


// =========================================================
// CATEGORY
// =========================================================

function selectCategory(category, button = null) {

    currentCategory =
        category;


    document
        .querySelectorAll(".category-button")
        .forEach(
            item =>
                item.classList.remove("active")
        );


    const activeButton =
        button ||
        document.querySelector(
            `.category-button[data-category="${category}"]`
        );


    activeButton
        ?.classList
        .add("active");


    $("categoryTitle").textContent =
        categoryMeta(category).title;


    $("categoryIcon").src =
        categoryMeta(category).image;


    $("menuSearch").value =
        "";


    renderMenu();

}


// =========================================================
// MENU
// =========================================================

function renderMenu() {

    const grid =
        $("menuGrid");


    const search =
        $("menuSearch")
            .value
            .trim()
            .toLowerCase();


    const products =
        getCategoryItems(
            currentCategory
        )
        .filter(
            product =>
                product.name
                    .toLowerCase()
                    .includes(search)
        );


    grid.innerHTML =
        "";


    if (
        products.length ===
        0
    ) {

        grid.innerHTML = `
            <div class="empty-cart">
                No menu items found.
            </div>
        `;

        return;

    }


    products.forEach(
        product => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                `menu-card${
                    product.available
                        ? ""
                        : " menu-card-unavailable"
                }`;

            card.setAttribute(
                "aria-disabled",
                product.available
                    ? "false"
                    : "true"
            );

            card.innerHTML = `

                ${
                    product.available
                        ? ""
                        : `
                            <span class="menu-unavailable-badge">
                                🔒 UNAVAILABLE
                            </span>
                        `
                }

                ${
                    product.available &&
                    getRecipeInventoryStatus(
                        product.name,
                        product.category
                    )?.lowStock
                        ? `
                            <span class="menu-low-stock-badge">
                                ⚠ LOW STOCK
                            </span>
                        `
                        : ""
                }

                <div class="menu-card-image">

                    <img
                        src="${product.image}"
                        alt="${escapeHTML(product.name)}"
                    >

                </div>

                <h3>
                    ${escapeHTML(product.name)}
                </h3>

                <span class="menu-price">
                    ${money(product.price)}
                </span>

            `;

            if (
                product.available
            ) {
                card.addEventListener(
                    "click",
                    () =>
                        showItemModal(
                            product
                        )
                );
            }

            grid.appendChild(
                card
            );

        }
    );

}


// =========================================================
// ITEM MODAL
// =========================================================

function showItemModal(item) {

    if (
        !item ||
        !isMenuItemAvailable(
            item.name,
            item.category
        )
    ) {
        console.warn(
            "Unavailable POS item cannot be opened:",
            item?.name
        );
        return;
    }


    pendingItem = {
        ...item,
        qty: 1,
        selections: {}
    };


    $("modalProductName")
        .textContent =
        item.name;


    $("modalProductDetails")
        .textContent =
        categoryMeta(
            item.category
        ).title;


    $("modalProductImage").src =
        item.image;


    renderCustomizationOptions();

    updateModalTotal();


    $("itemModal")
        .classList
        .add("active");

}


// =========================================================
// OPTIONS
// =========================================================

function renderCustomizationOptions() {

    const container =
        $("dynamicOptions");


    container.innerHTML =
        "";


    const fields =
        customizationConfig[
            pendingItem.category
        ] || [];


    fields.forEach(
        field => {

            const section =
                document.createElement(
                    "section"
                );


            section.className =
                "option-section";


            const heading =
                document.createElement(
                    "h3"
                );


            heading.textContent =
                field.type === "checkbox"
                    ? `${field.label} (Optional)`
                    : `Select ${field.label}`;


            section.appendChild(
                heading
            );


            if (
                field.type ===
                "radio"
            ) {

                const group =
                    document.createElement(
                        "div"
                    );


                group.className =
                    "option-cards";


                field.options.forEach(
                    (option, index) => {

                        const blocked =
                            inventoryOptionBlocked(
                                pendingItem.name,
                                pendingItem.category,
                                field.key,
                                option.value
                            );

                        const label =
                            document.createElement(
                                "label"
                            );


                        label.className =
                            "option-card";


                        const input =
                            document.createElement(
                                "input"
                            );


                        input.type =
                            "radio";

                        input.name =
                            `pos-${field.key}`;

                        input.value =
                            option.value;

                        input.dataset.price =
                            option.price;

                        input.disabled =
                            blocked;

                        if (blocked) {
                            label.classList.add(
                                "inventory-option-unavailable"
                            );
                        }

                        input.checked =
                            !blocked &&
                            pendingItem
                                .selections[
                                    field.key
                                ] ===
                                undefined;


                        if (
                            input.checked
                        ) {

                            pendingItem
                                .selections[
                                    field.key
                                ] =
                                option.value;

                        }


                        input.addEventListener(
                            "change",
                            () => {

                                pendingItem
                                    .selections[
                                        field.key
                                    ] =
                                    option.value;


                                updateModalTotal();

                            }
                        );


                        const name =
                            document.createElement(
                                "span"
                            );

                        name.className =
                            "option-name";

                        name.textContent =
                            option.label;


                        const price =
                            document.createElement(
                                "span"
                            );

                        price.className =
                            "option-price";

                        price.textContent =
                            blocked
                                ? "OUT OF STOCK"
                                : option.price
                                    ? `+ ${money(option.price)}`
                                    : "Included";


                        label.append(
                            input,
                            name,
                            price
                        );


                        group.appendChild(
                            label
                        );

                    }
                );


                section.appendChild(
                    group
                );

            }


            if (
                field.type ===
                "checkbox"
            ) {

                pendingItem
                    .selections[
                        field.key
                    ] = [];


                const group =
                    document.createElement(
                        "div"
                    );


                group.className =
                    "addons-grid";


                field.options.forEach(
                    option => {

                        const blocked =
                            inventoryOptionBlocked(
                                pendingItem.name,
                                pendingItem.category,
                                field.key,
                                option.value
                            );

                        const label =
                            document.createElement(
                                "label"
                            );


                        label.className =
                            "addon-option";


                        const input =
                            document.createElement(
                                "input"
                            );


                        input.type =
                            "checkbox";

                        input.value =
                            option.value;

                        input.dataset.price =
                            option.price;

                        input.disabled =
                            blocked;

                        if (blocked) {
                            label.classList.add(
                                "inventory-option-unavailable"
                            );
                        }


                        input.addEventListener(
                            "change",
                            () => {

                                const array =
                                    pendingItem
                                        .selections[
                                            field.key
                                        ];


                                if (
                                    input.checked
                                ) {

                                    array.push(
                                        option.value
                                    );

                                } else {

                                    const index =
                                        array.indexOf(
                                            option.value
                                        );


                                    if (
                                        index !== -1
                                    ) {

                                        array.splice(
                                            index,
                                            1
                                        );

                                    }

                                }


                                updateModalTotal();

                            }
                        );


                        const name =
                            document.createElement(
                                "span"
                            );

                        name.textContent =
                            option.label;


                        const price =
                            document.createElement(
                                "strong"
                            );

                        price.textContent =
                            blocked
                                ? "OUT OF STOCK"
                                : option.price
                                    ? `+ ${money(option.price)}`
                                    : "Free";


                        label.append(
                            input,
                            name,
                            price
                        );


                        group.appendChild(
                            label
                        );

                    }
                );


                section.appendChild(
                    group
                );

            }


            container.appendChild(
                section
            );

        }
    );

}


// =========================================================
// CUSTOMIZATION PRICE
// =========================================================

function customizationCost() {

    let cost =
        0;


    const fields =
        customizationConfig[
            pendingItem.category
        ] || [];


    fields.forEach(
        field => {

            const selected =
                pendingItem
                    .selections[
                        field.key
                    ];


            if (
                field.type ===
                "radio"
            ) {

                const option =
                    field.options.find(
                        item =>
                            item.value ===
                            selected
                    );


                cost +=
                    Number(
                        option?.price ||
                        0
                    );

            }


            if (
                field.type ===
                "checkbox"
            ) {

                (
                    selected ||
                    []
                ).forEach(
                    value => {

                        const option =
                            field.options.find(
                                item =>
                                    item.value ===
                                    value
                            );


                        cost +=
                            Number(
                                option?.price ||
                                0
                            );

                    }
                );

            }

        }
    );


    return cost;

}


// =========================================================
// CUSTOMIZATION TEXT
// =========================================================

function customizationLabels() {

    const result =
        [];


    const fields =
        customizationConfig[
            pendingItem.category
        ] || [];


    fields.forEach(
        field => {

            const value =
                pendingItem
                    .selections[
                        field.key
                    ];


            if (
                Array.isArray(value)
            ) {

                if (
                    value.length
                ) {

                    result.push(
                        `${field.label}: ${value.join(", ")}`
                    );

                }

            } else if (
                value
            ) {

                result.push(
                    `${field.label}: ${value}`
                );

            }

        }
    );


    return result;

}


// =========================================================
// MODAL TOTAL
// =========================================================

function updateModalTotal() {

    if (
        !pendingItem
    ) return;


    const price =
        Number(
            pendingItem.price
        ) +
        customizationCost();


    $("qtyValue")
        .textContent =
        pendingItem.qty;


    $("modalTotal")
        .textContent =
        money(
            price *
            pendingItem.qty
        );

}


// =========================================================
// QUANTITY
// =========================================================

function changePendingQuantity(change) {

    if (
        !pendingItem
    ) return;


    pendingItem.qty =
        Math.max(
            1,
            pendingItem.qty +
            change
        );


    updateModalTotal();

}


// =========================================================
// CLOSE MODAL
// =========================================================

function closeItemModal() {

    $("itemModal")
        .classList
        .remove("active");


    pendingItem =
        null;

}


// =========================================================
// ADD CART
// =========================================================

function confirmAddItem() {

    if (
        !pendingItem
    ) return;


    if (
        !isMenuItemAvailable(
            pendingItem.name,
            pendingItem.category
        )
    ) {
        closeItemModal();
        renderMenu();

        alert(
            "This item is currently unavailable."
        );

        return;
    }


    const extra =
        customizationCost();


    const labels =
        customizationLabels();


    const key =
        [
            pendingItem.id,
            ...labels
        ].join("|");


    const existing =
        cart.find(
            item =>
                item.key ===
                key
        );


    if (
        existing
    ) {

        existing.qty +=
            pendingItem.qty;

    } else {

        cart.push({

            key,

            productId:
                pendingItem.id,

            category:
                pendingItem.category,

            name:
                pendingItem.name,

            image:
                pendingItem.image,

            price:
                Number(
                    pendingItem.price
                ),

            customizationCost:
                extra,

            customizations:
                labels,

            qty:
                pendingItem.qty

        });

    }


    renderCart();

    closeItemModal();

}


// =========================================================
// CART
// =========================================================

function renderCart() {

    const container =
        $("cartList");


    const totalItemQuantity =
        cart.reduce(
            (sum, item) =>
                sum + Number(item.qty || 0),
            0
        );


    $("cartItemCount").textContent =
        `${totalItemQuantity} ${
            totalItemQuantity === 1
                ? "item"
                : "items"
        }`;


    if (
        cart.length ===
        0
    ) {

        container.innerHTML = `
            <div class="empty-cart">
                No items added yet.
            </div>
        `;


        updateCartTotals();

        return;

    }


    container.innerHTML =
        cart.map(
            (item, index) => {

                const unit =
                    Number(
                        item.price
                    ) +
                    Number(
                        item.customizationCost
                    );


                const lineTotal =
                    unit *
                    item.qty;


                const details =
                    item.customizations &&
                    item.customizations.length
                        ? item.customizations
                            .map(
                                detail =>
                                    `<li>${escapeHTML(detail)}</li>`
                            )
                            .join("")
                        : `<li>Standard</li>`;


                return `

                    <article class="cart-item">

                        <div class="cart-item-header">

                            <strong class="cart-item-name">
                                ${escapeHTML(item.name)}
                            </strong>

                        </div>


                        <ul class="cart-customizations">
                            ${details}
                        </ul>


                        <div class="cart-item-summary">

                            <span class="cart-qty-label">
                                Qty: <strong>${item.qty}</strong>
                            </span>

                            <strong class="cart-price">
                                ${money(lineTotal)}
                            </strong>

                        </div>


                        <div class="cart-quantity">

                            <button
                                type="button"
                                class="qty-button qty-minus"
                                aria-label="Decrease ${escapeHTML(item.name)} quantity"
                                onclick="changeCartQuantity(${index}, -1)"
                            >
                                −
                            </button>


                            <span class="qty-number">
                                ${item.qty}
                            </span>


                            <button
                                type="button"
                                class="qty-button qty-plus"
                                aria-label="Increase ${escapeHTML(item.name)} quantity"
                                onclick="changeCartQuantity(${index}, 1)"
                            >
                                +
                            </button>

                        </div>

                    </article>

                `;

            }
        )
        .join("");


    updateCartTotals();

}


// =========================================================
// CART QUANTITY
// =========================================================

window.changeCartQuantity =
    function (
        index,
        change
    ) {

        if (
            !cart[index]
        ) return;


        cart[index].qty +=
            change;


        if (
            cart[index].qty <=
            0
        ) {

            cart.splice(
                index,
                1
            );

        }


        renderCart();

    };


// =========================================================
// REMOVE CART
// =========================================================

window.removeCartItem =
    function (index) {

        cart.splice(
            index,
            1
        );


        renderCart();

    };


// =========================================================
// TOTAL
// =========================================================

function calculateCart() {

    const subtotal =
        cart.reduce(
            (
                total,
                item
            ) => {

                const unit =
                    Number(
                        item.price
                    ) +
                    Number(
                        item.customizationCost
                    );


                return total +
                    unit *
                    item.qty;

            },
            0
        );


    // Manual discount selection was removed from POS. Discounts are now
    // determined by the Discount Eligibility + active promotions layer.
    const discountRate =
        Number(
            $("discount")?.value ||
            0
        );


    const discount =
        subtotal *
        discountRate;


    const total =
        subtotal -
        discount;


    return {
        subtotal,
        discount,
        total
    };

}


// =========================================================
// UPDATE TOTALS
// =========================================================

function updateCartTotals() {

    const totals =
        calculateCart();


    $("subtotal").textContent =
        money(
            totals.subtotal
        );


    $("discountAmount").textContent =
        `-${money(
            totals.discount
        )}`;


    $("total").textContent =
        money(
            totals.total
        );


    updateChange();

}


// =========================================================
// CHANGE
// =========================================================

function updateChange() {

    const totals =
        calculateCart();


    const payment =
        $("paymentMethod").value;


    const cashInput =
        $("cashReceived");


    const rawCash =
        cashInput.value.trim();


    let change =
        0;


    // Change = Cash Received - Final Total
    // This runs on every input event, so the value updates instantly.
    if (
        payment === "Cash" &&
        rawCash !== ""
    ) {

        const cash =
            Number(rawCash);


        if (
            Number.isFinite(cash) &&
            cash >= totals.total
        ) {

            change =
                cash - totals.total;

        }

    }


    $("changeAmount").textContent =
        money(change);

}


// =========================================================
// PAYMENT FIELD STATE
// =========================================================

function updatePaymentFields() {

    const payment =
        $("paymentMethod").value;


    const cashInput =
        $("cashReceived");


    const isCash =
        payment === "Cash";


    cashInput.disabled =
        !isCash;


    if (!isCash) {

        cashInput.value =
            "";

        cashInput.placeholder =
            "Not required";

    } else {

        cashInput.placeholder =
            "₱0.00";

    }


    updateChange();

}


// =========================================================
// ORDER NUMBER
// =========================================================

function generateOrderNumber() {

    let sequence =
        Number(
            localStorage.getItem(
                "posOrderCounter"
            )
        ) || 1000;


    sequence++;


    localStorage.setItem(
        "posOrderCounter",
        sequence
    );


    return `POS-${sequence}`;

}


// =========================================================
// CONFIRM ORDER
// =========================================================

async function confirmPOSOrder() {

    if (
        cart.length ===
        0
    ) {

        alert(
            "Please add items first."
        );

        return;

    }


    const totals =
        calculateCart();


    const paymentMethod =
        $("paymentMethod").value;


    const cashReceived =
        Number(
            $("cashReceived").value ||
            0
        );


    if (
        paymentMethod ===
            "Cash" &&
        cashReceived <
            totals.total
    ) {

        alert(
            "Cash received is not enough."
        );

        return;

    }


    const change =
        paymentMethod ===
        "Cash"
            ? cashReceived -
                totals.total
            : 0;


    const orderPayload = {

        cafeId:
            CAFE_ID,

        source:
            "POS",

        orderNumber:
            generateOrderNumber(),

        customerName:
            "Walk-in Customer",

        serviceType:
            $("serviceType").value,

        paymentMethod,

        cashReceived,

        change,

        subtotal:
            Number(
                totals.subtotal
                    .toFixed(
                        2
                    )
            ),

        discountAmount:
            Number(
                totals.discount
                    .toFixed(
                        2
                    )
            ),

        total:
            Number(
                totals.total
                    .toFixed(
                        2
                    )
            ),

        status:
            "Pending",

        createdAt:
            new Date()
                .toISOString(),

        items:
            cart.map(
                item => {

                    const price =
                        Number(
                            item.price ||
                            0
                        );


                    const customizationCost =
                        Number(
                            item.customizationCost ||
                            0
                        );


                    const qty =
                        Number(
                            item.qty ||
                            1
                        );


                    return {

                        productId:
                            item.productId ||
                            null,

                        name:
                            item.name,

                        category:
                            item.category,

                        price,

                        customizationCost,

                        customizations:
                            Array.isArray(
                                item.customizations
                            )
                                ? item.customizations
                                : [],

                        quantity:
                            qty,

                        qty,

                        subtotal:
                            Number(
                                (
                                    (
                                        price +
                                        customizationCost
                                    ) *
                                    qty
                                ).toFixed(
                                    2
                                )
                            )

                    };

                }
            )

    };


    console.log(
        "======================================"
    );

    console.log(
        "📦 POS ORDER"
    );

    console.log(
        "API:",
        `${API_URL}/api/orders`
    );

    console.log(
        orderPayload
    );

    console.log(
        "======================================"
    );


    const checkoutButton =
        $("checkoutButton");


    const originalText =
        checkoutButton.textContent;


    checkoutButton.disabled =
        true;

    checkoutButton.textContent =
        "Sending...";


    try {

        /*
         * SAME REQUEST STYLE AS ORDER MONITOR:
         * authenticatedFetch + API_URL
         */
        const response =
            await authenticatedFetch(
                `${API_URL}/api/orders`,
                {
                    method:
                        "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify(
                            orderPayload
                        )
                }
            );


        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );


        if (
            !response.ok
        ) {

            const errors =
                Array.isArray(
                    data.errors
                )
                    ? data.errors.join(
                        "\n"
                    )
                    : "";


            throw new Error(
                errors ||
                data.message ||
                `HTTP ${response.status}`
            );

        }


        if (
            data.success ===
            false
        ) {

            throw new Error(
                data.message ||
                "The backend rejected the order."
            );

        }


        const savedOrder =
            data.order ||
            orderPayload;


        console.log(
            "✅ POS ORDER RECEIVED BY BACKEND:",
            savedOrder
        );


        /*
         * Local storage is only a cache AFTER the backend
         * has confirmed the order.
         */
        try {

            const cached =
                JSON.parse(
                    localStorage.getItem(
                        "cafe_orders"
                    ) ||
                    "[]"
                );


            if (
                Array.isArray(
                    cached
                )
            ) {

                cached.unshift(
                    savedOrder
                );


                localStorage.setItem(
                    "cafe_orders",
                    JSON.stringify(
                        cached.slice(
                            0,
                            100
                        )
                    )
                );

            }

        } catch (
            cacheError
        ) {

            console.warn(
                "Could not cache POS order locally:",
                cacheError
            );

        }


        alert(
            `${
                savedOrder.orderNumber ||
                orderPayload.orderNumber
            } received successfully.`
        );


        cart =
            [];


        $("cashReceived").value =
            "";


        // Reset customer eligibility for the next order.
        if (window.CafePromotionClient) {
            window.CafePromotionClient.eligibility = "all";
            sessionStorage.setItem("cafeCustomerEligibility", "all");
            const eligibilitySelect = document.getElementById("ckEligibility");
            if (eligibilitySelect) eligibilitySelect.value = "all";
        }


        $("paymentMethod").value =
            "Cash";


        updatePaymentFields();

        renderCart();


    } catch (
        error
    ) {

        console.error(
            "❌ POS ORDER NOT RECEIVED:",
            error
        );


        alert(
            "ORDER NOT RECEIVED\n\n" +
            error.message +
            "\n\n" +
            `Backend: ${API_URL}`
        );

        /*
         * IMPORTANT:
         * Keep the cart so staff can retry.
         */

    } finally {

        checkoutButton.disabled =
            false;

        checkoutButton.textContent =
            originalText;

    }

}


// =========================================================
// CLEAR ORDER
// =========================================================

function clearPOSCart() {

    if (
        cart.length ===
        0
    ) return;


    if (
        !confirm(
            "Clear the current order?"
        )
    ) return;


    cart = [];

    $("cashReceived").value =
        "";

    renderCart();

}


// =========================================================
// EVENTS
// =========================================================

function setupEvents() {

    document
        .querySelectorAll(
            ".category-button"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        selectCategory(
                            button.dataset.category,
                            button
                        );

                    }
                );

            }
        );


    $("menuSearch")
        .addEventListener(
            "input",
            renderMenu
        );


    $("clearSearch")
        .addEventListener(
            "click",
            () => {

                $("menuSearch").value =
                    "";

                renderMenu();

                $("menuSearch").focus();

            }
        );


    $("qtyMinus")
        .addEventListener(
            "click",
            () =>
                changePendingQuantity(
                    -1
                )
        );


    $("qtyPlus")
        .addEventListener(
            "click",
            () =>
                changePendingQuantity(
                    1
                )
        );


    $("closeItemModal")
        .addEventListener(
            "click",
            closeItemModal
        );


    $("cancelItemButton")
        .addEventListener(
            "click",
            closeItemModal
        );


    $("addCartButton")
        .addEventListener(
            "click",
            confirmAddItem
        );


    const legacyDiscountSelect = $("discount");
    if (legacyDiscountSelect) {
        legacyDiscountSelect.addEventListener(
            "change",
            updateCartTotals
        );
    }


    $("cashReceived")
        .addEventListener(
            "input",
            updateChange
        );


    $("paymentMethod")
        .addEventListener(
            "change",
            event => {

                selectedPaymentMethod =
                    event.target.value;

                updatePaymentFields();

            }
        );


    $("checkoutButton")
        .addEventListener(
            "click",
            confirmPOSOrder
        );


    $("clearCartButton")
        .addEventListener(
            "click",
            clearPOSCart
        );


    $("itemModal")
        .addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    $("itemModal")
                ) {

                    closeItemModal();

                }

            }
        );

}




// =====================================================
// MYSQL PRODUCT CATALOG
// Load current products/prices from MySQL before rendering.
// =====================================================
async function loadMysqlProductCatalog() {
  try {
    const base = typeof API_URL !== "undefined" ? API_URL : `${location.protocol}//${location.hostname}:5000`;
    const response = await authenticatedFetch(`${base}/api/catalog`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const resolvedCafeId = String(payload.cafeId || window.CafeAuth?.session?.cafeId || localStorage.getItem("cafeId") || "cafe-1");
    CAFE_ID = resolvedCafeId;
    localStorage.setItem("cafeId", resolvedCafeId);
    sessionStorage.setItem("cafeId", resolvedCafeId);

    const categories = Array.isArray(payload.categories) ? payload.categories : [];
    const products = Array.isArray(payload.products) ? payload.products : [];
    const isDemo = resolvedCafeId === "cafe-1";

    if (!isDemo) {
      Object.keys(menuData).forEach(key => delete menuData[key]);
    }

    const effectiveCategories = categories.length
      ? categories
      : (isDemo ? [
          {name:"Coffee",canonicalKey:"coffee",image:"/Assets/images/coffee.png"},
          {name:"Non-Coffee",canonicalKey:"non-coffee",image:"/Assets/images/non-coffee.png"},
          {name:"Milktea",canonicalKey:"milktea",image:"/Assets/images/milktea.png"},
          {name:"Food",canonicalKey:"food",image:"/Assets/images/food.png"},
          {name:"Snack",canonicalKey:"snack",image:"/Assets/images/snack.png"},
          {name:"Dessert",canonicalKey:"dessert",image:"/Assets/images/dessert.png"}
        ] : []);

    effectiveCategories.forEach(category => {
      const key = String(category.canonicalKey || category.key || category.name || "").trim();
      if (!key) return;
      categoryConfig[key] = {
        title: String(category.name || key),
        image: category.image || category.imagePath || categoryMeta(key).image
      };
      if (!menuData[key]) menuData[key] = [];
    });

    const grouped = {};
    products.forEach(product => {
      const key = String(product.categoryKey || "").trim();
      if (!key) return;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        name: product.name,
        price: Number(product.price || 0),
        productId: product.id,
        id: product.id,
        availability: product.availability,
        image: product.image || ""
      });
    });
    Object.keys(grouped).forEach(key => {
      if (!menuData[key]) menuData[key] = [];
      menuData[key].splice(0, menuData[key].length, ...grouped[key]);
    });

    rebuildPosCategories(effectiveCategories);
    return true;
  } catch (error) {
    const resolvedCafeId = String(window.CafeAuth?.session?.cafeId || localStorage.getItem("cafeId") || "cafe-1");
    if (resolvedCafeId !== "cafe-1") {
      Object.keys(menuData).forEach(key => delete menuData[key]);
      rebuildPosCategories([]);
      console.error("Cafe POS catalog unavailable; demo products were NOT shown for this cafe.", error);
      return false;
    }
    console.warn("Demo Cafe MySQL catalog unavailable; using bundled sample menu.", error);
    rebuildPosCategories([
      {name:"Coffee",canonicalKey:"coffee",image:"/Assets/images/coffee.png"},
      {name:"Non-Coffee",canonicalKey:"non-coffee",image:"/Assets/images/non-coffee.png"},
      {name:"Milktea",canonicalKey:"milktea",image:"/Assets/images/milktea.png"},
      {name:"Food",canonicalKey:"food",image:"/Assets/images/food.png"},
      {name:"Snack",canonicalKey:"snack",image:"/Assets/images/snack.png"},
      {name:"Dessert",canonicalKey:"dessert",image:"/Assets/images/dessert.png"}
    ]);
    return false;
  }
}

// =========================================================
// START
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        await loadMysqlProductCatalog();

        setupEvents();

        rebuildLocalAvailabilityIndex();

        if (currentCategory) {
            selectCategory(
                currentCategory
            );
        } else {
            $("categoryTitle").textContent = "Menu";
            $("categoryIcon").src = "/Assets/images/logo.png";
            renderMenu();
        }

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
                    event.key === `cafe_products:${CAFE_ID}` ||
                    (CAFE_ID === "cafe-1" && event.key === "cafe_products")
                ) {
                    rebuildLocalAvailabilityIndex();
                    renderMenu();
                }
            }
        );

        renderCart();

        updatePaymentFields();


        console.log(
            "Coffee:",
            menuData.coffee.length
        );

        console.log(
            "Non-Coffee:",
            menuData["non-coffee"].length
        );

        console.log(
            "Milk Tea:",
            menuData.milktea.length
        );

        console.log(
            "Food:",
            menuData.food.length
        );

        console.log(
            "Snack:",
            menuData.snack.length
        );

        console.log(
            "Dessert:",
            menuData.dessert.length
        );

        console.log(
            "TOTAL:",
            Object.values(menuData)
                .reduce(
                    (
                        total,
                        category
                    ) =>
                        total +
                        category.length,
                    0
                )
        );

    }
);