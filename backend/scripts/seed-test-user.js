const { Client } = require("pg");
const bcrypt = require("bcryptjs");

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:5155@127.0.0.1:5432/Concreto",
  });

  await client.connect();
  await client.query("BEGIN");

  try {
    const passwordHash = await bcrypt.hash("test1234", 10);

    const tenantResult = await client.query(
      `
      INSERT INTO tenants (name, slug)
      VALUES ($1, $2)
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING id
      `,
      ["ConcrePlus Demo", "concreplus-demo"]
    );
    const tenantId = tenantResult.rows[0].id;

    await client.query(
      `DELETE FROM user_roles ur USING roles r WHERE ur.role_id = r.id AND r.tenant_id = $1 AND r.name = 'user'`,
      [tenantId]
    );
    await client.query(`DELETE FROM roles WHERE tenant_id = $1 AND name = 'user'`, [tenantId]);

    const roleNames = ["vendedor", "supervisor", "admin"];
    let roleIdAdmin = null;
    for (const name of roleNames) {
      const roleResult = await client.query(
        `
        INSERT INTO roles (tenant_id, name)
        VALUES ($1, $2)
        ON CONFLICT (tenant_id, name) DO UPDATE
        SET name = EXCLUDED.name
        RETURNING id
        `,
        [tenantId, name]
      );
      if (name === "admin") {
        roleIdAdmin = roleResult.rows[0].id;
      }
    }
    if (!roleIdAdmin) {
      const r = await client.query(
        `SELECT id FROM roles WHERE tenant_id = $1 AND name = 'admin'`,
        [tenantId]
      );
      roleIdAdmin = r.rows[0].id;
    }

    const userResult = await client.query(
      `
      INSERT INTO users (tenant_id, email, password_hash, full_name, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      ON CONFLICT (tenant_id, email) DO UPDATE
      SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id, email
      `,
      [tenantId, "test@concreplus.com", passwordHash, "test"]
    );
    const userId = userResult.rows[0].id;

    await client.query(
      `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userId, roleIdAdmin]
    );

    await client.query("COMMIT");
    console.log("Usuario listo:", userResult.rows[0].email);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

seed().catch((error) => {
  console.error("Error al crear usuario test:", error.message);
  process.exit(1);
});
