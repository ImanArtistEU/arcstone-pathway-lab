import {
  Relationship,
  RelationshipEvidence,
  RelationshipQualification,
  EvidenceSummary,
  RecencyBucket,
  QualificationReasonCode,
} from "@/types/pathway";
import {
  QualificationPolicy,
  DEFAULT_QUALIFICATION_POLICY,
  classifyRelationshipType,
  classifyEvidenceType,
} from "./qualificationPolicy";

/**
 * Computes the latest date of relevant interaction from evidence and relationship context.
 *
 * Relevant recency prioritizes:
 * - direct_interaction evidence (email_history, meeting_history)
 * - founder_asserted/internal evidence (crm_history, user_reported)
 * - explicit endedAt/lastObservedAt for historical interpersonal relationships (former_colleague)
 *
 * Public context (crawled websites, press releases) and platform links (LinkedIn)
 * are NOT treated as interpersonal interaction dates.
 */
function findLatestRelevantInteractionAt(
  relationship: Relationship,
  evidenceList: RelationshipEvidence[]
): string | undefined {
  const interactionDates: string[] = [];

  for (const ev of evidenceList) {
    const cat = classifyEvidenceType(ev.type);
    if ((cat === "direct_interaction" || cat === "founder_asserted") && ev.observedAt) {
      interactionDates.push(ev.observedAt);
    }
  }

  // If no direct or internal evidence has an observed date, check relationship metadata
  // for historical interpersonal relationships (e.g. former_colleague endedAt)
  const relClass = classifyRelationshipType(relationship.type);
  if (interactionDates.length === 0 && relClass === "interpersonal") {
    if (relationship.endedAt) {
      interactionDates.push(relationship.endedAt);
    } else if (relationship.lastObservedAt && relationship.type === "former_colleague") {
      interactionDates.push(relationship.lastObservedAt);
    }
  }

  if (interactionDates.length === 0) {
    return undefined;
  }

  // Sort descending to find the most recent date
  interactionDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return interactionDates[0];
}

/**
 * Computes elapsed days between referenceDate and interactionDate, returning the appropriate RecencyBucket.
 */
function computeRecency(
  interactionDate: string | undefined,
  referenceDate: string | Date,
  policy: QualificationPolicy
): RecencyBucket {
  if (!interactionDate) {
    return "unknown";
  }

  const refMs = new Date(referenceDate).getTime();
  const intMs = new Date(interactionDate).getTime();

  if (isNaN(refMs) || isNaN(intMs)) {
    return "unknown";
  }

  const diffMs = refMs - intMs;
  const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (elapsedDays <= policy.recentMaxDays) {
    return "recent";
  }
  if (elapsedDays <= policy.agingMaxDays) {
    return "aging";
  }
  return "stale";
}

/**
 * Deterministically qualifies a single Relationship for fundraising introduction usability.
 *
 * Pure function:
 * - No network calls
 * - No machine clock dependencies (referenceDate required)
 * - No mutation of inputs
 * - No probabilistic scoring or AI
 */
