// =====================================================
// CAFEKIOSK - ORDER-TYPE.JS
// Service Type Selection Logic
// =====================================================


// =====================================================
// SELECTED SERVICE TYPE
// =====================================================

let selectedService = null;
let isNavigatingToMenu = false;


// =====================================================
// SELECT SERVICE CARD
// =====================================================

function selectCard(element, type) {

    // -------------------------------------------------
    // VIBRATION FEEDBACK
    // -------------------------------------------------

    if (navigator.vibrate) {
        navigator.vibrate(50);
    }


    // -------------------------------------------------
    // REMOVE PREVIOUS SELECTION
    // -------------------------------------------------

    document
        .querySelectorAll(".option-card")
        .forEach(function (card) {

            card.classList.remove(
                "selected",
                "animate"
            );

        });


    // -------------------------------------------------
    // ADD SELECTED STYLE
    // -------------------------------------------------

    element.classList.add(
        "selected",
        "animate"
    );


    // -------------------------------------------------
    // REMOVE ANIMATION CLASS
    // -------------------------------------------------

    setTimeout(function () {

        element.classList.remove(
            "animate"
        );

    }, 250);


    // -------------------------------------------------
    // CONVERT VALUE TO DISPLAY NAME
    // -------------------------------------------------

    if (type === "dine-in") {

        selectedService =
            "Dine In";

    }

    else if (type === "take-out") {

        selectedService =
            "Take Out";

    }

    else {

        selectedService =
            type;

    }


    // -------------------------------------------------
    // DEBUG
    // -------------------------------------------------

    console.log(
        "Selected service type:",
        selectedService
    );

    // The service card itself is now the confirmation action.
    // A short delay lets the selected-state feedback remain visible.
    if (!isNavigatingToMenu) {
        setTimeout(function () {
            confirmSelection();
        }, 180);
    }

}


// =====================================================
// CONFIRM SERVICE TYPE
// =====================================================

function confirmSelection() {

    // -------------------------------------------------
    // VALIDATE SELECTION
    // -------------------------------------------------

    if (isNavigatingToMenu) {
        return;
    }

    if (!selectedService) {

        alert(
            "Please select a service type first."
        );

        return;

    }


    isNavigatingToMenu = true;

    // -------------------------------------------------
    // SAVE SERVICE TYPE
    // -------------------------------------------------

    // Save in localStorage because menu.js
    // reads serviceType from localStorage.

    localStorage.setItem(
        "serviceType",
        selectedService
    );


    // Also save in sessionStorage because
    // checkout.js supports sessionStorage.

    sessionStorage.setItem(
        "serviceType",
        selectedService
    );


    // -------------------------------------------------
    // VIBRATION FEEDBACK
    // -------------------------------------------------

    if (navigator.vibrate) {

        navigator.vibrate(30);

    }


    // -------------------------------------------------
    // DEBUG
    // -------------------------------------------------

    console.log(
        "======================================"
    );

    console.log(
        "☕ CafeKiosk - Service Type Confirmed"
    );

    console.log(
        "Service Type:",
        selectedService
    );

    console.log(
        "Opening menu..."
    );

    console.log(
        "======================================"
    );


    // -------------------------------------------------
    // GO TO MENU PAGE
    // -------------------------------------------------

    setTimeout(function () {

        window.location.href =
            window.CafeKioskTenant?.menu?.() || "/menu";

    }, 150);

}


// =====================================================
// BACK TO KIOSK HOME
// =====================================================

function goBackToKiosk() {

    if (navigator.vibrate) {

        navigator.vibrate(30);

    }


    // Clear service selection
    selectedService = null;


    localStorage.removeItem(
        "serviceType"
    );


    sessionStorage.removeItem(
        "serviceType"
    );


    // Return to kiosk welcome page
    window.location.href =
        window.CafeKioskTenant?.home?.() || "/";

}


// =====================================================
// PAGE INITIALIZATION
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        console.log(
            "☕ CafeKiosk service type page loaded."
        );


        // -------------------------------------------------
        // RESET PREVIOUS SELECTION VISUALLY
        // -------------------------------------------------

        document
            .querySelectorAll(".option-card")
            .forEach(function (card) {

                card.classList.remove(
                    "selected",
                    "animate"
                );

            });


        // -------------------------------------------------
        // CLEAR OLD SERVICE TYPE
        // -------------------------------------------------

        selectedService = null;
        isNavigatingToMenu = false;


        localStorage.removeItem(
            "serviceType"
        );


        sessionStorage.removeItem(
            "serviceType"
        );


        // -------------------------------------------------
        // MAKE SURE CAFE ID EXISTS
        // -------------------------------------------------

        if (
            !localStorage.getItem(
                "cafeId"
            )
        ) {

            localStorage.setItem(
                "cafeId",
                "cafe-1"
            );

        }


        console.log(
            "Cafe ID:",
            localStorage.getItem(
                "cafeId"
            )
        );

    }
);