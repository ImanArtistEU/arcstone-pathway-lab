import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import {
  PathwayDataset,
  Startup,
  FundraisingCampaign,
  Organization,
  Person,
  TargetInvestor,
  Relationship,
  RelationshipEvidence,
  TargetPersonProfile,
  OrganizationType,
  RelationshipType,
  RelationshipDirection,
  RelationshipEvidenceType,
  InteractionReciprocity,
  InteractionStatus,
  CampaignStatus,
  TargetInvestorStatus,
  TargetPersonInvestmentRole,
} from "@/types/pathway";
import { assertDatasetIntegrity } from "@/lib/pathway/assertDatasetIntegrity";

export type PilotBundleLoadStatus = "success" | "error";

export interface PilotBundleError {
  file: string;
  row?: number;
  field?: string;
  code: string;
  message: string;
}

export interface PilotBundleLoadResult {
  status: PilotBundleLoadStatus;
  dataset?: PathwayDataset;
  targetPersonProfiles?: TargetPersonProfile[];
  errors: PilotBundleError[];
  warnings: string[];
}

const VALID_ORGANIZATION_TYPES: OrganizationType[] = [
  "startup",
  "vc_fund",
  "angel_group",
  "accelerator",
  "corporate",
  "university",
  "advisory_firm",
  "other",
];

const VALID_RELATIONSHIP_TYPES: RelationshipType[] = [
  "linkedin_connection",
  "works_at",
  "worked_at",
  "founder_of",
  "invested_in",
  "board_member",
  "advisor",
  "mentor",
  "colleague",
  "former_colleague",
  "co_invested",
  "introduced",
  "portfolio_founder",
  "accelerator_cohort",
  "university_connection",
  "event_connection",
  "known_personally",
  "other",
];

const VALID_RELATIONSHIP_DIRECTIONS: RelationshipDirection[] = [
  "directed",
  "bidirectional",
];

const VALID_EVIDENCE_TYPES: RelationshipEvidenceType[] = [
  "linkedin",
  "company_website",
  "portfolio_page",
  "press_release",
  "news_article",
  "public_profile",
  "event_page",
  "user_reported",
  "crm_history",
  "email_history",
  "meeting_history",
  "manual_research",
  "other",
];

const VALID_RECIPROCITIES: InteractionReciprocity[] = ["two_way", "one_way", "unknown"];
const VALID_INTERACTION_STATUSES: InteractionStatus[] = ["confirmed", "unconfirmed"];

const VALID_CAMPAIGN_STATUSES: CampaignStatus[] = [
  "preparing",
  "active",
  "paused",
  "closed",
];

const VALID_TARGET_INVESTOR_STATUSES: TargetInvestorStatus[] = [
  "unreviewed",
  "researching",
  "ready",
  "contacted",
  "passed",
  "responded",
];

const VALID_INVESTMENT_ROLES: TargetPersonInvestmentRole[] = [
  "lead_investor",
  "investment_team",
  "sourcing",
  "unknown",
  "non_investment",
];

function parsePipeList(
  raw: string | undefined,
  fieldName: string,
  file: string,
  row?: number,
  allowDuplicates = false
): { values: string[]; error?: PilotBundleError } {
  if (!raw || raw.trim().length === 0) {
    return { values: [] };
  }

  const parts = raw.split("|");
  const result: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) {
      return {
        values: [],
        error: {
          file,
          row,
          field: fieldName,
          code: "EMPTY_PIPE_ITEM",
          message: `Empty item detected in pipe-delimited list for field "${fieldName}".`,
        },
      };
    }
    if (!allowDuplicates && seen.has(trimmed)) {
      return {
        values: [],
        error: {
          file,
          row,
          field: fieldName,
          code: "DUPLICATE_PIPE_ITEM",
          message: `Duplicate item "${trimmed}" in pipe-delimited field "${fieldName}".`,
        },
      };
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return { values: result };
}

