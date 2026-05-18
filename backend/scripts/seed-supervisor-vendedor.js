/**
 * Crea usuarios de prueba: supervisor y vendedor (mismo tenant que seed-test-user).
 * Contraseña para ambos: test1234
 *
 * Uso: node scripts/seed-supervisor-vendedor.js
 * Requiere: tenant "concreplus-demo" y roles vendedor/supervisor ya existentes.
 */

const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const DEMO_USERS = [
    {
        email: "supervisor@concreplus.com",
        fullName: "Supervisor Demo",
        role: "supervisor",
    },
    {
        email: "vendedor@concreplus.com",
        fullName: "Vendedor Demo",
        role: "vendedor",
    },
];

async function seed() {
    const client = new Client({
        connectionString:
            process.env.DATABASE_URL ||
            "postgresql://postgres:5155@127.0.0.1:5432/Concreto",
    });

    await client.connect();
    await client.query("BEGIN");

    try {
        const tenantResult = await client.query(
            `SELECT id FROM tenants WHERE slug = $1`,
            ["concreplus-demo"]
        );
        if (tenantResult.rows.length === 0) {
            throw new Error(
                'No existe el tenant "concreplus-demo". Ejecuta antes: node scripts/seed-test-user.js'
            );
        }
        const tenantId = tenantResult.rows[0].id;

        const passwordHash = await bcrypt.hash("test1234", 10);

        for (const u of DEMO_USERS) {
            const roleRes = await client.query(
                `SELECT id FROM roles WHERE tenant_id = $1 AND name = $2`,
                [tenantId, u.role]
            );
            if (roleRes.rows.length === 0) {
                throw new Error(
                    `Rol "${u.role}" no encontrado. Ejecuta: node scripts/seed-test-user.js o aplica database/002_roles_concreplus.sql`
                );
            }
            const roleId = roleRes.rows[0].id;

            const userIns = await client.query(
                `
        INSERT INTO users (tenant_id, email, password_hash, full_name, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (tenant_id, email) DO UPDATE
        SET
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          is_active = TRUE,
          updated_at = NOW()
        RETURNING id
        `,
                [tenantId, u.email, passwordHash, u.fullName]
            );
            const userId = userIns.rows[0].id;

            await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [
                userId,
            ]);
            await client.query(
                `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
                [userId, roleId]
            );

            console.log("Listo:", u.email, "->", u.role);
        }

        await client.query("COMMIT");
        console.log("\nContraseña para ambos: test1234");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        await client.end();
    }
}

seed().catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
});
