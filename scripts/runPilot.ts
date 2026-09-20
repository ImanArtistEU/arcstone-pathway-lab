import fs from "node:fs";
import path from "node:path";
import { loadPilotCsvBundle } from "@/lib/pilot/loadPilotCsvBundle";
import { analyzePilotDataset, PilotAnalysisReport } from "@/lib/pilot/analyzePilotDataset";

function parseArgs(): { inputDir: string; referenceDate: string } {
  const args = process.argv.slice(2);
  let inputDir: string | undefined = undefined;
  let referenceDate: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && i + 1 < args.length) {
      inputDir = args[i + 1];
      i++;
    } else if (args[i] === "--reference-date" && i + 1 < args.length) {
      referenceDate = args[i + 1];
      i++;
    }
  }

  if (!inputDir) {
    console.error("Error: Missing required argument --input <dirPath>");
    process.exit(1);
  }

  if (!referenceDate) {
    console.error("Error: Missing required argument --reference-date YYYY-MM-DD");
    process.exit(1);
  }

  return { inputDir: path.resolve(inputDir), referenceDate };
}

function generateMarkdownReport(report: PilotAnalysisReport, bundleName: string): string {
  const lines: string[] = [];

  lines.push(`# Arcstone Pathway Intelligence — Pilot Analysis Report`);
  lines.push(``);
  lines.push(`**Bundle:** \`${bundleName}\``);
  lines.push(`**Generated At:** ${new Date().toISOString()}`);
  lines.push(`**Reference Date:** \`${report.meta.referenceDate}\``);
  lines.push(``);

  lines.push(`## Dataset Metadata`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`| :--- | :--- |`);
  lines.push(`| Startup Name | ${report.meta.startupName} (\`${report.meta.startupId}\`) |`);
  lines.push(`| Campaign ID | \`${report.meta.campaignId}\` |`);
  lines.push(`| Target Investors | ${report.meta.targetInvestorCount} |`);
  lines.push(`| Candidate People | ${report.meta.candidatePersonCount} |`);
  lines.push(`| Relationships | ${report.meta.relationshipCount} |`);
  lines.push(`| Evidence Artifacts | ${report.meta.evidenceCount} |`);
  lines.push(``);

  lines.push(`## Pipeline Execution Summary`);
  lines.push(``);
  lines.push(`| Metric | Count |`);
  lines.push(`| :--- | :--- |`);
  lines.push(`| Targets Analyzed | ${report.summary.targetsAnalyzed} |`);
  lines.push(`| Targets with Retained Warm Paths | ${report.summary.targetsWithRetainedPaths} |`);
  lines.push(`| Targets with Only Rejected Paths | ${report.summary.targetsWithOnlyRejectedPaths} |`);
  lines.push(`| Targets with No Known Paths | ${report.summary.targetsWithNoKnownPaths} |`);
  lines.push(`| Targets with Primary Person Selected | ${report.summary.targetsWithPrimaryPersonSelected} |`);
  lines.push(`| Targets with Ambiguous Top Candidates | ${report.summary.targetsWithAmbiguousPeople} |`);
  lines.push(`| Targets with Incomplete Context | ${report.summary.targetsWithIncompleteContext} |`);
  lines.push(``);

  lines.push(`## Target Investor Analysis Breakdown`);
  lines.push(``);

  for (const tr of report.targetReports) {
    lines.push(`### Target Investor: ${tr.investorOrganizationName} (\`${tr.targetInvestorId}\`)`);
    lines.push(``);

    lines.push(`* **Path Generation:** Status = \`${tr.generation.executionStatus}\`, Disposition = \`${tr.generation.disposition}\`, Generated Paths = ${tr.generation.pathCount} (Eligible = ${tr.generation.eligiblePathCount}, Confirmation Required = ${tr.generation.confirmationRequiredPathCount})`);
    lines.push(`* **Path Rejection:** Disposition = \`${tr.rejection.disposition}\`, Retained = ${tr.rejection.retainedPathCount}, Rejected = ${tr.rejection.rejectedPathCount}`);
    if (tr.rejection.rejectionReasons.length > 0) {
      lines.push(`  * *Rejection Reasons:*`);
      for (const rr of tr.rejection.rejectionReasons) {
        lines.push(`    * \`${rr}\``);
      }
    }
    lines.push(`* **Path Scoring:** Disposition = \`${tr.scoring.disposition}\`, Scored Paths = ${tr.scoring.scoredPathCount}`);
    if (tr.scoring.scoredPaths.length > 0) {
      lines.push(`  * *Top Scored Paths:*`);
      for (const sp of tr.scoring.scoredPaths) {
        lines.push(`    * Path \`${sp.pathId}\` -> Target Person \`${sp.targetPersonId}\` (Score: **${sp.overallPriorityIndex}** / 100) — *${sp.explanation}*`);
      }
    }

    lines.push(`* **Target Person Selection:** Disposition = \`${tr.selection.disposition}\``);
    if (tr.selection.primaryTargetPersonId) {
      lines.push(`  * **Primary Selected Person:** ${tr.selection.primaryTargetPersonName || "Unknown"} (\`${tr.selection.primaryTargetPersonId}\`)`);
    } else {
      lines.push(`  * **Primary Selected Person:** None (Disposition: \`${tr.selection.disposition}\`)`);
    }

    if (tr.selection.evaluations.length > 0) {
      lines.push(`  * *Candidate Evaluations:*`);
      for (const ev of tr.selection.evaluations) {
        lines.push(`    * Person \`${ev.personId}\` (${ev.roleTitle || "No title"} / ${ev.investmentRole}): Priority Index = **${ev.overallTargetPriorityIndex}**, Mandate Fit = **${ev.mandateFitIndex}**, Access Quality = **${ev.accessQualityIndex}**, Selectable = \`${ev.selectable}\``);
        lines.push(`      * *Explanation:* ${ev.explanation}`);
      }
    }

    if (tr.diagnosticFlags.length > 0) {
      lines.push(`* **Diagnostic Flags:** \`${tr.diagnosticFlags.join("`, `")}\``);
    } else {
      lines.push(`* **Diagnostic Flags:** *None*`);
    }

    lines.push(``);
    lines.push(`---`);
    lines.push(``);
  }

  return lines.join("\n");
}

