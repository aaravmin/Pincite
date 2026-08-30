import { describe, expect, it } from "vitest";
import { lifecycleActions } from "@/lib/lifecycle/actions";

const titles = (status: Parameters<typeof lifecycleActions>[0], type?: "utility" | "design" | "plant") =>
  lifecycleActions(status, type).map((a) => a.title);

describe("lifecycleActions - drafting", () => {
  it("has nothing to do before filing", () => {
    expect(lifecycleActions("drafting")).toEqual([]);
    expect(lifecycleActions("drafting", "design")).toEqual([]);
  });
});

describe("lifecycleActions - filed", () => {
  it("warns about restriction and, for a utility case, publication at 18 months", () => {
    const [restriction, publication] = lifecycleActions("filed");
    expect(restriction).toEqual({
      title: "Watch for a restriction requirement",
      detail:
        "If the examiner restricts, elect one invention; pursue the rest in a divisional.",
      deadline: "Set period (often 1 month / 30 days)",
      cfr_ref: "37 CFR 1.142; 35 U.S.C. 121",
      mpep_section: "818",
    });
    expect(publication).toMatchObject({
      title: "Publication at 18 months",
      deadline: "18 months from the earliest filing date",
      cfr_ref: "35 U.S.C. 122; 37 CFR 1.211",
      mpep_section: "1120",
    });
  });

  it("says a design application does not pre-grant publish and carries no deadline", () => {
    const [, publication] = lifecycleActions("filed", "design");
    expect(publication).toMatchObject({
      title: "Design applications are not pre-grant published",
      detail: "Not published before grant; only the issued patent publishes.",
      deadline: null,
      mpep_section: "1120",
    });
  });

  it("keeps the same restriction warning for a design application", () => {
    expect(lifecycleActions("filed", "design")[0]).toEqual(lifecycleActions("filed")[0]);
  });

  it("defaults to the utility wording", () => {
    expect(titles("filed")).toEqual(titles("filed", "utility"));
    expect(titles("filed", "plant")).toEqual(titles("filed", "utility"));
  });
});

describe("lifecycleActions - published", () => {
  it("has one waiting action", () => {
    expect(lifecycleActions("published")).toEqual([
      {
        title: "Await examination; respond promptly to any office action",
        detail:
          "The USPTO controls timing; the reply clock starts when an office action issues.",
        deadline: null,
        cfr_ref: "37 CFR 1.211",
        mpep_section: "1120",
      },
    ]);
  });
});

describe("lifecycleActions - office action", () => {
  it("lists the reply, the abandonment risk and the after-final paths", () => {
    const actions = lifecycleActions("office_action");
    expect(actions.map((a) => a.title)).toEqual([
      "Reply to every rejection and objection",
      "Missing the reply deadline abandons the application",
      "After a FINAL rejection, choose a path",
    ]);
    expect(actions[0]).toMatchObject({
      deadline: "3 months, extendable to 6 with fees",
      cfr_ref: "37 CFR 1.111; 1.136(a); 35 U.S.C. 133",
      mpep_section: "714",
    });
    expect(actions[1]).toMatchObject({
      deadline: "6 months absolute maximum from the action",
      cfr_ref: "37 CFR 1.135; 1.137",
      mpep_section: "711",
    });
    expect(actions[2]).toMatchObject({
      cfr_ref: "37 CFR 1.116; 1.114; 41.31",
      mpep_section: "706.07(h)",
    });
  });

  it("does not vary with the patent type", () => {
    expect(lifecycleActions("office_action", "design")).toEqual(
      lifecycleActions("office_action", "utility"),
    );
  });
});

describe("lifecycleActions - allowed", () => {
  it("has one non-extendable issue-fee action", () => {
    const [action] = lifecycleActions("allowed");
    expect(action).toEqual({
      title: "Pay the issue fee",
      detail:
        "Pay the issue fee (and publication fee if due) to let the patent grant. Not extendable.",
      deadline: "3 months from the Notice of Allowance. This is not extendable",
      cfr_ref: "37 CFR 1.311; 35 U.S.C. 151",
      mpep_section: "1306",
    });
  });
});

describe("lifecycleActions - granted", () => {
  it("schedules the utility maintenance fees", () => {
    expect(lifecycleActions("granted")).toEqual([
      {
        title: "Pay maintenance fees on schedule",
        detail:
          "Keep the patent in force; each window has a 6-month grace period with surcharge.",
        deadline: "Due at 3-3.5, 7-7.5, and 11-11.5 years from the grant date",
        cfr_ref: "37 CFR 1.20(e)-(h); 35 U.S.C. 41(b)",
        mpep_section: "2506",
      },
    ]);
  });

  it("says a design patent has no maintenance fees", () => {
    expect(lifecycleActions("granted", "design")).toEqual([
      {
        title: "No maintenance fees for a design patent",
        detail: "No maintenance fees. Term is 15 years from grant.",
        deadline: null,
        cfr_ref: "35 U.S.C. 173",
        mpep_section: "1505",
      },
    ]);
  });

  it("treats a plant patent like a utility patent", () => {
    expect(lifecycleActions("granted", "plant")).toEqual(lifecycleActions("granted", "utility"));
  });
});

describe("lifecycleActions - pins", () => {
  it("carries an MPEP pin on every action, for corpus validation before display", () => {
    for (const status of ["filed", "published", "office_action", "allowed", "granted"] as const) {
      for (const type of ["utility", "design"] as const) {
        for (const action of lifecycleActions(status, type)) {
          expect(action.mpep_section).toBeTruthy();
          expect(action.cfr_ref).toBeTruthy();
        }
      }
    }
  });
});
