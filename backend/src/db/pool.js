const { Pool } = require("pg");
const env = require("../config/env");
const logger = require("../config/logger");

function wantsSsl() {
  if (env.DB_SSL) return true;
  const mode = String(process.env.PGSSLMODE || "").toLowerCase();
  return ["require", "verify-ca", "verify-full"].includes(mode);
}

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: wantsSsl() ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
  logger.error({ err: error }, "Error inesperado en el pool de PostgreSQL");
});

async function testConnection() {
  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    logger.info("Conexion a PostgreSQL verificada");
  } finally {
    client.release();
  }
}

module.exports = { pool, testConnection };
