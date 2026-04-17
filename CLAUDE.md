# Poetry Archive — Project Specification
*Last updated: 2026-03-15. Update this file at the end of every productive session.*

---

## The Project

A personal poetry anthology — poems collected over decades — in one place, secure from degradation, ubiquitously available. Troy (pediatrician, reader, writer, printmaker) is the sole user and non-developer co-maintainer.

**Governing principle:** Democratization of data through minimal-overhead point solutions. Any path requiring significant technical infrastructure is out of scope by design. The co-developer's time and tolerance are finite and must be respected.

---

## Current Architecture

**Host:** GitHub Pages at `https://trillnjoy.github.io/Claude_Artifacts/`  
**Repo:** `trillnjoy/Claude_Artifacts` — branch `main` is live production  
**Files:** `index.html`, `poems_seed.json`, `sw.js`, `manifest.json`, `CLAUDE.md`  
**Data store:** IndexedDB (`poetry-archive`, store: `poems`) keyed by poem `id`  
**Seed:** `poems_seed.json` — `{ "poems": [...] }` — fetched on every load, reseeds if fingerprint differs  
**Fingerprint:** `{count}:{newest added date}` — stored in localStorage as `pa_seed_fp`. No manual version bump needed.  
**Offline:** IndexedDB handles all reading/browsing offline. Network required only for acquisition.  
**PWA:** Installed to home screen with custom icon (192px and 512px PNGs in repo root). `manifest.json` requires `start_url` and `scope` both = `"/Claude_Artifacts/"`

**Current poem count:** 92 poems (as of 2026-03-15)

---

## What Works

- Browse, search, filter by tag — fully offline
- Tag filter: four chiclet-style group buttons (Emotional / Thematic / Formal / Era), single-row, one open at a time
- Fingerprint-based seed sync: reseeds automatically when poem count or newest date changes
- PWA installs to iOS home screen with custom icon and launches correctly
- **Tag display:** Single-row, overflow hidden, `+N` badge reveals hidden tags on tap. Higher contrast tag colors.
- **Poem data:** Stored as `stanzas` arrays. Each line is `{text, indent?}` with inline `<em>`/`<strong>` preserved. `renderStanzas()` generates HTML at display time.
- **Fan menu:** `+` button fans three options up-left — 📷 Capture (dithered, non-functional on iOS), ✎ Manual, 📂 Import. Translucent scrim overlay. Bold white labels.
- **Import:** 📂 Import opens Files picker (multi-select). Select one or more `poetry-inbox-N.json` files from iCloud Drive. Imports all valid poems in a single IndexedDB transaction. Confirms count via alert.
- **Export:** ⚙︎ Settings → "Export Archive…" downloads full IndexedDB as `poetry-archive-export-YYYY-MM-DD.json`. Valid as seed file and import source.
- **iOS Shortcut pipeline:** Photo → Convert to JPEG → Base64 Encode → Anthropic API (claude-sonnet-4-6) → numbered JSON file in iCloud Drive → PWA import.

---

## What Does Not Work

- **In-app photo capture via browser:** WebKit CORS permanently blocks browser-to-Anthropic API calls on iOS. Architectural, not fixable without a proxy. Capture button intentionally dithered. Do not attempt to re-solve in the browser.
- **Cloudflare Workers as proxy:** Rejected — known cybersecurity vector, out of scope.
- **Any proxy solution:** Out of scope by design.
- **Settings sheet intermittently unresponsive:** Occasionally after heavy use the Settings sheet won't open, requiring a force quit. Cause unknown — likely a z-index or event listener issue. Not yet diagnosed.

---

## Acquisition Workflows

### iOS Shortcut (preferred)
1. Run **Poetry Capture** shortcut — select photo from library (HEIC auto-converted to JPEG)
2. Shortcut calls Anthropic API, receives structured JSON
3. JSON saved as `poetry-inbox-N.json` in iCloud Drive (numbered, never overwrites)
4. Open PWA → tap `+` → 📂 Import → select one or more inbox files
5. Poems added to IndexedDB immediately

### Chat-based (for complex poems)
Photos → Claude chat OCR → Claude outputs a ready-to-import `.json` file via `present_files` → download → drop in iCloud Drive → import via PWA.  
Use this path for: two-page poems, poems with complex formatting, poems where Shortcut OCR is likely to fail.

---

## Backup Discipline

Poems added via Shortcut → import live only in device IndexedDB until committed to the seed. A reseed triggered by a GitHub deploy will wipe and reload from the seed — any uncommitted poems will be lost.

**Safe workflow:**
1. Capture poems via Shortcut, import to IndexedDB
2. Periodically (every ~10 poems, or before any GitHub deploy): ⚙︎ → Export Archive
3. Exported `{poems:[...]}` file is already valid `poems_seed.json` format
4. Rename to `poems_seed.json`, commit to GitHub — fingerprint auto-triggers reseed
5. Optionally keep named snapshots in repo: `poems_seed_backup_092.json` etc.

