export interface PathRejectionPolicy {
  /**
   * Maximum number of confirmation-required relationship hops allowed
   * before a generated path is rejected due to compounding uncertainty.
   * Default: 1.
   */
  maxConfirmationRequiredHops: number;
}

export const DEFAULT_PATH_REJECTION_POLICY: PathRejectionPolicy = {
  maxConfirmationRequiredHops: 1,
};
