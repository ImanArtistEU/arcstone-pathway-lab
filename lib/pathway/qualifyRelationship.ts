import {
  Relationship,
  RelationshipEvidence,
  RelationshipQualification,
  EvidenceSummary,
  RecencyBucket,
  QualificationReasonCode,
  EvidenceCategory,
} from "@/types/pathway";
import {
  QualificationPolicy,
  DEFAULT_QUALIFICATION_POLICY,
  classifyRelationshipType,
  classifyEvidenceType,
} from "./qualificationPolicy";

/**
 * Validates temporal interaction dates.
 * Returns timestamp ms if valid, or null if unparseable.
 */
function parseDateMs(dateStr: string): number | null {
  if (typeof dateStr !== "string" || dateStr.trim().length === 0) {
    return null;
  }
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

  const refMs =
    referenceDate instanceof Date
      ? referenceDate.getTime()
      : typeof referenceDate === "string" && referenceDate.trim().length > 0
        ? new Date(referenceDate).getTime()
        : NaN;

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

interface QualifyingInteraction {
  occurredAt: string;
  evidenceId: string;
  evidenceCategory: EvidenceCategory;
  occurredAtMs: number;
}

/**
 * Deterministically qualifies a single Relationship for fundraising introduction usability.
 *
 * Core Invariants:
 * 1. OBSERVATION TIME ≠ INTERACTION TIME
 *    observedAt is ingestion time; only interaction.occurredAt indicates human interaction.
 * 2. OUTREACH ≠ RECIPROCAL RELATIONSHIP
 *    One-way outreach (e.g. unreplied outbound email) does NOT qualify as eligible.
 * 3. REFERENCE DATE VALIDITY
 *    Non-structural relationships require a valid reference evaluation date.
 * 4. REASON PROVENANCE
 *    Eligibility reason codes reflect the specific evidence record that established the qualifying interaction.
 *
 * Pure function:
 * - No network calls
 * - No machine clock dependencies (referenceDate required)
 * - No mutation of inputs
 * - No probabilistic scoring or AI
 */
/**
 * Evaluates whether an evidence item represents an observable private interaction.
 */
function isEvidenceObservablePrivateInteraction(
  ev: RelationshipEvidence,
  relationship: Relationship,
  campaignFounderPersonIds?: string[]
): boolean {
  const cat = classifyEvidenceType(ev.type);

  // Public context evidence cannot establish observable direct interaction
  if (cat === "public_context") {
    return false;
  }

  const fromId = relationship.from.id;
  const toId = relationship.to.id;

  const accessClass = ev.provenance?.accessClass ?? "first_party_private";
  const sourcePrincipal = ev.provenance?.sourcePrincipalPersonId;

  if (accessClass === "first_party_private") {
    if (sourcePrincipal) {
      if (campaignFounderPersonIds && campaignFounderPersonIds.length > 0) {
        if (!campaignFounderPersonIds.includes(sourcePrincipal)) {
          return false;
        }
      }
      return sourcePrincipal === fromId || sourcePrincipal === toId;
    }
    if (campaignFounderPersonIds && campaignFounderPersonIds.length > 0) {
      const isFromFounder = campaignFounderPersonIds.includes(fromId);
      const isToFounder = campaignFounderPersonIds.includes(toId);
      if (!isFromFounder && !isToFounder) {
        return false;
      }
    }
    return true;
  }

  if (accessClass === "consented_third_party_private") {
    if (sourcePrincipal) {
      return sourcePrincipal === fromId || sourcePrincipal === toId;
    }
    return true;
  }

  return false;
}

export function qualifyRelationship(
  relationship: Relationship,
  evidenceList: RelationshipEvidence[],
  referenceDate: string | Date,
  policy: QualificationPolicy = DEFAULT_QUALIFICATION_POLICY,
  campaignFounderPersonIds?: string[]
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

  let hasUnobservablePrivateEvidence = false;
  let hasUserAssertedThirdParty = false;
  let hasPublicEvidence = false;

  for (const ev of evidenceList) {
    const category = classifyEvidenceType(ev.type);
    const accessClass = ev.provenance?.accessClass;

    if (accessClass === "public") {
      hasPublicEvidence = true;
    }

    if (category === "direct_interaction") evidenceSummary.directInteraction++;
    else if (category === "founder_asserted") evidenceSummary.founderAsserted++;
    else if (category === "public_context") evidenceSummary.publicContext++;
    else if (category === "platform_signal") evidenceSummary.platformSignal++;

    const isObservable = isEvidenceObservablePrivateInteraction(
      ev,
      relationship,
      campaignFounderPersonIds
    );

    if (
      (accessClass === "first_party_private" || accessClass === "consented_third_party_private" || category === "direct_interaction") &&
      !isObservable
    ) {
      hasUnobservablePrivateEvidence = true;
    }

    if (accessClass === "user_asserted") {
      const isEndpoint =
        ev.provenance?.sourcePrincipalPersonId === relationship.from.id ||
        ev.provenance?.sourcePrincipalPersonId === relationship.to.id;
      if (!isEndpoint) {
        hasUserAssertedThirdParty = true;
      }
    }

    if (ev.interaction) {
      if (ev.interaction.status === "unconfirmed") {
        evidenceSummary.unconfirmedInteraction++;
      } else if (ev.interaction.status === "confirmed") {
        if (ev.interaction.reciprocity === "two_way" && isObservable) {
          evidenceSummary.confirmedTwoWayInteraction++;
        } else if (ev.interaction.reciprocity === "one_way" && isObservable) {
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

  // 3. REFERENCE DATE VALIDATION FOR NON-STRUCTURAL RELATIONSHIPS
  const refMs =
    referenceDate instanceof Date
      ? referenceDate.getTime()
      : typeof referenceDate === "string" && referenceDate.trim().length > 0
        ? new Date(referenceDate).getTime()
        : NaN;

  if (isNaN(refMs)) {
    return {
      relationshipId: relationship.id,
      relationshipClass,
      status: "confirmation_required",
      recency: "unknown",
      latestRelevantInteractionAt: undefined,
      evidenceSummary,
      reasonCodes: ["INVALID_REFERENCE_DATE"],
      explanation:
        "The reference evaluation date provided is invalid or unparseable.",
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

  // 5. TEMPORAL INTEGRITY CHECKS ON EVIDENCE
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

  // 6. RULE C: LINKEDIN ONLY
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

  // 7. ONE-WAY OUTREACH ONLY
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

  // 8. UNCONFIRMED INTERACTION
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

  // 9. RESOLVE CONFIRMED TWO-WAY QUALIFYING INTERACTIONS WITH PROVENANCE
  const qualifyingInteractions: QualifyingInteraction[] = [];
  for (const ev of evidenceList) {
    const cat = classifyEvidenceType(ev.type);
    const isObservable = isEvidenceObservablePrivateInteraction(
      ev,
      relationship,
      campaignFounderPersonIds
    );

    if (
      (cat === "direct_interaction" || cat === "founder_asserted") &&
      isObservable &&
      ev.interaction &&
      ev.interaction.status === "confirmed" &&
      ev.interaction.reciprocity === "two_way" &&
      ev.interaction.occurredAt
    ) {
      const ms = parseDateMs(ev.interaction.occurredAt);
      if (ms !== null && ms <= refMs) {
        qualifyingInteractions.push({
          occurredAt: ev.interaction.occurredAt,
          evidenceId: ev.id,
          evidenceCategory: cat,
          occurredAtMs: ms,
        });
      }
    }
  }

  // Sort descending by occurrence date; tie-break direct_interaction over founder_asserted
  qualifyingInteractions.sort((a, b) => {
    if (b.occurredAtMs !== a.occurredAtMs) {
      return b.occurredAtMs - a.occurredAtMs;
    }
    if (a.evidenceCategory === "direct_interaction" && b.evidenceCategory !== "direct_interaction") {
      return -1;
    }
    if (b.evidenceCategory === "direct_interaction" && a.evidenceCategory !== "direct_interaction") {
      return 1;
    }
    return 0;
  });

  const winningInteraction = qualifyingInteractions[0];
  const latestConfirmedInteractionAt = winningInteraction?.occurredAt;

  // 10. UNCONNECTED / UNOBSERVABLE EVALUATION (if no observable winning interaction)
  if (!winningInteraction) {
    let latestDate: string | undefined;
    let latestMs: number | undefined;

    for (const ev of evidenceList) {
      const dt = ev.interaction?.occurredAt || ev.observedAt;
      if (dt) {
        const ms = parseDateMs(dt);
        if (ms !== null && ms <= refMs) {
          if (latestMs === undefined || ms > latestMs) {
            latestMs = ms;
            latestDate = dt;
          }
        }
      }
    }

    const recency = latestDate ? computeRecency(latestDate, referenceDate, policy) : "unknown";

    const reasonCodes: QualificationReasonCode[] = [];
    if (hasUnobservablePrivateEvidence) {
      reasonCodes.push("PRIVATE_EVIDENCE_NOT_OBSERVABLE");
    }
    if (hasUserAssertedThirdParty) {
      reasonCodes.push("USER_ASSERTED_THIRD_PARTY_RELATIONSHIP");
    }
    if (hasPublicEvidence || evidenceSummary.publicContext > 0) {
      reasonCodes.push("PUBLIC_PROXIMITY_ONLY", "PUBLIC_CONTEXT_ONLY");
    }
    if (relationshipClass === "network_signal") {
      reasonCodes.push("NETWORK_SIGNAL_ONLY");
    }

    if (recency === "stale") {
      reasonCodes.push("STALE_INTERACTION");
    } else if (recency === "aging") {
      reasonCodes.push("AGING_INTERACTION");
    }

    reasonCodes.push("NO_DIRECT_INTERACTION", "THIRD_PARTY_CONFIRMATION_REQUIRED");

    // Deduplicate reason codes
    const uniqueReasonCodes = Array.from(new Set(reasonCodes));

    let exp = "Relationship relies on public corroboration, user assertion, or unobservable private evidence and requires manual confirmation before introduction use.";
    if (hasUnobservablePrivateEvidence) {
      exp = "Arcstone cannot observe private interactions between third parties where no connected campaign founder is a direct endpoint. This relationship requires confirmation.";
    } else if (hasUserAssertedThirdParty) {
      exp = "Relationship is based on founder assertion about third parties without direct founder participation. Confirmation is required.";
    } else if (hasPublicEvidence) {
      exp = "Public sources show shared co-investment or board context, but Arcstone has no observable private interaction data. Confirmation is required.";
    }

    return {
      relationshipId: relationship.id,
      relationshipClass,
      status: "confirmation_required",
      recency,
      latestRelevantInteractionAt: latestDate,
      evidenceSummary,
      reasonCodes: uniqueReasonCodes,
      explanation: exp,
    };
  }

  // 11. NETWORK SIGNAL RELATIONSHIPS WITH CONFIRMED INTERACTION
  if (relationshipClass === "network_signal") {
    const recency = computeRecency(latestConfirmedInteractionAt, referenceDate, policy);

    if (recency === "recent") {
      const reasonCode: QualificationReasonCode =
        winningInteraction.evidenceCategory === "direct_interaction"
          ? "RECENT_DIRECT_INTERACTION"
          : "RECENT_INTERNAL_EVIDENCE";

      return {
        relationshipId: relationship.id,
        relationshipClass: "network_signal",
        status: "eligible",
        recency,
        latestRelevantInteractionAt: latestConfirmedInteractionAt,
        evidenceSummary,
        reasonCodes: [reasonCode],
        explanation:
          reasonCode === "RECENT_DIRECT_INTERACTION"
            ? "Network relationship is corroborated by recent confirmed two-way direct interaction records."
            : "Network relationship is corroborated by recent confirmed founder-asserted interaction records.",
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

  // 11. INTERPERSONAL RELATIONSHIPS (advisor, mentor, colleague, former_colleague, etc.)
  if (winningInteraction) {
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
    // Use the actual provenance of the winning interaction record
    const reasonCode: QualificationReasonCode =
      winningInteraction.evidenceCategory === "direct_interaction"
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

  // 12. HISTORICAL RELATIONSHIP FALLBACK (former_colleague endedAt fallback)
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

  // 13. PUBLIC CONTEXT ONLY OR UNCORROBORATED INTERPERSONAL
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
