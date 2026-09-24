const USERS_KEY = "mockmate_users";
const SESSION_KEY = "mockmate_session";
const INTERVIEW_KEY = "mockmate_interview_data";
const RESULTS_KEY = "mockmate_results";
const QUESTION_TIME = 60;
const DEFAULT_CATEGORY = "hr";

const QUESTION_SETS = {
  hr: [
    "Tell me about yourself and what makes you a strong fit for your target role.",
    "Why do you want to work with this company, and what excites you about the opportunity?",
    "Describe a time you solved a difficult problem or handled a challenge under pressure.",
    "How do you handle feedback from a manager or teammate when you disagree at first?",
    "Describe a situation where you worked with a team to achieve a goal."
  ],
  technical: [
    "What is the difference between HTML, CSS, and JavaScript in a web application?",
    "How would you improve the performance or user experience of a slow-loading website?",
    "What is the difference between localStorage, sessionStorage, and cookies?",
    "How would you debug a button click that is not working on a webpage?",
    "Explain the difference between responsive design and adaptive design."
  ]
};

let interviewTimer = null;

// Boot the correct page behavior based on the active HTML file.
document.addEventListener("DOMContentLoaded", () => {
  setupLogoutButtons();
  setupScrollReveal();

  const page = document.body.dataset.page;

  switch (page) {
    case "login":
      if (redirectIfLoggedIn()) {
        return;
      }
      setupLoginPage();
      break;
    case "signup":
      if (redirectIfLoggedIn()) {
        return;
      }
      setupSignupPage();
      break;
    case "dashboard":
      if (!requireAuth()) {
        return;
      }
      setupDashboardPage();
      break;
    case "interview":
      if (!requireAuth()) {
        return;
      }
      setupInterviewPage();
      break;
    case "result":
      if (!requireAuth()) {
        return;
      }
      setupResultPage();
      break;
    default:
      break;
  }
});

// LocalStorage helpers keep the app simple and backend-free.
function getUsers() {
  return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
}

function saveSession(email) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ email }));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function getInterviewData() {
  const storedData = JSON.parse(localStorage.getItem(INTERVIEW_KEY));

  if (!storedData) {
    return createInterviewState(DEFAULT_CATEGORY);
  }

  const category = QUESTION_SETS[storedData.category] ? storedData.category : DEFAULT_CATEGORY;
  const activeQuestions =
    Array.isArray(storedData.questions) && storedData.questions.length
      ? storedData.questions
      : getQuestionsByCategory(category);

  return {
    category,
    questions: activeQuestions,
    currentIndex: Math.min(Math.max(storedData.currentIndex || 0, 0), activeQuestions.length),
    timeLeft:
      typeof storedData.timeLeft === "number" && storedData.timeLeft > 0
        ? storedData.timeLeft
        : QUESTION_TIME,
    answers: activeQuestions.map((_, index) => storedData.answers?.[index] || "")
  };
}

function saveInterviewData(data) {
  localStorage.setItem(INTERVIEW_KEY, JSON.stringify(data));
}

function clearInterviewData() {
  localStorage.removeItem(INTERVIEW_KEY);
}

function getResults() {
  return JSON.parse(localStorage.getItem(RESULTS_KEY)) || {};
}

function saveResults(results) {
  localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
}

function getQuestionsByCategory(category) {
  return QUESTION_SETS[category] || QUESTION_SETS[DEFAULT_CATEGORY];
}

function formatCategoryLabel(category) {
  if (category === "technical") {
    return "Technical Interview";
  }

  if (category === "general") {
    return "General Interview";
  }

  return "HR Interview";
}

function createInterviewState(category) {
  const questions = getQuestionsByCategory(category);

  return {
    category,
    questions,
    currentIndex: 0,
    timeLeft: QUESTION_TIME,
    answers: Array(questions.length).fill("")
  };
}

function getTotalPossibleScore(questionCount) {
  return questionCount * 30;
}

