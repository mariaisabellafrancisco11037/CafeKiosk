(function () {
  'use strict';
  if (window.CafeMessageDialog) return;

  let overlay = null;
  let titleEl = null;
  let textEl = null;
  let iconEl = null;
  let panel = null;
  let okButton = null;
  let cancelButton = null;
  let resolver = null;
  let activeMode = 'message';

  function ensure() {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'ck-message-dialog-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <section class="ck-message-dialog" role="dialog" aria-modal="true" aria-labelledby="ckMessageDialogTitle" aria-describedby="ckMessageDialogText">
        <div class="ck-message-dialog-icon" aria-hidden="true">i</div>
        <h2 id="ckMessageDialogTitle">CafeKiosk</h2>
        <p id="ckMessageDialogText"></p>
        <div class="ck-message-dialog-actions">
          <button type="button" class="ck-message-dialog-cancel" hidden>Cancel</button>
          <button type="button" class="ck-message-dialog-ok">OK</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    panel = overlay.querySelector('.ck-message-dialog');
    titleEl = overlay.querySelector('h2');
    textEl = overlay.querySelector('p');
    iconEl = overlay.querySelector('.ck-message-dialog-icon');
    okButton = overlay.querySelector('.ck-message-dialog-ok');
    cancelButton = overlay.querySelector('.ck-message-dialog-cancel');

    okButton.addEventListener('click', () => close(activeMode === 'confirm' ? true : undefined));
    cancelButton.addEventListener('click', () => close(false));
    overlay.addEventListener('click', event => {
      if (event.target === overlay) close(activeMode === 'confirm' ? false : undefined);
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay.classList.contains('open')) {
        close(activeMode === 'confirm' ? false : undefined);
      }
    });
  }

  function normalizeType(type) {
    return ['success', 'error', 'warning', 'info'].includes(type) ? type : 'info';
  }

  function finishPending(value) {
    const done = resolver;
    resolver = null;
    if (done) done(value);
  }

  function close(value) {
    if (!overlay) return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    const done = resolver;
    resolver = null;
    if (done) setTimeout(() => done(value), 0);
  }

  function prepare(message, options) {
    ensure();
    const opts = options || {};
    const type = normalizeType(opts.type || 'info');
    panel.className = `ck-message-dialog ${type}`;
    titleEl.textContent = opts.title || (type === 'success' ? 'Success' : type === 'error' ? 'Unable to Continue' : type === 'warning' ? 'Please Check' : 'CafeKiosk');
    textEl.textContent = String(message || '');
    iconEl.textContent = type === 'success' ? '✓' : type === 'error' ? '!' : type === 'warning' ? '!' : 'i';
    return opts;
  }

  function show(message, options) {
    const opts = prepare(message, options);
    activeMode = 'message';
    cancelButton.hidden = true;
    okButton.textContent = opts.buttonText || 'OK';
    okButton.classList.remove('danger');
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => okButton.focus(), 10);
    return new Promise(resolve => {
      finishPending();
      resolver = resolve;
    });
  }

  function confirm(message, options) {
    const opts = prepare(message, { type: 'warning', ...(options || {}) });
    activeMode = 'confirm';
    cancelButton.hidden = false;
    cancelButton.textContent = opts.cancelText || 'Cancel';
    okButton.textContent = opts.confirmText || 'Continue';
    okButton.classList.toggle('danger', opts.danger !== false);
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    setTimeout(() => cancelButton.focus(), 10);
    return new Promise(resolve => {
      finishPending(false);
      resolver = resolve;
    });
  }

  window.CafeMessageDialog = { show, confirm, close };

  // Replace browser alert boxes with the CafeKiosk-styled dialog. Existing
  // calls across Admin, POS, Manager and Kiosk pages therefore get the same UI.
  window.alert = function (message) {
    show(message, { type: 'info' });
  };
})();
