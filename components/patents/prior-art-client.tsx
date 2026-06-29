"use client";

import { type ReactNode, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runPriorArtSearch, compareAgainstCandidate } from "@/lib/patents/search";
import { patentUrl } from "@/lib/patents/url";
import type { ResultMatch, ResultSpan } from "@/lib/patents/results";

export function PriorArtClient({
  projectId,
  claims,
  matches,
}: {
  projectId: string;
  claims: string;
  matches: ResultMatch[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState(0);
  const [showCompare, setShowCompare] = useState(matches.length === 0);
  const [cmpNum, setCmpNum] = useState("");
  const [cmpText, setCmpText] = useState("");

  const hasClaims = claims.trim().length > 0;

  function liveSearch() {
    setMsg(null);
    start(async () => {
      const r = await runPriorArtSearch(projectId);
      if ("error" in r) return setMsg(r.error);
      setMsg(
        r.count === 0
          ? `Scanned ${r.scanGB} GB but found no public patents that overlap your claims. Try widening the wording in your Claims section, or compare a specific patent below.`
          : `Found ${r.count} candidate(s). Scanned ${r.scanGB} GB.`,
      );
      setSelected(0);
      router.refresh();
    });
  }

  function compare() {
    setMsg(null);
    start(async () => {
      const r = await compareAgainstCandidate({
        projectId,
        patentNumber: cmpNum.trim() || "candidate",
        text: cmpText,
      });
      if ("error" in r) return setMsg(r.error);
      setShowCompare(false);
      setSelected(0);
      setMsg(
        r.count === 0
          ? "No overlapping wording found. Your claims and this patent may be genuinely different, or may describe the same idea in different words. The comparison matches shared technical terms, so paste the patent's claims (not a summary) and make sure your Claims section is filled in."
          : `Found ${r.count} pinpoint overlap(s).`,
      );
      router.refresh();
    });
  }

  const sel = matches[selected];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-3">
        <p className="text-xs text-muted-foreground">
          Find public patents that overlap your claims. <strong>Run search</strong> pulls
          candidates from Google&apos;s public patent data; <strong>Compare a patent</strong> checks
          your claims against one patent you paste. A similarity hit is a research signal to verify,
          not a validity or freedom-to-operate opinion.
        </p>
        {!hasClaims && (
          <p className="mt-2 rounded-md border border-attention bg-attention-bg px-3 py-2 text-xs text-attention-foreground">
            Draft at least one claim in the Claims section first. Both options compare against your
            claims, so there is nothing to match against until your claims exist.
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={liveSearch} disabled={pending || !hasClaims}>
            {pending ? "Searching…" : "Run search (BigQuery)"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCompare((v) => !v)}
            disabled={!hasClaims}
          >
            Compare a patent
          </Button>
          {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
        </div>
        {showCompare && hasClaims && (
          <div className="mt-3 space-y-2 rounded-md border border-border p-3">
            <div>
              <p className="text-xs font-medium text-foreground">Compare against one patent</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Paste a patent number and its text. Its claims work best. Pincite lines up each of
                your claim limitations against the patent&apos;s wording and shows where they overlap.
                It matches shared technical terms, so paste the real claim text rather than a summary.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cmp-number" className="text-xs">
                Patent number (label only)
              </Label>
              <Input
                id="cmp-number"
                data-testid="cmp-number"
                value={cmpNum}
                onChange={(e) => setCmpNum(e.target.value)}
                placeholder="e.g. US-1234567-A1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cmp-text" className="text-xs">
                Patent text to compare
              </Label>
              <Textarea
                id="cmp-text"
                data-testid="cmp-text"
                value={cmpText}
                onChange={(e) => setCmpText(e.target.value)}
                placeholder="Paste the patent's claims (best) or abstract"
                className="min-h-[100px]"
              />
            </div>
            <Button size="sm" onClick={compare} disabled={pending || !cmpText.trim()}>
              Compare
            </Button>
          </div>
        )}
      </div>

      {matches.length === 0 ? (
        <p className="px-6 py-6 text-sm text-muted-foreground">
          No prior-art matches yet. Run a search, or compare a specific patent.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1">
          <aside className="w-2/5 shrink-0 overflow-auto border-r border-border">
            <ul className="divide-y divide-border">
              {matches.map((m, i) => {
                const url = patentUrl(m.patent_number, m.source_url);
                return (
                  <li
                    key={m.id}
                    className={
                      "flex items-stretch " +
                      (i === selected ? "bg-accent" : "hover:bg-accent/50")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(i)}
                      className="min-w-0 flex-1 px-5 py-3 text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {m.patent_number}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          score {m.overall_score?.toFixed(2) ?? "—"}
                        </span>
                      </div>
                      {m.title && (
                        <p className="truncate text-xs text-muted-foreground">
                          {m.title}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {m.spans.length} pinpoint overlap(s)
                      </p>
                    </button>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        title="Open the patent page"
                        aria-label={`Open ${m.patent_number} on the web`}
                        className="flex shrink-0 items-center px-3 text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="size-4" aria-hidden />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </aside>
          <section
            className="min-w-0 flex-1 overflow-auto px-6 py-5"
            data-testid="overlap-detail"
          >
            {sel && <MatchDetail claims={claims} match={sel} />}
          </section>
        </div>
      )}
    </div>
  );
}

function MatchDetail({ claims, match }: { claims: string; match: ResultMatch }) {
  const [showClaims, setShowClaims] = useState(false);
  const url = patentUrl(match.patent_number, match.source_url);
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              {match.patent_number}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          ) : (
            match.patent_number
          )}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Score {match.overall_score?.toFixed(2) ?? "—"} from {match.spans.length}{" "}
          overlap(s). The score summarizes the overlaps below; it is not a verdict.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-full border border-attention bg-attention-bg" />
            overlap
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block size-2 rounded-full bg-violation" />
            reads on full limitation
          </span>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Pinpoint overlaps in {match.patent_number}
        </p>
        {match.spans.length === 0 && (
          <p className="mt-1 text-sm text-muted-foreground">
            No pinpoint overlaps were found between your claims and this patent. They may be
            genuinely different, or use different words for the same idea. Try pasting the
            patent&apos;s full claims rather than its abstract.
          </p>
        )}
        <ul className="mt-1 space-y-2">
          {match.spans.map((s, i) => (
            <li
              key={i}
              data-overlap
              className={
                "rounded-md border p-3 text-sm " +
                (s.overlap_type === "claim_limitation"
                  ? "border-violation bg-violation-bg"
                  : "border-attention bg-attention-bg")
              }
            >
              <p className="text-foreground">{s.patent_span_text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.overlap_type === "claim_limitation"
                  ? "reads on full limitation"
                  : "overlap"}{" "}
                · confidence {s.element_confidence?.toFixed(2) ?? "—"} · your
                element: “{claims.slice(s.user_span_start, s.user_span_end).slice(0, 90)}”
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowClaims((v) => !v)}
          data-testid="toggle-claims"
          className="text-xs text-foreground underline-offset-2 hover:underline"
        >
          {showClaims
            ? "Hide your claims"
            : "Show your claims with the overlaps highlighted"}
        </button>
        {showClaims && (
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {renderClaims(claims, match.spans)}
          </pre>
        )}
      </div>
    </div>
  );
}

function renderClaims(claims: string, spans: ResultSpan[]): ReactNode[] {
  const sorted = [...spans].sort((a, b) => a.user_span_start - b.user_span_start);
  const out: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const s of sorted) {
    const start = Math.max(0, Math.min(s.user_span_start, claims.length));
    const end = Math.max(start, Math.min(s.user_span_end, claims.length));
    if (start < cursor) continue; // skip overlapping span
    if (start > cursor) out.push(<span key={key++}>{claims.slice(cursor, start)}</span>);
    const cls =
      s.overlap_type === "claim_limitation"
        ? "border-b-2 border-violation bg-violation-bg"
        : "border-b-2 border-attention bg-attention-bg";
    out.push(
      <mark
        key={key++}
        className={cls}
        aria-label={
          s.overlap_type === "claim_limitation"
            ? "reads on full limitation"
            : "overlap"
        }
      >
        {claims.slice(start, end)}
      </mark>,
    );
    cursor = end;
  }
  if (cursor < claims.length) out.push(<span key={key++}>{claims.slice(cursor)}</span>);
  return out;
}
