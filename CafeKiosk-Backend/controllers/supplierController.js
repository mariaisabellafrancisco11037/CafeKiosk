const db = require("../models/db");

exports.getSuppliers = async (req, res) => {
    const [rows] = await db.query("SELECT * FROM suppliers");
    res.json(rows);
};

exports.createSupplier = async (req, res) => {
    const { supplier_name, contact_person, phone, email } = req.body;

    await db.query(
        "INSERT INTO suppliers (supplier_name, contact_person, phone, email) VALUES (?, ?, ?, ?)",
        [supplier_name, contact_person, phone, email]
    );

    res.json({ message: "Supplier added" });
};