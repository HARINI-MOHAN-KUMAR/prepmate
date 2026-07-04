import React, { useState } from "react";
import { 
  BarChart3, 
  Clock, 
  Trophy, 
  Compass, 
  ArrowRight, 
  CheckCircle2, 
  FolderGit, 
  HelpCircle,
  Briefcase,
  Play,
  TrendingUp,
  UserCheck,
  Bot,
  MessageSquare,
  Flame,
  Star
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { DashboardStats, InterviewSession } from "../types";
import SessionReplay from "./SessionReplay";

interface DashboardProps {
  stats: DashboardStats;
  onStartNewSession: () => void;
  onViewSessionReport: (session: InterviewSession) => void;
  sessions: InterviewSession[];
  onOpenAssistant?: () => void;
  onToggleStar?: (sessionId: string) => void;
}

/**
 * Custom Tooltip for Recharts mapping detailed score parameters.
 */
const CustomChartTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0E0E10] border border-white/10 rounded-xl p-3.5 shadow-2xl font-sans text-xs space-y-2 max-w-[220px] select-none">
        <div className="flex justify-between items-center border-b border-white/10 pb-1.5">
          <span className="text-slate-400 font-mono text-[10px] uppercase tracking-wider">{data.name}</span>
          <span className="font-bold text-cyan-400 font-mono text-xs">{data.score}%</span>
        </div>
        <p className="font-bold text-white leading-tight truncate">{data.role}</p>
        <div className="space-y-1 pt-1 font-mono text-[10px] text-slate-450">
          <div className="flex justify-between">
            <span className="text-slate-400">Accuracy:</span>
            <span className="text-cyan-400">{data.correctness}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Depth:</span>
            <span className="text-teal-400">{data.depth}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Communication:</span>
            <span className="text-emerald-400">{data.communication}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Solve Path:</span>
            <span className="text-pink-400">{data.problem_solving}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

/**
 * Enhanced Recharts Line/Area Chart visualizing performance scores over the last 10 completed interview sessions.
 */
