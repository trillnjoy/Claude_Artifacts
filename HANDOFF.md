# The CookBook Shelf — Thread Handoff

## Repo & URLs
- **Repo:** `trillnjoy/Claude_Artifacts`
- **App:** `https://trillnjoy.github.io/Claude_Artifacts/cookbook.html`
- **Seed:** `https://trillnjoy.github.io/Claude_Artifacts/cookbooks_seed.json`
- **Files in repo:** `cookbook.html`, `cookbooks_seed.json`

---

## Current State

### Catalog
52 books total. 12 Ina Garten titles fully indexed (1,061 recipes, all with page numbers, sourced from the complete Barefoot Contessa Combined Recipe Index PDF). All other books have empty recipe arrays pending photo index capture.

### App Architecture
- PWA, single-file HTML (`cookbook.html`)
- IndexedDB (`TheShelfDB` v3) — local cache, not source of truth
- Seed file (`cookbooks_seed.json`) — canonical source of truth
- Cold start: empty IndexedDB → fetch seed → hydrate
- Export → commit seed → all devices sync via Settings > Reload from Seed
- Photos (dish photos, ingredient photos) stored as base64 in IndexedDB only — never exported to seed

---

## Taxonomy — FINALIZED

### Course (exactly 1, required)
`cocktail · hot drink · punch · appetizer · soup · salad · sandwich · bread · breakfast · brunch · dinner entree · side · dessert · sauce`

### Type (0 or 1, optional)
**General:** `seafood · meat · egg · pasta · grain · vegetable · fruit · cheese · bread`
**When course = dessert:** `cake/muffin · tart/pie · cookie/bar · custard/pudding · ice cream · pastry · confection · fruit · sweet bread`

**Collapse rules:**
- `meat` absorbs all proteins: beef, pork, lamb, poultry, game, tofu
- `vegetable` absorbs legumes and mushrooms
- `grain` absorbs rice

### Cuisine (0–3, multi-value for fusion)

| Group | Values |
|---|---|
| Middle Eastern | `persian · turkish · armenian · lebanese · egyptian · moroccan · israeli · middle eastern` |
| Asian | `japanese · korean · chinese · thai · vietnamese · indian · asian` |
| European | `french · italian · greek · spanish · british · irish · german · scandinavian · european` |
| Latin American | `mexican · salvadoran · cuban · caribbean · argentinian · peruvian · brazilian · latin american` |
| American | `southern · southwestern · midwestern · american` |
| World Cuisine | `west african · east african · world cuisine` |

**Key decisions:**
- Persian is Middle Eastern, not Asian
- Israeli is Middle Eastern
- Southern absorbs New Orleans
- World cuisine is the universal catch-all

---

## Recipe Data Model

```json
{
  "name": "Croissant Bread Pudding",
  "page": 192,
  "highConfidence": true,
  "ingredients": [],
  "hasCard": false,
  "course": "dessert",
  "type": "custard/pudding",
  "cuisines": ["french", "american"]
}
```

`course`, `type`, `cuisines` are new fields added this session — not yet wired into `normalizeRecord()` or `exportCatalog()` in the current `cookbook.html`. **This is the primary pending code task.**

---

## Pending Code Work (Priority Order)

### 1. URGENT — Syntax/runtime check
Run a syntax check on current `cookbook.html` and fix any issues before proceeding. The taxonomy UI was added in a large multi-step edit and was not fully verified.

### 2. Fix `normalizeRecord()`
Currently strips `course`, `type`, `cuisines` on import. Must preserve them:
```javascript
function normalizeRecord(x) {
  return {
    // ...existing fields...
    recipes: (x.recipes||[]).map(r => ({
      name: r.name, page: r.page||null,
      highConfidence: r.highConfidence||false,
      ingredients: r.ingredients||[],
      hasCard: r.hasCard || !!(r.ingredients && r.ingredients.length > 0),
      course: r.course || null,
      type: r.type || null,
      cuisines: r.cuisines || []
    }))
  };
}
```

### 3. Fix `exportCatalog()`
Must include `course`, `type`, `cuisines` in recipe output so they persist in the seed.

### 4. Fix `initAddRecipePickers()`
Uses `arguments.callee` (illegal in strict mode). Rewrite with named callbacks.

