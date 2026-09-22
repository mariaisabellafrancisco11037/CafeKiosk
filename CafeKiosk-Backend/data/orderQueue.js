const orderQueue = [];


// ============================================
// GENERATE ORDER NUMBER
// ============================================

function generateOrderNumber() {

  const now = new Date();

  const stamp = now
    .toISOString()
    .slice(0, 19)
    .replace(/[-:T]/g, "");

  const random =
    Math.floor(
      100 +
      Math.random() * 900
    );

  return `CK-${stamp}-${random}`;
}


// ============================================
// ADD NEW ORDER
// ============================================

function addOrder(orderData) {

  const items =
    Array.isArray(orderData.items)
      ? orderData.items
      : [];


  // Calculate total if total was not provided
  const calculatedTotal =
    items.reduce(
      (sum, item) => {

        const quantity =
          Number(
            item.quantity ??
            item.qty ??
            1
          ) || 1;


        const price =
          Number(
            item.price
          ) || 0;


        const itemTotal =
          Number(
            item.total ??
            item.subtotal ??
            (price * quantity)
          ) || 0;


        return sum + itemTotal;

      },
      0
    );


  const providedTotal =
    Number(orderData.total);


  const total =
    Number.isFinite(providedTotal) &&
    providedTotal >= 0
      ? providedTotal
      : calculatedTotal;


  const now =
    new Date().toISOString();


  const newOrder = {

    // ----------------------------------------
    // INTERNAL ID
    // ----------------------------------------

    id:
      orderData.id ||
      `${Date.now()}-${Math.random()
        .toString(16)
        .slice(2, 8)}`,


    // ----------------------------------------
    // ORDER NUMBER
    // ----------------------------------------

    orderNumber:
      orderData.orderNumber ||
      generateOrderNumber(),


    // ----------------------------------------
    // CAFE ID
    // IMPORTANT FOR SOCKET.IO
    // ----------------------------------------

    cafeId:
      orderData.cafeId ||
      "cafe-1",


    // ----------------------------------------
    // SOURCE
    // kiosk / cashier / mobile
    // ----------------------------------------

    source:
      orderData.source ||
      "kiosk",


    // ----------------------------------------
    // SERVICE TYPE
    // ----------------------------------------

    serviceType:
      orderData.serviceType ||
      "Dine In",


    // ----------------------------------------
    // PAYMENT
    // ----------------------------------------

    paymentMethod:
      orderData.paymentMethod ||
      "Cash",


    // ----------------------------------------
    // STATUS
    // ----------------------------------------

    status:
      orderData.status ||
      "Pending",


    // ----------------------------------------
    // ITEMS
    // ----------------------------------------

    items,


    // ----------------------------------------
    // TOTAL
    // ----------------------------------------

    total,


    // ----------------------------------------
    // DATES
    // ----------------------------------------

    createdAt:
      now,

    updatedAt:
      now

  };


  // Add newest order at the end
  orderQueue.push(
    newOrder
  );


  console.log("");
  console.log(
    "📦 Order added to queue"
  );

  console.log(
    "Order Number:",
    newOrder.orderNumber
  );

  console.log(
    "Cafe:",
    newOrder.cafeId
  );

  console.log(
    "Status:",
    newOrder.status
  );

  console.log("");


  return newOrder;
}


// ============================================
// GET ALL ORDERS
// ============================================

function getOrders() {

  return [...orderQueue]
    .sort(
      (a, b) =>
        new Date(a.createdAt) -
        new Date(b.createdAt)
    );

}


// ============================================
// GET SINGLE ORDER
// ============================================

function getOrderById(orderId) {

  return orderQueue.find(
    (item) =>

      String(item.id) ===
        String(orderId) ||

      String(item.orderNumber) ===
        String(orderId)

  ) || null;

}


// ============================================
// UPDATE ORDER STATUS
// ============================================

function updateOrderStatus(
  orderId,
  nextStatus
) {

  const order =
    orderQueue.find(
      (item) =>

        String(item.id) ===
          String(orderId) ||

        String(item.orderNumber) ===
          String(orderId)
    );


  if (!order) {

    return null;

  }


  order.status =
    nextStatus;


  order.updatedAt =
    new Date().toISOString();


  console.log("");
  console.log(
    "🔄 Order status updated"
  );

  console.log(
    "Order:",
    order.orderNumber
  );

  console.log(
    "Status:",
    nextStatus
  );

  console.log("");


  return order;
}


// ============================================
// EXPORTS
// ============================================

module.exports = {

  addOrder,

  getOrders,

  getOrderById,

  updateOrderStatus,

  orderQueue

};