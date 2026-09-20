import fs from "node:fs";
import path from "node:path";
import { loadPilotCsvBundle } from "@/lib/pilot/loadPilotCsvBundle";
import {
  analyzePilotDataset,
  PilotAnalysisReport,
  PilotTargetReport,
} from "@/lib/pilot/analyzePilotDataset";

export interface ParsedPilotArgs {
  inputDir?: string;
  referenceDate?: string;
  errors: string[];
}

export function parsePilotArgs(args: string[]): ParsedPilotArgs {
  const errors: string[] = [];
  let inputDir: string | undefined = undefined;
  let referenceDate: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--input" && i + 1 < args.length) {
      inputDir = args[i + 1];
      i++;
    } else if (arg.startsWith("--input=")) {
      inputDir = arg.split("=")[1];
    } else if (arg === "--reference-date" && i + 1 < args.length) {
      referenceDate = args[i + 1];
      i++;
    } else if (arg.startsWith("--reference-date=")) {
      referenceDate = arg.split("=")[1];
    }
  }

  if (!inputDir || inputDir.trim() === "") {
    errors.push("Missing required argument: --input <directory>");
  }

  if (!referenceDate || referenceDate.trim() === "") {
    errors.push("Missing required argument: --reference-date <YYYY-MM-DD>");
  } else {
    const d = new Date(referenceDate);
    if (isNaN(d.getTime())) {
      errors.push(`Invalid reference date provided: "${referenceDate}"`);
    }
  }

  return {
    inputDir,
    referenceDate,
    errors,
  };
}

