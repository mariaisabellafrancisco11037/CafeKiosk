const store = require("../services/recipeInventoryStore");

function emitInventoryChanged(req, cafeId, reason = "inventory-update") {
    const io = req.app.get("io");
    if (!io) return;

    const normalized = store.normalizeCafeId(cafeId);
    const payload = {
        cafeId: normalized,
        reason,
        changedAt: new Date().toISOString()
    };

    [
        `kiosk-${normalized}`,
        `pos-${normalized}`,
        `admin-${normalized}`,
        `order-queue-${normalized}`
    ].forEach(room => io.to(room).emit("inventory:changed", payload));
}

function sendKnownError(res, error) {
    if (!error.statusCode) return false;
    res.status(error.statusCode).json({ success: false, message: error.message });
    return true;
}

exports.getDashboard = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.query.cafeId);
        const dashboard = await store.getDashboard(cafeId);
        return res.json({ success: true, ...dashboard });
    } catch (error) { next(error); }
};


// Read-only live dashboard.
// Used by the Inventory screen for reliable stock polling.
// It intentionally excludes adjustment history.
exports.getLiveDashboard = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.query.cafeId);
        const dashboard = await store.getDashboard(cafeId);

        return res.json({
            success: true,
            cafeId: dashboard.cafeId,
            ingredients: dashboard.ingredients,
            totalIngredients: dashboard.totalIngredients,
            lowStockCount: dashboard.lowStockCount,
            outOfStockCount: dashboard.outOfStockCount,
            serverTime: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
};


exports.seedSampleIngredients = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(
            req.body?.cafeId ||
            req.query?.cafeId
        );

        const result = await store.seedSampleIngredients(cafeId);

        emitInventoryChanged(req, cafeId, "sample-stock-loaded");

        return res.json({
            success: true,
            cafeId,
            ...result
        });

    } catch (error) {
        if (sendKnownError(res, error)) return;
        next(error);
    }
};

exports.getStatus = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.query.cafeId);
        const items = await store.getInventoryStatus(cafeId);
        return res.json({ success: true, cafeId, count: items.length, items });
    } catch (error) { next(error); }
};

exports.createIngredient = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.body?.cafeId);
        const ingredient = await store.createIngredient(cafeId, req.body || {});
        emitInventoryChanged(req, cafeId, "ingredient-created");
        return res.status(201).json({ success: true, cafeId, ingredient });
    } catch (error) {
        if (sendKnownError(res, error)) return;
        next(error);
    }
};

exports.updateIngredient = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.body?.cafeId || req.query.cafeId);
        const ingredient = await store.updateIngredient(cafeId, req.params.ingredientId, req.body || {});
        emitInventoryChanged(req, cafeId, "ingredient-updated");
        return res.json({ success: true, cafeId, ingredient });
    } catch (error) {
        if (sendKnownError(res, error)) return;
        next(error);
    }
};

exports.deleteIngredient = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.query.cafeId || req.body?.cafeId);
        const ingredient = await store.deleteIngredient(cafeId, req.params.ingredientId);
        emitInventoryChanged(req, cafeId, "ingredient-deleted");
        return res.json({ success: true, cafeId, ingredient });
    } catch (error) {
        if (sendKnownError(res, error)) return;
        next(error);
    }
};

exports.adjustIngredient = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.body?.cafeId || req.query.cafeId);
        const result = await store.adjustIngredient(cafeId, req.params.ingredientId, req.body || {});
        emitInventoryChanged(req, cafeId, "stock-adjusted");
        return res.json({ success: true, cafeId, ...result });
    } catch (error) {
        if (sendKnownError(res, error)) return;
        next(error);
    }
};

exports.getRecipe = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.query.cafeId);
        const itemName = String(req.query.name || "").trim();
        const category = String(req.query.category || "").trim();
        if (!itemName || !category) {
            return res.status(400).json({ success: false, message: "name and category are required." });
        }
        const recipe = await store.getRecipe(cafeId, itemName, category);
        const config = await store.getAdminConfig(cafeId);
        return res.json({ success: true, cafeId, recipe, ingredients: config.ingredients });
    } catch (error) { next(error); }
};

exports.putRecipe = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.body?.cafeId);
        const result = await store.saveRecipe(cafeId, req.body || {});
        emitInventoryChanged(req, cafeId, "recipe-saved");
        return res.json({ success: true, message: "Recipe saved.", cafeId, ...result });
    } catch (error) {
        if (sendKnownError(res, error)) return;
        next(error);
    }
};

exports.emitInventoryChanged = emitInventoryChanged;
