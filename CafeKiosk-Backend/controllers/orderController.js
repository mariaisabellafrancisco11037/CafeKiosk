// ============================================================
// CAFEKIOSK ORDER CONTROLLER
// ============================================================
//
// ONE backend endpoint receives orders from BOTH:
//   - Kiosk menu
//   - POS menu
//
// POST /api/orders
//
// The backend normalizes their slightly different payload formats,
// stores the order, and pushes realtime events to the Order Queue.
// ============================================================

const {
    normalizeCafeId,
    normalizeSource,
    normalizeStatus,
    normalizeOrderPayload,
    validateNewOrder
} = require(
    "../utils/orderNormalizer"
);


const orderStore =
    require(
        "../services/orderStore"
    );


// ============================================================
// REALTIME BROADCAST
// ============================================================

function orderRooms(
    cafeId
) {

    return [
        `order-queue-${cafeId}`,
        `pos-${cafeId}`,
        `admin-${cafeId}`,
        `kiosk-${cafeId}`
    ];
}


function emitToCafe(
    req,
    eventName,
    payload
) {

    const io =
        req.app.get(
            "io"
        );


    if (!io) {

        console.warn(
            `⚠️ Socket.IO is not attached. Event "${eventName}" was not broadcast.`
        );

        return;
    }


    const cafeId =
        normalizeCafeId(
            payload?.cafeId
        );


    for (
        const room
        of orderRooms(
            cafeId
        )
    ) {

        io.to(
            room
        ).emit(
            eventName,
            payload
        );
    }


    if (
        payload?.id
    ) {

        io.to(
            `order-${payload.id}`
        ).emit(
            eventName,
            payload
        );
    }


    if (
        payload?.orderNumber
    ) {

        io.to(
            `order-${payload.orderNumber}`
        ).emit(
            eventName,
            payload
        );
    }
}


function emitChanged(
    req,
    order,
    method
) {

    const payload = {
        cafeId:
            order.cafeId,

        orderId:
            order.id,

        orderNumber:
            order.orderNumber,

        source:
            order.source,

        status:
            order.status,

        method,

        changedAt:
            new Date()
                .toISOString()
    };


    emitToCafe(
        req,
        "orders:changed",
        payload
    );
}


// ============================================================
// POST /api/orders
// RECEIVE KIOSK OR POS ORDER
// ============================================================

exports.createOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            const order =
                normalizeOrderPayload(
                    req.body
                );


            const errors =
                validateNewOrder(
                    order
                );


            if (
                errors.length
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        message:
                            "Invalid order.",

                        errors
                    });
            }


            const {
                order:
                    savedOrder,
                created
            } =
                await orderStore
                    .createOrder(
                        order
                    );


            // Emit realtime only for a genuinely new order.
            if (
                created
            ) {

                emitToCafe(
                    req,
                    "new-order",
                    savedOrder
                );


                // Compatibility with alternate frontend event naming.
                emitToCafe(
                    req,
                    "order:created",
                    savedOrder
                );


                emitChanged(
                    req,
                    savedOrder,
                    "POST"
                );
            }


            console.log(
                created
                    ? `✅ ${savedOrder.source} order received: ${savedOrder.orderNumber} (${savedOrder.cafeId})`
                    : `ℹ️ Duplicate order ignored safely: ${savedOrder.orderNumber}`
            );


            return res
                .status(
                    created
                        ? 201
                        : 200
                )
                .json({
                    success:
                        true,

                    duplicate:
                        !created,

                    message:
                        created
                            ? "Order received successfully."
                            : "Order already exists.",

                    order:
                        savedOrder
                });


        } catch (
            error
        ) {

            next(
                error
            );
        }
    };


// ============================================================
// GET /api/orders
// ORDER QUEUE DATA
// ============================================================

exports.listOrders =
    async (
        req,
        res,
        next
    ) => {

        try {

            const cafeId =
                req.query.cafeId
                    ? normalizeCafeId(
                        req.query.cafeId
                    )
                    : undefined;


            const source =
                req.query.source
                    ? normalizeSource(
                        req.query.source
                    )
                    : undefined;


            const status =
                req.query.status
                    ? normalizeStatus(
                        req.query.status
                    )
                    : undefined;


            const orders =
                await orderStore
                    .listOrders({
                        cafeId,
                        source,
                        status,
                        limit:
                            req.query.limit
                    });


            return res
                .json({
                    success:
                        true,

                    cafeId:
                        cafeId ||
                        null,

                    count:
                        orders.length,

                    orders
                });


        } catch (
            error
        ) {

            next(
                error
            );
        }
    };


// ============================================================
// GET /api/orders/:orderId
// ============================================================

exports.getOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            const order =
                await orderStore
                    .findOrder(
                        req.params
                            .orderId
                    );


            if (
                !order
            ) {

                return res
                    .status(404)
                    .json({
                        success:
                            false,

                        message:
                            "Order not found."
                    });
            }


            return res
                .json({
                    success:
                        true,

                    order
                });


        } catch (
            error
        ) {

            next(
                error
            );
        }
    };


