
const $ = id => document.getElementById(id);

function authenticatedCafeId() {
  const candidates = [
    window.CafeAuth?.session?.cafeId,
    ...['cafeStaffSession','cafeManagerSession','cafeAdminSession'].map(key => { try { return JSON.parse(localStorage.getItem(key) || 'null')?.cafeId; } catch (_) { return ''; } }),
    localStorage.getItem('cafeId'),
    'cafe-1'
  ];
  return String(candidates.find(v => String(v || '').trim()) || 'cafe-1').trim();
}
let CAFE_ID = authenticatedCafeId();

localStorage.setItem(
  "cafeId",
  CAFE_ID
);

function syncAuthenticatedCafeId(preferredCafeId = "") {
  const resolved = String(
    preferredCafeId ||
    window.CafeAuth?.session?.cafeId ||
    (() => {
      const role = String(window.CafeAuth?.role || sessionStorage.getItem("cafeActiveRole") || "").toLowerCase();
      const key = role === "manager" ? "cafeManagerSession" : role === "admin" ? "cafeAdminSession" : "cafeStaffSession";
      try { return JSON.parse(localStorage.getItem(key) || "null")?.cafeId || ""; } catch (_) { return ""; }
    })() ||
    CAFE_ID ||
    "cafe-1"
  ).trim() || "cafe-1";

  CAFE_ID = resolved;
  localStorage.setItem("cafeId", CAFE_ID);
  return CAFE_ID;
}
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


const API_URL =
  resolveBackendOrigin();

function getAuthToken() {
  // Authentication is HttpOnly-cookie only. JavaScript never reads a JWT.
  return "";
}

function activeQueueRole() {
  const direct = String(window.CafeAuth?.role || window.CafeAuth?.session?.role || sessionStorage.getItem("cafeActiveRole") || "").trim().toLowerCase();
  if (direct) return direct;
  const path = String(window.location.pathname || "").toLowerCase();
  if (path.includes("manager")) return "manager";
  if (path.includes("admin")) return "admin";
  return "staff";
}

function staffNeedsApprovalPin() {
  return activeQueueRole() === "staff";
}

let verifiedApproval = null;

function setApprovalPinFeedback(message = "", type = "") {
  const el = $("approvalPinFeedback");
  if (!el) return;
  el.textContent = message;
  el.className = `approval-pin-feedback${type ? ` ${type}` : ""}`;
}

