// ============================================================
// CAFEKIOSK - RECIPE / INGREDIENT INVENTORY STORE
// ============================================================
// JSON-backed stock source of truth used by:
// - Admin Inventory Monitor
// - Menu Management recipes
// - Kiosk / POS stock blocking
// - automatic order ingredient deduction / restoration
// ============================================================

const fs = require("fs").promises;
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "../data");
const DATA_FILE = path.join(DATA_DIR, "recipe-inventory.json");

let writeQueue = Promise.resolve();

const SAMPLE_INGREDIENTS = [
    {
        "name": "Coffee Beans",
        "category": "Coffee",
        "unit": "g",
        "stock": 5000,
        "lowStockThreshold": 750
    },
    {
        "name": "Black Tea Leaves",
        "category": "Tea",
        "unit": "g",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Matcha Powder",
        "category": "Tea",
        "unit": "g",
        "stock": 2000,
        "lowStockThreshold": 300
    },
    {
        "name": "Thai Tea Mix",
        "category": "Tea",
        "unit": "g",
        "stock": 1800,
        "lowStockThreshold": 300
    },
    {
        "name": "Cocoa Powder",
        "category": "Chocolate",
        "unit": "g",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Fresh Milk",
        "category": "Dairy",
        "unit": "ml",
        "stock": 15000,
        "lowStockThreshold": 3000
    },
    {
        "name": "Condensed Milk",
        "category": "Dairy",
        "unit": "ml",
        "stock": 5000,
        "lowStockThreshold": 800
    },
    {
        "name": "Evaporated Milk",
        "category": "Dairy",
        "unit": "ml",
        "stock": 5000,
        "lowStockThreshold": 800
    },
    {
        "name": "Non-Dairy Creamer",
        "category": "Dairy",
        "unit": "g",
        "stock": 5000,
        "lowStockThreshold": 800
    },
    {
        "name": "Whipping Cream",
        "category": "Dairy",
        "unit": "ml",
        "stock": 6000,
        "lowStockThreshold": 1000
    },
    {
        "name": "Chocolate Sauce",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 4000,
        "lowStockThreshold": 700
    },
    {
        "name": "White Chocolate Sauce",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Caramel Syrup",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 4000,
        "lowStockThreshold": 700
    },
    {
        "name": "Vanilla Syrup",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 2500,
        "lowStockThreshold": 400
    },
    {
        "name": "Hazelnut Syrup",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 2500,
        "lowStockThreshold": 400
    },
    {
        "name": "Brown Sugar Syrup",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 3500,
        "lowStockThreshold": 600
    },
    {
        "name": "Salted Caramel Syrup",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 2500,
        "lowStockThreshold": 400
    },
    {
        "name": "Pistachio Syrup",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 1500,
        "lowStockThreshold": 250
    },
    {
        "name": "Toffee Nut Syrup",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 1500,
        "lowStockThreshold": 250
    },
    {
        "name": "Honey",
        "category": "Syrup & Sauce",
        "unit": "ml",
        "stock": 2500,
        "lowStockThreshold": 400
    },
    {
        "name": "Wintermelon Syrup",
        "category": "Milk Tea",
        "unit": "ml",
        "stock": 2500,
        "lowStockThreshold": 400
    },
    {
        "name": "Strawberry Syrup",
        "category": "Fruit Syrup",
        "unit": "ml",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Mango Syrup",
        "category": "Fruit Syrup",
        "unit": "ml",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Blueberry Syrup",
        "category": "Fruit Syrup",
        "unit": "ml",
        "stock": 2000,
        "lowStockThreshold": 350
    },
    {
        "name": "Peach Syrup",
        "category": "Fruit Syrup",
        "unit": "ml",
        "stock": 2000,
        "lowStockThreshold": 350
    },
    {
        "name": "Lychee Syrup",
        "category": "Fruit Syrup",
        "unit": "ml",
        "stock": 2000,
        "lowStockThreshold": 350
    },
    {
        "name": "Passion Fruit Syrup",
        "category": "Fruit Syrup",
        "unit": "ml",
        "stock": 2000,
        "lowStockThreshold": 350
    },
    {
        "name": "Green Apple Syrup",
        "category": "Fruit Syrup",
        "unit": "ml",
        "stock": 2000,
        "lowStockThreshold": 350
    },
    {
        "name": "Lemon Juice",
        "category": "Fruit",
        "unit": "ml",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Soda Water",
        "category": "Beverage",
        "unit": "ml",
        "stock": 12000,
        "lowStockThreshold": 2000
    },
    {
        "name": "Okinawa Powder",
        "category": "Milk Tea",
        "unit": "g",
        "stock": 1500,
        "lowStockThreshold": 250
    },
    {
        "name": "Hokkaido Powder",
        "category": "Milk Tea",
        "unit": "g",
        "stock": 1500,
        "lowStockThreshold": 250
    },
    {
        "name": "Taro Powder",
        "category": "Milk Tea",
        "unit": "g",
        "stock": 2000,
        "lowStockThreshold": 350
    },
    {
        "name": "Honeydew Powder",
        "category": "Milk Tea",
        "unit": "g",
        "stock": 1500,
        "lowStockThreshold": 250
    },
    {
        "name": "Red Velvet Powder",
        "category": "Milk Tea",
        "unit": "g",
        "stock": 1200,
        "lowStockThreshold": 200
    },
    {
        "name": "Cheesecake Powder",
        "category": "Milk Tea",
        "unit": "g",
        "stock": 1200,
        "lowStockThreshold": 200
    },
    {
        "name": "Boba Pearls",
        "category": "Toppings",
        "unit": "g",
        "stock": 5000,
        "lowStockThreshold": 800
    },
    {
        "name": "Grass Jelly",
        "category": "Toppings",
        "unit": "g",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Pudding",
        "category": "Toppings",
        "unit": "g",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Oreo Crumbs",
        "category": "Toppings",
        "unit": "g",
        "stock": 2000,
        "lowStockThreshold": 350
    },
    {
        "name": "Cream Cheese Foam",
        "category": "Toppings",
        "unit": "ml",
        "stock": 3500,
        "lowStockThreshold": 600
    },
    {
        "name": "Banana",
        "category": "Fruit",
        "unit": "pcs",
        "stock": 60,
        "lowStockThreshold": 12
    },
    {
        "name": "Mango",
        "category": "Fruit",
        "unit": "pcs",
        "stock": 60,
        "lowStockThreshold": 12
    },
    {
        "name": "Strawberries",
        "category": "Fruit",
        "unit": "g",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Avocado",
        "category": "Fruit",
        "unit": "pcs",
        "stock": 40,
        "lowStockThreshold": 8
    },
    {
        "name": "Mixed Berries",
        "category": "Fruit",
        "unit": "g",
        "stock": 2500,
        "lowStockThreshold": 400
    },
    {
        "name": "Bread Slices",
        "category": "Food",
        "unit": "pcs",
        "stock": 150,
        "lowStockThreshold": 30
    },
    {
        "name": "Burger Buns",
        "category": "Food",
        "unit": "pcs",
        "stock": 80,
        "lowStockThreshold": 16
    },
    {
        "name": "Chicken Breast",
        "category": "Food",
        "unit": "g",
        "stock": 8000,
        "lowStockThreshold": 1500
    },
    {
        "name": "Ground Beef",
        "category": "Food",
        "unit": "g",
        "stock": 6000,
        "lowStockThreshold": 1000
    },
    {
        "name": "Ham",
        "category": "Food",
        "unit": "g",
        "stock": 3500,
        "lowStockThreshold": 600
    },
    {
        "name": "Tuna",
        "category": "Food",
        "unit": "g",
        "stock": 3500,
        "lowStockThreshold": 600
    },
    {
        "name": "Eggs",
        "category": "Food",
        "unit": "pcs",
        "stock": 120,
        "lowStockThreshold": 24
    },
    {
        "name": "Bacon",
        "category": "Food",
        "unit": "g",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Cheese Slices",
        "category": "Food",
        "unit": "pcs",
        "stock": 120,
        "lowStockThreshold": 24
    },
    {
        "name": "Lettuce",
        "category": "Food",
        "unit": "g",
        "stock": 2500,
        "lowStockThreshold": 400
    },
    {
        "name": "Tomato",
        "category": "Food",
        "unit": "g",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Pasta",
        "category": "Food",
        "unit": "g",
        "stock": 6000,
        "lowStockThreshold": 1000
    },
    {
        "name": "Rice",
        "category": "Food",
        "unit": "g",
        "stock": 12000,
        "lowStockThreshold": 2500
    },
    {
        "name": "Pesto Sauce",
        "category": "Food",
        "unit": "ml",
        "stock": 2500,
        "lowStockThreshold": 400
    },
    {
        "name": "Cream Sauce",
        "category": "Food",
        "unit": "ml",
        "stock": 3500,
        "lowStockThreshold": 600
    },
    {
        "name": "Bolognese Sauce",
        "category": "Food",
        "unit": "ml",
        "stock": 3500,
        "lowStockThreshold": 600
    },
    {
        "name": "Teriyaki Sauce",
        "category": "Food",
        "unit": "ml",
        "stock": 2500,
        "lowStockThreshold": 400
    },
    {
        "name": "Caesar Dressing",
        "category": "Food",
        "unit": "ml",
        "stock": 2000,
        "lowStockThreshold": 350
    },
    {
        "name": "Sausage",
        "category": "Food",
        "unit": "pcs",
        "stock": 80,
        "lowStockThreshold": 16
    },
    {
        "name": "Frozen Fries",
        "category": "Snack",
        "unit": "g",
        "stock": 10000,
        "lowStockThreshold": 2000
    },
    {
        "name": "Potato Wedges",
        "category": "Snack",
        "unit": "g",
        "stock": 5000,
        "lowStockThreshold": 800
    },
    {
        "name": "Onion Rings",
        "category": "Snack",
        "unit": "g",
        "stock": 5000,
        "lowStockThreshold": 800
    },
    {
        "name": "Nacho Chips",
        "category": "Snack",
        "unit": "g",
        "stock": 5000,
        "lowStockThreshold": 800
    },
    {
        "name": "Mozzarella Sticks",
        "category": "Snack",
        "unit": "pcs",
        "stock": 120,
        "lowStockThreshold": 24
    },
    {
        "name": "Chicken Nuggets",
        "category": "Snack",
        "unit": "pcs",
        "stock": 180,
        "lowStockThreshold": 36
    },
    {
        "name": "Chicken Wings",
        "category": "Snack",
        "unit": "pcs",
        "stock": 150,
        "lowStockThreshold": 30
    },
    {
        "name": "Chicken Tenders",
        "category": "Snack",
        "unit": "pcs",
        "stock": 100,
        "lowStockThreshold": 20
    },
    {
        "name": "Spring Rolls",
        "category": "Snack",
        "unit": "pcs",
        "stock": 120,
        "lowStockThreshold": 24
    },
    {
        "name": "Hash Browns",
        "category": "Snack",
        "unit": "pcs",
        "stock": 100,
        "lowStockThreshold": 20
    },
    {
        "name": "Cooking Oil",
        "category": "Kitchen",
        "unit": "ml",
        "stock": 12000,
        "lowStockThreshold": 2500
    },
    {
        "name": "Cheese Sauce",
        "category": "Snack",
        "unit": "ml",
        "stock": 4000,
        "lowStockThreshold": 700
    },
    {
        "name": "Dip Sauce",
        "category": "Snack",
        "unit": "ml",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Garlic Bread",
        "category": "Snack",
        "unit": "pcs",
        "stock": 100,
        "lowStockThreshold": 20
    },
    {
        "name": "Croissants",
        "category": "Snack",
        "unit": "pcs",
        "stock": 80,
        "lowStockThreshold": 16
    },
    {
        "name": "All-Purpose Flour",
        "category": "Baking",
        "unit": "g",
        "stock": 10000,
        "lowStockThreshold": 2000
    },
    {
        "name": "White Sugar",
        "category": "Baking",
        "unit": "g",
        "stock": 8000,
        "lowStockThreshold": 1500
    },
    {
        "name": "Brown Sugar",
        "category": "Baking",
        "unit": "g",
        "stock": 5000,
        "lowStockThreshold": 800
    },
    {
        "name": "Butter",
        "category": "Baking",
        "unit": "g",
        "stock": 5000,
        "lowStockThreshold": 800
    },
    {
        "name": "Cream Cheese",
        "category": "Baking",
        "unit": "g",
        "stock": 4000,
        "lowStockThreshold": 700
    },
    {
        "name": "Chocolate Chips",
        "category": "Baking",
        "unit": "g",
        "stock": 3500,
        "lowStockThreshold": 600
    },
    {
        "name": "Walnuts",
        "category": "Baking",
        "unit": "g",
        "stock": 1500,
        "lowStockThreshold": 250
    },
    {
        "name": "Graham Crackers",
        "category": "Baking",
        "unit": "g",
        "stock": 3000,
        "lowStockThreshold": 500
    },
    {
        "name": "Gelatin",
        "category": "Baking",
        "unit": "g",
        "stock": 500,
        "lowStockThreshold": 100
    },
    {
        "name": "Vanilla Extract",
        "category": "Baking",
        "unit": "ml",
        "stock": 500,
        "lowStockThreshold": 100
    },
    {
        "name": "Vanilla Ice Cream",
        "category": "Dessert",
        "unit": "ml",
        "stock": 6000,
        "lowStockThreshold": 1000
    },
    {
        "name": "Chocolate Ice Cream",
        "category": "Dessert",
        "unit": "ml",
        "stock": 5000,
        "lowStockThreshold": 800
    }
];

