const express = require("express");
const InterviewHistory = require("../models/InterviewHistory");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

function formatCategoryLabel(entry) {
  if (entry.category === "custom") {
    const diff = entry.difficulty ? entry.difficulty[0].toUpperCase() + entry.difficulty.slice(1) : "";
    return `${entry.role || "Custom"} (${diff})`;
  }
  return entry.category === "technical" ? "Technical Interview" : "HR Interview";
}

// ─── GET /api/history ─────────────────────────────────
// List every completed interview for the logged-in user, newest first.
router.get("/", async (req, res) => {
  try {
    const entries = await InterviewHistory.find({ user: req.user._id })
      .sort({ completedAt: -1 })
      .select("category role difficulty questionCount durationSeconds totalScore scorecard status completedAt");

    const list = entries.map((e) => ({
      id:              e._id,
      category:        e.category,
      role:            e.role,
      difficulty:      e.difficulty,
      label:           formatCategoryLabel(e),
      questionCount:   e.questionCount,
      durationSeconds: e.durationSeconds,
      totalScore:      e.totalScore,
      overallPercent:  e.scorecard?.overallPercent ?? 0,
      status:          e.status,
      completedAt:     e.completedAt
    }));

    return res.json({ success: true, data: list });
  } catch (err) {
    console.error("List history error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch interview history." });
  }
});

// ─── GET /api/history/stats/progress ──────────────────
// Aggregated stats + chart-ready time series for the Progress Dashboard.
// NOTE: this must be declared BEFORE the /:id route below, otherwise
// Express would match "stats" as an :id value and this route would never fire.
router.get("/stats/progress", async (req, res) => {
  try {
    const entries = await InterviewHistory.find({ user: req.user._id })
      .sort({ completedAt: 1 }) // oldest -> newest, so charts read left-to-right chronologically
      .select("totalScore questionCount scorecard completedAt category role difficulty");

    if (entries.length === 0) {
      return res.json({
        success: true,
        data: {
          totalInterviews: 0,
          averageScore: 0,
          highestScore: 0,
          latestScore: 0,
          averageTechnical: 0,
          averageCommunication: 0,
          series: { labels: [], overall: [], technical: [], communication: [], confidence: [] }
        }
      });
    }

    const percentScores = entries.map((e) => e.scorecard?.overallPercent ?? 0);
    const technicalScores = entries.map((e) => e.scorecard?.technicalKnowledge ?? 0);
    const communicationScores = entries.map((e) => e.scorecard?.communication ?? 0);
    const confidenceScores = entries.map((e) => e.scorecard?.confidence ?? 0);

    const avg = (arr) => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;

    return res.json({
      success: true,
      data: {
        totalInterviews:      entries.length,
        averageScore:         avg(percentScores),
        highestScore:         Math.max(...percentScores),
        latestScore:          percentScores[percentScores.length - 1],
        averageTechnical:     avg(technicalScores),
        averageCommunication: avg(communicationScores),
        series: {
          labels:       entries.map((e) => e.completedAt.toLocaleDateString()),
          overall:      percentScores,
          technical:    technicalScores,
          communication: communicationScores,
          confidence:   confidenceScores
        }
      }
    });
  } catch (err) {
    console.error("Progress stats error:", err);
    return res.status(500).json({ success: false, message: "Could not compute progress stats." });
  }
});

// ─── GET /api/history/:id ─────────────────────────────
// Full detail of a single past interview (questions, answers, scorecard, feedback, topics).
router.get("/:id", async (req, res) => {
  try {
    const entry = await InterviewHistory.findOne({ _id: req.params.id, user: req.user._id });

    if (!entry) {
      return res.status(404).json({ success: false, message: "Interview not found." });
    }

    return res.json({
      success: true,
      data: {
        id:                 entry._id,
        category:           entry.category,
        role:               entry.role,
        difficulty:         entry.difficulty,
        label:              formatCategoryLabel(entry),
        questionCount:      entry.questionCount,
        durationSeconds:    entry.durationSeconds,
        totalScore:         entry.totalScore,
        answers:            entry.answers,
        scorecard:          entry.scorecard,
        feedbackSummary:    entry.feedbackSummary,
        recommendedTopics:  entry.recommendedTopics,
        status:             entry.status,
        completedAt:        entry.completedAt.toLocaleString()
      }
    });
  } catch (err) {
    console.error("Get history detail error:", err);
    return res.status(500).json({ success: false, message: "Could not fetch this interview." });
  }
});

module.exports = router;