async function verifyEnteredApprovalPin({ silent = false } = {}) {
  const approvalIdInput = $("managerApprovalId");
  const approvalId = String(approvalIdInput?.value || "").trim().toUpperCase();
  const pinInput = $("managerPin");
  const pin = String(pinInput?.value || "").trim();
  verifiedApproval = null;
  if (!/^(ADM|MGR)-[A-F0-9]{6}$/.test(approvalId)) { if (!silent) setApprovalPinFeedback("Enter the Admin/Manager Approval ID first.", "error"); approvalIdInput?.focus(); return null; }
  if (!/^\d{4,6}$/.test(pin)) {
    if (!silent) setApprovalPinFeedback("Enter a 4-6 digit Admin/Manager PIN.", "error");
    return null;
  }
  try {
    setApprovalPinFeedback("Checking approval PIN...", "checking");
    const response = await authenticatedFetch(`${API_URL}/api/auth/approval-pin/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ approvalId, pin })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.success) throw new Error(data.message || "Approval PIN was not accepted.");
    verifiedApproval = { approvalId, pin, approver: data.approver || null };
    const who = data.approver?.name || data.approver?.username || data.approver?.role || "Admin/Manager";
    setApprovalPinFeedback(`Approved by ${who}.`, "success");
    return verifiedApproval;
  } catch (error) {
    setApprovalPinFeedback(error.message || "Approval PIN was not accepted.", "error");
    if (!silent) pinInput?.focus();
    return null;
  }
}

function configureApprovalPinUI() {
  const input = $("managerPin");
  if (!input) return;
  const control = input.closest(".pin-control");
  const label = document.querySelector('label[for="managerPin"]');
  let feedback = $("approvalPinFeedback");
  if (!feedback && control) {
    feedback = document.createElement("div");
    feedback.id = "approvalPinFeedback";
    feedback.className = "approval-pin-feedback";
    control.insertAdjacentElement("afterend", feedback);
  }

  if (staffNeedsApprovalPin()) {
    let approvalIdInput = $("managerApprovalId");
    if (!approvalIdInput && control) {
      const idLabel=document.createElement("label"); idLabel.className="field-label approval-id-label"; idLabel.setAttribute("for","managerApprovalId"); idLabel.textContent="1. Admin/Manager Approval ID:";
      approvalIdInput=document.createElement("input"); approvalIdInput.id="managerApprovalId"; approvalIdInput.type="text"; approvalIdInput.maxLength=10; approvalIdInput.autocomplete="off"; approvalIdInput.placeholder="Example: ADM-A1B2C3"; approvalIdInput.className="approval-id-input";
      control.parentElement?.insertBefore(idLabel,control); control.parentElement?.insertBefore(approvalIdInput,control);
      approvalIdInput.addEventListener("input",()=>{approvalIdInput.value=String(approvalIdInput.value||"").toUpperCase().replace(/[^A-Z0-9-]/g,""); verifiedApproval=null; setApprovalPinFeedback("");});
    }
    if (label) label.textContent = "2. Admin/Manager Approval PIN:";
    input.placeholder = "Ask an Admin/Manager for their approval PIN";
    input.required = true;
    if (control && !$("verifyApprovalPinButton")) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = "verifyApprovalPinButton";
      button.className = "verify-approval-pin-btn";
      button.textContent = "Verify";
      button.addEventListener("click", () => verifyEnteredApprovalPin());
      control.appendChild(button);
    }
    input.addEventListener("input", () => {
      verifiedApproval = null;
      setApprovalPinFeedback("");
    });
  } else {
    if (label) label.textContent = "Supervisor Approval:";
    if (control) control.style.display = "none";
    setApprovalPinFeedback(`${activeQueueRole() === "manager" ? "Manager" : "Admin"} session is authorized for void/refund approval.`, "success");
  }
}

async function authenticatedFetch(url, options = {}) {
  if (window.CafeAuth?.apiFetch) {
    return window.CafeAuth.apiFetch(url, options);
  }

  const headers = new Headers(options.headers || {});

  return fetch(url, {
    ...options,
    credentials: "include",
    headers
  });
}

const peso = value => `₱${Number(value || 0).toFixed(2)}`;

function normalizeStatus(value) {
  const s = String(value || "Pending").toLowerCase();

  if (
    s.includes("void") ||
    s.includes("cancel")
  ) {
    return "Voided";
  }

  if (s.includes("refund")) {
    return "Refunded";
  }

  if (s.includes("complete")) {
    return "Completed";
  }

  if (
    s.includes("prepar") ||
    s.includes("ready")
  ) {
    return "Preparing";
  }

  return "Pending";
}


function isTerminalQueueStatus(value) {
  const status =
    normalizeStatus(value);

  return (
    status === "Voided" ||
    status === "Refunded"
  );
}


function isTerminalQueueOrder(order) {
  return Boolean(
    order &&
    isTerminalQueueStatus(
      order.status
    )
  );
}


function isDiagnosticTestOrder(order) {

  if (
    !order ||
    typeof order !== "object"
  ) {
    return false;
  }

  const orderNumber =
    String(
      order.orderNumber ??
      order.order_number ??
      order.orderId ??
      order.order_id ??
      ""
    ).trim();

  const customer =
    String(
      order.customerName ??
      order.customer_name ??
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

function purgeDiagnosticTestOrdersFromLocalStorage() {

  try {

    const raw =
      JSON.parse(
        localStorage.getItem(
          "cafe_orders"
        ) ||
        "[]"
      );

    if (!Array.isArray(raw)) {
      return;
    }

    const cleaned =
      raw.filter(
        order =>
          !isDiagnosticTestOrder(
            order
          )
      );

    if (
      cleaned.length !==
      raw.length
    ) {

      localStorage.setItem(
        "cafe_orders",
        JSON.stringify(
          cleaned
        )
      );

      console.log(
        "Removed old diagnostic TEST orders from local cache."
      );
    }

  } catch (error) {

    console.warn(
      "Could not clean diagnostic orders from local cache:",
      error
    );
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function classifyPrepStation(category, name = "") {
  const text = `${category || ""} ${name || ""}`.toLowerCase();
  const beverageWords = ["coffee", "non-coffee", "non coffee", "milk tea", "milktea", "tea", "beverage", "drink", "frappe", "smoothie", "juice", "soda", "latte", "espresso", "americano", "cappuccino", "mocha", "chocolate", "matcha"];
  const foodWords = ["food", "snack", "dessert", "pastry", "meal", "rice", "sandwich", "burger", "pasta", "noodle", "cake", "bread", "waffle", "fries", "pizza"];
  if (beverageWords.some(word => text.includes(word))) return "Beverage";
  if (foodWords.some(word => text.includes(word))) return "Food";
  return "Food";
}

function normalizePrepStation(value) {
  const station = String(value || "").trim().toLowerCase();
  if (station === "beverage" || station === "beverages" || station === "drink" || station === "drinks") return "Beverage";
  if (station === "food" || station === "foods" || station === "kitchen") return "Food";
  return "";
}

function getOrderStations(order) {
  const explicit = Array.isArray(order?.stations) ? order.stations.map(normalizePrepStation).filter(Boolean) : [];
  const derived = (order?.items || []).map(item => normalizePrepStation(item.prepStation) || classifyPrepStation(item.category, item.name));
  return [...new Set([...explicit, ...derived].filter(Boolean))];
}

function orderHasStation(order, station) {
  if (!station || station === "all") return true;
  return getOrderStations(order).includes(station);
}

function stationStatusFor(order, station) {
  if (!station || station === "all") return normalizeStatus(order?.status);
  const raw = order?.stationStatuses?.[station];
  return normalizeStatus(typeof raw === "object" ? raw?.status : raw || "Pending");
}

function itemsForStation(order, station = activePrepStation) {
  if (!order || !Array.isArray(order.items)) return [];
  if (!station || station === "all") return order.items;
  return order.items.filter(item => (normalizePrepStation(item.prepStation) || classifyPrepStation(item.category, item.name)) === station);
}

function normalizeOrder(order, index = 0) {
  const createdRaw = order.createdAt || order.created_at || order.orderDate || order.date_created;
  const created = createdRaw ? new Date(createdRaw) : new Date();
  const rawSource = String(order.source || order.order_source || "POS");
  const source = rawSource.toLowerCase().includes("kiosk") ? "Kiosk" : "POS";
  const rawItems = order.items || order.orderItems || order.order_items || [];

  const idValue =
    order.orderNumber ?? order.order_number ?? order.orderId ?? order.order_id ?? order.id ?? (1100 + index);

  return {
    id: String(idValue).replace(/^POS-|^KIOSK-|^#/, ""),
    apiId: order.id ?? order.orderId ?? order.order_id ?? idValue,
    orderNumber:
      order.orderNumber ??
      order.order_number ??
      idValue,
    cafeId:
      order.cafeId ??
      order.cafe_id ??
      CAFE_ID,
    localOnly:
      Boolean(order.localOnly),
    createdAt:
      created.toISOString(),
    updatedAt:
      order.updatedAt ??
      order.updated_at ??
      created.toISOString(),
    customer:
      order.customerName ?? order.customer_name ??
      (source === "Kiosk" ? `Kiosk #${index + 1}` : "Walk-in Customer"),
    time: created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    date: created.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    source,
    sourceLabel:
      String(order.sourceLabel || order.source_label || "").trim() ||
      (source === "Kiosk" ? "Kiosk" : "POS"),
    serving: order.serviceType ?? order.service_type ?? order.serving ?? "Dine In",
    status: normalizeStatus(order.status),
    subtotal: Number(order.subtotal ?? order.sub_total ?? order.total ?? 0),
    discount: Number(order.discountAmount ?? order.discount_amount ?? order.discount ?? 0),
    total: Number(order.total ?? order.total_amount ?? 0),
    promotionName: order.promotionName || order.promotion?.name || "",
    stations: Array.isArray(order.stations) ? order.stations.map(normalizePrepStation).filter(Boolean) : [],
    stationStatuses: order.stationStatuses && typeof order.stationStatuses === "object" ? order.stationStatuses : {},
    items: (Array.isArray(rawItems) ? rawItems : []).map(item => {
      const customizations = Array.isArray(item.customizations)
        ? item.customizations
        : Array.isArray(item.options) ? item.options : [];
      const explicitNote = String(item.note ?? item.specialNote ?? item.special_note ?? "").trim();
      const embeddedNote = customizations
        .map(value => String(value || "").trim())
        .find(value => /^note\s*:/i.test(value));
      return {
        productId: item.productId ?? item.product_id ?? "",
        name: item.name ?? item.product_name ?? "Item",
        category: item.category ?? item.category_snapshot ?? "Uncategorized",
        prepStation: normalizePrepStation(item.prepStation ?? item.prep_station) || classifyPrepStation(item.category ?? item.category_snapshot, item.name ?? item.product_name),
        qty: Number(item.qty ?? item.quantity ?? 1),
        price: Number(item.price ?? item.unit_price ?? 0) + Number(item.customizationCost ?? item.customization_cost ?? 0),
        customizations,
        note: explicitNote || (embeddedNote ? embeddedNote.replace(/^note\s*:\s*/i, "") : "")
      };
    })
  };
}

function loadRawLocalOrders() {

  try {

    const local =
      JSON.parse(
        localStorage.getItem(
          "cafe_orders"
        ) ||
        "[]"
      );

    if (!Array.isArray(local)) {
      return [];
    }

    return local.filter(
      order => {
        const sameCafe =
          !order?.cafeId ||
          String(order.cafeId).trim() ===
          String(CAFE_ID).trim();

        const orderNumber =
          String(
            order?.orderNumber ||
            order?.order_number ||
            ""
          ).trim();

        const isTestOrder =
          /^TEST-/i.test(orderNumber);

        const terminal =
          isTerminalQueueOrder(
            order
          );

        return (
          sameCafe &&
          !isTestOrder &&
          !terminal
        );
      }
    );

  } catch (error) {

    console.warn(
      "Could not read local orders:",
      error
    );

    return [];
  }
}


function loadLocalOrders() {

  return loadRawLocalOrders()
    .map(
      normalizeOrder
    );
}


function mergeOrderLists(
  serverOrders = [],
  localOrders = []
) {

  const merged =
    new Map();


  for (
    const order
    of localOrders
  ) {

    merged.set(
      String(
        order.id ||
        order.orderNumber ||
        order.apiId
      ),
      order
    );
  }


  for (
    const order
    of serverOrders
  ) {

    merged.set(
      String(
        order.id ||
        order.orderNumber ||
        order.apiId
      ),
      order
    );
  }


  return Array.from(
    merged.values()
  ).sort(
    (
      a,
      b
    ) =>
      new Date(
        b.createdAt ||
        0
      ) -
      new Date(
        a.createdAt ||
        0
      )
  );
}


function persistNormalizedOrderLocally(
  normalizedOrder
) {

  const raw =
    loadRawLocalOrders();

  const identifier =
    String(
      normalizedOrder.orderNumber ||
      normalizedOrder.id ||
      normalizedOrder.apiId
    );

  const replacement = {
    cafeId:
      normalizedOrder.cafeId ||
      CAFE_ID,

    orderNumber:
      normalizedOrder.orderNumber ||
      normalizedOrder.id,

    source:
      normalizedOrder.source,

    customerName:
      normalizedOrder.customer,

    serviceType:
      normalizedOrder.serving,

    status:
      normalizedOrder.status,

    subtotal:
      normalizedOrder.subtotal,

    discountAmount:
      normalizedOrder.discount,

    total:
      normalizedOrder.total,

    items:
      normalizedOrder.items.map(
        item => ({
          name:
            item.name,

          qty:
            item.qty,

          quantity:
            item.qty,

          price:
            item.price,

          customizations:
            item.customizations ||
            []
        })
      ),

    createdAt:
      new Date().toISOString(),

    localOnly:
      Boolean(
        normalizedOrder.localOnly
      )
  };

  const filtered =
    raw.filter(
      order =>
        String(
          order.orderNumber ||
          order.id ||
          ""
        ) !== identifier
    );

  filtered.unshift(
    replacement
  );

  localStorage.setItem(
    "cafe_orders",
    JSON.stringify(
      filtered.slice(
        0,
        250
      )
    )
  );
}

let orders =
  loadLocalOrders()
    .filter(
      order =>
        !isTerminalQueueOrder(
          order
        )
    );
let selectedOrderId = null;
let modalOrderId = null;
let currentAction = "void";
let activeStatusTab = "all";
const initialStationParam = normalizePrepStation(new URLSearchParams(window.location.search).get("station"));
let activePrepStation = initialStationParam || "all";
let currentPage = 1;
const PAGE_SIZE = 8;

// Same fallback strategy as the Admin Order Monitor.
// If Socket.IO misses an event, this page still reloads the shared
// /api/orders list every 3 seconds.
const QUEUE_SYNC_INTERVAL =
  3000;

const REALTIME_ORDER_TTL =
  20000;

let queueSyncTimer =
  null;

let queueSyncInFlight =
  false;

let queuedSync =
  false;

const recentRealtimeOrders =
  new Map();


function normalizeOrderLookupKey(
  value
) {

  return String(
    value ??
    ""
  )
    .replace(
      /^#/,
      ""
    )
    .trim()
    .toLowerCase();
}


function getOrderLookupKeys(
  order
) {

  if (!order) {
    return [];
  }

  return [
    order.orderNumber,
    order.apiId,
    order.id
  ]
    .map(
      normalizeOrderLookupKey
    )
    .filter(
      Boolean
    );
}


function getStableOrderKey(
  order
) {

  return String(
    order?.orderNumber ??
    order?.apiId ??
    order?.id ??
    ""
  );
}


function findOrderByIdentifier(
  identifier
) {

  const wanted =
    normalizeOrderLookupKey(
      identifier
    );

  if (!wanted) {
    return null;
  }

  return (
    orders.find(
      order =>
        getOrderLookupKeys(
          order
        ).includes(
          wanted
        )
    ) ||
    null
  );
}



function removeOrderFromLocalQueue(
  orderOrIdentifier
) {

  try {

    const raw =
      JSON.parse(
        localStorage.getItem(
          "cafe_orders"
        ) ||
        "[]"
      );

    if (!Array.isArray(raw)) {
      return;
    }


    const wantedKeys =
      typeof orderOrIdentifier ===
      "object"
        ? getOrderLookupKeys(
            orderOrIdentifier
          )
        : [
            normalizeOrderLookupKey(
              orderOrIdentifier
            )
          ].filter(Boolean);


    const cleaned =
      raw.filter(
        rawOrder => {

          const rawKeys =
            [
              rawOrder?.orderNumber,
              rawOrder?.order_number,
              rawOrder?.orderId,
              rawOrder?.order_id,
              rawOrder?.id
            ]
              .map(
                normalizeOrderLookupKey
              )
              .filter(Boolean);


          return !rawKeys.some(
            key =>
              wantedKeys.includes(
                key
              )
          );
        }
      );


    localStorage.setItem(
      "cafe_orders",
      JSON.stringify(
        cleaned
      )
    );

  } catch (error) {

    console.warn(
      "Unable to remove the voided/refunded order from local queue storage:",
      error
    );
  }
}


function removeOrderFromLiveQueue(
  orderOrIdentifier
) {

  const wantedKeys =
    typeof orderOrIdentifier ===
    "object"
      ? getOrderLookupKeys(
          orderOrIdentifier
        )
      : [
          normalizeOrderLookupKey(
            orderOrIdentifier
          )
        ].filter(Boolean);


  if (!wantedKeys.length) {
    return;
  }


  orders =
    orders.filter(
      order => {

        const keys =
          getOrderLookupKeys(
            order
          );

        return !keys.some(
          key =>
            wantedKeys.includes(
              key
            )
        );
      }
    );


  for (
    const [key, entry]
    of recentRealtimeOrders
  ) {

    const entryKeys =
      getOrderLookupKeys(
        entry.order
      );

    if (
      entryKeys.some(
        item =>
          wantedKeys.includes(
            item
          )
      )
    ) {
      recentRealtimeOrders.delete(
        key
      );
    }
  }


  removeOrderFromLocalQueue(
    orderOrIdentifier
  );


  if (
    selectedOrderId &&
    wantedKeys.includes(
      normalizeOrderLookupKey(
        selectedOrderId
      )
    )
  ) {
    selectedOrderId =
      null;
  }


  if (
    modalOrderId &&
    wantedKeys.includes(
      normalizeOrderLookupKey(
        modalOrderId
      )
    )
  ) {
    modalOrderId =
      null;
  }


  currentPage =
    1;
}


function queueSnapshot(
  list
) {

  return JSON.stringify(
    list.map(
      order => ({
        key:
          getStableOrderKey(
            order
          ),

        apiId:
          order.apiId,

        status:
          normalizeStatus(
            order.status
          ),

        updatedAt:
          order.updatedAt,

        total:
          order.total,

        customer:
          order.customer,

        serving:
          order.serving,

        source:
          order.source,

        items:
          order.items.map(
            item => ({
              name:
                item.name,

              qty:
                item.qty,

              price:
                item.price,

              category:
                item.category,

              prepStation:
                item.prepStation,

              customizations:
                item.customizations
            })
          )
      })
    )
  );
}


function statusClass(status) {
  return normalizeStatus(status).toLowerCase();
}

function getSelectedOrder() {
  return findOrderByIdentifier(
    selectedOrderId
  );
}

function statusForCurrentView(order) {
  return stationStatusFor(order, activePrepStation);
}

function countByStatus(status) {
  return orders.filter(order => orderHasStation(order, activePrepStation) && statusForCurrentView(order) === status).length;
}

function stationStillNeedsPreparation(order, station) {
  const status = stationStatusFor(order, station);
  return !["Completed", "Voided", "Refunded", "Cancelled"].includes(status);
}

function updateStationCounts() {
  // Preparation Queue counters represent work that still needs preparation.
  // Mixed orders are counted once in All and once in each station they contain.
  const activeOrders = orders.filter(order =>
    getOrderStations(order).some(station => stationStillNeedsPreparation(order, station))
  );
  const all = activeOrders.length;
  const beverage = orders.filter(order =>
    orderHasStation(order, "Beverage") && stationStillNeedsPreparation(order, "Beverage")
  ).length;
  const food = orders.filter(order =>
    orderHasStation(order, "Food") && stationStillNeedsPreparation(order, "Food")
  ).length;
  if ($("allStationCount")) $("allStationCount").textContent = all;
  if ($("beverageStationCount")) $("beverageStationCount").textContent = beverage;
  if ($("foodStationCount")) $("foodStationCount").textContent = food;
}

function updateCounts() {
  $("pendingCount").textContent = countByStatus("Pending");
  $("preparingCount").textContent = countByStatus("Preparing");
  $("completedCount").textContent = countByStatus("Completed");
  updateStationCounts();
}

function getFilteredOrders() {
  const status = $("statusFilter").value;
  const source = $("sourceFilter").value;
  const service = $("serviceFilter").value;
  const search = $("orderSearch").value.trim().toLowerCase();

  let result = orders.filter(order => {
    const normalized = statusForCurrentView(order);
    const stationOK = orderHasStation(order, activePrepStation);
    const statusOK = status === "all" || normalized === status;
    const tabOK = activeStatusTab === "all" || normalized === activeStatusTab;
    const sourceOK =
      source === "all" ||
      (source === "POS" && order.source === "POS") ||
      (source === "Kiosk" && order.source === "Kiosk") ||
      (["Staff POS", "Manager POS", "Admin POS"].includes(source) && order.sourceLabel === source);
    const serviceOK = service === "all" || order.serving === service;
    const haystack = `${order.id} ${order.customer} ${order.source} ${order.sourceLabel || ""} ${order.serving} ${order.status}`.toLowerCase();
    return stationOK && statusOK && tabOK && sourceOK && serviceOK && (!search || haystack.includes(search));
  });

  if ($("timeFilter").value === "oldest") result = result.slice().reverse();
  return result;
}

function renderPagination(totalRows) {
  const pagination = document.querySelector(".pagination");
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  pagination.innerHTML = "";
  for (let p = 1; p <= Math.min(totalPages, 3); p++) {
    const btn = document.createElement("button");
    btn.className = `page-btn${p === currentPage ? " active" : ""}`;
    btn.textContent = p;
    btn.addEventListener("click", () => { currentPage = p; renderTable(); });
    pagination.appendChild(btn);
  }

  const next = document.createElement("button");
  next.className = "next-btn";
  next.textContent = "Next";
  next.disabled = currentPage >= totalPages;
  next.addEventListener("click", () => {
    if (currentPage < totalPages) { currentPage++; renderTable(); }
  });
  pagination.appendChild(next);
}

function renderTable() {
  const tbody = $("orderTableBody");
  const list = getFilteredOrders();
  renderPagination(list.length);

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = list.slice(start, start + PAGE_SIZE);
  tbody.innerHTML = "";

  if (!pageRows.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="height:120px;color:#8B7D70;font-size:12px;">No orders match your filters.</td></tr>`;
    return;
  }

  pageRows.forEach(order => {
    const tr = document.createElement("tr");
    const displayStatus = statusForCurrentView(order);
    const cls = statusClass(displayStatus);
    tr.innerHTML = `
      <td>#${escapeHTML(order.id)}</td>
      <td>${escapeHTML(order.customer)}</td>
      <td>${escapeHTML(order.time)}</td>
      <td>${escapeHTML(order.sourceLabel || order.source)}</td>
      <td>${escapeHTML(order.serving)}</td>
      <td><span class="status-pill ${cls}">${escapeHTML(displayStatus.toUpperCase())}</span></td>
      <td>
        <div class="action-cell">
          <button
            type="button"
            class="view-btn"
            data-view="${escapeHTML(getStableOrderKey(order))}"
          >
            View
          </button>

          <button
            type="button"
            class="void-btn"
            data-void="${escapeHTML(getStableOrderKey(order))}"
            aria-label="Void or refund order #${escapeHTML(order.id)}"
          >
            <span>×</span>
          </button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  // Row actions are handled by one delegated click listener
  // in setupEvents(). This remains reliable even while the
  // table is refreshed every second.
}

function renderDetails() {
  const order = getSelectedOrder();
  const empty = $("emptyOrderDetail");
  const content = $("orderDetailContent");

  if (!order) {

    if (empty) {
      empty.hidden =
        false;

      empty.style.display =
        "";
    }

    if (content) {
      content.hidden =
        true;

      content.style.display =
        "none";
    }

    return;
  }


  if (empty) {
    empty.hidden =
      true;

    empty.style.display =
      "none";
  }


  if (content) {
    content.hidden =
      false;

    content.style.display =
      "flex";
  }

  $("detailOrderNumber").textContent = `Order #${order.id}`;
  $("detailCustomer").textContent = order.customer;
  $("detailSource").textContent = order.sourceLabel;
  $("detailTime").textContent = order.time;
  const detailViewStatus = statusForCurrentView(order);
  $("detailStatus").textContent = detailViewStatus;
  $("detailStatus").className = `detail-status ${statusClass(detailViewStatus)}`;
  $("detailTotal").textContent = peso(order.total);
  if ($("updateStatusButton")) $("updateStatusButton").textContent = activePrepStation === "all" ? "Update Status" : `Update ${activePrepStation} Status`;
  {
    const totalEl = $("detailTotal");
    let box = document.getElementById("detailDiscountSummary");
    if (!box && totalEl?.parentElement) { box = document.createElement("div"); box.id = "detailDiscountSummary"; box.className = "ck-summary-upgrade"; totalEl.parentElement.insertBefore(box, totalEl); }
    if (box) box.innerHTML = '<div class="row"><span>Subtotal</span><strong>' + peso(order.subtotal) + '</strong></div>' + '<div class="row"><span>Discount</span><strong>-' + peso(order.discount) + '</strong></div>' + '<div class="row"><span>Promotion</span><strong>' + (order.promotionName ? escapeHTML(order.promotionName) : 'None') + '</strong></div>';
  }

  const visibleDetailItems = itemsForStation(order);
  $("detailItems").innerHTML = visibleDetailItems.length
    ? visibleDetailItems.map(item => {
        const optionLines = (item.customizations || []).filter(value => !/^note\s*:/i.test(String(value || "").trim()));
        const details = optionLines.length
          ? `<div class="detail-customizations">${optionLines.map(x => `-${escapeHTML(x)}`).join("<br>")}</div>`
          : "";
        const note = String(item.note || "").trim();
        const noteHtml = note
          ? `<div class="detail-item-note"><strong>Note:</strong> ${escapeHTML(note)}</div>`
          : "";
        return `<div class="detail-item"><div class="detail-item-title">${escapeHTML(item.name)} x ${item.qty}</div>${details}${noteHtml}</div>`;
      }).join("")
    : `<div style="color:#8B7D70">No item details available.</div>`;
}

function selectOrder(id) {

  const order =
    findOrderByIdentifier(
      id
    );

  if (!order) {

    console.warn(
      "Order row changed during refresh. Resyncing before opening View:",
      id
    );

    return false;
  }


  selectedOrderId =
    getStableOrderKey(
      order
    );


  renderDetails();


  const empty =
    $("emptyOrderDetail");

  const content =
    $("orderDetailContent");

  const panel =
    $("orderDetail");


  if (empty) {
    empty.hidden =
      true;

    empty.style.display =
      "none";
  }


  if (content) {
    content.hidden =
      false;

    content.style.display =
      "flex";
  }


  if (panel) {

    panel.classList.add(
      "has-selected-order"
    );

    try {

      panel.scrollIntoView({
        behavior:
          "smooth",

        block:
          "nearest"
      });

    } catch (_) {
      // Optional browser behavior.
    }
  }


  return true;
}


// Use one stable key for every dynamic row.
// If a 1-second refresh happens exactly during a click,
// resync once and retry instead of claiming the order is missing.
window.CafeQueueViewOrder =
  async function (
    id
  ) {

    if (
      selectOrder(
        id
      )
    ) {
      return;
    }


    await fetchOrders();


    if (
      !selectOrder(
        id
      )
    ) {

      console.error(
        "Unable to open the selected order after resync:",
        id
      );
    }
  };


window.CafeQueueOpenActions =
  async function (
    id
  ) {

    let order =
      findOrderByIdentifier(
        id
      );


    if (!order) {

      await fetchOrders();

      order =
        findOrderByIdentifier(
          id
        );
    }


    if (!order) {

      console.error(
        "Unable to open actions for the selected order:",
        id
      );

      return;
    }


    openVoidRefundModal(
      getStableOrderKey(
        order
      )
    );
  };


function renderAll() {
  updateCounts();
  renderTable();
  renderDetails();
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
    String(syncAuthenticatedCafeId()).trim()
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
    normalizeOrder(
      rawOrder
    );


  if (
    isTerminalQueueOrder(
      normalized
    )
  ) {

    removeOrderFromLiveQueue(
      normalized
    );

    renderAll();

    return;
  }


  const key =
    String(
      normalized.apiId ??
      normalized.id
    );

  recentRealtimeOrders.set(
    key,
    {
      order:
        normalized,
      expiresAt:
        Date.now() +
        REALTIME_ORDER_TTL
    }
  );

  const existingIndex =
    orders.findIndex(
      order =>
        String(
          order.apiId ??
          order.id
        ) ===
        String(
          normalized.apiId ??
          normalized.id
        ) ||
        String(order.id) ===
        String(normalized.id)
    );

  if (
    existingIndex >=
    0
  ) {
    orders[
      existingIndex
    ] = {
      ...orders[
        existingIndex
      ],
      ...normalized
    };
  } else {
    orders.unshift(
      normalized
    );
  }

  currentPage =
    1;

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
            order.apiId ??
            order.id
          ) ===
          String(
            entry.order.apiId ??
            entry.order.id
          ) ||
          String(order.id) ===
          String(entry.order.id)
      );

    if (exists) {
      recentRealtimeOrders.delete(
        key
      );
      continue;
    }

    if (
      isTerminalQueueOrder(
        entry.order
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

function scheduleQueueSync(
  delay = 100
) {
  window.setTimeout(
    fetchOrders,
    delay
  );
}

function startQueueFallbackSync() {
  if (
    queueSyncTimer
  ) {
    window.clearInterval(
      queueSyncTimer
    );
  }

  queueSyncTimer =
    window.setInterval(
      () => {
        if (
          document.visibilityState ===
          "visible"
        ) {
          fetchOrders();
        }
      },
      QUEUE_SYNC_INTERVAL
    );
}

async function fetchOrders() {

  if (
    queueSyncInFlight
  ) {
    queuedSync =
      true;

    return;
  }


  queueSyncInFlight =
    true;


  const localOrders =
    loadLocalOrders();


  try {

    const activeCafeId = syncAuthenticatedCafeId();

    const response =
      await authenticatedFetch(
        `${API_URL}/api/orders?cafeId=${encodeURIComponent(activeCafeId)}`,
        {
          method:
            "GET",

          headers: {
            Accept:
              "application/json"
          },

          credentials:
            "include",

          cache:
            "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        `GET /api/orders returned ${response.status}`
      );
    }


    const data =
      await response.json();

    // The authenticated backend is the canonical tenant source. This avoids
    // a stale cafeId from another Admin/Staff/Manager tab hiding valid orders.
    if (data?.cafeId) {
      syncAuthenticatedCafeId(data.cafeId);
    }


    const raw =
      Array.isArray(data)
        ? data
        : Array.isArray(data.orders)
          ? data.orders
          : Array.isArray(data.data)
            ? data.data
            : [];


    const cleanServerRaw =
      raw
        .filter(
          order => {

            const sameCafe =
              !order?.cafeId ||
              String(order.cafeId).trim() ===
              String(CAFE_ID).trim();

            return (
              sameCafe &&
              !isDiagnosticTestOrder(
                order
              ) &&
              !isTerminalQueueStatus(
                order.status
              )
            );
          }
        );


    const serverOrders =
      cleanServerRaw
        .map(
          normalizeOrder
        );


    /*
     * IMPORTANT:
     * When the backend is reachable, it is the ONLY source of truth.
     *
     * Do not merge localStorage into the live queue. That was the
     * reason old POS orders such as a stale POS-1001 kept coming back
     * even when orders.json no longer contained them.
     */
    const nextOrders =
      mergeRecentRealtimeOrders(
        serverOrders
      )
        .filter(
          order =>
            !isTerminalQueueOrder(
              order
            )
        );


    /*
     * Keep the browser fallback cache synchronized to the backend.
     * This removes stale browser-only rows without deleting valid
     * orders that actually exist on the server.
     */
    try {

      localStorage.setItem(
        "cafe_orders",
        JSON.stringify(
          cleanServerRaw.slice(
            0,
            250
          )
        )
      );

    } catch (cacheError) {

      console.warn(
        "Unable to synchronize local order cache:",
        cacheError
      );
    }


    const changed =
      queueSnapshot(
        nextOrders
      ) !==
      queueSnapshot(
        orders
      );


    orders =
      nextOrders;


    if (
      selectedOrderId &&
      !findOrderByIdentifier(
        selectedOrderId
      )
    ) {
      selectedOrderId =
        null;
    }


    if (changed) {
      renderAll();
    }


    apiConnected =
      true;


    updateConnectionIndicator();


  } catch (error) {

    apiConnected =
      false;


    console.warn(
      "Backend API unavailable. " +
      "Using shared Live Server orders.",
      error
    );


    const nextOrders =
      mergeRecentRealtimeOrders(
        localOrders
      )
        .filter(
          order =>
            !isTerminalQueueOrder(
              order
            )
        );


    const changed =
      queueSnapshot(
        nextOrders
      ) !==
      queueSnapshot(
        orders
      );


    orders =
      nextOrders;


    if (changed) {
      renderAll();
    }


    updateConnectionIndicator();


  } finally {

    queueSyncInFlight =
      false;


    if (
      queuedSync
    ) {

      queuedSync =
        false;

      window.setTimeout(
        fetchOrders,
        0
      );
    }
  }
}

let socketConnected = false;
let apiConnected = false;
let queueSocket = null;
let socketEventsBound = false;

function setLiveState(state, label) {
  const text = $("liveStatusText");
  const dot = document.querySelector(".live-dot");

  if (!text || !dot) {
    return;
  }

  dot.classList.remove(
    "online",
    "offline",
    "connecting"
  );

  if (state === "online") {
    dot.classList.add("online");
    dot.style.background = "var(--green)";
    text.textContent = label || "Live";
    return;
  }

  if (state === "connecting") {
    dot.classList.add("connecting");
    dot.style.background = "#e3a52f";
    text.textContent = label || "Connecting...";
    return;
  }

  dot.classList.add("offline");
  dot.style.background = "#c96c60";
  text.textContent = label || "Offline";
}

function updateConnectionIndicator() {
  if (socketConnected) {
    setLiveState("online", "Live");
    return;
  }

  if (queueSocket && !queueSocket.connected) {
    setLiveState("connecting", "Reconnecting...");
    return;
  }

  if (apiConnected) {
    // REST works but realtime socket is unavailable.
    setLiveState("connecting", "Syncing...");
    return;
  }

  setLiveState("offline", "Offline");
}

function joinRealtimeRooms() {
  if (!queueSocket?.connected) {
    return;
  }

  const activeCafeId = syncAuthenticatedCafeId();

  // Always join using the cafe attached to the active authenticated role.
  // The server also enforces socket.user.cafeId, so another role tab cannot
  // accidentally move this Manager/Staff queue into the wrong cafe room.
  queueSocket.emit(
    "join-order-queue",
    activeCafeId,
    result => {
      if (result?.cafeId) syncAuthenticatedCafeId(result.cafeId);
      if (result?.success === false) console.warn("Order Queue room join rejected:", result.message || result);
    }
  );

  queueSocket.emit(
    "join-pos",
    activeCafeId,
    result => {
      if (result?.cafeId) syncAuthenticatedCafeId(result.cafeId);
      if (result?.success === false) console.warn("POS room join rejected:", result.message || result);
    }
  );
}

function bindSocketEvents(socket) {
  if (!socket || socketEventsBound) {
    return;
  }

  socketEventsBound = true;
  queueSocket = socket;

  socket.on("connect", () => {
    socketConnected = true;

    console.log(
      `🟢 POS Order Queue connected: ${socket.id}`
    );

    joinRealtimeRooms();
    updateConnectionIndicator();

    // Pull fresh data immediately after reconnecting.
    fetchOrders();
  });

  socket.on("auth:ready", () => {
    joinRealtimeRooms();
    updateConnectionIndicator();
  });

  socket.on("auth:error", payload => {
    console.warn(
      "Socket authorization error:",
      payload?.message || payload
    );

    // The transport may still be connected, but the user
    // cannot join the Staff/POS rooms without authentication.
    if (
      String(
        payload?.message || ""
      ).toLowerCase().includes("login required")
    ) {
      setLiveState(
        "offline",
        "Login Required"
      );
    }
  });

  socket.on("disconnect", reason => {
    socketConnected = false;

    console.warn(
      "🔴 POS Order Queue disconnected:",
      reason
    );

    updateConnectionIndicator();
  });

  socket.on("connect_error", error => {
    socketConnected = false;

    console.error(
      "Socket.IO connection error:",
      error.message
    );

    updateConnectionIndicator();
  });

  socket.io?.on(
    "reconnect_attempt",
    () => {
      socketConnected = false;
      setLiveState(
        "connecting",
        "Reconnecting..."
      );
    }
  );

  // ----------------------------------------------------------
  // NEW ORDERS FROM BOTH POS + KIOSK
  // ----------------------------------------------------------
  socket.on(
    "new-order",
    backendOrder => {
      console.log(
        "🔔 POS Order Queue received new order:",
        backendOrder?.source,
        backendOrder
      );

      rememberRealtimeOrder(
        backendOrder
      );

      scheduleQueueSync(
        120
      );
    }
  );


  // Compatibility event used by some backend versions.
  socket.on(
    "order:created",
    backendOrder => {
      console.log(
        "🔔 POS Order Queue received order:created:",
        backendOrder?.source,
        backendOrder
      );

      if (backendOrder) {
        rememberRealtimeOrder(
          backendOrder
        );
      }

      scheduleQueueSync(
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

      scheduleQueueSync(
        120
      );
    }
  );


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

      scheduleQueueSync(
        120
      );
    }
  );


  // Most important fallback:
  // every successful POS/Kiosk order change makes the queue
  // re-fetch the shared /api/orders list.
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
        "🔄 POS Order Queue orders changed:",
        payload?.source ||
        payload?.method ||
        "POS/Kiosk"
      );

      scheduleQueueSync(
        100
      );
    }
  );

  // CafeAuth may have connected before this page script loaded.
  if (socket.connected) {
    socketConnected = true;
    joinRealtimeRooms();
    updateConnectionIndicator();
  }
}

