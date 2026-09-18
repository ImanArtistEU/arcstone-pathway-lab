/**
 * PathGenerationPolicy Configuration
 *
 * Centralized policy thresholds and toggles for deterministic path generation.
 *
 * IMPORTANT PRODUCT NOTE:
 * `maxRelationshipHops = 3` is a working prototype PRODUCT HYPOTHESIS,
 * not an established scientific or fundraising constant. In early-stage fundraising,
 * routes beyond 3 hops (e.g. Founder -> Advisor -> Portfolio Founder -> Partner)
 * experience severe social capital decay and friction.
 * In production, this depth bound will be calibrated against observed introduction
 * conversion outcomes.
 */
export interface PathGenerationPolicy {
  /** Maximum number of relationship hops (edges) permitted in a candidate path (default: 3) */
  maxRelationshipHops: number;
  /** Whether to explore and surface paths containing confirmation-required relationships (default: true) */
  includeConfirmationRequired: boolean;
}

export const DEFAULT_PATH_GENERATION_POLICY: PathGenerationPolicy = {
  maxRelationshipHops: 3,
  includeConfirmationRequired: true,
};
