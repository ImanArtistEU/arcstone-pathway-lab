/**
 * Arcstone Pathway Intelligence Domain Types
 *
 * Batch 1 — Domain Model and Dataset Contract
 *
 * Core Principle:
 * DATA -> EVIDENCE -> DECISION -> ACTION -> OUTCOME -> LEARNING
 *
 * This layer represents raw facts and observed evidence only.
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

export interface RelationshipEvidence {
  id: string;
  relationshipId: string;
  type: RelationshipEvidenceType;
  description: string;
  observedAt?: string;
  sourceUrl?: string;
  sourceName?: string;
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

export interface PathCandidate {
  id: string;
  targetInvestorId: string;
  nodes: EntityReference[];
  relationshipIds: string[];
  intermediaryCount: number;
  status: PathCandidateStatus;
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
