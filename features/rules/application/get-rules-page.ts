import "server-only";

/**
 * The page model for the rules screen (roadmap §4.4): surface the rules that apply now and
 * the ones that may apply next, then drop every MPEP pin that does not resolve to real
 * corpus text (the anti-hallucination spine), so nothing is cited that cannot be opened.
 *
 * Both lists are validated in ONE corpus round trip - the same two steps `resolvePins`
 * performs, split so a pin shared by the two lists is not looked up twice.
 *
 * The draft it reasons over comes from the request-cached project snapshot, so opening
 * Rules from another project screen costs no extra queries; `null` means the matter is not
 * visible to the viewer and the caller answers notFound().
 */
import { getProjectSnapshot } from "@/features/projects/application/get-project-snapshot";
import { SECTION_KEYS } from "@/features/projects/domain/sections";
import { validateCitations } from "@/features/mpep/application/validate-citations";
import {
  applyResolvedPins,
  collectPins,
} from "@/features/mpep/domain/citations";
import {
  surfaceRules,
  type ConditionalRule,
  type SurfacedRule,
} from "@/features/rules/domain/surface";

export type RulesPageModel = {
  appliesNow: SurfacedRule[];
  conditional: ConditionalRule[];
};

export async function getRulesPage(
  projectId: string,
): Promise<RulesPageModel | null> {
  const snapshot = await getProjectSnapshot(projectId);
  if (!snapshot) return null;
  const { project, sections } = snapshot;

  const { appliesNow, conditional } = surfaceRules({
    patentType: project.patent_type,
    filled: SECTION_KEYS.filter((k) => sections[k].trim().length > 0),
    sections,
    declared_status: project.declared_status,
  });

  const resolved = await validateCitations(
    collectPins([...appliesNow, ...conditional]),
  );
  return {
    appliesNow: applyResolvedPins(appliesNow, resolved),
    conditional: applyResolvedPins(conditional, resolved),
  };
}
