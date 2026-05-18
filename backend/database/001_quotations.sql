-- Ejecutar una vez si la tabla aún no existe (alineado con demo/database/schema.sql).
-- psql $DATABASE_URL -f database/001_quotations.sql

CREATE TABLE IF NOT EXISTS quotations (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id       BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  work_id         BIGINT NOT NULL REFERENCES works(id) ON DELETE RESTRICT,
  code            VARCHAR(50) NOT NULL,
  concrete_type   VARCHAR(255) NOT NULL,
  cubic_meters    DECIMAL(10, 2) NOT NULL CHECK (cubic_meters >= 0),
  price_per_m3    DECIMAL(12, 2) NOT NULL CHECK (price_per_m3 >= 0),
  total_amount    DECIMAL(14, 2) NOT NULL CHECK (total_amount >= 0),
  currency        VARCHAR(10) NOT NULL DEFAULT 'MXN',
  status          VARCHAR(50) NOT NULL DEFAULT 'draft',
  valid_until     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_tenant_code ON quotations(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_client ON quotations(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_work ON quotations(tenant_id, work_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant_status ON quotations(tenant_id, status);
