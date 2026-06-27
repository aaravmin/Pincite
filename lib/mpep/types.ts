import type { MpepSection } from "@/lib/mpep/load";

export type AskResult = {
  query: string;
  section: MpepSection | null;
  span: { start: number; end: number } | null;
  alternatives: { section_number: string; title: string | null }[];
  requested: { resolved: string[]; dropped: string[] };
};
