const $ =
  id =>
    document.getElementById(
      id
    );


const CAFE_ID =
  String(
    localStorage.getItem(
      "cafeId"
    ) ||
    "cafe-1"
  ).trim() ||
  "cafe-1";


localStorage.setItem(
  "cafeId",
  CAFE_ID
);


// ============================================================
// BACKEND ORIGIN
// ============================================================

function resolveBackendOrigin() {

  // Page is already being served by Node.
  if (
    window.location.port ===
    "5000"
  ) {
    return window.location.origin;
  }


  // Double-clicked HTML file.
  if (
    window.location.protocol ===
    "file:"
  ) {
    return "http://127.0.0.1:5000";
  }


  const protocol =
    window.location.protocol ===
    "https:"
      ? "https:"
      : "http:";


  const hostname =
    window.location.hostname ||
    "127.0.0.1";


  return `${protocol}//${hostname}:5000`;
}


const API_URL =
  resolveBackendOrigin();


const INVENTORY_API =
  `${API_URL}/api/inventory`;

const INVENTORY_LIVE_API =
  `${INVENTORY_API}/live`;


// ============================================================
// AUTH
// ============================================================

function getAuthToken() {

  return (
    window.CafeAuth?.token ||
    localStorage.getItem(
      "cafeAuthToken"
    ) ||
    ""
  );
}


async function apiFetch(
  url,
  options = {}
) {

  // If the project has CafeAuth connected, reuse it.
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

      headers,

      credentials:
        "include",

      cache:
        options.cache ||
        "no-store"
    }
  );
}


// ============================================================
// UI / LIVE STATUS
// ============================================================

let apiConnected =
  false;


let socketConnected =
  false;


let inventorySocket =
  null;


let socketEventsBound =
  false;


function setLiveState(
  state,
  label
) {

  const holder =
    document.querySelector(
      ".live-state"
    );


  const text =
    $("inventoryLiveText");


  if (!holder || !text) {
    return;
  }


  holder.classList.remove(
    "offline",
    "connecting",
    "login-required"
  );


  if (
    state ===
    "live"
  ) {

    text.textContent =
      label ||
      "Live";

    return;
  }


  if (
    state ===
    "connecting"
  ) {

    holder.classList.add(
      "connecting"
    );

    text.textContent =
      label ||
      "Connecting...";

    return;
  }


  if (
    state ===
    "login"
  ) {

    holder.classList.add(
      "offline",
      "login-required"
    );

    text.textContent =
      label ||
      "Login Required";

    return;
  }


  holder.classList.add(
    "offline"
  );

  text.textContent =
    label ||
    "Offline";
}


function updateLiveState() {

  /*
   * REST successfully syncing means the page is live even if
   * Socket.IO is temporarily reconnecting. The 2-second fallback
   * continues to keep stock current.
   */
  if (
    apiConnected
  ) {

    setLiveState(
      "live",
      socketConnected
        ? "Live"
        : "Live"
    );

    return;
  }


  if (
    inventorySocket &&
    !inventorySocket.connected
  ) {

    setLiveState(
      "connecting",
      "Connecting..."
    );

    return;
  }


  setLiveState(
    "offline",
    "Offline"
  );
}


// ============================================================
// HELPERS
// ============================================================

