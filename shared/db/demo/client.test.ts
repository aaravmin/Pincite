import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDemoClientFor, DEMO_USER } from "@/shared/db/demo/client";
import { createDemoStore, type Row } from "@/shared/db/demo/store";
import { DEMO_USER_ID } from "@/shared/demo/fixture/ids";

function mpep(
  id: string,
  sectionNumber: string,
  title: string,
  fullText: string,
): Row<"mpep_sections"> {
  return {
    id,
    section_number: sectionNumber,
    title,
    chapter: null,
    revision_tag: null,
    edition: "Ninth Edition, Revision 01.2024",
    source_url: "https://www.uspto.gov/web/offices/pac/mpep/s608.html",
    full_text: fullText,
    fetched_at: "2026-09-14T15:00:00.000Z",
    fts: null,
  };
}

function corpus() {
  return createDemoStore({
    mpep_sections: [
      mpep(
        "m1",
        "608.01(n)",
        "Dependent Claims",
        "A dependent claim refers back to and further limits another claim. ".repeat(3),
      ),
      mpep(
        "m2",
        "2181",
        "Identifying a 112(f) Limitation",
        "claims claims claims claims claims dependent dependent dependent ".repeat(40),
      ),
      mpep("m3", "2199", "[Reserved]", "dependent claims dependent claims ".repeat(5)),
      mpep("m4", "2198", "Pointer", "See MPEP 608."),
    ],
  });
}

/** A public folder with one fixture object, for the storage stub. */
function publicDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "pincite-demo-"));
  mkdirSync(path.join(dir, "demo"));
  writeFileSync(path.join(dir, "demo", "fig.png"), Buffer.from([1, 2, 3]));
  return dir;
}

describe("auth", () => {
  it("always answers with the demo viewer and refuses sign in", async () => {
    const client = createDemoClientFor(createDemoStore({}));
    const { data } = await client.auth.getUser();
    expect(data.user?.id).toBe(DEMO_USER_ID);
    expect(data.user).toBe(DEMO_USER);
    const signIn = await client.auth.signInWithPassword({ email: "a@b.c", password: "x" });
    expect(signIn.data.user).toBeNull();
    expect(signIn.error?.message).toMatch(/demo mode/i);
    expect((await client.auth.signOut()).error).toBeNull();
  });
});

describe("rpc", () => {
  it("never rate limits", async () => {
    const client = createDemoClientFor(createDemoStore({}));
    const user = await client.rpc("consume_rate_limit", {
      p_kind: "x",
      p_limit: 1,
      p_window_secs: 1,
    });
    const global = await client.rpc("consume_global_limit", {
      p_kind: "x",
      p_limit: 1,
      p_window_secs: 1,
    });
    expect(user).toMatchObject({ data: true, error: null });
    expect(global).toMatchObject({ data: true, error: null });
  });

  it("has no embeddings, so the chunk match is empty", async () => {
    const client = createDemoClientFor(createDemoStore({}));
    const { data } = await client.rpc("match_mpep_chunks", {
      query_embedding: "[]",
      match_count: 3,
    });
    expect(data).toEqual([]);
  });

  it("ranks the keyword locate by title hits and skips reserved and stub sections", async () => {
    const client = createDemoClientFor(corpus());
    const { data, error } = await client.rpc("match_mpep_keyword", {
      search_query: "dependent claims",
      match_count: 6,
    });
    expect(error).toBeNull();
    const numbers = (data ?? []).map((r) => r.section_number);
    expect(numbers[0]).toBe("608.01(n)");
    expect(numbers).toContain("2181");
    expect(numbers).not.toContain("2199");
    expect(numbers).not.toContain("2198");
    expect((data ?? [])[0]).toMatchObject({ title: "Dependent Claims" });
  });

  it("reports an unknown function", async () => {
    const client = createDemoClientFor(createDemoStore({}));
    const call = client.rpc as unknown as (
      name: string,
    ) => Promise<{ error: { code: string } | null }>;
    expect((await call("nope")).error?.code).toBe("PGRST202");
  });
});

describe("storage", () => {
  it("serves fixture objects from the public folder, demo paths only", async () => {
    const client = createDemoClientFor(createDemoStore({}), { publicDir: publicDir() });
    const bucket = client.storage.from("project-files");
    const ok = await bucket.download("demo/fig.png");
    expect(ok.error).toBeNull();
    expect(ok.data?.size).toBe(3);
    expect(ok.data?.type).toBe("image/png");
    for (const bad of ["demo/../fig.png", "../package.json", "demo/missing.png", "fig.png"]) {
      const res = await bucket.download(bad);
      expect(res.data, bad).toBeNull();
      expect(res.error?.message, bad).toBe("Object not found");
    }
  });

  it("keeps uploads in memory and refuses to overwrite without upsert", async () => {
    const client = createDemoClientFor(createDemoStore({}), { publicDir: publicDir() });
    const bucket = client.storage.from("project-files");
    const up = await bucket.upload("p/x.txt", Buffer.from("hi"), { contentType: "text/plain" });
    expect(up.error).toBeNull();
    expect(up.data?.path).toBe("p/x.txt");
    const down = await bucket.download("p/x.txt");
    expect(await down.data?.text()).toBe("hi");
    expect(down.data?.type).toBe("text/plain");

    const again = await bucket.upload("p/x.txt", Buffer.from("no"), { contentType: "text/plain" });
    expect(again.error?.message).toMatch(/already exists/);
    const replaced = await bucket.upload("p/x.txt", Buffer.from("yes"), {
      contentType: "text/plain",
      upsert: true,
    });
    expect(replaced.error).toBeNull();
    expect(await (await bucket.download("p/x.txt")).data?.text()).toBe("yes");
  });

  it("signs a relative raw URL for objects that exist, and removes only uploads", async () => {
    const client = createDemoClientFor(createDemoStore({}), { publicDir: publicDir() });
    const bucket = client.storage.from("project-files");
    await bucket.upload("p/x.txt", Buffer.from("hi"), { contentType: "text/plain" });
    expect((await bucket.createSignedUrl("p/x.txt", 60)).data?.signedUrl).toBe("?raw=1");
    expect((await bucket.createSignedUrl("demo/fig.png", 60)).data?.signedUrl).toBe("?raw=1");
    expect((await bucket.createSignedUrl("nope", 60)).error?.message).toBe("Object not found");

    const removed = await bucket.remove(["p/x.txt", "demo/fig.png"]);
    expect(removed.data?.map((f) => f.name)).toEqual(["p/x.txt"]);
    expect((await bucket.download("p/x.txt")).error?.message).toBe("Object not found");
    expect((await bucket.download("demo/fig.png")).error).toBeNull();
  });
});
