/**
 * Build the demo fixture: the public Apple container case study as database rows
 * (shared/demo/fixture/matter.json), every MPEP section the demo's screens can pin
 * (shared/demo/fixture/mpep-sections.json), the captured prior-art outputs
 * (shared/demo/canned/prior-art-candidates.json, patent-US20060213916A1.json), and the
 * figures under public/demo.
 *
 * Usage:
 *   pnpm demo:fixture              rebuild everything (fetches uspto.gov and Google Patents)
 *   pnpm demo:fixture --offline    rebuild the rows only; keep the fetched files as they are
 *
 * The text comes from shared/demo/fixture/case-study.ts and the rows are computed with the
 * same pure domain code the app runs (the validators for findings, the matcher for the
 * prior-art spans), so the fixture can never disagree with the product;
 * shared/demo/fixture.test.ts checks that it does not. Deterministic: fixed ids and
 * timestamps from shared/demo/fixture/ids.ts and sorted keys, so a rerun is a no-op unless
 * a source changed.
 *
 * Runs under plain Node 24 (TypeScript type stripping) with the "@/" alias resolved by
 * scripts/lib/alias-loader.mjs; the package.json script carries the exact command.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE,
  EDITION,
  FETCH_DELAY_MS,
  chapterOf,
  fetchText,
  parseSectionFile,
  sleep,
} from "./lib/mpep-html.mjs";
import {
  CASE_STUDY_APPLICANT,
  CASE_STUDY_CLAIMS,
  CASE_STUDY_COMPARISON,
  CASE_STUDY_DISCLOSURE,
  CASE_STUDY_INVENTORS,
  CASE_STUDY_PROJECT_NAME,
  CASE_STUDY_SECTIONS,
} from "@/shared/demo/fixture/case-study";
import {
  DEMO_ATTACHMENT_ID,
  DEMO_EPOCH,
  DEMO_FIGURE_FILENAME,
  DEMO_FIGURE_STORAGE_PATH,
  DEMO_MATCH_ID,
  DEMO_PROJECT_ID,
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  DEMO_VERSION_ID,
} from "@/shared/demo/fixture/ids";
import { applyResolvedPins } from "@/features/mpep/domain/citations";
import { claimKeywords, extractLimitations } from "@/features/prior-art/domain/extract";
import { matchCandidate } from "@/features/prior-art/domain/match";
import { parsePatentPage } from "@/features/prior-art/domain/patent-page";
import { wordCount } from "@/features/projects/domain/sections";
import { runDeterministicValidators } from "@/features/review/domain/run-validators";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_DIR = join(ROOT, "shared", "demo", "fixture");
const CANNED_DIR = join(ROOT, "shared", "demo", "canned");
const PUBLIC_DEMO_DIR = join(ROOT, "public", "demo");
const SOURCE_FIGURE = join(ROOT, "e2e", "fixtures", "apple-container-fig01.png");

const MATTER_FILE = join(FIXTURE_DIR, "matter.json");
const MPEP_FILE = join(FIXTURE_DIR, "mpep-sections.json");
const CANDIDATES_FILE = join(CANNED_DIR, "prior-art-candidates.json");
const PATENT_FILE = join(CANNED_DIR, "patent-US20060213916A1.json");
const PATENT_FIGURE_FILE = join(PUBLIC_DEMO_DIR, "US20060213916A1-fig01.png");
const PATENT_FIGURE_URL = "/demo/US20060213916A1-fig01.png";

const OFFLINE = process.argv.includes("--offline");

/**
 * Fetched MPEP pages are kept here (gitignored with node_modules), so a rerun after a
 * network failure, or the determinism check, does not go back to uspto.gov. Delete the
 * folder to refetch.
 */
const CACHE_DIR = join(ROOT, "node_modules", ".cache", "pincite-demo");
const FETCH_TIMEOUT_MS = 90_000;

/**
 * Every MPEP section the domain layer can pin: the validators, the filing and
 * cross-reference checks, rule surfacing, the lifecycle actions, the drawing check, and the
 * §101 walkthrough (grep for mpep_section and the section literals in features/*).
 */
const PINNED_SECTIONS = [
  "1120", "1306", "140", "1503.01", "1503.02", "1505", "201", "2106", "2109", "211",
  "2111.03", "2152", "2161", "2163", "2173", "2173.05(b)", "2173.05(e)", "2181", "2506",
  "302", "402", "601.05(a)", "602", "606", "608.01(a)", "608.01(b)", "608.01(c)",
  "608.01(g)", "608.01(m)", "608.01(n)", "608.02", "706.07(h)", "711", "714", "803", "818",
];

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const LOOKUP_UA = "Mozilla/5.0 (compatible; Pincite/1.0)";

