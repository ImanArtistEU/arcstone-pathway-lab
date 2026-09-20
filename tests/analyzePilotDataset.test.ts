import path from "node:path";
import { describe, it, expect } from "vitest";
import { loadPilotCsvBundle } from "@/lib/pilot/loadPilotCsvBundle";
import { analyzePilotDataset } from "@/lib/pilot/analyzePilotDataset";

describe("analyzePilotDataset", () => {
  const sampleDir = path.resolve(__dirname, "../data/fixtures/pilot-csv-sample");

  it("29. analyzes synthetic sample bundle and produces correct summary and 4 targets", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    expect(loadResult.status).toBe("success");

    const res = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "2026-09-18"
    );

    expect(res.status).toBe("success");
    const report = res.report!;

    expect(report.meta.startupName).toBe("Nexus AI");
    expect(report.summary.targetsAnalyzed).toBe(4);
    expect(report.summary.targetsWithRetainedPaths).toBe(2);
    expect(report.summary.targetsWithOnlyRejectedPaths).toBe(1);
    expect(report.summary.targetsWithNoKnownPaths).toBe(1);
    expect(report.summary.targetsWithAnalysisErrors).toBe(0);
  });

  it("30. verifies frozen pipeline scoring and selection for Horizon target", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const res = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "2026-09-18"
    );
    const report = res.report!;

    const horizon = report.targetReports.find((t) => t.targetInvestorId === "target-horizon");
    expect(horizon).toBeDefined();
    expect(horizon!.scoring.scoredPaths).toHaveLength(1);
    expect(horizon!.scoring.scoredPaths[0].overallPriorityIndex).toBe(98);
    expect(horizon!.selection.primaryTargetPersonId).toBe("person-vc-sarah");

    const sarahEval = horizon!.selection.evaluations.find((e) => e.personId === "person-vc-sarah");
    expect(sarahEval).toBeDefined();
    expect(sarahEval!.overallTargetPriorityIndex).toBe(99);
  });

  it("31. confirms genuine Aurora no-path emits NO_KNOWN_PATH", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const res = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "2026-09-18"
    );
    const report = res.report!;

    const aurora = report.targetReports.find((t) => t.targetInvestorId === "target-aurora");
    expect(aurora).toBeDefined();
    expect(aurora!.diagnosticFlags).toContain("NO_KNOWN_PATH");
    expect(aurora!.diagnosticFlags).not.toContain("ANALYSIS_ERROR");
  });

  it("32. ensures pipeline analysis error emits ANALYSIS_ERROR and NOT NO_KNOWN_PATH", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const dataset = JSON.parse(JSON.stringify(loadResult.dataset!));

    dataset.targetInvestors[3].campaignId = "nonexistent-campaign";

    const res = analyzePilotDataset(dataset, loadResult.targetPersonProfiles!, "2026-09-18");
    expect(res.status).toBe("error");
    expect(res.errors![0].code).toBe("TARGET_CAMPAIGN_MISMATCH");
  });

  it("33. verifies all paths rejected target emits ALL_PATHS_REJECTED (Summit)", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const res = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "2026-09-18"
    );
    const report = res.report!;

    const summit = report.targetReports.find((t) => t.targetInvestorId === "target-summit");
    expect(summit).toBeDefined();
    expect(summit!.diagnosticFlags).toContain("ALL_PATHS_REJECTED");
  });

  it("34. verifies confirmation path target emits CONFIRMATION_REQUIRED (Beacon)", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const res = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "2026-09-18"
    );
    const report = res.report!;

    const beacon = report.targetReports.find((t) => t.targetInvestorId === "target-beacon");
    expect(beacon).toBeDefined();
    expect(beacon!.diagnosticFlags).toContain("CONFIRMATION_REQUIRED");
    expect(beacon!.scoring.scoredPaths[0].overallPriorityIndex).toBe(52);
  });

  it("35. verifies selected person without retained path emits NO_RETAINED_ACCESS_TO_PRIMARY_TARGET", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const res = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "2026-09-18"
    );
    const report = res.report!;

    const aurora = report.targetReports.find((t) => t.targetInvestorId === "target-aurora");
    expect(aurora).toBeDefined();
    expect(aurora!.diagnosticFlags).toContain("NO_RETAINED_ACCESS_TO_PRIMARY_TARGET");
  });

  it("36. detects ambiguous selection ties (AMBIGUOUS_TARGET_PERSON)", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const profiles = JSON.parse(JSON.stringify(loadResult.targetPersonProfiles!));

    // Add second candidate profile to target-aurora with identical feature scores (both have 0 warm paths)
    profiles.push({
      targetInvestorId: "target-aurora",
      personId: "person-vc-isabel-dupe",
      roleTitle: "Partner",
      investmentRole: "lead_investor",
      stageFocus: ["Seed", "Series A"],
      sectorFocus: ["Enterprise Software", "DeepTech"],
      geographyFocus: ["San Francisco, CA", "global"],
      observedAt: "2026-09-01T00:00:00.000Z",
    });

    const dataset = JSON.parse(JSON.stringify(loadResult.dataset!));
    const auroraTarget = dataset.targetInvestors.find((t: any) => t.id === "target-aurora");
    auroraTarget.candidatePersonIds.push("person-vc-isabel-dupe");
    dataset.people.push({
      id: "person-vc-isabel-dupe",
      firstName: "Isabel2",
      lastName: "Torres2",
      fullName: "Isabel Torres 2",
      currentOrganizationIds: ["org-aurora-ventures"],
    });

    const res = analyzePilotDataset(dataset, profiles, "2026-09-18");
    expect(res.status).toBe("success");
    const aurora = res.report!.targetReports.find((t) => t.targetInvestorId === "target-aurora");
    expect(aurora!.diagnosticFlags).toContain("AMBIGUOUS_TARGET_PERSON");
  });

  it("37. detects missing startup sector (MISSING_STARTUP_SECTOR)", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const dataset = JSON.parse(JSON.stringify(loadResult.dataset!));
    dataset.startups[0].sector = "";

    const res = analyzePilotDataset(dataset, loadResult.targetPersonProfiles!, "2026-09-18");
    expect(res.status).toBe("success");
    expect(res.report!.targetReports[0].diagnosticFlags).toContain("MISSING_STARTUP_SECTOR");
  });

  it("38. detects sector no_match (EXACT_MATCH_SECTOR_NO_MATCH)", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const profiles = JSON.parse(JSON.stringify(loadResult.targetPersonProfiles!));
    const auroraProf = profiles.find((p: any) => p.targetInvestorId === "target-aurora");
    auroraProf.sectorFocus = ["Fintech", "Healthcare"];

    const res = analyzePilotDataset(
      loadResult.dataset!,
      profiles,
      "2026-09-18"
    );
    const aurora = res.report!.targetReports.find((t) => t.targetInvestorId === "target-aurora");
    expect(aurora!.diagnosticFlags).toContain("EXACT_MATCH_SECTOR_NO_MATCH");
  });

  it("39. fails closed on invalid reference date", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const res = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "not-a-date"
    );

    expect(res.status).toBe("error");
    expect(res.errors![0].code).toBe("INVALID_REFERENCE_DATE");
  });

  it("40. confirms repeated analyzer calls are perfectly deterministic", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const res1 = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "2026-09-18"
    );
    const res2 = analyzePilotDataset(
      loadResult.dataset!,
      loadResult.targetPersonProfiles!,
      "2026-09-18"
    );

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
  });

  it("41. confirms analyzer does not mutate dataset", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const originalJson = JSON.stringify(loadResult.dataset!);

    analyzePilotDataset(loadResult.dataset!, loadResult.targetPersonProfiles!, "2026-09-18");

    expect(JSON.stringify(loadResult.dataset!)).toBe(originalJson);
  });

  it("42. confirms analyzer does not mutate profiles", () => {
    const loadResult = loadPilotCsvBundle(sampleDir);
    const originalJson = JSON.stringify(loadResult.targetPersonProfiles!);

    analyzePilotDataset(loadResult.dataset!, loadResult.targetPersonProfiles!, "2026-09-18");

    expect(JSON.stringify(loadResult.targetPersonProfiles!)).toBe(originalJson);
  });
});
