const express = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

const creditTypeSchema = z.enum(["cash", "15_days"]);
const statusSchema = z.enum(["active", "inactive"]);

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: statusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

const createClientSchema = z.object({
  name: z.string().trim().min(1, "name es requerido"),
  contactName: z.string().trim().min(1, "contactName es requerido"),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().email("email invalido").optional().or(z.literal("")),
  creditType: creditTypeSchema.default("cash"),
  balancePending: z.coerce.number().min(0).default(0),
  status: statusSchema.default("active"),
});

const updateClientSchema = createClientSchema.partial().refine((v) => Object.keys(v).length > 0, {
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

function mapClientRow(row) {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    phone: row.phone,
    email: row.email,
    creditType: row.credit_type,
    balancePending: Number(row.balance_pending),
    status: row.status,
    worksCount: Number(row.works_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const query = listQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    const values = [tenantId];
    const filters = ["c.tenant_id = $1"];

    if (query.search) {
      values.push(`%${query.search}%`);
      filters.push(`(c.name ILIKE $${values.length} OR COALESCE(c.contact_name, '') ILIKE $${values.length})`);
    }

    if (query.status) {
      values.push(query.status);
      filters.push(`c.status = $${values.length}`);
    }

    const whereClause = filters.join(" AND ");

    const listSql = `
      SELECT
        c.*,
        COUNT(w.id)::INT AS works_count
      FROM clients c
      LEFT JOIN works w
        ON w.client_id = c.id
       AND w.tenant_id = c.tenant_id
      WHERE ${whereClause}
      GROUP BY c.id
      ORDER BY c.id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;

    const countSql = `
      SELECT COUNT(*)::INT AS total
      FROM clients c
      WHERE ${whereClause}
    `;

    const listValues = [...values, query.limit, offset];

    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, listValues),
      pool.query(countSql, values),
    ]);

    return res.json({
      data: listResult.rows.map(mapClientRow),
      meta: {
        page: query.page,
        limit: query.limit,
        total: countResult.rows[0]?.total || 0,
      },
    });
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
        c.*,
        COUNT(w.id)::INT AS works_count
      FROM clients c
      LEFT JOIN works w
        ON w.client_id = c.id
       AND w.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1 AND c.id = $2
      GROUP BY c.id
      `,
      [tenantId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
    }

    return res.json({ data: mapClientRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const payload = createClientSchema.parse(req.body);
    const result = await pool.query(
      `
      INSERT INTO clients (
        tenant_id,
        name,
        contact_name,
        phone,
        email,
        credit_type,
        balance_pending,
        status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *, 0::INT AS works_count
      `,
      [
        tenantId,
        payload.name,
        payload.contactName,
        normalizeNullable(payload.phone),
        normalizeNullable(payload.email),
        payload.creditType,
        payload.balancePending,
        payload.status,
      ]
    );

    return res.status(201).json({
      data: mapClientRow(result.rows[0]),
      message: "Cliente creado correctamente",
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
    const payload = updateClientSchema.parse(req.body);

    const currentResult = await pool.query(
      `
      SELECT c.*, COUNT(w.id)::INT AS works_count
      FROM clients c
      LEFT JOIN works w ON w.client_id = c.id AND w.tenant_id = c.tenant_id
      WHERE c.tenant_id = $1 AND c.id = $2
      GROUP BY c.id
      `,
      [tenantId, id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
    }

    const current = currentResult.rows[0];

    const updateResult = await pool.query(
      `
      UPDATE clients
      SET
        name = $3,
        contact_name = $4,
        phone = $5,
        email = $6,
        credit_type = $7,
        balance_pending = $8,
        status = $9,
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
      `,
      [
        tenantId,
        id,
        payload.name ?? current.name,
        payload.contactName ?? current.contact_name,
        payload.phone !== undefined ? normalizeNullable(payload.phone) : current.phone,
        payload.email !== undefined ? normalizeNullable(payload.email) : current.email,
        payload.creditType ?? current.credit_type,
        payload.balancePending ?? Number(current.balance_pending),
        payload.status ?? current.status,
      ]
    );

    return res.json({
      data: mapClientRow({ ...updateResult.rows[0], works_count: current.works_count }),
      message: "Cliente actualizado correctamente",
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
      UPDATE clients
      SET status = 'inactive', updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING id
      `,
      [tenantId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
    }

    return res.json({
      ok: true,
      message: "Cliente desactivado correctamente",
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
