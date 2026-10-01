<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>CafeKiosk - Menu</title>

  <link rel="stylesheet" href="/Assets/css/menu.css?v=20260928-notes-v1">
<link rel="stylesheet" href="/Assets/css/feature-upgrade.css">
  <link rel="stylesheet" href="/Assets/css/payment-modal.css?v=payment-modal-v1">
  <link rel="stylesheet" href="/Assets/css/uniform-theme.css?v=20260928-mobile-v1">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
  <link rel="stylesheet" href="/Assets/css/developer-footer.css?v=20261001-footer-visible-v6">
  <link rel="stylesheet" href="/Assets/css/responsive-devices.css?v=20261001-mobile-pos-v6">
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
        src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Caffe_Latte_at_Pulse_Cafe.jpg"
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
        src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Iced_Chocolate_20250411-131126.jpg"
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
        src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Bubble-tea.jpg"
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
        src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Sandwich_in_Restaurant.jpg"
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
        src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Cookies_(Unsplash).jpg"
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
        src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Cake0.jpg"
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
        src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Caffe_Latte_at_Pulse_Cafe.jpg"
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
          src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Caffe_Latte_at_Pulse_Cafe.jpg"
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
          src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Caffe_Latte_at_Pulse_Cafe.jpg"
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
          src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Caffe_Latte_at_Pulse_Cafe.jpg"
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
          src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Caffe_Latte_at_Pulse_Cafe.jpg"
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
          src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Caffe_Latte_at_Pulse_Cafe.jpg"
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


      <div class="summary-row" id="kioskTaxRow" hidden>
        <span id="kioskTaxLabel">Tax</span>
        <span id="kioskTaxAmount">₱0.00</span>
      </div>

      <div class="summary-row" id="kioskServiceChargeRow" hidden>
        <span id="kioskServiceChargeLabel">Service Charge</span>
        <span id="kioskServiceChargeAmount">₱0.00</span>
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
        <label class="field-label" for="kioskPaymentSummaryButton">Payment Method</label>
        <button type="button" id="kioskPaymentSummaryButton" class="ck-payment-summary-button" aria-haspopup="dialog" aria-controls="paymentModal">
          <span id="kioskPaymentSummaryIcon" class="ck-payment-summary-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/></svg></span>
          <span class="ck-payment-summary-copy"><strong id="kioskPaymentSummaryMethod">Cash</strong><small id="kioskPaymentSummaryAmount">Tap to enter payment</small></span>
          <span class="ck-payment-summary-arrow" aria-hidden="true">›</span>
        </button>
        <select id="paymentMethod" class="ck-payment-native-control" aria-hidden="true" tabindex="-1">
          <option value="Cash">Cash</option><option value="GCash">GCash / Online Payment</option><option value="Card">Card</option><option value="Other">Other</option>
        </select>
        <div id="cashPaymentFields" class="ck-payment-native-control">
          <input id="cashReceived" type="number" min="0" step="0.01" inputmode="decimal" autocomplete="off">
          <strong id="kioskChangeAmount">₱0.00</strong>
        </div>
      </div>

    </div>

  </aside>



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
      <button type="button" id="paymentModalConfirm" class="ck-payment-confirm">Continue to Review</button>
    </div>
  </section>
</div>


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
          src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Caffe_Latte_at_Pulse_Cafe.jpg"
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

        <div>
          <strong>Payment:</strong>
          <span id="modalPaymentMethod" class="ck-receipt-payment payment-cash">Cash</span>
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
            src="https://commons.wikimedia.org/wiki/Special:Redirect/file/Caffe_Latte_at_Pulse_Cafe.jpg"
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

      <div class="item-custom-note">
        <label for="itemSpecialNote">Special Request <span>(Optional)</span></label>
        <textarea id="itemSpecialNote" maxlength="180" rows="3" placeholder="Example: Call my name when the order is ready, less ice, separate sauce..."></textarea>
        <div class="item-custom-note-help"><span>This note will be shown to the preparation team.</span><span id="itemSpecialNoteCount">0/180</span></div>
      </div>

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
<script src="/Assets/js/menu.js?v=20261001-review-flow-v5"></script>

<script src="/Assets/js/menu-runtime-config.js?v=34"></script>
<script src="/Assets/js/discount-client.js"></script>
  <script src="/Assets/js/uniform-theme.js?v=20261001-mobile-shell-v6"></script>
  <script src="/Assets/js/live-presence.js?v=3"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
  <script src="/Assets/js/developer-footer.js?v=20261001-footer-visible-v6"></script>
  <script src="/Assets/js/responsive-navigation.js?v=20261001-mobile-shell-v6"></script>
</body>
</html>