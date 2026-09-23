// ============================================================
// CAFEKIOSK ORDER NORMALIZER
// ============================================================
//
// Accepts BOTH existing frontend payload styles:
//
// KIOSK:
// {
//   cafeId,
//   source: "kiosk",
//   orderNumber,
//   serviceType,
//   paymentMethod,
//   total,
//   items: [
//     {
//       name,
//       category,
//       price,
//       qty,
//       customizationCost,
//       total,
//       customizations
//     }
//   ]
// }
//
// POS:
// {
//   cafeId,
//   source: "POS",
//   orderNumber,
//   customerName,
//   serviceType,
//   paymentMethod,
//   cashReceived,
//   change,
//   subtotal,
//   discountAmount,
//   total,
//   status,
//   createdAt,
//   items: [
//     {
//       productId,
//       name,
//       category,
//       price,
//       customizationCost,
//       customizations,
//       quantity,
//       qty,
//       subtotal
//     }
//   ]
// }
//
// Everything is normalized into ONE backend format.
// ============================================================


function asText(
    value,
    fallback = ""
) {

    if (
        value === undefined ||
        value === null
    ) {
        return fallback;
    }

    const text =
        String(value).trim();

    return text || fallback;
}


function asNumber(
    value,
    fallback = 0
) {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}


function roundMoney(
    value
) {

    return Math.round(
        (
            asNumber(value, 0) +
            Number.EPSILON
        ) *
        100
    ) / 100;
}


function normalizeCafeId(
    value
) {

    return asText(
        value,
        "cafe-1"
    );
}


function normalizeSource(
    value
) {

    const raw =
        asText(
            value,
            "Kiosk"
        ).toLowerCase();

    if (
        raw === "pos" ||
        raw.includes("counter") ||
        raw.includes("staff")
    ) {
        return "POS";
    }

    return "Kiosk";
}


function normalizeServiceType(
    value
) {

    const raw =
        asText(
            value,
            "Dine In"
        )
            .replace(
                /[_-]+/g,
                " "
            )
            .replace(
                /\s+/g,
                " "
            )
            .trim()
            .toLowerCase();

    if (
        raw === "takeout" ||
        raw === "take out" ||
        raw === "take away" ||
        raw === "takeaway"
    ) {
        return "Take Out";
    }

    return "Dine In";
}


function normalizePaymentMethod(
    value
) {

    const raw =
        asText(
            value,
            "Cash"
        ).toLowerCase();

    if (
        raw.includes("gcash")
    ) {
        return "GCash";
    }

    if (
        raw.includes("card")
    ) {
        return "Card";
    }

    return "Cash";
}


function normalizeStatus(
    value
) {

    const raw =
        asText(
            value,
            "Pending"
        )
            .replace(
                /[_-]+/g,
                " "
            )
            .trim()
            .toLowerCase();

    const map = {
        pending:
            "Pending",

        accepted:
            "Preparing",

        preparing:
            "Preparing",

        ready:
            "Ready",

        completed:
            "Completed",

        complete:
            "Completed",

        cancelled:
            "Cancelled",

        canceled:
            "Cancelled",

        void:
            "Voided",

        voided:
            "Voided",

        refund:
            "Refunded",

        refunded:
            "Refunded"
    };

    return (
        map[raw] ||
        "Pending"
    );
}


function normalizeCustomizations(
    value
) {

    if (
        Array.isArray(value)
    ) {

        return value
            .map(
                item => {

                    if (
                        typeof item ===
                        "string"
                    ) {
                        return item.trim();
                    }

                    if (
                        item &&
                        typeof item ===
                        "object"
                    ) {

                        return (
                            item.label ||
                            item.name ||
                            item.value ||
                            item.title ||
                            ""
                        );
                    }

                    return "";
                }
            )
            .map(
                item =>
                    String(
                        item
                    ).trim()
            )
            .filter(Boolean);
    }


    if (
        value &&
        typeof value ===
        "object"
    ) {

        return Object.entries(
            value
        )
            .map(
                ([
                    key,
                    item
                ]) => {

                    if (
                        item === undefined ||
                        item === null ||
                        item === ""
                    ) {
                        return "";
                    }

                    if (
                        Array.isArray(
                            item
                        )
                    ) {

                        return (
                            `${key}: ` +
                            item
                                .map(
                                    entry =>
                                        typeof entry ===
                                        "string"
                                            ? entry
                                            : (
                                                entry?.label ||
                                                entry?.name ||
                                                entry?.value ||
                                                ""
                                            )
                                )
                                .filter(Boolean)
                                .join(", ")
                        );
                    }

                    return `${key}: ${item}`;
                }
            )
            .filter(Boolean);
    }


    if (
        typeof value ===
        "string" &&
        value.trim()
    ) {
        return [
            value.trim()
        ];
    }


    return [];
}