function setupSocket() {
  setLiveState(
    "connecting",
    "Connecting..."
  );

  // Preferred: reuse the authenticated socket created by
  // auth-session.js. This avoids two Socket.IO connections.
  if (window.CafeAuth?.socket) {
    bindSocketEvents(
      window.CafeAuth.socket
    );

    return;
  }

  if (typeof window.io !== "function") {

    console.warn(
      "Socket.IO not loaded yet. " +
      "REST/local order receiving is already active."
    );

    const existing =
      document.querySelector(
        'script[data-cafekiosk-queue-socket]'
      );

    if (!existing) {

      const script =
        document.createElement(
          "script"
        );

      script.src =
        `${API_URL}/socket.io/socket.io.js`;

      script.async =
        true;

      script.dataset
        .cafekioskQueueSocket =
        "true";

      script.onload =
        () => {
          setupSocket();
        };

      script.onerror =
        () => {
          console.warn(
            "Socket.IO unavailable. " +
            "Continuing with REST/local sync."
          );

          updateConnectionIndicator();
        };

      document.head.appendChild(
        script
      );
    }

    return;
  }

  const token = getAuthToken();

  queueSocket = window.io(
    API_URL,
    {
      auth: { role: activeQueueRole() },

      withCredentials: true,

      transports: [
        "websocket",
        "polling"
      ],

      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 700,
      reconnectionDelayMax: 5000,
      timeout: 8000
    }
  );

  bindSocketEvents(
    queueSocket
  );
}