function escapeHTML(
  value
) {

  return String(
    value ??
    ""
  ).replace(
    /[&<>"']/g,
    ch => ({
      "&":
        "&amp;",

      "<":
        "&lt;",

      ">":
        "&gt;",

      '"':
        "&quot;",

      "'":
        "&#039;"
    })[ch]
  );
}


function round(
  value
) {

  const n =
    Number(
      value ||
      0
    );


  return Number.isInteger(
    n
  )
    ? String(
        n
      )
    : n
        .toFixed(
          3
        )
        .replace(
          /0+$/,
          ""
        )
        .replace(
          /\.$/,
          ""
        );
}


// ============================================================
// STATE
// ============================================================

let ingredients =
  [];


let adjustments =
  [];


let selectedIngredientId =
  null;


let lowOnly =
  false;


let currentPage =
  1;


const PAGE_SIZE =
  9;


let syncInFlight =
  false;


// ============================================================
// INVENTORY RENDERING
// ============================================================

function ingredientStatus(
  item
) {

  const stock =
    Number(
      item.stock ||
      0
    );


  const low =
    Number(
      item.lowStockThreshold ||
      0
    );


  if (
    stock <=
    0
  ) {

    return {
      key:
        "out",

      label:
        "Out of Stock"
    };
  }


  if (
    stock <=
    low
  ) {

    return {
      key:
        "low",

      label:
        `Low Stock: ${round(
          stock
        )}`
    };
  }


  return {
    key:
      "in",

    label:
      "In Stock"
  };
}


function selectedIngredient() {

  return (
    ingredients.find(
      item =>
        String(
          item.id
        ) ===
        String(
          selectedIngredientId
        )
    ) ||
    null
  );
}


function getFilteredIngredients() {

  const query =
    $("inventorySearch")
      .value
      .trim()
      .toLowerCase();


  const category =
    $("categoryFilter")
      .value;


  return ingredients.filter(
    item => {

      const status =
        ingredientStatus(
          item
        );


      const matchesQuery =
        !query ||
        `${item.name} ${item.category} ${item.unit}`
          .toLowerCase()
          .includes(
            query
          );


      const matchesCategory =
        category ===
          "all" ||
        String(
          item.category
        ) ===
          category;


      const matchesLow =
        !lowOnly ||
        status.key ===
          "low" ||
        status.key ===
          "out";


      return (
        matchesQuery &&
        matchesCategory &&
        matchesLow
      );
    }
  );
}


function renderCategoryFilter() {

  const select =
    $("categoryFilter");


  const previous =
    select.value ||
    "all";


  const categories =
    [
      ...new Set(
        ingredients.map(
          item =>
            String(
              item.category ||
              "Other"
            )
        )
      )
    ].sort();


  select.innerHTML =
    `<option value="all">All Categories</option>` +
    categories
      .map(
        cat =>
          `<option value="${escapeHTML(
            cat
          )}">${escapeHTML(
            cat
          )}</option>`
      )
      .join(
        ""
      );


  if (
    [
      "all",
      ...categories
    ].includes(
      previous
    )
  ) {

    select.value =
      previous;
  }
}


function renderSummary() {

  const lowCount =
    ingredients.filter(
      item =>
        ingredientStatus(
          item
        ).key !==
        "in"
    ).length;


  $("lowStockCount").textContent =
    lowCount;


  $("ingredientCount").textContent =
    `${ingredients.length} ingredient${
      ingredients.length ===
      1
        ? ""
        : "s"
    }`;


  $("lowStockFilter")
    .classList
    .toggle(
      "active",
      lowOnly
    );
}


function renderPagination(
  total
) {

  const holder =
    $("inventoryPagination");


  const pages =
    Math.max(
      1,
      Math.ceil(
        total /
        PAGE_SIZE
      )
    );


  currentPage =
    Math.min(
      currentPage,
      pages
    );


  holder.innerHTML =
    "";


  for (
    let page = 1;
    page <=
      Math.min(
        pages,
        5
      );
    page++
  ) {

    const btn =
      document.createElement(
        "button"
      );


    btn.type =
      "button";


    btn.className =
      `page-btn${
        page ===
        currentPage
          ? " active"
          : ""
      }`;


    btn.textContent =
      page;


    btn.addEventListener(
      "click",
      () => {

        currentPage =
          page;

        renderTable();
      }
    );


    holder.appendChild(
      btn
    );
  }


  if (
    pages >
    1
  ) {

    const next =
      document.createElement(
        "button"
      );


    next.type =
      "button";


    next.className =
      "page-btn";


    next.textContent =
      "Next";


    next.disabled =
      currentPage >=
      pages;


    next.addEventListener(
      "click",
      () => {

        if (
          currentPage <
          pages
        ) {

          currentPage++;

          renderTable();
        }
      }
    );


    holder.appendChild(
      next
    );
  }
}


function renderTable() {

  const list =
    getFilteredIngredients();


  renderPagination(
    list.length
  );


  const start =
    (
      currentPage -
      1
    ) *
    PAGE_SIZE;


  const rows =
    list.slice(
      start,
      start +
      PAGE_SIZE
    );


  const tbody =
    $("inventoryTableBody");


  if (
    !rows.length
  ) {

    tbody.innerHTML =
      `<tr class="empty-row"><td colspan="7">No inventory ingredients match your filters.</td></tr>`;

    return;
  }


  tbody.innerHTML =
    rows
      .map(
        item => {

          const status =
            ingredientStatus(
              item
            );


          return `
            <tr
              data-row-id="${escapeHTML(
                item.id
              )}"
              class="${
                String(
                  item.id
                ) ===
                String(
                  selectedIngredientId
                )
                  ? "selected"
                  : ""
              }"
            >
              <td>
                <strong>
                  ${escapeHTML(
                    item.name
                  )}
                </strong>
              </td>

              <td>
                ${escapeHTML(
                  item.category ||
                  "Other"
                )}
              </td>

              <td>
                ${escapeHTML(
                  item.unit ||
                  ""
                )}
              </td>

              <td>
                <span class="stock-value">
                  ${round(
                    item.stock
                  )}
                  ${escapeHTML(
                    item.unit ||
                    ""
                  )}
                </span>
              </td>

              <td>
                ${round(
                  item.lowStockThreshold
                )}
                ${escapeHTML(
                  item.unit ||
                  ""
                )}
              </td>

              <td>
                <span
                  class="status-pill ${status.key}"
                >
                  ${
                    status.key ===
                    "in"
                      ? "✓ "
                      : "⚠ "
                  }
                  ${escapeHTML(
                    status.label
                  )}
                </span>
              </td>

              <td>
                <button
                  type="button"
                  class="row-edit-btn"
                  data-select="${escapeHTML(
                    item.id
                  )}"
                >
                  Edit
                </button>
              </td>
            </tr>
          `;
        }
      )
      .join(
        ""
      );
}


function renderAdjustPanel() {

  const item =
    selectedIngredient();


  $("adjustIngredientName").value =
    item?.name ||
    "";


  $("currentStockValue").textContent =
    item
      ? `${round(
          item.stock
        )} ${item.unit}`
      : "—";


  $("adjustmentUnit").textContent =
    item?.unit ||
    "—";


  $("applyAdjustmentBtn").disabled =
    !item;


  $("editIngredientBtn").disabled =
    !item;
}


function renderActivity() {

  const list =
    $("activityList");


  const recent =
    adjustments.slice(
      0,
      12
    );


  if (
    !recent.length
  ) {

    list.innerHTML =
      `<div class="activity-item"><strong>No stock movements yet</strong><span>Orders and manual stock changes will appear here.</span></div>`;

    return;
  }


  list.innerHTML =
    recent
      .map(
        item => {

          const up =
            item.type ===
              "increase" ||
            (
              item.type ===
                "set" &&
              Number(
                item.afterStock
              ) >=
              Number(
                item.beforeStock
              )
            );


          const sign =
            item.type ===
            "set"
              ? "="
              : up
                ? "+"
                : "−";


          return `
            <div class="activity-item">
              <strong>
                ${escapeHTML(
                  item.ingredientName ||
                  "Ingredient"
                )}
              </strong>

              <span
                class="activity-delta ${
                  up
                    ? "up"
                    : "down"
                }"
              >
                ${sign}${round(
                  item.quantity
                )}
                ·
                ${escapeHTML(
                  item.reason ||
                  "Adjustment"
                )}
              </span>

              <span>
                ${escapeHTML(
                  item.notes ||
                  item.source ||
                  ""
                )}
                ·
                ${escapeHTML(
                  item.date ||
                  ""
                )}
              </span>
            </div>
          `;
        }
      )
      .join(
        ""
      );
}


function renderAll() {

  renderCategoryFilter();

  renderSummary();

  renderTable();

  renderAdjustPanel();

  renderActivity();
}


// ============================================================
// HEALTH + INVENTORY SYNC
// ============================================================

async function checkBackendHealth() {

  try {

    const response =
      await fetch(
        `${API_URL}/health`,
        {
          method:
            "GET",

          credentials:
            "include",

          cache:
            "no-store"
        }
      );


    return response.ok;


  } catch (_) {

    return false;
  }
}


async function loadInventory(
  {
    quiet =
      false
  } = {}
) {

  if (
    syncInFlight
  ) {
    return;
  }


  syncInFlight =
    true;


  try {

    /*
     * LIVE STOCK SNAPSHOT
     *
     * This is intentionally read-only and does not depend on the
     * Socket.IO connection. If this succeeds, the Inventory page
     * is considered Live.
     */
    const liveResponse =
      await fetch(
        `${INVENTORY_LIVE_API}?cafeId=${encodeURIComponent(
          CAFE_ID
        )}`,
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


    if (
      liveResponse.status ===
      404
    ) {

      apiConnected =
        false;

      setLiveState(
        "offline",
        "Inventory API Missing"
      );

      throw new Error(
        "GET /api/inventory/live returned 404."
      );
    }


    if (
      !liveResponse.ok
    ) {

      let errorBody =
        {};


      try {

        errorBody =
          await liveResponse.json();

      } catch (_) {}


      const error =
        new Error(
          errorBody.message ||
          `Live inventory returned HTTP ${liveResponse.status}`
        );


      error.httpStatus =
        liveResponse.status;


      throw error;
    }


    const liveData =
      await liveResponse.json();


    ingredients =
      Array.isArray(
        liveData.ingredients
      )
        ? liveData.ingredients
        : [];


    if (
      selectedIngredientId &&
      !ingredients.some(
        item =>
          String(
            item.id
          ) ===
          String(
            selectedIngredientId
          )
      )
    ) {

      selectedIngredientId =
        null;
    }


    if (
      !selectedIngredientId &&
      ingredients.length
    ) {

      selectedIngredientId =
        ingredients[0].id;
    }


    apiConnected =
      true;


    $("lastSyncText").textContent =
      `Synced ${new Date().toLocaleTimeString(
        [],
        {
          hour:
            "2-digit",

          minute:
            "2-digit"
        }
      )}`;


    updateLiveState();


    /*
     * ADMIN DETAIL FETCH
     *
     * This adds recent stock movements when the Admin session is
     * available. Failure here does NOT knock the page Offline,
     * because the stock snapshot is already live.
     */
    try {

      const adminResponse =
        await apiFetch(
          `${INVENTORY_API}?cafeId=${encodeURIComponent(
            CAFE_ID
          )}`,
          {
            method:
              "GET",

            headers: {
              Accept:
                "application/json"
            },

            cache:
              "no-store"
          }
        );


      if (
        adminResponse.ok
      ) {

        const adminData =
          await adminResponse.json();


        if (
          Array.isArray(
            adminData.adjustments
          )
        ) {

          adjustments =
            adminData.adjustments;
        }
      }


    } catch (
      adminError
    ) {

      if (!quiet) {

        console.warn(
          "Admin inventory details are unavailable, but live stock is connected.",
          adminError
        );
      }
    }


    renderAll();


  } catch (
    error
  ) {

    apiConnected =
      false;


    if (
      !quiet
    ) {

      console.error(
        "Inventory live sync failed:",
        error
      );
    }


    const backendUp =
      await checkBackendHealth();


    if (
      backendUp
    ) {

      const status =
        Number(
          error?.httpStatus ||
          0
        );


      setLiveState(
        "offline",
        status
          ? `API Error ${status}`
          : "API Error"
      );

    } else {

      setLiveState(
        "offline",
        "Backend Offline"
      );
    }


  } finally {

    syncInFlight =
      false;
  }
}

// ============================================================
// INGREDIENT SELECTION / MODAL
// ============================================================

function selectIngredient(
  id
) {

  selectedIngredientId =
    String(
      id
    );


  renderTable();

  renderAdjustPanel();
}


function openIngredientModal(
  item =
    null
) {

  $("ingredientForm")
    .reset();


  $("ingredientEditId").value =
    item?.id ||
    "";


  $("ingredientModalTitle").textContent =
    item
      ? "Edit Ingredient"
      : "Add Ingredient";


  $("ingredientName").value =
    item?.name ||
    "";


  $("ingredientCategory").value =
    item?.category ||
    "Coffee";


  $("ingredientUnit").value =
    String(
      item?.unit ||
      "g"
    ).toLowerCase();


  $("ingredientStock").value =
    item
      ? Number(
          item.stock ||
          0
        )
      : 0;


  $("ingredientLowThreshold").value =
    item
      ? Number(
          item.lowStockThreshold ||
          0
        )
      : 0;


  $("initialStockField")
    .classList
    .toggle(
      "hidden",
      Boolean(
        item
      )
    );


  $("ingredientModal")
    .classList
    .remove(
      "hidden"
    );


  setTimeout(
    () =>
      $("ingredientName")
        .focus(),
    0
  );
}


function closeIngredientModal() {

  $("ingredientModal")
    .classList
    .add(
      "hidden"
    );
}


// ============================================================
// SAVE INGREDIENT
// ============================================================

async function saveIngredient(
  event
) {

  event.preventDefault();


  const editId =
    $("ingredientEditId")
      .value;


  const payload = {
    cafeId:
      CAFE_ID,

    name:
      $("ingredientName")
        .value
        .trim(),

    category:
      $("ingredientCategory")
        .value,

    unit:
      $("ingredientUnit")
        .value,

    lowStockThreshold:
      Number(
        $("ingredientLowThreshold")
          .value ||
        0
      )
  };


  if (
    !editId
  ) {

    payload.stock =
      Number(
        $("ingredientStock")
          .value ||
        0
      );
  }


  const url =
    editId
      ? `${INVENTORY_API}/ingredients/${encodeURIComponent(
          editId
        )}`
      : `${INVENTORY_API}/ingredients`;


  try {

    const response =
      await apiFetch(
        url,
        {
          method:
            editId
              ? "PATCH"
              : "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json"
          },

          body:
            JSON.stringify(
              payload
            )
        }
      );


    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    if (
      !response.ok
    ) {

      alert(
        data.message ||
        "Unable to save ingredient."
      );

      return;
    }


    closeIngredientModal();


    selectedIngredientId =
      data.ingredient?.id ||
      editId ||
      selectedIngredientId;


    await loadInventory();


  } catch (
    error
  ) {

    console.error(
      "Ingredient save failed:",
      error
    );


    alert(
      "Could not reach the inventory backend."
    );
  }
}


// ============================================================
// STOCK ADJUSTMENT
// ============================================================

async function applyAdjustment(
  event
) {

  event.preventDefault();


  const item =
    selectedIngredient();


  if (!item) {

    alert(
      "Select an ingredient first."
    );

    return;
  }


  const quantity =
    Number(
      $("adjustmentQuantity")
        .value
    );


  if (
    !Number.isFinite(
      quantity
    ) ||
    quantity <
    0
  ) {

    alert(
      "Enter a valid quantity."
    );

    return;
  }


  if (
    !$("adjustmentReason")
      .value
  ) {

    alert(
      "Select a reason."
    );

    return;
  }


  try {

    const response =
      await apiFetch(
        `${INVENTORY_API}/ingredients/${encodeURIComponent(
          item.id
        )}/adjust`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json"
          },

          body:
            JSON.stringify({
              cafeId:
                CAFE_ID,

              type:
                $("adjustmentType")
                  .value,

              quantity,

              reason:
                $("adjustmentReason")
                  .value,

              date:
                $("adjustmentDate")
                  .value,

              notes:
                $("adjustmentNotes")
                  .value
                  .trim(),

              source:
                "admin"
            })
        }
      );


    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    if (
      !response.ok
    ) {

      alert(
        data.message ||
        "Unable to adjust stock."
      );

      return;
    }


    $("adjustmentQuantity").value =
      "";


    $("adjustmentNotes").value =
      "";


    await loadInventory();


  } catch (
    error
  ) {

    console.error(
      "Stock adjustment failed:",
      error
    );


    alert(
      "Could not reach the inventory backend."
    );
  }
}


