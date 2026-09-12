# Warif — وارف

**Read the leaf. Keep the shade.**

Warif identifies a UAE tree from a single leaf, measures how healthy that leaf
is, and points you at the treatment and the shop that sells it — entirely inside
the browser, with no server and no internet connection.

*Wārif* is an Arabic word for shade that spreads wide and greenery that is lush:
what a healthy tree gives back.

A Grade 12 graduation project at Applied Technology High School, Al Ain, by
**Sultan Alkaabi** (team leader), **Saif Alshamsi** (data and field research),
**Mohammed Abdulla** (content and presentation), **Hamdan Alneyemi** (AI
specialist) and **Mohammed Rashed** (programmer), supervised by
**Mr. Hamdy Hersi**.

Shipped as *Green-Trace UAE* in version 1; renamed and rebuilt as Warif in
version 2. The Journey page inside the app records what changed and why.

🌐 **Live app:** https://vsoultann.github.io/green-trace-uae/

---

## What it does

| | |
|---|---|
| **Species identification** | Ghaf, Sidr, Date Palm, Samar, Grey Mangrove, Athel Tamarisk, Arak, Neem, Apple of Sodom, and the invasive Mesquite that is displacing the Ghaf |
| **Health diagnosis** | Chlorosis, necrosis, greenness, colour uniformity, texture variance → a single 0–100 score with plain-language findings |
| **Unknown inputs** | Says *"I don't recognise this leaf"* rather than forcing a fifth species into one of the four |
| **Treatment** | Names the likely cause, recommends what to buy, and lists nurseries and agricultural suppliers with phone numbers, opening hours and directions |
| **Runs where** | The user's phone. No API, no upload, no account. Works offline after first load. |
| **Languages** | English and Arabic, with full right-to-left layout |
| **Layout** | Phone, tablet and desktop — the navigation moves from a bottom bar with a diamond scan button to a top bar on wide screens, and the home screen splits into headline and viewfinder |
| **Themes** | Four, each a decision rather than a preference: Auto, Day, Night ("Majlis") and High contrast |
| **Showcase kit** | Kiosk mode, an in-app slide deck with a speaker timer, a print-ready A1 poster, an evaluator feedback form, and a brand page — all at their own routes, all reading the same data as the app |

## How the AI works

The system is deliberately split in two, because the two questions have very
different best answers.

### 1. Species — a convolutional neural network

Transfer learning on **MobileNetV2**:

```
photo → 224×224 RGB → MobileNetV2 (frozen, ImageNet) → 1280-d feature vector
      → dense 192 → dropout .35 → dense 96 → dropout .2 → softmax(4)
```

Only the head is trained. That keeps the trainable parameter count in the
hundreds of thousands rather than the millions, which is what makes it possible
to train a genuinely accurate classifier from a few hundred photographs per
species instead of the tens of thousands a from-scratch CNN would demand.

Training photographs come from **iNaturalist**, restricted to research-grade
observations under reusable Creative Commons licences. Every candidate photo is
screened by an Excess-Green vegetation test before it is accepted, because
iNaturalist observations are full of bark, trunk and habitat shots that would
otherwise teach the model the wrong thing.

Reported accuracy is measured on a held-out 15% validation split, and the live
numbers are shown on the app's model page — read straight out of
`app/model/metadata.json`, so they can never drift from the model that is
actually deployed.

#### Knowing when it does not know

A softmax always sums to one, so a classifier shown a rose still returns four
confident-looking numbers. Three independent signals have to agree before a
species is named:

| Signal | What it catches |
|---|---|
| **Feature-space distance** | The photo's 1280-d vector is compared against each class centroid, stored in `app/model/ood.json`. The threshold is the 5th percentile of the validation set's own similarities, so it accepts 95% of genuine leaves by construction. This never passes through the softmax, which is what makes it the strongest of the three. |
| **Softmax confidence and entropy** | No class scores highly, or the scores are spread evenly enough that the model is guessing. |
| **Leaf presence** | The health analyser reports whether there is foliage in the frame at all — measured from *structure*, not just colour, so random noise cannot fake it. |

Two agreeing signals, or an outright absence of foliage, produce an explicit
"unrecognised" verdict listing its own reasons. `npm test` verifies this on
flat colour, random noise and a drawn shape, and separately verifies that a
real leaf is still recognised — a detector that rejects everything is worthless.

