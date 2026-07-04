import { GoogleGenAI, Type } from "@google/genai";
import { 
  RubricScores, 
  InterviewTurn, 
  FinalReport, 
  QuestionBankItem, 
  ExperienceLevel,
  DashboardStats,
  AssistantChatMessage
} from "../src/types";

let aiClient: GoogleGenAI | null = null;

// Lazy initialization of the Gemini API Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

/**
 * Returns whether the Gemini API is fully configured.
 */
export function isGeminiConfigured(): boolean {
  return getGeminiClient() !== null;
}

/**
 * Generates an embedding vector for a given text query.
 * Falls back to null if API is unconfigured.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  try {
    const response: any = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text,
    });
    if (response.embedding?.values) {
      return response.embedding.values;
    }
    if (response.embeddings?.[0]?.values) {
      return response.embeddings[0].values;
    }
    return null;
  } catch (error) {
    console.error("Gemini Embedding error:", error);
    return null;
  }
}

export interface GeminiAgentResponse {
  action: "ask" | "evaluate" | "report";
  question: string | null;
  scores: RubricScores | null;
  feedback: string | null;
  follow_up_topic: string | null;
  session_summary: string | null;
  isOfflineMode?: boolean;
}

/**
 * Core agent action: Ask next question, evaluate, or draft reports.
 */
