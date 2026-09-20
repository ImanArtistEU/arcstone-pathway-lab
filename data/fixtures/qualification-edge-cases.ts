import { Relationship, RelationshipEvidence } from "@/types/pathway";

/**
 * Isolated synthetic fixture for qualification regression testing:
 * Founder sends an outbound pitch email with no response.
 *
 * This fixture demonstrates:
 * 1. OBSERVATION TIME ≠ INTERACTION TIME
 * 2. OUTREACH ≠ RECIPROCAL RELATIONSHIP
 *
 * It is intentionally isolated from `pathwayDemoDataset` to keep Case D
 * (Aurora Global Ventures / Isabel Torres) as a true zero-path negative control.
 */
export const oneWayOutboundRelationship: Relationship = {
  id: "rel-test-outbound-isolated",
  from: { type: "person", id: "person-founder-elena" },
  to: { type: "person", id: "person-vc-isabel" },
  type: "other",
  direction: "directed",
  evidenceIds: ["ev-test-outbound-isolated"],
  startedAt: "2026-09-14",
  lastObservedAt: "2026-09-15",
};

export const oneWayOutboundEvidence: RelationshipEvidence = {
  id: "ev-test-outbound-isolated",
  relationshipId: "rel-test-outbound-isolated",
  type: "email_history",
  description: "Isolated regression fixture: Founder sent cold pitch email with no reply received",
  provenance: {
    accessClass: "first_party_private",
    sourceSystem: "gmail",
    sourcePrincipalPersonId: "person-founder-elena",
    authorizedByPersonId: "person-founder-elena",
  },
  observedAt: "2026-09-15",
  interaction: {
    occurredAt: "2026-09-14",
    reciprocity: "one_way",
    status: "confirmed",
  },
  sourceName: "Founder Outbox Email Logs (Isolated Fixture)",
};
