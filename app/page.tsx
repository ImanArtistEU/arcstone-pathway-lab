export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full bg-white rounded-lg border border-gray-200 p-8 shadow-sm text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">
          Arcstone Pathway Lab
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Standalone prototype environment for Pathway Intelligence.
        </p>
        <div className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          Batch 0 — Environment operational.
        </div>
      </div>
    </main>
  );
}
