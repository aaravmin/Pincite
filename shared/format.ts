/** Deterministic UTC formatting, so server-rendered dates don't cause hydration drift. */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

export function fmtDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
