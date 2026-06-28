/**
 * The Pincite wordmark, served from public/pincite-logo.png (transparent background).
 */
export function Logo({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/pincite-logo.png" alt="Pincite" className={className} />
  );
}
