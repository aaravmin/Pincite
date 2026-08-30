"use client";

/**
 * The Review screen's interactive shell: it owns the mutation state (which check is running,
 * what the last run said, which finding is expanded) and what the right-hand pane shows. The
 * list, the toolbar, the diff, and the §101 panel are separate components; this one only
 * orchestrates them.
 *
 * Clicking a finding opens its pinned MPEP section beside the list, so the reasoning and the
 * primary source are on screen together - no claim without a citation that resolves.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EvidencePane } from "@/features/mpep/ui/evidence-pane";
import type { MpepSection } from "@/features/mpep/domain/types";
import {
  analyzeEligibility,
  getRuleSection,
  runValidators,
} from "@/features/review/actions";
import {
  countBySeverity,
  type FindingRow,
} from "@/features/review/domain/finding";
import {
  EligibilityPanel,
  type Eligibility,
} from "@/features/review/ui/eligibility-panel";
import { FindingGroups } from "@/features/review/ui/finding-groups";
import { ReviewToolbar } from "@/features/review/ui/review-toolbar";

export function ReviewClient({
  projectId,
  sections,
  findings,
}: {
  projectId: string;
  sections: Record<string, string>;
  findings: FindingRow[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [rule, setRule] = useState<MpepSection | null>(null);
  const [elig, setElig] = useState<Eligibility | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function check() {
    setMsg(null);
    start(async () => {
      const r = await runValidators(projectId);
      if ("error" in r) return setMsg(r.error);
      setMsg(`${r.count} finding(s).`);
      router.refresh();
    });
  }

  function openRule(num: string) {
    setElig(null);
    start(async () => setRule(await getRuleSection(num)));
  }

  // One click on a finding shows its reasoning and opens its pinned rule beside the draft.
  function selectFinding(f: FindingRow) {
    setSelectedId((prev) => (prev === f.id ? null : f.id));
    if (f.mpep_section) openRule(f.mpep_section);
  }

  function analyze101() {
    setMsg(null);
    start(async () => {
      const r = await analyzeEligibility(projectId);
      if ("error" in r) return setMsg(r.error);
      setRule(null);
      setElig(r);
    });
  }

  const counts = countBySeverity(findings);

  return (
    <div className="flex h-full flex-col">
      <ReviewToolbar
        pending={pending}
        message={msg}
        violations={counts.violation}
        attention={counts.attention}
        onCheck={check}
        onAnalyzeEligibility={analyze101}
      />

      <div className="flex min-h-0 flex-1">
        <FindingGroups
          findings={findings}
          projectId={projectId}
          sections={sections}
          selectedId={selectedId}
          onSelect={selectFinding}
          onOpenRule={openRule}
        />

        <div className="min-w-0 flex-1 overflow-auto" data-testid="rule-pane">
          {elig ? (
            <EligibilityPanel data={elig} onOpenRule={openRule} />
          ) : rule ? (
            <EvidencePane section={rule} span={null} />
          ) : (
            <p className="px-6 py-4 text-sm text-muted-foreground">
              Pick a finding to see its rule here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
