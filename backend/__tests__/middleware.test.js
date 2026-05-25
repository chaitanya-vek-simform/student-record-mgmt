const jwt = require("jsonwebtoken");
const { authenticate, authorizeRoles } = require("../src/middleware/authMiddleware");

// Set a test secret for JWT
process.env.JWT_SECRET = "test_jwt_secret_for_unit_tests";

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe("authenticate middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns 401 when no Authorization header is provided", () => {
    const req = { headers: {} };
    const res = mockResponse();

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("returns 401 when Authorization header has wrong scheme", () => {
    const req = { headers: { authorization: "Basic some_token" } };
    const res = mockResponse();

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("returns 401 when token is invalid", () => {
    const req = { headers: { authorization: "Bearer invalid.token.here" } };
    const res = mockResponse();

    authenticate(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Invalid or expired token" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("calls next and sets req.user when token is valid", () => {
    const payload = { id: 1, email: "test@test.com", role: "admin" };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockResponse();

    authenticate(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe("test@test.com");
    expect(req.user.role).toBe("admin");
  });
});

describe("authorizeRoles middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns 403 when user role is not in allowed roles", () => {
    const req = { user: { id: 1, role: "student" } };
    const res = mockResponse();
    const middleware = authorizeRoles("admin");

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
    expect(mockNext).not.toHaveBeenCalled();
  });

  test("calls next when user role is in allowed roles", () => {
    const req = { user: { id: 1, role: "admin" } };
    const res = mockResponse();
    const middleware = authorizeRoles("admin");

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  test("returns 403 when req.user is missing", () => {
    const req = {};
    const res = mockResponse();
    const middleware = authorizeRoles("admin");

    middleware(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
