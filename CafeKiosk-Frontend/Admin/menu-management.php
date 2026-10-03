<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CafeKiosk - Menu Management</title>
  <link rel="stylesheet" href="../Assets/css/admin-stable/menu-management.css?v=product-slider-session-fix-20261003">
  <link rel="stylesheet" href="../Assets/css/admin-stable/menu-bulk-import.css?v=bulk-import-multizip-20261001">
<link rel="stylesheet" href="../Assets/css/admin-stable/feature-upgrade.css?v=admin-stable-20261001">
  <link rel="stylesheet" href="../Assets/css/admin-stable/uniform-theme.css?v=admin-stable-20261001">
  <link rel="stylesheet" href="../Assets/css/admin-stable/profile-menu.css?v=admin-stable-20261001">
  <link rel="stylesheet" href="/Assets/css/admin-stable/message-dialog.css?v=admin-stable-20261001">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
  <link rel="stylesheet" href="/Assets/css/admin-stable/admin-final-responsive.css?v=admin-stable-20261001">

  <!-- Menu Management: whole-page scrolling so the footer is reached with the browser scrollbar. -->
  <style id="menuManagementWholePageScrollFix">
    html {
      height: auto !important;
      min-height: 100% !important;
      overflow-x: hidden !important;
      overflow-y: scroll !important;
      scrollbar-gutter: stable;
      scrollbar-width: auto;
      scrollbar-color: rgba(76,149,111,.88) #eadfce;
    }

    body.uniform-admin.has-project-footer {
      width: 100% !important;
      height: auto !important;
      min-height: 100dvh !important;
      margin: 0 !important;
      overflow: visible !important;
    }

    body.uniform-admin.has-project-footer .menu-shell {
      width: 100% !important;
      height: auto !important;
      min-height: 100dvh !important;
      overflow: visible !important;
      align-items: start !important;
    }

    body.uniform-admin.has-project-footer .staff-sidebar {
      position: sticky !important;
      top: 0 !important;
      align-self: start !important;
      height: 100dvh !important;
      max-height: 100dvh !important;
    }

    body.uniform-admin.has-project-footer .menu-main {
      height: auto !important;
      min-height: 100dvh !important;
      overflow: visible !important;
      grid-template-rows: 74px auto !important;
    }

    body.uniform-admin.has-project-footer #menuView.menu-dashboard:not(.hidden) {
      height: auto !important;
      min-height: 0 !important;
      overflow: visible !important;
      grid-template-rows: auto auto !important;
    }

    body.uniform-admin.has-project-footer #menuView .category-panel,
    body.uniform-admin.has-project-footer #menuView .product-panel {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }

    body.uniform-admin.has-project-footer #menuView .product-panel {
      grid-template-rows: auto auto !important;
    }

    body.uniform-admin.has-project-footer #menuView .product-grid {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }

    body.uniform-admin.has-project-footer .admin-menu-footer {
      position: relative !important;
      inset: auto !important;
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      width: 100% !important;
      margin: 0 !important;
      z-index: 1 !important;
    }

    html::-webkit-scrollbar { width: 12px; }
    html::-webkit-scrollbar-track { background: #eadfce; }
    html::-webkit-scrollbar-thumb {
      background: rgba(76,149,111,.88);
      border: 2px solid #eadfce;
      border-radius: 999px;
    }
    html::-webkit-scrollbar-thumb:hover { background: #3f805f; }
  </style>
  <link rel="stylesheet" href="/Assets/css/developer-footer.css?v=20261003-systemwide-scroll-footer-v1">
</head>
<body class="uniform-admin has-project-footer">
  <div class="menu-shell">
    <!-- ADMIN SIDEBAR - MATCHES ORDER MONITOR -->
    <aside class="staff-sidebar">
      <a class="brand" href="/admin/dashboard" aria-label="CafeKiosk Admin">
        <img src="../Assets/images/logo.png" alt="CafeKiosk Logo">
      </a>

      <div class="staff-label">ADMIN</div>

      <nav class="staff-nav" aria-label="Admin navigation">
        <a class="staff-nav-link" href="/admin/dashboard">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="3" y="14" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/>
            </svg>
          </span>
          <span>Dashboard</span>
        </a>

        <a class="staff-nav-link" href="/admin/order-monitor">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <path d="M3 6h18"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </span>
          <span>Order</span>
        </a>

        <a class="staff-nav-link active" href="/admin/menu-management" aria-current="page">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 3h11l5 5v13H3z"/>
              <path d="M14 3v5h5"/>
              <path d="M7 12h8M7 16h8"/>
            </svg>
          </span>
          <span>Menu Management</span>
        </a>

        <a class="staff-nav-link" href="/admin/promotions">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M19 5 5 19"/>
              <circle cx="6.5" cy="6.5" r="2.5"/>
              <circle cx="17.5" cy="17.5" r="2.5"/>
            </svg>
          </span>
          <span>Promotions &amp; Discount</span>
        </a>

        <a class="staff-nav-link" href="/admin/inventory">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <path d="M3.3 7 12 12l8.7-5M12 22V12"/>
            </svg>
          </span>
          <span>Inventory</span>
        </a>

        <a class="staff-nav-link" href="/admin/report">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <path d="M3 3v18h18"/>
              <path d="M8 17v-3M13 17V8M18 17V5"/>
            </svg>
          </span>
          <span>Report</span>
        </a>

        <a class="staff-nav-link" href="/admin/settings">
          <span class="staff-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
            </svg>
          </span>
          <span>Settings</span>
        </a>
      </nav>
    </aside>

    <main class="menu-main">
      <!-- HEADER ROW -->
      <header class="menu-topbar">
        <section class="page-heading-card">
          <div>
            <span class="page-kicker">ADMIN CATALOG</span>
            <h1 id="pageTitle">Menu Management</h1>
          </div>
          <div class="catalog-state" aria-label="Catalog status">
            <span class="catalog-dot"></span>
            <span>Catalog Active</span>
          </div>
        </section>

        <section class="admin-profile-card">
          <span class="admin-avatar" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>
            </svg>
          </span>
          <div class="admin-copy">
            <strong>“Admin's Name”</strong>
            <small>Administrator</small>
          </div>
          <button class="admin-caret" type="button" aria-label="Admin menu">
            <span></span>
          </button>
        </section>
      </header>

      <!-- MENU LIST VIEW -->
      <section id="menuView" class="view menu-dashboard">
        <section class="category-panel">
          <div class="section-heading">
            <div>
              <span class="section-kicker">MENU GROUPS</span>
              <h2>Categories</h2>
              <p id="categoryCountLabel">Choose a category to filter the catalog</p>
            </div>

            <div class="category-actions">
              <button class="outline-action" id="editCategoryBtn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>
                </svg>
                Edit Category
              </button>

              <button class="primary-action" id="addCategoryBtn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add Category
              </button>
            </div>
          </div>

          <div class="category-scroll-area" aria-label="Scrollable product categories">
            <div class="category-tabs" id="categoryTabs" aria-label="Product categories"></div>
          </div>
        </section>

        <section class="product-panel">
          <div class="product-panel-head">
            <div>
              <span class="section-kicker">PRODUCT CATALOG</span>
              <h2>Menu Items</h2>
              <p id="productResultText">Browse and manage your menu products</p>
            </div>

            <div class="product-toolbar">
              <label class="search-box" aria-label="Search products">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <circle cx="11" cy="11" r="7"/>
                  <path d="m20 20-3.5-3.5"/>
                </svg>
                <input type="search" id="searchInput" placeholder="Search menu items...">
              </label>

              <button class="outline-action bulk-import-trigger" id="importMenuBtn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M12 3v12"/>
                  <path d="m7 10 5 5 5-5"/>
                  <path d="M5 21h14a2 2 0 0 0 2-2v-3"/>
                  <path d="M3 16v3a2 2 0 0 0 2 2"/>
                </svg>
                Import Menu
              </button>

              <button class="primary-action add-item" id="addItemBtn" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Add New Item
              </button>
            </div>
          </div>

          <div class="product-grid" id="productGrid"></div>
        </section>
      </section>

      <!-- CREATE / EDIT PRODUCT -->
      <section id="formView" class="view hidden">
        <section class="creation-card">
          <div class="creation-top-space">
            <div>
              <span class="section-kicker">PRODUCT DETAILS</span>
              <h2>Product Information</h2>
              <p>Keep the product details clear and consistent for Kiosk and POS.</p>
            </div>
          </div>

          <form id="productForm" class="product-form">
            <div class="form-left">
              <input type="hidden" id="editId">

              <label>
                <span>Product Name</span>
                <input id="productName" type="text" placeholder="Name of food or beverage" required>
              </label>

              <div class="form-two-columns">
                <label>
                  <span>Category</span>
                  <select id="productCategory" required></select>
                </label>

                <label>
                  <span>Price</span>
                  <div class="price-input-wrap">
                    <b>₱</b>
                    <input id="productPrice" type="number" min="0" step="0.01" placeholder="0.00" required>
                  </div>
                </label>
              </div>

              <label>
                <span>Availability</span>
                <select id="productAvailability">
                  <option value="Available">Available</option>
                  <option value="Unavailable">Unavailable</option>
                </select>
              </label>

              <label>
                <span>Description</span>
                <textarea id="productDescription" placeholder="Short description of the food or beverage"></textarea>
              </label>
            </div>

            <div class="form-right">
              <label class="upload-title">Product Image</label>

              <label class="image-drop" for="productImage">
                <img id="imagePreview" alt="Product preview">
                <div id="imagePlaceholder">
                  <span class="upload-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                      <rect x="3" y="3" width="18" height="18" rx="3"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <path d="m21 15-5-5L5 21"/>
                    </svg>
                  </span>
                  <strong>Upload product image</strong>
                  <small>Click to browse an image</small>
                </div>
              </label>
              <input id="productImage" type="file" accept="image/*" hidden>

              <div class="form-buttons">
                <button type="button" class="btn secondary" id="cancelBtn">Cancel</button>
                <button type="submit" class="btn primary" id="saveBtn">Save Product</button>
              </div>
            </div>

            <section class="recipe-builder flexible-recipe-builder" aria-labelledby="recipeBuilderTitle">
              <div class="recipe-builder-head flexible-builder-head">
                <div>
                  <span class="section-kicker">MENU CUSTOMIZATION & INVENTORY</span>
                  <h3 id="recipeBuilderTitle">Flexible Sizes & Ingredient Usage</h3>
                  <p>
                    Create the serving sizes offered for this item, set each size's added price and recipe multiplier,
                    then connect the product to ingredients already available in Inventory Monitor.
                  </p>
                </div>
              </div>

              <section id="ckFlexSizesPanel" class="flex-size-panel" aria-labelledby="flexSizeTitle">
                <div class="flex-config-title-row">
                  <div>
                    <strong id="flexSizeTitle">Cup / Serving Sizes</strong>
                    <small>Use any size names you need. The recipe multiplier controls how much ingredient each size consumes.</small>
                  </div>
                  <button type="button" id="ckAddSize" class="recipe-add-btn">
                    + Add Size
                  </button>
                </div>

                <div class="flex-size-table-wrap">
                  <div class="flex-size-table-head" aria-hidden="true">
                    <span>Size Name</span>
                    <span>Additional Price</span>
                    <span>Recipe Multiplier</span>
                    <span></span>
                  </div>
                  <div id="ckSizes" class="flex-size-rows"></div>
                </div>

                <label class="flex-category-default">
                  <input type="checkbox" id="ckSaveCategoryDefault">
                  <span>Use these sizes as the default sizes for this category</span>
                </label>
              </section>

              <div class="ingredient-usage-heading">
                <div>
                  <strong>Ingredient Usage Per Base Serving</strong>
                  <small>
                    Pick ingredients from Inventory Monitor. Stock and low-alert values are filled from the selected ingredient.
                  </small>
                </div>
                <button type="button" class="recipe-add-btn" id="addRecipeIngredientBtn">
                  + Add Ingredient
                </button>
              </div>

              <div class="recipe-table-wrap">
                <div class="recipe-table-head" aria-hidden="true">
                  <span>Ingredient</span>
                  <span>Base Qty</span>
                  <span>Unit</span>
                  <span>Current Stock</span>
                  <span>Low Alert At</span>
                  <span>Usage</span>
                  <span>Option Name</span>
                  <span></span>
                </div>

                <div id="recipeIngredientRows" class="recipe-ingredient-rows"></div>
              </div>

              <div class="recipe-help-box">
                <strong>How size and stock rules work</strong>
                <span>
                  The base quantity is multiplied by the selected flexible size's recipe multiplier.
                  Main ingredients affect item availability; optional ingredients only apply when that option is selected.
                </span>
              </div>
            </section>
          </form>
        </section>
      </section>

    </main>
  </div>
  <!-- CATEGORY MODAL -->
  <div class="modal-backdrop hidden" id="categoryModal">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M4 6h16M4 12h16M4 18h10"/>
        </svg>
      </div>
      <h2 id="modalTitle">Add Category</h2>
      <p>Choose a clear category name that is easy to recognize in the menu.</p>
      <input type="text" id="categoryNameInput" placeholder="Category name">

      <div class="category-icon-field">
        <div class="category-icon-field-head">
          <div>
            <strong>Category Icon</strong>
            <span>Choose the icon customers will see in POS and Kiosk.</span>
          </div>
          <div class="category-icon-selected-preview" id="categoryIconSelectedPreview" aria-hidden="true"></div>
        </div>

        <div class="category-icon-picker" id="categoryIconPicker" role="radiogroup" aria-label="Category icon"></div>
      </div>

      <div class="modal-actions" id="categoryModalActions">
        <button
          class="btn danger hidden"
          id="deleteCategoryBtn"
          type="button"
        >
          Delete Category
        </button>

        <button
          class="btn secondary"
          id="closeModalBtn"
          type="button"
        >
          Cancel
        </button>

        <button
          class="btn primary"
          id="saveCategoryBtn"
          type="button"
        >
          Save Category
        </button>
      </div>
    </div>
  </div>

  <script src="../Assets/js/admin-stable/menu-flex-config.js?v=cup-size-footer-fix-20261001"></script>
<script src="../Assets/js/admin-stable/menu-management.js?v=fast-catalog-images-20261003"></script>
  <script src="../Assets/js/admin-stable/menu-bulk-import.js?v=customization-auto-addon-404fix-v3-20261001"></script>
  <script src="../Assets/js/admin-stable/auth-session.js?v=session-role-isolation-20261003-v2"></script>
  <script src="../Assets/js/admin-stable/uniform-theme.js?v=admin-stable-20261001"></script>
  <script src="../Assets/js/admin-stable/profile-menu.js?v=admin-stable-20261001"></script>
  <script src="/Assets/js/admin-stable/message-dialog.js?v=admin-stable-20261001"></script>
  <script src="/Assets/js/developer-footer.js?v=20261003-systemwide-scroll-footer-v1"></script>
</body>
</html>
