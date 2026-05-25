const request = require("supertest");
const app = require("../app");
const bcrypt = require("bcryptjs");

// Mock the database module
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
    },
    getPool: jest.fn().mockResolvedValue(mockPool),
    __mockPool: mockPool,
  };
});

process.env.JWT_SECRET = "test_jwt_secret_for_unit_tests";

const jwt = require("jsonwebtoken");
const { __mockPool: mockPool } = require("../src/config/db");

describe("Auth API Routes", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("POST /api/auth/register", () => {
    test("returns 400 when email is missing", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ password: "StrongPass1!" });
      expect(res.status).toBe(400);
    });

    test("returns 400 when password is too short", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "test@test.com", password: "short" });
      expect(res.status).toBe(400);
    });

    test("returns 409 when email already exists", async () => {
      mockPool.query.mockResolvedValue({ recordset: [{ id: 1 }] });

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "existing@test.com", password: "Password123!" });
      expect(res.status).toBe(409);
    });

    test("returns 201 on successful registration", async () => {
      // First query: check existing user → none found
      // Second query: insert user
      mockPool.query
        .mockResolvedValueOnce({ recordset: [] })
        .mockResolvedValueOnce({});

      const res = await request(app)
        .post("/api/auth/register")
        .send({ email: "new@test.com", password: "Password123!" });
      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Registered successfully");
    });
  });

  describe("POST /api/auth/login", () => {
    test("returns 400 when email is missing", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ password: "Password123!" });
      expect(res.status).toBe(400);
    });

    test("returns 401 when user not found", async () => {
      mockPool.query.mockResolvedValue({ recordset: [] });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "unknown@test.com", password: "Password123!" });
      expect(res.status).toBe(401);
    });

    test("returns 401 when password is wrong", async () => {
      const passwordHash = await bcrypt.hash("CorrectPassword1!", 10);
      mockPool.query.mockResolvedValue({
        recordset: [
          { id: 1, email: "admin@test.com", password_hash: passwordHash, role: "admin" },
        ],
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@test.com", password: "WrongPassword1!" });
      expect(res.status).toBe(401);
    });

    test("returns 200 with token on successful login", async () => {
      const passwordHash = await bcrypt.hash("Password123!", 10);
      mockPool.query.mockResolvedValue({
        recordset: [
          { id: 1, email: "admin@test.com", password_hash: passwordHash, role: "admin" },
        ],
      });

      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@test.com", password: "Password123!" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("admin@test.com");

      // Verify the token is valid
      const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
      expect(decoded.email).toBe("admin@test.com");
    });
  });

  describe("GET /api/auth/profile", () => {
    test("returns 401 without auth token", async () => {
      const res = await request(app).get("/api/auth/profile");
      expect(res.status).toBe(401);
    });

    test("returns 200 with user profile when authenticated", async () => {
      const token = jwt.sign(
        { id: 1, email: "admin@test.com", role: "admin" },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      mockPool.query.mockResolvedValue({
        recordset: [
          { id: 1, email: "admin@test.com", role: "admin", created_at: "2024-01-01" },
        ],
      });

      const res = await request(app)
        .get("/api/auth/profile")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe("admin@test.com");
    });
  });
});
