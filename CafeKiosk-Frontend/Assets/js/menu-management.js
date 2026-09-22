/* =========================================================
   CATEGORY IMAGE PATHS
========================================================= */

const CATEGORY_IMAGES = {
    "Coffees":
        "../Assets/images/coffee.png",

    "Non-Coffees":
        "../Assets/images/non-coffee.png",

    "Milk Tea":
        "../Assets/images/milktea.png",

    "Foods":
        "../Assets/images/food.png",

    "Snacks":
        "../Assets/images/snack.png",

    "Dessert":
        "../Assets/images/dessert.png"
};


/* =========================================================
   CAFE CATEGORY ICON LIBRARY
   Owners can choose an icon independently of the category name.
========================================================= */

const CATEGORY_ICON_OPTIONS = [
    { key: "coffee", label: "Coffee", path: "/Assets/images/category-icons/coffee.svg" },
    { key: "milk-tea", label: "Milk Tea", path: "/Assets/images/category-icons/milk-tea.svg" },
    { key: "cold-drink", label: "Non-Coffee", path: "/Assets/images/category-icons/cold-drink.svg" },
    { key: "meal", label: "Food / Meals", path: "/Assets/images/category-icons/meal.svg" },
    { key: "snack", label: "Snacks", path: "/Assets/images/category-icons/snack.svg" },
    { key: "dessert", label: "Dessert", path: "/Assets/images/category-icons/dessert.svg" },
    { key: "pastry", label: "Pastry", path: "/Assets/images/category-icons/pastry.svg" },
    { key: "bakery", label: "Bakery", path: "/Assets/images/category-icons/bakery.svg" },
    { key: "tea", label: "Tea", path: "/Assets/images/category-icons/tea.svg" },
    { key: "smoothie", label: "Smoothie", path: "/Assets/images/category-icons/smoothie.svg" },
    { key: "fruit", label: "Fruit / Juice", path: "/Assets/images/category-icons/fruit.svg" },
    { key: "breakfast", label: "Breakfast", path: "/Assets/images/category-icons/breakfast.svg" },
    { key: "sandwich", label: "Sandwich", path: "/Assets/images/category-icons/sandwich.svg" },
    { key: "ice-cream", label: "Ice Cream", path: "/Assets/images/category-icons/ice-cream.svg" },
    { key: "other", label: "Other", path: "/Assets/images/category-icons/other.svg" }
];

let selectedCategoryIcon = CATEGORY_ICON_OPTIONS[0].path;



/* =========================================================
   CAFE-SCOPED MENU STATE
   cafe-1 is the dedicated CafeKiosk Demo Cafe. All newly
   registered cafes begin with a clean menu.
========================================================= */

const MENU_CAFE_ID =
    String(localStorage.getItem("cafeId") || "cafe-1").trim() ||
    "cafe-1";

const IS_DEMO_CAFE = MENU_CAFE_ID === "cafe-1";
const CATEGORIES_STORAGE_KEY = `cafe_categories:${MENU_CAFE_ID}`;
const PRODUCTS_STORAGE_KEY = `cafe_products:${MENU_CAFE_ID}`;

/* =========================================================
   DEFAULT CATEGORIES
========================================================= */

const initialCategories = [

    {
        name: "Coffees",
        image:
            CATEGORY_IMAGES["Coffees"]
    },

    {
        name: "Non-Coffees",
        image:
            CATEGORY_IMAGES["Non-Coffees"]
    },

    {
        name: "Milk Tea",
        image:
            CATEGORY_IMAGES["Milk Tea"]
    },

    {
        name: "Foods",
        image:
            CATEGORY_IMAGES["Foods"]
    },

    {
        name: "Snacks",
        image:
            CATEGORY_IMAGES["Snacks"]
    },

    {
        name: "Dessert",
        image:
            CATEGORY_IMAGES["Dessert"]
    }

];



/* =========================================================
   DEFAULT PRODUCTS
========================================================= */

