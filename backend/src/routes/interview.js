const express = require("express");
const { protect } = require("../middleware/auth");
const { generateQuestions } = require("../services/aiQuestions");

const router = express.Router();

const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

// POST /api/interview/generate-questions
// body: { role: "Backend Developer", difficulty: "medium", questionCount?: 5 }
router.post("/generate-questions", protect, async (req, res) => {
  console.log("🚀 /generate-questions route hit");
  try {
    const { interviewType, role, difficulty, questionCount } = req.body;

    if (!role || typeof role !== "string" || !role.trim()) {
      return res.status(400).json({ success: false, message: "A role is required." });
    }
    if (!interviewType || !["hr", "technical"].includes(interviewType)) {
      return res.status(400).json({
        success: false,
        message: "Interview type must be hr or technical."
      });
    }

    if (!difficulty || !VALID_DIFFICULTIES.includes(difficulty)) {
      return res.status(400).json({ success: false, message: "difficulty must be easy, medium, or hard." });
    }

    const count = Number.isInteger(questionCount) && questionCount > 0 && questionCount <= 10
      ? questionCount
      : 5;
      console.log("Interview Type:", interviewType);
      console.log("Role:", role);
      console.log("Difficulty:", difficulty);

      const questions = await generateQuestions({
        interviewType,
        role: role.trim(),
        difficulty,
        questionCount: count
      });

      return res.status(200).json({
        success: true,
        interviewType,
        role: role.trim(),
        difficulty,
        questions
      });
  } catch (err) {
    console.error("generate-questions error:", err);
    return res.status(500).json({ success: false, message: "Could not generate questions. Please try again." });
  }
});

module.exports = router;
