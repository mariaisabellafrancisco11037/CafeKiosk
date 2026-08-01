const db = require("../models/db");

exports.getProducts = async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT m.*, c.category_name
            FROM menu_items m
            JOIN categories c ON m.category_id = c.category_id
            WHERE m.status = 'Available'
        `);

        res.json(products);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};