// ============================================================
// CAFEKIOSK - POS ORDER MONITOR / ORDER QUEUE
// Visual overhaul + Socket.IO live updates
// ============================================================

function authenticatedCafeId() {
  const candidates = [
    window.CafeAuth?.session?.cafeId,
    ...['cafeAdminSession','cafeManagerSession','cafeStaffSession'].map(key => { try { return JSON.parse(localStorage.getItem(key) || 'null')?.cafeId; } catch (_) { return ''; } }),
    localStorage.getItem('cafeId'),
    'cafe-1'
  ];
  return String(candidates.find(v => String(v || '').trim()) || 'cafe-1').trim();
}
const CAFE_ID = authenticatedCafeId();

localStorage.setItem(
  "cafeId",
  CAFE_ID
);

/*
 * Backend URL:
 * - When this page is served by Node on port 5000, use the same origin.
 * - When opened with VS Code Live Server (for example :5500), connect to
 *   the same computer/IP on port 5000.
 * - LAN/mobile access always follows the hostname used to open the page,
 *   so Wi-Fi/hotspot IP changes do not leave a stale backend address.
 */
function resolveBackendOrigin() {
  // LAN-safe rule: when the page is opened through HTTP/HTTPS, always use
  // the exact hostname the browser used (localhost on laptop, LAN IP on tablet).
  // This avoids stale localStorage IP overrides after Wi-Fi/hotspot changes.
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    const port = window.location.port;
    if (!port || port === "80" || port === "443" || port === "5000") return window.location.origin;
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
  if (saved) return saved.replace(/\/$/, "");
  return "http://127.0.0.1:5000";
}

const API_URL = resolveBackendOrigin();
const PAGE_SIZE = 6;

