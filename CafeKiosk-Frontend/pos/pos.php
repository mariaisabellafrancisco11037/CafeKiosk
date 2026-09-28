<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>CafeKiosk - POS</title>

    <link
        rel="stylesheet"
        href="../Assets/css/pos.css?v=20260928-ux-v1"
    >
<link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=20260928-mobile-v1">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
  <link rel="stylesheet" href="/Assets/css/pos-navbar-fix.css?v=20260928-portrait-v1">
  <link rel="stylesheet" href="/Assets/css/payment-modal.css?v=payment-modal-v1">
</head>

<body class="uniform-pos">

<div class="pos-container">

    <!-- =====================================================
         SIDEBAR
    ====================================================== -->

    <aside class="sidebar">

        <div class="logo">
            <img
                src="../Assets/images/logo.png"
                alt="CafeKiosk Logo"
            >
        </div>

        <div class="staff-label">
            STAFF
        </div>

        <nav class="staff-navigation" aria-label="Staff navigation">
<a href="/staff-dashboard" class="staff-nav-button"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span><span>Dashboard</span></a>
<a href="/pos" class="staff-nav-button active" aria-current="page"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg></span><span>Menu</span></a>
<a href="/order-queue" class="staff-nav-button"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5h14M5 12h14M5 19h14"/><circle cx="3" cy="5" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="19" r="1"/></svg></span><span>Order Queue</span></a>
</nav>

    </aside>


    <!-- =====================================================
         MENU
    ====================================================== -->

    <main class="menu-area">

        <!-- Category title/header removed to maximize menu item space. -->

        <!-- CATEGORY NAVIGATION -->
        <nav class="category-navigation" aria-label="Menu categories">

            <button
                type="button"
                class="category-button active"
                data-category="all"
            >
                <img src="../Assets/images/logo.png" alt="">
                <span>All Menu Items</span>
            </button>

            <button
                type="button"
                class="category-button"
                data-category="coffee"
            >
                <img src="../Assets/images/coffee.png" alt="">
                <span>Coffee</span>
            </button>

            <button
                type="button"
                class="category-button"
                data-category="non-coffee"
            >
                <img src="../Assets/images/non-coffee.png" alt="">
                <span>Non-Coffee</span>
            </button>

            <button
                type="button"
                class="category-button"
                data-category="milktea"
            >
                <img src="../Assets/images/milktea.png" alt="">
                <span>Milktea</span>
            </button>

            <button
                type="button"
                class="category-button"
                data-category="food"
            >
                <img src="../Assets/images/food.png" alt="">
                <span>Food</span>
            </button>

            <button
                type="button"
                class="category-button"
                data-category="snack"
            >
                <img src="../Assets/images/snack.png" alt="">
                <span>Snack</span>
            </button>

            <button
                type="button"
                class="category-button"
                data-category="dessert"
            >
                <img src="../Assets/images/dessert.png" alt="">
                <span>Dessert</span>
            </button>

        </nav>


        <div class="menu-search">

            <span class="search-icon">
                ⌕
            </span>

            <input
                type="text"
                id="menuSearch"
                name="cafekiosk_pos_menu_search"
                placeholder="Search menu items..."
                autocomplete="off"
                autocapitalize="none"
                autocorrect="off"
                spellcheck="false"
                readonly
            >

            <button
                type="button"
                id="clearSearch"
                class="clear-search"
                aria-label="Clear search"
            >
                ×
            </button>

        </div>


        <section
            id="menuGrid"
            class="menu-grid"
        ></section>

    </main>


    <!-- =====================================================
         ORDER SUMMARY
    ====================================================== -->

    <aside class="cart-panel">

        <button type="button" class="staff-profile uniform-pos-profile uniform-profile-card" aria-label="Staff profile">
            <span class="uniform-profile-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M4 21c0-4 4-7 8-7s8 3 8 7"></path>
                </svg>
            </span>
            <span class="uniform-profile-copy">
                <strong class="uniform-profile-name">Staff's Name</strong>
                <small>Staff</small>
            </span>
            <span class="uniform-profile-caret" aria-hidden="true">⌄</span>
        </button>

        <div class="order-heading">
            <h2 class="order-title">
                Order Summary
            </h2>

            <span
                id="cartItemCount"
                class="cart-item-count"
            >
                0 items
            </span>
        </div>


        <div
            id="cartList"
            class="cart-list"
        >

            <div class="empty-cart">
                No items added yet.
            </div>

        </div>


        <div class="order-bottom">

            <div class="summary-row">
                <span>Subtotal</span>
                <strong id="subtotal">
                    ₱0.00
                </strong>
            </div>


            <div class="summary-row">
                <span>Discount</span>
                <strong id="discountAmount">
                    -₱0.00
                </strong>
            </div>

            <div class="summary-row" id="taxRow" hidden>
                <span id="taxLabel">Tax</span>
                <strong id="taxAmount">₱0.00</strong>
            </div>

            <div class="summary-row" id="serviceChargeRow" hidden>
                <span id="serviceChargeLabel">Service Charge</span>
                <strong id="serviceChargeAmount">₱0.00</strong>
            </div>

            <div class="summary-row total-row">
                <span>Total</span>
                <strong id="total">
                    ₱0.00
                </strong>
            </div>


            <div class="bottom-fields pos-checkout-grid">

                <div class="checkout-control">
                    <label class="field-label" for="ckDiscountSelect">Discount</label>
                    <select id="ckDiscountSelect" class="checkout-field">
                        <option value="">No Discount</option>
                    </select>
                </div>

                <div class="checkout-control">
                    <label class="field-label" for="serviceType">Order Type</label>
                    <select id="serviceType" class="checkout-field">
                        <option value="Dine In">Dine In</option>
                        <option value="Takeout">Takeout</option>
                    </select>
                </div>


                <div class="checkout-control checkout-control-payment">
                    <label class="field-label" for="paymentSummaryButton">Payment Method</label>
                    <button type="button" id="paymentSummaryButton" class="ck-payment-summary-button" aria-haspopup="dialog" aria-controls="paymentModal">
                        <span id="paymentSummaryIcon" class="ck-payment-summary-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/></svg></span>
                        <span class="ck-payment-summary-copy">
                            <strong id="paymentSummaryMethod">Cash</strong>
                            <small id="paymentSummaryAmount">Tap to enter payment</small>
                        </span>
                        <span class="ck-payment-summary-arrow" aria-hidden="true">›</span>
                    </button>
                    <select id="paymentMethod" class="ck-payment-native-control" aria-hidden="true" tabindex="-1">
                        <option value="Cash">Cash</option>
                        <option value="GCash">GCash / Online Payment</option>
                        <option value="Card">Card</option>
                        <option value="Other">Other</option>
                    </select>
                    <input type="number" id="cashReceived" class="ck-payment-native-control" min="0" step="0.01" inputmode="decimal" autocomplete="off" aria-hidden="true" tabindex="-1">
                    <span id="paymentAmountLabel" class="ck-payment-native-control">Cash Received</span>
                    <div id="changeRow" class="ck-payment-native-control"><strong id="changeAmount">₱0.00</strong></div>
                </div>

            </div>


            <div class="order-actions">

                <button
                    type="button"
                    id="checkoutButton"
                    class="confirm-btn"
                >
                    Confirm Order
                </button>


                <button
                    type="button"
                    id="clearCartButton"
                    class="cancel-btn"
                >
                    Cancel
                </button>

            </div>

        </div>

    </aside>

