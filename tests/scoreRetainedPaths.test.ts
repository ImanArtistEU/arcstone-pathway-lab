import { describe, it, expect, vi } from "vitest";
import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { generatePathsForTarget } from "@/lib/pathway/generatePathsForTarget";
import { applyPathRejection } from "@/lib/pathway/applyPathRejection";
import { scoreRetainedPaths } from "@/lib/pathway/scoreRetainedPaths";
import { qualifyRelationships } from "@/lib/pathway/qualifyRelationships";
import {
  PathRejectionResult,
  PathCandidate,
  PathTraversalStep,
  PathScoringResult,
} from "@/types/pathway";

const REFERENCE_DATE = "2026-09-18";

describe("Deterministic Path Scoring / Priority Index (Batch 5)", () => {
  // Demo Score Tests (1 - 16)
  it("1: Horizon produces exactly one score", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("scores_available");
    expect(res.scoredPaths.length).toBe(1);
  });

  it("2: Horizon overallPriorityIndex = 60", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.overallPriorityIndex).toBe(60);
  });

  it("3: Horizon relationshipCredibility = 35", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(35);
  });

  it("4: Horizon temporalFreshness = 100", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.temporalFreshness).toBe(100);
  });

  it("5: Horizon confirmationReadiness = 55", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.confirmationReadiness).toBe(55);
  });

  it("6: Horizon pathEfficiency = 80", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.pathEfficiency).toBe(80);
  });

  it("7: Horizon isProbability = false", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.isProbability).toBe(false);
  });

  it("8: Horizon calibrationStatus = uncalibrated_heuristic", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.calibrationStatus).toBe("uncalibrated_heuristic");
  });

  it("9: Beacon produces exactly one score", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("scores_available");
    expect(res.scoredPaths.length).toBe(1);
  });

  it("10: Beacon overallPriorityIndex = 52", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.overallPriorityIndex).toBe(52);
  });

  it("11: Beacon relationshipCredibility = 40", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(40);
  });

  it("12: Beacon temporalFreshness = 50", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.temporalFreshness).toBe(50);
  });

  it("13: Beacon confirmationReadiness = 55", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.confirmationReadiness).toBe(55);
  });

  it("14: Beacon pathEfficiency = 100", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.pathEfficiency).toBe(100);
  });

  it("15: Summit rejected path receives NO score", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-summit", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    expect(rej.disposition).toBe("all_paths_rejected");

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("no_retained_paths");
    expect(res.scoredPaths.length).toBe(0);
  });

  it("16: Aurora receives NO score", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-aurora", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    expect(rej.disposition).toBe("no_generated_paths");

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("no_retained_paths");
    expect(res.scoredPaths.length).toBe(0);
  });

  // Qualification Snapshot Propagation (17 - 21)
  it("17: PathTraversalStep.qualificationRecency equals source RelationshipQualification.recency", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const quals = qualifyRelationships(pathwayDemoDataset, REFERENCE_DATE);
    const step = gen.paths[0].steps[0];
    const qual = quals.find((q) => q.relationshipId === step.relationshipId)!;

    expect(step.qualificationRecency).toBe(qual.recency);
  });

  it("18: qualificationEvidenceSummary is preserved on PathTraversalStep", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const step = gen.paths[0].steps[0];

    expect(step.qualificationEvidenceSummary).toBeDefined();
    expect(step.qualificationEvidenceSummary.platformSignal).toBeGreaterThan(0);
  });

  it("19: latestRelevantInteractionAt is preserved on PathTraversalStep", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const step = gen.paths[0].steps[0];

    expect(step.latestRelevantInteractionAt).toBeDefined();
  });

  it("20: Path scoring does NOT call the system clock", () => {
    const dateSpy = vi.spyOn(Date, "now");
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);

    dateSpy.mockClear();
    scoreRetainedPaths(rej);

    expect(dateSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
  });

  it("21: Mutating a scoring output does not mutate original PathCandidate qualification snapshot", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const originalSummaryCopy = { ...gen.paths[0].steps[0].qualificationEvidenceSummary };

    const res = scoreRetainedPaths(rej);
    res.scoredPaths[0].path.steps[0].qualificationEvidenceSummary.confirmedTwoWayInteraction = 999;

    expect(gen.paths[0].steps[0].qualificationEvidenceSummary.confirmedTwoWayInteraction).toBe(
      originalSummaryCopy.confirmedTwoWayInteraction
    );
  });

  // Weakest-Link Principle Tests (22 - 24)
  it("22: Two-step path with credibility 100 + 40 produces path credibility 40", () => {
    const mockRejResult: PathRejectionResult = {
      executionStatus: "success",
      targetInvestorId: "target-weak-cred",
      upstreamGenerationDisposition: "confirmation_path_available",
      inputPathCount: 1,
      retainedPaths: [
        {
          id: "path-weak-cred",
          targetInvestorId: "target-weak-cred",
          sourceFounderPersonId: "p1",
          targetPersonId: "p3",
          nodes: [{ type: "person", id: "p1" }, { type: "person", id: "p2" }, { type: "person", id: "p3" }],
          relationshipIds: ["rel-strong", "rel-weak"],
          steps: [
            createMockStep("rel-strong", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
            createMockStep("rel-weak", "confirmation_required", [], "unknown", { platformSignal: 1 }),
          ],
          intermediaryCount: 1,
          status: "candidate",
          requiresConfirmationRelationshipIds: ["rel-weak"],
        },
      ],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 0,
      retainedCandidatePathCount: 1,
      rejectedPathCount: 0,
      disposition: "retained_paths_available",
      errors: [],
    };

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(40);
    expect(res.scoredPaths[0].score.bottleneckRelationshipId).toBe("rel-weak");
  });

  it("23: Three-step path with freshness 100 + 70 + 35 produces temporal freshness 35", () => {
    const mockRejResult: PathRejectionResult = {
      executionStatus: "success",
      targetInvestorId: "target-freshness",
      upstreamGenerationDisposition: "eligible_path_available",
      inputPathCount: 1,
      retainedPaths: [
        {
          id: "path-freshness",
          targetInvestorId: "target-freshness",
          sourceFounderPersonId: "p1",
          targetPersonId: "p4",
          nodes: [{ type: "person", id: "p1" }, { type: "person", id: "p2" }, { type: "person", id: "p3" }, { type: "person", id: "p4" }],
          relationshipIds: ["r1", "r2", "r3"],
          steps: [
            createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
            createMockStep("r2", "eligible", ["RECENT_DIRECT_INTERACTION"], "aging"),
            createMockStep("r3", "eligible", ["RECENT_DIRECT_INTERACTION"], "stale"),
          ],
          intermediaryCount: 2,
          status: "eligible",
          requiresConfirmationRelationshipIds: [],
        },
      ],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 1,
      retainedCandidatePathCount: 0,
      rejectedPathCount: 0,
      disposition: "retained_paths_available",
      errors: [],
    };

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.temporalFreshness).toBe(35);
  });

  it("24: Tied bottleneck relationships choose the first traversal relationship", () => {
    const mockRejResult: PathRejectionResult = {
      executionStatus: "success",
      targetInvestorId: "target-tie",
      upstreamGenerationDisposition: "confirmation_path_available",
      inputPathCount: 1,
      retainedPaths: [
        {
          id: "path-tie",
          targetInvestorId: "target-tie",
          sourceFounderPersonId: "p1",
          targetPersonId: "p3",
          nodes: [{ type: "person", id: "p1" }, { type: "person", id: "p2" }, { type: "person", id: "p3" }],
          relationshipIds: ["r1", "r2"],
          steps: [
            createMockStep("r1", "confirmation_required", [], "unknown", { platformSignal: 1 }),
            createMockStep("r2", "confirmation_required", [], "unknown", { platformSignal: 1 }),
          ],
          intermediaryCount: 1,
          status: "candidate",
          requiresConfirmationRelationshipIds: ["r1", "r2"],
        },
      ],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 0,
      retainedCandidatePathCount: 1,
      rejectedPathCount: 0,
      disposition: "retained_paths_available",
      errors: [],
    };

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(40);
    expect(res.scoredPaths[0].score.bottleneckRelationshipId).toBe("r1");
  });

  // Confirmation Readiness Tests (25 - 28)
  it("25: One confirmation hop -> 55", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.confirmationReadiness).toBe(55);
  });

  it("26: One confirmation hop -> 55", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.confirmationReadiness).toBe(55);
  });

  it("27: Two confirmation hops -> 10", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "confirmation_required", [], "recent"),
      createMockStep("r2", "confirmation_required", [], "recent"),
    ]);

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.confirmationReadiness).toBe(10);
  });

  it("28: Three confirmation hops floors at 0", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "confirmation_required", [], "recent"),
      createMockStep("r2", "confirmation_required", [], "recent"),
      createMockStep("r3", "confirmation_required", [], "recent"),
    ]);

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.confirmationReadiness).toBe(0);
  });

  // Path Efficiency Tests (29 - 32)
  it("29: One relationship hop -> 100", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.pathEfficiency).toBe(100);
  });

  it("30: Two hops -> 80", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.pathEfficiency).toBe(80);
  });

  it("31: Three hops -> 60", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
      createMockStep("r2", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
      createMockStep("r3", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
    ]);

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.pathEfficiency).toBe(60);
  });

  it("32: High hop count floors at 0", () => {
    const steps = Array.from({ length: 10 }, (_, i) =>
      createMockStep(`r${i}`, "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")
    );
    const mockRejResult = createMockPathRejectionResult(steps);

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.pathEfficiency).toBe(0);
  });

  // Credibility Tier Tests (33 - 40)
  it("33: Eligible recent direct -> 100", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
    ]);
    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(100);
  });

  it("34: Eligible recent founder-asserted -> 90", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "eligible", ["RECENT_INTERNAL_EVIDENCE"], "recent"),
    ]);
    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(90);
  });

  it("35: Confirmed historical confirmation-required -> 75", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "confirmation_required", [], "stale", { confirmedTwoWayInteraction: 1 }),
    ]);
    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(75);
  });

  it("36: Founder-asserted confirmation-required -> 65", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "confirmation_required", [], "aging", { founderAsserted: 1 }),
    ]);
    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(65);
  });

  it("37: Unconfirmed interaction -> 50", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "confirmation_required", [], "recent", { unconfirmedInteraction: 1 }),
    ]);
    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(50);
  });

  it("38: Platform signal / LinkedIn -> 40", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "confirmation_required", [], "unknown", { platformSignal: 1 }),
    ]);
    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(40);
  });

  it("39: Public-context-only -> 35", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "confirmation_required", [], "unknown", { publicContext: 1 }),
    ]);
    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(35);
  });

  it("40: Defensive confirmation fallback -> 45", () => {
    const mockRejResult = createMockPathRejectionResult([
      createMockStep("r1", "confirmation_required", [], "unknown", { other: 1 }),
    ]);
    const res = scoreRetainedPaths(mockRejResult);
    expect(res.scoredPaths[0].score.relationshipCredibility).toBe(45);
  });

  // Policy Validation Tests (41 - 49)
  it("41: Default weights sum to 100", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.executionStatus).toBe("success");
  });

  it("42: Weights summing to 99 return scoring error", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej, { weightRelationshipCredibility: 44 });

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.errors[0]).toContain("sum to exactly 100");
  });

  it("43: Negative weight returns scoring error", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej, { weightRelationshipCredibility: -5 });

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
  });

  it("44: Weight > 100 returns scoring error", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej, { weightRelationshipCredibility: 105 });

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
  });

  it("45: NaN score parameter returns scoring error", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej, { eligibleDirectInteractionScore: NaN });

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
  });

  it("46: Score parameter outside 0-100 returns error", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej, { recentScore: 150 });

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
  });

  it("47: Fractional integer-required score parameter returns error", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej, { recentScore: 99.5 });

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
  });

  it("48: Invalid confirmationPenaltyPerHop returns error", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej, { confirmationPenaltyPerHop: -10 });

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
  });

  it("49: Invalid additionalHopPenalty returns error", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej, { additionalHopPenalty: 120 });

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
  });

  // Upstream State Tests (50 - 55)
  it("50: Rejection upstream_error -> scoring upstream_error", () => {
    const mockRejResult: PathRejectionResult = {
      executionStatus: "upstream_error",
      targetInvestorId: "target-err",
      upstreamGenerationDisposition: null,
      inputPathCount: 0,
      retainedPaths: [],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 0,
      retainedCandidatePathCount: 0,
      rejectedPathCount: 0,
      disposition: "upstream_error",
      errors: ["Upstream generation failed"],
    };

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.executionStatus).toBe("upstream_error");
    expect(res.disposition).toBe("upstream_error");
    expect(res.errors).toEqual(["Upstream generation failed"]);
  });

  it("51: Rejection error -> scoring upstream_error", () => {
    const mockRejResult: PathRejectionResult = {
      executionStatus: "error",
      targetInvestorId: "target-err",
      upstreamGenerationDisposition: null,
      inputPathCount: 0,
      retainedPaths: [],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 0,
      retainedCandidatePathCount: 0,
      rejectedPathCount: 0,
      disposition: "error",
      errors: ["Rejection error"],
    };

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.executionStatus).toBe("upstream_error");
    expect(res.disposition).toBe("upstream_error");
  });

  it("52: upstream_paths_filtered -> scoring upstream_paths_filtered", () => {
    const mockRejResult: PathRejectionResult = {
      executionStatus: "success",
      targetInvestorId: "target-beacon",
      upstreamGenerationDisposition: "confirmation_paths_filtered",
      inputPathCount: 0,
      retainedPaths: [],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 0,
      retainedCandidatePathCount: 0,
      rejectedPathCount: 0,
      disposition: "upstream_paths_filtered",
      errors: [],
    };

    const res = scoreRetainedPaths(mockRejResult);
    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("upstream_paths_filtered");
  });

  it("53: all_paths_rejected -> no_retained_paths", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-summit", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    expect(rej.disposition).toBe("all_paths_rejected");

    const res = scoreRetainedPaths(rej);
    expect(res.disposition).toBe("no_retained_paths");
  });

  it("54: no_generated_paths -> no_retained_paths", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-aurora", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    expect(rej.disposition).toBe("no_generated_paths");

    const res = scoreRetainedPaths(rej);
    expect(res.disposition).toBe("no_retained_paths");
  });

  it("55: Scoring output preserves upstream rejection disposition", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.upstreamRejectionDisposition).toBe(rej.disposition);
  });

  // Determinism and Immutability Tests (56 - 65)
  it("56: Repeated scoring produces byte-equivalent scoring values", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);

    const res1 = scoreRetainedPaths(rej);
    const res2 = scoreRetainedPaths(rej);

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
  });

  it("57: No Date.now calls during scoring", () => {
    const dateSpy = vi.spyOn(Date, "now");
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);

    dateSpy.mockClear();
    scoreRetainedPaths(rej);

    expect(dateSpy).not.toHaveBeenCalled();
    dateSpy.mockRestore();
  });

  it("58: No Math.random calls during scoring", () => {
    const mathSpy = vi.spyOn(Math, "random");
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);

    mathSpy.mockClear();
    scoreRetainedPaths(rej);

    expect(mathSpy).not.toHaveBeenCalled();
    mathSpy.mockRestore();
  });

  it("59: Original PathRejectionResult is unchanged", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const snapshotJson = JSON.stringify(rej);

    scoreRetainedPaths(rej);

    expect(JSON.stringify(rej)).toBe(snapshotJson);
  });

  it("60: Original retained PathCandidate is unchanged", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const originalCandidateJson = JSON.stringify(rej.retainedPaths[0]);

    scoreRetainedPaths(rej);

    expect(JSON.stringify(rej.retainedPaths[0])).toBe(originalCandidateJson);
  });

  it("61: scoredPaths preserve retainedPaths order exactly", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths.map((sp) => sp.path.id)).toEqual(
      rej.retainedPaths.map((p) => p.id)
    );
  });

  it("62: Score output has no rank field", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect((res.scoredPaths[0].score as unknown as Record<string, unknown>).rank).toBeUndefined();
  });

  it("63: Score output has no recommendedPathId", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect((res as unknown as Record<string, unknown>).recommendedPathId).toBeUndefined();
  });

  it("64: Score output has no probability field", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect((res.scoredPaths[0].score as unknown as Record<string, unknown>).probability).toBeUndefined();
  });

  it("65: isProbability is always false", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.isProbability).toBe(false);
  });

  // Multi-Path Scenario Test (66)
  it("66: Multi-path scenario produces scores without reordering (SCORING != RANKING)", () => {
    const pathA: PathCandidate = {
      id: "path-A-lower-score",
      targetInvestorId: "target-multi",
      sourceFounderPersonId: "p1",
      targetPersonId: "p-target",
      nodes: [{ type: "person", id: "p1" }, { type: "person", id: "p-target" }],
      relationshipIds: ["r-linkedin"],
      steps: [createMockStep("r-linkedin", "confirmation_required", [], "unknown", { platformSignal: 1 })],
      intermediaryCount: 0,
      status: "candidate",
      requiresConfirmationRelationshipIds: ["r-linkedin"],
    };

    const pathB: PathCandidate = {
      id: "path-B-higher-score",
      targetInvestorId: "target-multi",
      sourceFounderPersonId: "p1",
      targetPersonId: "p-target",
      nodes: [{ type: "person", id: "p1" }, { type: "person", id: "p2" }, { type: "person", id: "p-target" }],
      relationshipIds: ["r1", "r2"],
      steps: [
        createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
        createMockStep("r2", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
      ],
      intermediaryCount: 1,
      status: "eligible",
      requiresConfirmationRelationshipIds: [],
    };

    const mockRejResult: PathRejectionResult = {
      executionStatus: "success",
      targetInvestorId: "target-multi",
      upstreamGenerationDisposition: "eligible_path_available",
      inputPathCount: 2,
      retainedPaths: [pathA, pathB], // Path A first, then Path B
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 1,
      retainedCandidatePathCount: 1,
      rejectedPathCount: 0,
      disposition: "retained_paths_available",
      errors: [],
    };

    const res = scoreRetainedPaths(mockRejResult);

    expect(res.scoredPaths.length).toBe(2);
    // Path A score is 52, Path B score is 98
    expect(res.scoredPaths[0].score.overallPriorityIndex).toBe(52);
    expect(res.scoredPaths[1].score.overallPriorityIndex).toBe(98);

    // CRITICAL: Order MUST be preserved: Path A then Path B, even though 52 < 98
    expect(res.scoredPaths[0].path.id).toBe("path-A-lower-score");
    expect(res.scoredPaths[1].path.id).toBe("path-B-higher-score");
  });

  // Explanation Accuracy Tests (67 - 71)
  it("67: 2-hop eligible route with founder-asserted evidence does not claim confirmed direct interaction", () => {
    const steps = [
      createMockStep("r1", "eligible", ["RECENT_INTERNAL_EVIDENCE"], "recent"),
      createMockStep("r2", "eligible", ["RECENT_INTERNAL_EVIDENCE"], "recent"),
    ];
    const rej = createMockPathRejectionResult(steps);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.explanation).not.toContain("confirmed direct interaction");
    expect(res.scoredPaths[0].score.explanation).toContain("Recent founder-asserted internal evidence");
  });

  it("68: 3-hop fully eligible recent-direct route does not hardcode 'Both hops'", () => {
    const steps = [
      createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
      createMockStep("r2", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
      createMockStep("r3", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent"),
    ];
    const rej = createMockPathRejectionResult(steps);
    const res = scoreRetainedPaths(rej);

    expect(res.scoredPaths[0].score.explanation).not.toContain("Both hops");
    expect(res.scoredPaths[0].score.explanation).toContain("Route contains 3 relationship hops");
  });

  it("69: Beacon explanation contains platform-only, requiring confirmation, and uncalibrated warning", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    const exp = res.scoredPaths[0].score.explanation;
    expect(exp).toContain("Platform-only");
    expect(exp).toContain("1 requiring confirmation");
    expect(exp).toContain("This is an uncalibrated heuristic, not a success probability.");
  });

  it("70: Horizon explanation contains confirmation requirement description and uncalibrated warning", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    const exp = res.scoredPaths[0].score.explanation;
    expect(exp).toContain("requiring confirmation");
    expect(exp).toContain("This is an uncalibrated heuristic, not a success probability.");
  });

  it("71: Every scored path explanation contains explicit uncalibrated warning", () => {
    const genH = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const resH = scoreRetainedPaths(applyPathRejection(genH));

    const genB = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const resB = scoreRetainedPaths(applyPathRejection(genB));

    for (const sp of [...resH.scoredPaths, ...resB.scoredPaths]) {
      expect(sp.score.explanation).toContain("This is an uncalibrated heuristic, not a success probability.");
    }
  });

  // Deep Immutability Tests (72 - 76)
  it("72: Mutating scored path nodes does not alter original retained path", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    const originalNodeId = rej.retainedPaths[0].nodes[0].id;
    res.scoredPaths[0].path.nodes[0].id = "MUTATED_NODE_ID";

    expect(rej.retainedPaths[0].nodes[0].id).toBe(originalNodeId);
  });

  it("73: Mutating scored path relationshipIds does not alter original retained path", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    const originalRelCount = rej.retainedPaths[0].relationshipIds.length;
    res.scoredPaths[0].path.relationshipIds.push("MUTATED_REL_ID");

    expect(rej.retainedPaths[0].relationshipIds.length).toBe(originalRelCount);
  });

  it("74: Mutating scored path requiresConfirmationRelationshipIds does not alter original retained path", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    const originalCount = rej.retainedPaths[0].requiresConfirmationRelationshipIds.length;
    res.scoredPaths[0].path.requiresConfirmationRelationshipIds.push("MUTATED_REQ_ID");

    expect(rej.retainedPaths[0].requiresConfirmationRelationshipIds.length).toBe(originalCount);
  });

  it("75: Mutating scored path qualificationReasonCodes does not alter original retained path", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    const originalCodesCount = rej.retainedPaths[0].steps[0].qualificationReasonCodes.length;
    res.scoredPaths[0].path.steps[0].qualificationReasonCodes.push("MUTATED_CODE" as any);

    expect(rej.retainedPaths[0].steps[0].qualificationReasonCodes.length).toBe(originalCodesCount);
  });

  it("76: Mutating scored path qualificationEvidenceSummary does not alter original retained path", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const res = scoreRetainedPaths(rej);

    const originalTotal = rej.retainedPaths[0].steps[0].qualificationEvidenceSummary.total;
    res.scoredPaths[0].path.steps[0].qualificationEvidenceSummary.total = 999;

    expect(rej.retainedPaths[0].steps[0].qualificationEvidenceSummary.total).toBe(originalTotal);
  });

  // Malformed Retained Path Validation Tests (77 - 88)
  it("77: Malformed retained path with status = 'rejected' fails scoring with error disposition", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0] as any).status = "rejected";

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("rejected paths cannot be scored");
  });

  it("78: Malformed retained path with zero steps fails scoring with error disposition", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0] as any).steps = [];

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("path contains zero traversal steps");
  });

  it("79: Malformed retained path with relationshipIds length mismatch fails scoring", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0] as any).relationshipIds = ["r1", "r2_extra"];

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("relationshipIds length does not match steps length");
  });

  it("80: Malformed retained path with nodes length mismatch fails scoring", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0] as any).nodes = [{ type: "person", id: "p1" }];

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("nodes length does not match steps length + 1");
  });

  it("81: Invalid qualification status at runtime fails scoring", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0].steps[0] as any).qualificationStatus = "invalid_status";

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("invalid qualificationStatus");
  });

  it("82: Invalid qualificationRecency at runtime fails scoring", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0].steps[0] as any).qualificationRecency = "invalid_recency";

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("invalid qualificationRecency");
  });

  it("83: Missing qualificationEvidenceSummary at runtime fails scoring", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0].steps[0] as any).qualificationEvidenceSummary = null;

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("missing qualificationEvidenceSummary");
  });

  it("84: NaN evidence summary count fails scoring", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0].steps[0].qualificationEvidenceSummary as any).total = NaN;

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("invalid qualificationEvidenceSummary field");
  });

  it("85: Negative evidence summary count fails scoring", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0].steps[0].qualificationEvidenceSummary as any).total = -1;

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("invalid qualificationEvidenceSummary field");
  });

  it("86: Fractional evidence summary count fails scoring", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0].steps[0].qualificationEvidenceSummary as any).total = 2.5;

    const res = scoreRetainedPaths(rej);
    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.scoredPaths).toEqual([]);
    expect(res.errors[0]).toContain("invalid qualificationEvidenceSummary field");
  });

  it("87: Malformed path never returns a scored path", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0] as any).steps = [];

    const res = scoreRetainedPaths(rej);
    expect(res.scoredPaths).toBeDefined();
    expect(res.scoredPaths.length).toBe(0);
  });

  it("88: Malformed path never returns no_retained_paths disposition", () => {
    const rej = createMockPathRejectionResult([createMockStep("r1", "eligible", ["RECENT_DIRECT_INTERACTION"], "recent")]);
    (rej.retainedPaths[0] as any).steps = [];

    const res = scoreRetainedPaths(rej);
    expect(res.disposition).toBe("error");
    expect(res.disposition).not.toBe("no_retained_paths");
  });

  // Finite Metric Score Test (89)
  it("89: All score metrics are finite integers between 0 and 100", () => {
    const genH = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const resH = scoreRetainedPaths(applyPathRejection(genH));

    const genB = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const resB = scoreRetainedPaths(applyPathRejection(genB));

    for (const sp of [...resH.scoredPaths, ...resB.scoredPaths]) {
      const metrics = [
        sp.score.overallPriorityIndex,
        sp.score.relationshipCredibility,
        sp.score.temporalFreshness,
        sp.score.confirmationReadiness,
        sp.score.pathEfficiency,
      ];
      for (const m of metrics) {
        expect(Number.isFinite(m)).toBe(true);
        expect(Number.isInteger(m)).toBe(true);
        expect(m).toBeGreaterThanOrEqual(0);
        expect(m).toBeLessThanOrEqual(100);
      }
    }
  });
});