const initialProducts = [
  // Coffees - 30 items
  ["Caramel Macchiato", "Coffees", 120],
  ["Affogato", "Coffees", 115],
  ["Latte", "Coffees", 110],
  ["Matcha Espresso Fusion", "Coffees", 135],
  ["Spanish Latte", "Coffees", 125],
  ["Cappuccino", "Coffees", 110],
  ["Americano", "Coffees", 95],
  ["Espresso", "Coffees", 90],
  ["Mocha", "Coffees", 120],
  ["Flat White", "Coffees", 115],
  ["Vanilla Latte", "Coffees", 125],
  ["Hazelnut Latte", "Coffees", 125],
  ["Cafe Mocha", "Coffees", 120],
  ["White Chocolate Mocha", "Coffees", 135],
  ["Iced Americano", "Coffees", 100],
  ["Iced Latte", "Coffees", 115],
  ["Iced Caramel Macchiato", "Coffees", 130],
  ["Cold Brew", "Coffees", 115],
  ["Vanilla Cold Brew", "Coffees", 125],
  ["Salted Caramel Cold Brew", "Coffees", 130],
  ["Brown Sugar Latte", "Coffees", 125],
  ["Honey Latte", "Coffees", 120],
  ["Cinnamon Latte", "Coffees", 120],
  ["Cafe Au Lait", "Coffees", 105],
  ["Double Espresso", "Coffees", 105],
  ["Espresso Macchiato", "Coffees", 100],
  ["Cortado", "Coffees", 110],
  ["Long Black", "Coffees", 100],
  ["Irish Cream Latte", "Coffees", 135],
  ["Coffee Jelly Latte", "Coffees", 130],
  // Non-Coffees - 30 items
  ["Hot Chocolate", "Non-Coffees", 110],
  ["Iced Chocolate", "Non-Coffees", 115],
  ["Strawberry Milk", "Non-Coffees", 110],
  ["Fresh Milk", "Non-Coffees", 90],
  ["Vanilla Milk", "Non-Coffees", 105],
  ["Chocolate Milk", "Non-Coffees", 105],
  ["Matcha Latte", "Non-Coffees", 125],
  ["Iced Matcha Latte", "Non-Coffees", 130],
  ["Strawberry Matcha", "Non-Coffees", 140],
  ["Mango Matcha", "Non-Coffees", 140],
  ["Ube Latte", "Non-Coffees", 125],
  ["Iced Ube Latte", "Non-Coffees", 130],
  ["Taro Latte", "Non-Coffees", 120],
  ["Iced Taro Latte", "Non-Coffees", 125],
  ["Chai Latte", "Non-Coffees", 120],
  ["Iced Chai Latte", "Non-Coffees", 125],
  ["Caramel Milk", "Non-Coffees", 110],
  ["Brown Sugar Milk", "Non-Coffees", 115],
  ["Cookies and Cream", "Non-Coffees", 130],
  ["Chocolate Oreo", "Non-Coffees", 135],
  ["Strawberry Cream", "Non-Coffees", 130],
  ["Mango Cream", "Non-Coffees", 130],
  ["Blueberry Cream", "Non-Coffees", 130],
  ["Vanilla Cream", "Non-Coffees", 120],
  ["Peach Tea", "Non-Coffees", 100],
  ["Lemon Tea", "Non-Coffees", 95],
  ["Lychee Tea", "Non-Coffees", 105],
  ["Passion Fruit Tea", "Non-Coffees", 110],
  ["Strawberry Lemonade", "Non-Coffees", 115],
  ["Mango Lemonade", "Non-Coffees", 115],
  // Milk Tea - 30 items
  ["Classic Milk Tea", "Milk Tea", 95],
  ["Wintermelon Milk Tea", "Milk Tea", 105],
  ["Okinawa Milk Tea", "Milk Tea", 110],
  ["Hokkaido Milk Tea", "Milk Tea", 110],
  ["Taro Milk Tea", "Milk Tea", 105],
  ["Matcha Milk Tea", "Milk Tea", 115],
  ["Chocolate Milk Tea", "Milk Tea", 110],
  ["Thai Milk Tea", "Milk Tea", 110],
  ["Brown Sugar Milk Tea", "Milk Tea", 120],
  ["Pearl Milk Tea", "Milk Tea", 105],
  ["Cookies and Cream Milk Tea", "Milk Tea", 120],
  ["Cheesecake Milk Tea", "Milk Tea", 125],
  ["Salted Caramel Milk Tea", "Milk Tea", 120],
  ["Hazelnut Milk Tea", "Milk Tea", 115],
  ["Vanilla Milk Tea", "Milk Tea", 110],
  ["Coffee Milk Tea", "Milk Tea", 115],
  ["Strawberry Milk Tea", "Milk Tea", 115],
  ["Mango Milk Tea", "Milk Tea", 115],
  ["Honeydew Milk Tea", "Milk Tea", 110],
  ["Melon Milk Tea", "Milk Tea", 110],
  ["Ube Milk Tea", "Milk Tea", 115],
  ["Red Velvet Milk Tea", "Milk Tea", 120],
  ["Dark Chocolate Milk Tea", "Milk Tea", 120],
  ["White Chocolate Milk Tea", "Milk Tea", 120],
  ["Blueberry Milk Tea", "Milk Tea", 115],
  ["Lychee Milk Tea", "Milk Tea", 115],
  ["Peach Milk Tea", "Milk Tea", 115],
  ["Passion Fruit Milk Tea", "Milk Tea", 115],
  ["Caramel Macchiato Milk Tea", "Milk Tea", 125],
  ["Cream Cheese Milk Tea", "Milk Tea", 125],
  // Foods - 30 items
  ["Siomai", "Foods", 75],
  ["Takoyaki", "Foods", 95],
  ["Chicken Rice Bowl", "Foods", 145],
  ["Beef Rice Bowl", "Foods", 155],
  ["Pork Rice Bowl", "Foods", 145],
  ["Chicken Teriyaki", "Foods", 160],
  ["Beef Teriyaki", "Foods", 170],
  ["Pork Tonkatsu", "Foods", 165],
  ["Chicken Katsu", "Foods", 160],
  ["Burger Steak", "Foods", 150],
  ["Spaghetti", "Foods", 120],
  ["Carbonara", "Foods", 135],
  ["Baked Macaroni", "Foods", 130],
  ["Lasagna", "Foods", 150],
  ["Chicken Sandwich", "Foods", 125],
  ["Ham and Cheese Sandwich", "Foods", 115],
  ["Tuna Sandwich", "Foods", 120],
  ["Clubhouse Sandwich", "Foods", 150],
  ["Cheeseburger", "Foods", 135],
  ["Chicken Burger", "Foods", 135],
  ["Hotdog Sandwich", "Foods", 95],
  ["Corned Beef Rice", "Foods", 125],
  ["Tocino Rice", "Foods", 130],
  ["Longganisa Rice", "Foods", 130],
  ["Tapsilog", "Foods", 150],
  ["Chicksilog", "Foods", 145],
  ["Hotsilog", "Foods", 120],
  ["Pork Sisig Rice", "Foods", 155],
  ["Chicken Sisig Rice", "Foods", 150],
  ["Garlic Butter Chicken", "Foods", 165],
  // Snacks - 30 items
  ["French Fries", "Snacks", 85],
  ["Onion Rings", "Snacks", 90],
  ["Mozzarella Sticks", "Snacks", 120],
  ["Nuggets", "Snacks", 110],
  ["Cheese Fries", "Snacks", 105],
  ["Bacon Cheese Fries", "Snacks", 125],
  ["Potato Wedges", "Snacks", 95],
  ["Hash Browns", "Snacks", 90],
  ["Nachos", "Snacks", 110],
  ["Loaded Nachos", "Snacks", 140],
  ["Cheese Sticks", "Snacks", 95],
  ["Dynamite Rolls", "Snacks", 100],
  ["Spring Rolls", "Snacks", 95],
  ["Fish Balls", "Snacks", 75],
  ["Squid Balls", "Snacks", 80],
  ["Kikiam", "Snacks", 75],
  ["Mini Corn Dogs", "Snacks", 110],
  ["Chicken Wings", "Snacks", 145],
  ["Buffalo Wings", "Snacks", 155],
  ["Garlic Parmesan Wings", "Snacks", 155],
  ["Chicken Pops", "Snacks", 125],
  ["Popcorn Chicken", "Snacks", 125],
  ["Calamares", "Snacks", 135],
  ["Crispy Tofu", "Snacks", 105],
  ["Fried Dumplings", "Snacks", 110],
  ["Potato Chips", "Snacks", 70],
  ["Tortilla Chips", "Snacks", 75],
  ["Garlic Bread", "Snacks", 80],
  ["Cheesy Garlic Bread", "Snacks", 95],
  ["Mini Pizza Bites", "Snacks", 120],
  // Dessert - 30 items
  ["Waffles", "Dessert", 105],
  ["Pancakes", "Dessert", 100],
  ["Chocolate Cake", "Dessert", 120],
  ["Red Velvet Cake", "Dessert", 125],
  ["Cheesecake", "Dessert", 135],
  ["Blueberry Cheesecake", "Dessert", 140],
  ["Strawberry Cheesecake", "Dessert", 140],
  ["Carrot Cake", "Dessert", 120],
  ["Banana Cake", "Dessert", 110],
  ["Brownie", "Dessert", 90],
  ["Chocolate Brownie", "Dessert", 95],
  ["Brownie Sundae", "Dessert", 125],
  ["Chocolate Chip Cookie", "Dessert", 70],
  ["Oatmeal Cookie", "Dessert", 70],
  ["Double Chocolate Cookie", "Dessert", 75],
  ["Chocolate Muffin", "Dessert", 90],
  ["Blueberry Muffin", "Dessert", 95],
  ["Banana Muffin", "Dessert", 90],
  ["Cinnamon Roll", "Dessert", 105],
  ["Croissant", "Dessert", 95],
  ["Chocolate Croissant", "Dessert", 105],
  ["Donut", "Dessert", 75],
  ["Chocolate Donut", "Dessert", 80],
  ["Glazed Donut", "Dessert", 80],
  ["Ice Cream Sundae", "Dessert", 110],
  ["Chocolate Sundae", "Dessert", 115],
  ["Strawberry Sundae", "Dessert", 115],
  ["Mango Float", "Dessert", 120],
  ["Leche Flan", "Dessert", 110],
  ["Coffee Jelly", "Dessert", 105]
].map((p, i) => ({
  id: Date.now() + i,
  name: p[0],
  category: p[1],
  price: p[2],
  availability: "Available",
  description: "",
  image: ""
}));



