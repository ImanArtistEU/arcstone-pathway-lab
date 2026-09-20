import {
  PathRejectionResult,
  PathScoringResult,
  ScoredPath,
  PathScore,
  PathStepScore,
  PathCandidate,
} from "@/types/pathway";
import {
  PathScoringPolicy,
  DEFAULT_PATH_SCORING_POLICY,
} from "./pathScoringPolicy";

/**
 * Deterministically assigns heuristic priority index scores to RETAINED paths.
 *
 * Core Invariants:
 * 1. SCORE != PROBABILITY: A score is an uncalibrated priority index, not a conversion or meeting likelihood.
 * 2. SCORING != RECOMMENDATION: Scores describe relative route friction/quality; they do not select a winner.
 * 3. SCORING != TARGET SELECTION: Does not rank or select a primary target person or path.
 * 4. REJECTED PATHS != SCOREABLE PATHS: Rejected paths never receive scores.
 * 5. WEAKEST LINK MATTERS: Path-level credibility and freshness are governed by the minimum step score.
 * 6. ORDER PRESERVATION: Retained path order is strictly preserved (SCORING != RANKING).
 * 7. EXPLANATION MUST MATCH EVIDENCE: Derived directly from step-level computed evidence.
 * 8. MALFORMED PATH != SCOREABLE PATH: Fails closed on malformed input data.
 * 9. SCORED OUTPUT IS IMMUTABLE: Deep-cloned to protect upstream state.
 */
