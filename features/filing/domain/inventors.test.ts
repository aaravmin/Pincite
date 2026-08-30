import { describe, it, expect } from "vitest";
import { normalizeInventors } from "@/features/filing/domain/inventors";
import type { InventorInput } from "@/features/filing/domain/types";

const row = (p: Partial<InventorInput> = {}): InventorInput => ({
  legal_name: "",
  residence: "",
  mailing_address: "",
  citizenship: "",
  ...p,
});

describe("normalizeInventors", () => {
  it("trims every field", () => {
    expect(
      normalizeInventors([
        row({
          legal_name: "  Dana Synthetic  ",
          residence: " Austin, TX ",
          mailing_address: "\t1 Test St\n",
          citizenship: " United States ",
        }),
      ]),
    ).toEqual([
      {
        legal_name: "Dana Synthetic",
        residence: "Austin, TX",
        mailing_address: "1 Test St",
        citizenship: "United States",
      },
    ]);
  });

  it("drops a row where every field is blank or whitespace", () => {
    expect(normalizeInventors([row(), row({ residence: "   " })])).toEqual([]);
  });

  it("keeps a row that carries any one field", () => {
    expect(normalizeInventors([row({ citizenship: "CA" })])).toHaveLength(1);
    expect(normalizeInventors([row({ residence: "Austin" })])).toHaveLength(1);
    expect(normalizeInventors([row({ mailing_address: "1 St" })])).toHaveLength(1);
  });

  it("preserves order, so the caller's index becomes ord", () => {
    const out = normalizeInventors([
      row({ legal_name: "First" }),
      row(),
      row({ legal_name: "Second" }),
    ]);
    expect(out.map((i) => i.legal_name)).toEqual(["First", "Second"]);
  });

  it("tolerates missing fields on an untyped payload", () => {
    const loose = [{} as InventorInput, { legal_name: "Solo" } as InventorInput];
    expect(normalizeInventors(loose)).toEqual([
      {
        legal_name: "Solo",
        residence: "",
        mailing_address: "",
        citizenship: "",
      },
    ]);
  });

  it("returns a new array and does not mutate the input", () => {
    const input = [row({ legal_name: " A " })];
    const out = normalizeInventors(input);
    expect(input[0].legal_name).toBe(" A ");
    expect(out).not.toBe(input);
  });
});
