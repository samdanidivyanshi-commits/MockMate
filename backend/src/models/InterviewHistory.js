const mongoose = require("mongoose");
const { answerSchema, scorecardSchema, feedbackSummarySchema } = require("./schemas/interviewSubSchemas");

// One document per completed interview attempt. Unlike Result (which only
// keeps the latest attempt per category for quick dashboard display), every
// submission creates a new InterviewHistory record — this is what powers the
// History page and the Progress Dashboard's charts.
const interviewHistorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    category:          { type: String, required: true }, // "hr" | "technical" | "custom"
    role:              { type: String, default: null },   // only set for category "custom"
    difficulty:        { type: String, default: null },   // only set for category "custom"
    questionCount:     { type: Number, default: 5 },
    durationSeconds:   { type: Number, default: 0 },
    totalScore:        { type: Number, default: 0 },
    answers:           [answerSchema],
    scorecard:         { type: scorecardSchema, default: () => ({}) },
    feedbackSummary:   { type: feedbackSummarySchema, default: () => ({}) },
    recommendedTopics: [{ type: String }],
    status:            { type: String, default: "completed" }, // room to add "in_progress"/"abandoned" later
    completedAt:       { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewHistory", interviewHistorySchema);
