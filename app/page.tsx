import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { targetPersonDemoProfiles } from "@/data/fixtures/target-person-profiles";
import { assertDatasetIntegrity } from "@/lib/pathway/assertDatasetIntegrity";
import { qualifyRelationships } from "@/lib/pathway/qualifyRelationships";
import { generatePathsForTarget } from "@/lib/pathway/generatePathsForTarget";
import { applyPathRejection } from "@/lib/pathway/applyPathRejection";
import { scoreRetainedPaths } from "@/lib/pathway/scoreRetainedPaths";
import { selectTargetPerson } from "@/lib/pathway/selectTargetPerson";

export default function HomePage() {
  const integrity = assertDatasetIntegrity(pathwayDemoDataset);
  const qualifications = qualifyRelationships(pathwayDemoDataset, "2026-09-18");

  const eligibleCount = qualifications.filter((q) => q.status === "eligible").length;
  const confirmationCount = qualifications.filter((q) => q.status === "confirmation_required").length;
  const structuralCount = qualifications.filter((q) => q.status === "structural").length;
  const ineligibleCount = qualifications.filter((q) => q.status === "ineligible").length;

  const personMap = new Map(pathwayDemoDataset.people.map((p) => [p.id, p.fullName]));
  const orgMap = new Map(pathwayDemoDataset.organizations.map((o) => [o.id, o.name]));

  const targets = pathwayDemoDataset.targetInvestors.map((target) => {
    const orgName = orgMap.get(target.investorOrganizationId) || target.investorOrganizationId;
    const generationResult = generatePathsForTarget(pathwayDemoDataset, target.id, "2026-09-18");
    const rejectionResult = applyPathRejection(generationResult);
    const scoringResult = scoreRetainedPaths(rejectionResult);
    const selectionResult = selectTargetPerson(
      pathwayDemoDataset,
      target.id,
      targetPersonDemoProfiles,
      scoringResult,
      "2026-09-18"
    );
    return {
      targetId: target.id,
      orgName,
      generationResult,
      rejectionResult,
      scoringResult,
      selectionResult,
    };
  });

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-xl w-full bg-white rounded-lg border border-gray-200 p-8 shadow-sm text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
          Arcstone Pathway Lab
        </h1>
        <p className="text-base text-gray-600 mb-5">
          Standalone prototype environment for Pathway Intelligence.
        </p>

        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mb-6">
          Batch 6 — Target person selection operational
        </div>

        {/* Dataset Counts */}
        <div className="grid grid-cols-2 gap-4 text-left border-t border-gray-100 pt-5 mb-5">
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">People</span>
            <p className="text-xl font-semibold text-gray-900">
              {pathwayDemoDataset.people.length}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Organizations</span>
            <p className="text-xl font-semibold text-gray-900">
              {pathwayDemoDataset.organizations.length}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Relationships</span>
            <p className="text-xl font-semibold text-gray-900">
              {pathwayDemoDataset.relationships.length}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Evidence</span>
            <p className="text-xl font-semibold text-gray-900">
              {pathwayDemoDataset.relationshipEvidence.length}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-xs uppercase tracking-wider text-gray-500 font-medium">Target Investors</span>
            <p className="text-xl font-semibold text-gray-900">
              {pathwayDemoDataset.targetInvestors.length}
            </p>
          </div>
        </div>

        {/* Qualification Counts */}
        <div className="border-t border-gray-100 pt-5 text-left mb-5">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-3">
            Qualification Status (2026-09-18)
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2.5 rounded bg-emerald-50 border border-emerald-100">
              <span className="text-xs text-emerald-800 font-medium">Eligible</span>
              <p className="text-lg font-bold text-emerald-900">{eligibleCount}</p>
            </div>
            <div className="p-2.5 rounded bg-amber-50 border border-amber-100">
              <span className="text-xs text-amber-800 font-medium">Confirmation Required</span>
              <p className="text-lg font-bold text-amber-900">{confirmationCount}</p>
            </div>
            <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-700 font-medium">Structural</span>
              <p className="text-lg font-bold text-slate-900">{structuralCount}</p>
            </div>
            <div className="p-2.5 rounded bg-rose-50 border border-rose-100">
              <span className="text-xs text-rose-800 font-medium">Ineligible</span>
              <p className="text-lg font-bold text-rose-900">{ineligibleCount}</p>
            </div>
          </div>
        </div>

        {/* Path Scoring Results */}
        <div className="border-t border-gray-100 pt-5 text-left mb-5 space-y-3">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-2">
            Path Scoring by Target
          </span>
          {targets.map(({ targetId, orgName, generationResult, rejectionResult, scoringResult }) => {
            const allEvaluated = [
              ...rejectionResult.retainedPaths,
              ...rejectionResult.rejectedPaths,
            ];

            return (
              <div
                key={targetId}
                className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">
                    {orgName}
                  </span>
                  <span className="text-xs font-mono text-gray-500">
                    GENERATED: {rejectionResult.inputPathCount} | RETAINED: {rejectionResult.retainedPaths.length} | REJECTED: {rejectionResult.rejectedPathCount}
                  </span>
                </div>
                <div className="space-y-2">
                  {allEvaluated.length > 0 ? (
                    allEvaluated.map((p) => {
                      const evalRecord = rejectionResult.evaluations.find(
                        (e) => e.pathId === p.id
                      );
                      const isRetained = evalRecord?.decision === "retain";
                      const isEligible = p.status === "eligible";

                      const scoredPathObj = scoringResult.scoredPaths.find(
                        (sp) => sp.path.id === p.id
                      );

                      const statusBadgeText = isRetained
                        ? isEligible
                          ? "RETAINED"
                          : "RETAINED — CONFIRMATION REQUIRED"
                        : "REJECTED";

                      const statusBadgeClass = isRetained
                        ? isEligible
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-amber-700 bg-amber-50 border-amber-200"
                        : "text-rose-700 bg-rose-50 border-rose-200";

                      return (
                        <div
                          key={p.id}
                          className="flex flex-col text-xs font-mono p-2 bg-white rounded border border-gray-100 space-y-2"
                        >
                          <div className="text-gray-800 font-medium">
                            {p.nodes
                              .map((n) => personMap.get(n.id) || n.id)
                              .join(" → ")}
                          </div>
                          <div>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusBadgeClass}`}
                            >
                              {statusBadgeText}
                            </span>
                          </div>

                          {isRetained && scoredPathObj ? (
                            <div className="pt-1.5 border-t border-gray-100 space-y-1 text-gray-700">
                              <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                                <span>Priority Index:</span>
                                <span>{scoredPathObj.score.overallPriorityIndex} / 100</span>
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
                                <div>Credibility: {scoredPathObj.score.relationshipCredibility}</div>
                                <div>Freshness: {scoredPathObj.score.temporalFreshness}</div>
                                <div>Confirmation: {scoredPathObj.score.confirmationReadiness}</div>
                                <div>Efficiency: {scoredPathObj.score.pathEfficiency}</div>
                              </div>
                              <div className="text-[10px] text-amber-700 bg-amber-50/70 p-1 rounded font-sans font-semibold mt-1">
                                UNCALIBRATED HEURISTIC — NOT A PROBABILITY
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-100">
                              NOT SCORED
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-gray-500 font-mono italic p-2 bg-white rounded border border-gray-100">
                      <div>
                        {generationResult.executionStatus === "error"
                          ? "Upstream generation error"
                          : rejectionResult.disposition === "upstream_paths_filtered"
                          ? "Confirmation paths filtered upstream"
                          : "NO GENERATED PATH"}
                      </div>
                      <div className="text-[11px] text-gray-500 italic pt-1 mt-1 border-t border-gray-100">
                        NOT SCORED
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Target Person Selection Results */}
        <div className="border-t border-gray-100 pt-5 text-left mb-5 space-y-3">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-2">
            Target Person Selection by Investor
          </span>
          {targets.map(({ targetId, orgName, selectionResult }) => {
            const primaryId = selectionResult.primaryTargetPersonId;
            const primaryName = primaryId ? personMap.get(primaryId) || primaryId : "None Selected";
            const primaryEval = selectionResult.evaluations.find((e) => e.personId === primaryId);

            return (
              <div
                key={targetId}
                className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 space-y-2 text-xs font-mono"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm font-sans">
                    {orgName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium uppercase text-indigo-700 bg-indigo-50 border-indigo-200">
                    {selectionResult.disposition.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="p-2.5 bg-white rounded border border-gray-100 space-y-1.5">
                  <div className="flex justify-between items-center text-sm font-bold text-gray-900 font-sans">
                    <span>Target Person: <span className="text-indigo-600">{primaryName}</span></span>
                    {primaryEval && (
                      <span className="text-emerald-700 font-mono">
                        Priority: {primaryEval.overallTargetPriorityIndex} / 100
                      </span>
                    )}
                  </div>

                  {primaryEval && (
                    <div className="space-y-1 text-gray-700 pt-1 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] text-gray-600">
                        <div>Role: {primaryEval.roleTitle} ({primaryEval.investmentRole})</div>
                        <div>Mandate Fit: {primaryEval.mandateFitIndex} / 100</div>
                        <div>Access Quality: {primaryEval.accessQualityIndex} / 100</div>
                        <div>Role Score: {primaryEval.investmentRoleScore}</div>
                        <div>Stage Fit: {primaryEval.stageFitStatus}</div>
                        <div>Sector Fit: {primaryEval.sectorFitStatus}</div>
                      </div>
                      <p className="text-[10px] font-sans text-gray-500 italic mt-1 leading-snug">
                        {primaryEval.explanation}
                      </p>
                      <div className="text-[10px] text-amber-700 bg-amber-50/70 p-1 rounded font-sans font-semibold mt-1">
                        TARGET PRIORITY = UNCALIBRATED HEURISTIC
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-gray-100 pt-4 text-sm flex justify-between items-center">
          <span className="text-gray-500">Dataset integrity:</span>
          <span
            className={
              integrity.valid
                ? "font-semibold text-emerald-600"
                : "font-semibold text-red-600"
            }
          >
            {integrity.valid ? "VALID" : "INVALID"}
          </span>
        </div>
      </div>
    </main>
  );
}
