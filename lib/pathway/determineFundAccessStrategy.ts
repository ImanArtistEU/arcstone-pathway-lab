import {
  PathwayDataset,
  FundraisingCampaign,
  TargetInvestor,
  TargetPersonSelectionResult,
  BridgeHypothesis,
  FundAccessStrategy,
  FundAccessStatus,
} from "../../types/pathway";

/**
 * Determine Fund Access Strategy (Batch 9)
 *
 * Combines Decision Target Selection with Access Intelligence:
 * Decision Target != Reachable Entry Point
 */
export function determineFundAccessStrategy(
  dataset: PathwayDataset,
  campaign: FundraisingCampaign,
  targetInvestor: TargetInvestor,
  targetPersonSelection: TargetPersonSelectionResult,
  bridgeHypotheses: BridgeHypothesis[]
): FundAccessStrategy {
  const decisionTargetPersonId =
    targetPersonSelection.primaryTargetPersonId ||
    targetPersonSelection.topCandidatePersonIds[0] ||
    targetInvestor.candidatePersonIds[0];

  const founders = campaign.founderPersonIds;

  // 1. Check if founder has verified direct relationship to decision target
  let hasDirectVerifiedToDecisionTarget = false;
  for (const rel of dataset.relationships) {
    const touchesFounder =
      rel.from.type === "person" &&
      rel.to.type === "person" &&
      (founders.includes(rel.from.id) || founders.includes(rel.to.id));
    const touchesTarget = rel.from.id === decisionTargetPersonId || rel.to.id === decisionTargetPersonId;

    if (touchesFounder && touchesTarget) {
      if (rel.type !== "linkedin_connection") {
        hasDirectVerifiedToDecisionTarget = true;
        break;
      }
    }
  }

  // 2. Check for Reachable Entry Point (another candidate person at fund with direct verified relationship)
  let reachableEntryPointPersonId: string | undefined = undefined;
  for (const candId of targetInvestor.candidatePersonIds) {
    if (candId === decisionTargetPersonId) continue;

    for (const rel of dataset.relationships) {
      const touchesFounder =
        rel.from.type === "person" &&
        rel.to.type === "person" &&
        (founders.includes(rel.from.id) || founders.includes(rel.to.id));
      const touchesCand = rel.from.id === candId || rel.to.id === candId;

      if (touchesFounder && touchesCand && rel.type !== "linkedin_connection") {
        reachableEntryPointPersonId = candId;
        break;
      }
    }
    if (reachableEntryPointPersonId) break;
  }

  // 3. Determine Fund Access Status
  let accessStatus: FundAccessStatus = "NO_CREDIBLE_BRIDGE_FOUND";

  if (hasDirectVerifiedToDecisionTarget) {
    accessStatus = "VERIFIED_DIRECT_RELATIONSHIP";
  } else if (bridgeHypotheses.some((h) => h.status === "confirmed_route")) {
    accessStatus = "CONFIRMED_INTRO_ROUTE";
  } else if (bridgeHypotheses.some((h) => h.status === "worth_asking" || h.status === "potential_bridge")) {
    accessStatus = "POTENTIAL_BRIDGE_FOUND";
  } else {
    // Check if LinkedIn connection exists
    let hasLinkedIn = false;
    for (const rel of dataset.relationships) {
      const touchesFounder =
        rel.from.type === "person" &&
        rel.to.type === "person" &&
        (founders.includes(rel.from.id) || founders.includes(rel.to.id));
      const touchesTarget = rel.from.id === decisionTargetPersonId || rel.to.id === decisionTargetPersonId;

      if (touchesFounder && touchesTarget && rel.type === "linkedin_connection") {
        hasLinkedIn = true;
        break;
      }
    }
    if (hasLinkedIn) {
      accessStatus = "PLATFORM_ADJACENCY_ONLY";
    } else {
      accessStatus = "NO_CREDIBLE_BRIDGE_FOUND";
    }
  }

  const bestBridgeHypothesis = bridgeHypotheses[0];
  const alternativeBridgeHypotheses = bridgeHypotheses.slice(1);

  const decisionTargetPerson = dataset.people.find((p) => p.id === decisionTargetPersonId);
  const decisionTargetName = decisionTargetPerson?.fullName || decisionTargetPersonId;

  let explanation = `${decisionTargetName} is the selected decision target based on role and mandate fit. `;
  if (accessStatus === "VERIFIED_DIRECT_RELATIONSHIP") {
    explanation += `You have a verified direct relationship with ${decisionTargetName}.`;
  } else if (accessStatus === "CONFIRMED_INTRO_ROUTE") {
    explanation += `A confirmed introduction route exists to ${decisionTargetName}.`;
  } else if (accessStatus === "POTENTIAL_BRIDGE_FOUND" && bestBridgeHypothesis) {
    const anchorPerson = dataset.people.find((p) => p.id === bestBridgeHypothesis.anchorPersonId);
    explanation += `Potential bridge found via ${anchorPerson?.fullName || bestBridgeHypothesis.anchorPersonId} (Relevance: ${bestBridgeHypothesis.bridgeRelevance.overallBridgeRelevanceIndex}/100).`;
  } else if (accessStatus === "PLATFORM_ADJACENCY_ONLY") {
    explanation += `Platform connection (LinkedIn) detected, but no substantive relationship or bridge is observed.`;
  } else {
    explanation += `No credible bridge discovered in currently available network data.`;
  }

  if (reachableEntryPointPersonId) {
    const entryPerson = dataset.people.find((p) => p.id === reachableEntryPointPersonId);
    explanation += ` Note: You have verified direct access to ${entryPerson?.fullName || reachableEntryPointPersonId} inside the investment team as a reachable entry point.`;
  }

  return {
    targetInvestorId: targetInvestor.id,
    accessStatus,
    decisionTargetPersonId,
    reachableEntryPointPersonId,
    bestBridgeHypothesis,
    alternativeBridgeHypotheses,
    explanation,
  };
}
