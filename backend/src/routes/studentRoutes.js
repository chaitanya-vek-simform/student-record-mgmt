const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const {
  authenticate,
  authorizeRoles,
} = require("../middleware/authMiddleware");

// Define routes
router.get("/students", authenticate, studentController.getAllStudents);

router.post(
  "/students",
  authenticate,
  authorizeRoles("admin"),
  studentController.createStudent,
);
router.put(
  "/students/:id",
  authenticate,
  authorizeRoles("admin"),
  studentController.updateStudent,
);
router.delete(
  "/students/:id",
  authenticate,
  authorizeRoles("admin"),
  studentController.deleteStudent,
);

module.exports = router;
