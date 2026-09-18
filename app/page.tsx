import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { assertDatasetIntegrity } from "@/lib/pathway/assertDatasetIntegrity";
import { qualifyRelationships } from "@/lib/pathway/qualifyRelationships";

export default function HomePage() {
  const integrity = assertDatasetIntegrity(pathwayDemoDataset);
  const qualifications = qualifyRelationships(pathwayDemoDataset, "2026-09-18");

  const eligibleCount = qualifications.filter((q) => q.status === "eligible").length;
  const confirmationCount = qualifications.filter((q) => q.status === "confirmation_required").length;
  const structuralCount = qualifications.filter((q) => q.status === "structural").length;
  const ineligibleCount = qualifications.filter((q) => q.status === "ineligible").length;

  const qualMap = new Map(qualifications.map((q) => [q.relationshipId, q]));

  const formatStatus = (status?: string) => {
    switch (status) {
      case "eligible":
        return "ELIGIBLE";
      case "confirmation_required":
        return "CONFIRMATION REQUIRED";
      case "structural":
        return "STRUCTURAL";
      case "ineligible":
        return "INELIGIBLE";
      default:
        return "UNKNOWN";
    }
  };

  const elenaMarcus = formatStatus(qualMap.get("rel-elena-marcus")?.status);
  const marcusSarah = formatStatus(qualMap.get("rel-marcus-sarah")?.status);
  const elenaDavid = formatStatus(qualMap.get("rel-elena-david")?.status);
  const elenaTom = formatStatus(qualMap.get("rel-elena-tom")?.status);

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
          Batch 2 — Relationship qualification operational
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

        {/* Demo Scenario Results */}
        <div className="border-t border-gray-100 pt-5 text-left mb-5 space-y-2 text-sm">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-medium block mb-2">
            Key Demo Qualifications
          </span>
          <div className="flex justify-between items-center py-1 border-b border-gray-50">
            <span className="text-gray-700">Founder ↔ Advisor:</span>
            <span className="font-semibold text-emerald-600">{elenaMarcus}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-50">
            <span className="text-gray-700">Advisor ↔ Horizon Partner:</span>
            <span className="font-semibold text-emerald-600">{marcusSarah}</span>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-50">
            <span className="text-gray-700">Founder ↔ Beacon Partner (LinkedIn only):</span>
            <span className="font-semibold text-amber-600">{elenaDavid}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-700">Founder ↔ Former Colleague:</span>
            <span className="font-semibold text-amber-600">{elenaTom}</span>
          </div>
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
