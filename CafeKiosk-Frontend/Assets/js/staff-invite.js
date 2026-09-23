(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  function apiOrigin() {
    return window.CafeAuth?.API_ORIGIN || ((location.protocol === 'http:' || location.protocol === 'https:')
      ? ((!location.port || ['80','443','5000'].includes(location.port)) ? location.origin : `${location.protocol}//${location.hostname}:5000`)
      : 'http://127.0.0.1:5000');
  }

  async function apiFetch(url, options = {}) {
    if (window.CafeAuth?.apiFetch) return window.CafeAuth.apiFetch(url, options);
    const headers = new Headers(options.headers || {});
    const token = localStorage.getItem('cafeAdminAuthToken') || sessionStorage.getItem('cafeAuthToken') || '';
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers, credentials: 'include' });
  }

  function dialog(message, type = 'info', title = 'Staff Invitation') {
    if (window.CafeMessageDialog?.show) return window.CafeMessageDialog.show(message, { type, title });
    alert(message);
  }

  function setDelivery(text, type = 'info') {
    const el = $('inviteDeliveryStatus');
    if (!el) return;
    el.textContent = text || '';
    el.dataset.type = type;
    el.style.display = text ? 'block' : 'none';
  }

  function openInvite() {
    const modal = $('inviteModal');
    if (!modal) return dialog('Invitation dialog could not be opened. Refresh the page and try again.', 'error', 'Invitation Error');
    $('inviteForm')?.reset();
    if ($('inviteRoleInput')) $('inviteRoleInput').value = 'Staff';
    if ($('inviteResult')) $('inviteResult').style.display = 'none';
    if ($('inviteMessage')) $('inviteMessage').textContent = '';
    setDelivery('');
    modal.classList.add('open');
    setTimeout(() => $('inviteEmailInput')?.focus(), 80);
  }

  function closeInvite() { $('inviteModal')?.classList.remove('open'); }

  async function submitInvite(event) {
    event.preventDefault();
    const form = $('inviteForm');
    const emailInput = $('inviteEmailInput');
    const roleInput = $('inviteRoleInput');
    if (!form || !emailInput || !roleInput) return;

    const email = String(emailInput.value || '').trim().toLowerCase();
    const role = roleInput.value === 'Manager' ? 'Manager' : 'Staff';
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      emailInput.focus();
      return dialog('Enter a valid employee email address first.', 'warning', 'Invalid Email');
    }

    const button = form.querySelector('button[type="submit"]');
    const original = button?.textContent || 'Send Email Invitation';
    if (button) { button.disabled = true; button.textContent = 'Sending...'; }
    if ($('inviteMessage')) $('inviteMessage').textContent = 'Creating a secure invitation and sending email...';
    if ($('inviteResult')) $('inviteResult').style.display = 'none';
    setDelivery('');

    try {
      const response = await apiFetch(`${apiOrigin()}/api/auth/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, expiresHours: 48 })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Invitation request failed (HTTP ${response.status}).`);

      if (data.authToken && window.CafeAuth?.replaceToken) window.CafeAuth.replaceToken(data.authToken);

      const signupPath = data.signupPath || '/staff-signup';
      const link = data.inviteUrl || new URL(signupPath, location.origin).href;
      if ($('inviteLink')) $('inviteLink').value = link;
      if ($('openInvite')) $('openInvite').href = link;
      if ($('inviteResult')) $('inviteResult').style.display = 'block';
      if ($('inviteMessage')) $('inviteMessage').textContent = '';

      if (data.emailSent) {
        setDelivery(`Invitation email sent to ${data.invitedEmail || email}. It expires in ${data.expiresHours || 48} hours.`, 'success');
        dialog(`${role} invitation sent to ${data.invitedEmail || email} for ${data.cafeName || 'this cafe'}.`, 'success', 'Invitation Sent');
      } else {
        const detail = data.emailError ? ` ${data.emailError}` : '';
        setDelivery(`The invitation was created, but email delivery did not complete.${detail} Use the backup link below.`, 'warning');
        dialog(`The secure invitation was created, but the email was not sent.${detail} The backup signup link is ready below.`, 'warning', 'Email Not Sent');
      }
    } catch (error) {
      if ($('inviteMessage')) $('inviteMessage').textContent = '';
      dialog(error.message || 'Unable to create the invitation.', 'error', 'Invitation Error');
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  async function copyTextReliable(text) {
    const value = String(text || '').trim();
    if (!value) return false;

    // Preferred path on HTTPS/localhost.
    if (window.isSecureContext && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (_) {
        // Fall through to the compatibility method below.
      }
    }

    // Compatibility path for browsers/webviews that block navigator.clipboard.
    const helper = document.createElement('textarea');
    helper.value = value;
    helper.setAttribute('readonly', '');
    helper.setAttribute('aria-hidden', 'true');
    helper.style.position = 'fixed';
    helper.style.left = '-9999px';
    helper.style.top = '0';
    helper.style.opacity = '0';
    helper.style.pointerEvents = 'none';
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    helper.setSelectionRange(0, helper.value.length);

    let copied = false;
    try {
      copied = document.execCommand('copy') === true;
    } catch (_) {
      copied = false;
    } finally {
      helper.remove();
    }
    return copied;
  }

  async function copyInvite() {
    const input = $('inviteLink');
    const openLink = $('openInvite');
    const link = String(input?.value || openLink?.href || '').trim();
    if (!link || link === '#' || link.endsWith('/#')) {
      return dialog('Create an invitation first so there is a secure signup link to copy.', 'warning', 'No Invitation Link');
    }

    const button = $('copyInvite');
    const originalText = button?.textContent || 'Copy Link';
    if (button) {
      button.disabled = true;
      button.textContent = 'Copying...';
    }

    const copied = await copyTextReliable(link);

    if (button) {
      button.disabled = false;
      button.textContent = copied ? 'Copied!' : originalText;
      if (copied) setTimeout(() => { if (button) button.textContent = originalText; }, 1400);
    }

    if (copied) {
      dialog('Backup invitation link copied to your clipboard.', 'success', 'Copied');
      return;
    }

    // Last-resort UX: select the real field so Ctrl+C / long-press copy works immediately.
    if (input) {
      input.focus();
      input.select();
      input.setSelectionRange?.(0, input.value.length);
    }
    dialog('Your browser blocked automatic clipboard access. The invitation link is selected now; press Ctrl+C (or long-press Copy on mobile).', 'warning', 'Copy Manually');
  }

  function boot() {
    $('inviteUser')?.addEventListener('click', openInvite);
    $('closeInvite')?.addEventListener('click', closeInvite);
    $('inviteForm')?.addEventListener('submit', submitInvite);
    $('copyInvite')?.addEventListener('click', copyInvite);
    $('inviteModal')?.addEventListener('click', event => { if (event.target === $('inviteModal')) closeInvite(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