// Helper functions for mock test objects
function createMockStep(
  relationshipId: string,
  qualificationStatus: "eligible" | "confirmation_required",
  qualificationReasonCodes: string[],
  qualificationRecency: "recent" | "aging" | "stale" | "unknown",
  evidenceSummaryCounts?: Partial<{
    confirmedTwoWayInteraction: number;
    founderAsserted: number;
    unconfirmedInteraction: number;
    platformSignal: number;
    publicContext: number;
    other: number;
  }>
): PathTraversalStep {
  return {
    relationshipId,
    fromPersonId: "p1",
    toPersonId: "p2",
    traversedReverse: false,
    qualificationStatus,
    qualificationReasonCodes: qualificationReasonCodes as any,
    qualificationRecency,
    qualificationEvidenceSummary: {
      total: 1,
      directInteraction: 0,
      founderAsserted: evidenceSummaryCounts?.founderAsserted || 0,
      publicContext: evidenceSummaryCounts?.publicContext || 0,
      platformSignal: evidenceSummaryCounts?.platformSignal || 0,
      confirmedTwoWayInteraction: evidenceSummaryCounts?.confirmedTwoWayInteraction || 0,
      oneWayInteraction: 0,
      unconfirmedInteraction: evidenceSummaryCounts?.unconfirmedInteraction || 0,
    },
    latestRelevantInteractionAt: "2026-09-01",
  };
}

