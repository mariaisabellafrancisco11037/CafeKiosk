// ============================================================
// CAFEKIOSK - RECIPE INVENTORY CONTROLLER
// ============================================================

const store = require("../services/recipeInventoryStore");

function emitInventoryChanged(req, cafeId, reason = "inventory-update") {
    const io = req.app.get("io");
    if (!io) return;

    const payload = {
        cafeId: store.normalizeCafeId(cafeId),
        reason,
        changedAt: new Date().toISOString()
    };

    [
        `kiosk-${payload.cafeId}`,
        `pos-${payload.cafeId}`,
        `admin-${payload.cafeId}`,
        `order-queue-${payload.cafeId}`
    ].forEach(room => {
        io.to(room).emit("inventory:changed", payload);
    });
}

exports.getStatus = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.query.cafeId);
        const items = await store.getInventoryStatus(cafeId);

        return res.json({
            success: true,
            cafeId,
            count: items.length,
            items
        });
    } catch (error) {
        next(error);
    }
};

exports.getConfig = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.user?.cafeId || req.query.cafeId);
        const config = await store.getAdminConfig(cafeId);

        return res.json({
            success: true,
            ...config
        });
    } catch (error) {
        next(error);
    }
};

exports.getRecipe = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.user?.cafeId || req.query.cafeId);
        const itemName = String(req.query.name || "").trim();
        const category = String(req.query.category || "").trim();

        if (!itemName || !category) {
            return res.status(400).json({
                success: false,
                message: "name and category are required."
            });
        }

        const recipe = await store.getRecipe(cafeId, itemName, category);
        const config = await store.getAdminConfig(cafeId);

        return res.json({
            success: true,
            cafeId,
            recipe,
            ingredients: config.ingredients
        });
    } catch (error) {
        next(error);
    }
};

exports.putRecipe = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.user?.cafeId || req.body?.cafeId);
        const result = await store.saveRecipe(cafeId, req.body || {});

        emitInventoryChanged(req, cafeId, "recipe-saved");

        return res.json({
            success: true,
            message: "Recipe and ingredient settings saved.",
            cafeId,
            ...result
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};

exports.patchIngredient = async (req, res, next) => {
    try {
        const cafeId = store.normalizeCafeId(req.user?.cafeId || req.body?.cafeId || req.query.cafeId);
        const ingredient = await store.updateIngredient(
            cafeId,
            req.params.ingredientId,
            req.body || {}
        );

        emitInventoryChanged(req, cafeId, "ingredient-updated");

        return res.json({
            success: true,
            message: "Ingredient stock updated.",
            cafeId,
            ingredient
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};

exports.emitInventoryChanged = emitInventoryChanged;
