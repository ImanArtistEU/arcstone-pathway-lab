import { describe, it, expect } from "vitest";
import {
  PathwayDataset,
  FundraisingCampaign,
  TargetInvestor,
  RelationshipEvidence,
  Relationship,
  Person,
  Organization,
  ProximitySignal,
  BridgeVerification,
} from "../types/pathway";
import { validateEvidenceObservability } from "../lib/pathway/validateEvidenceObservability";
import { extractFounderNetworkAnchors } from "../lib/pathway/extractFounderNetworkAnchors";
import { discoverBridgeHypotheses } from "../lib/pathway/discoverBridgeHypotheses";
import { scoreBridgeHypothesis } from "../lib/pathway/scoreBridgeHypotheses";
import { determineFundAccessStrategy } from "../lib/pathway/determineFundAccessStrategy";

describe("Batch 9: Latent Network Bridge Intelligence", () => {
  const referenceDate = "2026-09-18";

  const elena: Person = {
    id: "p-elena",
    firstName: "Elena",
    lastName: "Vance",
    fullName: "Elena Vance",
    currentOrganizationIds: ["org-startup"],
  };

  const marcus: Person = {
    id: "p-marcus",
    firstName: "Marcus",
    lastName: "Thorne",
    fullName: "Marcus Thorne",
    currentOrganizationIds: ["org-advisor"],
  };

  const sarah: Person = {
    id: "p-sarah",
    firstName: "Sarah",
    lastName: "Chen",
    fullName: "Sarah Chen",
    currentOrganizationIds: ["org-horizon"],
  };

  const horizonFund: Organization = {
    id: "org-horizon",
    name: "Horizon Capital",
    type: "vc_fund",
  };

  const campaign: FundraisingCampaign = {
    id: "c-1",
    startupId: "org-startup",
    founderPersonIds: ["p-elena"],
    round: "Seed",
    status: "active",
    createdAt: "2026-01-01",
  };

  const targetInvestor: TargetInvestor = {
    id: "target-horizon",
    campaignId: "c-1",
    investorOrganizationId: "org-horizon",
    candidatePersonIds: ["p-sarah"],
    status: "ready",
  };

  const relElenaMarcus: Relationship = {
    id: "rel-elena-marcus",
    from: { type: "person", id: "p-elena" },
    to: { type: "person", id: "p-marcus" },
    type: "advisor",
    direction: "bidirectional",
    evidenceIds: ["ev-elena-marcus-cal"],
    lastObservedAt: "2026-08-01",
  };

  const evElenaMarcusCal: RelationshipEvidence = {
    id: "ev-elena-marcus-cal",
    relationshipId: "rel-elena-marcus",
    type: "meeting_history",
    description: "Monthly advisory sync",
    provenance: {
      accessClass: "first_party_private",
      sourceSystem: "google_calendar",
      sourcePrincipalPersonId: "p-elena",
    },
    interaction: {
      occurredAt: "2026-08-01",
      reciprocity: "two_way",
      status: "confirmed",
    },
  };

  it("Invariants 1-3: validates evidence observability cleanly", () => {
    const validObs = validateEvidenceObservability(evElenaMarcusCal, relElenaMarcus, ["p-elena"]);
    expect(validObs.observable).toBe(true);

    const invalidObs = validateEvidenceObservability(
      {
        ...evElenaMarcusCal,
        provenance: {
          accessClass: "first_party_private",
          sourceSystem: "gmail",
          sourcePrincipalPersonId: "p-marcus", // Not campaign founder
        },
      },
      relElenaMarcus,
      ["p-elena"]
    );
    expect(invalidObs.observable).toBe(false);
  });

  it("Extracts Founder Network Anchors correctly", () => {
    const dataset: PathwayDataset = {
      startups: [{ id: "org-startup", name: "Acme AI" }],
      campaigns: [campaign],
      organizations: [horizonFund],
      people: [elena, marcus, sarah],
      targetInvestors: [targetInvestor],
      relationships: [relElenaMarcus],
      relationshipEvidence: [evElenaMarcusCal],
    };

    const anchors = extractFounderNetworkAnchors(dataset, campaign, referenceDate);
    expect(anchors).toHaveLength(1);
    expect(anchors[0].anchorPersonId).toBe("p-marcus");
    expect(anchors[0].relationshipStatus).toBe("verified");
  });

  it("Invariants 4-7: Public Proximity != Confirmed Relationship (Discovers Bridge Hypothesis)", () => {
    const proxSignal: ProximitySignal = {
      id: "sig-marcus-sarah-co-invest",
      personAId: "p-marcus",
      personBId: "p-sarah",
      type: "co_invested_same_deal",
      evidenceIds: ["ev-public-deal"],
      occurredAt: "2026-03-01",
    };

    const dataset: PathwayDataset = {
      startups: [{ id: "org-startup", name: "Acme AI" }],
      campaigns: [campaign],
      organizations: [horizonFund],
      people: [elena, marcus, sarah],
      targetInvestors: [targetInvestor],
      relationships: [relElenaMarcus],
      relationshipEvidence: [evElenaMarcusCal],
      proximitySignals: [proxSignal],
    };

    const anchors = extractFounderNetworkAnchors(dataset, campaign, referenceDate);
    const hypotheses = discoverBridgeHypotheses(
      dataset,
      campaign,
      targetInvestor,
      "p-sarah",
      anchors,
      referenceDate
    );

    expect(hypotheses).toHaveLength(1);
    const hyp = hypotheses[0];
    expect(hyp.anchorPersonId).toBe("p-marcus");
    expect(hyp.targetPersonId).toBe("p-sarah");
    expect(hyp.bridgeRelevance.overallBridgeRelevanceIndex).toBeGreaterThan(70);
    expect(hyp.whatWeKnow).toHaveLength(2);
    expect(hyp.whatWeDoNotKnow).toHaveLength(2);
    expect(hyp.verificationRequired).toBe(true);
  });

  it("Invariants 8-9: Human verification updates hypothesis status", () => {
    const proxSignal: ProximitySignal = {
      id: "sig-marcus-sarah-co-invest",
      personAId: "p-marcus",
      personBId: "p-sarah",
      type: "co_invested_same_deal",
      evidenceIds: ["ev-public-deal"],
      occurredAt: "2026-03-01",
    };

    const verifications: BridgeVerification[] = [
      {
        bridgeHypothesisId: "bridge-p-elena-p-marcus-p-sarah",
        status: "does_not_know_target",
        reportedByPersonId: "p-elena",
        reportedAt: "2026-09-18",
        notes: "Marcus confirmed he does not know Sarah personally.",
      },
    ];

    const dataset: PathwayDataset = {
      startups: [{ id: "org-startup", name: "Acme AI" }],
      campaigns: [campaign],
      organizations: [horizonFund],
      people: [elena, marcus, sarah],
      targetInvestors: [targetInvestor],
      relationships: [relElenaMarcus],
      relationshipEvidence: [evElenaMarcusCal],
      proximitySignals: [proxSignal],
      bridgeVerifications: verifications,
    };

    const anchors = extractFounderNetworkAnchors(dataset, campaign, referenceDate);
    const hypotheses = discoverBridgeHypotheses(
      dataset,
      campaign,
      targetInvestor,
      "p-sarah",
      anchors,
      referenceDate
    );

    expect(hypotheses).toHaveLength(1);
    expect(hypotheses[0].status).toBe("refuted");
    expect(hypotheses[0].verificationRequired).toBe(false);
  });

  it("Invariants 13-15: Decision Target vs Fund Access Strategy", () => {
    const dataset: PathwayDataset = {
      startups: [{ id: "org-startup", name: "Acme AI" }],
      campaigns: [campaign],
      organizations: [horizonFund],
      people: [elena, marcus, sarah],
      targetInvestors: [targetInvestor],
      relationships: [relElenaMarcus],
      relationshipEvidence: [evElenaMarcusCal],
    };

    const mockSelectionResult = {
      executionStatus: "success" as const,
      targetInvestorId: targetInvestor.id,
      candidatePersonIds: ["p-sarah"],
      evaluations: [],
      priorityOrderPersonIds: ["p-sarah"],
      primaryTargetPersonId: "p-sarah",
      topCandidatePersonIds: ["p-sarah"],
      disposition: "primary_target_selected" as const,
      calibrationStatus: "uncalibrated_heuristic" as const,
      isProbability: false as const,
      errors: [],
    };

    const strategy = determineFundAccessStrategy(
      dataset,
      campaign,
      targetInvestor,
      mockSelectionResult,
      []
    );

    expect(strategy.decisionTargetPersonId).toBe("p-sarah");
    expect(strategy.accessStatus).toBe("NO_CREDIBLE_BRIDGE_FOUND");
  });
});
