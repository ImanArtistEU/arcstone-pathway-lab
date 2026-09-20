import {
  PathwayDataset,
  PathRejectionResult,
  PathScoringResult,
  TargetPersonSelectionResult,
  PathwayExplanation,
  TargetPersonDecisionExplanation,
  TargetPersonComparison,
  PreferredRouteExplanation,
  RouteStepExplanation,
  RouteEvidenceItem,
  RouteWeakestLink,
  AlternativeRouteComparison,
  RejectedRouteExplanation,
  PathActivationPlan,
  ActivationStep,
  ScoredPath,
  PathCandidate,
  EvidenceAccessClass,
  EvidenceSourceSystem,
  QualificationReasonCode,
} from "@/types/pathway";

/**
 * Helper to get a person's full name from the dataset
 */
function getPersonName(dataset: PathwayDataset, personId: string): string {
  const person = dataset.people.find((p) => p.id === personId);
  if (!person) return personId;
  return person.fullName || `${person.firstName} ${person.lastName}`.trim() || personId;
}

/**
 * Helper to get an organization's name from the dataset
 */
function getOrgName(dataset: PathwayDataset, orgId: string): string {
  const org = dataset.organizations.find((o) => o.id === orgId);
  return org ? org.name : orgId;
}

/**
 * Helper to construct a human-readable route string (e.g. "Elena Vance → Marcus Vance → Sarah Chen")
 */
function getHumanRoute(dataset: PathwayDataset, path: PathCandidate): string {
  const personIds: string[] = [path.sourceFounderPersonId];
  for (const step of path.steps) {
    personIds.push(step.toPersonId);
  }
  return personIds.map((id) => getPersonName(dataset, id)).join(" → ");
}

/**
 * Build target person decision explanation and candidate comparisons
 */
function buildTargetPersonDecisionExplanation(
  dataset: PathwayDataset,
  targetInvestorId: string,
  selectionResult: TargetPersonSelectionResult
): TargetPersonDecisionExplanation {
  const targetInvestor = dataset.targetInvestors.find((ti) => ti.id === targetInvestorId);
  const orgId = targetInvestor ? targetInvestor.investorOrganizationId : "";
  const orgName = getOrgName(dataset, orgId);

  const primaryPersonId = selectionResult.primaryTargetPersonId;
  if (!primaryPersonId) {
    return {
      organizationId: orgId,
      organizationName: orgName,
      reasons: [
        `No primary target person was selected for ${orgName}. Selection disposition: ${selectionResult.disposition}.`,
      ],
      candidateComparisons: [],
    };
  }

  const primaryPersonName = getPersonName(dataset, primaryPersonId);
  const primaryEval = selectionResult.evaluations.find((e) => e.personId === primaryPersonId);

  if (!primaryEval) {
    return {
      personId: primaryPersonId,
      personName: primaryPersonName,
      organizationId: orgId,
      organizationName: orgName,
      reasons: [`Primary target person ${primaryPersonName} selected without an evaluation summary.`],
      candidateComparisons: [],
    };
  }

  const reasons: string[] = [];

  // Factual reasoning construction
  const roleText =
    primaryEval.investmentRole !== "unknown"
      ? `classified as ${primaryEval.investmentRole}`
      : "role classification unknown";

  const stageText =
    primaryEval.stageFitStatus === "match"
      ? "matches the startup stage"
      : primaryEval.stageFitStatus === "no_match"
      ? "does not match stage"
      : "stage fit is unknown because available context is incomplete";

  const sectorText =
    primaryEval.sectorFitStatus === "match"
      ? "matches the startup sector"
      : primaryEval.sectorFitStatus === "no_match"
      ? "does not match sector"
      : "sector fit is unknown because available context is incomplete";

  const geoText =
    primaryEval.geographyFitStatus === "match"
      ? "matches the target geography"
      : primaryEval.geographyFitStatus === "no_match"
      ? "does not match geography"
      : "geography fit is unknown because available context is incomplete";

  reasons.push(
    `${primaryPersonName} is prioritized because this person is ${roleText}, ${stageText}, ${sectorText}, and ${geoText}. Mandate fit index is ${primaryEval.mandateFitIndex}/100 and access quality is ${primaryEval.accessQualityIndex}/100, producing an overall target priority index of ${primaryEval.overallTargetPriorityIndex}/100.`
  );

  // Candidate comparisons
  const candidateComparisons: TargetPersonComparison[] = [];
  for (const candidateEval of selectionResult.evaluations) {
    if (candidateEval.personId === primaryPersonId) continue;

    const candidateName = getPersonName(dataset, candidateEval.personId);
    const scoreDiff = primaryEval.overallTargetPriorityIndex - candidateEval.overallTargetPriorityIndex;

    let compExplanation = "";
    if (primaryEval.investmentRoleScore > candidateEval.investmentRoleScore) {
      compExplanation = `${primaryPersonName} is prioritized over ${candidateName} because ${primaryPersonName} is classified as ${primaryEval.investmentRole} while ${candidateName} is classified as ${candidateEval.investmentRole}.`;
    } else if (candidateEval.accessQualityIndex > primaryEval.accessQualityIndex) {
      compExplanation = `${primaryPersonName} is prioritized over ${candidateName} because ${primaryPersonName}'s mandate fit (${primaryEval.mandateFitIndex}/100) produces a higher overall target priority index (${primaryEval.overallTargetPriorityIndex} vs ${candidateEval.overallTargetPriorityIndex}) under the current 70% mandate / 30% access policy, despite ${candidateName} having stronger network access (${candidateEval.accessQualityIndex}/100).`;
    } else {
      compExplanation = `${primaryPersonName} achieves a higher overall target priority index (${primaryEval.overallTargetPriorityIndex}/100) than ${candidateName} (${candidateEval.overallTargetPriorityIndex}/100) due to mandate alignment and role title suitability.`;
    }

    candidateComparisons.push({
      personId: candidateEval.personId,
      personName: candidateName,
      overallTargetPriorityIndex: candidateEval.overallTargetPriorityIndex,
      mandateFitIndex: candidateEval.mandateFitIndex,
      accessQualityIndex: candidateEval.accessQualityIndex,
      investmentRole: candidateEval.investmentRole,
      investmentRoleScore: candidateEval.investmentRoleScore,
      scoreDifferenceFromPrimary: scoreDiff,
      explanation: compExplanation,
    });
  }

  return {
    personId: primaryPersonId,
    personName: primaryPersonName,
    organizationId: orgId,
    organizationName: orgName,
    roleTitle: primaryEval.roleTitle,
    investmentRole: primaryEval.investmentRole,
    overallTargetPriorityIndex: primaryEval.overallTargetPriorityIndex,
    mandateFitIndex: primaryEval.mandateFitIndex,
    accessQualityIndex: primaryEval.accessQualityIndex,
    stageFitStatus: primaryEval.stageFitStatus,
    stageFitScore: primaryEval.stageFitScore,
    sectorFitStatus: primaryEval.sectorFitStatus,
    sectorFitScore: primaryEval.sectorFitScore,
    geographyFitStatus: primaryEval.geographyFitStatus,
    geographyFitScore: primaryEval.geographyFitScore,
    reasons,
    candidateComparisons,
  };
}