// ============================================================
// SOCKET.IO LIVE CONNECTION
// ============================================================

function joinAdminRoom() {

  if (
    !inventorySocket?.connected
  ) {
    return;
  }


  inventorySocket.emit(
    "join-admin",
    CAFE_ID
  );
}


function bindSocketEvents(
  socket
) {

  if (
    !socket ||
    socketEventsBound
  ) {
    return;
  }


  inventorySocket =
    socket;


  socketEventsBound =
    true;


  socket.on(
    "connect",
    () => {

      socketConnected =
        true;


      console.log(
        `🟢 Inventory connected: ${socket.id}`
      );


      joinAdminRoom();


      updateLiveState();


      loadInventory({
        quiet:
          true
      });
    }
  );


  socket.on(
    "auth:ready",
    () => {

      joinAdminRoom();

      updateLiveState();
    }
  );


  socket.on(
    "auth:error",
    payload => {

      console.warn(
        "Inventory socket auth error:",
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
            "login"
          )
      ) {

        setLiveState(
          "login",
          "Login Required"
        );
      }
    }
  );


  socket.on(
    "inventory:changed",
    payload => {

      if (
        !payload?.cafeId ||
        String(
          payload.cafeId
        ) ===
        String(
          CAFE_ID
        )
      ) {

        console.log(
          "📦 Inventory changed:",
          payload?.reason ||
          "update"
        );


        loadInventory({
          quiet:
            true
        });
      }
    }
  );


  socket.on(
    "disconnect",
    reason => {

      socketConnected =
        false;


      console.warn(
        "🔴 Inventory realtime disconnected:",
        reason
      );


      /*
       * Do not mark the page Offline if REST is still working.
       * The fallback sync keeps inventory live.
       */
      updateLiveState();
    }
  );


  socket.on(
    "connect_error",
    error => {

      socketConnected =
        false;


      console.warn(
        "Inventory Socket.IO connection error:",
        error.message
      );


      updateLiveState();
    }
  );


  if (
    socket.connected
  ) {

    socketConnected =
      true;

    joinAdminRoom();

    updateLiveState();
  }
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
          'script[data-inventory-socket-client]'
        );


      if (existing) {

        existing.addEventListener(
          "load",
          () =>
            resolve(),
          {
            once:
              true
          }
        );


        existing.addEventListener(
          "error",
          reject,
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
        .inventorySocketClient =
        "true";


      script.onload =
        () =>
          resolve();


      script.onerror =
        () =>
          reject(
            new Error(
              "Socket.IO client could not be loaded."
            )
          );


      document.head.appendChild(
        script
      );
    }
  );
}


