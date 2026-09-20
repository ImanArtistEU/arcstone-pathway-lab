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
    if (t.scoring.scoredPaths && t.scoring.scoredPaths.length > 0) {
      lines.push("#### Scored Paths");
      for (const sp of t.scoring.scoredPaths) {
        lines.push(`- **Path \`${sp.pathId}\`** (Target Person: \`${sp.targetPersonId}\`): Priority Index = **${sp.overallPriorityIndex}**`);
        lines.push(`  - Component Scores: Credibility = ${sp.componentScores.relationshipCredibility}, Freshness = ${sp.componentScores.temporalFreshness}, Confirmation = ${sp.componentScores.confirmationReadiness}, Efficiency = ${sp.componentScores.pathEfficiency}`);
        lines.push(`  - Explanation: *${sp.explanation}*`);
      }
      lines.push("");
    }

    if (t.rejection.rejectionReasons && t.rejection.rejectionReasons.length > 0) {
      lines.push("#### Rejection Reasons");
      for (const reason of t.rejection.rejectionReasons) {
        lines.push(`- ${reason}`);
      }
      lines.push("");
    }

    if (t.selection.evaluations && t.selection.evaluations.length > 0) {
      lines.push("#### Candidate Person Evaluations");
      for (const ev of t.selection.evaluations) {
        lines.push(`- **Candidate \`${ev.personId}\`** (Role: \`${ev.investmentRole}\`, Title: "${ev.roleTitle}")`);
        lines.push(`  - Target Priority Index: **${ev.overallTargetPriorityIndex}** (Mandate Fit: ${ev.mandateFitIndex}, Access Quality: ${ev.accessQualityIndex})`);
        lines.push(`  - Fit Statuses: Stage = \`${ev.stageFitStatus}\`, Sector = \`${ev.sectorFitStatus}\`, Geography = \`${ev.geographyFitStatus}\``);
        lines.push(`  - Explanation: *${ev.explanation}*`);
      }
      lines.push("");
    }

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
