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

const REQUIRED_FILES = [
  "startup.csv",
  "campaign.csv",
  "organizations.csv",
  "people.csv",
  "targets.csv",
  "relationships.csv",
  "evidence.csv",
  "target-person-profiles.csv",
];

const REQUIRED_HEADERS: Record<string, string[]> = {
  "startup.csv": ["startupId", "name", "website", "geography", "sector", "stage"],
  "campaign.csv": ["campaignId", "startupId", "round", "status", "createdAt"],
  "organizations.csv": ["organizationId", "name", "type", "website", "geography"],
  "people.csv": [
    "personId",
    "firstName",
    "lastName",
    "fullName",
    "linkedinUrl",
    "currentOrganizationIds",
    "location",
  ],
  "targets.csv": [
    "targetInvestorId",
    "campaignId",
    "investorOrganizationId",
    "candidatePersonIds",
    "status",
  ],
  "relationships.csv": [
    "relationshipId",
    "fromType",
    "fromId",
    "toType",
    "toId",
    "type",
    "direction",
    "evidenceIds",
    "startedAt",
    "endedAt",
    "lastObservedAt",
  ],
  "evidence.csv": [
    "evidenceId",
    "relationshipId",
    "type",
    "description",
    "observedAt",
    "sourceName",
    "sourceUrl",
    "interactionOccurredAt",
    "interactionReciprocity",
    "interactionStatus",
  ],
  "target-person-profiles.csv": [
    "targetInvestorId",
    "personId",
    "roleTitle",
    "investmentRole",
    "stageFocus",
    "sectorFocus",
    "geographyFocus",
    "observedAt",
    "sourceName",
    "sourceUrl",
  ],
};

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
          code: "INVALID_PIPE_LIST",
          message: `Contains empty element in pipe-delimited list for field "${fieldName}".`,
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
          message: `Duplicate item "${trimmed}" in pipe-delimited list for field "${fieldName}".`,
        },
      };
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return { values: result };
}

function parseOptionalString(val: string | undefined): string | undefined {
  if (!val || val.trim().length === 0) return undefined;
  return val.trim();
}

function parseRequiredString(
  val: string | undefined,
  fieldName: string,
  file: string,
  row?: number
): { value?: string; error?: PilotBundleError } {
  const parsed = parseOptionalString(val);
  if (!parsed) {
    return {
      error: {
        file,
        row,
        field: fieldName,
        code: "MISSING_REQUIRED_FIELD",
        message: `Missing required field "${fieldName}" in "${file}".`,
      },
    };
  }
  return { value: parsed };
}

function parseValidDate(
  val: string | undefined,
  fieldName: string,
  file: string,
  row?: number,
  required = false
): { value?: string; error?: PilotBundleError } {
  const str = parseOptionalString(val);
  if (!str) {
    if (required) {
      return {
        error: {
          file,
          row,
          field: fieldName,
          code: "MISSING_REQUIRED_FIELD",
          message: `Missing required date field "${fieldName}" in "${file}".`,
        },
      };
    }
    return {};
  }

  const d = new Date(str);
  if (isNaN(d.getTime())) {
    return {
      error: {
        file,
        row,
        field: fieldName,
        code: "INVALID_DATE",
        message: `Invalid date string "${val}" for field "${fieldName}" in "${file}".`,
      },
    };
  }

  return { value: str };
}

