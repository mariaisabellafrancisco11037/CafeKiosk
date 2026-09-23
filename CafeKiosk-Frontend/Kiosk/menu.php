<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>CafeKiosk - Menu</title>

  <link rel="stylesheet" href="/Assets/css/menu.css?v=8">
<link rel="stylesheet" href="/Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="/Assets/css/uniform-theme.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>

<body class="uniform-kiosk kiosk-menu">

<div class="container">

  <!-- =====================================================
       SIDEBAR
       ===================================================== -->
  <aside class="sidebar">

    <!-- LOGO -->
    <div class="logo">
      <img
        src="/Assets/images/logo.png"
        alt="CafeKiosk Logo"
      >
    </div>

    <!-- CATEGORY NAVIGATION -->
    <button
      class="nav-btn active"
      type="button"
      onclick="selectCategory('coffee', this)"
    >
      <img
        src="/Assets/images/coffee.png"
        alt="Coffee"
      >
      Coffee
    </button>

    <button
      class="nav-btn"
      type="button"
      onclick="selectCategory('non-coffee', this)"
    >
      <img
        src="/Assets/images/non-coffee.png"
        alt="Non-Coffee"
      >
      Non-Coffee
    </button>

    <button
      class="nav-btn"
      type="button"
      onclick="selectCategory('milktea', this)"
    >
      <img
        src="/Assets/images/milktea.png"
        alt="Milktea"
      >
      Milktea
    </button>

    <button
      class="nav-btn"
      type="button"
      onclick="selectCategory('food', this)"
    >
      <img
        src="/Assets/images/food.png"
        alt="Food"
      >
      Food
    </button>

    <button
      class="nav-btn"
      type="button"
      onclick="selectCategory('snack', this)"
    >
      <img
        src="/Assets/images/snack.png"
        alt="Snack"
      >
      Snack
    </button>

    <button
      class="nav-btn"
      type="button"
      onclick="selectCategory('dessert', this)"
    >
      <img
        src="/Assets/images/dessert.png"
        alt="Dessert"
      >
      Dessert
    </button>

    <!-- Cancel is kept out of the order summary so the checkout controls
         have more vertical room. -->
    <button
      class="kiosk-sidebar-cancel"
      type="button"
      onclick="cancelOrder()"
      aria-label="Cancel current order"
    >
      <span class="kiosk-sidebar-cancel-icon" aria-hidden="true">×</span>
      <span>Cancel Order</span>
    </button>

  </aside>


  <!-- =====================================================
       MENU AREA
       ===================================================== -->
  <main class="menu-area">

    <!-- CATEGORY HEADER -->
    <div class="category-header">

      <img
        id="categoryIcon"
        src="/Assets/images/coffee.png"
        alt="Coffee category"
      >

      <h1 id="categoryTitle">
        Coffee
      </h1>

    </div>


    <!-- =================================================
         MENU SEARCH
         ================================================= -->
    <div class="menu-search">

      <span class="search-icon" aria-hidden="true">⌕</span>

      <input
        type="text"
        id="menuSearch"
        placeholder="Search menu items..."
        autocomplete="off"
        aria-label="Search menu items"
      >

      <button
        type="button"
        id="clearSearch"
        class="clear-search"
        onclick="clearMenuSearch()"
        aria-label="Clear search"
      >
        ×
      </button>

    </div>


    <!-- MENU GRID -->
    <div
      class="menu-grid"
      id="menuGrid"
    >

      <!-- =================================================
           SAMPLE COFFEE ITEMS
           ================================================= -->

      <!-- LATTE -->
      <div
        class="menu-card"
        onclick="showItemModal('Latte', 120, 'coffee')"
      >
        <img
          class="menu-img"
          src="/Assets/images/coffee.png"
          alt="Latte"
        >

        <h3>
          Latte
        </h3>

        <p>
          ₱120
        </p>
      </div>


      <!-- CAPPUCCINO -->
      <div
        class="menu-card"
        onclick="showItemModal('Cappuccino', 130, 'coffee')"
      >
        <img
          class="menu-img"
          src="/Assets/images/coffee.png"
          alt="Cappuccino"
        >

        <h3>
          Cappuccino
        </h3>

        <p>
          ₱130
        </p>
      </div>


      <!-- MOCHA -->
      <div
        class="menu-card"
        onclick="showItemModal('Mocha', 140, 'coffee')"
      >
        <img
          class="menu-img"
          src="/Assets/images/coffee.png"
          alt="Mocha"
        >

        <h3>
          Mocha
        </h3>

        <p>
          ₱140
        </p>
      </div>


      <!-- AMERICANO -->
      <div
        class="menu-card"
        onclick="showItemModal('Americano', 100, 'coffee')"
      >
        <img
          class="menu-img"
          src="/Assets/images/coffee.png"
          alt="Americano"
        >

        <h3>
          Americano
        </h3>

        <p>
          ₱100
        </p>
      </div>


      <!-- ESPRESSO -->
      <div
        class="menu-card"
        onclick="showItemModal('Espresso', 90, 'coffee')"
      >
        <img
          class="menu-img"
          src="/Assets/images/coffee.png"
          alt="Espresso"
        >

        <h3>
          Espresso
        </h3>

        <p>
          ₱90
        </p>
      </div>

    </div>

  </main>


  <!-- =====================================================
       ORDER SUMMARY
       ===================================================== -->
  <aside class="order-summary">

    <h2>
      Order Summary
    </h2>


    <!-- ORDER ITEMS -->
    <div
      class="order-list"
      id="orderList"
    ></div>


    <!-- ===================================================
         ORDER BOTTOM
         =================================================== -->
    <div class="order-bottom">

      <!-- SUBTOTAL -->
      <div class="summary-row">

        <span>
          Subtotal
        </span>

        <span id="subtotalAmount">
          ₱0
        </span>

      </div>


      <!-- TOTAL -->
      <div class="summary-row">

        <span>
          Total
        </span>

        <span id="totalAmount">
          ₱0
        </span>

      </div>


      <!-- PAYMENT -->
      <div class="bottom-fields">

        <label
          class="field-label"
          for="paymentMethod"
        >
          Payment Type
        </label>

        <select
          id="paymentMethod"
          class="payment-select"
          onchange="updatePaymentMethod(this.value)"
        >
          <option value="Cash">
            Cash
          </option>

          <option value="Card">
            Card
          </option>

          <option value="Online">
            Online
          </option>
        </select>

        <div id="cashPaymentFields" class="cash-payment-fields">
          <label
            class="field-label"
            for="cashReceived"
          >
            Cash Received
          </label>

          <input
            id="cashReceived"
            class="cash-input"
            type="number"
            min="0"
            step="0.01"
            inputmode="decimal"
            autocomplete="off"
            placeholder="₱0.00"
            oninput="updateKioskCashUI()"
          >

          <div class="kiosk-change-row">
            <span>Change</span>
            <strong id="kioskChangeAmount">₱0.00</strong>
          </div>
        </div>

      </div>


      <!-- ORDER ACTIONS -->
      <div class="order-actions">

        <button
          class="confirm-btn"
          type="button"
          onclick="showOrderModal()"
        >
          Confirm Order
        </button>


      </div>

    </div>

  </aside>


  <!-- =====================================================
       ORDER CONFIRMATION MODAL
       ===================================================== -->
  <div
    id="orderModal"
    class="modal-overlay"
    onclick="closeOrderModal(event)"
  >

    <div
      id="orderModalBox"
      class="modal-box category-coffee"
    >

      <!-- MODAL HEADER -->
      <div class="modal-header">

        <img
          id="modalIcon"
          src="/Assets/images/coffee.png"
          alt="Category icon"
        >

        <div>

          <h3 id="modalTitle">
            Confirm Coffee Order
          </h3>

          <p id="modalMessage">
            This order will be recorded under Coffee.
          </p>

        </div>

      </div>


      <!-- MODAL TOTAL -->
      <div class="modal-details">

        <div>
          <strong>
            Total:
          </strong>

          <span id="modalTotalAmount">
            ₱0
          </span>
        </div>

      </div>


      <!-- ORDERED ITEMS -->
      <div class="modal-orders">

        <div class="modal-orders-heading">
          <h4>Ordered items</h4>
          <span id="modalItemCount" class="modal-item-count">0 items</span>
        </div>

        <div
          id="modalOrderItems"
          class="modal-order-items"
        ></div>

      </div>


      <!-- MODAL ACTIONS -->
      <div class="modal-actions">

        <button
          class="cancel-btn"
          type="button"
          onclick="closeOrderModal()"
        >
          Back
        </button>

        <button
          class="confirm-btn"
          type="button"
          onclick="confirmOrder()"
        >
          Confirm
        </button>

      </div>

    </div>

  </div>


  <!-- =====================================================
       ITEM CUSTOMIZATION MODAL
       Redesigned to match the reference screenshot
       ===================================================== -->
  <div
    id="itemModal"
    class="modal-overlay item-customization-overlay"
    onclick="closeItemModal(event)"
    aria-hidden="true"
  >

    <div
      id="itemModalBox"
      class="item-customization-box category-coffee"
      role="dialog"
      aria-modal="true"
      aria-labelledby="itemModalTitle"
    >

      <!-- =================================================
           ITEM HEADER
           Shows: Item Selection + selected item name + category
           ================================================= -->
      <div class="item-custom-header">

        <div class="item-custom-header-icon">
          <img
            id="itemModalIcon"
            src="/Assets/images/coffee.png"
            alt="Coffee"
          >
        </div>

        <div class="item-custom-header-text">
          <h3 id="itemModalTitle">Item Selection</h3>
          <div id="itemModalName" class="item-custom-item-name">
            Espresso
          </div>
          <div id="itemModalCategory" class="item-custom-item-category">
            Coffees
          </div>
        </div>

      </div>

      <!-- Hidden compatibility fields used by the existing JS. -->
      <div class="item-modal-accessibility-info" aria-live="polite">
        <p id="itemModalMessage">Customize this item.</p>
        <span id="itemModalPrice">₱120</span>
        <span id="itemModalQty">1</span>
      </div>

      <!-- Small close button; the rest of the modal follows the screenshot. -->
      <button
        class="item-custom-close"
        type="button"
        onclick="closeItemModal()"
        aria-label="Close item customization"
      >
        ×
      </button>

      <div class="item-custom-top-line"></div>

      <!-- Generated dynamically by menu.js -->
      <div
        id="itemModalOptions"
        class="item-custom-options"
      ></div>

      <div class="item-custom-divider"></div>

      <div class="item-custom-footer-row">

        <div class="item-custom-quantity-block">
          <div class="item-custom-quantity-label">
            Quantity
          </div>

          <div class="item-custom-quantity-controls">
            <button
              class="item-custom-qty-btn"
              type="button"
              onclick="updateItemQuantity(-1)"
              aria-label="Decrease quantity"
            >
              −
            </button>

            <span id="itemModalQtyDisplay">1</span>

            <button
              class="item-custom-qty-btn"
              type="button"
              onclick="updateItemQuantity(1)"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <div class="item-custom-total-wrap">
          <span class="item-custom-total-label">Total</span>
          <strong class="item-custom-total-price">
            ₱<span id="itemModalTotal">120</span>
          </strong>
        </div>

      </div>

      <div class="item-custom-actions">
        <button
          class="item-custom-cancel-btn"
          type="button"
          onclick="closeItemModal()"
        >
          Cancel
        </button>

        <button
          class="item-custom-add-btn"
          type="button"
          onclick="confirmAddItem()"
        >
          <span>Add to Cart</span>
          <span class="item-custom-add-price">
            ₱<span id="itemModalAddPrice">120</span>
          </span>
        </button>
      </div>

    </div>

  </div>

</div>


<!-- =======================================================
     JAVASCRIPT
     ======================================================= -->
<script src="/Assets/js/kiosk-tenant.js?v=1"></script>
<script src="/Assets/js/menu.js?v=34"></script>

<script src="/Assets/js/menu-runtime-config.js?v=34"></script>
<script src="/Assets/js/discount-client.js"></script>
  <script src="/Assets/js/uniform-theme.js"></script>
  <script src="/Assets/js/live-presence.js?v=3"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>