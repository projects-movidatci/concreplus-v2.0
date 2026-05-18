-- Datos de ejemplo para Programación (trompos y choferes).
-- Requiere al menos un tenant. Ajusta tenant_id si tu entorno no usa el primero.

INSERT INTO mixers (tenant_id, code, plates, capacity_m3, status)
SELECT t.id, v.code, v.plates, v.cap, 'available'::varchar
FROM (VALUES
  ('T-001', 'ABC-123', 8::numeric),
  ('T-002', 'DEF-456', 10::numeric),
  ('T-003', 'GHI-789', 8::numeric)
) AS v(code, plates, cap)
CROSS JOIN (SELECT id FROM tenants ORDER BY id LIMIT 1) AS t
ON CONFLICT (tenant_id, code) DO NOTHING;

INSERT INTO drivers (tenant_id, full_name, phone, license, status)
SELECT t.id, v.nombre, v.tel, v.lic, 'available'::varchar
FROM (VALUES
  ('Juan Pérez García', '555-1001', 'A-1234567'),
  ('Pedro Gómez Luna', '555-1002', 'B-7654321'),
  ('Luis Martínez Cruz', '555-1003', 'C-9988776')
) AS v(nombre, tel, lic)
CROSS JOIN (SELECT id FROM tenants ORDER BY id LIMIT 1) AS t;
