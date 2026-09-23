<!DOCTYPE html>
<html>
<head>
    <title>CafeKiosk</title>
    <link rel="stylesheet" href="/Assets/css/kiosk.css">
  <link rel="stylesheet" href="/Assets/css/uniform-theme.css?v=30">
  <link rel="stylesheet" href="/Assets/css/message-dialog.css?v=logout-confirm-v2">
  <link rel="icon" type="image/x-icon" href="/Assets/images/favicon.ico?v=20260923">
  <link rel="apple-touch-icon" href="/Assets/images/logo.png">
</head>
<body class="uniform-kiosk kiosk-home">

<div class="container">

    <!-- LOGO -->
    <img src="/Assets/images/logo.png" class="logo">

    <!-- TITLE -->
    <h1 class="title">Welcome to <span data-kiosk-cafe-name>CafeKiosk</span></h1>

    <!-- SUBTEXT -->
    <p class="subtitle">Tap below to begin your order</p>

    <!-- START BUTTON -->
    <button class="start-btn" onclick="startOrder()">
        START ORDER
    </button>

</div>


<script src="/Assets/js/kiosk-tenant.js?v=1"></script>
<script src="/Assets/js/kiosk.js?v=2"></script>


  <script src="/Assets/js/uniform-theme.js"></script>
  <script src="/Assets/js/live-presence.js?v=3"></script>
  <script src="/Assets/js/message-dialog.js?v=logout-confirm-v2"></script>
</body>
</html>