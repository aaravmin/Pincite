import "server-only";

/**
 * The demo-mode stand-in for a Supabase client (shared/demo/mode.ts): the query builder over
 * the in-memory store, the four RPCs the app calls, an auth surface that always answers
 * with the demo viewer, and a Storage bucket kept in memory. shared/db/server.ts and
 * shared/db/admin.ts return it when no Supabase project is configured, so the repositories,
 * the rate limiter, the audit log and the Storage code run unchanged.
 *
 * Storage: an object uploaded during the session lives in the store; the fixture's FIG. 1
 * lives in public/ and is read from there (paths are restricted to the demo folder). A
 * signed URL is the relative "?raw=1", which the attachment route resolves against the
 * request so the same route then streams the bytes.
 *
 * The one cast to TypedSupabaseClient is at the bottom: the app only ever calls the members
 * implemented here (grepped and tested), and a member it does not call is better absent than
 * silently wrong.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { User } from "@supabase/supabase-js";
import type { TypedSupabaseClient } from "@/shared/db/types";
import { DEMO_EPOCH, DEMO_USER_EMAIL, DEMO_USER_ID } from "@/shared/demo/fixture/ids";
import {
  DemoQueryBuilder,
  type DemoPostgrestError,
} from "@/shared/db/demo/query-builder";
import {
  getDemoStore,
  rowsOf,
  type DemoStore,
  type TableName,
} from "@/shared/db/demo/store";

/** The signed-in user every demo request sees. */
export const DEMO_USER: User = {
  id: DEMO_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: DEMO_USER_EMAIL,
  email_confirmed_at: DEMO_EPOCH,
  phone: "",
  confirmed_at: DEMO_EPOCH,
  last_sign_in_at: DEMO_EPOCH,
  app_metadata: { provider: "demo", providers: ["demo"] },
  user_metadata: {},
  identities: [],
  created_at: DEMO_EPOCH,
  updated_at: DEMO_EPOCH,
  is_anonymous: false,
};

type DemoAuthError = { name: string; message: string; status: number; code: string };

const NO_ACCOUNTS: DemoAuthError = {
  name: "AuthApiError",
  message: "Demo mode has no accounts",
  status: 400,
  code: "demo_mode",
};

type RpcResult = { data: unknown; error: DemoPostgrestError | null };

/** Words too common to rank a section by. */
const STOP_WORDS: ReadonlySet<string> = new Set([
  "the", "and", "for", "that", "with", "this", "from", "are", "was", "were", "not",
  "but", "any", "all", "its", "can", "may", "has", "have", "been", "will", "which",
  "when", "what", "how", "does", "into", "than", "then", "also", "such", "only",
  "more", "some", "other", "each", "who", "about", "after", "before", "under",
  "over", "between", "where", "while", "must", "shall", "should", "would", "could",
  "upon", "did", "you", "your", "our", "they", "them", "their",
]);

/** Occurrences of `term` in `text`, capped so a long section cannot win by bulk alone. */
function occurrences(text: string, term: string, cap: number): number {
  let count = 0;
  let at = text.indexOf(term);
  while (at >= 0 && count < cap) {
    count += 1;
    at = text.indexOf(term, at + term.length);
  }
  return count;
}

/** A query term in a section's title outweighs any number of body mentions. */
const TITLE_HIT = 10;
/** Body mentions per term count up to this, so a long section cannot win by bulk alone. */
const BODY_CAP = 5;

/**
 * The keyword locate over the fixture corpus, in the spirit of match_mpep_keyword: title
 * hits weigh most, body hits are capped, and ties go to the shorter section. Skips the
 * reserved placeholders and pointer stubs the SQL function skips.
 */
function matchKeyword(store: DemoStore, query: string, limit: number): RpcResult {
  const terms = [
    ...new Set(
      (query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(
        (term) => !STOP_WORDS.has(term),
      ),
    ),
  ];
  const scored: {
    section_number: string;
    title: string | null;
    rank: number;
    titleHits: number;
    length: number;
  }[] = [];
  for (const row of rowsOf(store, "mpep_sections")) {
    const title = String(row.title ?? "");
    const body = String(row.full_text ?? "");
    if (body.length < 30 || title.toLowerCase().includes("[reserved]")) continue;
    const titleLower = title.toLowerCase();
    const bodyLower = body.toLowerCase();
    let rank = 0;
    let titleHits = 0;
    for (const term of terms) {
      if (titleLower.includes(term)) {
        titleHits += 1;
        rank += TITLE_HIT;
      }
      rank += occurrences(bodyLower, term, BODY_CAP);
    }
    if (rank > 0) {
      scored.push({
        section_number: String(row.section_number),
        title: (row.title as string | null) ?? null,
        rank,
        titleHits,
        length: body.length,
      });
    }
  }
  scored.sort(
    (a, b) => b.rank - a.rank || b.titleHits - a.titleHits || a.length - b.length,
  );
  return {
    data: scored
      .slice(0, limit)
      .map(({ section_number, title, rank }) => ({ section_number, title, rank })),
    error: null,
  };
}

async function rpc(
  store: DemoStore,
  name: string,
  args: Record<string, unknown> = {},
): Promise<RpcResult> {
  switch (name) {
    // Nothing is paid for in demo mode, so no quota ever runs out.
    case "consume_rate_limit":
    case "consume_global_limit":
      return { data: true, error: null };
    // No embeddings in the fixture: the caller falls back to the keyword locate.
    case "match_mpep_chunks":
      return { data: [], error: null };
    case "match_mpep_keyword":
      return matchKeyword(
        store,
        String(args.search_query ?? ""),
        Number(args.match_count ?? 6),
      );
    default:
      return {
        data: null,
        error: {
          message: `Function ${name} is not available in demo mode`,
          details: "",
          hint: "",
          code: "PGRST202",
        },
      };
  }
}

/** Objects the fixture ships in public/: the demo folder only, one path segment, no dots-up. */
const PUBLIC_OBJECT = /^demo\/[A-Za-z0-9._-]+$/;

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

type StorageError = { message: string; statusCode?: string };

/** A Blob over a fresh copy of the bytes, the way a Storage download arrives. */
function toBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([new Uint8Array(bytes)], { type });
}