function normalizeCafeId(value) {
    const id = String(value || "cafe-1").trim();
    return id || "cafe-1";
}

function normalizeCategory(value) {
    const key = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, "-");

    const map = {
        coffee: "coffee",
        coffees: "coffee",
        "non-coffee": "non-coffee",
        "non-coffees": "non-coffee",
        noncoffee: "non-coffee",
        "milk-tea": "milktea",
        milktea: "milktea",
        food: "food",
        foods: "food",
        snack: "snack",
        snacks: "snack",
        dessert: "dessert",
        desserts: "dessert"
    };

    return map[key] || key;
}

function normalizeIngredientCategory(value) {
    const text = String(value || "Other").trim();
    return text || "Other";
}

function slug(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `ingredient-${Date.now()}`;
}

function recipeKey(name, category) {
    return `${normalizeCategory(category)}|${String(name || "").trim().toLowerCase()}`;
}

function normalizeUnit(value) {
    const unit = String(value || "g").trim().toLowerCase();
    const allowed = new Set([
        "g", "kg", "ml", "l", "pcs", "shot", "scoop", "tbsp", "tsp"
    ]);
    return allowed.has(unit) ? unit : "g";
}

function sizeMultiplierFromLabel(value) {
    const text = String(value || "").toLowerCase();
    if (/\b(small|tall|single)\b/.test(text)) return 1;
    if (/\b(medium|regular|grande|bundle)\b/.test(text)) return 2;
    if (/\b(large|venti)\b/.test(text)) return 3;
    return 1;
}

