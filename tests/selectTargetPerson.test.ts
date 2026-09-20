import { describe, it, expect } from "vitest";
import { pathwayDemoDataset } from "../data/fixtures/pathway-demo";
import { targetPersonDemoProfiles } from "../data/fixtures/target-person-profiles";
import { generatePathsForTarget } from "../lib/pathway/generatePathsForTarget";
import { applyPathRejection } from "../lib/pathway/applyPathRejection";
import { scoreRetainedPaths } from "../lib/pathway/scoreRetainedPaths";
import { selectTargetPerson } from "../lib/pathway/selectTargetPerson";
import {
  PathwayDataset,
  PathScoringResult,
  TargetPersonProfile,
  ScoredPath,
} from "../types/pathway";

const REFERENCE_DATE = "2026-09-18";

describe("Batch 6 — Deterministic Target Person Selection Engine", () => {
  // Current Demo Targets Tests (1 - 4)
  it("1: Selects Sarah Chen as primary target for Horizon Ventures with 98 access quality", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const scoreRes = scoreRetainedPaths(rej);

    const res = selectTargetPerson(
      pathwayDemoDataset,
      "target-horizon",
      targetPersonDemoProfiles,
      scoreRes,
      REFERENCE_DATE
    );

    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("primary_target_selected");
    expect(res.primaryTargetPersonId).toBe("person-vc-sarah");
    expect(res.topCandidatePersonIds).toEqual(["person-vc-sarah"]);
    expect(res.evaluations[0].accessQualityIndex).toBe(98);
    expect(res.evaluations[0].overallTargetPriorityIndex).toBe(99); // round(100*0.7 + 98*0.3) = round(70 + 29.4) = 99
  });

  it("2: Selects David Miller as primary target for Beacon Capital with 52 access quality", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-beacon", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const scoreRes = scoreRetainedPaths(rej);

    const res = selectTargetPerson(
      pathwayDemoDataset,
      "target-beacon",
      targetPersonDemoProfiles,
      scoreRes,
      REFERENCE_DATE
    );

    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("primary_target_selected");
    expect(res.primaryTargetPersonId).toBe("person-vc-david");
    expect(res.evaluations[0].accessQualityIndex).toBe(52);
    expect(res.evaluations[0].overallTargetPriorityIndex).toBe(86); // round(100*0.7 + 52*0.3) = round(70 + 15.6) = 86
  });

  it("3: Selects Clara Oswald as primary target for Summit Ridge Capital despite access = 0 (rejected route)", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-summit", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const scoreRes = scoreRetainedPaths(rej);

    const res = selectTargetPerson(
      pathwayDemoDataset,
      "target-summit",
      targetPersonDemoProfiles,
      scoreRes,
      REFERENCE_DATE
    );

    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("primary_target_selected");
    expect(res.primaryTargetPersonId).toBe("person-vc-clara");
    expect(res.evaluations[0].accessQualityIndex).toBe(0);
    expect(res.evaluations[0].overallTargetPriorityIndex).toBe(70); // round(100*0.7 + 0*0.3) = 70
  });

  it("4: Selects Isabel Torres as primary target for Aurora Global Ventures despite access = 0 (no path)", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-aurora", REFERENCE_DATE);
    const rej = applyPathRejection(gen);
    const scoreRes = scoreRetainedPaths(rej);

    const res = selectTargetPerson(
      pathwayDemoDataset,
      "target-aurora",
      targetPersonDemoProfiles,
      scoreRes,
      REFERENCE_DATE
    );

    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("primary_target_selected");
    expect(res.primaryTargetPersonId).toBe("person-vc-isabel");
    expect(res.evaluations[0].accessQualityIndex).toBe(0);
    expect(res.evaluations[0].overallTargetPriorityIndex).toBe(70);
  });

  // Role Score Tests (5 - 9)
  it("5: Exact role score for lead_investor is 100", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].investmentRoleScore).toBe(100);
  });

  it("6: Exact role score for investment_team is 80", () => {
    const profs: TargetPersonProfile[] = [
      { ...targetPersonDemoProfiles[0], investmentRole: "investment_team" },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].investmentRoleScore).toBe(80);
  });

  it("7: Exact role score for sourcing is 60", () => {
    const profs: TargetPersonProfile[] = [
      { ...targetPersonDemoProfiles[0], investmentRole: "sourcing" },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].investmentRoleScore).toBe(60);
  });

  it("8: Exact role score for unknown is 50", () => {
    const profs: TargetPersonProfile[] = [
      { ...targetPersonDemoProfiles[0], investmentRole: "unknown" },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].investmentRoleScore).toBe(50);
  });

  it("9: Exact role score for non_investment is 0", () => {
    const profs: TargetPersonProfile[] = [
      { ...targetPersonDemoProfiles[0], investmentRole: "non_investment" },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].investmentRoleScore).toBe(0);
    expect(res.evaluations[0].selectable).toBe(false);
  });

  // Dimension Fit Status Tests (10 - 13)
  it("10: Dimension fit is 'match' (100) when exact string matches after normalization", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].stageFitStatus).toBe("match");
    expect(res.evaluations[0].stageFitScore).toBe(100);
  });

  it("11: Dimension fit is 'match' (100) for broad terms 'all', 'generalist', 'global'", () => {
    const profs: TargetPersonProfile[] = [
      {
        ...targetPersonDemoProfiles[0],
        stageFocus: ["generalist"],
        sectorFocus: ["all"],
        geographyFocus: ["global"],
      },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].stageFitStatus).toBe("match");
    expect(res.evaluations[0].sectorFitStatus).toBe("match");
    expect(res.evaluations[0].geographyFitStatus).toBe("match");
  });

  it("12: Dimension fit is 'no_match' (0) when focus array contains non-matching terms", () => {
    const profs: TargetPersonProfile[] = [
      {
        ...targetPersonDemoProfiles[0],
        stageFocus: ["Series B"],
        sectorFocus: ["Healthcare"],
        geographyFocus: ["Europe"],
      },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].stageFitStatus).toBe("no_match");
    expect(res.evaluations[0].stageFitScore).toBe(0);
    expect(res.evaluations[0].sectorFitStatus).toBe("no_match");
    expect(res.evaluations[0].sectorFitScore).toBe(0);
    expect(res.evaluations[0].geographyFitStatus).toBe("no_match");
    expect(res.evaluations[0].geographyFitScore).toBe(0);
  });

  it("13: Dimension fit is 'unknown' (50) when focus array is empty", () => {
    const profs: TargetPersonProfile[] = [
      {
        ...targetPersonDemoProfiles[0],
        stageFocus: [],
        sectorFocus: [],
        geographyFocus: [],
      },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].stageFitStatus).toBe("unknown");
    expect(res.evaluations[0].stageFitScore).toBe(50);
    expect(res.evaluations[0].sectorFitStatus).toBe("unknown");
    expect(res.evaluations[0].sectorFitScore).toBe(50);
    expect(res.evaluations[0].geographyFitStatus).toBe("unknown");
    expect(res.evaluations[0].geographyFitScore).toBe(50);
  });

  // Mandate & Overall Formula Calculation Tests (14 - 16)
  it("14: Mandate fit index calculates exact weighted sum round(40% role + 25% stage + 25% sector + 10% geo)", () => {
    // role: sourcing (60), stage: match (100), sector: no_match (0), geo: unknown (50)
    // mandate = round(60*0.4 + 100*0.25 + 0*0.25 + 50*0.1) = round(24 + 25 + 0 + 5) = 54
    const profs: TargetPersonProfile[] = [
      {
        ...targetPersonDemoProfiles[0],
        investmentRole: "sourcing",
        stageFocus: ["Seed"],
        sectorFocus: ["Biotech"],
        geographyFocus: [],
      },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].mandateFitIndex).toBe(54);
  });

  it("15: Overall target priority index calculates exact weighted sum round(70% mandate + 30% access)", () => {
    // mandate = 54, access = 98 -> overall = round(54*0.7 + 98*0.3) = round(37.8 + 29.4) = round(67.2) = 67
    const profs: TargetPersonProfile[] = [
      {
        ...targetPersonDemoProfiles[0],
        investmentRole: "sourcing",
        stageFocus: ["Seed"],
        sectorFocus: ["Biotech"],
        geographyFocus: [],
      },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);
    expect(res.evaluations[0].overallTargetPriorityIndex).toBe(67);
  });

  it("16: Default 70/30 mandate dominance policy allows Candidate A with perfect mandate & 0 access to beat Candidate B with weak mandate & 98 access", () => {
    // Candidate A: mandate = 100, access = 0 -> overall = round(100*0.7 + 0*0.3) = 70
    // Candidate B: mandate = 30, access = 98 -> overall = round(30*0.7 + 98*0.3) = round(21 + 29.4) = 50
    // Candidate A wins (70 > 50)!
    const customDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      people: [
        ...pathwayDemoDataset.people,
        {
          id: "person-vc-candidate-b",
          firstName: "Candidate",
          lastName: "B",
          fullName: "Candidate B",
          currentOrganizationIds: ["org-horizon-vc"],
        },
      ],
      targetInvestors: [
        {
          id: "target-multi",
          campaignId: "camp-nexus-seed",
          investorOrganizationId: "org-horizon-vc",
          candidatePersonIds: ["person-vc-sarah", "person-vc-candidate-b"],
          status: "ready",
        },
      ],
    };

    const multiProfiles: TargetPersonProfile[] = [
      {
        targetInvestorId: "target-multi",
        personId: "person-vc-sarah", // Candidate A
        roleTitle: "General Partner",
        investmentRole: "lead_investor",
        stageFocus: ["Seed"],
        sectorFocus: ["Enterprise Software"],
        geographyFocus: ["global"],
        observedAt: "2026-09-01",
      },
      {
        targetInvestorId: "target-multi",
        personId: "person-vc-candidate-b", // Candidate B
        roleTitle: "Analyst",
        investmentRole: "sourcing",
        stageFocus: ["Series B"],
        sectorFocus: ["Biotech"],
        geographyFocus: ["Europe"],
        observedAt: "2026-09-01",
      },
    ];

    const fakeScoring: PathScoringResult = {
      executionStatus: "success",
      targetInvestorId: "target-multi",
      upstreamRejectionDisposition: "retained_paths_available",
      inputRetainedPathCount: 1,
      scoredPaths: [
        {
          path: {
            id: "p1",
            targetInvestorId: "target-multi",
            sourceFounderPersonId: "person-founder-elena",
            targetPersonId: "person-vc-candidate-b", // Path goes to B
            nodes: [],
            relationshipIds: [],
            steps: [],
            intermediaryCount: 1,
            status: "eligible",
            requiresConfirmationRelationshipIds: [],
          },
          score: {
            pathId: "p1",
            overallPriorityIndex: 98,
            relationshipCredibility: 100,
            temporalFreshness: 100,
            confirmationReadiness: 100,
            pathEfficiency: 80,
            confirmationRequiredHopCount: 0,
            relationshipHopCount: 1,
            stepScores: [],
            calibrationStatus: "uncalibrated_heuristic",
            isProbability: false,
            explanation: "",
          },
        },
      ],
      disposition: "scores_available",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [],
    };

    const res = selectTargetPerson(customDataset, "target-multi", multiProfiles, fakeScoring, REFERENCE_DATE);

    expect(res.executionStatus).toBe("success");
    expect(res.primaryTargetPersonId).toBe("person-vc-sarah"); // Candidate A wins!
    expect(res.evaluations.find((e) => e.personId === "person-vc-sarah")?.overallTargetPriorityIndex).toBe(70);
    expect(res.evaluations.find((e) => e.personId === "person-vc-candidate-b")?.overallTargetPriorityIndex).toBe(46);
  });

  // Multi-Candidate Tests (17 - 19)
  it("17: Multi-candidate test: Right person (lead investor) beats easy person (sourcing)", () => {
    const customDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      people: [
        ...pathwayDemoDataset.people,
        {
          id: "person-vc-b",
          firstName: "Sourcing",
          lastName: "Lead",
          fullName: "Sourcing Lead",
          currentOrganizationIds: ["org-horizon-vc"],
        },
      ],
      targetInvestors: [
        {
          id: "target-multi-2",
          campaignId: "camp-nexus-seed",
          investorOrganizationId: "org-horizon-vc",
          candidatePersonIds: ["person-vc-sarah", "person-vc-b"],
          status: "ready",
        },
      ],
    };

    const profs: TargetPersonProfile[] = [
      {
        targetInvestorId: "target-multi-2",
        personId: "person-vc-sarah", // Lead investor
        roleTitle: "General Partner",
        investmentRole: "lead_investor",
        stageFocus: ["Seed"],
        sectorFocus: ["Enterprise Software"],
        geographyFocus: ["global"],
        observedAt: "2026-09-01",
      },
      {
        targetInvestorId: "target-multi-2",
        personId: "person-vc-b", // Sourcing
        roleTitle: "Scout",
        investmentRole: "sourcing",
        stageFocus: ["Seed"],
        sectorFocus: ["Enterprise Software"],
        geographyFocus: ["global"],
        observedAt: "2026-09-01",
      },
    ];

    const scoring: PathScoringResult = {
      executionStatus: "success",
      targetInvestorId: "target-multi-2",
      upstreamRejectionDisposition: "retained_paths_available",
      inputRetainedPathCount: 2,
      scoredPaths: [
        {
          path: { id: "p1", targetInvestorId: "target-multi-2", sourceFounderPersonId: "p", targetPersonId: "person-vc-sarah", nodes: [], relationshipIds: [], steps: [], intermediaryCount: 1, status: "eligible", requiresConfirmationRelationshipIds: [] },
          score: { pathId: "p1", overallPriorityIndex: 52, relationshipCredibility: 50, temporalFreshness: 50, confirmationReadiness: 50, pathEfficiency: 50, confirmationRequiredHopCount: 0, relationshipHopCount: 1, stepScores: [], calibrationStatus: "uncalibrated_heuristic", isProbability: false, explanation: "" },
        },
        {
          path: { id: "p2", targetInvestorId: "target-multi-2", sourceFounderPersonId: "p", targetPersonId: "person-vc-b", nodes: [], relationshipIds: [], steps: [], intermediaryCount: 1, status: "eligible", requiresConfirmationRelationshipIds: [] },
          score: { pathId: "p2", overallPriorityIndex: 52, relationshipCredibility: 50, temporalFreshness: 50, confirmationReadiness: 50, pathEfficiency: 50, confirmationRequiredHopCount: 0, relationshipHopCount: 1, stepScores: [], calibrationStatus: "uncalibrated_heuristic", isProbability: false, explanation: "" },
        },
      ],
      disposition: "scores_available",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [],
    };

    const res = selectTargetPerson(customDataset, "target-multi-2", profs, scoring, REFERENCE_DATE);

    expect(res.primaryTargetPersonId).toBe("person-vc-sarah");
  });

  it("18: Multi-candidate test: Thesis fit matters (Candidate A with thesis match beats Candidate B with no thesis match)", () => {
    const customDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      people: [
        ...pathwayDemoDataset.people,
        {
          id: "person-vc-b",
          firstName: "Partner",
          lastName: "B",
          fullName: "Partner B",
          currentOrganizationIds: ["org-horizon-vc"],
        },
      ],
      targetInvestors: [
        {
          id: "target-multi-3",
          campaignId: "camp-nexus-seed",
          investorOrganizationId: "org-horizon-vc",
          candidatePersonIds: ["person-vc-sarah", "person-vc-b"],
          status: "ready",
        },
      ],
    };

    const profs: TargetPersonProfile[] = [
      {
        targetInvestorId: "target-multi-3",
        personId: "person-vc-sarah", // Lead investor, thesis match (mandate = 100, access = 50 -> overall = 85)
        roleTitle: "General Partner",
        investmentRole: "lead_investor",
        stageFocus: ["Seed"],
        sectorFocus: ["Enterprise Software"],
        geographyFocus: ["global"],
        observedAt: "2026-09-01",
      },
      {
        targetInvestorId: "target-multi-3",
        personId: "person-vc-b", // Lead investor, no thesis match (mandate = 40 [role only], access = 98 -> overall = round(28 + 29.4) = 57)
        roleTitle: "Partner",
        investmentRole: "lead_investor",
        stageFocus: ["Series B"],
        sectorFocus: ["Biotech"],
        geographyFocus: ["Europe"],
        observedAt: "2026-09-01",
      },
    ];

    const scoring: PathScoringResult = {
      executionStatus: "success",
      targetInvestorId: "target-multi-3",
      upstreamRejectionDisposition: "retained_paths_available",
      inputRetainedPathCount: 2,
      scoredPaths: [
        {
          path: { id: "p1", targetInvestorId: "target-multi-3", sourceFounderPersonId: "p", targetPersonId: "person-vc-sarah", nodes: [], relationshipIds: [], steps: [], intermediaryCount: 1, status: "eligible", requiresConfirmationRelationshipIds: [] },
          score: { pathId: "p1", overallPriorityIndex: 50, relationshipCredibility: 50, temporalFreshness: 50, confirmationReadiness: 50, pathEfficiency: 50, confirmationRequiredHopCount: 0, relationshipHopCount: 1, stepScores: [], calibrationStatus: "uncalibrated_heuristic", isProbability: false, explanation: "" },
        },
        {
          path: { id: "p2", targetInvestorId: "target-multi-3", sourceFounderPersonId: "p", targetPersonId: "person-vc-b", nodes: [], relationshipIds: [], steps: [], intermediaryCount: 1, status: "eligible", requiresConfirmationRelationshipIds: [] },
          score: { pathId: "p2", overallPriorityIndex: 98, relationshipCredibility: 100, temporalFreshness: 100, confirmationReadiness: 100, pathEfficiency: 80, confirmationRequiredHopCount: 0, relationshipHopCount: 1, stepScores: [], calibrationStatus: "uncalibrated_heuristic", isProbability: false, explanation: "" },
        },
      ],
      disposition: "scores_available",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [],
    };

    const res = selectTargetPerson(customDataset, "target-multi-3", profs, scoring, REFERENCE_DATE);

    expect(res.primaryTargetPersonId).toBe("person-vc-sarah"); // Thesis match wins!
  });

  it("19: Non-investment contact is excluded from primary selection even with 100 access quality", () => {
    const customDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      people: [
        ...pathwayDemoDataset.people,
        {
          id: "person-vc-hr",
          firstName: "HR",
          lastName: "Director",
          fullName: "HR Director",
          currentOrganizationIds: ["org-horizon-vc"],
        },
      ],
      targetInvestors: [
        {
          id: "target-multi-4",
          campaignId: "camp-nexus-seed",
          investorOrganizationId: "org-horizon-vc",
          candidatePersonIds: ["person-vc-hr", "person-vc-sarah"],
          status: "ready",
        },
      ],
    };

    const profs: TargetPersonProfile[] = [
      {
        targetInvestorId: "target-multi-4",
        personId: "person-vc-hr", // Non-investment role
        roleTitle: "Head of People",
        investmentRole: "non_investment",
        stageFocus: ["Seed"],
        sectorFocus: ["Enterprise Software"],
        geographyFocus: ["global"],
        observedAt: "2026-09-01",
      },
      {
        targetInvestorId: "target-multi-4",
        personId: "person-vc-sarah", // Lead investor with 0 access
        roleTitle: "General Partner",
        investmentRole: "lead_investor",
        stageFocus: ["Seed"],
        sectorFocus: ["Enterprise Software"],
        geographyFocus: ["global"],
        observedAt: "2026-09-01",
      },
    ];

    const scoring: PathScoringResult = {
      executionStatus: "success",
      targetInvestorId: "target-multi-4",
      upstreamRejectionDisposition: "retained_paths_available",
      inputRetainedPathCount: 1,
      scoredPaths: [
        {
          path: { id: "p1", targetInvestorId: "target-multi-4", sourceFounderPersonId: "p", targetPersonId: "person-vc-hr", nodes: [], relationshipIds: [], steps: [], intermediaryCount: 1, status: "eligible", requiresConfirmationRelationshipIds: [] },
          score: { pathId: "p1", overallPriorityIndex: 100, relationshipCredibility: 100, temporalFreshness: 100, confirmationReadiness: 100, pathEfficiency: 100, confirmationRequiredHopCount: 0, relationshipHopCount: 1, stepScores: [], calibrationStatus: "uncalibrated_heuristic", isProbability: false, explanation: "" },
        },
      ],
      disposition: "scores_available",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [],
    };

    const res = selectTargetPerson(customDataset, "target-multi-4", profs, scoring, REFERENCE_DATE);

    expect(res.primaryTargetPersonId).toBe("person-vc-sarah"); // Sarah selected despite 0 access!
    expect(res.evaluations.find((e) => e.personId === "person-vc-hr")?.selectable).toBe(false);
  });

  // Profile Context & Validation Tests (20 - 26)
  it("20: Returns insufficient_context disposition when any candidate profile is missing", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", [], scoreRes, REFERENCE_DATE);

    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("insufficient_context");
    expect(res.primaryTargetPersonId).toBeUndefined();
    expect(res.errors[0]).toContain("Missing target person profile");
  });

  it("21: Returns error disposition when duplicate profile exists for same targetInvestorId + personId", () => {
    const dupProfs = [targetPersonDemoProfiles[0], targetPersonDemoProfiles[0]];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", dupProfs, scoreRes, REFERENCE_DATE);

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.errors[0]).toContain("Duplicate target person profile");
  });

  it("22: Accepts profile with unknown investment role and empty focus arrays as explicit uncertainty context", () => {
    const profs: TargetPersonProfile[] = [
      {
        targetInvestorId: "target-horizon",
        personId: "person-vc-sarah",
        roleTitle: "Investor",
        investmentRole: "unknown",
        stageFocus: [],
        sectorFocus: [],
        geographyFocus: [],
        observedAt: "2026-09-01",
      },
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);

    expect(res.executionStatus).toBe("success");
    expect(res.evaluations[0].investmentRoleScore).toBe(50);
    expect(res.evaluations[0].stageFitScore).toBe(50);
    expect(res.evaluations[0].mandateFitIndex).toBe(50);
  });

  it("23: Rejects profile with future observedAt relative to referenceDate", () => {
    const profs: TargetPersonProfile[] = [
      { ...targetPersonDemoProfiles[0], observedAt: "2026-10-01" }, // Future relative to 2026-09-18
    ];
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profs, scoreRes, REFERENCE_DATE);

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.errors[0]).toContain("is in the future relative to referenceDate");
  });

  it("24: Rejects invalid reference date string", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, "invalid-date");

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.errors[0]).toContain("Invalid reference date");
  });

  it("25: Rejects empty reference date string", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, "   ");

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.errors[0]).toContain("non-empty valid date string");
  });

  it("26: Rejects scoringResult targetInvestorId mismatch", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-beacon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    expect(res.executionStatus).toBe("error");
    expect(res.disposition).toBe("error");
    expect(res.errors[0]).toContain("does not match requested targetInvestorId");
  });

  // Upstream Scoring States & Affiliation Tests (27 - 32)
  it("27: Propagates upstream_error when scoringResult executionStatus is error or upstream_error", () => {
    const fakeScoring: PathScoringResult = {
      executionStatus: "upstream_error",
      targetInvestorId: "target-horizon",
      upstreamRejectionDisposition: null,
      inputRetainedPathCount: 0,
      scoredPaths: [],
      disposition: "upstream_error",
      calibrationStatus: "uncalibrated_heuristic",
      errors: ["Upstream failed"],
    };

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, fakeScoring, REFERENCE_DATE);

    expect(res.executionStatus).toBe("upstream_error");
    expect(res.disposition).toBe("upstream_error");
  });

  it("28: Handles upstream_paths_filtered disposition cleanly without selecting primary target", () => {
    const fakeScoring: PathScoringResult = {
      executionStatus: "success",
      targetInvestorId: "target-horizon",
      upstreamRejectionDisposition: "upstream_paths_filtered",
      inputRetainedPathCount: 0,
      scoredPaths: [],
      disposition: "upstream_paths_filtered",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [],
    };

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, fakeScoring, REFERENCE_DATE);

    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("upstream_paths_filtered");
    expect(res.primaryTargetPersonId).toBeUndefined();
  });

  it("29: Rejects missing target investor ID in dataset", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-nonexistent", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    expect(res.executionStatus).toBe("error");
    expect(res.errors[0]).toContain("not found in dataset");
  });

  it("30: Rejects candidate person not verifiably currently affiliated with target investor org", () => {
    const unverifiedDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      people: pathwayDemoDataset.people.map((p) =>
        p.id === "person-vc-sarah" ? { ...p, currentOrganizationIds: [] } : p
      ),
      relationships: pathwayDemoDataset.relationships.filter(
        (r) => r.id !== "rel-sarah-horizon"
      ),
    };

    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(unverifiedDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    expect(res.executionStatus).toBe("error");
    expect(res.errors[0]).toContain("is not verifiably currently affiliated");
  });

  it("31: Rejects worked_at relationship for current affiliation verification", () => {
    const workedAtDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      people: pathwayDemoDataset.people.map((p) =>
        p.id === "person-vc-sarah" ? { ...p, currentOrganizationIds: [] } : p
      ),
      relationships: pathwayDemoDataset.relationships.map((r) =>
        r.id === "rel-sarah-horizon" ? { ...r, type: "worked_at" as any } : r
      ),
    };

    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(workedAtDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    expect(res.executionStatus).toBe("error");
    expect(res.errors[0]).toContain("is not verifiably currently affiliated");
  });

  it("32: Verifies structural works_at relationship for current affiliation", () => {
    const worksAtOnlyDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      people: pathwayDemoDataset.people.map((p) =>
        p.id === "person-vc-sarah" ? { ...p, currentOrganizationIds: [] } : p
      ),
    };

    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(worksAtOnlyDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    expect(res.executionStatus).toBe("success");
    expect(res.primaryTargetPersonId).toBe("person-vc-sarah");
  });

  // Ambiguity, Tiebreakers & Output Properties (33 - 45)
  it("33: Returns ambiguous_top_candidates disposition when two candidates tie on all substantive metrics", () => {
    const customDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      people: [
        ...pathwayDemoDataset.people,
        {
          id: "person-vc-clone",
          firstName: "Clone",
          lastName: "Sarah",
          fullName: "Clone Sarah",
          currentOrganizationIds: ["org-horizon-vc"],
        },
      ],
      targetInvestors: [
        {
          id: "target-tie",
          campaignId: "camp-nexus-seed",
          investorOrganizationId: "org-horizon-vc",
          candidatePersonIds: ["person-vc-sarah", "person-vc-clone"],
          status: "ready",
        },
      ],
    };

    const tieProfiles: TargetPersonProfile[] = [
      {
        targetInvestorId: "target-tie",
        personId: "person-vc-sarah",
        roleTitle: "Partner",
        investmentRole: "lead_investor",
        stageFocus: ["Seed"],
        sectorFocus: ["Enterprise Software"],
        geographyFocus: ["global"],
        observedAt: "2026-09-01",
      },
      {
        targetInvestorId: "target-tie",
        personId: "person-vc-clone",
        roleTitle: "Partner",
        investmentRole: "lead_investor",
        stageFocus: ["Seed"],
        sectorFocus: ["Enterprise Software"],
        geographyFocus: ["global"],
        observedAt: "2026-09-01",
      },
    ];

    const fakeScoring: PathScoringResult = {
      executionStatus: "success",
      targetInvestorId: "target-tie",
      upstreamRejectionDisposition: "no_generated_paths",
      inputRetainedPathCount: 0,
      scoredPaths: [],
      disposition: "no_retained_paths",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [],
    };

    const res = selectTargetPerson(customDataset, "target-tie", tieProfiles, fakeScoring, REFERENCE_DATE);

    expect(res.executionStatus).toBe("success");
    expect(res.disposition).toBe("ambiguous_top_candidates");
    expect(res.primaryTargetPersonId).toBeUndefined();
    expect(res.topCandidatePersonIds).toEqual(["person-vc-clone", "person-vc-sarah"]); // Alphabetical ID order for display
  });

  it("34: Uses first upstream path in scoring order when candidate has two scored paths with equal max score", () => {
    const customDataset: PathwayDataset = {
      ...pathwayDemoDataset,
      targetInvestors: [
        {
          id: "target-path-tie",
          campaignId: "camp-nexus-seed",
          investorOrganizationId: "org-horizon-vc",
          candidatePersonIds: ["person-vc-sarah"],
          status: "ready",
        },
      ],
    };

    const profs: TargetPersonProfile[] = [
      {
        targetInvestorId: "target-path-tie",
        personId: "person-vc-sarah",
        roleTitle: "Partner",
        investmentRole: "lead_investor",
        stageFocus: ["Seed"],
        sectorFocus: ["Enterprise Software"],
        geographyFocus: ["global"],
        observedAt: "2026-09-01",
      },
    ];

    const fakeScoring: PathScoringResult = {
      executionStatus: "success",
      targetInvestorId: "target-path-tie",
      upstreamRejectionDisposition: "retained_paths_available",
      inputRetainedPathCount: 2,
      scoredPaths: [
        {
          path: { id: "path-first", targetInvestorId: "target-path-tie", sourceFounderPersonId: "p", targetPersonId: "person-vc-sarah", nodes: [], relationshipIds: [], steps: [], intermediaryCount: 1, status: "eligible", requiresConfirmationRelationshipIds: [] },
          score: { pathId: "path-first", overallPriorityIndex: 90, relationshipCredibility: 90, temporalFreshness: 90, confirmationReadiness: 100, pathEfficiency: 80, confirmationRequiredHopCount: 0, relationshipHopCount: 1, stepScores: [], calibrationStatus: "uncalibrated_heuristic", isProbability: false, explanation: "" },
        },
        {
          path: { id: "path-second", targetInvestorId: "target-path-tie", sourceFounderPersonId: "p", targetPersonId: "person-vc-sarah", nodes: [], relationshipIds: [], steps: [], intermediaryCount: 1, status: "eligible", requiresConfirmationRelationshipIds: [] },
          score: { pathId: "path-second", overallPriorityIndex: 90, relationshipCredibility: 90, temporalFreshness: 90, confirmationReadiness: 100, pathEfficiency: 80, confirmationRequiredHopCount: 0, relationshipHopCount: 1, stepScores: [], calibrationStatus: "uncalibrated_heuristic", isProbability: false, explanation: "" },
        },
      ],
      disposition: "scores_available",
      calibrationStatus: "uncalibrated_heuristic",
      errors: [],
    };

    const res = selectTargetPerson(customDataset, "target-path-tie", profs, fakeScoring, REFERENCE_DATE);

    expect(res.evaluations[0].highestScoringPathId).toBe("path-first"); // First upstream path wins!
  });

  it("35: Immutability: Mutating output evaluations does not mutate profile input", () => {
    const profsCopy = JSON.parse(JSON.stringify(targetPersonDemoProfiles));
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", profsCopy, scoreRes, REFERENCE_DATE);

    res.evaluations[0].roleTitle = "MUTATED ROLE";
    expect(profsCopy[0].roleTitle).toBe("General Partner");
  });

  it("36: Immutability: Mutating output result does not mutate input dataset or scoringResult", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const scoreResCopy = JSON.parse(JSON.stringify(scoreRes));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    res.priorityOrderPersonIds.push("MUTATED_ID");
    expect(scoreRes).toEqual(scoreResCopy);
  });

  it("37: Output contract: isProbability is strictly false", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    expect(res.isProbability).toBe(false);
  });

  it("38: Output contract: calibrationStatus is strictly 'uncalibrated_heuristic'", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    expect(res.calibrationStatus).toBe("uncalibrated_heuristic");
  });

  it("39: Output contract: No recommendedPathId, recommendedAction, or probability fields in result", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    expect((res as any).recommendedPathId).toBeUndefined();
    expect((res as any).recommendedAction).toBeUndefined();
    expect((res as any).probability).toBeUndefined();
  });

  it("40: Output contract: No recommendedPathId, recommendedAction, or probability fields in evaluations", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));
    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    const evalObj = res.evaluations[0] as any;
    expect(evalObj.recommendedPathId).toBeUndefined();
    expect(evalObj.recommendedAction).toBeUndefined();
    expect(evalObj.probability).toBeUndefined();
  });

  it("41: Rejects malformed policy where mandate weights do not sum to 100", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE, {
      weightInvestmentRole: 50, // 50 + 25 + 25 + 10 = 110 != 100
    });

    expect(res.executionStatus).toBe("error");
    expect(res.errors[0]).toContain("Mandate fit component weights must sum to 100");
  });

  it("42: Rejects malformed policy where overall weights do not sum to 100", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE, {
      weightMandateFit: 80, // 80 + 30 = 110 != 100
    });

    expect(res.executionStatus).toBe("error");
    expect(res.errors[0]).toContain("Overall target priority weights must sum to 100");
  });

  it("43: Rejects policy parameter outside [0, 100] range", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE, {
      leadInvestorScore: 150,
    });

    expect(res.executionStatus).toBe("error");
    expect(res.errors[0]).toContain("must be a finite integer between 0 and 100");
  });

  it("44: Evaluation explanation contains explicit uncalibrated heuristic warning and no outreach claims", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    const exp = res.evaluations[0].explanation;
    expect(exp).toContain("This is an uncalibrated heuristic, not a probability or outreach recommendation.");
    expect(exp).not.toContain("contact now");
    expect(exp).not.toContain("recommended outreach");
  });

  it("45: No system clock or non-determinism: Running selection twice produces identical JSON outputs", () => {
    const gen = generatePathsForTarget(pathwayDemoDataset, "target-horizon", REFERENCE_DATE);
    const scoreRes = scoreRetainedPaths(applyPathRejection(gen));

    const res1 = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);
    const res2 = selectTargetPerson(pathwayDemoDataset, "target-horizon", targetPersonDemoProfiles, scoreRes, REFERENCE_DATE);

    expect(JSON.stringify(res1)).toBe(JSON.stringify(res2));
  });
});
