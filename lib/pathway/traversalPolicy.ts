import {
  Relationship,
  RelationshipType,
  RelationshipQualification,
} from "@/types/pathway";
import { classifyRelationshipType } from "./qualificationPolicy";
import { PathGenerationPolicy } from "./pathGenerationPolicy";

/**
 * Directed interpersonal relationship types where reverse traversal is explicitly permitted.
 *
 * Example:
 * Marcus -> Elena (advisor) semantically stores that Marcus advises Elena.
 * For an introduction request, Elena must be able to reach out through Marcus (Elena -> Marcus).
 */
export const PERMITTED_REVERSE_DIRECTED_TYPES: readonly RelationshipType[] = [
  "advisor",
  "mentor",
  "introduced",
] as const;

export interface AllowedTraversalStep {
  fromPersonId: string;
  toPersonId: string;
  traversedReverse: boolean;
}

/**
 * Determines whether a relationship satisfies person-to-person and qualification constraints
 * to enter the traversal graph.
 *
 * Rules:
 * 1. PERSON-TO-PERSON: Both endpoints must be of type 'person'.
 * 2. NON-STRUCTURAL: Structural relationships (works_at, founder_of, etc.) must NEVER enter the intro graph.
 * 3. QUALIFICATION GATING:
 *    - Must be 'eligible', OR
 *    - Must be 'confirmation_required' when policy.includeConfirmationRequired is true.
 *    - NEVER 'ineligible' or 'structural'.
 */
export function isRelationshipTraversable(
  rel: Relationship,
  qualification: RelationshipQualification,
  policy: PathGenerationPolicy
): boolean {
  // 1. Both endpoints must be person nodes
  if (rel.from.type !== "person" || rel.to.type !== "person") {
    return false;
  }

  // 2. Structural relationships are never traversable as intro edges
  if (
    qualification.status === "structural" ||
    qualification.relationshipClass === "structural" ||
    classifyRelationshipType(rel.type) === "structural"
  ) {
    return false;
  }

  // 3. Ineligible relationships are never traversable
  if (qualification.status === "ineligible") {
    return false;
  }

  // 4. Confirmation-required relationships depend on policy flag
  if (qualification.status === "confirmation_required") {
    return policy.includeConfirmationRequired;
  }

  // 5. Eligible relationships are traversable
  return qualification.status === "eligible";
}

/**
 * Returns the permitted directional traversal steps across a traversable relationship.
 *
 * Rules:
 * - Forward (from -> to) is always allowed.
 * - Reverse (to -> from) is allowed IF:
 *   a) relationship.direction is 'bidirectional', OR
 *   b) relationship.type is in PERMITTED_REVERSE_DIRECTED_TYPES ('advisor', 'mentor', 'introduced').
 *
 * traversedReverse is true whenever traversal proceeds from semantic 'to' to semantic 'from'.
 */
export function getPermittedTraversalSteps(rel: Relationship): AllowedTraversalStep[] {
  if (rel.from.type !== "person" || rel.to.type !== "person") {
    return [];
  }

  const steps: AllowedTraversalStep[] = [
    {
      fromPersonId: rel.from.id,
      toPersonId: rel.to.id,
      traversedReverse: false,
    },
  ];

  const allowsReverse =
    rel.direction === "bidirectional" ||
    PERMITTED_REVERSE_DIRECTED_TYPES.includes(rel.type);

  if (allowsReverse) {
    steps.push({
      fromPersonId: rel.to.id,
      toPersonId: rel.from.id,
      traversedReverse: true,
    });
  }

  return steps;
}
