const express = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

const invoiceStatusSchema = z.enum(["pending", "paid", "overdue", "cancelled"]);

const listQuerySchema = z.object({
  status: invoiceStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

const registerPaymentSchema = z.object({
  method: z.string().trim().max(50).optional().or(z.literal("")),
  reference: z.string().trim().max(255).optional().or(z.literal("")),
});

const createInvoiceSchema = z.object({
  orderId: z.coerce.number().int().positive(),
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

function creditLabelFromTerms(terms) {
  if (!terms) return "Contado";
  if (terms === "credit_15_days") return "15 días";
  if (terms === "cash" || terms === "contado") return "Contado";
  return String(terms);
}

function creditTermsFromClientType(creditType) {
  if (creditType === "15_days") return "credit_15_days";
  return "cash";
}

function dueDateFromIssueAndTerms(issueDate, creditTerms) {
  const d = issueDate instanceof Date ? new Date(issueDate) : parseDateOnly(issueDate);
  if (!d || Number.isNaN(d.getTime())) return new Date();
  const due = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (creditTerms === "credit_15_days") {
    due.setDate(due.getDate() + 15);
  }
  return due;
}

async function nextInvoiceCode(queryable, tenantId) {
  const year = new Date().getFullYear();
  const prefix = `FACT-${year}-`;
  const { rows } = await queryable.query(
    `SELECT code FROM invoices WHERE tenant_id = $1 AND code LIKE $2 ORDER BY id DESC LIMIT 1`,
    [tenantId, `${prefix}%`]
  );
  let seq = 1;
  if (rows[0]?.code) {
    const m = String(rows[0].code).match(/-(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

function mapOrderRowForBilling(row) {
  const deliveryAt =
    row.delivery_at instanceof Date ? row.delivery_at.toISOString() : String(row.delivery_at || "");
  return {
    id: Number(row.id),
    code: row.code,
    clientId: Number(row.client_id),
    workId: Number(row.work_id),
    quotationId: row.quotation_id != null ? Number(row.quotation_id) : null,
    clientName: row.client_name ?? "",
    workName: row.work_name ?? "",
    concreteType: row.concrete_type,
    cubicMeters: Number(row.cubic_meters),
    totalAmount: Number(row.total_amount),
    deliveryAt,
    status: row.status,
    isScheduled: Boolean(row.is_scheduled),
    mixerId: row.mixer_id != null ? Number(row.mixer_id) : null,
    driverId: row.driver_id != null ? Number(row.driver_id) : null,
    mixerLabel: row.mixer_code ?? null,
    driverName: row.driver_full_name ?? null,
    dispatchedAt: row.dispatched_at
      ? row.dispatched_at instanceof Date
        ? row.dispatched_at.toISOString()
        : String(row.dispatched_at)
      : null,
    deliveredAt: row.delivered_at
      ? row.delivered_at instanceof Date
        ? row.delivered_at.toISOString()
        : String(row.delivered_at)
      : null,
    deliveryNotes: row.delivery_notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function startOfTodayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const s = String(value).slice(0, 10);
  const [y, m, day] = s.split("-").map(Number);
  if (!y || !m || !day) return null;
  return new Date(y, m - 1, day);
}

function formatDateOnly(value) {
  if (!value) return "";
  const d = value instanceof Date ? value : parseDateOnly(value);
  if (!d || Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function effectiveInvoiceStatus(row) {
  const stored = row.status;
  if (stored === "paid" || stored === "cancelled") return stored;
  const due = parseDateOnly(row.due_date);
  if (stored === "pending" && due && due < startOfTodayLocal()) {
    return "overdue";
  }
  return stored === "overdue" ? "overdue" : "pending";
}

function mapInvoiceRow(row) {
  const eff = effectiveInvoiceStatus(row);
  return {
    id: Number(row.id),
    code: row.code,
    orderId: Number(row.order_id),
    clientId: Number(row.client_id),
    clientName: row.client_name ?? "",
    amount: Number(row.amount),
    currency: row.currency ?? "MXN",
    issueDate: formatDateOnly(row.issue_date),
    dueDate: formatDateOnly(row.due_date),
    status: eff,
    creditTerms: row.credit_terms ?? null,
    creditLabel: creditLabelFromTerms(row.credit_terms),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const baseSelect = `
  SELECT
    i.*,
    c.name AS client_name
  FROM invoices i
  INNER JOIN clients c ON c.id = i.client_id AND c.tenant_id = i.tenant_id
`;

const billableOrdersSelect = `
  SELECT
    o.*,
    c.name AS client_name,
    w.name AS work_name,
    m.code AS mixer_code,
    d.full_name AS driver_full_name
  FROM orders o
  INNER JOIN clients c ON c.id = o.client_id AND c.tenant_id = o.tenant_id
  INNER JOIN works w ON w.id = o.work_id AND w.tenant_id = o.tenant_id
  LEFT JOIN mixers m ON m.id = o.mixer_id AND m.tenant_id = o.tenant_id
  LEFT JOIN drivers d ON d.id = o.driver_id AND d.tenant_id = o.tenant_id
`;

router.get("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const query = listQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    const values = [tenantId];
    let where = "i.tenant_id = $1";

    if (query.status === "overdue") {
      where += ` AND (
        i.status = 'overdue'
        OR (i.status = 'pending' AND i.due_date < CURRENT_DATE)
      )`;
    } else if (query.status === "pending") {
      where += ` AND i.status = 'pending' AND i.due_date >= CURRENT_DATE`;
    } else if (query.status === "paid") {
      where += ` AND i.status = 'paid'`;
    } else if (query.status === "cancelled") {
      where += ` AND i.status = 'cancelled'`;
    }

    const listSql = `
      ${baseSelect}
      WHERE ${where}
      ORDER BY i.id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;
    const countSql = `
      SELECT COUNT(*)::INT AS total
      FROM invoices i
      WHERE ${where}
    `;

    const listValues = [...values, query.limit, offset];
    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, listValues),
      pool.query(countSql, values),
    ]);

    return res.json({
      data: listResult.rows.map(mapInvoiceRow),
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

router.get("/billable-orders", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const query = listQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    const values = [tenantId];
    const where = `
      o.tenant_id = $1
      AND o.status = 'delivered'
      AND NOT EXISTS (
        SELECT 1 FROM invoices inv
        WHERE inv.tenant_id = o.tenant_id AND inv.order_id = o.id
      )
    `;
    const listSql = `
      ${billableOrdersSelect}
      WHERE ${where}
      ORDER BY o.id DESC
      LIMIT $${values.length + 1}
      OFFSET $${values.length + 2}
    `;
    const countSql = `
      SELECT COUNT(*)::INT AS total
      FROM orders o
      WHERE ${where}
    `;
    const listValues = [...values, query.limit, offset];
    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, listValues),
      pool.query(countSql, values),
    ]);

    return res.json({
      data: listResult.rows.map(mapOrderRowForBilling),
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

router.post("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  let payload;
  try {
    payload = createInvoiceSchema.parse(req.body || {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const ordResult = await client.query(
      `
      SELECT o.*, c.credit_type
      FROM orders o
      INNER JOIN clients c ON c.id = o.client_id AND c.tenant_id = o.tenant_id
      WHERE o.tenant_id = $1 AND o.id = $2
      FOR UPDATE OF o
      `,
      [tenantId, payload.orderId]
    );
    if (ordResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Pedido no encontrado" });
    }
    const ord = ordResult.rows[0];
    if (ord.status !== "delivered") {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "Solo se pueden facturar pedidos entregados" });
    }

    const dup = await client.query(
      `SELECT id FROM invoices WHERE tenant_id = $1 AND order_id = $2 LIMIT 1`,
      [tenantId, payload.orderId]
    );
    if (dup.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ ok: false, message: "Este pedido ya tiene factura" });
    }

    const creditTerms = creditTermsFromClientType(ord.credit_type);
    const issueDate = new Date();
    issueDate.setHours(0, 0, 0, 0);
    const dueDate = dueDateFromIssueAndTerms(issueDate, creditTerms);

    const code = await nextInvoiceCode(client, tenantId);
    const amount = Number(ord.total_amount);
    const currency = "MXN";

    const insertResult = await client.query(
      `
      INSERT INTO invoices (
        tenant_id, client_id, order_id, code, amount, currency,
        issue_date, due_date, status, credit_terms, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, 'pending', $9, NOW())
      RETURNING id
      `,
      [
        tenantId,
        ord.client_id,
        payload.orderId,
        code,
        amount,
        currency,
        formatDateOnly(issueDate),
        formatDateOnly(dueDate),
        creditTerms,
      ]
    );

    const newId = insertResult.rows[0].id;
    await client.query("COMMIT");

    const full = await pool.query(`${baseSelect} WHERE i.tenant_id = $1 AND i.id = $2`, [tenantId, newId]);
    return res.status(201).json({
      data: mapInvoiceRow(full.rows[0]),
      message: "Factura creada correctamente",
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    return next(error);
  } finally {
    client.release();
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
    const result = await pool.query(`${baseSelect} WHERE i.tenant_id = $1 AND i.id = $2`, [tenantId, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Factura no encontrada" });
    }
    return res.json({ data: mapInvoiceRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/payments", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  let payload;
  try {
    payload = registerPaymentSchema.parse(req.body || {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const invResult = await client.query(
      `SELECT * FROM invoices WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
      [tenantId, id]
    );
    if (invResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ ok: false, message: "Factura no encontrada" });
    }
    const inv = invResult.rows[0];
    if (inv.status === "paid") {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "La factura ya esta pagada" });
    }
    if (inv.status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(400).json({ ok: false, message: "La factura esta cancelada" });
    }

    const amount = Number(inv.amount);
    await client.query(
      `
      INSERT INTO payments (tenant_id, invoice_id, amount, currency, paid_at, method, reference)
      VALUES ($1, $2, $3, $4, NOW(), $5, $6)
      `,
      [
        tenantId,
        id,
        amount,
        inv.currency ?? "MXN",
        normalizeNullable(payload.method),
        normalizeNullable(payload.reference),
      ]
    );

    await client.query(
      `
      UPDATE invoices
      SET status = 'paid', updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      `,
      [tenantId, id]
    );

    await client.query("COMMIT");

    const full = await pool.query(`${baseSelect} WHERE i.tenant_id = $1 AND i.id = $2`, [tenantId, id]);
    return res.status(201).json({
      data: mapInvoiceRow(full.rows[0]),
      message: "Pago registrado correctamente",
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    return next(error);
  } finally {
    client.release();
  }
});

module.exports = router;
