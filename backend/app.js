require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cloudflareGuard = require("./src/middleware/cloudflareGuard");
const studentRoutes = require("./src/routes/studentRoutes");
const authRoutes = require("./src/routes/authRoutes");

const app = express();

// ---------------------------------------------------------------------------
// Allowed origins:
//   - FRONTEND_ORIGIN  →  set in Azure App Service config (e.g. https://students.yourdomain.com)
//   - localhost entries →  for local development only (ignored in production)
// ---------------------------------------------------------------------------
const allowedOrigins = new Set([
  process.env.FRONTEND_ORIGIN,          // production: set in Azure App Service → Configuration
  "http://localhost:8080",
  "http://localhost:5173",
].filter(Boolean)); // remove undefined if FRONTEND_ORIGIN not set locally

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    // only in non-production. In production, all browser requests must
    // originate from the whitelisted frontend domain.
    if (!origin) {
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      return callback(new Error("No-origin requests blocked in production"));
    }
    if (allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS: origin '${origin}' is not allowed`));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

// ---------------------------------------------------------------------------
// Global Middleware — ORDER MATTERS
// 1. CORS  — handle preflight before anything else
// 2. cloudflareGuard — block direct-to-origin hits in production
// 3. Body parsers
// ---------------------------------------------------------------------------
app.use(cors(corsOptions));
app.use(cloudflareGuard);           // blocks requests without the Cloudflare secret header
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authRoutes);
app.use("/api", studentRoutes);

// Health check — intentionally outside /api so Cloudflare health probes work
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", message: "Server is running" });
});

module.exports = app;
