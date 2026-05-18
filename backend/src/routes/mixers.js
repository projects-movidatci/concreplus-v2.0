const express = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

const mixerStatusSchema = z.enum(["available", "in_use", "maintenance"]);

const listQuerySchema = z.object({
  status: mixerStatusSchema.optional(),
});

const createMixerSchema = z.object({
  code: z.string().trim().min(1, "Codigo requerido").max(50),
  capacityM3: z.coerce.number().min(0).default(0),
  plates: z.string().trim().max(50).optional().or(z.literal("")),
  status: mixerStatusSchema.default("available"),
});

function getTenantId(req, res) {
  const tenantId = Number(req.auth?.tenantId);
  if (!tenantId) {
    res.status(401).json({ ok: false, message: "Token sin tenant valido" });
    return null;
  }
  return tenantId;
}

function mapMixerRow(row) {
  return {
    id: Number(row.id),
    code: row.code,
    capacityM3: row.capacity_m3 != null ? Number(row.capacity_m3) : 0,
    plates: row.plates ?? "",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const query = listQuerySchema.parse(req.query);
    const values = [tenantId];
    let where = "tenant_id = $1";
    if (query.status) {
      values.push(query.status);
      where += ` AND status = $${values.length}`;
    }

    const result = await pool.query(
      `SELECT * FROM mixers WHERE ${where} ORDER BY code ASC`,
      values
    );

    return res.json({ data: result.rows.map(mapMixerRow) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  let payload;
  try {
    payload = createMixerSchema.parse(req.body || {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO mixers (tenant_id, code, plates, capacity_m3, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
      `,
      [
        tenantId,
        payload.code,
        payload.plates || null,
        payload.capacityM3,
        payload.status,
      ]
    );
    return res.status(201).json({ data: mapMixerRow(result.rows[0]) });
  } catch (error) {
    if (error && error.code === "23505") {
      return res.status(409).json({ ok: false, message: "Ya existe un trompo con ese codigo" });
    }
    return next(error);
  }
});

module.exports = router;
