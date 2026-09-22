// ============================================================
// MENU AVAILABILITY ROUTES
// ============================================================

const express =
    require("express");

const router =
    express.Router();

const {
    getAvailability,
    putAvailability
} =
    require(
        "../controllers/menuAvailabilityController"
    );

const {
    verifyToken,
    isAdmin
} =
    require(
        "../middleware/authMiddleware"
    );


const recipeInventoryController =
    require(
        "../controllers/recipeInventoryController"
    );

router.get(
    "/",
    getAvailability
);

router.put(
    "/",
    verifyToken,
    isAdmin,
    putAvailability
);


// ============================================================
// RECIPE-BASED INVENTORY
// ============================================================

// Kiosk and POS can read computed stock status.
router.get(
    "/inventory-status",
    recipeInventoryController.getStatus
);

// Admin-only recipe/ingredient configuration.
router.get(
    "/inventory-config",
    verifyToken,
    isAdmin,
    recipeInventoryController.getConfig
);

router.get(
    "/recipe",
    verifyToken,
    isAdmin,
    recipeInventoryController.getRecipe
);

router.put(
    "/recipe",
    verifyToken,
    isAdmin,
    recipeInventoryController.putRecipe
);

router.patch(
    "/ingredient/:ingredientId",
    verifyToken,
    isAdmin,
    recipeInventoryController.patchIngredient
);

module.exports =
    router;
