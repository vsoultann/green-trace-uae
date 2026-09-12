# Iterations — what was tested, what broke, and what changed

This is the testing record for the Warif rebuild (v2), September 2026. It covers
the work between commit `312bde4` (the last state of Green-Trace UAE v1) and the
current head.

Every entry follows the same four beats: **the problem** we found, **the change**
we made, **the evidence** the problem was real, and **the result**. An entry that
cannot fill all four is not an iteration, it is a preference, and it is not here.

The app carries a shorter version of this list at `#/project/journey`, generated
from `app/js/data/journey.js`, so an evaluator standing at the kiosk sees the same
record without opening the repository.

---

## How it was tested

| Test | What it does | Run with |
|---|---|---|
| Smoke test | Serves `app/` and drives it in real Chromium: loads the model, classifies one held-out photograph per species, checks four non-leaf images are refused and that 80 genuine leaves are not, walks all 15 routes in English and Arabic, checks v1's URLs still redirect, checks all four themes define every token, reloads with the network off, and fails on any console error | `npm test` |
| Benchmark | Measures cold and warm model load, 30 inferences, 30 full photo-to-result passes, tensor count before and after, repeat consistency, offline reload, and what the unknown-leaf check actually refuses. Writes `app/data/lab.json` | `npm run bench` |
| Health calibration | Runs the analyser over 800 reference photographs and reports how many healthy leaves it calls healthy | `npm run calibrate` |
| Health sensitivity | Paints synthetic necrosis and chlorosis onto real leaves and checks the analyser still sees them | `npm run sensitivity` |
| Sample verification | Re-checks that each of the six demonstration leaves is still classified correctly and still lands in its health band | `npm run samples` |
| Evidence capture | Screenshots every route at 390×844 and 1366×860, in both languages | `npm run shots` |

v1 evidence was captured **before any change was made**, and is in
`docs/evidence/v1`. v2 evidence is in `docs/evidence/v2`. The before/after slider
on the Journey page pairs them.

---

## 1. The species count was wrong on screen

**Problem.** The model page announced "Species: 10" while the deployed model was
trained on four. Anyone who scanned a Mangrove leaf and got "Ghaf" had been told,
by our own page, that Mangrove was covered.

**Change.** Every count is now written as two numbers — how many trees are in the
library, and how many the current model recognises — and the second comes from
`metadata.classes.length` rather than from a heading. Untrained trees carry a
"Reference only" badge everywhere they appear.

**Evidence.** `app/model/metadata.json` lists 4 classes and 81.5% validation
accuracy; `app/js/data/species.js` lists 10.

**Result.** `npm test` fails if the number of "Recognised" badges on the Trees
page does not equal the number of classes in the model file, or if the page's
summary line omits either number.

---

## 2. A photograph of a desk came back as a healthy Ghaf

**Problem.** A flat wood-grain image returned **"Ghaf, 98% — Leaf health 93 out
of 100, healthy"**, with treatment advice and three shops to buy it from. The
app's own out-of-distribution check had scored the image at 0.36 similarity
against a 0.59 threshold — it knew the picture was nothing like a leaf — but a
single objection only downgrades an answer to "treat with caution", and the warm
brown filled the frame solidly enough that the foliage check did not object at
all. This is the same failure v1 claimed to have solved, in a costume the
existing probes did not catch.

**Change.** A similarity that is not merely under the threshold but nowhere near
it now refuses on its own, exactly as an absence of plant tissue already did. The
margin is 0.12 below the threshold (`DECISIVE_MARGIN` in `app/js/model.js`).

**Evidence.** Measured over 480 photographs of the four trained species, exactly
one sits below that margin. The non-leaf probes sit between 0.31 and 0.38. The
cost is one real leaf in 480; the catch is every one of the probes.

**Result.** All four non-leaf probes are refused, and a sweep of 80 genuine
leaves refuses 0. Both checks are in `npm test`.

---

## 3. The app claimed to work offline and did not

