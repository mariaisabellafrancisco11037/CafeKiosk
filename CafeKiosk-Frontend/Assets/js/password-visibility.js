(function () {
  if (window.CafeKioskPasswordVisibility) {
    window.CafeKioskPasswordVisibility.scan(document);
    return;
  }

  const STYLE_ID = 'cafekiosk-password-visibility-style';
  const EYE_OPEN = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6S2.25 12 2.25 12Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="2.75" fill="none" stroke="currentColor" stroke-width="1.8"/>
    </svg>`;
  const EYE_CLOSED = `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M10.6 6.15A10.8 10.8 0 0 1 12 6c6.25 0 9.75 6 9.75 6a17.4 17.4 0 0 1-3.05 3.72M6.05 7.1C3.57 8.9 2.25 12 2.25 12s3.5 6 9.75 6c1.42 0 2.7-.31 3.84-.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9.9 9.9A2.75 2.75 0 0 0 14.1 14.1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    </svg>`;

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .password-visibility-wrap { position: relative; display: block; width: 100%; }
      .password-visibility-wrap > input { width: 100%; padding-right: 46px !important; }
      .password-visibility-toggle,
      .show-password.password-visibility-toggle {
        position: absolute !important;
        right: 8px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 34px !important;
        height: 34px !important;
        display: grid !important;
        place-items: center !important;
        border: 0 !important;
        border-radius: 50% !important;
        padding: 0 !important;
        margin: 0 !important;
        background: transparent !important;
        color: #6d513d !important;
        cursor: pointer !important;
        z-index: 3 !important;
      }
      .password-visibility-toggle:hover,
      .password-visibility-toggle:focus-visible {
        background: rgba(104,70,47,.08) !important;
        outline: none !important;
      }
      .password-visibility-toggle svg { width: 20px; height: 20px; pointer-events: none; }
      .line-input-wrap.password-line > input { padding-right: 48px !important; }
    `;
    document.head.appendChild(style);
  }

  function renderButton(button, visible) {
    if (!button) return;
    button.innerHTML = visible ? EYE_CLOSED : EYE_OPEN;
    button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    button.setAttribute('title', visible ? 'Hide password' : 'Show password');
    button.setAttribute('aria-pressed', String(Boolean(visible)));
  }

  function prepareInput(input) {
    if (!(input instanceof HTMLInputElement)) return;
    if (input.dataset.passwordVisibilityReady === 'true') return;
    if (input.type !== 'password' && input.dataset.wasPassword !== 'true') return;

    input.dataset.passwordVisibilityReady = 'true';
    input.dataset.wasPassword = 'true';

    let container = input.parentElement;
    const useExistingContainer = container && (
      container.classList.contains('password-line') ||
      container.classList.contains('password-field') ||
      container.classList.contains('password-visibility-wrap') ||
      container.querySelector(':scope > .show-password, :scope > .password-toggle, :scope > #togglePin')
    );

    if (!useExistingContainer) {
      const wrap = document.createElement('span');
      wrap.className = 'password-visibility-wrap';
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      container = wrap;
    } else {
      container.classList.add('password-visibility-wrap');
    }

    let button = container.querySelector(':scope > .show-password, :scope > .password-toggle, :scope > #togglePin, :scope > .password-visibility-toggle');
    const externallyHandled = button && button.id === 'togglePin';

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      container.appendChild(button);
    }

    button.classList.add('password-visibility-toggle');
    renderButton(button, input.type === 'text');

    if (!externallyHandled && button.dataset.passwordVisibilityBound !== 'true') {
      button.dataset.passwordVisibilityBound = 'true';
      button.addEventListener('click', function () {
        const visible = input.type === 'password';
        input.type = visible ? 'text' : 'password';
        renderButton(button, visible);
        try {
          const length = input.value.length;
          input.focus({ preventScroll: true });
          input.setSelectionRange(length, length);
        } catch (_) {}
      });
    }
  }

  function scan(root) {
    const scope = root && root.querySelectorAll ? root : document;
    if (scope instanceof HTMLInputElement && (scope.type === 'password' || scope.dataset.wasPassword === 'true')) {
      prepareInput(scope);
    }
    scope.querySelectorAll('input[type="password"], input[data-was-password="true"]').forEach(prepareInput);
  }

  window.CafeKioskPasswordVisibility = { scan, renderButton };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { scan(document); }, { once: true });
  } else {
    scan(document);
  }

  const observer = new MutationObserver(function (mutations) {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      }
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
