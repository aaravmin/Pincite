import { describe, expect, it } from "vitest";
import { surfaceRules, type RuleInput } from "@/lib/rules/surface";

const input = (over: Partial<RuleInput> = {}): RuleInput => ({
  patentType: "utility",
  filled: [],
  sections: {},
  declared_status: "drafting",
  ...over,
});

const pins = (rules: { mpep_section: string | null }[]) => rules.map((r) => r.mpep_section);
const byPin = <T extends { mpep_section: string | null }>(rules: T[], pin: string) =>
  rules.find((r) => r.mpep_section === pin);

describe("surfaceRules - applies now", () => {
  it("lists the four drafting rules before any claims exist", () => {
    const { appliesNow } = surfaceRules(input());
    expect(pins(appliesNow)).toEqual(["2161", "2173", "608.01(a)", "608.01(b)"]);
    expect(appliesNow.every((r) => r.reason === "You're drafting.")).toBe(true);
    expect(appliesNow.every((r) => r.actionable)).toBe(true);
  });

  it("adds the four claim rules once the claims section is filled", () => {
    const { appliesNow } = surfaceRules(input({ filled: ["claims"] }));
    expect(pins(appliesNow)).toEqual([
      "2161",
      "2173",
      "608.01(a)",
      "608.01(b)",
      "608.01(m)",
      "608.01(n)",
      "2111.03",
      "2181",
    ]);
    expect(byPin(appliesNow, "608.01(m)")).toMatchObject({
      cfr_ref: "37 CFR 1.75",
      reason: "You have claims.",
      actionable: true,
    });
    expect(byPin(appliesNow, "2111.03")?.cfr_ref).toBeNull();
  });

  it("keys the claim rules on the filled list, not on the claims text", () => {
    const { appliesNow } = surfaceRules(
      input({ sections: { claims: "1. A widget comprising a base." } }),
    );
    expect(pins(appliesNow)).toEqual(["2161", "2173", "608.01(a)", "608.01(b)"]);
  });

  it("switches to amendment practice once filed or published", () => {
    for (const declared_status of ["filed", "published"]) {
      const { appliesNow } = surfaceRules(input({ declared_status, filled: ["claims"] }));
      expect(appliesNow).toEqual([
        {
          mpep_section: "714",
          cfr_ref: "37 CFR 1.121",
          note: "Amendments must follow amendment-practice format.",
          reason: "Filed or published.",
          actionable: true,
        },
      ]);
    }
  });

  it("switches to reply practice for an outstanding office action", () => {
    const { appliesNow } = surfaceRules(input({ declared_status: "office_action" }));
    expect(appliesNow).toEqual([
      {
        mpep_section: "714",
        cfr_ref: "37 CFR 1.111",
        note: "Reply to the office action and address every rejection.",
        reason: "Office action outstanding.",
        actionable: true,
      },
    ]);
  });

  it("lists nothing for the allowed and granted statuses", () => {
    expect(surfaceRules(input({ declared_status: "allowed" })).appliesNow).toEqual([]);
    expect(surfaceRules(input({ declared_status: "granted" })).appliesNow).toEqual([]);
  });

  it("treats any unrecognized status as drafting", () => {
    expect(pins(surfaceRules(input({ declared_status: "" })).appliesNow)).toEqual([
      "2161",
      "2173",
      "608.01(a)",
      "608.01(b)",
    ]);
  });
});

