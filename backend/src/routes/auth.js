const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const env = require("../config/env");
const { pool } = require("../db/pool");

const router = express.Router();

router.post("/sign-in", async (req, res, next) => {
  const { userName, password } = req.body || {};

  if (!userName || !password) {
    return res.status(400).json({
      ok: false,
      message: "Debes enviar userName y password",
    });
  }

  try {
    const userResult = await pool.query(
      `
      SELECT
        u.id,
        u.tenant_id,
        u.email,
        u.password_hash,
        COALESCE(u.full_name, split_part(u.email, '@', 1)) AS full_name
      FROM users u
      WHERE
        u.is_active = TRUE
        AND (u.email = $1 OR split_part(u.email, '@', 1) = $1)
      LIMIT 1
      `,
      [String(userName).trim()]
    );

    const user = userResult.rows[0];
    const isPasswordValid = user
      ? await bcrypt.compare(String(password), user.password_hash)
      : false;

    if (!isPasswordValid) {
      return res.status(401).json({
        ok: false,
        message: "Credenciales invalidas",
      });
    }

    const rolesResult = await pool.query(
      `
      SELECT r.name
      FROM user_roles ur
      INNER JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
      `,
      [user.id]
    );

    const roles = rolesResult.rows.map((row) => row.name).filter(Boolean);
    if (roles.length === 0) {
      return res.status(403).json({
        ok: false,
        message: "Usuario sin rol asignado. Contacta al administrador.",
      });
    }
    const authority = roles;

    const token = jwt.sign(
      {
        sub: String(user.id),
        tenantId: Number(user.tenant_id),
        email: user.email,
        authority,
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return res.json({
      token,
      user: {
        userName: user.full_name,
        authority,
        avatar: "",
        email: user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/sign-out", (req, res) => {
  return res.json({
    ok: true,
    message: "Sesion cerrada",
  });
});

module.exports = router;