function extractSizeMultiplier(customizations) {
    const list = Array.isArray(customizations) ? customizations : [];
    for (const value of list) {
        const multiplier = sizeMultiplierFromLabel(value);
        if (multiplier !== 1) return multiplier;
        if (/\b(small|tall|single)\b/.test(String(value || "").toLowerCase())) {
            return 1;
        }
    }
    return 1;
}

function customizationIncludes(customizations, optionValue) {
    const needle = String(optionValue || "").trim().toLowerCase();
    if (!needle) return false;
    return (Array.isArray(customizations) ? customizations : [])
        .some(value => String(value || "").toLowerCase().includes(needle));
}

async function ensureStore() {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
        await fs.access(DATA_FILE);
    } catch (_) {
        await fs.writeFile(DATA_FILE, "{}\n", "utf8");
    }
}

async function readStore() {
    await ensureStore();
    try {
        const text = await fs.readFile(DATA_FILE, "utf8");
        const parsed = text.trim() ? JSON.parse(text) : {};
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
            ? parsed
            : {};
    } catch (error) {
        console.error("❌ recipe-inventory.json is invalid:", error);
        return {};
    }
}

async function atomicWrite(data) {
    await ensureStore();
    const temp = `${DATA_FILE}.${process.pid}.tmp`;
    await fs.writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await fs.rename(temp, DATA_FILE);
}

function queueMutation(mutator) {
    const job = writeQueue
        .catch(() => {})
        .then(async () => {
            const store = await readStore();
            const result = await mutator(store);
            await atomicWrite(store);
            return result;
        });

    writeQueue = job.then(() => undefined, () => undefined);
    return job;
}