/** Minutes after the epoch, so every timestamp is fixed and in a believable order. */
function at(minutes) {
  return new Date(Date.parse(DEMO_EPOCH) + minutes * 60_000).toISOString();
}

/** A v4-shaped uuid in the fixture's numbering: block 1xx findings, 2xx sections, ... */
function fixedId(block, n) {
  return `00000000-0000-4000-8000-000000000${block}${String(n).padStart(2, "0")}`;
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys(value[key])]),
    );
  }
  return value;
}

function writeJson(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(sortKeys(value), null, 2)}\n`);
  console.log(`wrote ${file.replace(`${ROOT}/`, "")}`);
}

function readJson(file, fallback) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : fallback;
}

function strip(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// The figure: FIG. 1 rotated upright, as scripts/seed-demo-container.mjs bakes it.
// ---------------------------------------------------------------------------
function ensureFigure() {
  const target = join(ROOT, "public", DEMO_FIGURE_STORAGE_PATH);
  if (!existsSync(target)) {
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(SOURCE_FIGURE, target);
    try {
      execFileSync("sips", ["-r", "90", target], { stdio: "ignore" });
    } catch {
      throw new Error(
        `Could not rotate ${target} upright: this step needs macOS sips. Create the file ` +
          "by rotating e2e/fixtures/apple-container-fig01.png 90 degrees clockwise, then rerun.",
      );
    }
    console.log(`wrote public/${DEMO_FIGURE_STORAGE_PATH} (rotated upright)`);
  }
  return readFileSync(target).length;
}

// ---------------------------------------------------------------------------
// The MPEP corpus subset, through the same parser as the live ingest.
// ---------------------------------------------------------------------------
function fileFor(sectionNumber) {
  return `s${sectionNumber.match(/^\d+/)[0]}`;
}

/** Run `attempt` up to four times with a growing pause, for a flaky remote. */
async function withRetry(label, attempt) {
  let pause = 3_000;
  for (let n = 1; ; n++) {
    try {
      return await attempt();
    } catch (e) {
      if (n >= 4) throw e;
      console.warn(`  ${label}: ${e.message}; retrying in ${pause / 1000}s`);
      await sleep(pause);
      pause *= 2;
    }
  }
}

/** One MPEP page, from the disk cache when it is there. */
async function mpepPage(file) {
  const cached = join(CACHE_DIR, `${file}.html`);
  if (existsSync(cached)) return { html: readFileSync(cached, "utf8"), fetched: false };
  const html = await withRetry(file, () =>
    fetchText(`${BASE}/${file}.html`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }),
  );
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cached, html);
  return { html, fetched: true };
}

async function fetchMpepSections() {
  const wanted = new Set(PINNED_SECTIONS);
  const files = [...new Set(PINNED_SECTIONS.map(fileFor))].sort();
  const found = new Map();
  for (const file of files) {
    const { html, fetched } = await mpepPage(file);
    const sections = parseSectionFile(html);
    for (const section of sections) {
      if (wanted.has(section.section_number)) found.set(section.section_number, { file, ...section });
    }
    console.log(`  ${file}: ${sections.length} sections parsed${fetched ? "" : " (cached)"}`);
    if (fetched) await sleep(FETCH_DELAY_MS);
  }
  const missing = PINNED_SECTIONS.filter((n) => !found.has(n));
  if (missing.length > 0) {
    throw new Error(`MPEP sections not found at uspto.gov: ${missing.join(", ")}`);
  }
  return PINNED_SECTIONS.map((sectionNumber, i) => {
    const s = found.get(sectionNumber);
    return {
      id: fixedId(5, i + 1),
      section_number: sectionNumber,
      title: s.title,
      chapter: chapterOf(sectionNumber),
      revision_tag: s.revision_tag,
      edition: EDITION,
      source_url: `${BASE}/${s.file}.html`,
      full_text: s.full_text,
      fetched_at: DEMO_EPOCH,
      fts: null,
    };
  });
}

// ---------------------------------------------------------------------------
// Prior art: the keyless Google Patents search (as features/prior-art/infrastructure/
// keyless.ts runs it) and the compared patent's public page (as lookup-patent.ts reads it).
// ---------------------------------------------------------------------------
async function captureCandidates() {
  const kws = [
    ...new Set(
      claimKeywords(CASE_STUDY_CLAIMS, 8)
        .map((k) => k.toLowerCase().trim())
        .filter((k) => k.length > 2),
    ),
  ].slice(0, 8);
  const inner = `q=${kws.join(" ")}&num=15`;
  const endpoint = `https://patents.google.com/xhr/query?url=${encodeURIComponent(inner)}&exp=`;
  const res = await fetch(endpoint, {
    headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Google Patents search returned ${res.status}`);
  const json = await res.json();
  const rows = json?.results?.cluster?.[0]?.result ?? [];
  const candidates = [];
  for (const r of rows) {
    const p = r.patent ?? {};
    const num = strip(p.publication_number);
    if (!num) continue;
    candidates.push({
      publication_number: num,
      title: strip(p.title) || null,
      abstract: strip(p.snippet) || null,
      source_url: `https://patents.google.com/patent/${num}/en`,
    });
  }
  if (candidates.length === 0) throw new Error("Google Patents search returned no results");
  return candidates;
}

