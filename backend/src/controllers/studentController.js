const Student = require("../models/studentModel");

exports.getAllStudents = async (req, res) => {
  try {
    const search = req.query.search || "";
    const students = await Student.getAll(search);
    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res
      .status(500)
      .json({ message: "Internal server error while fetching students." });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const { name, department } = req.body;

    if (!name || !department) {
      return res
        .status(400)
        .json({ message: "Name and department are required." });
    }

    const id = await Student.create({ name, department }, req.user.id);
    res.status(201).json({
      id,
      name,
      department,
      created_by: req.user.id,
      message: "Student created successfully.",
    });
  } catch (error) {
    console.error("Error creating student:", error);
    res
      .status(500)
      .json({ message: "Internal server error while creating student." });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department } = req.body;

    if (!name || !department) {
      return res
        .status(400)
        .json({ message: "Name and department are required." });
    }

    const affectedRows = await Student.update(id, { name, department });

    if (affectedRows === 0) {
      return res.status(404).json({ message: "Student not found." });
    }

    res.status(200).json({
      id,
      name,
      department,
      message: "Student updated successfully.",
    });
  } catch (error) {
    console.error("Error updating student:", error);
    res
      .status(500)
      .json({ message: "Internal server error while updating student." });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const affectedRows = await Student.delete(id);

    if (affectedRows === 0) {
      return res.status(404).json({ message: "Student not found." });
    }

    res.status(200).json({ message: "Student deleted successfully." });
  } catch (error) {
    console.error("Error deleting student:", error);
    res
      .status(500)
      .json({ message: "Internal server error while deleting student." });
  }
};