function getCafeContainer(store, cafeId) {
    const id = normalizeCafeId(cafeId);

    /*
     * LEGACY DATA MIGRATION
     * ---------------------
     * Older Inventory builds may have stored these fields at the
     * top level instead of inside "cafe-1".
     *
     * We support that format instead of crashing or deleting it.
     */
    if (
        (!store[id] || typeof store[id] !== "object" || Array.isArray(store[id])) &&
        (
            Array.isArray(store.ingredients) ||
            Array.isArray(store.recipes) ||
            Array.isArray(store.adjustments) ||
            (
                store.consumptionByOrder &&
                typeof store.consumptionByOrder === "object"
            )
        )
    ) {
        store[id] = {
            ingredients: Array.isArray(store.ingredients)
                ? store.ingredients
                : [],
            recipes: Array.isArray(store.recipes)
                ? store.recipes
                : [],
            consumptionByOrder:
                store.consumptionByOrder &&
                typeof store.consumptionByOrder === "object" &&
                !Array.isArray(store.consumptionByOrder)
                    ? store.consumptionByOrder
                    : {},
            adjustments: Array.isArray(store.adjustments)
                ? store.adjustments
                : []
        };
    }

    if (
        !store[id] ||
        typeof store[id] !== "object" ||
        Array.isArray(store[id])
    ) {
        store[id] = {
            ingredients: [],
            recipes: [],
            consumptionByOrder: {},
            adjustments: []
        };
    }

    if (!Array.isArray(store[id].ingredients)) {
        store[id].ingredients = [];
    }

    if (!Array.isArray(store[id].recipes)) {
        store[id].recipes = [];
    }

    if (!Array.isArray(store[id].adjustments)) {
        store[id].adjustments = [];
    }

    if (
        !store[id].consumptionByOrder ||
        typeof store[id].consumptionByOrder !== "object" ||
        Array.isArray(store[id].consumptionByOrder)
    ) {
        store[id].consumptionByOrder = {};
    }

    return store[id];
}


function safeFiniteNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function normalizeStoredIngredient(ingredient, index = 0) {
    if (
        !ingredient ||
        typeof ingredient !== "object" ||
        Array.isArray(ingredient)
    ) {
        return null;
    }

    /*
     * Accept field names used by older Inventory prototypes.
     */
    const name =
        String(
            ingredient.name ??
            ingredient.ingredientName ??
            ingredient.ingredient_name ??
            ingredient.label ??
            ""
        ).trim();

    if (!name) {
        console.warn(
            `⚠️ Ignoring inventory record #${index + 1} because it has no ingredient name.`,
            ingredient
        );

        return null;
    }

    const rawStock =
        ingredient.stock ??
        ingredient.currentStock ??
        ingredient.current_stock ??
        ingredient.quantity ??
        ingredient.qty ??
        ingredient.availableStock ??
        0;

    const rawThreshold =
        ingredient.lowStockThreshold ??
        ingredient.low_stock_threshold ??
        ingredient.lowStockLevel ??
        ingredient.low_stock_level ??
        ingredient.reorderLevel ??
        ingredient.reorder_level ??
        ingredient.threshold ??
        0;

    const stock =
        Math.max(
            0,
            safeFiniteNumber(rawStock, 0)
        );

    const lowStockThreshold =
        Math.max(
            0,
            safeFiniteNumber(rawThreshold, 0)
        );

    const id =
        String(
            ingredient.id ??
            ingredient.ingredientId ??
            ingredient.ingredient_id ??
            ""
        ).trim() ||
        slug(name);

    return {
        ...ingredient,
        id,
        name,
        category:
            normalizeIngredientCategory(
                ingredient.category ??
                ingredient.group ??
                ingredient.type ??
                "Other"
            ),
        unit:
            normalizeUnit(
                ingredient.unit ??
                ingredient.measurement ??
                ingredient.measurementUnit ??
                ingredient.measurement_unit ??
                "g"
            ),
        stock,
        lowStockThreshold,
        updatedAt:
            ingredient.updatedAt ??
            ingredient.updated_at ??
            null
    };
}


function sanitizeIngredientArray(ingredients) {
    const source =
        Array.isArray(ingredients)
            ? ingredients
            : [];

    const result = [];
    const seenIds = new Set();

    source.forEach((ingredient, index) => {
        const normalized =
            normalizeStoredIngredient(
                ingredient,
                index
            );

        if (!normalized) {
            return;
        }

        let id =
            normalized.id;

        let suffix =
            2;

        while (seenIds.has(id)) {
            id =
                `${normalized.id}-${suffix++}`;
        }

        normalized.id =
            id;

        seenIds.add(id);

        result.push(
            normalized
        );
    });

    return result;
}


function publicIngredient(ingredient) {
    const normalized =
        normalizeStoredIngredient(
            ingredient
        );

    if (!normalized) {
        return null;
    }

    return {
        id:
            normalized.id,

        name:
            normalized.name,

        category:
            normalized.category ||
            "Other",

        unit:
            normalized.unit,

        stock:
            safeFiniteNumber(
                normalized.stock,
                0
            ),

        lowStockThreshold:
            safeFiniteNumber(
                normalized.lowStockThreshold,
                0
            ),

        updatedAt:
            normalized.updatedAt ||
            null
    };
}


async function getAdminConfig(cafeId) {
    const store =
        await readStore();

    const cafe =
        getCafeContainer(
            store,
            cafeId
        );

    /*
     * Sanitize legacy / partially written records in memory so
     * GET /api/inventory/live never crashes on one bad row.
     */
    cafe.ingredients =
        sanitizeIngredientArray(
            cafe.ingredients
        );

    return {
        cafeId:
            normalizeCafeId(
                cafeId
            ),

        ingredients:
            cafe.ingredients
                .map(
                    publicIngredient
                )
                .filter(
                    Boolean
                ),

        recipes:
            Array.isArray(
                cafe.recipes
            )
                ? cafe.recipes
                : [],

        adjustments:
            Array.isArray(
                cafe.adjustments
            )
                ? cafe.adjustments
                    .filter(
                        item =>
                            item &&
                            typeof item === "object"
                    )
                    .slice(
                        0,
                        100
                    )
                : []
    };
}


