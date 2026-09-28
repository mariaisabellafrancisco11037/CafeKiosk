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
  // Authentication is HttpOnly-cookie only. JavaScript never reads a JWT.
  return "";
})();
