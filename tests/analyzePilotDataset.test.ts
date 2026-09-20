import path from "node:path";
import { describe, it, expect } from "vitest";
import { loadPilotCsvBundle } from "@/lib/pilot/loadPilotCsvBundle";
import { analyzePilotDataset } from "@/lib/pilot/analyzePilotDataset";

describe("analyzePilotDataset", () => {
  const sampleDir = path.resolve(__dirname, "../data/fixtures/pilot-csv-sample");

  it("analyzes synthetic sample bundle and produces correct summary and diagnostic flags", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    expect(loadResult.status).toBe("success");

    const report = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "2026-09-18"
    );

    expect(report.meta.startupName).toBe("Nexus AI");
    expect(report.summary.targetsAnalyzed).toBe(4);
    expect(report.summary.targetsWithRetainedPaths).toBe(2);
    expect(report.summary.targetsWithOnlyRejectedPaths).toBe(1);
    expect(report.summary.targetsWithNoKnownPaths).toBe(1);

    const horizonTarget = report.targetReports.find((t) => t.targetInvestorId === "target-horizon");
    expect(horizonTarget).toBeDefined();
    expect(horizonTarget!.rejection.retainedPathCount).toBe(1);
    expect(horizonTarget!.selection.primaryTargetPersonId).toBe("person-vc-sarah");

    const auroraTarget = report.targetReports.find((t) => t.targetInvestorId === "target-aurora");
    expect(auroraTarget).toBeDefined();
    expect(auroraTarget!.diagnosticFlags).toContain("NO_KNOWN_PATH");
  });
});
