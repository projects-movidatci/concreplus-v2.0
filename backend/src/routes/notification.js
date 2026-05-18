const express = require("express");

const router = express.Router();

/** Compatibilidad con plantilla Elstar: sin modelo de notificaciones en esta API. */
router.get("/count", (req, res) => {
  res.json({ count: 0 });
});

router.get("/list", (req, res) => {
  res.json([]);
});

module.exports = router;
