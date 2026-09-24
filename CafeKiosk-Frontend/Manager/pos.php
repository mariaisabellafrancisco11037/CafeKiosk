<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>CafeKiosk - Manager POS</title>

    <link
        rel="stylesheet"
        href="../Assets/css/pos.css?v=8"
    >
<link rel="stylesheet" href="../Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=34">
  <link rel="stylesheet" href="../Assets/css/profile-menu.css?v=30">
  <link rel="stylesheet" href="../Assets/css/manager-sidebar-icons.css?v=2">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
  <link rel="stylesheet" href="/Assets/css/pos-navbar-fix.css?v=pos-navbar-v3">
</head>

<body class="uniform-pos manager-pos-page">

<div class="pos-container">

    <!-- =====================================================
         SIDEBAR
    ====================================================== -->

    <aside class="sidebar manager-sidebar manager-sidebar-icons">

        <div class="logo">
            <img
                src="../Assets/images/logo.png"
                alt="CafeKiosk Logo"
            >
        </div>

<div class="manager-sidebar-cafe-name" data-cafe-identity>Current Cafe</div>

        <nav class="staff-navigation" aria-label="Manager navigation">
<a href="/manager-dashboard" class="staff-nav-button" aria-label="Dashboard" title="Dashboard"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span><span class="manager-nav-label">Dashboard</span></a>
<a href="/manager-pos" class="staff-nav-button active" aria-current="page" aria-label="POS" title="POS"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg></span><span class="manager-nav-label">POS</span></a>
<a href="/manager-order-queue" class="staff-nav-button" aria-label="Order Queue" title="Order Queue"><span class="staff-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 5h14M5 12h14M5 19h14"/><circle cx="3" cy="5" r="1"/><circle cx="3" cy="12" r="1"/><circle cx="3" cy="19" r="1"/></svg></span><span class="manager-nav-label">Order Queue</span></a>
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

        <button type="button" class="staff-profile uniform-pos-profile uniform-profile-card" aria-label="Manager profile">
            <span class="uniform-profile-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                    <circle cx="12" cy="8" r="4"></circle>
                    <path d="M4 21c0-4 4-7 8-7s8 3 8 7"></path>
                </svg>
            </span>
            <span class="uniform-profile-copy">
                <strong class="uniform-profile-name">CafeKiosk Manager</strong>
                <small>Manager</small>
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
<script src="/Assets/js/pos.js?v=pos-no-category-title-v5"></script>

<script src="../Assets/js/menu-runtime-config.js"></script>
<script src="../Assets/js/discount-client.js?v=dynamic-promotions-v1"></script>
  <script src="../Assets/js/uniform-theme.js?v=pos-navbar-v2"></script>
  <script src="../Assets/js/profile-menu.js?v=logout-confirm-v2"></script>
  <script src="../Assets/js/live-presence.js?v=4"></script>
  <script src="../Assets/js/pos-search-autofill-guard.js?v=1"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>