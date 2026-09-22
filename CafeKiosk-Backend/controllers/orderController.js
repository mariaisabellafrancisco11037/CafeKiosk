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


const recipeInventoryStore =
    require(
        "../services/recipeInventoryStore"
    );

const bcrypt = require('bcryptjs');
const dbPool = require('../config/dbPool');
const kioskAccessStore = require('../services/kioskAccessStore');

async function verifyApprovalPin(req) {
    const action = String(req.body?.adjustmentAction || '').trim().toLowerCase();
    if (!['void', 'refund'].includes(action)) return { required: false, valid: true };

    if (!req.user?.cafeId) return { required: true, valid: false, message: 'Login is required for void/refund approval.' };
    const pin = String(req.body?.managerPin || '').trim();
    if (!/^\d{4,6}$/.test(pin)) return { required: true, valid: false, message: 'Enter a valid 4-6 digit Admin/Manager PIN.' };

    try {
        const [rows] = await dbPool.execute(
            `SELECT user_id, full_name, username, role, approval_pin_hash
               FROM users
              WHERE cafe_id = ? AND role IN ('Admin','Manager') AND status = 'Active' AND approval_pin_hash IS NOT NULL`,
            [String(req.user.cafeId)]
        );
        for (const row of rows) {
            if (await bcrypt.compare(pin, row.approval_pin_hash || '')) {
                return { required: true, valid: true, approver: { userId: row.user_id, name: row.full_name, username: row.username, role: row.role } };
            }
        }
        return { required: true, valid: false, message: 'Invalid Admin/Manager approval PIN.' };
    } catch (error) {
        if (error?.code === 'ER_BAD_FIELD_ERROR') {
            return { required: true, valid: false, message: 'Approval PIN is not configured yet. An Admin or Manager must set one in Profile.' };
        }
        throw error;
    }
}



