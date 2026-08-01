const db = require("../models/db");

exports.createOrder = async (req, res) => {
    const { items, order_source, service_type, user_id } = req.body;

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Create order
        const [orderResult] = await connection.query(
            `INSERT INTO orders (user_id, order_source, service_type)
             VALUES (?, ?, ?)`,
            [user_id || null, order_source, service_type]
        );

        const orderId = orderResult.insertId;

        // Insert items
        for (let item of items) {
            const [menuItem] = await connection.query(
                "SELECT price FROM menu_items WHERE item_id = ?",
                [item.item_id]
            );

            const price = menuItem[0].price;
            const subtotal = price * item.quantity;

            await connection.query(
                `INSERT INTO order_items 
                (order_id, item_id, quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?)`,
                [orderId, item.item_id, item.quantity, price, subtotal]
            );
        }

        // total is auto-handled by trigger

        await connection.commit();

        res.json({
            message: "✅ Order placed successfully",
            order_id: orderId
        });

    } catch (err) {
        await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
};