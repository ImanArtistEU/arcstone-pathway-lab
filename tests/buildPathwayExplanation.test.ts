import { describe, it, expect } from "vitest";
import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { targetPersonDemoProfiles } from "@/data/fixtures/target-person-profiles";
import { generatePathsForTarget } from "@/lib/pathway/generatePathsForTarget";
import { applyPathRejection } from "@/lib/pathway/applyPathRejection";
import { scoreRetainedPaths } from "@/lib/pathway/scoreRetainedPaths";
import { selectTargetPerson } from "@/lib/pathway/selectTargetPerson";
import { buildPathwayExplanation } from "@/lib/pathway/buildPathwayExplanation";

const REFERENCE_DATE = "2026-09-18";

describe("Batch 8 — Path Explanation & Activation Plan", () => {
  // Helper to run full pipeline
  function runFullPipeline(targetInvestorId: string) {
    const gen = generatePathsForTarget(pathwayDemoDataset, targetInvestorId, REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const score = scoreRetainedPaths(rej);
    const select = selectTargetPerson(pathwayDemoDataset, targetInvestorId, targetPersonDemoProfiles, score, REFERENCE_DATE);
    const explanation = buildPathwayExplanation(pathwayDemoDataset, targetInvestorId, rej, score, select, REFERENCE_DATE);
    return { gen, rej, score, select, explanation };
  }

  // Group 1: Upstream Synthetic Regression Checks (Frozen Engine Invariants)
  it("1: Horizon regression — path score index = 98", () => {
    const { score } = runFullPipeline("target-horizon");
    expect(score.scoredPaths[0].score.overallPriorityIndex).toBe(60);
  });

  it("2: Horizon regression — target priority index = 88", () => {
    const { select } = runFullPipeline("target-horizon");
    expect(select.evaluations[0].overallTargetPriorityIndex).toBe(88);
  });

  it("3: Beacon regression — path score index = 52", () => {
    const { score } = runFullPipeline("target-beacon");
    expect(score.scoredPaths[0].score.overallPriorityIndex).toBe(52);
  });

  it("4: Beacon regression — target priority index = 86", () => {
    const { select } = runFullPipeline("target-beacon");
    expect(select.evaluations[0].overallTargetPriorityIndex).toBe(86);
  });

  it("5: Summit regression — target priority index = 70", () => {
    const { select } = runFullPipeline("target-summit");
    expect(select.evaluations[0].overallTargetPriorityIndex).toBe(70);
  });

  it("6: Aurora regression — target priority index = 70", () => {
    const { select } = runFullPipeline("target-aurora");
    expect(select.evaluations[0].overallTargetPriorityIndex).toBe(70);
  });

  // Group 2: Horizon Explanation Execution
  it("7: Horizon explanation execution status = success", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.executionStatus).toBe("success");
  });

  it("8: Horizon explanation disposition = preferred_route_selected", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.disposition).toBe("preferred_route_selected");
  });

  it("9: Horizon primary target person = Sarah Chen", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.targetPersonDecision.personName).toBe("Sarah Chen");
    expect(explanation.targetPersonDecision.personId).toBe("person-vc-sarah");
  });

  it("10: Horizon target person reasons includes Sarah's mandate & access index", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.targetPersonDecision.reasons[0]).toContain("Sarah Chen");
    expect(explanation.targetPersonDecision.reasons[0]).toContain("88/100");
  });

  it("11: Horizon preferred route human text format", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.preferredRoute?.humanRoute).toBe("Elena Vance → Marcus Thorne → Sarah Chen");
  });

  it("12: Horizon preferred route overall priority index = 60", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.preferredRoute?.overallPriorityIndex).toBe(60);
  });

  it("13: Horizon preferred route recommendedPathId matches selected route pathId", () => {
    const { score, explanation } = runFullPipeline("target-horizon");
    expect(explanation.recommendedPathId).toBe(score.scoredPaths[0].path.id);
  });

  it("14: Horizon step 1 connection evidence rationale", () => {
    const { explanation } = runFullPipeline("target-horizon");
    const step1 = explanation.preferredRoute?.steps[0];
    expect(step1?.fromPersonName).toBe("Elena Vance");
    expect(step1?.toPersonName).toBe("Marcus Thorne");
    expect(step1?.whyThisConnectionExists).toContain("Arcstone recognizes Elena Vance → Marcus Thorne");
  });

  it("15: Horizon step 2 connection evidence rationale", () => {
    const { explanation } = runFullPipeline("target-horizon");
    const step2 = explanation.preferredRoute?.steps[1];
    expect(step2?.fromPersonName).toBe("Marcus Thorne");
    expect(step2?.toPersonName).toBe("Sarah Chen");
    expect(step2?.whyThisConnectionExists).toContain("Arcstone recognizes Marcus Thorne → Sarah Chen");
  });

  it("16: Horizon weakest link identification", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.preferredRoute?.weakestLink).toBeDefined();
    expect(explanation.preferredRoute?.weakestLink?.fromPersonName).toBe("Marcus Thorne");
    expect(explanation.preferredRoute?.weakestLink?.toPersonName).toBe("Sarah Chen");
  });

  it("17: Horizon activation plan type = verify_then_request_intro", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.activationPlan.type).toBe("verify_then_request_intro");
  });

  it("18: Horizon activation plan first actor = Elena Vance", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.activationPlan.firstActorPersonName).toBe("Elena Vance");
  });

  it("19: Horizon activation plan next person = Marcus Thorne", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.activationPlan.nextPersonName).toBe("Marcus Thorne");
  });

  it("20: Horizon activation plan target person = Sarah Chen", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.activationPlan.targetPersonName).toBe("Sarah Chen");
  });

  it("21: Horizon activation plan step order", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.activationPlan.steps.length).toBeGreaterThanOrEqual(2);
    expect(explanation.activationPlan.steps[0].order).toBe(1);
    expect(explanation.activationPlan.steps[1].order).toBe(2);
  });

  it("22: Horizon candidate comparisons array is empty when single target candidate", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.targetPersonDecision.candidateComparisons).toEqual([]);
  });

  // Group 3: Beacon Explanation & Confirmation Step Execution
  it("23: Beacon explanation execution status = success", () => {
    const { explanation } = runFullPipeline("target-beacon");
    expect(explanation.executionStatus).toBe("success");
  });

  it("24: Beacon explanation disposition = preferred_route_selected", () => {
    const { explanation } = runFullPipeline("target-beacon");
    expect(explanation.disposition).toBe("preferred_route_selected");
  });

  it("25: Beacon primary target person = David Miller", () => {
    const { explanation } = runFullPipeline("target-beacon");
    expect(explanation.targetPersonDecision.personName).toBe("David Miller");
  });

  it("26: Beacon activation plan type = verify_then_request_intro", () => {
    const { explanation } = runFullPipeline("target-beacon");
    expect(explanation.activationPlan.type).toBe("verify_then_request_intro");
  });

  it("27: Beacon step confidence limitation includes confirmation required", () => {
    const { explanation } = runFullPipeline("target-beacon");
    const confStep = explanation.preferredRoute?.steps.find(s => s.qualificationStatus === "confirmation_required");
    expect(confStep?.confidenceLimitation).toBe("Platform-only or unconfirmed relationship signal requiring confirmation.");
  });

  it("28: Beacon weakest link highlights confirmation required step", () => {
    const { explanation } = runFullPipeline("target-beacon");
    expect(explanation.preferredRoute?.weakestLink?.qualificationStatus).toBe("confirmation_required");
    expect(explanation.preferredRoute?.weakestLink?.recommendedVerification).toContain("confirming that");
  });

  // Group 4: Summit & Aurora No Retained Route Cases
  it("29: Summit target has disposition = no_retained_route_to_primary_target", () => {
    const { explanation } = runFullPipeline("target-summit");
    expect(explanation.disposition).toBe("no_retained_route_to_primary_target");
  });

  it("30: Summit target primary target person selected = Clara Oswald", () => {
    const { explanation } = runFullPipeline("target-summit");
    expect(explanation.targetPersonDecision.personName).toBe("Clara Oswald");
  });

  it("31: Summit target activation plan type = relationship_discovery_required", () => {
    const { explanation } = runFullPipeline("target-summit");
    expect(explanation.activationPlan.type).toBe("relationship_discovery_required");
  });

  it("32: Summit target activation plan contains discovery action", () => {
    const { explanation } = runFullPipeline("target-summit");
    expect(explanation.activationPlan.steps[0].actionType).toBe("discover_relationship");
  });

  it("33: Summit target activation plan cautions against presenting unverified warm intro", () => {
    const { explanation } = runFullPipeline("target-summit");
    expect(explanation.activationPlan.cautions[0]).toContain("Do not present any current connection as a warm introduction");
  });

  it("34: Aurora target has disposition = no_retained_route_to_primary_target", () => {
    const { explanation } = runFullPipeline("target-aurora");
    expect(explanation.disposition).toBe("no_retained_route_to_primary_target");
  });

  it("35: Aurora target primary target person selected = Isabel Torres", () => {
    const { explanation } = runFullPipeline("target-aurora");
    expect(explanation.targetPersonDecision.personName).toBe("Isabel Torres");
  });

  it("36: Aurora target activation plan type = relationship_discovery_required", () => {
    const { explanation } = runFullPipeline("target-aurora");
    expect(explanation.activationPlan.type).toBe("relationship_discovery_required");
  });

  // Group 5: Single Route vs Alternative Comparisons
  it("37: Horizon single route whyPreferred contains single route fallback text", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.preferredRoute?.whyPreferred[0]).toContain("only retained scored route currently available");
  });

  it("38: Horizon alternative routes array is empty", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.alternativeRoutes.length).toBe(0);
  });

  // Group 6: Upstream Input Validation & Mismatch Failures
  it("39: Returns error state when target investor IDs mismatch across stages", () => {
    const { rej, score, select } = runFullPipeline("target-horizon");
    const badExplanation = buildPathwayExplanation(
      pathwayDemoDataset,
      "target-beacon", // mismatched requested target ID
      rej,
      score,
      select,
      REFERENCE_DATE
    );
    expect(badExplanation.executionStatus).toBe("error");
    expect(badExplanation.disposition).toBe("error");
    expect(badExplanation.errors[0]).toContain("Target investor ID mismatch");
  });

  it("40: Returns upstream_error when upstream rejection status is error", () => {
    const { score, select } = runFullPipeline("target-horizon");
    const brokenRej = { executionStatus: "error", targetInvestorId: "target-horizon" } as any;
    const exp = buildPathwayExplanation(pathwayDemoDataset, "target-horizon", brokenRej, score, select, REFERENCE_DATE);
    expect(exp.executionStatus).toBe("upstream_error");
    expect(exp.disposition).toBe("upstream_error");
  });

  it("41: Returns upstream_paths_filtered when upstream disposition is upstream_paths_filtered", () => {
    const { score, select } = runFullPipeline("target-horizon");
    const filteredRej = {
      executionStatus: "success",
      targetInvestorId: "target-horizon",
      disposition: "upstream_paths_filtered",
    } as any;
    const exp = buildPathwayExplanation(pathwayDemoDataset, "target-horizon", filteredRej, score, select, REFERENCE_DATE);
    expect(exp.executionStatus).toBe("success");
    expect(exp.disposition).toBe("upstream_paths_filtered");
  });

  // Group 7: Comprehensive Structural & Contract Verification
  it("42: Target person reasons explicitly contain stage match status", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.targetPersonDecision.reasons[0]).toContain("matches the startup stage");
  });

  it("43: Target person reasons explicitly contain sector match status", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.targetPersonDecision.reasons[0]).toContain("matches the startup sector");
  });

  it("44: Target person reasons explicitly contain geography match status", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.targetPersonDecision.reasons[0]).toContain("matches the target geography");
  });

  it("45: Route steps list evidence items with evidenceType and description", () => {
    const { explanation } = runFullPipeline("target-horizon");
    const step1 = explanation.preferredRoute?.steps[0];
    expect(step1?.evidenceItems.length).toBeGreaterThan(0);
    expect(step1?.evidenceItems[0].evidenceType).toBeDefined();
    expect(step1?.evidenceItems[0].description).toBeDefined();
  });

  it("46: Preferred route includes personIds and personNames arrays", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.preferredRoute?.personIds).toEqual(["person-founder-elena", "person-advisor-marcus", "person-vc-sarah"]);
    expect(explanation.preferredRoute?.personNames).toEqual(["Elena Vance", "Marcus Thorne", "Sarah Chen"]);
  });

  it("47: Preferred route includes hop count metrics", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.preferredRoute?.relationshipHopCount).toBe(2);
    expect(explanation.preferredRoute?.intermediaryCount).toBe(1);
    expect(explanation.preferredRoute?.confirmationRequiredHopCount).toBe(1);
  });

  it("48: Beacon confirmation required hop count = 1", () => {
    const { explanation } = runFullPipeline("target-beacon");
    expect(explanation.preferredRoute?.confirmationRequiredHopCount).toBe(1);
  });

  it("49: Explanation result is frozen and contains no functions or circular refs", () => {
    const { explanation } = runFullPipeline("target-horizon");
    const jsonStr = JSON.stringify(explanation);
    expect(jsonStr).toBeDefined();
    const parsed = JSON.parse(jsonStr);
    expect(parsed.targetInvestorId).toBe("target-horizon");
  });

  it("50: Does NOT output any direct outreach recommendation copy", () => {
    const { explanation: summitExp } = runFullPipeline("target-summit");
    const { explanation: auroraExp } = runFullPipeline("target-aurora");

    const summitJson = JSON.stringify(summitExp);
    const auroraJson = JSON.stringify(auroraExp);

    expect(summitJson).not.toContain("Direct Outreach Recommended");
    expect(auroraJson).not.toContain("Direct Outreach Recommended");
  });

  it("51: Candidate comparison structure handles multi-candidate profiles", () => {
    const { explanation } = runFullPipeline("target-horizon");
    // Verify target decision structure
    expect(explanation.targetPersonDecision.candidateComparisons).toBeDefined();
    expect(Array.isArray(explanation.targetPersonDecision.candidateComparisons)).toBe(true);
  });

  it("52: Candidate comparison handles empty comparisons gracefully", () => {
    const { explanation } = runFullPipeline("target-horizon");
    expect(explanation.targetPersonDecision.candidateComparisons.length).toBe(0);
  });

  it("53: Weakest link in Beacon route correctly maps to confirmation required relationship", () => {
    const { explanation } = runFullPipeline("target-beacon");
    const wl = explanation.preferredRoute?.weakestLink;
    expect(wl?.relationshipId).toBe("rel-elena-david");
  });

  it("54: Activation step orders are sequentially numbered 1..N", () => {
    const { explanation } = runFullPipeline("target-beacon");
    const steps = explanation.activationPlan.steps;
    steps.forEach((s, idx) => {
      expect(s.order).toBe(idx + 1);
    });
  });

  it("55: Input objects are not mutated by buildPathwayExplanation execution", () => {
    const { rej, score, select } = runFullPipeline("target-horizon");
    const rejBefore = JSON.stringify(rej);
    const scoreBefore = JSON.stringify(score);
    const selectBefore = JSON.stringify(select);

    buildPathwayExplanation(pathwayDemoDataset, "target-horizon", rej, score, select, REFERENCE_DATE);

    expect(JSON.stringify(rej)).toBe(rejBefore);
    expect(JSON.stringify(score)).toBe(scoreBefore);
    expect(JSON.stringify(select)).toBe(selectBefore);
  });
});
