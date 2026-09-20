import { PathwayDataset } from "@/types/pathway";

/**
 * Multi-Bridge Demo Fixture (Batch 9)
 *
 * Demonstrates deterministic bridge discovery and ranking when multiple
 * founder network anchors connect to the same target investor (Sarah Chen).
 *
 * Anchors:
 * 1. Marcus Thorne (Strategic Advisor): Verified relationship + shared board signal with Sarah Chen
 * 2. Priya Patel (Portfolio Founder): Asserted relationship + co-investment signal with Sarah Chen
 * 3. Ahmed Al-Mansoor (Angel Investor): Stale relationship + accelerator overlap signal with Sarah Chen
 */
export const bridgeDemoDataset: PathwayDataset = {
  startups: [
    {
      id: "startup-nexus",
      name: "Nexus AI",
      website: "https://nexus-ai-example.com",
      geography: "San Francisco, CA",
      sector: "Enterprise Software",
      stage: "Seed",
    },
  ],

  organizations: [
    {
      id: "org-nexus",
      name: "Nexus AI",
      type: "startup",
    },
    {
      id: "org-horizon-vc",
      name: "Horizon Ventures",
      type: "vc_fund",
    },
    {
      id: "org-stellar-advisory",
      name: "Stellar Advisory",
      type: "advisory_firm",
    },
  ],

  people: [
    {
      id: "person-founder-elena",
      firstName: "Elena",
      lastName: "Vance",
      fullName: "Elena Vance",
      currentOrganizationIds: ["org-nexus"],
    },
    {
      id: "person-advisor-marcus",
      firstName: "Marcus",
      lastName: "Thorne",
      fullName: "Marcus Thorne",
      currentOrganizationIds: ["org-stellar-advisory"],
    },
    {
      id: "person-founder-priya",
      firstName: "Priya",
      lastName: "Patel",
      fullName: "Priya Patel",
      currentOrganizationIds: ["org-nexus"],
    },
    {
      id: "person-angel-ahmed",
      firstName: "Ahmed",
      lastName: "Al-Mansoor",
      fullName: "Ahmed Al-Mansoor",
      currentOrganizationIds: [],
    },
    {
      id: "person-vc-sarah",
      firstName: "Sarah",
      lastName: "Chen",
      fullName: "Sarah Chen",
      currentOrganizationIds: ["org-horizon-vc"],
    },
  ],

  relationships: [
    // Elena <-> Marcus (Advisor, Verified)
    {
      id: "rel-elena-marcus",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-advisor-marcus" },
      type: "advisor",
      direction: "bidirectional",
      evidenceIds: ["ev-elena-marcus-cal"],
      lastObservedAt: "2026-08-15",
    },
    // Elena <-> Priya (Co-founder, Asserted)
    {
      id: "rel-elena-priya",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-founder-priya" },
      type: "known_personally",
      direction: "bidirectional",
      evidenceIds: ["ev-elena-priya-user"],
      lastObservedAt: "2026-07-01",
    },
    // Elena <-> Ahmed (Angel, Stale)
    {
      id: "rel-elena-ahmed",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-angel-ahmed" },
      type: "advisor",
      direction: "bidirectional",
      evidenceIds: ["ev-elena-ahmed-old"],
      lastObservedAt: "2023-05-01",
    },
  ],

  relationshipEvidence: [
    {
      id: "ev-elena-marcus-cal",
      relationshipId: "rel-elena-marcus",
      type: "meeting_history",
      description: "Biweekly strategic advisory meeting",
      provenance: {
        accessClass: "first_party_private",
        sourceSystem: "google_calendar",
        sourcePrincipalPersonId: "person-founder-elena",
      },
      interaction: {
        occurredAt: "2026-08-15",
        reciprocity: "two_way",
        status: "confirmed",
      },
    },
    {
      id: "ev-elena-priya-user",
      relationshipId: "rel-elena-priya",
      type: "user_reported",
      description: "Co-founder reported personal relationship",
      provenance: {
        accessClass: "user_asserted",
        sourceSystem: "manual",
        sourcePrincipalPersonId: "person-founder-elena",
      },
    },
    {
      id: "ev-elena-ahmed-old",
      relationshipId: "rel-elena-ahmed",
      type: "meeting_history",
      description: "Angel sync meeting in 2023",
      provenance: {
        accessClass: "first_party_private",
        sourceSystem: "google_calendar",
        sourcePrincipalPersonId: "person-founder-elena",
      },
      interaction: {
        occurredAt: "2023-05-01",
        reciprocity: "two_way",
        status: "confirmed",
      },
    },
  ],

  proximitySignals: [
    {
      id: "sig-marcus-sarah-board",
      personAId: "person-advisor-marcus",
      personBId: "person-vc-sarah",
      type: "shared_board",
      evidenceIds: ["ev-pub-board"],
      occurredAt: "2026-06-01",
    },
    {
      id: "sig-priya-sarah-deal",
      personAId: "person-founder-priya",
      personBId: "person-vc-sarah",
      type: "co_invested_same_deal",
      evidenceIds: ["ev-pub-deal"],
      occurredAt: "2026-01-15",
    },
    {
      id: "sig-ahmed-sarah-accel",
      personAId: "person-angel-ahmed",
      personBId: "person-vc-sarah",
      type: "accelerator_overlap",
      evidenceIds: ["ev-pub-accel"],
      occurredAt: "2024-03-01",
    },
  ],

  campaigns: [
    {
      id: "campaign-nexus-seed",
      startupId: "startup-nexus",
      founderPersonIds: ["person-founder-elena"],
      round: "Seed",
      status: "active",
      createdAt: "2026-01-01",
    },
  ],

  targetInvestors: [
    {
      id: "target-horizon",
      campaignId: "campaign-nexus-seed",
      investorOrganizationId: "org-horizon-vc",
      candidatePersonIds: ["person-vc-sarah"],
      status: "ready",
    },
  ],
};
