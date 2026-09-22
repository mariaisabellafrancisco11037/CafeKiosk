(() => {
  "use strict";

  const CAFE_ID = String(localStorage.getItem("cafeId") || "cafe-1").trim() || "cafe-1";
  const $ = id => document.getElementById(id);

  let allOrders = [];
  let filteredOrders = [];
  let pollTimer = null;
  let resizeTimer = null;

  function resolveBackendOrigin() {
  // LAN-safe rule: when the page is opened through HTTP/HTTPS, always use
  // the exact hostname the browser used (localhost on laptop, LAN IP on tablet).
  // This avoids stale localStorage IP overrides after Wi-Fi/hotspot changes.
  if (window.location.protocol === "http:" || window.location.protocol === "https:") {
    if (window.location.port === "5000") return window.location.origin;
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  const saved = String(localStorage.getItem("cafeBackendUrl") || "").trim();
  if (saved) return saved.replace(/\/$/, "");
  return "http://127.0.0.1:5000";
}

  const API_URL = resolveBackendOrigin();

  async function apiFetch(url, options = {}) {
    if (window.CafeAuth?.apiFetch) return window.CafeAuth.apiFetch(url, options);

    const headers = new Headers(options.headers || {});
    const token =
      window.CafeAuth?.token ||
      localStorage.getItem("cafeAdminAuthToken") ||
      sessionStorage.getItem("cafeAuthToken") ||
      "";

    if (token) headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, {
      ...options,
      credentials: "include",
      headers
    });
  }

  function n(value) {
    const result = Number(value);
    return Number.isFinite(result) ? result : 0;
  }

  function money(value) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(n(value));
  }

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function normStatus(value) {
    const status = String(value || "Pending").trim().toUpperCase();
    if (status.includes("COMPLETE")) return "COMPLETED";
    if (status.includes("PREPAR") || status === "READY" || status === "ACCEPTED") return "PREPARING";
    if (status.includes("REFUND")) return "REFUNDED";
    if (status.includes("CANCEL") || status.includes("VOID")) return "CANCELLED";
    return "PENDING";
  }

  function normalizeSource(value) {
    const source = String(value || "").trim().toLowerCase();
    if (source.includes("kiosk")) return "Kiosk";
    if (source.includes("pos")) return "POS";
    return "Unknown";
  }

  function itemQty(item) {
    return Math.max(1, n(item?.qty ?? item?.quantity ?? item?.count ?? 1));
  }

  function itemTotal(item) {
    const direct = n(item?.subtotal ?? item?.total);
    if (direct > 0) return direct;

    const price = n(item?.unitPrice ?? item?.price);
    const extra = n(item?.customizationCost);
    return (price + extra) * itemQty(item);
  }

  function orderTotal(order, items) {
    const direct = n(order?.total);
    if (direct > 0) return direct;

    const subtotal = n(order?.subtotal);
    if (subtotal > 0) {
      return Math.max(0, subtotal - n(order?.discountAmount ?? order?.discount));
    }

    return items.reduce((sum, item) => sum + itemTotal(item), 0);
  }

  function normOrder(order, index) {
    const items = Array.isArray(order?.items)
      ? order.items
      : Array.isArray(order?.orderItems)
        ? order.orderItems
        : [];

    const createdAt = order?.createdAt ?? order?.created_at ?? order?.timestamp ?? order?.date ?? "";
    const date = new Date(createdAt);
    const source = normalizeSource(order?.source ?? order?.channel);

    return {
      ...order,
      id: String(order?.orderNumber ?? order?.orderId ?? order?.id ?? `order-${index + 1}`),
      source,
      status: normStatus(order?.status),
      createdAt,
      date: Number.isNaN(date.getTime()) ? null : date,
      items,
      total: orderTotal(order, items),
      paymentMethod: order?.paymentMethod ?? order?.payment?.method ?? "Not recorded",
      customer:
        order?.customerName ??
        order?.customer ??
        order?.name ??
        (source === "POS" ? "Walk-in Customer" : source === "Kiosk" ? "Kiosk Customer" : "Customer")
    };
  }

  function completed(list) {
    return list.filter(order => order.status === "COMPLETED");
  }

  function revenue(list) {
    return completed(list).reduce((sum, order) => sum + n(order.total), 0);
  }

  function isoDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function setDefaultRange(days = 30) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));

    if ($("fromDate")) $("fromDate").value = isoDate(start);
    if ($("toDate")) $("toDate").value = isoDate(end);
  }

  function rangeBounds() {
    const from = $("fromDate")?.value;
    const to = $("toDate")?.value;
    if (!from || !to) return null;

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59.999`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

    return { start, end };
  }

  function applyFilter() {
    const range = rangeBounds();
    if (!range) return;

    filteredOrders = allOrders.filter(order => {
      return order.date && order.date >= range.start && order.date <= range.end;
    });

    render();
  }

  function productStats() {
    const map = new Map();

    filteredOrders
      .filter(order => !["CANCELLED", "REFUNDED"].includes(order.status))
      .forEach(order => {
        order.items.forEach(item => {
          const name = String(item?.name ?? item?.productName ?? item?.title ?? "").trim();
          if (!name) return;

          const current = map.get(name) || { name, qty: 0, sales: 0 };
          current.qty += itemQty(item);
          current.sales += itemTotal(item);
          map.set(name, current);
        });
      });

    return [...map.values()].sort((a, b) => b.qty - a.qty || b.sales - a.sales);
  }

  function countBy(getter) {
    const map = new Map();
    filteredOrders.forEach(order => {
      const key = String(getter(order) || "Unknown");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }

  function renderBreakdown(id, rows, formatter = value => value) {
    const element = $(id);
    if (!element) return;

    element.innerHTML = rows.length
      ? rows.slice(0, 6).map(([key, value]) => `
          <div class="breakdown-row">
            <span title="${esc(key)}">${esc(key)}</span>
            <strong>${esc(formatter(value))}</strong>
          </div>
        `).join("")
      : `<div class="empty-state">No data.</div>`;
  }

  function renderMetrics() {
    const completedList = completed(filteredOrders);
    const products = productStats();
    const totalRevenue = revenue(filteredOrders);

    if ($("totalSales")) $("totalSales").textContent = money(totalRevenue);
    if ($("totalOrders")) $("totalOrders").textContent = filteredOrders.length.toLocaleString();
    if ($("avgOrderValue")) $("avgOrderValue").textContent = money(completedList.length ? totalRevenue / completedList.length : 0);
    if ($("topProduct")) $("topProduct").textContent = products[0]?.name || "—";
    if ($("topProductQty")) $("topProductQty").textContent = products[0] ? `${products[0].qty} sold` : "No sales yet";

    const range = rangeBounds();
    if ($("salesRangeLabel")) {
      $("salesRangeLabel").textContent = range
        ? `${range.start.toLocaleDateString("en-PH")} – ${range.end.toLocaleDateString("en-PH")}`
        : "Selected range";
    }
  }

  function renderHistory() {
    const element = $("transactionList");
    if (!element) return;

    const list = [...filteredOrders]
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))
      .slice(0, 40);

    element.innerHTML = list.length
      ? list.map(order => `
          <article class="transaction-card">
            <div class="transaction-head">
              <strong>${esc(order.id)}</strong>
              <span>${esc(order.date ? order.date.toLocaleString("en-PH") : "No date")}</span>
            </div>
            <div class="transaction-row">
              <b>Channel:</b><span>${esc(order.source)}</span>
              <b>Customer:</b><span>${esc(order.customer)}</span>
              <b>Amount:</b><span>${esc(money(order.total))}</span>
              <b>Payment:</b><span>${esc(order.paymentMethod)}</span>
              <b>Status:</b><span>${esc(order.status)}</span>
            </div>
          </article>
        `).join("")
      : `<div class="empty-state">No transactions in this date range.</div>`;
  }

  function dayGroups() {
    const range = rangeBounds();
    if (!range) return [];

    const rows = [];
    const cursor = new Date(range.start);

    while (cursor <= range.end && rows.length < 62) {
      const key = isoDate(cursor);
      const dayOrders = filteredOrders.filter(order => order.date && isoDate(order.date) === key);

      rows.push({
        date: new Date(cursor),
        orders: dayOrders.length,
        revenue: revenue(dayOrders)
      });

      cursor.setDate(cursor.getDate() + 1);
    }

    return rows;
  }

  function drawChart() {
    const canvas = $("salesChart");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const width = rect.width;
    const height = rect.height;
    ctx.clearRect(0, 0, width, height);

    const rows = dayGroups();
    if (!rows.length) {
      ctx.fillStyle = "#9e8c77";
      ctx.font = '12px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.fillText("No sales data in selected range", width / 2, height / 2);
      return;
    }

    const margin = { left: 52, right: 18, top: 18, bottom: 35 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    const maxRevenue = Math.max(...rows.map(row => row.revenue), 1);
    const maxOrders = Math.max(...rows.map(row => row.orders), 1);

    ctx.strokeStyle = "rgba(75,50,31,.13)";
    ctx.fillStyle = "#674a31";
    ctx.font = '9px "Segoe UI", Arial, sans-serif';

    for (let i = 0; i <= 4; i++) {
      const y = margin.top + chartHeight - (i / 4) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();

      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillText(`₱${Math.round(((maxRevenue / 4) * i) / 1000)}k`, margin.left - 7, y);
    }

    const step = chartWidth / rows.length;

    rows.forEach((row, index) => {
      const barHeight = (row.orders / maxOrders) * chartHeight * .45;
      const x = margin.left + index * step + step * .2;
      ctx.fillStyle = "#4c956f";
      ctx.fillRect(x, margin.top + chartHeight - barHeight, Math.max(3, step * .52), barHeight);
    });

    ctx.strokeStyle = "#ff7133";
    ctx.fillStyle = "#ff7133";
    ctx.lineWidth = 2.2;
    ctx.beginPath();

    rows.forEach((row, index) => {
      const x = margin.left + index * step + step / 2;
      const y = margin.top + chartHeight - (row.revenue / maxRevenue) * chartHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    rows.forEach((row, index) => {
      const x = margin.left + index * step + step / 2;
      const y = margin.top + chartHeight - (row.revenue / maxRevenue) * chartHeight;
      ctx.beginPath();
      ctx.arc(x, y, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    const labelEvery = Math.max(1, Math.ceil(rows.length / 8));
    ctx.fillStyle = "#674a31";
    ctx.font = '8px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    rows.forEach((row, index) => {
      if (index % labelEvery === 0 || index === rows.length - 1) {
        ctx.fillText(
          row.date.toLocaleDateString("en-PH", { month: "short", day: "numeric" }),
          margin.left + index * step + step / 2,
          height - 17
        );
      }
    });
  }

  function render() {
    renderMetrics();
    renderHistory();
    renderBreakdown("sourceBreakdown", countBy(order => order.source));
    renderBreakdown("statusBreakdown", countBy(order => order.status));
    renderBreakdown("paymentBreakdown", countBy(order => order.paymentMethod));
    renderBreakdown("productBreakdown", productStats().map(product => [product.name, product.qty]));
    drawChart();

    if ($("reportStatus")) {
      $("reportStatus").textContent = `${filteredOrders.length} orders · Updated ${new Date().toLocaleTimeString("en-PH")}`;
    }
  }

  async function loadOrders() {
    try {
      const response = await apiFetch(
        `${API_URL}/api/orders?cafeId=${encodeURIComponent(CAFE_ID)}`,
        { cache: "no-store" }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const payload = await response.json();
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.orders)
          ? payload.orders
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

      allOrders = list
        .map(normOrder)
        .filter(order => order.source === "POS" || order.source === "Kiosk");

      if ($("reportMessage")) $("reportMessage").hidden = true;
      applyFilter();
    } catch (error) {
      console.error("Report load error:", error);

      if ($("reportStatus")) $("reportStatus").textContent = "Offline";
      if ($("reportMessage")) {
        $("reportMessage").hidden = false;
        $("reportMessage").textContent = `Unable to load orders from ${API_URL}/api/orders. Make sure the CafeKiosk backend is running on port 5000.`;
      }
    }
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCsv() {
    const rows = [["Order ID", "Date", "Source", "Customer", "Status", "Payment Method", "Total"]];

    filteredOrders.forEach(order => {
      rows.push([
        order.id,
        order.date ? order.date.toISOString() : "",
        order.source,
        order.customer,
        order.status,
        order.paymentMethod,
        n(order.total).toFixed(2)
      ]);
    });

    const blob = new Blob(
      [rows.map(row => row.map(csvEscape).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" }
    );

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cafekiosk-report-${$("fromDate")?.value || "start"}-to-${$("toDate")?.value || "end"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function renderAdmin() {
    let session = window.CafeAuth?.session;

    if (!session) {
      try {
        session = JSON.parse(localStorage.getItem("cafeAdminSession") || "null");
      } catch {
        session = null;
      }
    }

    if ($("adminName")) {
      $("adminName").textContent = session?.displayName || session?.username || session?.userId || "Admin";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderAdmin();
    setDefaultRange(30);
    loadOrders();

    $("applyFilterBtn")?.addEventListener("click", applyFilter);
    $("todayBtn")?.addEventListener("click", () => { setDefaultRange(1); applyFilter(); });
    $("last7Btn")?.addEventListener("click", () => { setDefaultRange(7); applyFilter(); });
    $("last30Btn")?.addEventListener("click", () => { setDefaultRange(30); applyFilter(); });
    $("exportBtn")?.addEventListener("click", exportCsv);
    $("printBtn")?.addEventListener("click", () => window.print());

    pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadOrders();
    }, 5000);
  });

  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawChart, 120);
  });

  window.addEventListener("beforeunload", () => {
    if (pollTimer) clearInterval(pollTimer);
  });
})();
