// =====================================================
// CAFEKIOSK - KIOSK.JS
// Start / Welcome Page Logic
// =====================================================


// =====================================================
// START NEW ORDER
// =====================================================

async function startOrder() {

    if (window.CafeKioskTenant?.ready) {
        try { await window.CafeKioskTenant.ready; } catch (_) { return; }
    }

    // -------------------------------------------------
    // VIBRATION FEEDBACK
    // -------------------------------------------------

    // Gives a small vibration on supported tablets
    // when the customer taps START ORDER.

    if (navigator.vibrate) {
        navigator.vibrate(50);
    }


    // -------------------------------------------------
    // CLEAR PREVIOUS CUSTOMER DATA
    // -------------------------------------------------

    // These values may have been created by the
    // previous customer's order.
    //
    // We remove them so every customer starts
    // with a completely fresh order.

    const orderKeysToRemove = [

        "cafeKioskOrder",

        "order",

        "cart",

        "orderCart",

        "serviceType",

        "orderType",

        "paymentMethod",

        "currentOrderNumber",

        "selectedCategory",

        "selectedItem",

        "customization",

        "currentOrder",

        "backendOrder"

    ];


    // -------------------------------------------------
    // CLEAR SESSION STORAGE
    // -------------------------------------------------

    orderKeysToRemove.forEach(function (key) {

        sessionStorage.removeItem(key);

    });


    // -------------------------------------------------
    // CLEAR LOCAL STORAGE ORDER DATA
    // -------------------------------------------------

    orderKeysToRemove.forEach(function (key) {

        localStorage.removeItem(key);

    });


    // -------------------------------------------------
    // SET DEFAULT CAFE ID
    // -------------------------------------------------

    // This identifies which café/kiosk is sending
    // the order to the backend.
    //
    // DO NOT remove cafeId when starting a new order.

    const existingCafeId =
        localStorage.getItem("cafeId");


    if (!existingCafeId) {

        localStorage.setItem(
            "cafeId",
            "cafe-1"
        );

    }


    // -------------------------------------------------
    // OPTIONAL CONSOLE INFORMATION
    // -------------------------------------------------

    console.log(
        "======================================"
    );

    console.log(
        "☕ CafeKiosk - Starting New Order"
    );

    console.log(
        "Cafe ID:",
        localStorage.getItem("cafeId")
    );

    console.log(
        "Previous order data cleared."
    );

    console.log(
        "Opening service type page..."
    );

    console.log(
        "======================================"
    );


    // -------------------------------------------------
    // GO TO ORDER TYPE PAGE
    // -------------------------------------------------

    // Express server route:
    //
    // /order-type
    //
    // This is better than:
    //
    // order-type.php
    //
    // because the tablet is accessing the kiosk
    // through your Node.js / Express server.

    window.location.href =
        window.CafeKioskTenant?.orderType?.() || "/order-type";

}


// =====================================================
// PAGE INITIALIZATION
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "☕ CafeKiosk welcome page loaded."
        );


        // ---------------------------------------------
        // MAKE SURE CAFE ID EXISTS
        // ---------------------------------------------

        if (!localStorage.getItem("cafeId") && !window.CafeKioskTenant?.slug) {

            localStorage.setItem(
                "cafeId",
                "cafe-1"
            );

        }


        console.log(
            "Cafe ID:",
            localStorage.getItem("cafeId")
        );

    }
);