export async function evaluateTurnOrAsk(
  targetRole: string,
  experienceLevel: ExperienceLevel,
  candidates: QuestionBankItem[],
  conversationHistory: InterviewTurn[],
  scoresSoFar: RubricScores[],
  focusDimension?: string,
  resumeText?: string
): Promise<GeminiAgentResponse> {
  const ai = getGeminiClient();
  
  if (!ai) {
    // Elegant Offline / No-API Key Fallback
    const fallback = getOfflineFallbackResponse(targetRole, candidates, conversationHistory);
    fallback.isOfflineMode = true;
    return fallback;
  }

  const systemInstruction = `You are PrepMate, an expert technical interview coach and senior calibrator with 15 years of experience conducting interviews at top tech companies. You are firm, encouraging, objective, and extremely rigorous.

CONTEXT PROVIDED TO YOU EACH TURN:
- target_role: ${targetRole}
- experience_level: ${experienceLevel}
${resumeText ? `- candidate_resume: The candidate provided their resume/skills:\n"""\n${resumeText}\n"""\n  -> INSTRUCTION: You MUST heavily tailor your questions and drill down on the specific technologies, projects, or experiences mentioned in this resume. Challenge them on what they claim to know.` : ""}
${focusDimension ? `- weakness_focus_dimension: This interview is a targeted Weakness Drill focusing on the student's gap in "${focusDimension}". Choose or adapt questions specifically to test and drill them on this dimension.` : ""}
- question_bank_candidates: [${candidates.map(c => `ID: ${c.id}, Topic: ${c.topic}, Question: ${c.questionText}, Ideal answer: ${c.idealAnswerPoints.join("; ")}`).join("\n")}]
- conversation_history: [${conversationHistory.map(h => `Q: ${h.question} | A: ${h.answer || "(No response)"} | feedback: ${h.feedback || ""}`).join("\n")}]
- rubric_scores_so_far: [${scoresSoFar.map(s => `C:${s.correctness} D:${s.depth} Com:${s.communication} PS:${s.problem_solving}`).join(", ")}]

YOUR TASK EACH TURN — choose exactly one action:
1. ASK — select or lightly rephrase the single best next question from question_bank_candidates, considering conversation_history so no topic repeats and difficulty adapts to performance so far.
2. EVALUATE — score the candidate's most recent answer against the rubric below.
3. REPORT — when the session ends, synthesize a final report.

RUBRIC & RIGOR CALIBRATION (use for EVALUATE action):
You MUST perform strict and fair calibration directly in your scores and feedback. Avoid grade inflation!
- correctness (0-10): factual/technical accuracy.
- depth (0-10): did they explain reasoning, tradeoffs, complexities (like Big-O runtime/memory bounds), edge cases, or architecture details. If they only stated a basic definition without depth or tradeoffs, rate this dimension 4-6/10.
- communication (0-10): clarity, structured outline (e.g. STAR), and professional engineering vocabulary.
- problem_solving (0-10): approach, logical reasoning, and adaptability.

Be extremely objective, precise, and fair. If the answer is short, generic, or lacks concrete engineering specifics, adjust scores downwards appropriately (e.g., 5-7/10 instead of defaulting to 8-9/10).

FEW-SHOT EXAMPLE (EVALUATE action):
Input answer: "A hash map uses an array and a hash function to map keys to indices for O(1) average lookup. Collisions are handled with chaining or open addressing."
Output:
{
  "action": "evaluate",
  "scores": {"correctness": 9, "depth": 7, "communication": 8, "problem_solving": 7},
  "feedback": "Strong core explanation. However, to achieve a top score, you should address specific resizing tradeoffs, load factors, and how open addressing behaves under high utilization.",
  "follow_up_topic": "hash table resizing and amortized complexity"
}

GUARDRAILS:
- Never give the direct answer when asking a question. Guide them.
- Never fabricate a question not grounded in question_bank_candidates unless no candidate fits.
- Keep feedback specific and actionable, never generic ("good job").
- If the candidate's answer is empty or off-topic, do not penalize harshly — ask them to clarify or attempt again once.
- Stay strictly in the interviewer role; do not break character or discuss anything outside interview preparation.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: "The action chosen: 'ask', 'evaluate', or 'report'",
      },
      question: {
        type: Type.STRING,
        description: "The next question selected or lightly rephrased from candidates when action is 'ask'",
      },
      scores: {
        type: Type.OBJECT,
        description: "Rubric scores (0-10) for correctness, depth, communication, and problem_solving when action is 'evaluate'",
        properties: {
          correctness: { type: Type.INTEGER },
          depth: { type: Type.INTEGER },
          communication: { type: Type.INTEGER },
          problem_solving: { type: Type.INTEGER },
        },
        required: ["correctness", "depth", "communication", "problem_solving"],
      },
      feedback: {
        type: Type.STRING,
        description: "Specific and actionable feedback for the answer or final summary feedback",
      },
      follow_up_topic: {
        type: Type.STRING,
        description: "Targeted follow up topic to address identified gaps",
      },
      session_summary: {
        type: Type.STRING,
        description: "Synthesized final report summary or session overview when action is 'report'",
      }
    },
    required: ["action"],
  };

  try {
    const userPrompt = conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].answer !== null
      ? `The candidate just answered the previous question: "${conversationHistory[conversationHistory.length - 1].question}".
         Their answer was: "${conversationHistory[conversationHistory.length - 1].answer}".
         Please EVALUATE this answer and provide scores, specific feedback, and a follow_up_topic. Then we will ask the next question in a separate turn.`
      : `We are initiating a mock interview session for a candidate targeting the ${targetRole} (${experienceLevel}) role. 
         Please select the first highly relevant question from question_bank_candidates and output it with action 'ask'.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.3,
      }
    });

    const parsed = JSON.parse(response.text.trim()) as GeminiAgentResponse;
    return parsed;
  } catch (error: any) {
    const isQuota = error?.status === 429 || 
                    error?.message?.includes("quota") || 
                    error?.message?.includes("429") ||
                    JSON.stringify(error)?.includes("RESOURCE_EXHAUSTED");

    if (isQuota) {
      console.warn("[Gemini API] Quota/Rate Limit exceeded (429). Falling back gracefully to PrepMate offline mode.");
    } else {
      console.warn("[Gemini API] Evaluation error:", error?.message || error);
    }
    const fallback = getOfflineFallbackResponse(targetRole, candidates, conversationHistory);
    fallback.isOfflineMode = true;
    return fallback;
  }
}

/**
 * Aggregates session results and generates a structured final placement readiness report.
 */
export async function generateFinalReport(
  targetRole: string,
  experienceLevel: ExperienceLevel,
  conversationHistory: InterviewTurn[]
): Promise<FinalReport> {
  const ai = getGeminiClient();

  if (!ai) {
    return getOfflineFallbackReport(targetRole, conversationHistory);
  }

  const transcriptText = conversationHistory.map((t, idx) => `
Turn ${idx + 1}:
Q: ${t.question}
A: ${t.answer || "(No response)"}
Scores: Correctness: ${t.scores?.correctness || 0}/10, Depth: ${t.scores?.depth || 0}/10, Communication: ${t.scores?.communication || 0}/10, Problem Solving: ${t.scores?.problem_solving || 0}/10
Feedback: ${t.feedback || ""}
`).join("\n");

  const systemInstruction = `You are PrepMate's Chief Placement Evaluator. Analyze the full transcript and scores of this mock interview to produce a rigorous, portfolio-grade placement feedback report.

Evaluate based on the target role "${targetRole}" and experience level "${experienceLevel}".
Provide constructive, direct, and actionable feedback.

Based on the candidate's scores across correctness, depth, communication, and problem_solving, determine the dimension they scored lowest in (if tied, pick any of the lowest ones), and include a custom "nextStepsRoadmap" object.
Provide concrete technical topics and specific study resources (such as official docs, book recommendations, standard tools, or interactive platforms) tailored to that lowest-scoring dimension.

