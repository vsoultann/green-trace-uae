# Finishing the ten-species model

The app already describes ten species. The **deployed model still only knows
four** — the dataset download for the six new ones was still running when the
last commit was made. Until you finish this, the library marks the six untrained
species "Reference only" and the classifier will never return them, so nothing
on screen is a lie. It is just not finished.

Two commands, in this order.

## 1. Finish the download

```bash
cd ~/green-trace-uae
npm run fetch
```

It is resumable and skips anything already complete, so re-running it is safe
and cheap. Expect roughly 30–60 minutes for whatever is left; it rate-limits
itself to stay inside iNaturalist's one-request-per-second guidance.

Check where it got to at any time:

```bash
for d in dataset/inaturalist/*/; do printf "%-10s %s\n" "$(basename $d)" "$(ls $d | wc -l)"; done
```

You want ~400 in each of: `ghaf sidr nakhl samar qurm athl arak neem osher mesquite`.
Anything above ~250 will train acceptably; below ~150 that class will be weak.

## 2. Train

```bash
npm run train
```

This is the slow one. It has to embed every image through MobileNetV2 on the
WASM backend, and going from four classes to ten roughly triples the work —
budget **60–120 minutes**. The cached embeddings from the old four-class run
cannot be reused, because the cache key is the sample count and that has
changed.

It prints per-epoch accuracy and a confusion matrix, then writes:

- `app/model/head/` — the retrained classifier
- `app/model/ood.json` — new class centroids for the "I don't recognise this" check
- `app/model/metadata.json` — accuracy, confusion matrix, class order

The app reads all three at runtime, so the library badges, the species count and
the model page update themselves. There is nothing to edit by hand.

## 3. Check it, then ship it

```bash
npm test          # must be all green — it verifies class order and the OOD detector
npm run calibrate # health analyser specificity, unchanged by retraining
git add app/model dataset/inaturalist/CREDITS.json
git commit -m "Retrain on ten species"
git push
```

Pushing to `main` redeploys GitHub Pages automatically.

## What to look at in the confusion matrix

**Ghaf vs Mesquite is the row that matters.** They are genuine lookalikes and
that is why Mesquite is in the set. If Ghaf accuracy drops sharply and the
misses are nearly all going to Mesquite, that is the model telling you the truth
about a hard problem rather than a bug — and it is worth saying so to the judges
rather than hiding it.

If it drops *unacceptably* far, the honest fixes in order of value:

1. Photograph real Ghaf and Mesquite leaves yourself into
   `dataset/custom/ghaf/` and `dataset/custom/mesquite/` — team photos are
   weighted 3× and close-ups of the thorns and leaflet counts are exactly the
   signal the reference photos lack.
2. Only if that fails: drop `mesquite` from `tools/species.mjs` and retrain.
   Removing it makes the numbers look better and the project weaker, so treat
   that as the last resort.

## Expect the headline accuracy to fall

Four classes was 81.5%. Ten classes is a harder problem and the number will be
lower — that is arithmetic, not regression. A ten-class model at, say, 70% is
doing considerably more work than a four-class model at 81%. Quote both the
figure and the class count together.
