import {
  PathwayDataset,
  FundraisingCampaign,
  TargetInvestor,
  FounderNetworkAnchor,
  BridgeHypothesis,
  ProximitySignal,
  ProximitySignalType,
  BridgeHypothesisStatus,
} from "../../types/pathway";
import { scoreBridgeHypothesis } from "./scoreBridgeHypotheses";

/**
 * Discover Bridge Hypotheses (Batch 9)
 *
 * Implements Latent Network Bridge Discovery:
 * FOUNDER → KNOWN ANCHOR ~~ PUBLIC PROXIMITY ~~ TARGET PERSON
 */
export function discoverBridgeHypotheses(
  dataset: PathwayDataset,
  campaign: FundraisingCampaign,
  targetInvestor: TargetInvestor,
  targetPersonId: string,
  anchors: FounderNetworkAnchor[],
  referenceDate: string
): BridgeHypothesis[] {
  const hypotheses: BridgeHypothesis[] = [];
  const targetPerson = dataset.people.find((p) => p.id === targetPersonId);
  const targetName = targetPerson?.fullName || targetPersonId;

  // Gather explicit proximity signals from dataset
  const explicitSignals = dataset.proximitySignals || [];

  for (const anchor of anchors) {
    const anchorPerson = dataset.people.find((p) => p.id === anchor.anchorPersonId);
    const anchorName = anchorPerson?.fullName || anchor.anchorPersonId;

    // Collect all proximity signals connecting anchor and target
    const matchedSignals: ProximitySignal[] = [];

    // 1. Check explicit proximity signals
    for (const sig of explicitSignals) {
      if (
        (sig.personAId === anchor.anchorPersonId && sig.personBId === targetPersonId) ||
        (sig.personAId === targetPersonId && sig.personBId === anchor.anchorPersonId)
      ) {
        matchedSignals.push(sig);
      }
    }

    // 2. Check public/proximity relationships in dataset and map to ProximitySignals
    for (const rel of dataset.relationships) {
      const fromId = rel.from.id;
      const toId = rel.to.id;

      const isMatch =
        (fromId === anchor.anchorPersonId && toId === targetPersonId) ||
        (fromId === targetPersonId && toId === anchor.anchorPersonId);

      if (!isMatch) continue;

      let sigType: ProximitySignalType | undefined = undefined;

      if (rel.type === "co_invested") sigType = "co_invested_same_deal";
      else if (rel.type === "board_member") sigType = "shared_board";
      else if (rel.type === "portfolio_founder") sigType = "portfolio_relationship";
      else if (rel.type === "worked_at" || rel.type === "former_colleague" || rel.type === "colleague")
        sigType = "worked_at_same_organization";
      else if (rel.type === "accelerator_cohort") sigType = "accelerator_overlap";
      else if (rel.type === "university_connection") sigType = "university_overlap";
      else if (rel.type === "event_connection") sigType = "event_overlap";
      else if (rel.type === "linkedin_connection") sigType = "linkedin_connection";

      if (sigType) {
        // Check if already covered by explicit signal to avoid duplicates
        const exists = matchedSignals.some((s) => s.evidenceIds.some((e) => rel.evidenceIds.includes(e)));
        if (!exists) {
          matchedSignals.push({
            id: `sig-${rel.id}`,
            personAId: anchor.anchorPersonId,
            personBId: targetPersonId,
            type: sigType,
            evidenceIds: rel.evidenceIds,
            observedAt: rel.lastObservedAt,
            occurredAt: rel.startedAt,
          });
        }
      }
    }

    // If no public/provided proximity signal connects anchor to target: do not create hypothesis
    if (matchedSignals.length === 0) {
      continue;
    }

    // Calculate BridgeRelevanceScore
    const relevance = scoreBridgeHypothesis(anchor, matchedSignals, referenceDate);

    // Build human disclosures
    const founderPerson = dataset.people.find((p) => p.id === anchor.founderPersonId);
    const founderName = founderPerson?.fullName || anchor.founderPersonId;

    const signalTypeLabels = matchedSignals.map((s) => s.type.replace(/_/g, " ")).join(", ");

    const basisLabel = (anchor.evidenceBasis || []).join(", ") || "observed evidence";
    const whatWeKnow = [
      `${founderName} has a ${anchor.relationshipStatus} relationship with ${anchorName} (${basisLabel}).`,
      `Public/observable evidence shows ${anchorName} and ${targetName} have professional overlap (${signalTypeLabels}).`,
    ];

    const whatWeDoNotKnow = [
      `Arcstone does not know whether ${anchorName} currently maintains a personal relationship with ${targetName}.`,
      `Arcstone does not know whether ${anchorName} would be willing to make an introduction to ${targetName}.`,
    ];

    let status: BridgeHypothesisStatus = "potential_bridge";
    if (relevance.overallBridgeRelevanceIndex >= 70) {
      status = "worth_asking";
    }

    // Check human verifications if present
    const verifications = dataset.bridgeVerifications || [];
    const hypId = `bridge-${anchor.founderPersonId}-${anchor.anchorPersonId}-${targetPersonId}`;

    const verification = verifications.find(
      (v) =>
        v.bridgeHypothesisId === hypId ||
        (v.reportedByPersonId === anchor.founderPersonId)
    );

    let verificationRequired = true;

    if (verification) {
      if (verification.status === "does_not_know_target") {
        status = "refuted";
        verificationRequired = false;
      } else if (verification.status === "anchor_confirms_can_introduce") {
        status = "confirmed_route";
        verificationRequired = false;
      } else if (
        verification.status === "anchor_knows_target_but_will_not_introduce" ||
        verification.status === "not_comfortable_asking_anchor"
      ) {
        status = "not_actionable";
        verificationRequired = false;
      }
    }

    const explanation =
      `${anchorName} is a ${anchor.relationshipStatus} anchor for ${founderName}. ` +
      `Observable overlap with ${targetName} includes: ${signalTypeLabels}. ` +
      `Bridge relevance score: ${relevance.overallBridgeRelevanceIndex}/100.`;

    hypotheses.push({
      id: hypId,
      targetInvestorId: targetInvestor.id,
      targetPersonId,
      founderPersonId: anchor.founderPersonId,
      anchorPersonId: anchor.anchorPersonId,
      anchorRelationshipId: anchor.relationshipId,
      proximitySignalIds: matchedSignals.map((s) => s.id),
      status,
      bridgeRelevance: relevance,
      explanation,
      whatWeKnow,
      whatWeDoNotKnow,
      verificationRequired,
    });
  }

  // Sort by overallBridgeRelevanceIndex descending
  hypotheses.sort(
    (a, b) =>
      b.bridgeRelevance.overallBridgeRelevanceIndex -
      a.bridgeRelevance.overallBridgeRelevanceIndex
  );

  return hypotheses;
}
