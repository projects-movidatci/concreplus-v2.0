-- Roles de aplicación: vendedor, supervisor, admin (por tenant).
-- Ejecutar después de tener al menos un tenant (p. ej. el de seed-test-user).
-- Elimina el rol legacy "user" si existía.

DELETE FROM user_roles ur
USING roles r
WHERE ur.role_id = r.id
  AND r.name = 'user';

DELETE FROM roles
WHERE name = 'user';

INSERT INTO roles (tenant_id, name)
SELECT t.id, v.name
FROM tenants t
CROSS JOIN (
  VALUES ('vendedor'), ('supervisor'), ('admin')
) AS v(name)
ON CONFLICT (tenant_id, name) DO NOTHING;