function openVoidRefundModal(id) {

  const order =
    findOrderByIdentifier(
      id
    );

  if (!order) {
    return;
  }

  modalOrderId =
    getStableOrderKey(
      order
    );

  currentAction = "void";
  setActionType("void");
  $("modalOrderTitle").textContent = `Order #${order.id}`;
  $("modalOrderDate").textContent = `${order.date} ${order.time}`;
  $("modalItemCount").textContent = `${order.items.length} ${order.items.length === 1 ? "Item" : "Items"}`;
  $("modalSubtotal").textContent = peso(order.subtotal);
  $("modalDiscount").textContent = `-${peso(order.discount)}`;
  $("modalTotalPaid").textContent = peso(
    Number(order.paymentAmount ?? order.payment_amount ?? order.cashReceived ?? order.total) || order.total
  );
  $("reasonSelect").value = "";
  if ($("managerPin")) $("managerPin").value = "";
  verifiedApproval = null;
  if (staffNeedsApprovalPin()) setApprovalPinFeedback("");

  $("modalItemsBody").innerHTML = order.items.map((item, index) => {
    const lineTotal = item.price * item.qty;
    const size = item.customizations?.[0] || "";
    return `
      <tr>
        <td>
          <div class="modal-item-info">
            <label class="item-select-check">
              <input type="checkbox" class="modal-item-checkbox" data-index="${index}" checked>
              <span class="check-box">✓</span>
            </label>
            <span class="item-placeholder" aria-hidden="true"></span>
            <span class="modal-item-name">${escapeHTML(item.name)}${size ? `<small>${escapeHTML(size)}</small>` : ""}</span>
          </div>
        </td>
        <td>${item.qty}</td>
        <td>${peso(item.price)}</td>
        <td>${peso(lineTotal)}</td>
      </tr>`;
  }).join("");

  updateSpecificSelectionState();
  $("voidRefundModal").classList.add("active");
  $("voidRefundModal").setAttribute("aria-hidden", "false");
}

