import {
  Relationship,
  RelationshipEvidence,
  EvidenceAccessClass,
} from "../../types/pathway";

export interface ObservabilityValidationResult {
  observable: boolean;
  accessClass: EvidenceAccessClass;
  reason: string;
}

/**
 * Centralized Evidence Observability Validation Helper (Batch 9)
 *
 * Enforces Core Invariants:
 * 1. EVIDENCE EXISTENCE != ARCSTONE OBSERVABILITY
 * 2. PRIVATE COMMUNICATION != ACCESSIBLE EVIDENCE
 * 3. CONNECTED FOUNDER DATA != THIRD-PARTY INBOX ACCESS
 */
export function validateEvidenceObservability(
  evidence: RelationshipEvidence,
  relationship: Relationship,
  campaignFounderPersonIds?: string[]
): ObservabilityValidationResult {
  const provenance = evidence.provenance;
  const accessClass: EvidenceAccessClass = provenance?.accessClass ?? (
    evidence.type === "email_history" ||
    evidence.type === "meeting_history" ||
    evidence.type === "crm_history"
      ? "first_party_private"
      : evidence.type === "user_reported"
      ? "user_asserted"
      : "public"
  );

  if (accessClass === "first_party_private") {
    const principal = provenance?.sourcePrincipalPersonId;
    if (!principal) {
      return {
        observable: false,
        accessClass,
        reason: "First-party private evidence missing source principal person ID.",
      };
    }

    if (
      campaignFounderPersonIds &&
      campaignFounderPersonIds.length > 0 &&
      !campaignFounderPersonIds.includes(principal)
    ) {
      return {
        observable: false,
        accessClass,
        reason: `Source principal "${principal}" is not an authorized campaign founder.`,
      };
    }

    const fromId = relationship.from.id;
    const toId = relationship.to.id;

    if (principal !== fromId && principal !== toId) {
      return {
        observable: false,
        accessClass,
        reason: `First-party private evidence principal "${principal}" is not a direct endpoint of relationship (${fromId} -> ${toId}).`,
      };
    }

    return {
      observable: true,
      accessClass,
      reason: "Observable first-party private interaction.",
    };
  }

  if (accessClass === "consented_third_party_private") {
    if (!provenance?.sourcePrincipalPersonId || !provenance?.authorizedByPersonId) {
      return {
        observable: false,
        accessClass,
        reason: "Third-party private evidence requires explicit source principal and authorizer.",
      };
    }
    return {
      observable: true,
      accessClass,
      reason: "Observable consented third-party private interaction.",
    };
  }

  if (accessClass === "user_asserted") {
    return {
      observable: true,
      accessClass,
      reason: "Observable user assertion.",
    };
  }

  // Public access class
  return {
    observable: true,
    accessClass: "public",
    reason: "Observable public context evidence.",
  };
}
