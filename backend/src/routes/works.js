const express = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

const workStatusSchema = z.enum(["active", "inactive"]);

const listQuerySchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  status: workStatusSchema.optional(),
});

const createWorkSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, "name es requerido"),
  address: z.string().trim().optional().or(z.literal("")),
  status: workStatusSchema.default("active"),
  progress: z.coerce.number().int().min(0).max(100).default(0),
});

const updateWorkSchema = createWorkSchema.omit({ clientId: true }).partial().refine((v) => Object.keys(v).length > 0, {
  message: "Debes enviar al menos un campo para actualizar",
});

function getTenantId(req, res) {
  const tenantId = Number(req.auth?.tenantId);
  if (!tenantId) {
    res.status(401).json({ ok: false, message: "Token sin tenant valido" });
    return null;
  }
  return tenantId;
}

function normalizeNullable(value) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function assertClientBelongsToTenant(tenantId, clientId) {
  const r = await pool.query(`SELECT id FROM clients WHERE tenant_id = $1 AND id = $2`, [tenantId, clientId]);
  return r.rows[0] ?? null;
}

function mapWorkRow(row) {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    address: row.address ?? "",
    status: row.status,
    progress: Number(row.progress),
    ordersCount: Number(row.orders_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const query = listQuerySchema.parse(req.query);

    if (query.clientId) {
      const client = await assertClientBelongsToTenant(tenantId, query.clientId);
      if (!client) {
        return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
      }
    }

    const values = [tenantId];
    let filter = "w.tenant_id = $1";
    if (query.clientId) {
      values.push(query.clientId);
      filter += ` AND w.client_id = $${values.length}`;
    }
    if (query.status) {
      values.push(query.status);
      filter += ` AND w.status = $${values.length}`;
    }

    const result = await pool.query(
      `
      SELECT
        w.*,
        COALESCE(o.cnt, 0)::INT AS orders_count
      FROM works w
      LEFT JOIN (
        SELECT work_id, COUNT(*)::INT AS cnt
        FROM orders
        WHERE tenant_id = $1
        GROUP BY work_id
      ) o ON o.work_id = w.id
      WHERE ${filter}
      ORDER BY w.id DESC
      `,
      values
    );

    return res.json({ data: result.rows.map(mapWorkRow) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        w.*,
        COALESCE((
          SELECT COUNT(*)::INT FROM orders o
          WHERE o.tenant_id = w.tenant_id AND o.work_id = w.id
        ), 0) AS orders_count
      FROM works w
      WHERE w.tenant_id = $1 AND w.id = $2
      `,
      [tenantId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Obra no encontrada" });
    }

    return res.json({ data: mapWorkRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const payload = createWorkSchema.parse(req.body);
    const client = await assertClientBelongsToTenant(tenantId, payload.clientId);
    if (!client) {
      return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
    }

    const result = await pool.query(
      `
      INSERT INTO works (tenant_id, client_id, name, address, status, progress)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        tenantId,
        payload.clientId,
        payload.name,
        normalizeNullable(payload.address),
        payload.status,
        payload.progress,
      ]
    );

    const row = result.rows[0];
    return res.status(201).json({
      data: mapWorkRow({ ...row, orders_count: 0 }),
      message: "Obra creada correctamente",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  try {
    const payload = updateWorkSchema.parse(req.body);

    const currentResult = await pool.query(`SELECT * FROM works WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Obra no encontrada" });
    }

    const current = currentResult.rows[0];

    const updateResult = await pool.query(
      `
      UPDATE works
      SET
        name = $3,
        address = $4,
        status = $5,
        progress = $6,
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
      `,
      [
        tenantId,
        id,
        payload.name ?? current.name,
        payload.address !== undefined ? normalizeNullable(payload.address) : current.address,
        payload.status ?? current.status,
        payload.progress ?? Number(current.progress),
      ]
    );

    const ordersCountResult = await pool.query(
      `SELECT COUNT(*)::INT AS cnt FROM orders WHERE tenant_id = $1 AND work_id = $2`,
      [tenantId, id]
    );

    return res.json({
      data: mapWorkRow({
        ...updateResult.rows[0],
        orders_count: ordersCountResult.rows[0]?.cnt ?? 0,
      }),
      message: "Obra actualizada correctamente",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  try {
    const result = await pool.query(
      `
      UPDATE works
      SET status = 'inactive', updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING id
      `,
      [tenantId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Obra no encontrada" });
    }

    return res.json({
      ok: true,
      message: "Obra desactivada correctamente",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
