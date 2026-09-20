import { PathwayDataset } from "@/types/pathway";

/**
 * Pure helper to verify if a candidate person is currently affiliated with a target investor organization.
 *
 * Accepted affiliation rules:
 * A. Person.currentOrganizationIds includes investorOrganizationId
 * OR
 * B. Current active structural `works_at` relationship from Person to Organization.
 *
 * Does NOT accept `worked_at`.
 */
export function isCurrentTargetPersonAffiliationVerified(
  dataset: PathwayDataset,
  personId: string,
  investorOrganizationId: string
): boolean {
  const person = dataset.people.find((p) => p.id === personId);
  if (!person) {
    return false;
  }

  const isOrgIdMatch =
    Array.isArray(person.currentOrganizationIds) &&
    person.currentOrganizationIds.includes(investorOrganizationId);

  const isWorksAtMatch = dataset.relationships.some(
    (r) =>
      r.from.type === "person" &&
      r.from.id === personId &&
      r.to.type === "organization" &&
      r.to.id === investorOrganizationId &&
      r.type === "works_at"
  );

  return isOrgIdMatch || isWorksAtMatch;
}
