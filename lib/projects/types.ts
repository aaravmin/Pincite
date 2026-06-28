import type {
  PatentType,
  ProjectStatus,
  SectionKey,
  EntityStatus,
} from "@/lib/projects/sections";

export type Project = {
  id: string;
  user_id: string;
  name: string;
  patent_type: PatentType;
  declared_status: ProjectStatus;
  application_number: string | null;
  filing_date: string | null;
  // Applicant / ADS (v3)
  applicant_name: string | null;
  applicant_is_inventor: boolean;
  applicant_is_juristic: boolean;
  entity_status: EntityStatus;
  // Attorney portfolio (v3)
  client_name: string | null;
  matter_no: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectSectionRow = {
  id: string;
  project_id: string;
  section_key: SectionKey;
  content: string;
  word_count: number;
  updated_at: string;
};

/** The immutable snapshot stored on each save (roadmap §8). */
export type VersionSnapshot = {
  project: {
    name: string;
    patent_type: PatentType;
    declared_status: ProjectStatus;
    application_number: string | null;
    filing_date: string | null;
  };
  sections: Partial<Record<SectionKey, string>>;
};

export type ProjectVersion = {
  id: string;
  project_id: string;
  user_id: string;
  label: string | null;
  snapshot: VersionSnapshot;
  parent_version_id: string | null;
  created_at: string;
};