async function setupRealtime() {

  setLiveState(
    "connecting",
    "Connecting..."
  );


  // Reuse an existing authenticated app socket when available.
  if (
    window.CafeAuth?.socket
  ) {

    bindSocketEvents(
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


    const socket =
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


    bindSocketEvents(
      socket
    );


  } catch (
    error
  ) {

    console.warn(
      "Realtime inventory connection could not start. REST sync remains active.",
      error
    );


    socketConnected =
      false;


    updateLiveState();
  }
}



async function loadSampleStock() {

  const confirmed =
    confirm(
      "Load the CafeKiosk sample ingredient stock?\n\nExisting ingredients will be kept. Only missing sample ingredients will be added."
    );


  if (!confirmed) {
    return;
  }


  try {

    const response =
      await apiFetch(
        `${INVENTORY_API}/seed-sample`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json"
          },

          body:
            JSON.stringify({
              cafeId:
                CAFE_ID
            })
        }
      );


    const data =
      await response
        .json()
        .catch(
          () => ({})
        );


    if (
      response.status ===
      401 ||
      response.status ===
      403
    ) {

      alert(
        "Please log in as Admin before loading sample stock."
      );

      return;
    }


    if (!response.ok) {

      alert(
        data.message ||
        "Unable to load sample stock."
      );

      return;
    }


    alert(
      `${data.addedCount || 0} sample ingredient(s) added. Existing stock was not overwritten.`
    );


    await loadInventory();


  } catch (
    error
  ) {

    console.error(
      "Sample stock load failed:",
      error
    );


    alert(
      "Could not reach the inventory backend."
    );
  }
}



