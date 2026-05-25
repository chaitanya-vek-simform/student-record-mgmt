const request = require("supertest");
const app = require("../app");

// Mock the database module so no real DB connection is needed
jest.mock("../src/config/db", () => {
  const mockPool = {
    request: jest.fn().mockReturnThis(),
    input: jest.fn().mockReturnThis(),
    query: jest.fn(),
  };
  return {
    sql: {
      NVarChar: jest.fn((n) => `NVarChar(${n})`),
      Int: "Int",
      MAX: "MAX",
    },
    getPool: jest.fn().mockResolvedValue(mockPool),
    __mockPool: mockPool,
  };
});

// Set a test secret for JWT
process.env.JWT_SECRET = "test_jwt_secret_for_unit_tests";

const jwt = require("jsonwebtoken");
const { __mockPool: mockPool } = require("../src/config/db");

const adminToken = jwt.sign(
  { id: 1, email: "admin@test.com", role: "admin" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

const studentToken = jwt.sign(
  { id: 2, email: "student@test.com", role: "student" },
  process.env.JWT_SECRET,
  { expiresIn: "1h" }
);

describe("Student API Routes", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("GET /api/students", () => {
    test("returns 401 without auth token", async () => {
      const res = await request(app).get("/api/students");
      expect(res.status).toBe(401);
    });

    test("returns 200 with list of students when authenticated", async () => {
      mockPool.query.mockResolvedValue({
        recordset: [
          { id: 1, name: "Alice", department: "CS", created_at: "2024-01-01" },
        ],
      });

      const res = await request(app)
        .get("/api/students")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].name).toBe("Alice");
    });
  });

  describe("POST /api/students", () => {
    test("returns 401 without auth token", async () => {
      const res = await request(app)
        .post("/api/students")
        .send({ name: "Bob", department: "EE" });
      expect(res.status).toBe(401);
    });

    test("returns 403 when student role tries to create", async () => {
      const res = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ name: "Bob", department: "EE" });
      expect(res.status).toBe(403);
    });

    test("returns 400 when name is missing", async () => {
      const res = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ department: "EE" });
      expect(res.status).toBe(400);
    });

    test("returns 400 when department is missing", async () => {
      const res = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Bob" });
      expect(res.status).toBe(400);
    });

    test("returns 201 when admin creates a student", async () => {
      mockPool.query.mockResolvedValue({
        recordset: [{ id: 10 }],
      });

      const res = await request(app)
        .post("/api/students")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Bob", department: "EE" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Bob");
      expect(res.body.id).toBe(10);
    });
  });

  describe("PUT /api/students/:id", () => {
    test("returns 403 when non-admin tries to update", async () => {
      const res = await request(app)
        .put("/api/students/1")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({ name: "UpdatedName", department: "CS" });
      expect(res.status).toBe(403);
    });

    test("returns 404 when student not found", async () => {
      mockPool.query.mockResolvedValue({ rowsAffected: [0] });

      const res = await request(app)
        .put("/api/students/999")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "UpdatedName", department: "CS" });
      expect(res.status).toBe(404);
    });

    test("returns 200 when admin updates a student", async () => {
      mockPool.query.mockResolvedValue({ rowsAffected: [1] });

      const res = await request(app)
        .put("/api/students/1")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "UpdatedName", department: "CS" });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Student updated successfully.");
    });
  });

  describe("DELETE /api/students/:id", () => {
    test("returns 403 when non-admin tries to delete", async () => {
      const res = await request(app)
        .delete("/api/students/1")
        .set("Authorization", `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    test("returns 404 when student not found", async () => {
      mockPool.query.mockResolvedValue({ rowsAffected: [0] });

      const res = await request(app)
        .delete("/api/students/999")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    test("returns 200 when admin deletes a student", async () => {
      mockPool.query.mockResolvedValue({ rowsAffected: [1] });

      const res = await request(app)
        .delete("/api/students/1")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Student deleted successfully.");
    });
  });
});
