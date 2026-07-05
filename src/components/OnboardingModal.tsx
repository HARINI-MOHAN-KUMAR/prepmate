import React, { useState } from "react";
import { motion } from "motion/react";
import { X } from "lucide-react";

interface OnboardingModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Welcome to PrepMate AI",
    desc: "Practice technical interviews with AI-guided feedback on depth, correctness, and communication.",
    img: "/images/tech-hero.svg"
  },
  {
    title: "Backend & System Design",
    desc: "Focus on scalability, concurrency, caching, and database tradeoffs.",
    img: "/images/backend.svg"
  },
  {
    title: "Frontend & Performance",
    desc: "Practice rendering, state management, and performance tradeoffs for client apps.",
    img: "/images/frontend.svg"
  },
  {
    title: "Data & ML",
    desc: "Sharpen SQL, analytics, or ML reasoning and model evaluation skills.",
    img: "/images/data.svg"
  }
];

export default function OnboardingModal({ open, onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative max-w-3xl w-full mx-4 bg-[#071017] border border-white/8 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/6">
          <div>
            <h3 className="text-white font-bold text-lg">{STEPS[step].title}</h3>
            <p className="text-slate-400 text-xs mt-1">{STEPS[step].desc}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-white/5">
            <X className="w-4 h-4 text-slate-300" />
          </button>
        </div>

        <div className="p-6 flex flex-col md:flex-row gap-6">
          <div className="md:w-1/2 flex items-center justify-center">
            <picture>
              <source srcSet={STEPS[step].img} type="image/svg+xml" />
              <img src={STEPS[step].img} alt={STEPS[step].title} loading="lazy" decoding="async" className="max-h-48 w-full object-contain rounded-md" />
            </picture>
          </div>
          <div className="md:w-1/2 space-y-4">
            <p className="text-slate-300 text-sm">{STEPS[step].desc}</p>
            <ul className="text-slate-400 text-xs space-y-2 list-disc pl-5">
              <li>Speak or type your answer — use the Speak Answer button to capture voice.</li>
              <li>Use the STAR blueprint templates to structure responses.</li>
              <li>Get instant rubric-based feedback and suggested follow-ups.</li>
            </ul>
            <div className="flex items-center gap-3 mt-4">
              <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className="px-3 py-2 rounded-xl bg-white/5 text-slate-300">Back</button>
              {step < STEPS.length - 1 ? (
                <button onClick={() => setStep(step + 1)} className="px-3 py-2 rounded-xl bg-cyan-500 text-black font-bold">Next</button>
              ) : (
                <button onClick={() => { localStorage.setItem("prepmate_seen_onboarding", "1"); onClose(); }} className="px-3 py-2 rounded-xl bg-emerald-500 text-black font-bold">Got it — Start Practicing</button>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              {STEPS.map((s, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === step ? "bg-cyan-400" : "bg-white/5"}`} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
