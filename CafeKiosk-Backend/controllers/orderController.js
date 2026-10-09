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
const { verifyCafeApprovalPin } = require('../services/approvalPinService');
const { hardenOrderPayload } = require('../services/orderSecurityService');

async function verifyApprovalPin(req) {
    const action = String(req.body?.adjustmentAction || '').trim().toLowerCase();
    if (!['void', 'refund'].includes(action)) return { required: false, valid: true };

    if (!req.user?.cafeId) {
        return { required: true, valid: false, code: 'APPROVAL_PIN_REQUIRED', message: 'Login is required for void/refund approval.' };
    }

    const requesterRole = String(req.user?.role || '').trim().toLowerCase();

    // Admin and Manager sessions are themselves privileged approvals. A PIN is
    // specifically required when Staff asks a supervisor to authorize a void/refund.
    if (requesterRole === 'admin' || requesterRole === 'manager') {
        return {
            required: false,
            valid: true,
            approver: {
                userId: Number.isFinite(Number(req.user?.userId)) ? Number(req.user.userId) : null,
                name: req.user?.displayName || req.user?.fullName || req.user?.username || req.user?.role,
                username: req.user?.username || '',
                role: req.user?.role
            }
        };
    }

    if (requesterRole !== 'staff') {
        return { required: true, valid: false, code: 'APPROVAL_PIN_REQUIRED', message: 'Staff approval requires an active Admin/Manager PIN.' };
    }

    const result = await verifyCafeApprovalPin(req.user.cafeId, req.body?.managerPin);
    return {
        required: true,
        valid: Boolean(result.valid),
        code: result.code,
        message: result.message,
        approver: result.approver || null
    };
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

    // The auth room is a reliability fallback for every authenticated
    // Admin/Manager/Staff socket in this cafe.  The POS and Order Queue
    // rooms remain for page-specific listeners, while Socket.IO de-duplicates
    // sockets that belong to more than one target room.
    return [
        `order-queue-${cafeId}`,
        `pos-${cafeId}`,
        `admin-${cafeId}`,
        `auth-${cafeId}`,
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


    // Emit to the union of cafe rooms in one operation.  A POS/Queue socket
    // normally belongs to multiple rooms; using one Socket.IO target prevents
    // duplicate new-order callbacks on that client.
    io.to(
        orderRooms(
            cafeId
        )
    ).emit(
        eventName,
        payload
    );


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

            // Authenticated POS orders always belong to the cafe stored in the
            // authenticated account. Never trust a browser/localStorage cafeId
            // for Staff, Manager, or Admin POS submissions.
            if (incomingSource === 'pos') {
                if (!req.user?.cafeId) {
                    return res.status(401).json({ success: false, message: 'Staff, Manager, or Admin login is required for POS orders.' });
                }
                req.body = { ...req.body, cafeId: String(req.user.cafeId) };
            }

            // Server-authoritative pricing. The browser may display prices, but
            // database base prices, promotions, tax/service rates and totals win.
            req.body = await hardenOrderPayload(
                req.body,
                normalizeCafeId(req.body?.cafeId)
            );

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
                normalizeCafeId(
                    req.user?.cafeId || req.query.cafeId || 'cafe-1'
                );


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
                !order ||
                String(order.cafeId || order.cafe_id || '') !== String(req.user?.cafeId || '')
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


            if (!previousOrder || String(previousOrder.cafeId || previousOrder.cafe_id || '') !== String(req.user?.cafeId || '')) {
                return res.status(404).json({ success: false, message: 'Order not found.' });
            }


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
// PATCH /api/orders/:orderId/station-status
// Separate Beverage / Food preparation progress.
// ============================================================

exports.updateOrderStationStatus = async (req, res, next) => {
    try {
        const stationRaw = String(req.body?.station || '').trim().toLowerCase();
        const station = stationRaw === 'beverage' ? 'Beverage' : stationRaw === 'food' ? 'Food' : '';
        const requested = String(req.body?.status || '').trim().toLowerCase();
        const status = requested.includes('complete') || requested === 'ready'
            ? 'Completed'
            : requested.includes('prepar') || requested === 'accepted'
                ? 'Preparing'
                : requested === 'pending'
                    ? 'Pending'
                    : '';

        if (!station || !status) {
            return res.status(400).json({ success: false, message: 'A valid station (Beverage/Food) and status (Pending/Preparing/Completed) are required.' });
        }

        const existing = await orderStore.findOrder(req.params.orderId);
        if (!existing || String(existing.cafeId || '') !== String(req.user?.cafeId || '')) {
            return res.status(404).json({ success: false, message: 'Order not found.' });
        }

        if (['Cancelled','Refunded','Voided'].includes(String(existing.status || ''))) {
            return res.status(409).json({ success: false, message: 'A voided/refunded order cannot be updated by a preparation station.' });
        }

        let order = await orderStore.updateStationStatus(
            req.params.orderId,
            station,
            status,
            Number.isFinite(Number(req.user?.userId)) ? Number(req.user.userId) : null
        );

        const stations = Array.isArray(order?.stations) ? order.stations : [];
        const statuses = order?.stationStatuses || {};
        const values = stations.map(name => String(statuses?.[name]?.status || 'Pending'));
        let globalStatus = 'Pending';
        if (values.length && values.every(value => value === 'Completed')) globalStatus = 'Completed';
        else if (values.some(value => value === 'Preparing' || value === 'Completed')) globalStatus = 'Preparing';

        if (String(order.status || '') !== globalStatus) {
            order = await orderStore.updateOrder(req.params.orderId, {
                status: globalStatus,
                changedByUserId: Number.isFinite(Number(req.user?.userId)) ? Number(req.user.userId) : null,
                reason: `${station} station marked ${status}`,
                source: `${station} Station`,
                preserveStationStatuses: true
            });
        }

        emitToCafe(req, 'order-updated', order);
        emitToCafe(req, 'order:updated', order);
        emitChanged(req, order, 'PATCH');

        return res.json({
            success: true,
            message: `${station} station updated to ${status}.`,
            station,
            stationStatus: status,
            order
        });
    } catch (error) {
        if (error?.code === 'STATION_NOT_IN_ORDER' || error?.code === 'INVALID_STATION') {
            return res.status(400).json({ success: false, message: error.message });
        }
        next(error);
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
                return res.status(403).json({ success: false, code: pinApproval.code || 'APPROVAL_PIN_REQUIRED', message: pinApproval.message });
            }


            const existing =
                await orderStore
                    .findOrder(
                        req.params
                            .orderId
                    );


            if (
                !existing ||
                String(existing.cafeId || existing.cafe_id || '') !== String(req.user?.cafeId || '')
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
                    : null,
                reason: req.body?.adjustmentReason || req.body?.reason || null,
                statusReason: req.body?.adjustmentReason || req.body?.statusReason || null,
                approval: pinApproval.approver || null
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
                        pinApproval?.approver
                            ? `Order updated with approval from ${pinApproval.approver.role || "supervisor"} ${pinApproval.approver.name || ""}`.trim()
                            : "Order updated.",

                    approval:
                        pinApproval?.approver || null,

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
