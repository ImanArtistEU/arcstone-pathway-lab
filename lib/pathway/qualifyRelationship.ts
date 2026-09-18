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
 * Validates temporal interaction dates.
 * Returns true if valid timestamp and not in future relative to referenceDate.
 */
function parseDateMs(dateStr: string): number | null {
  const ms = new Date(dateStr).getTime();
  return isNaN(ms) ? null : ms;
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
  if (diffMs < 0) {
    // Future date
    return "unknown";
  }

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
 * Core Invariants:
 * 1. OBSERVATION TIME ≠ INTERACTION TIME
 *    observedAt is ingestion time; only interaction.occurredAt indicates human interaction.
 * 2. OUTREACH ≠ RECIPROCAL RELATIONSHIP
 *    One-way outreach (e.g. unreplied outbound email) does NOT qualify as eligible.
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
    confirmedTwoWayInteraction: 0,
    oneWayInteraction: 0,
    unconfirmedInteraction: 0,
  };

  for (const ev of evidenceList) {
    const category = classifyEvidenceType(ev.type);
    if (category === "direct_interaction") evidenceSummary.directInteraction++;
    else if (category === "founder_asserted") evidenceSummary.founderAsserted++;
    else if (category === "public_context") evidenceSummary.publicContext++;
    else if (category === "platform_signal") evidenceSummary.platformSignal++;

    if (ev.interaction) {
      if (ev.interaction.status === "unconfirmed") {
        evidenceSummary.unconfirmedInteraction++;
      } else if (ev.interaction.status === "confirmed") {
        if (ev.interaction.reciprocity === "two_way") {
          evidenceSummary.confirmedTwoWayInteraction++;
        } else if (ev.interaction.reciprocity === "one_way") {
          evidenceSummary.oneWayInteraction++;
        }
      }
    }
  }

  // 2. RULE A: STRUCTURAL EDGE
  if (relationshipClass === "structural") {
    return {
      relationshipId: relationship.id,
      relationshipClass: "structural",
      status: "structural",
      recency: "unknown",
      latestRelevantInteractionAt: undefined,
      evidenceSummary,
      reasonCodes: ["STRUCTURAL_RELATIONSHIP"],
      explanation:
        "Structural relationship establishes organizational or economic context rather than an interpersonal introduction capability.",
    };
  }

  // 3. RULE B: NO EVIDENCE
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

  // 4. TEMPORAL INTEGRITY CHECKS (Invalid or Future Dates)
  const refMs = new Date(referenceDate).getTime();

  for (const ev of evidenceList) {
    if (ev.interaction?.occurredAt) {
      const intMs = parseDateMs(ev.interaction.occurredAt);
      if (intMs === null) {
        return {
          relationshipId: relationship.id,
          relationshipClass,
          status: "confirmation_required",
          recency: "unknown",
          latestRelevantInteractionAt: ev.interaction.occurredAt,
          evidenceSummary,
          reasonCodes: ["INVALID_INTERACTION_DATE"],
          explanation:
            "Interaction record contains an invalid or unparseable occurredAt date string.",
        };
      }
      if (intMs > refMs) {
        return {
          relationshipId: relationship.id,
          relationshipClass,
          status: "confirmation_required",
          recency: "unknown",
          latestRelevantInteractionAt: ev.interaction.occurredAt,
          evidenceSummary,
          reasonCodes: ["FUTURE_INTERACTION_DATE"],
          explanation:
            "Interaction record occurredAt occurs in the future relative to the reference evaluation date.",
        };
      }
    }
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

  // 6. ONE-WAY OUTREACH ONLY
  if (
    evidenceSummary.oneWayInteraction > 0 &&
    evidenceSummary.confirmedTwoWayInteraction === 0
  ) {
    const oneWayDates = evidenceList
      .filter((e) => e.interaction?.reciprocity === "one_way" && e.interaction?.occurredAt)
      .map((e) => e.interaction!.occurredAt);
    oneWayDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const latestOneWayDate = oneWayDates[0];
    const recency = computeRecency(latestOneWayDate, referenceDate, policy);

    return {
      relationshipId: relationship.id,
      relationshipClass,
      status: "confirmation_required",
      recency,
      latestRelevantInteractionAt: latestOneWayDate,
      evidenceSummary,
      reasonCodes: ["ONE_WAY_OUTREACH_ONLY"],
      explanation:
        "One-way outbound communication without verified reciprocal interaction requires confirmation before introduction use.",
    };
  }

  // 7. UNCONFIRMED INTERACTION
  if (
    evidenceSummary.unconfirmedInteraction > 0 &&
    evidenceSummary.confirmedTwoWayInteraction === 0
  ) {
    return {
      relationshipId: relationship.id,
      relationshipClass,
      status: "confirmation_required",
      recency: "unknown",
      latestRelevantInteractionAt: undefined,
      evidenceSummary,
      reasonCodes: ["UNCONFIRMED_INTERACTION"],
      explanation:
        "Interaction record is unconfirmed (e.g. unverified calendar invitation) and requires confirmation before introduction use.",
    };
  }

  // 8. RESOLVE LATEST CONFIRMED TWO-WAY INTERACTION DATE
  const confirmedDates: string[] = [];
  for (const ev of evidenceList) {
    const cat = classifyEvidenceType(ev.type);
    if (
      (cat === "direct_interaction" || cat === "founder_asserted") &&
      ev.interaction &&
      ev.interaction.status === "confirmed" &&
      ev.interaction.reciprocity === "two_way" &&
      ev.interaction.occurredAt
    ) {
      confirmedDates.push(ev.interaction.occurredAt);
    }
  }
  confirmedDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  const latestConfirmedInteractionAt = confirmedDates[0];

  // 9. NETWORK SIGNAL EVALUATION
  if (relationshipClass === "network_signal") {
    // Network signal without confirmed two-way interaction
    if (!latestConfirmedInteractionAt) {
      const reasonCodes: QualificationReasonCode[] =
        evidenceSummary.publicContext > 0
          ? ["PUBLIC_CONTEXT_ONLY", "NETWORK_SIGNAL_ONLY", "NO_DIRECT_INTERACTION"]
          : ["NETWORK_SIGNAL_ONLY", "NO_DIRECT_INTERACTION"];

      return {
        relationshipId: relationship.id,
        relationshipClass: "network_signal",
        status: "confirmation_required",
        recency: "unknown",
        latestRelevantInteractionAt: undefined,
        evidenceSummary,
        reasonCodes,
        explanation:
          "Network signal or public co-occurrence without confirmed direct interaction evidence requires manual confirmation before introduction use.",
      };
    }

    // Confirmed two-way interaction exists on network signal edge
    const recency = computeRecency(latestConfirmedInteractionAt, referenceDate, policy);

    if (recency === "recent") {
      return {
        relationshipId: relationship.id,
        relationshipClass: "network_signal",
        status: "eligible",
        recency,
        latestRelevantInteractionAt: latestConfirmedInteractionAt,
        evidenceSummary,
        reasonCodes: ["RECENT_DIRECT_INTERACTION"],
        explanation:
          "Network relationship is corroborated by recent confirmed two-way interaction records.",
      };
    }

    if (recency === "aging") {
      return {
        relationshipId: relationship.id,
        relationshipClass: "network_signal",
        status: "confirmation_required",
        recency,
        latestRelevantInteractionAt: latestConfirmedInteractionAt,
        evidenceSummary,
        reasonCodes: ["AGING_INTERACTION"],
        explanation:
          "Confirmed interaction is aging (between 366 and 730 days old) and requires confirmation of current responsiveness.",
      };
    }

    return {
      relationshipId: relationship.id,
      relationshipClass: "network_signal",
      status: "confirmation_required",
      recency: "stale",
      latestRelevantInteractionAt: latestConfirmedInteractionAt,
      evidenceSummary,
      reasonCodes: ["STALE_INTERACTION"],
      explanation:
        "Confirmed interaction is stale (over 730 days old) and requires confirmation before introduction use.",
    };
  }

  // 10. INTERPERSONAL RELATIONSHIPS (advisor, mentor, colleague, former_colleague, etc.)
  if (latestConfirmedInteractionAt) {
    const recency = computeRecency(latestConfirmedInteractionAt, referenceDate, policy);

    if (recency === "stale") {
      return {
        relationshipId: relationship.id,
        relationshipClass: "interpersonal",
        status: "confirmation_required",
        recency: "stale",
        latestRelevantInteractionAt: latestConfirmedInteractionAt,
        evidenceSummary,
        reasonCodes: ["STALE_INTERACTION"],
        explanation:
          "Interpersonal interaction is historical (> 730 days old) and requires confirmation of current responsiveness.",
      };
    }

    if (recency === "aging") {
      return {
        relationshipId: relationship.id,
        relationshipClass: "interpersonal",
        status: "confirmation_required",
        recency: "aging",
        latestRelevantInteractionAt: latestConfirmedInteractionAt,
        evidenceSummary,
        reasonCodes: ["AGING_INTERACTION"],
        explanation:
          "Interpersonal interaction is aging (366–730 days old) and requires confirmation before use in an active campaign.",
      };
    }

    // recency === "recent"
    const reasonCode: QualificationReasonCode =
      evidenceSummary.directInteraction > 0
        ? "RECENT_DIRECT_INTERACTION"
        : "RECENT_INTERNAL_EVIDENCE";

    return {
      relationshipId: relationship.id,
      relationshipClass: "interpersonal",
      status: "eligible",
      recency: "recent",
      latestRelevantInteractionAt: latestConfirmedInteractionAt,
      evidenceSummary,
      reasonCodes: [reasonCode],
      explanation:
        reasonCode === "RECENT_DIRECT_INTERACTION"
          ? "Interpersonal relationship is verified by recent confirmed two-way direct interaction records."
          : "Interpersonal relationship is verified by recent confirmed founder-asserted interaction records.",
    };
  }

  // 11. HISTORICAL RELATIONSHIP FALLBACK (former_colleague endedAt fallback)
  if (relationship.type === "former_colleague" && relationship.endedAt) {
    const fallbackRecency = computeRecency(relationship.endedAt, referenceDate, policy);

    if (fallbackRecency === "stale") {
      return {
        relationshipId: relationship.id,
        relationshipClass: "interpersonal",
        status: "confirmation_required",
        recency: "stale",
        latestRelevantInteractionAt: relationship.endedAt,
        evidenceSummary,
        reasonCodes: ["STALE_INTERACTION"],
        explanation:
          "Historical colleague relationship ended > 730 days ago and requires confirmation of current responsiveness.",
      };
    }

    if (fallbackRecency === "aging") {
      return {
        relationshipId: relationship.id,
        relationshipClass: "interpersonal",
        status: "confirmation_required",
        recency: "aging",
        latestRelevantInteractionAt: relationship.endedAt,
        evidenceSummary,
        reasonCodes: ["AGING_INTERACTION"],
        explanation:
          "Historical colleague relationship ended between 366 and 730 days ago and requires confirmation before use.",
      };
    }

    // Historical fallback alone must NEVER turn a relationship eligible
    return {
      relationshipId: relationship.id,
      relationshipClass: "interpersonal",
      status: "confirmation_required",
      recency: fallbackRecency,
      latestRelevantInteractionAt: relationship.endedAt,
      evidenceSummary,
      reasonCodes: ["NO_DIRECT_INTERACTION"],
      explanation:
        "Historical colleague relationship lacks direct interaction records and requires confirmation.",
    };
  }

  // 12. PUBLIC CONTEXT ONLY OR UNCORROBORATED INTERPERSONAL
  if (evidenceSummary.publicContext > 0 && evidenceSummary.directInteraction === 0 && evidenceSummary.founderAsserted === 0) {
    return {
      relationshipId: relationship.id,
      relationshipClass: "interpersonal",
      status: "confirmation_required",
      recency: "unknown",
      latestRelevantInteractionAt: undefined,
      evidenceSummary,
      reasonCodes: ["PUBLIC_CONTEXT_ONLY", "NO_DIRECT_INTERACTION"],
      explanation:
        "Interpersonal relationship supported only by public context without direct interaction records requires confirmation.",
    };
  }

  return {
    relationshipId: relationship.id,
    relationshipClass: "interpersonal",
    status: "confirmation_required",
    recency: "unknown",
    latestRelevantInteractionAt: undefined,
    evidenceSummary,
    reasonCodes: ["NO_DIRECT_INTERACTION"],
    explanation:
      "Interpersonal relationship lacks fresh interaction records and requires confirmation.",
  };
}
