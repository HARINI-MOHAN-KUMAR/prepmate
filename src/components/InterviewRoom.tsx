import React, { useState, useEffect, useRef } from "react";
import { 
  Clock, 
  Lightbulb, 
  ChevronDown, 
  ChevronUp, 
  Send, 
  Compass, 
  CheckCircle2, 
  Cpu, 
  HelpCircle,
  TrendingUp,
  Award,
  Mic,
  MicOff,
  ListTodo,
  Check,
  Sparkles,
  AlertTriangle,
  Timer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { InterviewSession, RubricScores } from "../types";

interface InterviewRoomProps {
  session: InterviewSession;
  onSubmitAnswer: (answer: string) => Promise<{ feedback: string; nextQuestion?: string; finalized: boolean }>;
  onLeaveSession: () => void;
  token: string;
}

export default function InterviewRoom({ session, onSubmitAnswer, onLeaveSession, token }: InterviewRoomProps) {
  const [answerText, setAnswerText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref of the latest answer text so async callbacks (speech onend) can access it
  const answerTextRef = useRef<string>(answerText);
  useEffect(() => { answerTextRef.current = answerText; }, [answerText]);

  // Turn evaluation results state (shown after submitting an answer in this turn)
  const [turnFeedback, setTurnFeedback] = useState<string | null>(null);
  const [turnScores, setTurnScores] = useState<RubricScores | null>(null);
  const [hasAnsweredCurrent, setHasAnsweredCurrent] = useState(false);

  // Calculate real-time structure checks
  const getStructureStatus = (text: string) => {
    const t = text.toLowerCase();
    
    // 1. STAR Outlining Check:
    const hasStarHeaders = /\[(situation|task|action|result|context|objective|metrics)\]/i.test(text) || 
                           /(situation|task|action|result):/i.test(text);
    const paragraphCount = text.split(/\n\s*\n/).filter(p => p.trim().length > 10).length;
    const hasStar = hasStarHeaders || paragraphCount >= 3;

    // 2. Technical Depth Check:
    const techKeywords = [
      "tradeoff", "complexity", "redundancy", "scalability", "concurrency", 
      "reconciliation", "state", "virtual dom", "reconcile", "index", 
      "query", "regularization", "overfitting", "normalization", "dimensions", 
      "latency", "throughput", "cache", "synchronous", "asynchronous", 
      "overhead", "optimization", "thread", "database", "api", "render"
    ];
    const hasTech = techKeywords.some(kw => t.includes(kw));

    // 3. Quantitative / Complexity Metrics Check:
    const metricsRegex = /\b(o\(1\)|o\(n\)|o\(log\s*n\)|o\(n\s*log\s*n\)|o\(n\^2\))\b|\b\d+(%|ms|kb|mb|gb|sec|x)\b/i;
    const hasMetrics = metricsRegex.test(text) || t.includes("complexity") || t.includes("millisecond") || t.includes("seconds") || t.includes("big-o");

    // 4. Logical Transitions / Explanatory Depth:
    const transitions = ["because", "however", "instead of", "consequently", "therefore", "although", "whereas", "engineered", "optimized", "mitigated", "resolved"];
    const hasTransitions = transitions.some(tr => t.includes(tr));

    return {
      hasStar,
      hasTech,
      hasMetrics,
      hasTransitions,
      paragraphCount
    };
  };

  const structureStatus = getStructureStatus(answerText);

  // Define dynamic target keywords based on target role
  const getDomainKeywords = () => {
    const role = (session.targetRole || "").toLowerCase();
    if (role.includes("backend") || role.includes("be ")) {
      return [
        { word: "concurrency", desc: "Executing multiple operations simultaneously" },
        { word: "latency", desc: "Network or transmission time delay bounds" },
        { word: "caching", desc: "Short-circuiting database fetches using memory" },
        { word: "redundancy", desc: "Eliminating single points of system failure" },
        { word: "throughput", desc: "Rate of successful request processing" },
        { word: "tradeoff", desc: "Balancing memory footprint vs CPU time complexity" }
      ];
    } else if (role.includes("frontend") || role.includes("fe ")) {
      return [
        { word: "reconciliation", desc: "Efficient virtual DOM syncing algorithm" },
        { word: "rendering", desc: "Drawing frames on screen and paint cycles" },
        { word: "state", desc: "Component memory representation" },
        { word: "asynchronous", desc: "Non-blocking operation or lazy load" },
        { word: "performance", desc: "FPS throughput & time-to-interactive bounds" },
        { word: "tradeoff", desc: "Bundling overhead vs paint execution times" }
      ];
    } else if (role.includes("analyst") || role.includes("data analyst")) {
      return [
        { word: "statistics", desc: "Empirical aggregations and correlation logic" },
        { word: "normalization", desc: "Organizing relational attributes to minimize leaks" },
        { word: "aggregation", desc: "Summing, averaging, or grouping records" },
        { word: "cohort", desc: "Analyzing behaviors of common trait groups" },
        { word: "metrics", desc: "Quantitative measurement thresholds" },
        { word: "tradeoff", desc: "Computational latency vs query data accuracy" }
      ];
    } else if (role.includes("scientist") || role.includes("data scientist")) {
      return [
        { word: "regression", desc: "Predicting continuous numeric outcomes" },
        { word: "overfitting", desc: "Model tailoring too closely to sample noise" },
        { word: "regularization", desc: "Penalizing weights (Lasso L1/Ridge L2)" },
        { word: "dimensions", desc: "Feature spaces complexity bounds" },
        { word: "metrics", desc: "Evaluating precision, recall, or F1 metrics" },
        { word: "tradeoff", desc: "Mathematical bias vs variance tradeoff" }
      ];
    } else {
      // Default keywords
      return [
        { word: "tradeoff", desc: "Balancing conflicting design requirements" },
        { word: "scalability", desc: "Efficient expansion under load" },
        { word: "complexity", desc: "Big-O computational space/time bounds" },
        { word: "optimization", desc: "Refining loops or files for efficiency" },
        { word: "mitigate", desc: "Resolving or preventing critical errors" },
        { word: "bottleneck", desc: "Congestion points under heavy pressure" }
      ];
    }
  };

  const domainKeywords = getDomainKeywords();
  const powerVerbs = [
    { word: "engineered", desc: "Crafted deep structured code logic" },
    { word: "optimized", desc: "Increased algorithmic execution speeds" },
    { word: "scaled", desc: "Expanded capacity bounds under demand load" },
    { word: "mitigated", desc: "Preempted operational system errors" },
    { word: "resolved", desc: "Debunked and patched difficult logic failures" },
    { word: "architected", desc: "Designed broad component or state designs" }
  ];

  // Web Speech API / Voice Recognition states
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [speechDuration, setSpeechDuration] = useState(0);
  const [speechWordCount, setSpeechWordCount] = useState(0);
  const speechIntervalRef = useRef<any>(null);

  // --- Countdown Timer ---
  const timerDuration: number | null = (session as any).timerSeconds ?? null;
  const [timeLeft, setTimeLeft] = useState<number | null>(timerDuration);
  const countdownRef = useRef<any>(null);

  // Reset timer when the question changes (new turn)
  useEffect(() => {
    if (!timerDuration) return;
    setTimeLeft(timerDuration);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!hasAnsweredCurrent) {
      countdownRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [session.turns.length, hasAnsweredCurrent, timerDuration]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && !hasAnsweredCurrent && !loading) {
      handleSubmit();
    }
  }, [timeLeft]);
  // ---


  const isSpeechSupported = typeof window !== "undefined" && (
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
  );

  // Check microphone permission early so we can inform the user
  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator as any).permissions && isSpeechSupported) {
      try {
        (navigator as any).permissions.query({ name: "microphone" }).then((p: any) => {
          if (p.state === "denied") {
            setError("Microphone access is blocked. Please allow microphone access in your browser settings and reload the page.");
          }
          p.onchange = () => {
            if (p.state === "denied") {
              setError("Microphone access was denied. Please allow microphone access and reload.");
            } else {
              setError(null);
            }
          };
        }).catch(() => {
          // ignore permission query failures
        });
      } catch (e) {
        // noop
      }
    }
  }, [isSpeechSupported]);

  // Try to explicitly request microphone permission (used when user clicks Retry)
  const requestMicPermission = async () => {
    if (typeof navigator === "undefined" || !(navigator as any).mediaDevices || !(navigator as any).mediaDevices.getUserMedia) {
      setError("Microphone API not available in this browser.");
      return false;
    }

    try {
      const stream = await (navigator as any).mediaDevices.getUserMedia({ audio: true });
      // immediately stop tracks - we only wanted to prompt for permission
      stream.getTracks().forEach((t: any) => t.stop());
      setError(null);
      return true;
    } catch (err: any) {
      setError("Microphone permission denied or unavailable. Please enable microphone access in your browser.");
      return false;
    }
  };

  const toggleListening = async () => {
    if (!isSpeechSupported) {
      setError("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
      setIsListening(false);
    } else {
      setError(null);
      setSpeechDuration(0);
      setSpeechWordCount(0);
      try {
        // If permissions API indicates denied, prompt via getUserMedia to request access
        try {
          if ((navigator as any).permissions) {
            const p = await (navigator as any).permissions.query({ name: 'microphone' });
            if (p && p.state === 'denied') {
              const granted = await requestMicPermission();
              if (!granted) {
                return;
              }
            }
          }
        } catch (permErr) {
          // ignore permission query failures and proceed to initialize recognition which may prompt
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          console.log("SpeechRecognition: started");
          setIsListening(true);
          if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);
          speechIntervalRef.current = setInterval(() => {
            setSpeechDuration((prev) => prev + 1);
          }, 1000);
        };

        recognition.onresult = (event: any) => {
          let finalTranscript = "";
          let segmentWordCount = 0;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              const text = event.results[i][0].transcript;
              finalTranscript += text + " ";
              segmentWordCount += text.trim().split(/\s+/).filter(Boolean).length;
            }
          }
          if (finalTranscript) {
            console.log("SpeechRecognition: onresult segment=", finalTranscript.trim());
            setSpeechWordCount((prev) => prev + segmentWordCount);
            // Append recognized speech to the textarea reliably and enable submit button
            setAnswerText((prev) => {
              const trimmed = (prev || "").trim();
              const appended = trimmed ? `${trimmed} ${finalTranscript.trim()}` : finalTranscript.trim();
              return appended;
            });
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error", event);
          if (event && event.error === "not-allowed") {
            setError("Microphone permission was denied. Please allow microphone access in your browser settings.");
          } else if (event && event.error) {
            setError(`Speech recognition error: ${event.error}`);
          } else {
            setError(`Speech recognition error: Unknown error`);
          }
          if (speechIntervalRef.current) {
            clearInterval(speechIntervalRef.current);
            speechIntervalRef.current = null;
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          console.log("SpeechRecognition: ended");
          if (speechIntervalRef.current) {
            clearInterval(speechIntervalRef.current);
            speechIntervalRef.current = null;
          }
          setIsListening(false);

          // Auto-submit when speech ends and there's captured text
          setTimeout(async () => {
            try {
              const text = answerTextRef.current || "";
              if (text.trim() && !loading && !hasAnsweredCurrent) {
                // call the submit handler with the latest text to avoid stale state
                await handleSubmit(undefined, text);
              }
            } catch (err) {
              // swallow errors — UI will show any submission errors normally
            }
          }, 250);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        setError(`Failed to initialize speech recognition: ${err.message || err}`);
        if (speechIntervalRef.current) {
          clearInterval(speechIntervalRef.current);
          speechIntervalRef.current = null;
        }
        setIsListening(false);
      }
    }
  };

  // Turn-off listening if question changes or unmounts
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
      }
    };
  }, []);

  // Stop listening if user submits or switches state
  useEffect(() => {
    if (loading || hasAnsweredCurrent) {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
      if (speechIntervalRef.current) {
        clearInterval(speechIntervalRef.current);
        speechIntervalRef.current = null;
      }
      setIsListening(false);
    }
  }, [loading, hasAnsweredCurrent]);

  // Timer states
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Hint states
  const [hintOpen, setHintOpen] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [fetchingHint, setFetchingHint] = useState(false);

  // Start timer on mount/new question
  useEffect(() => {
    setElapsedTime(0);
    timerRef.current = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session.turns.length]);

  // Warn the user before they close or reload the browser tab during an active session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Standard confirmation behavior in modern browsers
      e.preventDefault();
      e.returnValue = "Are you sure you want to exit? Your active interview session progress will be lost.";
      return e.returnValue;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Stop timer when evaluation is running or user has answered
  useEffect(() => {
    if (loading || hasAnsweredCurrent) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } else if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
  }, [loading, hasAnsweredCurrent]);

  const activeTurn = session.turns[session.turns.length - 1];
  const totalTurns = session.maxTurns;
  const currentTurnNumber = session.turns.length;

  const handleFetchHint = async () => {
    if (hintText) {
      setHintOpen(!hintOpen);
      return;
    }

    setFetchingHint(true);
    setHintOpen(true);
    setError(null);

    try {
      const res = await fetch(`/api/sessions/${session.id}/hint`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to retrieve hints");
      setHintText(data.hint);
    } catch (err: any) {
      setHintText("Focus on describing the core definitions, time complexites, or architecture of this topic.");
    } finally {
      setFetchingHint(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent, explicitText?: string) => {
    e?.preventDefault();
    const textToSend = (explicitText !== undefined) ? explicitText : answerTextRef.current || answerText;
    if (!textToSend.trim()) return;

    setLoading(true);
    setError(null);
    setHintOpen(false);

    try {
      const result = await onSubmitAnswer(textToSend);
      
      // Store evaluation details for current turn locally
      const currentEvaluatedTurn = session.turns[session.turns.length - 1];
      setTurnFeedback(result.feedback || currentEvaluatedTurn.feedback);
      setTurnScores(currentEvaluatedTurn.scores);
      setHasAnsweredCurrent(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit response.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextQuestion = () => {
    // Clear turn evaluation cache and prepare for next question
    setAnswerText("");
    setHintText(null);
    setTurnFeedback(null);
    setTurnScores(null);
    setHasAnsweredCurrent(false);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 w-full">
      {/* Interview room HUD */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">Live Interview Room</span>
            <h2 className="text-white font-extrabold text-lg leading-tight flex items-center gap-1.5">
              {session.targetRole}
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#0A0A0B] border border-white/10 text-slate-400 font-normal">
                {session.experienceLevel}
              </span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* stopwatch */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0E0E10] border border-white/10 rounded-xl text-slate-300 font-mono text-sm shadow-inner">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>{formatTime(elapsedTime)}</span>
          </div>

          <button
            onClick={onLeaveSession}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-white/10 hover:border-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer transition-all"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-2">
          <span>PLACEMENT ASSESSMENT CYCLE</span>
          <span className="text-cyan-400 font-bold">
            Question {currentTurnNumber} of {totalTurns}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#0A0A0B] rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-cyan-500 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
            style={{ width: `${(currentTurnNumber / totalTurns) * 100}%` }}
          />
        </div>
      </div>

      {session.isOfflineMode && (
        <div className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <span className="font-bold block mb-0.5">Offline Fallback Active (Gemini Quota Exceeded)</span>
            PrepMate is running in Offline Mode because the server's free Gemini API key quota was reached. To restore high-fidelity, real-time custom AI assessments, please add your own API Key in <span className="font-semibold text-white">Settings &gt; Secrets</span> in the top-right menu!
          </div>
        </div>
      )}

      {/* Microphone permission banner */}
      {error && (/(microphone|Microphone|access is blocked|permission was denied)/i.test(error)) && (
        <div className="mb-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm leading-relaxed flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold mb-1">Microphone Access Required</div>
            <div className="text-xs mb-2">{error}</div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  const ok = await requestMicPermission();
                  if (ok) {
                    // try to start listening automatically
                    toggleListening();
                  }
                }}
                className="px-3 py-1.5 bg-cyan-500 text-black font-bold rounded-md text-sm"
              >
                Retry Microphone
              </button>
              <button
                onClick={() => setError(null)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 text-xs rounded-md"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Left Side focused interview terminal, Right Side stats/help */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3 space-y-5">
          {/* Question Panel */}
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
            <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono uppercase tracking-wider mb-2">
              <Cpu className="w-4 h-4 text-cyan-400 animate-spin-slow" />
              <span>Interviewer Question</span>
            </div>
            <h3 className="text-white text-base md:text-lg font-bold leading-relaxed">
              {activeTurn ? activeTurn.question : "Loading placement assessment..."}
            </h3>

            {/* Countdown Timer Display */}
            {timerDuration && timeLeft !== null && !hasAnsweredCurrent && (
              <div className={`mt-4 flex items-center gap-3 px-4 py-2.5 rounded-xl border w-fit transition-all ${
                timeLeft <= 30
                  ? "bg-red-500/10 border-red-500/30 animate-pulse"
                  : timeLeft <= 60
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-white/5 border-white/10"
              }`}>
                <Timer className={`w-4 h-4 shrink-0 ${timeLeft <= 30 ? "text-red-400" : timeLeft <= 60 ? "text-amber-400" : "text-slate-400"}`} />
                <span className={`text-sm font-bold font-mono ${timeLeft <= 30 ? "text-red-400" : timeLeft <= 60 ? "text-amber-400" : "text-slate-300"}`}>
                  {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                </span>
                {timeLeft <= 30 && (
                  <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider">
                    ⚡ AUTO-SUBMIT SOON
                  </span>
                )}
              </div>
            )}
          </div>


          {/* Hint Panel */}
          <div>
            <button
              onClick={handleFetchHint}
              className="flex items-center justify-between w-full p-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2.5 text-xs font-semibold text-slate-300">
                <Lightbulb className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-all" />
                <span>Stuck? Get Coach Hint</span>
              </div>
              {hintOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            <AnimatePresence>
              {hintOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-[#0A0A0B] border-x border-b border-white/10 rounded-b-xl p-4 text-slate-400 text-xs leading-relaxed"
                >
                  {fetchingHint ? (
                    <span className="flex items-center gap-2 text-[11px] text-slate-500 font-mono animate-pulse">
                      Consulting PrepMate knowledge bank...
                    </span>
                  ) : (
                    <span>{hintText}</span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Answer Area */}
          <AnimatePresence mode="wait">
            {!hasAnsweredCurrent ? (
              <motion.form
                key="input-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* STAR Structural Assistant & Real-time Checklist */}
                <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/5 pb-3">
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-4.5 h-4.5 text-cyan-400" />
                      <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">STAR Blueprint & Quality Checklist</span>
                    </div>
                    
                    {/* Quick Templates */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">INJECT TEMPLATE:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (answerText && !window.confirm("This will overwrite your current draft. Proceed?")) return;
                          setAnswerText(
                            `[SITUATION & CONTEXT]\nDescribe the context/environment and the core problem you solved:\n\n[TASK & OBJECTIVE]\nExplain the specific engineering goal or technical challenge:\n\n[ACTION & TECHNICAL IMPL]\nDetail your step-by-step approach, algorithms, or tools, and operational tradeoffs:\n\n[RESULT & METRICS]\nWhat was the outcome? Include complexities, scalability bounds, or quantitative metrics (e.g. O(N), 40% gain):`
                          );
                        }}
                        className="px-2.5 py-1 text-[10px] font-mono bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/15 rounded transition-all cursor-pointer"
                      >
                        STAR Outline
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (answerText && !window.confirm("This will overwrite your current draft. Proceed?")) return;
                          setAnswerText(
                            `Core Technical Concept:\n- Define the concept simply and accurately:\n\nPrimary Engineering Tradeoffs:\n- Tradeoff 1 (e.g. Memory vs. CPU overhead):\n- Tradeoff 2 (e.g. Code simplicity vs. Runtime speed):\n\nComplexity & Bounds Analysis:\n- Time Complexity: O( )\n- Space Complexity: O( )`
                          );
                        }}
                        className="px-2.5 py-1 text-[10px] font-mono bg-teal-500/10 border border-teal-500/20 hover:border-teal-500/50 text-teal-400 hover:bg-teal-500/15 rounded transition-all cursor-pointer"
                      >
                        Tradeoffs & Complexity
                      </button>
                    </div>
                  </div>

                  {/* Real-time Checklist Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono select-none">
                    {/* STAR structure checklist item */}
                    <div className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${
                      structureStatus.hasStar 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : "bg-white/[0.02] border-white/5 text-slate-500"
                    }`}>
                      <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${structureStatus.hasStar ? "text-emerald-400" : "text-transparent"}`} />
                      <div className="space-y-0.5">
                        <span className="font-semibold block">STAR Structure</span>
                        <span className="text-[9px] opacity-70">
                          {structureStatus.hasStar ? "Structure matched" : "Add headers or paragraphs"}
                        </span>
                      </div>
                    </div>

                    {/* Technical Depth checklist item */}
                    <div className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${
                      structureStatus.hasTech 
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
                        : "bg-white/[0.02] border-white/5 text-slate-500"
                    }`}>
                      <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${structureStatus.hasTech ? "text-cyan-400" : "text-transparent"}`} />
                      <div className="space-y-0.5">
                        <span className="font-semibold block">Technical Depth</span>
                        <span className="text-[9px] opacity-70">
                          {structureStatus.hasTech ? "Concepts detected" : "Explain system concepts"}
                        </span>
                      </div>
                    </div>

                    {/* Complexity / Metrics checklist item */}
                    <div className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${
                      structureStatus.hasMetrics 
                        ? "bg-teal-500/10 border-teal-500/20 text-teal-400" 
                        : "bg-white/[0.02] border-white/5 text-slate-500"
                    }`}>
                      <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${structureStatus.hasMetrics ? "text-teal-400" : "text-transparent"}`} />
                      <div className="space-y-0.5">
                        <span className="font-semibold block">Metrics & Bounds</span>
                        <span className="text-[9px] opacity-70">
                          {structureStatus.hasMetrics ? "Big-O/Metrics found" : "Quantify and use O(N)"}
                        </span>
                      </div>
                    </div>

                    {/* Logical Transitions checklist item */}
                    <div className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all ${
                      structureStatus.hasTransitions 
                        ? "bg-purple-500/10 border-purple-500/20 text-purple-400" 
                        : "bg-white/[0.02] border-white/5 text-slate-500"
                    }`}>
                      <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${structureStatus.hasTransitions ? "text-purple-400" : "text-transparent"}`} />
                      <div className="space-y-0.5">
                        <span className="font-semibold block">Logical Depth</span>
                        <span className="text-[9px] opacity-70">
                          {structureStatus.hasTransitions ? "Logical flow detected" : "Detail tradeoffs & 'because'"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                 <div className="relative">
                  <textarea
                    required
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    disabled={loading}
                    rows={7}
                    placeholder="Provide your structured answer here. Include core logic, operational tradeoffs, and direct definitions..."
                    className="w-full p-5 bg-[#0E0E10] border border-white/10 rounded-2xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 text-sm font-sans leading-relaxed shadow-inner transition-all resize-none"
                  />
                  {isListening && (
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 font-mono text-[9px] animate-pulse select-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      LISTENING...
                    </div>
                  )}
                  <div className="absolute bottom-4 right-4 text-[10px] font-mono text-slate-500">
                    {answerText.length} characters
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Speak Answer Toggle */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={loading}
                      className={`flex items-center gap-2 py-3 px-5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isListening
                          ? "bg-red-500/15 border-red-500/40 text-red-400 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                          : "bg-cyan-500/5 border-cyan-500/20 hover:border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.05)]"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-4 h-4 text-red-400 shrink-0" />
                          <span>Stop Speaking</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span>Speak Answer</span>
                        </>
                      )}
                    </button>

                    {/* Live Speech Pacing Coach */}
                    {(isListening || (speechDuration > 0 && speechWordCount > 0)) && (() => {
                      const liveWpm = speechDuration > 0 ? Math.round((speechWordCount / speechDuration) * 60) : 0;
                      let paceText = "Speak to calculate pacing...";
                      let paceColor = "text-slate-450 border-white/5 bg-white/[0.02]";
                      if (liveWpm > 0) {
                        if (liveWpm < 100) {
                          paceText = `Deliberate Pace (${liveWpm} WPM) - Clear phrasing`;
                          paceColor = "text-amber-400 border-amber-550/20 bg-amber-500/5";
                        } else if (liveWpm <= 145) {
                          paceText = `Optimal Pace (${liveWpm} WPM) - Professional cadence`;
                          paceColor = "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
                        } else {
                          paceText = `Rushed Pace (${liveWpm} WPM) - Slow down slightly`;
                          paceColor = "text-red-400 border-red-500/20 bg-red-500/5";
                        }
                      }
                      return (
                        <div className={`px-3 py-2 rounded-xl border text-[11px] font-mono flex items-center gap-1.5 transition-all duration-300 ${paceColor}`}>
                          <Sparkles className="w-3.5 h-3.5 text-current animate-pulse shrink-0" />
                          <span>{paceText}</span>
                        </div>
                      );
                    })()}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !answerText.trim()}
                    className="flex items-center gap-2 py-3 px-6 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-950/40 disabled:text-slate-600 cursor-pointer text-black font-bold text-sm rounded-xl hover:shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] transition-all"
                  >
                    {loading ? (
                      <>
                        <span className="animate-pulse">Evaluating rubrics...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit Response</span>
                        <Send className="w-4 h-4 text-black" />
                      </>
                    )}
                  </button>
                </div>
              </motion.form>
            ) : (
              /* Turn Feedback screen (shown between questions) */
              <motion.div
                key="evaluation-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0E0E10] border border-white/10 rounded-2xl p-6 space-y-6 shadow-xl"
              >
                <div className="flex items-center gap-2.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full w-fit text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Response Evaluated Successfully
                </div>

                {/* Score breakdown bar charts */}
                {turnScores && (
                  <div className="grid sm:grid-cols-2 gap-4 bg-[#0A0A0B] p-4 rounded-xl border border-white/5">
                    {[
                      { label: "Technical Accuracy", score: turnScores.correctness, color: "bg-cyan-500" },
                      { label: "Depth & Tradeoffs", score: turnScores.depth, color: "bg-teal-500" },
                      { label: "Communication Style", score: turnScores.communication, color: "bg-emerald-500" },
                      { label: "Problem Solving Path", score: turnScores.problem_solving, color: "bg-amber-500" }
                    ].map((item) => (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-slate-400">{item.label}</span>
                          <span className="text-white font-bold">{item.score}/10</span>
                        </div>
                        <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.color} rounded-full transition-all duration-1000`} 
                            style={{ width: `${item.score * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* specific coach critique */}
                <div className="space-y-2">
                  <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    Coach Critique & Specific Gaps
                  </h4>
                  <p className="text-slate-300 text-xs leading-relaxed bg-[#0A0A0B]/40 p-4 border border-white/10 rounded-xl">
                    {turnFeedback || "Analyzing response..."}
                  </p>
                </div>

                {/* Answer-Quality Diff View */}
                {activeTurn && activeTurn.idealAnswerPoints && activeTurn.idealAnswerPoints.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-white font-bold text-sm flex items-center gap-1.5">
                      <ListTodo className="w-4.5 h-4.5 text-cyan-400" />
                      Answer-Quality Gap & Diff View
                    </h4>
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Left Column: Your Submitted Answer */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Your Answer Snippet</span>
                        <div className="text-xs text-slate-350 bg-[#0A0A0B] p-4 border border-white/5 rounded-xl max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed font-sans">
                          {activeTurn.answer || "No response provided."}
                        </div>
                      </div>

                      {/* Right Column: Ideal Answer Reference Points */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Ideal Answer Target Gaps</span>
                        <div className="bg-[#0A0A0B] p-4 border border-white/5 rounded-xl space-y-2.5 max-h-48 overflow-y-auto">
                          {activeTurn.idealAnswerPoints.map((point, pIdx) => {
                            // Run a light match check to highlight if the user covered this point
                            const pointWords = point.toLowerCase().split(/\s+/).slice(0, 4).filter(w => w.length > 3);
                            const userHasCovered = pointWords.length > 0 && pointWords.every(w => (activeTurn.answer || "").toLowerCase().includes(w));
                            return (
                              <div key={pIdx} className="flex items-start gap-2 text-xs leading-normal">
                                <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                  userHasCovered 
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                                }`}>
                                  {userHasCovered ? "✓" : "✗"}
                                </div>
                                <span className={userHasCovered ? "text-slate-300" : "text-slate-550"}>
                                  {point}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  {session.status === "completed" ? (
                    <button
                      onClick={onLeaveSession} // Leaves back to root App which auto-pulls stats & report
                      className="py-3 px-6 bg-cyan-500 hover:bg-cyan-400 cursor-pointer text-black font-extrabold text-sm rounded-xl active:scale-[0.98] transition-all"
                    >
                      Compile Final Placement Report
                    </button>
                  ) : (
                    <button
                      onClick={handleNextQuestion}
                      className="py-3 px-6 bg-cyan-500 hover:bg-cyan-400 cursor-pointer text-black font-extrabold text-sm rounded-xl active:scale-[0.98] transition-all"
                    >
                      Proceed to Next Question
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Sidebar guide widgets */}
        <div className="space-y-4">
          {/* Live Vocabulary Helper Widget */}
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-5 space-y-4">
            <h4 className="text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                Live Vocabulary Guide
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono">
                {domainKeywords.filter(k => answerText.toLowerCase().includes(k.word)).length + 
                 powerVerbs.filter(v => answerText.toLowerCase().includes(v.word)).length} MATCHED
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Inject these high-value role terms and power verbs to boost your technical accuracy & depth scores:
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Core Domain Terms</span>
                <div className="flex flex-wrap gap-1.5">
                  {domainKeywords.map((item) => {
                    const isMatched = answerText.toLowerCase().includes(item.word);
                    return (
                      <div
                        key={item.word}
                        title={item.desc}
                        className={`px-2 py-1 rounded text-[10px] font-mono border transition-all cursor-help flex items-center gap-1 ${
                          isMatched
                            ? "bg-cyan-500/10 border-cyan-500/45 text-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.1)]"
                            : "bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/10"
                        }`}
                      >
                        {isMatched && <Check className="w-3 h-3 text-cyan-400" />}
                        {item.word}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Action Power Verbs</span>
                <div className="flex flex-wrap gap-1.5">
                  {powerVerbs.map((item) => {
                    const isMatched = answerText.toLowerCase().includes(item.word);
                    return (
                      <div
                        key={item.word}
                        title={item.desc}
                        className={`px-2 py-1 rounded text-[10px] font-mono border transition-all cursor-help flex items-center gap-1 ${
                          isMatched
                            ? "bg-emerald-500/10 border-emerald-500/45 text-emerald-400 font-bold shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                            : "bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/10"
                        }`}
                      >
                        {isMatched && <Check className="w-3 h-3 text-emerald-400" />}
                        {item.word}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* star tip widget */}
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-5 space-y-3.5">
            <h4 className="text-white font-bold text-xs font-mono uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Interview Strategy
            </h4>
            <div className="space-y-3 text-slate-400 text-xs leading-relaxed">
              <p>
                To score highly in <span className="text-cyan-400 font-semibold">Depth</span>, talk about operational failure-modes and system limits (e.g. GC overheads, memory bounds).
              </p>
              <div className="border-t border-white/5 my-2"></div>
              <p>
                To score highly in <span className="text-emerald-400 font-semibold">Problem Solving</span>, structure your answer using the <span className="text-white">STAR</span> technique (Situation, Task, Action, Result).
              </p>
            </div>
          </div>

          {/* Gamified Live Vocabulary Assistant */}
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-1.5 border-b border-white/5 pb-2.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-white font-bold text-xs font-mono uppercase tracking-wider">
                Live Vocabulary Coach
              </h4>
            </div>
            
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
              Weave these high-impact words into your answer to score maximum depth and accuracy points! They highlight in real time as you write or speak.
            </p>

            {/* STAR Power Verbs */}
            <div className="space-y-2">
              <span className="text-[9px] font-mono font-bold text-cyan-400 tracking-wider block uppercase">STAR Power Verbs</span>
              <div className="flex flex-wrap gap-1.5">
                {powerVerbs.map((v) => {
                  const used = answerText.toLowerCase().includes(v.word.toLowerCase());
                  return (
                    <button 
                      key={v.word} 
                      type="button"
                      title={v.desc}
                      onClick={() => {
                        if (!hasAnsweredCurrent) {
                          setAnswerText(prev => prev.trim() ? `${prev.trim()} ${v.word}` : v.word);
                        }
                      }}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all duration-300 cursor-pointer flex items-center gap-1 text-left ${
                        used 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-semibold" 
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/25 hover:text-slate-200"
                      }`}
                    >
                      {used && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                      <span>{v.word}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role-Specific Buzzwords */}
            <div className="space-y-2 pt-1">
              <span className="text-[9px] font-mono font-bold text-teal-400 tracking-wider block uppercase">Domain Buzzwords</span>
              <div className="flex flex-wrap gap-1.5">
                {domainKeywords.map((v) => {
                  const used = answerText.toLowerCase().includes(v.word.toLowerCase());
                  return (
                    <button 
                      key={v.word} 
                      type="button"
                      title={v.desc}
                      onClick={() => {
                        if (!hasAnsweredCurrent) {
                          setAnswerText(prev => prev.trim() ? `${prev.trim()} ${v.word}` : v.word);
                        }
                      }}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg border transition-all duration-300 cursor-pointer flex items-center gap-1 text-left ${
                        used 
                          ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 font-semibold" 
                          : "bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/25 hover:text-slate-200"
                      }`}
                    >
                      {used && <Check className="w-3 h-3 text-cyan-400 shrink-0" />}
                      <span>{v.word}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="text-[9px] text-slate-500 font-mono text-center pt-1.5 border-t border-white/5">
              * Click any word button to append it.
            </div>
          </div>

          {/* question parameters indicator */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3 text-[11px] text-slate-500 font-mono">
            <div className="flex justify-between">
              <span>MODEL ENGINE</span>
              <span className="text-emerald-400 font-bold">gemini-3.5-flash</span>
            </div>
            <div className="flex justify-between">
              <span>SELECTION</span>
              <span className="text-cyan-400">RAG Semantic Nearest</span>
            </div>
            <div className="flex justify-between">
              <span>EMBEDDING</span>
              <span className="text-slate-450">embedding-2-preview</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