// ============================================================
// EVENTS
// ============================================================

function setupEvents() {

  $("inventorySearch")
    ?.addEventListener(
      "input",
      () => {

        currentPage =
          1;

        renderTable();
      }
    );


  $("categoryFilter")
    ?.addEventListener(
      "change",
      () => {

        currentPage =
          1;

        renderTable();
      }
    );


  $("lowStockFilter")
    ?.addEventListener(
      "click",
      () => {

        lowOnly =
          !lowOnly;

        currentPage =
          1;

        renderSummary();

        renderTable();
      }
    );


  $("inventoryTableBody")
    ?.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-select]"
          );


        const row =
          event.target.closest(
            "[data-row-id]"
          );


        const id =
          button?.dataset.select ||
          row?.dataset.rowId;


        if (id) {

          selectIngredient(
            id
          );
        }
      }
    );


  $("addIngredientBtn")
    ?.addEventListener(
      "click",
      () =>
        openIngredientModal()
    );


  $("loadSampleStockBtn")
    ?.addEventListener(
      "click",
      loadSampleStock
    );


  $("editIngredientBtn")
    ?.addEventListener(
      "click",
      () => {

        const item =
          selectedIngredient();


        if (item) {

          openIngredientModal(
            item
          );
        }
      }
    );


  $("closeIngredientModal")
    ?.addEventListener(
      "click",
      closeIngredientModal
    );


  $("cancelIngredientModal")
    ?.addEventListener(
      "click",
      closeIngredientModal
    );


  $("ingredientModal")
    ?.addEventListener(
      "click",
      event => {

        if (
          event.target ===
          $("ingredientModal")
        ) {

          closeIngredientModal();
        }
      }
    );


  $("ingredientForm")
    ?.addEventListener(
      "submit",
      saveIngredient
    );


  $("adjustStockForm")
    ?.addEventListener(
      "submit",
      applyAdjustment
    );
}