function getOriginLabel(accessClass?: EvidenceAccessClass): string {
  switch (accessClass) {
    case "first_party_private":
      return "YOUR CONNECTED DATA";
    case "public":
      return "PUBLIC SOURCE";
    case "user_asserted":
      return "YOUR ASSERTION";
    case "consented_third_party_private":
      return "SHARED WITH ARCSTONE";
    default:
      return "PUBLIC SOURCE";
  }
}

function buildStepObservabilityAndKnowledge(
  fromPersonName: string,
  toPersonName: string,
  accessClass: EvidenceAccessClass,
  evidenceItems: RouteEvidenceItem[],
  qualificationReasonCodes: QualificationReasonCode[],
  isFounderEndpoint: boolean
): {
  observabilityExplanation: string;
  whatArcstoneKnows: string[];
  whatArcstoneDoesNotKnow: string[];
} {
  const whatArcstoneKnows: string[] = [];
  const whatArcstoneDoesNotKnow: string[] = [];
  let observabilityExplanation = "";

  if (accessClass === "first_party_private" && isFounderEndpoint) {
    observabilityExplanation = `Arcstone observes private communication and interaction records directly connected by an authorized campaign founder.`;
    whatArcstoneKnows.push(
      `Arcstone observes direct interaction records (Calendar syncs, CRM logs, Email headers) authorized by campaign founders.`
    );
    whatArcstoneDoesNotKnow.push(
      `Arcstone does not observe unlogged offline conversations or third-party communications outside connected accounts.`
    );
  } else if (accessClass === "user_asserted") {
    observabilityExplanation = `Arcstone records user-asserted relationship details provided directly by the founder or team.`;
    whatArcstoneKnows.push(
      `Arcstone records founder-asserted information regarding ${fromPersonName} and ${toPersonName}.`
    );
    whatArcstoneDoesNotKnow.push(
      `Arcstone cannot independently verify third-party interaction frequency or current responsiveness without first-party system records.`
    );
  } else {
    // public or unobservable private
    observabilityExplanation = `Arcstone observes public co-investment announcements and governance board listings, but cannot observe private communications between third parties.`;

    if (evidenceItems.some((i) => i.evidenceType === "press_release" || i.evidenceType === "portfolio_page" || i.evidenceType === "news_article")) {
      whatArcstoneKnows.push(
        `Arcstone observes public co-investment press releases and board observer listings.`
      );
    } else if (evidenceItems.some((i) => i.evidenceType === "company_website")) {
      whatArcstoneKnows.push(
        `Arcstone observes corporate website team directories and public organization affiliations.`
      );
    } else if (evidenceItems.some((i) => i.evidenceType === "linkedin")) {
      whatArcstoneKnows.push(
        `Arcstone observes public social / platform connection profiles.`
      );
    } else {
      whatArcstoneKnows.push(
        `Arcstone observes public structural context for ${fromPersonName} and ${toPersonName}.`
      );
    }

    if (!isFounderEndpoint) {
      whatArcstoneDoesNotKnow.push(
        `Arcstone cannot observe private emails or meetings between third parties where no connected founder is a party.`
      );
    } else {
      whatArcstoneDoesNotKnow.push(
        `Arcstone cannot observe private message exchange or off-platform communication beyond public listings.`
      );
    }
  }

  return { observabilityExplanation, whatArcstoneKnows, whatArcstoneDoesNotKnow };
}