### 5. Populate search filter dropdowns
`populateSearchFilters()` exists but needs to be called on search modal open.

### 6. Tag picker wiring when opening from index row
`openAddRecipeModalPrefilled()` now initializes `pickerCourse/Type/Cuisines` from the existing recipe — verify this works correctly after syntax check.

---

## UI Architecture

### Library view
- 3-column grid, cover-dominant, 2:3 aspect ratio
- Filter chiclets: All · Indexed · Not Indexed
- Sort popup (⇅): Recently Added · Title · Author · Publication Date
- Gold dot = indexed indicator (recipes.length > 0)
- 🔎 in header opens search modal

### Book Detail view
- Subheader: ‹ [Book Title] | ⊞ (Add Index) | ⊟ (Filter toggle) | ⚙ (Edit Book)
- Hero: cover + title + author + pubYear + "+ Recipe" button
- Filter drawer (⊟): Course / Type / Cuisine chiclet grids + active filter chips
- Recipe list sorted by Page (default) or Name
- Count label: "N Recipes · M with cards" or "X of N Recipes" when filtered
- Gray rows = index-only (hasCard:false) with ＋ button
- Dark rows = has card (hasCard:true), tappable → Recipe Card

### Recipe Card view
- Subheader: ‹ [Book Title]
- Tags displayed below title: course (ink), type (gold), cuisines (rust)
- Full-width 4:3 dish photo area (tap to add/replace, stored as base64 in IndexedDB)
- 📷 Update button → extracts ingredients via Claude API
- Ingredients list

### Search modal
- Pre-filter dropdowns: Course · Type · Cuisine (need `populateSearchFilters()` call)
- Free text search across recipe names within filtered set

### Add Recipe modal
- Name + page
- Inline chiclet pickers: Course (required) → Type (optional, switches vocabulary when course=dessert) → Cuisine (optional, 0–3)
- Photo capture for ingredients

---

## Index Capture Workflow
- Tap ⊞ on any book → Add Index modal
- Photograph index pages one at a time
- Claude (claude-opus-4-5) extracts `{name, page}` pairs per photo
- Running list with × to remove bad reads
- Merge logic: skip duplicates by name (case-insensitive), preserve hasCard entries

## Ingredient Extraction
- 📷 Update on Recipe Card → file input → Claude API → extracts ingredient list
- Model: `claude-opus-4-5`
- Prompt: extract ingredients as JSON array of strings with quantity and unit

## Dish Photo
- Tap 4:3 photo area on Recipe Card → file picker → stores base64 to `recipe.photo` in IndexedDB
- NOT exported to seed (too large)
- Replace by tapping again

---

## Settings
- API key (stored in IndexedDB meta store, key: `'apiKey'`)
- Export → `cookbooks_seed.json` (data URI, Safari-compatible)
- Reload from Seed (fetches from GitHub Pages URL)
- Clear All Local Data

---

## Known Issues / Fragilities
1. **Taxonomy fields not yet in normalizeRecord/export** — primary task
2. **`arguments.callee` in initAddRecipePickers** — needs cleanup
3. **Search filter dropdowns not populated on open** — `populateSearchFilters()` call missing
4. **iOS WebKit CORS** — in-app camera capture permanently blocked; workflow is chat photos → Claude OCR → update seed in GitHub
5. **No backup strategy yet** — recommend dev branch + seed snapshots every 50 recipes

---

## Ina Garten Index Notes
- Source: `https://d14iv1hjmfkv57.cloudfront.net/assets/Barefoot-Contessa-Full-Cookbook-Index.pdf`
- Combined index covers 13 books; "Barefoot in Paris" not in catalog (not owned)
- "Make It Ahead" added to catalog this session (was missing)
- "Simply Ina" in catalog but no recipes — forthcoming Fall 2026 book
- All 1,061 recipes have `highConfidence: true`, `hasCard: false`, `ingredients: []`
- Three recipes in The Barefoot Contessa have captured ingredients from prior session (Beets with Orange Vinaigrette, Coconut Cupcakes, Peach and Raspberry Crisp)

---

## Start Next Thread With
1. Upload current `cookbook.html` from repo
2. Upload current `cookbooks_seed.json` from repo
3. One-sentence task description
4. Run syntax check immediately before any other work