async function capturePatentDetails() {
  const { patentNumber, sourceUrl } = CASE_STUDY_COMPARISON;
  const res = await fetch(sourceUrl, {
    headers: { "User-Agent": LOOKUP_UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Google Patents page returned ${res.status}`);
  const details = parsePatentPage(await res.text(), { number: patentNumber, url: sourceUrl });
  if (!details.title) throw new Error("Google Patents page had no title");

  let figureUrls = [];
  const first = details.figureUrls[0];
  if (first) {
    try {
      const img = await fetch(first, { headers: { "User-Agent": LOOKUP_UA } });
      if (!img.ok) throw new Error(`figure returned ${img.status}`);
      mkdirSync(PUBLIC_DEMO_DIR, { recursive: true });
      writeFileSync(PATENT_FIGURE_FILE, Buffer.from(await img.arrayBuffer()));
      figureUrls = [PATENT_FIGURE_URL];
      console.log(`wrote public${PATENT_FIGURE_URL}`);
    } catch (e) {
      console.warn(`  figure download skipped: ${e.message}`);
    }
  }
  return { ...details, figureUrls };
}

/** Run a capture, or keep what the file already holds when the network says no. */
async function captured(label, file, fallback, run) {
  if (OFFLINE) {
    console.log(`${label}: offline, keeping ${file.replace(`${ROOT}/`, "")}`);
    return readJson(file, fallback);
  }
  try {
    const value = await run();
    writeJson(file, value);
    return value;
  } catch (e) {
    console.warn(`${label}: ${e.message}; keeping ${file.replace(`${ROOT}/`, "")}`);
    return readJson(file, fallback);
  }
}

// ---------------------------------------------------------------------------
// The matter: rows exactly as the app would have written them.
// ---------------------------------------------------------------------------
function buildMatter({ figureBytes, mpepSectionNumbers, patentTitle }) {
  const sections = CASE_STUDY_SECTIONS;
  const sectionKeys = Object.keys(sections);

  const findings = applyResolvedPins(
    runDeterministicValidators(sections, "utility"),
    new Set(mpepSectionNumbers),
  ).map((f, i) => ({
    id: fixedId(1, i + 1),
    project_id: DEMO_PROJECT_ID,
    version_id: null,
    ...f,
    created_at: at(45),
  }));

  const match = matchCandidate(extractLimitations(CASE_STUDY_CLAIMS), CASE_STUDY_COMPARISON.text);
  const matchSpans = match.spans.map((s, i) => ({
    id: fixedId(4, i + 1),
    match_id: DEMO_MATCH_ID,
    user_section_key: "claims",
    user_span_start: s.userSpanStart,
    user_span_end: s.userSpanEnd,
    patent_span_text: s.patentSpanText,
    overlap_type: s.overlapType,
    element_confidence: s.confidence,
    created_at: at(50),
  }));

  const snapshot = {
    project: {
      name: CASE_STUDY_PROJECT_NAME,
      patent_type: "utility",
      declared_status: "drafting",
      application_number: null,
      filing_date: null,
    },
    sections: Object.fromEntries(sectionKeys.map((k) => [k, sections[k]])),
  };

  const audit = (id, minutes, action, detail, version_id = null) => ({
    id,
    user_id: DEMO_USER_ID,
    project_id: DEMO_PROJECT_ID,
    version_id,
    action,
    detail,
    ip: null,
    created_at: at(minutes),
  });

  return {
    profiles: [
      {
        id: DEMO_USER_ID,
        email: DEMO_USER_EMAIL,
        role: "inventor",
        consented_at: DEMO_EPOCH,
        created_at: DEMO_EPOCH,
      },
    ],
    projects: [
      {
        id: DEMO_PROJECT_ID,
        user_id: DEMO_USER_ID,
        name: CASE_STUDY_PROJECT_NAME,
        patent_type: "utility",
        declared_status: "drafting",
        application_number: null,
        filing_date: null,
        ...CASE_STUDY_APPLICANT,
        client_name: null,
        matter_no: null,
        created_at: DEMO_EPOCH,
        updated_at: at(20),
      },
    ],
    project_sections: sectionKeys.map((section_key, i) => ({
      id: fixedId(2, i + 1),
      project_id: DEMO_PROJECT_ID,
      section_key,
      content: sections[section_key],
      word_count: wordCount(sections[section_key]),
      updated_at: at(20),
    })),
    project_disclosure: [
      { project_id: DEMO_PROJECT_ID, ...CASE_STUDY_DISCLOSURE, updated_at: at(25) },
    ],
    project_inventors: CASE_STUDY_INVENTORS.map((inventor, i) => ({
      id: fixedId(3, i + 1),
      project_id: DEMO_PROJECT_ID,
      ...inventor,
      ord: i,
      created_at: at(30),
    })),
    project_versions: [
      {
        id: DEMO_VERSION_ID,
        project_id: DEMO_PROJECT_ID,
        user_id: DEMO_USER_ID,
        label: "Full draft",
        snapshot,
        parent_version_id: null,
        created_at: at(35),
      },
    ],
    project_attachments: [
      {
        id: DEMO_ATTACHMENT_ID,
        project_id: DEMO_PROJECT_ID,
        kind: "drawing",
        view: "perspective",
        storage_path: DEMO_FIGURE_STORAGE_PATH,
        filename: DEMO_FIGURE_FILENAME,
        mime: "image/png",
        size_bytes: figureBytes,
        page_index: null,
        analysis: null,
        annotations: null,
        vector_scene_meta: null,
        created_at: at(40),
      },
    ],
    findings,
    prior_art_matches: [
      {
        id: DEMO_MATCH_ID,
        project_id: DEMO_PROJECT_ID,
        version_id: null,
        patent_number: CASE_STUDY_COMPARISON.patentNumber,
        title: patentTitle,
        source: "google_patents",
        source_url: CASE_STUDY_COMPARISON.sourceUrl,
        overall_score: match.overallScore,
        created_at: at(50),
      },
    ],
    match_spans: matchSpans,
    audit_log: [
      audit(1, 0, "project_created", {
        name: CASE_STUDY_PROJECT_NAME,
        patent_type: "utility",
        client_name: null,
        matter_no: null,
      }),
      audit(2, 25, "disclosure_saved", null),
      audit(3, 30, "inventors_saved", { count: CASE_STUDY_INVENTORS.length }),
      audit(4, 35, "version_saved", { label: "Full draft" }, DEMO_VERSION_ID),
      audit(5, 40, "attachment_uploaded", {
        kind: "drawing",
        view: "perspective",
        filename: DEMO_FIGURE_FILENAME,
        mime: "image/png",
      }),
      audit(6, 45, "findings_run", { count: findings.length, dropped: 0 }),
      audit(7, 50, "prior_art_searched", {
        source: "manual",
        candidate: CASE_STUDY_COMPARISON.patentNumber,
      }),
    ],
    exports: [],
  };
}

async function main() {
  const figureBytes = ensureFigure();

  let mpepSections;
  if (OFFLINE) {
    mpepSections = readJson(MPEP_FILE, { mpep_sections: [] }).mpep_sections;
    if (mpepSections.length === 0) {
      throw new Error("--offline needs an existing shared/demo/fixture/mpep-sections.json");
    }
    console.log(`MPEP: offline, keeping ${mpepSections.length} sections`);
  } else {
    console.log(`MPEP: fetching ${PINNED_SECTIONS.length} sections from uspto.gov`);
    mpepSections = await fetchMpepSections();
    writeJson(MPEP_FILE, { mpep_sections: mpepSections });
  }

  await captured("Candidates", CANDIDATES_FILE, [], captureCandidates);
  const patent = await captured(
    "Patent page",
    PATENT_FILE,
    {
      number: CASE_STUDY_COMPARISON.patentNumber,
      title: null,
      abstract: null,
      figureUrls: [],
      inventors: [],
      url: CASE_STUDY_COMPARISON.sourceUrl,
    },
    capturePatentDetails,
  );

  const matter = buildMatter({
    figureBytes,
    mpepSectionNumbers: mpepSections.map((s) => s.section_number),
    patentTitle: patent.title ?? null,
  });
  writeJson(MATTER_FILE, matter);
  console.log(
    `Done: ${matter.findings.length} findings, ${matter.match_spans.length} spans, ${mpepSections.length} MPEP sections.`,
  );
}

main().catch((e) => {
  console.error(`FIXTURE BUILD FAILED: ${e.message}`);
  process.exit(1);
});
