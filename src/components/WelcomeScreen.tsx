import React, { useState } from "react";
import { Terminal, Code, BarChart2, Cpu, Briefcase, GraduationCap, Play, Timer } from "lucide-react";
import { motion } from "motion/react";
import { ExperienceLevel } from "../types";

interface WelcomeScreenProps {
  userName: string;
  onStartSession: (
    targetRole: string,
    experienceLevel: ExperienceLevel,
    maxTurns: number,
    targetCompany?: string,
    practiceMode?: string,
    timerSeconds?: number | null,
    resumeText?: string
  ) => void;
  loading: boolean;
}

const PRESET_ROLES = [
  {
    id: "be",
    title: "SDE-1 Backend",
    desc: "Database structures, concurrency control, system design, and API architectures.",
    icon: Terminal,
    color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
    hoverColor: "hover:border-cyan-500/50"
  },
  {
    id: "fe",
    title: "SDE-1 Frontend",
    desc: "Virtual DOM reconciliation, state coordination, web performance, CSS and client rendering.",
    icon: Code,
    color: "text-teal-400 border-teal-500/20 bg-teal-500/5",
    hoverColor: "hover:border-teal-500/50"
  },
  {
    id: "da",
    title: "Data Analyst",
    desc: "SQL relational aggregations, data joins, statistics, and cohort behavior retention.",
    icon: BarChart2,
    color: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    hoverColor: "hover:border-amber-500/50"
  },
  {
    id: "ds",
    title: "Data Scientist",
    desc: "Supervised classifiers, overfitting regularizations (Lasso/Ridge), metrics, and PCA dimension reduction.",
    icon: Cpu,
    color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/5",
    hoverColor: "hover:border-emerald-500/50"
  }
];

