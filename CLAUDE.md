# Poetry Archive — Project Specification
*Last updated: 2026-03-14. Update this file at the end of every productive session.*

---

## The Project

A personal poetry anthology — poems collected over decades — in one place, secure from degradation, ubiquitously available. Troy (pediatrician, reader, writer, printmaker) is the sole user and non-developer co-maintainer.

**Governing principle:** Democratization of data through minimal-overhead point solutions. Any path requiring significant technical infrastructure is out of scope by design. The co-developer's time and tolerance are finite and must be respected.

---

## Current Architecture

**Host:** GitHub Pages at `https://trillnjoy.github.io/Claude_Artifacts/`  
**Repo:** `trillnjoy/Claude_Artifacts` — branch `main` is live production  
**Files:** `index.html`, `poems_seed.json`, `sw.js`, `manifest.json`  
**Data store:** IndexedDB (`poetry-archive`, store: `poems`) keyed by poem `id`  
**Seed:** `poems_seed.json` — `{ "version": N, "poems": [...] }` — fetched on every load, reseeds if fingerprint differs  
**Offline:** IndexedDB handles all reading/browsing offline. Network required only for acquisition.  
**PWA:** Installed to home screen. `manifest.json` requires `start_url` and `scope` both = `"/Claude_Artifacts/"`

**Current poem count:** 71 poems (as of 2026-03-14)

---

## What Works

- Browse, search, filter by tag — fully offline
- Tag filter: four chiclet-style group buttons (Emotional / Thematic / Formal / Era), single-row, one open at a time
- Versioned seed sync: reseed triggers on count mismatch or version bump
- PWA installs to iOS home screen and launches correctly

---

## What Does Not Work

- **In-app photo capture:** WebKit CORS permanently blocks browser-to-Anthropic API calls on iOS. This is architectural, not fixable without a proxy. Do not attempt to re-solve this in the browser.
- **Cloudflare Workers as proxy:** Rejected — known cybersecurity vector, out of scope.
- **Any proxy solution:** Out of scope by design.

---

## Acquisition Workflow (Current)

Photos → Claude chat OCR → JSON string → paste into `poems_seed.json` → bump version → commit to GitHub → PWA reseeds on next load.

**Limit:** ~15-20 poem photos per chat thread before upload limit is hit. Thread retirement is the primary bottleneck.

---

## The Whiteboard — 5 Fragilities (Prioritized)

### 1. HTML-in-JSON breaks on unescaped quotes
**Problem:** Poems stored as pre-rendered HTML inside JSON strings. Unescaped `"` in poem text (dialog, titles) silently corrupts the entire archive.  
**Solution:** Store poem text as structured data — array of stanzas, each an array of line objects with text and optional indent/italic flags. Generate HTML at render time via a pure function in `index.html`. Eliminates the format collision entirely.

### 2. Manual version bumping is a single point of failure
**Problem:** Human must remember to increment version integer on every commit. Miss it = silent stale archive.  
**Solution:** Replace version integer with content fingerprint: `poem count + newest poem's added date`. Browser computes this from fetched seed and compares to stored value. No human involvement required.

### 3. Institutional knowledge lost at thread end
**Problem:** Architecture decisions, failed paths, human constraints, established principles exist only in chat context. New threads start from zero and reliably derail.  
**Solution:** This `CLAUDE.md` file, committed to the repo, updated each session. Every new thread opens with: upload `CLAUDE.md` + `index.html` + one-sentence task + poem photos. No preamble.

### 4. No backups, no rollback, no recovery path
**Problem:** Every commit goes directly to production. A bad deploy breaks the live archive immediately. No tested restore path exists.  
**Solution:**  
- Create `dev` branch; all changes go there first; merge to `main` deliberately  
- Named seed snapshots every 50 poems: `poems_seed_backup_v{N}.json` in repo  
- Build in-app export: downloads full IndexedDB contents as JSON at any time

### 5. Chat-based capture is unsustainable at scale
**Problem:** Claude chat was never designed as a batch image pipeline. 15-20 image limit per thread, handoff friction, context loss. At 5,000 poems this means hundreds of thread retirements.  
**Solution:** iOS Shortcut as dedicated capture app:
- Shortcut captures photo, base64-encodes it
- Posts directly to Anthropic API (no CORS — Shortcuts run outside browser sandbox)
- Receives structured JSON poem object
- Writes to iCloud Drive file
- PWA import function reads that file and adds poem to IndexedDB
- Decouples acquisition from Claude chat entirely

---

## Next Development Priorities (In Order)

1. **CLAUDE.md in repo** — commit this file *(do first, enables everything else)*
2. **Dev branch** — create `dev` branch, establish merge-to-main discipline
3. **Poem data structure refactor** — stanza/line arrays, HTML generated at render time
4. **Content fingerprint sync** — replace version integer
5. **In-app export** — download IndexedDB as JSON backup
6. **iOS Shortcut capture** — dedicated acquisition pipeline

---

## Hard-Won Lessons — Do Not Repeat

- **WebKit CORS:** Direct browser fetch to `api.anthropic.com` from GitHub Pages = "Load failed". Permanent. Do not attempt.
- **Service worker caching poems_seed.json:** SW must never cache the seed file. Pass-through only.
- **Artifact renderer ceiling:** ~46 poems before the Claude artifact renderer freezes. Architecture, not capacity. PWA on GitHub Pages is the correct solution.
- **iOS file:// origin:** Blocks IndexedDB and localStorage. Served origin (GitHub Pages) required.
- **manifest.json:** `start_url` AND `scope` must both be `"/Claude_Artifacts/"` — missing either breaks PWA launch from home screen.
- **GitHub file naming:** Upload as `index_pwa.html`, rename to `index.html` via GitHub editor rename function. Or: edit `index.html` directly in GitHub, select all, paste new content.
- **IndexedDB is device-local:** Each device (iPhone, Mac Safari, Chrome) has its own independent IndexedDB. Sync is via seed file only.
- **The `source` field:** Some Kerouac poems have a `source` field (e.g., "Mexico City Blues") — this is a non-standard schema addition, harmless but worth preserving.

---

## Tag Ontology

| Group | Tags |
|-------|------|
| Emotional | longing, grief, joy, desire, tenderness, melancholy, defiance, wonder, resignation |
| Thematic | mortality, nature, time, war, faith, identity, embodiment, beauty, memory |
| Formal | sonnet, ode, lyric, free-verse, rhymed, classical, translation, erotic, conjugal, romantic |
| Era | ancient, renaissance, romantic-era, victorian, modernist, contemporary |

New tags appearing in acquisitions (Beat poets): beat, prose-poem, refrain, litany — add to Era or Formal as appropriate in next refactor.

---

## Poem ID Convention

`{surname-or-shortname}-{title-slug}` — lowercase, hyphens, no special characters.  
Examples: `cohen-suzanne`, `kerouac-34th-chorus`, `ferlinghetti-i-am-waiting`

---

## Co-Developer Profile

Troy Lawrence McGuire, MD. Pediatrician. Reader, writer, printmaker, genealogist. Mac user 40 years. Not a developer. Has deep literary judgment and strong opinions about tools, process, and scope. Will push back hard on scope creep and unnecessary complexity. Respects clean solutions. Dislikes being managed. Values honest assessment over false confidence. The poetry archive is a deeply personal project of lasting importance to him.

**Working preferences:**
- Tight, actionable responses — no narration, no preamble
- Present files via `present_files`, never render code to screen
- One problem at a time
- Diagnose before implementing
- When something fails, say so clearly and say why before proposing a fix
- Do not recommend Cloudflare Workers
