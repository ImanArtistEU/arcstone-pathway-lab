import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { assertDatasetIntegrity } from "@/lib/pathway/assertDatasetIntegrity";

export default function HomePage() {
  const integrity = assertDatasetIntegrity(pathwayDemoDataset);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full bg-white rounded-lg border border-gray-200 p-8 shadow-sm text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">
          Arcstone Pathway Lab
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Standalone prototype environment for Pathway Intelligence.
        </p>
        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mb-6">
          Batch 1 — Domain model operational
        </div>

        <div className="grid grid-cols-2 gap-4 text-left border-t border-gray-100 pt-6 mb-6">
          <div>
            <span className="text-sm text-gray-500">People</span>
            <p className="text-2xl font-semibold text-gray-900">
              {pathwayDemoDataset.people.length}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Organizations</span>
            <p className="text-2xl font-semibold text-gray-900">
              {pathwayDemoDataset.organizations.length}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Relationships</span>
            <p className="text-2xl font-semibold text-gray-900">
              {pathwayDemoDataset.relationships.length}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Evidence</span>
            <p className="text-2xl font-semibold text-gray-900">
              {pathwayDemoDataset.relationshipEvidence.length}
            </p>
          </div>
          <div className="col-span-2">
            <span className="text-sm text-gray-500">Target Investors</span>
            <p className="text-2xl font-semibold text-gray-900">
              {pathwayDemoDataset.targetInvestors.length}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 text-sm">
          <span className="text-gray-500">Dataset integrity: </span>
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