/* =========================================================
   LOAD LOCAL STORAGE
========================================================= */

let savedCategories = null;

try {
    savedCategories = JSON.parse(
        localStorage.getItem(CATEGORIES_STORAGE_KEY) ||
        (IS_DEMO_CAFE ? localStorage.getItem("cafe_categories") : "null")
    );
} catch (_) {
    savedCategories = null;
}

let categories =
    Array.isArray(savedCategories)
        ? savedCategories
        : (IS_DEMO_CAFE ? initialCategories.map(category => ({ ...category })) : []);



/*
   This repairs old category images
   stored using the wrong image path.
*/

categories =
    categories.map(
        category => ({

            ...category,

            image:
                category.image ||
                CATEGORY_IMAGES[
                    category.name
                ] ||
                "../Assets/images/logo.png"

        })
    );



let savedProducts = [];

try {
    const parsed = JSON.parse(
        localStorage.getItem(PRODUCTS_STORAGE_KEY) ||
        (IS_DEMO_CAFE ? localStorage.getItem("cafe_products") : "[]") ||
        "[]"
    );
    savedProducts = Array.isArray(parsed) ? parsed : [];
} catch (_) {
    savedProducts = [];
}

/*
   Only the dedicated CafeKiosk Demo Cafe receives the bundled
   sample menu. Every real/new cafe starts completely empty.
*/
let products = [...savedProducts];

if (IS_DEMO_CAFE) {
    initialProducts.forEach(defaultProduct => {
        const alreadyExists = products.some(product =>
            product.name.toLowerCase() === defaultProduct.name.toLowerCase() &&
            product.category === defaultProduct.category
        );

        if (!alreadyExists) {
            products.push(defaultProduct);
        }
    });
}



let selectedCategory =
    "All";



let modalMode =
    "add";



/* =========================================================
   ELEMENTS
========================================================= */

const menuView =
    document.getElementById(
        "menuView"
    );


const formView =
    document.getElementById(
        "formView"
    );


const pageTitle =
    document.getElementById(
        "pageTitle"
    );


const categoryTabs =
    document.getElementById(
        "categoryTabs"
    );


const productGrid =
    document.getElementById(
        "productGrid"
    );


const searchInput =
    document.getElementById(
        "searchInput"
    );


const productForm =
    document.getElementById(
        "productForm"
    );


const productCategory =
    document.getElementById(
        "productCategory"
    );


const imageInput =
    document.getElementById(
        "productImage"
    );


const imagePreview =
    document.getElementById(
        "imagePreview"
    );


const imagePlaceholder =
    document.getElementById(
        "imagePlaceholder"
    );




/* =========================================================
   SHARED MENU AVAILABILITY
   Backend-backed so POS/Kiosk on other devices see changes.
========================================================= */

const CAFE_ID = MENU_CAFE_ID;

localStorage.setItem(
    "cafeId",
    CAFE_ID
);

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

const MENU_API_URL =
    resolveBackendOrigin();

function normalizeMenuCategory(value) {
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

function availabilityKey(name, category) {
    return `${normalizeMenuCategory(category)}|${String(name || "").trim().toLowerCase()}`;
}

function getAuthToken() {
    return (
        window.CafeAuth?.token ||
        localStorage.getItem(
            "cafeAuthToken"
        ) ||
        ""
    );
}

let availabilitySyncTimer =
    null;

async function syncAvailabilityToBackend() {
    const token =
        getAuthToken();

    const headers = {
        "Content-Type":
            "application/json"
    };

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    const items =
        products.map(
            product => ({
                name:
                    product.name,
                category:
                    normalizeMenuCategory(
                        product.category
                    ),
                availability:
                    product.availability ===
                    "Unavailable"
                        ? "Unavailable"
                        : "Available"
            })
        );

    try {
        const response =
            await fetch(
                `${MENU_API_URL}/api/menu-availability`,
                {
                    method:
                        "PUT",
                    headers,
                    credentials:
                        "include",
                    body:
                        JSON.stringify({
                            cafeId:
                                CAFE_ID,
                            items
                        })
                }
            );

        if (!response.ok) {
            const body =
                await response
                    .json()
                    .catch(() => ({}));

            throw new Error(
                body.message ||
                `HTTP ${response.status}`
            );
        }

        return true;
    } catch (error) {
        console.warn(
            "Menu availability could not be synced to the backend. Local browser settings were still saved.",
            error
        );
        return false;
    }
}



/* =========================================================
   MYSQL PRODUCT CATALOG
   Products/categories are now persisted through /api/catalog.
========================================================= */
let catalogSyncTimer = null;

async function syncCatalogToBackend() {
    const token = getAuthToken();
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    try {
        const response = await fetch(`${MENU_API_URL}/api/catalog`, {
            method: "PUT",
            headers,
            credentials: "include",
            body: JSON.stringify({
                cafeId: CAFE_ID,
                categories: categories.map(c => ({ name: c.name, image: c.image })),
                products: products.map((p, index) => ({
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    price: Number(p.price || 0),
                    description: p.description || "",
                    image: p.image || "",
                    availability: p.availability === "Unavailable" ? "Unavailable" : "Available",
                    sortOrder: index
                }))
            })
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body.message || `HTTP ${response.status}`);
        }
        return true;
    } catch (error) {
        console.warn("Product catalog could not be synced to MySQL.", error);
        return false;
    }
}

function scheduleCatalogSync() {
    if (catalogSyncTimer) window.clearTimeout(catalogSyncTimer);
    catalogSyncTimer = window.setTimeout(syncCatalogToBackend, 220);
}

async function loadCatalogFromBackend() {
    try {
        const response = await fetch(`${MENU_API_URL}/api/catalog?cafeId=${encodeURIComponent(CAFE_ID)}`, {
            credentials: "include", cache: "no-store"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const remoteCategories = Array.isArray(data.categories) ? data.categories : [];
        const remoteProducts = Array.isArray(data.products) ? data.products : [];

        // An empty catalog is a legitimate state for every newly registered cafe.
        // Only cafe-1 is allowed to fall back to the bundled Demo Cafe menu.
        if (!IS_DEMO_CAFE || remoteCategories.length || remoteProducts.length) {
            categories = remoteCategories.map(category => ({
                name: category.name || category.categoryName || category.canonicalKey || "Category",
                image: category.image || "../Assets/images/logo.png"
            }));

            // Older backends may return products without a separate category array.
            if (!categories.length && remoteProducts.length) {
                const seen = new Set();
                categories = remoteProducts.reduce((list, product) => {
                    const name = product.category || product.categoryKey || "Category";
                    const key = String(name).trim().toLowerCase();
                    if (!seen.has(key)) {
                        seen.add(key);
                        list.push({ name, image: "../Assets/images/logo.png" });
                    }
                    return list;
                }, []);
            }

            products = remoteProducts.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category || p.categoryKey || "Category",
                price: Number(p.price || 0),
                availability: p.availability === "Unavailable" ? "Unavailable" : "Available",
                description: p.description || "",
                image: p.image || ""
            }));

            localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
            localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(products));
            return true;
        }

        return false;
    } catch (error) {
        console.warn("Using cafe-scoped local product catalog because MySQL catalog is unavailable.", error);
        // For a real cafe, local state is still cafe-scoped and never falls back
        // to CafeKiosk Demo Cafe data.
        return !IS_DEMO_CAFE;
    }
}

