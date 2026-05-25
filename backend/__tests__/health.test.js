const request = require("supertest");
const app = require("../app");

describe("Health Check", () => {
  test("GET /health returns 200 with UP status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: "UP",
      message: "Server is running",
    });
  });

  test("GET /health response has correct content-type", async () => {
    const res = await request(app).get("/health");
    expect(res.headers["content-type"]).toMatch(/json/);
  });
});