function emitInventoryChanged(
    req,
    cafeId,
    reason
) {

    const io =
        req.app.get(
            "io"
        );

    if (!io) {
        return;
    }

    const normalizedCafeId =
        normalizeCafeId(
            cafeId
        );

    const payload = {
        cafeId:
            normalizedCafeId,

        reason:
            reason ||
            "order-inventory-change",

        changedAt:
            new Date()
                .toISOString()
    };

    [
        `kiosk-${normalizedCafeId}`,
        `pos-${normalizedCafeId}`,
        `admin-${normalizedCafeId}`,
        `order-queue-${normalizedCafeId}`
    ].forEach(
        room => {
            io.to(
                room
            ).emit(
                "inventory:changed",
                payload
            );
        }
    );
}


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

            // For cafe-specific public Kiosks, do not trust a browser-supplied
            // cafeId. Resolve the registered kiosk slug on the server and force
            // the order into that cafe's tenant. Legacy Demo Cafe orders without
            // a slug remain compatible with cafe-1.
            const incomingSource = String(req.body?.source || '').trim().toLowerCase();
            const incomingKioskSlug = String(req.body?.kioskSlug || '').trim().toLowerCase();
            if (incomingSource === 'kiosk' && incomingKioskSlug) {
                const kiosk = await kioskAccessStore.getBySlug(incomingKioskSlug);
                if (!kiosk || kiosk.cafeStatus !== 'Active' || !kiosk.kioskEnabled) {
                    return res.status(404).json({ success: false, message: 'This Kiosk link is no longer active.' });
                }
                req.body = { ...req.body, cafeId: kiosk.cafeId };
            }

            const order =
                normalizeOrderPayload(
                    req.body
                );

            const creatorUserId = Number(req.user?.userId);
            if (
                String(order.source || "").toUpperCase() === "POS" &&
                Number.isFinite(creatorUserId) && creatorUserId > 0
            ) {
                order.createdByUserId = creatorUserId;
            }

            // CAFEKIOSK_FLEX_ORDER_METADATA
            // Keep promotion/eligibility metadata and the exact ingredient
            // usage calculated by the POS/Kiosk after normalizing the order.
            order.customerEligibility = String(req.body?.customerEligibility || req.body?.eligibility || "all");
            if (req.body?.promotionId) order.promotionId = String(req.body.promotionId);
            if (req.body?.promotionName) order.promotionName = String(req.body.promotionName);
            if (req.body?.promotionType) order.promotionType = String(req.body.promotionType);
            const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
            if (Array.isArray(order.items)) {
                order.items = order.items.map((item, index) => {
                    const raw = rawItems[index] || {};
                    const direct = Array.isArray(raw.ingredientUsage) ? raw.ingredientUsage : [];
                    return direct.length ? { ...item, ingredientUsage: direct } : item;
                });
            }


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


            // --------------------------------------------------------
            // RECIPE-BASED INVENTORY RESERVATION
            // --------------------------------------------------------
            // Deduct stock only for a genuinely new order. The
            // consumption store also has duplicate protection, so the
            // same order number cannot deduct ingredients twice.

            const existingBeforeCreate =
                await orderStore
                    .findOrder(
                        order.orderNumber
                    );


            let inventoryReservation =
                null;


            if (
                !existingBeforeCreate
            ) {

                inventoryReservation =
                    await recipeInventoryStore
                        .consumeOrder(
                            order
                        );


                if (
                    !inventoryReservation.success
                ) {

                    const shortageText =
                        (
                            inventoryReservation.shortages ||
                            []
                        )
                            .map(
                                item =>
                                    `${item.name}: need ${item.required}${item.unit}, available ${item.available}${item.unit}`
                            )
                            .join(
                                ", "
                            );


                    return res
                        .status(409)
                        .json({
                            success:
                                false,

                            code:
                                "INSUFFICIENT_STOCK",

                            message:
                                shortageText
                                    ? `Insufficient ingredient stock. ${shortageText}`
                                    : "Insufficient ingredient stock.",

                            shortages:
                                inventoryReservation.shortages ||
                                []
                        });
                }
            }


            let savedOrder;
            let created;


            try {

                const result =
                    await orderStore
                        .createOrder(
                            order
                        );

                savedOrder =
                    result.order;

                created =
                    result.created;


            } catch (error) {

                // If the order itself could not be stored, restore any
                // inventory that was reserved immediately beforehand.
                if (
                    inventoryReservation?.consumed
                ) {
                    await recipeInventoryStore
                        .restoreOrder(
                            order
                        )
                        .catch(
                            restoreError =>
                                console.error(
                                    "Unable to roll back recipe inventory:",
                                    restoreError
                                )
                        );
                }

                throw error;
            }


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


                emitInventoryChanged(
                    req,
                    savedOrder.cafeId,
                    "order-created"
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


            const previousOrder =
                await orderStore
                    .findOrder(
                        req.params
                            .orderId
                    );


            const order =
                await orderStore
                    .updateOrder(
                        req.params
                            .orderId,
                        {
                            status,
                            changedByUserId: Number.isFinite(Number(req.user?.userId))
                                ? Number(req.user.userId)
                                : null
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


            const previousStatus =
                previousOrder
                    ? normalizeStatus(
                        previousOrder.status
                    )
                    : "";


            const isInventoryReturnStatus =
                status === "Cancelled" ||
                status === "Refunded";


            const wasAlreadyReturned =
                previousStatus === "Cancelled" ||
                previousStatus === "Refunded";


            if (
                isInventoryReturnStatus &&
                previousOrder &&
                !wasAlreadyReturned
            ) {

                const restored =
                    await recipeInventoryStore
                        .restoreOrder(
                            previousOrder,
                            status === "Refunded"
                                ? "Order refunded"
                                : "Order void/cancelled"
                        );

                if (
                    restored.restored
                ) {
                    emitInventoryChanged(
                        req,
                        order.cafeId,
                        status === "Refunded"
                            ? "order-refund-restock"
                            : "order-void-restock"
                    );
                }
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

            const pinApproval =
                await verifyApprovalPin(req);

            if (pinApproval.required && !pinApproval.valid) {
                return res.status(403).json({ success: false, code: 'APPROVAL_PIN_REQUIRED', message: pinApproval.message });
            }


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


            const patch = {
                changedByUserId: Number.isFinite(Number(req.user?.userId))
                    ? Number(req.user.userId)
                    : null
            };


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


            let inventoryReconciliation =
                null;


            if (
                patch.items !==
                undefined
            ) {

                const proposedOrder = {
                    ...existing,
                    ...patch,
                    items:
                        patch.items
                };


                inventoryReconciliation =
                    await recipeInventoryStore
                        .reconcileOrder(
                            proposedOrder
                        );


                if (
                    inventoryReconciliation &&
                    inventoryReconciliation.success ===
                        false
                ) {

                    return res
                        .status(409)
                        .json({
                            success:
                                false,

                            code:
                                "INSUFFICIENT_STOCK",

                            message:
                                "The edited order requires ingredients that are no longer available.",

                            shortages:
                                inventoryReconciliation.shortages ||
                                []
                        });
                }
            }


            const order =
                await orderStore
                    .updateOrder(
                        req.params
                            .orderId,
                        patch
                    );


            if (
                inventoryReconciliation?.changed
            ) {

                emitInventoryChanged(
                    req,
                    order.cafeId,
                    "order-items-reconciled"
                );
            }


            if (
                patch.status !==
                undefined
            ) {

                const nextStatus =
                    normalizeStatus(
                        patch.status
                    );


                const previousStatus =
                    normalizeStatus(
                        existing.status
                    );


                const nextReturnsInventory =
                    nextStatus === "Cancelled" ||
                    nextStatus === "Refunded";


                const previousAlreadyReturned =
                    previousStatus === "Cancelled" ||
                    previousStatus === "Refunded";


                if (
                    nextReturnsInventory &&
                    !previousAlreadyReturned
                ) {

                    const restored =
                        await recipeInventoryStore
                            .restoreOrder(
                                order,
                                nextStatus === "Refunded"
                                    ? "Order refunded"
                                    : "Order void/cancelled"
                            );


                    if (
                        restored.restored
                    ) {

                        emitInventoryChanged(
                            req,
                            order.cafeId,
                            nextStatus === "Refunded"
                                ? "order-refund-restock"
                                : "order-void-restock"
                        );
                    }
                }
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
