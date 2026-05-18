const jwt = require("jsonwebtoken");
const env = require("../config/env");
const supabase = require("../config/supabase");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      ok: false,
      message: "Token no proporcionado",
    });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        ok: false,
        message: "Token invalido o expirado",
      });
    }

    // Adaptamos el req.auth para mantener compatibilidad con las rutas existentes
    req.auth = {
      sub: user.id,
      tenantId: user.user_metadata?.tenantId || 1, // Default tenantId por si no existe
      email: user.email,
      authority: user.user_metadata?.authority || ['vendedor'],
    };

    return next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: "Error de autenticacion",
    });
  }
}

module.exports = { authMiddleware };
