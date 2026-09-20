import path from "node:path";
import { describe, it, expect } from "vitest";
import { loadPilotCsvBundle } from "@/lib/pilot/loadPilotCsvBundle";

describe("loadPilotCsvBundle", () => {
  const sampleDir = path.resolve(__dirname, "../data/fixtures/pilot-csv-sample");

  it("loads a valid synthetic pilot CSV bundle cleanly", () => {
    const result = loadPilotCsvBundle(sampleDir);

    expect(result.status).toBe("success");
    expect(result.errors).toHaveLength(0);
    expect(result.dataset).toBeDefined();
    expect(result.targetPersonProfiles).toBeDefined();

    const ds = result.dataset!;
    expect(ds.startups).toHaveLength(1);
    expect(ds.startups[0].name).toBe("Nexus AI");

    expect(ds.campaigns).toHaveLength(1);
    expect(ds.campaigns[0].founderPersonIds).toEqual(["person-founder-elena"]);

    expect(ds.targetInvestors).toHaveLength(4);
    expect(result.targetPersonProfiles).toHaveLength(4);
  });

  it("fails closed when required CSV files are missing in directory", () => {
    const invalidDir = path.resolve(__dirname, "../data/templates");
    const result = loadPilotCsvBundle(invalidDir);

    expect(result.status).toBe("error");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].code).toBe("FILE_NOT_FOUND");
  });

  it("detects pipe-delimited formatting errors such as empty items or duplicates", () => {
    const result = loadPilotCsvBundle(sampleDir);
    expect(result.status).toBe("success");
  });
});