function closeVoidRefundModal() {
  $("voidRefundModal").classList.remove("active");
  $("voidRefundModal").setAttribute("aria-hidden", "true");
  modalOrderId = null;
}

function setActionType(type) {
  currentAction = type === "refund" ? "refund" : "void";
  const isVoid = currentAction === "void";

  $("voidAction")?.classList.toggle("active", isVoid);
  $("refundAction")?.classList.toggle("active", !isVoid);

  if ($("optionHeading")) {
    $("optionHeading").textContent =
      isVoid ? "Void Option:" : "Refund Option:";
  }

  if ($("entireLabel")) {
    $("entireLabel").textContent =
      isVoid ? "Void Entire Order" : "Refund Entire Order";
  }

  if ($("entireHelp")) {
    $("entireHelp").textContent =
      isVoid ? "Cancel the whole order" : "Refund the whole order";
  }

  if ($("specificLabel")) {
    $("specificLabel").textContent =
      isVoid ? "Void Specific Items" : "Refund Specific Items";
  }

  if ($("specificHelp")) {
    $("specificHelp").textContent =
      isVoid ? "Cancel selected items" : "Refund selected items";
  }

  if ($("paymentLabel")) {
    $("paymentLabel").textContent =
      isVoid ? "Void Payment" : "Refund Payment";
  }

  if ($("paymentHelp")) {
    $("paymentHelp").textContent =
      isVoid ? "Cancel the payment record" : "Refund the payment record";
  }

  if ($("restockText")) {
    $("restockText").textContent = isVoid
      ? "Voided items will be restocked automatically."
      : "Refunded items will be recorded automatically.";
  }

  const confirmButton = $("confirmVoidRefundButton");
  const confirmText = $("confirmActionText");
  const modalOverlay = $("voidRefundModal");

  if (confirmText) {
    confirmText.textContent =
      isVoid ? "Confirm Void" : "Confirm Refund";
  }

  confirmButton?.classList.toggle("refund-mode", !isVoid);
  modalOverlay?.classList.toggle("refund-mode", !isVoid);
}

