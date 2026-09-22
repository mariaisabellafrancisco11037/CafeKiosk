-- ============================================================
-- CAFEKIOSK - COMPLETE MYSQL / MARIADB DATABASE
-- Designed for the current Admin + POS + Kiosk system
-- ============================================================
-- IMPORTANT:
-- 1) This replaces the older schema that had duplicate lock_until columns.
-- 2) Flexible sizes and ingredient usage are normalized into proper tables.
-- 3) Orders, discounts, cash received/change, audit logs, inventory movements,
--    suppliers, purchase orders, settings, authentication, owner signup,
--    staff invitations, email verification, and password reset are included.
-- 4) New cafe owners may self-register. Staff accounts should be created through
--    an owner/admin invitation instead of freely choosing a cafe or role.
-- 5) Inventory deduction/restoration should be done by the backend in ONE
--    transaction, because selected size + optional customizations affect usage.
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS cafekiosk;
CREATE DATABASE cafekiosk
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE cafekiosk;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 1. CAFE / BRANCH
-- ============================================================
CREATE TABLE cafes (
    cafe_id VARCHAR(50) PRIMARY KEY,
    cafe_name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NULL,
    contact_number VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    kiosk_slug VARCHAR(80) NULL,
    kiosk_enabled TINYINT(1) NOT NULL DEFAULT 1,
    kiosk_slug_updated_at DATETIME NULL,
    opening_time TIME NULL,
    closing_time TIME NULL,
    timezone VARCHAR(80) NOT NULL DEFAULT 'Asia/Manila',
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cafes_kiosk_slug (kiosk_slug)
) ENGINE=InnoDB;

-- ============================================================
-- 2. USERS / AUTHENTICATION
-- ============================================================
CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,

    full_name VARCHAR(120) NOT NULL,
    username VARCHAR(60) NOT NULL,
    email VARCHAR(190) NOT NULL,
    phone VARCHAR(40) NULL,

    password_hash VARCHAR(255) NOT NULL,

    -- Keep the existing role names so the current Admin/POS permission checks
    -- remain compatible. A cafe owner is an Admin with is_owner = 1.
    role ENUM('Admin','Staff','Manager') NOT NULL DEFAULT 'Staff',
    is_owner TINYINT(1) NOT NULL DEFAULT 0,

    status ENUM('Pending','Active','Inactive') NOT NULL DEFAULT 'Pending',
    email_verified_at DATETIME NULL,
    must_change_password TINYINT(1) NOT NULL DEFAULT 0,

    failed_attempts INT UNSIGNED NOT NULL DEFAULT 0,
    lock_until DATETIME NULL,
    approval_pin_hash VARCHAR(255) NULL,
    approval_pin_updated_at DATETIME NULL,

    last_login DATETIME NULL,
    last_activity DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_users_cafe_username (cafe_id, username),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_cafe_role_status (cafe_id, role, status),
    KEY idx_users_owner (cafe_id, is_owner),

    CONSTRAINT fk_users_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;


-- ============================================================
-- OWNER / STAFF SIGNUP SUPPORT
-- ============================================================

-- Public owner signup creates a cafe first, then creates the first user as
-- role='Admin' and is_owner=1 inside the same backend transaction.
--
-- Staff should NOT be allowed to freely type a cafe_id or select Admin.
-- An owner/admin generates an invitation; the signup page validates the token.

