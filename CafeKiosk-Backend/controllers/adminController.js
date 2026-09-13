exports.getInventoryLogs = (req, res) => {
  return res.status(200).json({
    logs: [
      { id: 1, action: "Stock updated", item: "Coffee Beans", time: new Date().toISOString() },
      { id: 2, action: "New order received", item: "Latte", time: new Date().toISOString() },
    ],
  });
};

exports.getNotifications = (req, res) => {
  return res.status(200).json({
    notifications: [
      { id: 1, message: "Queue synced successfully", type: "info" },
      { id: 2, message: "Order #CK-123 is ready", type: "success" },
    ],
  });
};