OUTPUT FORMAT — respond with ONLY JSON matching this exact schema:
{
  "overallScore": integer (0 to 100),
  "strengths": array of strings,
  "gaps": array of strings,
  "personalizedPlan": array of strings (concrete learning items or steps),
  "summary": string (comprehensive executive summary),
  "recommendation": string (one of: "Placement Ready", "Ready with Minor Refinements", "Needs Core Revision"),
  "nextStepsRoadmap": {
    "dimension": string (the lowest scoring dimension, e.g., "Accuracy", "Depth", "Communication", "Problem Solving"),
    "score": number (average score for that dimension),
    "topics": [
      { "title": "string", "description": "string" }
    ],
    "resources": [
      { "name": "string", "url": "string", "type": "string" }
    ]
  }
}`;

  const reportSchema = {
    type: Type.OBJECT,
    properties: {
      overallScore: { type: Type.INTEGER },
      strengths: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      gaps: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      personalizedPlan: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
      summary: { type: Type.STRING },
      recommendation: { type: Type.STRING },
      nextStepsRoadmap: {
        type: Type.OBJECT,
        properties: {
          dimension: { type: Type.STRING },
          score: { type: Type.NUMBER },
          topics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "description"]
            }
          },
          resources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                url: { type: Type.STRING },
                type: { type: Type.STRING }
              },
              required: ["name", "url", "type"]
            }
          }
        },
        required: ["dimension", "score", "topics", "resources"]
      }
    },
    required: ["overallScore", "strengths", "gaps", "personalizedPlan", "summary", "recommendation", "nextStepsRoadmap"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Here is the full interview transcript and evaluation details:\n${transcriptText}\n\nProduce the final report JSON.`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: reportSchema,
        temperature: 0.4
      }
    });

    return JSON.parse(response.text.trim()) as FinalReport;
  } catch (error: any) {
    const isQuota = error?.status === 429 || 
                    error?.message?.includes("quota") || 
                    error?.message?.includes("429") ||
                    JSON.stringify(error)?.includes("RESOURCE_EXHAUSTED");

    if (isQuota) {
      console.warn("[Gemini API] Final Report Quota exceeded (429). Falling back gracefully to PrepMate offline report.");
    } else {
      console.warn("[Gemini API] Final Report error:", error?.message || error);
    }
    const report = getOfflineFallbackReport(targetRole, conversationHistory);
    (report as any).isOfflineMode = true;
    return report;
  }
}

// --- SECURE OFFLINE/FALLBACK MOCK ENGINES ---

function getOfflineFallbackResponse(
  targetRole: string,
  candidates: QuestionBankItem[],
  conversationHistory: InterviewTurn[]
): GeminiAgentResponse {
  // If we just need to ask the first question or the next question
  const askedQuestions = new Set(conversationHistory.map(h => h.question));
  const unasked = candidates.filter(c => !askedQuestions.has(c.questionText));
  const nextCandidate = unasked[0] || candidates[0];

  // If the last turn has an answer that needs evaluating
  if (conversationHistory.length > 0) {
    const lastTurn = conversationHistory[conversationHistory.length - 1];
    if (lastTurn.answer && lastTurn.scores === null) {
      // Create a sensible scoring based on answer length & keywords
      const ans = lastTurn.answer.toLowerCase();
      const idealPoints = nextCandidate.idealAnswerPoints;
      let matchedCount = 0;
      
      idealPoints.forEach(point => {
        const words = point.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
        if (ans.includes(words) || ans.length > 100) {
          matchedCount++;
        }
      });

      const baseScore = ans.length < 15 ? 3 : ans.length < 50 ? 6 : Math.min(8 + matchedCount, 10);
      const scores: RubricScores = {
        correctness: baseScore,
        depth: ans.length > 120 ? Math.min(baseScore + 1, 10) : Math.max(baseScore - 2, 4),
        communication: ans.length > 10 ? 8 : 4,
        problem_solving: ans.length > 40 ? 7 : 5
      };

      return {
        action: "evaluate",
        question: null,
        scores,
        feedback: `[Offline Mode] Good attempt. You explained the fundamentals. To improve further, make sure to cover structural details such as: ${idealPoints[0]}`,
        follow_up_topic: nextCandidate.topic,
        session_summary: null
      };
    }
  }

  // Otherwise, ask a question
  return {
    action: "ask",
    question: nextCandidate.questionText,
    scores: null,
    feedback: null,
    follow_up_topic: null,
    session_summary: null
  };
}

