# CafeKiosk Security Update: Credential Data Minimization + Brute-Force Alerts

This build keeps the previous security hardening and adds the following protections.

## 1. Owner username removed from passive System Admin monitoring

The `/api/system-admin/overview` response no longer queries or returns the cafe owner's login username.
The pending-approval response also no longer returns `ownerUsername`, and deleted-account history no longer sends the saved username/email back to the browser.

The System Admin dashboard displays the owner's name only in the normal cafe monitoring table. The explicit assisted-onboarding flow may still show the temporary User ID that the System Administrator has just created because it must be handed to that owner.

Important: a username is an identifier, not a secret like a password. Removing it from unnecessary responses is still useful data minimization and makes account enumeration less convenient.

## 2. Cafe account brute-force protection

- Warning threshold: 3 consecutive failed password attempts by default.
- Temporary account lock: 5 consecutive failed attempts by default.
- Default lock duration: 15 minutes.
- Successful authentication resets `failed_attempts` and `lock_until`.
- Existing endpoint/IP rate limiting remains enabled as a separate layer.

Railway variables can adjust these defaults:

- `LOGIN_WARNING_THRESHOLD=3`
- `LOGIN_LOCK_THRESHOLD=5`
- `LOGIN_LOCK_MINUTES=15`

## 3. Security alerts for IT/System Administrator

A `security_alerts` table is created automatically when needed.

CafeKiosk records a security alert when:

- repeated cafe-account login failures reach the warning threshold;
- a cafe account is temporarily locked by brute-force protection;
- repeated System Administrator login failures are detected;
- the System Administrator login itself is temporarily locked.

The System Administrator dashboard loads the last 24 hours of security alerts and displays them in **System & Security Alerts**. It auto-refreshes every 15 seconds, so the IT monitor receives the warning without exposing the attempted password.

Security alerts can contain the source IP for incident investigation, but do not expose the submitted password.

## 4. System Administrator login protection

The System Administrator login now has its own protection:

- warning after 3 failures by default;
- temporary lock after 5 failures by default;
- default lock duration of 15 minutes;
- an additional IP/endpoint rate limit;
- `SameSite=Strict` on the System Administrator authentication cookie.

In Railway/production, public/default System Administrator credentials are no longer accepted. Configure:

- `SYSTEM_ADMIN_USER`
- `SYSTEM_ADMIN_PASSWORD` (at least 12 characters)
- optional `SYSTEM_ADMIN_DISPLAY_NAME`

Optional tuning:

- `SYSTEM_ADMIN_WARNING_THRESHOLD=3`
- `SYSTEM_ADMIN_MAX_FAILED_ATTEMPTS=5`
- `SYSTEM_ADMIN_LOCK_MINUTES=15`

## Defense-day explanation

CafeKiosk treats the browser as untrusted. Login identifiers are minimized in passive monitoring responses, while passwords remain hashed/secret. Repeated authentication failures are recorded, rate-limited, and can temporarily lock an account. The IT monitor receives a security alert, but no attempted password is ever returned to the monitoring browser.
