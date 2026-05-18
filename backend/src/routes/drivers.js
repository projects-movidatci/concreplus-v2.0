const express = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

const driverStatusSchema = z.enum(["available", "on_route", "inactive"]);

const listQuerySchema = z.object({
  status: driverStatusSchema.optional(),
});

const createDriverSchema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(255),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  license: z.string().trim().max(100).optional().or(z.literal("")),
  status: driverStatusSchema.default("available"),
});

function getTenantId(req, res) {
  const tenantId = Number(req.auth?.tenantId);
  if (!tenantId) {
    res.status(401).json({ ok: false, message: "Token sin tenant valido" });
    return null;
  }
  return tenantId;
}

function mapDriverRow(row) {
  return {
    id: Number(row.id),
    name: row.full_name,
    phone: row.phone ?? "",
    license: row.license ?? "",
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
      `SELECT * FROM drivers WHERE ${where} ORDER BY full_name ASC`,
      values
    );

    return res.json({ data: result.rows.map(mapDriverRow) });
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
    payload = createDriverSchema.parse(req.body || {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }

  try {
    const result = await pool.query(
      `
      INSERT INTO drivers (tenant_id, full_name, phone, license, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
      `,
      [
        tenantId,
        payload.name,
        payload.phone || null,
        payload.license || null,
        payload.status,
      ]
    );
    return res.status(201).json({ data: mapDriverRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
