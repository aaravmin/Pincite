import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Storage client is the only thing this module touches, so it is the only thing faked.
 * `vi.hoisted` keeps the spy alive above the hoisted `vi.mock` factory.
 */
const { download } = vi.hoisted(() => ({ download: vi.fn() }));

vi.mock("@/shared/db/admin", () => ({
  createAdminClient: () => ({ storage: { from: () => ({ download }) } }),
}));

const { readAttachmentBytes } = await import(
  "@/features/exports/infrastructure/attachment-reader"
);

/** The minimum of a Blob this reader uses. */
const blob = (...bytes: number[]) => ({
  arrayBuffer: async () => new Uint8Array(bytes).buffer,
});

describe("readAttachmentBytes", () => {
  beforeEach(() => {
    download.mockReset();
  });

  it("returns each file's bytes keyed by its storage path", async () => {
    download.mockImplementation(async (path: string) => ({
      data: blob(path === "p/a" ? 1 : 2),
    }));

    const bytes = await readAttachmentBytes(["p/a", "p/b"]);

    expect([...(bytes.get("p/a") ?? [])]).toEqual([1]);
    expect([...(bytes.get("p/b") ?? [])]).toEqual([2]);
  });

  it("asks Storage once per distinct path", async () => {
    download.mockResolvedValue({ data: blob(1) });

    const bytes = await readAttachmentBytes(["p/a", "p/a", "p/b"]);

    expect(download).toHaveBeenCalledTimes(2);
    expect(bytes.size).toBe(2);
  });

  it("reads nothing, and never builds a client, for no paths", async () => {
    expect((await readAttachmentBytes([])).size).toBe(0);
    expect(download).not.toHaveBeenCalled();
  });

  it("skips a file Storage could not return rather than failing the export", async () => {
    download.mockImplementation(async (path: string) => {
      if (path === "p/throws") throw new Error("network");
      if (path === "p/empty") return { data: null };
      return { data: blob(7) };
    });

    const bytes = await readAttachmentBytes(["p/throws", "p/empty", "p/ok"]);

    expect(bytes.has("p/throws")).toBe(false);
    expect(bytes.has("p/empty")).toBe(false);
    expect([...(bytes.get("p/ok") ?? [])]).toEqual([7]);
  });

  it("keeps at most four downloads in flight, and still reads them all", async () => {
    let inFlight = 0;
    let peak = 0;
    download.mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
      return { data: blob(1) };
    });

    const paths = Array.from({ length: 12 }, (_, i) => `p/${i}`);
    const bytes = await readAttachmentBytes(paths);

    expect(peak).toBe(4);
    expect(bytes.size).toBe(12);
    expect(download).toHaveBeenCalledTimes(12);
  });

  it("does not start more workers than there are files", async () => {
    let peak = 0;
    let inFlight = 0;
    download.mockImplementation(async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      inFlight--;
      return { data: blob(1) };
    });

    await readAttachmentBytes(["p/a", "p/b"]);

    expect(peak).toBe(2);
  });
});