export function qualifyRelationship(
  relationship: Relationship,
  evidenceList: RelationshipEvidence[],
  referenceDate: string | Date,
  policy: QualificationPolicy = DEFAULT_QUALIFICATION_POLICY
): RelationshipQualification {
  const relationshipClass = classifyRelationshipType(relationship.type);

  // 1. Evidence summary counts
  const evidenceSummary: EvidenceSummary = {
    total: evidenceList.length,
    directInteraction: 0,
    founderAsserted: 0,
    publicContext: 0,
    platformSignal: 0,
  };

  for (const ev of evidenceList) {
    const category = classifyEvidenceType(ev.type);
    if (category === "direct_interaction") evidenceSummary.directInteraction++;
    else if (category === "founder_asserted") evidenceSummary.founderAsserted++;
    else if (category === "public_context") evidenceSummary.publicContext++;
    else if (category === "platform_signal") evidenceSummary.platformSignal++;
  }

  // 2. Interaction recency determination
  const latestRelevantInteractionAt = findLatestRelevantInteractionAt(
    relationship,
    evidenceList
  );
  const recency = computeRecency(latestRelevantInteractionAt, referenceDate, policy);

  // 3. RULE A: STRUCTURAL EDGE
  if (relationshipClass === "structural") {
    return {
      relationshipId: relationship.id,
      relationshipClass: "structural",
      status: "structural",
      recency,
      latestRelevantInteractionAt,
      evidenceSummary,
      reasonCodes: ["STRUCTURAL_RELATIONSHIP"],
      explanation:
        "Structural relationship establishes organizational or economic context rather than an interpersonal introduction capability.",
    };
  }

  // 4. RULE B: NO EVIDENCE
  if (evidenceSummary.total === 0) {
    return {
      relationshipId: relationship.id,
      relationshipClass,
      status: "ineligible",
      recency: "unknown",
      latestRelevantInteractionAt: undefined,
      evidenceSummary,
      reasonCodes: ["NO_EVIDENCE"],
      explanation:
        "Relationship has no supporting evidence records and cannot be qualified for introductions.",
    };
  }

  // 5. RULE C: LINKEDIN ONLY
  if (
    relationship.type === "linkedin_connection" &&
    evidenceSummary.platformSignal === evidenceSummary.total
  ) {
    return {
      relationshipId: relationship.id,
      relationshipClass: "network_signal",
      status: "confirmation_required",
      recency: "unknown",
      latestRelevantInteractionAt: undefined,
      evidenceSummary,
      reasonCodes: ["LINKEDIN_ONLY", "NO_DIRECT_INTERACTION"],
      explanation:
        "1st-degree LinkedIn connection without corroborating interaction records requires manual confirmation before introduction use.",
    };
  }

  // 6. RULE D & RULE I: NETWORK SIGNAL
  if (relationshipClass === "network_signal") {
    // If no direct interaction occurred
    if (evidenceSummary.directInteraction === 0) {
      const reasonCodes: QualificationReasonCode[] =
        evidenceSummary.publicContext > 0
          ? ["PUBLIC_CONTEXT_ONLY", "NETWORK_SIGNAL_ONLY", "NO_DIRECT_INTERACTION"]
          : ["NETWORK_SIGNAL_ONLY", "NO_DIRECT_INTERACTION"];

      return {
        relationshipId: relationship.id,
        relationshipClass: "network_signal",
        status: "confirmation_required",
        recency,
        latestRelevantInteractionAt,
        evidenceSummary,
        reasonCodes,
        explanation:
          "Network signal or public co-occurrence without direct interaction evidence requires manual confirmation before introduction use.",
      };
    }

    // Direct interaction exists on network signal edge (e.g. co-investors with verified email/meeting exchange)
    if (recency === "recent") {
      return {
        relationshipId: relationship.id,
        relationshipClass: "network_signal",
        status: "eligible",
        recency,
        latestRelevantInteractionAt,
        evidenceSummary,
        reasonCodes: ["RECENT_DIRECT_INTERACTION"],
        explanation:
          "Network relationship is corroborated by recent direct interaction records.",
      };
    }

    if (recency === "aging") {
      return {
        relationshipId: relationship.id,
        relationshipClass: "network_signal",
        status: "confirmation_required",
        recency,
        latestRelevantInteractionAt,
        evidenceSummary,
        reasonCodes: ["AGING_INTERACTION"],
        explanation:
          "Direct interaction is aging (between 366 and 730 days old) and requires confirmation of current responsiveness.",
      };
    }

    if (recency === "stale") {
      return {
        relationshipId: relationship.id,
        relationshipClass: "network_signal",
        status: "confirmation_required",
        recency,
        latestRelevantInteractionAt,
        evidenceSummary,
        reasonCodes: ["STALE_INTERACTION"],
        explanation:
          "Direct interaction is stale (over 730 days old) and requires confirmation before introduction use.",
      };
    }

    return {
      relationshipId: relationship.id,
      relationshipClass: "network_signal",
      status: "confirmation_required",
      recency,
      latestRelevantInteractionAt,
      evidenceSummary,
      reasonCodes: ["NO_DIRECT_INTERACTION"],
      explanation: "Network relationship requires confirmation.",
    };
  }

  // 7. INTERPERSONAL RELATIONSHIPS (advisor, mentor, colleague, former_colleague, etc.)
  // RULE G: Stale interaction (> 730 days)
  if (recency === "stale") {
    return {
      relationshipId: relationship.id,
      relationshipClass: "interpersonal",
      status: "confirmation_required",
      recency: "stale",
      latestRelevantInteractionAt,
      evidenceSummary,
      reasonCodes: ["STALE_INTERACTION"],
      explanation:
        "Interpersonal interaction is historical (> 730 days old) and requires confirmation of current responsiveness.",
    };
  }

  // RULE H: Aging interaction (366–730 days)
  if (recency === "aging") {
    return {
      relationshipId: relationship.id,
      relationshipClass: "interpersonal",
      status: "confirmation_required",
      recency: "aging",
      latestRelevantInteractionAt,
      evidenceSummary,
      reasonCodes: ["AGING_INTERACTION"],
      explanation:
        "Interpersonal interaction is aging (366–730 days old) and requires confirmation before use in an active campaign.",
    };
  }

  // RULE E: Recent direct interaction
  if (evidenceSummary.directInteraction > 0 && recency === "recent") {
    return {
      relationshipId: relationship.id,
      relationshipClass: "interpersonal",
      status: "eligible",
      recency: "recent",
      latestRelevantInteractionAt,
      evidenceSummary,
      reasonCodes: ["RECENT_DIRECT_INTERACTION"],
      explanation:
        "Interpersonal relationship is verified by recent direct interaction records.",
    };
  }

  // RULE F: Recent founder-asserted internal evidence
  if (evidenceSummary.founderAsserted > 0 && recency === "recent") {
    return {
      relationshipId: relationship.id,
      relationshipClass: "interpersonal",
      status: "eligible",
      recency: "recent",
      latestRelevantInteractionAt,
      evidenceSummary,
      reasonCodes: ["RECENT_INTERNAL_EVIDENCE"],
      explanation:
        "Interpersonal relationship is verified by recent founder-asserted records or active CRM history.",
    };
  }

  // Interpersonal with public context only (no direct interaction or internal records)
  if (evidenceSummary.publicContext > 0 && evidenceSummary.directInteraction === 0 && evidenceSummary.founderAsserted === 0) {
    return {
      relationshipId: relationship.id,
      relationshipClass: "interpersonal",
      status: "confirmation_required",
      recency,
      latestRelevantInteractionAt,
      evidenceSummary,
      reasonCodes: ["PUBLIC_CONTEXT_ONLY", "NO_DIRECT_INTERACTION"],
      explanation:
        "Interpersonal relationship supported only by public context without direct interaction records requires confirmation.",
    };
  }

  // Default fallback for uncorroborated interpersonal relationship
  return {
    relationshipId: relationship.id,
    relationshipClass: "interpersonal",
    status: "confirmation_required",
    recency,
    latestRelevantInteractionAt,
    evidenceSummary,
    reasonCodes: ["NO_DIRECT_INTERACTION"],
    explanation:
      "Interpersonal relationship lacks fresh direct interaction and requires confirmation.",
  };
}
