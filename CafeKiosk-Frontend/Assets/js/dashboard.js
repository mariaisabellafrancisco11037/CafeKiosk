// ============================================================
// CAFEKIOSK ADMIN DASHBOARD
// ORDER-PAGE STYLE + FIXED LIVE CONNECTION
//
// IMPORTANT:
// - No mock data.
// - Orders come from GET /api/orders.
// - The dashboard does NOT wait for Socket.IO before loading orders.
// - If the API is reachable, the dashboard shows LIVE even if
//   the socket is reconnecting because API polling continues.
// ============================================================

(() => {
  "use strict";

  const CAFE_ID =
    String(
      localStorage.getItem("cafeId") ||
      "cafe-1"
    ).trim() ||
    "cafe-1";

  localStorage.setItem(
    "cafeId",
    CAFE_ID
  );

  const ORDER_POLL_INTERVAL = 3000;
  const SYSTEM_POLL_INTERVAL = 6000;

  let orders = [];
  let apiConnected = false;
  let socketConnected = false;
  let backendConnected = false;
  let socket = null;
  let socketStarted = false;

  let orderTimer = null;
  let systemTimer = null;
  let chartResizeTimer = null;

  const $ = id =>
    document.getElementById(id);

  // ============================================================
  // BACKEND URL
  // Same behavior as the current Order Monitor.
  // This also works when the page is opened from a tablet using
  // the laptop's LAN IP address.
  // ============================================================

  function resolveBackendOrigin() {
    if (window.location.protocol === "http:" || window.location.protocol === "https:") {
      const port = window.location.port;
      if (!port || port === "80" || port === "443" || port === "5000") return window.location.origin;
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    }
    const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
    if (saved) return saved.replace(/\/$/, "");
    return "http://127.0.0.1:5000";
  }

  const API_URL =
    resolveBackendOrigin();

  // ============================================================
  // AUTH
  // ============================================================

  function getAuthToken() {
    return (
      window.CafeAuth?.token ||
      localStorage.getItem(
        "cafeAdminAuthToken"
      ) ||
      sessionStorage.getItem(
        "cafeAuthToken"
      ) ||
      ""
    );
  }

  async function authenticatedFetch(
    url,
    options = {}
  ) {
    if (
      window.CafeAuth?.apiFetch
    ) {
      return window.CafeAuth.apiFetch(
        url,
        options
      );
    }

    const headers =
      new Headers(
        options.headers ||
        {}
      );

    const token =
      getAuthToken();

    if (token) {
      headers.set(
        "Authorization",
        `Bearer ${token}`
      );
    }

    return fetch(
      url,
      {
        ...options,
        credentials:
          "include",
        headers
      }
    );
  }

  // ============================================================
  // CONNECTION INDICATOR
  // ============================================================

  function setDot(
    id,
    state
  ) {
    const dot = $(id);

    if (!dot) {
      return;
    }

    dot.classList.remove(
      "online",
      "offline",
      "syncing"
    );

    if (state) {
      dot.classList.add(
        state
      );
    }
  }

  function updateConnectionIndicator() {
    const label =
      $("connectionLabel");

    if (apiConnected) {
      // Important:
      // API success means orders are actually being received.
      // Do not leave the page saying "Connecting..." just because
      // WebSocket is still reconnecting.
      setDot(
        "connectionDot",
        "online"
      );

      label.textContent =
        socketConnected
          ? "Live"
          : "Live · API Sync";

      return;
    }

    if (backendConnected) {
      setDot(
        "connectionDot",
        "syncing"
      );

      label.textContent =
        "Backend Online";

      return;
    }

    setDot(
      "connectionDot",
      "offline"
    );

    label.textContent =
      "Server Offline";
  }

  // ============================================================
  // ORDER NORMALIZATION
  // ============================================================

  function normalizeStatus(
    value
  ) {
    const status =
      String(
        value ||
        "Pending"
      )
        .trim()
        .toUpperCase();

    if (
      status === "ACCEPTED" ||
      status === "READY"
    ) {
      return "PREPARING";
    }

    if (
      status.includes(
        "COMPLETE"
      )
    ) {
      return "COMPLETED";
    }

    if (
      status.includes(
        "PREPAR"
      )
    ) {
      return "PREPARING";
    }

    if (
      status.includes(
        "CANCEL"
      ) ||
      status.includes(
        "VOID"
      )
    ) {
      return "CANCELLED";
    }

    if (
      status.includes(
        "REFUND"
      )
    ) {
      return "REFUNDED";
    }

    return "PENDING";
  }

  function formatSource(
    value
  ) {
    const source =
      String(
        value ||
        "POS"
      ).toLowerCase();

    return source.includes(
      "kiosk"
    )
      ? "Kiosk"
      : "POS";
  }

  function numberValue(
    value
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(
      parsed
    )
      ? parsed
      : 0;
  }

  function itemQty(
    item
  ) {
    return Math.max(
      1,
      numberValue(
        item.qty ??
        item.quantity ??
        1
      )
    );
  }

  function itemTotal(
    item
  ) {
    const direct =
      numberValue(
        item.subtotal ??
        item.total
      );

    if (direct > 0) {
      return direct;
    }

    const price =
      numberValue(
        item.unitPrice ??
        item.price
      );

    const extra =
      numberValue(
        item.customizationCost
      );

    return (
      (price + extra) *
      itemQty(item)
    );
  }

  function orderTotal(
    order,
    items
  ) {
    const direct =
      numberValue(
        order.total
      );

    if (direct > 0) {
      return direct;
    }

    const subtotal =
      numberValue(
        order.subtotal
      );

    if (subtotal > 0) {
      return Math.max(
        0,
        subtotal -
          numberValue(
            order.discountAmount ??
            order.discount
          )
      );
    }

    return items.reduce(
      (
        total,
        item
      ) =>
        total +
        itemTotal(item),
      0
    );
  }

  function normalizeDate(
    value
  ) {
    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  function convertOrder(
    raw,
    index = 0
  ) {
    const items =
      Array.isArray(
        raw.items
      )
        ? raw.items
        : Array.isArray(
            raw.orderItems
          )
          ? raw.orderItems
          : [];

    const source =
      formatSource(
        raw.source
      );

    const createdAt =
      raw.createdAt ??
      raw.created_at ??
      raw.timestamp ??
      raw.date ??
      "";

    return {
      ...raw,

      backendId:
        raw.id ??
        raw.apiId ??
        raw.orderId ??
        raw.orderNumber,

      id:
        String(
          raw.orderNumber ??
          raw.orderId ??
          raw.id ??
          `order-${index + 1}`
        ),

      customer:
        raw.customerName ??
        raw.customer ??
        raw.name ??
        (
          source === "Kiosk"
            ? "Kiosk Customer"
            : "Walk-in Customer"
        ),

      source,

      status:
        normalizeStatus(
          raw.status
        ),

      createdAt,

      dateObject:
        normalizeDate(
          createdAt
        ),

      total:
        orderTotal(
          raw,
          items
        ),

      items
    };
  }

  function parseOrderPayload(
    payload
  ) {
    const list =
      Array.isArray(
        payload
      )
        ? payload
        : Array.isArray(
            payload?.orders
          )
          ? payload.orders
          : Array.isArray(
              payload?.data
            )
            ? payload.data
            : [];

    return list
      .map(
        convertOrder
      )
      .filter(
        order =>
          order.source === "POS" ||
          order.source === "Kiosk"
      )
      .sort(
        (
          a,
          b
        ) =>
          (
            b.dateObject?.getTime() ||
            0
          ) -
          (
            a.dateObject?.getTime() ||
            0
          )
      );
  }

  // ============================================================
  // FORMATTERS
  // ============================================================

  function peso(
    value
  ) {
    return new Intl.NumberFormat(
      "en-PH",
      {
        style: "currency",
        currency: "PHP",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    ).format(
      numberValue(
        value
      )
    );
  }

  function compactPeso(
    value
  ) {
    const amount =
      numberValue(
        value
      );

    if (
      Math.abs(amount) >=
      1000000
    ) {
      return (
        "₱" +
        (
          amount /
          1000000
        ).toFixed(1) +
        "M"
      );
    }

    if (
      Math.abs(amount) >=
      1000
    ) {
      return (
        "₱" +
        Math.round(
          amount /
          1000
        ) +
        "k"
      );
    }

    return (
      "₱" +
      Math.round(amount)
    );
  }

  function escapeHTML(
    value
  ) {
    return String(
      value ??
      ""
    ).replace(
      /[&<>"']/g,
      char =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        })[char]
    );
  }

  function titleCase(
    value
  ) {
    const text =
      String(
        value ||
        ""
      ).toLowerCase();

    return (
      text.charAt(0)
        .toUpperCase() +
      text.slice(1)
    );
  }

  // ============================================================
  // DATE HELPERS
  // ============================================================

  function startOfDay(
    date
  ) {
    const copy =
      new Date(date);

    copy.setHours(
      0,
      0,
      0,
      0
    );

    return copy;
  }

  function endOfDay(
    date
  ) {
    const copy =
      new Date(date);

    copy.setHours(
      23,
      59,
      59,
      999
    );

    return copy;
  }

  function addDays(
    date,
    amount
  ) {
    const copy =
      new Date(date);

    copy.setDate(
      copy.getDate() +
      amount
    );

    return copy;
  }

  function startOfWeek(
    date
  ) {
    const copy =
      startOfDay(
        date
      );

    const day =
      copy.getDay();

    const diff =
      day === 0
        ? -6
        : 1 - day;

    copy.setDate(
      copy.getDate() +
      diff
    );

    return copy;
  }

  function startOfMonth(
    date
  ) {
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1
    );
  }

  function between(
    date,
    start,
    end
  ) {
    if (!date) {
      return false;
    }

    const time =
      date.getTime();

    return (
      time >=
        start.getTime() &&
      time <=
        end.getTime()
    );
  }

  function ordersInRange(
    start,
    end
  ) {
    return orders.filter(
      order =>
        between(
          order.dateObject,
          start,
          end
        )
    );
  }

  function todayList() {
    const now =
      new Date();

    return ordersInRange(
      startOfDay(now),
      endOfDay(now)
    );
  }

  function weekList(
    offset = 0
  ) {
    const start =
      addDays(
        startOfWeek(
          new Date()
        ),
        offset * 7
      );

    return ordersInRange(
      start,
      endOfDay(
        addDays(
          start,
          6
        )
      )
    );
  }

  function monthList() {
    const now =
      new Date();

    return ordersInRange(
      startOfMonth(now),
      endOfDay(now)
    );
  }

  // ============================================================
  // STATS
  // ============================================================

  function completedOrders(
    list
  ) {
    return list.filter(
      order =>
        order.status ===
        "COMPLETED"
    );
  }

  function revenue(
    list
  ) {
    return completedOrders(
      list
    ).reduce(
      (
        total,
        order
      ) =>
        total +
        numberValue(
          order.total
        ),
      0
    );
  }

  function getProductStats() {
    const map =
      new Map();

    orders
      .filter(
        order =>
          ![
            "CANCELLED",
            "REFUNDED"
          ].includes(
            order.status
          )
      )
      .forEach(
        order => {
          order.items.forEach(
            item => {
              const name =
                String(
                  item.name ??
                  item.productName ??
                  ""
                ).trim();

              if (!name) {
                return;
              }

              const existing =
                map.get(name) ||
                {
                  name,
                  qty: 0,
                  sales: 0
                };

              existing.qty +=
                itemQty(item);

              existing.sales +=
                itemTotal(item);

              map.set(
                name,
                existing
              );
            }
          );
        }
      );

    return [
      ...map.values()
    ].sort(
      (
        a,
        b
      ) =>
        b.qty -
          a.qty ||
        b.sales -
          a.sales
    );
  }

  // ============================================================
  // RENDER SUMMARY
  // ============================================================

  function renderSummary() {
    const today =
      todayList();

    const week =
      weekList();

    const month =
      monthList();

    const posToday =
      today.filter(
        order =>
          order.source ===
          "POS"
      );

    const kioskToday =
      today.filter(
        order =>
          order.source ===
          "Kiosk"
      );

    const products =
      getProductStats();

    $("todayOrders")
      .textContent =
      today.length
        .toLocaleString();

    $("todayRevenue")
      .textContent =
      peso(
        revenue(today)
      );

    $("weeklySales")
      .textContent =
      peso(
        revenue(week)
      );

    $("topProduct")
      .textContent =
      products[0]?.name ||
      "—";

    $("posOrdersToday")
      .textContent =
      posToday.length
        .toLocaleString();

    $("kioskOrdersToday")
      .textContent =
      kioskToday.length
        .toLocaleString();

    $("pendingOrders")
      .textContent =
      orders.filter(
        order =>
          order.status ===
          "PENDING"
      ).length
        .toLocaleString();

    $("preparingOrders")
      .textContent =
      orders.filter(
        order =>
          order.status ===
          "PREPARING"
      ).length
        .toLocaleString();

    $("completedToday")
      .textContent =
      completedOrders(
        today
      ).length
        .toLocaleString();

    $("monthlyRevenue")
      .textContent =
      peso(
        revenue(month)
      );
  }

  // ============================================================
  // RECENT ORDERS - ACTUAL ORDERS RECEIVED FROM POS + KIOSK
  // ============================================================

  function statusClass(
    value
  ) {
    return normalizeStatus(
      value
    ).toLowerCase();
  }

  function displayOrderId(
    order
  ) {
    const value =
      String(
        order.id ||
        ""
      );

    if (
      value.length >
      14
    ) {
      return (
        "#" +
        value.slice(-7)
      );
    }

    return value;
  }

  function renderRecentOrders() {
    const tbody =
      $("recentOrdersBody");

    const recent =
      orders.slice(
        0,
        7
      );

    if (
      !apiConnected
    ) {
      tbody.innerHTML = `
        <tr>
          <td
            colspan="5"
            class="table-message"
          >
            Unable to load orders from the backend.
          </td>
        </tr>
      `;

      return;
    }

    if (
      recent.length ===
      0
    ) {
      tbody.innerHTML = `
        <tr>
          <td
            colspan="5"
            class="table-message"
          >
            No orders have been received from POS or Kiosk yet.
          </td>
        </tr>
      `;

      return;
    }

    tbody.innerHTML =
      recent
        .map(
          order => `
            <tr>
              <td title="${escapeHTML(order.id)}">
                ${escapeHTML(displayOrderId(order))}
              </td>

              <td title="${escapeHTML(order.customer)}">
                ${escapeHTML(order.customer)}
              </td>

              <td>
                <span class="source-badge">
                  ${escapeHTML(order.source)}
                </span>
              </td>

              <td>
                <span class="status-badge ${statusClass(order.status)}">
                  ${escapeHTML(titleCase(order.status))}
                </span>
              </td>

              <td>
                ${escapeHTML(peso(order.total))}
              </td>
            </tr>
          `
        )
        .join("");
  }

  // ============================================================
  // TOP PRODUCTS
  // ============================================================

  function renderTopProducts() {
    const container =
      $("topProductsList");

    const products =
      getProductStats()
        .slice(
          0,
          6
        );

    if (
      products.length ===
      0
    ) {
      container.innerHTML = `
        <div class="empty-state">
          No product sales data available yet.
        </div>
      `;

      return;
    }

    const max =
      Math.max(
        ...products.map(
          item =>
            item.qty
        ),
        1
      );

    container.innerHTML =
      products
        .map(
          (
            product,
            index
          ) => {
            const width =
              Math.max(
                4,
                Math.round(
                  (
                    product.qty /
                    max
                  ) *
                  100
                )
              );

            return `
              <div class="top-product-row">
                <div class="product-copy">
                  <span class="product-rank">
                    ${index + 1}.
                  </span>

                  <span
                    class="product-name"
                    title="${escapeHTML(product.name)}"
                  >
                    ${escapeHTML(product.name)}
                  </span>

                  <span class="product-qty">
                    (${product.qty})
                  </span>
                </div>

                <div class="product-bar-track">
                  <div
                    class="product-bar"
                    style="width:${width}%"
                  ></div>
                </div>
              </div>
            `;
          }
        )
        .join("");
  }

  // ============================================================
  // SALES CHART
  // ============================================================

  function weekSeries(
    offset = 0
  ) {
    const start =
      addDays(
        startOfWeek(
          new Date()
        ),
        offset * 7
      );

    const labels = [];
    const values = [];

    for (
      let index = 0;
      index < 7;
      index++
    ) {
      const day =
        addDays(
          start,
          index
        );

      labels.push(
        day.toLocaleDateString(
          "en-PH",
          {
            weekday:
              "short"
          }
        )
      );

      values.push(
        revenue(
          ordersInRange(
            startOfDay(day),
            endOfDay(day)
          )
        )
      );
    }

    return {
      labels,
      values
    };
  }

  function drawSalesChart() {
    const canvas =
      $("salesChart");

    if (!canvas) {
      return;
    }

    const bounds =
      canvas.getBoundingClientRect();

    if (
      bounds.width <= 0 ||
      bounds.height <= 0
    ) {
      return;
    }

    const ratio =
      window.devicePixelRatio ||
      1;

    canvas.width =
      Math.round(
        bounds.width *
        ratio
      );

    canvas.height =
      Math.round(
        bounds.height *
        ratio
      );

    const ctx =
      canvas.getContext(
        "2d"
      );

    ctx.setTransform(
      ratio,
      0,
      0,
      ratio,
      0,
      0
    );

    const width =
      bounds.width;

    const height =
      bounds.height;

    ctx.clearRect(
      0,
      0,
      width,
      height
    );

    const current =
      weekSeries(0);

    const previous =
      weekSeries(-1);

    const maxValue =
      Math.max(
        ...current.values,
        ...previous.values,
        1
      );

    const margin = {
      left: 48,
      right: 13,
      top: 17,
      bottom: 27
    };

    const chartWidth =
      width -
      margin.left -
      margin.right;

    const chartHeight =
      height -
      margin.top -
      margin.bottom;

    const styles =
      getComputedStyle(
        document.documentElement
      );

    const green =
      styles
        .getPropertyValue(
          "--green"
        )
        .trim() ||
      "#4f9872";

    const brown =
      styles
        .getPropertyValue(
          "--brown"
        )
        .trim() ||
      "#4b2f1b";

    const gray =
      "#aaa7a3";

    ctx.font =
      "9px Segoe UI";

    ctx.fillStyle =
      brown;

    ctx.strokeStyle =
      "rgba(75,47,27,.13)";

    ctx.lineWidth =
      1;

    for (
      let level = 0;
      level <= 4;
      level++
    ) {
      const y =
        margin.top +
        chartHeight -
        (
          level /
          4
        ) *
        chartHeight;

      ctx.beginPath();

      ctx.moveTo(
        margin.left,
        y
      );

      ctx.lineTo(
        width -
        margin.right,
        y
      );

      ctx.stroke();

      ctx.textAlign =
        "right";

      ctx.textBaseline =
        "middle";

      ctx.fillText(
        compactPeso(
          (
            maxValue /
            4
          ) *
          level
        ),
        margin.left - 7,
        y
      );
    }

    current.labels.forEach(
      (
        label,
        index
      ) => {
        const x =
          margin.left +
          (
            index /
            6
          ) *
          chartWidth;

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "top";

        ctx.fillText(
          label,
          x,
          margin.top +
            chartHeight +
            7
        );
      }
    );

    function point(
      index,
      value
    ) {
      return {
        x:
          margin.left +
          (
            index /
            6
          ) *
          chartWidth,

        y:
          margin.top +
          chartHeight -
          (
            value /
            maxValue
          ) *
          chartHeight
      };
    }

    function series(
      values,
      color
    ) {
      ctx.strokeStyle =
        color;

      ctx.fillStyle =
        color;

      ctx.lineWidth =
        2.4;

      ctx.lineJoin =
        "round";

      ctx.lineCap =
        "round";

      ctx.beginPath();

      values.forEach(
        (
          value,
          index
        ) => {
          const p =
            point(
              index,
              value
            );

          if (
            index ===
            0
          ) {
            ctx.moveTo(
              p.x,
              p.y
            );
          } else {
            ctx.lineTo(
              p.x,
              p.y
            );
          }
        }
      );

      ctx.stroke();

      values.forEach(
        (
          value,
          index
        ) => {
          const p =
            point(
              index,
              value
            );

          ctx.beginPath();

          ctx.arc(
            p.x,
            p.y,
            3.7,
            0,
            Math.PI * 2
          );

          ctx.fill();

          ctx.beginPath();

          ctx.arc(
            p.x,
            p.y,
            1.6,
            0,
            Math.PI * 2
          );

          ctx.fillStyle =
            "#fffaf2";

          ctx.fill();

          ctx.fillStyle =
            color;
        }
      );
    }

    series(
      previous.values,
      gray
    );

    series(
      current.values,
      green
    );
  }

  function renderOrders() {
    renderSummary();
    renderRecentOrders();
    renderTopProducts();
    drawSalesChart();

    $("updatedText")
      .textContent =
      "Updated " +
      new Date()
        .toLocaleTimeString(
          "en-PH",
          {
            hour:
              "numeric",
            minute:
              "2-digit",
            second:
              "2-digit"
          }
        );
  }

  // ============================================================
  // LOAD ORDERS
  //
  // This is independent from Socket.IO.
  // The Recent Orders table receives orders from the API first.
  // ============================================================

  async function loadOrders() {
    try {
      const response =
        await authenticatedFetch(
          `${API_URL}/api/orders?cafeId=${encodeURIComponent(CAFE_ID)}`,
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              Accept:
                "application/json"
            }
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          `Order API HTTP ${response.status}`
        );
      }

      const payload =
        await response.json();

      orders =
        parseOrderPayload(
          payload
        );

      apiConnected =
        true;

      backendConnected =
        true;


      hideMessage();

      updateConnectionIndicator();
      renderOrders();

      return true;

    } catch (error) {
      console.error(
        "Dashboard could not load orders:",
        error
      );

      apiConnected =
        false;

      orders =
        [];

      updateConnectionIndicator();
      renderOrders();

      showMessage(
        `Recent Orders could not load from ${API_URL}/api/orders. ` +
        `Make sure the CafeKiosk backend is running on port 5000.`
      );

      return false;
    }
  }

  // ============================================================
  // BACKEND HEALTH
  // ============================================================

  async function checkBackendHealth() {
    try {
      const response =
        await fetch(
          `${API_URL}/health`,
          {
            method:
              "GET",
            cache:
              "no-store"
          }
        );

      if (
        !response.ok
      ) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      backendConnected =
        true;


      updateConnectionIndicator();

      return true;

    } catch (error) {
      backendConnected =
        false;


      updateConnectionIndicator();

      return false;
    }
  }

  // ============================================================
  // SOCKET.IO
  //
  // Uses the same strategy as the current Order Monitor:
  // dynamically load the Socket.IO client from API_URL and join
  // the Admin + Order Queue rooms.
  // ============================================================

  function loadSocketClient() {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        if (
          typeof window.io ===
          "function"
        ) {
          resolve();
          return;
        }

        const existing =
          document.querySelector(
            "script[data-dashboard-socket-client]"
          );

        if (existing) {
          existing.addEventListener(
            "load",
            resolve,
            {
              once:
                true
            }
          );

          existing.addEventListener(
            "error",
            () =>
              reject(
                new Error(
                  "Socket.IO client failed to load."
                )
              ),
            {
              once:
                true
            }
          );

          return;
        }

        const script =
          document.createElement(
            "script"
          );

        script.src =
          `${API_URL}/socket.io/socket.io.js`;

        script.async =
          true;

        script.dataset
          .dashboardSocketClient =
          "true";

        script.onload =
          resolve;

        script.onerror =
          () =>
            reject(
              new Error(
                `Could not load Socket.IO from ${API_URL}`
              )
            );

        document.head
          .appendChild(
            script
          );
      }
    );
  }

  function bindSocketEvents(
    activeSocket
  ) {
    if (
      !activeSocket?.on
    ) {
      return;
    }

    activeSocket.on(
      "connect",
      () => {
        socketConnected =
          true;


        updateConnectionIndicator();

        activeSocket.emit(
          "join-admin",
          CAFE_ID
        );

        activeSocket.emit(
          "join-order-queue",
          CAFE_ID
        );

      }
    );

    activeSocket.on(
      "disconnect",
      () => {
        socketConnected =
          false;


        updateConnectionIndicator();
      }
    );

    if (
      activeSocket.io?.on
    ) {
      activeSocket.io.on(
        "reconnect_attempt",
        () => {
          socketConnected =
            false;


          updateConnectionIndicator();
        }
      );
    }

    activeSocket.on(
      "connect_error",
      error => {
        console.warn(
          "Dashboard socket connection error:",
          error.message
        );

        socketConnected =
          false;


        // API polling still keeps the dashboard live.
        updateConnectionIndicator();
      }
    );

    [
      "new-order",
      "order:created",
      "order-updated",
      "order:updated",
      "orders:changed"
    ].forEach(
      eventName => {
        activeSocket.on(
          eventName,
          payload => {
            if (
              payload?.cafeId &&
              String(
                payload.cafeId
              ) !==
                String(CAFE_ID)
            ) {
              return;
            }

            window.setTimeout(
              () => {
                loadOrders();
              },
              100
            );
          }
        );
      }
    );
  }

  async function startRealtimeConnection() {
    if (
      socketStarted
    ) {
      return;
    }

    socketStarted =
      true;


    try {
      // Prefer the socket already created by auth-session.js.
      if (
        window.CafeAuth?.socket
      ) {
        socket =
          window.CafeAuth.socket;

        bindSocketEvents(
          socket
        );

        if (
          socket.connected
        ) {
          socketConnected =
            true;


          socket.emit(
            "join-admin",
            CAFE_ID
          );

          socket.emit(
            "join-order-queue",
            CAFE_ID
          );

          updateConnectionIndicator();
        }

        return;
      }

      await loadSocketClient();

      socket =
        window.io(
          API_URL,
          {
            auth: {
              token:
                getAuthToken()
            },

            withCredentials:
              true,

            transports: [
              "websocket",
              "polling"
            ],

            reconnection:
              true,

            reconnectionAttempts:
              Infinity,

            reconnectionDelay:
              700,

            reconnectionDelayMax:
              5000,

            timeout:
              8000
          }
        );

      bindSocketEvents(
        socket
      );

    } catch (error) {
      console.warn(
        "Realtime could not start; API polling will continue:",
        error
      );

      socketConnected =
        false;

      socketStarted =
        false;


      updateConnectionIndicator();

      window.setTimeout(
        startRealtimeConnection,
        4000
      );
    }
  }

  // ============================================================
  // ADMIN PROFILE
  // ============================================================

  function renderAdminName() {
    let session =
      window.CafeAuth?.session ||
      null;

    if (!session) {
      try {
        session =
          JSON.parse(
            localStorage.getItem(
              "cafeAdminSession"
            ) ||
            "null"
          );
      } catch {
        session =
          null;
      }
    }

    $("adminName")
      .textContent =
      session?.displayName ||
      session?.username ||
      session?.userId ||
      "Admin";
  }

  // ============================================================
  // MESSAGE
  // ============================================================

  function showMessage(
    message
  ) {
    const box =
      $("dashboardMessage");

    box.hidden =
      false;

    box.textContent =
      message;
  }

  function hideMessage() {
    const box =
      $("dashboardMessage");

    box.hidden =
      true;

    box.textContent =
      "";
  }

  // ============================================================
  // REFRESH
  // ============================================================

  async function refreshAll() {
    $("refreshBtn")
      .disabled =
      true;

    await checkBackendHealth();

    await loadOrders();

    $("refreshBtn")
      .disabled =
      false;
  }

  // ============================================================
  // START
  // ============================================================

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      renderAdminName();

      // Load API data immediately.
      // Socket connection is NOT a requirement for the recent orders.
      refreshAll();

      window.setTimeout(
        startRealtimeConnection,
        500
      );

      $("refreshBtn")
        ?.addEventListener(
          "click",
          refreshAll
        );

      orderTimer =
        window.setInterval(
          () => {
            if (
              document.visibilityState ===
              "visible"
            ) {
              loadOrders();
            }
          },
          ORDER_POLL_INTERVAL
        );

      systemTimer =
        window.setInterval(
          () => {
            if (
              document.visibilityState ===
              "visible"
            ) {
              checkBackendHealth();
            }
          },
          SYSTEM_POLL_INTERVAL
        );
    }
  );

  window.addEventListener(
    "resize",
    () => {
      window.clearTimeout(
        chartResizeTimer
      );

      chartResizeTimer =
        window.setTimeout(
          drawSalesChart,
          120
        );
    }
  );

  window.addEventListener(
    "beforeunload",
    () => {
      if (
        orderTimer
      ) {
        window.clearInterval(
          orderTimer
        );
      }

      if (
        systemTimer
      ) {
        window.clearInterval(
          systemTimer
        );
      }
    }
  );
})();
