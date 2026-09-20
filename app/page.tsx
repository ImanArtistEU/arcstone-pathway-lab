"use client";

import { useState, useEffect } from "react";
import { PilotAnalysisReport } from "@/lib/pilot/analyzePilotDataset";

export default function HomePage() {
  const [inputDir, setInputDir] = useState("data/fixtures/pilot-csv-sample");
  const [referenceDate, setReferenceDate] = useState("2026-09-18");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PilotAnalysisReport | null>(null);
  const [activeTab, setActiveTab] = useState<"visual" | "json">("visual");

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputDir, referenceDate }),
      });
      const data = await res.json();
      if (!res.ok || data.status === "error" || data.status === "load_error") {
        const errs = data.errors || [{ message: "Unknown error occurred" }];
        setError(errs.map((e: { code?: string; message: string }) => `${e.code ? `[${e.code}] ` : ""}${e.message}`).join("\n"));
        setReport(null);
      } else {
        setReport(data.analysis.report);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Arcstone Pathway Lab
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Pilot Harness Active
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Deterministic Decision Pipeline Visualizer & Diagnostic Test Harness
            </p>
          </div>
        </header>

        {/* Controls Card */}
        <section className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 backdrop-blur shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Pilot CSV Directory
              </label>
              <input
                type="text"
                value={inputDir}
                onChange={(e) => setInputDir(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="data/fixtures/pilot-csv-sample"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
                Reference Date
              </label>
              <input
                type="date"
                value={referenceDate}
                onChange={(e) => setReferenceDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <button
                onClick={runAnalysis}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-md"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                  </>
                ) : (
                  "Run Pipeline Analysis"
                )}
              </button>
            </div>
          </div>

          {/* Quick presets */}
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span>Quick Presets:</span>
            <button
              onClick={() => {
                setInputDir("data/fixtures/pilot-csv-sample");
                setReferenceDate("2026-09-18");
              }}
              className="px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              Synthetic Sample
            </button>
            <button
              onClick={() => {
                setInputDir("data/templates/real-pilot");
                setReferenceDate("2026-09-18");
              }}
              className="px-2 py-1 rounded bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              Template Bundle
            </button>
          </div>
        </section>

        {/* Errors */}
        {error && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 rounded-xl p-4 text-sm font-mono whitespace-pre-wrap">
            <span className="font-bold block mb-1">Analysis Failed / Errors:</span>
            {error}
          </div>
        )}

        {/* Results */}
        {report && (
          <div className="space-y-6">
            {/* Meta & Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Startup</span>
                <p className="text-xl font-bold text-white mt-1 truncate">{report.meta.startupName}</p>
                <span className="text-xs text-slate-500 font-mono block mt-0.5">{report.meta.startupId}</span>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Targets Analyzed</span>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">{report.summary.targetsAnalyzed}</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Retained Paths</span>
                <p className="text-2xl font-extrabold text-indigo-400 mt-1">{report.summary.targetsWithRetainedPaths}</p>
              </div>
              <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">Selected Primary Targets</span>
                <p className="text-2xl font-extrabold text-amber-400 mt-1">{report.summary.targetsWithPrimaryPersonSelected}</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-800 text-sm font-medium">
              <button
                onClick={() => setActiveTab("visual")}
                className={`px-4 py-2 border-b-2 transition ${
                  activeTab === "visual"
                    ? "border-emerald-500 text-emerald-400 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Target Decisions Visualizer
              </button>
              <button
                onClick={() => setActiveTab("json")}
                className={`px-4 py-2 border-b-2 transition ${
                  activeTab === "json"
                    ? "border-emerald-500 text-emerald-400 font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                Raw Report (report.json)
              </button>
            </div>

            {/* Visual View */}
            {activeTab === "visual" && (
              <div className="grid grid-cols-1 gap-6">
                {report.targetReports.map((target) => {
                  const primaryPerson = target.selection.primaryTargetPersonName || "No Person Selected";
                  const primaryEval = target.selection.evaluations.find(
                    (e) => e.personId === target.selection.primaryTargetPersonId
                  );

                  return (
                    <div
                      key={target.targetInvestorId}
                      className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-6 space-y-5 shadow-sm"
                    >
                      {/* Target Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-700/50 pb-4">
                        <div>
                          <h2 className="text-xl font-bold text-white">
                            {target.investorOrganizationName}
                          </h2>
                          <span className="text-xs text-slate-400 font-mono">
                            ID: {target.targetInvestorId} ({target.investorOrganizationId})
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {target.diagnosticFlags.map((flag) => (
                            <span
                              key={flag}
                              className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase ${
                                flag === "CONFIRMATION_REQUIRED"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : flag === "ALL_PATHS_REJECTED"
                                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                  : flag === "NO_KNOWN_PATH"
                                  ? "bg-slate-700/50 text-slate-300 border border-slate-600"
                                  : "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                              }`}
                            >
                              {flag.replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Primary Person Selection Section */}
                      <div className="bg-slate-900/80 border border-slate-700/80 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">
                              Selected Target Person
                            </span>
                            <span className="text-lg font-bold text-emerald-400">
                              {primaryPerson}
                            </span>
                          </div>
                          {primaryEval && (
                            <div className="text-right">
                              <span className="text-xs text-slate-400 uppercase tracking-wider block">Target Priority</span>
                              <span className="text-2xl font-extrabold text-emerald-400">
                                {primaryEval.overallTargetPriorityIndex} <span className="text-xs font-normal text-slate-400">/ 100</span>
                              </span>
                            </div>
                          )}
                        </div>

                        {primaryEval && (
                          <div className="pt-3 border-t border-slate-800 space-y-2 text-xs">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div className="bg-slate-800/80 p-2 rounded border border-slate-700/50">
                                <span className="text-slate-400 block text-[10px]">Mandate Fit (70%)</span>
                                <span className="text-slate-200 font-mono font-bold text-sm">{primaryEval.mandateFitIndex} / 100</span>
                              </div>
                              <div className="bg-slate-800/80 p-2 rounded border border-slate-700/50">
                                <span className="text-slate-400 block text-[10px]">Access Quality (30%)</span>
                                <span className="text-slate-200 font-mono font-bold text-sm">{primaryEval.accessQualityIndex} / 100</span>
                              </div>
                              <div className="bg-slate-800/80 p-2 rounded border border-slate-700/50">
                                <span className="text-slate-400 block text-[10px]">Role Score</span>
                                <span className="text-slate-200 font-mono font-bold text-sm">{primaryEval.investmentRoleScore} ({primaryEval.roleTitle})</span>
                              </div>
                              <div className="bg-slate-800/80 p-2 rounded border border-slate-700/50">
                                <span className="text-slate-400 block text-[10px]">Stage / Sector / Geo</span>
                                <span className="text-slate-200 font-mono font-bold text-xs uppercase">
                                  {primaryEval.stageFitStatus} | {primaryEval.sectorFitStatus} | {primaryEval.geographyFitStatus}
                                </span>
                              </div>
                            </div>
                            <p className="text-slate-400 italic text-xs leading-relaxed pt-1">
                              {primaryEval.explanation}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Scored Paths Section */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                          Retained Access Paths ({target.scoring.scoredPathCount})
                        </span>
                        {target.scoring.scoredPaths.length > 0 ? (
                          target.scoring.scoredPaths.map((sp) => (
                            <div
                              key={sp.pathId}
                              className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 space-y-2 font-mono text-xs"
                            >
                              <div className="flex justify-between items-center text-slate-200 font-semibold">
                                <span className="truncate pr-2">{sp.pathId}</span>
                                <span className="text-emerald-400 font-bold">Priority Index: {sp.overallPriorityIndex}/100</span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                                <div>Credibility: <span className="text-slate-200">{sp.componentScores.relationshipCredibility}</span></div>
                                <div>Freshness: <span className="text-slate-200">{sp.componentScores.temporalFreshness}</span></div>
                                <div>Confirmation: <span className="text-slate-200">{sp.componentScores.confirmationReadiness}</span></div>
                                <div>Efficiency: <span className="text-slate-200">{sp.componentScores.pathEfficiency}</span></div>
                              </div>
                              <p className="text-[10px] text-slate-400 font-sans italic pt-1">
                                {sp.explanation}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 bg-slate-900/30 border border-slate-800 rounded-lg text-xs text-slate-500 italic">
                            No retained scored paths available for this target investor.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* JSON View */}
            {activeTab === "json" && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 overflow-x-auto">
                <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                  {JSON.stringify(report, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