**Problem.** The service worker was never registering. It was registered from a
listener on the window `load` event, but `app.js` now awaits the model card
before reaching that line — so by the time it ran, `load` had already fired and
the listener was attached to an event that would never come again. The app looked
perfectly healthy and had no offline cache at all.

**Change.** Register immediately when the document has already finished loading,
and only wait for the event when it has not.

**Evidence.** `npm run bench` reported `offline reload FAIL`; a probe found no
registration, no caches and no controller.

**Result.** 98 files precached; a reload with the network switched off renders
the app. Checked by both `npm test` and `npm run bench`, so the claim is a test
rather than a hope.

---

## 4. A language change could paint the wrong screen

**Problem.** Switching language repainted the view the shell remembered, rather
than going back through the router. Changing language while a navigation was in
flight could leave the previous screen painted under the new URL.

**Change.** `start()` returns the router's own render function, and the language
handler calls that, so every repaint passes the router's token guard.

**Evidence.** The smoke test measured the home route and got the result screen's
content, because the two renders raced.

**Result.** Home measures 2,055 characters and the result screen 1,342, as they
should.

---

## 5. The health analyser called healthy leaves sick

**Problem.** The first health analyser reported only 11.3% of known-healthy
reference leaves as healthy. It was reading the dark background around a leaf as
dead tissue: a leaf photographed on a desk was being condemned for the desk.

**Change.** White-balance the photograph against its own background, segment the
leaf out first, and measure colour and texture only inside the blade. Then
calibrate the thresholds against the reference set.

**Evidence.** `npm run calibrate`, before and after, on the same photographs.

**Result.** Healthy leaves reported healthy rose from 11.3% to 48.1% on the four
trained species, and to **57.3%** measured across all ten; the median score on
them went from 47 to **92**.

---

## 6. The sensitivity suite is failing, and has been left failing

**Problem.** Synthetic chlorosis detection was 93% and 97% when the reference set
held four species. Re-run across all ten, it reports **89.4%** and **93.8%** —
the milder case is below the suite's own 90% floor, so `npm run sensitivity`
exits non-zero.

**Change.** None to the analyser. The measured numbers replaced the old ones in
the README, in `app/data/lab.json` and on the Test Lab page, and the likely cause
is recorded: six of the ten reference species have foliage the thresholds were
never tuned against.

**Evidence.** 385 and 353 composited leaves per case, against 40 per species in
the original run. Necrosis is unaffected at 99.2% and 100%.

**Result.** Open work, named on the page. Nothing was re-floored and no threshold
was loosened to make the red go away. The honest fix is to re-tune the chlorosis
thresholds against the wider set, or to re-scope the suite to the species the
model actually knows — and either is a decision, not a quiet edit.

---

## 7. The refusal does not catch what we assumed it caught

**Problem.** We believed the unknown-leaf check would refuse a tree the model had
never been trained on. It does not.

**Change.** The finding is stated on the How page and in the Test Lab with its
numbers. The demonstration sample that relied on the assumption — a Mangrove
leaf, shipped as the "unknown" demo — was removed rather than kept because it
happened to work.

**Evidence.** `npm run bench` measures it every run: of 40 photographs each, it
refused 0 Mesquite, 0 Athel, 2 Arak, 2 Neem, 2 Mangrove and 10 Apple of Sodom.

**Result.** A limitation we would have been asked about is one we state first,
with a number attached.

---

## 8. Every species drawing rendered as nothing

**Problem.** `leafShape()` emitted its SVG path data as the *text content* of a
`<g>` element rather than as a `<path d="…">`. Ten leaf drawings rendered as ten
empty boxes, silently — an SVG with no drawable element is not an error.

**Change.** One `<path>` holding every subpath.

**Evidence.** A DOM probe found `<svg><g …>M24 45V26M24 26L11 7…</g></svg>` in
every tile.

**Result.** The Ghaf and the Mesquite now differ on screen in exactly the way the
real leaves do, which is the whole argument for having drawings at all.

---

## 9. Route transitions stacked the old screen on the new one

**Problem.** `@view-transition { navigation: auto }` opts into *cross-document*
transitions. On a hash-routed single page it left the previous snapshot painted
on top of the next view; a phone screenshot showed the shell repeated four times
down the page.