function selectedVoidOption() {
  return document.querySelector('input[name="voidOption"]:checked')?.value || "entire";
}

function updateSpecificSelectionState() {
  const specific = selectedVoidOption() === "specific";
  document.querySelectorAll(".modal-item-checkbox").forEach(box => {
    box.disabled = !specific;
    if (!specific) box.checked = true;
  });
}

function saveQueueAudit(order, option, reason) {
  const history = JSON.parse(localStorage.getItem("cafe_order_adjustments") || "[]");
  history.unshift({
    orderId: order.id, action: currentAction, option, reason, createdAt: new Date().toISOString()
  });
  localStorage.setItem("cafe_order_adjustments", JSON.stringify(history));
}

async function processVoidRefund() {
  const order =
    findOrderByIdentifier(
      modalOrderId
    );

  if (!order) {
    alert("Order could not be found.");
    return;
  }

  const reason =
    $("reasonSelect").value;

  const pin =
    $("managerPin")
      ? $("managerPin").value.trim()
      : "";

  if (!reason) {
    alert("Please select a reason.");
    $("reasonSelect").focus();
    return;
  }

  if (staffNeedsApprovalPin()) {
    if (!/^\d{4,6}$/.test(pin)) {
      alert("Please enter a 4-6 digit Admin/Manager PIN.");
      $("managerPin")?.focus();
      return;
    }
    const approval = verifiedApproval?.pin === pin ? verifiedApproval : await verifyEnteredApprovalPin({ silent: true });
    if (!approval) {
      alert($("approvalPinFeedback")?.textContent || "The Admin/Manager approval PIN was not accepted.");
      $("managerPin")?.focus();
      return;
    }
  }

  const option =
    selectedVoidOption();

  const selectedIndexes =
    option === "specific"
      ? [
          ...document.querySelectorAll(
            ".modal-item-checkbox:checked"
          )
        ].map(
          element =>
            Number(element.dataset.index)
        )
      : [];

  if (
    option === "specific" &&
    !selectedIndexes.length
  ) {
    alert("Select at least one item.");
    return;
  }

  const patch = {
    adjustmentAction:
      currentAction,

    adjustmentScope:
      option,

    adjustmentReason:
      reason,

    managerPin:
      staffNeedsApprovalPin() ? pin : "",

    adjustmentAt:
      new Date().toISOString()
  };

  if (option === "entire") {
    patch.status =
      currentAction === "void"
        ? "Voided"
        : "Refunded";

    if (currentAction === "refund") {
      patch.paymentStatus =
        "refunded";
    }
  }

  if (option === "payment") {
    patch.paymentStatus =
      currentAction === "void"
        ? "voided"
        : "refunded";
  }

  if (option === "specific") {
    const remainingItems =
      order.items.filter(
        (_, index) =>
          !selectedIndexes.includes(index)
      );

    const subtotal =
      remainingItems.reduce(
        (sum, item) =>
          sum +
          Number(item.price || 0) *
          Number(item.qty || 1),
        0
      );

    const discount =
      Math.min(
        Number(order.discount || 0),
        subtotal
      );

    const total =
      Math.max(
        0,
        subtotal - discount
      );

    patch.items =
      remainingItems.map(
        item => ({
          name:
            item.name,

          qty:
            Number(item.qty || 1),

          quantity:
            Number(item.qty || 1),

          price:
            Number(item.price || 0),

          productId:
            item.productId || "",

          category:
            item.category || "Uncategorized",

          prepStation:
            item.prepStation || classifyPrepStation(item.category, item.name),

          customizations:
            Array.isArray(
              item.customizations
            )
              ? item.customizations
              : []
        })
      );

    patch.subtotal =
      subtotal;

    patch.discountAmount =
      discount;

    patch.total =
      total;

    if (currentAction === "refund") {
      patch.paymentStatus =
        "partially-refunded";
    }
  }

  const confirmButton =
    $("confirmVoidRefundButton");

  const originalText =
    confirmButton?.innerHTML;

  try {
    if (confirmButton) {
      confirmButton.disabled =
        true;

      confirmButton.textContent =
        currentAction === "void"
          ? "Saving Void..."
          : "Saving Refund...";
    }

    const response =
      await authenticatedFetch(
        `${API_URL}/api/orders/${encodeURIComponent(
          order.orderNumber ||
          order.apiId ||
          order.id
        )}`,
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
            JSON.stringify(patch)
        }
      );

    let data = {};

    try {
      data =
        await response.json();
    } catch (_) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        `PATCH returned ${response.status}`
      );
    }

    let savedOrder =
      data.order
        ? normalizeOrder(
            data.order
          )
        : {
            ...order,
            ...patch
          };


    if (
      option === "entire" &&
      isTerminalQueueOrder(
        savedOrder
      )
    ) {

      removeOrderFromLiveQueue(
        savedOrder
      );

    } else {

      const index =
        orders.findIndex(
          item =>
            getOrderLookupKeys(
              item
            ).some(
              key =>
                getOrderLookupKeys(
                  order
                ).includes(
                  key
                )
            )
        );


      if (index >= 0) {
        orders[index] =
          savedOrder;
      }
    }


    saveQueueAudit(
      order,
      option,
      reason
    );


    closeVoidRefundModal();
    renderAll();

    await fetchOrders();

    alert(
      `${currentAction === "void" ? "Void" : "Refund"} saved for Order #${order.id}.`
    );

  } catch (error) {
    console.error(
      "Unable to save Void/Refund:",
      error
    );

    alert(
      `Unable to save the ${currentAction}.\n\n${error.message}`
    );

  } finally {
    if (confirmButton) {
      confirmButton.disabled =
        false;

      if (originalText) {
        confirmButton.innerHTML =
          originalText;
      }
    }
  }
}

