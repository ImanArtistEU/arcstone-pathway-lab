import { PathwayDataset } from "@/types/pathway";

/**
 * Synthetic Pathway Intelligence Demo Dataset
 *
 * Current project date context: September 2026.
 *
 * Fictional startup, founders, investors, and network relationships demonstrating:
 * - CASE A: Current strong route (Founder Elena <-> Advisor Marcus <-> VC Partner Sarah with active 2026 evidence)
 *           Direction semantic: Marcus (Advisor) -> Elena (advised Person), directed
 * - CASE B: Recent LinkedIn-only connection (Founder Elena <-> VC Partner David with 2026 LinkedIn link only)
 * - CASE C: Stale historical connection (Founder Elena <-> Colleague Tom <-> Investor Clara with 2015-2019 dates)
 * - CASE D: No known path (Target investor Isabel / Aurora with 2026 presence, but 0 paths from founder)
 */
export const pathwayDemoDataset: PathwayDataset = {
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
      website: "https://nexus-ai-example.com",
      geography: "San Francisco, CA",
    },
    {
      id: "org-horizon-vc",
      name: "Horizon Ventures",
      type: "vc_fund",
      website: "https://horizon-vc-example.com",
      geography: "San Francisco, CA",
    },
    {
      id: "org-beacon-cap",
      name: "Beacon Capital",
      type: "vc_fund",
      website: "https://beacon-cap-example.com",
      geography: "Menlo Park, CA",
    },
    {
      id: "org-summit-partners",
      name: "Summit Ridge Capital",
      type: "vc_fund",
      website: "https://summit-ridge-example.com",
      geography: "New York, NY",
    },
    {
      id: "org-aurora-ventures",
      name: "Aurora Global Ventures",
      type: "vc_fund",
      website: "https://aurora-global-example.com",
      geography: "Boston, MA",
    },
    {
      id: "org-stellar-advisory",
      name: "Stellar Strategic Advisory",
      type: "advisory_firm",
      website: "https://stellar-advisory-example.com",
      geography: "San Francisco, CA",
    },
    {
      id: "org-acme-corp",
      name: "Acme Legacy Software",
      type: "corporate",
      website: "https://acme-legacy-example.com",
      geography: "San Jose, CA",
    },
  ],

  people: [
    {
      id: "person-founder-elena",
      firstName: "Elena",
      lastName: "Vance",
      fullName: "Elena Vance",
      linkedinUrl: "https://linkedin.example.com/in/elena-vance-nexus",
      currentOrganizationIds: ["org-nexus"],
      location: "San Francisco, CA",
    },
    {
      id: "person-advisor-marcus",
      firstName: "Marcus",
      lastName: "Thorne",
      fullName: "Marcus Thorne",
      linkedinUrl: "https://linkedin.example.com/in/marcus-thorne-advisor",
      currentOrganizationIds: ["org-stellar-advisory"],
      location: "San Francisco, CA",
    },
    {
      id: "person-vc-sarah",
      firstName: "Sarah",
      lastName: "Chen",
      fullName: "Sarah Chen",
      linkedinUrl: "https://linkedin.example.com/in/sarah-chen-horizon",
      currentOrganizationIds: ["org-horizon-vc"],
      location: "San Francisco, CA",
    },
    {
      id: "person-vc-david",
      firstName: "David",
      lastName: "Miller",
      fullName: "David Miller",
      linkedinUrl: "https://linkedin.example.com/in/david-miller-beacon",
      currentOrganizationIds: ["org-beacon-cap"],
      location: "Menlo Park, CA",
    },
    {
      id: "person-colleague-tom",
      firstName: "Tom",
      lastName: "Reynolds",
      fullName: "Tom Reynolds",
      linkedinUrl: "https://linkedin.example.com/in/tom-reynolds-dev",
      currentOrganizationIds: ["org-acme-corp"],
      location: "San Jose, CA",
    },
    {
      id: "person-vc-clara",
      firstName: "Clara",
      lastName: "Oswald",
      fullName: "Clara Oswald",
      linkedinUrl: "https://linkedin.example.com/in/clara-oswald-summit",
      currentOrganizationIds: ["org-summit-partners"],
      location: "New York, NY",
    },
    {
      id: "person-vc-isabel",
      firstName: "Isabel",
      lastName: "Torres",
      fullName: "Isabel Torres",
      linkedinUrl: "https://linkedin.example.com/in/isabel-torres-aurora",
      currentOrganizationIds: ["org-aurora-ventures"],
      location: "Boston, MA",
    },
  ],

  relationships: [
    // Founder -> Startup
    {
      id: "rel-founder-nexus",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "organization", id: "org-nexus" },
      type: "founder_of",
      direction: "directed",
      evidenceIds: ["ev-founder-nexus-web"],
      startedAt: "2023-01-01",
      lastObservedAt: "2026-09-01",
    },

    // CASE A: Strong Route
    // Semantic direction: Advisor Marcus -> advised Person Elena (directed)
    {
      id: "rel-elena-marcus",
      from: { type: "person", id: "person-advisor-marcus" },
      to: { type: "person", id: "person-founder-elena" },
      type: "advisor",
      direction: "directed",
      evidenceIds: [
        "ev-elena-marcus-agreement",
        "ev-elena-marcus-website",
        "ev-elena-marcus-meetings",
      ],
      startedAt: "2023-01-15",
      lastObservedAt: "2026-09-01",
    },
    // Advisor Marcus <-> VC Partner Sarah (co_invested is bidirectional)
    {
      id: "rel-marcus-sarah",
      from: { type: "person", id: "person-advisor-marcus" },
      to: { type: "person", id: "person-vc-sarah" },
      type: "co_invested",
      direction: "bidirectional",
      evidenceIds: [
        "ev-marcus-sarah-press",
        "ev-marcus-sarah-board",
        "ev-marcus-sarah-email",
      ],
      startedAt: "2021-06-01",
      lastObservedAt: "2026-08-15",
    },
    // VC Partner Sarah -> Horizon Ventures (works_at is directed)
    {
      id: "rel-sarah-horizon",
      from: { type: "person", id: "person-vc-sarah" },
      to: { type: "organization", id: "org-horizon-vc" },
      type: "works_at",
      direction: "directed",
      evidenceIds: ["ev-sarah-horizon-website"],
      startedAt: "2020-01-01",
      lastObservedAt: "2026-09-01",
    },

    // CASE B: LinkedIn-only Connection
    // Founder Elena <-> VC Partner David (linkedin_connection is bidirectional)
    {
      id: "rel-elena-david",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-vc-david" },
      type: "linkedin_connection",
      direction: "bidirectional",
      evidenceIds: ["ev-elena-david-linkedin"],
      startedAt: "2026-02-10",
      lastObservedAt: "2026-08-01",
    },
    // VC Partner David -> Beacon Capital
    {
      id: "rel-david-beacon",
      from: { type: "person", id: "person-vc-david" },
      to: { type: "organization", id: "org-beacon-cap" },
      type: "works_at",
      direction: "directed",
      evidenceIds: ["ev-david-beacon-website"],
      startedAt: "2022-03-01",
      lastObservedAt: "2026-09-01",
    },

    // CASE C: Stale / Weak Historical Connection (Old dates preserved)
    // Founder Elena <-> Former Colleague Tom
    {
      id: "rel-elena-tom",
      from: { type: "person", id: "person-founder-elena" },
      to: { type: "person", id: "person-colleague-tom" },
      type: "former_colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-elena-tom-pastwork"],
      startedAt: "2017-03-01",
      endedAt: "2019-08-31",
      lastObservedAt: "2019-08-31",
    },
    // Former Colleague Tom <-> VC Partner Clara
    {
      id: "rel-tom-clara",
      from: { type: "person", id: "person-colleague-tom" },
      to: { type: "person", id: "person-vc-clara" },
      type: "former_colleague",
      direction: "bidirectional",
      evidenceIds: ["ev-tom-clara-pastwork"],
      startedAt: "2015-01-15",
      endedAt: "2016-05-30",
      lastObservedAt: "2016-05-30",
    },
    // VC Partner Clara -> Summit Ridge Capital
    {
      id: "rel-clara-summit",
      from: { type: "person", id: "person-vc-clara" },
      to: { type: "organization", id: "org-summit-partners" },
      type: "works_at",
      direction: "directed",
      evidenceIds: ["ev-clara-summit-website"],
      startedAt: "2021-09-01",
      lastObservedAt: "2026-09-01",
    },

    // CASE D: No Known Path
    // VC Partner Isabel -> Aurora Global Ventures (active affiliation in 2026, no path from founder)
    {
      id: "rel-isabel-aurora",
      from: { type: "person", id: "person-vc-isabel" },
      to: { type: "organization", id: "org-aurora-ventures" },
      type: "works_at",
      direction: "directed",
      evidenceIds: ["ev-isabel-aurora-website"],
      startedAt: "2019-04-01",
      lastObservedAt: "2026-09-01",
    },
  ],

  relationshipEvidence: [
    // Startup founder evidence
    {
      id: "ev-founder-nexus-web",
      relationshipId: "rel-founder-nexus",
      type: "company_website",
      description: "Elena Vance listed as Founder & CEO on Nexus AI website",
      observedAt: "2026-09-01",
      sourceUrl: "https://nexus-ai-example.com/about",
      sourceName: "Nexus AI Official Website",
    },

    // Case A: Strong Route Evidence (Current 2026 observations corroborating active relationship)
    {
      id: "ev-elena-marcus-agreement",
      relationshipId: "rel-elena-marcus",
      type: "crm_history",
      description: "Signed formal advisory and equity agreement logged in internal records",
      observedAt: "2023-01-15",
      sourceName: "Founder CRM Records",
    },
    {
      id: "ev-elena-marcus-website",
      relationshipId: "rel-elena-marcus",
      type: "company_website",
      description: "Marcus Thorne actively listed as Strategic Advisor on Nexus AI team page as of September 2026",
      observedAt: "2026-09-01",
      sourceUrl: "https://nexus-ai-example.com/team",
      sourceName: "Nexus AI Official Website",
    },
    {
      id: "ev-elena-marcus-meetings",
      relationshipId: "rel-elena-marcus",
      type: "meeting_history",
      description: "Recurring monthly strategic advisory sessions held across 2023-2026, with most recent session logged September 2026",
      observedAt: "2026-09-10",
      sourceName: "Google Calendar Sync Logs",
    },
    {
      id: "ev-marcus-sarah-press",
      relationshipId: "rel-marcus-sarah",
      type: "press_release",
      description: "Joint lead syndicate investment in DataFleet Series Seed announced publicly in June 2021",
      observedAt: "2021-06-01",
      sourceUrl: "https://prnewswire.example.com/datafleet-seed-round",
      sourceName: "PR Newswire Syndicate Release",
    },
    {
      id: "ev-marcus-sarah-board",
      relationshipId: "rel-marcus-sarah",
      type: "portfolio_page",
      description: "Both Marcus Thorne and Sarah Chen listed as active board observers on DataFleet portfolio page as of August 2026",
      observedAt: "2026-08-15",
      sourceUrl: "https://datafleet-example.com/investors",
      sourceName: "DataFleet Governance Page",
    },
    {
      id: "ev-marcus-sarah-email",
      relationshipId: "rel-marcus-sarah",
      type: "email_history",
      description: "Synthetic test fixture: Direct email thread between Marcus Thorne and Sarah Chen coordinating on DataFleet board and governance in August 2026",
      observedAt: "2026-08-20",
      sourceName: "DataFleet Governance Email Archive (Synthetic Fixture)",
    },
    {
      id: "ev-sarah-horizon-website",
      relationshipId: "rel-sarah-horizon",
      type: "company_website",
      description: "Sarah Chen listed as General Partner at Horizon Ventures as of September 2026",
      observedAt: "2026-09-01",
      sourceUrl: "https://horizon-vc-example.com/team/sarah-chen",
      sourceName: "Horizon Ventures Website",
    },

    // Case B: LinkedIn-only Connection Evidence (Recent 2026 observation, but solitary weak signal)
    {
      id: "ev-elena-david-linkedin",
      relationshipId: "rel-elena-david",
      type: "linkedin",
      description: "1st degree connection on LinkedIn observed August 2026 with no message exchange or joint interaction",
      observedAt: "2026-08-01",
      sourceUrl: "https://linkedin.example.com/in/david-miller-beacon",
      sourceName: "LinkedIn Network Export",
    },
    {
      id: "ev-david-beacon-website",
      relationshipId: "rel-david-beacon",
      type: "company_website",
      description: "David Miller listed as Partner at Beacon Capital as of September 2026",
      observedAt: "2026-09-01",
      sourceUrl: "https://beacon-cap-example.com/team/david-miller",
      sourceName: "Beacon Capital Website",
    },

    // Case C: Stale Historical Evidence (Preserved historical dates, no activity since 2016/2019)
    {
      id: "ev-elena-tom-pastwork",
      relationshipId: "rel-elena-tom",
      type: "public_profile",
      description: "Past employment as software engineers at Acme Legacy Software from March 2017 to August 2019",
      observedAt: "2019-08-31",
      sourceUrl: "https://linkedin.example.com/company/acme-legacy",
      sourceName: "Historical Resume Record",
    },
    {
      id: "ev-tom-clara-pastwork",
      relationshipId: "rel-tom-clara",
      type: "user_reported",
      description: "Colleagues in engineering group from Jan 2015 to May 2016; no contact since May 2016",
      observedAt: "2016-05-30",
      sourceName: "Founder Survey Response",
    },
    {
      id: "ev-clara-summit-website",
      relationshipId: "rel-clara-summit",
      type: "company_website",
      description: "Clara Oswald listed as Partner at Summit Ridge Capital as of September 2026",
      observedAt: "2026-09-01",
      sourceUrl: "https://summit-ridge-example.com/team/clara-oswald",
      sourceName: "Summit Ridge Capital Website",
    },

    // Case D: Target Investor Affiliation Evidence (Active in 2026, but zero path to founder)
    {
      id: "ev-isabel-aurora-website",
      relationshipId: "rel-isabel-aurora",
      type: "company_website",
      description: "Isabel Torres listed as Managing Partner at Aurora Global Ventures as of September 2026",
      observedAt: "2026-09-01",
      sourceUrl: "https://aurora-global-example.com/team/isabel-torres",
      sourceName: "Aurora Global Ventures Website",
    },
  ],

  campaigns: [
    {
      id: "camp-nexus-seed",
      startupId: "startup-nexus",
      founderPersonIds: ["person-founder-elena"],
      round: "Seed",
      status: "active",
      createdAt: "2026-09-01T00:00:00Z",
    },
  ],

  targetInvestors: [
    // CASE A Target: Horizon Ventures via VC Partner Sarah Chen
    {
      id: "target-horizon",
      campaignId: "camp-nexus-seed",
      investorOrganizationId: "org-horizon-vc",
      candidatePersonIds: ["person-vc-sarah"],
      status: "ready",
    },
    // CASE B Target: Beacon Capital via VC Partner David Miller (LinkedIn connection only)
    {
      id: "target-beacon",
      campaignId: "camp-nexus-seed",
      investorOrganizationId: "org-beacon-cap",
      candidatePersonIds: ["person-vc-david"],
      status: "ready",
    },
    // CASE C Target: Summit Ridge Capital via VC Partner Clara Oswald (Stale historical route)
    {
      id: "target-summit",
      campaignId: "camp-nexus-seed",
      investorOrganizationId: "org-summit-partners",
      candidatePersonIds: ["person-vc-clara"],
      status: "ready",
    },
    // CASE D Target: Aurora Global Ventures via VC Partner Isabel Torres (No known path / cold outreach required)
    {
      id: "target-aurora",
      campaignId: "camp-nexus-seed",
      investorOrganizationId: "org-aurora-ventures",
      candidatePersonIds: ["person-vc-isabel"],
      status: "ready",
    },
  ],
};