function getAnswerText(answerItem) {
  if (typeof answerItem === "string") {
    return answerItem;
  }

  return answerItem?.answer || "";
}

function normalizeUserResult(entry) {
  if (!entry) {
    return {
      latestCategory: null,
      categories: {}
    };
  }

  if (entry.categories) {
    const normalizedCategories = Object.entries(entry.categories).reduce(
      (collection, [category, result]) => {
        collection[category] = {
          category: result.category || category,
          totalScore: result.totalScore || 0,
          answers: Array.isArray(result.answers) ? result.answers : [],
          questionCount:
            result.questionCount ||
            (Array.isArray(result.answers) ? result.answers.length : getQuestionsByCategory(category).length),
          completedAt: result.completedAt || "Saved previously"
        };
        return collection;
      },
      {}
    );

    return {
      latestCategory: entry.latestCategory || Object.keys(normalizedCategories)[0] || null,
      categories: normalizedCategories
    };
  }

  if (Array.isArray(entry.answers)) {
    return {
      latestCategory: "general",
      categories: {
        general: {
          category: "general",
          totalScore: entry.totalScore || 0,
          answers: entry.answers,
          questionCount: entry.answers.length,
          completedAt: entry.completedAt || "Saved previously"
        }
      }
    };
  }

  return {
    latestCategory: null,
    categories: {}
  };
}

function getUserResultBundle(email) {
  return normalizeUserResult(getResults()[email]);
}

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = "index.html";
    return null;
  }

  return session;
}

function redirectIfLoggedIn() {
  if (getSession()) {
    window.location.href = "dashboard.html";
    return true;
  }

  return false;
}

function setupScrollReveal() {
  const revealElements = document.querySelectorAll(".reveal-on-scroll");
  if (!revealElements.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  document.body.classList.add("reveal-ready");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18
    }
  );

  revealElements.forEach((element) => observer.observe(element));
}

function setupLogoutButtons() {
  document.querySelectorAll("#logoutBtn, #logoutHeroBtn").forEach((button) => {
    button.addEventListener("click", logoutUser);
  });
}

function logoutUser() {
  clearSession();
  clearInterviewData();
  window.location.href = "index.html";
}

function showMessage(elementId, message, type) {
  const messageElement = document.getElementById(elementId);
  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.className = `status-message ${type}`;
}