function getAuthToken() {
  return (
    window.CafeAuth?.token ||
    localStorage.getItem(
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

let adminApiConnected =
  false;

let adminSocketConnected =
  false;

let adminSyncTimer =
  null;

let adminSyncInFlight =
  false;

const ADMIN_SYNC_INTERVAL =
  3000;

// Realtime orders are temporarily remembered so an immediate API refresh
// cannot make a just-received POS/Kiosk order disappear while the backend
// finishes returning the latest list.
const recentRealtimeOrders =
  new Map();

const REALTIME_ORDER_TTL =
  20000;

let orders = [];
let selectedId = null;
let currentPage = 1;
let currentModalOrder = null;
let currentAction = "void";

const $ = id => document.getElementById(id);
const peso = value => `₱${Number(value || 0).toFixed(2)}`;

// ------------------------------
// STATUS + DATA HELPERS
// ------------------------------
function normalizeStatus(value) {
  const status = String(value || "Pending").trim().toUpperCase();
  if (status === "ACCEPTED" || status === "READY") return "PREPARING";
  if (status.includes("COMPLETE")) return "COMPLETED";
  if (status.includes("PREPAR")) return "PREPARING";
  if (status.includes("CANCEL") || status.includes("VOID")) return "CANCELLED";
  if (status.includes("REFUND")) return "REFUNDED";
  return "PENDING";
}


function isTerminalOrderStatus(value) {
  const status = normalizeStatus(value);
  return status === "CANCELLED" || status === "REFUNDED";
}

function statusClass(value) {
  return normalizeStatus(value).toLowerCase();
}

function formatSource(value) {
  const source = String(value || "POS").toLowerCase();
  return source.includes("kiosk") ? "Kiosk" : "POS";
}

function formatServing(value) {
  const serving = String(value || "Dine In").trim();
  if (/take\s*out/i.test(serving) || /takeout/i.test(serving)) return "Take Out";
  return "Dine In";
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function escapeAttr(value) {
  return escapeHTML(value).replace(/`/g, "&#096;");
}


function isDiagnosticTestOrder(order) {

  if (!order) {
    return false;
  }

  const orderNumber =
    String(
      order.orderNumber ??
      order.id ??
      ""
    ).trim();

  const customer =
    String(
      order.customerName ??
      order.customer ??
      ""
    ).trim();

  return (
    /^TEST-/i.test(
      orderNumber
    ) ||
    /^Order Flow Test$/i.test(
      customer
    )
  );
}

function convertItem(item) {
  const qty = Number(item.qty ?? item.quantity ?? 1) || 1;
  const basePrice = Number(item.price ?? 0) || 0;
  const customizationCost = Number(item.customizationCost ?? 0) || 0;
  const customizations = [];

  if (Array.isArray(item.customizations)) {
    item.customizations.forEach(value => {
      if (typeof value === "string") customizations.push(value);
      else if (value && typeof value === "object") customizations.push(value.label || value.name || value.value || "");
    });
  }
  if (Array.isArray(item.addons)) {
    item.addons.forEach(value => customizations.push(typeof value === "string" ? value : value?.label || value?.name || ""));
  }

  return {
    ...item,
    name: item.name || "Item",
    qty,
    price: basePrice + customizationCost,
    customizations: customizations.filter(Boolean)
  };
}

function calculateSubtotal(items) {
  return (items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
}

function convertOrder(order, index = 0) {
  const createdAt = order.createdAt || order.updatedAt || new Date().toISOString();
  const items = Array.isArray(order.items) ? order.items.map(convertItem) : [];
  const source = formatSource(order.source);
  const orderNumber = String(order.orderNumber || order.id || order.orderId || `${Date.now()}-${index}`);
  const subtotal = Number(order.subtotal ?? calculateSubtotal(items)) || 0;
  const discount = Number(order.discountAmount ?? order.discount ?? 0) || 0;
  const total = Number(order.total ?? Math.max(0, subtotal - discount)) || 0;

  return {
    id: orderNumber,
    backendId: String(order.id || order.orderId || order.orderNumber || orderNumber),
    cafeId: order.cafeId || CAFE_ID,
    customer: order.customerName || order.customer || (source === "Kiosk" ? "Kiosk #1" : "Walk-in Customer"),
    source,
    sourceLabel:
      String(order.sourceLabel || order.source_label || "").trim() ||
      (source === "Kiosk" ? "Kiosk" : "POS"),
    serving: formatServing(order.serviceType || order.serving),
    status: normalizeStatus(order.status),
    time: formatTime(createdAt),
    date: formatDate(createdAt),
    createdAt,
    subtotal,
    discount,
    total,
    promotionName: order.promotionName || order.promotion?.name || "",
    paymentMethod: order.paymentMethod || "Cash",
    paymentStatus: order.paymentStatus || "",
    items
  };
}

function upsertOrder(rawOrder) {
  const order = rawOrder?.items && rawOrder?.backendId ? rawOrder : convertOrder(rawOrder);
  if (order.cafeId && String(order.cafeId) !== String(CAFE_ID)) return;

  const index = orders.findIndex(
    item =>
      item.id === order.id ||
      item.backendId === order.backendId
  );

  if (isTerminalOrderStatus(order.status)) {
    if (index >= 0) {
      orders.splice(index, 1);
    }

    if (
      selectedId === order.id ||
      selectedId === order.backendId
    ) {
      selectedId = null;
    }

    return;
  }

  if (index >= 0) {
    orders[index] = {
      ...orders[index],
      ...order
    };
  } else {
    orders.unshift(order);
  }
}


// ============================================================
// RECEIVE ORDERS FROM BOTH POS + KIOSK
// ============================================================

function eventBelongsToThisCafe(payload) {
  if (!payload?.cafeId) {
    return true;
  }

  return (
    String(payload.cafeId).trim() ===
    String(CAFE_ID).trim()
  );
}

function rememberRealtimeOrder(rawOrder) {
  if (!rawOrder || typeof rawOrder !== "object") {
    return;
  }

  if (
    isDiagnosticTestOrder(
      rawOrder
    )
  ) {
    return;
  }

  if (!eventBelongsToThisCafe(rawOrder)) {
    console.warn(
      "Ignored realtime order for another cafe:",
      rawOrder.cafeId,
      CAFE_ID
    );
    return;
  }

  const normalized =
    rawOrder?.items &&
    rawOrder?.backendId
      ? rawOrder
      : convertOrder(rawOrder);


  if (isTerminalOrderStatus(normalized.status)) {

    const terminalKeys =
      new Set([
        String(normalized.backendId || ""),
        String(normalized.id || "")
      ].filter(Boolean));


    for (const [key, entry] of recentRealtimeOrders) {

      const entryKeys =
        [
          String(entry.order?.backendId || ""),
          String(entry.order?.id || "")
        ];

      if (
        entryKeys.some(
          value =>
            value &&
            terminalKeys.has(value)
        )
      ) {
        recentRealtimeOrders.delete(key);
      }
    }


    upsertOrder(normalized);

    renderAll();

    return;
  }


  const key =
    String(
      normalized.backendId ||
      normalized.id
    );

  recentRealtimeOrders.set(
    key,
    {
      order: normalized,
      expiresAt:
        Date.now() +
        REALTIME_ORDER_TTL
    }
  );

  upsertOrder(normalized);

  currentPage = 1;

  renderAll();
}

function mergeRecentRealtimeOrders(serverOrders) {
  const now =
    Date.now();

  const merged =
    [...serverOrders];

  for (
    const [key, entry]
    of recentRealtimeOrders
  ) {
    if (
      entry.expiresAt <=
      now
    ) {
      recentRealtimeOrders.delete(
        key
      );
      continue;
    }

    const exists =
      merged.some(
        order =>
          String(
            order.backendId ||
            order.id
          ) ===
          String(
            entry.order.backendId ||
            entry.order.id
          ) ||
          String(order.id) ===
          String(entry.order.id)
      );

    if (
      exists ||
      isTerminalOrderStatus(
        entry.order.status
      )
    ) {
      recentRealtimeOrders.delete(
        key
      );
      continue;
    }

    merged.unshift(
      entry.order
    );
  }

  return merged;
}

function scheduleMonitorSync(
  delay = 100
) {
  window.setTimeout(
    loadOrders,
    delay
  );
}

// ------------------------------
// CONNECTION
// ------------------------------
function setConnection(
  state,
  message = ""
) {

  const dot =
    $("conn-dot");

  const label =
    $("conn-label");

  if (
    !dot ||
    !label
  ) {
    return;
  }

  dot.classList.remove(
    "online",
    "offline",
    "connecting"
  );

  if (
    state ===
    "online"
  ) {

    dot.classList.add(
      "online"
    );

    dot.style.background =
      "var(--green)";

    label.textContent =
      message ||
      "Live";

    return;
  }

  if (
    state ===
    "connecting"
  ) {

    dot.classList.add(
      "connecting"
    );

    dot.style.background =
      "#e3a52f";

    label.textContent =
      message ||
      "Connecting...";

    return;
  }

  dot.classList.add(
    "offline"
  );

  dot.style.background =
    "#c96c60";

  label.textContent =
    message ||
    "Offline";
}


function updateAdminConnectionIndicator() {

  if (
    adminSocketConnected
  ) {

    setConnection(
      "online",
      "Live"
    );

    return;
  }

  if (
    adminApiConnected
  ) {

    setConnection(
      "connecting",
      "Syncing..."
    );

    return;
  }

  setConnection(
    "offline",
    "Offline"
  );
}


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
          "script[data-cafekiosk-socket-client]"
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
        .cafekioskSocketClient =
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

      document.head.appendChild(
        script
      );
    }
  );
}


let socket =
  null;

let socketEventsBound =
  false;


function joinAdminRooms() {

  if (
    !socket?.connected
  ) {
    return;
  }

  socket.emit(
    "join-admin",
    CAFE_ID
  );

  // Also listen to the order-queue room when the server allows it.
  // The Admin room remains the primary room.
  socket.emit(
    "join-order-queue",
    CAFE_ID
  );
}


function bindAdminSocketEvents(
  activeSocket
) {

  if (
    !activeSocket ||
    socketEventsBound
  ) {
    return;
  }

  socketEventsBound =
    true;

  socket =
    activeSocket;


  socket.on(
    "connect",
    () => {

      adminSocketConnected =
        true;

      console.log(
        `🟢 Admin Order Monitor connected: ${socket.id}`
      );

      joinAdminRooms();

      updateAdminConnectionIndicator();

      loadOrders();
    }
  );


  socket.on(
    "auth:ready",
    () => {

      joinAdminRooms();

      updateAdminConnectionIndicator();
    }
  );


  socket.on(
    "auth:error",
    payload => {

      console.warn(
        "Admin socket authorization:",
        payload?.message ||
        payload
      );

      if (
        String(
          payload?.message ||
          ""
        )
          .toLowerCase()
          .includes(
            "admin login required"
          )
      ) {

        setConnection(
          "offline",
          "Admin Login Required"
        );
      }
    }
  );


  socket.on(
    "disconnect",
    reason => {

      adminSocketConnected =
        false;

      console.warn(
        "🔴 Admin Order Monitor disconnected:",
        reason
      );

      setConnection(
        "connecting",
        "Reconnecting..."
      );
    }
  );


  socket.on(
    "connect_error",
    error => {

      adminSocketConnected =
        false;

      console.error(
        "Admin Socket.IO connection error:",
        error.message
      );

      updateAdminConnectionIndicator();
    }
  );


  socket.io?.on(
    "reconnect_attempt",
    () => {

      adminSocketConnected =
        false;

      setConnection(
        "connecting",
        "Reconnecting..."
      );
    }
  );


  // ----------------------------------------------------------
  // NEW ORDERS FROM BOTH SOURCES
  // ----------------------------------------------------------
  //
  // Kiosk:
  //   source = "Kiosk" / "kiosk"
  //
  // POS:
  //   source = "POS" / "pos"
  //
  // Both go through the same handler.
  socket.on(
    "new-order",
    backendOrder => {
      console.log(
        "🔔 Admin received new order:",
        backendOrder?.source,
        backendOrder
      );

      rememberRealtimeOrder(
        backendOrder
      );

      scheduleMonitorSync(
        120
      );
    }
  );


  // Compatibility event used by some backend versions.
  socket.on(
    "order:created",
    backendOrder => {
      console.log(
        "🔔 Admin received order:created:",
        backendOrder?.source,
        backendOrder
      );

      if (backendOrder) {
        rememberRealtimeOrder(
          backendOrder
        );
      }

      scheduleMonitorSync(
        120
      );
    }
  );


  socket.on(
    "order-updated",
    backendOrder => {
      if (
        backendOrder &&
        eventBelongsToThisCafe(
          backendOrder
        )
      ) {
        rememberRealtimeOrder(
          backendOrder
        );
      }

      scheduleMonitorSync(
        120
      );
    }
  );


  // Compatibility event used by some backend versions.
  socket.on(
    "order:updated",
    backendOrder => {
      if (
        backendOrder &&
        eventBelongsToThisCafe(
          backendOrder
        )
      ) {
        rememberRealtimeOrder(
          backendOrder
        );
      }

      scheduleMonitorSync(
        120
      );
    }
  );


  // Most important fallback:
  // whenever POS or Kiosk successfully changes /api/orders,
  // reload the SAME order list used by the Order Monitor.
  socket.on(
    "orders:changed",
    payload => {
      if (
        !eventBelongsToThisCafe(
          payload
        )
      ) {
        return;
      }

      console.log(
        "🔄 Admin orders changed:",
        payload?.source ||
        payload?.method ||
        "POS/Kiosk"
      );

      scheduleMonitorSync(
        100
      );
    }
  );


  if (
    socket.connected
  ) {

    adminSocketConnected =
      true;

    joinAdminRooms();

    updateAdminConnectionIndicator();
  }
}


async function startRealtimeConnection() {

  setConnection(
    "connecting",
    "Connecting..."
  );


  // Best path: reuse the JWT-authenticated socket created
  // by auth-session.js.
  if (
    window.CafeAuth?.socket
  ) {

    bindAdminSocketEvents(
      window.CafeAuth.socket
    );

    return;
  }


  try {

    await loadSocketClient();


    if (
      typeof window.io !==
      "function"
    ) {

      throw new Error(
        "Socket.IO client is unavailable."
      );
    }


    const token =
      getAuthToken();


    const ownSocket =
      window.io(
        API_URL,
        {

          auth: {
            token
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


    bindAdminSocketEvents(
      ownSocket
    );


  } catch (error) {

    console.error(
      "Admin realtime connection could not start:",
      error
    );

    adminSocketConnected =
      false;

    updateAdminConnectionIndicator();

    window.setTimeout(
      startRealtimeConnection,
      3000
    );
  }
}


async function checkBackendHealth() {

  try {

    const response =
      await authenticatedFetch(
        `${API_URL}/health`,
        {
          method:
            "GET",
          cache:
            "no-store"
        }
      );

    return response.ok;

  } catch (_) {

    return false;
  }
}


function startAdminFallbackSync() {

  if (
    adminSyncTimer
  ) {
    window.clearInterval(
      adminSyncTimer
    );
  }

  adminSyncTimer =
    window.setInterval(
      () => {

        if (
          document.visibilityState ===
          "visible"
        ) {
          loadOrders();
        }

      },
      ADMIN_SYNC_INTERVAL
    );
}


// ------------------------------
// LOAD ORDERS
// ------------------------------
async function loadOrders() {

  if (
    adminSyncInFlight
  ) {
    return;
  }

  adminSyncInFlight =
    true;

  try {

    const response =
      await authenticatedFetch(
        `${API_URL}/api/orders?cafeId=${encodeURIComponent(CAFE_ID)}`,
        {
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
        `HTTP ${response.status}`
      );
    }


    const payload =
      await response.json();


    const list =
      Array.isArray(
        payload
      )
        ? payload
        : Array.isArray(
            payload.orders
          )
          ? payload.orders
          : Array.isArray(
              payload.data
            )
            ? payload.data
            : [];


    const serverOrders =
      list
        .filter(
          order =>
            !isDiagnosticTestOrder(
              order
            )
        )
        .map(
          convertOrder
        )
        .filter(
          order =>
            order.status !==
            "CANCELLED" &&
            order.status !==
            "REFUNDED"
        )
        .sort(
          (
            a,
            b
          ) =>
            new Date(
              b.createdAt
            ) -
            new Date(
              a.createdAt
            )
        );

    orders =
      mergeRecentRealtimeOrders(
        serverOrders
      );


    if (
      selectedId &&
      !orders.some(
        order =>
          order.id ===
          selectedId
      )
    ) {

      selectedId =
        null;
    }


    adminApiConnected =
      true;

    renderAll();

    updateAdminConnectionIndicator();


  } catch (error) {

    adminApiConnected =
      false;

    console.error(
      "Unable to load Admin orders:",
      error
    );


    // Browser fallback is retained exactly for development.
    try {

      const local =
        JSON.parse(
          localStorage.getItem(
            "cafe_orders"
          ) ||
          "[]"
        );


      if (
        Array.isArray(
          local
        )
      ) {

        const localOrders =
          local
            .filter(
              order =>
                !isDiagnosticTestOrder(
                  order
                )
            )
            .map(
              convertOrder
            )
            .filter(
              order =>
                order.status !==
                "CANCELLED" &&
                order.status !==
                "REFUNDED"
            );

        orders =
          mergeRecentRealtimeOrders(
            localOrders
          );

        renderAll();
      }


    } catch (
      fallbackError
    ) {

      console.error(
        "Unable to load local Admin orders:",
        fallbackError
      );
    }


    updateAdminConnectionIndicator();


  } finally {

    adminSyncInFlight =
      false;
  }
}


// ------------------------------
// FILTERING
// ------------------------------
function getFilteredOrders() {
  const status = $("status-filter")?.value || "ALL";
  const source = $("source-filter")?.value || "ALL";
  const service = $("service-filter")?.value || "ALL";
  const time = $("time-filter")?.value || "NEWEST";
  const search = ($("search-input")?.value || "").trim().toLowerCase();

  const filtered = orders.filter(order => {
    if (status !== "ALL" && order.status !== status) return false;
    if (source !== "ALL") {
      const sourceLabel = String(order.sourceLabel || "").toUpperCase();
      if (source === "POS") {
        if (order.source.toUpperCase() !== "POS") return false;
      } else if (source === "STAFF POS" || source === "MANAGER POS" || source === "ADMIN POS") {
        if (sourceLabel !== source) return false;
      } else if (order.source.toUpperCase() !== source) {
        return false;
      }
    }
    if (service !== "ALL" && order.serving.toUpperCase() !== service) return false;

    if (search) {
      const haystack = `${order.id} ${order.customer} ${order.source} ${order.sourceLabel || ""} ${order.serving} ${order.status}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => {
    const diff = new Date(b.createdAt) - new Date(a.createdAt);
    return time === "OLDEST" ? -diff : diff;
  });
}

function updateCounts() {
  $("count-pending").textContent = orders.filter(order => order.status === "PENDING").length;
  $("count-preparing").textContent = orders.filter(order => order.status === "PREPARING").length;
  $("count-completed").textContent = orders.filter(order => order.status === "COMPLETED").length;

  const currentStatus = $("status-filter")?.value || "ALL";
  document.querySelectorAll("[data-status-tab]").forEach(button => {
    const active =
      currentStatus ===
      button.dataset.statusTab;

    button.classList.toggle(
      "active-filter",
      active
    );

    button.classList.toggle(
      "active",
      active
    );
  });
}

// ------------------------------
// TABLE + PAGINATION
// ------------------------------
function renderTable() {
  const tbody = $("order-tbody");
  if (!tbody) return;

  const filtered = getFilteredOrders();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if (currentPage > totalPages) currentPage = totalPages;
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(start, start + PAGE_SIZE);

  if (!pageRows.length) {
    tbody.innerHTML = `<tr class="empty-row"><td colspan="7">No orders match your filters.</td></tr>`;
    renderPagination(totalPages);
    return;
  }

  tbody.innerHTML = pageRows.map(order => `
    <tr>
      <td class="order-id-cell">#${escapeHTML(order.id)}</td>
      <td>${escapeHTML(order.customer)}</td>
      <td>${escapeHTML(order.time)}</td>
      <td>${escapeHTML(order.sourceLabel || order.source)}</td>
      <td>${escapeHTML(order.serving)}</td>
      <td>
        <button type="button" class="status-pill ${statusClass(order.status)}" data-status-cycle="${escapeAttr(order.id)}">
          ${escapeHTML(order.status)}
        </button>
      </td>
      <td>
        <div class="action-cell">
          <button type="button" class="view-btn" data-view="${escapeAttr(order.id)}">View</button>
          <button type="button" class="void-btn" data-void="${escapeAttr(order.id)}" aria-label="Void or refund Order ${escapeAttr(order.id)}"><span>×</span></button>
        </div>
      </td>
    </tr>
  `).join("");

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const pagination = $("pagination");
  if (!pagination) return;

  const maxButtons = Math.min(totalPages, 3);
  let buttons = "";
  for (let page = 1; page <= maxButtons; page++) {
    buttons += `<button type="button" class="page-btn ${page === currentPage ? "active" : ""}" data-page="${page}">${page}</button>`;
  }
  buttons += `<button type="button" class="next-btn" data-next ${currentPage >= totalPages ? "disabled" : ""}>Next</button>`;
  pagination.innerHTML = buttons;
}

// ------------------------------
// ORDER DETAILS
// ------------------------------
function getSelectedOrder() {
  return orders.find(order => order.id === selectedId) || null;
}

function renderDetail() {

  const card =
    $("detail-card");

  if (!card) {
    return;
  }


  const order =
    getSelectedOrder();


  if (!order) {

    card.innerHTML =
      `
        <div class="empty-order-detail">
          Select an order to view its details.
        </div>
      `;

    return;
  }


  const itemsHTML =
    order.items
      .map(
        item => {

          const custom =
            item.customizations?.length
              ? `
                  <div class="detail-customizations">
                    ${
                      item.customizations
                        .map(
                          value =>
                            `-${escapeHTML(value)}`
                        )
                        .join(
                          "<br>"
                        )
                    }
                  </div>
                `
              : "";


          return `
            <div class="detail-item">
              <div class="detail-item-title">
                ${escapeHTML(item.name)} x ${item.qty}
              </div>

              ${custom}
            </div>
          `;

        }
      )
      .join(
        ""
      );


  card.innerHTML =
    `
      <div class="order-detail-content">

        <div class="detail-title">
          Order #${escapeHTML(order.id)}
        </div>


        <div class="detail-info">

          <div class="detail-row">
            <strong>
              Customer:
            </strong>

            <span>
              ${escapeHTML(order.customer)}
            </span>
          </div>


          <div class="detail-row">
            <strong>
              Source:
            </strong>

            <span>
              ${escapeHTML(order.sourceLabel)}
            </span>
          </div>


          <div class="detail-row">
            <strong>
              Time:
            </strong>

            <span>
              ${escapeHTML(order.time)}
            </span>
          </div>


          <div class="detail-row">
            <strong>
              Status:
            </strong>

            <span
              class="detail-status ${statusClass(order.status)}"
            >
              ${escapeHTML(titleCase(order.status))}
            </span>
          </div>

        </div>


        <div class="detail-items">

          <strong class="items-label">
            Item:
          </strong>

          ${
            itemsHTML ||
            `
              <div class="detail-item">
                No items.
              </div>
            `
          }

        </div>


        <div class="detail-total">
          Total:
          <strong>
            ${peso(order.total)}
          </strong>
        </div>


        <div class="detail-actions">

          <button
            type="button"
            class="detail-btn light"
            id="detail-update"
          >
            Update Status
          </button>


          <button
            type="button"
            class="detail-btn green"
            id="detail-close"
          >
            Close
          </button>

        </div>

      </div>
    `;
}


function titleCase(value) {
  const text = String(value || "").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ------------------------------
// STATUS UPDATE
// ------------------------------
function nextStatus(status) {
  const current = normalizeStatus(status);
  return current === "COMPLETED" ? "COMPLETED" : "COMPLETED";
}

async function updateBackendStatus(order, status) {
  const response = await authenticatedFetch(`${API_URL}/api/orders/${encodeURIComponent(order.backendId || order.id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: titleCase(status) })
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${response.status}`);
  }
  return response.json().catch(() => ({}));
}


async function patchBackendOrder(
  order,
  patch
) {

  const identifier =
    order.backendId ||
    order.id;


  const response =
    await authenticatedFetch(
      `${API_URL}/api/orders/${encodeURIComponent(identifier)}`,
      {
        method:
          "PATCH",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body:
          JSON.stringify(
            patch
          )
      }
    );


  if (!response.ok) {

    const body =
      await response
        .json()
        .catch(
          () => ({})
        );


    throw new Error(
      body.message ||
      `HTTP ${response.status}`
    );
  }


  return response
    .json()
    .catch(
      () => ({})
    );
}



async function cycleOrderStatus(id) {
  const order = orders.find(item => item.id === id);
  if (!order) return;
  const next = nextStatus(order.status);
  if (next === order.status) return;
  const previous = order.status;
  order.status = next;
  renderAll();
  try {
    const updated = await updateBackendStatus(order, next);
    if (updated?.order) upsertOrder(updated.order);
    renderAll();
  } catch (error) {
    order.status = previous;
    renderAll();
    console.error(error);
    alert("Unable to update order status.");
  }
}

// ------------------------------
// VOID / REFUND MODAL
// ------------------------------
function setActionType(type) {
  currentAction = type === "refund" ? "refund" : "void";
  const isVoid = currentAction === "void";

  $("void-btn")?.classList.toggle("active", isVoid);
  $("refund-btn")?.classList.toggle("active", !isVoid);

  if ($("scope-heading")) {
    $("scope-heading").textContent =
      isVoid ? "Void Option:" : "Refund Option:";
  }

  if ($("modal-warning-text")) {
    $("modal-warning-text").textContent = isVoid
      ? "Voided items will be restocked automatically."
      : "Refunded items will be recorded automatically.";
  }

  document.querySelectorAll("[data-label-void]").forEach(element => {
    element.textContent =
      isVoid
        ? element.dataset.labelVoid
        : element.dataset.labelRefund;
  });

  const confirmButton = $("modal-confirm");
  const confirmText = $("confirm-action-text");
  const modalOverlay = $("order-modal");

  if (confirmText) {
    confirmText.textContent =
      isVoid ? "Confirm Void" : "Confirm Refund";
  }

  confirmButton?.classList.toggle("refund-mode", !isVoid);
  modalOverlay?.classList.toggle("refund-mode", !isVoid);
}

function defaultActionForOrder(order) {
  return order.source === "Kiosk" ? "void" : "refund";
}

function openOrderModal(order) {
  currentModalOrder = order;
  $("modal-order-id").textContent = `#${order.id}`;
  $("modal-order-date").textContent = `${order.date} ${order.time}`.trim();
  $("modal-item-count").textContent = `${order.items.length} ${order.items.length === 1 ? "Item" : "Items"}`;
  $("modal-subtotal").textContent = peso(order.subtotal);
  $("modal-discount").textContent = `-${peso(order.discount)}`;
  $("modal-total").textContent = peso(order.total);
  $("void-reason").value = "";

  $("modal-items").innerHTML = order.items.map((item, index) => {
    const firstCustomization = item.customizations?.[0] || "";
    return `
      <tr>
        <td>
          <div class="modal-item-info">
            <label class="item-select-check">
              <input type="checkbox" class="modal-item-checkbox" data-index="${index}" checked>
              <span class="check-box">✓</span>
            </label>
            <span class="item-placeholder" aria-hidden="true"></span>
            <span class="modal-item-name">${escapeHTML(item.name)}${firstCustomization ? `<small>${escapeHTML(firstCustomization)}</small>` : ""}</span>
          </div>
        </td>
        <td>${item.qty}</td>
        <td>${peso(item.price)}</td>
        <td>${peso(item.price * item.qty)}</td>
      </tr>
    `;
  }).join("");

  setActionType(defaultActionForOrder(order));
  const entire = document.querySelector('input[name="void-option"][value="entire"]');
  if (entire) entire.checked = true;
  updateSpecificSelectionState();

  $("order-modal").classList.add("active");
  $("order-modal").setAttribute("aria-hidden", "false");
}

function closeOrderModal() {
  $("order-modal")?.classList.remove("active");
  $("order-modal")?.setAttribute("aria-hidden", "true");
  currentModalOrder = null;
}

function selectedScope() {
  return document.querySelector('input[name="void-option"]:checked')?.value || "entire";
}

function updateSpecificSelectionState() {
  const enabled = selectedScope() === "specific";
  document.querySelectorAll(".modal-item-checkbox").forEach(box => {
    box.disabled = !enabled;
    if (!enabled) box.checked = true;
    box.closest(".item-select-check")?.classList.toggle("disabled", !enabled);
  });
}

function saveAdjustmentAudit(order, scope, reason) {
  const history = JSON.parse(localStorage.getItem("cafe_order_adjustments") || "[]");
  history.unshift({
    orderId: order.id,
    action: currentAction,
    scope,
    reason,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem("cafe_order_adjustments", JSON.stringify(history));
}

let adjustmentBusy =
  false;


async function processVoidRefund() {

  if (
    !currentModalOrder ||
    adjustmentBusy
  ) {
    return;
  }


  const order =
    currentModalOrder;


  const reason =
    $("void-reason")?.value ||
    "";


  const scope =
    selectedScope();


  if (!reason) {

    alert(
      "Please select a reason."
    );

    $("void-reason")?.focus();

    return;
  }


  const confirmButton =
    $("modal-confirm");


  adjustmentBusy =
    true;


  if (confirmButton) {
    confirmButton.disabled =
      true;
  }


  try {

    // --------------------------------------------------------
    // ENTIRE ORDER
    // --------------------------------------------------------
    if (
      scope ===
      "entire"
    ) {

      const terminalStatus =
        currentAction ===
        "refund"
          ? "REFUNDED"
          : "CANCELLED";


      await updateBackendStatus(
        order,
        terminalStatus
      );


      saveAdjustmentAudit(
        order,
        scope,
        reason
      );


      orders =
        orders.filter(
          item =>
            item.id !== order.id &&
            item.backendId !==
              order.backendId
        );


      if (
        selectedId ===
          order.id ||
        selectedId ===
          order.backendId
      ) {
        selectedId =
          null;
      }


      closeOrderModal();

      renderAll();


      window.setTimeout(
        loadOrders,
        120
      );


      alert(
        `${
          currentAction ===
          "refund"
            ? "Refund"
            : "Void"
        } recorded for Order #${order.id}.`
      );


      return;
    }


    // --------------------------------------------------------
    // SPECIFIC ITEMS
    // --------------------------------------------------------
    if (
      scope ===
      "specific"
    ) {

      const selectedIndexes =
        [
          ...document.querySelectorAll(
            ".modal-item-checkbox:checked"
          )
        ]
          .map(
            box =>
              Number(
                box.dataset.index
              )
          )
          .filter(
            Number.isInteger
          );


      if (
        !selectedIndexes.length
      ) {

        alert(
          "Select at least one item."
        );

        return;
      }


      const nextItems =
        order.items.filter(
          (
            _,
            index
          ) =>
            !selectedIndexes.includes(
              index
            )
        );


      const nextSubtotal =
        calculateSubtotal(
          nextItems
        );


      const nextDiscount =
        Math.min(
          Number(
            order.discount ||
            0
          ),
          nextSubtotal
        );


      const nextTotal =
        Math.max(
          0,
          nextSubtotal -
          nextDiscount
        );


      const patch = {
        items:
          nextItems,

        subtotal:
          nextSubtotal,

        discountAmount:
          nextDiscount,

        total:
          nextTotal
      };


      if (
        currentAction ===
        "refund"
      ) {

        patch.paymentStatus =
          "partially-refunded";
      }


      /*
       * If every item was removed, the order becomes terminal
       * and should leave the live queue.
       */
      if (
        nextItems.length ===
        0
      ) {

        patch.status =
          currentAction ===
          "refund"
            ? "Refunded"
            : "Cancelled";
      }


      const result =
        await patchBackendOrder(
          order,
          patch
        );


      saveAdjustmentAudit(
        order,
        scope,
        reason
      );


      if (
        result?.order
      ) {

        upsertOrder(
          result.order
        );

      } else {

        order.items =
          nextItems;

        order.subtotal =
          nextSubtotal;

        order.discount =
          nextDiscount;

        order.total =
          nextTotal;

        if (
          patch.paymentStatus
        ) {
          order.paymentStatus =
            patch.paymentStatus;
        }

        if (
          patch.status
        ) {
          order.status =
            normalizeStatus(
              patch.status
            );
        }
      }


      closeOrderModal();

      renderAll();


      window.setTimeout(
        loadOrders,
        120
      );


      alert(
        `${
          currentAction ===
          "refund"
            ? "Refund"
            : "Void"
        } saved for the selected item(s).`
      );


      return;
    }


    // --------------------------------------------------------
    // PAYMENT ONLY
    // --------------------------------------------------------
    if (
      scope ===
      "payment"
    ) {

      const paymentStatus =
        currentAction ===
        "refund"
          ? "refunded"
          : "voided";


      const result =
        await patchBackendOrder(
          order,
          {
            paymentStatus
          }
        );


      saveAdjustmentAudit(
        order,
        scope,
        reason
      );


      if (
        result?.order
      ) {

        upsertOrder(
          result.order
        );

      } else {

        order.paymentStatus =
          paymentStatus;
      }


      closeOrderModal();

      renderAll();


      window.setTimeout(
        loadOrders,
        120
      );


      alert(
        `${
          currentAction ===
          "refund"
            ? "Refund"
            : "Void"
        } payment recorded for Order #${order.id}.`
      );
    }


  } catch (
    error
  ) {

    console.error(
      "Void / Refund failed:",
      error
    );


    alert(
      error.message ||
      "Unable to process the selected action."
    );


  } finally {

    adjustmentBusy =
      false;


    if (confirmButton) {
      confirmButton.disabled =
        false;
    }
  }
}

// ------------------------------
// RENDER
// ------------------------------
function renderAll() {
  updateCounts();
  renderTable();
  renderDetail();
}

// ------------------------------
// EVENTS
// ------------------------------
document.addEventListener("click", event => {
  const view = event.target.closest("[data-view]");
  if (view) {
    selectedId = view.dataset.view;
    renderDetail();
    return;
  }

  const voidButton = event.target.closest("[data-void]");
  if (voidButton) {
    const order = orders.find(item => item.id === voidButton.dataset.void);
    if (order) openOrderModal(order);
    return;
  }

  const statusButton = event.target.closest("[data-status-cycle]");
  if (statusButton) {
    cycleOrderStatus(statusButton.dataset.statusCycle);
    return;
  }

  const tab = event.target.closest("[data-status-tab]");
  if (tab) {
    const select = $("status-filter");
    const clicked = tab.dataset.statusTab;
    select.value = select.value === clicked ? "ALL" : clicked;
    currentPage = 1;
    renderAll();
    return;
  }

  const page = event.target.closest("[data-page]");
  if (page) {
    currentPage = Number(page.dataset.page) || 1;
    renderTable();
    return;
  }

  if (event.target.closest("[data-next]")) {
    currentPage += 1;
    renderTable();
    return;
  }

  if (event.target.closest("#detail-close")) {
    selectedId = null;
    renderDetail();
    return;
  }

  if (event.target.closest("#detail-update")) {
    if (selectedId) cycleOrderStatus(selectedId);
  }
});

["status-filter", "source-filter", "service-filter", "time-filter"].forEach(id => {
  $(id)?.addEventListener("change", () => {
    currentPage = 1;
    renderAll();
  });
});

$("search-input")?.addEventListener("input", () => {
  currentPage = 1;
  renderTable();
});

$("modal-close")?.addEventListener("click", closeOrderModal);
$("modal-cancel")?.addEventListener("click", closeOrderModal);
$("void-btn")?.addEventListener("click", () => setActionType("void"));
$("refund-btn")?.addEventListener("click", () => setActionType("refund"));
$("modal-confirm")?.addEventListener("click", processVoidRefund);

document.querySelectorAll('input[name="void-option"]').forEach(radio => {
  radio.addEventListener("change", updateSpecificSelectionState);
});

$("order-modal")?.addEventListener("click", event => {
  if (event.target === $("order-modal")) closeOrderModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && $("order-modal")?.classList.contains("active")) closeOrderModal();
});

// ============================================================
// INITIAL LOAD + FRONTEND FALLBACK SYNC
// ============================================================

renderAll();

startRealtimeConnection();

loadOrders();

startAdminFallbackSync();


window.addEventListener(
  "focus",
  () => {
    loadOrders();
  }
);


document.addEventListener(
  "visibilitychange",
  () => {

    if (
      document.visibilityState ===
      "visible"
    ) {

      loadOrders();

      joinAdminRooms();
    }
  }
);


window.addEventListener(
  "cafe:auth-ready",
  () => {

    if (
      window.CafeAuth?.socket &&
      socket !==
        window.CafeAuth.socket
    ) {

      socketEventsBound =
        false;

      bindAdminSocketEvents(
        window.CafeAuth.socket
      );
    }

    joinAdminRooms();

    loadOrders();
  }
);


// If the socket is taking a while, check whether the backend
// itself is reachable. API polling continues even if realtime
// temporarily reconnects.
window.setTimeout(
  async () => {

    if (
      socket?.connected
    ) {
      return;
    }

    const healthy =
      await checkBackendHealth();

    if (
      !healthy
    ) {

      setConnection(
        "offline",
        "Server Offline"
      );
    }

  },
  5000
);