</div>


<!-- =========================================================
     ITEM CUSTOMIZATION MODAL
========================================================= -->

<div
    id="itemModal"
    class="modal-overlay"
>

    <div class="item-modal">

        <button
            type="button"
            id="closeItemModal"
            class="modal-close"
        >
            ×
        </button>


        <div class="modal-product-header">

            <div class="modal-image">

                <img
                    id="modalProductImage"
                    src="../Assets/images/coffee.png"
                    alt=""
                >

            </div>


            <div class="modal-product-info">

                <h2>
                    Item Selection
                </h2>

                <h3 id="modalProductName">
                    Product
                </h3>

                <p id="modalProductDetails">
                    Coffee
                </p>

            </div>

        </div>


        <div class="modal-divider"></div>


        <div id="dynamicOptions"></div>

        <div class="ck-special-note-block">
            <label for="itemSpecialNote">Special Request <span>(Optional)</span></label>
            <textarea id="itemSpecialNote" maxlength="180" rows="3" placeholder="Example: Call the customer&apos;s name when the order is ready, less ice, separate sauce..."></textarea>
            <div class="ck-special-note-help"><span>Shown to the preparation team</span><span id="itemSpecialNoteCount">0/180</span></div>
        </div>

        <div class="modal-divider"></div>


        <div class="modal-bottom">

            <div class="quantity-section">

                <strong>
                    Quantity
                </strong>


                <div class="quantity-control">

                    <button
                        type="button"
                        id="qtyMinus"
                    >
                        −
                    </button>

                    <span id="qtyValue">
                        1
                    </span>

                    <button
                        type="button"
                        id="qtyPlus"
                    >
                        +
                    </button>

                </div>

            </div>


            <div
                id="modalTotal"
                class="modal-total"
            >
                ₱0.00
            </div>

        </div>


        <div class="modal-actions">

            <button
                type="button"
                id="cancelItemButton"
                class="cancel-button"
            >
                Cancel
            </button>


            <button
                type="button"
                id="addCartButton"
                class="add-cart-button"
            >
                Add to Cart
            </button>

        </div>

    </div>