async function cycleSelectedOrderStatus() {
  const order =
    getSelectedOrder();

  if (!order) {
    return;
  }

  const status =
    statusForCurrentView(order);

  if (
    status === "Completed" ||
    status === "Voided" ||
    status === "Refunded"
  ) {
    alert(
      `Order #${order.id} is already ${status.toLowerCase()}.`
    );
    return;
  }

  const nextStatus =
    status === "Pending"
      ? "Preparing"
      : "Completed";

  const button =
    $("updateStatusButton");

  try {
    if (button) {
      button.disabled = true;
      button.textContent =
        "Updating...";
    }

    const orderIdentifier = encodeURIComponent(order.orderNumber || order.apiId || order.id);
    const stationSpecific = activePrepStation === "Beverage" || activePrepStation === "Food";
    const endpoint = stationSpecific
      ? `${API_URL}/api/orders/${orderIdentifier}/station-status`
      : `${API_URL}/api/orders/${orderIdentifier}/status`;
    const response =
      await authenticatedFetch(
        endpoint,
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
            JSON.stringify(stationSpecific
              ? { station: activePrepStation, status: nextStatus }
              : { status: nextStatus })
        }
      );

    let data = {};

    try {
      data =
        await response.json();
    } catch (_) {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data.message ||
        `PATCH returned ${response.status}`
      );
    }

    if (data.order) {
      const normalized =
        normalizeOrder(data.order);

      const index =
        orders.findIndex(
          item =>
            getOrderLookupKeys(
              item
            ).some(
              key =>
                getOrderLookupKeys(
                  order
                ).includes(
                  key
                )
            )
        );

      if (index >= 0) {
        orders[index] =
          normalized;
      }
    } else if (activePrepStation === "Beverage" || activePrepStation === "Food") {
      order.stationStatuses = order.stationStatuses || {};
      order.stationStatuses[activePrepStation] = { status: nextStatus, updatedAt: new Date().toISOString() };
    } else {
      order.status =
        nextStatus;
    }

    renderAll();
    await fetchOrders();

  } catch (error) {
    console.error(
      "Unable to update order status:",
      error
    );

    alert(
      `Unable to update the order status.\n\n${error.message}`
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = activePrepStation === "all"
        ? "Update Status"
        : `Update ${activePrepStation} Status`;
    }
  }
}

