(() => {
  "use strict";

  let activeCafeId = "";

  function resolveCafeId() {
    return String(
      window.CafeKioskTenant?.info?.cafeId ||
      sessionStorage.getItem("cafeId") ||
      localStorage.getItem("cafeId") ||
      "cafe-1"
    ).trim() || "cafe-1";
  }

  window.CafeMenuConfig = {
    config: { products: {}, categoryDefaults: {} },
    ready: false
  };

  const api = () => {
    if (location.protocol === "http:" || location.protocol === "https:") {
      const port = location.port;
      if (!port || port === "80" || port === "443" || port === "5000") return location.origin;
      return `${location.protocol}//${location.hostname}:5000`;
    }
    return "http://127.0.0.1:5000";
  };

  function catKey(value) {
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

  function isKioskPage() {
    return Boolean(
      document.body?.classList.contains("uniform-kiosk") ||
      /\/kiosk(?:\/|$)/i.test(location.pathname) ||
      /\/Kiosk\//.test(location.pathname)
    );
  }

  function productKey(category, name) {
    return `${catKey(category)}::${String(name || "").trim().toLowerCase()}`;
  }

  function configForProduct(category, name) {
    const config = window.CafeMenuConfig.config || {};
    const direct = config.products?.[productKey(category, name)];
    if (direct) return direct;

    return Object.values(config.products || {}).find(product =>
      String(product?.productName || "").trim().toLowerCase() ===
      String(name || "").trim().toLowerCase()
    ) || null;
  }

  function uniqueOptions(options) {
    const seen = new Set();
    return options.filter(option => {
      const key = String(option.value || option.label || "").trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /*
    Kiosk customization is built ONLY from Menu Management data.
    No coffee/milktea/food hard-coded add-ons are inherited here.
  */
  function buildConfiguredFields(category, name) {
    const config = window.CafeMenuConfig.config || {};
    const product = configForProduct(category, name);
    const categoryDefaults = config.categoryDefaults?.[catKey(category)] || [];
    const fields = [];

    const sizes = Array.isArray(product?.sizes) && product.sizes.length
      ? product.sizes
      : (Array.isArray(categoryDefaults) ? categoryDefaults : []);

    if (sizes.length) {
      const sizeOptions = uniqueOptions(
        sizes
          .map(size => ({
            label: String(size?.label || "").trim(),
            value: String(size?.label || "").trim(),
            price: Math.max(0, Number(size?.priceAdd ?? size?.price ?? 0) || 0)
          }))
          .filter(option => option.label)
      );

      if (sizeOptions.length) {
        fields.push({
          key: "size",
          label: "Size",
          type: "radio",
          options: sizeOptions
        });
      }
    }

    const ingredients = Array.isArray(product?.ingredients)
      ? product.ingredients
      : [];

    const optionalIngredients = uniqueOptions(
      ingredients
        .filter(ingredient => String(ingredient?.mode || "").toLowerCase() === "option")
        .map(ingredient => {
          const label = String(
            ingredient?.optionValue ||
            ingredient?.optionName ||
            ingredient?.name ||
            ""
          ).trim();

          return {
            label,
            value: label,
            price: Math.max(
              0,
              Number(
                ingredient?.optionPrice ??
                ingredient?.priceAdd ??
                ingredient?.additionalPrice ??
                0
              ) || 0
            )
          };
        })
        .filter(option => option.label)
    );

    if (optionalIngredients.length) {
      fields.push({
        key: "addons",
        label: "Optional Add-ons",
        type: "checkbox",
        options: optionalIngredients
      });
    }

    return fields;
  }

  function applyConfiguredCustomization(category, name) {
    try {
      const store =
        typeof customizationConfig !== "undefined"
          ? customizationConfig
          : window.customizationConfig;

      if (!store) return;

      if (isKioskPage()) {
        // Kiosk is fully data-driven: never merge bundled/demo add-ons.
        store[category] = buildConfiguredFields(category, name);
        return;
      }

      // Staff/Manager POS keeps its existing operational customization UI.
      // Only replace its size choices with the flexible sizes configured by
      // the owner, preserving the POS behavior outside this Kiosk request.
      const config = window.CafeMenuConfig.config || {};
      const product = configForProduct(category, name);
      const categoryDefaults = config.categoryDefaults?.[catKey(category)] || [];
      const sizes = Array.isArray(product?.sizes) && product.sizes.length
        ? product.sizes
        : (Array.isArray(categoryDefaults) ? categoryDefaults : []);

      if (!sizes.length) return;

      const current = Array.isArray(store[category]) ? store[category] : [];
      const rest = current.filter(field =>
        !/size/i.test(String(field?.key || "")) &&
        !/size/i.test(String(field?.label || ""))
      );

      store[category] = [
        {
          key: "size",
          label: "Size",
          type: "radio",
          options: sizes
            .map(size => ({
              label: String(size?.label || "").trim(),
              value: String(size?.label || "").trim(),
              price: Math.max(0, Number(size?.priceAdd ?? size?.price ?? 0) || 0)
            }))
            .filter(option => option.label)
        },
        ...rest
      ];
    } catch (error) {
      console.warn("Menu customization could not be applied:", error);
    }
  }

  function updateModalCopy(category, name) {
    if (!isKioskPage()) return;
    const fields = buildConfiguredFields(category, name);
    const message = document.getElementById("itemModalMessage");
    if (!message) return;

    if (!fields.length) {
      message.textContent = "No customization options are configured for this item. Choose the quantity and add it to your order.";
      return;
    }

    const hasAddOns = fields.some(field => field.type === "checkbox");
    const hasSizes = fields.some(field => field.key === "size");

    if (hasSizes && hasAddOns) {
      message.textContent = "Choose a size and any optional add-ons configured by this cafe.";
    } else if (hasSizes) {
      message.textContent = "Choose the serving size configured by this cafe.";
    } else {
      message.textContent = "Choose any optional add-ons configured by this cafe.";
    }
  }

  function wrapShowItemModal() {
    if (typeof showItemModal !== "function") return;
    const original = showItemModal;
    if (original.__cafeKioskConfigured) return;

    const wrapped = function (...args) {
      const isObjectCall = args.length === 1 && args[0] && typeof args[0] === "object";
      const category = isObjectCall ? args[0].category : args[2];
      const name = isObjectCall ? args[0].name : args[0];

      applyConfiguredCustomization(category, name);
      const result = original.apply(this, args);
      updateModalCopy(category, name);
      return result;
    };

    wrapped.__cafeKioskConfigured = true;

    try {
      showItemModal = wrapped;
    } catch (_) {
      // Classic-script global assignment may be blocked in unusual runtimes.
    }
  }

  async function load() {
    // Bind immediately so bundled/default customization never flashes while
    // the cafe-specific configuration request is still loading.
    wrapShowItemModal();

    if (window.CafeKioskTenant?.ready) {
      try { await window.CafeKioskTenant.ready; } catch (_) {}
    }

    activeCafeId = resolveCafeId();

    try {
      const response = await fetch(
        `${api()}/api/menu-config?cafeId=${encodeURIComponent(activeCafeId)}`,
        { cache: "no-store", credentials: "include" }
      );

      if (response.ok) {
        const payload = await response.json();
        window.CafeMenuConfig.config = payload.config || window.CafeMenuConfig.config;
      }
    } catch (error) {
      console.warn("Cafe menu customization configuration could not be loaded:", error);
    }

    window.CafeMenuConfig.ready = true;
    wrapShowItemModal();
    window.setTimeout(wrapShowItemModal, 250);
    window.setTimeout(wrapShowItemModal, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", load, { once: true });
  } else {
    load();
  }
})();
