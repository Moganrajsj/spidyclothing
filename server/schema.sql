CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(48) NOT NULL,
  fit VARCHAR(24) NOT NULL,
  price INT UNSIGNED NOT NULL,
  old_price INT UNSIGNED NOT NULL,
  badge VARCHAR(40) NOT NULL DEFAULT '',
  colors JSON NOT NULL,
  images JSON NOT NULL,
  rating DECIMAL(3,2) NOT NULL DEFAULT 0,
  review_count INT UNSIGNED NOT NULL DEFAULT 0,
  description TEXT NOT NULL,
  fabric_care TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_products_category_active (category, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_sizes (
  product_id VARCHAR(64) NOT NULL,
  size_name VARCHAR(24) NOT NULL,
  stock INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, size_name),
  CONSTRAINT fk_product_sizes_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  phone VARCHAR(20) NULL,
  password_hash VARCHAR(255) NULL,
  google_id VARCHAR(64) NULL,
  avatar_url VARCHAR(512) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE INDEX uq_customers_google_id (google_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_sessions (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  customer_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sessions_expiry (expires_at),
  CONSTRAINT fk_sessions_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
  customer_id BIGINT UNSIGNED NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  size_name VARCHAR(24) NOT NULL,
  color VARCHAR(48) NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, product_id, size_name, color),
  CONSTRAINT fk_cart_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wishlist_items (
  customer_id BIGINT UNSIGNED NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (customer_id, product_id),
  CONSTRAINT fk_wishlist_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(32) NOT NULL UNIQUE,
  customer_id BIGINT UNSIGNED NOT NULL,
  customer_name VARCHAR(120) NOT NULL,
  customer_email VARCHAR(254) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  address VARCHAR(255) NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  pincode CHAR(6) NOT NULL,
  payment_method ENUM('cod') NOT NULL DEFAULT 'cod',
  payment_status ENUM('cod_due','paid','refunded') NOT NULL DEFAULT 'cod_due',
  order_status ENUM('placed','processing','shipped','delivered','cancelled') NOT NULL DEFAULT 'placed',
  coupon_code VARCHAR(40) NULL,
  subtotal INT UNSIGNED NOT NULL,
  discount INT UNSIGNED NOT NULL DEFAULT 0,
  shipping INT UNSIGNED NOT NULL DEFAULT 0,
  total INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_customer_created (customer_id, created_at),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT UNSIGNED NOT NULL,
  product_id VARCHAR(64) NULL,
  product_name VARCHAR(180) NOT NULL,
  size_name VARCHAR(24) NOT NULL,
  color VARCHAR(48) NOT NULL,
  unit_price INT UNSIGNED NOT NULL,
  quantity INT UNSIGNED NOT NULL,
  line_total INT UNSIGNED NOT NULL,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email VARCHAR(254) NOT NULL PRIMARY KEY,
  source VARCHAR(40) NOT NULL DEFAULT 'home',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