export function scoreRetainedPaths(
  rejectionResult: PathRejectionResult,
  scoringPolicy?: Partial<PathScoringPolicy>
): PathScoringResult {
  // 1. Validate Policy
  const policy: PathScoringPolicy = {
    ...DEFAULT_PATH_SCORING_POLICY,
    ...scoringPolicy,
  };

  const validationError = validateScoringPolicy(policy);
  if (validationError) {
    return {
      executionStatus: "error",
      targetInvestorId: rejectionResult?.targetInvestorId || "",
      upstreamRejectionDisposition: rejectionResult?.disposition ?? null,
      inputRetainedPathCount: rejectionResult?.retainedPaths?.length || 0,
      scoredPaths: [],
      disposition: "error",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [validationError],
    };
  }

  // 2. Upstream Error Handling
  if (
    rejectionResult.executionStatus === "upstream_error" ||
    rejectionResult.executionStatus === "error"
  ) {
    return {
      executionStatus: "upstream_error",
      targetInvestorId: rejectionResult.targetInvestorId,
      upstreamRejectionDisposition: rejectionResult.disposition,
      inputRetainedPathCount: 0,
      scoredPaths: [],
      disposition: "upstream_error",
      calibrationStatus: "uncalibrated_heuristic",
      errors: rejectionResult.errors || [],
    };
  }

  // 3. Upstream Filtered Handling
  if (
    rejectionResult.disposition === "upstream_paths_filtered" &&
    rejectionResult.retainedPaths.length === 0
  ) {
    return {
      executionStatus: "success",
      targetInvestorId: rejectionResult.targetInvestorId,
      upstreamRejectionDisposition: rejectionResult.disposition,
      inputRetainedPathCount: 0,
      scoredPaths: [],
      disposition: "upstream_paths_filtered",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [],
    };
  }

  // 4. No Retained Paths Handling
  if (rejectionResult.retainedPaths.length === 0) {
    return {
      executionStatus: "success",
      targetInvestorId: rejectionResult.targetInvestorId,
      upstreamRejectionDisposition: rejectionResult.disposition,
      inputRetainedPathCount: 0,
      scoredPaths: [],
      disposition: "no_retained_paths",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [],
    };
  }

  // 5. Validate Retained Paths Shape Before Scoring (Fail closed on malformed data)
  for (const path of rejectionResult.retainedPaths) {
    const pathValidationError = validateRetainedPath(path);
    if (pathValidationError) {
      return {
        executionStatus: "error",
        targetInvestorId: rejectionResult.targetInvestorId,
        upstreamRejectionDisposition: rejectionResult.disposition,
        inputRetainedPathCount: rejectionResult.retainedPaths.length,
        scoredPaths: [],
        disposition: "error",
        calibrationStatus: "uncalibrated_heuristic",
        errors: [pathValidationError],
      };
    }
  }

  // 6. Score ONLY Retained Paths (Preserving upstream order)
  const scoredPaths: ScoredPath[] = rejectionResult.retainedPaths.map(
    (path) => {
      const stepScores: PathStepScore[] = [];
      const stepCredibilities: number[] = [];
      const stepFreshnesses: number[] = [];

      for (const step of path.steps) {
        let stepCredibility: number;
        let stepExplanation = "";

        if (step.qualificationStatus === "eligible") {
          if (
            step.qualificationReasonCodes.includes("RECENT_DIRECT_INTERACTION")
          ) {
            stepCredibility = policy.eligibleDirectInteractionScore;
            stepExplanation =
              "Recent confirmed direct interaction; highest current credibility tier.";
          } else if (
            step.qualificationReasonCodes.includes("RECENT_INTERNAL_EVIDENCE")
          ) {
            stepCredibility = policy.eligibleFounderAssertedScore;
            stepExplanation =
              "Recent founder-asserted internal evidence; high credibility tier.";
          } else {
            stepCredibility = policy.eligibleFallbackScore;
            stepExplanation = "Eligible relationship with verified evidence.";
          }
        } else {
          // confirmation_required (validated upfront)
          const summary = step.qualificationEvidenceSummary;

          if (summary.confirmedTwoWayInteraction > 0) {
            stepCredibility = policy.confirmedHistoricalInteractionScore;
            stepExplanation =
              "Confirmed historical reciprocal interaction; credibility preserved but freshness reduced.";
          } else if (summary.founderAsserted > 0) {
            stepCredibility = policy.founderAssertedConfirmationScore;
            stepExplanation =
              "Founder-asserted relationship requiring confirmation.";
          } else if (summary.unconfirmedInteraction > 0) {
            stepCredibility = policy.unconfirmedInteractionScore;
            stepExplanation =
              "Unconfirmed interaction requiring verification.";
          } else if (summary.platformSignal > 0) {
            stepCredibility = policy.platformSignalScore;
            stepExplanation =
              "Platform-only network signal requiring confirmation.";
          } else if (summary.publicContext > 0) {
            stepCredibility = policy.publicContextScore;
            stepExplanation =
              "Public context signal requiring confirmation.";
          } else {
            stepCredibility = policy.confirmationFallbackScore;
            stepExplanation = "Relationship requiring confirmation.";
          }
        }

        let stepFreshness: number;
        switch (step.qualificationRecency) {
          case "recent":
            stepFreshness = policy.recentScore;
            break;
          case "aging":
            stepFreshness = policy.agingScore;
            break;
          case "stale":
            stepFreshness = policy.staleScore;
            break;
          case "unknown":
          default:
            stepFreshness = policy.unknownRecencyScore;
            break;
        }

        stepScores.push({
          relationshipId: step.relationshipId,
          relationshipCredibility: stepCredibility,
          temporalFreshness: stepFreshness,
          qualificationStatus: step.qualificationStatus,
          qualificationRecency: step.qualificationRecency,
          qualificationReasonCodes: [...step.qualificationReasonCodes],
          explanation: stepExplanation,
        });

        stepCredibilities.push(stepCredibility);
        stepFreshnesses.push(stepFreshness);
      }

      // Weakest Link Principle for Credibility
      const pathCredibility = Math.min(...stepCredibilities);
      const bottleneckStepIndex = stepCredibilities.indexOf(pathCredibility);
      const bottleneckStep = stepScores[bottleneckStepIndex];
      const bottleneckRelationshipId = bottleneckStep?.relationshipId;

      // Weakest Link Principle for Temporal Freshness
      const pathFreshness = Math.min(...stepFreshnesses);

      // Confirmation Readiness
      const confirmationRequiredHopCount = path.steps.filter(
        (s) => s.qualificationStatus === "confirmation_required"
      ).length;

      const confirmationReadiness = Math.max(
        0,
        policy.confirmationReadinessBase -
          confirmationRequiredHopCount * policy.confirmationPenaltyPerHop
      );

      // Path Efficiency
      const relationshipHopCount = path.steps.length;
      const additionalHops = Math.max(0, relationshipHopCount - 1);
      const pathEfficiency = Math.max(
        0,
        policy.pathEfficiencyBase - additionalHops * policy.additionalHopPenalty
      );

      // Overall Priority Index
      const rawIndex =
        pathCredibility * (policy.weightRelationshipCredibility / 100) +
        pathFreshness * (policy.weightTemporalFreshness / 100) +
        confirmationReadiness * (policy.weightConfirmationReadiness / 100) +
        pathEfficiency * (policy.weightPathEfficiency / 100);

      const overallPriorityIndex = Math.max(
        0,
        Math.min(100, Math.round(rawIndex))
      );

      // Refactored Deterministic Explanation
      const bottleneckText = bottleneckStep
        ? `Weakest credibility step is ${bottleneckStep.relationshipId}: ${bottleneckStep.explanation}.`
        : "";

      const pathExplanation = `Priority index ${overallPriorityIndex}/100. Route contains ${relationshipHopCount} relationship hop${
        relationshipHopCount === 1 ? "" : "s"
      }, with ${confirmationRequiredHopCount} requiring confirmation. ${bottleneckText} Path efficiency is ${pathEfficiency}/100. This is an uncalibrated heuristic, not a success probability.`;

      const score: PathScore = {
        pathId: path.id,
        overallPriorityIndex,
        relationshipCredibility: pathCredibility,
        temporalFreshness: pathFreshness,
        confirmationReadiness,
        pathEfficiency,
        confirmationRequiredHopCount,
        relationshipHopCount,
        bottleneckRelationshipId,
        stepScores,
        calibrationStatus: "uncalibrated_heuristic",
        isProbability: false,
        explanation: pathExplanation,
      };

      // Fully deep-clone path candidate object to enforce immutability
      const clonedPath: PathCandidate = {
        ...path,
        nodes: path.nodes.map((node) => ({ ...node })),
        relationshipIds: [...path.relationshipIds],
        requiresConfirmationRelationshipIds: [
          ...path.requiresConfirmationRelationshipIds,
        ],
        steps: path.steps.map((s) => ({
          ...s,
          qualificationReasonCodes: [...s.qualificationReasonCodes],
          qualificationEvidenceSummary: { ...s.qualificationEvidenceSummary },
        })),
      };

      return {
        path: clonedPath,
        score,
      };
    }
  );

  return {
    executionStatus: "success",
    targetInvestorId: rejectionResult.targetInvestorId,
    upstreamRejectionDisposition: rejectionResult.disposition,
    inputRetainedPathCount: rejectionResult.retainedPaths.length,
    scoredPaths,
    disposition: "scores_available",
    calibrationStatus: "uncalibrated_heuristic",
    errors: [],
  };
}

