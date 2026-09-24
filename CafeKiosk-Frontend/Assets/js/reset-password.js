(() => {
  'use strict';

  const form = document.getElementById('resetPasswordForm');
  const status = document.getElementById('resetLinkStatus');
  const title = document.getElementById('resetAccountTitle');
  const message = document.getElementById('resetPasswordMessage');
  const button = document.getElementById('resetPasswordButton');
  const loginLink = document.getElementById('recoveryLoginLink');
  const params = new URLSearchParams(window.location.search);
  const token = String(params.get('token') || '').trim();
  let loginUrl = '/login';

  function show(text, success = false) {
    const value = String(text || '');
    if (message) {
      message.textContent = value;
      message.classList.toggle('success', success);
    }
    if (value && window.CafeMessageDialog && !/resetting/i.test(value)) {
      window.CafeMessageDialog.show(value, {
        type: success ? 'success' : 'error',
        title: success ? 'Password Updated' : 'Password Reset'
      });
    }
  }

  async function validateLink() {
    if (!token) {
      status.textContent = 'This password-reset link is missing its secure token.';
      status.classList.add('error');
      return;
    }
    try {
      const response = await fetch(`/api/auth/password-reset/validate?token=${encodeURIComponent(token)}`, {
        credentials: 'include', cache: 'no-store'
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.valid) throw new Error(data.message || 'This password-reset link is invalid.');

      const account = data.account || {};
      const role = String(account.role || 'User');
      const loginMap = { Admin: '/admin-login', Manager: '/manager-login', Staff: '/staff-login' };
      loginUrl = loginMap[role] || '/login';
      if (loginLink) loginLink.href = loginUrl;
      if (title) title.textContent = `${account.cafeName || 'CafeKiosk'} • ${role}`;
      status.innerHTML = `<strong>${account.fullName || 'Account verified'}</strong><br><span>${account.emailHint || ''}</span><br><small>Secure email ownership verified. Create a new password below.</small>`;
      status.classList.add('valid');
      form.hidden = false;
    } catch (error) {
      status.textContent = error.message || 'This password-reset link is invalid, expired, or already used.';
      status.classList.add('error');
      form.hidden = true;
    }
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const newPassword = String(form.elements.newPassword?.value || '');
    const confirmPassword = String(form.elements.confirmPassword?.value || '');
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      show('Use at least 8 characters with at least one letter and one number.');
      return;
    }
    if (newPassword !== confirmPassword) {
      show('The password confirmation does not match.');
      return;
    }

    button.disabled = true;
    button.textContent = 'RESETTING...';
    if (message) message.textContent = 'Resetting your password securely...';
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword, confirmPassword })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to reset your password.');
      loginUrl = data.loginUrl || loginUrl;
      if (loginLink) loginLink.href = loginUrl;
      form.hidden = true;
      status.textContent = 'Password reset complete. Your secure link has now been invalidated.';
      status.classList.remove('error');
      status.classList.add('valid');
      show(data.message || 'Password updated successfully.', true);
      setTimeout(() => { window.location.href = loginUrl; }, 1800);
    } catch (error) {
      show(error.message || 'Unable to reset your password.');
    } finally {
      button.disabled = false;
      button.textContent = 'RESET PASSWORD';
    }
  });

  validateLink();
})();
