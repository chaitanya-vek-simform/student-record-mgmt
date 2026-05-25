require("dotenv").config();
const express = require("express");
const cors = require("cors");
const studentRoutes = require("./src/routes/studentRoutes");
const authRoutes = require("./src/routes/authRoutes");

const app = express();

const allowedOrigins = new Set([
  process.env.FRONTEND_ORIGIN || "https://chaitanya-vek.me",
  "https://student-mgmt-frontend.pages.dev",
  "http://localhost:8080",
  "http://localhost:5173",
]);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200,
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json()); // parse JSON bodies
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", studentRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP", message: "Server is running" });
});

module.exports = app;
