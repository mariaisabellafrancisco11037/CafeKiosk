const db = require("../models/db");

exports.createPO = async (req, res) => {
    const { supplier_id, items } = req.body;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const [po] = await connection.query(
            "INSERT INTO purchase_orders (supplier_id) VALUES (?)",
            [supplier_id]
        );

        const po_id = po.insertId;

        let total = 0;

        for (let item of items) {
            const subtotal = item.quantity * item.unit_cost;
            total += subtotal;

            await connection.query(
                `INSERT INTO purchase_order_items
                (po_id, ingredient_id, quantity, unit_cost, subtotal)
                VALUES (?, ?, ?, ?, ?)`,
                [po_id, item.ingredient_id, item.quantity, item.unit_cost, subtotal]
            );
        }

        await connection.query(
            "UPDATE purchase_orders SET total_amount = ? WHERE po_id = ?",
            [total, po_id]
        );

        await connection.commit();

        res.json({ message: "PO created", po_id });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    }
};