describe("surfaceRules - conditional rules", () => {
  it("always returns the same eight conditions in the same order", () => {
    const { conditional } = surfaceRules(input());
    expect(pins(conditional)).toEqual([
      "608.01(m)",
      "2181",
      "211",
      "140",
      "2152",
      "201",
      "714",
      "803",
    ]);
    expect(conditional.every((c) => c.trigger.startsWith("If "))).toBe(true);
  });

  it("triggers none of them for an empty drafting project", () => {
    expect(surfaceRules(input()).conditional.filter((c) => c.triggered)).toEqual([]);
  });

  it("triggers the excess-claim fee above three independent claims", () => {
    const claims = [1, 2, 3].map((n) => `${n}. A widget comprising a base ${n}.`).join("\n");
    expect(byPin(surfaceRules(input({ sections: { claims } })).conditional, "608.01(m)")).toMatchObject({
      triggered: false,
    });
    const four = claims + "\n4. A widget comprising a base 4.";
    const rule = byPin(surfaceRules(input({ sections: { claims: four } })).conditional, "608.01(m)");
    expect(rule).toMatchObject({
      triggered: true,
      cfr_ref: "37 CFR 1.16(h)/(i)",
      actionable: false,
      met: "Your claims include a 4th independent or 21st total claim",
    });
  });

  it("triggers the excess-claim fee above twenty total claims", () => {
    const dependent = (n: number) => `${n}. The widget of claim 1, wherein it is round ${n}.`;
    const twenty = ["1. A widget comprising a base."]
      .concat(Array.from({ length: 19 }, (_, i) => dependent(i + 2)))
      .join("\n");
    expect(
      byPin(surfaceRules(input({ sections: { claims: twenty } })).conditional, "608.01(m)")?.triggered,
    ).toBe(false);
    const twentyOne = twenty + "\n" + dependent(21);
    expect(
      byPin(surfaceRules(input({ sections: { claims: twentyOne } })).conditional, "608.01(m)")?.triggered,
    ).toBe(true);
  });

  it("counts a multiple dependent claim as independent when tallying the fee", () => {
    // "claims 1 or 2" is not the singular "claim N" the counter looks for.
    const claims = [
      "1. A widget comprising a base.",
      "2. The widget of claims 1 or 1, wherein it is round.",
      "3. The widget of claims 1 or 2, wherein it is red.",
      "4. The widget of claims 1 or 3, wherein it is heavy.",
    ].join("\n");
    expect(
      byPin(surfaceRules(input({ sections: { claims } })).conditional, "608.01(m)")?.triggered,
    ).toBe(true);
  });

  it("triggers the means-plus-function condition on a nonce phrase", () => {
    const rule = byPin(
      surfaceRules(input({ sections: { claims: "1. A widget comprising a means for gripping." } }))
        .conditional,
      "2181",
    );
    expect(rule).toMatchObject({ triggered: true, cfr_ref: "35 U.S.C. 112(f)", actionable: true });
  });

  it("does not trigger means plus function without a following function", () => {
    expect(
      byPin(surfaceRules(input({ sections: { claims: "1. A widget comprising a module." } })).conditional, "2181")
        ?.triggered,
    ).toBe(false);
  });

  it("triggers the priority condition once the cross-reference has content", () => {
    expect(byPin(surfaceRules(input({ sections: { cross_reference: "  " } })).conditional, "211")?.triggered).toBe(
      false,
    );
    const rule = byPin(
      surfaceRules(input({ sections: { cross_reference: "This claims priority to 63/000,001." } })).conditional,
      "211",
    );
    expect(rule).toMatchObject({
      triggered: true,
      met: "You reference an earlier application in the cross-reference section",
      cfr_ref: "35 U.S.C. 119(e); 37 CFR 1.78",
    });
  });

  it("triggers the reply-period condition for an outstanding office action", () => {
    const rule = byPin(surfaceRules(input({ declared_status: "office_action" })).conditional, "714");
    expect(rule).toMatchObject({
      triggered: true,
      met: "An office action is outstanding",
      actionable: false,
    });
  });

  it("leaves the conditions Pincite cannot observe untriggered", () => {
    const claims = "1. A widget comprising a means for gripping.";
    const { conditional } = surfaceRules(
      input({
        declared_status: "office_action",
        sections: { claims, cross_reference: "Priority to 63/000,001." },
      }),
    );
    // Foreign filing, public disclosure, new matter and restriction are user facts.
    for (const pin of ["140", "2152", "201", "803"]) {
      expect(byPin(conditional, pin)?.triggered).toBe(false);
    }
  });
});

describe("surfaceRules - patent type", () => {
  it("does not currently vary with the patent type", () => {
    const sections = { claims: "1. A widget comprising a means for gripping." };
    expect(surfaceRules(input({ patentType: "design", filled: ["claims"], sections }))).toEqual(
      surfaceRules(input({ patentType: "utility", filled: ["claims"], sections })),
    );
  });
});