function scheduleAvailabilitySync() {
    if (availabilitySyncTimer) {
        window.clearTimeout(
            availabilitySyncTimer
        );
    }

    availabilitySyncTimer =
        window.setTimeout(
            syncAvailabilityToBackend,
            180
        );
}

async function loadAvailabilityFromBackend() {
    try {
        const response =
            await fetch(
                `${MENU_API_URL}/api/menu-availability?cafeId=${encodeURIComponent(CAFE_ID)}`,
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

        if (
            items.length ===
            0
        ) {
            return false;
        }

        const index =
            new Map(
                items.map(
                    item => [
                        availabilityKey(
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

        products =
            products.map(
                product => {
                    const key =
                        availabilityKey(
                            product.name,
                            product.category
                        );

                    if (
                        !index.has(
                            key
                        )
                    ) {
                        return product;
                    }

                    return {
                        ...product,
                        availability:
                            index.get(
                                key
                            )
                    };
                }
            );

        localStorage.setItem(
            PRODUCTS_STORAGE_KEY,
            JSON.stringify(
                products
            )
        );

        return true;
    } catch (error) {
        console.warn(
            "Using locally saved menu availability because the backend availability service is unavailable.",
            error
        );
        return false;
    }
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

function persist() {

    localStorage.setItem(
        CATEGORIES_STORAGE_KEY,
        JSON.stringify(
            categories
        )
    );


    localStorage.setItem(
        PRODUCTS_STORAGE_KEY,
        JSON.stringify(
            products
        )
    );


    scheduleAvailabilitySync();
    scheduleCatalogSync();

}



/* =========================================================
   FORMAT PRICE
========================================================= */

function money(value) {

    return (
        "₱" +
        Number(value)
            .toFixed(2)
    );

}

/* Product IDs may come from MySQL as strings while older/local items use numbers. */
function sameProductId(left, right) {
    return String(left ?? "") === String(right ?? "");
}



/* =========================================================
   CATEGORY IMAGE
========================================================= */

function getCategoryImage(
    category
) {

    return (
        category.image ||
        CATEGORY_IMAGES[
            category.name
        ] ||
        "/Assets/images/category-icons/other.svg"
    );

}



/* =========================================================
   RENDER CATEGORIES
========================================================= */

function renderCategories() {

    categoryTabs.innerHTML =
        "";


    // ---------------------------------------------------------
    // ALL ITEMS TAB
    // ---------------------------------------------------------

    const allButton =
        document.createElement(
            "button"
        );


    allButton.type =
        "button";


    allButton.className =
        "category-tab" +
        (
            selectedCategory ===
            "All"
                ? " active"
                : ""
        );


    allButton.innerHTML = `

        <span
            class="category-all-icon"
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

        <span class="category-name">
            All Items
        </span>
`;


    allButton.addEventListener(
        "click",
        () => {

            selectedCategory =
                "All";


            renderCategories();

            renderProducts();

        }
    );


    categoryTabs.appendChild(
        allButton
    );


    // ---------------------------------------------------------
    // SAVED CATEGORIES
    // ---------------------------------------------------------

    categories.forEach(
        category => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "category-tab" +
                (
                    selectedCategory ===
                    category.name
                        ? " active"
                        : ""
                );
button.innerHTML = `

                <span
                    class="category-icon-wrap"
                >
                    <img
                        src="${getCategoryImage(
                            category
                        )}"

                        class="category-icon"

                        alt="${escapeHtml(
                            category.name
                        )}"
                    >
                </span>

                <span class="category-name">

                    ${escapeHtml(
                        category.name
                    )}

                </span>
`;


            button.addEventListener(
                "click",
                () => {

                    selectedCategory =
                        category.name;


                    renderCategories();

                    renderProducts();

                }
            );


            categoryTabs.appendChild(
                button
            );

        }
    );


    productCategory.innerHTML =
        categories
            .map(
                category => `

                    <option
                        value="${escapeHtml(
                            category.name
                        )}"
                    >

                        ${escapeHtml(
                            category.name
                        )}

                    </option>

                `
            )
            .join("");

    const categoryCountLabel =
        document.getElementById(
            "categoryCountLabel"
        );


    if (
        categoryCountLabel
    ) {

        categoryCountLabel.textContent =
            categories.length
                ? "Choose a category to filter the catalog"
                : "No categories yet — add your first category";

    }

}




/* =========================================================
   RENDER PRODUCTS
========================================================= */

function renderProducts() {

    const query =
        searchInput.value
            .trim()
            .toLowerCase();


    const filteredProducts =
        products.filter(
            product => {

                const categoryMatch =
                    selectedCategory ===
                        "All" ||
                    product.category ===
                        selectedCategory;


                const searchMatch =

                    product.name
                        .toLowerCase()
                        .includes(
                            query
                        )

                    ||

                    product.category
                        .toLowerCase()
                        .includes(
                            query
                        );


                return (
                    categoryMatch &&
                    searchMatch
                );

            }
        );

    const productResultText =
        document.getElementById(
            "productResultText"
        );


    if (
        productResultText
    ) {

        productResultText.textContent =
            selectedCategory ===
                "All"

                ?

                "Browse and manage your menu products"

                :

                `Showing ${selectedCategory}`;

    }


    if (
        filteredProducts.length ===
        0
    ) {

        productGrid.innerHTML = `

            <div
                class="empty-products"
            >
                <div>
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.6"
                        aria-hidden="true"
                    >
                        <circle cx="11" cy="11" r="7"></circle>
                        <path d="m20 20-3.5-3.5"></path>
                    </svg>

                    <strong>
                        ${products.length ? "No products found" : "Your menu is empty"}
                    </strong>

                    <span>
                        ${products.length
                            ? "Try another category or search term."
                            : "Add a category, then create your first menu item."}
                    </span>
                </div>
            </div>

        `;

        return;

    }


    productGrid.innerHTML =
        filteredProducts
            .map(
                product => {

                    const isAvailable =
                        product.availability !==
                        "Unavailable";


                    return `

                        <article
                            class="product-card ${
                                isAvailable
                                    ? ""
                                    : "unavailable"
                            }"
                        >

                            <div
                                class="product-image"
                            >

                                ${
                                    product.image

                                    ?

                                    `

                                    <img
                                        src="${product.image}"

                                        alt="${escapeHtml(
                                            product.name
                                        )}"
                                    >

                                    `

                                    :

                                    `

                                    <span
                                        class="placeholder-icon"
                                        aria-hidden="true"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="1.6"
                                        >
                                            <rect x="3" y="3" width="18" height="18" rx="3"></rect>
                                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                            <path d="m21 15-5-5L5 21"></path>
                                        </svg>
                                    </span>

                                    `
                                }

                                ${
                                    isAvailable

                                    ?

                                    ""

                                    :

                                    `
                                    <span
                                        class="availability-badge unavailable"
                                    >
                                        <span aria-hidden="true">🔒</span>
                                        UNAVAILABLE
                                    </span>
                                    `
                                }

                            </div>


                            <div
                                class="product-info"
                            >

                                <span
                                    class="product-category-label"
                                >

                                    ${escapeHtml(
                                        product.category
                                    )}

                                </span>


                                <strong>

                                    ${escapeHtml(
                                        product.name
                                    )}

                                </strong>


                                <span
                                    class="product-price"
                                >

                                    ${money(
                                        product.price
                                    )}

                                </span>

                            </div>


                            <div
                                class="card-actions"
                            >

                                <button
                                    type="button"
                                    class="edit-btn"

                                    onclick="
                                        editProduct(
                                            '${String(product.id).replace(/'/g, "\\'")}'
                                        )
                                    "
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="1.8"
                                        aria-hidden="true"
                                    >
                                        <path d="M12 20h9"></path>
                                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"></path>
                                    </svg>

                                    Edit
                                </button>


                                <button
                                    type="button"
                                    class="delete-btn"

                                    onclick="
                                        deleteProduct(
                                            '${String(product.id).replace(/'/g, "\\'")}'
                                        )
                                    "
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        stroke-width="1.8"
                                        aria-hidden="true"
                                    >
                                        <path d="M4 7h16"></path>
                                        <path d="M9 7V4h6v3"></path>
                                        <path d="M6 7l1 14h10l1-14"></path>
                                        <path d="M10 11v6M14 11v6"></path>
                                    </svg>

                                    Delete
                                </button>

                            </div>


                        </article>

                    `;

                }
            )
            .join("");

}



/* =========================================================
   SHOW FORM
========================================================= */

function showForm(
    product = null
) {

    menuView.classList.add(
        "hidden"
    );


    formView.classList.remove(
        "hidden"
    );


    pageTitle.textContent =
        product
            ? "Edit Product"
            : "Add New Product";


    productForm.reset();


    document.getElementById(
        "editId"
    ).value =
        "";


    clearImagePreview();


    resetRecipeBuilder();


    if (product) {

        document.getElementById(
            "editId"
        ).value =
            product.id;


        document.getElementById(
            "productName"
        ).value =
            product.name;


        document.getElementById(
            "productCategory"
        ).value =
            product.category;


        document.getElementById(
            "productPrice"
        ).value =
            product.price;


        document.getElementById(
            "productAvailability"
        ).value =
            product.availability;


        document.getElementById(
            "productDescription"
        ).value =
            product.description ||
            "";


        if (
            product.image
        ) {

            imagePreview.src =
                product.image;


            imagePreview.style.display =
                "block";


            imagePlaceholder.style.display =
                "none";

        }


        loadRecipeForProduct(
            product
        );

    } else {

        loadIngredientMasterList();

    }

    // Flexible sizes are part of the same product form.
    window.CafeFlexSizes?.loadForForm?.();

}



/* =========================================================
   SHOW MENU
========================================================= */

function showMenu() {

    formView.classList.add(
        "hidden"
    );


    menuView.classList.remove(
        "hidden"
    );


    pageTitle.textContent =
        "Menu Management";


    renderCategories();

    renderProducts();

}



/* =========================================================
   CLEAR IMAGE
========================================================= */

function clearImagePreview() {

    imagePreview.src =
        "";


    imagePreview.style.display =
        "none";


    imagePlaceholder.style.display =
        "block";

}



/* =========================================================
   ADD PRODUCT BUTTON
========================================================= */

document.getElementById(
    "addItemBtn"
)
.addEventListener(
    "click",
    () => {

        showForm();

    }
);



/* =========================================================
   CANCEL BUTTON
========================================================= */

document.getElementById(
    "cancelBtn"
)
.addEventListener(
    "click",
    showMenu
);



/* =========================================================
   SEARCH
========================================================= */

searchInput.addEventListener(
    "input",
    renderProducts
);



/* =========================================================
   IMAGE UPLOAD
========================================================= */

imageInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files?.[0];


        if (!file) {

            return;

        }



        const reader =
            new FileReader();



        reader.onload =
            event => {

                imagePreview.src =
                    event.target.result;


                imagePreview.style.display =
                    "block";


                imagePlaceholder.style.display =
                    "none";

            };


        reader.readAsDataURL(
            file
        );

    }
);



/* =========================================================
   SAVE PRODUCT
========================================================= */

productForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();



        const editId =
            String(
                document.getElementById(
                    "editId"
                ).value || ""
            ).trim();



        const id =
            editId ||
            String(Date.now());



        const existingProduct =
            products.find(
                product =>
                    sameProductId(
                        product.id,
                        id
                    )
            );



        const product = {

            id:
                id,


            name:
                document
                    .getElementById(
                        "productName"
                    )
                    .value
                    .trim(),


            category:
                document
                    .getElementById(
                        "productCategory"
                    )
                    .value,


            price:
                Number(
                    document
                        .getElementById(
                            "productPrice"
                        )
                        .value
                ),


            availability:
                document
                    .getElementById(
                        "productAvailability"
                    )
                    .value,


            description:
                document
                    .getElementById(
                        "productDescription"
                    )
                    .value
                    .trim(),


            image:

                imagePreview.src

                ||

                existingProduct?.image

                ||

                ""

        };



        if (
            existingProduct
        ) {

            products =
                products.map(
                    item =>

                        sameProductId(item.id, id)

                            ? product

                            : item

                );

        } else {

            products.unshift(
                product
            );

        }



        const recipeSaved =
            await saveRecipeForProduct(
                product
            );


        if (!recipeSaved) {
            return;
        }


        const flexibleConfigSaved =
            await window.CafeFlexSizes?.saveForCurrentProduct?.();

        if (flexibleConfigSaved === false) {
            return;
        }


        persist();


        showMenu();

    }
);



