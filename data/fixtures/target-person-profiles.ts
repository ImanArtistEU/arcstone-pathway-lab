import { TargetPersonProfile } from "@/types/pathway";

/**
 * Synthetic target-person investment profiles for Arcstone Pathway Intelligence Lab demo.
 *
 * NOTE: These profiles represent structured input research context for candidate target people.
 * They are intentionally fictional/synthetic and separate from the PathwayDataset graph model.
 */
export const targetPersonDemoProfiles: TargetPersonProfile[] = [
  // Sarah Chen (Horizon Ventures)
  {
    targetInvestorId: "target-horizon",
    personId: "person-vc-sarah",
    roleTitle: "General Partner",
    investmentRole: "lead_investor",
    stageFocus: ["Seed", "Series A"],
    sectorFocus: ["Enterprise Software"],
    geographyFocus: ["United States", "global"],
    observedAt: "2026-09-01",
    sourceName: "Horizon Ventures Official Website",
    sourceUrl: "https://horizon-vc-example.com/team/sarah-chen",
  },
  // David Miller (Beacon Capital)
  {
    targetInvestorId: "target-beacon",
    personId: "person-vc-david",
    roleTitle: "Partner",
    investmentRole: "lead_investor",
    stageFocus: ["Seed"],
    sectorFocus: ["Enterprise Software"],
    geographyFocus: ["global"],
    observedAt: "2026-09-01",
    sourceName: "Beacon Capital Official Website",
    sourceUrl: "https://beacon-cap-example.com/team/david-miller",
  },
  // Clara Oswald (Summit Ridge Capital)
  {
    targetInvestorId: "target-summit",
    personId: "person-vc-clara",
    roleTitle: "Partner",
    investmentRole: "lead_investor",
    stageFocus: ["Seed"],
    sectorFocus: ["Enterprise Software"],
    geographyFocus: ["global"],
    observedAt: "2026-09-01",
    sourceName: "Summit Ridge Capital Official Website",
    sourceUrl: "https://summit-ridge-example.com/team/clara-oswald",
  },
  // Isabel Torres (Aurora Global Ventures)
  {
    targetInvestorId: "target-aurora",
    personId: "person-vc-isabel",
    roleTitle: "Managing Partner",
    investmentRole: "lead_investor",
    stageFocus: ["Seed"],
    sectorFocus: ["Enterprise Software"],
    geographyFocus: ["global"],
    observedAt: "2026-09-01",
    sourceName: "Aurora Global Ventures Official Website",
    sourceUrl: "https://aurora-global-example.com/team/isabel-torres",
  },
];