**Change.** Removed the at-rule and kept the scripted `startViewTransition`,
with all three of its promises handled — a skipped transition rejects `ready`,
and an unhandled rejection there is reported as a page error, which the smoke
test treats as a failure.

**Evidence.** `docs/evidence` screenshots at 390 px, and
`AbortError: Transition was skipped` in the console.

**Result.** Route changes cross-fade in 180 ms, and the page contains one shell.

---

## 10. The demonstration leaves demonstrated nothing

**Problem.** Choosing sample photographs by "highest leaf-detector score" shipped
a whole Ghaf at thirty metres, a date grove and a photograph with a bicycle in
it. The app asks for *one leaf filling the frame*; the samples showed it being
given exactly what it asks you not to give it. Every sample also came back
"healthy", so a demonstration never reached the findings or the treatment advice.

**Change.** The six are pinned by photo id in `tools/samples.mjs`, chosen by eye
from a contact sheet the tool prints, and **verified on every build**: the
deployed model has to identify each one correctly, and the health analyser has to
put it in the band it was chosen for. Two are unhealthy on purpose, and the
damaged date palm is chosen so that it triggers the red palm weevil advice.

**Evidence.** The tool refuses to build when a pin stops passing — which it did,
catching that one candidate was rejected as unfamiliar at full resolution even
though its 256 px training crop passed.

**Result.** `npm run samples` re-verifies them after any retraining, and
`app/img/CREDITS.md` records each photographer, licence and expected result.

---

## 11. The poster had the numbers typed into it

**Problem.** The poster quoted the calibration figures as literal text. The
figures then moved — twice — and a sheet that goes to a print shop with a number
in it will disagree with the app in A1.

**Change.** The poster reads `app/data/lab.json` and `app/model/metadata.json` at
render time, like every other page.

**Evidence.** The hardcoded 48.1% and 86 were already stale by the time the
poster was first printed; the measured values were 57.3% and 92.

**Result.** `npm run poster` produces a single 594 × 841 mm page. Verified: the
PDF's MediaBox is 594.1 × 841.0 mm.

---

## 12. The printed sheet lost its wordmark

**Problem.** Printing from Night mode produced a poster with a hole where the
logo should be. The wordmark is a background image whose token swaps to a
light-on-dark variant, and nothing reset it for paper.

**Change.** `print.css` pins the whole Day palette, and the poster pins the light
brand tokens for itself, on screen as well as in print.

**Evidence.** The first A1 PDF, rendered under `emulateMediaType('print')` with
the browser in dark mode.

**Result.** The lockup prints. Checked by eye on the generated PDF.

---

## 13. Sixteen developer themes, two team leaders, and a ranking chart

Three content corrections, grouped because each is a one-line statement of fact:

- v1 shipped sixteen themes — Catppuccin, Nord, Dracula and friends. An app whose
  colours can be swapped for a code editor's palette does not have colours of its
  own. There are now four, and each is a decision rather than a preference.
- v1 listed **two** people as Team Leader. There is one: Sultan. `npm test`
  fails if that is ever not true.
- v1 drew a participation percentage for each member — 28%, 20%, 19%. The
  assessment grades *equal* participation, so a chart ranking five teammates
  against each other argued against the thing it was meant to evidence, quite
  apart from being a number nobody could measure. Replaced with named
  responsibilities and each member's speaking part. `npm test` fails if a
  `share` field reappears.

---

## Still open

| What | Why it is open |
|---|---|
| Chlorosis sensitivity below the 90% floor | Needs the thresholds re-tuned against ten species, or the suite re-scoped to four. A decision, not an edit. |
| Six of ten species untrained | `npm run fetch` and `npm run train` finish it; the interface already reads the count from the model. |
| Calibration measured on reference photographs | Forty photographs of the actual kiosk leaves, then `npm run calibrate`, is the honest confirmation. |
| The unknown-leaf check and other trees' leaves | Would need either a much larger training set or a genuine open-set method. |
