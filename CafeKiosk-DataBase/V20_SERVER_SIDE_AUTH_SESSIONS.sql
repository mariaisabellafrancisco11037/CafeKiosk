-- CafeKiosk V20 - server-side revocable authentication sessions
-- Safe to run more than once.
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    KEY idx_sessions_user_expiry (user_id, expires_at),
    KEY idx_sessions_active (session_id, revoked_at, expires_at),
    CONSTRAINT fk_sessions_user
      FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
