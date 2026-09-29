# Live Order Realtime Restore — 2026-09-29

This build restores the last known-working Socket.IO authentication path for Admin, Manager and Staff order screens.

- Realtime cafe-user sockets authenticate directly from the signed HttpOnly role cookie.
- The backend still validates the exact JWT against `user_sessions.token_hash`, the current user status, current role, current cafe and cafe approval state.
- Browser JavaScript does not read the JWT.
- Public kiosk sockets remain guest connections and are authorized by the active kiosk slug when joining the kiosk room.
- The experimental one-time socket-ticket layer was removed from the active realtime path because it caused reconnection/sync loops on the Railway/custom-domain deployment.
- Order creation and `new-order`/`order:created`/`orders:changed` broadcast behavior is unchanged.
