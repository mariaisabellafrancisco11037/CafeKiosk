(function () {
  const form = document.getElementById('systemAdminLoginForm');
  const message = document.getElementById('systemAdminLoginMessage');
  const submitButton = document.getElementById('systemAdminLoginButton');

  if (!form) return;

  function showMessage(text, success) {
    if (!message) return;
    const value = String(text || '');
    const transient = /connecting|logging in/i.test(value);
    if (value && !transient && window.CafeMessageDialog) {
      message.textContent = '';
      message.classList.remove('success');
      window.CafeMessageDialog.show(value, {
        type: success ? 'success' : 'error',
        title: success ? 'Login Successful' : 'Login Message'
      });
      return;
    }
    message.textContent = value;
    message.classList.toggle('success', Boolean(success));
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = String(form.elements.userId?.value || '').trim();
    const password = String(form.elements.password?.value || '');

    if (!username || !password) {
      showMessage('Please enter your System Administrator ID and password.');
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'LOGGING IN...';
    showMessage('Connecting to System Monitor...');

    try {
      const response = await fetch('/api/system-admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Unable to log in.');

      showMessage('Login successful.', true);
      window.location.href = data.redirect || '/system-monitor';
    } catch (error) {
      showMessage(error.message || 'Unable to log in.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'LOG IN';
    }
  });
})();
