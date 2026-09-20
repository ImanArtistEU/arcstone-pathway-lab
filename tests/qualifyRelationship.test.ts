import { describe, it, expect } from "vitest";
import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import {
  oneWayOutboundRelationship,
  oneWayOutboundEvidence,
} from "@/data/fixtures/qualification-edge-cases";
import { qualifyRelationship } from "@/lib/pathway/qualifyRelationship";
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

  it("2: Advisor Marcus ↔ Sarah with public co-investment evidence qualifies as confirmation_required", () => {
    const rel = getFixtureRel("rel-marcus-sarah");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("PUBLIC_PROXIMITY_ONLY");
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

  it("12: Recent confirmed two-way meeting/email interaction produces recency = recent", () => {
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
        observedAt: "2026-08-20",
        interaction: {
          occurredAt: "2026-08-19",
          reciprocity: "two_way",
          status: "confirmed",
        },
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
        observedAt: "2026-09-01",
        interaction: {
          occurredAt: "2025-05-06",
          reciprocity: "two_way",
          status: "confirmed",
        },
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
        observedAt: "2026-09-01",
        interaction: {
          occurredAt: "2024-07-10",
          reciprocity: "two_way",
          status: "confirmed",
        },
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
  });

  it("16: Founder sent unreplied email -> expected = confirmation_required + ONE_WAY_OUTREACH_ONLY", () => {
    const testRel: Relationship = {
      id: "rel-test-outbound",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-investor-x" },
      type: "other",
      direction: "directed",
      evidenceIds: ["ev-outbound-only"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-outbound-only",
        relationshipId: testRel.id,
        type: "email_history",
        description: "Outbound cold pitch sent last week with no response",
        observedAt: "2026-09-15",
        interaction: {
          occurredAt: "2026-09-12",
          reciprocity: "one_way",
          status: "confirmed",
        },
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("ONE_WAY_OUTREACH_ONLY");
    expect(result.status).not.toBe("eligible");
  });

  it("17: Meeting unconfirmed -> expected = confirmation_required + UNCONFIRMED_INTERACTION", () => {
    const testRel: Relationship = {
      id: "rel-test-unconfirmed-meeting",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-investor-y" },
      type: "other",
      direction: "directed",
      evidenceIds: ["ev-unconfirmed-invite"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-unconfirmed-invite",
        relationshipId: testRel.id,
        type: "meeting_history",
        description: "Calendar invitation scheduled with no attendance confirmation",
        observedAt: "2026-09-15",
        interaction: {
          occurredAt: "2026-09-14",
          reciprocity: "unknown",
          status: "unconfirmed",
        },
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("UNCONFIRMED_INTERACTION");
    expect(result.status).not.toBe("eligible");
  });

  it("18: Founder report observed recently, interaction occurred 2016 -> expected = stale + confirmation_required", () => {
    const testRel: Relationship = {
      id: "rel-test-historical-report",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-colleague-z" },
      type: "former_colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-recent-report-historical-int"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-recent-report-historical-int",
        relationshipId: testRel.id,
        type: "user_reported",
        description: "Founder onboarding intake completed today reporting collaboration in 2016",
        observedAt: "2026-09-18",
        interaction: {
          occurredAt: "2016-05-30",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.recency).toBe("stale");
    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("STALE_INTERACTION");
  });

  it("19: Interaction occurredAt in future (> referenceDate) -> expected = confirmation_required + FUTURE_INTERACTION_DATE", () => {
    const testRel: Relationship = {
      id: "rel-test-future",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-advisor-a" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-future"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-future",
        relationshipId: testRel.id,
        type: "meeting_history",
        description: "Meeting scheduled in the future",
        observedAt: "2026-09-18",
        interaction: {
          occurredAt: "2027-01-15",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.recency).toBe("unknown");
    expect(result.reasonCodes).toContain("FUTURE_INTERACTION_DATE");
  });

  it("20: Interaction occurredAt invalid date string -> expected = confirmation_required + INVALID_INTERACTION_DATE", () => {
    const testRel: Relationship = {
      id: "rel-test-invalid-date",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-advisor-b" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-invalid-date"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-invalid-date",
        relationshipId: testRel.id,
        type: "meeting_history",
        description: "Corrupted date string in calendar export",
        observedAt: "2026-09-18",
        interaction: {
          occurredAt: "not-a-valid-date-stamp",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.status).toBe("confirmation_required");
    expect(result.recency).toBe("unknown");
    expect(result.reasonCodes).toContain("INVALID_INTERACTION_DATE");
  });

  it("21: Confirmed two-way recent email qualifies as eligible", () => {
    const testRel: Relationship = {
      id: "rel-test-two-way-email",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-two-way-email"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-two-way-email",
        relationshipId: testRel.id,
        type: "email_history",
        description: "Back-and-forth discussion on seed round architecture",
        observedAt: "2026-09-01",
        interaction: {
          occurredAt: "2026-08-28",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.status).toBe("eligible");
    expect(result.recency).toBe("recent");
    expect(result.reasonCodes).toContain("RECENT_DIRECT_INTERACTION");
  });

  it("22: Confirmed two-way recent meeting qualifies as eligible", () => {
    const testRel: Relationship = {
      id: "rel-test-two-way-meeting",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-two-way-meeting"],
    };
    const ev: RelationshipEvidence[] = [
      {
        id: "ev-two-way-meeting",
        relationshipId: testRel.id,
        type: "meeting_history",
        description: "In-person breakfast advisory meeting",
        observedAt: "2026-09-12",
        interaction: {
          occurredAt: "2026-09-11",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];
    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.status).toBe("eligible");
    expect(result.recency).toBe("recent");
    expect(result.reasonCodes).toContain("RECENT_DIRECT_INTERACTION");
  });

  it("23: Isolated synthetic fixture outbound-only relationship qualifies as confirmation_required with ONE_WAY_OUTREACH_ONLY", () => {
    const result = qualifyRelationship(
      oneWayOutboundRelationship,
      [oneWayOutboundEvidence],
      REFERENCE_DATE
    );

    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("ONE_WAY_OUTREACH_ONLY");
    expect(result.status).not.toBe("eligible");
  });

  it("24: Invalid string referenceDate causes non-structural relationship to return confirmation_required with INVALID_REFERENCE_DATE", () => {
    const rel = getFixtureRel("rel-elena-marcus");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, "not-a-valid-date");

    expect(result.status).toBe("confirmation_required");
    expect(result.recency).toBe("unknown");
    expect(result.reasonCodes).toContain("INVALID_REFERENCE_DATE");
    expect(result.status).not.toBe("eligible");
  });

  it("25: Invalid Date object referenceDate causes non-structural relationship to return confirmation_required with INVALID_REFERENCE_DATE", () => {
    const rel = getFixtureRel("rel-elena-marcus");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, new Date("invalid-date-string"));

    expect(result.status).toBe("confirmation_required");
    expect(result.recency).toBe("unknown");
    expect(result.reasonCodes).toContain("INVALID_REFERENCE_DATE");
    expect(result.status).not.toBe("eligible");
  });

  it("26: Invalid referenceDate does NOT affect structural relationships (they remain structural)", () => {
    const rel = getFixtureRel("rel-sarah-horizon");
    const ev = getFixtureEvidence(rel.evidenceIds);
    const result = qualifyRelationship(rel, ev, "completely-invalid-date");

    expect(result.status).toBe("structural");
    expect(result.relationshipClass).toBe("structural");
    expect(result.reasonCodes).toContain("STRUCTURAL_RELATIONSHIP");
  });

  it("27: Reason provenance: relationship with older/one-way email but recent confirmed founder-asserted interaction uses RECENT_INTERNAL_EVIDENCE", () => {
    const testRel: Relationship = {
      id: "rel-test-provenance-internal",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-older-email", "ev-recent-crm"],
    };

    const ev: RelationshipEvidence[] = [
      {
        id: "ev-older-email",
        relationshipId: testRel.id,
        type: "email_history",
        description: "Older email thread from 2025",
        observedAt: "2025-06-01",
        interaction: {
          occurredAt: "2025-05-15",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
      {
        id: "ev-recent-crm",
        relationshipId: testRel.id,
        type: "crm_history",
        description: "Recent advisory sync recorded in founder CRM",
        observedAt: "2026-09-10",
        interaction: {
          occurredAt: "2026-09-08",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];

    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE);

    expect(result.status).toBe("eligible");
    expect(result.recency).toBe("recent");
    // Must be RECENT_INTERNAL_EVIDENCE because the winning interaction is founder_asserted
    expect(result.reasonCodes).toEqual(["RECENT_INTERNAL_EVIDENCE"]);
    expect(result.reasonCodes).not.toContain("RECENT_DIRECT_INTERACTION");
  });

  it("28: Reason provenance: relationship with older founder-asserted interaction but recent email_history uses RECENT_DIRECT_INTERACTION", () => {
    const testRel: Relationship = {
      id: "rel-test-provenance-direct",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "advisor",
      direction: "directed",
      evidenceIds: ["ev-older-crm", "ev-recent-email"],
    };

    const ev: RelationshipEvidence[] = [
      {
        id: "ev-older-crm",
        relationshipId: testRel.id,
        type: "crm_history",
        description: "Older sync logged in CRM",
        observedAt: "2025-06-01",
        interaction: {
          occurredAt: "2025-05-15",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
      {
        id: "ev-recent-email",
        relationshipId: testRel.id,
        type: "email_history",
        description: "Recent confirmed email coordination",
        provenance: {
          accessClass: "first_party_private",
          sourceSystem: "gmail",
          sourcePrincipalPersonId: "person-a",
          authorizedByPersonId: "person-a",
        },
        observedAt: "2026-09-10",
        interaction: {
          occurredAt: "2026-09-08",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];

    const result = qualifyRelationship(testRel, ev, REFERENCE_DATE, undefined, ["person-a"]);

    expect(result.status).toBe("eligible");
    expect(result.recency).toBe("recent");
    expect(result.reasonCodes).toEqual(["RECENT_DIRECT_INTERACTION"]);
    expect(result.reasonCodes).not.toContain("RECENT_INTERNAL_EVIDENCE");
  });
});