**Critical:** Always export before deploying changes to GitHub. A deploy can trigger a reseed.

---

## iOS Shortcut — Poetry Capture

**Actions in order:**
1. `Get Contents of Folder` → iCloud Drive → Poetry Archive folder
2. `Count Items` in Folder Contents
3. `Calculate` → Count + 1
4. `Text` → `poetry-inbox-` + Calculation Result + `.json`
5. `Select Photos` — single photo
6. `Convert Image` → JPEG, quality ~60%
7. `Base64 Encode` → Line Breaks: None
8. `Get Details of Images` → Media Type (from converted image)
9. `Get Date` → Current Date
10. `Format Date` → Custom, `yyyy-MM-dd`
11. `Text` — full JSON request body (see template below)
12. `Get Contents of URL` → POST to `https://api.anthropic.com/v1/messages`, headers: `Content-Type: application/json`, `x-api-key: sk-ant-...`, `anthropic-version: 2023-06-01`, Request Body: File → Text from step 11
13. `Get Dictionary Value` → key: `content` from Contents of URL
14. `Get First Item` from Dictionary Value
15. `Get Dictionary Value` → key: `text` from Item from List
16. `Save File` → iCloud Drive → Poetry Archive folder, Subpath: Text from step 4, file type: Dictionary, Overwrite: on

**Text block template (step 11):**
```
{"model":"claude-sonnet-4-6","max_tokens":2000,"messages":[{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":"[Base64 Encoded token — no spaces]"}},{"type":"text","text":"Return only a raw JSON object. No backticks. No code blocks. No markdown. No explanation. Only the JSON object itself: {\"id\":\"poet-title-slug\",\"title\":\"...\",\"poet\":\"...\",\"dates\":\"...\",\"tags\":[...],\"stanzas\":[[{\"text\":\"line\"}]],\"added\":\"[Formatted Date token — no spaces]\"} where stanzas is an array of stanza arrays, each line is {\"text\":\"...\"} optionally with inline <em> for italics. Tags from: longing grief joy desire tenderness melancholy defiance wonder resignation mortality nature time war faith identity embodiment beauty memory sonnet ode lyric free-verse rhymed classical translation ancient renaissance romantic-era victorian modernist contemporary erotic conjugal romantic beat prose-poem refrain litany."}]}]}
```

**Critical lessons:**
- Use `Base64 Encode` not `Encode Media`
- HEIC not supported — always convert to JPEG first
- Hardcode `media_type` as `image/jpeg` — do not construct dynamically
- No spaces before or after variable tokens in Text block
- `added` date: `Get Date` → `Format Date` (Custom, yyyy-MM-dd)
- Haiku refuses copyrighted poems — use Sonnet (claude-sonnet-4-6)
- Save File Subpath must be set explicitly
- Save as Dictionary type to force `.json` extension
- File numbering: count existing files in folder + 1. No counter file needed.

---

## Poem Data Structure

```json
{
  "id": "cohen-suzanne",
  "title": "Suzanne",
  "poet": "Leonard Cohen",
  "dates": "1934–2016",
  "tags": ["longing", "desire", "contemporary", "lyric"],
  "stanzas": [
    [
      {"text": "Suzanne takes you down"},
      {"text": "to her place near the river"}
    ]
  ],
  "added": "2026-03-15"
}
```

- `text` field holds inner content HTML — `<em>`, `<strong>` preserved, no attribute quotes
- `indent` field optional: `{"text": "indented line", "indent": 1.5}`
- No `text` (HTML string) field — that format is retired
- `source` field on some Kerouac poems is non-standard but harmless — preserve it

---

## Fragilities — Status

| # | Fragility | Status |
|---|-----------|--------|
| 1 | HTML-in-JSON quote corruption | ✅ Closed — stanzas structure, inline HTML in text content only |
| 2 | Manual version bump | ✅ Closed — content fingerprint auto-detects changes |
| 3 | Institutional knowledge lost at thread end | ✅ Closed — CLAUDE.md in repo |
| 4 | No backups, no rollback | ✅ Closed — in-app export; export-before-deploy discipline |
| 5 | Chat-based capture unsustainable | ✅ Closed — iOS Shortcut pipeline working |

---

## Next Development Priorities (In Order)

