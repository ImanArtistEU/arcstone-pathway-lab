import {
  PathGenerationResult,
  PathCandidate,
  PathRejectionResult,
  PathRejectionEvaluation,
  PathRejectionReasonCode,
  PathRejectionDecision,
  PathRejectionDisposition,
} from "@/types/pathway";
import {
  PathRejectionPolicy,
  DEFAULT_PATH_REJECTION_POLICY,
} from "./pathRejectionPolicy";

const STABLE_REASON_ORDER: PathRejectionReasonCode[] = [
  "INVALID_INTERACTION_DATA",
  "FUTURE_INTERACTION_DATA",
  "INVALID_REFERENCE_CONTEXT",
  "ONE_WAY_OUTREACH_EDGE",
  "EXCESS_CONFIRMATION_HOPS",
];

/**
 * Deterministically filters generated path candidates using hard viability gates and depth/uncertainty policy bounds.
 *
 * Core Invariants:
 * 1. PATH EXISTENCE != PATH VIABILITY: A path existing structurally in the graph does not guarantee usability.
 * 2. REJECTION != RANKING: Removes unviable routes; does not compute scores or rank surviving routes.
 * 3. RETAINED != RECOMMENDED: Retained paths survived hard viability bounds, but are not explicitly recommended.
 * 4. ALL PATHS REJECTED != COLD OUTREACH REQUIRED: Path rejection filtering is distinct from outreach strategy determination.
 * 5. IMMUTABILITY: Original PathGenerationResult and PathCandidate objects are never mutated.
 */
