// ============================================================
// CAFEKIOSK ORDER STORE
// ============================================================
//
// Complete backend persistence with no missing database dependency.
//
// Orders are stored in:
//     Backend/data/orders.json
//
// This makes the Order Queue backend work immediately even if the
// previous orderController/database code is missing.
//
// Later, this service can be replaced by a MySQL implementation without
// changing the routes or frontend API contract.
// ============================================================

const fs =
    require("fs/promises");

const path =
    require("path");

const crypto =
    require("crypto");


const DATA_DIRECTORY =
    path.join(
        __dirname,
        "..",
        "data"
    );


const ORDER_FILE =
    path.join(
        DATA_DIRECTORY,
        "orders.json"
    );


let writeQueue =
    Promise.resolve();


let cleanupPromise =
    null;


function isDiagnosticGhostOrder(
    order
) {

    if (
        !order ||
        typeof order !==
        "object"
    ) {
        return false;
    }


    const orderNumber =
        String(
            order.orderNumber ||
            order.orderId ||
            ""
        ).trim();


    const customer =
        String(
            order.customerName ||
            order.customer ||
            ""
        ).trim();


    return (
        /^TEST-/i.test(
            orderNumber
        )
        ||
        /^Order Flow Test$/i.test(
            customer
        )
    );
}


function parseOrdersText(
    text
) {

    const raw =
        String(
            text ||
            ""
        );


    if (
        !raw.trim()
    ) {
        return {
            orders: [],
            repaired: false
        };
    }


    try {

        const parsed =
            JSON.parse(
                raw
            );


        return {
            orders:
                Array.isArray(
                    parsed
                )
                    ? parsed
                    : [],

            repaired:
                false
        };


    } catch (
        originalError
    ) {

        /*
         * Repair the exact corruption caused by the previous cleanup:
         * a literal backslash+n was appended after valid JSON:
         *
         *     []\n
         *
         * Remove only trailing literal "\\n" / "\\r\\n" sequences.
         * This does not alter escaped newlines inside JSON strings.
         */
        const repairedText =
            raw
                .replace(
                    /(?:\\r\\n|\\n|\\r)+\s*$/g,
                    ""
                )
                .trim();


        try {

            const parsed =
                JSON.parse(
                    repairedText
                );


            return {
                orders:
                    Array.isArray(
                        parsed
                    )
                        ? parsed
                        : [],

                repaired:
                    true
            };


        } catch (
            repairError
        ) {

            const error =
                new Error(
                    "orders.json could not be parsed or safely repaired."
                );


            error.cause =
                repairError;


            throw error;
        }
    }
}


async function writeOrdersFileDirectly(
    orders,
    suffix =
        "repair"
) {

    const temporaryFile =
        `${ORDER_FILE}.${suffix}.${process.pid}.tmp`;


    await fs.writeFile(
        temporaryFile,
        JSON.stringify(
            orders,
            null,
            2
        ) +
        "\n",
        "utf8"
    );


    await fs.rename(
        temporaryFile,
        ORDER_FILE
    );
}


async function cleanupDiagnosticGhostOrders() {

    if (
        cleanupPromise
    ) {
        return cleanupPromise;
    }


    cleanupPromise =
        (async () => {

            const text =
                await fs.readFile(
                    ORDER_FILE,
                    "utf8"
                );


            const {
                orders,
                repaired
            } =
                parseOrdersText(
                    text
                );


            const cleaned =
                orders.filter(
                    order =>
                        !isDiagnosticGhostOrder(
                            order
                        )
                );


            const removedCount =
                orders.length -
                cleaned.length;


            if (
                repaired ||
                removedCount >
                0
            ) {

                await writeOrdersFileDirectly(
                    cleaned,
                    "cleanup"
                );


                if (
                    repaired
                ) {

                    console.log(
                        "🛠️ Repaired malformed orders.json safely."
                    );
                }


                if (
                    removedCount >
                    0
                ) {

                    console.log(
                        `🧹 Removed ${removedCount} old diagnostic TEST order(s) from orders.json.`
                    );
                }
            }
        })();


    try {

        await cleanupPromise;


    } catch (
        error
    ) {

        /*
         * Let future calls retry if the repair itself failed.
         */
        cleanupPromise =
            null;


        throw error;
    }
}

async function ensureStore() {

    await fs.mkdir(
        DATA_DIRECTORY,
        {
            recursive:
                true
        }
    );


    try {

        await fs.access(
            ORDER_FILE
        );

    } catch (_) {

        await fs.writeFile(
            ORDER_FILE,
            "[]\n",
            "utf8"
        );
    }


    await cleanupDiagnosticGhostOrders();
}


async function readOrders() {

    await ensureStore();


    const text =
        await fs.readFile(
            ORDER_FILE,
            "utf8"
        );


    try {

        const {
            orders,
            repaired
        } =
            parseOrdersText(
                text
            );


        if (
            repaired
        ) {

            await writeOrdersFileDirectly(
                orders,
                "read-repair"
            );


            console.log(
                "🛠️ Repaired malformed orders.json while reading."
            );
        }


        return orders;


    } catch (
        error
    ) {

        console.error(
            "❌ orders.json is invalid JSON and could not be safely repaired:",
            error
        );


        return [];
    }
}

