(() => {
  'use strict';

  const form = document.getElementById('forgotPasswordForm');
  const emailInput = document.getElementById('recoveryEmail');
  const button = document.getElementById('sendResetButton');
  const message = document.getElementById('forgotPasswordMessage');
  const title = document.getElementById('recoveryRoleTitle');
  const back = document.getElementById('forgotBackLink');
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const rawRole = String(params.get('role') || '').trim().toLowerCase();
  const roleMap = { admin: 'Admin', manager: 'Manager', staff: 'Staff' };
  const role = roleMap[rawRole] || '';
  const loginMap = { Admin: '/admin-login', Manager: '/manager-login', Staff: '/staff-login' };

  if (role) {
    title.textContent = `${role} Account Recovery`;
    if (back) back.href = loginMap[role];
  }

  function show(text, success = false) {
    const value = String(text || '');
    if (message) {
      message.textContent = value;
      message.classList.toggle('success', success);
    }
    if (value && window.CafeMessageDialog && !/sending/i.test(value)) {
      window.CafeMessageDialog.show(value, {
        type: success ? 'success' : 'error',
        title: success ? 'Check Your Email' : 'Password Recovery'
      });
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = String(emailInput?.value || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      show('Please enter a valid registered email address.');
      emailInput?.focus();
      return;
    }

    button.disabled = true;
    button.textContent = 'SENDING...';
    if (message) message.textContent = 'Sending secure password-reset request...';

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to request a password reset.');
      show(data.message || 'If an eligible account matches that email, a password-reset link will be sent.', true);
      form.reset();
    } catch (error) {
      show(error.message || 'Unable to request a password reset.');
    } finally {
      button.disabled = false;
      button.textContent = 'SEND RESET LINK';
    }
  });
})();
