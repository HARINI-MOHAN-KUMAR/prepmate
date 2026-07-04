import React, { useState } from "react";
import { Sparkles, ArrowRight, User as UserIcon, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: { id: string; name: string; email: string }) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please fill in all required fields.");
      return;
    }
    if (isRegister && !name) {
      setError("Please provide your name.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload: Record<string, string> = isRegister ? { name, email } : { email };
      if (password) payload.password = password;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onAuthSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setName("Demo Student");
    setEmail("demo@prepmate.ai");
    setIsRegister(false);
    // Submit via click timeout to let states bind
    setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "demo@prepmate.ai" }),
        });
        const data = await res.json();
        onAuthSuccess(data.token, data.user);
      } catch (err: any) {
        setError("Demo login failed, please enter manually.");
      } finally {
        setLoading(false);
      }
    }, 100);
  };

  return (
    <div id="auth-screen" className="min-h-screen bg-[#0A0A0B] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0E0E10] border border-white/10 text-cyan-400 text-xs font-medium mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            RAG-Powered Technical Interview Coach
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            PrepMate<span className="text-cyan-500">.AI</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xs mx-auto">
            Practice adaptive mock technical interviews and obtain deep placement readiness evaluations.
          </p>
        </div>

        <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10">
          <div className="flex gap-4 border-b border-white/10 pb-6 mb-6">
            <button
              onClick={() => {
                setIsRegister(false);
                setError(null);
              }}
              className={`flex-1 pb-2 text-sm font-semibold transition-all ${
                !isRegister ? "text-cyan-400 border-b-2 border-cyan-500" : "text-slate-400 border-b-2 border-transparent hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsRegister(true);
                setError(null);
              }}
              className={`flex-1 pb-2 text-sm font-semibold transition-all ${
                isRegister ? "text-cyan-400 border-b-2 border-cyan-500" : "text-slate-400 border-b-2 border-transparent hover:text-slate-200"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0B] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-sm transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Academic Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0B] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-sm transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Password {!isRegister && <span className="text-slate-600">(optional for existing accounts)</span>}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "Create a strong password" : "Enter your password"}
                  className="w-full pl-10 pr-10 py-2.5 bg-[#0A0A0B] border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-sm transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-850 text-black text-sm font-bold rounded-xl cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] active:scale-[0.98] transition-all mt-6"
            >
              {loading ? "Authenticating..." : isRegister ? "Create Free Account" : "Access Prep Suite"}
              <ArrowRight className="w-4 h-4 text-black" />
            </button>
          </form>


          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-white/10 w-full"></div>
            <span className="absolute bg-[#0E0E10] px-3 text-xs font-medium text-slate-500">Academic Demo Option</span>
          </div>

          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#0A0A0B] border border-white/10 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-400 text-xs font-medium rounded-xl cursor-pointer transition-all"
          >
            Launch Instant Demo Account
          </button>
        </div>
      </motion.div>
    </div>
  );
}
