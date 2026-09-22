/* =========================================================
   CAFE KIOSK - DIGITAL RECEIPT
   ========================================================= */


/* ---------------------------------------------------------
   GET ORDER DATA
   --------------------------------------------------------- */

function getOrderData() {

    const savedOrder =
        sessionStorage.getItem("cafeKioskOrder") ||
        localStorage.getItem("order") ||
        sessionStorage.getItem("order") ||
        localStorage.getItem("cafeKioskOrder");


    if (!savedOrder) {

        return [];

    }


    try {

        const parsedOrder =
            JSON.parse(savedOrder);


        // -------------------------------------------------
        // DIRECT ARRAY
        // -------------------------------------------------

        if (
            Array.isArray(parsedOrder)
        ) {

            return parsedOrder;

        }


        // -------------------------------------------------
        // OBJECT WITH ITEMS
        // -------------------------------------------------

        if (
            parsedOrder &&
            Array.isArray(
                parsedOrder.items
            )
        ) {

            return parsedOrder.items;

        }


        // -------------------------------------------------
        // OBJECT WITH CART
        // -------------------------------------------------

        if (
            parsedOrder &&
            Array.isArray(
                parsedOrder.cart
            )
        ) {

            return parsedOrder.cart;

        }


        // -------------------------------------------------
        // OBJECT WITH ORDER
        // -------------------------------------------------

        if (
            parsedOrder &&
            Array.isArray(
                parsedOrder.order
            )
        ) {

            return parsedOrder.order;

        }


        return [];


    } catch (error) {

        console.error(
            "Unable to read saved order:",
            error
        );

        return [];

    }

}


/* ---------------------------------------------------------
   SERVICE TYPE
   --------------------------------------------------------- */

function getServiceType() {

    return (

        sessionStorage.getItem(
            "serviceType"
        ) ||

        localStorage.getItem(
            "serviceType"
        ) ||

        sessionStorage.getItem(
            "orderType"
        ) ||

        localStorage.getItem(
            "orderType"
        ) ||

        "Dine In"

    );

}


/* ---------------------------------------------------------
   PAYMENT METHOD
   --------------------------------------------------------- */

function getPaymentMethod() {

    return (

        sessionStorage.getItem(
            "paymentMethod"
        ) ||

        localStorage.getItem(
            "paymentMethod"
        ) ||

        "Cash"

    );

}


function getSavedPaymentAmounts() {

    let backendOrder = null;

    try {
        backendOrder = JSON.parse(
            sessionStorage.getItem(
                "backendOrder"
            ) ||
            "null"
        );
    } catch (_) {
        backendOrder = null;
    }

    const cashReceived = Number(
        backendOrder?.cashReceived ??
        backendOrder?.cash_received ??
        sessionStorage.getItem(
            "cashReceived"
        ) ??
        0
    ) || 0;

    const change = Number(
        backendOrder?.change ??
        backendOrder?.changeAmount ??
        backendOrder?.change_amount ??
        sessionStorage.getItem(
            "changeAmount"
        ) ??
        0
    ) || 0;

    return {
        cashReceived:
            Math.max(0, cashReceived),
        change:
            Math.max(0, change)
    };

}


/* ---------------------------------------------------------
   ORDER NUMBER
   --------------------------------------------------------- */

function getOrderNumber() {

    /*
       menu.js already generates the order number and saves:

       sessionStorage.setItem(
           "orderNumber",
           orderPayload.orderNumber
       );

       Therefore the checkout receipt should display
       THAT SAME order number.
    */


    // -------------------------------------------------
    // FIRST: ORDER NUMBER SAVED BY MENU.JS
    // -------------------------------------------------

    let orderNumber =
        sessionStorage.getItem(
            "orderNumber"
        );


    if (orderNumber) {

        return orderNumber;

    }


    // -------------------------------------------------
    // SECOND: BACKEND ORDER NUMBER
    // -------------------------------------------------

    const savedBackendOrder =
        sessionStorage.getItem(
            "backendOrder"
        );


    if (savedBackendOrder) {

        try {

            const backendOrder =
                JSON.parse(
                    savedBackendOrder
                );


            if (
                backendOrder &&
                backendOrder.orderNumber
            ) {

                orderNumber =
                    backendOrder.orderNumber;


                sessionStorage.setItem(
                    "orderNumber",
                    orderNumber
                );


                return orderNumber;

            }

        } catch (error) {

            console.error(
                "Unable to read backend order:",
                error
            );

        }

    }


    // -------------------------------------------------
    // FALLBACK ORDER NUMBER
    // -------------------------------------------------

    orderNumber =
        sessionStorage.getItem(
            "currentOrderNumber"
        );


    if (!orderNumber) {

        const randomNumber =
            Math.floor(
                1000 +
                Math.random() * 9000
            );


        orderNumber =
            `#${randomNumber}`;


        sessionStorage.setItem(
            "currentOrderNumber",
            orderNumber
        );

    }


    return orderNumber;

}


