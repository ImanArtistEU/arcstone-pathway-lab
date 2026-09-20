import {
  PathwayDataset,
  PathCandidate,
  PathTraversalStep,
  PathGenerationResult,
  PathGenerationDisposition,
  PathGenerationError,
  EntityReference,
} from "@/types/pathway";
import { assertDatasetIntegrity } from "./assertDatasetIntegrity";
import { qualifyRelationships } from "./qualifyRelationships";
import { QualificationPolicy } from "./qualificationPolicy";
import {
  PathGenerationPolicy,
  DEFAULT_PATH_GENERATION_POLICY,
} from "./pathGenerationPolicy";
import { buildTraversalGraph, TraversalGraphEdge } from "./buildTraversalGraph";
import { isCurrentTargetPersonAffiliationVerified } from "./targetPersonAffiliation";

interface PathSearchState {
  currentPersonId: string;
  visitedPersonIds: Set<string>;
  steps: PathTraversalStep[];
}

function createErrorResult(
  targetInvestorId: string,
  errors: PathGenerationError[],
  campaignId = "",
  sourceFounderPersonIds: string[] = [],
  targetPersonIds: string[] = []
): PathGenerationResult {
  return {
    executionStatus: "error",
    targetInvestorId,
    campaignId,
    sourceFounderPersonIds,
    targetPersonIds,
    paths: [],
    eligiblePathCount: 0,
    confirmationRequiredPathCount: 0,
    filteredConfirmationPathCount: 0,
    disposition: null,
    coldOutreachRequired: null,
    errors,
  };
}

/**
 * Deterministically generates all simple person-to-person routes from campaign founders
 * to candidate people of a target investor organization.
 *
 * Contract & Invariants:
 * 1. ANALYSIS ERROR != NO KNOWN PATH: Invalid dataset, missing entities, or invalid policies yield
 *    executionStatus: "error", disposition: null, coldOutreachRequired: null.
 * 2. POLICY FILTERING != NO KNOWN PATH: Excluding confirmation paths yields disposition: "confirmation_paths_filtered",
 *    coldOutreachRequired: false.
 * 3. QUALIFICATION GATES TRAVERSAL: Only qualified relationships enter graph traversal.
 * 4. STRUCTURAL CONTEXT != INTRODUCTION EDGE: Structural edges (works_at, etc.) never traverse.
 * 5. ORGANIZATION != INTRODUCER: Paths consist exclusively of person nodes.
 * 6. TARGET PERSON AFFILIATION VERIFIED: Candidates must be currently affiliated via currentOrganizationIds
 *    or a current works_at relationship.
 */