function normalizeItem(
    item = {},
    index = 0
) {

    const qty =
        Math.max(
            1,
            Math.floor(
                asNumber(
                    item.qty ??
                    item.quantity,
                    1
                )
            )
        );

    const price =
        roundMoney(
            item.price ??
            item.basePrice ??
            0
        );

    const customizationCost =
        roundMoney(
            item.customizationCost ??
            item.customization_cost ??
            0
        );

    const unitPrice =
        roundMoney(
            price +
            customizationCost
        );

    const calculatedSubtotal =
        roundMoney(
            unitPrice *
            qty
        );

    const itemSubtotal =
        roundMoney(
            item.subtotal ??
            item.total ??
            calculatedSubtotal
        );

    const customizations =
        normalizeCustomizations(
            item.customizations ??
            item.customization ??
            item.addons ??
            item.addOns ??
            []
        );

    return {
        productId:
            asText(
                item.productId ??
                item.product_id ??
                "",
                ""
            ),

        name:
            asText(
                item.name ??
                item.productName,
                `Item ${index + 1}`
            ),

        category:
            asText(
                item.category,
                "Uncategorized"
            ),

        price,

        customizationCost,

        unitPrice,

        qty,

        quantity:
            qty,

        subtotal:
            itemSubtotal,

        total:
            itemSubtotal,

        customizations
    };
}


function generateOrderNumber(
    source,
    cafeId
) {

    const prefix =
        source ===
        "POS"
            ? "POS"
            : "KIOSK";

    const timestamp =
        Date.now()
            .toString()
            .slice(-8);

    const random =
        Math.floor(
            100 +
            Math.random() *
            900
        );

    const cafe =
        String(
            cafeId
        )
            .replace(
                /[^a-zA-Z0-9]/g,
                ""
            )
            .slice(
                -8
            ) ||
        "CAFE";

    return (
        `${prefix}-${cafe}-${timestamp}-${random}`
    );
}


function normalizeOrderPayload(
    payload = {}
) {

    const cafeId =
        normalizeCafeId(
            payload.cafeId ??
            payload.cafe_id
        );

    const source =
        normalizeSource(
            payload.source
        );

    const items =
        (
            Array.isArray(
                payload.items
            )
                ? payload.items
                : []
        )
            .map(
                normalizeItem
            );

    const calculatedSubtotal =
        roundMoney(
            items.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.subtotal,
                0
            )
        );

    const subtotal =
        roundMoney(
            payload.subtotal ??
            calculatedSubtotal
        );

    const discountAmount =
        roundMoney(
            payload.discountAmount ??
            payload.discount ??
            0
        );

    const total =
        roundMoney(
            payload.total ??
            Math.max(
                0,
                subtotal -
                discountAmount
            )
        );

    const paymentMethod =
        normalizePaymentMethod(
            payload.paymentMethod ??
            payload.payment
        );

    const cashReceived =
        roundMoney(
            payload.cashReceived ??
            payload.cash_received ??
            0
        );

    const paymentAmount =
        roundMoney(
            payload.paymentAmount ??
            payload.payment_amount ??
            (paymentMethod === "Cash"
                ? cashReceived
                : 0)
        );

    const change =
        roundMoney(
            payload.change ??
            (
                paymentMethod ===
                "Cash"
                    ? Math.max(
                        0,
                        cashReceived -
                        total
                    )
                    : 0
            )
        );

    const createdAtInput =
        payload.createdAt ??
        payload.created_at;

    const createdAt =
        createdAtInput &&
        !Number.isNaN(
            Date.parse(
                createdAtInput
            )
        )
            ? new Date(
                createdAtInput
            ).toISOString()
            : new Date()
                .toISOString();

    return {
        cafeId,

        source,

        orderNumber:
            asText(
                payload.orderNumber ??
                payload.order_number,
                generateOrderNumber(
                    source,
                    cafeId
                )
            ),

        customerName:
            asText(
                payload.customerName ??
                payload.customer,
                source ===
                "POS"
                    ? "Walk-in Customer"
                    : "Kiosk Customer"
            ),

        serviceType:
            normalizeServiceType(
                payload.serviceType ??
                payload.serving
            ),

        paymentMethod,

        paymentStatus:
            asText(
                payload.paymentStatus ??
                payload.payment_status,
                ""
            ),

        paymentAmount,

        cashReceived,

        change,

        subtotal,

        discountAmount,

        discount:
            discountAmount,

        total,

        status:
            normalizeStatus(
                payload.status
            ),

        createdAt,

        updatedAt:
            new Date()
                .toISOString(),

        items
    };
}


function validateNewOrder(
    order
) {

    const errors =
        [];


    if (
        !order.cafeId
    ) {
        errors.push(
            "cafeId is required."
        );
    }


    if (
        !order.orderNumber
    ) {
        errors.push(
            "orderNumber is required."
        );
    }


    if (
        !Array.isArray(
            order.items
        ) ||
        order.items.length ===
        0
    ) {
        errors.push(
            "At least one order item is required."
        );
    }


    if (
        order.total <
        0
    ) {
        errors.push(
            "Order total cannot be negative."
        );
    }

    if (
        order.source === "POS" &&
        order.paymentAmount < order.total
    ) {
        errors.push(
            `${order.paymentMethod} amount paid must be at least the final order total.`
        );
    }


    return errors;
}


module.exports = {
    normalizeCafeId,
    normalizeSource,
    normalizeServiceType,
    normalizePaymentMethod,
    normalizeStatus,
    normalizeItem,
    normalizeOrderPayload,
    validateNewOrder,
    roundMoney
};
