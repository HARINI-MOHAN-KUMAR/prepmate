import React from "react";
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  RotateCcw, 
  LayoutDashboard,
  FileText,
  UserCheck,
  Compass,
  ExternalLink,
  Book,
  Video,
  Globe,
  GraduationCap,
  Check,
  Sparkles
} from "lucide-react";
import { motion } from "motion/react";
import { FinalReport, RubricScores } from "../types";

interface FinalReportViewProps {
  report: FinalReport;
  scores: RubricScores; // session average scores for the radar chart
  onReset: () => void;
  onGoToDashboard: () => void;
}

/**
 * Custom SVG Radar Chart component for 4 dimensions.
 * Built mathematically to look gorgeous, modern, and load instantly with zero dependencies.
 */
function RadarChart({ scores, size = 260 }: { scores: RubricScores; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = (size / 2) - 40;

  // 4 dimensions: Correctness, Depth, Communication, Problem Solving
  const dimensions = [
    { key: "correctness", label: "Accuracy" },
    { key: "depth", label: "Depth" },
    { key: "communication", label: "Communication" },
    { key: "problem_solving", label: "Problem Solving" }
  ] as const;

  // Angle coordinates for 4 axes: Top, Right, Bottom, Left
  const getCoordinates = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI / 2);
    const radius = (value / 10) * maxRadius;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { x, y };
  };

  // Outer polygon boundaries (Score = 10)
  const outerPoints = dimensions.map((_, i) => getCoordinates(i, 10));
  const outerPath = outerPoints.map(p => `${p.x},${p.y}`).join(" ");

  // Grid line levels (2.5, 5, 7.5, 10)
  const gridLevels = [2.5, 5, 7.5, 10];

  // Actual candidate scores polygon
  const scoreValues = [
    scores.correctness,
    scores.depth,
    scores.communication,
    scores.problem_solving
  ];
  const candidatePoints = scoreValues.map((val, i) => getCoordinates(i, val));
  const candidatePath = candidatePoints.map(p => `${p.x},${p.y}`).join(" ");

  // Label offsets
  const getLabelAnchor = (index: number) => {
    if (index === 0) return { textAnchor: "middle", dy: "-14" };
    if (index === 1) return { textAnchor: "start", dy: "4", dx: "10" };
    if (index === 2) return { textAnchor: "middle", dy: "22" };
    return { textAnchor: "end", dy: "4", dx: "-10" };
  };

  return (
    <div className="flex justify-center items-center p-4 bg-black/40 rounded-2xl border border-white/5">
      <svg width={size} height={size} className="overflow-visible select-none">
        {/* Draw circular/diamond grid boundaries */}
        {gridLevels.map((lvl, index) => {
          const pts = dimensions.map((_, i) => getCoordinates(i, lvl));
          const path = pts.map(p => `${p.x},${p.y}`).join(" ");
          return (
            <polygon
              key={lvl}
              points={path}
              fill="none"
              stroke="#27272a"
              strokeWidth={1}
              strokeDasharray={index < 3 ? "3,3" : "none"}
            />
          );
        })}

        {/* Draw axes lines */}
        {dimensions.map((_, i) => {
          const edge = getCoordinates(i, 10);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={edge.x}
              y2={edge.y}
              stroke="#3f3f46"
              strokeWidth={1}
            />
          );
        })}

        {/* Candidate actual score polygon */}
        <polygon
          points={candidatePath}
          fill="rgba(6, 182, 212, 0.25)"
          stroke="rgba(6, 182, 212, 0.85)"
          strokeWidth={2}
          className="transition-all duration-1000"
        />

        {/* Inner dots on scores */}
        {candidatePoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#22d3ee"
            stroke="#06b6d4"
            strokeWidth={1.5}
          />
        ))}

        {/* Axis labels */}
        {dimensions.map((dim, i) => {
          const edge = getCoordinates(i, 10);
          const anchor = getLabelAnchor(i);
          return (
            <text
              key={dim.key}
              x={edge.x + (anchor.dx ? parseFloat(anchor.dx) : 0)}
              y={edge.y + (anchor.dy ? parseFloat(anchor.dy) : 0)}
              textAnchor={anchor.textAnchor}
              fill="#a1a1aa"
              fontSize="10"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {dim.label} ({scoreValues[i].toFixed(1)})
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function FinalReportView({ report, scores, onReset, onGoToDashboard }: FinalReportViewProps) {
  
  // Custom theme variables depending on readiness status
  const getRoadmapData = () => {
    if (report.nextStepsRoadmap) {
      return report.nextStepsRoadmap;
    }

    // Fallback generation based on lowest score
    const dimensions = [
      { key: "correctness", label: "Accuracy", score: scores.correctness },
      { key: "depth", label: "Depth", score: scores.depth },
      { key: "communication", label: "Communication", score: scores.communication },
      { key: "problem_solving", label: "Problem Solving", score: scores.problem_solving }
    ];
    dimensions.sort((a, b) => a.score - b.score);
    const lowest = dimensions[0];

    let topics = [
      { title: "Big-O Time & Space Complexity", description: "Learn to systematically evaluate best, average, and worst-case bounds of algorithms." },
      { title: "Core Data Structures & Operations", description: "Master insert, delete, and lookup complexities of Arrays, Linked Lists, Stacks, Queues, Trees, and Graphs." }
    ];
    let resources = [
      { name: "LeetCode Practice Platform", url: "https://leetcode.com", type: "interactive" },
      { name: "MDN Web Standards Documentation", url: "https://developer.mozilla.org", type: "documentation" }
    ];

    if (lowest.key === "depth") {
      topics = [
        { title: "Database Optimization & Indexing", description: "Study indexes (B-Trees, Hash indexes), execution plans (EXPLAIN), normalization, and locking." },
        { title: "Distributed System Architecture Design", description: "Understand load balancers, CDN caching, horizontal vs vertical scaling, and single points of failure." }
      ];
      resources = [
        { name: "System Design Primer Guide", url: "https://github.com/donnemartin/system-design-primer", type: "article" },
        { name: "Designing Data-Intensive Applications (DDIA)", url: "https://www.oreilly.com/library/view/designing-data-intensive-applications/9781491903063/", type: "book" }
      ];
    } else if (lowest.key === "communication") {
      topics = [
        { title: "The STAR Narrative Framework", description: "Structure behavioral and experience answers: Situation (15%), Task (10%), Action (60%), and Result (15%)." },
        { title: "Verbal Cadence & WPM Calibration", description: "Maintain an optimal professional pacing of 100-145 WPM to ensure maximum readability and clarity." }
      ];
      resources = [
        { name: "The STAR Framework Interview Guide", url: "https://blog.pragmaticengineer.com", type: "article" },
        { name: "Tech Interview Handbook", url: "https://www.techinterviewhandbook.org", type: "documentation" }
      ];
    } else if (lowest.key === "problem_solving") {
      topics = [
        { title: "Think-Out-Loud Protocol (TOL)", description: "Express every candidate design, risk factor, and memory allocation decision aloud." },
        { title: "Iterative Optimization Paradigms", description: "Formulate a brute-force approach first, identify its strict bottleneck, and systematically optimize." }
      ];
      resources = [
        { name: "Cracking the Coding Interview (CtCI Book)", url: "https://www.crackingthecodinginterview.com", type: "book" },
        { name: "NeetCode DSA Walkthroughs", url: "https://neetcode.io", type: "video" }
      ];
    }

    return {
      dimension: lowest.label,
      score: lowest.score,
      topics,
      resources
    };
  };

  const roadmap = getRoadmapData();

  const isReady = report.recommendation.toLowerCase().includes("ready") && !report.recommendation.toLowerCase().includes("minor");
  const isMinor = report.recommendation.toLowerCase().includes("minor");

  const badgeColor = isReady 
    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
    : isMinor
      ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
      : "bg-red-500/10 border-red-500/30 text-red-400";

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 w-full print:py-0">
      {/* Enterprise Print Header (hidden on screen) */}
      <div className="hidden print:block text-center mb-8 pb-4 border-b border-black/20 text-black">
        <h1 className="text-2xl font-bold">PrepMate Official Evaluation</h1>
        <p className="text-sm">Confidential Candidate Report</p>
      </div>

      {/* Executive Header */}
      <div className="text-center mb-10 print:mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0E0E10] border border-white/10 text-slate-450 text-xs font-mono mb-4">
          <Award className="w-4 h-4 text-cyan-400" />
          portfolio_grade_evaluation_report
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          Performance Feedback Dossier
        </h2>
        <p className="text-slate-400 mt-2 text-sm max-w-lg mx-auto">
          Deep structural diagnostic evaluation of engineering skills compiled by the PrepMate placement coaching engine.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-8 items-start">
        {/* Left column - score dial, radar chart, recomm */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-6 text-center space-y-6 shadow-xl">
            <div>
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block mb-2">Overall Score</span>
              <div className="relative inline-flex items-center justify-center">
                {/* Score ring */}
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke="#18181b"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="54"
                    stroke={isReady ? "#10b981" : isMinor ? "#f59e0b" : "#ef4444"}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 54}
                    strokeDashoffset={2 * Math.PI * 54 * (1 - report.overallScore / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-3xl font-extrabold text-white font-mono">
                  {report.overallScore}%
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">Readiness Verdict</span>
              <div className={`inline-flex items-center gap-2 px-4 py-2 border rounded-xl font-bold text-xs uppercase tracking-wide ${badgeColor}`}>
                <UserCheck className="w-4 h-4" />
                {report.recommendation}
              </div>
            </div>
          </div>

          {/* SVG Radar Chart */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs font-mono uppercase tracking-widest text-center md:text-left pl-1">
              Turn Metrics Map
            </h4>
            <RadarChart scores={scores} />
          </div>
        </div>

        {/* Right column - Strengths, Gaps, Actionable plan, Summary */}
        <div className="md:col-span-3 space-y-6">
          {/* Executive Summary */}
          <div className="bg-[#0E0E10]/80 border border-white/10 rounded-2xl p-6 space-y-3 shadow-xl">
            <h3 className="text-white font-extrabold text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Executive Evaluation Summary
            </h3>
            <p className="text-slate-300 text-xs leading-relaxed font-sans">
              {report.summary}
            </p>
          </div>

          {/* Strengths Card */}
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-emerald-400 font-extrabold text-sm flex items-center gap-2 uppercase tracking-wide">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Identified Core Strengths
            </h3>
            <ul className="space-y-2.5">
              {report.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Gaps Card */}
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-amber-400 font-extrabold text-sm flex items-center gap-2 uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Critiques & Technical Gaps
            </h3>
            <ul className="space-y-2.5">
              {report.gaps.map((gap, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs text-slate-300 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <span>{gap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Actionable Learning Path */}
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
            <h3 className="text-cyan-400 font-extrabold text-sm flex items-center gap-2 uppercase tracking-wide">
              <BookOpen className="w-5 h-5 text-cyan-500" />
              Personalized Learning Roadmap
            </h3>
            <div className="space-y-3.5">
              {report.personalizedPlan.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3.5 bg-[#0A0A0B]/40 p-3.5 rounded-xl border border-white/5">
                  <span className="flex justify-center items-center w-5 h-5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-slate-300 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Next Steps Roadmap based on Lowest Score Dimension */}
          <div className="bg-[#0E0E10] border border-white/10 rounded-2xl p-6 space-y-5 shadow-xl relative overflow-hidden">
            {/* Top decorative gradient border */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-500" />
            
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-white font-extrabold text-sm flex items-center gap-2 uppercase tracking-wide">
                <Compass className="w-5 h-5 text-cyan-400 animate-pulse" />
                Next Steps Roadmap
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono">PRIORITY GAP:</span>
                <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold font-mono uppercase tracking-wider">
                  {roadmap.dimension} ({roadmap.score.toFixed(1)}/10)
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Based on your lowest-scoring evaluation dimension, we have prepared a custom, high-impact study program to master fundamental skills. Focus on these targeted technical topics and curated industry resources:
            </p>

            {/* Part 1: Study Topics Steps */}
            <div className="space-y-4 pt-1">
              <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest block">Core Technical Study Topics</span>
              <div className="space-y-3">
                {roadmap.topics.map((topic, i) => (
                  <div key={i} className="flex gap-3 bg-[#0A0A0B]/60 p-3.5 rounded-xl border border-white/5 transition-colors hover:border-white/10">
                    <span className="w-6 h-6 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-mono font-bold flex justify-center items-center shrink-0">
                      T{i+1}
                    </span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-200">{topic.title}</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{topic.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Part 2: Curated Resources Grid */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] font-mono text-teal-400 font-bold uppercase tracking-widest block">Curated Study Resources</span>
              <div className="grid sm:grid-cols-2 gap-3">
                {roadmap.resources.map((res, i) => {
                  // Determine appropriate icon for resource type
                  let typeIcon = <Globe className="w-4 h-4 text-slate-400" />;
                  if (res.type === "book") typeIcon = <Book className="w-4 h-4 text-emerald-400" />;
                  if (res.type === "video") typeIcon = <Video className="w-4 h-4 text-rose-400" />;
                  if (res.type === "documentation") typeIcon = <GraduationCap className="w-4 h-4 text-cyan-400" />;
                  if (res.type === "interactive") typeIcon = <Sparkles className="w-4 h-4 text-amber-400" />;

                  return (
                    <a
                      key={i}
                      href={res.url === "#" ? undefined : res.url}
                      target={res.url === "#" ? undefined : "_blank"}
                      rel={res.url === "#" ? undefined : "noreferrer"}
                      className={`flex items-center justify-between p-3 rounded-xl border border-white/5 bg-[#0A0A0B]/40 group transition-all duration-300 ${
                        res.url === "#" 
                          ? "cursor-default opacity-85" 
                          : "hover:bg-white/[0.03] hover:border-cyan-500/25 hover:shadow-[0_0_12px_rgba(6,182,212,0.04)]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded bg-white/[0.02] border border-white/5 group-hover:border-white/10 shrink-0">
                          {typeIcon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-300 truncate group-hover:text-cyan-300 transition-colors">
                            {res.name}
                          </p>
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
                            {res.type}
                          </span>
                        </div>
                      </div>
                      {res.url !== "#" && (
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
                      )}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Navigation Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-4 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex-1 flex justify-center items-center gap-2.5 py-3 px-6 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-extrabold text-sm rounded-xl cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              Download PDF Report
            </button>
            <button
              onClick={onReset}
              className="flex-1 flex justify-center items-center gap-2.5 py-3 px-6 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-sm rounded-xl cursor-pointer shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:scale-[1.01] active:scale-[0.98] transition-all"
            >
              <RotateCcw className="w-4 h-4 text-black" />
              New Mock Session
            </button>
            <button
              onClick={onGoToDashboard}
              className="flex-1 flex justify-center items-center gap-2.5 py-3 px-6 bg-[#0A0A0B] hover:bg-white/5 border border-white/10 text-slate-300 font-bold text-sm rounded-xl cursor-pointer transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              View Score Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