function validateDateField(
  raw: string | undefined,
  fieldName: string,
  file: string,
  row?: number,
  required = false
): { value?: string; error?: PilotBundleError } {
  if (!raw || raw.trim().length === 0) {
    if (required) {
      return {
        error: {
          file,
          row,
          field: fieldName,
          code: "MISSING_REQUIRED_FIELD",
          message: `Required date field "${fieldName}" is missing or empty.`,
        },
      };
    }
    return { value: undefined };
  }

  const trimmed = raw.trim();
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) {
    return {
      error: {
        file,
        row,
        field: fieldName,
        code: "INVALID_DATE",
        message: `Field "${fieldName}" contains invalid date string "${trimmed}".`,
      },
    };
  }

  return { value: trimmed };
}

function parseCsvFile<T extends Record<string, string>>(
  dirPath: string,
  filename: string,
  errors: PilotBundleError[]
): T[] | undefined {
  const filePath = path.join(dirPath, filename);
  if (!fs.existsSync(filePath)) {
    errors.push({
      file: filename,
      code: "FILE_NOT_FOUND",
      message: `Required CSV file "${filename}" not found in directory "${dirPath}".`,
    });
    return undefined;
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as T[];
    return records;
  } catch (err: unknown) {
    errors.push({
      file: filename,
      code: "CSV_PARSE_ERROR",
      message: `Failed to parse CSV file "${filename}": ${err instanceof Error ? err.message : String(err)}`,
    });
    return undefined;
  }
}