/* =========================================================
   EDIT PRODUCT
========================================================= */

window.editProduct =
    function (
        id
    ) {

        const product =
            products.find(
                product =>
                    sameProductId(
                        product.id,
                        id
                    )
            );


        if (product) {

            showForm(
                product
            );

        }

    };



/* =========================================================
   DELETE PRODUCT
========================================================= */

window.deleteProduct =
    function (
        id
    ) {

        const product =
            products.find(
                product =>
                    sameProductId(
                        product.id,
                        id
                    )
            );


        if (!product) {

            return;

        }



        const confirmDelete =
            confirm(
                `Delete "${product.name}"?`
            );



        if (
            confirmDelete
        ) {

            products =
                products.filter(
                    product =>
                        !sameProductId(
                            product.id,
                            id
                        )
                );


            persist();


            renderCategories();

            renderProducts();

        }

    };



/* =========================================================
   CATEGORY MODAL
========================================================= */

const categoryModal =
    document.getElementById(
        "categoryModal"
    );


const modalTitle =
    document.getElementById(
        "modalTitle"
    );


const categoryNameInput =
    document.getElementById(
        "categoryNameInput"
    );

const categoryIconPicker =
    document.getElementById(
        "categoryIconPicker"
    );

const categoryIconSelectedPreview =
    document.getElementById(
        "categoryIconSelectedPreview"
    );

function normalizeIconPath(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const basename = raw.split("/").pop()?.toLowerCase() || "";
    const legacyMap = {
        "coffee.png": "/Assets/images/category-icons/coffee.svg",
        "milktea.png": "/Assets/images/category-icons/milk-tea.svg",
        "non-coffee.png": "/Assets/images/category-icons/cold-drink.svg",
        "food.png": "/Assets/images/category-icons/meal.svg",
        "snack.png": "/Assets/images/category-icons/snack.svg",
        "dessert.png": "/Assets/images/category-icons/dessert.svg"
    };

    return legacyMap[basename] || raw;
}

