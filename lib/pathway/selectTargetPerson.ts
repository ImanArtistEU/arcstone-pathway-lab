import {
  PathwayDataset,
  PathScoringResult,
  TargetPersonProfile,
  TargetPersonEvaluation,
  TargetPersonSelectionResult,
  TargetPersonFitStatus,
  TargetPersonInvestmentRole,
} from "@/types/pathway";
import { isCurrentTargetPersonAffiliationVerified } from "./targetPersonAffiliation";
import {
  TargetPersonSelectionPolicy,
  DEFAULT_TARGET_PERSON_SELECTION_POLICY,
  validateTargetPersonSelectionPolicy,
} from "./targetPersonSelectionPolicy";

function normalizeString(val: string): string {
  if (typeof val !== "string") {
    return "";
  }
  return val.trim().toLowerCase().replace(/\s+/g, " ");
}

function evaluateDimensionFit(
  startupValue: string | undefined | null,
  profileFocus: string[],
  broadTerms: string[],
  matchScore: number,
  unknownScore: number,
  noMatchScore: number
): { status: TargetPersonFitStatus; score: number } {
  // If startup context is missing/empty/whitespace -> status = unknown
  if (
    startupValue === undefined ||
    startupValue === null ||
    typeof startupValue !== "string" ||
    startupValue.trim() === ""
  ) {
    return { status: "unknown", score: unknownScore };
  }

  // If profile focus is missing/empty -> status = unknown
  if (!Array.isArray(profileFocus) || profileFocus.length === 0) {
    return { status: "unknown", score: unknownScore };
  }

  const normStartup = normalizeString(startupValue);
  const normFocus = profileFocus.map((f) => normalizeString(f));

  // Check explicit broad focus terms (e.g., "all", "generalist", "global")
  const hasBroadMatch = broadTerms.some((bt) =>
    normFocus.includes(normalizeString(bt))
  );
  if (hasBroadMatch) {
    return { status: "match", score: matchScore };
  }

  // Check exact string match after normalization
  if (normStartup && normFocus.includes(normStartup)) {
    return { status: "match", score: matchScore };
  }

  return { status: "no_match", score: noMatchScore };
}

function createErrorResult(
  targetInvestorId: string,
  candidatePersonIds: string[],
  errors: string[]
): TargetPersonSelectionResult {
  return {
    executionStatus: "error",
    targetInvestorId,
    candidatePersonIds,
    evaluations: [],
    priorityOrderPersonIds: [],
    topCandidatePersonIds: [],
    disposition: "error",
    calibrationStatus: "uncalibrated_heuristic",
    isProbability: false,
    errors,
  };
}

/**
 * Deterministically selects the primary target person within an investor organization
 * based on functional role, mandate fit (stage, sector, geography), and access quality.
 *
 * Core Product Invariants:
 * 1. RIGHT PERSON ≠ EASIEST PERSON TO REACH (Mandate fit dominates access)
 * 2. TARGET FIT ≠ ACCESS QUALITY (Separate metrics)
 * 3. NO WARM PATH ≠ WRONG TARGET PERSON (Candidate without warm path can still win)
 * 4. SELECTION ≠ OUTREACH RECOMMENDATION (Chooses WHO, not HOW to reach)
 * 5. CANDIDATE DISCOVERY ≠ TARGET PERSON SELECTION (Candidate pool is provided upstream)
 * 6. MISSING PERSON CONTEXT ≠ PERSON IRRELEVANCE (Missing profile yields insufficient_context)
 * 7. MISSING STARTUP CONTEXT ≠ NO MATCH (Missing startup dimensions yield unknown fit)
 * 8. MALFORMED PROFILE ≠ VALID PROFILE (Strict focus array and metadata validation)
 * 9. EXPLANATION MUST MATCH ACTUAL FIT (Explanations reflect actual computed dimension statuses)
 * 10. CURRENT AFFILIATION MUST ACTUALLY BE CURRENT (Temporal works_at checks against referenceDate)
 * 11. MISSING STARTUP RECORD ≠ ORGANIZATION FALLBACK (Requires actual Startup record from dataset.startups)
 */
