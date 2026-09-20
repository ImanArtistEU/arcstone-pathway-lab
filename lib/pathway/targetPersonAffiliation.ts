import { PathwayDataset } from "@/types/pathway";

/**
 * Pure helper to verify if a candidate person is currently affiliated with a target investor organization
 * as of a referenceDate.
 *
 * Accepted affiliation rules:
 * A. Person.currentOrganizationIds includes investorOrganizationId
 * OR
 * B. Current active structural `works_at` relationship from Person to Organization where:
 *    - if startedAt is present, it must be a valid date string and startedAt <= referenceDate
 *    - if endedAt is absent, active
 *    - if endedAt is present, it must be a valid date string and endedAt > referenceDate
 *      (if endedAt <= referenceDate, not active)
 *    - malformed startedAt/endedAt dates fail closed.
 *
 * Does NOT accept `worked_at`.
 */
export function isCurrentTargetPersonAffiliationVerified(
  dataset: PathwayDataset,
  personId: string,
  investorOrganizationId: string,
  referenceDate: string | Date
): boolean {
  let refDateObj: Date;
  if (referenceDate instanceof Date) {
    refDateObj = referenceDate;
  } else if (typeof referenceDate === "string" && referenceDate.trim() !== "") {
    refDateObj = new Date(referenceDate);
  } else {
    return false;
  }

  if (isNaN(refDateObj.getTime())) {
    return false;
  }

  const person = dataset.people.find((p) => p.id === personId);
  if (!person) {
    return false;
  }

  const isOrgIdMatch =
    Array.isArray(person.currentOrganizationIds) &&
    person.currentOrganizationIds.includes(investorOrganizationId);

  const refTime = refDateObj.getTime();

  const isWorksAtMatch = dataset.relationships.some((r) => {
    if (
      r.from.type !== "person" ||
      r.from.id !== personId ||
      r.to.type !== "organization" ||
      r.to.id !== investorOrganizationId ||
      r.type !== "works_at"
    ) {
      return false;
    }

    // Temporal validation on startedAt
    if (r.startedAt !== undefined && r.startedAt !== null && r.startedAt !== "") {
      if (typeof r.startedAt !== "string") return false;
      const startedDate = new Date(r.startedAt);
      if (isNaN(startedDate.getTime())) return false;
      if (startedDate.getTime() > refTime) return false;
    }

    // Temporal validation on endedAt
    if (r.endedAt !== undefined && r.endedAt !== null && r.endedAt !== "") {
      if (typeof r.endedAt !== "string") return false;
      const endedDate = new Date(r.endedAt);
      if (isNaN(endedDate.getTime())) return false;
      if (endedDate.getTime() <= refTime) return false;
    }

    return true;
  });

  return isOrgIdMatch || isWorksAtMatch;
}
