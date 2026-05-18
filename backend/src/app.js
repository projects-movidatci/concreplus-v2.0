const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pinoHttp = require("pino-http");

const logger = require("./config/logger");
const healthRoute = require("./routes/health");
const authRoute = require("./routes/auth");
const clientsRoute = require("./routes/clients");
const worksRoute = require("./routes/works");
const notificationRoute = require("./routes/notification");
const quotationsRoute = require("./routes/quotations");
const ordersRoute = require("./routes/orders");
const mixersRoute = require("./routes/mixers");
const driversRoute = require("./routes/drivers");
const invoicesRoute = require("./routes/invoices");
const dashboardRoute = require("./routes/dashboard");
const usersRoute = require("./routes/users");
const { authMiddleware } = require("./middlewares/auth");
const { notFoundHandler, errorHandler } = require("./middlewares/error-handler");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.use(pinoHttp({ logger }));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "API Concreto operativa",
  });
});

app.use("/health", healthRoute);
app.use(authRoute);
app.use("/clients", authMiddleware, clientsRoute);
app.use("/works", authMiddleware, worksRoute);
app.use("/notification", authMiddleware, notificationRoute);
app.use("/quotations", authMiddleware, quotationsRoute);
app.use("/orders", authMiddleware, ordersRoute);
app.use("/mixers", authMiddleware, mixersRoute);
app.use("/drivers", authMiddleware, driversRoute);
app.use("/invoices", authMiddleware, invoicesRoute);
app.use("/dashboard", authMiddleware, dashboardRoute);
app.use("/users", authMiddleware, usersRoute);
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
