-- ============================================================
-- CafeKiosk SAMPLE TEST ACCOUNTS
-- Does NOT drop/reset the database.
-- Requires the current CafeKiosk schema to already exist.
-- ============================================================
USE cafekiosk;

INSERT INTO cafes (cafe_id, cafe_name, kiosk_slug, kiosk_enabled, kiosk_slug_updated_at, timezone, status)
VALUES ('cafe-1', 'CafeKiosk Demo Cafe', 'cafekiosk-demo', 1, NOW(), 'Asia/Manila', 'Active')
ON DUPLICATE KEY UPDATE
    cafe_name = VALUES(cafe_name),
    kiosk_slug = COALESCE(NULLIF(kiosk_slug,''), VALUES(kiosk_slug)),
    kiosk_enabled = 1,
    status = 'Active';

-- Password: admin123
INSERT INTO users (
    cafe_id, full_name, username, email, phone,
    password_hash, role, is_owner, status,
    email_verified_at, must_change_password, failed_attempts, lock_until
)
VALUES (
    'cafe-1',
    'CafeKiosk Administrator',
    'admin',
    'admin@cafekiosk.local',
    NULL,
    '$2a$10$0fCJYl3RSX358.MYVM0SHe7F8KR2j7eorArbdBuAoHANfIVAPWDJy',
    'Admin', 1, 'Active', NOW(), 0, 0, NULL
)
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    role = 'Admin',
    is_owner = 1,
    status = 'Active',
    email_verified_at = NOW(),
    must_change_password = 0,
    failed_attempts = 0,
    lock_until = NULL;

-- Password: staff123
INSERT INTO users (
    cafe_id, full_name, username, email, phone,
    password_hash, role, is_owner, status,
    email_verified_at, must_change_password, failed_attempts, lock_until
)
VALUES (
    'cafe-1',
    'CafeKiosk Staff',
    'staff',
    'staff@cafekiosk.local',
    NULL,
    '$2a$10$39BmwZeX8lS6AgsoST2BCeAZCSRTGdizTMx2/7n4yFVd8Lf1SzMua',
    'Staff', 0, 'Active', NOW(), 0, 0, NULL
)
ON DUPLICATE KEY UPDATE
    full_name = VALUES(full_name),
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    role = 'Staff',
    is_owner = 0,
    status = 'Active',
    email_verified_at = NOW(),
    must_change_password = 0,
    failed_attempts = 0,
    lock_until = NULL;