async function atomicWrite(
    orders
) {

    await ensureStore();


    const temporaryFile =
        `${ORDER_FILE}.write.${process.pid}.tmp`;


    await fs.writeFile(
        temporaryFile,
        JSON.stringify(
            orders,
            null,
            2
        ) +
        "\n",
        "utf8"
    );


    await fs.rename(
        temporaryFile,
        ORDER_FILE
    );
}


function queuedWrite(
    operation
) {

    const next =
        writeQueue
            .then(
                operation,
                operation
            );


    writeQueue =
        next.catch(
            () => {}
        );


    return next;
}


function generateId() {

    if (
        typeof crypto.randomUUID ===
        "function"
    ) {
        return crypto.randomUUID();
    }


    return (
        `${Date.now()}-` +
        crypto
            .randomBytes(
                6
            )
            .toString(
                "hex"
            )
    );
}


function sameIdentifier(
    order,
    identifier
) {

    const wanted =
        String(
            identifier ||
            ""
        );


    return (
        String(
            order.id ||
            ""
        ) ===
        wanted
        ||
        String(
            order.orderId ||
            ""
        ) ===
        wanted
        ||
        String(
            order.orderNumber ||
            ""
        ) ===
        wanted
    );
}


async function listOrders({
    cafeId,
    source,
    status,
    limit
} = {}) {

    const orders =
        await readOrders();


    let result =
        orders.filter(
            order =>
                !isDiagnosticGhostOrder(
                    order
                )
        );


    if (
        cafeId
    ) {

        result =
            result.filter(
                order =>
                    String(
                        order.cafeId
                    ) ===
                    String(
                        cafeId
                    )
            );
    }


    if (
        source
    ) {

        result =
            result.filter(
                order =>
                    String(
                        order.source
                    ).toLowerCase() ===
                    String(
                        source
                    ).toLowerCase()
            );
    }


    if (
        status
    ) {

        result =
            result.filter(
                order =>
                    String(
                        order.status
                    ).toLowerCase() ===
                    String(
                        status
                    ).toLowerCase()
            );
    }


    result =
        result
            .slice()
            .sort(
                (
                    a,
                    b
                ) =>
                    new Date(
                        b.createdAt
                    ) -
                    new Date(
                        a.createdAt
                    )
            );


    const requestedLimit =
        Number(
            limit
        );


    if (
        Number.isFinite(
            requestedLimit
        ) &&
        requestedLimit >
        0
    ) {

        result =
            result.slice(
                0,
                Math.min(
                    Math.floor(
                        requestedLimit
                    ),
                    500
                )
            );
    }


    return result;
}


async function findOrder(
    identifier
) {

    const orders =
        await readOrders();


    return (
        orders.find(
            order =>
                sameIdentifier(
                    order,
                    identifier
                )
        ) ||
        null
    );
}


async function createOrder(
    normalizedOrder
) {

    return queuedWrite(
        async () => {

            const orders =
                await readOrders();


            // Network retries must not create duplicate orders.
            const duplicate =
                orders.find(
                    order =>
                        String(
                            order.cafeId
                        ) ===
                        String(
                            normalizedOrder.cafeId
                        )
                        &&
                        String(
                            order.orderNumber
                        ) ===
                        String(
                            normalizedOrder.orderNumber
                        )
                );


            if (
                duplicate
            ) {

                return {
                    order:
                        duplicate,

                    created:
                        false
                };
            }


            const now =
                new Date()
                    .toISOString();


            const order = {
                ...normalizedOrder,

                id:
                    generateId(),

                orderId:
                    undefined,

                createdAt:
                    normalizedOrder.createdAt ||
                    now,

                updatedAt:
                    now
            };


            orders.unshift(
                order
            );


            await atomicWrite(
                orders
            );


            return {
                order,
                created:
                    true
            };
        }
    );
}


async function updateOrder(
    identifier,
    patch
) {

    return queuedWrite(
        async () => {

            const orders =
                await readOrders();


            const index =
                orders.findIndex(
                    order =>
                        sameIdentifier(
                            order,
                            identifier
                        )
                );


            if (
                index ===
                -1
            ) {
                return null;
            }


            const current =
                orders[index];


            const updated = {
                ...current,
                ...patch,

                id:
                    current.id,

                orderNumber:
                    current.orderNumber,

                cafeId:
                    current.cafeId,

                createdAt:
                    current.createdAt,

                updatedAt:
                    new Date()
                        .toISOString()
            };


            orders[index] =
                updated;


            await atomicWrite(
                orders
            );


            return updated;
        }
    );
}


async function resetOrders() {

    return queuedWrite(
        async () => {

            await atomicWrite(
                []
            );


            return [];
        }
    );
}


module.exports = {
    ORDER_FILE,
    ensureStore,
    readOrders,
    listOrders,
    findOrder,
    createOrder,
    updateOrder,
    resetOrders
};