export function runPilot(): void {
  const { inputDir, referenceDate } = parseArgs();

  const bundleName = path.basename(inputDir);
  console.log(`Loading real-data pilot CSV bundle from "${inputDir}"...`);

  const loadResult = loadPilotCsvBundle(inputDir);

  if (loadResult.status === "error" || !loadResult.dataset || !loadResult.targetPersonProfiles) {
    console.error(`Failed to load pilot CSV bundle. ${loadResult.errors.length} error(s) found:`);
    for (const err of loadResult.errors) {
      console.error(` - [${err.file}${err.row ? `:${err.row}` : ""}] (${err.code}): ${err.message}`);
    }
    process.exit(1);
  }

  console.log(`Successfully loaded CSV bundle "${bundleName}".`);
  console.log(`Analyzing dataset with reference date "${referenceDate}"...`);

  const report = analyzePilotDataset(loadResult.dataset, loadResult.targetPersonProfiles, referenceDate);

  const outputDir = path.resolve(process.cwd(), "pilot-output", bundleName);
  fs.mkdirSync(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, "report.json");
  const mdPath = path.join(outputDir, "report.md");

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  const mdContent = generateMarkdownReport(report, bundleName);
  fs.writeFileSync(mdPath, mdContent, "utf8");

  console.log(`\n==================================================`);
  console.log(`PILOT ANALYSIS COMPLETE`);
  console.log(`==================================================`);
  console.log(`Bundle Name: ${bundleName}`);
  console.log(`JSON Report: ${jsonPath}`);
  console.log(`Markdown Report: ${mdPath}`);
  console.log(`--------------------------------------------------`);
  console.log(`Targets Analyzed: ${report.summary.targetsAnalyzed}`);
  console.log(`Targets with Retained Paths: ${report.summary.targetsWithRetainedPaths}`);
  console.log(`Targets with Only Rejected Paths: ${report.summary.targetsWithOnlyRejectedPaths}`);
  console.log(`Targets with No Known Paths: ${report.summary.targetsWithNoKnownPaths}`);
  console.log(`Primary Person Selected: ${report.summary.targetsWithPrimaryPersonSelected}`);
  console.log(`Ambiguous Top Candidates: ${report.summary.targetsWithAmbiguousPeople}`);
  console.log(`Incomplete Context: ${report.summary.targetsWithIncompleteContext}`);
  console.log(`==================================================\n`);
}

if (require.main === module) {
  runPilot();
}
