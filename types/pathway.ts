/**
 * Arcstone Pathway Intelligence Domain Types
 *
 * Batch 1 — Domain Model and Dataset Contract
 * Batch 2 — Deterministic Relationship Qualification
 *
 * Core Principle:
 * DATA -> EVIDENCE -> DECISION -> ACTION -> OUTCOME -> LEARNING
 *
 * This layer represents raw facts, observed evidence, and deterministic
 * relationship introduction-qualification decisions.
 * It does NOT score relationships, assess warmth, or generate paths.
 */

export interface EntityReference {
  type: "person" | "organization";
  id: string;
}

export interface Startup {
  id: string;
  name: string;
  website?: string;
  geography?: string;
  sector?: string;
  stage?: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  linkedinUrl?: string;
  currentOrganizationIds: string[];
  location?: string;
}

export type OrganizationType =
  | "startup"
  | "vc_fund"
  | "angel_group"
  | "accelerator"
  | "corporate"
  | "university"
  | "advisory_firm"
  | "other";

export interface Organization {
  id: string;
  name: string;
  type: OrganizationType;
  website?: string;
  geography?: string;
}

export type RelationshipDirection = "directed" | "bidirectional";

export type RelationshipType =
  | "linkedin_connection"
  | "works_at"
  | "worked_at"
  | "founder_of"
  | "invested_in"
  | "board_member"
  | "advisor"
  | "mentor"
  | "colleague"
  | "former_colleague"
  | "co_invested"
  | "introduced"
  | "portfolio_founder"
  | "accelerator_cohort"
  | "university_connection"
  | "event_connection"
  | "known_personally"
  | "other";

export interface Relationship {
  id: string;
  from: EntityReference;
  to: EntityReference;
  type: RelationshipType;
  direction: RelationshipDirection;
  evidenceIds: string[];
  startedAt?: string;
  endedAt?: string;
  lastObservedAt?: string;
  metadata?: Record<string, unknown>;
}

export type RelationshipEvidenceType =
  | "linkedin"
  | "company_website"
  | "portfolio_page"
  | "press_release"
  | "news_article"
  | "public_profile"
  | "event_page"
  | "user_reported"
  | "crm_history"
  | "email_history"
  | "meeting_history"
  | "manual_research"
  | "other";

export type InteractionReciprocity = "two_way" | "one_way" | "unknown";

export type InteractionStatus = "confirmed" | "unconfirmed";

export interface InteractionEvidenceDetails {
  occurredAt: string;
  reciprocity: InteractionReciprocity;
  status: InteractionStatus;
}

export interface RelationshipEvidence {
  id: string;
  relationshipId: string;
  type: RelationshipEvidenceType;
  description: string;
  /** When Arcstone observed, ingested, or recorded this evidence artifact */
  observedAt?: string;
  sourceUrl?: string;
  sourceName?: string;
  /** Underlying human interaction details if this evidence represents an interaction */
  interaction?: InteractionEvidenceDetails;
  metadata?: Record<string, unknown>;
}

export type CampaignStatus = "preparing" | "active" | "paused" | "closed";

export interface FundraisingCampaign {
  id: string;
  startupId: string;
  founderPersonIds: string[];
  round: string;
  status: CampaignStatus;
  createdAt: string;
}

export type TargetInvestorStatus =
  | "unreviewed"
  | "researching"
  | "ready"
  | "contacted"
  | "passed"
  | "responded";

export interface TargetInvestor {
  id: string;
  campaignId: string;
  investorOrganizationId: string;
  candidatePersonIds: string[];
  status: TargetInvestorStatus;
}

export type PathCandidateStatus = "candidate" | "rejected" | "eligible";

export interface PathTraversalStep {
  relationshipId: string;
  fromPersonId: string;
  toPersonId: string;
  traversedReverse: boolean;
  qualificationStatus: QualificationStatus;
  qualificationReasonCodes: QualificationReasonCode[];
}

