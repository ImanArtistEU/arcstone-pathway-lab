import { ProximitySignalType } from "../../types/pathway";

export interface BridgeRelevancePolicy {
  anchorQualityWeight: number;
  targetProximityWeight: number;
  proximityFreshnessWeight: number;
  signalCorroborationWeight: number;
  signalBaseScores: Record<ProximitySignalType, number>;
}

/**
 * Prototype Bridge Relevance Policy (Batch 9)
 *
 * Uncalibrated heuristic weights.
 */
export const DEFAULT_BRIDGE_RELEVANCE_POLICY: BridgeRelevancePolicy = {
  anchorQualityWeight: 0.45,
  targetProximityWeight: 0.40,
  proximityFreshnessWeight: 0.10,
  signalCorroborationWeight: 0.05,
  signalBaseScores: {
    portfolio_relationship: 100,
    shared_board: 90,
    co_invested_same_deal: 90,
    public_collaboration: 80,
    worked_at_same_organization: 70,
    accelerator_overlap: 55,
    university_overlap: 40,
    event_overlap: 30,
    linkedin_connection: 20,
    public_mention: 20,
    other: 20,
  },
};
