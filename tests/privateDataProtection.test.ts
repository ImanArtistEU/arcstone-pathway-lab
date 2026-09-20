import { execSync } from "node:child_process";
import { describe, it, expect } from "vitest";

describe("Private Data Protection (.gitignore)", () => {
  it("verifies private-data/ and pilot-output/ are ignored by git", () => {
    const res1 = execSync("git check-ignore private-data/test.csv", { encoding: "utf8" }).trim();
    expect(res1).toBe("private-data/test.csv");

    const res2 = execSync("git check-ignore pilot-output/test/report.json", { encoding: "utf8" }).trim();
    expect(res2).toBe("pilot-output/test/report.json");
  });
});