function getOfflineFallbackReport(
  targetRole: string,
  conversationHistory: InterviewTurn[]
): FinalReport {
  let sumScore = 0;
  let count = 0;

  // Calculate average scores for each dimension
  let sumCorrectness = 0;
  let sumDepth = 0;
  let sumCommunication = 0;
  let sumProblemSolving = 0;

  conversationHistory.forEach(t => {
    if (t.scores) {
      sumCorrectness += t.scores.correctness;
      sumDepth += t.scores.depth;
      sumCommunication += t.scores.communication;
      sumProblemSolving += t.scores.problem_solving;
      count++;
    }
  });

  const avgCorrectness = count > 0 ? sumCorrectness / count : 7.0;
  const avgDepth = count > 0 ? sumDepth / count : 6.0;
  const avgCommunication = count > 0 ? sumCommunication / count : 8.0;
  const avgProblemSolving = count > 0 ? sumProblemSolving / count : 7.0;

  let overallScore = 75;
  if (count > 0) {
    const rawScore = Math.round(((avgCorrectness + avgDepth + avgCommunication + avgProblemSolving) / 4) * 10);
    overallScore = Math.max(40, Math.min(rawScore, 100));
  }

  // Find lowest score
  const dimensions = [
    { key: "correctness", label: "Accuracy", score: avgCorrectness },
    { key: "depth", label: "Depth", score: avgDepth },
    { key: "communication", label: "Communication", score: avgCommunication },
    { key: "problem_solving", label: "Problem Solving", score: avgProblemSolving }
  ];
  dimensions.sort((a, b) => a.score - b.score);
  const lowest = dimensions[0];

  // Construct Next Steps Roadmap based on lowest scoring dimension
  let topics: { title: string; description: string }[] = [];
  let resources: { name: string; url: string; type: string }[] = [];

  if (lowest.key === "correctness") {
    topics = [
      { title: "Big-O Time & Space Complexity", description: "Learn to systematically evaluate best, average, and worst-case bounds of algorithms." },
      { title: "Core Data Structures & Operations", description: "Master insert, delete, and lookup complexities of Arrays, Linked Lists, Stacks, Queues, Trees, and Graphs." },
      { title: "Standard Language Specifications", description: "Deepen understanding of core runtimes (e.g. JS Event Loop, Java memory model, Python GIL, database ACID constraints)." }
    ];
    resources = [
      { name: "LeetCode Practice Platform", url: "https://leetcode.com", type: "interactive" },
      { name: "MDN Web Standards Documentation", url: "https://developer.mozilla.org", type: "documentation" },
      { name: "Introduction to Algorithms (CLRS Book)", url: "https://mitpress.mit.edu/9780262046305/introduction-to-algorithms/", type: "book" },
      { name: "roadmap.sh - Developer Roadmaps", url: "https://roadmap.sh", type: "interactive" }
    ];
  } else if (lowest.key === "depth") {
    topics = [
      { title: "Database Optimization & Indexing", description: "Study indexes (B-Trees, Hash indexes), execution plans (EXPLAIN), normalization, and locking." },
      { title: "Distributed System Architecture Design", description: "Understand load balancers, CDN caching, horizontal vs vertical scaling, and single points of failure." },
      { title: "Scalable Caching Topologies", description: "Implement Cache-Aside, Write-Through, and Write-Back strategies using Redis or Memcached." }
    ];
    resources = [
      { name: "System Design Primer Guide", url: "https://github.com/donnemartin/system-design-primer", type: "article" },
      { name: "Designing Data-Intensive Applications (DDIA Book)", url: "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/", type: "book" },
      { name: "ByteByteGo System Design", url: "https://bytebytego.com", type: "interactive" }
    ];
  } else if (lowest.key === "communication") {
    topics = [
      { title: "The STAR Narrative Framework", description: "Structure background questions: Situation (15%), Task (10%), Action (60%), and Result (15%)." },
      { title: "Interviewer-Driven Coding Sessions", description: "Stating assumptions, detailing API designs, and asking clarifying questions before writing code." },
      { title: "Verbal Cadence & WPM Calibration", description: "Maintain an optimal professional pacing of 100-145 WPM to ensure maximum readability and clarity." }
    ];
    resources = [
      { name: "The STAR Framework Interview Guide", url: "https://blog.pragmaticengineer.com", type: "article" },
      { name: "Tech Interview Handbook", url: "https://www.techinterviewhandbook.org", type: "documentation" },
      { name: "PrepMate Live Speech Coach WPM Analyzer", url: "#", type: "interactive" }
    ];
  } else {
    topics = [
      { title: "Think-Out-Loud Protocol (TOL)", description: "Express every candidate design, risk factor, and memory allocation decision aloud." },
      { title: "Iterative Optimization Paradigms", description: "Formulate a brute-force approach first, identify its strict bottleneck, and systematically optimize." },
      { title: "Proactive Edge Case Identification", description: "Brainstorm null inputs, empty bounds, massive concurrency values, and network partition errors." }
    ];
    resources = [
      { name: "Cracking the Coding Interview (CtCI Book)", url: "https://www.crackingthecodinginterview.com", type: "book" },
      { name: "NeetCode DSA Walkthroughs", url: "https://neetcode.io", type: "video" },
      { name: "MIT OpenCourseWare (Algorithmic Problem Solving)", url: "https://ocw.mit.edu", type: "video" }
    ];
  }

  let recommendation = "Ready with Minor Refinements";
  if (overallScore >= 85) recommendation = "Placement Ready";
  else if (overallScore < 65) recommendation = "Needs Core Revision";

  return {
    overallScore,
    strengths: [
      "Demonstrated good theoretical familiarity with target role fundamentals.",
      "Clear attempt to structure core concepts concisely.",
      "Active engagement with all questions."
    ],
    gaps: [
      "Depth can be increased by detailing operational trade-offs.",
      "Practical case-studies and real-world system architecture examples were thin."
    ],
    personalizedPlan: [
      "Review official documentation and core system design patterns for " + targetRole + ".",
      "Conduct daily whiteboard designs focusing on concurrency and memory optimization.",
      "Practice structured explanation frameworks like the STAR method (Situation, Task, Action, Result)."
    ],
    summary: "This is a portfolio-grade mock evaluation compiled offline. The candidate demonstrated a resilient approach to foundational concepts but can elevate performance by deep-diving into practical edge-cases and tradeoffs.",
    recommendation,
    nextStepsRoadmap: {
      dimension: lowest.label,
      score: Number(lowest.score.toFixed(1)),
      topics,
      resources
    }
  };
}

