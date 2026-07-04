import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, X, Medal, Crown, TrendingUp, Users } from "lucide-react";
import { LeaderboardEntry } from "../types";

interface LeaderboardProps {
  token: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const RANK_STYLES = [
  { border: "border-amber-500/40", bg: "bg-amber-500/10", text: "text-amber-400", icon: Crown },
  { border: "border-slate-400/30", bg: "bg-slate-400/5", text: "text-slate-300", icon: Medal },
  { border: "border-orange-600/30", bg: "bg-orange-600/5", text: "text-orange-400", icon: Medal },
];

export default function Leaderboard({ token, isOpen, onClose }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && token) fetchLeaderboard();
  }, [isOpen, token]);

  const fetchLeaderboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setEntries(json);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    } finally {
      setLoading(false);
    }
  };

  const currentUserEntry = entries.find((e) => e.isCurrentUser);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[560px] z-50 bg-[#0E0E10] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                  <Trophy className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg tracking-tight">Global Leaderboard</h2>
                  <p className="text-slate-500 text-xs font-mono">Top candidates ranked by average score</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-white/10 hover:border-red-500/30 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Your Rank Banner */}
            {currentUserEntry && (
              <div className="px-6 pt-4 shrink-0">
                <div className="flex items-center justify-between p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-white text-xs font-semibold">Your Rank</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs font-mono">{currentUserEntry.role}</span>
                    <span className="text-cyan-400 font-bold text-sm font-mono">#{currentUserEntry.rank}</span>
                    <span className="text-white font-bold text-sm">{currentUserEntry.averageScore}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-slate-500 text-xs font-mono animate-pulse">Loading leaderboard...</div>
                </div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
                  <Users className="w-10 h-10 text-slate-700" />
                  <p className="text-slate-500 text-sm">No scores recorded yet.</p>
                  <p className="text-slate-600 text-xs">Complete an interview to claim your spot!</p>
                </div>
              ) : (
                entries.map((entry, i) => {
                  const style = RANK_STYLES[entry.rank - 1] || { border: "border-white/5", bg: "bg-white/[0.02]", text: "text-slate-400", icon: null };
                  const RankIcon = style.icon;
                  return (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${style.border} ${style.bg} ${entry.isCurrentUser ? "ring-1 ring-cyan-500/30" : ""}`}
                    >
                      {/* Rank */}
                      <div className={`w-8 text-center font-extrabold text-base font-mono shrink-0 ${style.text}`}>
                        {entry.rank <= 3 && RankIcon ? (
                          <RankIcon className={`w-5 h-5 ${style.text} mx-auto`} />
                        ) : (
                          `#${entry.rank}`
                        )}
                      </div>

                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border ${style.border} ${entry.isCurrentUser ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30" : "bg-white/5 text-slate-400"} shrink-0`}>
                        {entry.userName.charAt(0).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold text-sm truncate ${entry.isCurrentUser ? "text-cyan-300" : "text-white"}`}>
                            {entry.isCurrentUser ? `${entry.userName} (You)` : entry.userName}
                          </p>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono truncate">{entry.role} · {entry.sessionCount} sessions</p>
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0">
                        <div className={`text-lg font-extrabold font-mono ${entry.rank === 1 ? "text-amber-400" : entry.rank === 2 ? "text-slate-300" : entry.rank === 3 ? "text-orange-400" : "text-white"}`}>
                          {entry.averageScore}%
                        </div>
                        {/* Mini score bar */}
                        <div className="w-16 h-1 bg-black/40 rounded-full mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${entry.rank === 1 ? "bg-amber-400" : "bg-cyan-500"}`}
                            style={{ width: `${entry.averageScore}%` }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