/**
 * Build step explanation for a single hop in a path
 */
function buildRouteStepExplanation(
  dataset: PathwayDataset,
  step: ScoredPath["path"]["steps"][number],
  campaignFounderPersonIds: Set<string>
): RouteStepExplanation {
  const fromPersonName = getPersonName(dataset, step.fromPersonId);
  const toPersonName = getPersonName(dataset, step.toPersonId);

  const rel = dataset.relationships.find((r) => r.id === step.relationshipId);
  const relType = rel ? rel.type : "other";

  const matchingEvidences = dataset.relationshipEvidence.filter(
    (e) => e.relationshipId === step.relationshipId
  );

  const isFounderEndpoint =
    campaignFounderPersonIds.has(step.fromPersonId) ||
    campaignFounderPersonIds.has(step.toPersonId);

  const evidenceItems: RouteEvidenceItem[] = matchingEvidences.map((e) => {
    const accessClass = e.provenance?.accessClass || "public";
    const sourceSystem = e.provenance?.sourceSystem || "other";
    return {
      evidenceId: e.id,
      evidenceType: e.type,
      description: e.description,
      sourceName: e.sourceName,
      sourceUrl: e.sourceUrl,
      observedAt: e.observedAt,
      interactionOccurredAt: e.interaction?.occurredAt,
      interactionReciprocity: e.interaction?.reciprocity,
      interactionStatus: e.interaction?.status,
      accessClass,
      sourceSystem,
      sourcePrincipalPersonId: e.provenance?.sourcePrincipalPersonId,
      authorizedByPersonId: e.provenance?.authorizedByPersonId,
      originLabel: getOriginLabel(accessClass),
    };
  });

  // Determine step evidence access class
  let stepAccessClass: EvidenceAccessClass = "public";
  if (evidenceItems.some((i) => i.accessClass === "first_party_private") && isFounderEndpoint) {
    stepAccessClass = "first_party_private";
  } else if (evidenceItems.some((i) => i.accessClass === "consented_third_party_private")) {
    stepAccessClass = "consented_third_party_private";
  } else if (evidenceItems.some((i) => i.accessClass === "user_asserted")) {
    stepAccessClass = "user_asserted";
  } else {
    stepAccessClass = "public";
  }

  const evidenceSourceSystems: EvidenceSourceSystem[] = Array.from(
    new Set(evidenceItems.map((i) => i.sourceSystem || "other"))
  );

  const { observabilityExplanation, whatArcstoneKnows, whatArcstoneDoesNotKnow } =
    buildStepObservabilityAndKnowledge(
      fromPersonName,
      toPersonName,
      stepAccessClass,
      evidenceItems,
      step.qualificationReasonCodes,
      isFounderEndpoint
    );

  // Factual explanation of connection existence
  let whyThisConnectionExists = "";
  const confirmedTwoWay = evidenceItems.find(
    (i) => i.interactionStatus === "confirmed" && i.interactionReciprocity === "two_way"
  );

  if (stepAccessClass === "first_party_private" && confirmedTwoWay) {
    const dateStr = confirmedTwoWay.interactionOccurredAt
      ? ` recorded on ${confirmedTwoWay.interactionOccurredAt}`
      : "";
    const sourceStr = confirmedTwoWay.sourceName ? ` through ${confirmedTwoWay.sourceName}` : "";
    whyThisConnectionExists = `Arcstone recognizes ${fromPersonName} → ${toPersonName} because the relationship has a confirmed two-way interaction${sourceStr}${dateStr}.`;
  } else if (evidenceItems.some((i) => i.accessClass === "user_asserted")) {
    whyThisConnectionExists = `Arcstone recognizes ${fromPersonName} → ${toPersonName} based on founder-reported relationship evidence and public context. No recent confirmed interaction is recorded, so the relationship requires confirmation.`;
  } else if (evidenceItems.some((i) => i.evidenceType === "press_release" || i.evidenceType === "portfolio_page")) {
    whyThisConnectionExists = `Arcstone recognizes ${fromPersonName} → ${toPersonName} based on public co-investment and board observer listings. No private interaction data is observable by Arcstone.`;
  } else if (step.qualificationReasonCodes.includes("LINKEDIN_ONLY")) {
    whyThisConnectionExists = `Arcstone recognizes ${fromPersonName} → ${toPersonName} based on platform-only connection signals. No confirmed direct interaction is recorded, so the relationship requires confirmation.`;
  } else {
    whyThisConnectionExists = `Arcstone recognizes ${fromPersonName} → ${toPersonName} based on available structural/evidence records in the dataset.`;
  }

  let confidenceLimitation: string | undefined = undefined;
  if (step.qualificationReasonCodes.includes("PRIVATE_EVIDENCE_NOT_OBSERVABLE")) {
    confidenceLimitation = "Arcstone cannot observe private emails or meetings between third parties.";
  } else if (step.qualificationStatus === "confirmation_required") {
    confidenceLimitation =
      "Platform-only or unconfirmed relationship signal requiring confirmation.";
  } else if (step.qualificationRecency === "stale" || step.qualificationRecency === "aging") {
    confidenceLimitation = `Relationship evidence recency is ${step.qualificationRecency}.`;
  }

  return {
    relationshipId: step.relationshipId,
    fromPersonId: step.fromPersonId,
    fromPersonName,
    toPersonId: step.toPersonId,
    toPersonName,
    relationshipType: relType,
    qualificationStatus: step.qualificationStatus,
    qualificationRecency: step.qualificationRecency,
    qualificationReasonCodes: step.qualificationReasonCodes,
    relationshipCredibility: 100, // Populated from path step score if available
    temporalFreshness: 100,
    latestRelevantInteractionAt: step.latestRelevantInteractionAt,
    evidenceSummary: step.qualificationEvidenceSummary,
    evidenceItems,
    evidenceAccessClass: stepAccessClass,
    evidenceSourceSystems,
    observabilityExplanation,
    whatArcstoneKnows,
    whatArcstoneDoesNotKnow,
    whyThisConnectionExists,
    confidenceLimitation,
  };
}