/* ---------------------------------------------------------
   DATE AND TIME
   --------------------------------------------------------- */

function displayDateTime() {

    const now =
        new Date();


    const dateElement =
        document.getElementById(
            "orderDate"
        );


    const timeElement =
        document.getElementById(
            "orderTime"
        );


    // -------------------------------------------------
    // DATE
    // -------------------------------------------------

    if (dateElement) {

        dateElement.textContent =
            now.toLocaleDateString(
                "en-PH",
                {
                    year:
                        "numeric",

                    month:
                        "long",

                    day:
                        "numeric"
                }
            );

    }


    // -------------------------------------------------
    // TIME
    // -------------------------------------------------

    if (timeElement) {

        timeElement.textContent =
            now.toLocaleTimeString(
                "en-PH",
                {
                    hour:
                        "numeric",

                    minute:
                        "2-digit",

                    hour12:
                        true
                }
            );

    }

}


/* ---------------------------------------------------------
   CURRENCY
   --------------------------------------------------------- */

function formatCurrency(amount) {

    return new Intl.NumberFormat(
        "en-PH",
        {

            style:
                "currency",

            currency:
                "PHP"

        }
    ).format(
        Number(amount) || 0
    );

}


/* ---------------------------------------------------------
   ESCAPE HTML
   --------------------------------------------------------- */

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================================
   CUSTOMIZATION HANDLER
   ========================================================= */

/*
   This function converts the customization information
   saved by menu.js into readable receipt text.

   Example:

   Temperature: Iced
   Size: Grande
   Milk: Oat
   Add-ons: Extra shot
*/

