import {
  PathwayDataset,
  PathCandidate,
  PathTraversalStep,
  PathGenerationResult,
  PathGenerationDisposition,
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

interface PathSearchState {
  currentPersonId: string;
  visitedPersonIds: Set<string>;
  steps: PathTraversalStep[];
}

/**
 * Deterministically generates all simple person-to-person routes from campaign founders
 * to candidate people of a target investor organization.
 *
 * Invariants:
 * 1. QUALIFICATION GATES TRAVERSAL: Only qualified relationships enter graph traversal.
 * 2. STRUCTURAL CONTEXT != INTRODUCTION EDGE: Structural edges (works_at, etc.) never traverse.
 * 3. ORGANIZATION != INTRODUCER: Paths consist exclusively of person nodes.
 * 4. SEMANTIC DIRECTION != TRAVERSAL DIRECTION: Governed strictly by TraversalPolicy.
 * 5. PATH GENERATION != PATH RANKING: All discovered simple paths within maxRelationshipHops
 *    are returned in deterministic enumeration order without quality ranking or best-path bias.
 */
export function generatePathsForTarget(
  dataset: PathwayDataset,
  targetInvestorId: string,
  referenceDate: string | Date,
  pathPolicy?: Partial<PathGenerationPolicy>,
  qualificationPolicy?: QualificationPolicy
): PathGenerationResult {
  const policy: PathGenerationPolicy = {
    ...DEFAULT_PATH_GENERATION_POLICY,
    ...pathPolicy,
  };

  const emptyResult = (
    errors: string[],
    campaignId = "",
    sourceFounders: string[] = [],
    targetPersons: string[] = []
  ): PathGenerationResult => ({
    targetInvestorId,
    campaignId,
    sourceFounderPersonIds: sourceFounders,
    targetPersonIds: targetPersons,
    paths: [],
    eligiblePathCount: 0,
    confirmationRequiredPathCount: 0,
    disposition: "no_known_path",
    coldOutreachRequired: true,
    errors,
  });

  // 1. Validate dataset integrity
  const integrity = assertDatasetIntegrity(dataset);
  if (!integrity.valid) {
    return emptyResult([
      "Dataset integrity validation failed before path generation:",
      ...integrity.errors,
    ]);
  }

  // 2. Resolve requested TargetInvestor
  const targetInvestor = dataset.targetInvestors.find(
    (t) => t.id === targetInvestorId
  );
  if (!targetInvestor) {
    return emptyResult([
      `TargetInvestor "${targetInvestorId}" not found in dataset.`,
    ]);
  }

  // 3. Resolve its campaign
  const campaign = dataset.campaigns.find(
    (c) => c.id === targetInvestor.campaignId
  );
  if (!campaign) {
    return emptyResult(
      [
        `Campaign "${targetInvestor.campaignId}" referenced by TargetInvestor "${targetInvestorId}" not found in dataset.`,
      ],
      targetInvestor.campaignId
    );
  }

  // 4. Resolve campaign founders
  const sourceFounderPersonIds = campaign.founderPersonIds || [];
  if (sourceFounderPersonIds.length === 0) {
    return emptyResult(
      [`Campaign "${campaign.id}" contains zero founderPersonIds.`],
      campaign.id
    );
  }

  const missingFounders = sourceFounderPersonIds.filter(
    (id) => !dataset.people.some((p) => p.id === id)
  );
  if (missingFounders.length > 0) {
    return emptyResult(
      [
        `Founder person ID(s) not found in dataset.people: ${missingFounders.join(
          ", "
        )}`,
      ],
      campaign.id,
      sourceFounderPersonIds
    );
  }

  // 5. Resolve candidate target people
  const targetPersonIds = targetInvestor.candidatePersonIds || [];
  if (targetPersonIds.length === 0) {
    return emptyResult(
      [
        `TargetInvestor "${targetInvestorId}" contains zero candidatePersonIds.`,
      ],
      campaign.id,
      sourceFounderPersonIds
    );
  }

  const missingCandidates = targetPersonIds.filter(
    (id) => !dataset.people.some((p) => p.id === id)
  );
  if (missingCandidates.length > 0) {
    return emptyResult(
      [
        `Candidate target person ID(s) not found in dataset.people: ${missingCandidates.join(
          ", "
        )}`,
      ],
      campaign.id,
      sourceFounderPersonIds,
      targetPersonIds
    );
  }

  const targetPersonSet = new Set(targetPersonIds);

  // 6. Run Relationship Qualification
  const qualifications = qualifyRelationships(
    dataset,
    referenceDate,
    qualificationPolicy
  );

  // 7. Build deterministic traversal graph
  const graph = buildTraversalGraph(dataset, qualifications, policy);

  // 8. Bounded Breadth-First Search from each founder to candidate target people
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

      // If maximum hops reached, cannot expand further
      if (state.steps.length >= policy.maxRelationshipHops) {
        continue;
      }

      const outgoingEdges: TraversalGraphEdge[] =
        graph.get(state.currentPersonId) || [];

      for (const edge of outgoingEdges) {
        const nextPersonId = edge.destinationPersonId;

        // Prevent cycles within the candidate path
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
        };

        const updatedSteps = [...state.steps, nextStep];

        // Check if destination is a candidate target person
        if (targetPersonSet.has(nextPersonId)) {
          // Reached target candidate: create candidate path
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

          // Generate stable deterministic path ID
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

          // Stop expanding this path once a candidate target person is reached
        } else {
          // Continue expanding if under maxRelationshipHops
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

  const eligiblePathCount = candidatePaths.filter(
    (p) => p.status === "eligible"
  ).length;
  const confirmationRequiredPathCount = candidatePaths.filter(
    (p) => p.status === "candidate"
  ).length;

  let disposition: PathGenerationDisposition;
  let coldOutreachRequired = false;

  if (eligiblePathCount > 0) {
    disposition = "eligible_path_available";
    coldOutreachRequired = false;
  } else if (confirmationRequiredPathCount > 0) {
    disposition = "confirmation_path_available";
    coldOutreachRequired = false;
  } else {
    disposition = "no_known_path";
    coldOutreachRequired = true;
  }

  return {
    targetInvestorId,
    campaignId: campaign.id,
    sourceFounderPersonIds,
    targetPersonIds,
    paths: candidatePaths,
    eligiblePathCount,
    confirmationRequiredPathCount,
    disposition,
    coldOutreachRequired,
    errors: [],
  };
}
