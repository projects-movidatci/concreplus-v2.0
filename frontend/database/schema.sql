-- =============================================================================
-- ConcrePlus - PostgreSQL Schema (single file, multi-tenant ready)
-- Standard: all identifiers and comments in English
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TENANTS (concreteras / organizations)
-- -----------------------------------------------------------------------------
CREATE TABLE tenants (
  id         BIGSERIAL PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- ROLES (admin, client, user - per tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE roles (
  id         BIGSERIAL PRIMARY KEY,
  tenant_id  BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_roles_tenant ON roles(tenant_id);

-- -----------------------------------------------------------------------------
-- PERMISSIONS (by module; we add codes as we add modules)
-- -----------------------------------------------------------------------------
CREATE TABLE permissions (
  id          BIGSERIAL PRIMARY KEY,
  code        VARCHAR(100) NOT NULL UNIQUE,
  module_name VARCHAR(50) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- ROLE_PERMISSIONS (which permissions each role has)
-- -----------------------------------------------------------------------------
CREATE TABLE role_permissions (
  role_id       BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id);

-- -----------------------------------------------------------------------------
-- USERS (per tenant)
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(tenant_id, email);

-- -----------------------------------------------------------------------------
-- USER_ROLES (user can have one or more roles)
-- -----------------------------------------------------------------------------
CREATE TABLE user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role_id);

-- -----------------------------------------------------------------------------
-- MODULE: CLIENTS & WORKS (Clientes y Obras)
-- -----------------------------------------------------------------------------

CREATE TABLE clients (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id        BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  contact_name    VARCHAR(255),
  phone           VARCHAR(50),
  email           VARCHAR(255),
  credit_type     VARCHAR(50) NOT NULL DEFAULT 'cash',  -- e.g. 'cash', '15_days'
  balance_pending DECIMAL(14, 2) NOT NULL DEFAULT 0,
  status          VARCHAR(50) NOT NULL DEFAULT 'active', -- e.g. 'active', 'inactive'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_clients_status ON clients(tenant_id, status);
CREATE INDEX idx_clients_name ON clients(tenant_id, name);

CREATE TABLE works (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id     BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id     BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  address       TEXT,
  status        VARCHAR(50) NOT NULL DEFAULT 'active',
  progress      SMALLINT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_works_tenant ON works(tenant_id);
CREATE INDEX idx_works_client ON works(tenant_id, client_id);
CREATE INDEX idx_works_status ON works(tenant_id, status);

-- orders_count for works can be computed from an orders table later (e.g. COUNT by work_id)
-- or denormalized in works if needed for performance

-- -----------------------------------------------------------------------------
-- MODULE: QUOTATIONS (Cotizaciones)
-- -----------------------------------------------------------------------------

CREATE TABLE quotations (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  work_id         BIGINT NOT NULL REFERENCES works(id) ON DELETE RESTRICT,
  code            VARCHAR(50) NOT NULL,             -- e.g. COT-2025-001
  concrete_type   VARCHAR(255) NOT NULL,            -- description of concrete
  cubic_meters    DECIMAL(10, 2) NOT NULL CHECK (cubic_meters >= 0),
  price_per_m3    DECIMAL(12, 2) NOT NULL CHECK (price_per_m3 >= 0),
  total_amount    DECIMAL(14, 2) NOT NULL CHECK (total_amount >= 0),
  currency        VARCHAR(10) NOT NULL DEFAULT 'MXN',
  status          VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, sent, approved, rejected, cancelled
  valid_until     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_quotations_tenant_code ON quotations(tenant_id, code);
CREATE INDEX idx_quotations_tenant_client ON quotations(tenant_id, client_id);
CREATE INDEX idx_quotations_tenant_work ON quotations(tenant_id, work_id);
CREATE INDEX idx_quotations_tenant_status ON quotations(tenant_id, status);

-- -----------------------------------------------------------------------------
-- MODULE: ORDERS (Pedidos)
-- -----------------------------------------------------------------------------

CREATE TABLE orders (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  work_id         BIGINT NOT NULL REFERENCES works(id) ON DELETE RESTRICT,
  quotation_id    BIGINT REFERENCES quotations(id) ON DELETE SET NULL,
  code            VARCHAR(50) NOT NULL,             -- e.g. PED-2025-045
  concrete_type   VARCHAR(255) NOT NULL,
  cubic_meters    DECIMAL(10, 2) NOT NULL CHECK (cubic_meters >= 0),
  total_amount    DECIMAL(14, 2) NOT NULL CHECK (total_amount >= 0),
  delivery_at     TIMESTAMPTZ NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, scheduled, dispatched, delivered
  is_scheduled    BOOLEAN NOT NULL DEFAULT FALSE,
  mixer_id        BIGINT,
  driver_id       BIGINT,
  dispatched_at   TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  delivery_notes  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_orders_tenant_code ON orders(tenant_id, code);
CREATE INDEX idx_orders_tenant_client ON orders(tenant_id, client_id);
CREATE INDEX idx_orders_tenant_work ON orders(tenant_id, work_id);
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status);

-- -----------------------------------------------------------------------------
-- MODULE: TRACEABILITY (Trazabilidad)
-- Stores the lifecycle of each order (status changes and key checkpoints)
-- -----------------------------------------------------------------------------

CREATE TABLE order_events (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  event_type      VARCHAR(50) NOT NULL,           -- created, scheduled, dispatched, delivered, cancelled, etc.
  event_label     VARCHAR(255) NOT NULL,          -- e.g. 'Pedido Creado'
  event_status    VARCHAR(50) NOT NULL,           -- completed, pending, cancelled
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes           TEXT
);

CREATE INDEX idx_order_events_tenant_order ON order_events(tenant_id, order_id);
CREATE INDEX idx_order_events_tenant_type ON order_events(tenant_id, event_type);

-- -----------------------------------------------------------------------------
-- MODULE: LOGISTICS RESOURCES (Mixers & Drivers)
-- Used by Programacion and Despacho/Entrega
-- -----------------------------------------------------------------------------

CREATE TABLE mixers (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code         VARCHAR(50) NOT NULL,                -- e.g. T-001
  plates       VARCHAR(50),
  capacity_m3  DECIMAL(10, 2),
  status       VARCHAR(50) NOT NULL DEFAULT 'available', -- available, in_use, maintenance
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX idx_mixers_tenant ON mixers(tenant_id);
CREATE INDEX idx_mixers_status ON mixers(tenant_id, status);

CREATE TABLE drivers (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name    VARCHAR(255) NOT NULL,
  phone        VARCHAR(50),
  license      VARCHAR(100),
  status       VARCHAR(50) NOT NULL DEFAULT 'available', -- available, on_route, inactive
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drivers_tenant ON drivers(tenant_id);
CREATE INDEX idx_drivers_status ON drivers(tenant_id, status);

-- -----------------------------------------------------------------------------
-- MODULE: BILLING & COLLECTIONS (Facturas / Cobranza)
-- -----------------------------------------------------------------------------

CREATE TABLE invoices (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  code            VARCHAR(50) NOT NULL,             -- e.g. FACT-2025-120
  amount          DECIMAL(14, 2) NOT NULL CHECK (amount >= 0),
  currency        VARCHAR(10) NOT NULL DEFAULT 'MXN',
  issue_date      DATE NOT NULL,
  due_date        DATE NOT NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, overdue, cancelled
  credit_terms    VARCHAR(50),                    -- e.g. 'credit_15_days'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_invoices_tenant_code ON invoices(tenant_id, code);
CREATE INDEX idx_invoices_tenant_client ON invoices(tenant_id, client_id);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_tenant_due_date ON invoices(tenant_id, due_date);

CREATE TABLE payments (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id      BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount          DECIMAL(14, 2) NOT NULL CHECK (amount > 0),
  currency        VARCHAR(10) NOT NULL DEFAULT 'MXN',
  paid_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method          VARCHAR(50),                     -- cash, transfer, etc.
  reference       VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_tenant_invoice ON payments(tenant_id, invoice_id);

-- -----------------------------------------------------------------------------
-- MODULE: NOTIFICATIONS (User alerts & dashboard warnings)
-- Used in dashboard "Avisos" and header notifications
-- -----------------------------------------------------------------------------

CREATE TABLE notifications (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code            VARCHAR(100),                     -- optional code to classify (e.g. 'invoice_overdue')
  title           VARCHAR(255) NOT NULL,
  message         TEXT NOT NULL,
  severity        VARCHAR(50) NOT NULL DEFAULT 'info',  -- info, warning, success, error
  target_type     VARCHAR(50) NOT NULL DEFAULT 'user',  -- user, role, tenant
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ
);

CREATE INDEX idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX idx_notifications_tenant_severity ON notifications(tenant_id, severity);

CREATE TABLE user_notifications (
  id               BIGSERIAL PRIMARY KEY,
  tenant_id        BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_id  BIGINT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  is_read          BOOLEAN NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_notifications_user ON user_notifications(tenant_id, user_id, is_read);
CREATE INDEX idx_user_notifications_notification ON user_notifications(notification_id);

-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