1. **Multi-page poem capture** — Shortcut currently handles one photo. Two-page poems need either: (a) Shortcut modification to select and send multiple photos in one API call, or (b) chat-based OCR with stitch/merge workflow. Neither fully designed yet.
2. **Poet identification** — When poet name is not visible in photo (e.g. from an anthology with attribution elsewhere), neither Shortcut nor chat OCR can reliably identify the poet. Need an efficient, non-obtrusive identification step — possibly a stored "current poet" file in iCloud checked at Shortcut runtime, or a review/correction step in the PWA import flow.
3. **Settings sheet bug** — intermittently unresponsive after heavy use; requires force quit. Diagnose and fix.
4. **Tag ontology update** — add `beat`, `prose-poem`, `refrain`, `litany` to Era or Formal group in UI chiclets
5. **Dev branch** — create `dev` branch, establish merge-to-main discipline
6. **Fit and finish** — ongoing

---

## Future Ideas

### Poet Portraits (Option B — GitHub-hosted assets)
Display a small circular portrait (48×48px) in the upper-right corner of the poem reading view, visible only when a portrait is available for that poet. Not on the browse/search page.

**Architecture:**
- Store portrait images in `/portraits/` folder in repo as small JPEGs named by poet slug (e.g., `whitman.jpg`, `cohen.jpg`)
- Served by GitHub Pages, cached by service worker — works offline after first load
- Derive portrait path automatically from poet name slug rather than storing per-poem
- No IndexedDB changes required
- Source: Wikimedia Commons has public domain portraits for nearly every poet in the archive; better quality than photographing the frontispiece

**Poem view change:** Minor — add optional portrait display logic to the poem header. Image only renders if the file exists at the expected path.

**Seed change:** None required if path is derived. Optional: add `poet_slug` field to poem records for poets whose names don't slug predictably.

**Scale:** ~40 poets, ~3–5KB per portrait JPEG = negligible repo size.

---

## Hard-Won Lessons — Do Not Repeat

- **WebKit CORS:** Direct browser fetch to `api.anthropic.com` from GitHub Pages = "Load failed". Permanent. Do not attempt.
- **Service worker caching poems_seed.json:** SW must never cache the seed file. Pass-through only.
- **Artifact renderer ceiling:** ~46 poems before the Claude artifact renderer freezes. PWA on GitHub Pages is the correct solution.
- **iOS file:// origin:** Blocks IndexedDB and localStorage. Served origin (GitHub Pages) required.
- **manifest.json:** `start_url` AND `scope` must both be `"/Claude_Artifacts/"` — missing either breaks PWA launch from home screen.
- **PWA icon update:** After uploading new icons to GitHub, delete PWA from home screen and reinstall — iOS caches icons aggressively.
- **GitHub file editing:** Edit `index.html` directly in GitHub, select all, paste new content.
- **IndexedDB is device-local:** Each device has its own independent IndexedDB. Sync is via seed file only.
- **Reseed wipes uncommitted poems:** Any poem added via import but not yet in `poems_seed.json` will be lost on reseed. Export before deploying.
- **Batch import transaction:** Multiple rapid `dbPut` calls silently fail on iOS Safari. Fixed with `dbPutMany` — all poems in a batch write in a single transaction.
- **The `source` field:** Some Kerouac poems have a `source` field — non-standard but harmless, preserve it.
- **Stanzas refactor:** Full structured refactor lost italics and changed line wrapping for prose-style stanzas. Resolved by storing inline HTML fragments as line text content. Line wrapping compromise accepted for prose-style stanzas.
- **Fan menu z-index:** Scrim: z-index 198, fan items: 201, + button: 202. Scrim above fan = buttons never fire.
- **iOS programmatic .click() on file inputs:** Blocked by iOS Safari in chained handlers. Fix: overlay transparent `<input type="file">` directly on the button.
- **Haiku copyright refusals:** Use Sonnet (claude-sonnet-4-6) for Shortcut OCR.
- **Base64 in Shortcuts:** Use `Base64 Encode`. Line Breaks: None. No spaces around variable tokens.
- **Chat OCR output format:** Claude outputs poem JSON as a downloadable `.json` file via `present_files`, not a code block. File is dropped in iCloud Drive and imported via PWA.

---

## Tag Ontology

| Group | Tags |
|-------|------|
| Emotional | longing, grief, joy, desire, tenderness, melancholy, defiance, wonder, resignation |
| Thematic | mortality, nature, time, war, faith, identity, embodiment, beauty, memory |
| Formal | sonnet, ode, lyric, free-verse, rhymed, classical, translation, erotic, conjugal, romantic |
| Era | ancient, renaissance, romantic-era, victorian, modernist, contemporary |

**Pending addition** (next refactor): beat, prose-poem, refrain, litany — add to Era or Formal group in UI.

---

## Poem ID Convention

`{surname-or-shortname}-{title-slug}` — lowercase, hyphens, no special characters.  
Examples: `cohen-suzanne`, `kerouac-34th-chorus`, `ferlinghetti-i-am-waiting`

---

## Thread Handoff Protocol

