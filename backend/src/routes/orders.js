const express = require("express");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

const orderStatusSchema = z.enum(["pending", "scheduled", "dispatched", "delivered"]);

const listQuerySchema = z.object({
  status: orderStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

const createOrderSchema = z
  .object({
    quotationId: z.coerce.number().int().positive().optional(),
    clientId: z.coerce.number().int().positive().optional(),
    workId: z.coerce.number().int().positive().optional(),
    concreteType: z.string().trim().min(1).optional(),
    cubicMeters: z.coerce.number().positive().optional(),
    totalAmount: z.coerce.number().min(0).optional(),
    deliveryAt: z.string().min(1, "deliveryAt es requerido"),
    deliveryNotes: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.quotationId) return;
    if (!data.clientId || !data.workId || !data.concreteType || data.cubicMeters == null || data.totalAmount == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sin quotationId debes enviar clientId, workId, concreteType, cubicMeters y totalAmount",
        path: ["clientId"],
      });
    }
  });

const updateOrderSchema = z
  .object({
    status: orderStatusSchema.optional(),
    deliveryAt: z.string().optional(),
    deliveryNotes: z.string().optional().nullable().or(z.literal("")),
    mixerId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
    driverId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
    isScheduled: z.boolean().optional(),
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

function parseDeliveryAt(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d;
}

function mapOrderRow(row) {
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

const baseSelect = `
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

async function nextOrderCode(queryable, tenantId) {
  const year = new Date().getFullYear();
  const prefix = `PED-${year}-`;
  const { rows } = await queryable.query(
    `SELECT code FROM orders WHERE tenant_id = $1 AND code LIKE $2 ORDER BY id DESC LIMIT 1`,
    [tenantId, `${prefix}%`]
  );
  let seq = 1;
  if (rows[0]?.code) {
    const m = String(rows[0].code).match(/-(\d+)$/);
    if (m) seq = parseInt(m[1], 10) + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

async function insertOrderEvent(client, tenantId, orderId, eventType, eventLabel, eventStatus, notes) {
  await client.query(
    `
    INSERT INTO order_events (tenant_id, order_id, event_type, event_label, event_status, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [tenantId, orderId, eventType, eventLabel, eventStatus, notes ?? null]
  );
}

router.get("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  try {
    const query = listQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.limit;
    const values = [tenantId];
    let where = "o.tenant_id = $1";
    if (query.status) {
      values.push(query.status);
      where += ` AND o.status = $${values.length}`;
    }

    const listSql = `
      ${baseSelect}
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
      data: listResult.rows.map(mapOrderRow),
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

const timelineTypeSchema = z.enum(["created", "scheduled", "dispatched", "delivered"]);

function mapEventType(raw) {
  const t = String(raw || "").toLowerCase();
  const parsed = timelineTypeSchema.safeParse(t);
  return parsed.success ? parsed.data : null;
}

router.get("/:id/events", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  try {
    const orderCheck = await pool.query(`SELECT id FROM orders WHERE tenant_id = $1 AND id = $2`, [tenantId, orderId]);
    if (orderCheck.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Pedido no encontrado" });
    }

    const result = await pool.query(
      `
      SELECT id, order_id, event_type, event_label, event_status, occurred_at, notes
      FROM order_events
      WHERE tenant_id = $1 AND order_id = $2
      ORDER BY occurred_at ASC, id ASC
      `,
      [tenantId, orderId]
    );

    const data = result.rows.map((row) => {
      const type = mapEventType(row.event_type);
      const occurred = row.occurred_at;
      const ts =
        occurred instanceof Date ? occurred.toISOString() : String(occurred || "");
      return {
        id: Number(row.id),
        orderId: Number(row.order_id),
        eventType: row.event_type,
        type,
        label: row.event_label,
        status: row.event_status === "completed" ? "completed" : "pending",
        timestamp: ts,
        notes: row.notes ?? null,
      };
    });

    return res.json({ data });
  } catch (error) {
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
    const result = await pool.query(`${baseSelect} WHERE o.tenant_id = $1 AND o.id = $2`, [tenantId, id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Pedido no encontrado" });
    }
    return res.json({ data: mapOrderRow(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  let payload;
  try {
    payload = createOrderSchema.parse(req.body || {});
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }

  const deliveryDate = parseDeliveryAt(payload.deliveryAt);
  if (!deliveryDate) {
    return res.status(400).json({ ok: false, message: "deliveryAt no es una fecha valida" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let clientId;
    let workId;
    let concreteType;
    let cubicMeters;
    let totalAmount;
    let quotationId = null;

    if (payload.quotationId) {
      const qRes = await client.query(
        `SELECT * FROM quotations WHERE tenant_id = $1 AND id = $2`,
        [tenantId, payload.quotationId]
      );
      if (qRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, message: "Cotizacion no encontrada" });
      }
      const q = qRes.rows[0];
      if (q.status !== "approved") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          ok: false,
          message: "Solo se pueden generar pedidos desde cotizaciones aprobadas",
        });
      }

      const dup = await client.query(
        `SELECT id FROM orders WHERE tenant_id = $1 AND quotation_id = $2 LIMIT 1`,
        [tenantId, payload.quotationId]
      );
      if (dup.rows.length > 0) {
        await client.query("ROLLBACK");
        return res.status(409).json({
          ok: false,
          message: "Ya existe un pedido para esta cotizacion",
        });
      }

      quotationId = payload.quotationId;
      clientId = Number(q.client_id);
      workId = Number(q.work_id);
      concreteType = q.concrete_type;
      cubicMeters = Number(q.cubic_meters);
      totalAmount = Number(q.total_amount);
    } else {
      clientId = payload.clientId;
      workId = payload.workId;
      concreteType = payload.concreteType;
      cubicMeters = payload.cubicMeters;
      totalAmount = payload.totalAmount;

      const cRow = await client.query(`SELECT id, status FROM clients WHERE tenant_id = $1 AND id = $2`, [
        tenantId,
        clientId,
      ]);
      if (cRow.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ ok: false, message: "Cliente no encontrado" });
      }
      if (cRow.rows[0].status !== "active") {
        await client.query("ROLLBACK");
        return res.status(400).json({ ok: false, message: "El cliente no esta activo" });
      }

      const wRow = await client.query(
        `SELECT id FROM works WHERE tenant_id = $1 AND id = $2 AND client_id = $3 AND status = 'active'`,
        [tenantId, workId, clientId]
      );
      if (wRow.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          ok: false,
          message: "Obra no encontrada, no pertenece al cliente o esta inactiva",
        });
      }
    }

    let inserted;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = await nextOrderCode(client, tenantId);
      try {
        inserted = await client.query(
          `
          INSERT INTO orders (
            tenant_id,
            client_id,
            work_id,
            quotation_id,
            code,
            concrete_type,
            cubic_meters,
            total_amount,
            delivery_at,
            status,
            is_scheduled,
            delivery_notes
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending', FALSE, $10)
          RETURNING id
          `,
          [
            tenantId,
            clientId,
            workId,
            quotationId,
            code,
            concreteType,
            cubicMeters,
            totalAmount,
            deliveryDate,
            normalizeNullable(payload.deliveryNotes),
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

    if (!inserted?.rows?.[0]?.id) {
      await client.query("ROLLBACK");
      return res.status(500).json({ ok: false, message: "No se pudo crear el pedido" });
    }

    const newId = inserted.rows[0].id;
    await insertOrderEvent(client, tenantId, newId, "created", "Pedido creado", "completed", null);

    await client.query("COMMIT");

    const full = await pool.query(`${baseSelect} WHERE o.tenant_id = $1 AND o.id = $2`, [tenantId, newId]);
    return res.status(201).json({
      data: mapOrderRow(full.rows[0]),
      message: "Pedido creado correctamente",
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

router.patch("/:id", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  try {
    const payload = updateOrderSchema.parse(req.body);

    const currentResult = await pool.query(`SELECT * FROM orders WHERE tenant_id = $1 AND id = $2`, [tenantId, id]);
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Pedido no encontrado" });
    }
    const cur = currentResult.rows[0];

    let nextDelivery = cur.delivery_at;
    if (payload.deliveryAt !== undefined) {
      const d = parseDeliveryAt(payload.deliveryAt);
      if (!d) {
        return res.status(400).json({ ok: false, message: "deliveryAt no es una fecha valida" });
      }
      nextDelivery = d;
    }

    const nextStatus = payload.status ?? cur.status;

    if (payload.status === "scheduled" && cur.status === "pending") {
      const mid = payload.mixerId != null ? Number(payload.mixerId) : null;
      const did = payload.driverId != null ? Number(payload.driverId) : null;
      if (!mid || !did) {
        return res.status(400).json({
          ok: false,
          message: "Para programar envia mixerId y driverId",
        });
      }

      const db = await pool.connect();
      try {
        await db.query("BEGIN");

        const ordLock = await db.query(
          `SELECT * FROM orders WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
          [tenantId, id]
        );
        if (ordLock.rows.length === 0 || ordLock.rows[0].status !== "pending") {
          await db.query("ROLLBACK");
          return res.status(400).json({
            ok: false,
            message: "El pedido ya no esta pendiente o no existe",
          });
        }

        const mRes = await db.query(
          `SELECT id, status FROM mixers WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
          [tenantId, mid]
        );
        if (mRes.rows.length === 0) {
          await db.query("ROLLBACK");
          return res.status(404).json({ ok: false, message: "Trompo no encontrado" });
        }
        if (mRes.rows[0].status !== "available") {
          await db.query("ROLLBACK");
          return res.status(400).json({ ok: false, message: "Trompo no disponible" });
        }

        const dRes = await db.query(
          `SELECT id, status FROM drivers WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
          [tenantId, did]
        );
        if (dRes.rows.length === 0) {
          await db.query("ROLLBACK");
          return res.status(404).json({ ok: false, message: "Chofer no encontrado" });
        }
        if (dRes.rows[0].status !== "available") {
          await db.query("ROLLBACK");
          return res.status(400).json({ ok: false, message: "Chofer no disponible" });
        }

        await db.query(
          `UPDATE mixers SET status = 'in_use', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
          [tenantId, mid]
        );
        await db.query(
          `UPDATE drivers SET status = 'on_route', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
          [tenantId, did]
        );

        const deliveryNotesScheduled =
          payload.deliveryNotes !== undefined ? normalizeNullable(payload.deliveryNotes) : cur.delivery_notes;

        await db.query(
          `
          UPDATE orders
          SET
            status = 'scheduled',
            delivery_at = $3,
            delivery_notes = $4,
            mixer_id = $5,
            driver_id = $6,
            is_scheduled = TRUE,
            updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2
          `,
          [tenantId, id, nextDelivery, deliveryNotesScheduled, mid, did]
        );

        await insertOrderEvent(db, tenantId, id, "scheduled", "Programado", "completed", null);

        await db.query("COMMIT");

        const full = await pool.query(`${baseSelect} WHERE o.tenant_id = $1 AND o.id = $2`, [tenantId, id]);
        return res.json({
          data: mapOrderRow(full.rows[0]),
          message: "Pedido programado correctamente",
        });
      } catch (schedErr) {
        try {
          await db.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw schedErr;
      } finally {
        db.release();
      }
    }

    if (payload.status === "dispatched" && cur.status === "scheduled") {
      const db = await pool.connect();
      try {
        await db.query("BEGIN");
        const lock = await db.query(
          `SELECT * FROM orders WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
          [tenantId, id]
        );
        if (lock.rows.length === 0 || lock.rows[0].status !== "scheduled") {
          await db.query("ROLLBACK");
          return res.status(400).json({
            ok: false,
            message: "El pedido debe estar programado para marcarlo en camino",
          });
        }
        await db.query(
          `
          UPDATE orders
          SET status = 'dispatched', dispatched_at = NOW(), updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2
          `,
          [tenantId, id]
        );
        await insertOrderEvent(db, tenantId, id, "dispatched", "En camino", "completed", null);
        await db.query("COMMIT");
        const full = await pool.query(`${baseSelect} WHERE o.tenant_id = $1 AND o.id = $2`, [tenantId, id]);
        return res.json({
          data: mapOrderRow(full.rows[0]),
          message: "Pedido marcado en camino",
        });
      } catch (dispErr) {
        try {
          await db.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw dispErr;
      } finally {
        db.release();
      }
    }

    if (payload.status === "delivered" && cur.status === "dispatched") {
      const db = await pool.connect();
      try {
        await db.query("BEGIN");
        const lock = await db.query(
          `SELECT * FROM orders WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
          [tenantId, id]
        );
        if (lock.rows.length === 0 || lock.rows[0].status !== "dispatched") {
          await db.query("ROLLBACK");
          return res.status(400).json({
            ok: false,
            message: "El pedido debe estar en camino para marcarlo entregado",
          });
        }
        const row = lock.rows[0];
        await db.query(
          `
          UPDATE orders
          SET
            status = 'delivered',
            delivered_at = NOW(),
            updated_at = NOW()
          WHERE tenant_id = $1 AND id = $2
          `,
          [tenantId, id]
        );
        if (row.mixer_id) {
          await db.query(
            `UPDATE mixers SET status = 'available', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
            [tenantId, row.mixer_id]
          );
        }
        if (row.driver_id) {
          await db.query(
            `UPDATE drivers SET status = 'available', updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
            [tenantId, row.driver_id]
          );
        }
        await insertOrderEvent(db, tenantId, id, "delivered", "Entregado", "completed", null);
        await db.query("COMMIT");
        const full = await pool.query(`${baseSelect} WHERE o.tenant_id = $1 AND o.id = $2`, [tenantId, id]);
        return res.json({
          data: mapOrderRow(full.rows[0]),
          message: "Entrega registrada correctamente",
        });
      } catch (delErr) {
        try {
          await db.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw delErr;
      } finally {
        db.release();
      }
    }

    if (payload.status === "dispatched" && cur.status !== "scheduled") {
      if (cur.status === "dispatched") {
        return res.status(400).json({ ok: false, message: "El pedido ya esta en camino" });
      }
      return res.status(400).json({
        ok: false,
        message: "Solo se puede marcar en camino desde programado",
      });
    }

    if (payload.status === "delivered" && cur.status !== "dispatched") {
      if (cur.status === "delivered") {
        return res.status(400).json({ ok: false, message: "El pedido ya esta entregado" });
      }
      return res.status(400).json({
        ok: false,
        message: "Solo se puede marcar entregado desde en camino",
      });
    }

    let dispatchedAt = cur.dispatched_at;
    let deliveredAt = cur.delivered_at;

    if (payload.status === "dispatched" && cur.status !== "dispatched" && cur.status !== "delivered") {
      dispatchedAt = new Date();
    }
    if (payload.status === "delivered") {
      if (!deliveredAt) {
        deliveredAt = new Date();
      }
      if (!dispatchedAt) {
        dispatchedAt = cur.dispatched_at || new Date();
      }
    }

    const mixerId = payload.mixerId !== undefined ? payload.mixerId : cur.mixer_id;
    const driverId = payload.driverId !== undefined ? payload.driverId : cur.driver_id;
    const isScheduled = payload.isScheduled !== undefined ? payload.isScheduled : cur.is_scheduled;
    const deliveryNotes = payload.deliveryNotes !== undefined ? normalizeNullable(payload.deliveryNotes) : cur.delivery_notes;

    await pool.query(
      `
      UPDATE orders
      SET
        status = $3,
        delivery_at = $4,
        delivery_notes = $5,
        mixer_id = $6,
        driver_id = $7,
        is_scheduled = $8,
        dispatched_at = $9,
        delivered_at = $10,
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      `,
      [
        tenantId,
        id,
        nextStatus,
        nextDelivery,
        deliveryNotes,
        mixerId,
        driverId,
        isScheduled,
        dispatchedAt,
        deliveredAt,
      ]
    );

    const full = await pool.query(`${baseSelect} WHERE o.tenant_id = $1 AND o.id = $2`, [tenantId, id]);

    return res.json({
      data: mapOrderRow(full.rows[0]),
      message: "Pedido actualizado correctamente",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }
});

module.exports = router;