function HistoryLineChart({ history }: { history: DashboardStats["history"] }) {
  if (!history || history.length === 0) {
    return (
      <div className="h-40 flex items-center justify-center text-slate-500 font-mono text-xs border border-dashed border-white/10 rounded-xl bg-black/20">
        Record first session to track trends
      </div>
    );
  }

  // Map and sort chronologically by date, choosing only the last 10 completed sessions
  const sortedHistory = [...history]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-10);

  const chartData = sortedHistory.map((item, index) => {
    const date = new Date(item.createdAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return {
      index: index + 1,
      name: date,
      score: item.overallScore,
      role: item.targetRole,
      correctness: Math.round((item.scores?.correctness || 0) * 10),
      depth: Math.round((item.scores?.depth || 0) * 10),
      communication: Math.round((item.scores?.communication || 0) * 10),
      problem_solving: Math.round((item.scores?.problem_solving || 0) * 10),
    };
  });

  return (
    <div className="w-full select-none p-4 bg-black/40 rounded-2xl border border-white/5 h-[280px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#52525b" 
            fontSize={10} 
            fontFamily="monospace"
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis 
            domain={[0, 100]} 
            stroke="#52525b" 
            fontSize={10} 
            fontFamily="monospace"
            tickLine={false}
            axisLine={false}
            dx={-5}
          />
          <RechartsTooltip content={<CustomChartTooltip />} />
          <Area 
            type="monotone" 
            dataKey="score" 
            stroke="#06b6d4" 
            strokeWidth={2.5}
            fillOpacity={1} 
            fill="url(#colorScore)" 
            activeDot={{ r: 6, fill: "#22d3ee", stroke: "#083344", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Calculates user's daily streak of completed sessions using midnight local timestamp comparison.
 */
function calculateStreak(history: { createdAt: string }[]): { count: number; activeToday: boolean; milestoneReached: string | null } {
  if (!history || history.length === 0) {
    return { count: 0, activeToday: false, milestoneReached: null };
  }

  // Get unique local date midnight timestamps
  const uniqueDates = Array.from(
    new Set(
      history.map(item => {
        const d = new Date(item.createdAt);
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      })
    )
  ).sort((a, b) => b - a); // descending (newest first)

  if (uniqueDates.length === 0) {
    return { count: 0, activeToday: false, milestoneReached: null };
  }

  const msInDay = 24 * 60 * 60 * 1000;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - msInDay;

  const latestDate = uniqueDates[0];

  // If latest session is older than yesterday, the streak is broken
  if (latestDate < yesterdayStart) {
    return { count: 0, activeToday: false, milestoneReached: null };
  }

  let streakCount = 1;
  const activeToday = latestDate === todayStart;

  // Track consecutive days going backward
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const current = uniqueDates[i];
    const next = uniqueDates[i + 1];
    const diff = current - next;
    const diffDays = Math.round(diff / msInDay);

    if (diffDays === 1) {
      streakCount++;
    } else if (diffDays > 1) {
      break; // Gap detected
    }
  }

  // Define milestone levels for celebration
  let milestoneReached: string | null = null;
  if (streakCount >= 7) {
    milestoneReached = "7+ Days Golden Master";
  } else if (streakCount >= 5) {
    milestoneReached = "5+ Days High Achiever";
  } else if (streakCount >= 3) {
    milestoneReached = "3+ Days Dedicated Prep";
  } else if (streakCount === 2) {
    milestoneReached = "Consecutive Synergy";
  }

  return { count: streakCount, activeToday, milestoneReached };
}

export default function Dashboard({ stats, onStartNewSession, onViewSessionReport, sessions, onOpenAssistant, onToggleStar }: DashboardProps) {
  const [replaySession, setReplaySession] = useState<InterviewSession | null>(null);
  const [filter, setFilter] = useState<"all" | "starred">("all");
  const hasHistory = stats.sessionCount > 0;
  const streak = calculateStreak(stats.history);

  if (replaySession) {
    return (
      <SessionReplay 
        session={replaySession} 
        onClose={() => setReplaySession(null)} 
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8 w-full">
      {/* Dashboard Top Title HUD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-white/10 pb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-cyan-500" />
            Placement Analytics Desk
          </h2>
          <p className="text-slate-400 mt-1 text-sm">
            Monitor historical evaluation progress, skill dimension breakdowns, and portfolio readiness diagnostics.
          </p>
        </div>
        <button
          onClick={onStartNewSession}
          className="flex justify-center items-center gap-2 py-3 px-6 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-bold rounded-xl cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-[1.01] active:scale-[0.98] transition-all"
        >
          <span>Launch Mock Session</span>
          <Play className="w-4 h-4 fill-black text-black" />
        </button>
      </div>

      {!hasHistory ? (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-[#0E0E10] border border-white/10 rounded-3xl space-y-5 max-w-xl mx-auto">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Trophy className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-white font-bold text-lg">No placement records found</h3>
            <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
              Your academic mock interview workspace is ready. Launch a session to retrieve standard RAG questions and compile diagnostics.
            </p>
          </div>
          <button
            onClick={onStartNewSession}
            className="inline-flex justify-center items-center gap-2 py-2.5 px-5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
          >
            Start First Session
            <ArrowRight className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      ) : (
        /* Metrics dashboard panels */
        <div className="space-y-8">
          {/* HUD Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-5 space-y-1.5 shadow">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">SESSIONS COMPLETED</span>
              <div className="text-2xl font-extrabold text-white font-mono">{stats.sessionCount}</div>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 leading-none">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> All evaluated via RAG
              </span>
            </div>

            <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-5 space-y-1.5 shadow">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">LATEST ASSESSMENT</span>
              <div className="text-2xl font-extrabold text-white font-mono">{stats.latestScore}%</div>
              <span className="text-[10px] text-slate-400 flex items-center gap-1 leading-none">
                <Trophy className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> Target standard: 80%
              </span>
            </div>

            {/* Daily Streak Card */}
            <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-5 space-y-1.5 shadow col-span-2 lg:col-span-1 relative overflow-hidden group">
              {streak.count > 0 && (
                <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 bg-orange-500/5 rounded-full blur-xl group-hover:bg-orange-500/10 transition-all duration-300" />
              )}
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">DAILY STREAK</span>
              <div className="text-2xl font-extrabold text-white font-mono flex items-center gap-1.5">
                <Flame className={`w-5.5 h-5.5 ${streak.count > 0 ? "text-orange-500 fill-orange-500 animate-pulse" : "text-slate-600"}`} />
                {streak.count} {streak.count === 1 ? "Day" : "Days"}
              </div>
              {streak.count > 0 ? (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-450 flex items-center gap-1 leading-none">
                    {streak.activeToday ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        Active today! Keep it up!
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        Preserve streak today
                      </>
                    )}
                  </span>
                  {streak.milestoneReached && (
                    <span className="inline-block text-[8px] font-mono px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 font-bold border border-orange-500/20 uppercase tracking-wider">
                      {streak.milestoneReached}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-slate-500 flex items-center gap-1 leading-none">
                  Start mock prep today!
                </span>
              )}
            </div>

            <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-5 space-y-1.5 shadow col-span-2">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">AVERAGE SKILL DIMENSIONS</span>
              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono font-semibold pt-1">
                <div className="flex justify-between border-r border-white/10 pr-2">
                  <span className="text-slate-400">Accuracy</span>
                  <span className="text-cyan-400">{stats.averageScores.correctness}/10</span>
                </div>
                <div className="flex justify-between pl-1">
                  <span className="text-slate-400">Depth</span>
                  <span className="text-teal-400">{stats.averageScores.depth}/10</span>
                </div>
                <div className="flex justify-between border-r border-white/10 pr-2">
                  <span className="text-slate-400">Communication</span>
                  <span className="text-emerald-400">{stats.averageScores.communication}/10</span>
                </div>
                <div className="flex justify-between pl-1">
                  <span className="text-slate-400">Solve Path</span>
                  <span className="text-amber-400">{stats.averageScores.problem_solving}/10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical progression graph */}
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-white font-bold text-sm font-mono uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Score Progression Trend
            </h3>
            <HistoryLineChart history={stats.history} />
          </div>

          {/* AI Career Coach Panel Promo Card */}
          {onOpenAssistant && (
            <div className="bg-gradient-to-r from-cyan-500/5 via-transparent to-transparent border border-cyan-500/15 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-lg">
              <div className="space-y-1 text-left">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block font-bold">PREPMATE CO-PILOT ASSISTANT</span>
                <h3 className="text-white font-extrabold text-base tracking-tight">Need personalized learning advice or resume guidance?</h3>
                <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
                  Your dedicated AI Placement Guide understands your academic stats, latest score ({stats.latestScore}%), and skill dimensions, and is ready to recommend custom roadmap topics to master.
                </p>
              </div>
              <button
                onClick={onOpenAssistant}
                className="w-full md:w-auto px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)] hover:scale-[1.02] active:scale-[0.98]"
              >
                <Bot className="w-4 h-4 text-black" />
                <span>Chat with AI Coach</span>
              </button>
            </div>
          )}

          {/* Session history database view */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="text-white font-bold text-sm font-mono uppercase tracking-widest flex items-center gap-2">
                <FolderGit className="w-4 h-4 text-cyan-400" />
                Historical Evaluation Dossiers
              </h3>

              {/* Filter Tabs */}
              <div className="flex items-center bg-[#0E0E10] border border-white/10 rounded-xl p-1 text-xs shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                    filter === "all"
                      ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  All ({sessions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("starred")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    filter === "starred"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "text-slate-400 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${filter === "starred" ? "fill-amber-400 text-amber-400" : ""}`} />
                  Starred ({sessions.filter(s => s.starred).length})
                </button>
              </div>
            </div>

            <div className="bg-[#0E0E10] border border-white/10 rounded-2xl overflow-hidden shadow-xl divide-y divide-white/10">
              {(() => {
                const filteredSessions = filter === "starred" ? sessions.filter((s) => s.starred) : sessions;
                if (filteredSessions.length === 0) {
                  return (
                    <div className="p-12 text-center text-slate-500 font-mono text-xs space-y-2">
                      <Star className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                      <p>
                        {filter === "starred"
                          ? "No starred sessions found. Click the star icon on any evaluation dossier to bookmark it!"
                          : "No interview sessions recorded yet."}
                      </p>
                    </div>
                  );
                }

                return filteredSessions.map((session) => {
                  const finished = session.status === "completed";
                  const dateStr = new Date(session.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  });

                  return (
                    <div key={session.id} className="p-5 flex flex-wrap items-center justify-between gap-4 bg-transparent hover:bg-white/5 transition-all duration-300">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="text-white font-bold text-sm">{session.targetRole}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#0A0A0B] text-slate-400 font-mono border border-white/5">
                            {session.experienceLevel}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Session Date: {dateStr}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Bookmark / Star Toggle Button */}
                        <button
                          type="button"
                          onClick={() => onToggleStar && onToggleStar(session.id)}
                          className={`p-2 rounded-lg border transition-all cursor-pointer ${
                            session.starred 
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" 
                              : "bg-[#0A0A0B] border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20"
                          }`}
                          title={session.starred ? "Remove from starred" : "Bookmark/Star session"}
                        >
                          <Star className={`w-4 h-4 ${session.starred ? "fill-amber-400 text-amber-400" : ""}`} />
                        </button>

                        {finished ? (
                          <>
                            <div className="text-right mr-2">
                              <span className="text-[10px] text-slate-500 font-mono block">FINAL SCORE</span>
                              <span className="text-cyan-400 font-mono font-bold text-sm">
                                {session.finalReport?.overallScore || 0}%
                              </span>
                            </div>
                            <button
                              onClick={() => setReplaySession(session)}
                              className="px-3.5 py-2 bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 text-cyan-400 hover:text-cyan-300 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Replay
                            </button>
                            <button
                              onClick={() => onViewSessionReport(session)}
                              className="px-3.5 py-2 bg-[#0A0A0B] border border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                            >
                              View Report
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                              Sat Incomplete
                            </span>
                            <button
                              onClick={() => onViewSessionReport(session)}
                              className="px-4 py-2 bg-[#0A0A0B] border border-white/10 hover:border-cyan-500/40 text-cyan-400 hover:text-cyan-300 text-xs font-semibold rounded-lg transition-all cursor-pointer"
                            >
                              Resume Room
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