function setSelectedCategoryIcon(path) {
    const normalized = normalizeIconPath(path);
    const match = CATEGORY_ICON_OPTIONS.find(option => option.path === normalized);
    selectedCategoryIcon = match?.path || normalized || CATEGORY_ICON_OPTIONS[0].path;

    categoryIconPicker?.querySelectorAll(".category-icon-option").forEach(button => {
        const selected = button.dataset.iconPath === selectedCategoryIcon;
        button.classList.toggle("selected", selected);
        button.setAttribute("aria-checked", selected ? "true" : "false");
    });

    if (categoryIconSelectedPreview) {
        categoryIconSelectedPreview.innerHTML = `<img src="${selectedCategoryIcon}" alt="">`;
    }
}

function renderCategoryIconPicker() {
    if (!categoryIconPicker) return;

    categoryIconPicker.innerHTML = "";
    CATEGORY_ICON_OPTIONS.forEach(option => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "category-icon-option";
        button.dataset.iconPath = option.path;
        button.setAttribute("role", "radio");
        button.setAttribute("aria-label", option.label);
        button.innerHTML = `
            <img src="${option.path}" alt="">
            <span>${escapeHtml(option.label)}</span>
        `;
        button.addEventListener("click", () => setSelectedCategoryIcon(option.path));
        categoryIconPicker.appendChild(button);
    });

    setSelectedCategoryIcon(selectedCategoryIcon);
}

renderCategoryIconPicker();



const deleteCategoryBtn =
    document.getElementById(
        "deleteCategoryBtn"
    );


const categoryModalActions =
    document.getElementById(
        "categoryModalActions"
    );



/* =========================================================
   ADD CATEGORY
========================================================= */

document.getElementById(
    "addCategoryBtn"
)
.addEventListener(
    "click",
    () => {

        modalMode =
            "add";


        modalTitle.textContent =
            "Add New Category";


        categoryNameInput.value =
            "";

        setSelectedCategoryIcon(
            CATEGORY_ICON_OPTIONS[0].path
        );


        deleteCategoryBtn.classList.add(
            "hidden"
        );


        categoryModalActions.classList.remove(
            "edit-mode"
        );


        categoryModal.removeAttribute(
            "data-original"
        );


        categoryModal.classList.remove(
            "hidden"
        );

    }
);



/* =========================================================
   EDIT CATEGORY
========================================================= */

document.getElementById(
    "editCategoryBtn"
)
.addEventListener(
    "click",
    () => {

        if (
            categories.length ===
            0
        ) {

            return;

        }



        modalMode =
            "edit";



        const targetCategory =

            selectedCategory !==
                "All"

                ?

                selectedCategory

                :

                categories[0].name;



        modalTitle.textContent =
            `Edit Category: ${targetCategory}`;



        categoryNameInput.value =
            targetCategory;

        const categoryBeingEdited =
            categories.find(category => category.name === targetCategory);

        setSelectedCategoryIcon(
            categoryBeingEdited?.image ||
            CATEGORY_IMAGES[targetCategory] ||
            CATEGORY_ICON_OPTIONS[0].path
        );



        categoryModal.dataset.original =
            targetCategory;


        deleteCategoryBtn.classList.remove(
            "hidden"
        );


        categoryModalActions.classList.add(
            "edit-mode"
        );


        categoryModal.classList.remove(
            "hidden"
        );

    }
);



/* =========================================================
   CLOSE MODAL
========================================================= */

function closeCategoryModal() {

    categoryModal.classList.add(
        "hidden"
    );


    deleteCategoryBtn.classList.add(
        "hidden"
    );


    categoryModalActions.classList.remove(
        "edit-mode"
    );


    categoryModal.removeAttribute(
        "data-original"
    );

}




document.getElementById(
    "closeModalBtn"
)
.addEventListener(
    "click",
    closeCategoryModal
);



/* =========================================================
   SAVE CATEGORY
========================================================= */

document.getElementById(
    "saveCategoryBtn"
)
.addEventListener(
    "click",
    () => {

        const categoryName =
            categoryNameInput.value
                .trim();



        if (
            !categoryName
        ) {

            alert(
                "Enter a category name."
            );

            return;

        }



        if (
            modalMode ===
            "add"
        ) {

            const exists =
                categories.some(
                    category =>

                        category.name
                            .toLowerCase()

                        ===

                        categoryName
                            .toLowerCase()

                );



            if (
                exists
            ) {

                alert(
                    "Category already exists."
                );

                return;

            }



            categories.push({

                name:
                    categoryName,

                image:
                    selectedCategoryIcon ||
                    CATEGORY_ICON_OPTIONS[0].path

            });

        }



        else {

            const oldName =
                categoryModal
                    .dataset
                    .original;



            categories =
                categories.map(
                    category =>

                        category.name ===
                            oldName

                            ?

                            {

                                ...category,

                                name:
                                    categoryName,

                                image:
                                    selectedCategoryIcon ||
                                    category.image ||
                                    CATEGORY_ICON_OPTIONS[0].path

                            }

                            :

                            category

                );



            products =
                products.map(
                    product =>

                        product.category ===
                            oldName

                            ?

                            {

                                ...product,

                                category:
                                    categoryName

                            }

                            :

                            product

                );



            if (
                selectedCategory ===
                oldName
            ) {

                selectedCategory =
                    categoryName;

            }

        }



        persist();


        renderCategories();


        renderProducts();



        closeCategoryModal();

    }
);





/* =========================================================
   DELETE CATEGORY
========================================================= */

deleteCategoryBtn.addEventListener(
    "click",
    () => {

        if (
            modalMode !==
            "edit"
        ) {
            return;
        }


        const categoryName =
            categoryModal
                .dataset
                .original;


        if (
            !categoryName
        ) {
            return;
        }


        const productCount =
            products.filter(
                product =>
                    product.category ===
                    categoryName
            ).length;


        const message =
            productCount > 0

                ?

                `Delete "${categoryName}"?\n\nThis will also delete ${productCount} product${
                    productCount === 1
                        ? ""
                        : "s"
                } assigned to this category.`

                :

                `Delete "${categoryName}"?`;


        const confirmed =
            confirm(
                message
            );


        if (
            !confirmed
        ) {
            return;
        }


        categories =
            categories.filter(
                category =>
                    category.name !==
                    categoryName
            );


        products =
            products.filter(
                product =>
                    product.category !==
                    categoryName
            );


        if (
            selectedCategory ===
            categoryName
        ) {

            selectedCategory =
                "All";

        }


        persist();


        renderCategories();


        renderProducts();


        closeCategoryModal();

    }
);



/* =========================================================
   CLOSE MODAL WHEN CLICKING BACKGROUND
========================================================= */

categoryModal.addEventListener(
    "click",
    event => {

        if (
            event.target ===
            categoryModal
        ) {

            closeCategoryModal();

        }

    }
);




document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
                "Escape" &&
            !categoryModal.classList.contains(
                "hidden"
            )
        ) {

            closeCategoryModal();

        }
    }
);



