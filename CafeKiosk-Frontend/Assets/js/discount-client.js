(() => {
  "use strict";

  const CAFE_ID =
    String(
      localStorage.getItem("cafeId") ||
      "cafe-1"
    ).trim() || "cafe-1";

  let promos = [];

  window.CafePromotionClient = {
    promos,
    eligibility:
      sessionStorage.getItem(
        "cafeCustomerEligibility"
      ) || "all",
    applied: null,
    quote: () => ({
      subtotal: 0,
      discount: 0,
      total: 0,
      promo: null
    })
  };

  const api = () => {
    if (location.protocol === "http:" || location.protocol === "https:") {
      const port = location.port;
      if (!port || port === "80" || port === "443" || port === "5000") return location.origin;
      return `${location.protocol}//${location.hostname}:5000`;
    }
    const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
    if (saved) return saved.replace(/\/$/, "");
    return "http://127.0.0.1:5000";
  };

  function n(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed)
      ? parsed
      : 0;
  }

  function qty(item) {
    return Math.max(
      1,
      n(
        item.qty ??
        item.quantity ??
        1
      )
    );
  }

  function line(item) {
    const stored =
      n(
        item.subtotal ??
        item.total
      );

    if (stored > 0) {
      return stored;
    }

    return (
      n(
        item.price ??
        item.unitPrice
      ) +
      n(item.customizationCost)
    ) * qty(item);
  }

  function norm(value) {
    return String(value || "")
      .trim()
      .toLowerCase();
  }

  function catKey(value) {
    const key =
      norm(value)
        .replace(/[_\s]+/g, "-")
        .replace(/-+/g, "-");

    if (["coffee", "coffees"].includes(key)) {
      return "coffee";
    }

    if (
      [
        "non-coffee",
        "non-coffees",
        "noncoffee",
        "noncoffees"
      ].includes(key)
    ) {
      return "non-coffee";
    }

    if (
      [
        "milk-tea",
        "milktea",
        "milk-teas",
        "milkteas"
      ].includes(key)
    ) {
      return "milk-tea";
    }

    if (["food", "foods"].includes(key)) {
      return "foods";
    }

    if (["snack", "snacks"].includes(key)) {
      return "snacks";
    }

    if (["dessert", "desserts"].includes(key)) {
      return "dessert";
    }

    return key;
  }

  function validNow(promo) {
    const now = new Date();

    if (promo.startDate) {
      const start =
        new Date(
          `${promo.startDate}T00:00:00`
        );

      if (
        !Number.isNaN(start.getTime()) &&
        now < start
      ) {
        return false;
      }
    }

    if (promo.endDate) {
      const end =
        new Date(
          `${promo.endDate}T23:59:59.999`
        );

      if (
        !Number.isNaN(end.getTime()) &&
        now > end
      ) {
        return false;
      }
    }

    const currentTime =
      now.toTimeString().slice(0, 5);

    const startTime =
      String(promo.startTime || "");

    const endTime =
      String(promo.endTime || "");

    if (
      startTime &&
      endTime &&
      startTime > endTime
    ) {
      if (
        !(
          currentTime >= startTime ||
          currentTime <= endTime
        )
      ) {
        return false;
      }
    } else {
      if (
        startTime &&
        currentTime < startTime
      ) {
        return false;
      }

      if (
        endTime &&
        currentTime > endTime
      ) {
        return false;
      }
    }

    return true;
  }

  function eligible(promo) {
    const eligibility =
      window.CafePromotionClient.eligibility;

    const allowed =
      (promo.eligibility || ["all"])
        .map(norm);

    return (
      validNow(promo) &&
      (
        allowed.includes("all") ||
        allowed.includes(
          norm(eligibility)
        )
      )
    );
  }

  function promotionBase(
    promo,
    items,
    subtotal
  ) {
    if (promo.scope === "category") {
      const categories =
        (promo.categories || [])
          .map(catKey);

      return items.reduce(
        (sum, item) =>
          sum +
          (
            categories.includes(
              catKey(item.category)
            )
              ? line(item)
              : 0
          ),
        0
      );
    }

    if (promo.scope === "products") {
      const products =
        (promo.productNames || [])
          .map(norm);

      return items.reduce(
        (sum, item) =>
          sum +
          (
            products.includes(
              norm(
                item.name ||
                item.productName
              )
            )
              ? line(item)
              : 0
          ),
        0
      );
    }

    return subtotal;
  }

  function best(items, subtotal) {
    let winner = null;

    for (const promo of promos) {
      if (
        !promo.active ||
        !eligible(promo) ||
        subtotal < n(promo.minimumSubtotal)
      ) {
        continue;
      }

      const base =
        promotionBase(
          promo,
          items,
          subtotal
        );

      if (base <= 0) {
        continue;
      }

      let discount =
        promo.type === "fixed"
          ? n(promo.value)
          : base *
            Math.min(
              100,
              n(promo.value)
            ) /
            100;

      discount =
        Math.max(
          0,
          Math.min(
            subtotal,
            discount
          )
        );

      if (
        !winner ||
        discount > winner.discount
      ) {
        winner = {
          promo,
          discount
        };
      }
    }

    return winner;
  }

  function quote(items, subtotalValue) {
    const cleanItems =
      Array.isArray(items)
        ? items
        : [];

    const subtotal =
      Math.max(
        0,
        Number.isFinite(
          Number(subtotalValue)
        )
          ? Number(subtotalValue)
          : cleanItems.reduce(
              (sum, item) =>
                sum + line(item),
              0
            )
      );

    const hit =
      best(
        cleanItems,
        subtotal
      );

    const discount =
      hit
        ? Math.max(
            0,
            Math.min(
              subtotal,
              hit.discount
            )
          )
        : 0;

    return {
      subtotal,
      discount,
      total:
        Math.max(
          0,
          subtotal - discount
        ),
      promo:
        hit?.promo || null
    };
  }

  window.CafePromotionClient.quote =
    quote;

  function locateEligibilityInsertPoint() {
    const payment =
      document.getElementById(
        "paymentMethod"
      );

    if (payment) {
      const fields =
        payment.closest(
          ".bottom-fields"
        );

      if (fields) {
        const label =
          fields.querySelector(
            'label[for="paymentMethod"]'
          );

        return {
          parent: fields,
          before: label || payment
        };
      }
    }

    const bottom =
      document.querySelector(
        ".order-bottom"
      );

    const bottomFields =
      bottom?.querySelector(
        ".bottom-fields"
      );

    if (bottom && bottomFields) {
      return {
        parent: bottom,
        before: bottomFields
      };
    }

    const fallback =
      document.querySelector(
        ".order-summary, .cart-summary, .summary-panel, .checkout-summary, .payment-panel, #orderSummary, #cartSummary"
      );

    return fallback
      ? {
          parent: fallback,
          before: null
        }
      : null;
  }

  function addEligibilityUI() {
    if (
      document.getElementById(
        "ckPromoClient"
      )
    ) {
      return;
    }

    const point =
      locateEligibilityInsertPoint();

    if (!point) {
      return;
    }

    const box =
      document.createElement("div");

    box.id =
      "ckPromoClient";

    box.className =
      "ck-promo-client";

    box.innerHTML = `
      <label for="ckEligibility">Discount</label>
      <select id="ckEligibility">
        <option value="all">No Discount</option>
        <option value="student">Student Discount</option>
        <option value="senior">Senior Citizen Discount</option>
        <option value="pwd">PWD Discount</option>
      </select>
      <div id="ckPromoNote" class="ck-promo-note">
        The matching active discount rule will be applied automatically.
      </div>
    `;

    point.parent.insertBefore(
      box,
      point.before || null
    );

    const select =
      box.querySelector("select");

    select.value =
      window.CafePromotionClient.eligibility;

    select.addEventListener(
      "change",
      () => {
        window.CafePromotionClient.eligibility =
          select.value;

        sessionStorage.setItem(
          "cafeCustomerEligibility",
          select.value
        );

        refresh();
      }
    );
  }

  function ensureKioskDiscountRow() {
    const subtotalElement =
      document.getElementById(
        "subtotalAmount"
      );

    const totalElement =
      document.getElementById(
        "totalAmount"
      );

    if (
      !subtotalElement ||
      !totalElement
    ) {
      return null;
    }

    let row =
      document.getElementById(
        "ckKioskDiscountRow"
      );

    if (!row) {
      row =
        document.createElement("div");

      row.id =
        "ckKioskDiscountRow";

      row.className =
        "summary-row ck-kiosk-discount-row";

      row.innerHTML = `
        <span>Discount</span>
        <span id="ckKioskDiscountAmount">-₱0.00</span>
      `;

      const totalRow =
        totalElement.closest(
          ".summary-row"
        );

      totalRow?.parentElement?.insertBefore(
        row,
        totalRow
      );
    }

    return row;
  }

  function getKioskItems() {
    try {
      if (
        typeof order !== "undefined" &&
        Array.isArray(order)
      ) {
        return order;
      }
    } catch (_) {
      // Ignore scope lookup errors.
    }

    return [];
  }

  function refreshKioskTotals() {
    const subtotalElement =
      document.getElementById(
        "subtotalAmount"
      );

    const totalElement =
      document.getElementById(
        "totalAmount"
      );

    if (
      !subtotalElement ||
      !totalElement
    ) {
      return;
    }

    const items =
      getKioskItems();

    const subtotal =
      items.reduce(
        (sum, item) =>
          sum + line(item),
        0
      );

    const result =
      quote(
        items,
        subtotal
      );

    window.CafePromotionClient.applied =
      result.promo;

    subtotalElement.textContent =
      `₱${result.subtotal.toFixed(2)}`;

    totalElement.textContent =
      `₱${result.total.toFixed(2)}`;

    const discountRow =
      ensureKioskDiscountRow();

    const discountAmount =
      document.getElementById(
        "ckKioskDiscountAmount"
      );

    if (discountAmount) {
      discountAmount.textContent =
        `-₱${result.discount.toFixed(2)}`;
    }

    if (discountRow) {
      discountRow.hidden =
        result.discount <= 0;
    }

    if (
      typeof window.updateKioskCashUI ===
      "function"
    ) {
      window.updateKioskCashUI();
    }
  }

  function refresh() {
    if (
      typeof calculateCart === "function" &&
      typeof updateCartTotals === "function"
    ) {
      try {
        updateCartTotals();
      } catch (_) {
        // Keep page usable even if a legacy total function fails.
      }
    }

    refreshKioskTotals();

    const note =
      document.getElementById(
        "ckPromoNote"
      );

    if (note) {
      const active =
        promos.filter(eligible);

      note.textContent =
        active.length
          ? `${active.length} active discount rule${active.length > 1 ? "s" : ""} available. Best applicable discount is applied.`
          : "No active discount is available for the selected option.";
    }
  }

  function wrapPos() {
    try {
      if (
        typeof calculateCart !== "function" ||
        calculateCart.__ckPromo
      ) {
        return;
      }

      const original =
        calculateCart;

      const wrapped =
        function () {
          const totals =
            original.apply(
              this,
              arguments
            ) || {};

          const subtotal =
            n(totals.subtotal);

          let items = [];

          try {
            items =
              Array.isArray(cart)
                ? cart
                : [];
          } catch (_) {
            items = [];
          }

          const result =
            quote(
              items,
              subtotal
            );

          if (
            result.discount >
            n(totals.discount)
          ) {
            window.CafePromotionClient.applied =
              result.promo;

            return {
              ...totals,
              discount:
                result.discount,
              total:
                result.total
            };
          }

          window.CafePromotionClient.applied =
            null;

          return totals;
        };

      wrapped.__ckPromo =
        true;

      calculateCart =
        wrapped;
    } catch (error) {
      console.warn(error);
    }
  }

  function wrapKioskRender() {
    try {
      if (
        typeof renderOrder !== "function" ||
        renderOrder.__ckPromo
      ) {
        return;
      }

      const original =
        renderOrder;

      const wrapped =
        function () {
          const result =
            original.apply(
              this,
              arguments
            );

          refreshKioskTotals();

          return result;
        };

      wrapped.__ckPromo =
        true;

      renderOrder =
        wrapped;
    } catch (error) {
      console.warn(error);
    }
  }

  function enrichItems(payload) {
    const config =
      window.CafeMenuConfig?.config ||
      { products: {} };

    for (const item of payload.items || []) {
      const key =
        `${catKey(item.category)}::${norm(item.name || item.productName)}`;

      const productConfig =
        config.products?.[key] ||
        Object.values(
          config.products || {}
        ).find(
          candidate =>
            norm(candidate.productName) ===
            norm(
              item.name ||
              item.productName
            )
        );

      if (!productConfig) {
        continue;
      }

      let multiplier = 1;

      const customizations =
        (item.customizations || [])
          .map(
            entry =>
              String(
                typeof entry === "object"
                  ? (
                      entry.label ??
                      entry.value ??
                      entry.name ??
                      ""
                    )
                  : entry
              )
          );

      for (
        const size of
        productConfig.sizes || []
      ) {
        if (
          customizations.some(
            text =>
              norm(text).includes(
                norm(size.label)
              )
          )
        ) {
          multiplier =
            n(size.multiplier) || 1;
          break;
        }
      }

      item.ingredientUsage =
        (productConfig.ingredients || [])
          .filter(ingredient => {
            if (String(ingredient.mode || "required").toLowerCase() !== "option") {
              return true;
            }

            const optionName = norm(ingredient.optionValue || "");
            if (!optionName) return false;

            return customizations.some(text =>
              norm(text).includes(optionName)
            );
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
    if (
      window.fetch.__ckPromotionWrapped
    ) {
      return;
    }

    const originalFetch =
      window.fetch.bind(window);

    const wrapped =
      async function (
        input,
        options = {}
      ) {
        try {
          const url =
            typeof input === "string"
              ? input
              : input?.url || "";

          if (
            /\/api\/orders(?:\?|$)/.test(url) &&
            String(
              options.method || "GET"
            ).toUpperCase() === "POST" &&
            typeof options.body === "string"
          ) {
            const payload =
              JSON.parse(
                options.body
              );

            payload.customerEligibility =
              window.CafePromotionClient.eligibility ||
              "all";

            enrichItems(payload);

            const subtotal =
              n(payload.subtotal) ||
              (payload.items || [])
                .reduce(
                  (sum, item) =>
                    sum + line(item),
                  0
                );

            const result =
              quote(
                payload.items || [],
                subtotal
              );

            if (result.promo) {
              window.CafePromotionClient.applied =
                result.promo;

              payload.promotionName =
                result.promo.name;

              payload.promotionId =
                result.promo.id;

              payload.subtotal =
                result.subtotal;

              payload.discountAmount =
                result.discount;

              payload.total =
                result.total;
            }

            options = {
              ...options,
              body:
                JSON.stringify(
                  payload
                )
            };
          }
        } catch (_) {
          // Do not block the order if promotion enrichment fails.
        }

        return originalFetch(
          input,
          options
        );
      };

    wrapped.__ckPromotionWrapped =
      true;

    window.fetch =
      wrapped;
  }

  async function load() {
    addEligibilityUI();

    try {
      const response =
        await fetch(
          `${api()}/api/promotions/active?cafeId=${encodeURIComponent(CAFE_ID)}`,
          { cache: "no-store" }
        );

      if (response.ok) {
        const payload =
          await response.json();

        promos =
          Array.isArray(
            payload.promotions
          )
            ? payload.promotions
            : [];

        window.CafePromotionClient.promos =
          promos;
      }
    } catch (_) {
      // Promotion API can be unavailable while the kiosk still remains usable.
    }

    wrapPos();
    wrapKioskRender();
    refresh();
  }

  wrapFetch();

  document.addEventListener(
    "DOMContentLoaded",
    load
  );
})();
