# Security #1 Attack Tests

Run these only against your own CafeKiosk test accounts/test cafes.

## A. Browser storage test

1. Log in normally.
2. Open DevTools -> Application -> Local Storage / Session Storage.
3. Confirm there is no usable CafeKiosk authentication JWT in:
   - `cafeAdminAuthToken`
   - `cafeManagerAuthToken`
   - `cafeStaffAuthToken`
   - `cafeAuthToken`
4. Changing `role`, `cafeId`, `userId`, or saved profile metadata must not grant access.

Expected: protected APIs still use the authenticated cookie + MySQL account.

## B. Fake Bearer token test

Manually send a protected request with a fake or old `Authorization: Bearer ...` header.

Expected: CafeKiosk cafe-user authentication does not use browser Bearer tokens. Without a valid HttpOnly role cookie + active server session, the request is rejected.

## C. Role-change test

1. Log in as a Manager on Device/Browser A.
2. From the cafe Owner/Admin account, change that employee to Staff.
3. Return to Browser A and try a Manager-only API/page.

Expected: the old Manager session is revoked and/or the current DB role is Staff; Manager access fails immediately.

## D. Account-deactivation test

1. Log in as Staff on Browser A.
2. Admin deactivates/archives that Staff account.
3. Browser A attempts another protected request.

Expected: 401/403 and no protected data.

## E. Logout replay test

1. While logged in, note that an HttpOnly role cookie exists in DevTools.
2. Log out normally.
3. Replay/copy the old cookie value in an HTTP testing client against a protected API.

Expected: the JWT signature may still be structurally valid, but MySQL marks its `sid` revoked; the API rejects it.

## F. Password-change all-device test

1. Log into the same account on Browser A and Browser B.
2. Change the password on Browser A.
3. Attempt a protected request from Browser B.

Expected: all previous `user_sessions` for that user are revoked, so Browser B must log in again.

## G. Database role is authoritative

Modify browser values such as:

- `role = Admin`
- `cafeId = another-cafe`
- `userId = another-user`

Expected: those values may alter cosmetic client state, but the backend reloads `role`, `cafe_id`, and status from MySQL and ignores them for authorization.

## H. Fail-closed test

Temporarily disconnect the test backend from MySQL or use a non-production clone with the session table unavailable.

Expected: protected authentication returns an error/503. It must not grant access because a security check could not run.

## I. Verify the server-side session table

After a successful login, inspect `user_sessions` in a test database.

Expected fields include a random `session_id`, `user_id`, timestamps, source metadata, expiration, and revocation state. The frontend should never receive the database row itself.
