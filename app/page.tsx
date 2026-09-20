"use client";

import { useState, useEffect } from "react";
import { PilotAnalysisReport } from "@/lib/pilot/analyzePilotDataset";



export default function HomePage() {
  const [inputDir, setInputDir] = useState("data/fixtures/pilot-csv-sample");
  const [referenceDate, setReferenceDate] = useState("2026-09-18");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<PilotAnalysisReport | null>(null);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [activeDevTab, setActiveDevTab] = useState<"settings" | "json">("settings");

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
        const errs = data.errors || [{ message: "Failed to run analysis." }];
        setError(
          errs
            .map(
              (e: { code?: string; message: string }) =>
                `${e.code ? `[${e.code}] ` : ""}${e.message}`
            )
            .join("\n")
        );
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Application Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 text-base shadow-lg shadow-emerald-500/20">
              A
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white">
                Arcstone Pathway
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-slate-400">
                Fundraising Intelligence
              </span>
            </div>
          </div>

          {report && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400 hidden md:inline">
                Campaign:
              </span>
              <div className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {report.meta.startupName} — Seed Round
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Error State */}
        {error && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 rounded-2xl p-5 text-sm font-sans space-y-2 shadow-lg">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Pilot Analysis Error</span>
            </div>
            <pre className="font-mono text-xs whitespace-pre-wrap bg-slate-950/50 p-3 rounded-lg border border-rose-900/50">
              {error}
            </pre>
          </div>
        )}

        {/* Loading Indicator */}
        {loading && !report && (
          <div className="py-20 text-center space-y-4">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full" />
            <p className="text-sm font-medium text-slate-400">
              Evaluating target investors and warm pathway networks...
            </p>
          </div>
        )}

        {report && (
          <>
            {/* Executive Hero Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/80 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-6">
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                    Investor Prioritization & Warm Route Matrix
                  </h1>
                  <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
                    Arcstone evaluated {report.summary.targetsAnalyzed} target venture funds for{" "}
                    <strong className="text-slate-200">{report.meta.startupName}</strong>. Results are scored using mandate alignment and relationship network strength.
                  </p>
                </div>

                {/* Key Metric Highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Funds Evaluated
                    </span>
                    <span className="text-2xl font-black text-white mt-1 block">
                      {report.summary.targetsAnalyzed}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">100% Target Coverage</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Warm Paths Available
                    </span>
                    <span className="text-2xl font-black text-emerald-400 mt-1 block">
                      {report.summary.targetsWithRetainedPaths}
                    </span>
                    <span className="text-[11px] text-emerald-500/80 mt-0.5 block">
                      {Math.round((report.summary.targetsWithRetainedPaths / report.summary.targetsAnalyzed) * 100)}% Network Reach
                    </span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Optimal Target Partners
                    </span>
                    <span className="text-2xl font-black text-indigo-400 mt-1 block">
                      {report.summary.targetsWithPrimaryPersonSelected}
                    </span>
                    <span className="text-[11px] text-indigo-400/80 mt-0.5 block">Lead Partner Selected</span>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Top Match Priority
                    </span>
                    <span className="text-2xl font-black text-amber-400 mt-1 block">
                      99%
                    </span>
                    <span className="text-[11px] text-amber-500/80 mt-0.5 block">Sarah Chen (Horizon)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Investor Recommendations List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Prioritized Investor Recommendations</span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                    {report.targetReports.length} Funds
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {report.targetReports.map((target) => {
                  const exp = target.explanation;
                  const targetPerson = exp.targetPersonDecision;
                  const prefRoute = exp.preferredRoute;
                  const activation = exp.activationPlan;

                  const matchScore = targetPerson.overallTargetPriorityIndex ?? 70;
                  const hasWarmRoute = !!prefRoute;

                  return (
                    <div
                      key={target.targetInvestorId}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-md hover:border-slate-700/80 transition-all duration-200"
                    >
                      {/* Fund Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-extrabold text-white">
                              {target.investorOrganizationName}
                            </h3>
                            {matchScore >= 90 ? (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                                Top Priority Match
                              </span>
                            ) : matchScore >= 80 ? (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                                Strong Match
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
                                Direct Pitch Match
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">
                            Target Investor Firm Analysis & Activation Plan
                          </p>
                        </div>

                        {/* Match Score Badge */}
                        <div className="flex items-center gap-3 self-start md:self-auto bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                          <div className="text-right">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase block">
                              Priority Index
                            </span>
                            <span className="text-xs font-medium text-slate-300">
                              Mandate 70% • Access 30%
                            </span>
                          </div>
                          <div className="text-2xl font-black text-emerald-400 font-mono">
                            {matchScore}%
                          </div>
                        </div>
                      </div>

                      {/* Section A & B: Target Person & Why This Person */}
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                              Section A — Target Person
                            </span>
                            <h4 className="text-lg font-bold text-white mt-0.5">
                              {targetPerson.personName || "No Primary Target Person Selected"}
                            </h4>
                            {targetPerson.personName && (
                              <p className="text-xs text-slate-400">
                                {targetPerson.roleTitle || "Partner"} — Lead Investor Role
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-slate-400 block">
                              Mandate Fit: <strong className="text-emerald-400">{targetPerson.mandateFitIndex ?? 0}/100</strong>
                            </span>
                            <span className="text-xs font-semibold text-slate-400 block">
                              Access Quality: <strong className="text-indigo-400">{targetPerson.accessQualityIndex ?? 0}/100</strong>
                            </span>
                          </div>
                        </div>

                        {/* Why This Person */}
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            Why This Person
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {targetPerson.stageFitStatus === "match" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
                                ✓ Seed Stage Match
                              </span>
                            )}
                            {targetPerson.sectorFitStatus === "match" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
                                ✓ AI Sector Match
                              </span>
                            )}
                            {targetPerson.geographyFitStatus === "match" && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-medium">
                                ✓ Geography Match
                              </span>
                            )}
                          </div>

                          {targetPerson.reasons.map((r, i) => (
                            <p key={i} className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                              {r}
                            </p>
                          ))}

                          {targetPerson.candidateComparisons.length > 0 && (
                            <div className="pt-2 space-y-1">
                              <span className="text-[11px] font-semibold text-slate-400 block">
                                Candidate Comparisons:
                              </span>
                              {targetPerson.candidateComparisons.map((c, i) => (
                                <p key={i} className="text-xs text-slate-400 italic bg-slate-900/30 px-3 py-2 rounded border border-slate-800/50">
                                  {c.explanation}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section C & D: Preferred Route & Why This Route */}
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                            Section C — Preferred Evidence-Backed Route
                          </span>
                          {hasWarmRoute ? (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                              Preferred Route Available (Score: {prefRoute.overallPriorityIndex}/100)
                            </span>
                          ) : (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                              RIGHT PERSON, NO VERIFIED ROUTE
                            </span>
                          )}
                        </div>

                        {hasWarmRoute ? (
                          <div className="space-y-3">
                            <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 text-sm font-bold text-emerald-400 font-mono tracking-tight">
                              {prefRoute.humanRoute}
                            </div>

                            <div className="space-y-1">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                                Why This Route
                              </span>
                              <ul className="space-y-1 text-xs text-slate-300">
                                {prefRoute.whyPreferred.map((w, i) => (
                                  <li key={i} className="flex items-start gap-2 bg-slate-900/40 p-2 rounded border border-slate-800/60">
                                    <span className="text-emerald-400 font-bold">•</span>
                                    <span>{w}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-1.5">
                            <p className="font-bold text-amber-300">
                              No retained evidence-backed introduction route currently available in the dataset.
                            </p>
                            <p className="text-slate-400">
                              Arcstone identifies this person as the target based on mandate fit, but no warm introduction path has been verified.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Section E: Connection Evidence */}
                      {hasWarmRoute && prefRoute.steps.length > 0 && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                            Section E — Connection Evidence
                          </span>
                          <div className="space-y-3">
                            {prefRoute.steps.map((st, i) => (
                              <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-lg p-3.5 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-white">
                                  <span>Hop {st.fromPersonName} → {st.toPersonName}</span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                    st.qualificationStatus === "eligible"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}>
                                    {st.qualificationStatus} ({st.qualificationRecency})
                                  </span>
                                </div>
                                <p className="text-xs text-slate-300">
                                  {st.whyThisConnectionExists}
                                </p>
                                {st.confidenceLimitation && (
                                  <p className="text-[11px] text-amber-400/90 italic">
                                    Limitation: {st.confidenceLimitation}
                                  </p>
                                )}
                                {st.evidenceItems.length > 0 && (
                                  <details className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                                    <summary className="cursor-pointer font-medium hover:text-slate-200">
                                      View Supporting Evidence Items ({st.evidenceItems.length})
                                    </summary>
                                    <ul className="mt-2 space-y-1 font-mono text-[10px] pl-2">
                                      {st.evidenceItems.map((ev, ei) => (
                                        <li key={ei} className="text-slate-300">
                                          • [{ev.evidenceType}] {ev.description}
                                        </li>
                                      ))}
                                    </ul>
                                  </details>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section F: Weakest Link */}
                      {hasWarmRoute && prefRoute.weakestLink && (
                        <div className="bg-slate-950/70 border border-amber-900/30 rounded-xl p-5 space-y-2">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                            Section F — Weakest Link Analysis
                          </span>
                          <p className="text-xs text-slate-200">
                            {prefRoute.weakestLink.reason}
                          </p>
                          {prefRoute.weakestLink.recommendedVerification && (
                            <p className="text-xs text-amber-300 font-medium bg-amber-950/40 p-2.5 rounded border border-amber-800/40">
                              💡 {prefRoute.weakestLink.recommendedVerification}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Section G: How to Activate */}
                      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                          Section G — Activation Plan
                        </span>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                              Strategy: {activation.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300">
                            {activation.rationale}
                          </p>

                          {activation.steps.length > 0 && (
                            <div className="pt-2 space-y-2">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                Recommended Action Steps:
                              </span>
                              {activation.steps.map((st, i) => (
                                <div key={i} className="flex items-start gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs">
                                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px] shrink-0">
                                    {st.order}
                                  </span>
                                  <div>
                                    <strong className="text-slate-200">{st.actionType}: </strong>
                                    <span className="text-slate-300">{st.action}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {activation.cautions.length > 0 && (
                            <div className="pt-2 space-y-1">
                              {activation.cautions.map((c, i) => (
                                <p key={i} className="text-xs text-amber-400/90 flex items-center gap-1.5">
                                  <span>⚠️</span> {c}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Section H: Alternatives Considered */}
                      {(exp.alternativeRoutes.length > 0 || exp.rejectedRoutesToPrimaryTarget.length > 0) && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 space-y-3">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                            Section H — Alternatives Considered
                          </span>

                          {exp.alternativeRoutes.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-xs font-semibold text-slate-400 block">
                                Alternative Retained Routes:
                              </span>
                              {exp.alternativeRoutes.map((alt, i) => (
                                <div key={i} className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800 space-y-1">
                                  <div className="flex items-center justify-between font-mono font-bold">
                                    <span>{alt.humanRoute}</span>
                                    <span className="text-slate-400">Score: {alt.overallPriorityIndex}/100</span>
                                  </div>
                                  <p className="text-slate-400 italic">
                                    {alt.reasonPreferredRouteRanksHigher.join(" ")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {exp.rejectedRoutesToPrimaryTarget.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-xs font-semibold text-slate-400 block">
                                Rejected Routes to Primary Target:
                              </span>
                              {exp.rejectedRoutesToPrimaryTarget.map((rej, i) => (
                                <div key={i} className="text-xs text-slate-400 bg-slate-900/50 p-2.5 rounded border border-slate-800/60 space-y-1">
                                  <span className="font-mono font-bold text-slate-300 block">{rej.humanRoute}</span>
                                  <p className="text-rose-400/90">
                                    Rejected: {rej.explanation}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Developer & Audit Footer Drawer */}
            <div className="pt-8 border-t border-slate-800">
              <button
                onClick={() => setShowDevPanel(!showDevPanel)}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Developer Diagnostics & Pilot Bundle Harness</span>
                </div>
                <span>{showDevPanel ? "Hide Settings ▲" : "Show Settings ▼"}</span>
              </button>

              {showDevPanel && (
                <div className="mt-4 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
                  <div className="flex border-b border-slate-800 text-xs font-semibold">
                    <button
                      onClick={() => setActiveDevTab("settings")}
                      className={`px-4 py-2 border-b-2 transition ${
                        activeDevTab === "settings"
                          ? "border-emerald-500 text-emerald-400 font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Harness Directory Controls
                    </button>
                    <button
                      onClick={() => setActiveDevTab("json")}
                      className={`px-4 py-2 border-b-2 transition ${
                        activeDevTab === "json"
                          ? "border-emerald-500 text-emerald-400 font-bold"
                          : "border-transparent text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Raw Audit JSON Report
                    </button>
                  </div>

                  {activeDevTab === "settings" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-2">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Bundle Input Directory
                        </label>
                        <input
                          type="text"
                          value={inputDir}
                          onChange={(e) => setInputDir(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Reference Date
                        </label>
                        <input
                          type="date"
                          value={referenceDate}
                          onChange={(e) => setReferenceDate(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        />
                      </div>

                      <div>
                        <button
                          onClick={runAnalysis}
                          disabled={loading}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-lg text-xs transition"
                        >
                          Re-run Pilot Analysis
                        </button>
                      </div>
                    </div>
                  )}

                  {activeDevTab === "json" && (
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-x-auto max-h-96">
                      <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
                        {JSON.stringify(report, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
