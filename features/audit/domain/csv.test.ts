import { describe, expect, it } from "vitest";
import { AUDIT_CSV_COLUMNS, csvCell, toAuditCsv } from "@/features/audit/domain/csv";

describe("csvCell", () => {
  it("quotes every value", () => {
    expect(csvCell("plain")).toBe('"plain"');
  });

  it("renders null and undefined as an empty cell", () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it("serializes an object detail as JSON", () => {
    // The sanitizer turns JSON's key/value colon into a space - see the note below.
    expect(csvCell({ source: "manual" })).toBe('"{""source"" ""manual""}"');
  });

  it("doubles an embedded quote so the cell cannot break out", () => {
    expect(csvCell('he said "no"')).toBe('"he said ""no"""');
  });

  it("passes text through the shared output sanitizer", () => {
    // The sanitizer replaces dashes and colons, so a timestamp is spaced out. That is the
    // long-standing behavior of this export; the point here is that nothing bypasses it.
    expect(csvCell("2026-08-29T10:00:00Z")).toBe('"2026 08 29T10 00 00Z"');
  });

  it("keeps a newline inside its quoted cell", () => {
    expect(csvCell("a\nb")).toBe('"a\nb"');
  });
});

describe("toAuditCsv", () => {
  it("writes the header row even with no records", () => {
    expect(toAuditCsv([])).toBe(AUDIT_CSV_COLUMNS.join(","));
  });

  it("writes one row per record in column order", () => {
    const csv = toAuditCsv([
      {
        created_at: "2026/08/29",
        action: "login",
        project_id: null,
        detail: { ip: "x" },
        ip: "1.2.3.4",
      },
    ]);
    expect(csv.split("\n")).toEqual([
      "created_at,action,project_id,detail,ip",
      '"2026/08/29","login","","{""ip"" ""x""}","1.2.3.4"',
    ]);
  });

  it("ignores columns the caller did not select", () => {
    const csv = toAuditCsv([{ action: "logout", user_id: "secret" }]);
    expect(csv).not.toContain("secret");
  });
});
