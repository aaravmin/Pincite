/**
 * Lifecycle "what to do now" actions keyed to the declared status (roadmap §4.2 extended).
 * A patent goes well beyond "filed" — there are required, deadline-bound actions after a
 * rejection, after allowance, and after grant. Each action carries a CFR reference
 * (display-only) and an MPEP pin validated against the corpus before display.
 */
import type { ProjectStatus, PatentType } from "@/lib/projects/sections";
import { validateCitations } from "@/lib/mpep/citation";

export type LifecycleAction = {
  title: string;
  detail: string;
  deadline: string | null;
  cfr_ref: string | null;
  mpep_section: string | null;
};

export function lifecycleActions(
  status: ProjectStatus,
  patentType: PatentType = "utility",
): LifecycleAction[] {
  switch (status) {
    case "filed":
      return [
        {
          title: "Watch for a restriction requirement",
          detail:
            "If the examiner restricts the application, elect an invention or species within the set period; non-elected claims can be pursued in a divisional.",
          deadline: "Set period (often 1 month / 30 days)",
          cfr_ref: "37 CFR 1.142; 35 U.S.C. 121",
          mpep_section: "818",
        },
        {
          title:
            patentType === "design"
              ? "Design applications are not pre-grant published"
              : "Publication at 18 months",
          detail:
            patentType === "design"
              ? "A design application is not published before grant; only the issued design patent publishes."
              : "Utility applications publish about 18 months from the earliest filing date unless a nonpublication request was filed at filing.",
          deadline:
            patentType === "design"
              ? null
              : "18 months from the earliest filing date",
          cfr_ref: "35 U.S.C. 122; 37 CFR 1.211",
          mpep_section: "1120",
        },
      ];
    case "published":
      return [
        {
          title: "Await examination; respond promptly to any office action",
          detail:
            "Examination timing is controlled by the USPTO. When an office action issues, the reply clock starts immediately.",
          deadline: null,
          cfr_ref: "37 CFR 1.211",
          mpep_section: "1120",
        },
      ];
    case "office_action":
      return [
        {
          title: "Reply to every rejection and objection",
          detail:
            "A complete reply must address each ground of rejection and objection, and specifically amend or argue (not general allegations of error).",
          deadline:
            "3 months (shortened statutory period), extendable to 6 months total with fees",
          cfr_ref: "37 CFR 1.111; 1.136(a); 35 U.S.C. 133",
          mpep_section: "714",
        },
        {
          title: "Missing the reply deadline abandons the application",
          detail:
            "No reply by the deadline means abandonment by operation of law; revival then requires a petition showing the delay was unintentional.",
          deadline: "6 months absolute maximum from the action",
          cfr_ref: "37 CFR 1.135; 1.137",
          mpep_section: "711",
        },
        {
          title: "After a FINAL rejection, choose a path",
          detail:
            "Options are an after-final amendment (entry is discretionary), a Request for Continued Examination (RCE), or an appeal to the PTAB.",
          deadline: "Within the reply period for the final action",
          cfr_ref: "37 CFR 1.116; 1.114; 41.31",
          mpep_section: "706.07(h)",
        },
      ];
    case "allowed":
      return [
        {
          title: "Pay the issue fee",
          detail:
            "Pay the issue fee (and the publication fee if due) so the patent can grant. This deadline is NOT extendable — there is no authority to extend it.",
          deadline: "3 months from the Notice of Allowance (non-extendable)",
          cfr_ref: "37 CFR 1.311; 35 U.S.C. 151",
          mpep_section: "1306",
        },
      ];
    case "granted":
      return patentType === "design"
        ? [
            {
              title: "No maintenance fees for a design patent",
              detail:
                "Design patents require no maintenance fees. The term is 15 years from grant (for applications filed on or after May 13, 2015).",
              deadline: null,
              cfr_ref: "35 U.S.C. 173",
              mpep_section: "1505",
            },
          ]
        : [
            {
              title: "Pay maintenance fees on schedule",
              detail:
                "Utility maintenance fees keep the patent in force; each window has a 6-month grace period with a surcharge. Missing them lets the patent lapse.",
              deadline:
                "Due at 3-3.5, 7-7.5, and 11-11.5 years from the grant date",
              cfr_ref: "37 CFR 1.20(e)-(h); 35 U.S.C. 41(b)",
              mpep_section: "2506",
            },
          ];
    case "drafting":
    default:
      return [];
  }
}

/** Validate MPEP pins against the corpus; drop unresolved (the CFR ref still shows). */
export async function resolveActionPins(
  actions: LifecycleAction[],
): Promise<LifecycleAction[]> {
  const pins = actions
    .map((a) => a.mpep_section)
    .filter((p): p is string => !!p);
  const resolved = pins.length
    ? await validateCitations(pins)
    : new Set<string>();
  return actions.map((a) => ({
    ...a,
    mpep_section:
      a.mpep_section && resolved.has(a.mpep_section) ? a.mpep_section : null,
  }));
}
