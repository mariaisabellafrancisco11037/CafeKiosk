# Security #1 — Server-Side Authentication Hardening

This build changes CafeKiosk cafe-user authentication so the browser is no longer the authority for identity, role, cafe membership, or session validity.

## What changed

1. **JWTs are no longer returned to frontend JavaScript after login.**
   - Login responses contain the user profile and redirect only.
   - The signed JWT is stored only in a role-specific `HttpOnly` cookie.

2. **No authentication JWT is stored in `localStorage` or `sessionStorage`.**
   - Old `cafeAdminAuthToken`, `cafeManagerAuthToken`, `cafeStaffAuthToken`, and `cafeAuthToken` values are deleted when the new auth scripts load.
   - Browser storage may still contain non-sensitive UI/session metadata such as cafe name or active role. These values are not authorization proof.

3. **Server-side revocable sessions are activated through `user_sessions`.**
   - Every database-backed login creates a random server session ID.
   - The JWT carries only `userId`, `sid`, and a token-version marker.
   - MySQL stores the active/revoked/expired session state.

4. **Every protected request is revalidated against MySQL.**
   - Server verifies signed cookie.
   - Server verifies the matching `user_sessions` record is active and not expired.
   - Server reloads the user's current role, cafe, owner status, user status, cafe status, and cafe approval status from MySQL.
   - Values inside localStorage or old JWT role/cafe claims are never authoritative.

5. **Current database role and cafe are authoritative.**
   - If a Manager is changed to Staff, an old browser state cannot keep Manager privileges.
   - Role/password changes revoke existing sessions.

6. **Logout is server-side.**
   - Logout marks the server session revoked and clears the HttpOnly cookie.
   - A copied old cookie cannot be reused after a successful logout because its `sid` is revoked in MySQL.

7. **Password changes sign out all devices.**
   - Changing or resetting a password revokes/deletes that user's active server sessions.

8. **Account deactivation already revokes sessions and is now enforced by the active server-session check.**

9. **Authentication fails closed.**
   - Missing auth schema, database errors, missing session records, revoked sessions, inactive accounts, or unapproved cafes result in denial rather than bypassing the check.

10. **Legacy pre-upgrade JWT sessions are rejected in production.**
    - Existing users will need to log in once after this deployment so a server-side session can be created.

11. **Socket.IO authentication uses HttpOnly cookies too.**
    - JavaScript no longer sends the JWT in `socket.handshake.auth.token`.
    - It sends only a role selector such as `admin` or `staff`.
    - The server selects the corresponding HttpOnly cookie and revalidates the session and current database account before accepting the authenticated socket.

## Database change

CafeKiosk already defines a `user_sessions` table in the full schema. This build also includes:

`CafeKiosk-DataBase/V20_SERVER_SIDE_AUTH_SESSIONS.sql`

and Railway startup calls `ensureSessionSchema()` so an existing deployment gets the table if it is missing. This is additive; it does not delete cafe, user, order, inventory, or sales data.

## Railway variables

Keep these configured:

- `JWT_SECRET` — long random backend-only secret (32+ characters recommended).
- `AUTH_SESSION_HOURS=8` — optional; defaults to 8 hours.
- `ALLOW_FALLBACK_DEMO_ACCOUNTS=false` — recommended/expected in production.

## Important expected behavior after deployment

Old cafe Admin/Manager/Staff sessions were created without a server `sid`, so the new build intentionally rejects them. Log in again once on each device after deployment.
