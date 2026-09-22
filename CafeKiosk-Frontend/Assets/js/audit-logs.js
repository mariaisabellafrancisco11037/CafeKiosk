(() => {
  "use strict";

  const CAFE_ID = String(localStorage.getItem("cafeId") || "cafe-1").trim() || "cafe-1";
  const PAGE_SIZE = 12;
  const $ = id => document.getElementById(id);

  let logs = [];
  let filtered = [];
  let page = 1;
  let pollTimer = null;

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

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function slug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function roleClass(role) {
    const value = String(role || "").toLowerCase();
    if (value.includes("admin")) return "admin";
    if (value.includes("staff")) return "staff";
    if (value.includes("manager")) return "manager";
    return "other";
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

  function hydrateFilters() {
    const userSelect = $("userFilter");
    const actionSelect = $("actionFilter");
    if (!userSelect || !actionSelect) return;

    const selectedUser = userSelect.value;
    const selectedAction = actionSelect.value;

    const users = [...new Set(logs.map(item => item.user).filter(Boolean))].sort();
    const actions = [...new Set(logs.map(item => item.action).filter(Boolean))].sort();

    userSelect.innerHTML =
      '<option value="">All Users</option>' +
      users.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join("");

    actionSelect.innerHTML =
      '<option value="">Any Action</option>' +
      actions.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join("");

    if (users.includes(selectedUser)) userSelect.value = selectedUser;
    if (actions.includes(selectedAction)) actionSelect.value = selectedAction;
  }

  function applyFilters(options = {}) {
    const resetPage = options.resetPage !== false;
    const user = $("userFilter")?.value || "";
    const action = $("actionFilter")?.value || "";
    const days = $("dateFilter")?.value || "30";
    const query = ($("searchInput")?.value || "").trim().toLowerCase();

    let cutoff = null;
    if (days !== "all") {
      cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (Number(days) - 1));
      cutoff.setHours(0, 0, 0, 0);
    }

    filtered = logs.filter(item => {
      const created = new Date(item.createdAt);
      if (cutoff && !Number.isNaN(created.getTime()) && created < cutoff) return false;
      if (user && item.user !== user) return false;
      if (action && item.action !== action) return false;

      if (query) {
        const haystack = [
          item.user,
          item.role,
          item.action,
          item.details,
          item.source,
          item.path,
          item.method,
          item.ip
        ].join(" ").toLowerCase();

        if (!haystack.includes(query)) return false;
      }

      return true;
    });

    if (resetPage) page = 1;
    renderTable();
  }

  function renderTable() {
    const body = $("auditBody");
    if (!body) return;

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    page = Math.min(Math.max(1, page), totalPages);

    const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    body.innerHTML = rows.length
      ? rows.map(item => {
          const date = new Date(item.createdAt);
          const dateText = Number.isNaN(date.getTime())
            ? (item.createdAt || "—")
            : date.toLocaleString("en-PH");

          const role = item.role || "—";
          const action = item.action || "Unknown";
          const source = item.source || item.method || "—";

          return `
            <tr>
              <td>${esc(dateText)}</td>
              <td title="${esc(item.user)}">${esc(item.user || "Unknown")}</td>
              <td><span class="role-badge ${roleClass(role)}">${esc(role)}</span></td>
              <td><span class="action-chip ${slug(action)}">${esc(action)}</span></td>
              <td class="details-cell" title="${esc(item.details)}">${esc(item.details || "—")}</td>
              <td class="source-cell" title="${esc(source)}">${esc(source)}</td>
            </tr>
          `;
        }).join("")
      : `<tr><td colspan="6" class="table-message">No audit logs match the selected filters.</td></tr>`;

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    const container = $("pagination");
    if (!container) return;

    if (!filtered.length) {
      container.innerHTML = "";
      return;
    }

    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);

    let html = `<button class="page-btn" data-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Previous</button>`;

    for (let index = start; index <= end; index++) {
      html += `<button class="page-btn ${index === page ? "active" : ""}" data-page="${index}">${index}</button>`;
    }

    html += `<button class="page-btn" data-page="${page + 1}" ${page >= totalPages ? "disabled" : ""}>Next</button>`;
    container.innerHTML = html;
  }

  async function loadLogs() {
    try {
      const response = await apiFetch(
        `${API_URL}/api/audit-logs?cafeId=${encodeURIComponent(CAFE_ID)}&limit=5000`,
        { cache: "no-store" }
      );

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.message || `HTTP ${response.status}`);
      }

      logs = Array.isArray(body)
        ? body
        : Array.isArray(body?.logs)
          ? body.logs
          : Array.isArray(body?.data)
            ? body.data
            : [];

      logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      hydrateFilters();
      applyFilters({ resetPage: false });

      if ($("auditMessage")) {
        $("auditMessage").hidden = true;
        $("auditMessage").textContent = "";
      }
    } catch (error) {
      console.error("Audit log load error:", error);

      if ($("auditBody")) {
        $("auditBody").innerHTML = '<tr><td colspan="6" class="table-message">Audit log API is unavailable.</td></tr>';
      }

      if ($("pagination")) $("pagination").innerHTML = "";

      if ($("auditMessage")) {
        $("auditMessage").hidden = false;
        $("auditMessage").textContent = `Unable to load ${API_URL}/api/audit-logs (${error.message}). Make sure the audit-log backend route is installed and restart the CafeKiosk server.`;
      }
    }
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCsv() {
    const rows = [["Date/Time", "User", "Role", "Action", "Details", "Source", "Method", "Path", "IP"]];

    filtered.forEach(item => {
      rows.push([
        item.createdAt,
        item.user,
        item.role,
        item.action,
        item.details,
        item.source,
        item.method,
        item.path,
        item.ip
      ]);
    });

    const blob = new Blob(
      [rows.map(row => row.map(csvEscape).join(",")).join("\n")],
      { type: "text/csv;charset=utf-8" }
    );

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cafekiosk-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderAdmin();
    loadLogs();

    $("searchBtn")?.addEventListener("click", () => applyFilters());
    $("userFilter")?.addEventListener("change", () => applyFilters());
    $("dateFilter")?.addEventListener("change", () => applyFilters());
    $("actionFilter")?.addEventListener("change", () => applyFilters());
    $("searchInput")?.addEventListener("input", () => applyFilters());
    $("exportAuditBtn")?.addEventListener("click", exportCsv);

    $("pagination")?.addEventListener("click", event => {
      const button = event.target.closest("[data-page]");
      if (!button || button.disabled) return;

      page = Math.max(1, Number(button.dataset.page) || 1);
      renderTable();
    });

    pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") loadLogs();
    }, 8000);
  });

  window.addEventListener("beforeunload", () => {
    if (pollTimer) clearInterval(pollTimer);
  });
})();
