import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parsePilotArgs,
  runPilotAnalysis,
  generateMarkdownReport,
} from "@/scripts/runPilot";
import { PilotAnalysisReport } from "@/lib/pilot/analyzePilotDataset";

describe("Pilot CLI & Report Generator (scripts/runPilot.ts)", () => {
  const sampleDir = path.resolve(__dirname, "../data/fixtures/pilot-csv-sample");
  let tempOutputDir: string;

  beforeEach(() => {
    tempOutputDir = fs.mkdtempSync(path.join(os.tmpdir(), "pilot-cli-output-"));
  });

  afterEach(() => {
    if (fs.existsSync(tempOutputDir)) {
      fs.rmSync(tempOutputDir, { recursive: true, force: true });
    }
  });

  it("43. parses valid CLI arguments correctly", () => {
    const parsed = parsePilotArgs(["--input", sampleDir, "--reference-date", "2026-09-18"]);
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.inputDir).toBe(sampleDir);
    expect(parsed.referenceDate).toBe("2026-09-18");
  });

  it("44. returns error when --input is missing", () => {
    const parsed = parsePilotArgs(["--reference-date", "2026-09-18"]);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors[0]).toContain("Missing required argument: --input");
  });

  it("45. returns error when --reference-date is missing", () => {
    const parsed = parsePilotArgs(["--input", sampleDir]);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors[0]).toContain("Missing required argument: --reference-date");
  });

  it("46. returns error when --reference-date is invalid", () => {
    const parsed = parsePilotArgs(["--input", sampleDir, "--reference-date", "not-a-date"]);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(parsed.errors[0]).toContain("Invalid reference date");
  });

  it("47 & 48. executes analysis and writes report.json and report.md for valid input", () => {
    const res = runPilotAnalysis(sampleDir, "2026-09-18");
    expect(res.success).toBe(true);
    expect(res.jsonPath).toBeDefined();
    expect(res.mdPath).toBeDefined();

    expect(fs.existsSync(res.jsonPath!)).toBe(true);
    expect(fs.existsSync(res.mdPath!)).toBe(true);
  });

  it("49. writes NO report files on invalid reference date", () => {
    const outputDir = path.resolve(process.cwd(), "pilot-output/pilot-csv-sample-invalid");
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }

    const res = runPilotAnalysis(sampleDir, "not-a-date");
    expect(res.success).toBe(false);
    expect(fs.existsSync(outputDir)).toBe(false);
  });

  it("50. verifies canonical report title begins EXACTLY as required", () => {
    const res = runPilotAnalysis(sampleDir, "2026-09-18");
    const mdContent = fs.readFileSync(res.mdPath!, "utf8");

    expect(mdContent.startsWith("# Arcstone Pathway Intelligence Pilot Report")).toBe(true);
  });

  it("51. verifies report does NOT contain 'Top Scored Paths' and contains 'Preferred Evidence-Backed Route'", () => {
    const res = runPilotAnalysis(sampleDir, "2026-09-18");
    const mdContent = fs.readFileSync(res.mdPath!, "utf8");

    expect(mdContent).not.toContain("Top Scored Paths");
    expect(mdContent).toContain("### Preferred Evidence-Backed Route");
  });

  it("52. verifies report contains NO system clock or random timestamps", () => {
    const res = runPilotAnalysis(sampleDir, "2026-09-18");
    const mdContent = fs.readFileSync(res.mdPath!, "utf8");

    expect(mdContent).not.toContain("Generated At:");
  });

  it("53 & 54. verifies repeated execution yields byte-equivalent JSON and Markdown reports", () => {
    const res1 = runPilotAnalysis(sampleDir, "2026-09-18");
    const json1 = fs.readFileSync(res1.jsonPath!, "utf8");
    const md1 = fs.readFileSync(res1.mdPath!, "utf8");

    const res2 = runPilotAnalysis(sampleDir, "2026-09-18");
    const json2 = fs.readFileSync(res2.jsonPath!, "utf8");
    const md2 = fs.readFileSync(res2.mdPath!, "utf8");

    expect(json1).toBe(json2);
    expect(md1).toBe(md2);
  });

  it("55. verifies target with analysis error displays ANALYSIS ERROR in Markdown", () => {
    const mockReport: PilotAnalysisReport = {
      meta: {
        referenceDate: "2026-09-18",
        startupId: "startup-1",
        startupName: "Test Startup",
        campaignId: "campaign-1",
        targetInvestorCount: 1,
        candidatePersonCount: 1,
        relationshipCount: 1,
        evidenceCount: 1,
      },
      summary: {
        targetsAnalyzed: 1,
        targetsWithRetainedPaths: 0,
        targetsWithOnlyRejectedPaths: 0,
        targetsWithNoKnownPaths: 0,
        targetsWithAnalysisErrors: 1,
        targetsWithPrimaryPersonSelected: 0,
        targetsWithAmbiguousPeople: 0,
        targetsWithIncompleteContext: 0,
      },
      targetReports: [
        {
          targetInvestorId: "target-error",
          investorOrganizationId: "org-error",
          investorOrganizationName: "Error VC",
          generation: {
            executionStatus: "error",
            disposition: null,
            pathCount: 0,
            eligiblePathCount: 0,
            confirmationRequiredPathCount: 0,
            errors: [{ stage: "Generation", message: "Synthetic generation error" }],
          },
          rejection: {
            executionStatus: "upstream_error",
            disposition: null,
            retainedPathCount: 0,
            rejectedPathCount: 0,
            rejectionReasons: [],
            errors: [],
          },
          scoring: {
            executionStatus: "upstream_error",
            disposition: null,
            scoredPathCount: 0,
            scoredPaths: [],
            errors: [],
          },
          selection: {
            executionStatus: "upstream_error",
            disposition: null,
            topCandidatePersonIds: [],
            evaluations: [],
            errors: [],
          },
          explanation: {
            executionStatus: "upstream_error",
            targetInvestorId: "target-error",
            disposition: "upstream_error",
            targetPersonDecision: {
              organizationId: "org-error",
              organizationName: "Error VC",
              reasons: ["Upstream stage execution error."],
              candidateComparisons: [],
            },
            topRoutePathIds: [],
            alternativeRoutes: [],
            rejectedRoutesToPrimaryTarget: [],
            activationPlan: {
              type: "unavailable",
              status: "upstream_error",
              steps: [],
              rationale: "Upstream pipeline execution failed.",
              cautions: [],
            },
            errors: ["Upstream stage failed execution."],
          },
          diagnosticFlags: ["ANALYSIS_ERROR"],
        },
      ],
    };

    const md = generateMarkdownReport(mockReport);
    expect(md).toContain("**ANALYSIS ERROR**");
    expect(md).toContain("Synthetic generation error");
    expect(md).not.toContain("NO KNOWN PATH");
  });
});
