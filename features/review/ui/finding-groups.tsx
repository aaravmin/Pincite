"use client";

/**
 * The findings list, grouped by process area (Claims vs Draft) so the user sees WHERE a
 * problem sits rather than a flat wall. Violations come before attention items; passes are
 * not listed. The grouping itself is a pure domain function, shared with anything else that
 * needs to present findings.
 */
import {
  groupByArea,
  type FindingRow,
} from "@/features/review/domain/finding";
import { FindingItem } from "@/features/review/ui/finding-item";

export function FindingGroups({
  findings,
  projectId,
  sections,
  selectedId,
  onSelect,
  onOpenRule,
}: {
  findings: FindingRow[];
  projectId: string;
  sections: Record<string, string>;
  selectedId: string | null;
  onSelect: (f: FindingRow) => void;
  onOpenRule: (n: string) => void;
}) {
  const groups = groupByArea(findings);

  return (
    <div className="w-1/2 shrink-0 overflow-auto border-r border-border px-6 py-4">
      {findings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No findings yet. Run a check.
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map(({ area, items }) => (
            <div key={area}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {area} ({items.length})
              </p>
              <ul className="space-y-2">
                {items.map((f) => (
                  <FindingItem
                    key={f.id}
                    f={f}
                    projectId={projectId}
                    sections={sections}
                    selected={selectedId === f.id}
                    onSelect={() => onSelect(f)}
                    onOpenRule={onOpenRule}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
