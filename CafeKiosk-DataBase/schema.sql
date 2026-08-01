-- =========================
-- 🧹 RESET DATABASE
-- =========================
DROP DATABASE IF EXISTS cafekiosk;
CREATE DATABASE cafekiosk;
USE cafekiosk;

-- =========================
-- 👤 USERS
-- =========================
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin','Staff') NOT NULL,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    failed_attempts INT DEFAULT 0,
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 🔐 LOGIN LOGS
-- =========================
CREATE TABLE login_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    ip_address VARCHAR(45),
    status ENUM('Success','Failed'),
    attempt_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 🔐 USER SESSIONS
-- =========================
CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =========================
-- ⏰ ATTENDANCE
-- =========================
CREATE TABLE attendance (
    attendance_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    time_in DATETIME,
    time_out DATETIME,
    log_date DATE DEFAULT (CURRENT_DATE),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- =========================
-- 📁 CATEGORIES
-- =========================
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL,
    status ENUM('Active','Inactive') DEFAULT 'Active'
);

INSERT INTO categories (category_name) VALUES
('Coffee'), ('Non-Coffee'), ('Milktea'),
('Desserts'), ('Foods'), ('Snacks');

-- =========================
-- 🎯 PROMOTIONS
-- =========================
CREATE TABLE promotions (
    promotion_id INT AUTO_INCREMENT PRIMARY KEY,
    promo_name VARCHAR(100),
    discount_percent DECIMAL(5,2),
    start_date DATE,
    end_date DATE,
    status ENUM('Active','Inactive') DEFAULT 'Active'
);

-- =========================
-- 🍽 MENU ITEMS
-- =========================
CREATE TABLE menu_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT,
    promotion_id INT NULL,
    item_name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    price DECIMAL(10,2) NOT NULL,
    status ENUM('Available','Unavailable') DEFAULT 'Available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
    FOREIGN KEY (promotion_id) REFERENCES promotions(promotion_id) ON DELETE SET NULL
);

-- =========================
-- 🧂 INGREDIENTS
-- =========================
CREATE TABLE ingredients (
    ingredient_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_name VARCHAR(100),
    unit VARCHAR(20),
    stock_quantity DECIMAL(10,2) DEFAULT 0,
    reorder_level DECIMAL(10,2) DEFAULT 0,
    status ENUM('Active','Inactive') DEFAULT 'Active'
);

-- =========================
-- 📋 MENU RECIPES
-- =========================
CREATE TABLE menu_recipes (
    recipe_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    ingredient_id INT NOT NULL,
    quantity_needed DECIMAL(10,2),
    FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
);

-- =========================
-- 📦 ORDERS
-- =========================
CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NULL,
    user_id INT NULL,
    order_source ENUM('POS','Kiosk') NOT NULL,
    service_type ENUM('Dine In','Take Out') DEFAULT 'Dine In',
    order_status ENUM('Pending','Preparing','Ready','Completed','Cancelled','Refunded','Voided') DEFAULT 'Pending',
    total_amount DECIMAL(10,2) DEFAULT 0,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- =========================
-- 🍔 ORDER ITEMS
-- =========================
CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    item_id INT,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES menu_items(item_id) ON DELETE CASCADE
);

-- =========================
-- 💳 PAYMENTS
-- =========================
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    payment_method ENUM('Cash','GCash','Card','Other') NOT NULL,
    amount_paid DECIMAL(10,2),
    change_amount DECIMAL(10,2) DEFAULT 0,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- =========================
-- 🔔 NOTIFICATIONS
-- =========================
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    message TEXT,
    type ENUM('LOW_STOCK','SYSTEM'),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- 📉 INVENTORY LOGS (UPGRADED)
-- =========================
CREATE TABLE inventory_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    ingredient_id INT,
    action_type ENUM('Stock In','Stock Out','Adjustment'),
    quantity DECIMAL(10,2),
    reference_id INT NULL,
    notes VARCHAR(255),
    log_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(ingredient_id) ON DELETE CASCADE
);

-- =========================
-- 🔥 TRIGGER: INVENTORY + ALERT + LOG
-- =========================
DELIMITER $$

CREATE TRIGGER deduct_inventory
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE ing_id INT;
    DECLARE needed DECIMAL(10,2);
    DECLARE current_stock DECIMAL(10,2);
    DECLARE reorder DECIMAL(10,2);

    DECLARE cur CURSOR FOR
        SELECT ingredient_id, quantity_needed
        FROM menu_recipes
        WHERE item_id = NEW.item_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO ing_id, needed;
        IF done THEN LEAVE read_loop; END IF;

        SET needed = needed * NEW.quantity;

        SELECT stock_quantity, reorder_level
        INTO current_stock, reorder
        FROM ingredients
        WHERE ingredient_id = ing_id;

        IF current_stock < needed THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Not enough stock';
        END IF;

        UPDATE ingredients
        SET stock_quantity = stock_quantity - needed
        WHERE ingredient_id = ing_id;

        INSERT INTO inventory_logs (
            ingredient_id, action_type, quantity, reference_id, notes
        ) VALUES (
            ing_id, 'Stock Out', needed, NEW.order_id, 'Auto deduction from order'
        );

        IF (current_stock - needed) <= reorder THEN
            INSERT INTO notifications (message, type)
            VALUES (
                CONCAT('⚠️ Ingredient ID ', ing_id, ' is running low'),
                'LOW_STOCK'
            );
        END IF;

    END LOOP;

    CLOSE cur;

END$$

DELIMITER ;

-- =========================
-- 🔥 TRIGGER: ORDER TOTAL
-- =========================
DELIMITER $$

CREATE TRIGGER update_order_total
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE orders
    SET total_amount = (
        SELECT SUM(subtotal)
        FROM order_items
        WHERE order_id = NEW.order_id
    )
    WHERE order_id = NEW.order_id;
END$$

DELIMITER ;

-- =========================
-- 🔥 SMART MENU LOCK
-- =========================
DELIMITER $$

CREATE TRIGGER update_menu_availability
AFTER UPDATE ON ingredients
FOR EACH ROW
BEGIN
    UPDATE menu_items m
    SET status = 'Unavailable'
    WHERE EXISTS (
        SELECT 1
        FROM menu_recipes r
        JOIN ingredients i ON r.ingredient_id = i.ingredient_id
        WHERE r.item_id = m.item_id
        AND i.stock_quantity < r.quantity_needed
    );

    UPDATE menu_items m
    SET status = 'Available'
    WHERE NOT EXISTS (
        SELECT 1
        FROM menu_recipes r
        JOIN ingredients i ON r.ingredient_id = i.ingredient_id
        WHERE r.item_id = m.item_id
        AND i.stock_quantity < r.quantity_needed
    );
END$$

DELIMITER ;

-- =========================
-- 🔥 RESTOCK LOGGING
-- =========================
DELIMITER $$

CREATE TRIGGER restock_log
AFTER UPDATE ON ingredients
FOR EACH ROW
BEGIN
    IF NEW.stock_quantity > OLD.stock_quantity THEN
        INSERT INTO inventory_logs (
            ingredient_id, action_type, quantity, notes
        ) VALUES (
            NEW.ingredient_id,
            'Stock In',
            NEW.stock_quantity - OLD.stock_quantity,
            'Manual restock'
        );
    END IF;
END$$

DELIMITER ;

ALTER TABLE users
ADD COLUMN lock_until DATETIME NULL;

ALTER TABLE users 
ADD COLUMN login_attempts INT DEFAULT 0,
ADD COLUMN lock_until BIGINT DEFAULT NULL,
ADD COLUMN last_activity BIGINT DEFAULT NULL;