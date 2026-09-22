/* =========================================================
   CAFEKIOSK POS SEARCH AUTOFILL GUARD
   Staff POS + Manager POS only.

   Prevents browsers/password managers from copying the last
   login User ID/email into POS search boxes. This file is not
   loaded by Admin pages.
========================================================= */
(() => {
  'use strict';

  const TARGETS = ['#menuSearch', '#orderSearch'];

  function parseJson(value) {
    try { return JSON.parse(value || 'null'); } catch (_) { return null; }
  }

  function activeArea() {
    const path = String(window.location.pathname || '').toLowerCase();
    if (path.includes('/manager/')) return 'manager';
    if (path.includes('/pos/')) return 'staff';
    return '';
  }

  function getKnownLoginValues() {
    const sessions = [
      window.CafeAuth?.session || null,
      parseJson(localStorage.getItem('cafeManagerSession')),
      parseJson(localStorage.getItem('cafeStaffSession'))
    ].filter(Boolean);

    const values = new Set();
    for (const session of sessions) {
      [
        session?.username,
        session?.userId,
        session?.user_id,
        session?.userName,
        session?.email,
        session?.loginId
      ].forEach(value => {
        const normalized = String(value || '').trim().toLowerCase();
        if (normalized) values.add(normalized);
      });
    }

    // Some older auth builds store the last login id separately.
    [
      localStorage.getItem('cafeUserId'),
      localStorage.getItem('cafeUsername'),
      sessionStorage.getItem('cafeUserId'),
      sessionStorage.getItem('cafeUsername')
    ].forEach(value => {
      const normalized = String(value || '').trim().toLowerCase();
      if (normalized) values.add(normalized);
    });

    return values;
  }

  function clearIfLoginAutofill(input) {
    if (!input || input.dataset.ckPosSearchUserTyping === 'true') return;

    const current = String(input.value || '').trim().toLowerCase();
    if (!current) return;

    const loginValues = getKnownLoginValues();
    if (loginValues.has(current)) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  function protect(input, index) {
    if (!input || input.dataset.ckPosSearchGuard === 'true') return;
    input.dataset.ckPosSearchGuard = 'true';

    const area = activeArea() || 'pos';

    // Make this field unambiguously a search field, never a username field.
    input.type = 'search';
    input.name = `cafekiosk_${area}_search_${index}`;
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-autocomplete', 'none');
    input.setAttribute('data-lpignore', 'true');
    input.setAttribute('data-1p-ignore', 'true');
    input.setAttribute('data-bwignore', 'true');

    // readonly during initial page load prevents Chrome/password managers
    // from treating the field as the username field from the login form.
    input.readOnly = true;

    const beginUserInteraction = () => {
      clearIfLoginAutofill(input);
      input.readOnly = false;
      input.dataset.ckPosSearchUserTyping = 'true';
    };

    input.addEventListener('pointerdown', beginUserInteraction, { once: true });
    input.addEventListener('touchstart', beginUserInteraction, { once: true, passive: true });
    input.addEventListener('keydown', beginUserInteraction, { once: true });

    input.addEventListener('focus', () => {
      clearIfLoginAutofill(input);
      // A user can tab into the field without pointerdown.
      requestAnimationFrame(() => { input.readOnly = false; });
    });

    // Re-arm after blur only while the user has not typed a real query.
    input.addEventListener('blur', () => {
      if (!String(input.value || '').trim()) {
        input.dataset.ckPosSearchUserTyping = 'false';
        input.readOnly = true;
      }
    });

    // Chrome can insert autofill after DOMContentLoaded, pageshow, or restore.
    [0, 60, 180, 450, 1000, 2000, 3500].forEach(delay => {
      setTimeout(() => clearIfLoginAutofill(input), delay);
    });
  }

  function install() {
    const inputs = TARGETS.flatMap(selector => Array.from(document.querySelectorAll(selector)));
    inputs.forEach(protect);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }

  window.addEventListener('pageshow', () => {
    setTimeout(() => {
      install();
      TARGETS.forEach(selector => {
        document.querySelectorAll(selector).forEach(clearIfLoginAutofill);
      });
    }, 50);
  });
})();
