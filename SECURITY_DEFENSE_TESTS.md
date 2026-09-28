# Defense-Day Security Tests

Run these against a test deployment with at least two cafes (Cafe A and Cafe B).

1. Log in as Cafe A Staff. In DevTools change `localStorage.cafeId` to Cafe B and any visible role value to `Admin`. Refresh protected Admin pages and call protected APIs. Expected: no Cafe B access; Admin-only endpoints return 403/redirect.
2. While logged in to Cafe A, manually change `?cafeId=` or JSON `cafeId` to Cafe B on inventory/catalog/order requests. Expected: authenticated protected requests remain scoped to Cafe A.
3. As a logged-out browser call `/api/inventory`, `/api/inventory/live`, `/api/inventory/status`, and `/api/menu-availability/inventory-status`. Expected: 401.
4. As Cafe A Staff call an Admin inventory mutation. Expected: 403.
5. Change an order item's `price`, `subtotal`, `discountAmount`, `taxAmount`, or `total` in DevTools before POSTing. Expected: the stored order uses the server/database base price and server-calculated financial totals.
6. Change a POS order's `cafeId` to Cafe B. Expected: it is stored under the authenticated user's Cafe A or rejected, never Cafe B.
7. Try a real Cafe B `/api/catalog?cafeId=...` while logged out. Expected: 404. Use Cafe B's valid public Kiosk slug; expected: only the public Kiosk catalog is returned.
8. Repeatedly submit bad logins/PINs. Expected: HTTP 429 after the configured threshold.
9. Try joining another cafe's Admin/POS/Order Queue Socket.IO room by editing the cafe ID in DevTools. Expected: the server binds the socket to the authenticated cafe.
10. Confirm Railway has a strong `JWT_SECRET`, `ALLOW_FALLBACK_DEMO_ACCOUNTS=false`, HTTPS enabled, and no database credentials committed to the repository.

These tests demonstrate application-layer controls. They do not simulate a person who owns the Railway/MySQL credentials; infrastructure access must be governed separately by account permissions.
