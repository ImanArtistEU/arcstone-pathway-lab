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

  // 5. Score ONLY Retained Paths (Preserving upstream order)
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
          // confirmation_required
          const summary = step.qualificationEvidenceSummary || {
            totalEvidenceCount: 0,
            confirmedTwoWayInteraction: 0,
            founderAsserted: 0,
            unconfirmedInteraction: 0,
            platformSignal: 0,
            publicContext: 0,
            other: 0,
          };

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
      const bottleneckRelationshipId =
        path.steps[bottleneckStepIndex]?.relationshipId;

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

      // Deterministic Explanation
      let detailsText = "";
      if (confirmationRequiredHopCount > 0) {
        detailsText = `The route is direct or multi-hop with ${confirmationRequiredHopCount} confirmation-required hop${
          confirmationRequiredHopCount > 1 ? "s" : ""
        }.`;
      } else if (relationshipHopCount > 1) {
        detailsText = `Both hops have recent confirmed direct interaction; the ${relationshipHopCount}-hop route carries a modest path-efficiency penalty.`;
      } else {
        detailsText = "Direct route with confirmed interaction.";
      }

      const pathExplanation = `Priority index ${overallPriorityIndex}/100. ${detailsText} This is an uncalibrated heuristic, not a success probability.`;

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

      // Clone path candidate object to enforce immutability
      const clonedPath: PathCandidate = {
        ...path,
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
