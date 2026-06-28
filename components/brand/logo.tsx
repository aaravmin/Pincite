/**
 * The Pincite wordmark. Recreated as an SVG (the orange wordmark with a paperclip "i").
 * To use the exact brand file, drop it at public/pincite-logo.png and switch the src.
 */
export function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/pincite-logo.svg" alt="Pincite" className={className} />
  );
}