// ============================================================
// START
// ============================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    console.log(
      "======================================"
    );

    console.log(
      "📦 INVENTORY MONITOR"
    );

    console.log(
      "Cafe ID:",
      CAFE_ID
    );

    console.log(
      "Backend:",
      API_URL
    );

    console.log(
      "Inventory API:",
      INVENTORY_API
    );

    console.log(
      "Live Stock API:",
      INVENTORY_LIVE_API
    );

    console.log(
      "======================================"
    );


    const dateInput =
      $("adjustmentDate");


    if (
      dateInput
    ) {

      dateInput.value =
        new Date()
          .toISOString()
          .slice(
            0,
            10
          );
    }


    setupEvents();


    /*
     * Load the API immediately. Socket.IO is additional realtime
     * acceleration, not a blocker for the page becoming Live.
     */
    await loadInventory();


    setupRealtime();


    /*
     * Fallback synchronization. If a realtime event is ever missed,
     * the latest stock still appears within two seconds.
     */
    window.setInterval(
      () => {

        if (
          document.visibilityState ===
          "visible"
        ) {

          loadInventory({
            quiet:
              true
          });
        }
      },
      2000
    );


    window.addEventListener(
      "focus",
      () =>
        loadInventory({
          quiet:
            true
        })
    );


    document.addEventListener(
      "visibilitychange",
      () => {

        if (
          document.visibilityState ===
          "visible"
        ) {

          joinAdminRoom();


          loadInventory({
            quiet:
              true
          });
        }
      }
    );


    window.addEventListener(
      "cafe:auth-ready",
      () => {

        socketEventsBound =
          false;


        if (
          window.CafeAuth?.socket
        ) {

          bindSocketEvents(
            window.CafeAuth.socket
          );

        } else {

          setupRealtime();
        }


        loadInventory({
          quiet:
            true
        });
      }
    );
  }
);
