import {
  FounderNetworkAnchor,
  ProximitySignal,
  BridgeRelevanceScore,
} from "../../types/pathway";
import {
  DEFAULT_BRIDGE_RELEVANCE_POLICY,
  BridgeRelevancePolicy,
} from "./bridgeRelevancePolicy";

/**
 * Score Bridge Hypotheses (Batch 9)
 *
 * Computes an uncalibrated heuristic BridgeRelevanceScore based on 4 components:
 * A. Anchor Relationship Quality (45%)
 * B. Target Proximity Strength (40%)
 * C. Proximity Freshness (10%)
 * D. Signal Corroboration (5%)
 */
export function scoreBridgeHypothesis(
  anchor: FounderNetworkAnchor,
  signals: ProximitySignal[],
  referenceDate: string,
  policy: BridgeRelevancePolicy = DEFAULT_BRIDGE_RELEVANCE_POLICY
): BridgeRelevanceScore {
  // A. Anchor Relationship Quality (45%)
  const anchorQuality = anchor.relationshipQualityIndex;

  // B. Target Proximity Strength (40%) - strongest signal
  let maxSignalScore = 0;
  let strongestSignalType = "none";
  for (const sig of signals) {
    const score = policy.signalBaseScores[sig.type] ?? 20;
    if (score > maxSignalScore) {
      maxSignalScore = score;
      strongestSignalType = sig.type;
    }
  }
  const targetProximity = maxSignalScore;

  // C. Proximity Freshness (10%)
  let freshnessScore = 50; // default unknown
  if (signals.length > 0) {
    const newestObserved = signals.reduce((latest, s) => {
      const dateStr = s.occurredAt || s.observedAt;
      if (!dateStr) return latest;
      if (!latest || new Date(dateStr) > new Date(latest)) return dateStr;
      return latest;
    }, "" as string);

    if (newestObserved) {
      const refTime = new Date(referenceDate).getTime();
      const obsTime = new Date(newestObserved).getTime();
      const diffDays = Math.floor((refTime - obsTime) / (1000 * 60 * 60 * 24));

      if (diffDays <= 365) freshnessScore = 100;
      else if (diffDays <= 730) freshnessScore = 70;
      else freshnessScore = 35;
    }
  }

  // D. Signal Corroboration (5%)
  let corroborationScore = 50;
  if (signals.length === 1) corroborationScore = 50;
  else if (signals.length === 2) corroborationScore = 80;
  else if (signals.length >= 3) corroborationScore = 100;

  const overallIndex = Math.round(
    policy.anchorQualityWeight * anchorQuality +
      policy.targetProximityWeight * targetProximity +
      policy.proximityFreshnessWeight * freshnessScore +
      policy.signalCorroborationWeight * corroborationScore
  );

  const explanation =
    `Bridge relevance ${overallIndex}/100: Founder anchor quality (${anchorQuality}/100, status: ${anchor.relationshipStatus}), ` +
    `strongest proximity signal "${strongestSignalType}" (${targetProximity}/100), ` +
    `freshness (${freshnessScore}/100), and signal corroboration (${corroborationScore}/100 across ${signals.length} signal(s)).`;

  return {
    overallBridgeRelevanceIndex: overallIndex,
    anchorRelationshipQuality: anchorQuality,
    targetProximityStrength: targetProximity,
    proximityFreshness: freshnessScore,
    signalCorroboration: corroborationScore,
    calibrationStatus: "uncalibrated_heuristic",
    isProbability: false,
    explanation,
  };
}
