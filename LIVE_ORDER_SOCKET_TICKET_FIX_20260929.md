# Live Order Socket Ticket Fix — 2026-09-29

## Problem
Authenticated Order Monitor / Order Queue pages could remain in **Reconnecting...** or **Syncing...** behind Railway/custom-domain proxies even while normal REST API calls worked.

## Fix
- Added `/api/auth/socket-ticket` (authenticated by the existing HttpOnly login cookie).
- The endpoint returns only a short-lived, random, one-time opaque ticket; it never returns the login JWT.
- Socket.IO requests a fresh ticket for every connection/reconnection attempt.
- The backend consumes the ticket once, then revalidates the associated live MySQL session before joining protected rooms.
- Existing secure-cookie Socket.IO authentication remains as a compatibility fallback.
- Admin, Manager and Staff live order pages all use the same ticket mechanism.

## Security properties
- Main JWT remains HttpOnly and unavailable to JavaScript.
- Ticket expires quickly and can be used only once.
- Ticket is bound internally to the already authenticated server-side session.
- Tenant room membership still comes from the database-backed account, not browser cafeId values.