/**
 * Build weakest link explanation
 */
function buildWeakestLink(
  dataset: PathwayDataset,
  scoredPath: ScoredPath,
  steps: RouteStepExplanation[]
): RouteWeakestLink | undefined {
  if (steps.length === 0) return undefined;

  let bottleneckStep = steps.find(
    (s) => s.relationshipId === scoredPath.score.bottleneckRelationshipId
  );

  if (!bottleneckStep) {
    // Pick step with confirmation_required or lowest freshness/credibility
    bottleneckStep =
      steps.find((s) => s.qualificationStatus === "confirmation_required") || steps[0];
  }

  const stepScore = scoredPath.score.stepScores.find(
    (ss) => ss.relationshipId === bottleneckStep!.relationshipId
  );

  const cred = stepScore ? stepScore.relationshipCredibility : 100;
  const fresh = stepScore ? stepScore.temporalFreshness : 100;

  let reason = "";
  let recommendedVerification: string | undefined = undefined;

  if (bottleneckStep.qualificationStatus === "confirmation_required") {
    reason = `The weakest point in this route is ${bottleneckStep.fromPersonName} → ${bottleneckStep.toPersonName}. The relationship is based on unconfirmed or platform-level signals.`;
    recommendedVerification = `Arcstone recommends confirming that ${bottleneckStep.fromPersonName} still has an active relationship with ${bottleneckStep.toPersonName} before requesting an introduction.`;
  } else if (bottleneckStep.qualificationRecency === "stale" || bottleneckStep.qualificationRecency === "aging") {
    reason = `The weakest point in this route is ${bottleneckStep.fromPersonName} → ${bottleneckStep.toPersonName}. The relationship is based on historical reciprocal interaction but the most recent relevant interaction is ${bottleneckStep.qualificationRecency}.`;
    recommendedVerification = `Arcstone recommends confirming that ${bottleneckStep.fromPersonName} still maintains an active relationship with ${bottleneckStep.toPersonName}.`;
  } else {
    reason = `The weakest point in this route is ${bottleneckStep.fromPersonName} → ${bottleneckStep.toPersonName} due to route efficiency or step credibility index (${cred}/100).`;
  }

  return {
    relationshipId: bottleneckStep.relationshipId,
    fromPersonName: bottleneckStep.fromPersonName,
    toPersonName: bottleneckStep.toPersonName,
    relationshipCredibility: cred,
    temporalFreshness: fresh,
    qualificationStatus: bottleneckStep.qualificationStatus,
    qualificationRecency: bottleneckStep.qualificationRecency,
    reason,
    recommendedVerification,
  };
}

/**
 * Build deterministic activation plan for a path
 */
