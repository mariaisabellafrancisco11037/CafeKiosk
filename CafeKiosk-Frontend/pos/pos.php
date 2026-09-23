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
        href="../Assets/css/pos.css?v=7"
    >
<link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=34">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
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
<a href="/staff-dashboard" class="staff-nav-button"><span class="staff-nav-icon" aria-hidden="true">▦</span><span>Dashboard</span></a>
<a href="/pos" class="staff-nav-button active" aria-current="page"><span class="staff-nav-icon" aria-hidden="true">☕</span><span>Menu</span></a>
<a href="/order-queue" class="staff-nav-button"><span class="staff-nav-icon" aria-hidden="true">☷</span><span>Order Queue</span></a>
</nav>

    </aside>


    <!-- =====================================================
         MENU
    ====================================================== -->

    <main class="menu-area">

        <div class="category-header">

            <img
                id="categoryIcon"
                src="../Assets/images/coffee.png"
                alt=""
            >

            <h1 id="categoryTitle">
                Coffees
            </h1>

        </div>


        <!-- CATEGORY NAVIGATION -->
        <nav class="category-navigation" aria-label="Menu categories">

            <button
                type="button"
                class="category-button active"
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

                <div class="checkout-control">
                    <label class="field-label" for="paymentMethod">Payment Type</label>
                    <select id="paymentMethod" class="checkout-field">
                        <option value="Cash">Cash</option>
                        <option value="GCash">GCash / Online Payment</option>
                        <option value="Card">Card</option>
                    </select>
                </div>

                <div id="paymentEntryFields" class="checkout-control payment-entry-group">
                    <label class="field-label" for="cashReceived" id="paymentAmountLabel">Cash Received</label>
                    <input
                        type="number"
                        id="cashReceived"
                        class="checkout-field"
                        placeholder="₱0.00"
                        min="0"
                        step="0.01"
                        inputmode="decimal"
                        autocomplete="off"
                    >
                    <div class="change-row" id="changeRow">
                        <span>Change</span>
                        <strong id="changeAmount">₱0.00</strong>
                    </div>
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


<script src="../Assets/js/auth-session.js"></script>
<script src="/Assets/js/pos.js?v=payment-amount-v3"></script>

<script src="../Assets/js/menu-runtime-config.js"></script>
<script src="../Assets/js/discount-client.js?v=dynamic-promotions-v1"></script>
  <script src="../Assets/js/uniform-theme.js?v=33"></script>
  <script src="../Assets/js/profile-menu.js?v=31"></script>
  <script src="../Assets/js/live-presence.js?v=4"></script>
  <script src="../Assets/js/pos-search-autofill-guard.js?v=1"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>