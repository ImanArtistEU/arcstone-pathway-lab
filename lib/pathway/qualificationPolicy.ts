import {
  RelationshipClass,
  RelationshipType,
  EvidenceCategory,
  RelationshipEvidenceType,
} from "@/types/pathway";

/**
 * QualificationPolicy Configuration
 *
 * Centralized policy thresholds for relationship qualification.
 *
 * IMPORTANT PRODUCT NOTE:
 * These thresholds (<= 365 days for recent, 366-730 days for aging, > 730 days for stale)
 * are working prototype PRODUCT HYPOTHESES, not established scientific truths.
 * In production, they must be continuously calibrated against real-world founder feedback
 * and actual introduction conversion outcomes (reply rates, meetings booked).
 */
export interface QualificationPolicy {
  /** Maximum elapsed days from referenceDate to consider an interaction recent (default: 365) */
  recentMaxDays: number;
  /** Maximum elapsed days from referenceDate to consider an interaction aging (default: 730) */
  agingMaxDays: number;
}

export const DEFAULT_QUALIFICATION_POLICY: QualificationPolicy = {
  recentMaxDays: 365,
  agingMaxDays: 730,
};

/**
 * Classifies a raw RelationshipType into its semantic RelationshipClass.
 *
 * - structural: Formal organizational or economic ties that provide context but are not interpersonal introduction edges.
 * - interpersonal: Direct human connections (advisors, colleagues, mentors) capable of supporting introductions.
 * - network_signal: Proximity or co-occurrence indicators (LinkedIn links, co-investments) that require corroborating evidence.
 */
export function classifyRelationshipType(type: RelationshipType): RelationshipClass {
  switch (type) {
    case "works_at":
    case "worked_at":
    case "founder_of":
    case "invested_in":
    case "board_member":
    case "portfolio_founder":
      return "structural";

    case "advisor":
    case "mentor":
    case "colleague":
    case "former_colleague":
    case "introduced":
    case "known_personally":
      return "interpersonal";

    case "linkedin_connection":
    case "co_invested":
    case "accelerator_cohort":
    case "university_connection":
    case "event_connection":
    case "other":
    default:
      return "network_signal";
  }
}

/**
 * Classifies a discrete RelationshipEvidenceType into an EvidenceCategory.
 *
 * - direct_interaction: Proven two-way communication (emails, meetings).
 * - founder_asserted: First-party recorded internal knowledge (CRM, user survey).
 * - public_context: Publicly verifiable directories, press releases, articles.
 * - platform_signal: Social graph connection states (LinkedIn connections).
 */
export function classifyEvidenceType(type: RelationshipEvidenceType): EvidenceCategory {
  switch (type) {
    case "email_history":
    case "meeting_history":
      return "direct_interaction";

    case "user_reported":
    case "crm_history":
      return "founder_asserted";

    case "company_website":
    case "portfolio_page":
    case "press_release":
    case "news_article":
    case "public_profile":
    case "event_page":
    case "manual_research":
    case "other":
      return "public_context";

    case "linkedin":
      return "platform_signal";

    default:
      return "public_context";
  }
}