function buildActivationPlan(
  dataset: PathwayDataset,
  scoredPath: ScoredPath | undefined,
  primaryTargetPersonId: string | undefined,
  primaryTargetPersonName: string | undefined,
  disposition: string
): PathActivationPlan {
  if (disposition === "no_primary_target" || !primaryTargetPersonId) {
    return {
      type: "no_primary_target",
      status: "no_primary_target",
      steps: [],
      rationale: "No primary target person was selected under the current mandate and context rules.",
      cautions: ["Do not initiate outreach without an evaluated primary target person."],
    };
  }

  if (!scoredPath || disposition === "no_retained_route_to_primary_target") {
    return {
      type: "relationship_discovery_required",
      status: "relationship_discovery_required",
      targetPersonId: primaryTargetPersonId,
      targetPersonName: primaryTargetPersonName,
      steps: [
        {
          order: 1,
          actionType: "discover_relationship",
          action: `Identify or verify a warm connection path to ${primaryTargetPersonName}.`,
          reason: "No retained evidence-backed warm route currently exists in the dataset.",
        },
      ],
      rationale: "The person remains the selected investor target based on mandate fit, but Arcstone currently has no evidence-backed warm route.",
      cautions: ["Do not present any current connection as a warm introduction."],
    };
  }

  if (disposition === "ambiguous_top_routes") {
    return {
      type: "ambiguous_route",
      status: "ambiguous_route",
      targetPersonId: primaryTargetPersonId,
      targetPersonName: primaryTargetPersonName,
      steps: [],
      rationale: "Two or more routes are tied under the current evidence. Additional relationship context is required before selecting an activation route.",
      cautions: ["Resolve route ambiguity before requesting an introduction."],
    };
  }

  const path = scoredPath.path;
  const founderId = path.sourceFounderPersonId;
  const founderName = getPersonName(dataset, founderId);
  const targetId = path.targetPersonId;
  const targetName = getPersonName(dataset, targetId);

  const intermediaryCount = path.intermediaryCount;
  const hasConfirmationHop = path.requiresConfirmationRelationshipIds.length > 0;

  if (hasConfirmationHop) {
    const confirmRelId = path.requiresConfirmationRelationshipIds[0];
    const confirmRel = dataset.relationships.find((r) => r.id === confirmRelId);
    const confirmFrom = confirmRel ? getPersonName(dataset, confirmRel.from.id) : founderName;
    const confirmTo = confirmRel ? getPersonName(dataset, confirmRel.to.id) : targetName;

    return {
      type: "verify_then_request_intro",
      status: "verification_required",
      firstActorPersonId: founderId,
      firstActorPersonName: founderName,
      nextPersonId: confirmRel?.from.id,
      nextPersonName: confirmFrom,
      targetPersonId: targetId,
      targetPersonName: targetName,
      steps: [
        {
          order: 1,
          actorPersonId: founderId,
          actorPersonName: founderName,
          actionType: "verify_relationship",
          action: `Confirm active relationship between ${confirmFrom} and ${confirmTo} before proceeding.`,
          reason: "Route contains a relationship requiring confirmation.",
        },
        {
          order: 2,
          actorPersonId: founderId,
          actorPersonName: founderName,
          actionType: "request_intro",
          action: `Request introduction to ${targetName} after verifying relationship status.`,
          reason: "Proceed with warm introduction once connection is verified.",
        },
      ],
      rationale: `Route contains a confirmation-required relationship (${confirmFrom} → ${confirmTo}) that should be verified before requesting an introduction.`,
      cautions: ["Confirm relationship status before initiating outreach."],
    };
  }

  if (intermediaryCount === 0) {
    return {
      type: "direct_relationship_activation",
      status: "ready_for_direct_activation",
      firstActorPersonId: founderId,
      firstActorPersonName: founderName,
      targetPersonId: targetId,
      targetPersonName: targetName,
      steps: [
        {
          order: 1,
          actorPersonId: founderId,
          actorPersonName: founderName,
          actionType: "direct_reconnect",
          action: `Use the existing direct relationship with ${targetName} rather than requesting an introduction through another person.`,
          reason: "Direct relationship exists between founder and target person.",
        },
      ],
      rationale: `Direct relationship available between ${founderName} and ${targetName}.`,
      cautions: ["Reference existing interaction context when reconnecting."],
    };
  }

  if (hasConfirmationHop) {
    const confRelId = path.requiresConfirmationRelationshipIds[0];
    const confStep = path.steps.find((s) => s.relationshipId === confRelId);
    const fromName = confStep ? getPersonName(dataset, confStep.fromPersonId) : "the intermediary";
    const toName = confStep ? getPersonName(dataset, confStep.toPersonId) : targetName;

    return {
      type: "verify_then_request_intro",
      status: "verification_required",
      firstActorPersonId: founderId,
      firstActorPersonName: founderName,
      nextPersonId: confStep?.fromPersonId,
      nextPersonName: fromName,
      targetPersonId: targetId,
      targetPersonName: targetName,
      steps: [
        {
          order: 1,
          actorPersonId: founderId,
          actorPersonName: founderName,
          actionType: "verify_relationship",
          action: `Before asking ${fromName} for an introduction, confirm that his/her relationship with ${toName} is still active enough for an introduction.`,
          reason: `Relationship ${fromName} → ${toName} requires confirmation under the current qualification policy.`,
          relationshipId: confRelId,
        },
        {
          order: 2,
          actorPersonId: confStep?.fromPersonId,
          actorPersonName: fromName,
          actionType: "request_introduction",
          action: `Request introduction from ${fromName} to ${targetName} once relationship status is confirmed.`,
          reason: "Introduction route depends on confirmed warm intermediary connection.",
        },
      ],
      rationale: "Route contains unconfirmed or platform-level relationship evidence requiring verification before activation.",
      cautions: [
        `Do not assume ${fromName} has an active relationship with ${toName} without verifying.`,
      ],
    };
  }

  if (intermediaryCount === 1) {
    const interId = path.steps[0].toPersonId;
    const interName = getPersonName(dataset, interId);

    return {
      type: "request_intro_from_intermediary",
      status: "ready_for_intro_request",
      firstActorPersonId: founderId,
      firstActorPersonName: founderName,
      nextPersonId: interId,
      nextPersonName: interName,
      targetPersonId: targetId,
      targetPersonName: targetName,
      steps: [
        {
          order: 1,
          actorPersonId: founderId,
          actorPersonName: founderName,
          actionType: "contact_intermediary",
          action: `Confirm ${interName} is comfortable making the connection to ${targetName}.`,
          reason: `Warm 1-hop relationship available through ${interName}.`,
          relationshipId: path.steps[0].relationshipId,
        },
        {
          order: 2,
          actorPersonId: founderId,
          actorPersonName: founderName,
          actionType: "share_context",
          action: `Give ${interName} concise context for why ${targetName} is relevant to the current fundraising campaign.`,
          reason: "Enables intermediary to evaluate and frame the warm introduction effectively.",
        },
        {
          order: 3,
          actorPersonId: interId,
          actorPersonName: interName,
          actionType: "request_introduction",
          action: `Request introduction to ${targetName}.`,
          reason: `Final target person at ${getOrgName(dataset, path.nodes[path.nodes.length - 1].id)}.`,
          relationshipId: path.steps[1].relationshipId,
        },
      ],
      rationale: `Single eligible intermediary (${interName}) connects founder to target investor.`,
      cautions: [`Do not bypass ${interName} while treating the route as warm.`],
    };
  }

  // Multi-hop route (> 1 intermediary)
  const firstInterId = path.steps[0].toPersonId;
  const firstInterName = getPersonName(dataset, firstInterId);

  const steps: ActivationStep[] = [
    {
      order: 1,
      actorPersonId: founderId,
      actorPersonName: founderName,
      actionType: "activate_first_hop",
      action: `${founderName} activates relationship with ${firstInterName}.`,
      reason: "First intermediary in multi-hop route.",
      relationshipId: path.steps[0].relationshipId,
    },
    {
      order: 2,
      actorPersonId: firstInterId,
      actorPersonName: firstInterName,
      actionType: "validate_next_hop",
      action: `${firstInterName} validates willingness/ability to connect to ${getPersonName(dataset, path.steps[1].toPersonId)}.`,
      reason: "Multi-hop activation requires sequential confirmation.",
      relationshipId: path.steps[1].relationshipId,
    },
    {
      order: 3,
      actorPersonId: path.steps[path.steps.length - 1].fromPersonId,
      actorPersonName: getPersonName(dataset, path.steps[path.steps.length - 1].fromPersonId),
      actionType: "request_target_introduction",
      action: `Only after the chain is confirmed should an introduction to ${targetName} be requested.`,
      reason: "Final introduction to target person.",
      relationshipId: path.steps[path.steps.length - 1].relationshipId,
    },
  ];

  return {
    type: "multi_hop_activation",
    status: "sequential_activation_required",
    firstActorPersonId: founderId,
    firstActorPersonName: founderName,
    nextPersonId: firstInterId,
    nextPersonName: firstInterName,
    targetPersonId: targetId,
    targetPersonName: targetName,
    steps,
    rationale: `Route contains ${intermediaryCount} intermediaries requiring sequential activation.`,
    cautions: ["Sequential activation required; do not attempt direct outreach to final target via multi-hop route."],
  };
}

