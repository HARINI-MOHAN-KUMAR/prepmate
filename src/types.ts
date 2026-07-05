export enum ExperienceLevel {
  ENTRY = "Entry Level",
  MID = "Mid Level",
  SENIOR = "Senior Level"
}

export enum SessionStatus {
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed"
}

export interface RubricScores {
  correctness: number; // 0-10
  depth: number;       // 0-10
  communication: number; // 0-10
  problem_solving: number; // 0-10
}

export interface InterviewTurn {
  question: string;
  answer: string | null;
  action: "ask" | "evaluate" | "report";
  scores: RubricScores | null;
  feedback: string | null;
  follow_up_topic: string | null;
  timestamp: string;
  idealAnswerPoints?: string[];
}

export interface FinalReport {
  overallScore: number;
  strengths: string[];
  gaps: string[];
  personalizedPlan: string[];
  summary: string;
  recommendation: string;
  nextStepsRoadmap?: {
    dimension: string;
    score: number;
    topics: { title: string; description: string }[];
    resources: { name: string; url: string; type: string }[];
  };
}

export interface InterviewSession {
  id: string;
  userId: string;
  userName: string;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  status: SessionStatus;
  createdAt: string;
  currentTurnIndex: number;
  maxTurns: number;
  turns: InterviewTurn[];
  finalReport: FinalReport | null;
  starred?: boolean;
  targetCompany?: string;
  practiceMode?: "standard" | "weakness-drill";
  focusDimension?: string;
  isOfflineMode?: boolean;
  timerMode?: number | null; // seconds per question, null = no timer
  resumeText?: string; // Extracted skills or pasted resume text
}

export interface QuestionBankItem {
  id: string;
  role: string;       // e.g. "SDE-1 Backend", "Data Analyst", etc.
  topic: string;      // e.g. "Concurrency", "Database indexing", "SQL queries"
  difficulty: "Easy" | "Medium" | "Hard";
  idealAnswerPoints: string[];
  questionText: string;
  embedding?: number[]; // Local vector cache if enabled
  company?: string;     // e.g. "Google", "Amazon", "Meta", "Netflix", "Apple"
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  unlockedAt?: string;
  unlocked: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  createdAt: string;
  badges?: Badge[];
}

export interface DashboardStats {
  sessionCount: number;
  averageScores: RubricScores;
  latestScore: number;
  roleCounts: Record<string, number>;
  readinessScore: number;
  readinessLabel: string;
  weakestDimension: string;
  recommendedFocus: string[];
  history: {
    sessionId: string;
    targetRole: string;
    createdAt: string;
    overallScore: number;
    scores: RubricScores;
  }[];
  badges?: Badge[];
  streak?: { count: number; activeToday: boolean; milestoneReached: string | null };
}

export interface AssistantChatMessage {
  role: "user" | "model";
  text: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  role: string;
  averageScore: number;
  sessionCount: number;
  isCurrentUser?: boolean;
}
