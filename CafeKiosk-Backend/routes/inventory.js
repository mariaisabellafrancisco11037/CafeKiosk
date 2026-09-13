const express = require("express");
const router = express.Router();
const controller = require("../controllers/inventoryController");
const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// Kiosk and POS may read availability/stock status without admin auth.
router.get("/status", controller.getStatus);
router.get("/live", controller.getLiveDashboard);

// Admin inventory dashboard and recipe management.
router.get("/", verifyToken, isAdmin, controller.getDashboard);
router.post("/ingredients", verifyToken, isAdmin, controller.createIngredient);
router.post("/seed-sample", verifyToken, isAdmin, controller.seedSampleIngredients);
router.patch("/ingredients/:ingredientId", verifyToken, isAdmin, controller.updateIngredient);
router.delete("/ingredients/:ingredientId", verifyToken, isAdmin, controller.deleteIngredient);
router.post("/ingredients/:ingredientId/adjust", verifyToken, isAdmin, controller.adjustIngredient);
router.get("/recipe", verifyToken, isAdmin, controller.getRecipe);
router.put("/recipe", verifyToken, isAdmin, controller.putRecipe);

module.exports = router;
