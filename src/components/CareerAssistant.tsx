import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Send, 
  Sparkles, 
  Cpu, 
  RotateCcw, 
  Bot, 
  User, 
  HelpCircle,
  TrendingUp,
  Award,
  BookOpen
} from "lucide-react";
import { motion } from "motion/react";
import { AssistantChatMessage, DashboardStats } from "../types";

interface CareerAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  stats: DashboardStats | null;
}

export default function CareerAssistant({ isOpen, onClose, token, stats }: CareerAssistantProps) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize with a welcome message from PrepMate AI
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: "model",
          text: `Hi! I'm your **PrepMate AI Career Coach**. 🎓

I can help you review your performance, plan your interview preparation roadmap, practice structured STAR answers, or build a study checklist for your target roles.

What would you like to focus on today?`
        }
      ]);
    }
  }, [messages]);

  // Scroll to bottom whenever messages list changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !token || loading) return;

    const userMessage: AssistantChatMessage = { role: "user", text: textToSend };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInputValue("");
    setLoading(true);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: updatedMessages,
          stats
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch coach response");
      }

      setMessages(prev => [...prev, { role: "model", text: data.reply }]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev, 
        { 
          role: "model", 
          text: `⚠️ **Error:** ${err.message || "Could not connect to PrepMate AI backend. Please verify your internet connection or check if the backend server is running."}` 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm("Are you sure you want to clear your conversation history?")) {
      setMessages([]);
    }
  };

  // Helper to parse custom basic markdown (headers, bullets, bold text)
  const parseMarkdown = (text: string) => {
    return text.split("\n").map((line, idx) => {
      // Check for headers
      if (line.startsWith("### ")) {
        return <h4 key={idx} className="text-xs font-mono uppercase tracking-wider text-cyan-400 mt-4 mb-1.5 font-bold">{line.slice(4)}</h4>;
      }
      if (line.startsWith("## ")) {
        return <h3 key={idx} className="text-sm font-semibold text-white mt-4 mb-2">{line.slice(3)}</h3>;
      }
      if (line.startsWith("# ")) {
        return <h2 key={idx} className="text-base font-bold text-white mt-5 mb-3 border-b border-white/5 pb-1">{line.slice(2)}</h2>;
      }
      
      // Check for bullet items
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
        const cleanLine = trimmedLine.slice(2);
        return (
          <li key={idx} className="text-xs text-slate-300 ml-4 list-disc mt-1 leading-relaxed">
            {renderInlineBold(cleanLine)}
          </li>
        );
      }
      
      // Check for empty line
      if (trimmedLine === "") {
        return <div key={idx} className="h-2" />;
      }
      
      // Default paragraph
      return (
        <p key={idx} className="text-xs text-slate-300 leading-relaxed mt-1">
          {renderInlineBold(line)}
        </p>
      );
    });
  };

  const renderInlineBold = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-white font-bold">{part}</strong>;
      }
      return part;
    });
  };

  const suggestionChips = [
    {
      label: "📊 Analyze my mock scores",
      prompt: "Can you analyze my current mock interview stats and tell me which areas need the most improvement?"
    },
    {
      label: "📝 Explain the STAR framework",
      prompt: "Can you explain the STAR framework and give me an example of how to structure an answer using it?"
    },
    {
      label: "💡 SDE placement checklist",
      prompt: "What is a comprehensive preparation roadmap checklist to clear an entry-level SDE role?"
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Assistant Panel */}
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md h-full bg-[#0E0E10] border-l border-white/10 flex flex-col shadow-2xl z-10"
      >
        {/* Panel Header */}
        <div className="p-4 border-b border-white/10 bg-[#0A0A0B] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <Bot className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                PrepMate AI Coach
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">CAREER_ASSISTANT_ENGINE</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
              title="Clear Chat History"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          {messages.map((msg, index) => {
            const isModel = msg.role === "model";
            return (
              <div 
                key={index} 
                className={`flex gap-3 max-w-[90%] ${isModel ? "" : "ml-auto flex-row-reverse"}`}
              >
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border ${
                  isModel 
                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400" 
                    : "bg-[#18181b] border-white/10 text-slate-400"
                }`}>
                  {isModel ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                </div>

                {/* Bubble */}
                <div className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                  isModel 
                    ? "bg-white/[0.02] border border-white/5 text-slate-300 rounded-tl-none" 
                    : "bg-cyan-500/10 border border-cyan-500/20 text-white rounded-tr-none"
                }`}>
                  {parseMarkdown(msg.text)}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 max-w-[90%]">
              <div className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center border bg-cyan-500/10 border-cyan-500/20 text-cyan-400">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl rounded-tl-none text-slate-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && !loading && (
          <div className="p-3 border-t border-white/5 bg-[#0C0C0E]/40 space-y-2">
            <span className="text-[10px] text-slate-500 font-mono tracking-wider block mb-1">RECOMMENDED PROMPTS</span>
            <div className="flex flex-col gap-1.5">
              {suggestionChips.map((chip, index) => (
                <button
                  key={index}
                  onClick={() => handleSendMessage(chip.prompt)}
                  className="w-full text-left p-2.5 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-cyan-500/20 text-slate-300 hover:text-white rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2"
                >
                  {index === 0 && <TrendingUp className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  {index === 1 && <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  {index === 2 && <BookOpen className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                  <span className="truncate">{chip.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input box */}
        <div className="p-4 border-t border-white/10 bg-[#0A0A0B] flex gap-2">
          <input
            type="text"
            placeholder="Ask PrepMate AI Career Coach..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs bg-[#18181b] hover:bg-[#202024] focus:bg-[#202024] border border-white/10 focus:border-cyan-500/50 rounded-xl text-white outline-none placeholder:text-slate-500 transition-all disabled:opacity-50"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            disabled={loading || !inputValue.trim()}
            className="p-2.5 bg-cyan-500 hover:bg-cyan-400 text-black rounded-xl cursor-pointer disabled:opacity-40 hover:scale-[1.03] active:scale-[0.97] transition-all shrink-0 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.15)]"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
