import { PathwayDataset, Relationship, RelationshipEvidence } from "@/types/pathway";

export interface DatasetIntegrityResult {
  valid: boolean;
  errors: string[];
}

/**
 * Deterministic pure function to validate the structural integrity of a PathwayDataset.
 *
 * Checks:
 * - Duplicate IDs across entities and within entity collections
 * - Relationships pointing to nonexistent 'from' or 'to' entities
 * - Strict bidirectional relationship-evidence integrity:
 *   1. For every evidence ID in rel.evidenceIds: evidence exists AND evidence.relationshipId === rel.id
 *   2. For every evidence in dataset.relationshipEvidence: rel exists AND rel.evidenceIds includes evidence.id
 * - Campaigns pointing to nonexistent startups
 * - Campaigns pointing to nonexistent founder people
 * - Target investors pointing to nonexistent campaigns
 * - Target investors pointing to nonexistent investor organizations
 * - Target investors candidate person IDs pointing to nonexistent people
 * - Person currentOrganizationIds pointing to nonexistent organizations
 *
 * Does NOT perform relationship qualification, warmth scoring, or path generation.
 */
export function assertDatasetIntegrity(
  dataset: PathwayDataset
): DatasetIntegrityResult {
  const errors: string[] = [];

  // Track entity ID sets and duplicate detection
  const seenIds = new Map<string, string>(); // id -> entity type label

  function checkUniqueId(id: string, entityType: string) {
    if (!id || typeof id !== "string") {
      errors.push(`Invalid or missing ID in ${entityType}.`);
      return;
    }
    if (seenIds.has(id)) {
      errors.push(
        `Duplicate ID detected: "${id}" in ${entityType} (already declared in ${seenIds.get(id)}).`
      );
    } else {
      seenIds.set(id, entityType);
    }
  }

  const startupIds = new Set<string>();
  for (const startup of dataset.startups) {
    checkUniqueId(startup.id, "startups");
    startupIds.add(startup.id);
  }

  const organizationIds = new Set<string>();
  for (const org of dataset.organizations) {
    checkUniqueId(org.id, "organizations");
    organizationIds.add(org.id);
  }

  const personIds = new Set<string>();
  for (const person of dataset.people) {
    checkUniqueId(person.id, "people");
    personIds.add(person.id);
  }

  const relationshipMap = new Map<string, Relationship>();
  for (const rel of dataset.relationships) {
    checkUniqueId(rel.id, "relationships");
    relationshipMap.set(rel.id, rel);
  }

  const evidenceMap = new Map<string, RelationshipEvidence>();
  for (const ev of dataset.relationshipEvidence) {
    checkUniqueId(ev.id, "relationshipEvidence");
    evidenceMap.set(ev.id, ev);
  }

  const campaignIds = new Set<string>();
  for (const camp of dataset.campaigns) {
    checkUniqueId(camp.id, "campaigns");
    campaignIds.add(camp.id);
  }

  const targetInvestorIds = new Set<string>();
  for (const target of dataset.targetInvestors) {
    checkUniqueId(target.id, "targetInvestors");
    targetInvestorIds.add(target.id);
  }

  // 1. Relationships entity references and evidence linkage
  for (const rel of dataset.relationships) {
    // Check 'from' entity
    if (rel.from.type === "person") {
      if (!personIds.has(rel.from.id)) {
        errors.push(
          `Relationship "${rel.id}" points from nonexistent person "${rel.from.id}".`
        );
      }
    } else if (rel.from.type === "organization") {
      if (!organizationIds.has(rel.from.id)) {
        errors.push(
          `Relationship "${rel.id}" points from nonexistent organization "${rel.from.id}".`
        );
      }
    } else {
      errors.push(
        `Relationship "${rel.id}" has invalid 'from' entity type "${(rel.from as { type: string }).type}".`
      );
    }

    // Check 'to' entity
    if (rel.to.type === "person") {
      if (!personIds.has(rel.to.id)) {
        errors.push(
          `Relationship "${rel.id}" points to nonexistent person "${rel.to.id}".`
        );
      }
    } else if (rel.to.type === "organization") {
      if (!organizationIds.has(rel.to.id)) {
        errors.push(
          `Relationship "${rel.id}" points to nonexistent organization "${rel.to.id}".`
        );
      }
    } else {
      errors.push(
        `Relationship "${rel.id}" has invalid 'to' entity type "${(rel.to as { type: string }).type}".`
      );
    }

    // Check evidenceIds on relationship:
    // 1. Evidence must exist
    // 2. evidence.relationshipId MUST equal this relationship's ID
    if (Array.isArray(rel.evidenceIds)) {
      for (const evId of rel.evidenceIds) {
        const ev = evidenceMap.get(evId);
        if (!ev) {
          errors.push(
            `Relationship "${rel.id}" references nonexistent evidence "${evId}".`
          );
        } else if (ev.relationshipId !== rel.id) {
          errors.push(
            `Relationship "${rel.id}" references evidence "${evId}", but evidence "${evId}" belongs to relationship "${ev.relationshipId}".`
          );
        }
      }
    }
  }

  // 2. Evidence relationship references and inverse linkage:
  // 1. relationshipId must exist
  // 2. The referenced Relationship's evidenceIds must include this evidence ID
  for (const ev of dataset.relationshipEvidence) {
    const rel = relationshipMap.get(ev.relationshipId);
    if (!rel) {
      errors.push(
        `Evidence "${ev.id}" points to nonexistent relationship "${ev.relationshipId}".`
      );
    } else if (!Array.isArray(rel.evidenceIds) || !rel.evidenceIds.includes(ev.id)) {
      errors.push(
        `Evidence "${ev.id}" points to relationship "${ev.relationshipId}", but relationship "${ev.relationshipId}" does not list evidence "${ev.id}" in its evidenceIds.`
      );
    }
  }

  // 3. Campaigns startup and founder references
  for (const camp of dataset.campaigns) {
    if (!startupIds.has(camp.startupId)) {
      errors.push(
        `Campaign "${camp.id}" points to nonexistent startup "${camp.startupId}".`
      );
    }
    for (const founderId of camp.founderPersonIds) {
      if (!personIds.has(founderId)) {
        errors.push(
          `Campaign "${camp.id}" points to nonexistent founder person "${founderId}".`
        );
      }
    }
  }

  // 4. Target investors campaign, organization, and candidate person references
  for (const target of dataset.targetInvestors) {
    if (!campaignIds.has(target.campaignId)) {
      errors.push(
        `TargetInvestor "${target.id}" points to nonexistent campaign "${target.campaignId}".`
      );
    }
    if (!organizationIds.has(target.investorOrganizationId)) {
      errors.push(
        `TargetInvestor "${target.id}" points to nonexistent investor organization "${target.investorOrganizationId}".`
      );
    }
    for (const personId of target.candidatePersonIds) {
      if (!personIds.has(personId)) {
        errors.push(
          `TargetInvestor "${target.id}" has candidatePersonId pointing to nonexistent person "${personId}".`
        );
      }
    }
  }

  // 5. Persons currentOrganizationIds
  for (const person of dataset.people) {
    for (const orgId of person.currentOrganizationIds) {
      if (!organizationIds.has(orgId)) {
        errors.push(
          `Person "${person.id}" references nonexistent organization "${orgId}" in currentOrganizationIds.`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
