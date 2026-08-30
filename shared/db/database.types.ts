/**
 * Supabase `Database` types for the `public` schema.
 *
 * HAND-DERIVED from `supabase/migrations/*.sql` (0001 through 0020, applied in order,
 * including every ALTER TABLE / ALTER TYPE). It reproduces the exact shape that
 *
 *   supabase gen types typescript --project-id <project-id> --schema public
 *
 * emits, so it can be replaced verbatim by generator output once Supabase credentials are
 * available in the environment. We cannot run the generator here (no credentials), so this
 * file is maintained by hand for now.
 *
 * REGENERATE (do not hand-edit) as soon as credentials exist, and after any new migration.
 * If a query's types disagree with what the database actually returns, that is a BUG IN THIS
 * FILE - fix the type here (or regenerate), never paper over it with a cast at the call site.
 *
 * Type mapping used (matches the generator):
 *   uuid, text, date            -> string
 *   timestamptz                 -> string
 *   jsonb                       -> Json
 *   integer, bigint, real,
 *   double precision, numeric   -> number
 *   boolean                     -> boolean
 *   vector(1024)                -> string   (PostgREST transports vectors as text)
 *   tsvector                    -> unknown
 *   enum types                  -> the value union (see Enums below)
 *   nullable column             -> `| null`
 *   column with a default,
 *   or a nullable column        -> optional in Insert; everything optional in Update
 *   GENERATED ALWAYS column     -> `?: never` in Insert and Update (id identity, fts)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      api_usage: {
        Row: {
          created_at: string
          id: number
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          detail: Json | null
          id: number
          ip: string | null
          project_id: string | null
          user_id: string | null
          version_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: Json | null
          id?: never
          ip?: string | null
          project_id?: string | null
          user_id?: string | null
          version_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: Json | null
          id?: never
          ip?: string | null
          project_id?: string | null
          user_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          created_at: string
          format: string
          id: string
          project_id: string
          user_id: string
          version_id: string | null
        }
        Insert: {
          created_at?: string
          format: string
          id?: string
          project_id: string
          user_id: string
          version_id?: string | null
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          project_id?: string
          user_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          actionable: boolean
          cfr_ref: string | null
          created_at: string
          explanation: string
          id: string
          kind: Database["public"]["Enums"]["finding_kind"]
          mpep_section: string | null
          project_id: string
          section_key: Database["public"]["Enums"]["section_key"]
          severity: Database["public"]["Enums"]["finding_severity"]
          span_end: number
          span_start: number
          title: string
          version_id: string | null
        }
        Insert: {
          actionable?: boolean
          cfr_ref?: string | null
          created_at?: string
          explanation: string
          id?: string
          kind: Database["public"]["Enums"]["finding_kind"]
          mpep_section?: string | null
          project_id: string
          section_key: Database["public"]["Enums"]["section_key"]
          severity: Database["public"]["Enums"]["finding_severity"]
          span_end?: number
          span_start?: number
          title: string
          version_id?: string | null
        }
        Update: {
          actionable?: boolean
          cfr_ref?: string | null
          created_at?: string
          explanation?: string
          id?: string
          kind?: Database["public"]["Enums"]["finding_kind"]
          mpep_section?: string | null
          project_id?: string
          section_key?: Database["public"]["Enums"]["section_key"]
          severity?: Database["public"]["Enums"]["finding_severity"]
          span_end?: number
          span_start?: number
          title?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "findings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      match_spans: {
        Row: {
          created_at: string
          element_confidence: number | null
          id: string
          match_id: string
          overlap_type: Database["public"]["Enums"]["overlap_type"]
          patent_span_text: string
          user_section_key: Database["public"]["Enums"]["section_key"]
          user_span_end: number
          user_span_start: number
        }
        Insert: {
          created_at?: string
          element_confidence?: number | null
          id?: string
          match_id: string
          overlap_type: Database["public"]["Enums"]["overlap_type"]
          patent_span_text: string
          user_section_key: Database["public"]["Enums"]["section_key"]
          user_span_end: number
          user_span_start: number
        }
        Update: {
          created_at?: string
          element_confidence?: number | null
          id?: string
          match_id?: string
          overlap_type?: Database["public"]["Enums"]["overlap_type"]
          patent_span_text?: string
          user_section_key?: Database["public"]["Enums"]["section_key"]
          user_span_end?: number
          user_span_start?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_spans_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "prior_art_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      mpep_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          embedding: string | null
          id: string
          section_id: string
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          section_id: string
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          section_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mpep_chunks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "mpep_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      mpep_sections: {
        Row: {
          chapter: string | null
          edition: string
          fetched_at: string
          fts: unknown | null
          full_text: string
          id: string
          revision_tag: string | null
          section_number: string
          source_url: string
          title: string | null
        }
        Insert: {
          chapter?: string | null
          edition: string
          fetched_at?: string
          fts?: never
          full_text: string
          id?: string
          revision_tag?: string | null
          section_number: string
          source_url: string
          title?: string | null
        }
        Update: {
          chapter?: string | null
          edition?: string
          fetched_at?: string
          fts?: never
          full_text?: string
          id?: string
          revision_tag?: string | null
          section_number?: string
          source_url?: string
          title?: string | null
        }
        Relationships: []
      }
      prior_art_matches: {
        Row: {
          created_at: string
          id: string
          overall_score: number | null
          patent_number: string
          project_id: string
          source: Database["public"]["Enums"]["prior_art_source"]
          source_url: string | null
          title: string | null
          version_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          overall_score?: number | null
          patent_number: string
          project_id: string
          source: Database["public"]["Enums"]["prior_art_source"]
          source_url?: string | null
          title?: string | null
          version_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          overall_score?: number | null
          patent_number?: string
          project_id?: string
          source?: Database["public"]["Enums"]["prior_art_source"]
          source_url?: string | null
          title?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prior_art_matches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          consented_at: string | null
          created_at: string
          email: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"] | null
        }
        Insert: {
          consented_at?: string | null
          created_at?: string
          email?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Update: {
          consented_at?: string | null
          created_at?: string
          email?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      project_attachments: {
        Row: {
          analysis: Json | null
          annotations: Json | null
          created_at: string
          filename: string
          id: string
          kind: Database["public"]["Enums"]["attachment_kind"]
          mime: string
          page_index: number | null
          project_id: string
          size_bytes: number
          storage_path: string
          vector_scene_meta: Json | null
          view: string | null
        }
        Insert: {
          analysis?: Json | null
          annotations?: Json | null
          created_at?: string
          filename: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          mime?: string
          page_index?: number | null
          project_id: string
          size_bytes?: number
          storage_path: string
          vector_scene_meta?: Json | null
          view?: string | null
        }
        Update: {
          analysis?: Json | null
          annotations?: Json | null
          created_at?: string
          filename?: string
          id?: string
          kind?: Database["public"]["Enums"]["attachment_kind"]
          mime?: string
          page_index?: number | null
          project_id?: string
          size_bytes?: number
          storage_path?: string
          vector_scene_meta?: Json | null
          view?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_attachments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_declarations: {
        Row: {
          id: string
          inventor_id: string | null
          legal_name: string
          project_id: string
          s_signature: string | null
          signed_at: string
          statements: Json
        }
        Insert: {
          id?: string
          inventor_id?: string | null
          legal_name: string
          project_id: string
          s_signature?: string | null
          signed_at?: string
          statements?: Json
        }
        Update: {
          id?: string
          inventor_id?: string | null
          legal_name?: string
          project_id?: string
          s_signature?: string | null
          signed_at?: string
          statements?: Json
        }
        Relationships: [
          {
            foreignKeyName: "project_declarations_inventor_id_fkey"
            columns: ["inventor_id"]
            isOneToOne: false
            referencedRelation: "project_inventors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_declarations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_disclosure: {
        Row: {
          advantages: string
          alternatives: string
          components: string
          field_industry: string
          how_it_works: string
          known_prior_art: string
          problem_solved: string
          project_id: string
          updated_at: string
        }
        Insert: {
          advantages?: string
          alternatives?: string
          components?: string
          field_industry?: string
          how_it_works?: string
          known_prior_art?: string
          problem_solved?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          advantages?: string
          alternatives?: string
          components?: string
          field_industry?: string
          how_it_works?: string
          known_prior_art?: string
          problem_solved?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_disclosure_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_inventors: {
        Row: {
          citizenship: string
          created_at: string
          id: string
          legal_name: string
          mailing_address: string
          ord: number
          project_id: string
          residence: string
        }
        Insert: {
          citizenship?: string
          created_at?: string
          id?: string
          legal_name?: string
          mailing_address?: string
          ord?: number
          project_id: string
          residence?: string
        }
        Update: {
          citizenship?: string
          created_at?: string
          id?: string
          legal_name?: string
          mailing_address?: string
          ord?: number
          project_id?: string
          residence?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_inventors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sections: {
        Row: {
          content: string
          id: string
          project_id: string
          section_key: Database["public"]["Enums"]["section_key"]
          updated_at: string
          word_count: number
        }
        Insert: {
          content?: string
          id?: string
          project_id: string
          section_key: Database["public"]["Enums"]["section_key"]
          updated_at?: string
          word_count?: number
        }
        Update: {
          content?: string
          id?: string
          project_id?: string
          section_key?: Database["public"]["Enums"]["section_key"]
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_sections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_versions: {
        Row: {
          created_at: string
          id: string
          label: string | null
          parent_version_id: string | null
          project_id: string
          snapshot: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          parent_version_id?: string | null
          project_id: string
          snapshot: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          parent_version_id?: string | null
          project_id?: string
          snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "project_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_versions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          applicant_is_inventor: boolean
          applicant_is_juristic: boolean
          applicant_name: string | null
          application_number: string | null
          client_name: string | null
          created_at: string
          declared_status: Database["public"]["Enums"]["project_status"]
          entity_status: Database["public"]["Enums"]["entity_status"]
          filing_date: string | null
          id: string
          matter_no: string | null
          name: string
          patent_type: Database["public"]["Enums"]["patent_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          applicant_is_inventor?: boolean
          applicant_is_juristic?: boolean
          applicant_name?: string | null
          application_number?: string | null
          client_name?: string | null
          created_at?: string
          declared_status?: Database["public"]["Enums"]["project_status"]
          entity_status?: Database["public"]["Enums"]["entity_status"]
          filing_date?: string | null
          id?: string
          matter_no?: string | null
          name: string
          patent_type?: Database["public"]["Enums"]["patent_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          applicant_is_inventor?: boolean
          applicant_is_juristic?: boolean
          applicant_name?: string | null
          application_number?: string | null
          client_name?: string | null
          created_at?: string
          declared_status?: Database["public"]["Enums"]["project_status"]
          entity_status?: Database["public"]["Enums"]["entity_status"]
          filing_date?: string | null
          id?: string
          matter_no?: string | null
          name?: string
          patent_type?: Database["public"]["Enums"]["patent_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_global_limit: {
        Args: { p_kind: string; p_limit: number; p_window_secs: number }
        Returns: boolean
      }
      consume_rate_limit: {
        Args: { p_kind: string; p_limit: number; p_window_secs: number }
        Returns: boolean
      }
      handle_new_user: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
      match_mpep_chunks: {
        Args: { match_count?: number; query_embedding: string }
        Returns: {
          section_number: string
          title: string
          similarity: number
        }[]
      }
      match_mpep_keyword: {
        Args: { match_count?: number; search_query: string }
        Returns: {
          section_number: string
          title: string
          rank: number
        }[]
      }
      touch_updated_at: {
        Args: Record<PropertyKey, never>
        Returns: unknown
      }
    }
    Enums: {
      attachment_kind: "drawing" | "supporting" | "declaration"
      entity_status: "large" | "small" | "micro"
      finding_kind: "structural" | "consistency" | "substantive"
      finding_severity: "violation" | "attention" | "pass"
      overlap_type: "lexical" | "semantic" | "claim_limitation"
      patent_type: "utility" | "design" | "plant"
      prior_art_source: "google_patents" | "uspto_odp" | "patentsview"
      project_status:
        | "drafting"
        | "filed"
        | "published"
        | "office_action"
        | "allowed"
        | "granted"
      section_key:
        | "title"
        | "cross_reference"
        | "gov_interest"
        | "background"
        | "summary"
        | "brief_description_drawings"
        | "detailed_description"
        | "claims"
        | "abstract"
        | "drawings_meta"
        | "office_action"
      user_role: "attorney" | "inventor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attachment_kind: ["drawing", "supporting", "declaration"],
      entity_status: ["large", "small", "micro"],
      finding_kind: ["structural", "consistency", "substantive"],
      finding_severity: ["violation", "attention", "pass"],
      overlap_type: ["lexical", "semantic", "claim_limitation"],
      patent_type: ["utility", "design", "plant"],
      prior_art_source: ["google_patents", "uspto_odp", "patentsview"],
      project_status: [
        "drafting",
        "filed",
        "published",
        "office_action",
        "allowed",
        "granted",
      ],
      section_key: [
        "title",
        "cross_reference",
        "gov_interest",
        "background",
        "summary",
        "brief_description_drawings",
        "detailed_description",
        "claims",
        "abstract",
        "drawings_meta",
        "office_action",
      ],
      user_role: ["attorney", "inventor"],
    },
  },
} as const
