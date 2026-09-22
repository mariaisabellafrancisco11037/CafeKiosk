(function () {
  if (window.__CAFEKIOSK_LIVE_PRESENCE__) return;
  window.__CAFEKIOSK_LIVE_PRESENCE__ = true;

  function apiOrigin() {
    if (window.CafeAuth?.API_ORIGIN) return String(window.CafeAuth.API_ORIGIN).replace(/\/$/, '');
    if (window.CAFEKIOSK_API_ORIGIN) return String(window.CAFEKIOSK_API_ORIGIN).replace(/\/$/, '');
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      const port = location.port;
      if (!port || port === '80' || port === '443' || port === '5000') return location.origin;
      return `${location.protocol}//${location.hostname}:5000`;
    }
    return 'http://127.0.0.1:5000';
  }

  function resolveSurface() {
    const path = String(location.pathname || '').toLowerCase();
    if (path.includes('/kiosk/') || ['/','/order-type','/menu','/checkout'].includes(path)) return 'kiosk';
    if (path.includes('/pos/') || ['/pos','/order-queue','/staff-dashboard','/manager-pos','/manager-order-queue'].includes(path)) return 'pos';
    return '';
  }

  function resolveCafeId(surface) {
    const params = new URLSearchParams(location.search);
    const queryCafe = String(params.get('cafeId') || params.get('cafe_id') || '').trim();
    if (queryCafe) {
      localStorage.setItem('cafeId', queryCafe);
      return queryCafe;
    }

    if (surface === 'pos') {
      const authenticatedCafe = String(window.CafeAuth?.session?.cafeId || '').trim();
      if (authenticatedCafe) {
        localStorage.setItem('cafeId', authenticatedCafe);
        return authenticatedCafe;
      }
    }

    return String(localStorage.getItem('cafeId') || sessionStorage.getItem('cafeId') || 'cafe-1').trim() || 'cafe-1';
  }

  function resolveAuthToken(surface) {
    if (surface !== 'pos') return '';
    const direct = String(window.CafeAuth?.token || '').trim();
    if (direct) return direct;

    const tabToken = String(sessionStorage.getItem('cafeAuthToken') || '').trim();
    if (tabToken) return tabToken;

    const activeRole = String(sessionStorage.getItem('cafeActiveRole') || '').toLowerCase();
    if (activeRole === 'admin') return String(localStorage.getItem('cafeAdminAuthToken') || '').trim();
    if (activeRole === 'manager') return String(localStorage.getItem('cafeManagerAuthToken') || '').trim();
    if (activeRole === 'staff') return String(localStorage.getItem('cafeStaffAuthToken') || '').trim();

    return String(localStorage.getItem('cafeStaffAuthToken') || localStorage.getItem('cafeManagerAuthToken') || localStorage.getItem('cafeAdminAuthToken') || '').trim();
  }

  function attachPresence(socket, surface, cafeId) {
    if (!socket || socket.__cafeKioskPresenceAttached) return socket;
    socket.__cafeKioskPresenceAttached = true;

    function announce() {
      if (!socket.connected) return;
      socket.emit(surface === 'kiosk' ? 'join-kiosk' : 'join-pos', cafeId, function (result) {
        if (result && result.success === false) {
          console.warn('CafeKiosk presence join rejected:', result.message || result);
        }
      });
      socket.emit('presence:activity', { cafeId, surface, at: new Date().toISOString() });
    }

    socket.on('connect', announce);
    if (socket.connected) announce();

    ['pointerdown','keydown','touchstart','click'].forEach(function (eventName) {
      document.addEventListener(eventName, announce, { passive: true });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) announce(); });
    window.setInterval(announce, 30000);
    return socket;
  }

  function connectPresence() {
    if (typeof window.io !== 'function') return;
    const surface = resolveSurface();
    if (!surface) return;
    const cafeId = resolveCafeId(surface);

    // POS already has an authenticated realtime connection from auth-session.js.
    // Reuse it when available so the monitor sees the actual logged-in Admin/Staff.
    if (surface === 'pos' && window.CafeAuth?.socket) {
      window.CafeKioskPresenceSocket = attachPresence(window.CafeAuth.socket, surface, cafeId);
      return;
    }

    const token = resolveAuthToken(surface);
    const options = {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 700
    };
    if (token) options.auth = { token };

    const socket = window.io(apiOrigin(), options);
    window.CafeKioskPresenceSocket = attachPresence(socket, surface, cafeId);
  }

  function startWhenAuthReady() {
    const surface = resolveSurface();
    if (surface !== 'pos') {
      if (surface === 'kiosk' && window.CafeKioskTenant?.ready) {
        Promise.resolve(window.CafeKioskTenant.ready)
          .catch(() => null)
          .finally(connectPresence);
      } else {
        connectPresence();
      }
      return;
    }

    // auth-session.js starts asynchronously. Give its authenticated socket a
    // short chance to become available; fall back to a token-authenticated
    // presence socket if it is not ready yet.
    let attempts = 0;
    const timer = window.setInterval(function () {
      attempts += 1;
      if (window.CafeAuth?.socket || attempts >= 20) {
        window.clearInterval(timer);
        connectPresence();
      }
    }, 150);
  }

  if (typeof window.io === 'function') {
    startWhenAuthReady();
    return;
  }

  const script = document.createElement('script');
  script.src = `${apiOrigin()}/socket.io/socket.io.js`;
  script.async = true;
  script.onload = startWhenAuthReady;
  script.onerror = function () { console.warn('CafeKiosk live presence could not load Socket.IO.'); };
  document.head.appendChild(script);
})();
