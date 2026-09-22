(function () {
  'use strict';

  function apiOrigin() {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      const port = location.port;
      if (!port || port === '80' || port === '443' || port === '5000') return location.origin;
      return `${location.protocol}//${location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }

  function slugFromPath() {
    const match = String(location.pathname || '').match(/^\/kiosk\/([^/]+)/i);
    return match ? decodeURIComponent(match[1]).trim().toLowerCase() : '';
  }

  const slug = slugFromPath();
  const API = apiOrigin();

  function legacyPath(page) {
    const map = {
      '': '/kiosk',
      'order-type': '/order-type',
      'menu': '/menu',
      'checkout': '/checkout'
    };
    return map[page || ''] || '/kiosk';
  }

  function pathFor(page) {
    if (!slug) return legacyPath(page);
    return `/kiosk/${encodeURIComponent(slug)}${page ? `/${page}` : ''}`;
  }

  function whenDomReady(callback) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', callback, { once: true });
    else callback();
  }

  function showError(message) {
    whenDomReady(function () {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#f8f0df;display:grid;place-items:center;padding:24px;font-family:Arial,sans-serif;color:#4b2f1f;text-align:center';
      overlay.innerHTML = `<div style="max-width:520px;background:#fffaf0;border:1px solid #d9c6a7;border-radius:22px;padding:30px;box-shadow:0 16px 40px rgba(76,47,31,.12)"><div style="font-size:52px">☕</div><h1 style="margin:10px 0 8px">Kiosk unavailable</h1><p style="line-height:1.6;margin:0">${String(message || 'This kiosk link could not be opened.').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}</p></div>`;
      document.body.appendChild(overlay);
    });
  }

  async function resolveTenant() {
    if (!slug) {
      localStorage.setItem('cafeId', 'cafe-1');
      sessionStorage.setItem('cafeId', 'cafe-1');
      return { cafeId: 'cafe-1', cafeName: 'CafeKiosk Demo Cafe', kioskSlug: 'cafekiosk-demo', legacy: true };
    }

    const cacheKey = `cafekiosk:kiosk:${slug}`;
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey) || 'null');
      if (cached?.cafeId) {
        localStorage.setItem('cafeId', cached.cafeId);
        sessionStorage.setItem('cafeId', cached.cafeId);
        localStorage.setItem('kioskSlug', slug);
        sessionStorage.setItem('kioskSlug', slug);
      }
    } catch (_) {}

    const response = await fetch(`${API}/api/kiosk-access/public/${encodeURIComponent(slug)}`, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.kiosk?.cafeId) {
      throw new Error(payload.message || 'This kiosk link is invalid or inactive.');
    }

    const info = payload.kiosk;
    localStorage.setItem('cafeId', info.cafeId);
    sessionStorage.setItem('cafeId', info.cafeId);
    localStorage.setItem('kioskSlug', info.kioskSlug || slug);
    sessionStorage.setItem('kioskSlug', info.kioskSlug || slug);
    localStorage.setItem('kioskCafeName', info.cafeName || 'Cafe');
    sessionStorage.setItem('kioskCafeName', info.cafeName || 'Cafe');
    localStorage.setItem(cacheKey, JSON.stringify(info));
    sessionStorage.setItem(cacheKey, JSON.stringify(info));
    return info;
  }

  const ready = resolveTenant()
    .then(info => {
      window.CafeKioskTenant.info = info;
      whenDomReady(function () {
        document.querySelectorAll('[data-kiosk-cafe-name]').forEach(el => {
          el.textContent = info.cafeName || 'CafeKiosk';
        });
      });
      return info;
    })
    .catch(error => {
      showError(error.message);
      throw error;
    });

  window.CafeKioskTenant = {
    API,
    slug,
    info: null,
    ready,
    path: pathFor,
    home: () => pathFor(''),
    orderType: () => pathFor('order-type'),
    menu: () => pathFor('menu'),
    checkout: () => pathFor('checkout')
  };
})();
