export interface PathScoringPolicy {
  /**
   * Relative weights for each scoring dimension.
   * All four weights MUST sum to EXACTLY 100.
   */
  weightRelationshipCredibility: number;
  weightTemporalFreshness: number;
  weightConfirmationReadiness: number;
  weightPathEfficiency: number;

  /**
   * Credibility tier scores (0-100 inclusive integers)
   */
  eligibleDirectInteractionScore: number;
  eligibleFounderAssertedScore: number;
  eligibleFallbackScore: number;
  confirmedHistoricalInteractionScore: number;
  founderAssertedConfirmationScore: number;
  unconfirmedInteractionScore: number;
  platformSignalScore: number;
  publicContextScore: number;
  confirmationFallbackScore: number;

  /**
   * Recency bucket scores (0-100 inclusive integers)
   */
  recentScore: number;
  agingScore: number;
  staleScore: number;
  unknownRecencyScore: number;

  /**
   * Confirmation readiness parameters (0-100 inclusive integers)
   */
  confirmationReadinessBase: number;
  confirmationPenaltyPerHop: number;

  /**
   * Path efficiency parameters (0-100 inclusive integers)
   */
  pathEfficiencyBase: number;
  additionalHopPenalty: number;
}

export const DEFAULT_PATH_SCORING_POLICY: PathScoringPolicy = {
  weightRelationshipCredibility: 45,
  weightTemporalFreshness: 25,
  weightConfirmationReadiness: 20,
  weightPathEfficiency: 10,

  eligibleDirectInteractionScore: 100,
  eligibleFounderAssertedScore: 90,
  eligibleFallbackScore: 85,

  confirmedHistoricalInteractionScore: 75,
  founderAssertedConfirmationScore: 65,
  unconfirmedInteractionScore: 50,
  platformSignalScore: 40,
  publicContextScore: 35,
  confirmationFallbackScore: 45,

  recentScore: 100,
  agingScore: 70,
  staleScore: 35,
  unknownRecencyScore: 50,

  confirmationReadinessBase: 100,
  confirmationPenaltyPerHop: 45,

  pathEfficiencyBase: 100,
  additionalHopPenalty: 20,
};
