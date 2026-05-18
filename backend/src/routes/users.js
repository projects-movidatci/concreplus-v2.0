const express = require("express");
const bcrypt = require("bcryptjs");
const { z } = require("zod");
const { pool } = require("../db/pool");

const router = express.Router();

const ROLE_NAMES = ["vendedor", "supervisor", "admin"];

function getTenantId(req, res) {
  const tenantId = Number(req.auth?.tenantId);
  if (!tenantId) {
    res.status(401).json({ ok: false, message: "Token sin tenant valido" });
    return null;
  }
  return tenantId;
}

function getAuthority(req) {
  const a = req.auth?.authority;
  return Array.isArray(a) ? a : [];
}

function isAdmin(req) {
  return getAuthority(req).includes("admin");
}

function isSupervisor(req) {
  return getAuthority(req).includes("supervisor");
}

function canListUsers(req) {
  return isAdmin(req) || isSupervisor(req);
}

/** Usuario objetivo tiene rol de privilegio (supervisor o admin): el supervisor no puede tocarlos */
function targetIsPrivileged(roles) {
  const list = Array.isArray(roles) ? roles : [];
  return list.includes("admin") || list.includes("supervisor");
}

const createUserSchema = z.object({
  email: z.string().trim().email("Email invalido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  fullName: z.string().trim().min(1, "Nombre requerido"),
  role: z.enum(["vendedor", "supervisor", "admin"]),
});

const updateUserSchema = z
  .object({
    email: z.string().trim().email().optional(),
    fullName: z.string().trim().min(1).optional(),
    password: z.string().min(6).optional().or(z.literal("")),
    isActive: z.boolean().optional(),
    role: z.enum(["vendedor", "supervisor", "admin"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "Debes enviar al menos un campo",
  });

async function getUserRoles(userId) {
  const { rows } = await pool.query(
    `
    SELECT r.name
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = $1
    ORDER BY r.name
    `,
    [userId]
  );
  return rows.map((row) => row.name);
}

async function setUserSingleRole(tenantId, userId, roleName) {
  const roleRes = await pool.query(
    `SELECT id FROM roles WHERE tenant_id = $1 AND name = $2`,
    [tenantId, roleName]
  );
  if (roleRes.rows.length === 0) {
    throw new Error(`Rol no encontrado: ${roleName}`);
  }
  const roleId = roleRes.rows[0].id;
  await pool.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [userId, roleId]);
}

router.get("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  if (!canListUsers(req)) {
    return res.status(403).json({ ok: false, message: "No autorizado" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        u.id,
        u.email,
        u.full_name AS "fullName",
        u.is_active AS "isActive",
        COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.tenant_id = $1
      GROUP BY u.id
      ORDER BY u.id ASC
      `,
      [tenantId]
    );
    return res.json({ data: rows });
  } catch (error) {
    return next(error);
  }
});

router.get("/roles/assignable", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  if (!canListUsers(req)) {
    return res.status(403).json({ ok: false, message: "No autorizado" });
  }

  try {
    if (isAdmin(req)) {
      return res.json({ data: ROLE_NAMES });
    }
    return res.json({ data: ["vendedor"] });
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  if (!canListUsers(req)) {
    return res.status(403).json({ ok: false, message: "No autorizado" });
  }

  let payload;
  try {
    payload = createUserSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }

  if (isSupervisor(req) && !isAdmin(req)) {
    if (payload.role !== "vendedor") {
      return res.status(403).json({
        ok: false,
        message: "Solo un administrador puede crear supervisores o administradores",
      });
    }
  }

  try {
    const exists = await pool.query(
      `SELECT id FROM users WHERE tenant_id = $1 AND email = $2`,
      [tenantId, payload.email.toLowerCase()]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ ok: false, message: "Ya existe un usuario con ese email" });
    }

    const passwordHash = await bcrypt.hash(String(payload.password), 10);

    const ins = await pool.query(
      `
      INSERT INTO users (tenant_id, email, password_hash, full_name, is_active)
      VALUES ($1, $2, $3, $4, TRUE)
      RETURNING id, email, full_name AS "fullName", is_active AS "isActive"
      `,
      [tenantId, payload.email.toLowerCase(), passwordHash, payload.fullName]
    );

    const userId = ins.rows[0].id;
    await setUserSingleRole(tenantId, userId, payload.role);

    const roles = await getUserRoles(userId);
    return res.status(201).json({
      data: {
        ...ins.rows[0],
        roles,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  if (!canListUsers(req)) {
    return res.status(403).json({ ok: false, message: "No autorizado" });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  let payload;
  try {
    payload = updateUserSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, message: error.issues[0]?.message || "Datos invalidos" });
    }
    return next(error);
  }

  try {
    const userRow = await pool.query(
      `SELECT id, email FROM users WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    if (userRow.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    const currentRoles = await getUserRoles(id);
    const privileged = targetIsPrivileged(currentRoles);

    if (isSupervisor(req) && !isAdmin(req)) {
      if (privileged) {
        return res.status(403).json({
          ok: false,
          message: "No puedes editar administradores ni supervisores",
        });
      }
      if (payload.role && payload.role !== "vendedor") {
        return res.status(403).json({
          ok: false,
          message: "Solo un administrador puede asignar rol supervisor o administrador",
        });
      }
    }

    const updates = [];
    const values = [];
    let p = 1;

    if (payload.email !== undefined) {
      updates.push(`email = $${p++}`);
      values.push(payload.email.toLowerCase());
    }
    if (payload.fullName !== undefined) {
      updates.push(`full_name = $${p++}`);
      values.push(payload.fullName);
    }
    if (payload.password !== undefined && payload.password !== "") {
      const passwordHash = await bcrypt.hash(String(payload.password), 10);
      updates.push(`password_hash = $${p++}`);
      values.push(passwordHash);
    }
    if (payload.isActive !== undefined) {
      updates.push(`is_active = $${p++}`);
      values.push(payload.isActive);
    }

    if (updates.length > 0) {
      values.push(tenantId, id);
      await pool.query(
        `UPDATE users SET ${updates.join(", ")}, updated_at = NOW() WHERE tenant_id = $${p} AND id = $${p + 1}`,
        values
      );
    }

    if (payload.role !== undefined) {
      await setUserSingleRole(tenantId, id, payload.role);
    }

    const { rows } = await pool.query(
      `
      SELECT id, email, full_name AS "fullName", is_active AS "isActive"
      FROM users WHERE tenant_id = $1 AND id = $2
      `,
      [tenantId, id]
    );
    const roles = await getUserRoles(id);
    return res.json({ data: { ...rows[0], roles } });
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  const tenantId = getTenantId(req, res);
  if (!tenantId) return;
  if (!canListUsers(req)) {
    return res.status(403).json({ ok: false, message: "No autorizado" });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, message: "ID invalido" });
  }

  const requestUserId = Number(req.auth?.sub);
  if (id === requestUserId) {
    return res.status(400).json({ ok: false, message: "No puedes desactivar tu propio usuario" });
  }

  try {
    const userRow = await pool.query(
      `SELECT id FROM users WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    if (userRow.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Usuario no encontrado" });
    }

    const currentRoles = await getUserRoles(id);
    if (isSupervisor(req) && !isAdmin(req)) {
      if (targetIsPrivileged(currentRoles)) {
        return res.status(403).json({
          ok: false,
          message: "No puedes eliminar administradores ni supervisores",
        });
      }
    }

    await pool.query(
      `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );

    return res.json({ ok: true, message: "Usuario desactivado" });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
