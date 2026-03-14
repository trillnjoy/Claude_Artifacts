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
**Files:** `index.html`, `poems_seed.json`, `sw.js`, `manifest.json`, `CLAUDE.md`  
**Data store:** IndexedDB (`poetry-archive`, store: `poems`) keyed by poem `id`  
**Seed:** `poems_seed.json` — `{ "poems": [...] }` — fetched on every load, reseeds if fingerprint differs  
**Fingerprint:** `{count}:{newest added date}` — stored in localStorage as `pa_seed_fp`. No manual version bump needed.  
**Offline:** IndexedDB handles all reading/browsing offline. Network required only for acquisition.  
**PWA:** Installed to home screen. `manifest.json` requires `start_url` and `scope` both = `"/Claude_Artifacts/"`

**Current poem count:** 71 poems (as of 2026-03-14)

---

## What Works

- Browse, search, filter by tag — fully offline
- Tag filter: four chiclet-style group buttons (Emotional / Thematic / Formal / Era), single-row, one open at a time
- Fingerprint-based seed sync: reseeds automatically when poem count or newest date changes
- PWA installs to iOS home screen and launches correctly
- **Tag display:** Single-row, overflow hidden, `+N` badge reveals hidden tags on tap. Higher contrast tag colors.
- **Poem data:** Stored as `stanzas` arrays (not HTML strings). Each line is `{text, indent?}` with inline `<em>`/`<strong>` preserved. `renderStanzas()` generates HTML at display time.
- **Fan menu:** `+` button fans three options up-left — 📷 Capture, ✎ Manual, 📂 Import. Translucent scrim overlay. Bold white labels.
- **Import:** 📂 Import in fan menu opens Files picker. Select `poetry-inbox.json` from iCloud Drive. Imports all valid poems into IndexedDB. Confirms count via alert.
- **iOS Shortcut pipeline:** Photo → Convert to JPEG → Base64 Encode (no line breaks) → Anthropic API (claude-sonnet-4-6) → structured JSON → saved as `poetry-inbox.json` in iCloud Drive → PWA import.

---

## What Does Not Work

- **In-app photo capture via browser:** WebKit CORS permanently blocks browser-to-Anthropic API calls on iOS. This is architectural, not fixable without a proxy. Do not attempt to re-solve this in the browser.
- **Cloudflare Workers as proxy:** Rejected — known cybersecurity vector, out of scope.
- **Any proxy solution:** Out of scope by design.

---

## Acquisition Workflows

### Chat-based (legacy, still functional)
Photos → Claude chat OCR → JSON string → paste into `poems_seed.json` → commit to GitHub → PWA reseeds on next load.  
**Limit:** ~15-20 poem photos per chat thread before upload limit is hit.

### iOS Shortcut (preferred)
1. Run **Poetry Capture** shortcut
2. Select photo from library (HEIC auto-converted to JPEG)
3. Shortcut calls Anthropic API, receives structured JSON
4. JSON saved as `poetry-inbox.json` in iCloud Drive
5. Open PWA → tap `+` → 📂 Import → select `poetry-inbox.json`
6. Poem added to IndexedDB immediately

---

## iOS Shortcut — Poetry Capture

**Actions in order:**
1. `Select Photos` — single photo
2. `Convert Image` → JPEG, quality ~60%
3. `Base64 Encode` → Line Breaks: None
4. `Get Details of Images` → Media Type (from converted image)
5. `Get Date` → Current Date
6. `Format Date` → Custom, `yyyy-MM-dd`
7. `Text` — JSON request body with variables inserted (see below)
8. `Get Contents of URL` → POST to `https://api.anthropic.com/v1/messages`, headers: `Content-Type: application/json`, `x-api-key: sk-ant-...`, `anthropic-version: 2023-06-01`, Request Body: File → Text
9. `Get Dictionary Value` → key: `content`
10. `Get First Item from List`
11. `Get Dictionary Value` → key: `text`
12. `Save File` → iCloud Drive, Subpath: `poetry-inbox.json`, Overwrite: on

**Text block template:**
```
{"model":"claude-sonnet-4-6","max_tokens":2000,"messages":[{"role":"user","content":[{"type":"image","source":{"type":"base64","media_type":"image/jpeg","data":"[Base64 Encoded token]"}},{"type":"text","text":"Return only a raw JSON object. No backticks. No code blocks. No markdown. No explanation. Only the JSON object itself: {\"id\":\"poet-title-slug\",\"title\":\"...\",\"poet\":\"...\",\"dates\":\"...\",\"tags\":[...],\"stanzas\":[[{\"text\":\"line\"}]],\"added\":\"[Formatted Date token]\"} where stanzas is an array of stanza arrays, each line is {\"text\":\"...\"} optionally with inline <em> for italics. Tags from: longing grief joy desire tenderness melancholy defiance wonder resignation mortality nature time war faith identity embodiment beauty memory sonnet ode lyric free-verse rhymed classical translation ancient renaissance romantic-era victorian modernist contemporary erotic conjugal romantic beat prose-poem refrain litany."}]}]}
```

