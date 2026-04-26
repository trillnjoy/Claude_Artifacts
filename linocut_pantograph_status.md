# Linocut Pantograph — Project Status & Handoff

## What It Is

A browser-based PWA tool for linocut printmakers. The core function: draw on a **last print** (left pane) with an Apple Pencil, and marks simultaneously appear at the registered homologous position on the **block photo** (right pane, mirror-flipped). This solves the cognitive problem of translating spatial decisions from a print to a mirror-reversed plate — the digital equivalent of a pantograph.

The tool uses **Claude Vision API** to identify 12 anatomical landmarks across both images and compute a perspective homography (normalized DLT) to warp the block image into registration with the print. Registration is the core technical achievement of this project.

---

## Deployed Files (all in GitHub Pages repo root, permanent names)

| File | Purpose |
|------|---------|
| `linocut_pantograph.html` | Main app — never rename |
| `linocut_pantograph_manifest.json` | PWA manifest — never changes |
| `linocut_pantograph_sw.js` | Service worker — only this changes on deploy |
| `LinoPantograph_192.png` | PWA icon 192px |
| `LinoPantograph_512.png` | PWA icon 512px |

**Deploy protocol:** increment `VERSION` constant in `linocut_pantograph_sw.js` only. The HTML URL is permanent. Users who have bookmarked or installed the PWA get the update automatically on next visit.

---

## Architecture

### Layout
- Landscape-optimized, iPad Pro primary target
- CSS flexbox: fixed header (44px) + flex panes + fixed toolbar (58px)
- `height: -webkit-fill-available` for iOS Safari viewport reliability
- `overscroll-behavior: none` prevents pull-to-refresh

### Panes
- **Left pane:** Last Print — base canvas + erase overlay + invisible draw canvas (interaction layer)
- **Right pane:** Block — base canvas (warped/mirrored) + red mask overlay + crosshair div

### Toolbar (single row, scrollable)
Knife · V Fine · V Wide · U Gouge · U Large | Carve · Restore | Size slider | ⊹ Register | 👁 Original | ↩ Undo | ✕ Clear | ↓ Print | ↓ Block | ↺ Print | ↺ Block | ⊘ New

### Drawing
- **Apple Pencil only** for drawing (`pointerType === 'pen'`), finger touch scrolls freely
- Palm rejection: when pen is active, all touch events blocked document-wide, page scroll frozen
- Pressure sensitivity scales both mark size and opacity
- Dab spacing: `size * 0.04` for continuous stroke (previously too sparse)
- Per-stroke undo snapshots, 40-level stack

### Gouge profiles
| Tool | Rendering | Width |
|------|-----------|-------|
| Knife | Hard point arc | `r * 0.06` |
| V Fine | Hard filled arc | `r * 0.08` — workhorse |
| V Wide | Tight radial, flat centre | `r * 0.25` |
| U Gouge | Flat-bottomed radial | `r * 0.55` |
| U Large | Wide flat bowl | `r * 1.0` |

Print marks: `rgba(255,255,255,op)` — paper white  
Block marks: `rgba(210,40,20,op*0.45)` — semi-transparent red

### Registration pipeline
1. Load both images → **⊹ Register** button activates
2. Auto-detect plate boundary in block photo (`detectPlateBoundary`) via pixel saturation scan — removes grey surround before sending to Vision
3. Both images downsampled to max 1024px, sent to `claude-sonnet-4-20250514` with structured prompt
4. Prompt specifies: Image 1 = print (face right), Image 2 = block natural orientation (face left) — Vision reports coords as-is in each image's own space, no mental mirroring
5. Landmarks scaled back to native image coords; block coords corrected for crop offset
6. Top 20% landmarks filtered (crop-sensitive)
7. Normalized DLT homography computed (9x9 ATA matrix → inverse iteration eigenvector → denormalized)
8. `drawWarpedBlock`: per-pixel backward mapping with bilinear interpolation; `mbx = bW-1-bx` mirrors at sampling
9. After warp: pantograph mapping is 1:1 (warped block canvas = print canvas coordinate space)
10. Gold dots on print + red dots on block shown for visual verification before confirming

### Coordinate mapping
- With homography + warped block: `bx = px, by = py` (1:1)
- Without homography (fallback): simple scale mapping
- `mapX_fromPrint` / `mapY_fromPrint` used for interpolated stroke dabs

### Save
- `navigator.share()` with `File` object → iOS native share sheet (Photos, Files, AirDrop)
- Fallback to `<a download>` on non-iOS

