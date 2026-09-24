import { afterEach, describe, expect, it } from "vitest";
import { isDemoMode } from "@/shared/demo/mode";

const saved = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  vercel: process.env.VERCEL,
};

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

afterEach(() => {
  setEnv("NEXT_PUBLIC_SUPABASE_URL", saved.url);
  setEnv("VERCEL", saved.vercel);
});

describe("isDemoMode", () => {
  it("is on when no Supabase URL is configured", () => {
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    setEnv("VERCEL", undefined);
    expect(isDemoMode()).toBe(true);
  });

  it("is on when the URL is set to the empty string (pnpm dev:demo)", () => {
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    setEnv("VERCEL", undefined);
    expect(isDemoMode()).toBe(true);
  });

  it("is off as soon as a Supabase URL is configured", () => {
    setEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    setEnv("VERCEL", undefined);
    expect(isDemoMode()).toBe(false);
  });

  it("never activates on Vercel, so a missing URL there fails closed", () => {
    setEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);
    setEnv("VERCEL", "1");
    expect(isDemoMode()).toBe(false);
  });
});
