import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, X, Star, Lock, Sparkles, Flame, Zap } from "lucide-react";
import { Badge } from "../types";

interface AchievementsProps {
  token: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface AchievementData {
  badges: Badge[];
  streak: number;
  totalSessions: number;
  highestScore: number;
}

export default function Achievements({ token, isOpen, onClose }: AchievementsProps) {
  const [data, setData] = useState<AchievementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [newlyUnlocked, setNewlyUnlocked] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && token) {
      fetchAchievements();
    }
  }, [isOpen, token]);

  const fetchAchievements = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/achievements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) {
        // Detect newly unlocked badges via sessionStorage
        const prev = JSON.parse(sessionStorage.getItem("prev_badges") || "[]");
        const newBadge = json.badges.find(
          (b: Badge) => b.unlocked && !prev.includes(b.id)
        );
        if (newBadge) setNewlyUnlocked(newBadge.name);
        sessionStorage.setItem(
          "prev_badges",
          JSON.stringify(json.badges.filter((b: Badge) => b.unlocked).map((b: Badge) => b.id))
        );
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch achievements", e);
    } finally {
      setLoading(false);
    }
  };

  const unlockedCount = data?.badges.filter((b) => b.unlocked).length ?? 0;
  const totalCount = data?.badges.length ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-x-4 top-[5vh] bottom-[5vh] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[600px] z-50 bg-[#0E0E10] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg tracking-tight">Achievements</h2>
                  <p className="text-slate-500 text-xs font-mono">
                    {unlockedCount}/{totalCount} badges unlocked
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-white/10 hover:border-red-500/30 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Newly Unlocked Toast */}
            <AnimatePresence>
              {newlyUnlocked && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="px-6 pt-4"
                >
                  <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                    <p className="text-amber-300 text-xs font-semibold">
                      🎉 New badge unlocked: <span className="text-white">{newlyUnlocked}</span>!
                    </p>
                    <button onClick={() => setNewlyUnlocked(null)} className="ml-auto text-slate-500 hover:text-white cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stats Row */}
            {data && (
              <div className="grid grid-cols-3 gap-3 px-6 pt-5 shrink-0">
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center">
                  <Flame className="w-5 h-5 text-orange-500 fill-orange-500 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white font-mono">{data.streak}</div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Day Streak</div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center">
                  <Star className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white font-mono">{data.totalSessions}</div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Sessions</div>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 text-center">
                  <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <div className="text-xl font-bold text-white font-mono">{data.highestScore}%</div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Best Score</div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {data && (
              <div className="px-6 pt-4 shrink-0">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mb-1.5">
                  <span>BADGE PROGRESS</span>
                  <span className="text-amber-400 font-bold">{Math.round((unlockedCount / totalCount) * 100)}%</span>
                </div>
                <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(unlockedCount / totalCount) * 100}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.4)]"
                  />
                </div>
              </div>
            )}

            {/* Badges Grid */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-slate-500 text-xs font-mono animate-pulse">Loading achievements...</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {data?.badges.map((badge, i) => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`relative p-4 rounded-2xl border transition-all ${
                        badge.unlocked
                          ? "bg-amber-500/5 border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.05)]"
                          : "bg-black/20 border-white/5 opacity-50"
                      }`}
                    >
                      {/* Lock overlay */}
                      {!badge.unlocked && (
                        <div className="absolute top-3 right-3">
                          <Lock className="w-3 h-3 text-slate-600" />
                        </div>
                      )}

                      {/* Glow for unlocked */}
                      {badge.unlocked && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      )}

                      <div className="text-3xl mb-2 leading-none filter grayscale-0">
                        {badge.unlocked ? badge.icon : "🔒"}
                      </div>
                      <h4 className={`font-bold text-sm mb-0.5 ${badge.unlocked ? "text-white" : "text-slate-600"}`}>
                        {badge.name}
                      </h4>
                      <p className={`text-[11px] leading-snug ${badge.unlocked ? "text-slate-400" : "text-slate-700"}`}>
                        {badge.description}
                      </p>
                      {badge.unlocked && badge.unlockedAt && (
                        <p className="text-[9px] text-amber-600 font-mono mt-1.5">
                          Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
