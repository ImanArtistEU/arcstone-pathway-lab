import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadPilotCsvBundle } from "@/lib/pilot/loadPilotCsvBundle";

describe("loadPilotCsvBundle", () => {
  const sampleDir = path.resolve(__dirname, "../data/fixtures/pilot-csv-sample");
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "pilot-test-"));
    const files = fs.readdirSync(sampleDir);
    for (const f of files) {
      if (f.endsWith(".csv")) {
        fs.copyFileSync(path.join(sampleDir, f), path.join(tempDir, f));
      }
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("1. loads a valid synthetic pilot CSV bundle cleanly", () => {
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

  it("2. parses quoted CSV commas correctly", () => {
    const result = loadPilotCsvBundle(sampleDir);
    expect(result.status).toBe("success");
    expect(result.dataset!.startups[0].geography).toBe("San Francisco, CA");
  });

  it("3. converts blank optional fields to undefined", () => {
    const result = loadPilotCsvBundle(sampleDir);
    expect(result.status).toBe("success");
    const rel = result.dataset!.relationships.find((r) => r.id === "rel-elena-nexus");
    expect(rel).toBeDefined();
    expect(rel!.endedAt).toBeUndefined();
  });

  it("4. returns error for invalid organization enum", () => {
    const orgPath = path.join(tempDir, "organizations.csv");
    let content = fs.readFileSync(orgPath, "utf8");
    content = content.replace(",startup,", ",invalid_type,");
    fs.writeFileSync(orgPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_ENUM")).toBe(true);
  });

  it("5. returns error for invalid relationship enum", () => {
    const relPath = path.join(tempDir, "relationships.csv");
    let content = fs.readFileSync(relPath, "utf8");
    content = content.replace(",linkedin_connection,", ",bad_rel_type,");
    fs.writeFileSync(relPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_ENUM")).toBe(true);
  });

  it("6. returns error for invalid evidence enum", () => {
    const evPath = path.join(tempDir, "evidence.csv");
    let content = fs.readFileSync(evPath, "utf8");
    content = content.replace(",linkedin,", ",invalid_ev_type,");
    fs.writeFileSync(evPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_ENUM")).toBe(true);
  });

  it("7. returns error for invalid investment role in profiles", () => {
    const profPath = path.join(tempDir, "target-person-profiles.csv");
    let content = fs.readFileSync(profPath, "utf8");
    content = content.replace(",lead_investor,", ",fake_role,");
    fs.writeFileSync(profPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_ENUM")).toBe(true);
  });

  it("8. returns error for missing required header (header typo)", () => {
    const targetPath = path.join(tempDir, "targets.csv");
    let content = fs.readFileSync(targetPath, "utf8");
    content = content.replace("candidatePersonIds", "candidatePeopleIds");
    fs.writeFileSync(targetPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_HEADER")).toBe(true);
  });

  it("9. returns error for missing required field (blank status)", () => {
    const campPath = path.join(tempDir, "campaign.csv");
    let content = fs.readFileSync(campPath, "utf8");
    content = content.replace(",active,", ",,");
    fs.writeFileSync(campPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")).toBe(true);
  });

  it("10. returns error for malformed date", () => {
    const evPath = path.join(tempDir, "evidence.csv");
    let content = fs.readFileSync(evPath, "utf8");
    content = content.replace("2026-09-01T00:00:00.000Z", "not-a-date");
    fs.writeFileSync(evPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_DATE")).toBe(true);
  });

  it("11. returns error for duplicate candidate pipe item", () => {
    const targetPath = path.join(tempDir, "targets.csv");
    let content = fs.readFileSync(targetPath, "utf8");
    content = content.replace("person-vc-sarah", "person-vc-sarah|person-vc-sarah");
    fs.writeFileSync(targetPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "DUPLICATE_PIPE_ITEM")).toBe(true);
  });

  it("12. returns error for duplicate evidence pipe item", () => {
    const relPath = path.join(tempDir, "relationships.csv");
    let content = fs.readFileSync(relPath, "utf8");
    content = content.replace("ev-founder-nexus-web", "ev-founder-nexus-web|ev-founder-nexus-web");
    fs.writeFileSync(relPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "DUPLICATE_PIPE_ITEM")).toBe(true);
  });

  it("13. returns error for empty pipe item (a||b)", () => {
    const targetPath = path.join(tempDir, "targets.csv");
    let content = fs.readFileSync(targetPath, "utf8");
    content = content.replace("person-vc-sarah", "person-vc-sarah||person-vc-david");
    fs.writeFileSync(targetPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_PIPE_LIST")).toBe(true);
  });

  it("14. returns error for partial interaction metadata", () => {
    const evPath = path.join(tempDir, "evidence.csv");
    let content = fs.readFileSync(evPath, "utf8");
    content = content.replace("https://nexus-ai-example.com/about,,,", "https://nexus-ai-example.com/about,2026-08-01T00:00:00.000Z,,");
    fs.writeFileSync(evPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "PARTIAL_INTERACTION_METADATA")).toBe(true);
  });

  it("15. returns error on dataset integrity check failure (dangling reference)", () => {
    const relPath = path.join(tempDir, "relationships.csv");
    let content = fs.readFileSync(relPath, "utf8");
    content = content.replace("person-vc-sarah", "nonexistent-person");
    fs.writeFileSync(relPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "DATASET_INTEGRITY_ERROR")).toBe(true);
  });

  it("16. returns error for duplicate person ID", () => {
    const peoplePath = path.join(tempDir, "people.csv");
    let content = fs.readFileSync(peoplePath, "utf8");
    content += "\nperson-founder-elena,Elena,Vance,Elena Vance,https://linkedin.com,org-nexus,\"San Francisco, CA\"\n";
    fs.writeFileSync(peoplePath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "DUPLICATE_ENTITY_ID")).toBe(true);
  });

  it("17. returns error for duplicate relationship ID", () => {
    const relPath = path.join(tempDir, "relationships.csv");
    let content = fs.readFileSync(relPath, "utf8");
    content += "\nrel-elena-nexus,person,person-founder-elena,organization,org-nexus,founder_of,directed,ev-founder-nexus-web,2024-01-01,,2026-09-01\n";
    fs.writeFileSync(relPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "DUPLICATE_ENTITY_ID")).toBe(true);
  });

  it("18. returns error for duplicate evidence ID", () => {
    const evPath = path.join(tempDir, "evidence.csv");
    let content = fs.readFileSync(evPath, "utf8");
    content += "\nev-founder-nexus-web,rel-elena-nexus,company_website,Duplicate,2026-09-01T00:00:00.000Z,Web,https://site.com,,,\n";
    fs.writeFileSync(evPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "DUPLICATE_ENTITY_ID")).toBe(true);
  });

  it("19. returns error for duplicate profile key", () => {
    const profPath = path.join(tempDir, "target-person-profiles.csv");
    let content = fs.readFileSync(profPath, "utf8");
    content += "\ntarget-horizon,person-vc-sarah,Partner,lead_investor,Seed,AI,SF,2026-09-01T00:00:00.000Z,Web,https://web.com\n";
    fs.writeFileSync(profPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "DUPLICATE_PROFILE")).toBe(true);
  });

  it("20. returns error for zero startups", () => {
    const startupPath = path.join(tempDir, "startup.csv");
    fs.writeFileSync(startupPath, "startupId,name,website,geography,sector,stage\n", "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_STARTUP_COUNT")).toBe(true);
  });

  it("21. returns error for multiple startups", () => {
    const startupPath = path.join(tempDir, "startup.csv");
    let content = fs.readFileSync(startupPath, "utf8");
    content += "startup-two,Second AI,https://second.com,SF,AI,Seed\n";
    fs.writeFileSync(startupPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_STARTUP_COUNT")).toBe(true);
  });

  it("22. returns error for zero campaigns", () => {
    const campPath = path.join(tempDir, "campaign.csv");
    fs.writeFileSync(campPath, "campaignId,startupId,founderPersonIds,round,status,createdAt\n", "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_CAMPAIGN_COUNT")).toBe(true);
  });

  it("23. returns error for multiple campaigns", () => {
    const campPath = path.join(tempDir, "campaign.csv");
    let content = fs.readFileSync(campPath, "utf8");
    content += "campaign-two,startup-nexus,person-founder-elena,Series A,active,2026-09-01T00:00:00.000Z\n";
    fs.writeFileSync(campPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_CAMPAIGN_COUNT")).toBe(true);
  });

  it("24. returns error for blank founderPersonIds (NO_CAMPAIGN_FOUNDERS)", () => {
    const campPath = path.join(tempDir, "campaign.csv");
    let content = fs.readFileSync(campPath, "utf8");
    content = content.replace(",person-founder-elena,", ",,");
    fs.writeFileSync(campPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "NO_CAMPAIGN_FOUNDERS")).toBe(true);
  });

  it("25. startup loading succeeds even if no startup organization exists", () => {
    const orgPath = path.join(tempDir, "organizations.csv");
    let content = fs.readFileSync(orgPath, "utf8");
    content = content.replace(",startup,", ",vc_fund,");
    fs.writeFileSync(orgPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("success");
  });

  it("26. returns error for missing target candidates", () => {
    const targetPath = path.join(tempDir, "targets.csv");
    let content = fs.readFileSync(targetPath, "utf8");
    content = content.replace(",person-vc-sarah,", ",,");
    fs.writeFileSync(targetPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "MISSING_TARGET_CANDIDATES")).toBe(true);
  });

  it("27. returns error for missing campaign status", () => {
    const campPath = path.join(tempDir, "campaign.csv");
    let content = fs.readFileSync(campPath, "utf8");
    content = content.replace(",active,", ",,");
    fs.writeFileSync(campPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")).toBe(true);
  });

  it("28. returns error for missing target status", () => {
    const targetPath = path.join(tempDir, "targets.csv");
    let content = fs.readFileSync(targetPath, "utf8");
    content = content.replace(",ready", ",");
    fs.writeFileSync(targetPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "MISSING_REQUIRED_FIELD")).toBe(true);
  });

  it("43. loads blank startup website, sector, geography, stage as undefined", () => {
    const startupPath = path.join(tempDir, "startup.csv");
    fs.writeFileSync(
      startupPath,
      "startupId,name,website,geography,sector,stage\nstartup-nexus,Nexus AI,,,,\n",
      "utf8"
    );

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("success");
    const st = result.dataset!.startups[0];
    expect(st.website).toBeUndefined();
    expect(st.geography).toBeUndefined();
    expect(st.sector).toBeUndefined();
    expect(st.stage).toBeUndefined();
  });

  it("44. maps blank campaign round to empty string", () => {
    const campPath = path.join(tempDir, "campaign.csv");
    let content = fs.readFileSync(campPath, "utf8");
    content = content.replace(",Seed,", ",,");
    fs.writeFileSync(campPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("success");
    const cmp = result.dataset!.campaigns[0];
    expect(cmp.round).toBe("");
  });

  it("45. loads blank evidence observedAt and sourceName as undefined", () => {
    const evPath = path.join(tempDir, "evidence.csv");
    let content = fs.readFileSync(evPath, "utf8");
    content = content.replace("2026-09-01T00:00:00.000Z,Nexus Website,", ",,");
    fs.writeFileSync(evPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("success");
    const ev = result.dataset!.relationshipEvidence.find((e) => e.id === "ev-founder-nexus-web")!;
    expect(ev.observedAt).toBeUndefined();
    expect(ev.sourceName).toBeUndefined();
  });

  it("46. fails when populated evidence observedAt is invalid date", () => {
    const evPath = path.join(tempDir, "evidence.csv");
    let content = fs.readFileSync(evPath, "utf8");
    content = content.replace("2026-09-01T00:00:00.000Z", "not-a-valid-date");
    fs.writeFileSync(evPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "INVALID_DATE")).toBe(true);
  });

  it("54. loads multiple explicit campaign founders cleanly", () => {
    const campPath = path.join(tempDir, "campaign.csv");
    let content = fs.readFileSync(campPath, "utf8");
    content = content.replace("person-founder-elena", "person-founder-elena|person-vc-sarah");
    fs.writeFileSync(campPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("success");
    expect(result.dataset!.campaigns[0].founderPersonIds).toEqual([
      "person-founder-elena",
      "person-vc-sarah",
    ]);
  });

  it("55. returns error for duplicate founder IDs in campaign.csv", () => {
    const campPath = path.join(tempDir, "campaign.csv");
    let content = fs.readFileSync(campPath, "utf8");
    content = content.replace("person-founder-elena", "person-founder-elena|person-founder-elena");
    fs.writeFileSync(campPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "DUPLICATE_PIPE_ITEM")).toBe(true);
  });

  it("56. returns DATASET_INTEGRITY_ERROR for nonexistent founder ID in campaign.csv", () => {
    const campPath = path.join(tempDir, "campaign.csv");
    let content = fs.readFileSync(campPath, "utf8");
    content = content.replace("person-founder-elena", "nonexistent-founder-person");
    fs.writeFileSync(campPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("error");
    expect(result.errors.some((e) => e.code === "DATASET_INTEGRITY_ERROR")).toBe(true);
  });

  it("57. historical founder_of relationship does NOT add to campaign founders", () => {
    const relPath = path.join(tempDir, "relationships.csv");
    let relContent = fs.readFileSync(relPath, "utf8");
    relContent += "\nrel-other-founder,person,person-vc-david,organization,org-nexus,founder_of,directed,ev-other-founder-web,2020-01-01,2022-01-01,2022-01-01\n";
    fs.writeFileSync(relPath, relContent, "utf8");

    const evPath = path.join(tempDir, "evidence.csv");
    let evContent = fs.readFileSync(evPath, "utf8");
    evContent += "\nev-other-founder-web,rel-other-founder,company_website,Historical founder,2022-01-01T00:00:00.000Z,Web,https://nexus.com,,,\n";
    fs.writeFileSync(evPath, evContent, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("success");
    expect(result.dataset!.campaigns[0].founderPersonIds).toEqual(["person-founder-elena"]);
  });

  it("58. reversed founder_of relationship does NOT add to campaign founders", () => {
    const relPath = path.join(tempDir, "relationships.csv");
    let relContent = fs.readFileSync(relPath, "utf8");
    relContent += "\nrel-reversed-founder,organization,org-nexus,person,person-vc-david,founder_of,directed,ev-reversed-founder-web,2020-01-01,,2022-01-01\n";
    fs.writeFileSync(relPath, relContent, "utf8");

    const evPath = path.join(tempDir, "evidence.csv");
    let evContent = fs.readFileSync(evPath, "utf8");
    evContent += "\nev-reversed-founder-web,rel-reversed-founder,company_website,Reversed founder,2022-01-01T00:00:00.000Z,Web,https://nexus.com,,,\n";
    fs.writeFileSync(evPath, evContent, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("success");
    expect(result.dataset!.campaigns[0].founderPersonIds).toEqual(["person-founder-elena"]);
  });

  it("59. loads explicit campaign founders cleanly even if no founder_of relationships exist", () => {
    const relPath = path.join(tempDir, "relationships.csv");
    let content = fs.readFileSync(relPath, "utf8");
    content = content.replace(",founder_of,", ",works_at,");
    fs.writeFileSync(relPath, content, "utf8");

    const result = loadPilotCsvBundle(tempDir);
    expect(result.status).toBe("success");
    expect(result.dataset!.campaigns[0].founderPersonIds).toEqual(["person-founder-elena"]);
  });
});
