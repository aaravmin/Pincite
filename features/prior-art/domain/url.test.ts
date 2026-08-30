import { describe, expect, it } from "vitest";
import { patentUrl } from "@/features/prior-art/domain/url";

describe("patentUrl", () => {
  it("prefers a stored http(s) source url", () => {
    expect(patentUrl("US-123456-A1", "https://patents.google.com/patent/US123456A1/en")).toBe(
      "https://patents.google.com/patent/US123456A1/en",
    );
  });

  it("ignores a stored value that is not a web url", () => {
    expect(patentUrl("US1234567", "not-a-url")).toBe(
      "https://patents.google.com/patent/US1234567/en",
    );
  });

  it("builds a Google Patents url from the number, stripping spaces and dashes", () => {
    expect(patentUrl("us-1234567-a1")).toBe(
      "https://patents.google.com/patent/US1234567A1/en",
    );
    expect(patentUrl("US 1234567 A1")).toBe(
      "https://patents.google.com/patent/US1234567A1/en",
    );
  });

  it("returns nothing for the manual-comparison placeholder", () => {
    expect(patentUrl("candidate")).toBeNull();
    expect(patentUrl("CANDIDATE")).toBeNull();
  });

  it("returns nothing when there is no usable number", () => {
    expect(patentUrl("")).toBeNull();
    expect(patentUrl("US1")).toBeNull();
  });

  it("url-encodes an unexpected number", () => {
    expect(patentUrl("US/12?34")).toBe(
      "https://patents.google.com/patent/US%2F12%3F34/en",
    );
  });
});
