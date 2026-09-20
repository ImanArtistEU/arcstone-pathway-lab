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

    const peopleMap: Record<string, string> = {};
    for (const p of loadResult.dataset!.people) {
      peopleMap[p.id] = p.fullName;
    }

    const orgMap: Record<string, string> = {};
    for (const o of loadResult.dataset!.organizations) {
      orgMap[o.id] = o.name;
    }

    // Enrich target reports with founder-friendly human route descriptions
    const enrichedTargetReports = analysisResult.report?.targetReports.map((tr) => {
      const enrichedScoredPaths = tr.scoring.scoredPaths.map((sp) => {
        const parts = sp.pathId.split(":");
        const startPersonId = parts[2];
        const targetPersonId = parts[3];
        const startName = peopleMap[startPersonId] || startPersonId;
        const targetName = peopleMap[targetPersonId] || targetPersonId;

        const intermediateNames: string[] = [];
        if (parts.length > 4) {
          for (let i = 4; i < parts.length; i++) {
            const relStr = parts[i].replace(/^rev>/, "");
            const rel = loadResult.dataset!.relationships.find((r) => r.id === relStr);
            if (rel) {
              const fromName = peopleMap[rel.from.id] || orgMap[rel.from.id];
              const toName = peopleMap[rel.to.id] || orgMap[rel.to.id];
              if (fromName && !intermediateNames.includes(fromName) && fromName !== startName && fromName !== targetName) {
                intermediateNames.push(fromName);
              }
              if (toName && !intermediateNames.includes(toName) && toName !== startName && toName !== targetName) {
                intermediateNames.push(toName);
              }
            }
          }
        }

        const humanRoute = [startName, ...intermediateNames, targetName].filter(Boolean).join(" → ");

        return {
          ...sp,
          humanRoute,
          startPersonName: startName,
          targetPersonName: targetName,
        };
      });

      return {
        ...tr,
        scoring: {
          ...tr.scoring,
          scoredPaths: enrichedScoredPaths,
        },
      };
    });

    const enrichedReport = analysisResult.report
      ? {
          ...analysisResult.report,
          targetReports: enrichedTargetReports || analysisResult.report.targetReports,
        }
      : undefined;

    return NextResponse.json({
      status: "success",
      bundleDir: inputDir,
      referenceDate,
      loadWarnings: loadResult.warnings,
      analysis: {
        ...analysisResult,
        report: enrichedReport,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: "error", errors: [{ code: "SERVER_ERROR", message: msg }] },
      { status: 500 }
    );
  }
}