Every new thread opens with:
1. Upload `CLAUDE.md` from repo
2. Upload current `index.html`
3. One-sentence task statement
4. Poem photos if OCR is the task

No preamble. No re-explanation. Each thread is a sprint. Claude will over-plan without a file to act on immediately.

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
- Do not give recommendations based on files or context not yet in hand
---

## MMITM Addendum
*Added 2026-04-17. Lessons from Meet Me In The Middle PWA co-development.*

---

## Collaboration Model — Restatement and Sharpening

Troy occupies the **vision, requirements, and acceptance testing** role.
Claude occupies the **implementation and verification** role.

These are not interchangeable. When Troy is being pulled into debugging API
calls, chasing CORS flags, interpreting console errors, or reasoning about
network mechanics, Claude has failed to carry its share. This is not an
invitation to descend further into the stack. Claude must name the failure
explicitly and propose a corrective path.

Troy's technical background is substantial — Board Certified Clinical
Informaticist, Oracle Health/Cerner EHR director, experienced in CCL/SQL,
JSON, XML, and JavaScript — but deep technical competence does not mean
descending into implementation detail is an appropriate use of his time or
role. When Troy is doing Claude's job, a course correction is due. Claude
should recognize this before Troy has to say it.

---

## Verification Discipline

**Claude must not deliver code changes it cannot verify.**

If the testing environment is blocked — sandbox network restrictions, no
console access, no verifiable runtime — Claude must say so explicitly and
stop. Iterating on guesses is not a substitute for verification. Plausible-
looking code that has not been tested is not a deliverable; it is a liability.

*"I cannot verify this in the current environment"* is a complete, honest,
and acceptable response. It is preferable to six rounds of unverified commits.

All technical claims must carry an honest confidence level — consistent with
the genealogical research protocols already in this document. "This will fix
it" requires verified confidence. "This should fix it" and "this might fix it"
are different claims and must be labeled as such.

---

## External API Selection for PWAs

Before selecting any external API for a PWA deployed to GitHub Pages, Claude
must confirm — not assume — all of the following:

1. **CORS:** The API returns `Access-Control-Allow-Origin: *` headers that
   WebKit/Safari will accept. Safari is stricter than Chrome. A working Chrome
   test does not confirm Safari compatibility.

2. **No preflight:** Custom headers (`Content-Type`, `User-Agent`, etc.)
   trigger a CORS preflight `OPTIONS` request. If the API does not handle
   preflight, the request will fail silently on iOS. Simple GET requests with
   no custom headers are the only safe default.

3. **No API key required, or key acquisition is explicit:** If a key is
   required, the path to obtaining it must be stated clearly and agreed before
   implementation begins — not discovered mid-build.

4. **Testable before commit:** The API must be confirmed working in a
   verifiable environment before any code is pushed to GitHub. If no such
   environment is accessible, that is a blocker to be named, not worked around.

**Established facts about this stack:**
- Nominatim geocoding works from GitHub Pages in Safari — confirmed in production
- Overpass API CORS behavior on Safari from GitHub Pages — unconfirmed, failed repeatedly in practice
- The Claude artifact sandbox on iOS blocks all external network calls — not a valid testing environment
- WebKit CORS behavior on iOS is stricter than desktop Safari and Chrome — do not generalize from desktop tests

---

## Full Stop Recognition

When a blocking dependency exists that neither party can resolve in the
current session — no console access, no network testing, no verifiable
environment — Claude must call full stop clearly and immediately. Claude must
state:

1. What the specific blocker is
2. What specific condition would allow resumption
3. What alternatives exist that do not require the blocked dependency

Continuing to generate unverifiable output after a blocker has been identified
is a waste of Troy's time and Claude credits. Stop cleanly. Propose a real
path forward.

---

## Asset Recovery — Ask First

Before recreating any file, artifact, or document from scratch, Claude should
ask whether Troy has a readily available copy. Re-creating working code from
memory introduces regression risk and wastes time. If a prior version exists
and is accessible, start from that. This applies to HTML files, seed JSON,
manifests, service workers, and any other project artifact.

---

## Hard-Won Lessons from MMITM — Do Not Repeat

- **Overpass API + Safari + GitHub Pages:** Three rounds of attempted fixes,
  zero verified successes. Do not attempt Overpass again without first
  confirming CORS headers from this specific origin in a real Safari session.
- **The Claude iOS artifact sandbox:** Blocks all external network requests.
  Not a valid environment for testing API calls. Troy said this explicitly
  before a test was run anyway. Do not repeat this error.
- **Nominatim amenity search:** Returns sparse or empty results for structured
  amenity queries. Confirmed inadequate as a venue data source.
- **Iterating on broken code:** Six or more rounds of "this should fix it"
  on the same venue loading problem produced no working result and eroded
  trust. One honest "I cannot solve this without X" would have been better
  than all of them.
