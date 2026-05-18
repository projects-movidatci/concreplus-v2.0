const express = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

const quotationStatusSchema = z.enum(["draft", "sent", "approved"]);

const listQuerySchema = z.object({
  status: quotationStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(20),
});

const createQuotationSchema = z.object({
  clientId: z.coerce.number().int().positive(),
  workId: z.coerce.number().int().positive(),
  concreteType: z.string().trim().min(1, "concreteType es requerido"),
  cubicMeters: z.coerce.number().positive("cubicMeters debe ser mayor a 0"),
  pricePerM3: z.coerce.number().min(0, "pricePerM3 no puede ser negativo"),
  currency: z.string().trim().max(10).default("MXN"),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "validUntil debe ser YYYY-MM-DD"),
});

const updateQuotationSchema = z
  .object({
    status: quotationStatusSchema.optional(),
    validUntil: z
      .union([
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        z.literal(""),
        z.null(),
      ])
      .optional(),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((v) => Object.keys(v).length > 0, {
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

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

function mapQuotationRow(row) {
  const created = row.created_at;
  const dateStr =
    created instanceof Date
      ? created.toISOString().slice(0, 10)
      : String(created || "").slice(0, 10);
  return {
    id: Number(row.id),
    code: row.code,
    clientId: Number(row.client_id),
    workId: Number(row.work_id),
    clientName: row.client_name ?? "",
    workName: row.work_name ?? "",
    concreteType: row.concrete_type,
    cubicMeters: Number(row.cubic_meters),
    pricePerM3: Number(row.price_per_m3),
    totalAmount: Number(row.total_amount),
    currency: row.currency ?? "MXN",
    date: dateStr,
    status: row.status,
    validUntil: row.valid_until
      ? row.valid_until instanceof Date
        ? row.valid_until.toISOString().slice(0, 10)
        : String(row.valid_until).slice(0, 10)
      : null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function nextQuotationCode(queryable, tenantId) {
  const year = new Date().getFullYear();
  const prefix = `COT-${year}-`;
  const { rows } = await queryable.query(
    `SELECT code FROM quotations WHERE tenant_id = $1 AND code LIKE $2 ORDER BY id DESC LIMIT 1`,
    [tenantId, `${prefix}%`]
  );
  let seq = 1;
  if (rows[0]?.code) {
    const m = String(rows[0].code).match(/-(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

const baseSelect = `
  SELECT
    q.*,
    c.name AS client_name,
    w.name AS work_name
  FROM quotations q
  INNER JOIN clients c ON c.id = q.client_id AND c.tenant_id = q.tenant_id
  INNER JOIN works w ON w.id = q.work_id AND w.tenant_id = q.tenant_id
`;

router.get("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const query = listQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    const values = [tenantId];
    let where = "q.tenant_id = $1";
    if (query.status) {
      values.push(query.status);
      where += ` AND q.status = $${values.length}`;
    }

    const listSql = `
      ${baseSelect}
      WHERE ${where}
      ORDER BY q.id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;
    const countSql = `
      SELECT COUNT(*)::INT AS total
      FROM quotations q
      WHERE ${where}
    `;

    const listValues = [...values, query.limit, offset];
    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, listValues),
      pool.query(countSql, values),
    ]);

    return res.json({
      data: listResult.rows.map(mapQuotationRow),
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
    const result = await pool.query(`${baseSelect} WHERE q.tenant_id = $1 AND q.id = $2`, [tenantId, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Cotizacion no encontrada" });
    }
    return res.json({ data: mapQuotationRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  let payload;
  try {
    payload = createQuotationSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  if (payload.validUntil < todayStr) {
    return res.status(400).json({
      ok: false,
      message: "La fecha de vencimiento debe ser hoy o una fecha posterior",
    });
  }

  try {
    const clientRow = await pool.query(
      `SELECT id, status FROM clients WHERE tenant_id = $1 AND id = $2`,
      [tenantId, payload.clientId]
    );
    if (clientRow.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
    }
    if (clientRow.rows[0].status !== "active") {
      return res.status(400).json({
        ok: false,
        message: "No se pueden crear cotizaciones para clientes inactivos",
      });
    }

    const workRow = await pool.query(
      `SELECT id FROM works WHERE tenant_id = $1 AND id = $2 AND client_id = $3 AND status = 'active'`,
      [tenantId, payload.workId, payload.clientId]
    );
    if (workRow.rows.length === 0) {
      return res.status(400).json({
        ok: false,
        message: "Obra no encontrada, no pertenece al cliente o esta inactiva",
      });
    }

    const totalAmount = roundMoney(payload.cubicMeters * payload.pricePerM3);

    let inserted;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = await nextQuotationCode(pool, tenantId);
      try {
        inserted = await pool.query(
          `
          INSERT INTO quotations (
            tenant_id,
            client_id,
            work_id,
            code,
            concrete_type,
            cubic_meters,
            price_per_m3,
            total_amount,
            currency,
            status,
            valid_until,
            notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'draft',$10,$11)
          RETURNING *
          `,
          [
            tenantId,
            payload.clientId,
            payload.workId,
            code,
            payload.concreteType,
            payload.cubicMeters,
            payload.pricePerM3,
            totalAmount,
            payload.currency,
            normalizeNullable(payload.validUntil),
            null,
          ]
        );
        break;
      } catch (e) {
        if (e.code === "23505" && attempt < 4) {
          continue;
        }
        throw e;
      }
    }

    const full = await pool.query(`${baseSelect} WHERE q.tenant_id = $1 AND q.id = $2`, [
      tenantId,
      inserted.rows[0].id,
    ]);

    return res.status(201).json({
      data: mapQuotationRow(full.rows[0]),
      message: "Cotizacion creada correctamente",
    });
  } catch (error) {
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
    const payload = updateQuotationSchema.parse(req.body);

    const currentResult = await pool.query(`SELECT * FROM quotations WHERE tenant_id = $1 AND id = $2`, [
      tenantId,
      id,
    ]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Cotizacion no encontrada" });
    }
    const current = currentResult.rows[0];

    const nextStatus = payload.status ?? current.status;
    let nextValidUntil = current.valid_until;
    if (payload.validUntil !== undefined) {
      if (payload.validUntil === null || payload.validUntil === "") {
        nextValidUntil = null;
      } else {
        nextValidUntil = payload.validUntil;
      }
    }
    const nextNotes = payload.notes !== undefined ? normalizeNullable(payload.notes) : current.notes;

    await pool.query(
      `
      UPDATE quotations
      SET
        status = $3,
        valid_until = $4,
        notes = $5,
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      `,
      [tenantId, id, nextStatus, nextValidUntil, nextNotes]
    );

    const full = await pool.query(`${baseSelect} WHERE q.tenant_id = $1 AND q.id = $2`, [tenantId, id]);

    return res.json({
      data: mapQuotationRow(full.rows[0]),
      message: "Cotizacion actualizada correctamente",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }
});

module.exports = router;
