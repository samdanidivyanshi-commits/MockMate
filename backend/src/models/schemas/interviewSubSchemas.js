const mongoose = require("mongoose");

// A single answered question with AI feedback
const answerSchema = new mongoose.Schema(
  {
    question:     { type: String, required: true },
    answer:       { type: String, default: "" },
    feedback:     { type: String, default: "Too short" }, // short label, e.g. "Strong answer"
    feedbackText: { type: String, default: "" },           // 1-2 sentence AI explanation
    score:        { type: Number, default: 0 },
    length:       { type: Number, default: 0 }
  },
  { _id: false }
);

// AI-generated scorecard (each metric 0-10, overallPercent 0-100)
const scorecardSchema = new mongoose.Schema(
  {
    technicalKnowledge: { type: Number, default: 0 },
    communication:      { type: Number, default: 0 },
    confidence:         { type: Number, default: 0 },
    problemSolving:     { type: Number, default: 0 },
    grammar:            { type: Number, default: 0 },
    fluency:            { type: Number, default: 0 },
    clarity:            { type: Number, default: 0 },
    overallPercent:     { type: Number, default: 0 }
  },
  { _id: false }
);

// Personalized feedback summary
const feedbackSummarySchema = new mongoose.Schema(
  {
    strengths:    [{ type: String }],
    improvements: [{ type: String }],
    suggestions:  [{ type: String }]
  },
  { _id: false }
);

module.exports = { answerSchema, scorecardSchema, feedbackSummarySchema };