export function selectTargetPerson(
  dataset: PathwayDataset,
  targetInvestorId: string,
  profiles: TargetPersonProfile[],
  scoringResult: PathScoringResult,
  referenceDate: string | Date,
  policy?: Partial<TargetPersonSelectionPolicy>
): TargetPersonSelectionResult {
  // 1. Validate Reference Date
  let refDateObj: Date;
  if (referenceDate instanceof Date) {
    refDateObj = referenceDate;
  } else if (typeof referenceDate === "string" && referenceDate.trim() !== "") {
    refDateObj = new Date(referenceDate);
  } else {
    return createErrorResult(targetInvestorId, [], [
      "Reference date must be a non-empty valid date string or Date object.",
    ]);
  }

  if (isNaN(refDateObj.getTime())) {
    return createErrorResult(targetInvestorId, [], [
      `Invalid reference date provided: ${String(referenceDate)}`,
    ]);
  }

  // 2. Validate Selection Policy
  const mergedPolicy: TargetPersonSelectionPolicy = {
    ...DEFAULT_TARGET_PERSON_SELECTION_POLICY,
    ...policy,
  };

  const policyErrors = validateTargetPersonSelectionPolicy(mergedPolicy);
  if (policyErrors.length > 0) {
    return createErrorResult(targetInvestorId, [], policyErrors);
  }

  // 3. Resolve Target Investor & Candidate Person IDs
  const targetInvestor = dataset.targetInvestors.find(
    (t) => t.id === targetInvestorId
  );
  if (!targetInvestor) {
    return createErrorResult(targetInvestorId, [], [
      `TargetInvestor "${targetInvestorId}" not found in dataset.`,
    ]);
  }

  if (
    !Array.isArray(targetInvestor.candidatePersonIds) ||
    targetInvestor.candidatePersonIds.length === 0
  ) {
    return createErrorResult(targetInvestorId, [], [
      `TargetInvestor "${targetInvestorId}" candidatePersonIds must be a non-empty array.`,
    ]);
  }

  const candidatePersonIds: string[] = [];
  const seenCandidateIds = new Set<string>();

  for (const id of targetInvestor.candidatePersonIds) {
    if (typeof id !== "string" || id.trim() === "") {
      return createErrorResult(targetInvestorId, [], [
        `TargetInvestor "${targetInvestorId}" candidatePersonIds contains invalid non-empty string entries.`,
      ]);
    }
    if (seenCandidateIds.has(id)) {
      return createErrorResult(targetInvestorId, [], [
        `TargetInvestor "${targetInvestorId}" candidatePersonIds contains duplicate person ID "${id}".`,
      ]);
    }
    seenCandidateIds.add(id);
    candidatePersonIds.push(id);
  }

  // 4. Resolve Campaign & Startup Record (STRICTLY dataset.startups, NO organization fallback)
  const campaign = dataset.campaigns.find(
    (c) => c.id === targetInvestor.campaignId
  );
  if (!campaign) {
    return createErrorResult(targetInvestorId, candidatePersonIds, [
      `Campaign "${targetInvestor.campaignId}" referenced by TargetInvestor "${targetInvestorId}" not found in dataset.`,
    ]);
  }

  const startup = dataset.startups?.find((s) => s.id === campaign.startupId);
  if (!startup) {
    return createErrorResult(targetInvestorId, candidatePersonIds, [
      `Startup record "${campaign.startupId}" referenced by Campaign "${campaign.id}" not found in dataset.startups.`,
    ]);
  }

  // 5. Validate PathScoringResult matching & execution status & candidate path integrity
  if (scoringResult.targetInvestorId !== targetInvestorId) {
    return createErrorResult(targetInvestorId, candidatePersonIds, [
      `PathScoringResult targetInvestorId "${scoringResult.targetInvestorId}" does not match requested targetInvestorId "${targetInvestorId}".`,
    ]);
  }

  if (
    scoringResult.executionStatus === "upstream_error" ||
    scoringResult.executionStatus === "error"
  ) {
    return {
      executionStatus: "upstream_error",
      targetInvestorId,
      candidatePersonIds,
      evaluations: [],
      priorityOrderPersonIds: [],
      topCandidatePersonIds: [],
      disposition: "upstream_error",
      calibrationStatus: "uncalibrated_heuristic",
      isProbability: false,
      errors: [
        `Upstream path scoring failed with executionStatus "${scoringResult.executionStatus}".`,
      ],
    };
  }

  for (const sp of scoringResult.scoredPaths) {
    if (sp.path.targetInvestorId !== targetInvestorId) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `PathScoringResult contains a scored path with targetInvestorId "${sp.path.targetInvestorId}" which does not match requested targetInvestorId "${targetInvestorId}".`,
      ]);
    }
    if (!candidatePersonIds.includes(sp.path.targetPersonId)) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `PathScoringResult contains a scored path for targetPersonId "${sp.path.targetPersonId}" which is not in candidatePersonIds for targetInvestor "${targetInvestorId}".`,
      ]);
    }
  }

  // 6. Validate Candidate Existence and Current Affiliation (Temporal referenceDate check)
  for (const cId of candidatePersonIds) {
    const person = dataset.people.find((p) => p.id === cId);
    if (!person) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `Candidate target person "${cId}" not found in dataset.people.`,
      ]);
    }

    if (
      !isCurrentTargetPersonAffiliationVerified(
        dataset,
        cId,
        targetInvestor.investorOrganizationId,
        referenceDate
      )
    ) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `Candidate target person "${cId}" is not verifiably currently affiliated with target investor organization "${targetInvestor.investorOrganizationId}".`,
      ]);
    }
  }

  // 7. Validate Candidate Profiles
  const validInvestmentRoles: TargetPersonInvestmentRole[] = [
    "lead_investor",
    "investment_team",
    "sourcing",
    "non_investment",
    "unknown",
  ];

  const matchedProfiles: Map<string, TargetPersonProfile> = new Map();

  for (const cId of candidatePersonIds) {
    const matches = profiles.filter(
      (p) => p.targetInvestorId === targetInvestorId && p.personId === cId
    );

    if (matches.length > 1) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `Duplicate target person profile found for targetInvestorId "${targetInvestorId}" and personId "${cId}".`,
      ]);
    }

    if (matches.length === 0) {
      return {
        executionStatus: "success",
        targetInvestorId,
        candidatePersonIds,
        evaluations: [],
        priorityOrderPersonIds: [],
        topCandidatePersonIds: [],
        disposition: "insufficient_context",
        calibrationStatus: "uncalibrated_heuristic",
        isProbability: false,
        errors: [
          `Missing target person profile for candidate person "${cId}" in target investor "${targetInvestorId}".`,
        ],
      };
    }

    const prof = matches[0];

    // Field validations
    if (
      typeof prof.targetInvestorId !== "string" ||
      prof.targetInvestorId.trim() === "" ||
      typeof prof.personId !== "string" ||
      prof.personId.trim() === "" ||
      typeof prof.roleTitle !== "string" ||
      prof.roleTitle.trim() === "" ||
      !validInvestmentRoles.includes(prof.investmentRole)
    ) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `Invalid profile fields for person "${cId}" in target investor "${targetInvestorId}".`,
      ]);
    }

    // Focus array element validations
    const focusArrays = [
      { arr: prof.stageFocus, name: "stageFocus" },
      { arr: prof.sectorFocus, name: "sectorFocus" },
      { arr: prof.geographyFocus, name: "geographyFocus" },
    ];

    for (const { arr, name } of focusArrays) {
      if (!Array.isArray(arr)) {
        return createErrorResult(targetInvestorId, candidatePersonIds, [
          `Invalid target person profile "${cId}": ${name} must be an array.`,
        ]);
      }
      for (const entry of arr) {
        if (typeof entry !== "string" || entry.trim() === "") {
          return createErrorResult(targetInvestorId, candidatePersonIds, [
            `Invalid target person profile "${cId}": ${name} entries must be non-empty strings.`,
          ]);
        }
      }
    }

    // Metadata string type validation if provided
    if (
      prof.sourceName !== undefined &&
      prof.sourceName !== null &&
      typeof prof.sourceName !== "string"
    ) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `Invalid target person profile "${cId}": sourceName must be a string.`,
      ]);
    }

    if (
      prof.sourceUrl !== undefined &&
      prof.sourceUrl !== null &&
      typeof prof.sourceUrl !== "string"
    ) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `Invalid target person profile "${cId}": sourceUrl must be a string.`,
      ]);
    }

    // ObservedAt validation relative to referenceDate
    if (typeof prof.observedAt !== "string" || prof.observedAt.trim() === "") {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `Profile observedAt is missing or invalid for person "${cId}".`,
      ]);
    }

    const profObsDate = new Date(prof.observedAt);
    if (isNaN(profObsDate.getTime())) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `Profile observedAt date "${prof.observedAt}" is invalid for person "${cId}".`,
      ]);
    }

    if (profObsDate.getTime() > refDateObj.getTime()) {
      return createErrorResult(targetInvestorId, candidatePersonIds, [
        `Profile observedAt date "${prof.observedAt}" for person "${cId}" is in the future relative to referenceDate "${refDateObj.toISOString()}".`,
      ]);
    }

    matchedProfiles.set(cId, prof);
  }

  // 8. Handle Upstream Paths Filtered
  if (scoringResult.disposition === "upstream_paths_filtered") {
    return {
      executionStatus: "success",
      targetInvestorId,
      candidatePersonIds,
      evaluations: [],
      priorityOrderPersonIds: [],
      topCandidatePersonIds: [],
      disposition: "upstream_paths_filtered",
      calibrationStatus: "uncalibrated_heuristic",
      isProbability: false,
      errors: [],
    };
  }

  // 9. Stage context: Campaign.round primary, startup.stage fallback
  let startupStage = "";
  if (typeof campaign.round === "string" && campaign.round.trim() !== "") {
    startupStage = campaign.round;
  } else if (typeof startup.stage === "string" && startup.stage.trim() !== "") {
    startupStage = startup.stage;
  }

  const startupSector =
    typeof startup.sector === "string" && startup.sector.trim() !== ""
      ? startup.sector
      : "";

  const startupGeography =
    typeof startup.geography === "string" && startup.geography.trim() !== ""
      ? startup.geography
      : "";

  const evaluations: TargetPersonEvaluation[] = [];

  for (const cId of candidatePersonIds) {
    const prof = matchedProfiles.get(cId)!;

    // Investment role score
    let investmentRoleScore = mergedPolicy.unknownRoleScore;
    if (prof.investmentRole === "lead_investor") {
      investmentRoleScore = mergedPolicy.leadInvestorScore;
    } else if (prof.investmentRole === "investment_team") {
      investmentRoleScore = mergedPolicy.investmentTeamScore;
    } else if (prof.investmentRole === "sourcing") {
      investmentRoleScore = mergedPolicy.sourcingScore;
    } else if (prof.investmentRole === "non_investment") {
      investmentRoleScore = mergedPolicy.nonInvestmentScore;
    }

    // Stage fit
    const stageFit = evaluateDimensionFit(
      startupStage,
      prof.stageFocus,
      ["all", "generalist"],
      mergedPolicy.fitMatchScore,
      mergedPolicy.fitUnknownScore,
      mergedPolicy.fitNoMatchScore
    );

    // Sector fit
    const sectorFit = evaluateDimensionFit(
      startupSector,
      prof.sectorFocus,
      ["all", "generalist"],
      mergedPolicy.fitMatchScore,
      mergedPolicy.fitUnknownScore,
      mergedPolicy.fitNoMatchScore
    );

    // Geography fit
    const geoFit = evaluateDimensionFit(
      startupGeography,
      prof.geographyFocus,
      ["global", "all"],
      mergedPolicy.fitMatchScore,
      mergedPolicy.fitUnknownScore,
      mergedPolicy.fitNoMatchScore
    );

    // Mandate fit index
    const mandateFitIndex = Math.round(
      (investmentRoleScore * mergedPolicy.weightInvestmentRole) / 100 +
        (stageFit.score * mergedPolicy.weightStageFit) / 100 +
        (sectorFit.score * mergedPolicy.weightSectorFit) / 100 +
        (geoFit.score * mergedPolicy.weightGeographyFit) / 100
    );

    // Access Quality Index from upstream PathScoringResult
    const candidateScoredPaths = scoringResult.scoredPaths.filter(
      (sp) => sp.path.targetPersonId === cId
    );

    const scoredPathCount = candidateScoredPaths.length;
    let accessQualityIndex = 0;
    let highestScoringPathId: string | undefined = undefined;

    if (scoredPathCount > 0) {
      accessQualityIndex = Math.max(
        ...candidateScoredPaths.map((sp) => sp.score.overallPriorityIndex)
      );
      // Use FIRST path in upstream scoring order achieving max score
      highestScoringPathId = candidateScoredPaths.find(
        (sp) => sp.score.overallPriorityIndex === accessQualityIndex
      )?.path.id;
    }

    const selectable = prof.investmentRole !== "non_investment";

    const overallTargetPriorityIndex = selectable
      ? Math.round(
          (mandateFitIndex * mergedPolicy.weightMandateFit) / 100 +
            (accessQualityIndex * mergedPolicy.weightAccessQuality) / 100
        )
      : 0;

    const formattedRole = prof.investmentRole.replace("_", " ");

    let explanation: string;
    if (!selectable) {
      explanation = `Target priority index 0/100. Investment role is non-investment (${prof.roleTitle}), excluded from target person selection. This is an uncalibrated heuristic, not a probability or outreach recommendation.`;
    } else if (accessQualityIndex > 0) {
      explanation = `Target priority index ${overallTargetPriorityIndex}/100. Investment role: ${prof.roleTitle} (${formattedRole}). Stage: ${stageFit.status}. Sector: ${sectorFit.status}. Geography: ${geoFit.status}. Highest available access index: ${accessQualityIndex}/100. This is an uncalibrated heuristic, not a probability or outreach recommendation.`;
    } else {
      explanation = `Target priority index ${overallTargetPriorityIndex}/100. Investment role: ${prof.roleTitle} (${formattedRole}). Stage: ${stageFit.status}. Sector: ${sectorFit.status}. Geography: ${geoFit.status}. No retained scored path is currently available. This is an uncalibrated heuristic, not a probability or outreach recommendation.`;
    }

    evaluations.push({
      personId: cId,
      targetInvestorId,
      roleTitle: prof.roleTitle,
      investmentRole: prof.investmentRole,
      investmentRoleScore,
      stageFitStatus: stageFit.status,
      stageFitScore: stageFit.score,
      sectorFitStatus: sectorFit.status,
      sectorFitScore: sectorFit.score,
      geographyFitStatus: geoFit.status,
      geographyFitScore: geoFit.score,
      mandateFitIndex,
      accessQualityIndex,
      scoredPathCount,
      highestScoringPathId,
      overallTargetPriorityIndex,
      selectable,
      explanation,
    });
  }

  // 10. Selection & Ranking
  const selectableEvaluations = evaluations.filter((e) => e.selectable);

  if (selectableEvaluations.length === 0) {
    const sortedAllIds = [...evaluations]
      .sort((a, b) => a.personId.localeCompare(b.personId))
      .map((e) => e.personId);

    return {
      executionStatus: "success",
      targetInvestorId,
      candidatePersonIds,
      evaluations,
      priorityOrderPersonIds: sortedAllIds,
      topCandidatePersonIds: [],
      disposition: "no_selectable_candidates",
      calibrationStatus: "uncalibrated_heuristic",
      isProbability: false,
      errors: [],
    };
  }

  // Sort selectable candidates deterministically
  const sortedSelectable = [...selectableEvaluations].sort((a, b) => {
    if (b.overallTargetPriorityIndex !== a.overallTargetPriorityIndex) {
      return b.overallTargetPriorityIndex - a.overallTargetPriorityIndex;
    }
    if (b.mandateFitIndex !== a.mandateFitIndex) {
      return b.mandateFitIndex - a.mandateFitIndex;
    }
    if (b.accessQualityIndex !== a.accessQualityIndex) {
      return b.accessQualityIndex - a.accessQualityIndex;
    }
    if (b.investmentRoleScore !== a.investmentRoleScore) {
      return b.investmentRoleScore - a.investmentRoleScore;
    }
    return a.personId.localeCompare(b.personId);
  });

  const nonSelectableIds = evaluations
    .filter((e) => !e.selectable)
    .sort((a, b) => a.personId.localeCompare(b.personId))
    .map((e) => e.personId);

  const priorityOrderPersonIds = [
    ...sortedSelectable.map((e) => e.personId),
    ...nonSelectableIds,
  ];

  // Ambiguous Tie Check among top candidates
  const top = sortedSelectable[0];
  const tiedTop = sortedSelectable.filter(
    (e) =>
      e.overallTargetPriorityIndex === top.overallTargetPriorityIndex &&
      e.mandateFitIndex === top.mandateFitIndex &&
      e.accessQualityIndex === top.accessQualityIndex &&
      e.investmentRoleScore === top.investmentRoleScore
  );

  let disposition: TargetPersonSelectionResult["disposition"];
  let primaryTargetPersonId: string | undefined = undefined;
  let topCandidatePersonIds: string[];

  if (tiedTop.length > 1) {
    disposition = "ambiguous_top_candidates";
    primaryTargetPersonId = undefined;
    topCandidatePersonIds = tiedTop
      .map((e) => e.personId)
      .sort((a, b) => a.localeCompare(b));
  } else {
    disposition = "primary_target_selected";
    primaryTargetPersonId = top.personId;
    topCandidatePersonIds = [top.personId];
  }

  return {
    executionStatus: "success",
    targetInvestorId,
    candidatePersonIds,
    evaluations,
    priorityOrderPersonIds,
    primaryTargetPersonId,
    topCandidatePersonIds,
    disposition,
    calibrationStatus: "uncalibrated_heuristic",
    isProbability: false,
    errors: [],
  };
}