**Critical lessons from Shortcut build:**
- `Encode Media` is for video/audio — use `Base64 Encode` instead
- HEIC is not supported by Anthropic API — always convert to JPEG first
- `media_type` must be hardcoded as `image/jpeg` — do not construct dynamically
- No spaces before or after variable tokens in the Text block — causes invalid base64 or empty fields
- `added` date: use `Get Date` (Current Date) → `Format Date` (Custom, yyyy-MM-dd) — do not rely on the date being passed through other actions
- Haiku refuses to transcribe recognizable copyrighted poems — use Sonnet or Opus
- `poetry-inbox.json` Subpath must be set explicitly in Save File — placeholder text is not a filename

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
  "added": "2026-03-14"
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
| 3 | Institutional knowledge lost at thread end | ✅ Closed — this CLAUDE.md in repo |
| 4 | No backups, no rollback | ⬜ Open |
| 5 | Chat-based capture unsustainable | ✅ Closed — iOS Shortcut pipeline working |

---

## Next Development Priorities (In Order)

1. **Dev branch** — create `dev` branch, establish merge-to-main discipline
2. **Backups** — named seed snapshots every 50 poems; in-app export (download IndexedDB as JSON)
3. **Batch capture** — Shortcut appends to inbox file rather than overwriting (requires numbering scheme or newline-delimited JSON)
4. **Tag ontology update** — add `beat`, `prose-poem`, `refrain`, `litany` to Era or Formal group in UI
5. **Fit and finish** — ongoing

---

## Hard-Won Lessons — Do Not Repeat

- **WebKit CORS:** Direct browser fetch to `api.anthropic.com` from GitHub Pages = "Load failed". Permanent. Do not attempt.
- **Service worker caching poems_seed.json:** SW must never cache the seed file. Pass-through only.
- **Artifact renderer ceiling:** ~46 poems before the Claude artifact renderer freezes. Architecture, not capacity. PWA on GitHub Pages is the correct solution.
- **iOS file:// origin:** Blocks IndexedDB and localStorage. Served origin (GitHub Pages) required.
- **manifest.json:** `start_url` AND `scope` must both be `"/Claude_Artifacts/"` — missing either breaks PWA launch from home screen.
- **GitHub file naming:** Edit `index.html` directly in GitHub, select all, paste new content.
- **IndexedDB is device-local:** Each device (iPhone, Mac Safari, Chrome) has its own independent IndexedDB. Sync is via seed file only.
- **The `source` field:** Some Kerouac poems have a `source` field (e.g., "Mexico City Blues") — non-standard but harmless, preserve it.
- **Stanzas refactor:** Attempted full structured refactor (stanza/line arrays, no HTML). Lost italics and changed line wrapping for prose-style stanzas (e.g. Cohen's litany form). Resolved by storing inline HTML fragments as line text content — `<em>` preserved, no attribute quotes. Line wrapping compromise accepted for prose-style stanzas.
- **Fan menu z-index:** Scrim must be below fan items. Scrim: z-index 198, fan items: 201, + button: 202. Scrim above fan = buttons never fire.
- **iOS programmatic .click() on file inputs:** Calling `.click()` on a file input inside a chained event handler is blocked by iOS Safari. Fix: overlay a transparent `<input type="file">` directly on the button so the tap is a direct user gesture.
- **Haiku copyright refusals:** Haiku refuses to transcribe recognizable published poems. Sonnet and Opus do not. Use Sonnet (claude-sonnet-4-6) for the Shortcut.
- **Base64 in Shortcuts:** Use `Base64 Encode` action (not `Encode Media`). Set Line Breaks to None. No spaces around the variable token in the Text block.

---

## Tag Ontology

| Group | Tags |
|-------|------|
| Emotional | longing, grief, joy, desire, tenderness, melancholy, defiance, wonder, resignation |
| Thematic | mortality, nature, time, war, faith, identity, embodiment, beauty, memory |
| Formal | sonnet, ode, lyric, free-verse, rhymed, classical, translation, erotic, conjugal, romantic |
| Era | ancient, renaissance, romantic-era, victorian, modernist, contemporary |

**Pending addition** (Beat poets, next refactor): beat, prose-poem, refrain, litany — add to Era or Formal as appropriate.

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
