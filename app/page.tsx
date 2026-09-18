import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { assertDatasetIntegrity } from "@/lib/pathway/assertDatasetIntegrity";
import { qualifyRelationships } from "@/lib/pathway/qualifyRelationships";
import { generatePathsForTarget } from "@/lib/pathway/generatePathsForTarget";

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
    const result = generatePathsForTarget(pathwayDemoDataset, target.id, "2026-09-18");
    return {
      targetId: target.id,
      orgName,
      result,
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
          Batch 3 — Path generation operational
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

        {/* Path Generation Results */}
        <div className="border-t border-gray-100 pt-5 text-left mb-5 space-y-3">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-2">
            Path Generation by Target
          </span>
          {targets.map(({ targetId, orgName, result }) => {
            const hasPaths = result.paths.length > 0;
            const primaryPath = hasPaths ? result.paths[0] : null;
            const routeStr = primaryPath
              ? primaryPath.nodes
                  .map((n) => personMap.get(n.id) || n.id)
                  .join(" → ")
              : "Cold outreach required";

            const badgeText =
              result.disposition === "eligible_path_available"
                ? "ELIGIBLE PATH"
                : result.disposition === "confirmation_path_available"
                ? "CONFIRMATION REQUIRED"
                : "NO KNOWN PATH";

            const badgeClass =
              result.disposition === "eligible_path_available"
                ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                : result.disposition === "confirmation_path_available"
                ? "text-amber-700 bg-amber-50 border-amber-200"
                : "text-slate-700 bg-slate-50 border-slate-200";

            return (
              <div
                key={targetId}
                className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 space-y-1"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 text-sm">
                    {orgName}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded border font-medium ${badgeClass}`}
                  >
                    {badgeText}
                  </span>
                </div>
                <div className="text-xs text-gray-600 font-mono">
                  {routeStr}
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
