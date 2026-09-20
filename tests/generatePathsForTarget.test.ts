import { describe, it, expect } from "vitest";
import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { generatePathsForTarget } from "@/lib/pathway/generatePathsForTarget";
import { buildTraversalGraph } from "@/lib/pathway/buildTraversalGraph";
import {
  isRelationshipTraversable,
  getPermittedTraversalSteps,
} from "@/lib/pathway/traversalPolicy";
import { DEFAULT_PATH_GENERATION_POLICY } from "@/lib/pathway/pathGenerationPolicy";
import { qualifyRelationships } from "@/lib/pathway/qualifyRelationships";
import { PathwayDataset, Relationship, RelationshipEvidence } from "@/types/pathway";

const REFERENCE_DATE = "2026-09-18";

describe("Deterministic Path Generation & Traversal Engine (Batch 3.1 Hardened)", () => {
  // Case A: Horizon Ventures
  it("1: Horizon generates Elena → Marcus → Sarah", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.paths.length).toBe(1);
    const path = res.paths[0];
    expect(path.nodes.map((n) => n.id)).toEqual([
      "person-founder-elena",
      "person-advisor-marcus",
      "person-vc-sarah",
    ]);
  });

  it("2: Horizon path is confirmation_required and disposition is confirmation_path_available", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("confirmation_path_available");
    expect(res.coldOutreachRequired).toBe(false);
    expect(res.eligiblePathCount).toBe(0);
    expect(res.confirmationRequiredPathCount).toBe(1);
    expect(res.filteredConfirmationPathCount).toBe(0);
    expect(res.paths[0].status).toBe("candidate");
    expect(res.paths[0].requiresConfirmationRelationshipIds).toEqual(["rel-marcus-sarah"]);
  });

  it("3: Horizon advisor hop uses traversedReverse = true", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    const path = res.paths[0];
    expect(path.steps[0].relationshipId).toBe("rel-elena-marcus");
    expect(path.steps[0].fromPersonId).toBe("person-founder-elena");
    expect(path.steps[0].toPersonId).toBe("person-advisor-marcus");
    expect(path.steps[0].traversedReverse).toBe(true);

    expect(path.steps[1].relationshipId).toBe("rel-marcus-sarah");
    expect(path.steps[1].fromPersonId).toBe("person-advisor-marcus");
    expect(path.steps[1].toPersonId).toBe("person-vc-sarah");
    expect(path.steps[1].traversedReverse).toBe(false);
  });

  it("4: Horizon structural works_at edge is not included in path.relationshipIds", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    const path = res.paths[0];
    expect(path.relationshipIds).toEqual(["rel-elena-marcus", "rel-marcus-sarah"]);
    expect(path.relationshipIds).not.toContain("rel-sarah-horizon");
    expect(path.nodes.some((n) => n.id === "org-horizon-vc")).toBe(false);
  });

  it("5: Horizon intermediaryCount = 1", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.paths[0].intermediaryCount).toBe(1);
  });

  // Case B: Beacon Capital
  it("6: Beacon generates direct Elena → David route", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.paths.length).toBe(1);
    const path = res.paths[0];
    expect(path.nodes.map((n) => n.id)).toEqual([
      "person-founder-elena",
      "person-vc-david",
    ]);
  });

  it("7: Beacon path status = candidate and disposition = confirmation_path_available", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("confirmation_path_available");
    expect(res.coldOutreachRequired).toBe(false);
    expect(res.eligiblePathCount).toBe(0);
    expect(res.confirmationRequiredPathCount).toBe(1);
    expect(res.filteredConfirmationPathCount).toBe(0);
    expect(res.paths[0].status).toBe("candidate");
  });

  it("8: Beacon requires confirmation for rel-elena-david", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.paths[0].requiresConfirmationRelationshipIds).toEqual([
      "rel-elena-david",
    ]);
  });

  it("9: Beacon intermediaryCount = 0", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.paths[0].intermediaryCount).toBe(0);
  });

  // Case C: Summit Ridge Capital
  it("10: Summit generates Elena → Tom → Clara", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.paths.length).toBe(1);
    const path = res.paths[0];
    expect(path.nodes.map((n) => n.id)).toEqual([
      "person-founder-elena",
      "person-colleague-tom",
      "person-vc-clara",
    ]);
  });

  it("11: Summit candidate path includes both stale confirmation-required relationship IDs", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    const path = res.paths[0];
    expect(path.status).toBe("candidate");
    expect(path.requiresConfirmationRelationshipIds).toEqual([
      "rel-elena-tom",
      "rel-tom-clara",
    ]);
    expect(path.intermediaryCount).toBe(1);
    expect(res.disposition).toBe("confirmation_path_available");
  });

  // Case D: Aurora Global Ventures (Canonical True Negative Control)
  it("12: Aurora produces zero paths", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.paths).toEqual([]);
    expect(res.eligiblePathCount).toBe(0);
    expect(res.confirmationRequiredPathCount).toBe(0);
    expect(res.filteredConfirmationPathCount).toBe(0);
    expect(res.errors).toEqual([]);
  });

  it("13: Aurora disposition = no_known_path", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("no_known_path");
  });

  it("14: Aurora coldOutreachRequired = true", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.coldOutreachRequired).toBe(true);
  });

  // Policy & Graph Invariant Tests
  it("15: Structural relationships are never traversed as intro edges", () => {
    const quals = qualifyRelationships(pathwayDemoDataset, REFERENCE_DATE);
    const graph = buildTraversalGraph(
      pathwayDemoDataset,
      quals,
      DEFAULT_PATH_GENERATION_POLICY
    );

    for (const [, edges] of graph) {
      for (const edge of edges) {
        expect(edge.relationshipId).not.toBe("rel-founder-nexus");
        expect(edge.relationshipId).not.toBe("rel-sarah-horizon");
        expect(edge.relationshipId).not.toBe("rel-david-beacon");
        expect(edge.relationshipId).not.toBe("rel-clara-summit");
        expect(edge.relationshipId).not.toBe("rel-isabel-aurora");
        expect(edge.qualificationStatus).not.toBe("structural");
      }
    }
  });

  it("16: Ineligible relationships are never traversed", () => {
    const datasetWithIneligible: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    const badRel: Relationship = {
      id: "rel-bad-edge",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-vc-isabel" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-bad-edge"],
    };
    const badEv: RelationshipEvidence = {
      id: "ev-bad-edge",
      relationshipId: "rel-bad-edge",
      type: "meeting_history",
      description: "Invalid interaction record",
      provenance: {
        accessClass: "first_party_private",
        sourceSystem: "google_calendar",
        sourcePrincipalPersonId: "person-founder-elena",
        authorizedByPersonId: "person-founder-elena",
      },
      observedAt: "2026-09-01",
      interaction: {
        occurredAt: "not-a-date",
        reciprocity: "two_way",
        status: "confirmed",
      },
    };
    datasetWithIneligible.relationships.push(badRel);
    datasetWithIneligible.relationshipEvidence.push(badEv);

    const quals = qualifyRelationships(datasetWithIneligible, REFERENCE_DATE);
    const badQual = quals.find((q) => q.relationshipId === "rel-bad-edge");
    expect(badQual).toBeDefined();

    const mockIneligibleQual = {
      ...badQual!,
      status: "ineligible" as const,
    };
    const isTraversable = isRelationshipTraversable(
      badRel,
      mockIneligibleQual,
      DEFAULT_PATH_GENERATION_POLICY
    );
    expect(isTraversable).toBe(false);
  });

  it("17: Setting includeConfirmationRequired = false sets disposition = confirmation_paths_filtered for Beacon/Summit", () => {
    const horizonRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE,
      { includeConfirmationRequired: false }
    );
    expect(horizonRes.executionStatus).toBe("success");
    expect(horizonRes.paths.length).toBe(0);
    expect(horizonRes.disposition).toBe("confirmation_paths_filtered");
    expect(horizonRes.coldOutreachRequired).toBe(false);

    const beaconRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE,
      { includeConfirmationRequired: false }
    );
    expect(beaconRes.executionStatus).toBe("success");
    expect(beaconRes.paths.length).toBe(0);
    expect(beaconRes.eligiblePathCount).toBe(0);
    expect(beaconRes.confirmationRequiredPathCount).toBe(1);
    expect(beaconRes.filteredConfirmationPathCount).toBe(1);
    expect(beaconRes.disposition).toBe("confirmation_paths_filtered");
    expect(beaconRes.coldOutreachRequired).toBe(false);

    const summitRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE,
      { includeConfirmationRequired: false }
    );
    expect(summitRes.executionStatus).toBe("success");
    expect(summitRes.paths.length).toBe(0);
    expect(summitRes.eligiblePathCount).toBe(0);
    expect(summitRes.confirmationRequiredPathCount).toBe(1);
    expect(summitRes.filteredConfirmationPathCount).toBe(1);
    expect(summitRes.disposition).toBe("confirmation_paths_filtered");
    expect(summitRes.coldOutreachRequired).toBe(false);
  });

  it("18: maxRelationshipHops = 1 removes Horizon and Summit multi-hop paths", () => {
    const horizonRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE,
      { maxRelationshipHops: 1 }
    );
    expect(horizonRes.executionStatus).toBe("success");
    expect(horizonRes.paths.length).toBe(0);
    expect(horizonRes.disposition).toBe("no_known_path");
    expect(horizonRes.coldOutreachRequired).toBe(true);

    const beaconRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE,
      { maxRelationshipHops: 1 }
    );
    expect(beaconRes.executionStatus).toBe("success");
    expect(beaconRes.paths.length).toBe(1);
  });

  it("19: maxRelationshipHops = 2 permits Horizon", () => {
    const horizonRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE,
      { maxRelationshipHops: 2 }
    );
    expect(horizonRes.executionStatus).toBe("success");
    expect(horizonRes.paths.length).toBe(1);
    expect(horizonRes.paths[0].relationshipIds.length).toBe(2);
  });

  it("20: Graph cycles do not produce cyclic paths", () => {
    const cyclicDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    const cycleRel: Relationship = {
      id: "rel-sarah-elena-cycle",
      from: { type: "person", id: "person-vc-sarah" },
      to: { type: "person", id: "person-founder-elena" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-cycle"],
    };
    const cycleEv: RelationshipEvidence = {
      id: "ev-cycle",
      relationshipId: "rel-sarah-elena-cycle",
      type: "email_history",
      description: "Cycle test",
      provenance: {
        accessClass: "first_party_private",
        sourceSystem: "gmail",
        sourcePrincipalPersonId: "person-founder-elena",
        authorizedByPersonId: "person-founder-elena",
      },
      observedAt: "2026-09-01",
      interaction: {
        occurredAt: "2026-08-01",
        reciprocity: "two_way",
        status: "confirmed",
      },
    };
    cyclicDataset.relationships.push(cycleRel);
    cyclicDataset.relationshipEvidence.push(cycleEv);

    const res = generatePathsForTarget(
      cyclicDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    for (const path of res.paths) {
      const personIds = path.nodes.map((n) => n.id);
      const uniqueIds = new Set(personIds);
      expect(personIds.length).toBe(uniqueIds.size);
    }
  });

  it("21: Generated paths contain no duplicate person node", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    for (const path of res.paths) {
      const personIds = path.nodes.map((n) => n.id);
      const uniqueIds = new Set(personIds);
      expect(personIds.length).toBe(uniqueIds.size);
    }
  });

  it("22: Path IDs are deterministic across repeated calls", () => {
    const res1 = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    const res2 = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res1.paths.map((p) => p.id)).toEqual(res2.paths.map((p) => p.id));
    expect(res1.paths[0].id).toBe(
      "path:target-horizon:person-founder-elena:person-vc-sarah:rel-elena-marcus:rev>rel-marcus-sarah"
    );
  });

  it("23: Result ordering is deterministic (hop count ascending, then path ID)", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    for (let i = 0; i < res.paths.length - 1; i++) {
      const a = res.paths[i];
      const b = res.paths[i + 1];
      expect(a.relationshipIds.length).toBeLessThanOrEqual(
        b.relationshipIds.length
      );
      if (a.relationshipIds.length === b.relationshipIds.length) {
        expect(a.id.localeCompare(b.id)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("24: Input dataset is not mutated", () => {
    const originalJson = JSON.stringify(pathwayDemoDataset);
    generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(JSON.stringify(pathwayDemoDataset)).toBe(originalJson);
  });

  it("25: Multiple campaign founders are independently searched", () => {
    const multiFounderDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    multiFounderDataset.people.push({
      id: "person-founder-john",
      firstName: "John",
      lastName: "CoFounder",
      fullName: "John CoFounder",
      currentOrganizationIds: ["org-nexus"],
    });
    multiFounderDataset.campaigns[0].founderPersonIds.push("person-founder-john");

    multiFounderDataset.relationships.push({
      id: "rel-john-marcus",
      from: { type: "person", id: "person-advisor-marcus" },
      to: { type: "person", id: "person-founder-john" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-john-marcus"],
      startedAt: "2024-01-01",
      lastObservedAt: "2026-09-01",
    });
    multiFounderDataset.relationshipEvidence.push({
      id: "ev-john-marcus",
      relationshipId: "rel-john-marcus",
      type: "email_history",
      description: "Co-founder advisory sync",
      provenance: {
        accessClass: "first_party_private",
        sourceSystem: "gmail",
        sourcePrincipalPersonId: "person-founder-john",
        authorizedByPersonId: "person-founder-john",
      },
      observedAt: "2026-09-01",
      interaction: {
        occurredAt: "2026-08-15",
        reciprocity: "two_way",
        status: "confirmed",
      },
    });

    const res = generatePathsForTarget(
      multiFounderDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.sourceFounderPersonIds).toEqual([
      "person-founder-elena",
      "person-founder-john",
    ]);
    expect(res.paths.length).toBe(2);

    const sourceFounders = res.paths.map((p) => p.sourceFounderPersonId);
    expect(sourceFounders).toContain("person-founder-elena");
    expect(sourceFounders).toContain("person-founder-john");
  });

  it("26: Multiple target candidate people are independently searched", () => {
    const multiCandidateDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    multiCandidateDataset.people.push({
      id: "person-vc-alex",
      firstName: "Alex",
      lastName: "Rivera",
      fullName: "Alex Rivera",
      currentOrganizationIds: ["org-horizon-vc"],
    });
    multiCandidateDataset.relationships.push({
      id: "rel-marcus-alex",
      from: { type: "person", id: "person-advisor-marcus" },
      to: { type: "person", id: "person-vc-alex" },
      type: "co_invested",
      direction: "bidirectional",
      evidenceIds: ["ev-marcus-alex"],
      startedAt: "2023-01-01",
      lastObservedAt: "2026-09-01",
    });
    multiCandidateDataset.relationshipEvidence.push({
      id: "ev-marcus-alex",
      relationshipId: "rel-marcus-alex",
      type: "email_history",
      description: "Co-invested with Alex",
      provenance: {
        accessClass: "public",
        sourceSystem: "press",
      },
      observedAt: "2026-09-01",
    });
    multiCandidateDataset.relationships.push({
      id: "rel-alex-horizon",
      from: { type: "person", id: "person-vc-alex" },
      to: { type: "organization", id: "org-horizon-vc" },
      type: "works_at",
      direction: "directed",
      evidenceIds: ["ev-alex-horizon"],
    });
    multiCandidateDataset.relationshipEvidence.push({
      id: "ev-alex-horizon",
      relationshipId: "rel-alex-horizon",
      type: "company_website",
      description: "Partner at Horizon",
      provenance: {
        accessClass: "public",
        sourceSystem: "company_website",
      },
      observedAt: "2026-09-01",
    });

    multiCandidateDataset.targetInvestors[0].candidatePersonIds.push(
      "person-vc-alex"
    );

    const res = generatePathsForTarget(
      multiCandidateDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.executionStatus).toBe("success");
    expect(res.targetPersonIds).toEqual(["person-vc-sarah", "person-vc-alex"]);
    expect(res.paths.length).toBe(2);
  });

  // Batch 3.1 Hardened Error & Validation Tests (A - N)
  describe("Batch 3.1 Error & Validation Contract Tests", () => {
    it("A: Missing TargetInvestor returns TARGET_INVESTOR_NOT_FOUND error", () => {
      const res = generatePathsForTarget(
        pathwayDemoDataset,
        "target-nonexistent",
        REFERENCE_DATE
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.paths).toEqual([]);
      expect(res.errors[0].code).toBe("TARGET_INVESTOR_NOT_FOUND");
    });

    it("B: Invalid dataset returns INVALID_DATASET error", () => {
      const corruptDataset: PathwayDataset = JSON.parse(
        JSON.stringify(pathwayDemoDataset)
      );
      corruptDataset.relationshipEvidence[0].relationshipId = "non-existent-rel";

      const res = generatePathsForTarget(
        corruptDataset,
        "target-horizon",
        REFERENCE_DATE
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.paths).toEqual([]);
      expect(res.errors[0].code).toBe("INVALID_DATASET");
    });

    it("C: Zero target people returns NO_TARGET_PEOPLE error", () => {
      const invalidDataset: PathwayDataset = JSON.parse(
        JSON.stringify(pathwayDemoDataset)
      );
      invalidDataset.targetInvestors[0].candidatePersonIds = [];

      const res = generatePathsForTarget(
        invalidDataset,
        "target-horizon",
        REFERENCE_DATE
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("NO_TARGET_PEOPLE");
    });

    it("D: Invalid referenceDate string returns INVALID_REFERENCE_DATE error without traversing", () => {
      const res = generatePathsForTarget(
        pathwayDemoDataset,
        "target-horizon",
        "invalid-date-string"
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("INVALID_REFERENCE_DATE");
    });

    it("E: Invalid Date object returns INVALID_REFERENCE_DATE error", () => {
      const res = generatePathsForTarget(
        pathwayDemoDataset,
        "target-horizon",
        new Date("invalid-date")
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("INVALID_REFERENCE_DATE");
    });

    it("F: maxRelationshipHops = 0 returns INVALID_PATH_POLICY error", () => {
      const res = generatePathsForTarget(
        pathwayDemoDataset,
        "target-horizon",
        REFERENCE_DATE,
        { maxRelationshipHops: 0 }
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("INVALID_PATH_POLICY");
    });

    it("G: maxRelationshipHops = -1 returns INVALID_PATH_POLICY error", () => {
      const res = generatePathsForTarget(
        pathwayDemoDataset,
        "target-horizon",
        REFERENCE_DATE,
        { maxRelationshipHops: -1 }
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("INVALID_PATH_POLICY");
    });

    it("H: maxRelationshipHops = 1.5 returns INVALID_PATH_POLICY error", () => {
      const res = generatePathsForTarget(
        pathwayDemoDataset,
        "target-horizon",
        REFERENCE_DATE,
        { maxRelationshipHops: 1.5 }
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("INVALID_PATH_POLICY");
    });

    it("I: maxRelationshipHops = NaN returns INVALID_PATH_POLICY error", () => {
      const res = generatePathsForTarget(
        pathwayDemoDataset,
        "target-horizon",
        REFERENCE_DATE,
        { maxRelationshipHops: NaN }
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("INVALID_PATH_POLICY");
    });

    it("J: Malformed includeConfirmationRequired runtime value returns INVALID_PATH_POLICY error", () => {
      const res = generatePathsForTarget(
        pathwayDemoDataset,
        "target-horizon",
        REFERENCE_DATE,
        { includeConfirmationRequired: "true" as unknown as boolean }
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("INVALID_PATH_POLICY");
    });

    it("K: agingMaxDays < recentMaxDays returns INVALID_QUALIFICATION_POLICY error", () => {
      const res = generatePathsForTarget(
        pathwayDemoDataset,
        "target-horizon",
        REFERENCE_DATE,
        undefined,
        { recentMaxDays: 90, agingMaxDays: 30 }
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("INVALID_QUALIFICATION_POLICY");
    });

    it("L: Candidate target person with unverified affiliation returns TARGET_PERSON_AFFILIATION_UNVERIFIED error", () => {
      const unverifiedDataset: PathwayDataset = JSON.parse(
        JSON.stringify(pathwayDemoDataset)
      );
      // Remove Sarah's currentOrganizationIds and works_at relationship & evidence
      const sarah = unverifiedDataset.people.find(
        (p) => p.id === "person-vc-sarah"
      )!;
      sarah.currentOrganizationIds = [];
      unverifiedDataset.relationships = unverifiedDataset.relationships.filter(
        (r) => r.id !== "rel-sarah-horizon"
      );
      unverifiedDataset.relationshipEvidence = unverifiedDataset.relationshipEvidence.filter(
        (e) => e.relationshipId !== "rel-sarah-horizon"
      );

      const res = generatePathsForTarget(
        unverifiedDataset,
        "target-horizon",
        REFERENCE_DATE
      );
      expect(res.executionStatus).toBe("error");
      expect(res.disposition).toBeNull();
      expect(res.coldOutreachRequired).toBeNull();
      expect(res.errors[0].code).toBe("TARGET_PERSON_AFFILIATION_UNVERIFIED");
      expect(res.errors[0].entityId).toBe("person-vc-sarah");
    });

    it("M: Candidate affiliation verified through Person.currentOrganizationIds is accepted", () => {
      const datasetOrgIdOnly: PathwayDataset = JSON.parse(
        JSON.stringify(pathwayDemoDataset)
      );
      // Remove works_at relationship and evidence for Sarah but keep org ID in currentOrganizationIds
      datasetOrgIdOnly.relationships = datasetOrgIdOnly.relationships.filter(
        (r) => r.id !== "rel-sarah-horizon"
      );
      datasetOrgIdOnly.relationshipEvidence = datasetOrgIdOnly.relationshipEvidence.filter(
        (e) => e.relationshipId !== "rel-sarah-horizon"
      );

      const res = generatePathsForTarget(
        datasetOrgIdOnly,
        "target-horizon",
        REFERENCE_DATE
      );
      expect(res.executionStatus).toBe("success");
      expect(res.paths.length).toBe(1);
    });

    it("N: Candidate affiliation verified through current works_at relationship is accepted", () => {
      const datasetWorksAtOnly: PathwayDataset = JSON.parse(
        JSON.stringify(pathwayDemoDataset)
      );
      // Remove org ID from Sarah's currentOrganizationIds but keep works_at relationship
      const sarah = datasetWorksAtOnly.people.find(
        (p) => p.id === "person-vc-sarah"
      )!;
      sarah.currentOrganizationIds = [];

      const res = generatePathsForTarget(
        datasetWorksAtOnly,
        "target-horizon",
        REFERENCE_DATE
      );
      expect(res.executionStatus).toBe("success");
      expect(res.paths.length).toBe(1);
    });
  });

  // Internal Traversal Helper Tests
  describe("Traversal Policy Helpers", () => {
    it("Bidirectional relationship generates both forward and reverse steps", () => {
      const rel: Relationship = {
        id: "rel-bi",
        from: { type: "person", id: "p1" },
        to: { type: "person", id: "p2" },
        type: "colleague",
        direction: "bidirectional",
        evidenceIds: [],
      };
      const steps = getPermittedTraversalSteps(rel);
      expect(steps).toEqual([
        { fromPersonId: "p1", toPersonId: "p2", traversedReverse: false },
        { fromPersonId: "p2", toPersonId: "p1", traversedReverse: true },
      ]);
    });

    it("Advisor directed relationship permits reverse traversal", () => {
      const rel: Relationship = {
        id: "rel-adv",
        from: { type: "person", id: "marcus" },
        to: { type: "person", id: "elena" },
        type: "advisor",
        direction: "directed",
        evidenceIds: [],
      };
      const steps = getPermittedTraversalSteps(rel);
      expect(steps).toEqual([
        { fromPersonId: "marcus", toPersonId: "elena", traversedReverse: false },
        { fromPersonId: "elena", toPersonId: "marcus", traversedReverse: true },
      ]);
    });

    it("Non-permitted directed relationship permits ONLY forward traversal", () => {
      const rel: Relationship = {
        id: "rel-dir",
        from: { type: "person", id: "p1" },
        to: { type: "person", id: "p2" },
        type: "other",
        direction: "directed",
        evidenceIds: [],
      };
      const steps = getPermittedTraversalSteps(rel);
      expect(steps).toEqual([
        { fromPersonId: "p1", toPersonId: "p2", traversedReverse: false },
      ]);
    });

    it("Organization endpoint returns no traversal steps", () => {
      const rel: Relationship = {
        id: "rel-org",
        from: { type: "person", id: "p1" },
        to: { type: "organization", id: "org1" },
        type: "works_at",
        direction: "directed",
        evidenceIds: [],
      };
      const steps = getPermittedTraversalSteps(rel);
      expect(steps).toEqual([]);
    });
  });
});