export function generateMarkdownReport(report: PilotAnalysisReport): string {
  const { meta, summary, targetReports } = report;

  const lines: string[] = [];

  // Canonical Report Title (Requirement 23)
  lines.push("# Arcstone Pathway Intelligence Pilot Report");
  lines.push("");
  lines.push("## Dataset Metadata");
  lines.push(`- **Startup:** ${meta.startupName} (\`${meta.startupId}\`)`);
  lines.push(`- **Campaign ID:** \`${meta.campaignId}\``);
  lines.push(`- **Reference Date:** \`${meta.referenceDate}\``);
  lines.push(`- **Target Investors Analyzed:** ${meta.targetInvestorCount}`);
  lines.push(`- **Candidate Investor People:** ${meta.candidatePersonCount}`);
  lines.push(`- **Relationships Ingested:** ${meta.relationshipCount}`);
  lines.push(`- **Evidence Items Ingested:** ${meta.evidenceCount}`);
  lines.push("");

  lines.push("## Executive Summary");
  lines.push(`- **Total Targets Analyzed:** ${summary.targetsAnalyzed}`);
  lines.push(`- **Targets with Retained Pathway(s):** ${summary.targetsWithRetainedPaths}`);
  lines.push(`- **Targets with Only Rejected Pathways:** ${summary.targetsWithOnlyRejectedPaths}`);
  lines.push(`- **Targets with No Known Path:** ${summary.targetsWithNoKnownPaths}`);
  lines.push(`- **Targets with Pipeline Analysis Error:** ${summary.targetsWithAnalysisErrors}`);
  lines.push(`- **Targets with Primary Person Selected:** ${summary.targetsWithPrimaryPersonSelected}`);
  lines.push(`- **Targets with Ambiguous Person Ties:** ${summary.targetsWithAmbiguousPeople}`);
  lines.push(`- **Targets with Incomplete Context:** ${summary.targetsWithIncompleteContext}`);
  lines.push("");

  lines.push("## Target Investor Analysis Reports");
  lines.push("");

  for (const t of targetReports) {
    lines.push(`### Target Fund: ${t.investorOrganizationName} (\`${t.targetInvestorId}\`)`);
    lines.push("");

    if (t.diagnosticFlags.length > 0) {
      lines.push(`**Diagnostic Flags:** ${t.diagnosticFlags.map((f) => `\`${f}\``).join(", ")}`);
      lines.push("");
    }

    if (t.diagnosticFlags.includes("ANALYSIS_ERROR")) {
      lines.push("> **ANALYSIS ERROR**: One or more pipeline stages failed for this target investor.");
      lines.push("");
    }

    lines.push("#### Pipeline Stage Execution Summary");
    lines.push(`- **Path Generation:** Status = \`${t.generation.executionStatus}\`, Disposition = \`${t.generation.disposition || "none"}\`, Found = ${t.generation.pathCount} paths`);
    lines.push(`- **Path Rejection:** Status = \`${t.rejection.executionStatus}\`, Disposition = \`${t.rejection.disposition || "none"}\`, Retained = ${t.rejection.retainedPathCount} paths, Rejected = ${t.rejection.rejectedPathCount} paths`);
    lines.push(`- **Path Scoring:** Status = \`${t.scoring.executionStatus}\`, Disposition = \`${t.scoring.disposition || "none"}\`, Scored = ${t.scoring.scoredPathCount} paths`);
    lines.push(`- **Target Selection:** Status = \`${t.selection.executionStatus}\`, Disposition = \`${t.selection.disposition || "none"}\`, Selected = ${t.selection.primaryTargetPersonName ? `${t.selection.primaryTargetPersonName} (\`${t.selection.primaryTargetPersonId}\`)` : "None"}`);
    lines.push("");

    // Display stage errors if any
    const allStageErrors = [
      ...t.generation.errors,
      ...t.rejection.errors,
      ...t.scoring.errors,
      ...t.selection.errors,
    ];
    if (allStageErrors.length > 0) {
      lines.push("#### Pipeline Errors");
      for (const err of allStageErrors) {
        const errObj = (typeof err === "object" && err !== null ? err : {}) as Record<string, unknown>;
        const stage = typeof errObj.stage === "string" ? errObj.stage : "Pipeline";
        const message = typeof errObj.message === "string" ? errObj.message : JSON.stringify(err);
        lines.push(`- **${stage}:** ${message}`);
      }
      lines.push("");
    }

    // Scored Paths (Requirement 24: Scored Paths NOT "Top Scored Paths")
    lines.push(`## Target Fund: ${t.investorOrganizationName} (\`${t.targetInvestorId}\`)`);
    lines.push("");

    const exp = t.explanation;

    // 1. Target Person
    lines.push("### Target Person");
    if (exp.targetPersonDecision.personName) {
      lines.push(`- **Selected Target:** ${exp.targetPersonDecision.personName} (\`${exp.targetPersonDecision.personId}\`)`);
      lines.push(`- **Role Title:** ${exp.targetPersonDecision.roleTitle || "Unknown"}`);
      lines.push(`- **Investment Role:** \`${exp.targetPersonDecision.investmentRole || "unknown"}\``);
      lines.push(`- **Overall Target Priority Index:** **${exp.targetPersonDecision.overallTargetPriorityIndex ?? 0}/100**`);
      lines.push(`  - Mandate Fit Index: ${exp.targetPersonDecision.mandateFitIndex ?? 0}/100`);
      lines.push(`  - Access Quality Index: ${exp.targetPersonDecision.accessQualityIndex ?? 0}/100`);
    } else {
      lines.push("- **Selected Target:** None");
    }
    lines.push("");

    // 2. Why This Person
    lines.push("### Why This Person");
    for (const r of exp.targetPersonDecision.reasons) {
      lines.push(`- ${r}`);
    }
    if (exp.targetPersonDecision.candidateComparisons.length > 0) {
      lines.push("");
      lines.push("**Candidate Comparisons:**");
      for (const comp of exp.targetPersonDecision.candidateComparisons) {
        lines.push(`- *vs. ${comp.personName}*: ${comp.explanation}`);
      }
    }
    lines.push("");

    // 3. Preferred Evidence-Backed Route
    lines.push("### Preferred Evidence-Backed Route");
    if (exp.preferredRoute) {
      lines.push(`- **Route:** **${exp.preferredRoute.humanRoute}**`);
      lines.push(`- **Path Score Index:** **${exp.preferredRoute.overallPriorityIndex}/100**`);
      lines.push(`  - Credibility: ${exp.preferredRoute.relationshipCredibility}, Freshness: ${exp.preferredRoute.temporalFreshness}, Confirmation: ${exp.preferredRoute.confirmationReadiness}, Efficiency: ${exp.preferredRoute.pathEfficiency}`);
    } else if (exp.disposition === "no_retained_route_to_primary_target") {
      lines.push("- **RIGHT PERSON, NO VERIFIED ROUTE**: No retained evidence-backed introduction route currently exists in the dataset.");
    } else {
      lines.push("- **Status:** No preferred route selected.");
    }
    lines.push("");

    // 4. Why This Route
    lines.push("### Why This Route");
    if (exp.preferredRoute && exp.preferredRoute.whyPreferred.length > 0) {
      for (const reason of exp.preferredRoute.whyPreferred) {
        lines.push(`- ${reason}`);
      }
    } else {
      lines.push("- No route comparisons available.");
    }
    lines.push("");

    // 5. Connection Evidence
    lines.push("### Connection Evidence");
    if (exp.preferredRoute && exp.preferredRoute.steps.length > 0) {
      for (const step of exp.preferredRoute.steps) {
        lines.push(`- **Hop ${step.fromPersonName} → ${step.toPersonName}** (\`${step.relationshipType}\`)`);
        lines.push(`  - Provenance: \`${step.evidenceAccessClass || "public"}\` | Origin: \`${step.evidenceAccessClass === "first_party_private" ? "YOUR CONNECTED DATA" : step.evidenceAccessClass === "user_asserted" ? "YOUR ASSERTION" : "PUBLIC SOURCE"}\``);
        lines.push(`  - Status: \`${step.qualificationStatus}\` | Recency: \`${step.qualificationRecency}\``);
        lines.push(`  - Connection Rationale: ${step.whyThisConnectionExists}`);
        if (step.whatArcstoneKnows && step.whatArcstoneKnows.length > 0) {
          lines.push(`  - What Arcstone Observes: ${step.whatArcstoneKnows.join("; ")}`);
        }
        if (step.whatArcstoneDoesNotKnow && step.whatArcstoneDoesNotKnow.length > 0) {
          lines.push(`  - What Arcstone Does Not Know: ${step.whatArcstoneDoesNotKnow.join("; ")}`);
        }
        if (step.confidenceLimitation) {
          lines.push(`  - Limitation: *${step.confidenceLimitation}*`);
        }
        if (step.evidenceItems.length > 0) {
          lines.push("  - Evidence Items:");
          for (const ev of step.evidenceItems) {
            lines.push(`    - [\`${ev.originLabel || ev.accessClass || ev.evidenceType}\`] ${ev.description}`);
          }
        }
      }
    } else {
      lines.push("- No route connection evidence available.");
    }
    lines.push("");

    // 6. Weakest Link
    lines.push("### Weakest Link");
    if (exp.preferredRoute && exp.preferredRoute.weakestLink) {
      const wl = exp.preferredRoute.weakestLink;
      lines.push(`- **Weakest Step:** ${wl.fromPersonName} → ${wl.toPersonName}`);
      lines.push(`- **Reason:** ${wl.reason}`);
      if (wl.recommendedVerification) {
        lines.push(`- **Recommended Action:** ${wl.recommendedVerification}`);
      }
    } else {
      lines.push("- No route weakest link identified.");
    }
    lines.push("");

    // 7. How to Activate
    lines.push("### How to Activate");
    lines.push(`- **Activation Strategy:** \`${exp.activationPlan.type}\``);
    lines.push(`- **Rationale:** ${exp.activationPlan.rationale}`);
    if (exp.activationPlan.steps.length > 0) {
      lines.push("- **Activation Steps:**");
      for (const s of exp.activationPlan.steps) {
        lines.push(`  ${s.order}. **${s.actionType}:** ${s.action}`);
      }
    }
    if (exp.activationPlan.cautions.length > 0) {
      lines.push("- **Cautions:**");
      for (const c of exp.activationPlan.cautions) {
        lines.push(`  - ⚠️ ${c}`);
      }
    }
    lines.push("");

    // 8. Alternatives Considered
    lines.push("### Alternatives Considered");
    if (exp.alternativeRoutes.length > 0) {
      lines.push("#### Alternative Retained Routes");
      for (const alt of exp.alternativeRoutes) {
        lines.push(`- **${alt.humanRoute}** (Score: ${alt.overallPriorityIndex}): ${alt.reasonPreferredRouteRanksHigher.join(" ")}`);
      }
    }
    if (exp.rejectedRoutesToPrimaryTarget.length > 0) {
      lines.push("#### Rejected Routes to Primary Target");
      for (const rej of exp.rejectedRoutesToPrimaryTarget) {
        lines.push(`- **${rej.humanRoute}**: Rejected because *${rej.explanation}*`);
      }
    }
    if (exp.alternativeRoutes.length === 0 && exp.rejectedRoutesToPrimaryTarget.length === 0) {
      lines.push("- No alternative routes were identified.");
    }
    lines.push("");

    // 9. Latent Network Bridge Intelligence (Part 32)
    if (t.fundAccessStrategy) {
      const fas = t.fundAccessStrategy;
      lines.push("### Latent Network Bridge Intelligence & Fund Access Strategy");
      lines.push(`- **Fund Access Status:** \`${fas.accessStatus}\``);
      lines.push(`- **Decision Target Person:** \`${fas.decisionTargetPersonId}\``);
      if (fas.reachableEntryPointPersonId) {
        lines.push(`- **Reachable Entry Point Person:** \`${fas.reachableEntryPointPersonId}\``);
      }
      if (fas.bestBridgeHypothesis) {
        const b = fas.bestBridgeHypothesis;
        lines.push(`- **Best Person to Ask:** \`${b.anchorPersonId}\` (Bridge Relevance Index: **${b.bridgeRelevance.overallBridgeRelevanceIndex}/100** - Uncalibrated relevance index)`);
        lines.push("- **What Arcstone Knows:**");
        for (const k of b.whatWeKnow) {
          lines.push(`  - ${k}`);
        }
        lines.push("- **What Arcstone Does Not Know:**");
        for (const dk of b.whatWeDoNotKnow) {
          lines.push(`  - ${dk}`);
        }
        lines.push(`- **Recommended Action:** **${b.verificationRequired ? `ASK ABOUT TARGET (\`ASK ${b.anchorPersonId} ABOUT ${b.targetPersonId}\`)` : `REQUEST INTRODUCTION (\`REQUEST INTRODUCTION FROM ${b.anchorPersonId} TO ${b.targetPersonId}\`)`}**`);
      }
      if (fas.alternativeBridgeHypotheses.length > 0) {
        lines.push("- **Alternative Bridges Worth Asking:**");
        for (const alt of fas.alternativeBridgeHypotheses) {
          lines.push(`  - \`${alt.anchorPersonId}\` (Relevance Index: ${alt.bridgeRelevance.overallBridgeRelevanceIndex}/100)`);
        }
      }
      lines.push("");
    }

    // 10. Diagnostic Flags
    lines.push("### Diagnostic Flags");
    if (t.diagnosticFlags.length > 0) {
      lines.push(`- **Flags:** ${t.diagnosticFlags.map((f) => `\`${f}\``).join(", ")}`);
    } else {
      lines.push("- None");
    }
    lines.push("");

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

export interface RunPilotResult {
  success: boolean;
  jsonPath?: string;
  mdPath?: string;
  errors: string[];
}

export function runPilotAnalysis(inputDir: string, referenceDate: string): RunPilotResult {
  // 1. Check reference date
  if (!referenceDate || isNaN(new Date(referenceDate).getTime())) {
    return {
      success: false,
      errors: [`Invalid reference date provided: "${referenceDate}"`],
    };
  }

  // 2. Load bundle
  const loadResult = loadPilotCsvBundle(inputDir);
  if (loadResult.status !== "success" || !loadResult.dataset || !loadResult.targetPersonProfiles) {
    const formattedErrors = loadResult.errors.map(
      (e) => `[${e.file}${e.row ? ` row ${e.row}` : ""}] ${e.code}: ${e.message}`
    );
    return {
      success: false,
      errors: formattedErrors.length > 0 ? formattedErrors : ["Failed to load CSV bundle."],
    };
  }

  // 3. Analyze dataset
  const analysisResult = analyzePilotDataset(
    loadResult.dataset,
    loadResult.targetPersonProfiles,
    referenceDate
  );

  if (analysisResult.status !== "success" || !analysisResult.report) {
    const formattedErrors = (analysisResult.errors || []).map(
      (e) => `${e.code}: ${e.message}`
    );
    return {
      success: false,
      errors: formattedErrors.length > 0 ? formattedErrors : ["Analysis failed."],
    };
  }

  // 4. Output reports
  const bundleName = path.basename(path.resolve(inputDir));
  const outputDir = path.resolve(process.cwd(), "pilot-output", bundleName);

  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, "report.json");
  const mdPath = path.join(outputDir, "report.md");

  const jsonContent = JSON.stringify(analysisResult.report, null, 2);
  const mdContent = generateMarkdownReport(analysisResult.report);

  fs.writeFileSync(jsonPath, jsonContent, "utf8");
  fs.writeFileSync(mdPath, mdContent, "utf8");

  return {
    success: true,
    jsonPath,
    mdPath,
    errors: [],
  };
}

export function runPilotMain(): void {
  const parsed = parsePilotArgs(process.argv.slice(2));

  if (parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      console.error(`CLI Error: ${err}`);
    }
    process.exitCode = 1;
    return;
  }

  const result = runPilotAnalysis(parsed.inputDir!, parsed.referenceDate!);

  if (!result.success) {
    console.error("Pilot analysis failed:");
    for (const err of result.errors) {
      console.error(`  - ${err}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Pilot analysis complete!`);
  console.log(`JSON Report: ${result.jsonPath}`);
  console.log(`Markdown Report: ${result.mdPath}`);
}

if (require.main === module) {
  runPilotMain();
}
