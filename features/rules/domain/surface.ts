/**
 * Rule surfacing (roadmap §4.4): two lists. "Applies now" - the rules that govern the
 * current work, each pinned. "May apply next" - "if X then rule Y" items, each carrying
 * both a `trigger` ("If you add a 4th claim...") for when it has NOT happened yet and a
 * present-tense `met` ("Your claims include a 4th claim...") for when it HAS. `triggered`
 * says which is true now: the UI moves met conditions up into Applies-now and only leaves
 * the genuinely-future ones under May-apply-next, so nothing ever sits under "may apply
 * next" while claiming to already apply. Honors actionable vs informational (fees/deadlines
 * are informational). Pure; MPEP pins are corpus-validated by the caller before display.
 */
import { parseClaims } from "@/lib/patent/claims";
import type { PatentType } from "@/lib/projects/sections";

export type SurfacedRule = {
  mpep_section: string | null;
  cfr_ref: string | null;
  note: string;
  /** Plain-language reason this rule is in the Applies-now list right now. */
  reason?: string;
  actionable: boolean;
};
export type ConditionalRule = SurfacedRule & {
  /** "If X..." - shown while the condition has NOT happened yet. */
  trigger: string;
  /** Present-tense restatement - shown once the condition is met, so it reads as a fact. */
  met: string;
  triggered: boolean;
};

export type RuleInput = {
  patentType: PatentType;
  filled: string[];
  sections: Record<string, string>;
  declared_status: string;
};

const NONCE_RE =
  /\b(means|module|mechanism|unit|element|component|member|assembly|arrangement|device)\s+for\s+\w+/i;

export function surfaceRules(input: RuleInput): {
  appliesNow: SurfacedRule[];
  conditional: ConditionalRule[];
} {
  const f = new Set(input.filled);
  const claimsText = input.sections["claims"] ?? "";
  const claims = parseClaims(claimsText);
  const total = claims.length;
  const independent = claims.filter(
    (c) => !/\bclaim\s+\d+\b/i.test(c.raw),
  ).length;
  const hasNonce = NONCE_RE.test(claimsText);
  const hasCrossRef = (input.sections["cross_reference"] ?? "").trim().length > 0;
  const isOfficeAction = input.declared_status === "office_action";
  const drafting = !["filed", "published", "office_action", "allowed", "granted"].includes(
    input.declared_status,
  );

  const appliesNow: SurfacedRule[] = [];
  const add = (
    mpep_section: string | null,
    cfr_ref: string | null,
    note: string,
    reason: string,
    actionable = true,
  ) => appliesNow.push({ mpep_section, cfr_ref, note, reason, actionable });

  // Short reason fragment so the user sees WHY each rule is on the Applies-now list.
  const draftingReason = "You're drafting.";
  const claimsReason = "You have claims.";

  if (drafting) {
    add(
      "2161",
      "35 U.S.C. 112(a)",
      "Describe everything you claim in enough detail that someone in the field could make and use it.",
      draftingReason,
    );
    add(
      "2173",
      "35 U.S.C. 112(b)",
      "Claims must be definite - each one has to state clearly and exactly what it covers.",
      draftingReason,
    );
    add(
      "608.01(a)",
      "37 CFR 1.77",
      "Use the standard section order.",
      draftingReason,
    );
    add(
      "608.01(b)",
      "37 CFR 1.72(b)",
      "Abstract: one paragraph, 150 words or fewer.",
      draftingReason,
    );
    if (f.has("claims")) {
      add(
        "608.01(m)",
        "37 CFR 1.75",
        "Each claim is one sentence; number them consecutively.",
        claimsReason,
      );
      add(
        "608.01(n)",
        "37 CFR 1.75(c)",
        "A dependent claim refers to and further limits an earlier claim.",
        claimsReason,
      );
      add(
        "2111.03",
        null,
        "Start each claim's body with a recognized linking word like 'comprising' - it controls how broadly the claim is read.",
        claimsReason,
      );
      add(
        "2181",
        "35 U.S.C. 112(f)",
        "If a claim says 'means for' doing something, describe the actual part that performs it.",
        claimsReason,
      );
    }
  } else if (input.declared_status === "filed" || input.declared_status === "published") {
    add(
      "714",
      "37 CFR 1.121",
      "Amendments must follow amendment-practice format.",
      "Filed or published.",
    );
  } else if (isOfficeAction) {
    add(
      "714",
      "37 CFR 1.111",
      "Reply to the office action and address every rejection.",
      "Office action outstanding.",
    );
  }

  const conditional: ConditionalRule[] = [
    {
      trigger: "If you add a 4th independent or 21st total claim",
      met: "Your claims include a 4th independent or 21st total claim",
      triggered: independent >= 4 || total >= 21,
      mpep_section: "608.01(m)",
      cfr_ref: "37 CFR 1.16(h)/(i)",
      note: "The USPTO charges an extra fee for each claim past those limits.",
      actionable: false,
    },
    {
      trigger:
        "If a claim uses 'means for' wording (or a placeholder like 'module for') instead of naming a specific part",
      met: "A claim uses 'means for' wording (or a placeholder like 'module for') instead of naming a specific part",
      triggered: hasNonce,
      mpep_section: "2181",
      cfr_ref: "35 U.S.C. 112(f)",
      note: "That claim will be read to cover only the structure you actually describe in the specification - describe that structure, or the claim can be held unclear (indefinite).",
      actionable: true,
    },
    {
      trigger: "If you claim an earlier application's filing date",
      met: "You reference an earlier application in the cross-reference section",
      triggered: hasCrossRef,
      mpep_section: "211",
      cfr_ref: "35 U.S.C. 119(e); 37 CFR 1.78",
      note: "File within 12 months of it, share at least one inventor, and make sure that earlier filing fully supports these claims under §112.",
      actionable: true,
    },
    {
      trigger: "If you plan to file this invention abroad",
      met: "You plan to file this invention abroad",
      triggered: false,
      mpep_section: "140",
      cfr_ref: "35 U.S.C. 184",
      note: "You need a foreign filing license first, or wait 6 months after filing in the US.",
      actionable: false,
    },
    {
      trigger: "If the invention was publicly disclosed before filing",
      met: "The invention was publicly disclosed before filing",
      triggered: false,
      mpep_section: "2152",
      cfr_ref: "35 U.S.C. 102(b)(1)",
      note: "A 1-year grace period starts from that disclosure; file before it runs out.",
      actionable: false,
    },
    {
      trigger: "If you add new material to a continuation application",
      met: "You added new material to a continuation application",
      triggered: false,
      mpep_section: "201",
      cfr_ref: "35 U.S.C. 132",
      note: "File it as a continuation-in-part instead; the new material only gets the later filing date.",
      actionable: true,
    },
    {
      trigger: "If the examiner sends an office action",
      met: "An office action is outstanding",
      triggered: isOfficeAction,
      mpep_section: "714",
      cfr_ref: "37 CFR 1.136(a)",
      note: "You have a set time to reply (commonly 3 months), extendable for a fee.",
      actionable: false,
    },
    {
      trigger: "If the examiner requires you to pick one invention (a restriction requirement)",
      met: "The examiner has required you to pick one invention (a restriction requirement)",
      triggered: false,
      mpep_section: "803",
      cfr_ref: "35 U.S.C. 121",
      note: "Choose one invention to pursue now; you can file the rest later as divisional applications.",
      actionable: true,
    },
  ];

  return { appliesNow, conditional };
}
