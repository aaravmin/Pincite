import "server-only";

/**
 * Validate the MPEP pins carried by the lifecycle actions against the corpus and drop the
 * ones that do not resolve (the CFR reference still shows). This is the citation discipline
 * from the roadmap: no claim reaches the screen without a citation that resolves to real
 * text. It lives in the application layer because it needs the corpus; `lifecycleActions`
 * itself stays pure.
 */
import { resolvePins } from "@/features/mpep/application/validate-citations";
import type { LifecycleAction } from "@/features/projects/domain/lifecycle";

export async function resolveActionPins(
  actions: LifecycleAction[],
): Promise<LifecycleAction[]> {
  return resolvePins(actions);
}
