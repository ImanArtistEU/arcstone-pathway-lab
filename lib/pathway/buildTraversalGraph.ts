import {
  PathwayDataset,
  RelationshipQualification,
  QualificationStatus,
  QualificationReasonCode,
} from "@/types/pathway";
import { PathGenerationPolicy } from "./pathGenerationPolicy";
import { isRelationshipTraversable, getPermittedTraversalSteps } from "./traversalPolicy";

export interface TraversalGraphEdge {
  relationshipId: string;
  sourcePersonId: string;
  destinationPersonId: string;
  traversedReverse: boolean;
  qualificationStatus: QualificationStatus;
  qualificationReasonCodes: QualificationReasonCode[];
}

export type TraversalGraph = Map<string, TraversalGraphEdge[]>;

/**
 * Builds a deterministic person-to-person adjacency graph for path traversal.
 *
 * Rules:
 * - Pure function, does not mutate inputs.
 * - Structural and organization edges are strictly omitted.
 * - Only qualified traversable relationships (eligible, or confirmation_required if permitted by policy) enter.
 * - Adjacency lists are sorted deterministically by stable fields (relationshipId, destinationPersonId, reverse flag).
 */
export function buildTraversalGraph(
  dataset: PathwayDataset,
  qualifications: RelationshipQualification[],
  policy: PathGenerationPolicy
): TraversalGraph {
  const qualMap = new Map<string, RelationshipQualification>();
  for (const q of qualifications) {
    qualMap.set(q.relationshipId, q);
  }

  const graph: TraversalGraph = new Map();

  // Ensure every person in dataset has an entry in the graph
  for (const person of dataset.people) {
    graph.set(person.id, []);
  }

  for (const rel of dataset.relationships) {
    const qual = qualMap.get(rel.id);
    if (!qual) {
      continue;
    }

    if (!isRelationshipTraversable(rel, qual, policy)) {
      continue;
    }

    const permittedSteps = getPermittedTraversalSteps(rel);
    for (const step of permittedSteps) {
      const edge: TraversalGraphEdge = {
        relationshipId: rel.id,
        sourcePersonId: step.fromPersonId,
        destinationPersonId: step.toPersonId,
        traversedReverse: step.traversedReverse,
        qualificationStatus: qual.status,
        qualificationReasonCodes: [...qual.reasonCodes],
      };

      const existingEdges = graph.get(step.fromPersonId);
      if (existingEdges) {
        existingEdges.push(edge);
      } else {
        graph.set(step.fromPersonId, [edge]);
      }
    }
  }

  // Deterministically sort adjacency lists for stable traversal order
  for (const [, edges] of graph) {
    edges.sort((a, b) => {
      const relCmp = a.relationshipId.localeCompare(b.relationshipId);
      if (relCmp !== 0) return relCmp;
      const destCmp = a.destinationPersonId.localeCompare(b.destinationPersonId);
      if (destCmp !== 0) return destCmp;
      return (a.traversedReverse ? 1 : 0) - (b.traversedReverse ? 1 : 0);
    });
  }

  return graph;
}
