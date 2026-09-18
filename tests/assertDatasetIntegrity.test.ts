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
        err.includes("nonexistent person \"person-ghost-does-not-exist\"")
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
        err.includes("nonexistent relationship \"rel-nonexistent-id\"")
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
        err.includes("Duplicate ID detected: \"person-founder-elena\"")
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
          createdAt: "2024-09-01T00:00:00Z",
        },
      ],
    };

    const result = assertDatasetIntegrity(brokenDataset);
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((err) =>
        err.includes("nonexistent startup \"startup-does-not-exist\"")
      )
    ).toBe(true);
    expect(
      result.errors.some((err) =>
        err.includes("nonexistent founder person \"person-ghost-founder\"")
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
        err.includes("nonexistent campaign \"camp-does-not-exist\"")
      )
    ).toBe(true);
    expect(
      result.errors.some((err) =>
        err.includes("nonexistent investor organization \"org-does-not-exist\"")
      )
    ).toBe(true);
    expect(
      result.errors.some((err) =>
        err.includes("nonexistent person \"person-does-not-exist\"")
      )
    ).toBe(true);
  });
});
