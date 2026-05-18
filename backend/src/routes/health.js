const express = require("express");
const { pool } = require("../db/pool");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    return res.json({
      ok: true,
      service: "api-concreto",
      time: result.rows[0].now,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
