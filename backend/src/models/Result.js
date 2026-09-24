const mongoose = require("mongoose");
const { answerSchema, scorecardSchema, feedbackSummarySchema } = require("./schemas/interviewSubSchemas");

// One completed attempt for a category (hr | technical | custom) — always
// holds only the MOST RECENT attempt per category, for quick dashboard display.
// Full history of every attempt lives in the separate InterviewHistory model.
const categoryResultSchema = new mongoose.Schema(
  {
    category:         { type: String, required: true },
    role:             { type: String, default: null }, // only set for category "custom"
    difficulty:       { type: String, default: null }, // only set for category "custom"
    totalScore:       { type: Number, default: 0 },
    questionCount:    { type: Number, default: 5 },
    durationSeconds:  { type: Number, default: 0 },
    answers:          [answerSchema],
    scorecard:        { type: scorecardSchema, default: () => ({}) },
    feedbackSummary:  { type: feedbackSummarySchema, default: () => ({}) },
    recommendedTopics: [{ type: String }],
    completedAt:      { type: Date, default: Date.now }
  },
  { _id: false }
);

// Top-level document — one per user
const resultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true   // one result-doc per user, categories stored inside
    },
    latestCategory: { type: String, default: null },
    categories: {
      hr:        { type: categoryResultSchema, default: null },
      technical: { type: categoryResultSchema, default: null },
      custom:    { type: categoryResultSchema, default: null } // latest AI role-based interview
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Result", resultSchema);
