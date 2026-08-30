import "server-only";

/**
 * The page model for the rules screen (roadmap §4.4): surface the rules that apply now and
 * the ones that may apply next, then drop every MPEP pin that does not resolve to real
 * corpus text (the anti-hallucination spine), so nothing is cited that cannot be opened.
 *
 * Both lists are validated in ONE corpus round trip - the same two steps `resolvePins`
 * performs, split so a pin shared by the two lists is not looked up twice.
 */
import { validateCitations } from "@/features/mpep/application/validate-citations";
import {
  applyResolvedPins,
  collectPins,
} from "@/features/mpep/domain/citations";
import {
  surfaceRules,
  type ConditionalRule,
  type RuleInput,
  type SurfacedRule,
} from "@/features/rules/domain/surface";

export type RulesPageModel = {
  appliesNow: SurfacedRule[];
  conditional: ConditionalRule[];
};

export async function getRulesPage(input: RuleInput): Promise<RulesPageModel> {
  const { appliesNow, conditional } = surfaceRules(input);
  const resolved = await validateCitations(
    collectPins([...appliesNow, ...conditional]),
  );
  return {
    appliesNow: applyResolvedPins(appliesNow, resolved),
    conditional: applyResolvedPins(conditional, resolved),
  };
}