// ============================================================
// PATCH /api/orders/:orderId/status
// ============================================================

exports.updateOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            const status =
                normalizeStatus(
                    req.body.status
                );


            if (
                !req.body.status
            ) {

                return res
                    .status(400)
                    .json({
                        success:
                            false,

                        message:
                            "status is required."
                    });
            }


            const order =
                await orderStore
                    .updateOrder(
                        req.params
                            .orderId,
                        {
                            status
                        }
                    );


            if (
                !order
            ) {

                return res
                    .status(404)
                    .json({
                        success:
                            false,

                        message:
                            "Order not found."
                    });
            }


            emitToCafe(
                req,
                "order-updated",
                order
            );


            emitToCafe(
                req,
                "order:updated",
                order
            );


            emitChanged(
                req,
                order,
                "PATCH"
            );


            console.log(
                `🔄 Order ${order.orderNumber} -> ${order.status}`
            );


            return res
                .json({
                    success:
                        true,

                    message:
                        "Order status updated.",

                    order
                });


        } catch (
            error
        ) {

            next(
                error
            );
        }
    };


// ============================================================
// PATCH /api/orders/:orderId
// OPTIONAL GENERAL ORDER UPDATE
// ============================================================

exports.patchOrder =
    async (
        req,
        res,
        next
    ) => {

        try {

            const existing =
                await orderStore
                    .findOrder(
                        req.params
                            .orderId
                    );


            if (
                !existing
            ) {

                return res
                    .status(404)
                    .json({
                        success:
                            false,

                        message:
                            "Order not found."
                    });
            }


            const patch = {};


            if (
                req.body.status !==
                undefined
            ) {

                patch.status =
                    normalizeStatus(
                        req.body.status
                    );
            }


            if (
                req.body.paymentStatus !==
                undefined
            ) {

                patch.paymentStatus =
                    String(
                        req.body
                            .paymentStatus
                    );
            }


            if (
                req.body.customerName !==
                undefined
            ) {

                patch.customerName =
                    String(
                        req.body
                            .customerName
                    );
            }


            if (
                req.body.items !==
                undefined
            ) {

                if (
                    !Array.isArray(
                        req.body.items
                    )
                ) {

                    return res
                        .status(400)
                        .json({
                            success:
                                false,

                            message:
                                "items must be an array."
                        });
                }


                patch.items =
                    req.body.items;
            }


            if (
                req.body.subtotal !==
                undefined
            ) {

                const subtotal =
                    Number(
                        req.body.subtotal
                    );


                if (
                    !Number.isFinite(
                        subtotal
                    ) ||
                    subtotal < 0
                ) {

                    return res
                        .status(400)
                        .json({
                            success:
                                false,

                            message:
                                "subtotal must be a valid non-negative number."
                        });
                }


                patch.subtotal =
                    subtotal;
            }


            if (
                req.body.discountAmount !==
                undefined
            ) {

                const discountAmount =
                    Number(
                        req.body
                            .discountAmount
                    );


                if (
                    !Number.isFinite(
                        discountAmount
                    ) ||
                    discountAmount < 0
                ) {

                    return res
                        .status(400)
                        .json({
                            success:
                                false,

                            message:
                                "discountAmount must be a valid non-negative number."
                        });
                }


                patch.discountAmount =
                    discountAmount;
            }


            if (
                req.body.total !==
                undefined
            ) {

                const total =
                    Number(
                        req.body.total
                    );


                if (
                    !Number.isFinite(
                        total
                    ) ||
                    total < 0
                ) {

                    return res
                        .status(400)
                        .json({
                            success:
                                false,

                            message:
                                "total must be a valid non-negative number."
                        });
                }


                patch.total =
                    total;
            }


            const order =
                await orderStore
                    .updateOrder(
                        req.params
                            .orderId,
                        patch
                    );


            emitToCafe(
                req,
                "order-updated",
                order
            );


            emitToCafe(
                req,
                "order:updated",
                order
            );


            emitChanged(
                req,
                order,
                "PATCH"
            );


            return res
                .json({
                    success:
                        true,

                    message:
                        "Order updated.",

                    order
                });


        } catch (
            error
        ) {

            next(
                error
            );
        }
    };


// ============================================================
// GET /api/orders/health
// ============================================================

exports.orderHealth =
    async (
        req,
        res,
        next
    ) => {

        try {

            await orderStore
                .ensureStore();


            const orders =
                await orderStore
                    .readOrders();


            return res
                .json({
                    success:
                        true,

                    service:
                        "CafeKiosk Order Queue Backend",

                    storage:
                        "json-file",

                    orderCount:
                        orders.length,

                    orderFile:
                        orderStore.ORDER_FILE
                });


        } catch (
            error
        ) {

            next(
                error
            );
        }
    };
