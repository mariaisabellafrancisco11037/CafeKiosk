(() => {
  "use strict";

  const CAFE_ID = String(localStorage.getItem("cafeId") || "cafe-1").trim() || "cafe-1";
  let config = { products: {}, categoryDefaults: {} };
  let editingKey = "";

  function apiUrl() {
    if (location.protocol === "http:" || location.protocol === "https:") {
      const port = location.port;
      if (!port || port === "80" || port === "443" || port === "5000") return location.origin;
      return `${location.protocol}//${location.hostname}:5000`;
    }
    const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
    if (saved) return saved.replace(/\/$/, "");
    return "http://127.0.0.1:5000";
  }

  async function apiFetch(url, options = {}) {
    if (window.CafeAuth?.apiFetch) return window.CafeAuth.apiFetch(url, options);

    const headers = new Headers(options.headers || {});
    const token =
      localStorage.getItem("cafeAdminAuthToken") ||
      sessionStorage.getItem("cafeAuthToken");

    if (token) headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, {
      ...options,
      credentials: "include",
      headers
    });
  }

  function categoryKey(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-")
      .replace(/-+/g, "-");

    if (["coffee", "coffees"].includes(normalized)) return "coffee";
    if (["non-coffee", "non-coffees", "noncoffee", "noncoffees"].includes(normalized)) return "non-coffee";
    if (["milk-tea", "milktea", "milk-teas", "milkteas"].includes(normalized)) return "milk-tea";
    if (["food", "foods"].includes(normalized)) return "foods";
    if (["snack", "snacks"].includes(normalized)) return "snacks";
    if (["dessert", "desserts"].includes(normalized)) return "dessert";
    return normalized;
  }

  function productKey(category, name) {
    return `${categoryKey(category)}::${String(name || "").trim().toLowerCase()}`;
  }

  function value(id) {
    return document.getElementById(id)?.value?.trim() || "";
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function sizesContainer() {
    return document.getElementById("ckSizes");
  }

  function renderSizeEmptyState() {
    const container = sizesContainer();
    if (!container) return;

    container.querySelector(".ck-size-empty")?.remove();
    if (container.querySelector(".ck-size-row")) return;

    const empty = document.createElement("div");
    empty.className = "ck-size-empty";
    empty.textContent = "No serving sizes yet. Click “Add Size” to create one.";
    container.appendChild(empty);
  }

  function addSize(size = {}) {
    const container = sizesContainer();
    if (!container) return;

    container.querySelector(".ck-size-empty")?.remove();

    const row = document.createElement("div");
    row.className = "ck-flex-row ck-size-row";
    row.innerHTML = `
      <input
        class="ck-size-label"
        type="text"
        placeholder="e.g. 12 oz / Regular"
        value="${escapeHtml(size.label || "")}" 
        aria-label="Serving size name"
      >
      <input
        class="ck-size-price"
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        value="${Number(size.priceAdd ?? size.price ?? 0) || 0}"
        aria-label="Additional price"
      >
      <input
        class="ck-size-mult"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="1.00"
        value="${Number(size.multiplier ?? 1) || 1}"
        aria-label="Recipe multiplier"
      >
      <button type="button" class="ck-mini ck-remove">Remove</button>
    `;

    row.querySelector(".ck-remove")?.addEventListener("click", () => {
      row.remove();
      renderSizeEmptyState();
    });

    container.appendChild(row);
  }

  function ensure() {
    const panel = document.getElementById("ckFlexSizesPanel");
    const addButton = document.getElementById("ckAddSize");
    if (!panel || !addButton) return false;

    if (!addButton.dataset.ckFlexBound) {
      addButton.dataset.ckFlexBound = "true";
      addButton.addEventListener("click", () => addSize());
    }

    return true;
  }

  function collectSizes() {
    return [...document.querySelectorAll(".ck-size-row")]
      .map(row => ({
        label: row.querySelector(".ck-size-label")?.value.trim() || "",
        priceAdd: Math.max(0, Number(row.querySelector(".ck-size-price")?.value) || 0),
        multiplier: Math.max(0.01, Number(row.querySelector(".ck-size-mult")?.value) || 1)
      }))
      .filter(size => size.label);
  }

  function collectRichIngredients() {
    return [...document.querySelectorAll("#recipeIngredientRows .recipe-row")]
      .map(row => ({
        name: row.querySelector(".recipe-name-input")?.value?.trim() || "",
        amount: Math.max(0, Number(row.querySelector(".recipe-amount-input")?.value) || 0),
        unit: row.querySelector(".recipe-unit-input")?.value || "g",
        stock: Math.max(0, Number(row.querySelector(".recipe-stock-input")?.value) || 0),
        lowStockThreshold: Math.max(0, Number(row.querySelector(".recipe-low-input")?.value) || 0),
        mode: row.querySelector(".recipe-mode-input")?.value || "required",
        optionValue: row.querySelector(".recipe-option-input")?.value?.trim() || "",
        scaleWithSize: true
      }))
      .filter(ingredient => ingredient.name);
  }

  async function loadConfig() {
    try {
      const response = await apiFetch(
        `${apiUrl()}/api/menu-config?cafeId=${encodeURIComponent(CAFE_ID)}`,
        { cache: "no-store" }
      );
      if (!response.ok) return;
      const payload = await response.json();
      config = payload.config || config;
    } catch (error) {
      console.warn("Menu size configuration could not be loaded:", error);
    }
  }

  function loadForForm() {
    if (!ensure()) return;

    const name = value("productName");
    const category = value("productCategory");
    const key = productKey(category, name);
    editingKey = key;

    const product = config.products?.[key] || null;
    const categoryDefaults = config.categoryDefaults?.[categoryKey(category)] || [];
    const sizes = product?.sizes?.length ? product.sizes : categoryDefaults;
    const container = sizesContainer();
    if (!container) return;

    container.innerHTML = "";

    // A single editable Regular row is a neutral starting point, not a fixed preset list.
    (sizes.length ? sizes : [{ label: "Regular", priceAdd: 0, multiplier: 1 }]).forEach(addSize);

    const checkbox = document.getElementById("ckSaveCategoryDefault");
    if (checkbox) checkbox.checked = false;
  }

  async function saveForCurrentProduct() {
    const name = value("productName");
    const category = value("productCategory");
    if (!name || !category) return false;

    const newKey = productKey(category, name);
    const sizes = collectSizes();
    const ingredients = collectRichIngredients();
    const saveCategoryDefault = document.getElementById("ckSaveCategoryDefault")?.checked === true;

    let latest = config;

    try {
      const current = await apiFetch(
        `${apiUrl()}/api/menu-config?cafeId=${encodeURIComponent(CAFE_ID)}`,
        { cache: "no-store" }
      );
      if (current.ok) {
        const payload = await current.json();
        if (payload?.config) latest = payload.config;
      }
    } catch (_) {
      // Use the last loaded configuration if the refresh request fails.
    }

    latest = {
      products: { ...(latest?.products || {}) },
      categoryDefaults: { ...(latest?.categoryDefaults || {}) }
    };

    const previousProduct =
      latest.products[newKey] ||
      (editingKey ? latest.products[editingKey] : null) ||
      {};

    latest.products[newKey] = {
      ...previousProduct,
      productName: name,
      category,
      sizes,
      ingredients,
      updatedAt: new Date().toISOString()
    };

    if (editingKey && editingKey !== newKey) {
      delete latest.products[editingKey];
    }

    if (saveCategoryDefault) {
      latest.categoryDefaults[categoryKey(category)] = sizes;
    }

    try {
      const response = await apiFetch(`${apiUrl()}/api/menu-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cafeId: CAFE_ID, config: latest }),
        keepalive: true
      });

      if (!response.ok) {
        throw new Error(`Menu configuration save failed (HTTP ${response.status})`);
      }

      config = latest;
      editingKey = newKey;
      return true;
    } catch (error) {
      console.error(error);
      alert("The product recipe was saved, but its flexible size configuration could not be saved. Please try again.");
      return false;
    }
  }

  window.CafeFlexSizes = {
    addSize,
    collectSizes,
    loadForForm,
    saveForCurrentProduct
  };

  async function boot() {
    ensure();
    await loadConfig();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