CREATE TABLE registration_invites (
    invite_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,

    invited_email VARCHAR(190) NOT NULL,
    invited_role ENUM('Admin','Staff','Manager') NOT NULL DEFAULT 'Staff',

    -- Store only a HASH of the invitation token, never the raw token.
    token_hash CHAR(64) NOT NULL,

    status ENUM('Pending','Accepted','Expired','Revoked')
        NOT NULL DEFAULT 'Pending',

    invited_by_user_id BIGINT UNSIGNED NOT NULL,
    accepted_by_user_id BIGINT UNSIGNED NULL,

    expires_at DATETIME NOT NULL,
    accepted_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_registration_invite_token (token_hash),
    KEY idx_registration_invites_email (invited_email, status),
    KEY idx_registration_invites_cafe (cafe_id, status, expires_at),

    CONSTRAINT fk_registration_invites_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_registration_invites_inviter
      FOREIGN KEY (invited_by_user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_registration_invites_accepted_user
      FOREIGN KEY (accepted_by_user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;


CREATE TABLE email_verification_tokens (
    verification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,

    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    verified_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_email_verification_token (token_hash),
    KEY idx_email_verification_user (user_id, expires_at),

    CONSTRAINT fk_email_verification_user
      FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE TABLE password_reset_tokens (
    reset_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,

    token_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uq_password_reset_token (token_hash),
    KEY idx_password_reset_user (user_id, expires_at),

    CONSTRAINT fk_password_reset_user
      FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;




-- ============================================================
-- ACCOUNT STATUS HISTORY
-- Every Admin activation/deactivation requires a reason.
-- ============================================================

CREATE TABLE account_status_history (
    history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(30) NOT NULL,
    new_status VARCHAR(30) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    changed_by_user_id BIGINT UNSIGNED NULL,
    changed_by_name VARCHAR(150) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_account_status_user (cafe_id, user_id, created_at),
    KEY idx_account_status_actor (changed_by_user_id, created_at),
    CONSTRAINT fk_account_status_cafe FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id) ON DELETE CASCADE,
    CONSTRAINT fk_account_status_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_account_status_actor FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE login_logs (
    login_log_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    username_attempted VARCHAR(60) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    login_status ENUM('Success','Failed','Locked') NOT NULL,
    failure_reason VARCHAR(255) NULL,
    attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_login_logs_cafe_time (cafe_id, attempted_at),
    KEY idx_login_logs_user_time (user_id, attempted_at),
    CONSTRAINT fk_login_logs_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_login_logs_user
      FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE user_sessions (
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
    CONSTRAINT fk_sessions_user
      FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE attendance (
    attendance_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    log_date DATE NOT NULL,
    time_in DATETIME NULL,
    time_out DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_attendance_user_date (user_id, log_date),
    CONSTRAINT fk_attendance_user
      FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. MENU CATEGORIES
-- ============================================================
CREATE TABLE categories (
    category_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    canonical_key VARCHAR(100) NOT NULL,
    image_path LONGTEXT NULL,
    icon VARCHAR(100) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_category_name (cafe_id, category_name),
    UNIQUE KEY uq_category_key (cafe_id, canonical_key),
    KEY idx_categories_display (cafe_id, status, sort_order),
    CONSTRAINT fk_categories_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 4. INVENTORY INGREDIENTS
-- ============================================================
CREATE TABLE ingredients (
    ingredient_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    ingredient_code VARCHAR(120) NOT NULL,
    ingredient_name VARCHAR(120) NOT NULL,
    ingredient_category VARCHAR(100) NULL,
    unit VARCHAR(30) NOT NULL,
    current_stock DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    low_stock_threshold DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ingredient_code (cafe_id, ingredient_code),
    UNIQUE KEY uq_ingredient_name (cafe_id, ingredient_name),
    KEY idx_ingredients_stock (cafe_id, status, current_stock, low_stock_threshold),
    CONSTRAINT fk_ingredients_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 5. MENU PRODUCTS
-- ============================================================
CREATE TABLE products (
    product_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    product_code VARCHAR(100) NULL,
    product_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    base_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    image_path LONGTEXT NULL,
    manual_availability ENUM('Available','Unavailable') NOT NULL DEFAULT 'Available',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_product_name_category (cafe_id, category_id, product_name),
    UNIQUE KEY uq_product_code (cafe_id, product_code),
    KEY idx_products_category (cafe_id, category_id, is_active, sort_order),
    CONSTRAINT fk_products_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_products_category
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
      ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Flexible product sizes such as Regular, Tall, Grande, 12 oz, 16 oz, etc.
CREATE TABLE product_sizes (
    product_size_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    size_name VARCHAR(80) NOT NULL,
    additional_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    recipe_multiplier DECIMAL(8,3) NOT NULL DEFAULT 1.000,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_product_size_name (product_id, size_name),
    CONSTRAINT fk_product_sizes_product
      FOREIGN KEY (product_id) REFERENCES products(product_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Optional category default sizes used when the owner chooses
-- "Use these sizes as the default sizes for this category".
CREATE TABLE category_default_sizes (
    category_default_size_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    size_name VARCHAR(80) NOT NULL,
    additional_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    recipe_multiplier DECIMAL(8,3) NOT NULL DEFAULT 1.000,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_category_default_size (category_id, size_name),
    CONSTRAINT fk_category_default_sizes_category
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Flexible ingredient usage per BASE serving.
-- For usage_type='Option', option_name must match the selected customization,
-- e.g. Extra shot, Vanilla syrup, Boba Pearls, Whipped cream.
CREATE TABLE product_recipe_ingredients (
    recipe_ingredient_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT UNSIGNED NOT NULL,
    ingredient_id BIGINT UNSIGNED NOT NULL,
    base_quantity DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    usage_type ENUM('Required','Option') NOT NULL DEFAULT 'Required',
    option_name VARCHAR(120) NULL,
    scale_with_size TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_recipe_product (product_id, usage_type),
    KEY idx_recipe_ingredient (ingredient_id),
    CONSTRAINT fk_recipe_product
      FOREIGN KEY (product_id) REFERENCES products(product_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_recipe_ingredient
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
      ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 6. PROMOTIONS & DISCOUNTS
-- ============================================================
CREATE TABLE promotions (
    promotion_id VARCHAR(80) PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    promotion_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    discount_type ENUM('Percentage','Fixed') NOT NULL,
    discount_value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    scope_type ENUM('All','Category','Products') NOT NULL DEFAULT 'All',
    minimum_subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    start_date DATE NULL,
    end_date DATE NULL,
    start_time TIME NULL,
    end_time TIME NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_promotions_active_dates (cafe_id, is_active, start_date, end_date),
    CONSTRAINT fk_promotions_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE promotion_categories (
    promotion_id VARCHAR(80) NOT NULL,
    category_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (promotion_id, category_id),
    CONSTRAINT fk_promo_categories_promo
      FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_promo_categories_category
      FOREIGN KEY (category_id) REFERENCES categories(category_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE promotion_products (
    promotion_id VARCHAR(80) NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    PRIMARY KEY (promotion_id, product_id),
    CONSTRAINT fk_promo_products_promo
      FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_promo_products_product
      FOREIGN KEY (product_id) REFERENCES products(product_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE promotion_eligibilities (
    promotion_id VARCHAR(80) NOT NULL,
    eligibility ENUM('All','General','Student','Senior','PWD') NOT NULL,
    PRIMARY KEY (promotion_id, eligibility),
    CONSTRAINT fk_promo_eligibility_promo
      FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE promotion_weekdays (
    promotion_id VARCHAR(80) NOT NULL,
    weekday ENUM('Mon','Tue','Wed','Thu','Fri','Sat','Sun') NOT NULL,
    PRIMARY KEY (promotion_id, weekday),
    CONSTRAINT fk_promo_weekdays_promo
      FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 7. ORDERS
-- ============================================================
CREATE TABLE orders (
    order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_uuid CHAR(36) NULL,
    cafe_id VARCHAR(50) NOT NULL,
    order_number VARCHAR(100) NOT NULL,
    source ENUM('POS','Kiosk') NOT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    customer_name VARCHAR(150) NOT NULL DEFAULT 'Walk-in Customer',
    customer_eligibility ENUM('General','Student','Senior','PWD') NOT NULL DEFAULT 'General',
    service_type ENUM('Dine In','Take Out') NOT NULL DEFAULT 'Dine In',
    status ENUM('Pending','Preparing','Ready','Completed','Cancelled','Refunded','Voided') NOT NULL DEFAULT 'Pending',
    status_reason VARCHAR(255) NULL,
    promotion_id VARCHAR(80) NULL,
    promotion_name_snapshot VARCHAR(150) NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('Cash','GCash','Card','Other') NOT NULL DEFAULT 'Cash',
    payment_status ENUM('Pending','Paid','Failed','Refunded','Partially Refunded') NOT NULL DEFAULT 'Pending',
    cash_received DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    change_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    UNIQUE KEY uq_orders_number (cafe_id, order_number),
    UNIQUE KEY uq_orders_uuid (order_uuid),
    KEY idx_orders_queue (cafe_id, status, created_at),
    KEY idx_orders_report (cafe_id, created_at, source, status),
    CONSTRAINT fk_orders_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_orders_user
      FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_orders_promotion
      FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
    order_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,
    product_name_snapshot VARCHAR(150) NOT NULL,
    category_snapshot VARCHAR(100) NULL,
    selected_size_name VARCHAR(80) NULL,
    recipe_multiplier DECIMAL(8,3) NOT NULL DEFAULT 1.000,
    base_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    size_price_add DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    customization_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_product (product_id),
    CONSTRAINT fk_order_items_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product
      FOREIGN KEY (product_id) REFERENCES products(product_id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_item_customizations (
    customization_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_item_id BIGINT UNSIGNED NOT NULL,
    customization_name VARCHAR(100) NULL,
    customization_value VARCHAR(180) NOT NULL,
    additional_price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_order_customizations_item
      FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payments (
    payment_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    payment_method ENUM('Cash','GCash','Card','Other') NOT NULL,
    reference_number VARCHAR(120) NULL,
    amount_due DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    amount_received DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    change_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_status ENUM('Pending','Paid','Failed','Refunded','Partially Refunded') NOT NULL DEFAULT 'Pending',
    paid_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_payments_order (order_id),
    CONSTRAINT fk_payments_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE refunds (
    refund_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    payment_id BIGINT UNSIGNED NULL,
    processed_by_user_id BIGINT UNSIGNED NULL,
    refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    reason VARCHAR(255) NOT NULL,
    status ENUM('Pending','Completed','Rejected') NOT NULL DEFAULT 'Completed',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_refunds_order (order_id, created_at),
    CONSTRAINT fk_refunds_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_refunds_payment
      FOREIGN KEY (payment_id) REFERENCES payments(payment_id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_refunds_user
      FOREIGN KEY (processed_by_user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
    status_history_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    changed_by_user_id BIGINT UNSIGNED NULL,
    old_status VARCHAR(40) NULL,
    new_status VARCHAR(40) NOT NULL,
    reason VARCHAR(255) NULL,
    source VARCHAR(50) NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_order_status_history (order_id, changed_at),
    CONSTRAINT fk_status_history_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_status_history_user
      FOREIGN KEY (changed_by_user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 8. INVENTORY MOVEMENTS / ORDER CONSUMPTION
-- ============================================================
CREATE TABLE inventory_movements (
    movement_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    ingredient_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM(
        'Increase','Decrease','Adjustment','Order Deduction','Order Restore',
        'Supplier Delivery','Waste / Spillage','Correction','Purchase Receipt'
    ) NOT NULL,
    quantity_change DECIMAL(14,3) NOT NULL,
    before_stock DECIMAL(14,3) NOT NULL,
    after_stock DECIMAL(14,3) NOT NULL,
    reason VARCHAR(150) NULL,
    notes VARCHAR(255) NULL,
    order_id BIGINT UNSIGNED NULL,
    purchase_order_id BIGINT UNSIGNED NULL,
    performed_by_user_id BIGINT UNSIGNED NULL,
    source VARCHAR(50) NOT NULL DEFAULT 'Admin',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_inventory_movements_cafe_time (cafe_id, created_at),
    KEY idx_inventory_movements_ingredient_time (ingredient_id, created_at),
    KEY idx_inventory_movements_order (order_id),
    CONSTRAINT fk_inventory_movements_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movements_ingredient
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_movements_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_inventory_movements_user
      FOREIGN KEY (performed_by_user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- Records exactly what each order consumed, so Voids / Refunds can safely restore stock once.
CREATE TABLE order_inventory_usage (
    usage_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    order_item_id BIGINT UNSIGNED NULL,
    ingredient_id BIGINT UNSIGNED NOT NULL,
    quantity_used DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    quantity_restored DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_order_inventory_usage_order (order_id),
    KEY idx_order_inventory_usage_ingredient (ingredient_id),
    CONSTRAINT fk_order_inventory_usage_order
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_order_inventory_usage_item
      FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id)
      ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_order_inventory_usage_ingredient
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
      ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
    notification_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    notification_type ENUM('LOW_STOCK','ORDER','SYSTEM','SECURITY') NOT NULL DEFAULT 'SYSTEM',
    title VARCHAR(150) NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50) NULL,
    entity_id VARCHAR(100) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME NULL,
    KEY idx_notifications_cafe_read (cafe_id, is_read, created_at),
    CONSTRAINT fk_notifications_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 10. SUPPLIERS & PURCHASE ORDERS
-- ============================================================
CREATE TABLE suppliers (
    supplier_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(120) NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    address VARCHAR(255) NULL,
    status ENUM('Active','Inactive') NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_supplier_name (cafe_id, supplier_name),
    CONSTRAINT fk_suppliers_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
    po_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    supplier_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    po_number VARCHAR(80) NULL,
    status ENUM('Draft','Ordered','Partially Received','Received','Cancelled') NOT NULL DEFAULT 'Draft',
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    ordered_at DATETIME NULL,
    received_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_po_number (cafe_id, po_number),
    KEY idx_purchase_orders_supplier (supplier_id, created_at),
    CONSTRAINT fk_purchase_orders_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_purchase_orders_supplier
      FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_purchase_orders_user
      FOREIGN KEY (created_by_user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
    po_item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    po_id BIGINT UNSIGNED NOT NULL,
    ingredient_id BIGINT UNSIGNED NOT NULL,
    quantity DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    received_quantity DECIMAL(14,3) NOT NULL DEFAULT 0.000,
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    KEY idx_po_items_po (po_id),
    CONSTRAINT fk_po_items_po
      FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id)
      ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_po_items_ingredient
      FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id)
      ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

ALTER TABLE inventory_movements
    ADD CONSTRAINT fk_inventory_movements_purchase_order
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(po_id)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- ============================================================
-- 11. SETTINGS
-- ============================================================
CREATE TABLE store_settings (
    cafe_id VARCHAR(50) PRIMARY KEY,
    store_name VARCHAR(150) NOT NULL,
    address VARCHAR(255) NULL,
    contact_number VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    opening_time TIME NULL,
    closing_time TIME NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_store_settings_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payment_methods (
    payment_method_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cafe_id VARCHAR(50) NOT NULL,
    method_name ENUM('Cash','GCash','Card','Other') NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    is_enabled TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    UNIQUE KEY uq_payment_method (cafe_id, method_name),
    CONSTRAINT fk_payment_methods_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tax_settings (
    cafe_id VARCHAR(50) PRIMARY KEY,
    tax_rate_percent DECIMAL(6,3) NOT NULL DEFAULT 0.000,
    service_charge_percent DECIMAL(6,3) NOT NULL DEFAULT 0.000,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tax_settings_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE system_preferences (
    cafe_id VARCHAR(50) PRIMARY KEY,
    default_order_type ENUM('Dine In','Take Out') NOT NULL DEFAULT 'Dine In',
    low_stock_warning_default DECIMAL(14,3) NOT NULL DEFAULT 10.000,
    currency_code VARCHAR(10) NOT NULL DEFAULT 'PHP',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '₱',
    receipt_footer VARCHAR(255) NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_system_preferences_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 12. AUDIT LOGS
-- Matches the fields currently shown on the Admin Audit Logs page.
-- ============================================================
CREATE TABLE audit_logs (
    audit_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    external_audit_id VARCHAR(100) NULL,
    cafe_id VARCHAR(50) NOT NULL,
    user_id BIGINT UNSIGNED NULL,
    user_name_snapshot VARCHAR(150) NULL,
    username_snapshot VARCHAR(60) NULL,
    role_snapshot VARCHAR(40) NULL,
    action VARCHAR(120) NOT NULL,
    category VARCHAR(80) NULL,
    details TEXT NULL,
    entity_id VARCHAR(120) NULL,
    source VARCHAR(60) NULL,
    http_method VARCHAR(15) NULL,
    request_path VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    status_code SMALLINT UNSIGNED NULL,
    success TINYINT(1) NOT NULL DEFAULT 1,
    duration_ms INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_external_audit_id (external_audit_id),
    KEY idx_audit_cafe_time (cafe_id, created_at),
    KEY idx_audit_user_time (user_id, created_at),
    KEY idx_audit_action (cafe_id, action, created_at),
    CONSTRAINT fk_audit_logs_cafe
      FOREIGN KEY (cafe_id) REFERENCES cafes(cafe_id)
      ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_audit_logs_user
      FOREIGN KEY (user_id) REFERENCES users(user_id)
      ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 13. USEFUL VIEWS FOR ADMIN PAGES
-- ============================================================
CREATE OR REPLACE VIEW v_inventory_monitor AS
SELECT
    i.ingredient_id,
    i.cafe_id,
    i.ingredient_code,
    i.ingredient_name,
    i.ingredient_category,
    i.unit,
    i.current_stock,
    i.low_stock_threshold,
    CASE
        WHEN i.status = 'Inactive' THEN 'Inactive'
        WHEN i.current_stock <= 0 THEN 'Out of Stock'
        WHEN i.current_stock <= i.low_stock_threshold THEN 'Low Stock'
        ELSE 'In Stock'
    END AS stock_status,
    i.updated_at
FROM ingredients i;

CREATE OR REPLACE VIEW v_product_catalog AS
SELECT
    p.product_id,
    p.cafe_id,
    p.product_code,
    p.product_name,
    p.description,
    p.base_price,
    p.image_path,
    p.manual_availability,
    p.is_active,
    c.category_id,
    c.category_name,
    c.canonical_key AS category_key,
    p.updated_at
FROM products p
JOIN categories c ON c.category_id = p.category_id;

CREATE OR REPLACE VIEW v_sales_report AS
SELECT
    o.order_id,
    o.cafe_id,
    o.order_number,
    o.source,
    o.customer_name,
    o.customer_eligibility,
    o.service_type,
    o.status,
    o.subtotal,
    o.discount_amount,
    o.total_amount,
    o.payment_method,
    o.payment_status,
    o.cash_received,
    o.change_amount,
    o.created_at,
    o.completed_at
FROM orders o;

-- ============================================================
-- 14. SAFETY TRIGGERS
-- ============================================================
DELIMITER $$

CREATE TRIGGER trg_ingredients_no_negative_insert
BEFORE INSERT ON ingredients
FOR EACH ROW
BEGIN
    IF NEW.current_stock < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ingredient stock cannot be negative.';
    END IF;
END$$

CREATE TRIGGER trg_ingredients_no_negative_update
BEFORE UPDATE ON ingredients
FOR EACH ROW
BEGIN
    IF NEW.current_stock < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Ingredient stock cannot be negative.';
    END IF;
END$$

CREATE TRIGGER trg_low_stock_notification
AFTER UPDATE ON ingredients
FOR EACH ROW
BEGIN
    IF NEW.status = 'Active'
       AND NEW.current_stock <= NEW.low_stock_threshold
       AND OLD.current_stock > OLD.low_stock_threshold THEN
        INSERT INTO notifications (
            cafe_id,
            notification_type,
            title,
            message,
            entity_type,
            entity_id
        ) VALUES (
            NEW.cafe_id,
            'LOW_STOCK',
            'Low Stock Alert',
            CONCAT(NEW.ingredient_name, ' is low: ', NEW.current_stock, ' ', NEW.unit, ' remaining.'),
            'Ingredient',
            CAST(NEW.ingredient_id AS CHAR)
        );
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- 15. DEFAULT DATA
-- ============================================================
INSERT INTO cafes (
    cafe_id, cafe_name, kiosk_slug, kiosk_enabled, kiosk_slug_updated_at, timezone, status
) VALUES (
    'cafe-1', 'CafeKiosk Demo Cafe', 'cafekiosk-demo', 1, CURRENT_TIMESTAMP, 'Asia/Manila', 'Active'
);

-- Default accounts.
-- admin password: admin123
-- staff password: staff123
-- The hashes below are bcrypt hashes and are intended for a DB-backed login.
INSERT INTO users (
    cafe_id,
    full_name,
    username,
    email,
    password_hash,
    role,
    is_owner,
    status,
    email_verified_at
) VALUES
(
    'cafe-1',
    'CafeKiosk Administrator',
    'admin',
    'admin@cafekiosk.local',
    '$2a$10$0fCJYl3RSX358.MYVM0SHe7F8KR2j7eorArbdBuAoHANfIVAPWDJy',
    'Admin',
    1,
    'Active',
    CURRENT_TIMESTAMP
),
(
    'cafe-1',
    'CafeKiosk Staff',
    'staff',
    'staff@cafekiosk.local',
    '$2a$10$39BmwZeX8lS6AgsoST2BCeAZCSRTGdizTMx2/7n4yFVd8Lf1SzMua',
    'Staff',
    0,
    'Active',
    CURRENT_TIMESTAMP
);

INSERT INTO categories (
    cafe_id, category_name, canonical_key, sort_order, status
) VALUES
('cafe-1','Coffee','coffee',1,'Active'),
('cafe-1','Non-Coffee','non-coffee',2,'Active'),
('cafe-1','Milktea','milk-tea',3,'Active'),
('cafe-1','Food','foods',4,'Active'),
('cafe-1','Snack','snacks',5,'Active'),
('cafe-1','Dessert','dessert',6,'Active');

INSERT INTO store_settings (
    cafe_id, store_name
) VALUES (
    'cafe-1', 'CafeKiosk'
);

INSERT INTO payment_methods (
    cafe_id, method_name, display_name, is_enabled, sort_order
) VALUES
('cafe-1','Cash','Cash',1,1),
('cafe-1','GCash','GCash / E-wallet',0,2),
('cafe-1','Card','Card',0,3),
('cafe-1','Other','Other',0,4);

INSERT INTO tax_settings (
    cafe_id, tax_rate_percent, service_charge_percent
) VALUES (
    'cafe-1', 0.000, 0.000
);

INSERT INTO system_preferences (
    cafe_id,
    default_order_type,
    low_stock_warning_default,
    currency_code,
    currency_symbol
) VALUES (
    'cafe-1',
    'Dine In',
    10.000,
    'PHP',
    '₱'
);

-- ============================================================
-- SIGNUP WORKFLOW NOTES
-- ============================================================
-- OWNER SIGNUP (public):
--   1) Validate full name, cafe name, email, username and password.
--   2) Hash the password in the backend (bcrypt/argon2).
--   3) BEGIN TRANSACTION.
--   4) INSERT a new row into cafes using a generated cafe_id.
--   5) INSERT the owner into users with:
--          role='Admin', is_owner=1, status='Pending'
--   6) INSERT the default categories/settings/payment methods for that cafe.
--   7) INSERT a hashed email verification token.
--   8) COMMIT.
--   9) After verification, set status='Active' and email_verified_at=NOW().
--
-- STAFF SIGNUP (invite only):
--   1) Owner/Admin creates registration_invites with a random token.
--   2) Only the HASH of the token is stored in this database.
--   3) Staff opens the invitation link and fills in name/username/password.
--   4) Backend validates token + email + expiry + Pending status.
--   5) Create user using invite.cafe_id and invite.invited_role.
--   6) Mark invite Accepted and set accepted_by_user_id.
--   7) Staff must never be able to choose a different cafe_id or elevate role.
--
-- IMPORTANT:
--   Never store plain-text passwords or raw signup/invite/reset tokens.
-- ============================================================

-- ============================================================
-- END OF CAFEKIOSK DATABASE
-- ============================================================
