const FORBIDDEN_OUTPUT_CHARS = /[-\u2010-\u2015\u2212:;]/g;
const EXTRA_SPACE_BEFORE_PUNCTUATION = /\s+([,.!?])/g;
const REPEATED_SPACES = / {2,}/g;

export function sanitizeOutputText(value: string): string {
  return value
    .replace(FORBIDDEN_OUTPUT_CHARS, " ")
    .replace(EXTRA_SPACE_BEFORE_PUNCTUATION, "$1")
    .replace(REPEATED_SPACES, " ");
}

export function sanitizeOutputFilename(value: string): string {
  return sanitizeOutputText(value)
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function sanitizeOutputRecord<T extends Record<string, string>>(
  value: T,
): T {
  return Object.fromEntries(
    Object.entries(value).map(([key, text]) => [key, sanitizeOutputText(text)]),
  ) as T;
}
