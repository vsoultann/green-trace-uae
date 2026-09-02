# Green-Trace UAE

**Identify four native Emirati trees from a single leaf, and measure how healthy that leaf is — entirely inside the browser, with no server and no internet connection.**

A graduation project by Sultan Alkaabi, Saif Alshamsi, Mohammed Alneyemi, Mohamed Aleryani and Hamdan Alneyemi.

🌐 **Live app:** https://vsoultann.github.io/green-trace-uae/

---

## What it does

| | |
|---|---|
| **Species identification** | Ghaf (*Prosopis cineraria*), Sidr (*Ziziphus spina-christi*), Date Palm (*Phoenix dactylifera*), Samar (*Vachellia tortilis*) |
| **Health diagnosis** | Chlorosis, necrosis, greenness, colour uniformity, texture variance → a single 0–100 score with plain-language findings |
| **Runs where** | The user's phone. No API, no upload, no account. Works offline after first load. |
| **Languages** | English and Arabic, with full right-to-left layout |
| **Themes** | Five, plus "match device" |

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
numbers are shown on the app's About page — read straight out of
`app/model/metadata.json`, so they can never drift from the model that is
actually deployed.

### 2. Health — classical computer vision

No neural network here, on purpose: every number can be explained to a judge in
one sentence, and none of it needs labelled disease data.

1. **Segment.** Each pixel is converted to HSV and tested for plant tissue.
   The test accepts green *and* yellow *and* brown — an Excess-Green-only mask
   would quietly discard exactly the diseased tissue we are trying to measure,
   and score every sick leaf as perfectly healthy.
2. **Classify each pixel** as healthy, chlorotic (yellowing) or necrotic (dead
   brown tissue).
3. **Measure** the circular standard deviation of hue (colour uniformity) and
   the mean absolute Laplacian (surface texture — pitting, lesions, insect
   damage).
4. **Score.** Weighted, asymmetric penalties: dead tissue counts for far more
   than the same area of yellowing.

The result view tints the classified pixels back over the photo, so you can see
*where* on the leaf the damage was found.

## Repository layout

```
app/                    everything GitHub Pages serves
  index.html
  css/app.css           theme tokens and layout
  css/anim.css          the motion layer
  js/app.js             router and views
  js/model.js           MobileNetV2 + trained head, in the browser
  js/health.js          the computer-vision health analyser
  js/motion.js          animation orchestration, ambient leaf field
  js/i18n.js            English / Arabic strings
  js/data/species.js    bilingual reference text for the four trees
  js/data/team.js       group members  ← edit roles here
  model/mobilenet/      frozen MobileNetV2 (14 MB, Apache 2.0, Google)
  model/head/           the classifier we trained
  model/metadata.json   accuracy, confusion matrix, class order
  sw.js                 offline cache for the kiosk
tools/
  fetch-dataset.mjs     pulls and screens training photos
  embed.mjs             shared preprocessing contract
  train.mjs             trains and evaluates the head
  make-qr.mjs           kiosk QR codes
dataset/                training images (gitignored except CREDITS.json)
kiosk-qr.png            2000px QR for the printed stand
```

## Running it locally

```bash
git clone https://github.com/vsoultann/green-trace-uae
cd green-trace-uae
npx serve app          # or: python3 -m http.server -d app 8080
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

- The model knows **four** species. Shown a fifth, it will still pick one of
  the four — the app flags this with a low-confidence warning derived from
  prediction entropy, but it cannot say "unknown" with certainty.
- Health analysis measures *appearance*. A leaf can be discoloured for reasons
  the pipeline cannot distinguish (dust, sunburn, natural autumn senescence,
  varietal colour), and a plant can be seriously diseased while a single leaf
  still looks fine.
- It is a classroom demonstration, not an agricultural inspection tool.
