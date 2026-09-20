import {
  PathwayDataset,
  FundraisingCampaign,
  FounderNetworkAnchor,
  AnchorRelationshipStatus,
  AskabilityStatus,
} from "../../types/pathway";
import { qualifyRelationship } from "./qualifyRelationship";

/**
 * Extract Founder Network Anchors (Batch 9)
 *
 * Identifies people in the founder's network who are realistic candidates
 * for bridge intelligence.
 */
export function extractFounderNetworkAnchors(
  dataset: PathwayDataset,
  campaign: FundraisingCampaign,
  referenceDate: string
): FounderNetworkAnchor[] {
  const anchors: FounderNetworkAnchor[] = [];
  const founders = campaign.founderPersonIds;

  if (!founders || founders.length === 0) {
    return [];
  }

  // Index evidence by relationshipId
  const evidenceByRelationship = new Map<string, typeof dataset.relationshipEvidence>();
  for (const ev of dataset.relationshipEvidence || []) {
    const list = evidenceByRelationship.get(ev.relationshipId) || [];
    list.push(ev);
    evidenceByRelationship.set(ev.relationshipId, list);
  }

  for (const rel of dataset.relationships) {
    // Check if relationship touches at least one campaign founder
    const fromFounder = rel.from.type === "person" && founders.includes(rel.from.id);
    const toFounder = rel.to.type === "person" && founders.includes(rel.to.id);

    if (!fromFounder && !toFounder) {
      continue;
    }

    const founderPersonId = fromFounder ? rel.from.id : rel.to.id;
    const anchorPersonId = fromFounder ? rel.to.id : rel.from.id;

    // Must connect person-to-person
    if (rel.from.type !== "person" || rel.to.type !== "person") {
      continue;
    }

    // Do not anchor founder to another campaign founder
    if (founders.includes(anchorPersonId)) {
      continue;
    }

    const relEvidence = evidenceByRelationship.get(rel.id) || [];

    const qual = qualifyRelationship(
      rel,
      relEvidence,
      referenceDate,
      undefined,
      campaign.founderPersonIds
    );

    let anchorStatus: AnchorRelationshipStatus = "ineligible";

    if (qual.status === "ineligible") {
      anchorStatus = "ineligible";
    } else if (qual.status === "eligible") {
      if (qual.recency === "stale") {
        anchorStatus = "stale";
      } else {
        anchorStatus = "verified";
      }
    } else if (qual.status === "confirmation_required") {
      if (qual.reasonCodes.includes("PUBLIC_PROXIMITY_ONLY")) {
        anchorStatus = "unverified";
      } else if (
        qual.reasonCodes.includes("USER_ASSERTED_THIRD_PARTY_RELATIONSHIP") ||
        rel.type === "known_personally" ||
        rel.type === "advisor" ||
        rel.type === "mentor"
      ) {
        anchorStatus = "asserted";
      } else if (qual.recency === "stale") {
        anchorStatus = "stale";
      } else {
        anchorStatus = "asserted";
      }
    }

    // Filter out unverified LinkedIn-only or ineligible
    if (anchorStatus === "ineligible" || anchorStatus === "unverified") {
      continue;
    }

    // Compute relationship quality index from credibility & freshness heuristics
    let qualityIndex = 50;
    if (anchorStatus === "verified") qualityIndex = 90;
    else if (anchorStatus === "asserted") qualityIndex = 70;
    else if (anchorStatus === "stale") qualityIndex = 40;

    const askabilityStatus: AskabilityStatus =
      (rel.metadata?.askabilityStatus as AskabilityStatus) || "unknown";

    const evidenceBasis = relEvidence.map((e) => e.type);

    anchors.push({
      founderPersonId,
      anchorPersonId,
      relationshipId: rel.id,
      relationshipStatus: anchorStatus,
      relationshipQualityIndex: qualityIndex,
      recency: qual.recency,
      evidenceBasis,
      askabilityStatus,
    });
  }

  return anchors;
}