### 2. Health — classical computer vision

No neural network here, on purpose: every number can be explained to a judge in
one sentence, and none of it needs labelled disease data.

1. **White-balance.** The illuminant is estimated from the near-neutral pixels
   of the backdrop — the sheet of paper the leaf is lying on — and divided out.
   Grey-world over the whole frame would be wrong here: the leaf really is
   green, and neutralising the average would drain the signal being measured.
2. **Segment.** Each pixel is converted to HSV and tested for plant tissue. The
   test accepts green *and* yellow *and* brown — an Excess-Green-only mask
   would quietly discard exactly the diseased tissue we are trying to measure.
   The mask is then cleaned with a majority filter and stripped of speckle,
   keeping every blob big enough to be a leaflet.
3. **Classify each pixel** as healthy, chlorotic (yellowing) or necrotic (dead
   brown tissue), on brightness-invariant indices.
4. **Measure** colour uniformity and surface texture **inside an eroded mask**,
   so that the leaf's own high-contrast outline is never counted as damage.
5. **Score.** Weighted, asymmetric penalties, each with a dead zone: dead tissue
   counts for far more than the same area of yellowing, and a leaf that is 5%
   yellow is a leaf, not a patient.

The result view tints the classified pixels back over the photo, so you can see
*where* on the leaf the damage was found.

#### Calibration — how we know it works

The first version of this analyser reported a problem on **88.8%** of reference
photographs, including obviously healthy ones. That is a testable claim, so it
was made a number. Two tools measure the two halves of the problem:

```bash
npm run calibrate     # specificity: how often a healthy leaf is left alone
npm run sensitivity   # sensitivity: does it still notice real damage?
```

| | v1 | v2, 4 species | v2, all 10 species |
|---|---|---|---|
| Reference photos reported healthy | 11.3% | 48.1% | **57.3%** |
| Median health score | 47 | 86 | **92** |
| Synthetic necrosis detected (25% / 45% of leaf) | — | 100% / 100% | **99.2% / 100%** |
| Synthetic chlorosis detected (38% / 60% of leaf) | — | 93% / 97% | **89.4% / 93.8%** |

The last column is the current measurement: `npm run bench` on 800 reference
photographs across all ten species. The middle column is the same suite when the
reference set held only the four trained species, and it is kept because the
difference is the interesting part — widening the set raised the healthy rate and
lowered chlorosis detection, which says the thresholds are tuned for the four
trees the model actually knows. The milder chlorosis case now sits below the
suite's own 90% floor; see *Honest limitations*.

The "before" column cannot be re-measured: the v1 analyser it describes was
replaced rather than kept behind a flag, so it is quoted from the project record,
and the Test Lab page labels it as quoted rather than measured.

Four bugs caused the original false-positive rate, and each is named in the
header comment of `app/js/health.js`: exposure leaking into every measurement,
warm indoor light being read as disease, the leaf's own outline being counted as
pitting, and thresholds with no dead zone.

`npm run calibrate` runs in **kiosk mode** by default: it segments the foliage
out of each reference photograph and composites it onto plain paper first,
because the reference set is mostly whole trees in a landscape while the app is
pointed at one leaf on a backdrop. `npm run sensitivity` paints synthetic
lesions of a known severity onto living tissue and fails the build if detection
drops below 90% — so a future tuning change cannot quietly make the analyser
blind in exchange for a prettier healthy rate.

### 3. Treatment and suppliers

A finding maps to a likely cause, a list of what to buy, and somewhere to buy
it (`app/js/data/treatments.js`, `app/js/data/suppliers.js`).

Nearby search works two ways, and deliberately uses **no API key**. A Google
Places key in a page served from GitHub Pages is a public key attached to a
billing account, and there is no way to hide it.

- A **bundled directory** of real UAE nurseries and agricultural suppliers,
  taken from OpenStreetMap with coordinates, phone numbers and opening hours,
  sorted by distance from the user's location. Works with the network off.
- A **Google Maps search link** per product, centred on the user, for shops the
  directory has never heard of and for hours that are current today.