export interface PathCandidate {
  id: string;
  targetInvestorId: string;
  sourceFounderPersonId: string;
  targetPersonId: string;
  nodes: EntityReference[];
  relationshipIds: string[];
  steps: PathTraversalStep[];
  intermediaryCount: number;
  status: PathCandidateStatus;
  requiresConfirmationRelationshipIds: string[];
}

export type PathGenerationDisposition =
  | "eligible_path_available"
  | "confirmation_path_available"
  | "no_known_path";

export interface PathGenerationResult {
  targetInvestorId: string;
  campaignId: string;
  sourceFounderPersonIds: string[];
  targetPersonIds: string[];
  paths: PathCandidate[];
  eligiblePathCount: number;
  confirmationRequiredPathCount: number;
  disposition: PathGenerationDisposition;
  coldOutreachRequired: boolean;
  errors: string[];
}

export interface PathScore {
  overall?: number;
  relationshipStrength?: number;
  relevance?: number;
  confidence?: number;
  recency?: number;
  friction?: number;
}

export type PathOutcomeType =
  | "intro_requested"
  | "intro_received"
  | "intro_declined"
  | "contacted"
  | "replied"
  | "meeting_booked"
  | "no_response"
  | "investor_passed"
  | "investment";

export type FounderFeedbackAccuracy = "accurate" | "inaccurate" | "unknown";

export interface FounderFeedback {
  accuracy: FounderFeedbackAccuracy;
  comments?: string;
  reportedAt: string;
}

export interface PathOutcome {
  id: string;
  pathCandidateId: string;
  outcome: PathOutcomeType;
  occurredAt: string;
  notes?: string;
  feedback?: FounderFeedback;
}

export interface PathwayDataset {
  startups: Startup[];
  people: Person[];
  organizations: Organization[];
  relationships: Relationship[];
  relationshipEvidence: RelationshipEvidence[];
  campaigns: FundraisingCampaign[];
  targetInvestors: TargetInvestor[];
}

export interface PathwayAnalysisResult {
  targetInvestorId: string;
  candidatePaths: PathCandidate[];
  recommendedPathId?: string;
  coldOutreachRequired: boolean;
  explanation?: string;
}

// ============================================================================
// RELATIONSHIP QUALIFICATION (Batch 2)
// ============================================================================

export type RelationshipClass =
  | "structural"
  | "interpersonal"
  | "network_signal";

export type QualificationStatus =
  | "eligible"
  | "confirmation_required"
  | "ineligible"
  | "structural";

export type RecencyBucket = "recent" | "aging" | "stale" | "unknown";

export type EvidenceCategory =
  | "direct_interaction"
  | "founder_asserted"
  | "public_context"
  | "platform_signal";

export interface EvidenceSummary {
  total: number;
  directInteraction: number;
  founderAsserted: number;
  publicContext: number;
  platformSignal: number;
  confirmedTwoWayInteraction: number;
  oneWayInteraction: number;
  unconfirmedInteraction: number;
}

export type QualificationReasonCode =
  | "STRUCTURAL_RELATIONSHIP"
  | "RECENT_DIRECT_INTERACTION"
  | "RECENT_INTERNAL_EVIDENCE"
  | "LINKEDIN_ONLY"
  | "PUBLIC_CONTEXT_ONLY"
  | "NETWORK_SIGNAL_ONLY"
  | "NO_DIRECT_INTERACTION"
  | "STALE_INTERACTION"
  | "AGING_INTERACTION"
  | "NO_EVIDENCE"
  | "FUTURE_INTERACTION_DATE"
  | "INVALID_INTERACTION_DATE"
  | "INVALID_REFERENCE_DATE"
  | "ONE_WAY_OUTREACH_ONLY"
  | "UNCONFIRMED_INTERACTION";

export interface RelationshipQualification {
  relationshipId: string;
  relationshipClass: RelationshipClass;
  status: QualificationStatus;
  recency: RecencyBucket;
  latestRelevantInteractionAt?: string;
  evidenceSummary: EvidenceSummary;
  reasonCodes: QualificationReasonCode[];
  explanation: string;
}