/**
 * High-fidelity fallback responder that provides rich, tailored responses to career questions
 * when Gemini API key is not fully configured.
 */
function getSmartFallbackAssistantResponse(
  name: string,
  stats: DashboardStats | null,
  messageHistory: AssistantChatMessage[]
): string {
  const userMsgs = messageHistory.filter(m => m.role === "user");
  const query = (userMsgs[userMsgs.length - 1]?.text || "").toLowerCase().trim();

  // 1. STATS / ANALYSIS / SCORE IMPROVEMENTS
  if (
    query.includes("score") || 
    query.includes("stats") || 
    query.includes("performance") || 
    query.includes("mock") || 
    query.includes("analyze") ||
    query.includes("improve")
  ) {
    if (stats && stats.sessionCount > 0) {
      const { correctness, depth, communication, problem_solving } = stats.averageScores;
      const scores = [
        { name: "Technical Accuracy (Correctness)", score: correctness, tip: "review fundamental CS topics, standard algorithmic complexities, and edge-cases. Always walk through your logic before finalizing." },
        { name: "Answer Depth & Tradeoffs (Depth)", score: depth, tip: "actively discuss memory vs. CPU time complexity, load bounds, scalability limits, and fallback strategies. Contrast alternative approaches." },
        { name: "Structure & Communication (Communication)", score: communication, tip: "adopt the STAR framework. Frame your responses clearly with the Situation, Task, Action, and Result, using power verbs." },
        { name: "Problem Solving (Problem Solving)", score: problem_solving, tip: "talk aloud when confronted with difficult problems. Show your step-by-step thinking even when unsure of the perfect solution." }
      ];
      // Find lowest score
      scores.sort((a, b) => a.score - b.score);
      const lowest = scores[0];

      return `### PrepMate Personalized Performance Analysis
Hi **${name}**, let's do a deep-dive analysis of your current mock session metrics:

- **Total Mock Sessions Completed**: ${stats.sessionCount}
- **Latest Overall Score**: ${stats.latestScore}%

#### Current Skill Dimensions:
- 🎯 **Technical Accuracy**: ${correctness}/10
- 🔍 **Depth & Tradeoffs**: ${depth}/10
- 🗣️ **Structure & Communication**: ${communication}/10
- 🧠 **Problem Solving**: ${problem_solving}/10

#### 💡 Key Improvement Focus Area:
Your lowest scoring dimension is **${lowest.name}** with a rating of **${lowest.score}/10**. 

To elevate your score in this dimension, you should:
- **Core Coaching Tip**: ${lowest.tip}
- **Use the live indicators**: During interviews, look at the sidebar widgets. Clicking live vocabulary cards and tracking your WPM pacing can quickly push this rating up by 15-20%.

Would you like to draft a targeted study plan for this weekend?`;
    } else {
      return `### Dashboard Analytics Evaluation
Hi **${name}**! I don't see any finalized mock sessions on your dashboard yet. 

Once you complete your first adaptive mock interview session in the **Mock Interviews** room, I will automatically calculate your scores across four critical dimensions:
1. **Technical Accuracy** (Correctness)
2. **Answer Depth & Tradeoffs** (Depth)
3. **Structure & Communication** (Communication)
4. **Problem Solving Approach** (Problem Solving)

**Action Plan to Start:**
1. Click the **Start New Mock Session** button on the home screen.
2. Select your target role (e.g. Frontend Engineer, Backend Developer, or Analyst).
3. Attempt all the adaptive questions using our **Voice dictation / Speech recognition** support!
4. Once completed, come back here to analyze your progress. Let me know if you need any help starting!`;
    }
  }

  // 2. STAR FRAMEWORK
  if (
    query.includes("star") || 
    query.includes("framework") || 
    query.includes("structure") || 
    query.includes("behavioral") ||
    query.includes("method")
  ) {
    return `### Mastering the STAR Framework
The **STAR** framework is the industry standard for answering behavioral and technical-experience questions. It provides a structured, high-impact narrative arc that interviewers love.

Here is what **STAR** stands for:
- 📌 **S - Situation**: Set the context. Describe the specific challenge, project, or bottleneck. Keep it brief (15% of your answer).
- 🎯 **T - Task**: What was your responsibility? What goal or metric did you need to hit? (10% of your answer).
- 🛠️ **A - Action**: Explain *exactly* what you did. What tools, languages, or algorithms did you use? How did you resolve the conflict? This is the core (60% of your answer).
- 🏆 **R - Result**: Quantify the outcome. Use percentages, load-reduction times, or business metrics to prove success (15% of your answer).

---

#### 💡 Real-World STAR Example (Software Engineering):
*Question: "Tell me about a time you solved a difficult performance problem."*

- **Situation**: "During my pre-final year internship, our team's main data analytics page had a 4.2-second load latency, causing a 25% user drop-off rate on mobile devices."
- **Task**: "I was assigned to profile the frontend render cycle and database queries to bring the page load time down to under 500ms."
- **Action**: "I used Chrome DevTools to locate un-memoized component re-renders. I then refactored the parent state tree, implemented virtual scroll lists for large datasets, and added standard **composite indexes** on our database. I also integrated a memory-efficient **Redis caching layer** for static aggregate queries."
- **Result**: "This **optimized** load times by over 90%, slashing latency from 4.2s to 380ms. It completely eliminated mobile user drop-offs and increased session lengths by 15%."

*Pro Coach Tip: Notice how the action uses power verbs like 'refactored', 'implemented', and 'optimized'. Our live vocabulary assistant highlighted in the interview room tracks these automatically for you!*`;
  }

  // 3. SDE PLACEMENT ROADMAP / CHECKLIST
  if (
    query.includes("sde") || 
    query.includes("roadmap") || 
    query.includes("checklist") || 
    query.includes("placement") || 
    query.includes("prepare") ||
    query.includes("plan")
  ) {
    return `### Entry-Level SDE Placement Roadmap
To stand out from the competition during campus and off-campus placements, follow this focused 4-step preparation roadmap:

#### 📂 Phase 1: Algorithmic Foundations (DSA)
- **Time/Space Complexity**: Master Big-O analysis (best, average, worst cases).
- **Core Structures**: Focus heavily on Hash Maps, Arrays, Linked Lists, Stacks, Queues, Binary Trees, and Graphs.
- **Classic Algorithms**: Understand Binary Search, Two Pointers, BFS/DFS Traversal, Sorting (Quick/Merge), and basic dynamic programming.
- *PrepMate Tool*: Launch a mock session and select "Technical SDE" to practice describing code complexity aloud.

#### 🏗️ Phase 2: System Design & CS Core
- **Database Concepts**: Understand Indexing, Normalization (1NF/2NF/3NF), and SQL vs. NoSQL tradeoffs.
- **Networking**: Master HTTP methods, status codes, REST APIs, GraphQL basics, and client-server models.
- **OOP Principles**: Be prepared to explain Inheritance, Polymorphism, Encapsulation, and Abstraction with code examples.

#### 📄 Phase 3: Resume & Portfolio Polish
- **Project Bullet Points**: Write resume bullets using the **Google X-Y-Z formula**: *"Accomplished [X], as measured by [Y], by doing [Z]"*.
- **Tech Stack**: Clearly define the frontend, backend, and cloud/database stack of each project. Avoid list dumps; group them logically.

#### 🗣️ Phase 4: Mock Practices & Communication
- **Pacing**: Speak at an optimal **100-145 WPM** speed (use our live dictation pacing tracker to practice!).
- **Talk Aloud**: Interviewers evaluate *how* you think, not just your final code. Always speak as you formulate your design.`;
  }

  // 4. RESUME & CV PROJECTS
  if (
    query.includes("resume") || 
    query.includes("cv") || 
    query.includes("project") || 
    query.includes("portfolio")
  ) {
    return `### High-Impact Resume & Project Strategy
To make your resume stand out to recruiters and technical evaluators, you must write about your projects in a way that highlights both your engineering skills and practical business impact.

#### 📐 The Google X-Y-Z Formula
Every single project bullet point on your CV should follow this structure:
> **"Accomplished [X] as measured by [Y], by doing [Z]"**

- **X (Accomplishment)**: What did you build or improve? (e.g., "Reduced database response latency")
- **Y (Measurement)**: How did you prove it? (e.g., "by 40%")
- **Z (Action/Method)**: What was the engineering strategy? (e.g., "by writing complex compound SQL indexes and restructuring database schema")

---

#### ⚖️ Before vs. After Example:
- ❌ **Weak Bullet**: *"Worked on a React application and fetched mock data from a backend server."*
-  **High-Impact Bullet**: *"Engineered a real-time collaborative dashboard using React and Express, reducing page-render times by 35% using virtualized arrays and custom state hooks."*

#### 💡 Top 5 SDE Resume Guidelines:
1. **No generic skills**: Instead of listing 'C++', prove it in your projects.
2. **Keep it to 1 Page**: Standard college placements or entry-level resumes should never exceed a single page.
3. **Hyperlink active links**: Add links to your GitHub repositories or live hosted websites.
4. **Quantify results**: Use metrics (percentages, requests/sec, seconds reduced) wherever possible.
5. **No empty placeholders**: Make sure all listed projects have a clear architectural outline.`;
  }

  // 5. FRONTEND ENGINEERING
  if (
    query.includes("frontend") || 
    query.includes("react") || 
    query.includes("html") || 
    query.includes("css") || 
    query.includes("javascript") ||
    query.includes("web")
  ) {
    return `### Frontend Interview Preparation Guide
Frontend engineering interviews test your mastery of browser environments, UI state systems, and screen paint performance.

#### 🌟 Key Concepts to Master:
- **Rendering & DOM Lifecycle**: Explain how the browser parses HTML/CSS, builds the DOM/CSSOM tree, and performs layout and paint cycles.
- **Framework Mechanics (e.g., React)**: Understand how the virtual DOM works, the reconciliation algorithm, state hooks, and memoization methods.
- **Asynchronous Execution**: Deeply understand Event Loops, Promise chains, macro-tasks, micro-tasks, and fetch/asynchronous error handling.
- **Performance Tradeoffs**: Discuss client-side rendering (CSR) vs. server-side rendering (SSR), lazy loading, bundle splits, and image optimizations.

#### 💡 STAR Framework Prompt:
If asked about a complex UI state issue, focus on:
1. **Situation**: Redundant state recalculations causing laggy input typing or stuttering animations on a list view.
2. **Action**: Implementing debounce timeouts, using React Refs to prevent state thrashing, and optimizing component re-renders with structural memoization.
3. **Result**: Smooth 60 FPS scrolling and seamless immediate typing response.`;
  }

  // 6. BACKEND ENGINEERING
  if (
    query.includes("backend") || 
    query.includes("database") || 
    query.includes("sql") || 
    query.includes("api") || 
    query.includes("concurrency") || 
    query.includes("node") || 
    query.includes("express")
  ) {
    return `### Backend Interview Preparation Guide
Backend engineering interviews test your ability to design robust, scale-ready systems that handle high throughput and maintain consistent data bounds.

#### 🌟 Key Concepts to Master:
- **System Concurrency**: Understand thread pooling, asynchronous async/await event patterns, thread safety, and locks.
- **Database Optimization**: Master index types (B-Trees, Hash Indexes), execution plans (EXPLAIN), normalization, and connection pooling.
- **Scale Strategies**: Explain caching topologies (Redis/Memcached), server clustering, database replication, and API rate limit structures.
- **API Architecture**: Master REST design conventions, error handling/status code mapping, and JSON payload optimizations.

#### 💡 Technical Tradeoff Guide:
When answering backend questions, always proactively contrast your choices:
- *"I chose SQL because this flow requires strict ACID compliance and multi-row relational consistency."*
- *"I added Redis to short-circuit database hits for static tables, balancing memory consumption against database connections."*`;
  }

  // 7. DATA ANALYST / DATA SCIENTIST
  if (
    query.includes("data") || 
    query.includes("analyst") || 
    query.includes("scientist") || 
    query.includes("statistic")
  ) {
    return `### Data Analyst & Data Scientist Interview Prep
Data interviews test your mathematical rigor, SQL mastery, and ability to extract actionable insights from large datasets.

#### 🌟 Key Topics to Cover:
- **Advanced SQL**: Master window functions (ROW_NUMBER, LEAD/LAG, RANK), CTEs, complex composite Joins, and aggregations.
- **Statistical Foundations**: Explain standard deviation, hypothesis testing (Z-test, T-test, Chi-Square), p-values, and confidence intervals.
- **Data Modeling (Science)**: Understand regressions, feature scaling, regularization (L1/L2), over-fitting, and classification metrics (Precision, Recall, F1-Score).
- **Visualization & Communication**: Translate numeric outputs into business actions.

*Pro Tip: Always state the business context first. Data without action is overhead. Explain how your analytical insight directly affects corporate revenue or user retention!*`;
  }

  // DEFAULT HIGH-QUALITY RESPONSE
  return `### Career Coaching & Placement Guide
Hi **${name}**! That is a fantastic preparation question. 

To help you get the absolute most out of PrepMate AI, let's explore your placement objectives. I can provide detailed guidance on:
- 📊 **Analyze my mock scores**: Analyze your scores across 4 evaluation dimensions and outline focus areas.
- 📝 **STAR Method**: Guide you on how to structure behavioral responses to impress recruiters.
- 💡 **SDE Checklist**: Provide a complete, structured curriculum roadmap to land software engineering roles.
- 📄 **Resume Writing**: Review and optimize your project description bullets using the Google X-Y-Z formula.

**To get started, try asking me:**
- *"How can I improve my technical depth score?"*
- *"Can you give me an example of a SDE roadmap?"*
- *"How should I write project descriptions on my resume?"*

Tell me a bit about your target role (SDE, Analyst, Frontend, Backend) and your next placement milestone, and let's craft a perfect game plan together!`;
}