async function getDashboard(cafeId) {
    const config =
        await getAdminConfig(
            cafeId
        );

    const ingredients =
        config.ingredients
            .slice()
            .sort(
                (a, b) =>
                    String(
                        a?.name ||
                        ""
                    ).localeCompare(
                        String(
                            b?.name ||
                            ""
                        )
                    )
            );

    return {
        cafeId:
            config.cafeId,

        ingredients,

        adjustments:
            config.adjustments,

        totalIngredients:
            ingredients.length,

        lowStockCount:
            ingredients.filter(
                item =>
                    Number(
                        item.stock
                    ) > 0 &&
                    Number(
                        item.stock
                    ) <=
                    Number(
                        item.lowStockThreshold
                    )
            ).length,

        outOfStockCount:
            ingredients.filter(
                item =>
                    Number(
                        item.stock
                    ) <= 0
            ).length
    };
}

async function createIngredient(cafeId, payload) {
    return queueMutation(store => {
        const cafe = getCafeContainer(store, cafeId);
        const name = String(payload?.name || "").trim();
        const unit = normalizeUnit(payload?.unit);
        const category = normalizeIngredientCategory(payload?.category);
        const stock = Number(payload?.stock ?? 0);
        const threshold = Number(payload?.lowStockThreshold ?? 0);

        if (!name) {
            const error = new Error("Ingredient name is required.");
            error.statusCode = 400;
            throw error;
        }
        if (!Number.isFinite(stock) || stock < 0) {
            const error = new Error("Initial stock must be a non-negative number.");
            error.statusCode = 400;
            throw error;
        }
        if (!Number.isFinite(threshold) || threshold < 0) {
            const error = new Error("Low-stock threshold must be a non-negative number.");
            error.statusCode = 400;
            throw error;
        }

        const duplicate = cafe.ingredients.find(item =>
            String(item.name).trim().toLowerCase() === name.toLowerCase() &&
            normalizeUnit(item.unit) === unit
        );

        if (duplicate) {
            const error = new Error("That ingredient already exists in inventory.");
            error.statusCode = 409;
            throw error;
        }

        let id = slug(name);
        let suffix = 2;
        while (cafe.ingredients.some(item => item.id === id)) {
            id = `${slug(name)}-${suffix++}`;
        }

        const now = new Date().toISOString();
        const ingredient = {
            id,
            name,
            category,
            unit,
            stock,
            lowStockThreshold: threshold,
            createdAt: now,
            updatedAt: now
        };

        cafe.ingredients.push(ingredient);

        if (stock > 0) {
            cafe.adjustments.unshift({
                id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                ingredientId: id,
                ingredientName: name,
                type: "set",
                quantity: stock,
                beforeStock: 0,
                afterStock: stock,
                reason: "Initial stock",
                notes: "Ingredient created",
                date: now.slice(0, 10),
                source: "admin",
                createdAt: now
            });
        }

        cafe.adjustments = cafe.adjustments.slice(0, 500);
        return publicIngredient(ingredient);
    });
}


async function seedSampleIngredients(cafeId) {
    return queueMutation(store => {
        const cafe = getCafeContainer(store, cafeId);
        cafe.ingredients =
            sanitizeIngredientArray(
                cafe.ingredients
            );

        const existing =
            new Set(
                cafe.ingredients.map(
                    item =>
                        `${String(item.name || "").trim().toLowerCase()}|${normalizeUnit(item.unit)}`
                )
            );

        const added = [];
        const now = new Date().toISOString();

        for (const sample of SAMPLE_INGREDIENTS) {
            const unit = normalizeUnit(sample.unit);
            const key = `${String(sample.name).trim().toLowerCase()}|${unit}`;

            if (existing.has(key)) {
                continue;
            }

            let id = slug(sample.name);
            let suffix = 2;

            while (cafe.ingredients.some(item => item.id === id)) {
                id = `${slug(sample.name)}-${suffix++}`;
            }

            const ingredient = {
                id,
                name: sample.name,
                category: sample.category,
                unit,
                stock: Number(sample.stock || 0),
                lowStockThreshold: Number(sample.lowStockThreshold || 0),
                createdAt: now,
                updatedAt: now
            };

            cafe.ingredients.push(ingredient);
            existing.add(key);
            added.push(publicIngredient(ingredient));

            if (ingredient.stock > 0) {
                cafe.adjustments.unshift({
                    id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    ingredientId: ingredient.id,
                    ingredientName: ingredient.name,
                    type: "set",
                    quantity: ingredient.stock,
                    beforeStock: 0,
                    afterStock: ingredient.stock,
                    reason: "Sample stock",
                    notes: "Loaded from CafeKiosk sample inventory",
                    date: now.slice(0, 10),
                    source: "sample-seed",
                    createdAt: now
                });
            }
        }

        cafe.adjustments = cafe.adjustments.slice(0, 500);

        return {
            added,
            addedCount: added.length,
            totalIngredients: cafe.ingredients.length
        };
    });
}

async function updateIngredient(cafeId, ingredientId, patch) {
    return queueMutation(store => {
        const cafe = getCafeContainer(store, cafeId);
        const ingredient = cafe.ingredients.find(item => item.id === ingredientId);
        if (!ingredient) {
            const error = new Error("Ingredient not found.");
            error.statusCode = 404;
            throw error;
        }

        if (patch.name !== undefined) {
            const name = String(patch.name || "").trim();
            if (!name) {
                const error = new Error("Ingredient name cannot be empty.");
                error.statusCode = 400;
                throw error;
            }
            ingredient.name = name;
        }
        if (patch.category !== undefined) {
            ingredient.category = normalizeIngredientCategory(patch.category);
        }
        if (patch.unit !== undefined) {
            ingredient.unit = normalizeUnit(patch.unit);
        }
        if (patch.lowStockThreshold !== undefined) {
            const threshold = Number(patch.lowStockThreshold);
            if (!Number.isFinite(threshold) || threshold < 0) {
                const error = new Error("Low-stock threshold must be a non-negative number.");
                error.statusCode = 400;
                throw error;
            }
            ingredient.lowStockThreshold = threshold;
        }

        ingredient.updatedAt = new Date().toISOString();
        return publicIngredient(ingredient);
    });
}

