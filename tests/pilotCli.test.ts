import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { describe, it, expect } from "vitest";

describe("Pilot CLI (scripts/runPilot.ts)", () => {
  it("executes npm run pilot:analyze on synthetic sample directory and outputs report files", () => {
    const sampleDir = path.resolve(__dirname, "../data/fixtures/pilot-csv-sample");
    const cmd = `npx tsx scripts/runPilot.ts --input ${sampleDir} --reference-date 2026-09-18`;

    expect(() => {
      execSync(cmd, { cwd: path.resolve(__dirname, "..") });
    }).not.toThrow();

    const outputDir = path.resolve(__dirname, "../pilot-output/pilot-csv-sample");
    expect(fs.existsSync(path.join(outputDir, "report.json"))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, "report.md"))).toBe(true);

    const jsonContent = JSON.parse(fs.readFileSync(path.join(outputDir, "report.json"), "utf8"));
    expect(jsonContent.summary.targetsAnalyzed).toBe(4);
  });
});
