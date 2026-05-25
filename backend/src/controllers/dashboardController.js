const Student = require("../models/studentModel");

exports.getStats = async (req, res) => {
  try {
    const [totalStudents, myStudents] = await Promise.all([
      Student.countAll(),
      Student.countByCreator(req.user.id),
    ]);

    return res.status(200).json({
      totalStudents,
      myStudents,
      role: req.user.role,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