async function deleteIngredient(cafeId, ingredientId) {
    return queueMutation(store => {
        const cafe = getCafeContainer(store, cafeId);
        const ingredient = cafe.ingredients.find(item => item.id === ingredientId);
        if (!ingredient) {
            const error = new Error("Ingredient not found.");
            error.statusCode = 404;
            throw error;
        }

        const usedBy = cafe.recipes.filter(recipe =>
            (recipe.ingredients || []).some(row => row.ingredientId === ingredientId)
        );

        if (usedBy.length) {
            const error = new Error(
                `This ingredient is used by ${usedBy.length} menu recipe(s). Remove it from those recipes first.`
            );
            error.statusCode = 409;
            throw error;
        }

        cafe.ingredients = cafe.ingredients.filter(item => item.id !== ingredientId);
        return publicIngredient(ingredient);
    });
}

async function adjustIngredient(cafeId, ingredientId, payload) {
    return queueMutation(store => {
        const cafe = getCafeContainer(store, cafeId);
        const ingredient = cafe.ingredients.find(item => item.id === ingredientId);
        if (!ingredient) {
            const error = new Error("Ingredient not found.");
            error.statusCode = 404;
            throw error;
        }

        const typeRaw = String(payload?.type || "increase").toLowerCase();
        const type = ["increase", "decrease", "set"].includes(typeRaw) ? typeRaw : "increase";
        const quantity = Number(payload?.quantity);
        if (!Number.isFinite(quantity) || quantity < 0) {
            const error = new Error("Quantity must be a non-negative number.");
            error.statusCode = 400;
            throw error;
        }

        const beforeStock = Number(ingredient.stock || 0);
        let afterStock = beforeStock;
        if (type === "increase") afterStock = beforeStock + quantity;
        if (type === "decrease") afterStock = beforeStock - quantity;
        if (type === "set") afterStock = quantity;

        if (afterStock < 0) {
            const error = new Error(
                `Cannot reduce ${ingredient.name} below zero. Current stock is ${beforeStock} ${ingredient.unit}.`
            );
            error.statusCode = 409;
            throw error;
        }

        ingredient.stock = Number(afterStock.toFixed(4));
        ingredient.updatedAt = new Date().toISOString();

        const now = new Date().toISOString();
        const adjustment = {
            id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            type,
            quantity,
            beforeStock,
            afterStock: ingredient.stock,
            reason: String(payload?.reason || "Manual adjustment").trim(),
            notes: String(payload?.notes || "").trim(),
            date: String(payload?.date || now.slice(0, 10)),
            source: String(payload?.source || "admin"),
            createdAt: now
        };

        cafe.adjustments.unshift(adjustment);
        cafe.adjustments = cafe.adjustments.slice(0, 500);

        return {
            ingredient: publicIngredient(ingredient),
            adjustment
        };
    });
}

async function getRecipe(cafeId, name, category) {
    const config = await getAdminConfig(cafeId);
    const key = recipeKey(name, category);
    return config.recipes.find(recipe => recipe.key === key) || null;
}

function normalizeRecipeRow(row, cafe) {
    const ingredientId = String(row?.ingredientId || "").trim();
    const ingredient = cafe.ingredients.find(item => item.id === ingredientId);
    if (!ingredient) {
        const error = new Error("Every recipe ingredient must exist in Inventory Monitor.");
        error.statusCode = 400;
        throw error;
    }

    const amount = Number(row?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
        const error = new Error(`Recipe quantity for ${ingredient.name} must be greater than zero.`);
        error.statusCode = 400;
        throw error;
    }

    const mode = String(row?.mode || "required").toLowerCase() === "option"
        ? "option"
        : "required";
    const optionValue = String(row?.optionValue || "").trim();
    if (mode === "option" && !optionValue) {
        const error = new Error(`Option name is required for optional ingredient ${ingredient.name}.`);
        error.statusCode = 400;
        throw error;
    }

    return {
        ingredientId,
        amount,
        mode,
        optionValue,
        scaleWithSize: row?.scaleWithSize !== false
    };
}

async function saveRecipe(cafeId, payload) {
    return queueMutation(store => {
        const cafe = getCafeContainer(store, cafeId);
        const itemName = String(payload?.itemName || "").trim();
        const category = normalizeCategory(payload?.category);
        if (!itemName || !category) {
            const error = new Error("itemName and category are required.");
            error.statusCode = 400;
            throw error;
        }

        const recipeIngredients = (Array.isArray(payload?.ingredients) ? payload.ingredients : [])
            .map(row => normalizeRecipeRow(row, cafe));

        const key = recipeKey(itemName, category);
        const previousKey = String(payload?.previousKey || "").trim();
        if (previousKey && previousKey !== key) {
            cafe.recipes = cafe.recipes.filter(recipe => recipe.key !== previousKey);
        }

        const recipe = {
            key,
            itemName,
            category,
            ingredients: recipeIngredients,
            sizeMultipliers: { base: 1, medium: 2, large: 3 },
            updatedAt: new Date().toISOString()
        };

        const index = cafe.recipes.findIndex(item => item.key === key);
        if (index >= 0) cafe.recipes[index] = recipe;
        else cafe.recipes.push(recipe);

        return {
            recipe,
            ingredients: cafe.ingredients.map(publicIngredient)
        };
    });
}

