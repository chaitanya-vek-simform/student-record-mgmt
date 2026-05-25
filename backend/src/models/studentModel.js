const { sql, getPool } = require("../config/db");

class Student {
  static async getAll(search = "") {
    const pool = await getPool();
    const request = pool.request();
    let query = "SELECT * FROM students";

    if (search) {
      request.input("search", sql.NVarChar(255), `%${search}%`);
      query += " WHERE name LIKE @search OR department LIKE @search";
    }

    query += " ORDER BY id";
    const result = await request.query(query);
    return result.recordset;
  }

  static async create(studentData, createdBy) {
    const { name, department } = studentData;
    const pool = await getPool();
    const result = await pool
      .request()
      .input("name", sql.NVarChar(255), name)
      .input("department", sql.NVarChar(sql.MAX), department)
      .input("created_by", sql.Int, createdBy).query(`
                INSERT INTO students (name, department, created_by)
                OUTPUT INSERTED.id
                VALUES (@name, @department, @created_by)
            `);
    return result.recordset[0].id;
  }

  static async update(id, studentData) {
    const { name, department } = studentData;
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, Number(id))
      .input("name", sql.NVarChar(255), name)
      .input("department", sql.NVarChar(sql.MAX), department)
      .query(
        "UPDATE students SET name = @name, department = @department WHERE id = @id",
      );
    return result.rowsAffected[0] || 0;
  }

  static async delete(id) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, Number(id))
      .query("DELETE FROM students WHERE id = @id");
    return result.rowsAffected[0] || 0;
  }

  static async countAll() {
    const pool = await getPool();
    const result = await pool
      .request()
      .query("SELECT COUNT(1) AS total FROM students");
    return result.recordset[0].total;
  }

  static async countByCreator(userId) {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("created_by", sql.Int, userId)
      .query(
        "SELECT COUNT(1) AS total FROM students WHERE created_by = @created_by",
      );
    return result.recordset[0].total;
  }
}

module.exports = Student;