function validateRetainedPath(path: PathCandidate): string | null {
  if (!path || typeof path !== "object") {
    return "Invalid retained path: path object is missing or null.";
  }

  const pathId = path.id || "unknown";

  if (path.status === "rejected") {
    return `Invalid retained path "${pathId}": rejected paths cannot be scored.`;
  }

  if (path.status !== "eligible" && path.status !== "candidate") {
    return `Invalid retained path "${pathId}": invalid status "${path.status}".`;
  }

  if (!Array.isArray(path.steps) || path.steps.length === 0) {
    return `Invalid retained path "${pathId}": path contains zero traversal steps.`;
  }

  if (
    !Array.isArray(path.relationshipIds) ||
    path.relationshipIds.length !== path.steps.length
  ) {
    return `Invalid retained path "${pathId}": relationshipIds length does not match steps length.`;
  }

  if (
    !Array.isArray(path.nodes) ||
    path.nodes.length !== path.steps.length + 1
  ) {
    return `Invalid retained path "${pathId}": nodes length does not match steps length + 1.`;
  }

  const validRecencies = new Set(["recent", "aging", "stale", "unknown"]);
  const requiredSummaryFields = [
    "total",
    "directInteraction",
    "founderAsserted",
    "publicContext",
    "platformSignal",
    "confirmedTwoWayInteraction",
    "oneWayInteraction",
    "unconfirmedInteraction",
  ] as const;

  for (let i = 0; i < path.steps.length; i++) {
    const step = path.steps[i];
    const stepRelId = step?.relationshipId || `step-${i}`;

    if (!step || typeof step !== "object") {
      return `Invalid retained path "${pathId}": step at index ${i} is missing.`;
    }

    if (
      step.qualificationStatus !== "eligible" &&
      step.qualificationStatus !== "confirmation_required"
    ) {
      return `Invalid retained path "${pathId}": step "${stepRelId}" has invalid qualificationStatus "${step.qualificationStatus}".`;
    }

    if (!validRecencies.has(step.qualificationRecency)) {
      return `Invalid retained path "${pathId}": step "${stepRelId}" has invalid qualificationRecency "${step.qualificationRecency}".`;
    }

    if (!Array.isArray(step.qualificationReasonCodes)) {
      return `Invalid retained path "${pathId}": step "${stepRelId}" qualificationReasonCodes must be an array.`;
    }

    const summary = step.qualificationEvidenceSummary;
    if (!summary || typeof summary !== "object") {
      return `Invalid retained path "${pathId}": step "${stepRelId}" has missing qualificationEvidenceSummary.`;
    }

    for (const field of requiredSummaryFields) {
      const val = summary[field as keyof typeof summary];
      if (
        typeof val !== "number" ||
        !Number.isFinite(val) ||
        !Number.isInteger(val) ||
        val < 0
      ) {
        return `Invalid retained path "${pathId}": step "${stepRelId}" has invalid qualificationEvidenceSummary field "${field}". Must be a finite non-negative integer.`;
      }
    }
  }

  return null;
}