function createMockPathRejectionResult(steps: PathTraversalStep[]): PathRejectionResult {
  const isEligible = steps.every((s) => s.qualificationStatus === "eligible");
  const confirmationReqRels = steps
    .filter((s) => s.qualificationStatus === "confirmation_required")
    .map((s) => s.relationshipId);

  const path: PathCandidate = {
    id: "mock-path-synth",
    targetInvestorId: "target-synth",
    sourceFounderPersonId: "p0",
    targetPersonId: `p${steps.length}`,
    nodes: Array.from({ length: steps.length + 1 }, (_, i) => ({
      type: "person",
      id: `p${i}`,
    })),
    relationshipIds: steps.map((s) => s.relationshipId),
    steps,
    intermediaryCount: Math.max(0, steps.length - 1),
    status: isEligible ? "eligible" : "candidate",
    requiresConfirmationRelationshipIds: confirmationReqRels,
  };

  return {
    executionStatus: "success",
    targetInvestorId: "target-synth",
    upstreamGenerationDisposition: "eligible_path_available",
    inputPathCount: 1,
    retainedPaths: [path],
    rejectedPaths: [],
    evaluations: [],
    retainedEligiblePathCount: isEligible ? 1 : 0,
    retainedCandidatePathCount: isEligible ? 0 : 1,
    rejectedPathCount: 0,
    disposition: "retained_paths_available",
    errors: [],
  };
}
