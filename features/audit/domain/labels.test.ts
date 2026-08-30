import { describe, expect, it } from "vitest";
import type { AuditAction } from "@/shared/audit/actions";
import { ACTION_LABELS, actionLabel } from "@/features/audit/domain/labels";

/**
 * Every action the app can record. Typed as AuditAction[], so a name that leaves the union
 * fails to compile; the length assertion below catches an action added to the union (and to
 * ACTION_LABELS, which the compiler already forces) but never listed here.
 */
const ALL_ACTIONS: AuditAction[] = [
  "login",
  "logout",
  "consent_granted",
  "project_created",
  "project_status_changed",
  "section_edited",
  "version_saved",
  "version_restored",
  "version_branched",
  "findings_run",
  "prior_art_searched",
  "rule_surfaced",
  "export_generated",
  "role_selected",
  "applicant_saved",
  "inventors_saved",
  "declaration_signed",
  "attachment_uploaded",
  "attachment_deleted",
  "disclosure_saved",
  "drawing_analyzed",
  "drawing_oriented",
  "project_deleted",
];

describe("ACTION_LABELS", () => {
  it("labels every recordable action", () => {
    for (const action of ALL_ACTIONS) {
      expect(ACTION_LABELS[action], action).toBeTruthy();
    }
  });

  it("has no label for an action that cannot be recorded", () => {
    expect(Object.keys(ACTION_LABELS).sort()).toEqual([...ALL_ACTIONS].sort());
  });

  it("never renders a raw snake_case action name", () => {
    for (const action of ALL_ACTIONS) {
      expect(ACTION_LABELS[action]).not.toContain("_");
    }
  });
});

describe("actionLabel", () => {
  it("returns the human label", () => {
    expect(actionLabel("drawing_analyzed")).toBe("Drawing checked");
    expect(actionLabel("inventors_saved")).toBe("Inventors saved");
  });

  it("falls back to the raw value for a row written by an older build", () => {
    expect(actionLabel("something_retired")).toBe("something_retired");
  });
});