function validateScoringPolicy(policy: PathScoringPolicy): string | null {
  const scoreKeys: (keyof PathScoringPolicy)[] = [
    "weightRelationshipCredibility",
    "weightTemporalFreshness",
    "weightConfirmationReadiness",
    "weightPathEfficiency",
    "eligibleDirectInteractionScore",
    "eligibleFounderAssertedScore",
    "eligibleFallbackScore",
    "confirmedHistoricalInteractionScore",
    "founderAssertedConfirmationScore",
    "unconfirmedInteractionScore",
    "platformSignalScore",
    "publicContextScore",
    "confirmationFallbackScore",
    "recentScore",
    "agingScore",
    "staleScore",
    "unknownRecencyScore",
    "confirmationReadinessBase",
    "confirmationPenaltyPerHop",
    "pathEfficiencyBase",
    "additionalHopPenalty",
  ];

  for (const key of scoreKeys) {
    const val = policy[key];
    if (
      typeof val !== "number" ||
      !Number.isFinite(val) ||
      !Number.isInteger(val) ||
      val < 0 ||
      val > 100
    ) {
      return `Invalid scoring policy field "${key}": ${String(
        val
      )}. Must be a finite integer between 0 and 100 inclusive.`;
    }
  }

  const weightSum =
    policy.weightRelationshipCredibility +
    policy.weightTemporalFreshness +
    policy.weightConfirmationReadiness +
    policy.weightPathEfficiency;

  if (weightSum !== 100) {
    return `Scoring policy weights must sum to exactly 100. Received sum: ${weightSum}.`;
  }

  return null;
}
