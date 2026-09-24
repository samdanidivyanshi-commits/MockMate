// Calls the Gemini API to generate role- and difficulty-specific interview questions.
// set of interview questions. Falls back to a generic role-based template
// if no API key is configured or the call fails, so interviews never break.

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
  generationConfig: {
    temperature: 1.2,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 4096
  }
});
const DIFFICULTY_GUIDANCE = {
  easy:   "fresher / entry-level, testing fundamentals",
  medium: "mid-level, testing practical application and some depth",
  hard:   "senior-level, testing deep understanding, tradeoffs, and edge cases"
};

function fallbackQuestions(interviewType, role, difficulty) {
    if (interviewType === "hr") {
      return [
        { type: "hr", text: "Tell me about yourself." },
        { type: "hr", text: `Why do you want to become a ${role}?` },
        { type: "hr", text: "What are your strengths and weaknesses?" },
        { type: "hr", text: "Describe a challenging situation and how you handled it." },
        { type: "hr", text: "Where do you see yourself in the next five years?" }
      ];
    }
  
    return [
      { type: "technical", text: `Explain the core concepts of ${role}.` },
      { type: "technical", text: `Solve a ${difficulty} level problem related to ${role}.` },
      { type: "technical", text: `What technologies and tools are commonly used by a ${role}?` },
      { type: "technical", text: `How would you debug an issue in a ${role} project?` },
      { type: "technical", text: `What are the most common challenges faced by a ${role}?` }
    ];
  }

async function generateQuestions({ interviewType, role, difficulty, questionCount = 5 }) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY not set — using fallback questions.");
    return fallbackQuestions(interviewType, role, difficulty);
  }
  const interviewId = Date.now();


  const prompt = `
  You are a senior interviewer at companies like Google, Amazon and Microsoft.
  
  Generate EXACTLY ${questionCount} ${difficulty}-level ${interviewType} interview questions for the role "${role}".
  
  Interview ID: ${Date.now()}
  
  Rules:
- Generate EXACTLY ${questionCount} questions.
- Every interview MUST be different.
- Never repeat previous questions.
- Each question must be less than 25 words.
- Keep questions concise and interview-style.
- Do NOT include explanations or sample answers.
- Return ONLY a valid JSON array.
-Return plain JSON only. Do not use markdown or code blocks.
- For technical interviews, ask practical coding, debugging, project and system design questions.
- For HR interviews, ask behavioural and situational questions.
  
  Format:
  [
    {
      "type":"${interviewType}",
      "text":"Question"
    }
  ]
  `;

  try {
    const result = await model.generateContent(prompt);
  
    const text = result.response.text();
  
    console.log("===== RAW GEMINI RESPONSE =====");
    console.log(text);
    console.log("===============================");
  
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
  
    let parsed;
  
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error("Invalid JSON received from Gemini");
      return fallbackQuestions(interviewType, role, difficulty);
    }
  
    return parsed.map((q) => ({
      type: q.type === "hr" ? "hr" : "technical",
      text: q.text.trim(),
    }));
  } catch (err) {
    console.error("Gemini Error:", err);
    return fallbackQuestions(interviewType, role, difficulty);
  }
  }
  
  module.exports = { generateQuestions };