import {
  PathwayDataset,
  TargetPersonProfile,
  TargetPersonEvaluation,
  PathwayExplanation,
  FundAccessStrategy,
} from "@/types/pathway";
import { generatePathsForTarget } from "@/lib/pathway/generatePathsForTarget";
import { applyPathRejection } from "@/lib/pathway/applyPathRejection";
import { scoreRetainedPaths } from "@/lib/pathway/scoreRetainedPaths";
import { selectTargetPerson } from "@/lib/pathway/selectTargetPerson";
import { buildPathwayExplanation } from "@/lib/pathway/buildPathwayExplanation";
import { extractFounderNetworkAnchors } from "@/lib/pathway/extractFounderNetworkAnchors";
import { discoverBridgeHypotheses } from "@/lib/pathway/discoverBridgeHypotheses";
import { determineFundAccessStrategy } from "@/lib/pathway/determineFundAccessStrategy";

export type PilotAnalysisStatus = "success" | "error";

export interface PilotAnalysisError {
  code: string;
  message: string;
}

export interface PilotScoredPathSummary {
  pathId: string;
  targetPersonId: string;
  overallPriorityIndex: number;
  componentScores: {
    relationshipCredibility: number;
    temporalFreshness: number;
    confirmationReadiness: number;
    pathEfficiency: number;
  };
  explanation: string;
}

export interface PilotTargetReport {
  targetInvestorId: string;
  investorOrganizationId: string;
  investorOrganizationName: string;
  generation: {
    executionStatus: string;
    disposition: string | null;
    pathCount: number;
    eligiblePathCount: number;
    confirmationRequiredPathCount: number;
    errors: unknown[];
  };
  rejection: {
    executionStatus: string;
    disposition: string | null;
    retainedPathCount: number;
    rejectedPathCount: number;
    rejectionReasons: string[];
    errors: unknown[];
  };
  scoring: {
    executionStatus: string;
    disposition: string | null;
    scoredPathCount: number;
    scoredPaths: PilotScoredPathSummary[];
    errors: unknown[];
  };
  selection: {
    executionStatus: string;
    disposition: string | null;
    primaryTargetPersonId?: string;
    primaryTargetPersonName?: string;
    topCandidatePersonIds: string[];
    evaluations: TargetPersonEvaluation[];
    errors: unknown[];
  };
  fundAccessStrategy?: FundAccessStrategy;
  explanation: PathwayExplanation;
  diagnosticFlags: string[];
}

export interface PilotAnalysisSummary {
  targetsAnalyzed: number;
  targetsWithRetainedPaths: number;
  targetsWithOnlyRejectedPaths: number;
  targetsWithNoKnownPaths: number;
  targetsWithAnalysisErrors: number;
  targetsWithPrimaryPersonSelected: number;
  targetsWithAmbiguousPeople: number;
  targetsWithIncompleteContext: number;
}

export interface PilotAnalysisReport {
  meta: {
    referenceDate: string;
    startupId: string;
    startupName: string;
    campaignId: string;
    targetInvestorCount: number;
    candidatePersonCount: number;
    relationshipCount: number;
    evidenceCount: number;
  };
  summary: PilotAnalysisSummary;
  targetReports: PilotTargetReport[];
}

export interface PilotAnalysisResult {
  status: PilotAnalysisStatus;
  report?: PilotAnalysisReport;
  errors?: PilotAnalysisError[];
}

