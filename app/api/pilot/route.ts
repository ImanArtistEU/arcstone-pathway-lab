import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { loadPilotCsvBundle } from "@/lib/pilot/loadPilotCsvBundle";
import { analyzePilotDataset } from "@/lib/pilot/analyzePilotDataset";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const inputDir = body.inputDir || "data/fixtures/pilot-csv-sample";
    const referenceDate = body.referenceDate || "2026-09-18";

    const resolvedDir = path.resolve(process.cwd(), inputDir);

    // Prevent path traversal outside process.cwd()
    if (!resolvedDir.startsWith(process.cwd())) {
      return NextResponse.json(
        { status: "error", errors: [{ code: "INVALID_PATH", message: "Path must be within project root." }] },
        { status: 400 }
      );
    }

    if (!fs.existsSync(resolvedDir)) {
      return NextResponse.json(
        { status: "error", errors: [{ code: "DIRECTORY_NOT_FOUND", message: `Directory not found: ${inputDir}` }] },
        { status: 404 }
      );
    }

    const loadResult = loadPilotCsvBundle(resolvedDir);
    if (loadResult.status === "error") {
      return NextResponse.json({
        status: "load_error",
        errors: loadResult.errors,
        warnings: loadResult.warnings,
      });
    }

    const analysisResult = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      referenceDate
    );

    return NextResponse.json({
      status: "success",
      bundleDir: inputDir,
      referenceDate,
      loadWarnings: loadResult.warnings,
      analysis: analysisResult,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: "error", errors: [{ code: "SERVER_ERROR", message: msg }] },
      { status: 500 }
    );
  }
}
