# CafeKiosk Kiosk Order Security Compatibility Fix

This build keeps Security #1 server-side authentication and the prior tenant/security hardening.

## Cause of the Kiosk checkout error
The server-authoritative pricing hardening requires each Kiosk order item to resolve to a real product in the authenticated/slug-resolved cafe. The Kiosk menu cart previously dropped `productId` when an item was added to the cart, so production order hardening could reject the item. The checkout fallback then retried the unsaved order, while the global error handler masked request validation errors as HTTP 500 `Internal server error`.

## Fixes
- Preserve `productId` from catalog -> item modal -> cart -> POST /api/orders.
- Checkout fallback now includes the Kiosk slug so the server resolves the tenant rather than trusting a browser cafeId.
- Server-authoritative pricing may resolve a product by numeric product ID or by exact product name + category within the already-resolved cafe. The database price still wins.
- HTTP request validation errors now keep their intended 4xx/409 status/message instead of being masked as a generic 500.
- Kiosk menu/checkout script versions were bumped to avoid stale browser cache.

This does not weaken JWT/session authentication. Public Kiosk order creation remains a guest flow; POS order creation still requires Admin/Manager/Staff authentication.
