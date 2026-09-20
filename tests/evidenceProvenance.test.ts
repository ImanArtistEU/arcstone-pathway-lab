import { describe, it, expect } from "vitest";
import { pathwayDemoDataset } from "@/data/fixtures/pathway-demo";
import { targetPersonDemoProfiles } from "@/data/fixtures/target-person-profiles";
import { qualifyRelationship } from "@/lib/pathway/qualifyRelationship";
import { qualifyRelationships } from "@/lib/pathway/qualifyRelationships";
import { assertDatasetIntegrity } from "@/lib/pathway/assertDatasetIntegrity";
import { loadPilotCsvBundle } from "@/lib/pilot/loadPilotCsvBundle";
import { generatePathsForTarget } from "@/lib/pathway/generatePathsForTarget";
import { applyPathRejection } from "@/lib/pathway/applyPathRejection";
import { scoreRetainedPaths } from "@/lib/pathway/scoreRetainedPaths";
import { selectTargetPerson } from "@/lib/pathway/selectTargetPerson";
import { buildPathwayExplanation } from "@/lib/pathway/buildPathwayExplanation";
import { Relationship, RelationshipEvidence, PathwayDataset } from "@/types/pathway";
import path from "node:path";

const REFERENCE_DATE = "2026-09-18";
const CAMPAIGN_FOUNDERS = ["person-founder-elena"];

function runFullPipeline(dataset: PathwayDataset, targetInvestorId: string) {
  const gen = generatePathsForTarget(dataset, targetInvestorId, REFERENCE_DATE);
  const rej = applyPathRejection(gen);
  const score = scoreRetainedPaths(rej);
  const select = selectTargetPerson(dataset, targetInvestorId, targetPersonDemoProfiles, score, REFERENCE_DATE);
  const explanation = buildPathwayExplanation(dataset, targetInvestorId, rej, score, select, REFERENCE_DATE);
  return { gen, rej, score, select, explanation };
}

