<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>CafeKiosk - Login</title>

  <link
    rel="stylesheet"
    href="../Assets/css/login.css"
  >
  <link rel="stylesheet" href="../Assets/css/uniform-theme.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>

<body class="auth-body uniform-auth">

  <main class="role-page">

    <section class="role-card">

      <img
        src="../Assets/images/logo.png"
        alt="CafeKiosk Logo"
        class="auth-logo auth-logo-large"
      >

      <h1 class="brand-name">
        CafeKiosk
      </h1>

      <div
        class="role-actions"
        aria-label="Choose login type"
      >

        <a
          class="role-button"
          href="/admin-login"
          data-login-role="admin"
        >
          Admin
        </a>

        <a
          class="role-button"
          href="/manager-login"
          data-login-role="manager"
        >
          Manager
        </a>

        <a
          class="role-button"
          href="/staff-login"
          data-login-role="staff"
        >
          Staff
        </a>

      </div>

      <div class="signup-links">
        <span>New to CafeKiosk?</span>
        <a href="/owner-signup">Create Cafe Account</a>
        <span class="signup-divider">•</span>
        <a href="/staff-signup">Staff Sign Up</a>
      </div>

      <a class="system-monitor-link" href="/system-admin-login">
        System Administrator / IT Monitor
      </a>

    </section>

  </main>

  <script>
    document.querySelectorAll("[data-login-role]").forEach(button => {
      button.addEventListener("click", () => {
        const role = String(button.dataset.loginRole || "").toLowerCase();
        sessionStorage.setItem("cafeSelectedLoginRole", role);
      });
    });
  </script>

  <script src="../Assets/js/uniform-theme.js"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>
