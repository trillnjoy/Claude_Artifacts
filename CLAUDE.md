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

**Current poem count:** 72 poems (as of 2026-03-15)

---

## What Works

- Browse, search, filter by tag — fully offline
- Tag filter: four chiclet-style group buttons (Emotional / Thematic / Formal / Era), single-row, one open at a time
- Fingerprint-based seed sync: reseeds automatically when poem count or newest date changes
- PWA installs to iOS home screen with custom icon and launches correctly
- **Tag display:** Single-row, overflow hidden, `+N` badge reveals hidden tags on tap. Higher contrast tag colors.
- **Poem data:** Stored as `stanzas` arrays. Each line is `{text, indent?}` with inline `<em>`/`<strong>` preserved. `renderStanzas()` generates HTML at display time.
- **Fan menu:** `+` button fans three options up-left — 📷 Capture (dithered, non-functional on iOS), ✎ Manual, 📂 Import. Translucent scrim overlay. Bold white labels.
- **Import:** 📂 Import opens Files picker (multi-select). Select one or more `poetry-inbox-N.json` files from iCloud Drive. Imports all valid poems into IndexedDB.
- **Export:** ⚙︎ Settings → "Export Archive…" downloads full IndexedDB as `poetry-archive-export-YYYY-MM-DD.json`. Valid as seed file and import source.
- **iOS Shortcut pipeline:** Photo → Convert to JPEG → Base64 Encode → Anthropic API (claude-sonnet-4-6) → numbered JSON file in iCloud Drive → PWA import.

---

## What Does Not Work

- **In-app photo capture via browser:** WebKit CORS permanently blocks browser-to-Anthropic API calls on iOS. Architectural, not fixable without a proxy. Capture button intentionally dithered. Do not attempt to re-solve in the browser.
- **Cloudflare Workers as proxy:** Rejected — known cybersecurity vector, out of scope.
- **Any proxy solution:** Out of scope by design.

---

## Acquisition Workflows

### iOS Shortcut (preferred)
1. Run **Poetry Capture** shortcut — select photo from library (HEIC auto-converted to JPEG)
2. Shortcut calls Anthropic API, receives structured JSON
3. JSON saved as `poetry-inbox-N.json` in iCloud Drive (numbered, never overwrites)
4. Open PWA → tap `+` → 📂 Import → select one or more inbox files
5. Poems added to IndexedDB immediately

### Chat-based (legacy, still functional)
Photos → Claude chat OCR → paste JSON into `poems_seed.json` → commit to GitHub → PWA reseeds on next load.  
**Limit:** ~15-20 poem photos per chat thread before upload limit is hit.

---

## Backup Discipline

Poems added via Shortcut → import live only in device IndexedDB until committed to the seed. A reseed triggered by a GitHub deploy will wipe and reload from the seed — any uncommitted poems will be lost.

**Safe workflow:**
1. Capture poems via Shortcut, import to IndexedDB
2. Periodically (every ~10-20 poems, or before any GitHub deploy): ⚙︎ → Export Archive
3. Exported `{poems:[...]}` file is already valid `poems_seed.json` format
4. Rename to `poems_seed.json`, commit to GitHub — fingerprint auto-triggers reseed
5. Optionally keep named snapshots in repo: `poems_seed_backup_072.json` etc.

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

1. **Dev branch** — create `dev` branch, establish merge-to-main discipline
2. **Tag ontology update** — add `beat`, `prose-poem`, `refrain`, `litany` to Era or Formal group in UI chiclets
3. **Fit and finish** — ongoing

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
- **The `source` field:** Some Kerouac poems have a `source` field — non-standard but harmless, preserve it.
- **Stanzas refactor:** Full structured refactor lost italics and changed line wrapping for prose-style stanzas. Resolved by storing inline HTML fragments as line text content. Line wrapping compromise accepted for prose-style stanzas.
- **Fan menu z-index:** Scrim: z-index 198, fan items: 201, + button: 202. Scrim above fan = buttons never fire.
- **iOS programmatic .click() on file inputs:** Blocked by iOS Safari in chained handlers. Fix: overlay transparent `<input type="file">` directly on the button.
- **Haiku copyright refusals:** Use Sonnet (claude-sonnet-4-6) for Shortcut OCR.
- **Base64 in Shortcuts:** Use `Base64 Encode`. Line Breaks: None. No spaces around variable tokens.

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
