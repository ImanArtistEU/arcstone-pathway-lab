/**
 * Arcstone Pathway Intelligence Domain Types
 *
 * Implemented stages:
 * - evidence/domain model
 * - relationship qualification
 * - path generation
 * - path rejection
 * - path scoring
 * - target-person selection
 * - path explanation & activation
 *
 * Core Principle:
 * DATA -> EVIDENCE -> DECISION -> ACTION -> OUTCOME -> LEARNING
 *
 * This layer represents raw facts, observed evidence, deterministic
 * relationship qualification, path generation, path rejection, path scoring,
 * target-person selection, and path explanation & activation planning.
 * It selects preferred routes among retained scored paths, explains decisions,
 * and provides deterministic activation steps.
 * It does NOT generate outreach copy, predict response probabilities,
 * or train a learned model.
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

export type EvidenceAccessClass =
  | "first_party_private"
  | "user_asserted"
  | "public"
  | "consented_third_party_private";

export type EvidenceSourceSystem =
  | "gmail"
  | "google_calendar"
  | "crm"
  | "manual"
  | "linkedin"
  | "company_website"
  | "portfolio_page"
  | "press"
  | "public_web"
  | "other";

export interface EvidenceProvenance {
  accessClass: EvidenceAccessClass;
  sourceSystem: EvidenceSourceSystem;
  sourcePrincipalPersonId?: string;
  authorizedByPersonId?: string;
}

export interface RelationshipEvidence {
  id: string;
  relationshipId: string;
  type: RelationshipEvidenceType;
  description: string;
  provenance?: EvidenceProvenance;
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
  qualificationRecency: RecencyBucket;
  qualificationEvidenceSummary: EvidenceSummary;
  latestRelevantInteractionAt?: string;
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

export type PathGenerationExecutionStatus = "success" | "error";

export type PathGenerationErrorCode =
  | "INVALID_DATASET"
  | "TARGET_INVESTOR_NOT_FOUND"
  | "CAMPAIGN_NOT_FOUND"
  | "NO_FOUNDERS"
  | "FOUNDER_NOT_FOUND"
  | "NO_TARGET_PEOPLE"
  | "TARGET_PERSON_NOT_FOUND"
  | "TARGET_PERSON_AFFILIATION_UNVERIFIED"
  | "INVALID_REFERENCE_DATE"
  | "INVALID_PATH_POLICY"
  | "INVALID_QUALIFICATION_POLICY";

export interface PathGenerationError {
  code: PathGenerationErrorCode;
  message: string;
  entityId?: string;
}

export type PathGenerationDisposition =
  | "eligible_path_available"
  | "confirmation_path_available"
  | "confirmation_paths_filtered"
  | "no_known_path";

export interface PathGenerationResult {
  executionStatus: PathGenerationExecutionStatus;
  targetInvestorId: string;
  campaignId: string;
  sourceFounderPersonIds: string[];
  targetPersonIds: string[];
  paths: PathCandidate[];
  eligiblePathCount: number;
  confirmationRequiredPathCount: number;
  filteredConfirmationPathCount: number;
  disposition: PathGenerationDisposition | null;
  coldOutreachRequired: boolean | null;
  errors: PathGenerationError[];
}

export type PathRejectionDecision = "retain" | "reject";

export type PathRejectionReasonCode =
  | "ONE_WAY_OUTREACH_EDGE"
  | "INVALID_INTERACTION_DATA"
  | "FUTURE_INTERACTION_DATA"
  | "INVALID_REFERENCE_CONTEXT"
  | "EXCESS_CONFIRMATION_HOPS";

export interface PathRejectionEvaluation {
  pathId: string;
  decision: PathRejectionDecision;
  originalPathStatus: "eligible" | "candidate";
  reasonCodes: PathRejectionReasonCode[];
  blockingRelationshipIds: string[];
  explanation: string;
}

export type PathRejectionExecutionStatus =
  | "success"
  | "upstream_error"
  | "error";

export type PathRejectionDisposition =
  | "retained_paths_available"
  | "all_paths_rejected"
  | "no_generated_paths"
  | "upstream_error"
  | "upstream_paths_filtered"
  | "error";

export interface PathRejectionResult {
  executionStatus: PathRejectionExecutionStatus;
  targetInvestorId: string;
  upstreamGenerationDisposition: PathGenerationDisposition | null;
  inputPathCount: number;
  retainedPaths: PathCandidate[];
  rejectedPaths: PathCandidate[];
  evaluations: PathRejectionEvaluation[];
  retainedEligiblePathCount: number;
  retainedCandidatePathCount: number;
  rejectedPathCount: number;
  disposition: PathRejectionDisposition;
  errors: string[];
}

export type PathScoreCalibrationStatus = "uncalibrated_heuristic";

export interface PathStepScore {
  relationshipId: string;
  relationshipCredibility: number;
  temporalFreshness: number;
  qualificationStatus: QualificationStatus;
  qualificationRecency: RecencyBucket;
  qualificationReasonCodes: QualificationReasonCode[];
  explanation: string;
}

export interface PathScore {
  pathId: string;
  overallPriorityIndex: number;
  relationshipCredibility: number;
  temporalFreshness: number;
  confirmationReadiness: number;
  pathEfficiency: number;
  confirmationRequiredHopCount: number;
  relationshipHopCount: number;
  bottleneckRelationshipId?: string;
  stepScores: PathStepScore[];
  calibrationStatus: PathScoreCalibrationStatus;
  isProbability: false;
  explanation: string;
}

export type PathScoringExecutionStatus =
  | "success"
  | "upstream_error"
  | "error";

export type PathScoringDisposition =
  | "scores_available"
  | "no_retained_paths"
  | "upstream_paths_filtered"
  | "upstream_error"
  | "error";

export interface ScoredPath {
  path: PathCandidate;
  score: PathScore;
}

export interface PathScoringResult {
  executionStatus: PathScoringExecutionStatus;
  targetInvestorId: string;
  upstreamRejectionDisposition: PathRejectionDisposition | null;
  inputRetainedPathCount: number;
  scoredPaths: ScoredPath[];
  disposition: PathScoringDisposition;
  calibrationStatus: PathScoreCalibrationStatus;
  errors: string[];
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
  proximitySignals?: ProximitySignal[];
  bridgeVerifications?: BridgeVerification[];
}

// ============================================================================
// LATENT NETWORK BRIDGE INTELLIGENCE (Batch 9)
// ============================================================================

export type ProximitySignalType =
  | "co_invested_same_deal"
  | "shared_board"
  | "portfolio_relationship"
  | "worked_at_same_organization"
  | "accelerator_overlap"
  | "university_overlap"
  | "event_overlap"
  | "linkedin_connection"
  | "public_collaboration"
  | "public_mention"
  | "other";

export interface ProximitySignal {
  id: string;
  personAId: string;
  personBId: string;
  type: ProximitySignalType;
  evidenceIds: string[];
  observedAt?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
}

export type AnchorRelationshipStatus =
  | "verified"
  | "asserted"
  | "stale"
  | "unverified"
  | "ineligible";

export type AskabilityStatus = "unknown" | "comfortable" | "not_comfortable";

export interface FounderNetworkAnchor {
  founderPersonId: string;
  anchorPersonId: string;
  relationshipId: string;
  relationshipStatus: AnchorRelationshipStatus;
  relationshipQualityIndex: number;
  recency: RecencyBucket;
  evidenceBasis: string[];
  askabilityStatus: AskabilityStatus;
}

export type BridgeHypothesisStatus =
  | "potential_bridge"
  | "worth_asking"
  | "confirmed_route"
  | "refuted"
  | "not_actionable"
  | "insufficient_evidence";

export interface BridgeRelevanceScore {
  overallBridgeRelevanceIndex: number;
  anchorRelationshipQuality: number;
  targetProximityStrength: number;
  proximityFreshness: number;
  signalCorroboration: number;
  calibrationStatus: "uncalibrated_heuristic";
  isProbability: false;
  explanation: string;
}

export interface BridgeHypothesis {
  id: string;
  targetInvestorId: string;
  targetPersonId: string;
  founderPersonId: string;
  anchorPersonId: string;
  anchorRelationshipId: string;
  proximitySignalIds: string[];
  status: BridgeHypothesisStatus;
  bridgeRelevance: BridgeRelevanceScore;
  explanation: string;
  whatWeKnow: string[];
  whatWeDoNotKnow: string[];
  verificationRequired: boolean;
}

export type BridgeVerificationStatus =
  | "unknown"
  | "founder_believes_valid"
  | "anchor_confirms_knows_target"
  | "anchor_confirms_can_introduce"
  | "anchor_knows_target_but_will_not_introduce"
  | "anchor_relationship_too_weak"
  | "does_not_know_target"
  | "not_comfortable_asking_anchor";

export interface BridgeVerification {
  id?: string;
  bridgeHypothesisId: string;
  status: BridgeVerificationStatus;
  reportedByPersonId: string;
  reportedAt: string;
  notes?: string;
}

export type FundAccessStatus =
  | "VERIFIED_DIRECT_RELATIONSHIP"
  | "CONFIRMED_INTRO_ROUTE"
  | "POTENTIAL_BRIDGE_FOUND"
  | "PLATFORM_ADJACENCY_ONLY"
  | "NO_CREDIBLE_BRIDGE_FOUND";

export interface FundAccessStrategy {
  targetInvestorId: string;
  accessStatus: FundAccessStatus;
  decisionTargetPersonId: string;
  reachableEntryPointPersonId?: string;
  bestBridgeHypothesis?: BridgeHypothesis;
  alternativeBridgeHypotheses: BridgeHypothesis[];
  explanation: string;
}

export type BridgeOutcomeType =
  | "anchor_asked"
  | "anchor_knows_target"
  | "anchor_does_not_know_target"
  | "anchor_not_comfortable"
  | "intro_requested"
  | "intro_declined"
  | "intro_made"
  | "meeting_booked";

export interface BridgeOutcome {
  id: string;
  bridgeHypothesisId: string;
  outcome: BridgeOutcomeType;
  occurredAt: string;
  notes?: string;
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
  | "UNCONFIRMED_INTERACTION"
  | "PUBLIC_PROXIMITY_ONLY"
  | "USER_ASSERTED_THIRD_PARTY_RELATIONSHIP"
  | "PRIVATE_EVIDENCE_NOT_OBSERVABLE"
  | "THIRD_PARTY_CONFIRMATION_REQUIRED";

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

export type TargetPersonInvestmentRole =
  | "lead_investor"
  | "investment_team"
  | "sourcing"
  | "non_investment"
  | "unknown";

export interface TargetPersonProfile {
  targetInvestorId: string;
  personId: string;
  roleTitle: string;
  investmentRole: TargetPersonInvestmentRole;
  stageFocus: string[];
  sectorFocus: string[];
  geographyFocus: string[];
  observedAt: string;
  sourceName?: string;
  sourceUrl?: string;
}

export type TargetPersonFitStatus = "match" | "no_match" | "unknown";

export interface TargetPersonEvaluation {
  personId: string;
  targetInvestorId: string;
  roleTitle: string;
  investmentRole: TargetPersonInvestmentRole;
  investmentRoleScore: number;
  stageFitStatus: TargetPersonFitStatus;
  stageFitScore: number;
  sectorFitStatus: TargetPersonFitStatus;
  sectorFitScore: number;
  geographyFitStatus: TargetPersonFitStatus;
  geographyFitScore: number;
  mandateFitIndex: number;
  accessQualityIndex: number;
  scoredPathCount: number;
  highestScoringPathId?: string;
  overallTargetPriorityIndex: number;
  selectable: boolean;
  explanation: string;
}

export type TargetPersonSelectionExecutionStatus =
  | "success"
  | "upstream_error"
  | "error";

export type TargetPersonSelectionDisposition =
  | "primary_target_selected"
  | "ambiguous_top_candidates"
  | "no_selectable_candidates"
  | "insufficient_context"
  | "upstream_paths_filtered"
  | "upstream_error"
  | "error";

export interface TargetPersonSelectionResult {
  executionStatus: TargetPersonSelectionExecutionStatus;
  targetInvestorId: string;
  candidatePersonIds: string[];
  evaluations: TargetPersonEvaluation[];
  priorityOrderPersonIds: string[];
  primaryTargetPersonId?: string;
  topCandidatePersonIds: string[];
  disposition: TargetPersonSelectionDisposition;
  calibrationStatus: "uncalibrated_heuristic";
  isProbability: false;
  errors: string[];
}

// ============================================================================
// PATH EXPLANATION & ACTIVATION PLAN (Batch 8)
// ============================================================================

export type PathwayExplanationExecutionStatus =
  | "success"
  | "upstream_error"
  | "error";

export type PathwayExplanationDisposition =
  | "preferred_route_selected"
  | "ambiguous_top_routes"
  | "no_retained_route_to_primary_target"
  | "no_primary_target"
  | "upstream_paths_filtered"
  | "upstream_error"
  | "error";

export interface TargetPersonComparison {
  personId: string;
  personName: string;
  overallTargetPriorityIndex: number;
  mandateFitIndex: number;
  accessQualityIndex: number;
  investmentRole: TargetPersonInvestmentRole;
  investmentRoleScore: number;
  scoreDifferenceFromPrimary: number;
  explanation: string;
}

export interface TargetPersonDecisionExplanation {
  personId?: string;
  personName?: string;
  organizationId: string;
  organizationName: string;
  roleTitle?: string;
  investmentRole?: TargetPersonInvestmentRole;
  overallTargetPriorityIndex?: number;
  mandateFitIndex?: number;
  accessQualityIndex?: number;
  stageFitStatus?: TargetPersonFitStatus;
  stageFitScore?: number;
  sectorFitStatus?: TargetPersonFitStatus;
  sectorFitScore?: number;
  geographyFitStatus?: TargetPersonFitStatus;
  geographyFitScore?: number;
  reasons: string[];
  candidateComparisons: TargetPersonComparison[];
}

export interface RouteEvidenceItem {
  evidenceId: string;
  evidenceType: RelationshipEvidenceType;
  description: string;
  accessClass?: EvidenceAccessClass;
  sourceSystem?: EvidenceSourceSystem;
  sourcePrincipalPersonId?: string;
  authorizedByPersonId?: string;
  originLabel?: string;
  sourceName?: string;
  sourceUrl?: string;
  observedAt?: string;
  interactionOccurredAt?: string;
  interactionReciprocity?: InteractionReciprocity;
  interactionStatus?: InteractionStatus;
}

export interface RouteStepExplanation {
  relationshipId: string;
  fromPersonId: string;
  fromPersonName: string;
  toPersonId: string;
  toPersonName: string;
  relationshipType: RelationshipType;
  qualificationStatus: QualificationStatus;
  qualificationRecency: RecencyBucket;
  qualificationReasonCodes: QualificationReasonCode[];
  relationshipCredibility: number;
  temporalFreshness: number;
  latestRelevantInteractionAt?: string;
  evidenceSummary: EvidenceSummary;
  evidenceItems: RouteEvidenceItem[];
  whyThisConnectionExists: string;
  confidenceLimitation?: string;
  evidenceAccessClass?: EvidenceAccessClass;
  evidenceSourceSystems?: EvidenceSourceSystem[];
  observabilityExplanation?: string;
  whatArcstoneKnows?: string[];
  whatArcstoneDoesNotKnow?: string[];
}

export interface RouteWeakestLink {
  relationshipId: string;
  fromPersonName: string;
  toPersonName: string;
  relationshipCredibility: number;
  temporalFreshness: number;
  qualificationStatus: QualificationStatus;
  qualificationRecency: RecencyBucket;
  reason: string;
  recommendedVerification?: string;
}

export interface AlternativeRouteComparison {
  pathId: string;
  humanRoute: string;
  overallPriorityIndex: number;
  scoreDifferenceFromPreferred: number;
  relationshipCredibility: number;
  temporalFreshness: number;
  confirmationReadiness: number;
  pathEfficiency: number;
  reasonPreferredRouteRanksHigher: string[];
}

export interface RejectedRouteExplanation {
  pathId: string;
  humanRoute: string;
  rejectionReasonCodes: PathRejectionReasonCode[];
  blockingRelationshipIds: string[];
  explanation: string;
}

export type PathActivationType =
  | "direct_relationship_activation"
  | "request_intro_from_intermediary"
  | "verify_then_request_intro"
  | "multi_hop_activation"
  | "relationship_discovery_required"
  | "ambiguous_route"
  | "no_primary_target"
  | "unavailable";

export interface ActivationStep {
  order: number;
  actorPersonId?: string;
  actorPersonName?: string;
  actionType: string;
  action: string;
  reason: string;
  relationshipId?: string;
}

export interface PathActivationPlan {
  type: PathActivationType;
  status: string;
  firstActorPersonId?: string;
  firstActorPersonName?: string;
  nextPersonId?: string;
  nextPersonName?: string;
  targetPersonId?: string;
  targetPersonName?: string;
  steps: ActivationStep[];
  rationale: string;
  cautions: string[];
}

export interface PreferredRouteExplanation {
  pathId: string;
  sourceFounderPersonId: string;
  targetPersonId: string;
  personIds: string[];
  personNames: string[];
  humanRoute: string;
  overallPriorityIndex: number;
  relationshipCredibility: number;
  temporalFreshness: number;
  confirmationReadiness: number;
  pathEfficiency: number;
  relationshipHopCount: number;
  intermediaryCount: number;
  confirmationRequiredHopCount: number;
  bottleneckRelationshipId?: string;
  whyPreferred: string[];
  comparisonSummary: string;
  steps: RouteStepExplanation[];
  weakestLink?: RouteWeakestLink;
  activationPlan: PathActivationPlan;
}

export interface PathwayExplanation {
  executionStatus: PathwayExplanationExecutionStatus;
  targetInvestorId: string;
  disposition: PathwayExplanationDisposition;
  targetPersonDecision: TargetPersonDecisionExplanation;
  preferredRoute?: PreferredRouteExplanation;
  recommendedPathId?: string;
  topRoutePathIds: string[];
  alternativeRoutes: AlternativeRouteComparison[];
  rejectedRoutesToPrimaryTarget: RejectedRouteExplanation[];
  activationPlan: PathActivationPlan;
  errors: string[];
}

