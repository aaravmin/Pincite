/**
 * Rule surfacing (roadmap §4.4): two lists. "Applies now" - the rules that govern the
 * current work, each pinned. "May apply next" - a conditional decision tree of "if X then
 * rule Y" items with the trigger spelled out; each carries `triggered` = whether the draft
 * already meets the trigger (so the UI can show "now applies"). Honors actionable vs
 * informational (fees/deadlines are informational). Pure; MPEP pins are corpus-validated
 * by the caller before display.
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
export type ConditionalRule = SurfacedRule & { trigger: string; triggered: boolean };

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

  // Plain-language reasons so the user sees WHY each rule is on the Applies-now list.
  const draftingReason = "Your application is at the drafting stage, so the disclosure and format rules govern now.";
  const claimsReason = "You have written claims, so the claim-form rules apply to them.";

  if (drafting) {
    add(
      "2161",
      "35 U.S.C. 112(a)",
      "Written description and enablement: your draft must show possession and enable the full scope of what is claimed.",
      draftingReason,
    );
    add(
      "2173",
      "35 U.S.C. 112(b)",
      "Claims must be definite - particularly point out and distinctly claim the invention.",
      draftingReason,
    );
    add(
      "608.01(a)",
      "37 CFR 1.77",
      "Arrange the application in the standard section order.",
      draftingReason,
    );
    add(
      "608.01(b)",
      "37 CFR 1.72(b)",
      "Abstract: a single paragraph, 150 words or fewer.",
      draftingReason,
    );
    if (f.has("claims")) {
      add(
        "608.01(m)",
        "37 CFR 1.75",
        "Each claim is a single sentence; number claims consecutively.",
        claimsReason,
      );
      add(
        "608.01(n)",
        "37 CFR 1.75(c)",
        "A dependent claim must refer to a preceding claim and further limit it.",
        claimsReason,
      );
      add(
        "2111.03",
        null,
        "Use a recognized transitional phrase; it sets the claim's open or closed scope.",
        claimsReason,
      );
      add(
        "2181",
        "35 U.S.C. 112(f)",
        "If a claim uses functional 'means' language, your draft must disclose the corresponding structure.",
        claimsReason,
      );
    }
  } else if (input.declared_status === "filed" || input.declared_status === "published") {
    add(
      "714",
      "37 CFR 1.121",
      "After filing, amendments must follow the amendment-practice format.",
      "You marked this application as filed or published, so amendment practice now applies.",
    );
  } else if (isOfficeAction) {
    add(
      "714",
      "37 CFR 1.111",
      "Respond to the office action and address every ground of rejection.",
      "You marked this application as having an office action, so a reply is due.",
    );
  }

  const conditional: ConditionalRule[] = [
    {
      trigger: "If you add a fourth independent claim or a twenty-first total claim",
      triggered: independent >= 4 || total >= 21,
      mpep_section: "608.01(m)",
      cfr_ref: "37 CFR 1.16(h)/(i)",
      note: "Excess-claim fees apply, paid to the USPTO.",
      actionable: false,
    },
    {
      trigger: "If a claim uses 'means for' (or a nonce word) for a function",
      triggered: hasNonce,
      mpep_section: "2181",
      cfr_ref: "35 U.S.C. 112(f)",
      note: "§112(f) is invoked; disclose corresponding structure in your draft or the limitation may be indefinite.",
      actionable: true,
    },
    {
      trigger: "If you claim the benefit of a provisional application",
      triggered: hasCrossRef,
      mpep_section: "211",
      cfr_ref: "35 U.S.C. 119(e); 37 CFR 1.78",
      note: "File within twelve months, share at least one inventor, and have §112 support in the provisional for anything claimed.",
      actionable: true,
    },
    {
      trigger: "If you intend to file abroad",
      triggered: false,
      mpep_section: "140",
      cfr_ref: "35 U.S.C. 184",
      note: "A foreign filing license is required before exporting unpublished subject matter, or wait six months from the US filing.",
      actionable: false,
    },
    {
      trigger: "If the invention was publicly disclosed",
      triggered: false,
      mpep_section: "2152",
      cfr_ref: "35 U.S.C. 102(b)(1)",
      note: "The one-year grace period starts running; a US filing must precede its expiry.",
      actionable: false,
    },
    {
      trigger: "If you add new matter to a continuation",
      triggered: false,
      mpep_section: "201",
      cfr_ref: "35 U.S.C. 132",
      note: "It must be filed as a continuation-in-part; the new matter gets the later effective date.",
      actionable: true,
    },
    {
      trigger: "If an office action issues",
      triggered: isOfficeAction,
      mpep_section: "714",
      cfr_ref: "37 CFR 1.136(a)",
      note: "A shortened statutory period (commonly three months) runs, extendable for escalating fees. Calendar the deadline; the extension fee is informational.",
      actionable: false,
    },
    {
      trigger: "If the examiner issues a restriction requirement",
      triggered: false,
      mpep_section: "803",
      cfr_ref: "35 U.S.C. 121",
      note: "Elect one invention to prosecute now; pursue the others in divisional applications.",
      actionable: true,
    },
  ];

  return { appliesNow, conditional };
}