Red palm weevil gets a special case: on a date palm showing dead tissue, the app
says to report it to the Ministry of Climate and Environment rather than to
treat it privately, because it is a notifiable pest.

## Repository layout

```
app/                    everything GitHub Pages serves
  index.html
  css/tokens.css        the design tokens and the four themes
  css/base.css          reset, self-hosted fonts, layout primitives
  css/components.css    shared components — the Sadu band, meters, panels
  css/views.css         per-screen layout
  css/print.css         Lab, Journey and Team as PDF evidence
  js/app.js             the shell: chrome, navigation, settings, routing
  js/router.js          hash routes, with v1's URLs kept working
  js/config.js          every project fact, in one place  ← edit here
  js/metadata.js        the model card, fetched before the model itself
  js/model.js           MobileNetV2 + trained head, in the browser
  js/health.js          the computer-vision health analyser
  js/i18n.js            English / Arabic strings
  js/nearby.js          geolocation, distance, Google Maps deep links
  js/icons.js           the interface icon set
  js/themes.js          theme, motion and text size
  js/ui/                dom helpers, bilingual headings, meters, the weave
  js/views/             one module per screen
  js/data/species.js    bilingual reference text for the ten trees
  js/data/team.js       members, responsibilities, speaking parts  ← edit here
  js/data/about.js      the long-form project text and the limitations
  js/data/journey.js    production stages and the iteration log
  js/data/presentation.js  the slides, as data
  js/data/treatments.js finding → cause → what to buy
  js/data/suppliers.js  real nurseries and official helplines  ← add yours here
  assets/brand/         the mark, the lockups and the Sadu band tile
  assets/fonts/         Reem Kufi and Readex Pro, self-hosted
  samples/              six demonstration leaves (+ credits.json)
  data/lab.json         what npm run bench measured  ← generated
  evidence/             the before/after screenshots the Journey page shows
  model/mobilenet/      frozen MobileNetV2 (14 MB, Apache 2.0, Google)
  model/head/           the classifier we trained
  model/metadata.json   accuracy, confusion matrix, class order
  model/ood.json        class centroids for the "I don't recognise this" check
  sw.js                 offline cache for the kiosk  ← generated
tools/
  fetch-dataset.mjs     pulls and screens training photos
  embed.mjs             shared preprocessing contract
  train.mjs             trains and evaluates the head, writes ood.json
  health-calibrate.mjs  measures the health analyser's false-positive rate
  health-sensitivity.mjs  measures whether it still detects real damage
  bench.mjs             measures the app and writes app/data/lab.json
  smoke-test.mjs        end-to-end browser test (npm test)
  samples.mjs           picks and verifies the demonstration leaves
  brand.mjs             renders the mark, lockups and icons
  sw-manifest.mjs       regenerates the precache list and cache name
  shots.mjs             screenshots every route, for the workbook
  evidence.mjs          copies the comparison shots into app/
  make-qr.mjs           kiosk and feedback QR codes
docs/evidence/v1        screenshots of Green-Trace UAE, before the rebuild
docs/evidence/v2        screenshots of Warif
docs/ITERATIONS.md      what was tested, what broke, and what changed
dataset/                training images (gitignored except CREDITS.json)
kiosk-qr.png            2000px QR for the printed stand
```

## Running it locally

```bash
git clone https://github.com/vsoultann/green-trace-uae
cd green-trace-uae
npm install
npm run serve          # http://localhost:8080
```

Open the printed URL. A plain `file://` open will *not* work — ES modules and
service workers both require a real origin.

## Retraining with your own photographs

This is the single highest-impact thing you can do before the presentation.
The shipped model learns from reference photographs taken all over the species'
range; forty photos of *your actual kiosk leaves* on *your actual backdrop*
under *your actual lighting* will beat hundreds of reference shots.

```bash
npm install

# 1. Reference photographs (already done once; safe to re-run, it resumes)
npm run fetch

# 2. Drop your own photos in — any filename, JPEG or PNG
mkdir -p dataset/custom/{ghaf,sidr,nakhl,samar}
#   ...copy phone photos into each folder...

# 3. Retrain. Your photos are weighted 3× against reference photos.
npm run train

# 4. Commit and push; the GitHub Action redeploys automatically.
git add app/model && git commit -m "Retrain with kiosk photographs" && git push
```