function setupLoginPage() {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim();
    const users = getUsers();

    const matchedUser = users.find(
      (user) => user.email === email && user.password === password
    );

    if (!matchedUser) {
      showMessage("loginMessage", "Invalid email or password.", "error");
      return;
    }

    saveSession(email);
    showMessage("loginMessage", "Login successful. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  });
}

function setupSignupPage() {
  const signupForm = document.getElementById("signupForm");

  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("signupEmail").value.trim().toLowerCase();
    const password = document.getElementById("signupPassword").value.trim();
    const users = getUsers();

    const existingUser = users.find((user) => user.email === email);

    if (existingUser) {
      showMessage("signupMessage", "This email is already registered.", "error");
      return;
    }

    users.push({ email, password });
    saveUsers(users);
    saveSession(email);
    showMessage("signupMessage", "Account created. Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  });
}

function setupDashboardPage() {
  const session = getSession();
  const userResultBundle = getUserResultBundle(session.email);
  const latestCategory = userResultBundle.latestCategory;
  const latestResult = latestCategory ? userResultBundle.categories[latestCategory] : null;
  const welcomeMessage = document.getElementById("welcomeMessage");
  const latestScore = document.getElementById("latestScore");
  const latestSummary = document.getElementById("latestSummary");
  const hrTrackMeta = document.getElementById("hrTrackMeta");
  const technicalTrackMeta = document.getElementById("technicalTrackMeta");
  const startHrInterviewBtn = document.getElementById("startHrInterviewBtn");
  const startTechnicalInterviewBtn = document.getElementById("startTechnicalInterviewBtn");

  welcomeMessage.textContent = `Welcome, ${session.email}`;

  if (latestResult) {
    const answeredCount = latestResult.answers.filter((item) => getAnswerText(item).trim()).length;
    latestScore.textContent = `${latestResult.totalScore} / ${getTotalPossibleScore(latestResult.questionCount)}`;
    latestSummary.textContent = `${formatCategoryLabel(latestResult.category)} completed on ${latestResult.completedAt} with ${answeredCount}/${latestResult.questionCount} answered questions.`;
  }

  const hrResult = userResultBundle.categories.hr;
  const technicalResult = userResultBundle.categories.technical;

  if (hrResult) {
    hrTrackMeta.textContent = `Last HR score: ${hrResult.totalScore} / ${getTotalPossibleScore(hrResult.questionCount)}`;
  }

  if (technicalResult) {
    technicalTrackMeta.textContent = `Last technical score: ${technicalResult.totalScore} / ${getTotalPossibleScore(technicalResult.questionCount)}`;
  }

  startHrInterviewBtn.addEventListener("click", () => {
    saveInterviewData(createInterviewState("hr"));
    window.location.href = "interview.html";
  });

  startTechnicalInterviewBtn.addEventListener("click", () => {
    saveInterviewData(createInterviewState("technical"));
    window.location.href = "interview.html";
  });
}

function setupInterviewPage() {
  let interviewData = getInterviewData();
  const answerInput = document.getElementById("answerInput");
  const nextQuestionBtn = document.getElementById("nextQuestionBtn");

  renderQuestion(interviewData);

  answerInput.addEventListener("input", () => {
    interviewData.answers[interviewData.currentIndex] = answerInput.value.trim();
    saveInterviewData(interviewData);
  });

  nextQuestionBtn.addEventListener("click", () => {
    moveToNextQuestion(interviewData);
  });
}

function renderQuestion(interviewData) {
  const activeQuestions = interviewData.questions;
  const totalQuestions = activeQuestions.length;
  const currentIndex = interviewData.currentIndex;
  const questionText = document.getElementById("questionText");
  const answerInput = document.getElementById("answerInput");
  const nextQuestionBtn = document.getElementById("nextQuestionBtn");
  const interviewCategory = document.getElementById("interviewCategory");
  const progressLabel = document.getElementById("progressLabel");
  const progressText = document.getElementById("progressText");
  const progressFill = document.getElementById("progressFill");

  if (currentIndex >= totalQuestions) {
    finalizeInterview(interviewData);
    return;
  }

  interviewCategory.textContent = formatCategoryLabel(interviewData.category);
  questionText.textContent = activeQuestions[currentIndex];
  answerInput.value = interviewData.answers[currentIndex] || "";
  progressLabel.textContent = `Question ${currentIndex + 1} / ${totalQuestions}`;

  const percent = Math.round(((currentIndex + 1) / totalQuestions) * 100);
  progressText.textContent = `${percent}%`;
  progressFill.style.width = `${percent}%`;
  nextQuestionBtn.innerHTML =
    currentIndex === totalQuestions - 1
      ? 'Finish Interview <i class="fa-solid fa-check"></i>'
      : 'Next Question <i class="fa-solid fa-arrow-right"></i>';

  startQuestionTimer(interviewData);
}

function startQuestionTimer(interviewData) {
  clearInterval(interviewTimer);
  updateTimerDisplay(interviewData.timeLeft);

  interviewTimer = setInterval(() => {
    interviewData.timeLeft -= 1;
    saveInterviewData(interviewData);
    updateTimerDisplay(interviewData.timeLeft);

    if (interviewData.timeLeft <= 0) {
      moveToNextQuestion(interviewData);
    }
  }, 1000);
}

function updateTimerDisplay(timeLeft) {
  const timerDisplay = document.getElementById("timerDisplay");
  if (!timerDisplay) {
    return;
  }

  const safeTime = Math.max(timeLeft, 0);
  timerDisplay.querySelector("span").textContent = `${safeTime}s`;
}

function moveToNextQuestion(interviewData) {
  const answerInput = document.getElementById("answerInput");
  const totalQuestions = interviewData.questions.length;

  interviewData.answers[interviewData.currentIndex] = answerInput.value.trim();
  interviewData.currentIndex += 1;
  interviewData.timeLeft = QUESTION_TIME;
  saveInterviewData(interviewData);

  if (interviewData.currentIndex >= totalQuestions) {
    finalizeInterview(interviewData);
    return;
  }

  renderQuestion(interviewData);
}

function finalizeInterview(interviewData) {
  clearInterval(interviewTimer);

  const session = getSession();
  const activeQuestions = interviewData.questions;
  const answersWithFeedback = activeQuestions.map((question, index) => {
    const answer = interviewData.answers[index] || "";
    const feedback = getFeedback(answer);

    return {
      question,
      answer,
      feedback: feedback.label,
      score: feedback.score,
      length: answer.length
    };
  });

  const totalScore = answersWithFeedback.reduce((total, item) => total + item.score, 0);
  const results = getResults();
  const userResultBundle = getUserResultBundle(session.email);
  const updatedUserResult = {
    latestCategory: interviewData.category,
    categories: {
      ...userResultBundle.categories,
      [interviewData.category]: {
        category: interviewData.category,
        totalScore,
        questionCount: activeQuestions.length,
        answers: answersWithFeedback,
        completedAt: new Date().toLocaleString()
      }
    }
  };

  results[session.email] = updatedUserResult;

  saveResults(results);
  clearInterviewData();
  window.location.href = "result.html";
}

// Feedback is intentionally simple so it stays easy to understand.
function getFeedback(answer) {
  if (answer.length < 20) {
    return { label: "Too short", score: 10, tone: "short" };
  }

  if (answer.length <= 100) {
    return { label: "Good", score: 20, tone: "good" };
  }

  return { label: "Detailed", score: 30, tone: "detailed" };
}

function setupResultPage() {
  const session = getSession();
  const userResultBundle = getUserResultBundle(session.email);
  const latestCategory = userResultBundle.latestCategory;
  const userResult = latestCategory ? userResultBundle.categories[latestCategory] : null;
  const resultList = document.getElementById("resultList");
  const resultCategoryLabel = document.getElementById("resultCategoryLabel");
  const scoreValue = document.getElementById("scoreValue");
  const restartInterviewBtn = document.getElementById("restartInterviewBtn");

  if (!userResult) {
    resultList.innerHTML = `
      <article class="card empty-state">
        <h2>No results found</h2>
        <p class="question-hint">Start a mock interview first to see your feedback here.</p>
      </article>
    `;
    return;
  }

  resultCategoryLabel.textContent = `${formatCategoryLabel(userResult.category)} Results`;
  scoreValue.textContent = `${userResult.totalScore} / ${getTotalPossibleScore(userResult.questionCount)}`;

  resultList.innerHTML = userResult.answers
    .map((item, index) => {
      const feedback = getFeedback(item.answer);

      return `
        <article class="card result-card">
          <div class="result-header">
            <h3>Question ${index + 1}</h3>
            <span class="feedback-badge ${feedback.tone}">
              <i class="fa-solid fa-circle-check"></i>
              ${feedback.label}
            </span>
          </div>
          <p>${item.question}</p>
          <div class="result-answer">${item.answer || "No answer submitted."}</div>
          <div class="result-meta">
            <span>${item.length} characters</span>
            <strong>${item.score} points</strong>
          </div>
        </article>
      `;
    })
    .join("");

  restartInterviewBtn.addEventListener("click", () => {
    saveInterviewData(createInterviewState(userResult.category === "general" ? DEFAULT_CATEGORY : userResult.category));
    window.location.href = "interview.html";
  });
}