export function loadPilotCsvBundle(dirPath: string): PilotBundleLoadResult {
  const errors: PilotBundleError[] = [];
  const warnings: string[] = [];

  const startupRows = parseCsvFile<Record<string, string>>(dirPath, "startup.csv", errors);
  const campaignRows = parseCsvFile<Record<string, string>>(dirPath, "campaign.csv", errors);
  const orgRows = parseCsvFile<Record<string, string>>(dirPath, "organizations.csv", errors);
  const peopleRows = parseCsvFile<Record<string, string>>(dirPath, "people.csv", errors);
  const targetRows = parseCsvFile<Record<string, string>>(dirPath, "targets.csv", errors);
  const relRows = parseCsvFile<Record<string, string>>(dirPath, "relationships.csv", errors);
  const evidenceRows = parseCsvFile<Record<string, string>>(dirPath, "evidence.csv", errors);
  const profileRows = parseCsvFile<Record<string, string>>(
    dirPath,
    "target-person-profiles.csv",
    errors
  );

  if (errors.length > 0) {
    return { status: "error", errors, warnings };
  }

  // 1. Parse Startups
  const startups: Startup[] = [];
  for (let i = 0; i < (startupRows?.length || 0); i++) {
    const row = startupRows![i];
    const rNum = i + 2;

    const startupId = row.startupId?.trim();
    const name = row.name?.trim();
    if (!startupId) {
      errors.push({ file: "startup.csv", row: rNum, field: "startupId", code: "MISSING_REQUIRED_FIELD", message: "startupId is required." });
    }
    if (!name) {
      errors.push({ file: "startup.csv", row: rNum, field: "name", code: "MISSING_REQUIRED_FIELD", message: "name is required." });
    }

    if (startupId && name) {
      startups.push({
        id: startupId,
        name,
        website: row.website?.trim() || undefined,
        geography: row.geography?.trim() || undefined,
        sector: row.sector?.trim() || undefined,
        stage: row.stage?.trim() || undefined,
      });
    }
  }

  // 2. Parse Campaigns
  const campaigns: FundraisingCampaign[] = [];
  for (let i = 0; i < (campaignRows?.length || 0); i++) {
    const row = campaignRows![i];
    const rNum = i + 2;

    const campaignId = row.campaignId?.trim();
    const startupId = row.startupId?.trim();
    const round = row.round?.trim() || undefined;
    const statusRaw = row.status?.trim();
    const createdAtRes = validateDateField(row.createdAt, "createdAt", "campaign.csv", rNum, true);

    if (!campaignId) {
      errors.push({ file: "campaign.csv", row: rNum, field: "campaignId", code: "MISSING_REQUIRED_FIELD", message: "campaignId is required." });
    }
    if (!startupId) {
      errors.push({ file: "campaign.csv", row: rNum, field: "startupId", code: "MISSING_REQUIRED_FIELD", message: "startupId is required." });
    }
    if (createdAtRes.error) {
      errors.push(createdAtRes.error);
    }

    if (statusRaw && !VALID_CAMPAIGN_STATUSES.includes(statusRaw as CampaignStatus)) {
      errors.push({ file: "campaign.csv", row: rNum, field: "status", code: "INVALID_ENUM", message: `Invalid campaign status "${statusRaw}".` });
    }

    if (campaignId && startupId && createdAtRes.value) {
      campaigns.push({
        id: campaignId,
        startupId,
        founderPersonIds: [], // populated after people parse
        round: round || "",
        status: (statusRaw as CampaignStatus) || "active",
        createdAt: createdAtRes.value,
      });
    }
  }

  // 3. Parse Organizations
  const organizations: Organization[] = [];
  for (let i = 0; i < (orgRows?.length || 0); i++) {
    const row = orgRows![i];
    const rNum = i + 2;

    const organizationId = row.organizationId?.trim();
    const name = row.name?.trim();
    const typeRaw = row.type?.trim();

    if (!organizationId) {
      errors.push({ file: "organizations.csv", row: rNum, field: "organizationId", code: "MISSING_REQUIRED_FIELD", message: "organizationId is required." });
    }
    if (!name) {
      errors.push({ file: "organizations.csv", row: rNum, field: "name", code: "MISSING_REQUIRED_FIELD", message: "name is required." });
    }
    if (!typeRaw) {
      errors.push({ file: "organizations.csv", row: rNum, field: "type", code: "MISSING_REQUIRED_FIELD", message: "type is required." });
    } else if (!VALID_ORGANIZATION_TYPES.includes(typeRaw as OrganizationType)) {
      errors.push({ file: "organizations.csv", row: rNum, field: "type", code: "INVALID_ENUM", message: `Invalid organization type "${typeRaw}".` });
    }

    if (organizationId && name && typeRaw && VALID_ORGANIZATION_TYPES.includes(typeRaw as OrganizationType)) {
      organizations.push({
        id: organizationId,
        name,
        type: typeRaw as OrganizationType,
        website: row.website?.trim() || undefined,
        geography: row.geography?.trim() || undefined,
      });
    }
  }

  // 4. Parse People
  const people: Person[] = [];
  for (let i = 0; i < (peopleRows?.length || 0); i++) {
    const row = peopleRows![i];
    const rNum = i + 2;

    const personId = row.personId?.trim();
    const firstName = row.firstName?.trim();
    const lastName = row.lastName?.trim();
    const fullName = row.fullName?.trim();
    const orgsRes = parsePipeList(row.currentOrganizationIds, "currentOrganizationIds", "people.csv", rNum);

    if (!personId) {
      errors.push({ file: "people.csv", row: rNum, field: "personId", code: "MISSING_REQUIRED_FIELD", message: "personId is required." });
    }
    if (!firstName) {
      errors.push({ file: "people.csv", row: rNum, field: "firstName", code: "MISSING_REQUIRED_FIELD", message: "firstName is required." });
    }
    if (!lastName) {
      errors.push({ file: "people.csv", row: rNum, field: "lastName", code: "MISSING_REQUIRED_FIELD", message: "lastName is required." });
    }
    if (!fullName) {
      errors.push({ file: "people.csv", row: rNum, field: "fullName", code: "MISSING_REQUIRED_FIELD", message: "fullName is required." });
    }
    if (orgsRes.error) {
      errors.push(orgsRes.error);
    }

    if (personId && firstName && lastName && fullName) {
      people.push({
        id: personId,
        firstName,
        lastName,
        fullName,
        linkedinUrl: row.linkedinUrl?.trim() || undefined,
        currentOrganizationIds: orgsRes.values,
        location: row.location?.trim() || undefined,
      });
    }
  }

  // 5. Parse Targets
  const targetInvestors: TargetInvestor[] = [];
  for (let i = 0; i < (targetRows?.length || 0); i++) {
    const row = targetRows![i];
    const rNum = i + 2;

    const targetInvestorId = row.targetInvestorId?.trim();
    const campaignId = row.campaignId?.trim();
    const investorOrganizationId = row.investorOrganizationId?.trim();
    const statusRaw = row.status?.trim();
    const candidateRes = parsePipeList(row.candidatePersonIds, "candidatePersonIds", "targets.csv", rNum);

    if (!targetInvestorId) {
      errors.push({ file: "targets.csv", row: rNum, field: "targetInvestorId", code: "MISSING_REQUIRED_FIELD", message: "targetInvestorId is required." });
    }
    if (!campaignId) {
      errors.push({ file: "targets.csv", row: rNum, field: "campaignId", code: "MISSING_REQUIRED_FIELD", message: "campaignId is required." });
    }
    if (!investorOrganizationId) {
      errors.push({ file: "targets.csv", row: rNum, field: "investorOrganizationId", code: "MISSING_REQUIRED_FIELD", message: "investorOrganizationId is required." });
    }
    if (statusRaw && !VALID_TARGET_INVESTOR_STATUSES.includes(statusRaw as TargetInvestorStatus)) {
      errors.push({ file: "targets.csv", row: rNum, field: "status", code: "INVALID_ENUM", message: `Invalid target investor status "${statusRaw}".` });
    }
    if (candidateRes.error) {
      errors.push(candidateRes.error);
    }

    if (targetInvestorId && campaignId && investorOrganizationId) {
      targetInvestors.push({
        id: targetInvestorId,
        campaignId,
        investorOrganizationId,
        candidatePersonIds: candidateRes.values,
        status: (statusRaw as TargetInvestorStatus) || "ready",
      });
    }
  }

  // 6. Parse Relationships
  const relationships: Relationship[] = [];
  for (let i = 0; i < (relRows?.length || 0); i++) {
    const row = relRows![i];
    const rNum = i + 2;

    const relationshipId = row.relationshipId?.trim();
    const fromType = row.fromType?.trim();
    const fromId = row.fromId?.trim();
    const toType = row.toType?.trim();
    const toId = row.toId?.trim();
    const typeRaw = row.type?.trim();
    const dirRaw = row.direction?.trim();

    const evRes = parsePipeList(row.evidenceIds, "evidenceIds", "relationships.csv", rNum);
    const startRes = validateDateField(row.startedAt, "startedAt", "relationships.csv", rNum);
    const endRes = validateDateField(row.endedAt, "endedAt", "relationships.csv", rNum);
    const obsRes = validateDateField(row.lastObservedAt, "lastObservedAt", "relationships.csv", rNum);

    if (!relationshipId) errors.push({ file: "relationships.csv", row: rNum, field: "relationshipId", code: "MISSING_REQUIRED_FIELD", message: "relationshipId is required." });
    if (fromType !== "person" && fromType !== "organization") errors.push({ file: "relationships.csv", row: rNum, field: "fromType", code: "INVALID_ENUM", message: `Invalid fromType "${fromType}". Must be person or organization.` });
    if (!fromId) errors.push({ file: "relationships.csv", row: rNum, field: "fromId", code: "MISSING_REQUIRED_FIELD", message: "fromId is required." });
    if (toType !== "person" && toType !== "organization") errors.push({ file: "relationships.csv", row: rNum, field: "toType", code: "INVALID_ENUM", message: `Invalid toType "${toType}". Must be person or organization.` });
    if (!toId) errors.push({ file: "relationships.csv", row: rNum, field: "toId", code: "MISSING_REQUIRED_FIELD", message: "toId is required." });

    if (!typeRaw || !VALID_RELATIONSHIP_TYPES.includes(typeRaw as RelationshipType)) {
      errors.push({ file: "relationships.csv", row: rNum, field: "type", code: "INVALID_ENUM", message: `Invalid relationship type "${typeRaw}".` });
    }
    if (!dirRaw || !VALID_RELATIONSHIP_DIRECTIONS.includes(dirRaw as RelationshipDirection)) {
      errors.push({ file: "relationships.csv", row: rNum, field: "direction", code: "INVALID_ENUM", message: `Invalid relationship direction "${dirRaw}".` });
    }

    if (evRes.error) errors.push(evRes.error);
    if (startRes.error) errors.push(startRes.error);
    if (endRes.error) errors.push(endRes.error);
    if (obsRes.error) errors.push(obsRes.error);

    if (
      relationshipId &&
      (fromType === "person" || fromType === "organization") &&
      fromId &&
      (toType === "person" || toType === "organization") &&
      toId &&
      typeRaw &&
      VALID_RELATIONSHIP_TYPES.includes(typeRaw as RelationshipType) &&
      dirRaw &&
      VALID_RELATIONSHIP_DIRECTIONS.includes(dirRaw as RelationshipDirection)
    ) {
      relationships.push({
        id: relationshipId,
        from: { type: fromType, id: fromId },
        to: { type: toType, id: toId },
        type: typeRaw as RelationshipType,
        direction: dirRaw as RelationshipDirection,
        evidenceIds: evRes.values,
        startedAt: startRes.value,
        endedAt: endRes.value,
        lastObservedAt: obsRes.value,
      });
    }
  }

  // 7. Parse Evidence
  const relationshipEvidence: RelationshipEvidence[] = [];
  for (let i = 0; i < (evidenceRows?.length || 0); i++) {
    const row = evidenceRows![i];
    const rNum = i + 2;

    const evidenceId = row.evidenceId?.trim();
    const relationshipId = row.relationshipId?.trim();
    const typeRaw = row.type?.trim();
    const description = row.description?.trim();
    const obsRes = validateDateField(row.observedAt, "observedAt", "evidence.csv", rNum, true);

    if (!evidenceId) errors.push({ file: "evidence.csv", row: rNum, field: "evidenceId", code: "MISSING_REQUIRED_FIELD", message: "evidenceId is required." });
    if (!relationshipId) errors.push({ file: "evidence.csv", row: rNum, field: "relationshipId", code: "MISSING_REQUIRED_FIELD", message: "relationshipId is required." });
    if (!typeRaw || !VALID_EVIDENCE_TYPES.includes(typeRaw as RelationshipEvidenceType)) {
      errors.push({ file: "evidence.csv", row: rNum, field: "type", code: "INVALID_ENUM", message: `Invalid evidence type "${typeRaw}".` });
    }
    if (!description) errors.push({ file: "evidence.csv", row: rNum, field: "description", code: "MISSING_REQUIRED_FIELD", message: "description is required." });
    if (obsRes.error) errors.push(obsRes.error);

    // Interaction metadata check
    const occRaw = row.interactionOccurredAt?.trim();
    const recipRaw = row.interactionReciprocity?.trim();
    const statRaw = row.interactionStatus?.trim();

    let interactionObj:
      | { occurredAt: string; reciprocity: InteractionReciprocity; status: InteractionStatus }
      | undefined = undefined;

    const hasAnyInteraction = Boolean(occRaw || recipRaw || statRaw);
    if (hasAnyInteraction) {
      const occRes = validateDateField(occRaw, "interactionOccurredAt", "evidence.csv", rNum, true);
      if (occRes.error) errors.push(occRes.error);

      if (!recipRaw || !VALID_RECIPROCITIES.includes(recipRaw as InteractionReciprocity)) {
        errors.push({
          file: "evidence.csv",
          row: rNum,
          field: "interactionReciprocity",
          code: "INVALID_INTERACTION_METADATA",
          message: `Invalid interactionReciprocity "${recipRaw}". Must be one of: two_way, one_way, unknown.`,
        });
      }
      if (!statRaw || !VALID_INTERACTION_STATUSES.includes(statRaw as InteractionStatus)) {
        errors.push({
          file: "evidence.csv",
          row: rNum,
          field: "interactionStatus",
          code: "INVALID_INTERACTION_METADATA",
          message: `Invalid interactionStatus "${statRaw}". Must be one of: confirmed, unconfirmed.`,
        });
      }

      if (
        occRes.value &&
        recipRaw &&
        VALID_RECIPROCITIES.includes(recipRaw as InteractionReciprocity) &&
        statRaw &&
        VALID_INTERACTION_STATUSES.includes(statRaw as InteractionStatus)
      ) {
        interactionObj = {
          occurredAt: occRes.value,
          reciprocity: recipRaw as InteractionReciprocity,
          status: statRaw as InteractionStatus,
        };
      }
    }

    if (
      evidenceId &&
      relationshipId &&
      typeRaw &&
      VALID_EVIDENCE_TYPES.includes(typeRaw as RelationshipEvidenceType) &&
      description &&
      obsRes.value
    ) {
      relationshipEvidence.push({
        id: evidenceId,
        relationshipId,
        type: typeRaw as RelationshipEvidenceType,
        description,
        observedAt: obsRes.value,
        sourceName: row.sourceName?.trim() || undefined,
        sourceUrl: row.sourceUrl?.trim() || undefined,
        interaction: interactionObj,
      });
    }
  }

  // 8. Parse Target Person Profiles
  const targetPersonProfiles: TargetPersonProfile[] = [];
  for (let i = 0; i < (profileRows?.length || 0); i++) {
    const row = profileRows![i];
    const rNum = i + 2;

    const targetInvestorId = row.targetInvestorId?.trim();
    const personId = row.personId?.trim();
    const roleRaw = row.investmentRole?.trim();
    const obsRes = validateDateField(row.observedAt, "observedAt", "target-person-profiles.csv", rNum, true);

    const stgRes = parsePipeList(row.stageFocus, "stageFocus", "target-person-profiles.csv", rNum);
    const secRes = parsePipeList(row.sectorFocus, "sectorFocus", "target-person-profiles.csv", rNum);
    const geoRes = parsePipeList(row.geographyFocus, "geographyFocus", "target-person-profiles.csv", rNum);

    if (!targetInvestorId) errors.push({ file: "target-person-profiles.csv", row: rNum, field: "targetInvestorId", code: "MISSING_REQUIRED_FIELD", message: "targetInvestorId is required." });
    if (!personId) errors.push({ file: "target-person-profiles.csv", row: rNum, field: "personId", code: "MISSING_REQUIRED_FIELD", message: "personId is required." });
    if (!roleRaw || !VALID_INVESTMENT_ROLES.includes(roleRaw as TargetPersonInvestmentRole)) {
      errors.push({ file: "target-person-profiles.csv", row: rNum, field: "investmentRole", code: "INVALID_ENUM", message: `Invalid investmentRole "${roleRaw}".` });
    }
    if (obsRes.error) errors.push(obsRes.error);
    if (stgRes.error) errors.push(stgRes.error);
    if (secRes.error) errors.push(secRes.error);
    if (geoRes.error) errors.push(geoRes.error);

    if (
      targetInvestorId &&
      personId &&
      roleRaw &&
      VALID_INVESTMENT_ROLES.includes(roleRaw as TargetPersonInvestmentRole) &&
      obsRes.value
    ) {
      targetPersonProfiles.push({
        targetInvestorId,
        personId,
        roleTitle: row.roleTitle?.trim() || "",
        investmentRole: roleRaw as TargetPersonInvestmentRole,
        stageFocus: stgRes.values,
        sectorFocus: secRes.values,
        geographyFocus: geoRes.values,
        observedAt: obsRes.value,
        sourceName: row.sourceName?.trim() || undefined,
        sourceUrl: row.sourceUrl?.trim() || undefined,
      });
    }
  }

  // Populate campaign.founderPersonIds from founder_of relationships
  if (errors.length === 0) {
    for (const campaign of campaigns) {
      const startup = startups.find((s) => s.id === campaign.startupId);
      const matchingOrgIds = new Set<string>([campaign.startupId]);
      if (startup) {
        for (const org of organizations) {
          if (org.name.toLowerCase() === startup.name.toLowerCase()) {
            matchingOrgIds.add(org.id);
          }
        }
      }

      const startupRels = relationships.filter(
        (r) =>
          r.type === "founder_of" &&
          ((r.to.type === "organization" && matchingOrgIds.has(r.to.id)) ||
            (r.from.type === "organization" && matchingOrgIds.has(r.from.id)))
      );
      const founderIds = new Set<string>();
      for (const rel of startupRels) {
        if (rel.from.type === "person") founderIds.add(rel.from.id);
        if (rel.to.type === "person") founderIds.add(rel.to.id);
      }
      campaign.founderPersonIds = Array.from(founderIds);
    }
  }

  if (errors.length > 0) {
    return { status: "error", errors, warnings };
  }

  const dataset: PathwayDataset = {
    startups,
    organizations,
    people,
    relationships,
    relationshipEvidence,
    campaigns,
    targetInvestors,
  };

  // Run Dataset Integrity Validation
  const integrity = assertDatasetIntegrity(dataset);
  if (!integrity.valid) {
    for (const err of integrity.errors) {
      errors.push({
        file: "dataset",
        code: "DATASET_INTEGRITY_ERROR",
        message: err,
      });
    }
    return { status: "error", errors, warnings };
  }

  return {
    status: "success",
    dataset,
    targetPersonProfiles,
    errors: [],
    warnings,
  };
}