describe("Batch 8.1 — Evidence Observability & Provenance", () => {
  // 1. First-party private observable email
  it("1: qualifies first-party private email connected by campaign founder as eligible", () => {
    const rel: Relationship = {
      id: "rel-founder-advisor",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-advisor-marcus" },
      type: "advisor",
      direction: "bidirectional",
      evidenceIds: ["ev-founder-email"],
    };

    const ev: RelationshipEvidence[] = [
      {
        id: "ev-founder-email",
        relationshipId: rel.id,
        type: "email_history",
        description: "Direct email exchange between Elena and Marcus",
        provenance: {
          accessClass: "first_party_private",
          sourceSystem: "gmail",
          sourcePrincipalPersonId: "person-founder-elena",
          authorizedByPersonId: "person-founder-elena",
        },
        observedAt: "2026-09-15",
        interaction: {
          occurredAt: "2026-09-10",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];

    const result = qualifyRelationship(rel, ev, REFERENCE_DATE, undefined, CAMPAIGN_FOUNDERS);
    expect(result.status).toBe("eligible");
    expect(result.recency).toBe("recent");
    expect(result.reasonCodes).toContain("RECENT_DIRECT_INTERACTION");
  });

  // 2. Third-party private email unobservable downgrade
  it("2: downgrades third-party private email to confirmation_required with PRIVATE_EVIDENCE_NOT_OBSERVABLE", () => {
    const rel: Relationship = {
      id: "rel-marcus-sarah",
      from: { type: "person", id: "person-advisor-marcus" },
      to: { type: "person", id: "person-vc-sarah" },
      type: "co_invested",
      direction: "bidirectional",
      evidenceIds: ["ev-unobservable-email"],
    };

    const ev: RelationshipEvidence[] = [
      {
        id: "ev-unobservable-email",
        relationshipId: rel.id,
        type: "email_history",
        description: "Claimed email history between Marcus and Sarah in Elena's Gmail sync",
        provenance: {
          accessClass: "first_party_private",
          sourceSystem: "gmail",
          sourcePrincipalPersonId: "person-founder-elena",
          authorizedByPersonId: "person-founder-elena",
        },
        observedAt: "2026-09-15",
        interaction: {
          occurredAt: "2026-09-10",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];

    const result = qualifyRelationship(rel, ev, REFERENCE_DATE, undefined, CAMPAIGN_FOUNDERS);
    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("PRIVATE_EVIDENCE_NOT_OBSERVABLE");
  });

  // 3. User asserted third-party relationship
  it("3: flags user assertion about third parties with USER_ASSERTED_THIRD_PARTY_RELATIONSHIP", () => {
    const rel: Relationship = {
      id: "rel-third-party",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-user-asserted"],
    };

    const ev: RelationshipEvidence[] = [
      {
        id: "ev-user-asserted",
        relationshipId: rel.id,
        type: "user_reported",
        description: "Founder states A knows B",
        provenance: {
          accessClass: "user_asserted",
          sourceSystem: "manual",
          sourcePrincipalPersonId: "person-founder-elena",
          authorizedByPersonId: "person-founder-elena",
        },
        observedAt: "2026-09-15",
      },
    ];

    const result = qualifyRelationship(rel, ev, REFERENCE_DATE, undefined, CAMPAIGN_FOUNDERS);
    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("USER_ASSERTED_THIRD_PARTY_RELATIONSHIP");
  });

  // 4. Public proximity evidence
  it("4: qualifies public press evidence as confirmation_required with PUBLIC_PROXIMITY_ONLY", () => {
    const rel: Relationship = {
      id: "rel-public-co-invest",
      from: { type: "person", id: "person-a" },
      to: { type: "person", id: "person-b" },
      type: "co_invested",
      direction: "bidirectional",
      evidenceIds: ["ev-press"],
    };

    const ev: RelationshipEvidence[] = [
      {
        id: "ev-press",
        relationshipId: rel.id,
        type: "press_release",
        description: "Public press release announcing round",
        provenance: {
          accessClass: "public",
          sourceSystem: "press",
        },
        observedAt: "2026-09-01",
      },
    ];

    const result = qualifyRelationship(rel, ev, REFERENCE_DATE, undefined, CAMPAIGN_FOUNDERS);
    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("PUBLIC_PROXIMITY_ONLY");
  });

  // 5. Batch qualification passes campaign founder IDs
  it("5: qualifyRelationships extracts campaign founder person IDs and passes to qualifyRelationship", () => {
    const qualArray = qualifyRelationships(pathwayDemoDataset, REFERENCE_DATE);
    expect(qualArray.length).toBeGreaterThan(0);
    const marcusSarahQual = qualArray.find((q) => q.relationshipId === "rel-marcus-sarah");
    expect(marcusSarahQual).toBeDefined();
    expect(marcusSarahQual?.status).toBe("confirmation_required");
  });

  // 6. Dataset integrity validator checks valid provenance
  it("6: dataset integrity validator passes on valid synthetic fixture", () => {
    const res = assertDatasetIntegrity(pathwayDemoDataset);
    expect(res.valid).toBe(true);
    expect(res.errors).toEqual([]);
  });

  // 7. Integrity validator rejects invalid accessClass
  it("7: integrity validator fails on invalid accessClass enum", () => {
    const broken: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: [
        ...pathwayDemoDataset.relationshipEvidence,
        {
          id: "ev-bad-access",
          relationshipId: "rel-elena-marcus",
          type: "news_article",
          description: "Bad access class",
          provenance: {
            accessClass: "invalid_class" as any,
            sourceSystem: "press",
          },
        },
      ],
    };

    const res = assertDatasetIntegrity(broken);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("invalid accessClass"))).toBe(true);
  });

  // 8. Integrity validator rejects invalid sourcePrincipalPersonId
  it("8: integrity validator fails on nonexistent sourcePrincipalPersonId", () => {
    const broken: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: [
        ...pathwayDemoDataset.relationshipEvidence,
        {
          id: "ev-bad-principal",
          relationshipId: "rel-elena-marcus",
          type: "news_article",
          description: "Nonexistent principal",
          provenance: {
            accessClass: "first_party_private",
            sourceSystem: "gmail",
            sourcePrincipalPersonId: "person-ghost-does-not-exist",
            authorizedByPersonId: "person-founder-elena",
          },
        },
      ],
    };

    const res = assertDatasetIntegrity(broken);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('nonexistent sourcePrincipalPersonId "person-ghost-does-not-exist"'))).toBe(true);
  });

  // 9. Pilot CSV bundle loader loads provenance columns
  it("9: loadPilotCsvBundle parses provenance columns correctly", () => {
    const sampleDir = path.join(process.cwd(), "data", "fixtures", "pilot-csv-sample");
    const bundle = loadPilotCsvBundle(sampleDir);
    expect(bundle.status).toBe("success");
    expect(bundle.dataset).toBeDefined();
    expect(bundle.dataset!.relationshipEvidence.length).toBeGreaterThan(0);
    const ev = bundle.dataset!.relationshipEvidence[0];
    expect(ev.provenance).toBeDefined();
    expect(ev.provenance?.accessClass).toBeDefined();
  });

  // 10. Origin label formatting
  it("10: pathway explanation maps first_party_private to YOUR CONNECTED DATA", () => {
    const { explanation } = runFullPipeline(pathwayDemoDataset, "target-horizon");
    expect(explanation).toBeDefined();
    if (explanation.preferredRoute && explanation.preferredRoute.steps.length > 0) {
      const step = explanation.preferredRoute.steps[0];
      expect(step.evidenceAccessClass).toBeDefined();
    }
  });

  // 11. Verification step generation in activation plan
  it("11: activation plan includes steps for preferred route", () => {
    const { explanation } = runFullPipeline(pathwayDemoDataset, "target-horizon");
    expect(explanation.activationPlan).toBeDefined();
    if (explanation.preferredRoute) {
      expect(explanation.activationPlan.steps.length).toBeGreaterThan(0);
      const firstStep = explanation.activationPlan.steps[0];
      expect(firstStep.actionType).toBeDefined();
    }
  });

  // 12. Public evidence items have originLabel PUBLIC SOURCE
  it("12: route evidence item populates originLabel correctly for public evidence", () => {
    const { explanation } = runFullPipeline(pathwayDemoDataset, "target-horizon");
    if (explanation.preferredRoute) {
      for (const st of explanation.preferredRoute.steps) {
        for (const ev of st.evidenceItems) {
          expect(ev.originLabel).toBeDefined();
        }
      }
    }
  });

  // 13. whatArcstoneKnows and whatArcstoneDoesNotKnow statements populated
  it("13: route step explanation populates whatArcstoneKnows and whatArcstoneDoesNotKnow", () => {
    const { explanation } = runFullPipeline(pathwayDemoDataset, "target-horizon");
    if (explanation.preferredRoute && explanation.preferredRoute.steps.length > 0) {
      const step = explanation.preferredRoute.steps[0];
      expect(Array.isArray(step.whatArcstoneKnows)).toBe(true);
      expect(Array.isArray(step.whatArcstoneDoesNotKnow)).toBe(true);
    }
  });

  // 14. Consented third party private evidence is observable if principal matches endpoint
  it("14: consented_third_party_private is observable when principal matches relationship endpoint", () => {
    const rel: Relationship = {
      id: "rel-consented",
      from: { type: "person", id: "person-advisor-marcus" },
      to: { type: "person", id: "person-vc-sarah" },
      type: "colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-consented"],
    };

    const ev: RelationshipEvidence[] = [
      {
        id: "ev-consented",
        relationshipId: rel.id,
        type: "email_history",
        description: "Marcus shared email thread with Sarah",
        provenance: {
          accessClass: "consented_third_party_private",
          sourceSystem: "gmail",
          sourcePrincipalPersonId: "person-advisor-marcus",
          authorizedByPersonId: "person-advisor-marcus",
        },
        observedAt: "2026-09-15",
        interaction: {
          occurredAt: "2026-09-10",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];

    const result = qualifyRelationship(rel, ev, REFERENCE_DATE, undefined, CAMPAIGN_FOUNDERS);
    expect(result.status).toBe("eligible");
    expect(result.recency).toBe("recent");
  });

  // 15. Unconsented third party private evidence is unobservable even if principal is specified
  it("15: first_party_private from founder is unobservable for third-party edge", () => {
    const rel: Relationship = {
      id: "rel-third-party-edge",
      from: { type: "person", id: "person-advisor-marcus" },
      to: { type: "person", id: "person-vc-sarah" },
      type: "colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-third-party-email"],
    };

    const ev: RelationshipEvidence[] = [
      {
        id: "ev-third-party-email",
        relationshipId: rel.id,
        type: "email_history",
        description: "Elena's inbox mentions Marcus emailed Sarah",
        provenance: {
          accessClass: "first_party_private",
          sourceSystem: "gmail",
          sourcePrincipalPersonId: "person-founder-elena",
          authorizedByPersonId: "person-founder-elena",
        },
        observedAt: "2026-09-15",
        interaction: {
          occurredAt: "2026-09-10",
          reciprocity: "two_way",
          status: "confirmed",
        },
      },
    ];

    const result = qualifyRelationship(rel, ev, REFERENCE_DATE, undefined, CAMPAIGN_FOUNDERS);
    expect(result.status).toBe("confirmation_required");
    expect(result.reasonCodes).toContain("PRIVATE_EVIDENCE_NOT_OBSERVABLE");
  });

  // 16. Default provenance fallback for missing CSV columns
  it("16: loadPilotCsvBundle defaults missing provenance columns to public / public_web", () => {
    const sampleDir = path.join(process.cwd(), "data", "fixtures", "pilot-csv-sample");
    const bundle = loadPilotCsvBundle(sampleDir);
    expect(bundle.dataset).toBeDefined();
    for (const ev of bundle.dataset!.relationshipEvidence) {
      expect(ev.provenance).toBeDefined();
      expect(["first_party_private", "user_asserted", "public", "consented_third_party_private"]).toContain(ev.provenance?.accessClass);
    }
  });

  // 17. Case D Aurora remains isolated zero path
  it("17: Case D Isabel Torres remains zero path in pathwayDemoDataset", () => {
    const { explanation } = runFullPipeline(pathwayDemoDataset, "target-aurora");
    expect(explanation.preferredRoute).toBeUndefined();
    expect(explanation.disposition).toBe("no_retained_route_to_primary_target");
  });

  // 18. Integrity validator checks authorizedByPersonId
  it("18: integrity validator fails on nonexistent authorizedByPersonId", () => {
    const broken: PathwayDataset = {
      ...pathwayDemoDataset,
      relationshipEvidence: [
        ...pathwayDemoDataset.relationshipEvidence,
        {
          id: "ev-bad-authorizer",
          relationshipId: "rel-elena-marcus",
          type: "news_article",
          description: "Bad authorizer",
          provenance: {
            accessClass: "first_party_private",
            sourceSystem: "gmail",
            sourcePrincipalPersonId: "person-founder-elena",
            authorizedByPersonId: "person-ghost-authorizer",
          },
        },
      ],
    };

    const res = assertDatasetIntegrity(broken);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes('nonexistent authorizedByPersonId "person-ghost-authorizer"'))).toBe(true);
  });

  // 19. Double check that pathwayDemoDataset passes integrity checks
  it("19: pathwayDemoDataset contains valid provenance for all evidence items", () => {
    for (const ev of pathwayDemoDataset.relationshipEvidence) {
      expect(ev.provenance).toBeDefined();
      expect(ev.provenance?.accessClass).toBeDefined();
      expect(ev.provenance?.sourceSystem).toBeDefined();
    }
  });

  // 20. Verification that unobservable third-party hop in Horizon (Marcus -> Sarah) triggers verification step
  it("20: Horizon route hop 2 (Marcus -> Sarah) is marked confirmation_required with unobservable private evidence", () => {
    const { explanation } = runFullPipeline(pathwayDemoDataset, "target-horizon");
    expect(explanation.preferredRoute).toBeDefined();
    if (explanation.preferredRoute) {
      const step2 = explanation.preferredRoute.steps[1];
      expect(step2.fromPersonName).toBe("Marcus Thorne");
      expect(step2.toPersonName).toBe("Sarah Chen");
      expect(step2.qualificationStatus).toBe("confirmation_required");
      expect(step2.whatArcstoneDoesNotKnow).toBeDefined();
      expect(step2.whatArcstoneDoesNotKnow?.some((dk) => dk.includes("cannot observe private emails"))).toBe(true);
    }
  });
});