/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
    value
) {

    return String(
        value
    )
    .replace(
        /[&<>"']/g,
        character => ({

            "&":
                "&amp;",

            "<":
                "&lt;",

            ">":
                "&gt;",

            '"':
                "&quot;",

            "'":
                "&#039;"

        }[character])
    );

}




/* =========================================================
   RECIPE-BASED INVENTORY
========================================================= */

const RECIPE_API_URL =
    `${MENU_API_URL}/api/menu-availability`;

const recipeRowsContainer =
    document.getElementById(
        "recipeIngredientRows"
    );

const ingredientSuggestions =
    document.getElementById(
        "ingredientSuggestions"
    );

const addRecipeIngredientBtn =
    document.getElementById(
        "addRecipeIngredientBtn"
    );

let ingredientMasterList = [];
let activeRecipeKey = "";

function adminApiHeaders() {
    const headers = {
        "Content-Type":
            "application/json",
        Accept:
            "application/json"
    };

    const token =
        getAuthToken();

    if (token) {
        headers.Authorization =
            `Bearer ${token}`;
    }

    return headers;
}

function renderIngredientSuggestions() {
    if (ingredientSuggestions) {
        ingredientSuggestions.innerHTML =
            ingredientMasterList
                .map(ingredient =>
                    `<option value="${escapeHtml(ingredient.name)}"></option>`
                )
                .join("");
    }

    refreshRecipeIngredientSelects();
}

function findMasterIngredientByName(name) {
    const target =
        String(name || "")
            .trim()
            .toLowerCase();

    return ingredientMasterList.find(
        ingredient =>
            String(ingredient.name || "")
                .trim()
                .toLowerCase() === target
    ) || null;
}

function ingredientSelectOptions(selectedName = "") {
    const selected = String(selectedName || "").trim();
    const selectedLower = selected.toLowerCase();

    const known = ingredientMasterList.some(ingredient =>
        String(ingredient.name || "").trim().toLowerCase() === selectedLower
    );

    const fallback = selected && !known
        ? `<option value="${escapeHtml(selected)}" selected>${escapeHtml(selected)}</option>`
        : "";

    const options = ingredientMasterList
        .slice()
        .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")))
        .map(ingredient => {
            const name = String(ingredient.name || "").trim();
            const isSelected = name.toLowerCase() === selectedLower;
            return `<option value="${escapeHtml(name)}" ${isSelected ? "selected" : ""}>${escapeHtml(name)}</option>`;
        })
        .join("");

    return `
        <option value="">Select ingredient...</option>
        ${fallback}
        ${options}
    `;
}

function refreshRecipeIngredientSelects() {
    document
        .querySelectorAll(".recipe-name-input")
        .forEach(select => {
            const current = select.value;
            select.innerHTML = ingredientSelectOptions(current);
        });
}

function updateRecipeOptionState(row) {
    const mode =
        row.querySelector(
            ".recipe-mode-input"
        )?.value ||
        "required";

    const optionInput =
        row.querySelector(
            ".recipe-option-input"
        );

    if (!optionInput) {
        return;
    }

    const enabled =
        mode ===
        "option";

    optionInput.disabled =
        !enabled;

    if (!enabled) {
        optionInput.value =
            "";
    }
}

function addRecipeRow(data = {}) {
    if (!recipeRowsContainer) {
        return;
    }

    const row =
        document.createElement(
            "div"
        );

    row.className =
        "recipe-row";

    const safeName =
        escapeHtml(
            data.name ||
            ""
        );

    const unit =
        String(
            data.unit ||
            "g"
        );

    const mode =
        data.mode ===
        "option"
            ? "option"
            : "required";

    row.innerHTML = `
        <select
            class="recipe-name-input"
            aria-label="Ingredient name"
        >
            ${ingredientSelectOptions(data.name || "")}
        </select>

        <input
            class="recipe-amount-input"
            type="number"
            min="0.01"
            step="0.01"
            value="${Number(data.amount || 0) || ""}"
            placeholder="18"
            aria-label="Base ingredient quantity"
        >

        <select
            class="recipe-unit-input"
            aria-label="Ingredient unit"
        >
            ${["g","kg","ml","l","pcs","shot","scoop","tbsp","tsp"]
                .map(
                    value =>
                        `<option value="${value}" ${value === unit ? "selected" : ""}>${value}</option>`
                )
                .join("")}
        </select>

        <input
            class="recipe-stock-input"
            type="number"
            min="0"
            step="0.01"
            value="${Number.isFinite(Number(data.stock)) ? Number(data.stock) : ""}"
            placeholder="1000"
            aria-label="Current ingredient stock"
        >

        <input
            class="recipe-low-input"
            type="number"
            min="0"
            step="0.01"
            value="${Number.isFinite(Number(data.lowStockThreshold)) ? Number(data.lowStockThreshold) : ""}"
            placeholder="200"
            aria-label="Low stock alert threshold"
        >

        <select
            class="recipe-mode-input"
            aria-label="Ingredient usage type"
        >
            <option value="required" ${mode === "required" ? "selected" : ""}>Main ingredient</option>
            <option value="option" ${mode === "option" ? "selected" : ""}>Optional / Add-on</option>
        </select>

        <input
            class="recipe-option-input"
            type="text"
            value="${escapeHtml(data.optionValue || "")}"
            placeholder="Boba / Pearls"
            aria-label="Customization option name"
        >

        <button
            type="button"
            class="recipe-remove-btn"
            aria-label="Remove ingredient"
            title="Remove ingredient"
        >×</button>
    `;

    const nameInput =
        row.querySelector(
            ".recipe-name-input"
        );

    nameInput?.addEventListener(
        "change",
        () => {
            const master =
                findMasterIngredientByName(
                    nameInput.value
                );

            if (!master) {
                return;
            }

            const unitInput =
                row.querySelector(
                    ".recipe-unit-input"
                );

            const stockInput =
                row.querySelector(
                    ".recipe-stock-input"
                );

            const lowInput =
                row.querySelector(
                    ".recipe-low-input"
                );

            if (unitInput) {
                unitInput.value =
                    master.unit ||
                    "g";
            }

            if (stockInput) {
                stockInput.value =
                    Number(
                        master.stock ||
                        0
                    );
            }

            if (lowInput) {
                lowInput.value =
                    Number(
                        master.lowStockThreshold ||
                        0
                    );
            }
        }
    );

    row.querySelector(
        ".recipe-mode-input"
    )?.addEventListener(
        "change",
        () =>
            updateRecipeOptionState(
                row
            )
    );

    row.querySelector(
        ".recipe-remove-btn"
    )?.addEventListener(
        "click",
        () => {
            row.remove();
            renderRecipeEmptyState();
        }
    );

    recipeRowsContainer.appendChild(
        row
    );

    updateRecipeOptionState(
        row
    );
}

function renderRecipeEmptyState() {
    if (!recipeRowsContainer) {
        return;
    }

    const rows =
        recipeRowsContainer
            .querySelectorAll(
                ".recipe-row"
            );

    recipeRowsContainer
        .querySelector(
            ".recipe-empty-row"
        )
        ?.remove();

    if (!rows.length) {
        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "recipe-empty-row";

        empty.textContent =
            "No recipe ingredients yet. Click “Add Ingredient” to connect this item to inventory.";

        recipeRowsContainer.appendChild(
            empty
        );
    }
}

function resetRecipeBuilder() {
    activeRecipeKey =
        "";

    if (!recipeRowsContainer) {
        return;
    }

    recipeRowsContainer.innerHTML =
        "";

    renderRecipeEmptyState();
}

function recipeRowsFromForm() {
    if (!recipeRowsContainer) {
        return [];
    }

    return [
        ...recipeRowsContainer
            .querySelectorAll(
                ".recipe-row"
            )
    ]
        .map(
            row => {
                const name =
                    row.querySelector(
                        ".recipe-name-input"
                    )?.value
                        .trim() ||
                    "";

                const masterIngredient =
                    findMasterIngredientByName(
                        name
                    );

                return ({
                ingredientId:
                    masterIngredient?.id ||
                    "",

                name,

                amount:
                    Number(
                        row.querySelector(
                            ".recipe-amount-input"
                        )?.value
                    ),

                unit:
                    row.querySelector(
                        ".recipe-unit-input"
                    )?.value ||
                    "g",

                stock:
                    Number(
                        row.querySelector(
                            ".recipe-stock-input"
                        )?.value
                    ),

                lowStockThreshold:
                    Number(
                        row.querySelector(
                            ".recipe-low-input"
                        )?.value
                    ),

                mode:
                    row.querySelector(
                        ".recipe-mode-input"
                    )?.value ||
                    "required",

                optionValue:
                    row.querySelector(
                        ".recipe-option-input"
                    )?.value
                        .trim() ||
                    "",

                scaleWithSize:
                    true
                });
            }
        )
        .filter(
            row =>
                row.name
        );
}

function validateRecipeRows(rows) {
    for (const row of rows) {
        if (!row.ingredientId) {
            return `Select an ingredient from Inventory Monitor for ${row.name || "this row"}.`;
        }

        if (
            !Number.isFinite(
                row.amount
            ) ||
            row.amount <= 0
        ) {
            return `Enter a valid base quantity for ${row.name}.`;
        }

        if (
            !Number.isFinite(
                row.stock
            ) ||
            row.stock < 0
        ) {
            return `Enter the current stock for ${row.name}.`;
        }

        if (
            !Number.isFinite(
                row.lowStockThreshold
            ) ||
            row.lowStockThreshold < 0
        ) {
            return `Enter a low-stock alert level for ${row.name}.`;
        }

        if (
            row.mode ===
                "option" &&
            !row.optionValue
        ) {
            return `Enter the option name that uses ${row.name} (example: Boba or Pearls).`;
        }
    }

    return "";
}

async function loadRecipeForProduct(product) {
    resetRecipeBuilder();

    if (!product) {
        return;
    }

    try {
        const response =
            await fetch(
                `${RECIPE_API_URL}/recipe?cafeId=${encodeURIComponent(CAFE_ID)}&name=${encodeURIComponent(product.name)}&category=${encodeURIComponent(normalizeMenuCategory(product.category))}`,
                {
                    headers:
                        adminApiHeaders(),
                    credentials:
                        "include",
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {
            throw new Error(
                `Recipe request returned ${response.status}`
            );
        }

        const data =
            await response.json();

        ingredientMasterList =
            Array.isArray(
                data.ingredients
            )
                ? data.ingredients
                : [];

        renderIngredientSuggestions();

        if (
            !data.recipe ||
            !Array.isArray(
                data.recipe.ingredients
            )
        ) {
            renderRecipeEmptyState();
            return;
        }

        activeRecipeKey =
            data.recipe.key ||
            "";

        const byId =
            new Map(
                ingredientMasterList.map(
                    ingredient => [
                        ingredient.id,
                        ingredient
                    ]
                )
            );

        recipeRowsContainer.innerHTML =
            "";

        data.recipe.ingredients.forEach(
            row => {
                const ingredient =
                    byId.get(
                        row.ingredientId
                    ) ||
                    {};

                addRecipeRow({
                    name:
                        ingredient.name ||
                        row.ingredientId,
                    unit:
                        ingredient.unit ||
                        "g",
                    stock:
                        ingredient.stock ??
                        0,
                    lowStockThreshold:
                        ingredient.lowStockThreshold ??
                        0,
                    amount:
                        row.amount,
                    mode:
                        row.mode,
                    optionValue:
                        row.optionValue
                });
            }
        );

        renderRecipeEmptyState();

    } catch (error) {
        console.warn(
            "Recipe inventory could not be loaded:",
            error
        );

        renderRecipeEmptyState();
    }
}

async function loadIngredientMasterList() {
    try {
        const response =
            await fetch(
                `${RECIPE_API_URL}/inventory-config?cafeId=${encodeURIComponent(CAFE_ID)}`,
                {
                    headers:
                        adminApiHeaders(),
                    credentials:
                        "include",
                    cache:
                        "no-store"
                }
            );

        if (!response.ok) {
            return;
        }

        const data =
            await response.json();

        ingredientMasterList =
            Array.isArray(
                data.ingredients
            )
                ? data.ingredients
                : [];

        renderIngredientSuggestions();

    } catch (_) {
        // Ingredient suggestions are optional.
    }
}

async function saveRecipeForProduct(product) {
    const rows =
        recipeRowsFromForm();

    const validationError =
        validateRecipeRows(
            rows
        );

    if (validationError) {
        alert(
            validationError
        );
        return false;
    }

    // Saving an empty ingredient list intentionally clears the
    // recipe usage for this product without deleting the product.
    try {
        const response =
            await fetch(
                `${RECIPE_API_URL}/recipe`,
                {
                    method:
                        "PUT",
                    headers:
                        adminApiHeaders(),
                    credentials:
                        "include",
                    body:
                        JSON.stringify({
                            cafeId:
                                CAFE_ID,
                            itemName:
                                product.name,
                            category:
                                normalizeMenuCategory(
                                    product.category
                                ),
                            previousKey:
                                activeRecipeKey,
                            ingredients:
                                rows
                        })
                }
            );

        const data =
            await response
                .json()
                .catch(
                    () => ({})
                );

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Recipe save returned ${response.status}`
            );
        }

        activeRecipeKey =
            data.recipe?.key ||
            activeRecipeKey;

        ingredientMasterList =
            Array.isArray(
                data.ingredients
            )
                ? data.ingredients
                : ingredientMasterList;

        renderIngredientSuggestions();

        return true;

    } catch (error) {
        console.error(
            "Unable to save recipe inventory:",
            error
        );

        alert(
            `Product was not saved because the recipe inventory could not be synced. ${error.message || ""}`
        );

        return false;
    }
}

addRecipeIngredientBtn?.addEventListener(
    "click",
    () => {
        recipeRowsContainer
            ?.querySelector(
                ".recipe-empty-row"
            )
            ?.remove();

        addRecipeRow();
    }
);


/* =========================================================
   INITIAL LOAD
========================================================= */

async function initializeMenuManagement() {

    const hadRemoteCatalog = await loadCatalogFromBackend();

    const hadRemoteAvailability =
        await loadAvailabilityFromBackend();


    await loadIngredientMasterList();


    renderCategories();

    renderProducts();


    if (!hadRemoteCatalog) scheduleCatalogSync();

    if (
        !hadRemoteAvailability
    ) {

        scheduleAvailabilitySync();

    }
}


initializeMenuManagement();
