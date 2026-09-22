(function () {
  'use strict';

  function apiOrigin() {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return location.port === '5000' ? location.origin : `${location.protocol}//${location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }

  const API = apiOrigin();
  const $ = id => document.getElementById(id);

  function message(id, text, success) {
    const el = $(id);
    if (!el) return;
    const value = String(text || '');
    const transient = /creating|checking|saving/i.test(value);
    if (value && !transient && window.CafeMessageDialog) {
      el.textContent = '';
      el.classList.remove('success');
      window.CafeMessageDialog.show(value, {
        type: success ? 'success' : 'error',
        title: success ? 'Success' : 'Account Message'
      });
      return;
    }
    el.textContent = value;
    el.classList.toggle('success', Boolean(success));
  }

  async function jsonFetch(url, options) {
    const response = await fetch(url, { credentials: 'include', ...options });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Request failed.');
    return data;
  }

  function normalizeSlug(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
      .replace(/-+$/g, '');
  }

  function setKioskStatus(text, kind) {
    const el = $('signupKioskStatus');
    if (!el) return;
    el.textContent = text || '';
    el.classList.toggle('ok', kind === 'ok');
    el.classList.toggle('bad', kind === 'bad');
  }

  let ownerKiosk = null;

  async function renderSignupQr() {
    const canvas = $('signupKioskQr');
    if (!canvas || !ownerKiosk?.kioskUrl || !window.CafeKioskQR) return;
    try {
      await window.CafeKioskQR.render(canvas, ownerKiosk.kioskUrl, {
        logoUrl: '/Assets/images/logo.png',
        foreground: '#4b311f',
        background: '#fffaf0',
        size: 360
      });
    } catch (error) {
      setKioskStatus(error.message, 'bad');
    }
  }

  function updateSignupKioskUi() {
    if (!ownerKiosk) return;
    if ($('signupKioskUrl')) $('signupKioskUrl').textContent = ownerKiosk.kioskUrl;
    if ($('signupKioskSlug')) $('signupKioskSlug').value = ownerKiosk.kioskSlug;
    if ($('signupKioskPrefix')) {
      const slash = String(ownerKiosk.kioskUrl || '').lastIndexOf('/');
      $('signupKioskPrefix').textContent = slash >= 0 ? String(ownerKiosk.kioskUrl).slice(0, slash + 1) : 'http://YOUR-LAPTOP-IP:5000/kiosk/';
    }
    renderSignupQr();
  }

  async function checkSignupSlug() {
    if (!ownerKiosk?.setupToken) return false;
    const input = $('signupKioskSlug');
    const slug = normalizeSlug(input?.value);
    if (input) input.value = slug;
    if (slug.length < 3) {
      setKioskStatus('Use at least 3 characters.', 'bad');
      return false;
    }
    setKioskStatus('Checking availability...');
    try {
      const data = await jsonFetch(`${API}/api/kiosk-access/check?slug=${encodeURIComponent(slug)}&setupToken=${encodeURIComponent(ownerKiosk.setupToken)}`);
      setKioskStatus(data.message, data.available ? 'ok' : 'bad');
      return Boolean(data.available);
    } catch (error) {
      setKioskStatus(error.message, 'bad');
      return false;
    }
  }

  async function saveSignupSlug() {
    if (!ownerKiosk?.setupToken) return;
    const input = $('signupKioskSlug');
    const slug = normalizeSlug(input?.value);
    if (input) input.value = slug;
    const saveButton = $('signupSaveKiosk');
    if (saveButton) saveButton.disabled = true;
    setKioskStatus('Saving your Kiosk link...');
    try {
      const data = await jsonFetch(`${API}/api/kiosk-access/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken: ownerKiosk.setupToken, slug })
      });
      ownerKiosk = { ...ownerKiosk, ...data.kiosk };
      updateSignupKioskUi();
      setKioskStatus('Saved. Your Kiosk is online and the QR code now points to this registered link.', 'ok');
    } catch (error) {
      setKioskStatus(error.message, 'bad');
    } finally {
      if (saveButton) saveButton.disabled = false;
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(String(text || ''));
      return true;
    } catch (_) {
      const area = document.createElement('textarea');
      area.value = String(text || '');
      area.style.position = 'fixed'; area.style.opacity = '0';
      document.body.appendChild(area); area.select();
      const ok = document.execCommand('copy'); area.remove();
      return ok;
    }
  }

  function bindSignupKioskActions() {
    $('signupKioskSlug')?.addEventListener('input', event => {
      const clean = normalizeSlug(event.target.value);
      if (event.target.value !== clean) event.target.value = clean;
      setKioskStatus('Click “Check Availability” or “Save Kiosk Link” when you are ready.');
    });
    $('signupCheckKiosk')?.addEventListener('click', checkSignupSlug);
    $('signupSaveKiosk')?.addEventListener('click', saveSignupSlug);
    $('signupCopyKiosk')?.addEventListener('click', async () => {
      if (await copyText(ownerKiosk?.kioskUrl)) setKioskStatus('Kiosk link copied.', 'ok');
    });
    $('signupOpenKiosk')?.addEventListener('click', () => {
      if (ownerKiosk?.kioskUrl) window.open(ownerKiosk.kioskUrl, '_blank', 'noopener');
    });
    $('signupDownloadQr')?.addEventListener('click', () => {
      const canvas = $('signupKioskQr');
      if (canvas && window.CafeKioskQR) window.CafeKioskQR.download(canvas, `${ownerKiosk?.kioskSlug || 'cafekiosk'}-kiosk-qr.png`);
    });
    $('signupContinueLogin')?.addEventListener('click', () => {
      location.href = '/admin-login?registered=owner';
    });
  }

  bindSignupKioskActions();

  const ownerForm = $('ownerSignupForm');
  if (ownerForm) {
    ownerForm.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = ownerForm.querySelector('button[type="submit"]');
      const password = $('ownerPassword').value;
      const confirm = $('ownerConfirmPassword').value;
      if (password !== confirm) {
        message('ownerSignupMessage', 'Passwords do not match.');
        return;
      }
      submit.disabled = true;
      submit.textContent = 'CREATING ACCOUNT...';
      message('ownerSignupMessage', 'Creating your CafeKiosk account...');
      try {
        const data = await jsonFetch(`${API}/api/auth/signup/owner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cafeName: $('cafeName').value.trim(),
            fullName: $('ownerFullName').value.trim(),
            email: $('ownerEmail').value.trim(),
            phone: $('ownerPhone').value.trim(),
            username: $('ownerUsername').value.trim(),
            password
          })
        });
        localStorage.setItem('cafeId', data.cafeId);
        sessionStorage.setItem('cafeSelectedLoginRole', 'admin');
        ownerKiosk = {
          cafeId: data.cafeId,
          kioskSlug: data.kioskSlug,
          kioskUrl: data.kioskUrl,
          kioskEnabled: data.kioskEnabled !== false,
          setupToken: data.kioskSetupToken
        };
        ownerForm.hidden = true;
        const panel = $('ownerKioskSetup');
        if (panel) panel.hidden = false;
        message('ownerSignupMessage', '', true);
        updateSignupKioskUi();
        setKioskStatus('Kiosk: Online. Your default link is registered and ready. You can customize it now or keep it.', 'ok');
        panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        message('ownerSignupMessage', error.message);
        submit.disabled = false;
        submit.textContent = 'CREATE CAFE ACCOUNT';
      }
    });
  }

  const staffForm = $('staffSignupForm');
  if (staffForm) {
    const params = new URLSearchParams(location.search);
    const token = params.get('token') || '';
    const tokenInput = $('staffInviteToken');
    if (tokenInput) tokenInput.value = token;

    async function loadInvite() {
      if (!token) {
        $('staffSignupFields')?.setAttribute('hidden', 'hidden');
        $('inviteError')?.removeAttribute('hidden');
        if ($('inviteError')) $('inviteError').textContent = 'A staff invitation is required. Ask the cafe owner or Admin to create an invitation from the User page.';
        return;
      }
      try {
        const data = await jsonFetch(`${API}/api/auth/invites/validate?token=${encodeURIComponent(token)}`);
        const invite = data.invite || {};
        if ($('inviteCafe')) $('inviteCafe').textContent = invite.cafeName || invite.cafeId || 'Cafe';
        if ($('inviteRole')) $('inviteRole').textContent = invite.role || 'Staff';
        if ($('inviteEmail')) $('inviteEmail').textContent = invite.email || '';
        if ($('staffEmail')) $('staffEmail').value = invite.email || '';
        localStorage.setItem('cafeId', invite.cafeId || 'cafe-1');
      } catch (error) {
        $('staffSignupFields')?.setAttribute('hidden', 'hidden');
        $('inviteError')?.removeAttribute('hidden');
        if ($('inviteError')) $('inviteError').textContent = error.message;
      }
    }
    loadInvite();

    staffForm.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = staffForm.querySelector('button[type="submit"]');
      const password = $('staffSignupPassword').value;
      const confirm = $('staffSignupConfirm').value;
      if (password !== confirm) {
        message('staffSignupMessage', 'Passwords do not match.');
        return;
      }
      submit.disabled = true;
      submit.textContent = 'CREATING ACCOUNT...';
      message('staffSignupMessage', 'Creating your staff account...');
      try {
        const data = await jsonFetch(`${API}/api/auth/signup/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            fullName: $('staffFullName').value.trim(),
            username: $('staffSignupUsername').value.trim(),
            password
          })
        });
        localStorage.setItem('cafeId', data.cafeId);
        sessionStorage.setItem('cafeSelectedLoginRole', String(data.role || 'Staff').toLowerCase() === 'manager' ? 'manager' : 'staff');
        message('staffSignupMessage', 'Account created. Redirecting to login...', true);
        setTimeout(() => { location.href = data.loginUrl || '/staff-login'; }, 1200);
      } catch (error) {
        message('staffSignupMessage', error.message);
        submit.disabled = false;
        submit.textContent = 'CREATE STAFF ACCOUNT';
      }
    });
  }
})();
