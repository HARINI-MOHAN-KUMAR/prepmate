import express, { Response } from "express";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import { 
  generateToken, 
  requireAuth, 
  AuthenticatedRequest,
  hashPassword,
  verifyPassword
} from "./auth";
import { 
  evaluateTurnOrAsk, 
  generateFinalReport, 
  getEmbedding, 
  isGeminiConfigured,
  chatWithAssistant
} from "./gemini";
import { 
  ExperienceLevel, 
  SessionStatus, 
  InterviewTurn,
  AssistantChatMessage
} from "../src/types";

const router = express.Router();

// Rate limiter for authentication endpoints to prevent brute-force abuse
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// --- AUTH ENDPOINTS ---

router.post("/auth/register", authLimiter, (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const emailStr = String(email).trim().toLowerCase();
    const existing = db.findUserByEmail(emailStr);
    if (existing) {
      return res.status(400).json({ error: "Email already registered. Please log in." });
    }

    // Hash password if provided (optional for backwards compatibility)
    const passwordHash = password ? hashPassword(String(password)) : undefined;
    const user = db.createUser(name, emailStr, passwordHash);
    const token = generateToken({ id: user.id, email: user.email });
    
    return res.status(201).json({ user, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.post("/auth/login", authLimiter, (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const emailStr = String(email).trim().toLowerCase();
    const user = db.findUserByEmail(emailStr);
    if (!user) {
      // Auto-create user on first login for demo convenience
      const defaultName = emailStr.split("@")[0];
      const passwordHash = password ? hashPassword(String(password)) : undefined;
      const newUser = db.createUser(defaultName.charAt(0).toUpperCase() + defaultName.slice(1), emailStr, passwordHash);
      const token = generateToken({ id: newUser.id, email: newUser.email });
      return res.status(200).json({ user: newUser, token });
    }

    // Verify password if the account has one set
    if (user.passwordHash && password) {
      if (!verifyPassword(String(password), user.passwordHash)) {
        return res.status(401).json({ error: "Incorrect password. Please try again." });
      }
    }

    const token = generateToken({ id: user.id, email: user.email });
    return res.status(200).json({ user, token });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res) => {
  return res.json({ user: req.user, geminiConfigured: isGeminiConfigured() });
});

// --- SESSIONS & INTERVIEW ENDPOINTS ---

// Get all sessions for current user
router.get("/sessions", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const sessions = db.getSessionsByUserId(userId);
    // Sort by created date descending
    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json(sessions);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get detailed session info
router.get("/sessions/:id", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const session = db.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    return res.json(session);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Start a new mock interview session
router.post("/sessions", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { targetRole, experienceLevel, maxTurns = 5, targetCompany, practiceMode, timerSeconds, resumeText } = req.body;
    if (!targetRole || !experienceLevel) {
      return res.status(400).json({ error: "Target role and experience level are required" });
    }

    // Determine if weakness drill is requested and calculate lowest scoring dimension from past sessions
    let focusDimension: string | undefined = undefined;
    let chosenPracticeMode: "standard" | "weakness-drill" = practiceMode || "standard";

    if (chosenPracticeMode === "weakness-drill") {
      const pastSessions = db.getSessionsByUserId(req.user!.id).filter(s => s.status === SessionStatus.COMPLETED);
      if (pastSessions.length > 0) {
        let correctnessSum = 0, depthSum = 0, communicationSum = 0, problemSolvingSum = 0, scoredTurnsCount = 0;
        pastSessions.forEach(ps => {
          ps.turns.forEach(t => {
            if (t.scores) {
              correctnessSum += t.scores.correctness;
              depthSum += t.scores.depth;
              communicationSum += t.scores.communication;
              problemSolvingSum += t.scores.problem_solving;
              scoredTurnsCount++;
            }
          });
        });

        if (scoredTurnsCount > 0) {
          const avgCorrectness = correctnessSum / scoredTurnsCount;
          const avgDepth = depthSum / scoredTurnsCount;
          const avgCommunication = communicationSum / scoredTurnsCount;
          const avgProblemSolving = problemSolvingSum / scoredTurnsCount;

          const dimensions = [
            { name: "Correctness", score: avgCorrectness },
            { name: "Depth", score: avgDepth },
            { name: "Communication", score: avgCommunication },
            { name: "Problem Solving", score: avgProblemSolving }
          ];
          dimensions.sort((a, b) => a.score - b.score);
          focusDimension = dimensions[0].name;
        } else {
          // Default fallback dimension if no turns are scored yet
          focusDimension = "Depth";
        }
      } else {
        // Default fallback dimension if no past sessions exist yet
        focusDimension = "Depth";
      }
    }

    // 1. Create the session in database
    const session = db.createSession(
      req.user!.id, 
      req.user!.name,
      targetRole, 
      experienceLevel as ExperienceLevel,
      maxTurns,
      targetCompany,
      chosenPracticeMode,
      focusDimension,
      resumeText
    );

    // 2. Perform RAG Question Retrieval for the FIRST turn, prioritizing company specific questions if requested
    const searchString = `${targetRole} ${experienceLevel} ${focusDimension ? focusDimension : ""}`;
    const queryEmbedding = await getEmbedding(searchString);
    const candidates = db.searchQuestions(targetRole, experienceLevel, queryEmbedding || undefined, targetCompany);
    // 3. Select the first highly relevant question directly from our candidate bank, saving an API call
    // Defensive: ensure candidates exist and have questionText
    let questionText = "No question available";
    let matchedQuestion = undefined;
    if (candidates && candidates.length > 0) {
      questionText = candidates[0].questionText || candidates[0].id || "No question available";
      matchedQuestion = db.getQuestionBank().find(q => q.questionText === questionText || q.id === candidates[0].id);
    }

    // 4. Record first turn with ideal answer points populated
    const firstTurn: InterviewTurn = {
      question: questionText,
      answer: null,
      action: "ask",
      scores: null,
      feedback: null,
      follow_up_topic: null,
      timestamp: new Date().toISOString(),
      idealAnswerPoints: matchedQuestion?.idealAnswerPoints || (candidates && candidates[0] && candidates[0].idealAnswerPoints) || []
    };

    session.turns.push(firstTurn);
    session.currentTurnIndex = 1;
    // Store timerSeconds on the session for client-side countdown
    if (timerSeconds) (session as any).timerSeconds = timerSeconds;
    db.updateSession(session);

    return res.status(201).json(session);
  } catch (err: any) {
    console.error("Failed to start session:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Request hints for the current question
router.post("/sessions/:id/hint", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const session = db.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (session.status === SessionStatus.COMPLETED) {
      return res.status(400).json({ error: "Session already completed" });
    }

    const currentTurn = session.turns[session.turns.length - 1];
    if (!currentTurn || currentTurn.answer !== null) {
      return res.status(400).json({ error: "No active question found to provide hint for" });
    }

    // Match question in questionBank to retrieve ideal answer points
    const questionInBank = db.getQuestionBank().find(q => q.questionText === currentTurn.question);
    const hints = questionInBank?.idealAnswerPoints || [
      "Structure your response with the STAR framework.",
      "Consider performance tradeoffs, time complexity, or typical design constraints."
    ];

    // Return a neat progressive tip
    return res.json({
      hint: `Coach Tip: Consider explaining how this applies to modern systems. Focus on: "${hints[0]}"`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Submit user response / answer to the active turn
router.post("/sessions/:id/answer", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { answer } = req.body;
    if (answer === undefined || answer === null || answer.trim() === "") {
      return res.status(400).json({ error: "Answer text is required" });
    }

    const session = db.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (session.status === SessionStatus.COMPLETED) {
      return res.status(400).json({ error: "Session already completed" });
    }

    const currentTurnIndex = session.turns.length - 1;
    const currentTurn = session.turns[currentTurnIndex];
    if (!currentTurn || currentTurn.answer !== null) {
      return res.status(400).json({ error: "No active turn found or already answered" });
    }

    // 1. Save user answer to current turn
    currentTurn.answer = answer;

    // 2. Fetch candidates for vector context evaluation, prioritizing company specific questions if requested
    const candidates = db.searchQuestions(session.targetRole, session.experienceLevel, undefined, session.targetCompany);

    // 3. Evaluate answer using Gemini
    const evaluationResponse = await evaluateTurnOrAsk(
      session.targetRole,
      session.experienceLevel,
      candidates.slice(0, 5),
      session.turns, // includes current turn with answer
      session.turns.map(t => t.scores).filter((s): s is NonNullable<typeof s> => s !== null),
      session.focusDimension,
      session.resumeText
    );

    // 4. Store evaluation scores and feedback
    currentTurn.scores = evaluationResponse.scores || {
      correctness: 7,
      depth: 6,
      communication: 8,
      problem_solving: 7
    };
    currentTurn.feedback = evaluationResponse.feedback;
    currentTurn.follow_up_topic = evaluationResponse.follow_up_topic;

    if (evaluationResponse.isOfflineMode) {
      session.isOfflineMode = true;
    }

    // 5. Determine whether to transition to completion or ask adaptive follow-up
    if (session.turns.length >= session.maxTurns) {
      // Complete mock interview & compile comprehensive placement report
      session.status = SessionStatus.COMPLETED;
      
      const report = await generateFinalReport(
        session.targetRole,
        session.experienceLevel,
        session.turns
      );
      
      session.finalReport = report;
      if ((report as any).isOfflineMode) {
        session.isOfflineMode = true;
      }
      db.updateSession(session);
      return res.json({ session, feedback: currentTurn.feedback, finalized: true });
    } else {
      // Adaptive RAG Retrieval for the NEXT question based on the follow_up_topic!
      const followUpTopic = currentTurn.follow_up_topic || "";
      const searchString = `${session.targetRole} ${session.experienceLevel} ${followUpTopic}`;
      const queryEmbedding = await getEmbedding(searchString);
      
      const nextCandidates = db.searchQuestions(session.targetRole, session.experienceLevel, queryEmbedding || undefined, session.targetCompany);
      
      // Exclude already asked questions
      const askedTexts = new Set(session.turns.map(t => t.question));
      const unaskedCandidates = nextCandidates.filter(c => !askedTexts.has(c.questionText));
      const chosenCandidates = unaskedCandidates.length > 0 ? unaskedCandidates : nextCandidates;

      // Select the next question directly from our high-relevance candidates, saving an API call
      const nextQuestionText = chosenCandidates[0].questionText;
      const nextQuestionInBank = db.getQuestionBank().find(q => q.questionText === nextQuestionText || q.id === chosenCandidates[0].id);

      // Append next turn
      const nextTurn: InterviewTurn = {
        question: nextQuestionText,
        answer: null,
        action: "ask",
        scores: null,
        feedback: null,
        follow_up_topic: null,
        timestamp: new Date().toISOString(),
        idealAnswerPoints: nextQuestionInBank?.idealAnswerPoints || chosenCandidates[0].idealAnswerPoints || []
      };

      session.turns.push(nextTurn);
      session.currentTurnIndex = session.turns.length;
      db.updateSession(session);

      return res.json({ 
        session, 
        feedback: currentTurn.feedback, 
        nextQuestion: nextQuestionText,
        finalized: false 
      });
    }
  } catch (err: any) {
    console.error("Error evaluating answer:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Toggle Star/Bookmark state of an interview session
router.post("/sessions/:id/star", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const session = db.getSessionById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    if (session.userId !== req.user!.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    session.starred = !session.starred;
    db.updateSession(session);

    return res.json({ success: true, starred: session.starred, session });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- DASHBOARD AND ANALYTICS ENDPOINTS ---

router.get("/stats", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const sessions = db.getSessionsByUserId(userId).filter(s => s.status === SessionStatus.COMPLETED);

    if (sessions.length === 0) {
      return res.json({
        sessionCount: 0,
        averageScores: { correctness: 0, depth: 0, communication: 0, problem_solving: 0 },
        latestScore: 0,
        readinessScore: 0,
        readinessLabel: "Foundation Builder",
        weakestDimension: "communication",
        recommendedFocus: [
          "Practice concise structures using STAR",
          "Build technical depth with example systems",
          "Rehearse clear transitions and conclusions"
        ],
        roleCounts: {},
        history: []
      });
    }

    // Calculate aggregated dimensions averages
    let totalCorrectness = 0;
    let totalDepth = 0;
    let totalCommunication = 0;
    let totalProblemSolving = 0;
    let totalOverallScore = 0;
    const roleCounts: Record<string, number> = {};

    sessions.forEach(s => {
      // count roles
      roleCounts[s.targetRole] = (roleCounts[s.targetRole] || 0) + 1;

      if (s.finalReport) {
        totalOverallScore += s.finalReport.overallScore;
      }

      // calculate turn average
      let sessionCorrectness = 0;
      let sessionDepth = 0;
      let sessionCommunication = 0;
      let sessionProblemSolving = 0;
      let turnsScoredCount = 0;

      s.turns.forEach(t => {
        if (t.scores) {
          sessionCorrectness += t.scores.correctness;
          sessionDepth += t.scores.depth;
          sessionCommunication += t.scores.communication;
          sessionProblemSolving += t.scores.problem_solving;
          turnsScoredCount++;
        }
      });

      if (turnsScoredCount > 0) {
        totalCorrectness += sessionCorrectness / turnsScoredCount;
        totalDepth += sessionDepth / turnsScoredCount;
        totalCommunication += sessionCommunication / turnsScoredCount;
        totalProblemSolving += sessionProblemSolving / turnsScoredCount;
      }
    });

    const averageScores = {
      correctness: Math.round((totalCorrectness / sessions.length) * 10) / 10,
      depth: Math.round((totalDepth / sessions.length) * 10) / 10,
      communication: Math.round((totalCommunication / sessions.length) * 10) / 10,
      problem_solving: Math.round((totalProblemSolving / sessions.length) * 10) / 10,
    };

    // Sort history by date ascending for charts
    const sortedSessions = [...sessions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const history = sortedSessions.map(s => {
      let turnScores = { correctness: 0, depth: 0, communication: 0, problem_solving: 0 };
      let turnsWithScores = s.turns.filter(t => t.scores !== null);
      if (turnsWithScores.length > 0) {
        let sumC = 0, sumD = 0, sumCom = 0, sumP = 0;
        turnsWithScores.forEach(t => {
          sumC += t.scores!.correctness;
          sumD += t.scores!.depth;
          sumCom += t.scores!.communication;
          sumP += t.scores!.problem_solving;
        });
        turnScores = {
          correctness: Math.round((sumC / turnsWithScores.length) * 10) / 10,
          depth: Math.round((sumD / turnsWithScores.length) * 10) / 10,
          communication: Math.round((sumCom / turnsWithScores.length) * 10) / 10,
          problem_solving: Math.round((sumP / turnsWithScores.length) * 10) / 10,
        };
      }
      return {
        sessionId: s.id,
        targetRole: s.targetRole,
        createdAt: s.createdAt,
        overallScore: s.finalReport?.overallScore || 0,
        scores: turnScores
      };
    });

    const latestSession = sortedSessions[sortedSessions.length - 1];
    const latestScore = latestSession.finalReport?.overallScore || 0;
    const readinessScore = Math.round((
      averageScores.correctness * 0.24 +
      averageScores.depth * 0.32 +
      averageScores.communication * 0.22 +
      averageScores.problem_solving * 0.22
    ) * 10);
    const readinessLabel = readinessScore >= 85
      ? "Recruiter-Ready"
      : readinessScore >= 70
        ? "Interview-Ready"
        : readinessScore >= 55
          ? "Needs Polish"
          : "Foundation Builder";

    const weakestDimension = Object.entries(averageScores)
      .sort((a, b) => a[1] - b[1])[0][0] as keyof typeof averageScores;

    const recommendedFocusMap: Record<string, string[]> = {
      correctness: [
        "Refine answer accuracy with precise technical definitions.",
        "Double-check terms and eliminate ambiguous assertions.",
        "Tie your response to the exact problem requirement."
      ],
      depth: [
        "Use architecture and tradeoff details in every response.",
        "Describe performance implications and real-world constraints.",
        "Explain why you chose one approach over alternatives."
      ],
      communication: [
        "Structure answers with Situation, Action, and Result.",
        "Use transitional phrases to keep your flow coherent.",
        "Speak in concise, professional sentences with confidence."
      ],
      problem_solving: [
        "Enumerate candidate solutions before choosing one.",
        "Surface edge cases and mitigation strategies.",
        "Show how you validate correctness and scalability."
      ]
    };

    const recommendedFocus = recommendedFocusMap[weakestDimension] || [
      "Review your latest mock interview report and rehearse the lowest-rated dimension.",
      "Use targeted examples to improve depth and clarity.",
      "Build one focused study checklist for your next practice session."
    ];

    return res.json({
      sessionCount: sessions.length,
      averageScores,
      latestScore,
      readinessScore,
      readinessLabel,
      weakestDimension,
      recommendedFocus,
      roleCounts,
      history
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- AI ASSISTANT CHAT ENDPOINT ---

router.post("/assistant/chat", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const { messages, stats } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "A valid list of chat messages is required." });
    }

    const userProfile = {
      name: req.user!.name,
      email: req.user!.email
    };

    const reply = await chatWithAssistant(userProfile, stats || null, messages);
    return res.json({ reply });
  } catch (err: any) {
    console.error("Assistant chat route error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// --- ACHIEVEMENTS ENDPOINT ---

router.get("/achievements", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const sessions = db.getSessionsByUserId(userId).filter(s => s.status === SessionStatus.COMPLETED);
    const user = db.findUserById(userId);

    // Compute scores
    let highestScore = 0;
    let totalSessions = sessions.length;
    const rolesCompleted = new Set<string>();
    sessions.forEach(s => {
      if (s.finalReport?.overallScore) {
        highestScore = Math.max(highestScore, s.finalReport.overallScore);
      }
      rolesCompleted.add(s.targetRole);
    });

    // Compute streak
    const uniqueDates = Array.from(new Set(sessions.map(s => {
      const d = new Date(s.createdAt);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    }))).sort((a, b) => b - a);
    let streak = 0;
    if (uniqueDates.length > 0) {
      const msDay = 86400000;
      const today = new Date(); const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
      if (uniqueDates[0] >= todayMs - msDay) {
        streak = 1;
        for (let i = 0; i < uniqueDates.length - 1; i++) {
          if (uniqueDates[i] - uniqueDates[i+1] === msDay) streak++;
          else break;
        }
      }
    }

    // Define and evaluate all badges
    const badges = [
      {
        id: "first_interview",
        name: "First Steps",
        description: "Complete your very first mock interview",
        icon: "🚀",
        unlocked: totalSessions >= 1,
        unlockedAt: totalSessions >= 1 ? sessions[0]?.createdAt : undefined
      },
      {
        id: "score_80",
        name: "High Achiever",
        description: "Score 80% or above in any interview",
        icon: "🏆",
        unlocked: highestScore >= 80,
        unlockedAt: highestScore >= 80 ? sessions.find(s => (s.finalReport?.overallScore || 0) >= 80)?.createdAt : undefined
      },
      {
        id: "score_90",
        name: "Elite Performer",
        description: "Score 90% or above — top-tier candidate",
        icon: "💎",
        unlocked: highestScore >= 90,
        unlockedAt: highestScore >= 90 ? sessions.find(s => (s.finalReport?.overallScore || 0) >= 90)?.createdAt : undefined
      },
      {
        id: "five_sessions",
        name: "Dedicated Learner",
        description: "Complete 5 mock interview sessions",
        icon: "📚",
        unlocked: totalSessions >= 5,
        unlockedAt: totalSessions >= 5 ? sessions[4]?.createdAt : undefined
      },
      {
        id: "ten_sessions",
        name: "Interview Master",
        description: "Complete 10 mock interview sessions",
        icon: "🎓",
        unlocked: totalSessions >= 10,
        unlockedAt: totalSessions >= 10 ? sessions[9]?.createdAt : undefined
      },
      {
        id: "streak_3",
        name: "On Fire",
        description: "Maintain a 3-day practice streak",
        icon: "🔥",
        unlocked: streak >= 3
      },
      {
        id: "streak_7",
        name: "Week Warrior",
        description: "Maintain a 7-day practice streak",
        icon: "⚡",
        unlocked: streak >= 7
      },
      {
        id: "multi_role",
        name: "Versatile Engineer",
        description: "Complete interviews in 3 different roles",
        icon: "🌟",
        unlocked: rolesCompleted.size >= 3
      },
      {
        id: "weakness_drill",
        name: "Gap Closer",
        description: "Complete a Weakness Drill session",
        icon: "🎯",
        unlocked: sessions.some(s => s.practiceMode === "weakness-drill")
      },
      {
        id: "voice_mode",
        name: "Smooth Talker",
        description: "Answer a question using voice mode",
        icon: "🎤",
        unlocked: false // Unlocked client-side when voice used
      }
    ];

    return res.json({ badges, streak, totalSessions, highestScore });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// --- LEADERBOARD ENDPOINT ---

router.get("/leaderboard", requireAuth, (req: AuthenticatedRequest, res) => {
  try {
    const currentUserId = req.user!.id;
    const allSessions = db.getSessions().filter(s => s.status === SessionStatus.COMPLETED);

    // Group sessions by user
    const userMap = new Map<string, { userName: string; sessions: typeof allSessions; roleScores: Map<string, number[]> }>();
    allSessions.forEach(s => {
      if (!userMap.has(s.userId)) {
        userMap.set(s.userId, { userName: s.userName, sessions: [], roleScores: new Map() });
      }
      const entry = userMap.get(s.userId)!;
      entry.sessions.push(s);
      const score = s.finalReport?.overallScore || 0;
      if (score > 0) {
        if (!entry.roleScores.has(s.targetRole)) entry.roleScores.set(s.targetRole, []);
        entry.roleScores.get(s.targetRole)!.push(score);
      }
    });

    // Build leaderboard entries — best score per user
    const entries: any[] = [];
    userMap.forEach((data, userId) => {
      let bestScore = 0;
      let bestRole = "General";
      data.roleScores.forEach((scores, role) => {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avg > bestScore) { bestScore = Math.round(avg); bestRole = role; }
      });
      if (bestScore > 0) {
        entries.push({
          userId,
          userName: data.userName,
          role: bestRole,
          averageScore: bestScore,
          sessionCount: data.sessions.length,
          isCurrentUser: userId === currentUserId
        });
      }
    });

    // Sort by score descending and add ranks
    entries.sort((a, b) => b.averageScore - a.averageScore);
    const ranked = entries.slice(0, 20).map((e, i) => ({ ...e, rank: i + 1 }));

    return res.json(ranked);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