function buildStatusForCafe(cafe) {
    const ingredientMap = new Map(cafe.ingredients.map(item => [item.id, item]));
    const sizeChecks = [
        { label: "Small", multiplier: 1 },
        { label: "Tall", multiplier: 1 },
        { label: "Single", multiplier: 1 },
        { label: "Medium", multiplier: 2 },
        { label: "Regular", multiplier: 2 },
        { label: "Grande", multiplier: 2 },
        { label: "Bundle", multiplier: 2 },
        { label: "Large", multiplier: 3 },
        { label: "Venti", multiplier: 3 }
    ];

    return cafe.recipes.map(recipe => {
        const requiredRows = recipe.ingredients.filter(row => row.mode !== "option");
        const optionRows = recipe.ingredients.filter(row => row.mode === "option");
        const alerts = [];
        const blockedSizes = [];
        const blockedOptions = [];
        const lowOptions = [];
        let unavailable = false;
        let lowStock = false;

        for (const row of requiredRows) {
            const ingredient = ingredientMap.get(row.ingredientId);
            if (!ingredient) {
                unavailable = true;
                continue;
            }

            const stock = Number(ingredient.stock || 0);
            const threshold = Number(ingredient.lowStockThreshold || 0);
            const baseNeeded = Number(row.amount || 0);
            if (stock < baseNeeded) unavailable = true;
            if (stock <= threshold) lowStock = true;

            if (stock <= threshold || stock < baseNeeded * 3) {
                alerts.push({
                    ingredientId: ingredient.id,
                    name: ingredient.name,
                    stock,
                    unit: ingredient.unit,
                    lowStockThreshold: threshold
                });
            }
        }

        for (const size of sizeChecks) {
            const blocked = requiredRows.some(row => {
                const ingredient = ingredientMap.get(row.ingredientId);
                if (!ingredient) return true;
                const multiplier = row.scaleWithSize === false ? 1 : size.multiplier;
                return Number(ingredient.stock || 0) < Number(row.amount || 0) * multiplier;
            });
            if (blocked) blockedSizes.push(size.label);
        }

        if (blockedSizes.length && !unavailable) lowStock = true;

        for (const row of optionRows) {
            const ingredient = ingredientMap.get(row.ingredientId);
            if (!ingredient || !row.optionValue) continue;
            const stock = Number(ingredient.stock || 0);
            const threshold = Number(ingredient.lowStockThreshold || 0);
            const needed = Number(row.amount || 0);
            if (stock < needed) blockedOptions.push(row.optionValue);
            if (stock <= threshold) lowOptions.push(row.optionValue);
            if (stock <= threshold) {
                alerts.push({
                    ingredientId: ingredient.id,
                    name: ingredient.name,
                    stock,
                    unit: ingredient.unit,
                    lowStockThreshold: threshold,
                    optionValue: row.optionValue
                });
            }
        }

        const uniqueAlerts = Array.from(
            new Map(alerts.map(alert => [alert.ingredientId, alert])).values()
        );

        return {
            key: recipe.key,
            itemName: recipe.itemName,
            category: recipe.category,
            unavailable,
            lowStock,
            blockedSizes: Array.from(new Set(blockedSizes)),
            blockedOptions: Array.from(new Set(blockedOptions)),
            lowOptions: Array.from(new Set(lowOptions)),
            alerts: uniqueAlerts
        };
    });
}

async function getInventoryStatus(cafeId) {
    const store = await readStore();
    const cafe = getCafeContainer(store, cafeId);
    return buildStatusForCafe(cafe);
}

function computeOrderRequirements(cafe, order) {
    const ingredientMap = new Map(cafe.ingredients.map(item => [item.id, item]));
    const recipeMap = new Map(cafe.recipes.map(recipe => [recipe.key, recipe]));
    const totals = new Map();

    for (const item of (Array.isArray(order?.items) ? order.items : [])) {
        const recipe = recipeMap.get(recipeKey(item.name, item.category));
        if (!recipe) continue;

        const qty = Math.max(1, Number(item.qty ?? item.quantity ?? 1) || 1);
        const customizations = Array.isArray(item.customizations) ? item.customizations : [];
        const sizeMultiplier = extractSizeMultiplier(customizations);

        for (const row of recipe.ingredients) {
            if (row.mode === "option" && !customizationIncludes(customizations, row.optionValue)) {
                continue;
            }
            const ingredient = ingredientMap.get(row.ingredientId);
            if (!ingredient) continue;
            const multiplier = row.scaleWithSize === false ? 1 : sizeMultiplier;
            const needed = Number(row.amount || 0) * multiplier * qty;
            if (!needed) continue;

            const existing = totals.get(ingredient.id) || {
                ingredientId: ingredient.id,
                name: ingredient.name,
                unit: ingredient.unit,
                quantity: 0
            };
            existing.quantity += needed;
            totals.set(ingredient.id, existing);
        }
    }

    return Array.from(totals.values());
}

async function consumeOrder(order) {
    return queueMutation(store => {
        const cafeId = normalizeCafeId(order?.cafeId);
        const cafe = getCafeContainer(store, cafeId);
        const orderKey = String(order?.orderNumber || order?.id || "").trim();
        if (!orderKey) {
            const error = new Error("Order identifier is required for inventory deduction.");
            error.statusCode = 400;
            throw error;
        }

        if (cafe.consumptionByOrder[orderKey]) {
            return {
                success: true,
                duplicate: true,
                consumed: false,
                requirements: cafe.consumptionByOrder[orderKey].requirements || []
            };
        }

        const requirements = computeOrderRequirements(cafe, order);
        const ingredientMap = new Map(cafe.ingredients.map(item => [item.id, item]));
        const shortages = [];

        for (const requirement of requirements) {
            const ingredient = ingredientMap.get(requirement.ingredientId);
            const stock = Number(ingredient?.stock || 0);
            if (!ingredient || stock < requirement.quantity) {
                shortages.push({
                    ingredientId: requirement.ingredientId,
                    name: requirement.name,
                    required: requirement.quantity,
                    available: stock,
                    unit: requirement.unit
                });
            }
        }

        if (shortages.length) {
            return { success: false, consumed: false, shortages };
        }

        const now = new Date().toISOString();
        for (const requirement of requirements) {
            const ingredient = ingredientMap.get(requirement.ingredientId);
            const before = Number(ingredient.stock || 0);
            ingredient.stock = Number(Math.max(0, before - requirement.quantity).toFixed(4));
            ingredient.updatedAt = now;
            cafe.adjustments.unshift({
                id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                type: "decrease",
                quantity: requirement.quantity,
                beforeStock: before,
                afterStock: ingredient.stock,
                reason: `Order ${orderKey}`,
                notes: "Automatic recipe deduction",
                date: now.slice(0, 10),
                source: "order",
                createdAt: now
            });
        }

        cafe.adjustments = cafe.adjustments.slice(0, 500);
        cafe.consumptionByOrder[orderKey] = {
            orderKey,
            requirements,
            consumedAt: now,
            restoredAt: null,
            reconciledAt: null
        };

        return {
            success: true,
            duplicate: false,
            consumed: requirements.length > 0,
            requirements
        };
    });
}