export function generatePathsForTarget(
  dataset: PathwayDataset,
  targetInvestorId: string,
  referenceDate: string | Date,
  pathPolicy?: Partial<PathGenerationPolicy>,
  qualificationPolicy?: QualificationPolicy
): PathGenerationResult {
  // 1. Validate Reference Date
  let refDateObj: Date;
  if (referenceDate instanceof Date) {
    refDateObj = referenceDate;
  } else if (typeof referenceDate === "string" && referenceDate.trim() !== "") {
    refDateObj = new Date(referenceDate);
  } else {
    return createErrorResult(targetInvestorId, [
      {
        code: "INVALID_REFERENCE_DATE",
        message: "Reference date must be a non-empty valid date string or Date object.",
      },
    ]);
  }

  if (isNaN(refDateObj.getTime())) {
    return createErrorResult(targetInvestorId, [
      {
        code: "INVALID_REFERENCE_DATE",
        message: `Invalid reference date provided: ${String(referenceDate)}`,
      },
    ]);
  }

  // 2. Validate Path Generation Policy
  const maxRelationshipHops =
    pathPolicy?.maxRelationshipHops ??
    DEFAULT_PATH_GENERATION_POLICY.maxRelationshipHops;
  if (
    typeof maxRelationshipHops !== "number" ||
    !Number.isFinite(maxRelationshipHops) ||
    !Number.isInteger(maxRelationshipHops) ||
    maxRelationshipHops < 1
  ) {
    return createErrorResult(targetInvestorId, [
      {
        code: "INVALID_PATH_POLICY",
        message: `maxRelationshipHops must be a finite integer >= 1, received: ${String(
          maxRelationshipHops
        )}`,
      },
    ]);
  }

  const includeConfirmationRequired =
    pathPolicy?.includeConfirmationRequired ??
    DEFAULT_PATH_GENERATION_POLICY.includeConfirmationRequired;
  if (typeof includeConfirmationRequired !== "boolean") {
    return createErrorResult(targetInvestorId, [
      {
        code: "INVALID_PATH_POLICY",
        message: `includeConfirmationRequired must be a boolean, received: ${String(
          includeConfirmationRequired
        )}`,
      },
    ]);
  }

  const policy: PathGenerationPolicy = {
    maxRelationshipHops,
    includeConfirmationRequired,
  };

  // 3. Validate Qualification Policy if supplied
  if (qualificationPolicy !== undefined) {
    const { recentMaxDays, agingMaxDays } = qualificationPolicy;
    if (
      typeof recentMaxDays !== "number" ||
      !Number.isFinite(recentMaxDays) ||
      !Number.isInteger(recentMaxDays) ||
      recentMaxDays < 0
    ) {
      return createErrorResult(targetInvestorId, [
        {
          code: "INVALID_QUALIFICATION_POLICY",
          message: `recentMaxDays must be a finite integer >= 0, received: ${String(
            recentMaxDays
          )}`,
        },
      ]);
    }
    if (
      typeof agingMaxDays !== "number" ||
      !Number.isFinite(agingMaxDays) ||
      !Number.isInteger(agingMaxDays) ||
      agingMaxDays < recentMaxDays
    ) {
      return createErrorResult(targetInvestorId, [
        {
          code: "INVALID_QUALIFICATION_POLICY",
          message: `agingMaxDays must be a finite integer >= recentMaxDays, received: ${String(
            agingMaxDays
          )}`,
        },
      ]);
    }
  }

  // 4. Validate Dataset Integrity
  const integrity = assertDatasetIntegrity(dataset);
  if (!integrity.valid) {
    return createErrorResult(targetInvestorId, [
      {
        code: "INVALID_DATASET",
        message: `Dataset integrity validation failed: ${integrity.errors.join(
          "; "
        )}`,
      },
    ]);
  }

  // 5. Resolve requested TargetInvestor
  const targetInvestor = dataset.targetInvestors.find(
    (t) => t.id === targetInvestorId
  );
  if (!targetInvestor) {
    return createErrorResult(targetInvestorId, [
      {
        code: "TARGET_INVESTOR_NOT_FOUND",
        message: `TargetInvestor "${targetInvestorId}" not found in dataset.`,
        entityId: targetInvestorId,
      },
    ]);
  }

  // 6. Resolve Campaign
  const campaign = dataset.campaigns.find(
    (c) => c.id === targetInvestor.campaignId
  );
  if (!campaign) {
    return createErrorResult(
      targetInvestorId,
      [
        {
          code: "CAMPAIGN_NOT_FOUND",
          message: `Campaign "${targetInvestor.campaignId}" referenced by TargetInvestor "${targetInvestorId}" not found in dataset.`,
          entityId: targetInvestor.campaignId,
        },
      ],
      targetInvestor.campaignId
    );
  }

  // 7. Resolve Campaign Founders
  const sourceFounderPersonIds = campaign.founderPersonIds || [];
  if (sourceFounderPersonIds.length === 0) {
    return createErrorResult(
      targetInvestorId,
      [
        {
          code: "NO_FOUNDERS",
          message: `Campaign "${campaign.id}" contains zero founderPersonIds.`,
          entityId: campaign.id,
        },
      ],
      campaign.id
    );
  }

  for (const fId of sourceFounderPersonIds) {
    if (!dataset.people.some((p) => p.id === fId)) {
      return createErrorResult(
        targetInvestorId,
        [
          {
            code: "FOUNDER_NOT_FOUND",
            message: `Founder person "${fId}" not found in dataset.people.`,
            entityId: fId,
          },
        ],
        campaign.id,
        sourceFounderPersonIds
      );
    }
  }

  // 8. Resolve Candidate Target People
  const targetPersonIds = targetInvestor.candidatePersonIds || [];
  if (targetPersonIds.length === 0) {
    return createErrorResult(
      targetInvestorId,
      [
        {
          code: "NO_TARGET_PEOPLE",
          message: `TargetInvestor "${targetInvestorId}" contains zero candidatePersonIds.`,
          entityId: targetInvestorId,
        },
      ],
      campaign.id,
      sourceFounderPersonIds
    );
  }

  for (const cId of targetPersonIds) {
    if (!dataset.people.some((p) => p.id === cId)) {
      return createErrorResult(
        targetInvestorId,
        [
          {
            code: "TARGET_PERSON_NOT_FOUND",
            message: `Candidate target person "${cId}" not found in dataset.people.`,
            entityId: cId,
          },
        ],
        campaign.id,
        sourceFounderPersonIds,
        targetPersonIds
      );
    }
  }

  // 9. Verify Target Person Affiliation
  for (const cId of targetPersonIds) {
    const targetOrgId = targetInvestor.investorOrganizationId;

    if (!isCurrentTargetPersonAffiliationVerified(dataset, cId, targetOrgId)) {
      return createErrorResult(
        targetInvestorId,
        [
          {
            code: "TARGET_PERSON_AFFILIATION_UNVERIFIED",
            message: `Candidate target person "${cId}" is not verifiably currently affiliated with target investor organization "${targetOrgId}".`,
            entityId: cId,
          },
        ],
        campaign.id,
        sourceFounderPersonIds,
        targetPersonIds
      );
    }
  }

  const targetPersonSet = new Set(targetPersonIds);

  // 10. Run Relationship Qualification
  const qualifications = qualifyRelationships(
    dataset,
    refDateObj,
    qualificationPolicy
  );

  // Build internal traversal graph with includeConfirmationRequired: true
  // so we discover all candidate routes in the network regardless of display filter
  const internalGraphPolicy: PathGenerationPolicy = {
    maxRelationshipHops: policy.maxRelationshipHops,
    includeConfirmationRequired: true,
  };

  const graph = buildTraversalGraph(dataset, qualifications, internalGraphPolicy);

  // 11. Bounded Breadth-First Search from each founder to candidate target people
  const candidatePaths: PathCandidate[] = [];

  for (const founderPersonId of sourceFounderPersonIds) {
    const queue: PathSearchState[] = [
      {
        currentPersonId: founderPersonId,
        visitedPersonIds: new Set([founderPersonId]),
        steps: [],
      },
    ];

    while (queue.length > 0) {
      const state = queue.shift()!;

      if (state.steps.length >= policy.maxRelationshipHops) {
        continue;
      }

      const outgoingEdges: TraversalGraphEdge[] =
        graph.get(state.currentPersonId) || [];

      for (const edge of outgoingEdges) {
        const nextPersonId = edge.destinationPersonId;

        if (state.visitedPersonIds.has(nextPersonId)) {
          continue;
        }

        const nextStep: PathTraversalStep = {
          relationshipId: edge.relationshipId,
          fromPersonId: edge.sourcePersonId,
          toPersonId: edge.destinationPersonId,
          traversedReverse: edge.traversedReverse,
          qualificationStatus: edge.qualificationStatus,
          qualificationReasonCodes: [...edge.qualificationReasonCodes],
          qualificationRecency: edge.qualificationRecency,
          qualificationEvidenceSummary: { ...edge.qualificationEvidenceSummary },
          latestRelevantInteractionAt: edge.latestRelevantInteractionAt,
        };

        const updatedSteps = [...state.steps, nextStep];

        if (targetPersonSet.has(nextPersonId)) {
          const nodes: EntityReference[] = [
            { type: "person", id: founderPersonId },
            ...updatedSteps.map((s) => ({
              type: "person" as const,
              id: s.toPersonId,
            })),
          ];

          const intermediaryCount = Math.max(0, nodes.length - 2);

          const confirmationReqRels: string[] = [];
          let isEligible = true;

          for (const s of updatedSteps) {
            if (s.qualificationStatus === "confirmation_required") {
              isEligible = false;
              if (!confirmationReqRels.includes(s.relationshipId)) {
                confirmationReqRels.push(s.relationshipId);
              }
            } else if (s.qualificationStatus !== "eligible") {
              isEligible = false;
            }
          }

          const stepSequence = updatedSteps
            .map((s) =>
              s.traversedReverse
                ? `${s.relationshipId}:rev`
                : s.relationshipId
            )
            .join(">");

          const pathId = `path:${targetInvestorId}:${founderPersonId}:${nextPersonId}:${stepSequence}`;

          candidatePaths.push({
            id: pathId,
            targetInvestorId,
            sourceFounderPersonId: founderPersonId,
            targetPersonId: nextPersonId,
            nodes,
            relationshipIds: updatedSteps.map((s) => s.relationshipId),
            steps: updatedSteps,
            intermediaryCount,
            status: isEligible ? "eligible" : "candidate",
            requiresConfirmationRelationshipIds: confirmationReqRels,
          });
        } else {
          if (updatedSteps.length < policy.maxRelationshipHops) {
            const nextVisited = new Set(state.visitedPersonIds);
            nextVisited.add(nextPersonId);
            queue.push({
              currentPersonId: nextPersonId,
              visitedPersonIds: nextVisited,
              steps: updatedSteps,
            });
          }
        }
      }
    }
  }

  // Deterministic result ordering: hop count ascending, then stable path ID
  candidatePaths.sort((a, b) => {
    const hopDiff = a.relationshipIds.length - b.relationshipIds.length;
    if (hopDiff !== 0) return hopDiff;
    return a.id.localeCompare(b.id);
  });

  const knownEligiblePaths = candidatePaths.filter(
    (p) => p.status === "eligible"
  );
  const knownConfirmationPaths = candidatePaths.filter(
    (p) => p.status === "candidate"
  );

  const eligiblePathCount = knownEligiblePaths.length;
  const confirmationRequiredPathCount = knownConfirmationPaths.length;

  const returnedPaths = policy.includeConfirmationRequired
    ? candidatePaths
    : knownEligiblePaths;

  const filteredConfirmationPathCount = policy.includeConfirmationRequired
    ? 0
    : confirmationRequiredPathCount;

  let disposition: PathGenerationDisposition;
  if (eligiblePathCount > 0) {
    disposition = "eligible_path_available";
  } else if (
    policy.includeConfirmationRequired &&
    confirmationRequiredPathCount > 0
  ) {
    disposition = "confirmation_path_available";
  } else if (
    !policy.includeConfirmationRequired &&
    confirmationRequiredPathCount > 0
  ) {
    disposition = "confirmation_paths_filtered";
  } else {
    disposition = "no_known_path";
  }

  const coldOutreachRequired = disposition === "no_known_path";

  return {
    executionStatus: "success",
    targetInvestorId,
    campaignId: campaign.id,
    sourceFounderPersonIds,
    targetPersonIds,
    paths: returnedPaths,
    eligiblePathCount,
    confirmationRequiredPathCount,
    filteredConfirmationPathCount,
    disposition,
    coldOutreachRequired,
    errors: [],
  };
}
