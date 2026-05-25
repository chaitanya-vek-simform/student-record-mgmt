const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const { sql, getPool } = require("../config/db");

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const loginSchema = registerSchema;

const profileSchema = Joi.object({
  email: Joi.string().email(),
  password: Joi.string().min(8),
}).or("email", "password");

exports.register = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const pool = await getPool();
    const existing = await pool
      .request()
      .input("email", sql.NVarChar(255), value.email)
      .query("SELECT id FROM users WHERE email = @email");

    if (existing.recordset.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(value.password, 10);
    await pool
      .request()
      .input("email", sql.NVarChar(255), value.email)
      .input("password_hash", sql.NVarChar(255), passwordHash)
      .query(
        "INSERT INTO users (email, password_hash, role) VALUES (@email, @password_hash, DEFAULT)",
      );

    return res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", sql.NVarChar(255), value.email)
      .query(
        "SELECT id, email, password_hash, role FROM users WHERE email = @email",
      );

    const user = result.recordset[0];
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(value.password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    return res.status(200).json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, req.user.id)
      .query("SELECT id, email, role, created_at FROM users WHERE id = @id");

    if (!result.recordset[0]) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json(result.recordset[0]);
  } catch (err) {
    console.error("Profile fetch error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.updateProfile = async (req, res) => {
  const { error, value } = profileSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ message: error.details[0].message });
  }

  try {
    const pool = await getPool();

    if (value.email) {
      const dup = await pool
        .request()
        .input("email", sql.NVarChar(255), value.email)
        .input("id", sql.Int, req.user.id)
        .query("SELECT id FROM users WHERE email = @email AND id <> @id");
      if (dup.recordset.length > 0) {
        return res.status(409).json({ message: "Email already in use" });
      }
    }

    const email = value.email || req.user.email;
    const passwordHash = value.password
      ? await bcrypt.hash(value.password, 10)
      : null;

    await pool
      .request()
      .input("id", sql.Int, req.user.id)
      .input("email", sql.NVarChar(255), email)
      .input("password_hash", sql.NVarChar(255), passwordHash).query(`
        UPDATE users
        SET email = @email,
            password_hash = COALESCE(@password_hash, password_hash)
        WHERE id = @id
      `);

    return res.status(200).json({ message: "Profile updated" });
  } catch (err) {
    console.error("Profile update error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
