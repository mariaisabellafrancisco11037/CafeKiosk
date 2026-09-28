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
    const port = window.location.port;
    if (!port || port === "80" || port === "443" || port === "5000") return window.location.origin;
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
      sourceLabel:
        String(order?.sourceLabel ?? order?.source_label ?? "").trim() ||
        (source === "Kiosk" ? "Kiosk" : "POS"),
      status: normStatus(order?.status),
      createdAt,
      date: Number.isNaN(date.getTime()) ? null : date,
      items,
      total: orderTotal(order, items),
      paymentMethod: order?.paymentMethod ?? order?.payment?.method ?? "Not recorded",
      paymentAmount: Number(order?.paymentAmount ?? order?.payment_amount ?? order?.cashReceived ?? 0),
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

  function sortedHistoryOrders() {
    return [...filteredOrders]
      .sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));
  }

  function renderHistory() {
    const element = $("transactionList");
    if (!element) return;

    const list = sortedHistoryOrders().slice(0, 40);

    element.innerHTML = list.length
      ? list.map(order => `
          <article class="transaction-card">
            <div class="transaction-head">
              <div class="transaction-id-wrap">
                <strong>${esc(order.id)}</strong>
                <span>${esc(order.date ? order.date.toLocaleString("en-PH") : "No date")}</span>
              </div>
              <button class="transaction-print-btn" type="button" data-print-transaction="${esc(order.id)}" aria-label="Print transaction ${esc(order.id)}" title="Print this transaction">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                <span>Print</span>
              </button>
            </div>
            <div class="transaction-row">
              <b>Channel:</b><span>${esc(order.sourceLabel || order.source)}</span>
              <b>Customer:</b><span>${esc(order.customer)}</span>
              <b>Amount:</b><span>${esc(money(order.total))}</span>
              <b>Payment:</b><span>${esc(order.paymentMethod)}</span>
              <b>Amount Paid:</b><span>${money(order.paymentAmount || order.total)}</span>
              <b>Status:</b><span>${esc(order.status)}</span>
            </div>
          </article>
        `).join("")
      : `<div class="empty-state">No transactions in this date range.</div>`;

    element.querySelectorAll("[data-print-transaction]").forEach(button => {
      button.addEventListener("click", () => openPrintOptions(button.dataset.printTransaction || ""));
    });
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
    renderBreakdown("sourceBreakdown", countBy(order => order.sourceLabel || order.source));
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
    const rows = [["Order ID", "Date", "Source", "Customer", "Status", "Payment Method", "Amount Paid", "Total"]];

    filteredOrders.forEach(order => {
      rows.push([
        order.id,
        order.date ? order.date.toISOString() : "",
        order.sourceLabel || order.source,
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

  function cafeDisplayName() {
    let session = window.CafeAuth?.session;
    if (!session) {
      try { session = JSON.parse(localStorage.getItem("cafeAdminSession") || "null"); } catch { session = null; }
    }
    return String(session?.cafeName || localStorage.getItem("cafeName") || "CafeKiosk").trim() || "CafeKiosk";
  }

  function printRangeLabel() {
    const range = rangeBounds();
    if (!range) return "Selected date range";
    return `${range.start.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })} – ${range.end.toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}`;
  }

  function populatePrintTransactionOptions(preselectedId = "") {
    const select = $("printTransactionSelect");
    if (!select) return;
    const rows = sortedHistoryOrders();
    select.innerHTML = rows.map(order => {
      const label = `${order.id} • ${order.date ? order.date.toLocaleString("en-PH") : "No date"} • ${money(order.total)}`;
      return `<option value="${esc(order.id)}">${esc(label)}</option>`;
    }).join("");
    if (preselectedId && rows.some(order => order.id === preselectedId)) select.value = preselectedId;
    if ($("printAllDescription")) {
      $("printAllDescription").textContent = `Print all ${rows.length.toLocaleString()} transaction${rows.length === 1 ? "" : "s"} in the selected date range.`;
    }
  }

  function updatePrintChoiceUi() {
    const selected = document.querySelector('input[name="transactionPrintMode"]:checked')?.value || "single";
    $("printTransactionPicker")?.classList.toggle("is-disabled", selected !== "single");
    document.querySelectorAll("[data-print-choice-card]").forEach(card => {
      card.classList.toggle("selected", card.dataset.printChoiceCard === selected);
    });
  }

  function openPrintOptions(preselectedId = "") {
    const rows = sortedHistoryOrders();
    if (!rows.length) {
      if ($("reportMessage")) {
        $("reportMessage").hidden = false;
        $("reportMessage").textContent = "There are no transactions in the selected date range to print.";
      }
      return;
    }
    populatePrintTransactionOptions(preselectedId);
    const singleRadio = document.querySelector('input[name="transactionPrintMode"][value="single"]');
    if (singleRadio) singleRadio.checked = true;
    updatePrintChoiceUi();
    const modal = $("printOptionsModal");
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("print-options-open");
    setTimeout(() => $("printTransactionSelect")?.focus(), 30);
  }

  function closePrintOptions() {
    const modal = $("printOptionsModal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("print-options-open");
  }

  function printableItems(order) {
    if (!Array.isArray(order.items) || !order.items.length) return "";
    return `
      <div class="items-block">
        <h3>Order Items</h3>
        <table class="items-table">
          <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
          <tbody>${order.items.map(item => {
            const name = item?.name ?? item?.productName ?? item?.title ?? "Item";
            return `<tr><td>${esc(name)}</td><td class="num">${itemQty(item)}</td><td class="num">${esc(money(itemTotal(item)))}</td></tr>`;
          }).join("")}</tbody>
        </table>
      </div>`;
  }

  function singleTransactionMarkup(order) {
    return `
      <section class="single-transaction">
        <div class="receipt-title"><span>Transaction</span><strong>${esc(order.id)}</strong></div>
        <div class="detail-grid">
          <div><span>Date & Time</span><strong>${esc(order.date ? order.date.toLocaleString("en-PH") : "No date")}</strong></div>
          <div><span>Source</span><strong>${esc(order.sourceLabel || order.source)}</strong></div>
          <div><span>Customer</span><strong>${esc(order.customer)}</strong></div>
          <div><span>Status</span><strong>${esc(order.status)}</strong></div>
          <div><span>Payment Method</span><strong>${esc(order.paymentMethod)}</strong></div>
          <div><span>Amount Paid</span><strong>${esc(money(order.paymentAmount || order.total))}</strong></div>
        </div>
        ${printableItems(order)}
        <div class="grand-total"><span>Total</span><strong>${esc(money(order.total))}</strong></div>
      </section>`;
  }

  function allTransactionsMarkup(orders) {
    const total = orders.reduce((sum, order) => sum + n(order.total), 0);
    return `
      <section class="history-summary">
        <div class="summary-strip"><div><span>Transactions</span><strong>${orders.length.toLocaleString()}</strong></div><div><span>Total Value</span><strong>${esc(money(total))}</strong></div></div>
        <table class="history-table">
          <thead><tr><th>Order ID</th><th>Date</th><th>Source</th><th>Payment</th><th>Status</th><th class="num">Amount</th></tr></thead>
          <tbody>${orders.map(order => `<tr><td><strong>${esc(order.id)}</strong></td><td>${esc(order.date ? order.date.toLocaleString("en-PH") : "No date")}</td><td>${esc(order.sourceLabel || order.source)}</td><td>${esc(order.paymentMethod)}</td><td>${esc(order.status)}</td><td class="num">${esc(money(order.total))}</td></tr>`).join("")}</tbody>
        </table>
      </section>`;
  }

  function printTransactions(orders, mode) {
    if (!orders.length) return;
    const cafeName = cafeDisplayName();
    const reportTitle = mode === "single" ? "Transaction Receipt" : "Transaction History";
    const body = mode === "single" ? singleTransactionMarkup(orders[0]) : allTransactionsMarkup(orders);
    const generated = new Date().toLocaleString("en-PH");
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);
    const doc = frame.contentDocument || frame.contentWindow?.document;
    if (!doc) { frame.remove(); return; }
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(reportTitle)} - ${esc(cafeName)}</title><style>
      @page{size:auto;margin:14mm}*{box-sizing:border-box}body{margin:0;color:#2f241b;font:12px Arial,Helvetica,sans-serif;background:#fff}.print-sheet{max-width:900px;margin:0 auto}.print-header{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:2px solid #4c956f;padding-bottom:12px;margin-bottom:18px}.print-header h1{font-size:22px;margin:0 0 4px}.print-header h2{font-size:15px;margin:0;color:#674a31}.print-meta{text-align:right;color:#6f6255;font-size:10px;line-height:1.55}.receipt-title{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#f7f1e6;border:1px solid #ddd2c2;border-radius:8px;margin-bottom:14px}.receipt-title span{font-weight:700;color:#7e6c59}.receipt-title strong{font-size:18px}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:16px}.detail-grid div{border:1px solid #e4dbce;border-radius:7px;padding:9px 10px}.detail-grid span,.summary-strip span{display:block;color:#817363;font-size:9px;text-transform:uppercase;font-weight:700;margin-bottom:3px}.detail-grid strong{font-size:12px}.items-block h3{font-size:13px;margin:16px 0 7px}.items-table,.history-table{width:100%;border-collapse:collapse}.items-table th,.items-table td,.history-table th,.history-table td{padding:7px 8px;border-bottom:1px solid #e7dfd4;text-align:left;vertical-align:top}.items-table th,.history-table th{background:#f7f1e6;font-size:9px;text-transform:uppercase;color:#6b5a49}.num{text-align:right!important;white-space:nowrap}.grand-total{display:flex;justify-content:flex-end;gap:22px;align-items:center;border-top:2px solid #4c956f;margin-top:14px;padding-top:12px;font-size:15px}.grand-total strong{font-size:20px}.summary-strip{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}.summary-strip div{padding:10px 12px;border:1px solid #ddd2c2;background:#faf6ef;border-radius:7px}.summary-strip strong{font-size:16px}.history-table{font-size:10px}.history-table tr{break-inside:avoid}.print-footer{margin-top:18px;padding-top:8px;border-top:1px solid #ddd2c2;color:#877868;font-size:9px;text-align:center}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body><main class="print-sheet"><header class="print-header"><div><h1>${esc(cafeName)}</h1><h2>${esc(reportTitle)}</h2></div><div class="print-meta"><strong>${esc(printRangeLabel())}</strong><br>Generated ${esc(generated)}</div></header>${body}<footer class="print-footer">Generated by CafeKiosk Admin • ${esc(cafeName)}</footer></main></body></html>`);
    doc.close();
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      setTimeout(() => frame.remove(), 1200);
    }, 180);
  }

  function confirmPrintSelection() {
    const mode = document.querySelector('input[name="transactionPrintMode"]:checked')?.value || "single";
    const rows = sortedHistoryOrders();
    if (!rows.length) return;
    let selected = rows;
    if (mode === "single") {
      const id = $("printTransactionSelect")?.value || "";
      const order = rows.find(row => row.id === id);
      if (!order) return;
      selected = [order];
    }
    closePrintOptions();
    printTransactions(selected, mode);
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
    $("printBtn")?.addEventListener("click", () => openPrintOptions());
    $("closePrintOptionsBtn")?.addEventListener("click", closePrintOptions);
    $("cancelPrintOptionsBtn")?.addEventListener("click", closePrintOptions);
    $("confirmPrintBtn")?.addEventListener("click", confirmPrintSelection);
    document.querySelectorAll("[data-close-print-options]").forEach(el => el.addEventListener("click", closePrintOptions));
    document.querySelectorAll('input[name="transactionPrintMode"]').forEach(input => input.addEventListener("change", updatePrintChoiceUi));
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && $("printOptionsModal")?.classList.contains("open")) closePrintOptions();
    });

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
