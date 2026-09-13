try {
  const normalizer = require("./utils/orderNormalizer");
  const store = require("./services/orderStore");
  const controller = require("./controllers/orderController");

  if (typeof normalizer.normalizeOrderPayload !== "function") throw new Error("normalizeOrderPayload missing");
  if (typeof store.createOrder !== "function") throw new Error("orderStore.createOrder missing");
  if (typeof controller.createOrder !== "function") throw new Error("orderController.createOrder missing");
  if (typeof controller.listOrders !== "function") throw new Error("orderController.listOrders missing");
  if (typeof controller.updateOrder !== "function") throw new Error("orderController.updateOrder missing");

  console.log("✅ orderNormalizer loaded");
  console.log("✅ orderStore loaded");
  console.log("✅ orderController loaded");
  console.log("✅ Missing-module problem is fixed");
} catch (error) {
  console.error(error);
  process.exit(1);
}
