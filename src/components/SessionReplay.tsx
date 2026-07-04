import React, { useState } from "react";
import { 
  X, 
  MessageSquare, 
  Bot, 
  User, 
  Award, 
  ArrowLeft, 
  Calendar, 
  Zap, 
  Sliders, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import { motion } from "motion/react";
import { InterviewSession, InterviewTurn } from "../types";

interface SessionReplayProps {
  session: InterviewSession;
  onClose: () => void;
}

export default function SessionReplay({ session, onClose }: SessionReplayProps) {
  const [selectedTurnIndex, setSelectedTurnIndex] = useState<number>(-1); // -1 means "All Turns"

  const dateStr = new Date(session.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const turnsToDisplay = selectedTurnIndex === -1 
    ? session.turns 
    : [session.turns[selectedTurnIndex]];

  // Function to render score badges for rubrics
  const renderScoreBar = (label: string, score: number, colorClass: string) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-slate-400">{label}</span>
          <span className={`${colorClass} font-bold`}>{score}/10</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500`}
            style={{ 
              width: `${score * 10}%`,
              backgroundColor: colorClass === "text-cyan-400" ? "#06b6d4" : 
                               colorClass === "text-teal-400" ? "#2dd4bf" : 
                               colorClass === "text-emerald-400" ? "#10b981" : "#ec4899"
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 space-y-8 animate-fade-in">
      {/* Back button and title */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="space-y-1">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-400 font-mono transition-all mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </button>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-8 h-8 text-cyan-400" />
            Placement Session Replay
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-400 mt-1">
            <span className="font-bold text-slate-200">{session.targetRole}</span>
            <span className="text-white/20">•</span>
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-mono">
              {session.experienceLevel}
            </span>
            <span className="text-white/20">•</span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              {dateStr}
            </span>
          </div>
        </div>

        {/* Big Overall Score Badge */}
        {session.finalReport && (
          <div className="bg-[#0E0E10] border border-cyan-500/20 px-5 py-3 rounded-2xl flex flex-col items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)]">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest leading-none mb-1">SCORE</span>
            <span className="text-3xl font-black font-mono text-cyan-400">{session.finalReport.overallScore}%</span>
          </div>
        )}
      </div>

      {/* Turn Navigation Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4 select-none">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mr-2 block">JUMP TO TURN:</span>
        <button
          onClick={() => setSelectedTurnIndex(-1)}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
            selectedTurnIndex === -1 
              ? "bg-cyan-500 border-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
              : "bg-[#0E0E10] border-white/10 text-slate-400 hover:text-white hover:border-white/20"
          }`}
        >
          All Turns
        </button>
        {session.turns.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedTurnIndex(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
              selectedTurnIndex === idx 
                ? "bg-cyan-500 border-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                : "bg-[#0E0E10] border-white/10 text-slate-400 hover:text-white hover:border-white/20"
            }`}
          >
            Turn {idx + 1}
          </button>
        ))}
      </div>

      {/* Transcript List Container */}
      <div className="space-y-10">
        {turnsToDisplay.map((turn, mapIdx) => {
          const actualIdx = selectedTurnIndex === -1 ? mapIdx : selectedTurnIndex;
          return (
            <div 
              key={actualIdx} 
              className="bg-[#0E0E10] border border-white/10 rounded-2xl overflow-hidden shadow-xl"
            >
              {/* Turn Subheader Title */}
              <div className="px-6 py-4 bg-[#0A0A0B] border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center font-mono text-xs font-bold">
                    {actualIdx + 1}
                  </span>
                  <h3 className="text-white font-bold text-sm">Question & Turn Evaluation Transcript</h3>
                </div>
                {turn.scores && (
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-mono font-semibold text-slate-300">
                      Average Turn Score: {Math.round(
                        ((turn.scores.correctness + turn.scores.depth + turn.scores.communication + turn.scores.problem_solving) / 4) * 10
                      )}%
                    </span>
                  </div>
                )}
              </div>

              {/* Side-by-Side Grid Layout */}
              <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
                
                {/* LEFT COLUMN: Transcript (Question & Answer) */}
                <div className="p-6 space-y-6">
                  {/* Question */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                      <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
                      Interviewer Prompt
                    </div>
                    <blockquote className="text-sm text-white font-medium bg-white/[0.02] border border-white/5 rounded-xl p-4 leading-relaxed font-sans">
                      {turn.question}
                    </blockquote>
                  </div>

                  {/* Candidate Answer */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                      <User className="w-4 h-4 text-emerald-400 shrink-0" />
                      Candidate Transcript Answer
                    </div>
                    {turn.answer ? (
                      <div className="text-sm text-slate-300 bg-white/[0.02] border border-white/5 rounded-xl p-4 leading-relaxed font-sans whitespace-pre-wrap">
                        {turn.answer}
                      </div>
                    ) : (
                      <div className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 leading-relaxed font-mono">
                        ⚠️ No answer provided. (Turn was skipped or timed out)
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: AI Feedback & Scores */}
                <div className="p-6 space-y-6 bg-[#0B0B0D]">
                  
                  {/* Scoring Rubrics */}
                  {turn.scores ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[10px] uppercase tracking-widest border-b border-white/5 pb-2">
                        <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
                        Skills Rubric Assessment
                      </div>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        {renderScoreBar("Technical Accuracy", turn.scores.correctness, "text-cyan-400")}
                        {renderScoreBar("Answer Depth", turn.scores.depth, "text-teal-400")}
                        {renderScoreBar("Communication", turn.scores.communication, "text-emerald-400")}
                        {renderScoreBar("Problem Solving", turn.scores.problem_solving, "text-pink-400")}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-white/5 rounded-xl text-center text-xs text-slate-500 font-mono">
                      No numeric evaluation rubric available.
                    </div>
                  )}

                  {/* AI Comments / Critiques */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] uppercase tracking-widest">
                      <Bot className="w-4 h-4 text-cyan-400 shrink-0" />
                      Evaluation & Structural Critiques
                    </div>
                    {turn.feedback ? (
                      <div className="text-xs text-slate-300 leading-relaxed space-y-2 bg-white/[0.02] border border-white/5 rounded-xl p-4 font-sans">
                        {turn.feedback.split("\n").map((line, fIdx) => {
                          const trimmed = line.trim();
                          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                            return (
                              <li key={fIdx} className="list-disc ml-4 mt-1">
                                {trimmed.slice(2)}
                              </li>
                            );
                          }
                          return <p key={fIdx} className="mt-1">{line}</p>;
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 italic">
                        No AI evaluation remarks for this turn.
                      </div>
                    )}
                  </div>

                  {/* Recommendations */}
                  {turn.follow_up_topic && (
                    <div className="flex items-start gap-3 bg-cyan-500/5 border border-cyan-500/10 p-3.5 rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">RECOMMENDED STUDY TOPIC</span>
                        <p className="text-xs font-semibold text-white">{turn.follow_up_topic}</p>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
