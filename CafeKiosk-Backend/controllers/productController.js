exports.getProducts = (req, res) => {
  const products = [
    { id: 1, name: "Coffee", price: 120, category: "coffee" },
    { id: 2, name: "Milk Tea", price: 140, category: "milktea" },
    { id: 3, name: "Donut", price: 90, category: "dessert" },
    { id: 4, name: "Burger", price: 180, category: "food" },
  ];

  return res.status(200).json({ products });
};
