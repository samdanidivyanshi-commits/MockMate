const express = require("express");
const Result  = require("../models/Result");
const InterviewHistory = require("../models/InterviewHistory");
const { protect } = require("../middleware/auth");
const { getAIEvaluation } = require("../services/aiFeedback");

const router = express.Router();

// All result routes require a valid JWT
router.use(protect);

// ─── GET /api/results ─────────────────────────────────
// Returns the "latest attempt per category" bundle for the logged-in user
// (used by the dashboard and result page). Full history lives at /api/history.
router.get("/", async (req, res) => {
  try {
    const result = await Result.findOne({ user: req.user._id });

    if (!result) {
      // No attempts yet — return an empty structure matching the frontend shape
      return res.json({
        success: true,
        data: {
          latestCategory: null,
          categories: {}
        }
      });
    }

    // Convert Mongoose doc to a plain object; strip internal Mongo fields
    const categories = {};
    ["hr", "technical", "custom"].forEach((cat) => {
      if (result.categories[cat]) {
        const r = result.categories[cat];
        categories[cat] = {
          category:          r.category,
          role:              r.role,
          difficulty:        r.difficulty,
          totalScore:        r.totalScore,
          questionCount:     r.questionCount,
          durationSeconds:   r.durationSeconds,
          answers:           r.answers,
          scorecard:         r.scorecard,
          feedbackSummary:   r.feedbackSummary,
          recommendedTopics: r.recommendedTopics,
          completedAt:       r.completedAt.toLocaleString()
        };
      }
    });

    return res.json({
      success: true,
      data: {
        latestCategory: result.latestCategory,
        categories
      }
    });
  } catch (err) {
    console.error("Get results error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch results." });
  }
});

// ─── POST /api/results ────────────────────────────────
// Save results for one completed interview session. This:
//   1. Grades every answer + generates a full scorecard/feedback/topics via AI
//   2. Updates Result with the LATEST attempt for that category (dashboard display)
//   3. Appends a new InterviewHistory record (full audit trail for History + Progress)
//
// Expected body:
// {
//   category: "hr" | "technical" | "custom",
//   role: "Backend Developer",          // required only when category === "custom"
//   difficulty: "easy"|"medium"|"hard", // required only when category === "custom"
//   questionCount: 5,
//   durationSeconds: 240,                // optional, how long the interview took
//   answers: [{ question, answer }, ...] // feedback/score are computed here, not trusted from client
// }
router.post("/", async (req, res) => {
  try {
    const { category, role, difficulty, questionCount, durationSeconds, answers } = req.body;

    if (!category || !["hr", "technical", "custom"].includes(category)) {
      return res.status(400).json({ success: false, message: "category must be 'hr', 'technical', or 'custom'." });
    }

    if (category === "custom" && (!role || !difficulty)) {
      return res.status(400).json({ success: false, message: "role and difficulty are required for a custom interview." });
    }

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: "answers array is required." });
    }

    // Grade + evaluate server-side via AI so scores can't be spoofed from the
    // client and so the frontend never needs an API key.
    const evaluation = await getAIEvaluation(
      answers.map((a) => ({ question: a.question, answer: a.answer })),
      { category, role: category === "custom" ? role : null, difficulty: category === "custom" ? difficulty : null }
    );

    const gradedAnswers = answers.map((a, i) => {
      const isEmpty = !a.answer || a.answer.trim() === "";
    
      return {
        question: a.question,
        answer: a.answer,
        feedback: isEmpty
          ? "No answer"
          : (evaluation.answers[i]?.label || "Reviewed"),
        feedbackText: isEmpty
          ? "No answer provided."
          : (evaluation.answers[i]?.feedback || ""),
        score: isEmpty
          ? 0
          : (evaluation.answers[i]?.score || 0),
        length: (a.answer || "").length
      };
    });

    const totalScore = gradedAnswers.reduce((sum, a) => sum + a.score, 0);

    const sharedData = {
      category,
      role:               category === "custom" ? role : null,
      difficulty:         category === "custom" ? difficulty : null,
      totalScore,
      questionCount:      questionCount || answers.length,
      durationSeconds:    Number(durationSeconds) || 0,
      answers:            gradedAnswers,
      scorecard:          evaluation.scorecard,
      feedbackSummary:    evaluation.feedback,
      recommendedTopics:  evaluation.recommendedTopics
    };

    const categoryData = { ...sharedData, completedAt: new Date() };

    // 1) Update the "latest per category" snapshot (dashboard/result page)
    const result = await Result.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          latestCategory:              category,
          [`categories.${category}`]: categoryData
        }
      },
      { new: true, upsert: true, runValidators: true }
    );

    // 2) Append a permanent history record (History page / Progress dashboard).
    // This never overwrites — every submission adds a new row.
    const historyRecord = await InterviewHistory.create({
      user: req.user._id,
      ...sharedData,
      status: "completed",
      completedAt: categoryData.completedAt
    });

    return res.status(201).json({
      success: true,
      message: "Results saved successfully.",
      data: {
        latestCategory: result.latestCategory,
        category:       categoryData,
        historyId:      historyRecord._id
      }
    });
  } catch (err) {
    console.error("Save results error:", err);
    return res.status(500).json({ success: false, message: "Could not save results." });
  }
});

// ─── DELETE /api/results/:category ───────────────────
// Clear the "latest attempt" snapshot for a specific category (optional utility).
// Does not delete history — history is a permanent record of past interviews.
router.delete("/:category", async (req, res) => {
  try {
    const { category } = req.params;
    if (!["hr", "technical", "custom"].includes(category)) {
      return res.status(400).json({ success: false, message: "Invalid category." });
    }

    await Result.findOneAndUpdate(
      { user: req.user._id },
      { $unset: { [`categories.${category}`]: "" } }
    );

    return res.json({ success: true, message: `${category} results cleared.` });
  } catch (err) {
    console.error("Delete results error:", err);
    return res.status(500).json({ success: false, message: "Could not clear results." });
  }
});

module.exports = router;
