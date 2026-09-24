require("dotenv").config();

const express  = require("express");
const cors     = require("cors");
const connectDB = require("./config/db");

const authRoutes    = require("./routes/auth");
const resultsRoutes = require("./routes/results");
const interviewRoutes = require("./routes/interview");
const historyRoutes = require("./routes/history");

const app = express();

// ─── Middleware ────────────────────────────────────────
app.use(express.json());

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true
  })
);

// ─── Routes ────────────────────────────────────────────
app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});

app.use("/api/auth", authRoutes);
app.use("/api/results", resultsRoutes);
app.use("/api/interview", interviewRoutes);
app.use("/api/history", historyRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Central error handler (catches anything thrown/next(err) in routes)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Something went wrong." });
});

// ─── Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀  MockMate API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌  Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
