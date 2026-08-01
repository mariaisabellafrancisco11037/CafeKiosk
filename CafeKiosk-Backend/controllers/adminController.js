const db = require("../models/db");

exports.getInventoryLogs = async (req, res) => {
    try {
        const [logs] = await db.query(`
            SELECT il.*, i.ingredient_name
            FROM inventory_logs il
            JOIN ingredients i ON il.ingredient_id = i.ingredient_id
            ORDER BY il.log_date DESC
        `);

        res.json(logs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getNotifications = async (req, res) => {
    try {
        const [notifications] = await db.query(
            "SELECT * FROM notifications ORDER BY created_at DESC"
        );

        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};