export function analyzePilotDataset(
  dataset: PathwayDataset,
  targetPersonProfiles: TargetPersonProfile[],
  referenceDate: string
): PilotAnalysisResult {
  // 1. Validate referenceDate
  if (
    !referenceDate ||
    typeof referenceDate !== "string" ||
    referenceDate.trim() === ""
  ) {
    return {
      status: "error",
      errors: [
        {
          code: "INVALID_REFERENCE_DATE",
          message: "Reference date must be a non-empty string.",
        },
      ],
    };
  }

  const parsedRefDate = new Date(referenceDate);
  if (isNaN(parsedRefDate.getTime())) {
    return {
      status: "error",
      errors: [
        {
          code: "INVALID_REFERENCE_DATE",
          message: `Invalid reference date provided: "${referenceDate}".`,
        },
      ],
    };
  }

  // 2. Validate single startup and single campaign structure
  if (!dataset.startups || dataset.startups.length !== 1) {
    return {
      status: "error",
      errors: [
        {
          code: "INVALID_DATASET_SHAPE",
          message: `Expected exactly 1 Startup in dataset, found ${
            dataset.startups ? dataset.startups.length : 0
          }.`,
        },
      ],
    };
  }

  if (!dataset.campaigns || dataset.campaigns.length !== 1) {
    return {
      status: "error",
      errors: [
        {
          code: "INVALID_DATASET_SHAPE",
          message: `Expected exactly 1 FundraisingCampaign in dataset, found ${
            dataset.campaigns ? dataset.campaigns.length : 0
          }.`,
        },
      ],
    };
  }

  const startup = dataset.startups[0];
  const campaign = dataset.campaigns[0];

  // 3. Validate every TargetInvestor references the single campaign
  for (const t of dataset.targetInvestors) {
    if (t.campaignId !== campaign.id) {
      return {
        status: "error",
        errors: [
          {
            code: "TARGET_CAMPAIGN_MISMATCH",
            message: `Target investor "${t.id}" references campaignId "${t.campaignId}" which does not match campaign "${campaign.id}".`,
          },
        ],
      };
    }
  }

  const uniqueCandidatePersonIds = new Set<string>();
  for (const t of dataset.targetInvestors) {
    for (const cId of t.candidatePersonIds) {
      uniqueCandidatePersonIds.add(cId);
    }
  }

  const targetReports: PilotTargetReport[] = [];

  let targetsWithRetainedPaths = 0;
  let targetsWithOnlyRejectedPaths = 0;
  let targetsWithNoKnownPaths = 0;
  let targetsWithAnalysisErrors = 0;
  let targetsWithPrimaryPersonSelected = 0;
  let targetsWithAmbiguousPeople = 0;
  let targetsWithIncompleteContext = 0;

  for (const targetInvestor of dataset.targetInvestors) {
    const org = dataset.organizations.find(
      (o) => o.id === targetInvestor.investorOrganizationId
    );
    const orgName = org ? org.name : targetInvestor.investorOrganizationId;

    // Execute frozen pipeline stages
    const genResult = generatePathsForTarget(
      dataset,
      targetInvestor.id,
      referenceDate
    );

    const rejResult = applyPathRejection(genResult);

    const scoreResult = scoreRetainedPaths(rejResult);

    const selectResult = selectTargetPerson(
      dataset,
      targetInvestor.id,
      targetPersonProfiles,
      scoreResult,
      referenceDate
    );

    // Analysis error check
    const isAnalysisError =
      genResult.executionStatus !== "success" ||
      rejResult.executionStatus !== "success" ||
      scoreResult.executionStatus !== "success" ||
      selectResult.executionStatus !== "success";

    const flags: string[] = [];

    if (isAnalysisError) {
      flags.push("ANALYSIS_ERROR");
      targetsWithAnalysisErrors++;
    }

    const generatedPathCount = genResult.paths ? genResult.paths.length : 0;
    const retainedPathCount = rejResult.retainedPaths
      ? rejResult.retainedPaths.length
      : 0;

    // Requirement 2: NO_KNOWN_PATH emit rules
    if (
      genResult.executionStatus === "success" &&
      genResult.disposition === "no_known_path" &&
      generatedPathCount === 0 &&
      !isAnalysisError
    ) {
      flags.push("NO_KNOWN_PATH");
      targetsWithNoKnownPaths++;
    }

    if (
      !isAnalysisError &&
      genResult.executionStatus === "success" &&
      generatedPathCount > 0 &&
      rejResult.executionStatus === "success" &&
      retainedPathCount === 0
    ) {
      flags.push("ALL_PATHS_REJECTED");
      targetsWithOnlyRejectedPaths++;
    }

    if (!isAnalysisError && retainedPathCount > 0) {
      targetsWithRetainedPaths++;
    }

    // Requirement 6: UPSTREAM_FILTERING_DIAGNOSTIC
    if (
      genResult.disposition === "confirmation_paths_filtered" ||
      rejResult.disposition === "upstream_paths_filtered" ||
      scoreResult.disposition === "upstream_paths_filtered" ||
      selectResult.disposition === "upstream_paths_filtered"
    ) {
      flags.push("PATHS_FILTERED_UPSTREAM");
    }

    if (genResult.confirmationRequiredPathCount > 0) {
      flags.push("CONFIRMATION_REQUIRED");
    }

    // Context & exact match diagnostics from selection evaluations
    let hasIncompleteContext = false;
    let primaryPersonName: string | undefined = undefined;

    if (selectResult.primaryTargetPersonId) {
      targetsWithPrimaryPersonSelected++;
      const p = dataset.people.find(
        (person) => person.id === selectResult.primaryTargetPersonId
      );
      if (p) primaryPersonName = p.fullName;
    }

    if (selectResult.disposition === "ambiguous_top_candidates") {
      flags.push("AMBIGUOUS_TARGET_PERSON");
      targetsWithAmbiguousPeople++;
    }

    if (selectResult.disposition === "insufficient_context") {
      hasIncompleteContext = true;
    }

    for (const ev of selectResult.evaluations) {
      if (
        ev.stageFitStatus === "unknown" ||
        ev.sectorFitStatus === "unknown" ||
        ev.geographyFitStatus === "unknown"
      ) {
        hasIncompleteContext = true;
      }

      if (ev.stageFitStatus === "no_match") {
        if (!flags.includes("EXACT_MATCH_STAGE_NO_MATCH")) {
          flags.push("EXACT_MATCH_STAGE_NO_MATCH");
        }
      }
      if (ev.sectorFitStatus === "no_match") {
        if (!flags.includes("EXACT_MATCH_SECTOR_NO_MATCH")) {
          flags.push("EXACT_MATCH_SECTOR_NO_MATCH");
        }
      }
      if (ev.geographyFitStatus === "no_match") {
        if (!flags.includes("EXACT_MATCH_GEOGRAPHY_NO_MATCH")) {
          flags.push("EXACT_MATCH_GEOGRAPHY_NO_MATCH");
        }
      }

      if (
        ev.personId === selectResult.primaryTargetPersonId &&
        ev.scoredPathCount === 0
      ) {
        flags.push("NO_RETAINED_ACCESS_TO_PRIMARY_TARGET");
      }
    }

    if (!startup.stage || startup.stage.trim() === "") {
      if (!flags.includes("MISSING_STARTUP_STAGE")) {
        flags.push("MISSING_STARTUP_STAGE");
      }
      if (!campaign.round || campaign.round.trim() === "") {
        hasIncompleteContext = true;
      }
    }
    if (!startup.sector || startup.sector.trim() === "") {
      if (!flags.includes("MISSING_STARTUP_SECTOR")) {
        flags.push("MISSING_STARTUP_SECTOR");
      }
      hasIncompleteContext = true;
    }
    if (!startup.geography || startup.geography.trim() === "") {
      if (!flags.includes("MISSING_STARTUP_GEOGRAPHY")) {
        flags.push("MISSING_STARTUP_GEOGRAPHY");
      }
      hasIncompleteContext = true;
    }

    if (hasIncompleteContext) {
      if (!flags.includes("TARGET_CONTEXT_INCOMPLETE")) {
        flags.push("TARGET_CONTEXT_INCOMPLETE");
      }
      targetsWithIncompleteContext++;
    }

    // Map scored paths
    const scoredPathSummaries: PilotScoredPathSummary[] = (
      scoreResult.scoredPaths || []
    ).map((sp) => ({
      pathId: sp.path.id,
      targetPersonId: sp.path.targetPersonId,
      overallPriorityIndex: sp.score.overallPriorityIndex,
      componentScores: {
        relationshipCredibility: sp.score.relationshipCredibility,
        temporalFreshness: sp.score.temporalFreshness,
        confirmationReadiness: sp.score.confirmationReadiness,
        pathEfficiency: sp.score.pathEfficiency,
      },
      explanation: sp.score.explanation,
    }));

    // Map rejection reasons
    const rejectionReasons = (rejResult.evaluations || [])
      .filter((ev) => ev.decision === "reject")
      .map((ev) => `${ev.pathId}: ${ev.explanation || "REJECTED"}`);

    // Build pathway explanation & activation plan
    const explanation = buildPathwayExplanation(
      dataset,
      targetInvestor.id,
      rejResult,
      scoreResult,
      selectResult,
      referenceDate
    );

    // Execute Batch 9 Latent Bridge Intelligence Discovery
    const anchors = extractFounderNetworkAnchors(dataset, campaign, referenceDate);
    const targetPersonId = selectResult.primaryTargetPersonId || targetInvestor.candidatePersonIds[0];
    const bridgeHypotheses = targetPersonId
      ? discoverBridgeHypotheses(dataset, campaign, targetInvestor, targetPersonId, anchors, referenceDate)
      : [];
    const fundAccessStrategy = determineFundAccessStrategy(
      dataset,
      campaign,
      targetInvestor,
      selectResult,
      bridgeHypotheses
    );

    targetReports.push({
      targetInvestorId: targetInvestor.id,
      investorOrganizationId: targetInvestor.investorOrganizationId,
      investorOrganizationName: orgName,
      generation: {
        executionStatus: genResult.executionStatus,
        disposition: genResult.disposition,
        pathCount: generatedPathCount,
        eligiblePathCount: genResult.eligiblePathCount || 0,
        confirmationRequiredPathCount: genResult.confirmationRequiredPathCount || 0,
        errors: genResult.errors || [],
      },
      rejection: {
        executionStatus: rejResult.executionStatus,
        disposition: rejResult.disposition,
        retainedPathCount,
        rejectedPathCount: rejResult.rejectedPaths ? rejResult.rejectedPaths.length : 0,
        rejectionReasons,
        errors: rejResult.errors || [],
      },
      scoring: {
        executionStatus: scoreResult.executionStatus,
        disposition: scoreResult.disposition,
        scoredPathCount: scoredPathSummaries.length,
        scoredPaths: scoredPathSummaries,
        errors: scoreResult.errors || [],
      },
      selection: {
        executionStatus: selectResult.executionStatus,
        disposition: selectResult.disposition,
        primaryTargetPersonId: selectResult.primaryTargetPersonId,
        primaryTargetPersonName: primaryPersonName,
        topCandidatePersonIds: selectResult.topCandidatePersonIds || [],
        evaluations: selectResult.evaluations || [],
        errors: selectResult.errors || [],
      },
      fundAccessStrategy,
      explanation,
      diagnosticFlags: flags,
    });
  }

  const report: PilotAnalysisReport = {
    meta: {
      referenceDate,
      startupId: startup.id,
      startupName: startup.name,
      campaignId: campaign.id,
      targetInvestorCount: dataset.targetInvestors.length,
      candidatePersonCount: uniqueCandidatePersonIds.size,
      relationshipCount: dataset.relationships.length,
      evidenceCount: dataset.relationshipEvidence.length,
    },
    summary: {
      targetsAnalyzed: dataset.targetInvestors.length,
      targetsWithRetainedPaths,
      targetsWithOnlyRejectedPaths,
      targetsWithNoKnownPaths,
      targetsWithAnalysisErrors,
      targetsWithPrimaryPersonSelected,
      targetsWithAmbiguousPeople,
      targetsWithIncompleteContext,
    },
    targetReports,
  };

  return {
    status: "success",
    report,
  };
}
