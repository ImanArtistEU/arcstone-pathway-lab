export interface TargetPersonSelectionPolicy {
  /** Weight for investment functional role (0-100, default 40) */
  weightInvestmentRole: number;
  /** Weight for stage focus fit (0-100, default 25) */
  weightStageFit: number;
  /** Weight for sector focus fit (0-100, default 25) */
  weightSectorFit: number;
  /** Weight for geography focus fit (0-100, default 10) */
  weightGeographyFit: number;

  /** Score awarded when focus dimension matches (default 100) */
  fitMatchScore: number;
  /** Score awarded when focus dimension is unknown/unspecified (default 50) */
  fitUnknownScore: number;
  /** Score awarded when focus dimension explicitly does not match (default 0) */
  fitNoMatchScore: number;

  /** Score for lead_investor role (default 100) */
  leadInvestorScore: number;
  /** Score for investment_team role (default 80) */
  investmentTeamScore: number;
  /** Score for sourcing role (default 60) */
  sourcingScore: number;
  /** Score for unknown role (default 50) */
  unknownRoleScore: number;
  /** Score for non_investment role (default 0) */
  nonInvestmentScore: number;

  /** Weight for mandate fit index in overall priority index (default 70) */
  weightMandateFit: number;
  /** Weight for access quality index in overall priority index (default 30) */
  weightAccessQuality: number;
}

export const DEFAULT_TARGET_PERSON_SELECTION_POLICY: TargetPersonSelectionPolicy = {
  weightInvestmentRole: 40,
  weightStageFit: 25,
  weightSectorFit: 25,
  weightGeographyFit: 10,

  fitMatchScore: 100,
  fitUnknownScore: 50,
  fitNoMatchScore: 0,

  leadInvestorScore: 100,
  investmentTeamScore: 80,
  sourcingScore: 60,
  unknownRoleScore: 50,
  nonInvestmentScore: 0,

  weightMandateFit: 70,
  weightAccessQuality: 30,
};

/**
 * Validates target person selection policy fields.
 * Every numeric field must be a finite integer between 0 and 100 inclusive.
 * Mandate weights must sum to exactly 100.
 * Overall priority weights must sum to exactly 100.
 */
export function validateTargetPersonSelectionPolicy(
  policy: TargetPersonSelectionPolicy
): string[] {
  const errors: string[] = [];

  const keys: (keyof TargetPersonSelectionPolicy)[] = [
    "weightInvestmentRole",
    "weightStageFit",
    "weightSectorFit",
    "weightGeographyFit",
    "fitMatchScore",
    "fitUnknownScore",
    "fitNoMatchScore",
    "leadInvestorScore",
    "investmentTeamScore",
    "sourcingScore",
    "unknownRoleScore",
    "nonInvestmentScore",
    "weightMandateFit",
    "weightAccessQuality",
  ];

  for (const k of keys) {
    const val = policy[k];
    if (
      typeof val !== "number" ||
      !Number.isFinite(val) ||
      !Number.isInteger(val) ||
      val < 0 ||
      val > 100
    ) {
      errors.push(
        `Policy parameter "${k}" must be a finite integer between 0 and 100. Got: ${String(
          val
        )}.`
      );
    }
  }

  const mandateWeightSum =
    policy.weightInvestmentRole +
    policy.weightStageFit +
    policy.weightSectorFit +
    policy.weightGeographyFit;

  if (mandateWeightSum !== 100) {
    errors.push(
      `Mandate fit component weights must sum to 100. Current sum: ${mandateWeightSum}.`
    );
  }

  const overallWeightSum =
    policy.weightMandateFit + policy.weightAccessQuality;

  if (overallWeightSum !== 100) {
    errors.push(
      `Overall target priority weights must sum to 100. Current sum: ${overallWeightSum}.`
    );
  }

  return errors;
}
