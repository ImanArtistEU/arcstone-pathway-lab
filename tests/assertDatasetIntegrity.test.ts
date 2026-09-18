import { describe, it, expect } from "vitest";
import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { assertDatasetIntegrity } from "@/lib/pathway/assertDatasetIntegrity";
import { PathwayDataset } from "@/types/pathway";

describe("Dataset Integrity Validator", () => {
  it("A: passes integrity validation on valid synthetic fixture", () => {
    const result = assertDatasetIntegrity(pathwayDemoDataset);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("B: fails when a relationship points to a nonexistent entity", () => {
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      relationships: [
        ...pathwayDemoDataset.relationships,
        {
          id: "rel-broken-target",
          from: { type: "person", id: "person-founder-elena" },
          to: { type: "person", id: "person-ghost-does-not-exist" },
          type: "advisor",
          direction: "directed",
          evidenceIds: [],
        },
      ],
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes('nonexistent person "person-ghost-does-not-exist"')
      )
    ).toBe(true);
  });

  it("C: fails when evidence points to a nonexistent relationship", () => {
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: [
        ...pathwayDemoDataset.relationshipEvidence,
        {
          id: "ev-orphan-evidence",
          relationshipId: "rel-nonexistent-id",
          type: "news_article",
          description: "Orphaned article reference without relationship",
        },
      ],
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes('nonexistent relationship "rel-nonexistent-id"')
      )
    ).toBe(true);
  });

  it("D: fails when duplicate IDs are present", () => {
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      people: [
        ...pathwayDemoDataset.people,
        {
          id: "person-founder-elena", // Duplicate ID
          firstName: "Duplicate",
          lastName: "Elena",
          fullName: "Duplicate Elena",
          currentOrganizationIds: [],
        },
      ],
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes('Duplicate ID detected: "person-founder-elena"')
      )
    ).toBe(true);
  });

  it("E: fails when a campaign points to a nonexistent startup or founder", () => {
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      campaigns: [
        {
          id: "camp-ghost",
          startupId: "startup-does-not-exist",
          founderPersonIds: ["person-ghost-founder"],
          round: "Series A",
          status: "active",
          createdAt: "2026-09-01T00:00:00Z",
        },
      ],
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes('nonexistent startup "startup-does-not-exist"')
      )
    ).toBe(true);
    expect(
      result.errors.some((err) =>
        err.includes('nonexistent founder person "person-ghost-founder"')
      )
    ).toBe(true);
  });

  it("F: fails when TargetInvestor points to nonexistent campaign, organization, or candidate person", () => {
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      targetInvestors: [
        {
          id: "target-invalid-refs",
          campaignId: "camp-does-not-exist",
          investorOrganizationId: "org-does-not-exist",
          candidatePersonIds: ["person-does-not-exist"],
          status: "ready",
        },
      ],
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes('nonexistent campaign "camp-does-not-exist"')
      )
    ).toBe(true);
    expect(
      result.errors.some((err) =>
        err.includes('nonexistent investor organization "org-does-not-exist"')
      )
    ).toBe(true);
    expect(
      result.errors.some((err) =>
        err.includes('nonexistent person "person-does-not-exist"')
      )
    ).toBe(true);
  });

  it("G: fails when Relationship A references an existing evidence object whose relationshipId belongs to Relationship B", () => {
    // ev-founder-nexus-web belongs to rel-founder-nexus.
    // rel-elena-david incorrectly references ev-founder-nexus-web in its evidenceIds.
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      relationships: pathwayDemoDataset.relationships.map((rel) =>
        rel.id === "rel-elena-david"
          ? {
              ...rel,
              evidenceIds: [...rel.evidenceIds, "ev-founder-nexus-web"],
            }
          : rel
      ),
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes(
          'Relationship "rel-elena-david" references evidence "ev-founder-nexus-web", but evidence "ev-founder-nexus-web" belongs to relationship "rel-founder-nexus"'
        )
      )
    ).toBe(true);
  });

  it("H: fails when an evidence object correctly names Relationship A but Relationship A does not list that evidence ID in its evidenceIds array", () => {
    // Add new evidence pointing to rel-founder-nexus, but omit it from rel-founder-nexus.evidenceIds.
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: [
        ...pathwayDemoDataset.relationshipEvidence,
        {
          id: "ev-unlisted-article",
          relationshipId: "rel-founder-nexus",
          type: "news_article",
          description: "Unlisted news article referencing relationship",
        },
      ],
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes(
          'Evidence "ev-unlisted-article" points to relationship "rel-founder-nexus", but relationship "rel-founder-nexus" does not list evidence "ev-unlisted-article" in its evidenceIds'
        )
      )
    ).toBe(true);
  });

  it("I: fails when interaction metadata has missing or empty occurredAt", () => {
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: pathwayDemoDataset.relationshipEvidence.map((ev) =>
        ev.id === "ev-elena-marcus-meetings"
          ? {
              ...ev,
              interaction: {
                occurredAt: "   ",
                reciprocity: "two_way",
                status: "confirmed",
              } as unknown as typeof ev.interaction,
            }
          : ev
      ),
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes('Evidence "ev-elena-marcus-meetings" contains interaction with missing or empty occurredAt.')
      )
    ).toBe(true);
  });

  it("J: fails when interaction metadata has invalid reciprocity runtime value", () => {
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: pathwayDemoDataset.relationshipEvidence.map((ev) =>
        ev.id === "ev-elena-marcus-meetings"
          ? {
              ...ev,
              interaction: {
                occurredAt: "2026-09-10",
                reciprocity: "invalid_reciprocity_value" as unknown as "two_way",
                status: "confirmed",
              },
            }
          : ev
      ),
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes('contains interaction with invalid reciprocity "invalid_reciprocity_value"')
      )
    ).toBe(true);
  });

  it("K: fails when interaction metadata has invalid status runtime value", () => {
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: pathwayDemoDataset.relationshipEvidence.map((ev) =>
        ev.id === "ev-elena-marcus-meetings"
          ? {
              ...ev,
              interaction: {
                occurredAt: "2026-09-10",
                reciprocity: "two_way",
                status: "invalid_status_value" as unknown as "confirmed",
              },
            }
          : ev
      ),
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes('contains interaction with invalid status "invalid_status_value"')
      )
    ).toBe(true);
  });

  it("L: fails when LinkedIn or public-context evidence contains interaction metadata", () => {
    const brokenDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: pathwayDemoDataset.relationshipEvidence.map((ev) =>
        ev.id === "ev-elena-david-linkedin"
          ? {
              ...ev,
              interaction: {
                occurredAt: "2026-09-10",
                reciprocity: "two_way",
                status: "confirmed",
              },
            }
          : ev
      ),
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes('cannot carry interaction metadata. Interaction metadata is only permitted on direct_interaction or founder_asserted evidence.')
      )
    ).toBe(true);
  });

  it("M: passes validation on valid confirmed two-way email interaction", () => {
    const validDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: pathwayDemoDataset.relationshipEvidence.map((ev) =>
        ev.id === "ev-marcus-sarah-email"
          ? {
              ...ev,
              interaction: {
                occurredAt: "2026-08-20",
                reciprocity: "two_way",
                status: "confirmed",
              },
            }
          : ev
      ),
    };

    const result = assertDatasetIntegrity(validDataset);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("Case D Fixture Contract: primary demo Case D (Isabel / Aurora) remains an isolated zero-path control", () => {
    // Assert required entities exist
    const isabel = pathwayDemoDataset.people.find((p) => p.id === "person-vc-isabel");
    const auroraOrg = pathwayDemoDataset.organizations.find((o) => o.id === "org-aurora-ventures");
    const auroraTarget = pathwayDemoDataset.targetInvestors.find((t) => t.id === "target-aurora");

    expect(isabel).toBeDefined();
    expect(auroraOrg).toBeDefined();
    expect(auroraTarget).toBeDefined();

    // Assert structural works_at relationship exists
    const isabelAffiliation = pathwayDemoDataset.relationships.find(
      (r) =>
        r.id === "rel-isabel-aurora" &&
        r.from.id === "person-vc-isabel" &&
        r.to.id === "org-aurora-ventures" &&
        r.type === "works_at"
    );
    expect(isabelAffiliation).toBeDefined();

    // Assert NO non-structural relationship involving Isabel exists in pathwayDemoDataset
    const nonStructuralIsabelRels = pathwayDemoDataset.relationships.filter(
      (r) =>
        (r.from.id === "person-vc-isabel" || r.to.id === "person-vc-isabel") &&
        r.type !== "works_at"
    );
    expect(nonStructuralIsabelRels).toEqual([]);

    // Assert NO direct relationship between Elena and Isabel exists
    const directElenaIsabelRels = pathwayDemoDataset.relationships.filter(
      (r) =>
        (r.from.id === "person-founder-elena" && r.to.id === "person-vc-isabel") ||
        (r.from.id === "person-vc-isabel" && r.to.id === "person-founder-elena")
    );
    expect(directElenaIsabelRels).toEqual([]);
  });
});
