-- CafeKiosk V18 runtime migration (NON-DESTRUCTIVE)
-- Safe to run on the existing cafekiosk database. It does NOT drop the database.
USE cafekiosk;
CREATE TABLE IF NOT EXISTS app_state (
  cafe_id VARCHAR(50) NOT NULL,
  state_key VARCHAR(100) NOT NULL,
  payload JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (cafe_id, state_key),
  CONSTRAINT fk_app_state_cafe FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