export type DemoClientOptions = {
  /** Where fixture objects are read from; the app's public/ folder by default. */
  publicDir?: string;
};

function bucket(store: DemoStore, name: string, publicDir: string) {
  const publicFile = async (objectPath: string): Promise<Uint8Array | null> => {
    if (!PUBLIC_OBJECT.test(objectPath)) return null;
    try {
      return await readFile(path.join(publicDir, objectPath));
    } catch {
      return null;
    }
  };
  const notFound = (): { data: null; error: StorageError } => ({
    data: null,
    error: { message: "Object not found", statusCode: "404" },
  });

  return {
    async upload(
      objectPath: string,
      bytes: Uint8Array,
      options?: { contentType?: string; upsert?: boolean },
    ): Promise<
      | { data: { path: string; id: string; fullPath: string }; error: null }
      | { data: null; error: StorageError }
    > {
      if (store.blobs.has(objectPath) && !options?.upsert) {
        return {
          data: null,
          error: { message: "The resource already exists", statusCode: "409" },
        };
      }
      store.blobs.set(objectPath, {
        bytes: new Uint8Array(bytes),
        contentType: options?.contentType ?? "application/octet-stream",
      });
      return {
        data: { path: objectPath, id: objectPath, fullPath: `${name}/${objectPath}` },
        error: null,
      };
    },

    async download(
      objectPath: string,
    ): Promise<{ data: Blob; error: null } | { data: null; error: StorageError }> {
      const stored = store.blobs.get(objectPath);
      if (stored) return { data: toBlob(stored.bytes, stored.contentType), error: null };
      const bytes = await publicFile(objectPath);
      if (!bytes) return notFound();
      const type = MIME_BY_EXTENSION[path.extname(objectPath).toLowerCase()];
      return { data: toBlob(bytes, type ?? "application/octet-stream"), error: null };
    },

    async remove(
      paths: string[],
    ): Promise<{ data: { name: string }[]; error: null }> {
      const removed: { name: string }[] = [];
      for (const objectPath of paths) {
        // Fixture objects in public/ are the demo's own files and are never deleted.
        if (store.blobs.delete(objectPath)) removed.push({ name: objectPath });
      }
      return { data: removed, error: null };
    },

    // The expiry the caller passes is irrelevant here: the URL is a same-route redirect.
    async createSignedUrl(
      objectPath: string,
    ): Promise<
      { data: { signedUrl: string }; error: null } | { data: null; error: StorageError }
    > {
      if (!store.blobs.has(objectPath) && !(await publicFile(objectPath))) {
        return notFound();
      }
      // Relative on purpose: the attachment route resolves it against the request URL, so
      // the redirect lands on the same route with ?raw=1, which streams the bytes.
      return { data: { signedUrl: "?raw=1" }, error: null };
    },
  };
}

/** A client over a specific store, for tests. The app uses createDemoClient(). */
export function createDemoClientFor(
  store: DemoStore,
  options: DemoClientOptions = {},
): TypedSupabaseClient {
  const publicDir = options.publicDir ?? path.join(process.cwd(), "public");
  const client = {
    from: (table: TableName) => new DemoQueryBuilder(store, table),
    rpc: (name: string, args?: Record<string, unknown>) => rpc(store, name, args),
    auth: {
      async getUser() {
        return { data: { user: DEMO_USER }, error: null };
      },
      async signOut() {
        return { error: null };
      },
      async signInWithPassword() {
        return { data: { user: null, session: null }, error: NO_ACCOUNTS };
      },
      async exchangeCodeForSession() {
        return { data: { user: null, session: null }, error: NO_ACCOUNTS };
      },
    },
    storage: {
      from: (name: string) => bucket(store, name, publicDir),
    },
  };
  // The app calls only the members above; see the module comment.
  return client as unknown as TypedSupabaseClient;
}

/** The demo client over the process-wide store seeded from the fixture. */
export function createDemoClient(): TypedSupabaseClient {
  return createDemoClientFor(getDemoStore());
}