export function applyPathRejection(
  generationResult: PathGenerationResult,
  rejectionPolicy?: Partial<PathRejectionPolicy>
): PathRejectionResult {
  // 1. Validate Rejection Policy
  const maxConfirmationRequiredHops =
    rejectionPolicy?.maxConfirmationRequiredHops ??
    DEFAULT_PATH_REJECTION_POLICY.maxConfirmationRequiredHops;

  if (
    typeof maxConfirmationRequiredHops !== "number" ||
    !Number.isFinite(maxConfirmationRequiredHops) ||
    !Number.isInteger(maxConfirmationRequiredHops) ||
    maxConfirmationRequiredHops < 0
  ) {
    return {
      executionStatus: "error",
      targetInvestorId: generationResult?.targetInvestorId || "",
      upstreamGenerationDisposition: generationResult?.disposition ?? null,
      inputPathCount: generationResult?.paths?.length || 0,
      retainedPaths: [],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 0,
      retainedCandidatePathCount: 0,
      rejectedPathCount: 0,
      disposition: "error",
      errors: [
        `Invalid maxConfirmationRequiredHops: ${String(
          maxConfirmationRequiredHops
        )}. Must be a finite integer >= 0.`,
      ],
    };
  }

  const policy: PathRejectionPolicy = {
    maxConfirmationRequiredHops,
  };

  // 2. Upstream Error Handling
  if (generationResult.executionStatus === "error") {
    return {
      executionStatus: "upstream_error",
      targetInvestorId: generationResult.targetInvestorId,
      upstreamGenerationDisposition: generationResult.disposition,
      inputPathCount: 0,
      retainedPaths: [],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 0,
      retainedCandidatePathCount: 0,
      rejectedPathCount: 0,
      disposition: "upstream_error",
      errors: generationResult.errors.map((e) => e.message),
    };
  }

  // 3. Upstream Filtered Handling
  if (
    generationResult.disposition === "confirmation_paths_filtered" &&
    generationResult.paths.length === 0
  ) {
    return {
      executionStatus: "success",
      targetInvestorId: generationResult.targetInvestorId,
      upstreamGenerationDisposition: generationResult.disposition,
      inputPathCount: 0,
      retainedPaths: [],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 0,
      retainedCandidatePathCount: 0,
      rejectedPathCount: 0,
      disposition: "upstream_paths_filtered",
      errors: [],
    };
  }

  // 4. Upstream Empty Input Handling
  if (generationResult.paths.length === 0) {
    return {
      executionStatus: "success",
      targetInvestorId: generationResult.targetInvestorId,
      upstreamGenerationDisposition: generationResult.disposition,
      inputPathCount: 0,
      retainedPaths: [],
      rejectedPaths: [],
      evaluations: [],
      retainedEligiblePathCount: 0,
      retainedCandidatePathCount: 0,
      rejectedPathCount: 0,
      disposition: "no_generated_paths",
      errors: [],
    };
  }

  // 5. Evaluate Each Generated Path
  const retainedPaths: PathCandidate[] = [];
  const rejectedPaths: PathCandidate[] = [];
  const evaluations: PathRejectionEvaluation[] = [];

  for (const path of generationResult.paths) {
    const detectedReasonsSet = new Set<PathRejectionReasonCode>();
    const blockingRelsSet = new Set<string>();
    let confirmationHopCount = 0;

    for (const step of path.steps) {
      if (step.qualificationStatus === "confirmation_required") {
        confirmationHopCount++;
      }

      if (step.qualificationReasonCodes.includes("ONE_WAY_OUTREACH_ONLY")) {
        detectedReasonsSet.add("ONE_WAY_OUTREACH_EDGE");
        blockingRelsSet.add(step.relationshipId);
      }

      if (step.qualificationReasonCodes.includes("INVALID_INTERACTION_DATE")) {
        detectedReasonsSet.add("INVALID_INTERACTION_DATA");
        blockingRelsSet.add(step.relationshipId);
      }

      if (step.qualificationReasonCodes.includes("FUTURE_INTERACTION_DATE")) {
        detectedReasonsSet.add("FUTURE_INTERACTION_DATA");
        blockingRelsSet.add(step.relationshipId);
      }

      if (step.qualificationReasonCodes.includes("INVALID_REFERENCE_DATE")) {
        detectedReasonsSet.add("INVALID_REFERENCE_CONTEXT");
        blockingRelsSet.add(step.relationshipId);
      }
    }

    if (confirmationHopCount > policy.maxConfirmationRequiredHops) {
      detectedReasonsSet.add("EXCESS_CONFIRMATION_HOPS");
      for (const step of path.steps) {
        if (step.qualificationStatus === "confirmation_required") {
          blockingRelsSet.add(step.relationshipId);
        }
      }
    }

    // Sort reasons deterministically according to STABLE_REASON_ORDER
    const orderedReasons = STABLE_REASON_ORDER.filter((r) =>
      detectedReasonsSet.has(r)
    );
    const blockingRelationshipIds = Array.from(blockingRelsSet);

    const decision: PathRejectionDecision =
      orderedReasons.length > 0 ? "reject" : "retain";

    const originalPathStatus = path.status === "eligible" ? "eligible" : "candidate";

    let explanation = "";
    if (decision === "retain") {
      if (originalPathStatus === "eligible") {
        explanation = "Path passed all deterministic rejection gates.";
      } else {
        explanation = `Path contains ${confirmationHopCount} confirmation-required relationship${
          confirmationHopCount > 1 ? "s" : ""
        }, within the current rejection policy limit of ${
          policy.maxConfirmationRequiredHops
        }.`;
      }
      retainedPaths.push({ ...path });
    } else {
      const reasonExplanations: string[] = [];
      for (const reason of orderedReasons) {
        switch (reason) {
          case "INVALID_INTERACTION_DATA":
            reasonExplanations.push("Contains invalid interaction date data");
            break;
          case "FUTURE_INTERACTION_DATA":
            reasonExplanations.push("Contains future-dated interaction evidence");
            break;
          case "INVALID_REFERENCE_CONTEXT":
            reasonExplanations.push("Contains invalid reference date context");
            break;
          case "ONE_WAY_OUTREACH_EDGE":
            reasonExplanations.push(
              "Contains one-way outreach evidence, which does not represent an introduction-capable relationship"
            );
            break;
          case "EXCESS_CONFIRMATION_HOPS":
            reasonExplanations.push(
              `Path contains ${confirmationHopCount} confirmation-required relationships, exceeding the current policy limit of ${policy.maxConfirmationRequiredHops}`
            );
            break;
        }
      }
      explanation = `Path rejected: ${reasonExplanations.join("; ")}.`;

      rejectedPaths.push({
        ...path,
        status: "rejected",
      });
    }

    evaluations.push({
      pathId: path.id,
      decision,
      originalPathStatus,
      reasonCodes: orderedReasons,
      blockingRelationshipIds,
      explanation,
    });
  }

  const retainedEligiblePathCount = retainedPaths.filter(
    (p) => p.status === "eligible"
  ).length;
  const retainedCandidatePathCount = retainedPaths.filter(
    (p) => p.status === "candidate"
  ).length;
  const rejectedPathCount = rejectedPaths.length;

  let disposition: PathRejectionDisposition;
  if (retainedPaths.length > 0) {
    disposition = "retained_paths_available";
  } else {
    disposition = "all_paths_rejected";
  }

  return {
    executionStatus: "success",
    targetInvestorId: generationResult.targetInvestorId,
    upstreamGenerationDisposition: generationResult.disposition,
    inputPathCount: generationResult.paths.length,
    retainedPaths,
    rejectedPaths,
    evaluations,
    retainedEligiblePathCount,
    retainedCandidatePathCount,
    rejectedPathCount,
    disposition,
    errors: [],
  };
}