export function loadPilotCsvBundle(dirPath: string): PilotBundleLoadResult {
  const errors: PilotBundleError[] = [];
  const warnings: string[] = [];

  const resolvedDir = path.resolve(dirPath);

  if (!fs.existsSync(resolvedDir) || !fs.statSync(resolvedDir).isDirectory()) {
    return {
      status: "error",
      errors: [
        {
          file: dirPath,
          code: "FILE_NOT_FOUND",
          message: `Directory does not exist: "${resolvedDir}".`,
        },
      ],
      warnings: [],
    };
  }

  // 1. Verify existence of required CSV files
  for (const fileName of REQUIRED_FILES) {
    const filePath = path.join(resolvedDir, fileName);
    if (!fs.existsSync(filePath)) {
      errors.push({
        file: fileName,
        code: "FILE_NOT_FOUND",
        message: `Required CSV file "${fileName}" is missing in directory "${resolvedDir}".`,
      });
    }
  }

  if (errors.length > 0) {
    return { status: "error", errors, warnings };
  }

  // Helper to read and validate headers for a CSV file
  function readCsvRecords(fileName: string): { records: Record<string, string>[]; headerError?: PilotBundleError } {
    const filePath = path.join(resolvedDir, fileName);
    const fileContent = fs.readFileSync(filePath, "utf8");

    // Check header row first
    const lines = fileContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      return { records: [] };
    }

    const firstLineRecords = parse(lines[0], { trim: true });
    if (!firstLineRecords || firstLineRecords.length === 0) {
      return { records: [] };
    }

    const actualHeaders: string[] = firstLineRecords[0] || [];
    const expectedHeaders = REQUIRED_HEADERS[fileName] || [];

    for (const reqHeader of expectedHeaders) {
      if (!actualHeaders.includes(reqHeader)) {
        return {
          records: [],
          headerError: {
            file: fileName,
            code: "MISSING_REQUIRED_HEADER",
            field: reqHeader,
            message: `Missing required CSV header "${reqHeader}" in "${fileName}".`,
          },
        };
      }
    }

    try {
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
      return { records: records as Record<string, string>[] };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({
        file: fileName,
        code: "CSV_PARSE_ERROR",
        message: `Failed to parse CSV file "${fileName}": ${message}`,
      });
      return { records: [] };
    }
  }

  // Load records from all files
  const startupRes = readCsvRecords("startup.csv");
  if (startupRes.headerError) errors.push(startupRes.headerError);

  const campaignRes = readCsvRecords("campaign.csv");
  if (campaignRes.headerError) errors.push(campaignRes.headerError);

  const orgRes = readCsvRecords("organizations.csv");
  if (orgRes.headerError) errors.push(orgRes.headerError);

  const peopleRes = readCsvRecords("people.csv");
  if (peopleRes.headerError) errors.push(peopleRes.headerError);

  const targetRes = readCsvRecords("targets.csv");
  if (targetRes.headerError) errors.push(targetRes.headerError);

  const relRes = readCsvRecords("relationships.csv");
  if (relRes.headerError) errors.push(relRes.headerError);

  const evRes = readCsvRecords("evidence.csv");
  if (evRes.headerError) errors.push(evRes.headerError);

  const profileRes = readCsvRecords("target-person-profiles.csv");
  if (profileRes.headerError) errors.push(profileRes.headerError);

  if (errors.length > 0) {
    return { status: "error", errors, warnings };
  }

  // Unique ID sets for duplicate entity detection
  const seenEntityIds = new Set<string>();
  const checkDuplicateId = (id: string, file: string, row: number): boolean => {
    if (seenEntityIds.has(id)) {
      errors.push({
        file,
        row,
        field: "id",
        code: "DUPLICATE_ENTITY_ID",
        message: `Duplicate entity ID detected: "${id}" in "${file}".`,
      });
      return true;
    }
    seenEntityIds.add(id);
    return false;
  };

  // 2. Parse Startup
  const startups: Startup[] = [];
  let rowIdx = 2;
  for (const raw of startupRes.records) {
    const idRes = parseRequiredString(raw.startupId, "startupId", "startup.csv", rowIdx);
    const nameRes = parseRequiredString(raw.name, "name", "startup.csv", rowIdx);
    const website = parseOptionalString(raw.website);
    const geography = parseOptionalString(raw.geography);
    const sector = parseOptionalString(raw.sector);
    const stage = parseOptionalString(raw.stage);

    if (!idRes.value || !nameRes.value) {
      if (idRes.error) errors.push(idRes.error);
      if (nameRes.error) errors.push(nameRes.error);
    } else {
      checkDuplicateId(idRes.value, "startup.csv", rowIdx);
      startups.push({
        id: idRes.value,
        name: nameRes.value,
        website,
        geography,
        sector,
        stage,
      });
    }
    rowIdx++;
  }

  // Requirement 9: Exactly 1 Startup
  if (startups.length !== 1 && errors.length === 0) {
    errors.push({
      file: "startup.csv",
      code: "INVALID_STARTUP_COUNT",
      message: `Expected exactly 1 Startup record, found ${startups.length}.`,
    });
  }

  // 3. Parse Campaign
  const campaigns: FundraisingCampaign[] = [];
  rowIdx = 2;
  for (const raw of campaignRes.records) {
    const idRes = parseRequiredString(raw.campaignId, "campaignId", "campaign.csv", rowIdx);
    const startupIdRes = parseRequiredString(raw.startupId, "startupId", "campaign.csv", rowIdx);
    const round = parseOptionalString(raw.round) ?? "";
    const statusRes = parseRequiredString(raw.status, "status", "campaign.csv", rowIdx);
    const createdAtRes = parseValidDate(raw.createdAt, "createdAt", "campaign.csv", rowIdx, true);

    if (!idRes.value || !startupIdRes.value || !statusRes.value || !createdAtRes.value) {
      if (idRes.error) errors.push(idRes.error);
      if (startupIdRes.error) errors.push(startupIdRes.error);
      if (statusRes.error) errors.push(statusRes.error);
      if (createdAtRes.error) errors.push(createdAtRes.error);
    } else {
      if (!VALID_CAMPAIGN_STATUSES.includes(statusRes.value as CampaignStatus)) {
        errors.push({
          file: "campaign.csv",
          row: rowIdx,
          field: "status",
          code: "INVALID_ENUM",
          message: `Invalid campaign status "${statusRes.value}".`,
        });
      }

      checkDuplicateId(idRes.value, "campaign.csv", rowIdx);

      campaigns.push({
        id: idRes.value,
        startupId: startupIdRes.value,
        round,
        status: statusRes.value as CampaignStatus,
        createdAt: createdAtRes.value,
        founderPersonIds: [], // Will be populated via derivation
      });
    }
    rowIdx++;
  }

  // Requirement 9: Exactly 1 Campaign
  if (campaigns.length !== 1 && errors.length === 0) {
    errors.push({
      file: "campaign.csv",
      code: "INVALID_CAMPAIGN_COUNT",
      message: `Expected exactly 1 FundraisingCampaign record, found ${campaigns.length}.`,
    });
  }

  if (startups.length === 1 && campaigns.length === 1) {
    if (campaigns[0].startupId !== startups[0].id) {
      errors.push({
        file: "campaign.csv",
        code: "CAMPAIGN_STARTUP_MISMATCH",
        message: `Campaign startupId "${campaigns[0].startupId}" does not match startup id "${startups[0].id}".`,
      });
    }
  }

  // 4. Parse Organizations
  const organizations: Organization[] = [];
  rowIdx = 2;
  for (const raw of orgRes.records) {
    const idRes = parseRequiredString(raw.organizationId, "organizationId", "organizations.csv", rowIdx);
    const nameRes = parseRequiredString(raw.name, "name", "organizations.csv", rowIdx);
    const typeRes = parseRequiredString(raw.type, "type", "organizations.csv", rowIdx);
    const website = parseOptionalString(raw.website);
    const geography = parseOptionalString(raw.geography);

    if (!idRes.value || !nameRes.value || !typeRes.value) {
      if (idRes.error) errors.push(idRes.error);
      if (nameRes.error) errors.push(nameRes.error);
      if (typeRes.error) errors.push(typeRes.error);
    } else {
      if (!VALID_ORGANIZATION_TYPES.includes(typeRes.value as OrganizationType)) {
        errors.push({
          file: "organizations.csv",
          row: rowIdx,
          field: "type",
          code: "INVALID_ENUM",
          message: `Invalid organization type "${typeRes.value}".`,
        });
      }

      checkDuplicateId(idRes.value, "organizations.csv", rowIdx);

      organizations.push({
        id: idRes.value,
        name: nameRes.value,
        type: typeRes.value as OrganizationType,
        website,
        geography,
      });
    }
    rowIdx++;
  }

  // 5. Parse People
  const people: Person[] = [];
  rowIdx = 2;
  for (const raw of peopleRes.records) {
    const idRes = parseRequiredString(raw.personId, "personId", "people.csv", rowIdx);
    const firstNameRes = parseRequiredString(raw.firstName, "firstName", "people.csv", rowIdx);
    const lastNameRes = parseRequiredString(raw.lastName, "lastName", "people.csv", rowIdx);
    const fullNameRes = parseRequiredString(raw.fullName, "fullName", "people.csv", rowIdx);
    const linkedinUrl = parseOptionalString(raw.linkedinUrl);
    const location = parseOptionalString(raw.location);

    const currentOrgsPipe = parsePipeList(
      raw.currentOrganizationIds,
      "currentOrganizationIds",
      "people.csv",
      rowIdx
    );
    if (currentOrgsPipe.error) errors.push(currentOrgsPipe.error);

    if (!idRes.value || !firstNameRes.value || !lastNameRes.value || !fullNameRes.value) {
      if (idRes.error) errors.push(idRes.error);
      if (firstNameRes.error) errors.push(firstNameRes.error);
      if (lastNameRes.error) errors.push(lastNameRes.error);
      if (fullNameRes.error) errors.push(fullNameRes.error);
    } else {
      checkDuplicateId(idRes.value, "people.csv", rowIdx);

      people.push({
        id: idRes.value,
        firstName: firstNameRes.value,
        lastName: lastNameRes.value,
        fullName: fullNameRes.value,
        linkedinUrl,
        currentOrganizationIds: currentOrgsPipe.values,
        location,
      });
    }
    rowIdx++;
  }

  // 6. Parse Target Investors
  const targetInvestors: TargetInvestor[] = [];
  rowIdx = 2;
  for (const raw of targetRes.records) {
    const idRes = parseRequiredString(raw.targetInvestorId, "targetInvestorId", "targets.csv", rowIdx);
    const campaignIdRes = parseRequiredString(raw.campaignId, "campaignId", "targets.csv", rowIdx);
    const investorOrgIdRes = parseRequiredString(raw.investorOrganizationId, "investorOrganizationId", "targets.csv", rowIdx);
    const statusRes = parseRequiredString(raw.status, "status", "targets.csv", rowIdx);

    const candidatePipe = parsePipeList(
      raw.candidatePersonIds,
      "candidatePersonIds",
      "targets.csv",
      rowIdx
    );
    if (candidatePipe.error) errors.push(candidatePipe.error);

    if (candidatePipe.values.length === 0 && !candidatePipe.error) {
      errors.push({
        file: "targets.csv",
        row: rowIdx,
        field: "candidatePersonIds",
        code: "MISSING_TARGET_CANDIDATES",
        message: `Target investor "${idRes.value || raw.targetInvestorId}" must have at least 1 candidate person ID.`,
      });
    }

    if (!idRes.value || !campaignIdRes.value || !investorOrgIdRes.value || !statusRes.value) {
      if (idRes.error) errors.push(idRes.error);
      if (campaignIdRes.error) errors.push(campaignIdRes.error);
      if (investorOrgIdRes.error) errors.push(investorOrgIdRes.error);
      if (statusRes.error) errors.push(statusRes.error);
    } else {
      if (!VALID_TARGET_INVESTOR_STATUSES.includes(statusRes.value as TargetInvestorStatus)) {
        errors.push({
          file: "targets.csv",
          row: rowIdx,
          field: "status",
          code: "INVALID_ENUM",
          message: `Invalid target investor status "${statusRes.value}".`,
        });
      }

      if (campaigns.length === 1 && campaignIdRes.value !== campaigns[0].id) {
        errors.push({
          file: "targets.csv",
          row: rowIdx,
          field: "campaignId",
          code: "TARGET_CAMPAIGN_MISMATCH",
          message: `Target investor "${idRes.value}" references campaignId "${campaignIdRes.value}" which does not match campaign "${campaigns[0].id}".`,
        });
      }

      checkDuplicateId(idRes.value, "targets.csv", rowIdx);

      targetInvestors.push({
        id: idRes.value,
        campaignId: campaignIdRes.value,
        investorOrganizationId: investorOrgIdRes.value,
        candidatePersonIds: candidatePipe.values,
        status: statusRes.value as TargetInvestorStatus,
      });
    }
    rowIdx++;
  }

  // 7. Parse Relationships
  const relationships: Relationship[] = [];
  rowIdx = 2;
  for (const raw of relRes.records) {
    const idRes = parseRequiredString(raw.relationshipId, "relationshipId", "relationships.csv", rowIdx);
    const fromTypeRes = parseRequiredString(raw.fromType, "fromType", "relationships.csv", rowIdx);
    const fromIdRes = parseRequiredString(raw.fromId, "fromId", "relationships.csv", rowIdx);
    const toTypeRes = parseRequiredString(raw.toType, "toType", "relationships.csv", rowIdx);
    const toIdRes = parseRequiredString(raw.toId, "toId", "relationships.csv", rowIdx);
    const typeRes = parseRequiredString(raw.type, "type", "relationships.csv", rowIdx);
    const directionRes = parseRequiredString(raw.direction, "direction", "relationships.csv", rowIdx);
    const startedAtRes = parseValidDate(raw.startedAt, "startedAt", "relationships.csv", rowIdx, true);
    const endedAtRes = parseValidDate(raw.endedAt, "endedAt", "relationships.csv", rowIdx, false);
    const lastObservedAtRes = parseValidDate(raw.lastObservedAt, "lastObservedAt", "relationships.csv", rowIdx, true);

    const evidencePipe = parsePipeList(
      raw.evidenceIds,
      "evidenceIds",
      "relationships.csv",
      rowIdx
    );
    if (evidencePipe.error) errors.push(evidencePipe.error);

    if (
      !idRes.value ||
      !fromTypeRes.value ||
      !fromIdRes.value ||
      !toTypeRes.value ||
      !toIdRes.value ||
      !typeRes.value ||
      !directionRes.value ||
      !startedAtRes.value ||
      !lastObservedAtRes.value
    ) {
      if (idRes.error) errors.push(idRes.error);
      if (fromTypeRes.error) errors.push(fromTypeRes.error);
      if (fromIdRes.error) errors.push(fromIdRes.error);
      if (toTypeRes.error) errors.push(toTypeRes.error);
      if (toIdRes.error) errors.push(toIdRes.error);
      if (typeRes.error) errors.push(typeRes.error);
      if (directionRes.error) errors.push(directionRes.error);
      if (startedAtRes.error) errors.push(startedAtRes.error);
      if (lastObservedAtRes.error) errors.push(lastObservedAtRes.error);
    } else {
      if (!VALID_RELATIONSHIP_TYPES.includes(typeRes.value as RelationshipType)) {
        errors.push({
          file: "relationships.csv",
          row: rowIdx,
          field: "type",
          code: "INVALID_ENUM",
          message: `Invalid relationship type "${typeRes.value}".`,
        });
      }
      if (!VALID_RELATIONSHIP_DIRECTIONS.includes(directionRes.value as RelationshipDirection)) {
        errors.push({
          file: "relationships.csv",
          row: rowIdx,
          field: "direction",
          code: "INVALID_ENUM",
          message: `Invalid relationship direction "${directionRes.value}".`,
        });
      }

      checkDuplicateId(idRes.value, "relationships.csv", rowIdx);

      relationships.push({
        id: idRes.value,
        from: {
          type: fromTypeRes.value as "person" | "organization",
          id: fromIdRes.value,
        },
        to: {
          type: toTypeRes.value as "person" | "organization",
          id: toIdRes.value,
        },
        type: typeRes.value as RelationshipType,
        direction: directionRes.value as RelationshipDirection,
        evidenceIds: evidencePipe.values,
        startedAt: startedAtRes.value,
        endedAt: endedAtRes.value,
        lastObservedAt: lastObservedAtRes.value,
      });
    }
    rowIdx++;
  }

  // 8. Parse Relationship Evidence
  const relationshipEvidence: RelationshipEvidence[] = [];
  rowIdx = 2;
  for (const raw of evRes.records) {
    const idRes = parseRequiredString(raw.evidenceId, "evidenceId", "evidence.csv", rowIdx);
    const relIdRes = parseRequiredString(raw.relationshipId, "relationshipId", "evidence.csv", rowIdx);
    const typeRes = parseRequiredString(raw.type, "type", "evidence.csv", rowIdx);
    const descRes = parseRequiredString(raw.description, "description", "evidence.csv", rowIdx);
    const observedAtRes = parseValidDate(raw.observedAt, "observedAt", "evidence.csv", rowIdx, false);
    const sourceName = parseOptionalString(raw.sourceName);
    const sourceUrl = parseOptionalString(raw.sourceUrl);

    // Interaction metadata check (Requirement 17)
    const interactionOccurredAtStr = parseOptionalString(raw.interactionOccurredAt);
    const interactionReciprocityStr = parseOptionalString(raw.interactionReciprocity);
    const interactionStatusStr = parseOptionalString(raw.interactionStatus);

    const hasAnyInteractionField =
      !!interactionOccurredAtStr || !!interactionReciprocityStr || !!interactionStatusStr;

    let interactionMetadata: RelationshipEvidence["interaction"] = undefined;

    if (hasAnyInteractionField) {
      if (!interactionOccurredAtStr || !interactionReciprocityStr || !interactionStatusStr) {
        errors.push({
          file: "evidence.csv",
          row: rowIdx,
          code: "PARTIAL_INTERACTION_METADATA",
          message: "When any interaction field is populated, interactionOccurredAt, interactionReciprocity, and interactionStatus are all required.",
        });
      } else {
        const occurredAtDate = new Date(interactionOccurredAtStr);
        if (isNaN(occurredAtDate.getTime())) {
          errors.push({
            file: "evidence.csv",
            row: rowIdx,
            field: "interactionOccurredAt",
            code: "INVALID_DATE",
            message: `Invalid interactionOccurredAt date "${interactionOccurredAtStr}".`,
          });
        }
        if (!VALID_RECIPROCITIES.includes(interactionReciprocityStr as InteractionReciprocity)) {
          errors.push({
            file: "evidence.csv",
            row: rowIdx,
            field: "interactionReciprocity",
            code: "INVALID_ENUM",
            message: `Invalid interactionReciprocity "${interactionReciprocityStr}".`,
          });
        }
        if (!VALID_INTERACTION_STATUSES.includes(interactionStatusStr as InteractionStatus)) {
          errors.push({
            file: "evidence.csv",
            row: rowIdx,
            field: "interactionStatus",
            code: "INVALID_ENUM",
            message: `Invalid interactionStatus "${interactionStatusStr}".`,
          });
        }

        interactionMetadata = {
          occurredAt: interactionOccurredAtStr,
          reciprocity: interactionReciprocityStr as InteractionReciprocity,
          status: interactionStatusStr as InteractionStatus,
        };
      }
    }

    if (!idRes.value || !relIdRes.value || !typeRes.value || !descRes.value || observedAtRes.error) {
      if (idRes.error) errors.push(idRes.error);
      if (relIdRes.error) errors.push(relIdRes.error);
      if (typeRes.error) errors.push(typeRes.error);
      if (descRes.error) errors.push(descRes.error);
      if (observedAtRes.error) errors.push(observedAtRes.error);
    } else {
      if (!VALID_EVIDENCE_TYPES.includes(typeRes.value as RelationshipEvidenceType)) {
        errors.push({
          file: "evidence.csv",
          row: rowIdx,
          field: "type",
          code: "INVALID_ENUM",
          message: `Invalid evidence type "${typeRes.value}".`,
        });
      }

      checkDuplicateId(idRes.value, "evidence.csv", rowIdx);

      relationshipEvidence.push({
        id: idRes.value,
        relationshipId: relIdRes.value,
        type: typeRes.value as RelationshipEvidenceType,
        description: descRes.value,
        observedAt: observedAtRes.value,
        sourceName,
        sourceUrl,
        interaction: interactionMetadata,
      });
    }
    rowIdx++;
  }

  // 9. Parse Target Person Profiles
  const targetPersonProfiles: TargetPersonProfile[] = [];
  const seenProfileKeys = new Set<string>();
  rowIdx = 2;
  for (const raw of profileRes.records) {
    const targetInvestorIdRes = parseRequiredString(
      raw.targetInvestorId,
      "targetInvestorId",
      "target-person-profiles.csv",
      rowIdx
    );
    const personIdRes = parseRequiredString(
      raw.personId,
      "personId",
      "target-person-profiles.csv",
      rowIdx
    );
    const roleTitleRes = parseRequiredString(
      raw.roleTitle,
      "roleTitle",
      "target-person-profiles.csv",
      rowIdx
    );
    const investmentRoleRes = parseRequiredString(
      raw.investmentRole,
      "investmentRole",
      "target-person-profiles.csv",
      rowIdx
    );
    const observedAtRes = parseValidDate(
      raw.observedAt,
      "observedAt",
      "target-person-profiles.csv",
      rowIdx,
      true
    );
    const sourceName = parseOptionalString(raw.sourceName);
    const sourceUrl = parseOptionalString(raw.sourceUrl);

    const stageFocusPipe = parsePipeList(
      raw.stageFocus,
      "stageFocus",
      "target-person-profiles.csv",
      rowIdx
    );
    if (stageFocusPipe.error) errors.push(stageFocusPipe.error);

    const sectorFocusPipe = parsePipeList(
      raw.sectorFocus,
      "sectorFocus",
      "target-person-profiles.csv",
      rowIdx
    );
    if (sectorFocusPipe.error) errors.push(sectorFocusPipe.error);

    const geographyFocusPipe = parsePipeList(
      raw.geographyFocus,
      "geographyFocus",
      "target-person-profiles.csv",
      rowIdx
    );
    if (geographyFocusPipe.error) errors.push(geographyFocusPipe.error);

    if (
      !targetInvestorIdRes.value ||
      !personIdRes.value ||
      !roleTitleRes.value ||
      !investmentRoleRes.value ||
      !observedAtRes.value
    ) {
      if (targetInvestorIdRes.error) errors.push(targetInvestorIdRes.error);
      if (personIdRes.error) errors.push(personIdRes.error);
      if (roleTitleRes.error) errors.push(roleTitleRes.error);
      if (investmentRoleRes.error) errors.push(investmentRoleRes.error);
      if (observedAtRes.error) errors.push(observedAtRes.error);
    } else {
      if (!VALID_INVESTMENT_ROLES.includes(investmentRoleRes.value as TargetPersonInvestmentRole)) {
        errors.push({
          file: "target-person-profiles.csv",
          row: rowIdx,
          field: "investmentRole",
          code: "INVALID_ENUM",
          message: `Invalid investment role "${investmentRoleRes.value}".`,
        });
      }

      const compositeKey = `${targetInvestorIdRes.value}|${personIdRes.value}`;
      if (seenProfileKeys.has(compositeKey)) {
        errors.push({
          file: "target-person-profiles.csv",
          row: rowIdx,
          code: "DUPLICATE_PROFILE",
          message: `Duplicate profile detected for targetInvestorId "${targetInvestorIdRes.value}" and personId "${personIdRes.value}".`,
        });
      }
      seenProfileKeys.add(compositeKey);

      targetPersonProfiles.push({
        targetInvestorId: targetInvestorIdRes.value,
        personId: personIdRes.value,
        roleTitle: roleTitleRes.value,
        investmentRole: investmentRoleRes.value as TargetPersonInvestmentRole,
        stageFocus: stageFocusPipe.values,
        sectorFocus: sectorFocusPipe.values,
        geographyFocus: geographyFocusPipe.values,
        observedAt: observedAtRes.value,
        sourceName,
        sourceUrl,
      });
    }
    rowIdx++;
  }

  if (errors.length > 0) {
    return { status: "error", errors, warnings };
  }

  // 10. Startup Organization Resolution & Founder Derivation (Requirements 10 & 11)
  const singleStartup = startups[0];
  const matchingOrgs = organizations.filter(
    (org) =>
      org.type === "startup" &&
      (org.id === singleStartup.id ||
        org.name.trim().toLowerCase() === singleStartup.name.trim().toLowerCase())
  );

  if (matchingOrgs.length === 0) {
    errors.push({
      file: "organizations.csv",
      code: "STARTUP_ORGANIZATION_NOT_FOUND",
      message: `No startup Organization found matching startup "${singleStartup.name}" (${singleStartup.id}).`,
    });
  } else if (matchingOrgs.length > 1) {
    errors.push({
      file: "organizations.csv",
      code: "AMBIGUOUS_STARTUP_ORGANIZATION",
      message: `Multiple startup Organizations found matching startup "${singleStartup.name}" (${singleStartup.id}).`,
    });
  }

  if (errors.length > 0) {
    return { status: "error", errors, warnings };
  }

  const resolvedStartupOrg = matchingOrgs[0];

  // Derive campaign.founderPersonIds
  const singleCampaign = campaigns[0];
  const founderRels = relationships.filter(
    (r) =>
      r.type === "founder_of" &&
      ((r.to.type === "organization" && r.to.id === resolvedStartupOrg.id) ||
        (r.from.type === "organization" && r.from.id === resolvedStartupOrg.id))
  );

  const founderIdsSet = new Set<string>();
  for (const rel of founderRels) {
    if (rel.from.type === "person") founderIdsSet.add(rel.from.id);
    if (rel.to.type === "person") founderIdsSet.add(rel.to.id);
  }

  singleCampaign.founderPersonIds = Array.from(founderIdsSet);

  if (singleCampaign.founderPersonIds.length === 0) {
    errors.push({
      file: "relationships.csv",
      code: "NO_CAMPAIGN_FOUNDERS",
      message: "Fundraising campaign has 0 derived founder person IDs.",
    });
    return { status: "error", errors, warnings };
  }

  // 11. Construct PathwayDataset and validate integrity
  const dataset: PathwayDataset = {
    startups,
    campaigns,
    organizations,
    people,
    targetInvestors,
    relationships,
    relationshipEvidence,
  };

  const integrityResult = assertDatasetIntegrity(dataset);
  if (integrityResult.errors.length > 0) {
    for (const errMessage of integrityResult.errors) {
      errors.push({
        file: "dataset",
        code: "DATASET_INTEGRITY_ERROR",
        message: errMessage,
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
