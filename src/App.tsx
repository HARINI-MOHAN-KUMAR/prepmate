import React, { useState, useEffect } from "react";
import { 
  Sparkles, 
  LayoutDashboard, 
  LogOut, 
  Cpu, 
  HelpCircle,
  GraduationCap,
  Bot,
  Trophy,
  Medal
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  InterviewSession, 
  DashboardStats, 
  ExperienceLevel,
  SessionStatus
} from "./types";
import AuthScreen from "./components/AuthScreen";
import WelcomeScreen from "./components/WelcomeScreen";
import InterviewRoom from "./components/InterviewRoom";
import FinalReportView from "./components/FinalReportView";
import Dashboard from "./components/Dashboard";
import CareerAssistant from "./components/CareerAssistant";
import Achievements from "./components/Achievements";
import Leaderboard from "./components/Leaderboard";
import OnboardingModal from "./components/OnboardingModal";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const [activeView, setActiveView] = useState<"auth" | "dashboard" | "welcome" | "room" | "report">("auth");
  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  // Check for stored credentials on load
  useEffect(() => {
    const storedToken = localStorage.getItem("prepmate_token");
    const storedUser = localStorage.getItem("prepmate_user");
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setActiveView("dashboard");
        fetchStatsAndSessions(storedToken);
        // If a sessionId is provided in the URL, deep-link into that session's room
        try {
          const params = new URLSearchParams(window.location.search);
          const sid = params.get("sessionId");
          if (sid) {
            (async () => {
              const res = await fetch(`/api/sessions/${sid}`, {
                headers: { Authorization: `Bearer ${storedToken}` }
              });
              if (res.ok) {
                const sessionData = await res.json();
          // Show onboarding on first run after login if not seen
          const seen = localStorage.getItem("prepmate_seen_onboarding");
          if (!seen) setOnboardingOpen(true);
                setActiveSession(sessionData);
                setActiveView("room");
              }
            })();
          }
        } catch (e) {
          console.warn("Deep-link session load failed", e);
        }
      } catch (err) {
        localStorage.clear();
      }
    }
  }, []);

  const fetchStatsAndSessions = async (authToken: string) => {
    setLoading(true);
    try {
      // Fetch user profile stats
      const statsRes = await fetch("/api/stats", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const statsData = await statsRes.json();
      if (statsRes.ok) setStats(statsData);

      // Fetch user past sessions
      const sessionsRes = await fetch("/api/sessions", {
        headers: { "Authorization": `Bearer ${authToken}` }
      });
      const sessionsData = await sessionsRes.json();
      if (sessionsRes.ok) setSessions(sessionsData);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = (newToken: string, newUser: { id: string; name: string; email: string }) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("prepmate_token", newToken);
    localStorage.setItem("prepmate_user", JSON.stringify(newUser));
    setActiveView("dashboard");
    fetchStatsAndSessions(newToken);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setStats(null);
    setSessions([]);
    setActiveSession(null);
    localStorage.clear();
    setActiveView("auth");
  };

  const handleStartSession = async (
    targetRole: string, 
    experienceLevel: ExperienceLevel, 
    maxTurns: number,
    targetCompany?: string,
    practiceMode?: string,
    timerSeconds?: number | null,
    resumeText?: string
  ) => {
    if (!token) {
      // If the user isn't authenticated, send them to the auth screen
      // so they can sign in or launch the demo account.
      setActiveView("auth");
      alert("Please sign in or launch the demo account before starting a session.");
      return;
    }
    console.log("handleStartSession called", { targetRole, experienceLevel, maxTurns, targetCompany, practiceMode, timerSeconds, resumeText, token });
    setLoading(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ targetRole, experienceLevel, maxTurns, targetCompany, practiceMode, timerSeconds, resumeText })
      });
      const data = await res.json();
      console.log("handleStartSession response", { status: res.status, ok: res.ok, data });
      if (!res.ok) throw new Error(data.error || "Failed to start interview session");
      
      setActiveSession(data);
      setActiveView("room");
    } catch (err: any) {
      alert(err.message || "An error occurred starting the interview.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async (answer: string) => {
    if (!token || !activeSession) throw new Error("No active interview session found");

    const res = await fetch(`/api/sessions/${activeSession.id}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ answer })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to compile response evaluation");

    // Update session state
    setActiveSession(data.session);
    return {
      feedback: data.feedback,
      nextQuestion: data.nextQuestion,
      finalized: data.finalized
    };
  };

  const handleViewSessionReport = (session: InterviewSession) => {
    setActiveSession(session);
    if (session.status === SessionStatus.COMPLETED) {
      setActiveView("report");
    } else {
      setActiveView("room");
    }
  };

  const handleToggleStar = async (sessionId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/star`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, starred: data.starred } : s));
        if (activeSession && activeSession.id === sessionId) {
          setActiveSession(prev => prev ? { ...prev, starred: data.starred } : null);
        }
      }
    } catch (err) {
      console.error("Failed to toggle star status:", err);
    }
  };

  const handleGoToDashboard = () => {
    if (token) fetchStatsAndSessions(token);
    setActiveView("dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white">
      {/* HUD Header */}
      {token && user && (
        <header className="sticky top-0 z-50 bg-[#0E0E10]/95 backdrop-blur-md border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              onClick={handleGoToDashboard}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl group-hover:border-cyan-500/50 transition-all">
                <Sparkles className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-all" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                PrepMate<span className="text-cyan-500">AI</span>
              </h1>
            </div>
            <div className="hidden md:flex items-center gap-2 pl-3 ml-3 border-l border-white/10">
              <GraduationCap className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400 text-xs font-mono font-medium">University Placement Hub</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick dashboard nav */}
            {activeView !== "dashboard" && (
              <button
                onClick={handleGoToDashboard}
                className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-[#0E0E10] hover:bg-white/5 border border-white/10 text-slate-300 rounded-xl cursor-pointer transition-all"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            )}

            {/* Achievements */}
            <button
              onClick={() => setAchievementsOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-xl cursor-pointer transition-all"
              title="Achievements"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Badges</span>
            </button>

            {/* Leaderboard */}
            <button
              onClick={() => setLeaderboardOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 rounded-xl cursor-pointer transition-all"
              title="Leaderboard"
            >
              <Medal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ranks</span>
            </button>

            {/* AI Career Coach Toggle */}
            <button
              onClick={() => setAssistantOpen(true)}
              className="flex items-center gap-2 text-xs font-bold px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl cursor-pointer transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>

            {/* User Profile display */}
            <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
              <div className="text-left leading-none">
                <span className="text-xs font-bold text-white block">{user.name}</span>
                <span className="text-[9px] text-slate-500 block font-mono mt-0.5">{user.email}</span>
              </div>
            </div>

            {/* Log out */}
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl border border-white/5 hover:border-red-500/20 text-slate-500 hover:text-red-400 cursor-pointer transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>

            <button
              onClick={() => setOnboardingOpen(true)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 bg-white/5 hover:bg-white/6 border border-white/10 text-slate-300 rounded-xl cursor-pointer transition-all"
              title="Quickstart"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Quickstart</span>
            </button>
          </div>
        </header>
      )}

      {/* Main Content Render */}
      <main className="flex-1 flex flex-col justify-start">
        <AnimatePresence mode="wait">
          {activeView === "auth" && (
            <motion.div
              key="auth"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <AuthScreen onAuthSuccess={handleAuthSuccess} />
            </motion.div>
          )}

          {activeView === "dashboard" && stats && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <Dashboard 
                stats={stats} 
                onStartNewSession={() => setActiveView("welcome")}
                onViewSessionReport={handleViewSessionReport}
                sessions={sessions}
                onOpenAssistant={() => setAssistantOpen(true)}
                onToggleStar={handleToggleStar}
              />
            </motion.div>
          )}

          {activeView === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center"
            >
              <WelcomeScreen 
                userName={user?.name || "Candidate"} 
                onStartSession={handleStartSession}
                loading={loading}
              />
            </motion.div>
          )}

          {activeView === "room" && activeSession && (
            <motion.div
              key="room"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <InterviewRoom 
                session={activeSession}
                onSubmitAnswer={handleSubmitAnswer}
                onLeaveSession={handleGoToDashboard}
                token={token || ""}
              />
            </motion.div>
          )}

          {activeView === "report" && activeSession && activeSession.finalReport && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <FinalReportView 
                report={activeSession.finalReport}
                scores={
                  activeSession.turns.reduce((acc, t) => {
                    if (t.scores) {
                      acc.correctness += t.scores.correctness / activeSession.turns.length;
                      acc.depth += t.scores.depth / activeSession.turns.length;
                      acc.communication += t.scores.communication / activeSession.turns.length;
                      acc.problem_solving += t.scores.problem_solving / activeSession.turns.length;
                    }
                    return acc;
                  }, { correctness: 0, depth: 0, communication: 0, problem_solving: 0 })
                }
                onReset={() => setActiveView("welcome")}
                onGoToDashboard={handleGoToDashboard}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <OnboardingModal open={onboardingOpen} onClose={() => setOnboardingOpen(false)} />
      {/* Humble, clean Footer */}
      <footer className="py-6 px-6 text-center text-[10px] text-slate-500 font-mono border-t border-white/10 bg-[#0E0E10] select-none">
        PREPMATE AI • EMBEDDED RAG NEAREST NEIGHBORS • CHIEF PLACEMENT COACH ENGINE • 2026
      </footer>

      {/* Floating AI Assistant Toggle FAB */}
      {token && user && (
        <button
          onClick={() => setAssistantOpen(true)}
          className="fixed bottom-6 right-6 z-40 p-4 bg-cyan-500 hover:bg-cyan-400 text-black rounded-full cursor-pointer shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:scale-110 active:scale-95 transition-all group"
          title="Open AI Career Coach"
        >
          <Bot className="w-6 h-6 text-black group-hover:rotate-12 transition-all" />
        </button>
      )}

      {/* Career Assistant Drawer */}
      <CareerAssistant 
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        token={token}
        stats={stats}
      />

      {/* Achievements Panel */}
      <Achievements
        token={token}
        isOpen={achievementsOpen}
        onClose={() => setAchievementsOpen(false)}
      />

      {/* Leaderboard Panel */}
      <Leaderboard
        token={token}
        isOpen={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
      />
    </div>
  );
}