function getCustomizationText(item) {

    const customizationParts = [];


    /* -----------------------------------------------------
       SIZE
       ----------------------------------------------------- */

    const size =

        item.size ||

        item.cupSize ||

        item.selectedSize ||

        item.customization?.size ||

        item.customization?.cupSize;


    if (size) {

        customizationParts.push(
            `Size: ${size}`
        );

    }


    /* -----------------------------------------------------
       MILK
       ----------------------------------------------------- */

    const milk =

        item.milk ||

        item.milkType ||

        item.selectedMilk ||

        item.customization?.milk ||

        item.customization?.milkType;


    if (milk) {

        customizationParts.push(
            `Milk: ${milk}`
        );

    }


    /* -----------------------------------------------------
       SUGAR
       ----------------------------------------------------- */

    const sugar =

        item.sugar ||

        item.sugarLevel ||

        item.sugarPercentage ||

        item.selectedSugar ||

        item.customization?.sugar ||

        item.customization?.sugarLevel ||

        item.customization?.sugarPercentage;


    if (
        sugar !== undefined &&
        sugar !== null &&
        sugar !== ""
    ) {

        customizationParts.push(
            `Sugar: ${sugar}`
        );

    }


    /* -----------------------------------------------------
       ICE
       ----------------------------------------------------- */

    const ice =

        item.ice ||

        item.iceLevel ||

        item.customization?.ice ||

        item.customization?.iceLevel;


    if (ice) {

        customizationParts.push(
            `Ice: ${ice}`
        );

    }


    /* -----------------------------------------------------
       ADD-ONS
       ----------------------------------------------------- */

    let addOns =

        item.addOns ||

        item.addons ||

        item.addOn ||

        item.customization?.addOns ||

        item.customization?.addons ||

        item.customization?.addOn;


    // -------------------------------------------------
    // ADD-ON ARRAY
    // -------------------------------------------------

    if (
        Array.isArray(addOns)
    ) {

        addOns.forEach(
            addOn => {

                if (
                    typeof addOn ===
                    "string"
                ) {

                    customizationParts.push(
                        `Add-on: ${addOn}`
                    );

                }

                else if (
                    typeof addOn ===
                    "object"
                ) {

                    const addOnName =

                        addOn.name ||

                        addOn.item ||

                        addOn.title ||

                        "Add-on";


                    const addOnQuantity =

                        addOn.quantity ||

                        addOn.qty ||

                        1;


                    if (
                        addOnQuantity > 1
                    ) {

                        customizationParts.push(
                            `Add-on: ${addOnName} x${addOnQuantity}`
                        );

                    } else {

                        customizationParts.push(
                            `Add-on: ${addOnName}`
                        );

                    }

                }

            }
        );

    }


    // -------------------------------------------------
    // ADD-ON STRING
    // -------------------------------------------------

    else if (
        typeof addOns ===
        "string"
    ) {

        customizationParts.push(
            `Add-on: ${addOns}`
        );

    }


    /* -----------------------------------------------------
       CUSTOMIZATIONS ARRAY FROM MENU.JS
       ----------------------------------------------------- */

    if (
        Array.isArray(
            item.customizations
        )
    ) {

        item.customizations.forEach(
            customization => {

                if (
                    customization &&
                    customization.trim() !== ""
                ) {

                    customizationParts.push(
                        customization
                    );

                }

            }
        );

    }


    /* -----------------------------------------------------
       CUSTOMIZATION AS STRING
       ----------------------------------------------------- */

    if (
        typeof item.customization ===
            "string" &&

        item.customization.trim() !==
            ""
    ) {

        customizationParts.push(
            item.customization
        );

    }


    /* -----------------------------------------------------
       CUSTOMIZATION OBJECT
       ----------------------------------------------------- */

    if (
        item.customization &&

        typeof item.customization ===
            "object" &&

        !Array.isArray(
            item.customization
        )
    ) {

        const custom =
            item.customization;


        // -------------------------------------------------
        // NOTE
        // -------------------------------------------------

        if (
            custom.note &&

            !customizationParts.includes(
                `Note: ${custom.note}`
            )
        ) {

            customizationParts.push(
                `Note: ${custom.note}`
            );

        }


        // -------------------------------------------------
        // NOTES
        // -------------------------------------------------

        if (
            custom.notes &&

            !customizationParts.includes(
                `Note: ${custom.notes}`
            )
        ) {

            customizationParts.push(
                `Note: ${custom.notes}`
            );

        }

    }


    /* -----------------------------------------------------
       RETURN RESULT
       ----------------------------------------------------- */

    if (
        customizationParts.length === 0
    ) {

        return "Regular";

    }


    return customizationParts.join(
        " • "
    );

}


/* =========================================================
   GET ITEM NAME
   ========================================================= */

function getItemName(item) {

    return (

        item.name ||

        item.productName ||

        item.product ||

        item.title ||

        item.itemName ||

        "Unnamed Product"

    );

}


/* =========================================================
   GET ITEM PRICE
   ========================================================= */

function getItemPrice(item) {

    const price =

        item.price ??

        item.unitPrice ??

        item.productPrice ??

        item.basePrice ??

        0;


    return Number(price) || 0;

}


/* =========================================================
   GET ITEM QUANTITY
   ========================================================= */

function getItemQuantity(item) {

    /*
       menu.js now sends both:

       qty
       quantity

       so checkout.js supports both.
    */

    const quantity =

        item.quantity ??

        item.qty ??

        item.amount ??

        1;


    const parsedQuantity =
        Number(quantity);


    return parsedQuantity > 0
        ? parsedQuantity
        : 1;

}


/* =========================================================
   GET ITEM IMAGE
   ========================================================= */

