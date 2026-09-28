-- CafeKiosk V19 - Admin/Manager Approval PIN migration
-- This is safe to run on an existing CafeKiosk Railway MySQL database.
-- The current Railway startup also performs the same checks automatically.

SET @db := DATABASE();

SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='approval_pin_hash'
  ),
  'SELECT ''approval_pin_hash already exists''',
  'ALTER TABLE users ADD COLUMN approval_pin_hash VARCHAR(255) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := IF(
  EXISTS(
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=@db AND TABLE_NAME='users' AND COLUMN_NAME='approval_pin_updated_at'
  ),
  'SELECT ''approval_pin_updated_at already exists''',
  'ALTER TABLE users ADD COLUMN approval_pin_updated_at DATETIME NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE users
  MODIFY COLUMN role ENUM('Admin','Staff','Manager') NOT NULL DEFAULT 'Staff';

-- Status check only. This intentionally does NOT expose the saved hash.
SELECT user_id, cafe_id, username, role, status,
       CASE
         WHEN approval_pin_hash IS NULL OR approval_pin_hash='' THEN 'Not set'
         ELSE 'Set'
       END AS approval_pin_status,
       approval_pin_updated_at
FROM users
WHERE role IN ('Admin','Manager')
ORDER BY cafe_id, role, user_id;
