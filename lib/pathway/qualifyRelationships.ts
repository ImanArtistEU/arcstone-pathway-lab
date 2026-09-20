import {
  PathwayDataset,
  RelationshipQualification,
  RelationshipEvidence,
} from "@/types/pathway";
import {
  QualificationPolicy,
  DEFAULT_QUALIFICATION_POLICY,
} from "./qualificationPolicy";
import { qualifyRelationship } from "./qualifyRelationship";

/**
 * Deterministically qualifies all Relationships within a PathwayDataset.
 *
 * Pure function:
 * - Does not mutate PathwayDataset
 * - No network or database calls
 * - No system-clock dependencies (deterministic referenceDate required)
 * - Returns a list of RelationshipQualification items matching dataset.relationships
 */
export function qualifyRelationships(
  dataset: PathwayDataset,
  referenceDate: string | Date,
  policy: QualificationPolicy = DEFAULT_QUALIFICATION_POLICY
): RelationshipQualification[] {
  // Index evidence by relationshipId
  const evidenceByRelationship = new Map<string, RelationshipEvidence[]>();

  for (const ev of dataset.relationshipEvidence) {
    const list = evidenceByRelationship.get(ev.relationshipId) || [];
    list.push(ev);
    evidenceByRelationship.set(ev.relationshipId, list);
  }

  const campaignFounderPersonIds = new Set<string>();
  for (const campaign of dataset.campaigns || []) {
    for (const fId of campaign.founderPersonIds || []) {
      campaignFounderPersonIds.add(fId);
    }
  }
  const founderIdsList = Array.from(campaignFounderPersonIds);

  return dataset.relationships.map((rel) => {
    const evidenceList = evidenceByRelationship.get(rel.id) || [];
    return qualifyRelationship(rel, evidenceList, referenceDate, policy, founderIdsList);
  });
}