function getItemImage(item) {

    /*
       First use an explicitly saved product image.

       If one does not exist, use the category image.
    */


    if (
        item.image ||
        item.imageUrl ||
        item.img ||
        item.photo ||
        item.productImage
    ) {

        return (

            item.image ||

            item.imageUrl ||

            item.img ||

            item.photo ||

            item.productImage

        );

    }


    // -------------------------------------------------
    // CATEGORY IMAGE
    // -------------------------------------------------

    if (item.category) {

        return (
            `../Assets/images/${item.category}.png`
        );

    }


    // -------------------------------------------------
    // FALLBACK
    // -------------------------------------------------

    return (
        "../Assets/images/coffee.png"
    );

}

/* =========================================================
   GET ADD-ON PRICE
   ========================================================= */

function getAddOnPrice(item) {

    let total = 0;


    let addOns =

        item.addOns ||

        item.addons ||

        item.addOn ||

        item.customization?.addOns ||

        item.customization?.addons ||

        item.customization?.addOn;


    if (
        Array.isArray(addOns)
    ) {

        addOns.forEach(
            addOn => {

                if (
                    typeof addOn ===
                    "object"
                ) {

                    const price =
                        Number(
                            addOn.price ??
                            addOn.amount ??
                            0
                        );


                    const quantity =
                        Number(
                            addOn.quantity ??
                            addOn.qty ??
                            1
                        );


                    total +=
                        price *
                        quantity;

                }

            }
        );

    }


    return total;

}


/* =========================================================
   CALCULATE ITEM TOTAL
   ========================================================= */

function calculateItemTotal(item) {

    /*
       If menu.js already calculated a total,
       use it.
    */

    if (
        item.total !== undefined &&
        item.total !== null &&
        !isNaN(
            Number(item.total)
        )
    ) {

        return Number(
            item.total
        );

    }


    if (
        item.itemTotal !== undefined &&
        item.itemTotal !== null &&
        !isNaN(
            Number(item.itemTotal)
        )
    ) {

        return Number(
            item.itemTotal
        );

    }


    if (
        item.subtotal !== undefined &&
        item.subtotal !== null &&
        !isNaN(
            Number(item.subtotal)
        )
    ) {

        return Number(
            item.subtotal
        );

    }


    /*
       Otherwise calculate:

       (base price + customization cost + add-ons)
       × quantity
    */


    const price =
        getItemPrice(item);


    const quantity =
        getItemQuantity(item);


    const addOnPrice =
        getAddOnPrice(item);


    const customizationCost =
        Number(

            item.customizationCost ??

            item.customizationPrice ??

            0

        );


    return (

        price +
        addOnPrice +
        customizationCost

    ) * quantity;

}


/* =========================================================
   DISPLAY ORDER ITEMS
   ========================================================= */

function displayOrderItems() {

    const container =
        document.getElementById(
            "receiptItems"
        );


    if (!container) {

        console.error(
            "receiptItems container was not found."
        );

        return;

    }


    const order =
        getOrderData();


    /* -----------------------------------------------------
       EMPTY ORDER
       ----------------------------------------------------- */

    if (
        !order ||
        order.length === 0
    ) {

        container.innerHTML = `
            <div class="receipt-empty">
                <p>
                    No items found in this order.
                </p>
            </div>
        `;


        updateTotals([]);


        return;

    }


    /* -----------------------------------------------------
       CREATE RECEIPT ITEMS
       ----------------------------------------------------- */

    container.innerHTML = "";


    order.forEach(
        (item, index) => {

            const name =
                getItemName(item);


            const quantity =
                getItemQuantity(item);


            const image =
                getItemImage(item);


            const customization =
                getCustomizationText(item);


            const itemTotal =
                calculateItemTotal(item);


            const receiptItem =
                document.createElement(
                    "div"
                );


            receiptItem.className =
                "receipt-item";


            receiptItem.innerHTML = `
                <div class="item-image">

                    <img
                        src="${escapeHTML(image)}"
                        alt="${escapeHTML(name)}"

                        onerror="
                            this.onerror = null;
                            this.src='../Assets/images/coffee.png';
                        "
                    >

                </div>


                <div class="item-details">

                    <div class="item-name">
                        ${escapeHTML(name)}
                    </div>


                    <div class="item-customization">
                        ${escapeHTML(customization)}
                    </div>


                    <div class="item-quantity">
                        Quantity: ${quantity}
                    </div>

                </div>


                <div class="item-price">
                    ${formatCurrency(itemTotal)}
                </div>

            `;


            container.appendChild(
                receiptItem
            );

        }
    );


    /* -----------------------------------------------------
       UPDATE TOTALS
       ----------------------------------------------------- */

    updateTotals(order);

}


