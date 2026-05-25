const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const dashboardController = require("../controllers/dashboardController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again later." },
});

router.post("/register", authController.register);
router.post("/login", loginLimiter, authController.login);
router.get("/profile", authenticate, authController.getProfile);
router.put("/profile", authenticate, authController.updateProfile);
router.get("/dashboard/stats", authenticate, dashboardController.getStats);

module.exports = router;