</div>



<!-- PAYMENT MODAL -->
<div id="paymentModal" class="ck-payment-overlay" aria-hidden="true">
  <section class="ck-payment-modal" role="dialog" aria-modal="true" aria-labelledby="paymentModalTitle">
    <div class="ck-payment-modal-header">
      <div><h2 id="paymentModalTitle">Payment</h2><p>Choose a payment method and enter the amount received.</p></div>
      <button type="button" id="paymentModalClose" class="ck-payment-modal-close" aria-label="Close payment">×</button>
    </div>
    <div class="ck-payment-total-box"><span>Total Due</span><strong id="paymentModalTotal">₱0.00</strong></div>
    <div class="ck-payment-methods" role="group" aria-label="Payment method">
      <button type="button" class="ck-payment-method active" data-payment-method="Cash"><span class="ck-payment-method-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/></svg></span><span>Cash</span></button>
      <button type="button" class="ck-payment-method" data-payment-method="GCash"><span class="ck-payment-method-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M10 6h4M10 17.5h4"/><path d="M18.5 7.5c1.2.8 2 2.2 2 3.8s-.8 3-2 3.8"/></svg></span><span>GCash / Online</span></button>
      <button type="button" class="ck-payment-method" data-payment-method="Card"><span class="ck-payment-method-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 9.5h19M6 15h4"/></svg></span><span>Card</span></button>
      <button type="button" class="ck-payment-method" data-payment-method="Other"><span class="ck-payment-method-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="7" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="17" cy="12" r="2"/></svg></span><span>Other</span></button>
    </div>
    <div class="ck-payment-entry">
      <label id="paymentModalAmountLabel" for="paymentModalAmount">Cash Received</label>
      <div class="ck-payment-input-wrap"><span class="ck-payment-currency">₱</span><input id="paymentModalAmount" class="ck-payment-amount-input" type="number" min="0" step="0.01" inputmode="decimal" autocomplete="off" placeholder="0.00"></div>
      <div class="ck-payment-quick">
        <button type="button" data-payment-quick="exact">Exact</button>
        <button type="button" data-payment-quick="100">₱100</button>
        <button type="button" data-payment-quick="200">₱200</button>
        <button type="button" data-payment-quick="500">₱500</button>
        <button type="button" data-payment-quick="1000">₱1,000</button>
      </div>
      <div id="paymentModalChange" class="ck-payment-change"><span>Change</span><strong>₱0.00</strong></div>
      <p id="paymentModalHint" class="ck-payment-hint">Enter the cash handed to you by the customer.</p>
      <div id="paymentModalError" class="ck-payment-error" aria-live="polite"></div>
    </div>
    <div class="ck-payment-actions">
      <button type="button" id="paymentModalCancel" class="ck-payment-cancel">Cancel</button>
      <button type="button" id="paymentModalConfirm" class="ck-payment-confirm">Complete Payment</button>
    </div>
  </section>
</div>

<script src="../Assets/js/auth-session.js"></script>
<script src="/Assets/js/pos.js?v=20260928-settings-v1"></script>

<script src="../Assets/js/menu-runtime-config.js"></script>
<script src="../Assets/js/discount-client.js?v=dynamic-promotions-v1"></script>
  <script src="../Assets/js/uniform-theme.js?v=20260928-mobile-v1"></script>
  <script src="../Assets/js/profile-menu.js?v=logout-confirm-v2"></script>
  <script src="../Assets/js/live-presence.js?v=4"></script>
  <script src="../Assets/js/pos-search-autofill-guard.js?v=1"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>