/* =========================================================
   UPDATE TOTALS
   ========================================================= */

function updateTotals(order) {

    let subtotal = 0;

    let totalQuantity = 0;


    order.forEach(
        item => {

            subtotal +=
                calculateItemTotal(
                    item
                );


            totalQuantity +=
                getItemQuantity(
                    item
                );

        }
    );


    /*
       Discount

       Currently zero because your current
       CafeKiosk does not yet have an actual
       discount system.
    */

    const discount = 0;


    const total =
        subtotal -
        discount;


    /* -----------------------------------------------------
       UPDATE SUBTOTAL
       ----------------------------------------------------- */

    const subtotalElement =
        document.getElementById(
            "subtotal"
        );


    if (subtotalElement) {

        subtotalElement.textContent =
            formatCurrency(
                subtotal
            );

    }


    /* -----------------------------------------------------
       UPDATE DISCOUNT
       ----------------------------------------------------- */

    const discountElement =
        document.getElementById(
            "discount"
        );


    if (discountElement) {

        discountElement.textContent =
            formatCurrency(
                discount
            );

    }


    /* -----------------------------------------------------
       UPDATE TOTAL
       ----------------------------------------------------- */

    const totalElement =
        document.getElementById(
            "total"
        );


    if (totalElement) {

        totalElement.textContent =
            formatCurrency(
                total
            );

    }


    /* -----------------------------------------------------
       UPDATE ITEM COUNT
       ----------------------------------------------------- */

    const itemCountElement =
        document.getElementById(
            "itemCount"
        );


    if (itemCountElement) {

        itemCountElement.textContent =

            totalQuantity === 1

                ? "1 item"

                : `${totalQuantity} items`;

    }

}

/* =========================================================
   BACKEND CONNECTION
   ========================================================= */

const CAFE_ID =
    localStorage.getItem("cafeId") ||
    "cafe-1";


function resolveBackendOrigin() {
  // LAN-safe rule: when the page is opened through HTTP/HTTPS, always use
  // the exact hostname the browser used (localhost on laptop, LAN IP on tablet).
  // This avoids stale localStorage IP overrides after Wi-Fi/hotspot changes.
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    if (window.location.port === "5000") return window.location.origin;
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
  if (saved) return saved.replace(/\/$/, "");
  return "http://127.0.0.1:5000";
}


const API_URL =
    resolveBackendOrigin();


function getSavedBackendOrder() {

    const raw =
        sessionStorage.getItem(
            "backendOrder"
        );


    if (!raw) {

        return null;

    }


    try {

        return JSON.parse(
            raw
        );

    } catch (
        error
    ) {

        console.warn(
            "Unable to read backendOrder:",
            error
        );


        return null;

    }

}


function getReceiptSubtotal(
    order
) {

    return order.reduce(
        (
            total,
            item
        ) =>
            total +
            calculateItemTotal(
                item
            ),
        0
    );

}


function buildKioskOrderPayload() {

    const items =
        getOrderData();


    const subtotal =
        getReceiptSubtotal(
            items
        );


    return {

        cafeId:
            CAFE_ID,

        source:
            "Kiosk",

        orderNumber:
            getOrderNumber(),

        customerName:
            "Kiosk Customer",

        serviceType:
            getServiceType(),

        paymentMethod:
            getPaymentMethod(),

        subtotal,

        discountAmount:
            0,

        total:
            subtotal,

        status:
            "Pending",

        createdAt:
            new Date()
                .toISOString(),

        items:
            items.map(
                item => {

                    const quantity =
                        getItemQuantity(
                            item
                        );


                    const price =
                        getItemPrice(
                            item
                        );


                    const itemTotal =
                        calculateItemTotal(
                            item
                        );


                    const customizationText =
                        getCustomizationText(
                            item
                        );


                    return {

                        productId:
                            item.productId ||
                            item.id ||
                            null,

                        name:
                            getItemName(
                                item
                            ),

                        category:
                            item.category ||
                            "",

                        price,

                        customizationCost:
                            Number(
                                item.customizationCost ??
                                item.customizationPrice ??
                                0
                            ),

                        customizations:
                            Array.isArray(
                                item.customizations
                            )
                                ? item.customizations
                                : (
                                    customizationText === "Regular"
                                        ? []
                                        : [
                                            customizationText
                                        ]
                                ),

                        quantity,

                        qty:
                            quantity,

                        subtotal:
                            itemTotal

                    };

                }
            )

    };

}