/**
 * Career and Placement Assistant chat utilizing gemini-3.5-flash with candidates' actual scores.
 */
export async function chatWithAssistant(
  userProfile: { name: string; email: string },
  stats: DashboardStats | null,
  messageHistory: AssistantChatMessage[]
): Promise<string> {
  const ai = getGeminiClient();
  if (!ai) {
    return getSmartFallbackAssistantResponse(userProfile.name, stats, messageHistory);
  }

  let statsContext = "No prior mock interview sessions recorded yet. Encourage them to launch their first mock session.";
  if (stats && stats.sessionCount > 0) {
    statsContext = `
The candidate has completed ${stats.sessionCount} mock interview session(s).
Latest Overall Score: ${stats.latestScore}%
Average Skill Dimensions so far:
- Technical Accuracy / Correctness: ${stats.averageScores.correctness}/10
- Answer Depth & Tradeoffs: ${stats.averageScores.depth}/10
- Structure & Communication: ${stats.averageScores.communication}/10
- Problem Solving Approach: ${stats.averageScores.problem_solving}/10
    `;
  }

  const systemInstruction = `You are PrepMate AI, a brilliant and supportive personal career guide and university placement assistant.
Your goal is to help candidates land their dream technical roles by providing actionable guidance, mock interview preparation tips, and learning roadmaps.

Current candidate profile:
- Name: ${userProfile.name}
- Email: ${userProfile.email}

Candidate's current placement metrics from their mock sessions:
${statsContext}

GUIDELINES FOR YOUR RESPONSES:
1. Be warm, professional, encouraging, and highly specific. Use neat markdown highlights, lists, or bolding.
2. If the user asks about how to improve their scores, refer directly to their placement metrics above and give personalized tips for their lower dimensions.
3. If they ask general placement questions (e.g. how to prepare for Frontend/Backend/SDE), provide practical checklists.
4. Keep responses relatively concise and focused on high-quality career coach advice.
5. Do not break character. You are PrepMate AI.`;

  try {
    const contents = messageHistory.map(msg => ({
      role: msg.role === "user" ? "user" as const : "model" as const,
      parts: [{ text: msg.text }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "I apologize, but I could not formulate a response. Please try again.";
  } catch (error: any) {
    const isQuota = error?.status === 429 || 
                    error?.message?.includes("quota") || 
                    error?.message?.includes("429") ||
                    JSON.stringify(error)?.includes("RESOURCE_EXHAUSTED");

    if (isQuota) {
      console.warn("[Gemini API] Assistant chat Quota exceeded (429). Gracefully falling back to offline assistant responder.");
      const fallbackMsg = getSmartFallbackAssistantResponse(userProfile.name, stats, messageHistory);
      return `⚠️ **[API Quota Notice]** PrepMate is currently running in **Offline Mode** because your daily Gemini API quota has been reached.\n\nTo restore full real-time AI conversations, please add a custom API key in **Settings > Secrets**.\n\n---\n\n${fallbackMsg}`;
    } else {
      console.warn("[Gemini API] Assistant chat error:", error?.message || error);
      return getSmartFallbackAssistantResponse(userProfile.name, stats, messageHistory);
    }
  }
}

