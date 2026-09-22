<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Type</title>

  <link rel="stylesheet" href="/Assets/css/order-type.css">
  <link rel="stylesheet" href="/Assets/css/uniform-theme.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=1">
</head>
<body class="uniform-kiosk kiosk-order-type">

<button
  type="button"
  class="page-back-btn"
  aria-label="Back to kiosk home"
  onclick="goBackToKiosk()"
>
  ← Back
</button>

<div class="container">
  <h1 class="title">How would you like your order?</h1>

  <div class="options">

    <div class="option-card" onclick="selectCard(this, 'dine-in')">
      <img src="/Assets/images/dine-in.png" alt="Dine In">
      <p>Dine In</p>
    </div>

    <div class="option-card" onclick="selectCard(this, 'take-out')">
      <img src="/Assets/images/take-out.png" alt="Take Out">
      <p>Take Out</p>
    </div>

  </div>

</div>

<script src="/Assets/js/kiosk-tenant.js?v=1"></script>
<script src="/Assets/js/order-type.js?v=2"></script>

  <script src="/Assets/js/uniform-theme.js"></script>
  <script src="/Assets/js/live-presence.js?v=3"></script>
  <script src="/Assets/js/message-dialog.js?v=1"></script>
</body>
</html>