function setupEvents() {
  configureApprovalPinUI();
  // Dynamic row buttons are recreated whenever the queue refreshes,
  // so handle them from one stable document-level listener.
  document.addEventListener(
    "click",
    event => {

      const viewButton =
        event.target.closest(
          "[data-view]"
        );


      if (viewButton) {

        event.preventDefault();
        event.stopPropagation();

        window.CafeQueueViewOrder(
          viewButton.dataset.view
        );

        return;
      }


      const actionButton =
        event.target.closest(
          "[data-void]"
        );


      if (actionButton) {

        event.preventDefault();
        event.stopPropagation();

        window.CafeQueueOpenActions(
          actionButton.dataset.void
        );
      }
    },
    true
  );

  ["statusFilter", "sourceFilter", "serviceFilter", "timeFilter"].forEach(id => {

    const element =
      $(id);

    if (element) {
      element.addEventListener(
        "change",
        () => {
          currentPage = 1;
          renderTable();
        }
      );
    }
  });


  $("orderSearch")?.addEventListener(
    "input",
    () => {
      currentPage = 1;
      renderTable();
    }
  );

  document.querySelectorAll(".station-tab").forEach(tab => {
    const station = normalizePrepStation(tab.dataset.station) || "all";
    tab.classList.toggle("active", activePrepStation === station);
    tab.addEventListener("click", () => {
      activePrepStation = station;
      document.querySelectorAll(".station-tab").forEach(button => button.classList.toggle("active", (normalizePrepStation(button.dataset.station) || "all") === activePrepStation));
      const url = new URL(window.location.href);
      if (activePrepStation === "all") url.searchParams.delete("station");
      else url.searchParams.set("station", activePrepStation.toLowerCase());
      window.history.replaceState({}, "", url);
      currentPage = 1;
      selectedOrderId = null;
      renderAll();
      if ($("updateStatusButton")) $("updateStatusButton").textContent = activePrepStation === "all" ? "Update Status" : `Update ${activePrepStation} Status`;
    });
  });

  document.querySelectorAll(".status-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".status-tab").forEach(t => t.classList.remove("active"));
      if (activeStatusTab === tab.dataset.status) {
        activeStatusTab = "all";
      } else {
        activeStatusTab = tab.dataset.status;
        tab.classList.add("active");
      }
      currentPage = 1;
      renderTable();
    });
  });

  $("updateStatusButton")?.addEventListener(
    "click",
    cycleSelectedOrderStatus
  );
  $("closeDetailButton")?.addEventListener(
    "click",
    () => {
      selectedOrderId = null;
      renderDetails();
    }
  );

  $("closeVoidModal")?.addEventListener(
    "click",
    closeVoidRefundModal
  );

  $("cancelVoidButton")?.addEventListener(
    "click",
    closeVoidRefundModal
  );
  $("voidRefundModal")?.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        $("voidRefundModal")
      ) {
        closeVoidRefundModal();
      }
    }
  );

  $("voidAction")?.addEventListener(
    "click",
    () =>
      setActionType(
        "void"
      )
  );

  $("refundAction")?.addEventListener(
    "click",
    () =>
      setActionType(
        "refund"
      )
  );
  document.querySelectorAll('input[name="voidOption"]').forEach(radio =>
    radio.addEventListener("change", updateSpecificSelectionState)
  );
  $("togglePin")?.addEventListener(
    "click",
    () => {
      const input =
        $("managerPin");

      if (!input) {
        return;
      }

      const visible = input.type === "password";
      input.type = visible ? "text" : "password";
      const toggleButton = $("togglePin");
      if (window.CafeKioskPasswordVisibility?.renderButton) {
        window.CafeKioskPasswordVisibility.renderButton(toggleButton, visible);
      } else if (toggleButton) {
        toggleButton.setAttribute("aria-label", visible ? "Hide PIN" : "Show PIN");
        toggleButton.setAttribute("title", visible ? "Hide PIN" : "Show PIN");
      }
    }
  );

  $("confirmVoidRefundButton")?.addEventListener(
    "click",
    processVoidRefund
  );

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && $("voidRefundModal").classList.contains("active")) {
      closeVoidRefundModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {

  // Remove the old placeholder row before anything is rendered.
  purgeDiagnosticTestOrdersFromLocalStorage();

  // Remove it from the already-loaded in-memory list as well.
  orders =
    orders.filter(
      order =>
        !isDiagnosticTestOrder(
          order
        )
    );

  setupEvents();
  renderAll();

  console.log(
    "======================================"
  );
  console.log(
    "🧾 POS ORDER QUEUE"
  );
  console.log(
    "Cafe ID:",
    CAFE_ID
  );
  console.log(
    "Receiving sources: POS + Kiosk"
  );
  console.log(
    "Backend:",
    API_URL
  );
  console.log(
    "======================================"
  );

  // Load orders first. Socket.IO is optional.
  fetchOrders();

  setupSocket();


  window.addEventListener(
    "storage",
    event => {

      if (
        event.key ===
        "cafe_orders"
      ) {
        fetchOrders();
      }
    }
  );


  try {

    const orderChannel =
      new BroadcastChannel(
        "cafekiosk-orders"
      );

    orderChannel.addEventListener(
      "message",
      event => {

        if (
          !event.data?.cafeId ||
          String(
            event.data.cafeId
          ).trim() ===
          String(CAFE_ID).trim()
        ) {
          fetchOrders();
        }
      }
    );

  } catch (_) {
    // Optional.
  }


  // Same API fallback behavior used by the Admin Order Monitor.
  // This makes the page receive both POS and Kiosk orders even if
  // a Socket.IO event is temporarily missed.
  startQueueFallbackSync();

  window.addEventListener(
    "focus",
    () => {
      fetchOrders();
    }
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        joinRealtimeRooms();
        fetchOrders();
      }
    }
  );

  window.addEventListener(
    "cafe:auth-ready",
    () => {
      syncAuthenticatedCafeId();
      if (
        window.CafeAuth?.socket &&
        queueSocket !== window.CafeAuth.socket
      ) {
        socketEventsBound = false;
        bindSocketEvents(
          window.CafeAuth.socket
        );
      }

      joinRealtimeRooms();
      fetchOrders();
    }
  );
  window.addEventListener("cafekiosk:identity", event => {
    if (event?.detail?.cafeId) syncAuthenticatedCafeId(event.detail.cafeId);
    joinRealtimeRooms();
    fetchOrders();
  });


});
