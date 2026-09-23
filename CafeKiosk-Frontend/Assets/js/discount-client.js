(() => {
  "use strict";

  const CAFE_ID =
    String(localStorage.getItem("cafeId") || "cafe-1").trim() || "cafe-1";

  let promos = [];

  window.CafePromotionClient = {
    promos,
    // Kept for kiosk/backward compatibility. POS no longer asks the cashier
    // to choose an eligibility class; each Admin promotion already owns it.
    eligibility:
      sessionStorage.getItem("cafeCustomerEligibility") || "all",
    selectedPromotionId:
      sessionStorage.getItem("cafeSelectedPromotionId") || "",
    applied: null,
    quote: () => ({ subtotal: 0, discount: 0, total: 0, promo: null })
  };

  const api = () => {
    if (location.protocol === "http:" || location.protocol === "https:") {
      const port = location.port;
      if (!port || port === "80" || port === "443" || port === "5000") {
        return location.origin;
      }
      return `${location.protocol}//${location.hostname}:5000`;
    }
    const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
    return saved ? saved.replace(/\/$/, "") : "http://127.0.0.1:5000";
  };

  function n(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function qty(item) {
    return Math.max(1, n(item.qty ?? item.quantity ?? 1));
  }

  function line(item) {
    const stored = n(item.subtotal ?? item.total);
    if (stored > 0) return stored;
    return (n(item.price ?? item.unitPrice) + n(item.customizationCost)) * qty(item);
  }

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function catKey(value) {
    const key = norm(value).replace(/[_\s]+/g, "-").replace(/-+/g, "-");
    if (["coffee", "coffees"].includes(key)) return "coffee";
    if (["non-coffee", "non-coffees", "noncoffee", "noncoffees"].includes(key)) return "non-coffee";
    if (["milk-tea", "milktea", "milk-teas", "milkteas"].includes(key)) return "milk-tea";
    if (["food", "foods"].includes(key)) return "foods";
    if (["snack", "snacks"].includes(key)) return "snacks";
    if (["dessert", "desserts"].includes(key)) return "dessert";
    return key;
  }

  function validNow(promo) {
    if (!promo || promo.active === false) return false;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (promo.startDate && today < String(promo.startDate).slice(0, 10)) return false;
    if (promo.endDate && today > String(promo.endDate).slice(0, 10)) return false;

    const currentTime = now.toTimeString().slice(0, 5);
    const startTime = String(promo.startTime || "").slice(0, 5);
    const endTime = String(promo.endTime || "").slice(0, 5);

    if (startTime && endTime && startTime > endTime) {
      if (!(currentTime >= startTime || currentTime <= endTime)) return false;
    } else {
      if (startTime && currentTime < startTime) return false;
      if (endTime && currentTime > endTime) return false;
    }

    return true;
  }

  function eligibilityMatches(promo, eligibility) {
    const wanted = norm(eligibility || "all") || "all";
    const allowed = (promo.eligibility || ["all"]).map(norm);
    return allowed.includes("all") || allowed.includes(wanted);
  }

  function promotionBase(promo, items, subtotal) {
    if (promo.scope === "category") {
      const categories = (promo.categories || []).map(catKey);
      return items.reduce(
        (sum, item) => sum + (categories.includes(catKey(item.category)) ? line(item) : 0),
        0
      );
    }

    if (promo.scope === "products") {
      const products = (promo.productNames || []).map(norm);
      return items.reduce(
        (sum, item) =>
          sum + (products.includes(norm(item.name || item.productName)) ? line(item) : 0),
        0
      );
    }

    return subtotal;
  }

  function calculatePromo(promo, items, subtotal) {
    if (!promo || !validNow(promo)) return null;
    if (subtotal < n(promo.minimumSubtotal)) return null;

    const base = promotionBase(promo, items, subtotal);
    if (base <= 0) return null;

    let discount =
      promo.type === "fixed"
        ? n(promo.value)
        : base * Math.min(100, Math.max(0, n(promo.value))) / 100;

    discount = Math.max(0, Math.min(subtotal, discount));

    return {
      subtotal,
      discount,
      total: Math.max(0, subtotal - discount),
      promo
    };
  }

  function best(items, subtotal) {
    let winner = null;
    const eligibility = window.CafePromotionClient.eligibility || "all";

    for (const promo of promos) {
      if (!eligibilityMatches(promo, eligibility)) continue;
      const result = calculatePromo(promo, items, subtotal);
      if (result && (!winner || result.discount > winner.discount)) winner = result;
    }

    return winner;
  }

  function cleanSubtotal(items, subtotalValue) {
    return Math.max(
      0,
      Number.isFinite(Number(subtotalValue))
        ? Number(subtotalValue)
        : (Array.isArray(items) ? items : []).reduce((sum, item) => sum + line(item), 0)
    );
  }

  function isPosPage() {
    return Boolean(document.getElementById("ckDiscountSelect"));
  }

  function selectedPromo() {
    const id = String(window.CafePromotionClient.selectedPromotionId || "").trim();
    if (!id) return null;
    return promos.find(p => String(p.id) === id) || null;
  }

  function quote(items, subtotalValue) {
    const cleanItems = Array.isArray(items) ? items : [];
    const subtotal = cleanSubtotal(cleanItems, subtotalValue);

    // On POS the cashier deliberately chooses an Admin-created promotion.
    // "No Discount" means exactly no promotion is applied.
    if (isPosPage()) {
      const promo = selectedPromo();
      const result = promo ? calculatePromo(promo, cleanItems, subtotal) : null;
      return result || { subtotal, discount: 0, total: subtotal, promo: null };
    }

    // Kiosk keeps the legacy automatic best-promotion behavior.
    const hit = best(cleanItems, subtotal);
    return hit || { subtotal, discount: 0, total: subtotal, promo: null };
  }

  window.CafePromotionClient.quote = quote;

  function eligibilityLabel(promo) {
    const labels = {
      all: "All Customers",
      general: "General",
      student: "Students",
      senior: "Senior Citizens",
      pwd: "PWD"
    };
    const values = (promo?.eligibility || ["all"]).map(v => labels[norm(v)] || String(v));
    return values.join(", ");
  }

  function valueLabel(promo) {
    return promo.type === "fixed"
      ? `₱${n(promo.value).toFixed(2)} off`
      : `${n(promo.value).toFixed(2).replace(/\.00$/, "")}% off`;
  }

  function primaryEligibility(promo) {
    const list = (promo?.eligibility || ["all"]).map(norm);
    return list.find(x => x && x !== "all") || "all";
  }

  function populateDiscountSelect() {
    const select = document.getElementById("ckDiscountSelect");
    if (!select) return;

    const selectedId = String(window.CafePromotionClient.selectedPromotionId || "");
    select.innerHTML = '<option value="">No Discount</option>';

    for (const promo of promos.filter(validNow)) {
      const option = document.createElement("option");
      option.value = String(promo.id);
      option.textContent = `${promo.name} — ${valueLabel(promo)} • ${eligibilityLabel(promo)}`;
      select.appendChild(option);
    }

    if (selectedId && promos.some(p => String(p.id) === selectedId && validNow(p))) {
      select.value = selectedId;
    } else {
      window.CafePromotionClient.selectedPromotionId = "";
      sessionStorage.removeItem("cafeSelectedPromotionId");
      select.value = "";
    }

    if (select.dataset.ckDiscountBound !== "1") {
      select.dataset.ckDiscountBound = "1";
      select.addEventListener("change", () => {
        const id = String(select.value || "");
        window.CafePromotionClient.selectedPromotionId = id;
        if (id) sessionStorage.setItem("cafeSelectedPromotionId", id);
        else sessionStorage.removeItem("cafeSelectedPromotionId");

        const promo = selectedPromo();
        const eligibility = promo ? primaryEligibility(promo) : "all";
        window.CafePromotionClient.eligibility = eligibility;
        sessionStorage.setItem("cafeCustomerEligibility", eligibility);
        refresh();
      });
    }
  }

  function ensureKioskDiscountRow() {
    const subtotalElement = document.getElementById("subtotalAmount");
    const totalElement = document.getElementById("totalAmount");
    if (!subtotalElement || !totalElement) return null;

    let row = document.getElementById("ckKioskDiscountRow");
    if (!row) {
      row = document.createElement("div");
      row.id = "ckKioskDiscountRow";
      row.className = "summary-row ck-kiosk-discount-row";
      row.innerHTML = '<span>Discount</span><span id="ckKioskDiscountAmount">-₱0.00</span>';
      const totalRow = totalElement.closest(".summary-row");
      totalRow?.parentElement?.insertBefore(row, totalRow);
    }
    return row;
  }

  function getKioskItems() {
    try {
      if (typeof order !== "undefined" && Array.isArray(order)) return order;
    } catch (_) {}
    return [];
  }

  function refreshKioskTotals() {
    const subtotalElement = document.getElementById("subtotalAmount");
    const totalElement = document.getElementById("totalAmount");
    if (!subtotalElement || !totalElement) return;

    const items = getKioskItems();
    const subtotal = items.reduce((sum, item) => sum + line(item), 0);
    const result = quote(items, subtotal);
    window.CafePromotionClient.applied = result.promo;

    subtotalElement.textContent = `₱${result.subtotal.toFixed(2)}`;
    totalElement.textContent = `₱${result.total.toFixed(2)}`;

    const discountRow = ensureKioskDiscountRow();
    const discountAmount = document.getElementById("ckKioskDiscountAmount");
    if (discountAmount) discountAmount.textContent = `-₱${result.discount.toFixed(2)}`;
    if (discountRow) discountRow.hidden = result.discount <= 0;

    if (typeof window.updateKioskCashUI === "function") window.updateKioskCashUI();
  }

  function refresh() {
    if (typeof calculateCart === "function" && typeof updateCartTotals === "function") {
      try { updateCartTotals(); } catch (_) {}
    }
    refreshKioskTotals();
  }

  function wrapPos() {
    try {
      if (typeof calculateCart !== "function" || calculateCart.__ckPromo) return;
      const original = calculateCart;
      const wrapped = function () {
        const totals = original.apply(this, arguments) || {};
        const subtotal = n(totals.subtotal);
        let items = [];
        try { items = Array.isArray(cart) ? cart : []; } catch (_) {}

        const result = quote(items, subtotal);
        window.CafePromotionClient.applied = result.promo;
        return {
          ...totals,
          discount: result.discount,
          total: result.total
        };
      };
      wrapped.__ckPromo = true;
      calculateCart = wrapped;
    } catch (error) {
      console.warn(error);
    }
  }

  function wrapKioskRender() {
    try {
      if (typeof renderOrder !== "function" || renderOrder.__ckPromo) return;
      const original = renderOrder;
      const wrapped = function () {
        const result = original.apply(this, arguments);
        refreshKioskTotals();
        return result;
      };
      wrapped.__ckPromo = true;
      renderOrder = wrapped;
    } catch (error) {
      console.warn(error);
    }
  }

  function enrichItems(payload) {
    const config = window.CafeMenuConfig?.config || { products: {} };
    for (const item of payload.items || []) {
      const key = `${catKey(item.category)}::${norm(item.name || item.productName)}`;
      const productConfig =
        config.products?.[key] ||
        Object.values(config.products || {}).find(
          candidate => norm(candidate.productName) === norm(item.name || item.productName)
        );
      if (!productConfig) continue;

      let multiplier = 1;
      const customizations = (item.customizations || []).map(entry =>
        String(typeof entry === "object" ? (entry.label ?? entry.value ?? entry.name ?? "") : entry)
      );

      for (const size of productConfig.sizes || []) {
        if (customizations.some(text => norm(text).includes(norm(size.label)))) {
          multiplier = n(size.multiplier) || 1;
          break;
        }
      }

      item.ingredientUsage = (productConfig.ingredients || [])
        .filter(ingredient => {
          if (String(ingredient.mode || "required").toLowerCase() !== "option") return true;
          const optionName = norm(ingredient.optionValue || "");
          return optionName && customizations.some(text => norm(text).includes(optionName));
        })
        .map(ingredient => ({
          name: ingredient.name,
          amount:
            n(ingredient.amount) *
            (ingredient.scaleWithSize === false ? 1 : multiplier) *
            qty(item),
          unit: ingredient.unit || ""
        }));
    }
  }

  function wrapFetch() {
    if (window.fetch.__ckPromotionWrapped) return;
    const originalFetch = window.fetch.bind(window);

    const wrapped = async function (input, options = {}) {
      try {
        const url = typeof input === "string" ? input : input?.url || "";
        if (
          /\/api\/orders(?:\?|$)/.test(url) &&
          String(options.method || "GET").toUpperCase() === "POST" &&
          typeof options.body === "string"
        ) {
          const payload = JSON.parse(options.body);
          enrichItems(payload);

          const subtotal =
            n(payload.subtotal) ||
            (payload.items || []).reduce((sum, item) => sum + line(item), 0);

          const result = quote(payload.items || [], subtotal);
          const source = norm(payload.source);

          if (source === "pos") {
            const promo = result.promo;
            payload.customerEligibility = promo ? primaryEligibility(promo) : "all";
            payload.subtotal = result.subtotal;
            payload.discountAmount = result.discount;
            payload.total = result.total;

            if (promo) {
              payload.promotionId = promo.id;
              payload.promotionName = promo.name;
              payload.promotionType = promo.type;
            } else {
              delete payload.promotionId;
              delete payload.promotionName;
              delete payload.promotionType;
            }
          } else {
            payload.customerEligibility = window.CafePromotionClient.eligibility || "all";
            if (result.promo) {
              window.CafePromotionClient.applied = result.promo;
              payload.promotionName = result.promo.name;
              payload.promotionId = result.promo.id;
              payload.subtotal = result.subtotal;
              payload.discountAmount = result.discount;
              payload.total = result.total;
            }
          }

          options = { ...options, body: JSON.stringify(payload) };
        }
      } catch (_) {
        // Promotion enrichment should never prevent the order request itself.
      }
      return originalFetch(input, options);
    };

    wrapped.__ckPromotionWrapped = true;
    window.fetch = wrapped;
  }

  async function fetchPromotions() {
    const response = await fetch(
      `${api()}/api/promotions/active?cafeId=${encodeURIComponent(CAFE_ID)}`,
      { cache: "no-store" }
    );
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    promos = Array.isArray(payload.promotions) ? payload.promotions : [];
    window.CafePromotionClient.promos = promos;
    populateDiscountSelect();
    refresh();
  }

  async function load() {
    populateDiscountSelect();
    try { await fetchPromotions(); } catch (_) {}
    wrapPos();
    wrapKioskRender();
    refresh();
  }

  wrapFetch();

  document.addEventListener("DOMContentLoaded", load);

  // If an Admin adds/edits/deactivates a promotion while POS is already open,
  // refresh the dropdown when the cashier returns to this tab.
  window.addEventListener("focus", () => {
    if (document.readyState === "loading") return;
    fetchPromotions().catch(() => {});
  });
})();
