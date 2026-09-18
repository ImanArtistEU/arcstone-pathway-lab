import { describe, it, expect } from "vitest";
import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import {
  oneWayOutboundRelationship,
  oneWayOutboundEvidence,
} from "@/data/fixtures/qualification-edge-cases";
import { generatePathsForTarget } from "@/lib/pathway/generatePathsForTarget";
import { applyPathRejection } from "@/lib/pathway/applyPathRejection";
import { PathwayDataset, PathGenerationResult, PathCandidate, Relationship, RelationshipEvidence } from "@/types/pathway";

const REFERENCE_DATE = "2026-09-18";

describe("Deterministic Path Rejection & Viability Filter (Batch 4)", () => {
  // Demo Fixture Tests (1 - 10)
  it("1: Horizon retained", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.executionStatus).toBe("success");
    expect(rejRes.disposition).toBe("retained_paths_available");
    expect(rejRes.retainedPaths.length).toBe(1);
    expect(rejRes.rejectedPaths.length).toBe(0);
    expect(rejRes.evaluations[0].decision).toBe("retain");
  });

  it("2: Horizon retained path remains status eligible", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.retainedPaths[0].status).toBe("eligible");
    expect(rejRes.evaluations[0].originalPathStatus).toBe("eligible");
  });

  it("3: Beacon retained", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.executionStatus).toBe("success");
    expect(rejRes.disposition).toBe("retained_paths_available");
    expect(rejRes.retainedPaths.length).toBe(1);
    expect(rejRes.rejectedPaths.length).toBe(0);
    expect(rejRes.evaluations[0].decision).toBe("retain");
  });

  it("4: Beacon remains candidate", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.retainedPaths[0].status).toBe("candidate");
    expect(rejRes.evaluations[0].originalPathStatus).toBe("candidate");
  });

  it("5: Summit rejected", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.executionStatus).toBe("success");
    expect(rejRes.disposition).toBe("all_paths_rejected");
    expect(rejRes.retainedPaths.length).toBe(0);
    expect(rejRes.rejectedPaths.length).toBe(1);
    expect(rejRes.evaluations[0].decision).toBe("reject");
  });

  it("6: Summit rejection reason includes EXCESS_CONFIRMATION_HOPS", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.evaluations[0].reasonCodes).toContain(
      "EXCESS_CONFIRMATION_HOPS"
    );
  });

  it("7: Summit rejected clone has status rejected", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.rejectedPaths[0].status).toBe("rejected");
  });

  it("8: Summit evaluation preserves originalPathStatus candidate", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.evaluations[0].originalPathStatus).toBe("candidate");
  });

  it("9: Aurora becomes no_generated_paths", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.executionStatus).toBe("success");
    expect(rejRes.disposition).toBe("no_generated_paths");
  });

  it("10: Aurora has zero retained and zero rejected paths", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.retainedPaths).toEqual([]);
    expect(rejRes.rejectedPaths).toEqual([]);
    expect(rejRes.inputPathCount).toBe(0);
  });

  // Upstream State Tests (11 - 12)
  it("11: Upstream Path Generation error becomes upstream_error", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-nonexistent",
      REFERENCE_DATE
    );
    expect(genRes.executionStatus).toBe("error");

    const rejRes = applyPathRejection(genRes);
    expect(rejRes.executionStatus).toBe("upstream_error");
    expect(rejRes.disposition).toBe("upstream_error");
    expect(rejRes.errors.length).toBeGreaterThan(0);
  });

  it("12: Upstream confirmation_paths_filtered with zero returned paths becomes upstream_paths_filtered", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE,
      { includeConfirmationRequired: false }
    );
    expect(genRes.disposition).toBe("confirmation_paths_filtered");

    const rejRes = applyPathRejection(genRes);
    expect(rejRes.executionStatus).toBe("success");
    expect(rejRes.disposition).toBe("upstream_paths_filtered");
    expect(rejRes.retainedPaths.length).toBe(0);
    expect(rejRes.rejectedPaths.length).toBe(0);
  });

  // End-to-End Hard Rejection Regression Tests (13 - 17)
  it("13: One-way outreach candidate is rejected", () => {
    const clonedDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    clonedDataset.relationships.push(oneWayOutboundRelationship);
    clonedDataset.relationshipEvidence.push(oneWayOutboundEvidence);

    const genRes = generatePathsForTarget(
      clonedDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    expect(genRes.paths.length).toBe(1);

    const rejRes = applyPathRejection(genRes);
    expect(rejRes.disposition).toBe("all_paths_rejected");
    expect(rejRes.rejectedPaths.length).toBe(1);
    expect(rejRes.evaluations[0].reasonCodes).toContain(
      "ONE_WAY_OUTREACH_EDGE"
    );
  });

  it("14: One-way rejection blockingRelationshipIds contains correct relationship", () => {
    const clonedDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    clonedDataset.relationships.push(oneWayOutboundRelationship);
    clonedDataset.relationshipEvidence.push(oneWayOutboundEvidence);

    const genRes = generatePathsForTarget(
      clonedDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.evaluations[0].blockingRelationshipIds).toContain(
      oneWayOutboundRelationship.id
    );
  });

  it("15: Invalid interaction path rejected", () => {
    const clonedDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    const invalidRel: Relationship = {
      id: "rel-invalid-date-edge",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-vc-isabel" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-invalid-date-edge"],
    };
    const invalidEv: RelationshipEvidence = {
      id: "ev-invalid-date-edge",
      relationshipId: "rel-invalid-date-edge",
      type: "meeting_history",
      description: "Invalid date record",
      observedAt: "2026-09-01",
      interaction: {
        occurredAt: "not-a-date",
        reciprocity: "two_way",
        status: "confirmed",
      },
    };
    clonedDataset.relationships.push(invalidRel);
    clonedDataset.relationshipEvidence.push(invalidEv);

    const genRes = generatePathsForTarget(
      clonedDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    expect(genRes.paths.length).toBe(1);

    const rejRes = applyPathRejection(genRes);
    expect(rejRes.disposition).toBe("all_paths_rejected");
    expect(rejRes.evaluations[0].reasonCodes).toContain(
      "INVALID_INTERACTION_DATA"
    );
  });

  it("16: Future interaction path rejected", () => {
    const clonedDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    const futureRel: Relationship = {
      id: "rel-future-date-edge",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-vc-isabel" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-future-date-edge"],
    };
    const futureEv: RelationshipEvidence = {
      id: "ev-future-date-edge",
      relationshipId: "rel-future-date-edge",
      type: "meeting_history",
      description: "Future meeting record",
      observedAt: "2026-09-01",
      interaction: {
        occurredAt: "2027-01-01",
        reciprocity: "two_way",
        status: "confirmed",
      },
    };
    clonedDataset.relationships.push(futureRel);
    clonedDataset.relationshipEvidence.push(futureEv);

    const genRes = generatePathsForTarget(
      clonedDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    expect(genRes.paths.length).toBe(1);

    const rejRes = applyPathRejection(genRes);
    expect(rejRes.disposition).toBe("all_paths_rejected");
    expect(rejRes.evaluations[0].reasonCodes).toContain(
      "FUTURE_INTERACTION_DATA"
    );
  });

  it("17: Invalid-reference reason defensively rejected on manually constructed path", () => {
    const mockGenResult: PathGenerationResult = {
      executionStatus: "success",
      targetInvestorId: "target-aurora",
      campaignId: "campaign-1",
      sourceFounderPersonIds: ["person-founder-elena"],
      targetPersonIds: ["person-vc-isabel"],
      paths: [
        {
          id: "mock-path-invalid-ref",
          targetInvestorId: "target-aurora",
          sourceFounderPersonId: "person-founder-elena",
          targetPersonId: "person-vc-isabel",
          nodes: [
            { type: "person", id: "person-founder-elena" },
            { type: "person", id: "person-vc-isabel" },
          ],
          relationshipIds: ["rel-bad-ref"],
          steps: [
            {
              fromPersonId: "person-founder-elena",
              toPersonId: "person-vc-isabel",
              relationshipId: "rel-bad-ref",

              qualificationStatus: "confirmation_required",
              qualificationReasonCodes: ["INVALID_REFERENCE_DATE"],
              traversedReverse: false,
            },
          ],
          intermediaryCount: 0,
          status: "candidate",
          requiresConfirmationRelationshipIds: ["rel-bad-ref"],
        },
      ],
      eligiblePathCount: 0,
      confirmationRequiredPathCount: 1,
      filteredConfirmationPathCount: 0,
      disposition: "confirmation_path_available",
      coldOutreachRequired: false,
      errors: [],
    };

    const rejRes = applyPathRejection(mockGenResult);
    expect(rejRes.disposition).toBe("all_paths_rejected");
    expect(rejRes.evaluations[0].reasonCodes).toContain(
      "INVALID_REFERENCE_CONTEXT"
    );
  });

  // Single Uncertainty Survival Tests (18 - 20)
  it("18: Single stale confirmation path retained", () => {
    const mockGenResult: PathGenerationResult = {
      executionStatus: "success",
      targetInvestorId: "target-stale",
      campaignId: "campaign-1",
      sourceFounderPersonIds: ["person-founder-elena"],
      targetPersonIds: ["person-vc-stale"],
      paths: [
        {
          id: "mock-path-stale",
          targetInvestorId: "target-stale",
          sourceFounderPersonId: "person-founder-elena",
          targetPersonId: "person-vc-stale",
          nodes: [
            { type: "person", id: "person-founder-elena" },
            { type: "person", id: "person-vc-stale" },
          ],
          relationshipIds: ["rel-stale"],
          steps: [
            {
              fromPersonId: "person-founder-elena",
              toPersonId: "person-vc-stale",
              relationshipId: "rel-stale",

              qualificationStatus: "confirmation_required",
              qualificationReasonCodes: ["STALE_INTERACTION"],
              traversedReverse: false,
            },
          ],
          intermediaryCount: 0,
          status: "candidate",
          requiresConfirmationRelationshipIds: ["rel-stale"],
        },
      ],
      eligiblePathCount: 0,
      confirmationRequiredPathCount: 1,
      filteredConfirmationPathCount: 0,
      disposition: "confirmation_path_available",
      coldOutreachRequired: false,
      errors: [],
    };

    const rejRes = applyPathRejection(mockGenResult);
    expect(rejRes.disposition).toBe("retained_paths_available");
    expect(rejRes.retainedPaths.length).toBe(1);
    expect(rejRes.evaluations[0].decision).toBe("retain");
  });

  it("19: Single unconfirmed confirmation path retained", () => {
    const mockGenResult: PathGenerationResult = {
      executionStatus: "success",
      targetInvestorId: "target-unconfirmed",
      campaignId: "campaign-1",
      sourceFounderPersonIds: ["person-founder-elena"],
      targetPersonIds: ["person-vc-unconfirmed"],
      paths: [
        {
          id: "mock-path-unconfirmed",
          targetInvestorId: "target-unconfirmed",
          sourceFounderPersonId: "person-founder-elena",
          targetPersonId: "person-vc-unconfirmed",
          nodes: [
            { type: "person", id: "person-founder-elena" },
            { type: "person", id: "person-vc-unconfirmed" },
          ],
          relationshipIds: ["rel-unconfirmed"],
          steps: [
            {
              fromPersonId: "person-founder-elena",
              toPersonId: "person-vc-unconfirmed",
              relationshipId: "rel-unconfirmed",

              qualificationStatus: "confirmation_required",
              qualificationReasonCodes: ["UNCONFIRMED_INTERACTION"],
              traversedReverse: false,
            },
          ],
          intermediaryCount: 0,
          status: "candidate",
          requiresConfirmationRelationshipIds: ["rel-unconfirmed"],
        },
      ],
      eligiblePathCount: 0,
      confirmationRequiredPathCount: 1,
      filteredConfirmationPathCount: 0,
      disposition: "confirmation_path_available",
      coldOutreachRequired: false,
      errors: [],
    };

    const rejRes = applyPathRejection(mockGenResult);
    expect(rejRes.disposition).toBe("retained_paths_available");
    expect(rejRes.retainedPaths.length).toBe(1);
    expect(rejRes.evaluations[0].decision).toBe("retain");
  });

  it("20: Single LinkedIn-only confirmation path retained", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.disposition).toBe("retained_paths_available");
    expect(rejRes.retainedPaths.length).toBe(1);
    expect(rejRes.evaluations[0].decision).toBe("retain");
  });

  // Policy Threshold Tests (21 - 26)
  it("21: Two confirmation-required hops rejected", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.disposition).toBe("all_paths_rejected");
    expect(rejRes.rejectedPaths.length).toBe(1);
    expect(rejRes.evaluations[0].decision).toBe("reject");
  });

  it("22: maxConfirmationRequiredHops = 2 allows Summit to survive", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes, {
      maxConfirmationRequiredHops: 2,
    });

    expect(rejRes.disposition).toBe("retained_paths_available");
    expect(rejRes.retainedPaths.length).toBe(1);
    expect(rejRes.rejectedPaths.length).toBe(0);
    expect(rejRes.evaluations[0].decision).toBe("retain");
  });

  it("23: maxConfirmationRequiredHops = 0 rejects Beacon", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes, {
      maxConfirmationRequiredHops: 0,
    });

    expect(rejRes.disposition).toBe("all_paths_rejected");
    expect(rejRes.retainedPaths.length).toBe(0);
    expect(rejRes.rejectedPaths.length).toBe(1);
  });

  it("24: Invalid rejection policy (-1) returns explicit error, not all_paths_rejected", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes, {
      maxConfirmationRequiredHops: -1,
    });

    expect(rejRes.executionStatus).toBe("error");
    expect(rejRes.disposition).toBe("error");
    expect(rejRes.errors[0]).toContain("Invalid maxConfirmationRequiredHops");
  });

  it("25: Fractional rejection threshold returns error", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes, {
      maxConfirmationRequiredHops: 1.5,
    });

    expect(rejRes.executionStatus).toBe("error");
    expect(rejRes.disposition).toBe("error");
  });

  it("26: NaN rejection threshold returns error", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes, {
      maxConfirmationRequiredHops: NaN,
    });

    expect(rejRes.executionStatus).toBe("error");
    expect(rejRes.disposition).toBe("error");
  });

  // Multiple Reasons & Determinism Tests (27 - 34)
  it("27: Multiple rejection reasons are all collected", () => {
    const mockGenResult: PathGenerationResult = {
      executionStatus: "success",
      targetInvestorId: "target-multi-fail",
      campaignId: "campaign-1",
      sourceFounderPersonIds: ["person-founder-elena"],
      targetPersonIds: ["person-vc-target"],
      paths: [
        {
          id: "path-multi-fail",
          targetInvestorId: "target-multi-fail",
          sourceFounderPersonId: "person-founder-elena",
          targetPersonId: "person-vc-target",
          nodes: [
            { type: "person", id: "p1" },
            { type: "person", id: "p2" },
            { type: "person", id: "p3" },
          ],
          relationshipIds: ["rel-one-way", "rel-future"],
          steps: [
            {
              fromPersonId: "p1",
              toPersonId: "p2",
              relationshipId: "rel-one-way",

              qualificationStatus: "confirmation_required",
              qualificationReasonCodes: ["ONE_WAY_OUTREACH_ONLY"],
              traversedReverse: false,
            },
            {
              fromPersonId: "p2",
              toPersonId: "p3",
              relationshipId: "rel-future",

              qualificationStatus: "confirmation_required",
              qualificationReasonCodes: ["FUTURE_INTERACTION_DATE"],
              traversedReverse: false,
            },
          ],
          intermediaryCount: 1,
          status: "candidate",
          requiresConfirmationRelationshipIds: ["rel-one-way", "rel-future"],
        },
      ],
      eligiblePathCount: 0,
      confirmationRequiredPathCount: 1,
      filteredConfirmationPathCount: 0,
      disposition: "confirmation_path_available",
      coldOutreachRequired: false,
      errors: [],
    };

    const rejRes = applyPathRejection(mockGenResult);
    expect(rejRes.evaluations[0].reasonCodes).toContain("ONE_WAY_OUTREACH_EDGE");
    expect(rejRes.evaluations[0].reasonCodes).toContain("FUTURE_INTERACTION_DATA");
    expect(rejRes.evaluations[0].reasonCodes).toContain("EXCESS_CONFIRMATION_HOPS");
  });

  it("28: Rejection reasons have deterministic ordering", () => {
    const mockGenResult: PathGenerationResult = {
      executionStatus: "success",
      targetInvestorId: "target-multi-fail",
      campaignId: "campaign-1",
      sourceFounderPersonIds: ["person-founder-elena"],
      targetPersonIds: ["person-vc-target"],
      paths: [
        {
          id: "path-multi-fail",
          targetInvestorId: "target-multi-fail",
          sourceFounderPersonId: "person-founder-elena",
          targetPersonId: "person-vc-target",
          nodes: [
            { type: "person", id: "p1" },
            { type: "person", id: "p2" },
            { type: "person", id: "p3" },
          ],
          relationshipIds: ["rel-one-way", "rel-invalid"],
          steps: [
            {
              fromPersonId: "p1",
              toPersonId: "p2",
              relationshipId: "rel-one-way",

              qualificationStatus: "confirmation_required",
              qualificationReasonCodes: ["ONE_WAY_OUTREACH_ONLY"],
              traversedReverse: false,
            },
            {
              fromPersonId: "p2",
              toPersonId: "p3",
              relationshipId: "rel-invalid",

              qualificationStatus: "confirmation_required",
              qualificationReasonCodes: ["INVALID_INTERACTION_DATE"],
              traversedReverse: false,
            },
          ],
          intermediaryCount: 1,
          status: "candidate",
          requiresConfirmationRelationshipIds: ["rel-one-way", "rel-invalid"],
        },
      ],
      eligiblePathCount: 0,
      confirmationRequiredPathCount: 1,
      filteredConfirmationPathCount: 0,
      disposition: "confirmation_path_available",
      coldOutreachRequired: false,
      errors: [],
    };

    const rejRes = applyPathRejection(mockGenResult);
    // STABLE ORDER: INVALID_INTERACTION_DATA comes before ONE_WAY_OUTREACH_EDGE, which comes before EXCESS_CONFIRMATION_HOPS
    expect(rejRes.evaluations[0].reasonCodes).toEqual([
      "INVALID_INTERACTION_DATA",
      "ONE_WAY_OUTREACH_EDGE",
      "EXCESS_CONFIRMATION_HOPS",
    ]);
  });

  it("29: Blocking relationship IDs are deduplicated deterministically", () => {
    const mockGenResult: PathGenerationResult = {
      executionStatus: "success",
      targetInvestorId: "target-dedup",
      campaignId: "campaign-1",
      sourceFounderPersonIds: ["person-founder-elena"],
      targetPersonIds: ["person-vc-target"],
      paths: [
        {
          id: "path-dedup",
          targetInvestorId: "target-dedup",
          sourceFounderPersonId: "person-founder-elena",
          targetPersonId: "person-vc-target",
          nodes: [
            { type: "person", id: "p1" },
            { type: "person", id: "p2" },
            { type: "person", id: "p3" },
          ],
          relationshipIds: ["rel-dup", "rel-dup-2"],
          steps: [
            {
              fromPersonId: "p1",
              toPersonId: "p2",
              relationshipId: "rel-dup",

              qualificationStatus: "confirmation_required",
              qualificationReasonCodes: ["ONE_WAY_OUTREACH_ONLY", "INVALID_INTERACTION_DATE"],
              traversedReverse: false,
            },
            {
              fromPersonId: "p2",
              toPersonId: "p3",
              relationshipId: "rel-dup-2",

              qualificationStatus: "confirmation_required",
              qualificationReasonCodes: [],
              traversedReverse: false,
            },
          ],
          intermediaryCount: 1,
          status: "candidate",
          requiresConfirmationRelationshipIds: ["rel-dup", "rel-dup-2"],
        },
      ],
      eligiblePathCount: 0,
      confirmationRequiredPathCount: 1,
      filteredConfirmationPathCount: 0,
      disposition: "confirmation_path_available",
      coldOutreachRequired: false,
      errors: [],
    };

    const rejRes = applyPathRejection(mockGenResult);
    const blockingRels = rejRes.evaluations[0].blockingRelationshipIds;
    const uniqueRels = Array.from(new Set(blockingRels));
    expect(blockingRels).toEqual(uniqueRels);
    expect(blockingRels).toContain("rel-dup");
    expect(blockingRels).toContain("rel-dup-2");
  });

  it("30: Original PathGenerationResult is not mutated", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const snapshotJson = JSON.stringify(genRes);

    applyPathRejection(genRes);

    expect(JSON.stringify(genRes)).toBe(snapshotJson);
  });

  it("31: Original PathCandidate objects are not mutated", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const originalCandidateStatus = genRes.paths[0].status;

    const rejRes = applyPathRejection(genRes);

    expect(genRes.paths[0].status).toBe(originalCandidateStatus);
    expect(genRes.paths[0].status).toBe("candidate");
    expect(rejRes.rejectedPaths[0].status).toBe("rejected");
  });

  it("32: Repeated evaluation produces identical result", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const rejRes1 = applyPathRejection(genRes);
    const rejRes2 = applyPathRejection(genRes);

    expect(rejRes1).toEqual(rejRes2);
  });

  it("33: Retained paths preserve upstream deterministic ordering", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.retainedPaths.map((p) => p.id)).toEqual(
      genRes.paths.map((p) => p.id)
    );
  });

  it("34: Rejected paths preserve upstream deterministic ordering", () => {
    const genRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    const rejRes = applyPathRejection(genRes);

    expect(rejRes.rejectedPaths.map((p) => p.id)).toEqual(
      genRes.paths.map((p) => p.id)
    );
  });
});