`npm run train` prints per-epoch accuracy and a confusion matrix, and writes the
same numbers into `app/model/metadata.json` so the About page updates itself.

### Photo checklist

For each species, roughly 40 photos: 10 straight-down on the kiosk backdrop,
10 handheld at an angle, 10 under the venue's lighting, 10 of visibly unhealthy
leaves. Vary the distance. Do not crop them all identically — the trainer
already applies eight augmentations per image (flips, crops, rotations,
brightness and saturation shifts), so what it needs from you is genuine
variation, not more of the same frame.

## The tools, and when to run each

| Command | When |
|---|---|
| `npm run serve` | Working on the app locally |
| `npm test` | Before every commit. Walks every route in both languages, checks the model still classifies and still refuses, and fails on any console error |
| `npm run bench` | After changing the model or the analyser. Writes `app/data/lab.json`, which is what the Test Lab page renders |
| `npm run sw` | After adding or changing **any** file in `app/`. Regenerates the precache list and the cache name |
| `npm run samples` | After retraining. Re-verifies that each demonstration leaf is still classified correctly |
| `npm run shots` then `npm run evidence` | After a visual change. Refreshes the v2 screenshots and copies the comparison pairs into the app |
| `npm run qr` | After changing `links.site` or `links.feedbackFormUrl` in `app/js/config.js` |
| `npm run brand` | After editing the mark or the lockups |

## Regenerating the QR code

```bash
npm run qr                              # defaults to the GitHub Pages URL
node tools/make-qr.mjs https://other.url
```

Writes `app/assets/qr.svg` (shown on the About page) and `kiosk-qr.png` at
2000 px for printing. Error-correction level H, so it still scans when the
printed stand is smudged or glared at under exhibition lighting.

## Deployment

Pushing to `main` triggers `.github/workflows/pages.yml`, which publishes the
`app/` directory to GitHub Pages. The workflow refuses to deploy if the trained
model is missing, so a broken build can never reach the kiosk.

## Licence

MIT for our code — see [LICENSE](LICENSE). MobileNetV2 is Apache 2.0 (Google).
Training photographs remain the property of their iNaturalist contributors and
are credited individually in `dataset/inaturalist/CREDITS.json`.

## Honest limitations

Worth saying out loud before a judge says it for you:

- **The deployed model is still the 4-class one.** `tools/species.mjs` and the
  reference library now describe ten species, and the dataset fetch for the six
  new ones was still running when this was committed. Until `npm run fetch` and
  `npm run train` have both finished, the library marks the six untrained
  species **Reference only** and the classifier will not return them. Finishing
  the job is exactly two commands.
- **The refusal catches things that are not plants, not other trees.** The
  out-of-distribution check reliably declines a photograph with no plant tissue
  in it — a hand, a floor, a printed logo — which is what it was built for.
  Measured against trees the model was never trained on, it rejected **0 of 40**
  Mesquite and **2 of 40** Mangrove photographs. A leaf from outside the trained
  set can still be given one of their names. `npm run bench` re-measures this
  and the Test Lab page shows the current figures.
- Health analysis measures *appearance*. A leaf can be discoloured for reasons
  the pipeline cannot distinguish (dust, sunburn, natural senescence, varietal
  colour), and a plant can be seriously diseased while a single leaf looks fine.
- The calibration figures above are measured against **reference photographs**,
  not against photographs of the kiosk leaves. Shooting forty of those and
  re-running `npm run calibrate` is the honest way to confirm the numbers hold.
- **The chlorosis sensitivity figures have drifted, and the floor is failing.**
  Across all ten reference species, synthetic chlorosis at 38% of the leaf is
  detected **89.4%** of the time — below the suite's own 90% floor, so
  `npm run sensitivity` exits non-zero. Necrosis is unaffected (99.2% / 100%).
  The likely cause is that six of the ten species have foliage the thresholds
  were never tuned against. Nothing was re-floored to make the red go away; see
  `docs/ITERATIONS.md`.
- Supplier phone numbers and opening hours come from OpenStreetMap volunteers
  and can be out of date. Every entry also carries a live Google Maps link for
  that reason, and the app says "hours not recorded" rather than inventing them.
- It is a classroom demonstration, not an agricultural inspection tool.