/**
 * Main downstream explanation builder
 */
export function buildPathwayExplanation(
  dataset: PathwayDataset,
  targetInvestorId: string,
  rejectionResult: PathRejectionResult,
  scoringResult: PathScoringResult,
  selectionResult: TargetPersonSelectionResult,
  referenceDate: string
): PathwayExplanation {
  void referenceDate;
  const errors: string[] = [];

  // 1. Validate target investor ID consistency
  if (
    rejectionResult.targetInvestorId !== targetInvestorId ||
    scoringResult.targetInvestorId !== targetInvestorId ||
    selectionResult.targetInvestorId !== targetInvestorId
  ) {
    errors.push(
      `Target investor ID mismatch across stages: requested="${targetInvestorId}", rejection="${rejectionResult.targetInvestorId}", scoring="${scoringResult.targetInvestorId}", selection="${selectionResult.targetInvestorId}"`
    );
    return {
      executionStatus: "error",
      targetInvestorId,
      disposition: "error",
      targetPersonDecision: {
        organizationId: "",
        organizationName: targetInvestorId,
        reasons: ["Target investor ID mismatch."],
        candidateComparisons: [],
      },
      topRoutePathIds: [],
      alternativeRoutes: [],
      rejectedRoutesToPrimaryTarget: [],
      activationPlan: {
        type: "unavailable",
        status: "error",
        steps: [],
        rationale: "Target investor ID mismatch across pipeline inputs.",
        cautions: [],
      },
      errors,
    };
  }

  // 2. Check for upstream execution errors
  if (
    rejectionResult.executionStatus !== "success" ||
    scoringResult.executionStatus !== "success" ||
    selectionResult.executionStatus !== "success"
  ) {
    return {
      executionStatus: "upstream_error",
      targetInvestorId,
      disposition: "upstream_error",
      targetPersonDecision: {
        organizationId: "",
        organizationName: targetInvestorId,
        reasons: ["Upstream stage execution error."],
        candidateComparisons: [],
      },
      topRoutePathIds: [],
      alternativeRoutes: [],
      rejectedRoutesToPrimaryTarget: [],
      activationPlan: {
        type: "unavailable",
        status: "upstream_error",
        steps: [],
        rationale: "Upstream pipeline execution failed.",
        cautions: [],
      },
      errors: ["Upstream stage failed execution."],
    };
  }

  // 3. Check for upstream paths filtered
  if (
    rejectionResult.disposition === "upstream_paths_filtered" ||
    scoringResult.disposition === "upstream_paths_filtered" ||
    selectionResult.disposition === "upstream_paths_filtered"
  ) {
    return {
      executionStatus: "success",
      targetInvestorId,
      disposition: "upstream_paths_filtered",
      targetPersonDecision: buildTargetPersonDecisionExplanation(
        dataset,
        targetInvestorId,
        selectionResult
      ),
      topRoutePathIds: [],
      alternativeRoutes: [],
      rejectedRoutesToPrimaryTarget: [],
      activationPlan: {
        type: "unavailable",
        status: "upstream_paths_filtered",
        steps: [],
        rationale: "Upstream confirmation path limit exceeded.",
        cautions: [],
      },
      errors: [],
    };
  }

  // 4. Target Person Decision Explanation
  const targetPersonDecision = buildTargetPersonDecisionExplanation(
    dataset,
    targetInvestorId,
    selectionResult
  );

  const primaryTargetPersonId = selectionResult.primaryTargetPersonId;
  const primaryTargetPersonName = primaryTargetPersonId
    ? getPersonName(dataset, primaryTargetPersonId)
    : undefined;

  // If no primary target person was selected
  if (!primaryTargetPersonId || selectionResult.disposition !== "primary_target_selected") {
    return {
      executionStatus: "success",
      targetInvestorId,
      disposition: "no_primary_target",
      targetPersonDecision,
      topRoutePathIds: [],
      alternativeRoutes: [],
      rejectedRoutesToPrimaryTarget: [],
      activationPlan: buildActivationPlan(
        dataset,
        undefined,
        undefined,
        undefined,
        "no_primary_target"
      ),
      errors: [],
    };
  }

  // 5. Filter scored paths strictly for primary target person
  const primaryCandidatePaths = scoringResult.scoredPaths.filter(
    (sp) => sp.path.targetPersonId === primaryTargetPersonId
  );

  // 6. Handle rejected routes to primary target
  const rejectedPathsToPrimary = rejectionResult.rejectedPaths.filter(
    (p) => p.targetPersonId === primaryTargetPersonId
  );

  const rejectedRoutesToPrimaryTarget: RejectedRouteExplanation[] = rejectedPathsToPrimary.map(
    (p) => {
      const evalObj = rejectionResult.evaluations.find((e) => e.pathId === p.id);
      return {
        pathId: p.id,
        humanRoute: getHumanRoute(dataset, p),
        rejectionReasonCodes: evalObj ? evalObj.reasonCodes : [],
        blockingRelationshipIds: evalObj ? evalObj.blockingRelationshipIds : [],
        explanation: evalObj ? evalObj.explanation : "Path rejected during rejection stage.",
      };
    }
  );

  // 7. Zero retained scored paths to primary target
  if (primaryCandidatePaths.length === 0) {
    return {
      executionStatus: "success",
      targetInvestorId,
      disposition: "no_retained_route_to_primary_target",
      targetPersonDecision,
      topRoutePathIds: [],
      alternativeRoutes: [],
      rejectedRoutesToPrimaryTarget,
      activationPlan: buildActivationPlan(
        dataset,
        undefined,
        primaryTargetPersonId,
        primaryTargetPersonName,
        "no_retained_route_to_primary_target"
      ),
      errors: [],
    };
  }

  // 8. Select preferred route (highest overallPriorityIndex)
  let maxScore = -1;
  for (const cp of primaryCandidatePaths) {
    if (cp.score.overallPriorityIndex > maxScore) {
      maxScore = cp.score.overallPriorityIndex;
    }
  }

  const topScoredPaths = primaryCandidatePaths.filter(
    (cp) => cp.score.overallPriorityIndex === maxScore
  );

  const topRoutePathIds = topScoredPaths.map((cp) => cp.path.id);

  // Tie handling
  if (topScoredPaths.length > 1) {
    return {
      executionStatus: "success",
      targetInvestorId,
      disposition: "ambiguous_top_routes",
      targetPersonDecision,
      topRoutePathIds,
      alternativeRoutes: primaryCandidatePaths.map((sp) => ({
        pathId: sp.path.id,
        humanRoute: getHumanRoute(dataset, sp.path),
        overallPriorityIndex: sp.score.overallPriorityIndex,
        scoreDifferenceFromPreferred: maxScore - sp.score.overallPriorityIndex,
        relationshipCredibility: sp.score.relationshipCredibility,
        temporalFreshness: sp.score.temporalFreshness,
        confirmationReadiness: sp.score.confirmationReadiness,
        pathEfficiency: sp.score.pathEfficiency,
        reasonPreferredRouteRanksHigher: ["Tied top route"],
      })),
      rejectedRoutesToPrimaryTarget,
      activationPlan: buildActivationPlan(
        dataset,
        topScoredPaths[0],
        primaryTargetPersonId,
        primaryTargetPersonName,
        "ambiguous_top_routes"
      ),
      errors: [],
    };
  }

  // Exactly one top route selected
  const preferredScoredPath = topScoredPaths[0];

  const campaignFounderPersonIds = new Set<string>();
  for (const campaign of dataset.campaigns || []) {
    for (const fId of campaign.founderPersonIds || []) {
      campaignFounderPersonIds.add(fId);
    }
  }

  // Build steps
  const steps: RouteStepExplanation[] = preferredScoredPath.path.steps.map((st, idx) => {
    const stepExp = buildRouteStepExplanation(dataset, st, campaignFounderPersonIds);
    const stepScore = preferredScoredPath.score.stepScores[idx];
    if (stepScore) {
      stepExp.relationshipCredibility = stepScore.relationshipCredibility;
      stepExp.temporalFreshness = stepScore.temporalFreshness;
    }
    return stepExp;
  });

  // Build weakest link
  const weakestLink = buildWeakestLink(dataset, preferredScoredPath, steps);

  // Build comparative why preferred statements
  const otherCandidatePaths = primaryCandidatePaths.filter(
    (cp) => cp.path.id !== preferredScoredPath.path.id
  );

  const whyPreferred: string[] = [];
  const alternativeRoutes: AlternativeRouteComparison[] = [];

  if (otherCandidatePaths.length === 0) {
    whyPreferred.push(
      "This is the only retained scored route currently available to the selected target person. Arcstone therefore cannot compare it against another viable retained route."
    );
  } else {
    for (const alt of otherCandidatePaths) {
      const altHuman = getHumanRoute(dataset, alt.path);
      const scoreDiff = preferredScoredPath.score.overallPriorityIndex - alt.score.overallPriorityIndex;
      const reasonsRank: string[] = [];

      if (scoreDiff > 0) {
        reasonsRank.push(
          `Higher overall route priority index (${preferredScoredPath.score.overallPriorityIndex} vs ${alt.score.overallPriorityIndex}).`
        );
      }

      if (preferredScoredPath.score.relationshipCredibility > alt.score.relationshipCredibility) {
        reasonsRank.push(
          `Stronger weakest-link relationship credibility (${preferredScoredPath.score.relationshipCredibility} vs ${alt.score.relationshipCredibility}).`
        );
      }

      if (preferredScoredPath.score.temporalFreshness > alt.score.temporalFreshness) {
        reasonsRank.push(
          `Fresher interaction evidence (${preferredScoredPath.score.temporalFreshness} vs ${alt.score.temporalFreshness}).`
        );
      }

      if (preferredScoredPath.score.confirmationRequiredHopCount < alt.score.confirmationRequiredHopCount) {
        reasonsRank.push(
          `Fewer confirmation-required hops (${preferredScoredPath.score.confirmationRequiredHopCount} vs ${alt.score.confirmationRequiredHopCount}).`
        );
      }

      if (preferredScoredPath.score.pathEfficiency > alt.score.pathEfficiency) {
        reasonsRank.push(
          `Higher path efficiency (${preferredScoredPath.score.pathEfficiency} vs ${alt.score.pathEfficiency}).`
        );
      }

      whyPreferred.push(
        `Preferred over ${altHuman} (score ${alt.score.overallPriorityIndex}): ${reasonsRank.join(" ")}`
      );

      alternativeRoutes.push({
        pathId: alt.path.id,
        humanRoute: altHuman,
        overallPriorityIndex: alt.score.overallPriorityIndex,
        scoreDifferenceFromPreferred: scoreDiff,
        relationshipCredibility: alt.score.relationshipCredibility,
        temporalFreshness: alt.score.temporalFreshness,
        confirmationReadiness: alt.score.confirmationReadiness,
        pathEfficiency: alt.score.pathEfficiency,
        reasonPreferredRouteRanksHigher: reasonsRank,
      });
    }
  }

  const personIds = [
    preferredScoredPath.path.sourceFounderPersonId,
    ...preferredScoredPath.path.steps.map((s) => s.toPersonId),
  ];
  const personNames = personIds.map((id) => getPersonName(dataset, id));

  const preferredRoute: PreferredRouteExplanation = {
    pathId: preferredScoredPath.path.id,
    sourceFounderPersonId: preferredScoredPath.path.sourceFounderPersonId,
    targetPersonId: preferredScoredPath.path.targetPersonId,
    personIds,
    personNames,
    humanRoute: getHumanRoute(dataset, preferredScoredPath.path),
    overallPriorityIndex: preferredScoredPath.score.overallPriorityIndex,
    relationshipCredibility: preferredScoredPath.score.relationshipCredibility,
    temporalFreshness: preferredScoredPath.score.temporalFreshness,
    confirmationReadiness: preferredScoredPath.score.confirmationReadiness,
    pathEfficiency: preferredScoredPath.score.pathEfficiency,
    relationshipHopCount: preferredScoredPath.score.relationshipHopCount,
    intermediaryCount: preferredScoredPath.path.intermediaryCount,
    confirmationRequiredHopCount: preferredScoredPath.score.confirmationRequiredHopCount,
    bottleneckRelationshipId: preferredScoredPath.score.bottleneckRelationshipId,
    whyPreferred,
    comparisonSummary: whyPreferred.join(" "),
    steps,
    weakestLink,
    activationPlan: buildActivationPlan(
      dataset,
      preferredScoredPath,
      primaryTargetPersonId,
      primaryTargetPersonName,
      "preferred_route_selected"
    ),
  };

  return {
    executionStatus: "success",
    targetInvestorId,
    disposition: "preferred_route_selected",
    targetPersonDecision,
    preferredRoute,
    recommendedPathId: preferredScoredPath.path.id,
    topRoutePathIds,
    alternativeRoutes,
    rejectedRoutesToPrimaryTarget,
    activationPlan: preferredRoute.activationPlan,
    errors: [],
  };
}
