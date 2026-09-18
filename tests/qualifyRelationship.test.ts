import { describe, it, expect } from "vitest";
import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { qualifyRelationship } from "@/lib/pathway/qualifyRelationship";
import { qualifyRelationships } from "@/lib/pathway/qualifyRelationships";
import { Relationship, RelationshipEvidence } from "@/types/pathway";

const REFERENCE_DATE = "2026-09-18";

function getFixtureRel(id: string): Relationship {
  const rel = pathwayDemoDataset.relationships.find((r) => r.id === id);
  if (!rel) throw new Error(`Relationship ${id} not found in fixture`);
  return rel;
}

function getFixtureEvidence(ids: string[]): RelationshipEvidence[] {
  return pathwayDemoDataset.relationshipEvidence.filter((e) => ids.includes(e.id));
}

describe("Deterministic Relationship Qualification Engine", () => {
  it("1: Founder ↔ active Advisor qualifies as eligible", () => {
    const rel = getFixtureRel("rel-elena-marcus");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, REFERENCE_DATE);

    expect(result.status).toBe("eligible");
    expect(result.recency).toBe("recent");
    expect(result.reasonCodes).toContain("RECENT_DIRECT_INTERACTION");
  });

  it("2: Advisor Marcus ↔ Sarah after direct 2026 interaction evidence qualifies as eligible", () => {
    const rel = getFixtureRel("rel-marcus-sarah");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, REFERENCE_DATE);

    expect(result.status).toBe("eligible");
    expect(result.recency).toBe("recent");
    expect(result.reasonCodes).toContain("RECENT_DIRECT_INTERACTION");
  });

  it("3: Recent LinkedIn-only Founder ↔ David qualifies as confirmation_required", () => {
    const rel = getFixtureRel("rel-elena-david");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("LINKEDIN_ONLY");
    expect(result.reasonCodes).toContain("NO_DIRECT_INTERACTION");
  });

  it("4: Verify LinkedIn recency does NOT make it eligible", () => {
    const rel = getFixtureRel("rel-elena-david");
    // Even with observation on the reference date itself
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-recent-linkedin",
        relationshipId: rel.id,
        type: "linkedin",
        description: "1st degree connection observed today",
        observedAt: REFERENCE_DATE,
      },
    ];
    const result = qualifyRelationship(rel, ev, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("LINKEDIN_ONLY");
    expect(result.reasonCodes).toContain("NO_DIRECT_INTERACTION");
  });

  it("5: Stale Founder ↔ former colleague qualifies as confirmation_required with STALE_INTERACTION", () => {
    const rel = getFixtureRel("rel-elena-tom");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.recency).toBe("stale");
    expect(result.reasonCodes).toContain("STALE_INTERACTION");
  });

  it("6: Stale former colleague ↔ investor qualifies as confirmation_required with STALE_INTERACTION", () => {
    const rel = getFixtureRel("rel-tom-clara");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.recency).toBe("stale");
    expect(result.reasonCodes).toContain("STALE_INTERACTION");
  });

  it("7: Person → current VC employer qualifies as structural", () => {
    const rel = getFixtureRel("rel-sarah-horizon");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, REFERENCE_DATE);

    expect(result.status).toBe("structural");
    expect(result.relationshipClass).toBe("structural");
    expect(result.reasonCodes).toContain("STRUCTURAL_RELATIONSHIP");
  });

  it("8: Founder → startup qualifies as structural", () => {
    const rel = getFixtureRel("rel-founder-nexus");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, REFERENCE_DATE);

    expect(result.status).toBe("structural");
    expect(result.relationshipClass).toBe("structural");
    expect(result.reasonCodes).toContain("STRUCTURAL_RELATIONSHIP");
  });

  it("9: Public co-investment with NO direct interaction evidence qualifies as confirmation_required", () => {
    const rel = getFixtureRel("rel-marcus-sarah");
    // Filter out direct interaction (ev-marcus-sarah-email), leaving only press and portfolio page
    const publicEv = getFixtureEvidence(rel.evidenceIds).filter(
      (e) => e.type !== "email_history" && e.type !== "meeting_history"
    );
    const result = qualifyRelationship(rel, publicEv, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("PUBLIC_CONTEXT_ONLY");
    expect(result.reasonCodes).toContain("NETWORK_SIGNAL_ONLY");
    expect(result.reasonCodes).toContain("NO_DIRECT_INTERACTION");
  });

  it("10: Multiple current public-context evidence objects WITHOUT direct interaction remain confirmation_required", () => {
    const testRel: Relationship = {
      id: "rel-test-public-only",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "co_invested",
      direction: "bidirectional",
      evidenceIds: ["ev-1", "ev-2", "ev-3", "ev-4", "ev-5"],
    };
    const publicEvidence: RelationshipEvidence[] = [
      { id: "ev-1", relationshipId: testRel.id, type: "press_release", description: "Article 1", observedAt: "2026-09-01" },
      { id: "ev-2", relationshipId: testRel.id, type: "news_article", description: "Article 2", observedAt: "2026-09-05" },
      { id: "ev-3", relationshipId: testRel.id, type: "portfolio_page", description: "Article 3", observedAt: "2026-09-10" },
      { id: "ev-4", relationshipId: testRel.id, type: "company_website", description: "Article 4", observedAt: "2026-09-12" },
      { id: "ev-5", relationshipId: testRel.id, type: "event_page", description: "Article 5", observedAt: "2026-09-15" },
    ];
    const result = qualifyRelationship(testRel, publicEvidence, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("PUBLIC_CONTEXT_ONLY");
    expect(result.reasonCodes).toContain("NO_DIRECT_INTERACTION");
  });

  it("11: Interpersonal relationship with no evidence qualifies as ineligible", () => {
    const testRel: Relationship = {
      id: "rel-test-no-ev",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "colleague",
      direction: "bidirectional",
      evidenceIds: [],
    };
    const result = qualifyRelationship(testRel, [], REFERENCE_DATE);

    expect(result.status).toBe("ineligible");
    expect(result.reasonCodes).toContain("NO_EVIDENCE");
  });

  it("12: Recent meeting/email interaction produces recency = recent", () => {
    const testRel: Relationship = {
      id: "rel-test-recent",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-meeting"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-meeting",
        relationshipId: testRel.id,
        type: "meeting_history",
        description: "Recent strategy sync",
        observedAt: "2026-08-19",
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.recency).toBe("recent");
    expect(result.status).toBe("eligible");
  });

  it("13: Aging evidence (366–730 days) produces recency = aging and status = confirmation_required", () => {
    const testRel: Relationship = {
      id: "rel-test-aging",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-aging"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-aging",
        relationshipId: testRel.id,
        type: "meeting_history",
        description: "Meeting 500 days ago",
        observedAt: "2025-05-06",
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.recency).toBe("aging");
    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("AGING_INTERACTION");
  });

  it("14: Evidence > 730 days old produces recency = stale and status = confirmation_required", () => {
    const testRel: Relationship = {
      id: "rel-test-stale",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-stale"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-stale",
        relationshipId: testRel.id,
        type: "meeting_history",
        description: "Meeting 800 days ago",
        observedAt: "2024-07-10",
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.recency).toBe("stale");
    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("STALE_INTERACTION");
  });

  it("15: Verify qualification does not mutate input dataset or relationship objects", () => {
    const relCopy = JSON.parse(JSON.stringify(pathwayDemoDataset.relationships[0]));
    const evCopy = JSON.parse(JSON.stringify(pathwayDemoDataset.relationshipEvidence.slice(0, 2)));

    Object.freeze(relCopy);
    Object.freeze(evCopy);

    expect(() => {
      qualifyRelationship(relCopy, evCopy, REFERENCE_DATE);
    }).not.toThrow();

    const datasetCopy = JSON.parse(JSON.stringify(pathwayDemoDataset));
    Object.freeze(datasetCopy.relationships);
    Object.freeze(datasetCopy.relationshipEvidence);

    expect(() => {
      qualifyRelationships(datasetCopy, REFERENCE_DATE);
    }).not.toThrow();
  });
});