async function ensureKioskOrderSaved() {

    /*
        menu.js may already have submitted the order.

        If backendOrder exists, checkout.js does NOT create
        another order.

        If backendOrder is missing, checkout.js submits the
        current Kiosk order as a safe fallback.
    */

    const alreadySaved =
        getSavedBackendOrder();


    if (
        alreadySaved &&
        (
            alreadySaved.id ||
            alreadySaved.orderNumber
        )
    ) {

        console.log(
            "✅ Kiosk order was already saved by menu.js:",
            alreadySaved
        );


        return {
            success:
                true,

            alreadySaved:
                true,

            order:
                alreadySaved
        };

    }


    const orderPayload =
        buildKioskOrderPayload();


    if (
        !Array.isArray(
            orderPayload.items
        ) ||
        orderPayload.items.length ===
            0
    ) {

        throw new Error(
            "There are no Kiosk items to send."
        );

    }


    console.log(
        "📤 Sending Kiosk order:",
        orderPayload
    );


    const response =
        await fetch(
            `${API_URL}/api/orders`,
            {

                method:
                    "POST",

                headers: {

                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"

                },

                credentials:
                    "include",

                body:
                    JSON.stringify(
                        orderPayload
                    )

            }
        );


    let data =
        {};


    try {

        data =
            await response.json();

    } catch (
        parseError
    ) {

        console.warn(
            "Kiosk API response was not JSON.",
            parseError
        );

    }


    if (
        !response.ok
    ) {

        const validationErrors =
            Array.isArray(
                data.errors
            )
                ? data.errors.join(
                    ", "
                )
                : "";


        throw new Error(
            validationErrors ||
            data.message ||
            `Server returned HTTP ${response.status}`
        );

    }


    if (
        data.order
    ) {

        sessionStorage.setItem(
            "backendOrder",
            JSON.stringify(
                data.order
            )
        );


        if (
            data.order.orderNumber
        ) {

            sessionStorage.setItem(
                "orderNumber",
                data.order.orderNumber
            );

        }

    }


    console.log(
        "✅ Kiosk order successfully saved:",
        data.order ||
        data
    );


    return data;

}


/* =========================================================
   FINISH ORDER
   ========================================================= */

async function finishOrder() {

    const finishButton =
        document.getElementById(
            "finishButton"
        );


    const resetOverlay =
        document.getElementById(
            "resetOverlay"
        );


    /* -----------------------------------------------------
       PREVENT DOUBLE CLICK
       ----------------------------------------------------- */

    if (finishButton) {

        finishButton.disabled =
            true;


        finishButton.textContent =
            "Starting New Order...";

    }


    /* -----------------------------------------------------
       SHOW RESET OVERLAY
       ----------------------------------------------------- */

    if (resetOverlay) {

        resetOverlay.classList.add(
            "show"
        );

    }


    /* -----------------------------------------------------
       CLEAR ORDER AND RETURN TO START
       ----------------------------------------------------- */

    try {

        await ensureKioskOrderSaved();


        setTimeout(
            () => {

                clearCurrentOrder();


                window.location.replace(
                    window.CafeKioskTenant?.home?.() || "/"
                );

            },
            1000
        );


    } catch (
        error
    ) {

        console.error(
            "❌ KIOSK ORDER FAILED:",
            error
        );


        if (
            finishButton
        ) {

            finishButton.disabled =
                false;

            finishButton.textContent =
                "Finish";

        }


        if (
            resetOverlay
        ) {

            resetOverlay.classList.remove(
                "show"
            );

        }


        alert(
            `The order could not be sent to the server.\n\n${error.message}`
        );

    }

}

