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

describe("Deterministic Path Generation & Traversal Engine", () => {
  // Case A: Horizon Ventures
  it("1: Horizon generates Elena → Marcus → Sarah", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.paths.length).toBe(1);
    const path = res.paths[0];
    expect(path.nodes.map((n) => n.id)).toEqual([
      "person-founder-elena",
      "person-advisor-marcus",
      "person-vc-sarah",
    ]);
  });

  it("2: Horizon path is eligible and disposition is eligible_path_available", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.disposition).toBe("eligible_path_available");
    expect(res.coldOutreachRequired).toBe(false);
    expect(res.eligiblePathCount).toBe(1);
    expect(res.confirmationRequiredPathCount).toBe(0);
    expect(res.paths[0].status).toBe("eligible");
    expect(res.paths[0].requiresConfirmationRelationshipIds).toEqual([]);
  });

  it("3: Horizon advisor hop uses traversedReverse = true", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE
    );
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
    expect(res.paths[0].intermediaryCount).toBe(1);
  });

  // Case B: Beacon Capital
  it("6: Beacon generates direct Elena → David route", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
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
    expect(res.disposition).toBe("confirmation_path_available");
    expect(res.coldOutreachRequired).toBe(false);
    expect(res.eligiblePathCount).toBe(0);
    expect(res.confirmationRequiredPathCount).toBe(1);
    expect(res.paths[0].status).toBe("candidate");
  });

  it("8: Beacon requires confirmation for rel-elena-david", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE
    );
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
    expect(res.paths[0].intermediaryCount).toBe(0);
  });

  // Case C: Summit Ridge Capital
  it("10: Summit generates Elena → Tom → Clara", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE
    );
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
    const path = res.paths[0];
    expect(path.status).toBe("candidate");
    expect(path.requiresConfirmationRelationshipIds).toEqual([
      "rel-elena-tom",
      "rel-tom-clara",
    ]);
    expect(path.intermediaryCount).toBe(1);
    expect(res.disposition).toBe("confirmation_path_available");
  });

  // Case D: Aurora Global Ventures (Negative Control)
  it("12: Aurora produces zero paths", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    expect(res.paths).toEqual([]);
    expect(res.eligiblePathCount).toBe(0);
    expect(res.confirmationRequiredPathCount).toBe(0);
  });

  it("13: Aurora disposition = no_known_path", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-aurora",
      REFERENCE_DATE
    );
    expect(res.disposition).toBe("no_known_path");
  });

  it("14: Aurora coldOutreachRequired = true", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-aurora",
      REFERENCE_DATE
    );
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

    // Check all adjacency edges in graph
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
    // Add an ineligible relationship (e.g. invalid date)
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
    // Ensure badQual is confirmation_required or ineligible
    expect(badQual).toBeDefined();

    const graph = buildTraversalGraph(
      datasetWithIneligible,
      quals,
      DEFAULT_PATH_GENERATION_POLICY
    );
    const elenaEdges = graph.get("person-founder-elena") || [];
    // If we mock qualification status as ineligible
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

  it("17: Setting includeConfirmationRequired = false removes Beacon and Summit routes while preserving Horizon", () => {
    const horizonRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE,
      { includeConfirmationRequired: false }
    );
    expect(horizonRes.paths.length).toBe(1);
    expect(horizonRes.disposition).toBe("eligible_path_available");

    const beaconRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE,
      { includeConfirmationRequired: false }
    );
    expect(beaconRes.paths.length).toBe(0);
    expect(beaconRes.disposition).toBe("no_known_path");
    expect(beaconRes.coldOutreachRequired).toBe(true);

    const summitRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE,
      { includeConfirmationRequired: false }
    );
    expect(summitRes.paths.length).toBe(0);
    expect(summitRes.disposition).toBe("no_known_path");
    expect(summitRes.coldOutreachRequired).toBe(true);
  });

  it("18: maxRelationshipHops = 1 removes Horizon and Summit multi-hop paths", () => {
    const horizonRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE,
      { maxRelationshipHops: 1 }
    );
    expect(horizonRes.paths.length).toBe(0);
    expect(horizonRes.disposition).toBe("no_known_path");

    const summitRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-summit",
      REFERENCE_DATE,
      { maxRelationshipHops: 1 }
    );
    expect(summitRes.paths.length).toBe(0);

    // Beacon is 1 hop so it remains
    const beaconRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-beacon",
      REFERENCE_DATE,
      { maxRelationshipHops: 1 }
    );
    expect(beaconRes.paths.length).toBe(1);
  });

  it("19: maxRelationshipHops = 2 permits Horizon", () => {
    const horizonRes = generatePathsForTarget(
      pathwayDemoDataset,
      "target-horizon",
      REFERENCE_DATE,
      { maxRelationshipHops: 2 }
    );
    expect(horizonRes.paths.length).toBe(1);
    expect(horizonRes.paths[0].relationshipIds.length).toBe(2);
  });

  it("20: Graph cycles do not produce cyclic paths", () => {
    // Add a cycle: Sarah -> Marcus (already bidirectional) + Sarah -> Elena
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
    // Every path must contain no repeating person node
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
    // Add second founder John
    multiFounderDataset.people.push({
      id: "person-founder-john",
      firstName: "John",
      lastName: "CoFounder",
      fullName: "John CoFounder",
      currentOrganizationIds: ["org-nexus"],
    });
    multiFounderDataset.campaigns[0].founderPersonIds.push("person-founder-john");

    // Connect John -> Marcus as well
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
    // Add second partner Alex to Horizon
    multiCandidateDataset.people.push({
      id: "person-vc-alex",
      firstName: "Alex",
      lastName: "Rivera",
      fullName: "Alex Rivera",
      currentOrganizationIds: ["org-horizon-vc"],
    });
    // Add rel-marcus-alex
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
      observedAt: "2026-09-01",
      interaction: {
        occurredAt: "2026-08-10",
        reciprocity: "two_way",
        status: "confirmed",
      },
    });
    // Add works_at for Alex
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
    expect(res.targetPersonIds).toEqual(["person-vc-sarah", "person-vc-alex"]);
    expect(res.paths.length).toBe(2);
    const targetPersons = res.paths.map((p) => p.targetPersonId);
    expect(targetPersons).toContain("person-vc-sarah");
    expect(targetPersons).toContain("person-vc-alex");
  });

  it("27: Missing TargetInvestor returns structured error", () => {
    const res = generatePathsForTarget(
      pathwayDemoDataset,
      "target-nonexistent",
      REFERENCE_DATE
    );
    expect(res.disposition).toBe("no_known_path");
    expect(res.coldOutreachRequired).toBe(true);
    expect(res.paths).toEqual([]);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("not found in dataset");
  });

  it("28: TargetInvestor with zero candidatePersonIds returns structured error", () => {
    const invalidDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    invalidDataset.targetInvestors[0].candidatePersonIds = [];

    const res = generatePathsForTarget(
      invalidDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.disposition).toBe("no_known_path");
    expect(res.coldOutreachRequired).toBe(true);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("zero candidatePersonIds");
  });

  it("29: Invalid dataset returns structured errors rather than traversing", () => {
    const corruptDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    // Break bidirectional referential integrity
    corruptDataset.relationshipEvidence[0].relationshipId = "non-existent-rel";

    const res = generatePathsForTarget(
      corruptDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    expect(res.disposition).toBe("no_known_path");
    expect(res.coldOutreachRequired).toBe(true);
    expect(res.paths).toEqual([]);
    expect(res.errors.length).toBeGreaterThan(0);
    expect(res.errors[0]).toContain("Dataset integrity validation failed");
  });

  it("30: Person→organization structural edges cannot be used to bridge a route", () => {
    // Attempt to bridge route through organization: Founder -> Nexus -> Horizon -> Partner
    const testDataset: PathwayDataset = JSON.parse(
      JSON.stringify(pathwayDemoDataset)
    );
    // Remove direct relationships to Sarah
    testDataset.relationships = testDataset.relationships.filter(
      (r) => r.id !== "rel-marcus-sarah"
    );
    // Add org-nexus -> org-horizon relationship
    testDataset.relationships.push({
      id: "rel-nexus-horizon",
      from: { type: "organization", id: "org-nexus" },
      to: { type: "organization", id: "org-horizon-vc" },
      type: "invested_in",
      direction: "directed",
      evidenceIds: ["ev-nexus-horizon"],
    });
    testDataset.relationshipEvidence.push({
      id: "ev-nexus-horizon",
      relationshipId: "rel-nexus-horizon",
      type: "press_release",
      description: "Org partnership",
      observedAt: "2026-09-01",
    });

    const res = generatePathsForTarget(
      testDataset,
      "target-horizon",
      REFERENCE_DATE
    );
    // Cannot bridge through organizations!
    expect(res.paths).toEqual([]);
    expect(res.disposition).toBe("no_known_path");
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
