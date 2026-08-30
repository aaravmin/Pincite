import { describe, expect, it } from "vitest";
import { decideViewerAccess } from "@/shared/auth/access";

const consented = { profile: { consented_at: "2026-01-01T00:00:00.000Z" } };
const unconsented = { profile: { consented_at: null } };

describe("decideViewerAccess", () => {
  it("sends a signed-out request to the login screen", () => {
    expect(decideViewerAccess(null, { requireConsent: true })).toBe("login");
    expect(decideViewerAccess(null, { requireConsent: false })).toBe("login");
  });

  it("sends a signed-in but unconsented request to the consent screen", () => {
    expect(decideViewerAccess(unconsented, { requireConsent: true })).toBe(
      "consent",
    );
  });

  it("admits a consented viewer", () => {
    expect(decideViewerAccess(consented, { requireConsent: true })).toBe("ok");
  });

  it("admits an unconsented viewer where consent is not required", () => {
    // The consent and role screens themselves: requiring consent there would loop.
    expect(decideViewerAccess(unconsented, { requireConsent: false })).toBe(
      "ok",
    );
  });

  it("treats an empty consent timestamp as not consented", () => {
    expect(
      decideViewerAccess(
        { profile: { consented_at: "" } },
        { requireConsent: true },
      ),
    ).toBe("consent");
  });
});
