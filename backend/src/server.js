const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");
const { pool, testConnection } = require("./db/pool");

let server;

async function start() {
  await testConnection();

  server = app.listen(env.PORT, () => {
    logger.info(`API escuchando en puerto ${env.PORT}`);
  });
}

async function shutdown(signal) {
  logger.info(`Senal ${signal} recibida. Cerrando API...`);

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  await pool.end();
  logger.info("Conexion a PostgreSQL cerrada");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

start().catch((error) => {
  logger.error({ err: error }, "Error al iniciar la API");
  process.exit(1);
});
