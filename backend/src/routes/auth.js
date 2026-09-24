const express  = require("express");
const jwt      = require("jsonwebtoken");
const User     = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Helper — sign a JWT and return it
function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  });
}

// Helper — send response with token
function sendToken(res, user, statusCode = 200) {
  const token = signToken(user._id);

  return res.status(statusCode).json({
    success: true,
    token,
    user: {
      id:    user._id,
      email: user.email
    }
  });
}

// ─── POST /api/auth/signup ─────────────────────────────
router.post("/signup", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "This email is already registered." });
    }

    const user = await User.create({ email, password });
    return sendToken(res, user, 201);
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ success: false, message: "Server error during signup." });
  }
});

// ─── POST /api/auth/login ──────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    // Explicitly select password since it is hidden by default
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    return sendToken(res, user);
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ success: false, message: "Server error during login." });
  }
});

// ─── GET /api/auth/me  (protected) ────────────────────
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: {
      id:    req.user._id,
      email: req.user.email
    }
  });
});

// ─── POST /api/auth/logout ─────────────────────────────
// Stateless JWT — client just drops the token.
// This endpoint is a convenience no-op for semantic correctness.
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully." });
});

module.exports = router;
