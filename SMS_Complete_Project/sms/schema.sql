-- ============================================================
-- Stock Maintenance System (SMS) — MySQL Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS sms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sms_db;

CREATE TABLE IF NOT EXISTS users (
    user_id   INT AUTO_INCREMENT PRIMARY KEY,
    username  VARCHAR(100) NOT NULL UNIQUE,
    password  VARCHAR(255) NOT NULL,
    role      ENUM('Admin','Manager','Staff') NOT NULL DEFAULT 'Staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id   INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    contact_info  VARCHAR(200),
    address       TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    sku           VARCHAR(50) PRIMARY KEY,
    name          VARCHAR(150) NOT NULL,
    category      VARCHAR(100),
    price         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    quantity      INT NOT NULL DEFAULT 0,
    reorder_point INT NOT NULL DEFAULT 10,
    supplier_id   INT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE SET NULL,
    INDEX idx_sku (sku),
    INDEX idx_category (category)
);

CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    sku            VARCHAR(50) NOT NULL,
    user_id        INT NOT NULL,
    type           ENUM('Sale','Purchase') NOT NULL,
    quantity       INT NOT NULL,
    date           DATE NOT NULL,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sku)     REFERENCES products(sku)      ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)     ON DELETE RESTRICT,
    INDEX idx_date (date),
    INDEX idx_type (type)
);

-- Default Admin user (password: admin123)
INSERT IGNORE INTO users (username, password, role) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS0m3.2', 'Admin'),
('manager1', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS0m3.2', 'Manager'),
('staff1',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS0m3.2', 'Staff');

-- Sample supplier
INSERT IGNORE INTO suppliers (supplier_id, supplier_name, contact_info, address) VALUES
(1, 'Global Supply Co.',    '+1-800-555-0100', '123 Industrial Ave, Chicago, IL'),
(2, 'Tech Parts Ltd.',      '+1-800-555-0200', '456 Tech Park, San Jose, CA');

-- Sample products
INSERT IGNORE INTO products (sku, name, category, price, quantity, reorder_point, supplier_id) VALUES
('SKU-001', 'Laptop Pro 15"',     'Electronics', 999.99, 25,  5, 1),
('SKU-002', 'Wireless Mouse',     'Electronics', 29.99,  80,  15, 1),
('SKU-003', 'USB-C Cable 2m',     'Accessories', 12.99,  150, 30, 2),
('SKU-004', 'Monitor 27" 4K',     'Electronics', 449.99, 8,   10, 1),
('SKU-005', 'Mechanical Keyboard','Electronics', 129.99, 40,  10, 2),
('SKU-006', 'Webcam HD 1080p',    'Electronics', 79.99,  3,   10, 1),
('SKU-007', 'Desk Lamp LED',      'Office',      39.99,  60,  20, 2),
('SKU-008', 'Notepad A4 Pack',    'Stationery',  9.99,   200, 50, 2);
