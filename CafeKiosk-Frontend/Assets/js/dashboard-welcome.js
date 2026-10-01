(() => {
  'use strict';
  async function applyWelcome() {
    let cafeName = '';
    try {
      const r = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      const data = await r.json().catch(() => ({}));
      cafeName = String(data?.user?.cafeName || '').trim();
    } catch (_) {}
    if (!cafeName) {
      try {
        const raw = localStorage.getItem('cafeAdminSession');
        const session = raw ? JSON.parse(raw) : null;
        cafeName = String(session?.cafeName || '').trim();
      } catch (_) {}
    }
    if (!cafeName) cafeName = 'CafeKiosk';
    const title = document.querySelector('[data-uniform-header="true"] .cku-title-card h1, #dashboardWelcome');
    if (title) title.textContent = `Hello, Welcome to ${cafeName}`;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(applyWelcome, 80), {once:true});
  else setTimeout(applyWelcome, 80);
  window.addEventListener('pageshow', () => setTimeout(applyWelcome, 80));
})();