/* =========================================================
   CLEAR CURRENT ORDER
   ========================================================= */

function clearCurrentOrder() {

    /*
       These values belong to the current customer/order.

       cafeId is intentionally NOT removed because the kiosk
       still belongs to the same cafe after the order finishes.
    */

    const keysToRemove = [

        "cafeKioskOrder",

        "order",

        "serviceType",

        "orderType",

        "paymentMethod",

        "cashReceived",

        "changeAmount",

        "orderNumber",

        "currentOrderNumber",

        "backendOrder",

        "selectedCategory",

        "selectedItem",

        "customization",

        "cart",

        "orderCart",

        "currentOrder"

    ];


    keysToRemove.forEach(
        key => {

            sessionStorage.removeItem(
                key
            );


            localStorage.removeItem(
                key
            );

        }
    );


    console.log(
        "Current order data cleared."
    );

}


/* =========================================================
   INITIALIZE RECEIPT
   ========================================================= */

function initializeReceipt() {

    console.log(
        "======================================"
    );


    console.log(
        "☕ CafeKiosk Digital Receipt Initialized"
    );


    /* -----------------------------------------------------
       ORDER NUMBER
       ----------------------------------------------------- */

    const orderNumberElement =
        document.getElementById(
            "orderNumber"
        );


    if (orderNumberElement) {

        orderNumberElement.textContent =
            getOrderNumber();

    }


    /* -----------------------------------------------------
       SERVICE TYPE
       ----------------------------------------------------- */

    const serviceTypeElement =
        document.getElementById(
            "serviceType"
        );


    if (serviceTypeElement) {

        serviceTypeElement.textContent =
            getServiceType();

    }


    /* -----------------------------------------------------
       PAYMENT METHOD
       ----------------------------------------------------- */

    const paymentMethodElement =
        document.getElementById(
            "paymentMethod"
        );


    if (paymentMethodElement) {

        paymentMethodElement.textContent =
            getPaymentMethod();

    }

    const paymentMethod =
        getPaymentMethod();

    const paymentAmounts =
        getSavedPaymentAmounts();

    const isCashPayment =
        String(paymentMethod)
            .toLowerCase() ===
        "cash";

    const cashReceivedCard =
        document.getElementById(
            "cashReceivedCard"
        );

    const changeCard =
        document.getElementById(
            "changeCard"
        );

    const cashReceivedElement =
        document.getElementById(
            "receiptCashReceived"
        );

    const changeElement =
        document.getElementById(
            "receiptChange"
        );

    if (cashReceivedCard) {
        cashReceivedCard.hidden =
            !isCashPayment;
    }

    if (changeCard) {
        changeCard.hidden =
            !isCashPayment;
    }

    if (cashReceivedElement) {
        cashReceivedElement.textContent =
            formatCurrency(
                paymentAmounts.cashReceived
            );
    }

    if (changeElement) {
        changeElement.textContent =
            formatCurrency(
                paymentAmounts.change
            );
    }


    /* -----------------------------------------------------
       DATE / TIME
       ----------------------------------------------------- */

    displayDateTime();


    /* -----------------------------------------------------
       DISPLAY ACTUAL ORDER
       ----------------------------------------------------- */

    displayOrderItems();


    /* -----------------------------------------------------
       FINISH BUTTON
       ----------------------------------------------------- */

    const finishButton =
        document.getElementById(
            "finishButton"
        );


    if (finishButton) {

        finishButton.addEventListener(
            "click",
            finishOrder
        );

    }


    /* -----------------------------------------------------
       DEBUG
       ----------------------------------------------------- */

    console.log(
        "Order Number:",
        getOrderNumber()
    );


    console.log(
        "Service Type:",
        getServiceType()
    );


    console.log(
        "Payment Method:",
        getPaymentMethod()
    );


    console.log(
        "Items:",
        getOrderData()
    );


    console.log(
        "======================================"
    );

}


/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeReceipt
    );

} else {

    initializeReceipt();

}