export default function WelcomeScreen({ userName, onStartSession, loading }: WelcomeScreenProps) {
  const [selectedPreset, setSelectedPreset] = useState("be");
  const [customRole, setCustomRole] = useState("");
  const [useCustomRole, setUseCustomRole] = useState(false);
  const [experience, setExperience] = useState<ExperienceLevel>(ExperienceLevel.ENTRY);
  const [turns, setTurns] = useState(4);
  const [targetCompany, setTargetCompany] = useState("");
  const [practiceMode, setPracticeMode] = useState<"standard" | "weakness-drill">("standard");
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [resumeText, setResumeText] = useState("");

  const handleStart = () => {
    const finalRole = useCustomRole ? customRole.trim() : PRESET_ROLES.find(r => r.id === selectedPreset)?.title;
    if (!finalRole) return;
    onStartSession(finalRole, experience, turns, targetCompany || undefined, practiceMode, timerSeconds, resumeText.trim() || undefined);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 w-full">
      <div className="mb-10 text-center md:text-left md:flex justify-between items-center border-b border-white/10 pb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Configure Interview Room
          </h2>
          <div className="mt-4 hidden md:block">
              <picture>
                <source srcSet="/assets/images/tech-hero.svg" type="image/svg+xml" />
                <img src="/assets/images/tech-hero.svg" alt="tech hero" loading="lazy" decoding="async" className="rounded-xl shadow-xl w-full max-w-[760px]" />
              </picture>
          </div>
          <p className="text-slate-400 mt-1 text-sm">
            Welcome, <span className="text-cyan-400 font-semibold">{userName}</span>. Select your target profile to begin.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[#0E0E10] border border-white/10 rounded-xl text-slate-400 text-xs font-mono">
          <GraduationCap className="w-4 h-4 text-cyan-400" />
          placement_cycle_2026
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Side: Role Selector */}
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-cyan-400" />
            1. Select Placement Track
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            {PRESET_ROLES.map((role) => {
              const IconComp = role.icon;
              const isSelected = !useCustomRole && selectedPreset === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => {
                    setSelectedPreset(role.id);
                    setUseCustomRole(false);
                  }}
                  className={`text-left p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden cursor-pointer ${
                    isSelected 
                      ? "border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/5" 
                      : "border-white/10 bg-[#0E0E10] hover:bg-white/5 " + role.hoverColor
                  }`}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-xl border w-fit ${role.color}`}>
                      <IconComp className="w-5 h-5" />
                    </div>
                    {/* role thumbnail */}
                    <img src={`/assets/images/${role.id === 'be' ? 'backend' : role.id === 'fe' ? 'frontend' : role.id === 'da' ? 'data' : 'ml'}.svg`} alt="role" className="w-14 h-14 rounded-md bg-white/3 p-1" />
                  </div>
                  <h4 className="text-white font-bold text-sm mb-1">{role.title}</h4>
                  <p className="text-slate-400 text-xs leading-relaxed">{role.desc}</p>
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-cyan-450" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative flex items-center justify-center py-2">
            <div className="border-t border-white/10 w-full"></div>
            <span className="absolute bg-[#0A0A0B] px-3 text-xs font-medium text-slate-500 font-mono">OR</span>
          </div>

          {/* Custom Role Input */}
          <div className={`p-5 rounded-2xl border transition-all ${
            useCustomRole ? "border-cyan-500 bg-cyan-500/5" : "border-white/10 bg-[#0E0E10]"
          }`}>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useCustomRole}
                onChange={(e) => setUseCustomRole(e.target.checked)}
                className="rounded border-white/10 bg-[#0A0A0B] text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm font-semibold text-slate-300">Target a Custom Role</span>
            </label>

            {useCustomRole && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-4"
              >
                <input
                  type="text"
                  required
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="e.g. Systems Engineer, DevOps SRE, Cloud Intern"
                  className="w-full px-4 py-2.5 bg-[#0A0A0B] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-sm transition-all"
                />
                <p className="text-slate-500 text-[10px] mt-1.5 leading-relaxed">
                  *Gemini will generate adaptive questions grounded in specialized topics for this custom title.
                </p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right Side: Setup Options */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-300 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-cyan-400" />
            2. Parameter Settings
          </h3>

          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-6 space-y-6">
            {/* Practice Mode Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Practice Mode
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => setPracticeMode("standard")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                    practiceMode === "standard"
                      ? "border-cyan-500 bg-cyan-500/10 text-white"
                      : "border-white/10 bg-[#0A0A0B] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Standard
                </button>
                <button
                  type="button"
                  onClick={() => setPracticeMode("weakness-drill")}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                    practiceMode === "weakness-drill"
                      ? "border-amber-500 bg-amber-500/10 text-white"
                      : "border-white/10 bg-[#0A0A0B] text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Weakness Drill
                </button>
              </div>
              {practiceMode === "weakness-drill" && (
                <p className="text-[10px] text-amber-400/90 mt-1.5 leading-normal">
                  ✨ skips traditional questions to target your past lowest-scoring rubric dimension.
                </p>
              )}
            </div>

            {/* Experience Selection - disabled if weakness drill is checked since it targets weaknesses */}
            <div className={practiceMode === "weakness-drill" ? "opacity-40 pointer-events-none" : ""}>
              <label className="block text-xs font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
                Target Difficulty
              </label>
              <div className="grid grid-cols-1 gap-2.5">
                {[ExperienceLevel.ENTRY, ExperienceLevel.MID, ExperienceLevel.SENIOR].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setExperience(level)}
                    className={`py-2.5 px-4 rounded-xl border text-xs font-medium transition-all text-left flex justify-between items-center cursor-pointer ${
                      experience === level
                        ? "border-cyan-500 bg-cyan-500/10 text-white"
                        : "border-white/10 bg-[#0A0A0B] text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span>{level}</span>
                    <span className="text-[10px] opacity-60">
                      {level === ExperienceLevel.ENTRY ? "Theoretical focus" : level === ExperienceLevel.MID ? "Tradeoffs & Depth" : "Architectural Scale"}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Company Focus */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Target Company Focus
              </label>
              <select
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                className="w-full mt-1.5 px-3 py-2.5 bg-[#0A0A0B] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-all cursor-pointer"
              >
                <option value="">Any / General Technical</option>
                <option value="Google">Google-style</option>
                <option value="Amazon">Amazon-style (STAR/Leadership)</option>
                <option value="Meta">Meta-style</option>
                <option value="Microsoft">Microsoft-style</option>
                <option value="Netflix">Netflix-style</option>
                <option value="Stripe">Stripe-style</option>
              </select>
            </div>

            {/* Per-Question Timer */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-cyan-400" />
                Per-Question Timer
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Off", value: null },
                  { label: "2 min", value: 120 },
                  { label: "3 min", value: 180 },
                  { label: "5 min", value: 300 },
                ].map((opt) => (
                  <button
                    key={String(opt.label)}
                    type="button"
                    onClick={() => setTimerSeconds(opt.value)}
                    className={`py-2 rounded-xl border text-xs font-medium transition-all text-center cursor-pointer ${
                      timerSeconds === opt.value
                        ? "border-cyan-500 bg-cyan-500/10 text-white"
                        : "border-white/10 bg-[#0A0A0B] text-slate-400 hover:text-slate-200 hover:border-white/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {timerSeconds && (
                <p className="text-[10px] text-cyan-400/70 mt-1.5">
                  ⏱ Auto-submits when time runs out.
                </p>
              )}
            </div>

            {/* Turn Count Selector */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Session Turn Count
                </label>
                <span className="text-cyan-400 text-xs font-mono font-bold">
                  {turns} Questions
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="6"
                value={turns}
                onChange={(e) => setTurns(parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
                <span>3 (Express)</span>
                <span>4 (Standard)</span>
                <span>6 (Deep Dive)</span>
              </div>
            </div>

            {/* Resume / Skills Input (Industry Level Feature) */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                Resume / Key Skills (Optional)
              </label>
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume, CV, or core technical skills here..."
                rows={3}
                className="w-full px-3 py-2 bg-[#0A0A0B] border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-all resize-none"
              />
              <p className="text-[10px] text-emerald-400/90 mt-1.5 leading-normal">
                ✨ The AI will dynamically tailor questions to challenge you on these specific skills!
              </p>
            </div>

            {/* Start Button */}
            <button
              onClick={handleStart}
              disabled={loading || (useCustomRole && !customRole.trim())}
              className="w-full flex justify-center items-center gap-2.5 py-3.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-950 text-black text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-[1.01] active:scale-[0.98] transition-all cursor-pointer"
            >
              {loading ? (
                <span>Aligning RAG Vectors...</span>
              ) : (
                <>
                  <span>Enter Interview Room</span>
                  <Play className="w-4 h-4 fill-black text-black" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
