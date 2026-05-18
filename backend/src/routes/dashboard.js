const express = require("express");
const { pool } = require("../db/pool");

const router = express.Router();

function getTenantId(req, res) {
  const tenantId = Number(req.auth?.tenantId);
  if (!tenantId) {
    res.status(401).json({ ok: false, message: "Token sin tenant valido" });
    return null;
  }
  return tenantId;
}

router.get("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const [mainResult, notificationsResult, weeklyResult] = await Promise.all([
      pool.query(`CALL sp_dashboard_main_indicators($1, NULL)`, [tenantId]),
      pool.query(`CALL sp_dashboard_notifications($1, NULL)`, [tenantId]),
      pool.query(`CALL sp_dashboard_weekly_summary($1, NULL)`, [tenantId]),
    ]);

    const main = mainResult.rows[0]?.p_result || {};
    const notifications = notificationsResult.rows[0]?.p_items || [];
    const weekly = weeklyResult.rows[0]?.p_summary || {};

    return res.json({
      data: {
        todayLabel: main.todayLabel ?? "",
        ordersToday: Number(main.ordersToday ?? 0),
        tripsInProgress: Number(main.tripsInProgress ?? 0),
        deliveriesCompleted: Number(main.deliveriesCompleted ?? 0),
        toCollectAmount: Number(main.toCollectAmount ?? 0),
        toCollectInvoices: Number(main.toCollectInvoices ?? 0),
        weeklyCompletedOrdersPct: Number(weekly.weeklyCompletedOrdersPct ?? 0),
        weeklyDeliveryEfficiencyPct: Number(weekly.weeklyDeliveryEfficiencyPct ?? 0),
        collectionRatePct: Number(weekly.collectionRatePct ?? 0),
        notifications: Array.isArray(notifications) ? notifications : [],
      },
    });
  } catch (error) {
    if (error && error.code === "42883") {
      return res.status(500).json({
        ok: false,
        message:
          "Faltan SP de dashboard en la base de datos (sp_dashboard_main_indicators, sp_dashboard_notifications, sp_dashboard_weekly_summary).",
      });
    }
    return next(error);
  }
});

module.exports = router;
