// Section label styled like a USPTO specification paragraph number. Every major
// homepage section carries one ([0001], [0002], ...) so the page itself reads
// like the document Pincite reviews. Neutral only, never a signal color.
export function SectionEyebrow({ n, children }: { n: string; children: string }) {
  return (
    <p className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      <span
        className="rounded-md border bg-card px-1.5 py-0.5 font-mono text-[11px] font-medium normal-case tracking-normal text-muted-foreground"
        aria-hidden
      >
        [{n}]
      </span>
      {children}
    </p>
  );
}
