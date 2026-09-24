// Calls the Claude API once per submitted interview to produce:
//   - per-answer score + short feedback (as before)
//   - an overall scorecard (technical/communication/confidence/etc, each 0-10)
//   - personalized feedback (strengths / areas to improve / suggestions)
//   - recommended learning topics
//
// Falls back to a heuristic if the API key is missing or the call fails,
// so the app still works (in degraded mode) without breaking the interview flow.

const MODEL = "claude-haiku-4-5-20251001"; // fast + cheap, good enough for short-answer grading

function heuristicAnswerFeedback(answer) {
  const text = (answer || "").trim();

  // Empty answer
  if (!text) {
    return {
      label: "No answer",
      score: 0,
      tone: "none",
      feedback: "No answer provided."
    };
  }

  if (text.length < 20) {
    return {
      label: "Too short",
      score: 10,
      tone: "short",
      feedback: "Try to add more detail and a concrete example."
    };
  }

  if (text.length <= 100) {
    return {
      label: "Good",
      score: 20,
      tone: "good",
      feedback: "Solid answer — a bit more detail would strengthen it further."
    };
  }

  return {
    label: "Detailed",
    score: 30,
    tone: "detailed",
    feedback: "Thorough, well-developed answer."
  };
}

function heuristicEvaluation(qaPairs, category) {
  const answers = qaPairs.map(({ answer }) => heuristicAnswerFeedback(answer));
  const avgScore = answers.reduce((s, a) => s + a.score, 0) / answers.length; // 0-30
  const normalized = Math.round((avgScore / 30) * 10); // 0-10 scale

  return {
    answers,
    scorecard: {
      technicalKnowledge: normalized,
      communication:      normalized,
      confidence:         normalized,
      problemSolving:     normalized,
      grammar:            normalized,
      fluency:            normalized,
      clarity:            normalized,
      overallPercent:     Math.round((avgScore / 30) * 100)
    },
    feedback: {
      strengths:    ["Completed the full interview.", "Attempted every question."],
      improvements: ["Add more specific examples to your answers.", "Expand on the reasoning behind your answers."],
      suggestions:  ["Practice structuring answers with a clear beginning, middle, and end.", "Review common interview questions for this role."]
    },
    recommendedTopics: category === "technical"
      ? ["Core fundamentals for this role", "Problem-solving practice", "Communication under pressure"]
      : ["Behavioral interview structure (STAR method)", "Concise storytelling", "Confidence-building practice"]
  };
}

async function getAIEvaluation(qaPairs, meta = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const { category = "hr", role = null, difficulty = null } = meta;

  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — using heuristic evaluation fallback.");
    return heuristicEvaluation(qaPairs, category);
  }

  const roleContext = role ? ` for a "${role}" role at ${difficulty || "medium"} difficulty` : "";

  const prompt = `You are an expert interview coach evaluating a candidate's mock interview${roleContext}.

  Step 1 — For each question/answer pair below, give a score from 0-30 and a short 1-2 sentence piece of feedback.

  IMPORTANT:
  - If the answer is blank, empty, contains only whitespace, or is "(no answer given)", you MUST return:
    - score: 0
    - label: "No answer"
    - feedback: "No answer provided."
  - Never award any marks for unanswered questions.
  - Evaluate all other answers normally.

Step 2 — Give an OVERALL scorecard, each rated 0-10: Technical Knowledge, Communication, Confidence, Problem Solving, Grammar, Fluency, Clarity. Also give an Overall Score as a percentage (0-100).

Step 3 — Give personalized feedback: 2-4 genuine strengths, 2-4 areas to improve, and 2-4 concrete suggestions, based specifically on what the candidate actually wrote (not generic advice).

Step 4 — Recommend 4-8 learning topics the candidate should study next, based on gaps in their answers.

Respond with ONLY this JSON object, no other text:
{
  "answers": [{"score": <0-30>, "label": "<2-4 words>", "feedback": "<1-2 sentences>"}],
  "scorecard": {"technicalKnowledge":0-10,"communication":0-10,"confidence":0-10,"problemSolving":0-10,"grammar":0-10,"fluency":0-10,"clarity":0-10,"overallPercent":0-100},
  "feedback": {"strengths": ["..."], "improvements": ["..."], "suggestions": ["..."]},
  "recommendedTopics": ["..."]
}

Q&A pairs:
${qaPairs.map((qa, i) => `${i + 1}. Q: ${qa.question}\nA: ${qa.answer || "(no answer given)"}`).join("\n\n")}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      throw new Error(`Anthropic API responded with status ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.find((block) => block.type === "text")?.text || "";
    const cleaned = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!parsed || !Array.isArray(parsed.answers) || parsed.answers.length !== qaPairs.length) {
      throw new Error("Unexpected AI response shape.");
    }

    const answers = parsed.answers.map((item) => {
      const rawScore = item.score ?? item.grade ?? item.points;
      const score = Math.max(0, Math.min(30, Number(rawScore)));
      return {
        score: Number.isNaN(score) ? 0 : score,
        label: item.label || "Reviewed",
        tone: score >= 25 ? "detailed" : score >= 15 ? "good" : "short",
        feedback: item.feedback || ""
      };
    });

    const clamp10 = (n) => Math.max(0, Math.min(10, Number(n) || 0));
    const sc = parsed.scorecard || {};

    const scorecard = {
      technicalKnowledge: clamp10(sc.technicalKnowledge),
      communication:      clamp10(sc.communication),
      confidence:         clamp10(sc.confidence),
      problemSolving:     clamp10(sc.problemSolving),
      grammar:            clamp10(sc.grammar),
      fluency:             clamp10(sc.fluency),
      clarity:            clamp10(sc.clarity),
      overallPercent:     Math.max(0, Math.min(100, Number(sc.overallPercent) || 0))
    };

    const fb = parsed.feedback || {};
    const feedback = {
      strengths:    Array.isArray(fb.strengths) ? fb.strengths.slice(0, 6) : [],
      improvements: Array.isArray(fb.improvements) ? fb.improvements.slice(0, 6) : [],
      suggestions:  Array.isArray(fb.suggestions) ? fb.suggestions.slice(0, 6) : []
    };

    const recommendedTopics = Array.isArray(parsed.recommendedTopics)
      ? parsed.recommendedTopics.slice(0, 8)
      : [];

    return { answers, scorecard, feedback, recommendedTopics };
  } catch (err) {
    console.error("AI evaluation error, falling back to heuristic:", err.message);
    return heuristicEvaluation(qaPairs, category);
  }
}

module.exports = { getAIEvaluation };