---

## Known Issues & Outstanding Priorities

### High Priority

**1. Registration Y-drift — spatially varying, worst at top**
The homography still shows residual Y error that increases toward the top of the image. Analysis suggests this is a genuine perspective difference between the two photos (camera angle, parallax) rather than a crop issue. The `detectPlateBoundary` auto-crop helps but doesn't fully resolve it. Potential approaches:
- RANSAC outlier rejection in homography computation (currently uses all landmarks equally)
- Ask Vision to provide confidence scores per landmark and weight the DLT accordingly
- Add a post-warp manual fine-tune: let user drag the warped block image slightly to correct residual translation
- Try affine-only transform (6 DOF) instead of full homography (8 DOF) — may be better conditioned for near-flat subject

**2. Gouge tool feel on V Fine / V Wide**
Per user testing: rapid strokes still sometimes show as dots (spacing may need further tightening at small sizes). V Fine and V Wide improved but bulbous ends noted at stroke termination. Consider: taper opacity at stroke start/end by tracking velocity and reducing opacity when `dist` is very small (stroke initiation/termination).

**3. No visual feedback during warp computation**
The per-pixel backward mapping warp can take 1-2 seconds on large images. The registration overlay stays up during this but there's no progress indication during the warp itself. Add a "Warping…" status update and consider running the warp in chunks with `setTimeout` to keep UI responsive.

### Medium Priority

**4. Re-register without reloading images**
The ⊹ Register button re-runs Vision but users cannot adjust the crop detection manually if `detectPlateBoundary` gets the boundary wrong. Consider adding a manual crop fallback (the four-corner handle UI from an earlier version) as an optional step before sending to Vision.

**5. Loupe during registration crop handles**
Corner handle drag during manual crop registration has a loupe that uses `position:fixed`. Works on iOS but may clip at screen edges on smaller devices. The loupe appears correctly above/below based on screen position but hasn't been tested on iPhone in landscape.

**6. Crosshair on block pane**
The red crosshair showing registered position on the block pane may lag slightly on fast strokes because it updates on `pointermove` not on each interpolated dab. Low priority but noticeable on fast strokes.

**7. Landmark preview dots not cleared on cancel**
If user taps Register, sees the landmark dots, then taps Cancel — the gold dots on the print canvas and red dots on the block canvas remain visible. Should be cleared on `cancelRegistration()`.

### Low Priority / Future

**8. Multi-print session workflow**
Currently ↺ Print swaps the print image but keeps the block registration. If the user pulls a new print and loads it, the registration may still be valid (same block, different print). Consider a prompt: "Keep existing registration?" when reloading print only.

**9. Stroke velocity / pressure tapering**
Real gouges taper at stroke entry and exit. Current rendering is uniform opacity throughout. Tracking time delta between pointer events would allow opacity ramping at stroke endpoints.

**10. Export with registration overlay**
Current save exports print with white marks OR block with red mask. A third export option: the block exported with the print semi-transparently overlaid (ghost overlay) to show registration quality as a reference image.

---

## Session Context

- Developed over a single extended session with Troy
- Primary tester: Troy's wife, working linocut printmaker, iPad Pro 13", Apple Pencil
- Subject: portrait of James Louis Podesta (connected to Troy's novella project *For Tommy White*)
- The Linocut Pantograph and Linocut Print Simulator are both deployed at `trillnjoy.github.io`
- Troy also has a Linocut MultiPlate Separator tool at the same repo (separate project)

---

## Prompt for Next Session

```
I am continuing development of the Linocut Pantograph, a PWA tool for linocut 
printmakers deployed at trillnjoy.github.io. The project status document is 
attached/pasted above.

The tool uses Claude Vision API to register a last print image against a block 
photo via homography, then acts as a digital pantograph — marks on the print 
simultaneously appear at the registered position on the mirror-flipped block.

Current deployment: linocut_pantograph.html (permanent URL), service worker at 
linocut_pantograph_sw.js (VERSION incremented on each deploy), manifest at 
linocut_pantograph_manifest.json.

Please start by reading the Known Issues section. The highest priority items are:
1. Residual Y-drift in registration (spatially varying, worst at top of image)
2. Gouge stroke termination — bulbous ends on V Fine and V Wide
3. No progress feedback during warp computation

Before making any changes, ask me to paste the current HTML so you are working 
from the live deployed version rather than a stale copy.
```
