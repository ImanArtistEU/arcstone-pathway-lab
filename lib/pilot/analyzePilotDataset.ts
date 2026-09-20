import {
  PathwayDataset,
  TargetPersonProfile,
  TargetPersonEvaluation,
} from "@/types/pathway";
import { generatePathsForTarget } from "@/lib/pathway/generatePathsForTarget";
import { applyPathRejection } from "@/lib/pathway/applyPathRejection";
import { scoreRetainedPaths } from "@/lib/pathway/scoreRetainedPaths";
import { selectTargetPerson } from "@/lib/pathway/selectTargetPerson";

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
    disposition: string;
    pathCount: number;
    eligiblePathCount: number;
    confirmationRequiredPathCount: number;
  };
  rejection: {
    disposition: string;
    retainedPathCount: number;
    rejectedPathCount: number;
    rejectionReasons: string[];
  };
  scoring: {
    disposition: string;
    scoredPathCount: number;
    scoredPaths: PilotScoredPathSummary[];
  };
  selection: {
    disposition: string;
    primaryTargetPersonId?: string;
    primaryTargetPersonName?: string;
    topCandidatePersonIds: string[];
    evaluations: TargetPersonEvaluation[];
  };
  diagnosticFlags: string[];
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
  summary: {
    targetsAnalyzed: number;
    targetsWithRetainedPaths: number;
    targetsWithOnlyRejectedPaths: number;
    targetsWithNoKnownPaths: number;
    targetsWithPrimaryPersonSelected: number;
    targetsWithAmbiguousPeople: number;
    targetsWithIncompleteContext: number;
  };
  targetReports: PilotTargetReport[];
}

export function analyzePilotDataset(
  dataset: PathwayDataset,
  targetPersonProfiles: TargetPersonProfile[],
  referenceDate: string
): PilotAnalysisReport {
  const startup = dataset.startups[0];
  const campaign = dataset.campaigns[0];

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
  let targetsWithPrimaryPersonSelected = 0;
  let targetsWithAmbiguousPeople = 0;
  let targetsWithIncompleteContext = 0;

  for (const targetInvestor of dataset.targetInvestors) {
    const org = dataset.organizations.find(
      (o) => o.id === targetInvestor.investorOrganizationId
    );
    const orgName = org ? org.name : targetInvestor.investorOrganizationId;

    // 1. Path Generation
    const genResult = generatePathsForTarget(
      dataset,
      targetInvestor.id,
      referenceDate
    );

    // 2. Path Rejection
    const rejResult = applyPathRejection(genResult);

    // 3. Path Scoring
    const scoreResult = scoreRetainedPaths(rejResult);

    // 4. Target Person Selection
    const selectResult = selectTargetPerson(
      dataset,
      targetInvestor.id,
      targetPersonProfiles,
      scoreResult,
      referenceDate
    );

    // Diagnostic Flags calculation
    const flags: string[] = [];

    const generatedPathCount = genResult.paths.length;
    const retainedPathCount = rejResult.retainedPaths.length;

    if (genResult.disposition === "no_known_path" || generatedPathCount === 0) {
      flags.push("NO_KNOWN_PATH");
      targetsWithNoKnownPaths++;
    } else if (generatedPathCount > 0 && retainedPathCount === 0) {
      flags.push("ALL_PATHS_REJECTED");
      targetsWithOnlyRejectedPaths++;
    }

    if (retainedPathCount > 0) {
      targetsWithRetainedPaths++;
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

    if (!startup || !startup.stage) {
      if (!campaign || !campaign.round) {
        if (!flags.includes("MISSING_STARTUP_STAGE")) {
          flags.push("MISSING_STARTUP_STAGE");
        }
        hasIncompleteContext = true;
      }
    }
    if (!startup || !startup.sector) {
      if (!flags.includes("MISSING_STARTUP_SECTOR")) {
        flags.push("MISSING_STARTUP_SECTOR");
      }
      hasIncompleteContext = true;
    }
    if (!startup || !startup.geography) {
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
    const scoredPathSummaries: PilotScoredPathSummary[] = scoreResult.scoredPaths.map(
      (sp) => ({
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
      })
    );

    // Map rejection reasons
    const rejectionReasons = rejResult.evaluations
      .filter((ev) => ev.decision === "reject")
      .map((ev) => `${ev.pathId}: ${ev.explanation || "REJECTED"}`);

    targetReports.push({
      targetInvestorId: targetInvestor.id,
      investorOrganizationId: targetInvestor.investorOrganizationId,
      investorOrganizationName: orgName,
      generation: {
        executionStatus: genResult.executionStatus,
        disposition: genResult.disposition || "unknown",
        pathCount: generatedPathCount,
        eligiblePathCount: genResult.eligiblePathCount,
        confirmationRequiredPathCount: genResult.confirmationRequiredPathCount,
      },
      rejection: {
        disposition: rejResult.disposition,
        retainedPathCount,
        rejectedPathCount: rejResult.rejectedPaths.length,
        rejectionReasons,
      },
      scoring: {
        disposition: scoreResult.disposition,
        scoredPathCount: scoreResult.scoredPaths.length,
        scoredPaths: scoredPathSummaries,
      },
      selection: {
        disposition: selectResult.disposition,
        primaryTargetPersonId: selectResult.primaryTargetPersonId,
        primaryTargetPersonName: primaryPersonName,
        topCandidatePersonIds: selectResult.topCandidatePersonIds,
        evaluations: selectResult.evaluations,
      },
      diagnosticFlags: flags,
    });
  }

  return {
    meta: {
      referenceDate,
      startupId: startup ? startup.id : "unknown",
      startupName: startup ? startup.name : "unknown",
      campaignId: campaign ? campaign.id : "unknown",
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
      targetsWithPrimaryPersonSelected,
      targetsWithAmbiguousPeople,
      targetsWithIncompleteContext,
    },
    targetReports,
  };
}
