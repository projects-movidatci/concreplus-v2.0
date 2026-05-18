const logger = require("../config/logger");

function notFoundHandler(req, res) {
  res.status(404).json({
    ok: false,
    message: "Recurso no encontrado",
  });
}

function errorHandler(err, req, res, next) {
  logger.error({ err, path: req.path, method: req.method }, "Error no controlado");

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    ok: false,
    message: "Error interno del servidor",
  });
}

module.exports = { notFoundHandler, errorHandler };