async function restoreOrder(order, reason = "Order void/refund") {
    return queueMutation(store => {
        const cafeId = normalizeCafeId(order?.cafeId);
        const cafe = getCafeContainer(store, cafeId);
        const candidateKeys = [order?.orderNumber, order?.id, order?.orderId]
            .filter(Boolean)
            .map(String);
        const recordKey = candidateKeys.find(key => cafe.consumptionByOrder[key]);
        if (!recordKey) return { restored: false, reason: "not-consumed" };

        const record = cafe.consumptionByOrder[recordKey];
        if (record.restoredAt) return { restored: false, reason: "already-restored" };

        const ingredientMap = new Map(cafe.ingredients.map(item => [item.id, item]));
        const now = new Date().toISOString();

        for (const requirement of record.requirements || []) {
            const ingredient = ingredientMap.get(requirement.ingredientId);
            if (!ingredient) continue;
            const before = Number(ingredient.stock || 0);
            ingredient.stock = Number((before + Number(requirement.quantity || 0)).toFixed(4));
            ingredient.updatedAt = now;
            cafe.adjustments.unshift({
                id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                type: "increase",
                quantity: Number(requirement.quantity || 0),
                beforeStock: before,
                afterStock: ingredient.stock,
                reason,
                notes: `Automatic stock return for order ${recordKey}`,
                date: now.slice(0, 10),
                source: "order-return",
                createdAt: now
            });
        }

        cafe.adjustments = cafe.adjustments.slice(0, 500);
        record.restoredAt = now;
        return { restored: true, requirements: record.requirements || [] };
    });
}

async function reconcileOrder(order) {
    return queueMutation(store => {
        const cafeId = normalizeCafeId(order?.cafeId);
        const cafe = getCafeContainer(store, cafeId);
        const candidateKeys = [order?.orderNumber, order?.id, order?.orderId]
            .filter(Boolean)
            .map(String);
        const recordKey = candidateKeys.find(key => cafe.consumptionByOrder[key]);
        if (!recordKey) return { success: true, changed: false, reason: "not-consumed" };

        const record = cafe.consumptionByOrder[recordKey];
        if (record.restoredAt) return { success: true, changed: false, reason: "already-restored" };

        const oldRequirements = Array.isArray(record.requirements) ? record.requirements : [];
        const nextRequirements = computeOrderRequirements(cafe, order);
        const oldMap = new Map(oldRequirements.map(item => [item.ingredientId, item]));
        const nextMap = new Map(nextRequirements.map(item => [item.ingredientId, item]));
        const ingredientMap = new Map(cafe.ingredients.map(item => [item.id, item]));
        const ids = new Set([...oldMap.keys(), ...nextMap.keys()]);
        const shortages = [];

        for (const id of ids) {
            const oldQty = Number(oldMap.get(id)?.quantity || 0);
            const newQty = Number(nextMap.get(id)?.quantity || 0);
            const extraNeeded = newQty - oldQty;
            if (extraNeeded > 0) {
                const ingredient = ingredientMap.get(id);
                const stock = Number(ingredient?.stock || 0);
                if (!ingredient || stock < extraNeeded) {
                    shortages.push({
                        ingredientId: id,
                        name: ingredient?.name || nextMap.get(id)?.name || "Ingredient",
                        required: extraNeeded,
                        available: stock,
                        unit: ingredient?.unit || nextMap.get(id)?.unit || ""
                    });
                }
            }
        }

        if (shortages.length) {
            return { success: false, changed: false, shortages };
        }

        const now = new Date().toISOString();
        let changed = false;
        for (const id of ids) {
            const oldQty = Number(oldMap.get(id)?.quantity || 0);
            const newQty = Number(nextMap.get(id)?.quantity || 0);
            const delta = oldQty - newQty; // positive = return stock
            if (!delta) continue;
            const ingredient = ingredientMap.get(id);
            if (!ingredient) continue;
            const before = Number(ingredient.stock || 0);
            ingredient.stock = Number((before + delta).toFixed(4));
            ingredient.updatedAt = now;
            changed = true;

            cafe.adjustments.unshift({
                id: `adj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                type: delta > 0 ? "increase" : "decrease",
                quantity: Math.abs(delta),
                beforeStock: before,
                afterStock: ingredient.stock,
                reason: `Order ${recordKey} adjusted`,
                notes: delta > 0
                    ? "Automatic ingredient return after item void/refund"
                    : "Automatic additional recipe deduction after order edit",
                date: now.slice(0, 10),
                source: "order-adjustment",
                createdAt: now
            });
        }

        cafe.adjustments = cafe.adjustments.slice(0, 500);
        record.requirements = nextRequirements;
        record.reconciledAt = now;

        return { success: true, changed, requirements: nextRequirements };
    });
}

module.exports = {
    DATA_FILE,
    normalizeCafeId,
    normalizeCategory,
    normalizeUnit,
    recipeKey,
    getAdminConfig,
    getDashboard,
    seedSampleIngredients,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    adjustIngredient,
    getRecipe,
    saveRecipe,
    getInventoryStatus,
    consumeOrder,
    restoreOrder,
    reconcileOrder,
    extractSizeMultiplier
};
