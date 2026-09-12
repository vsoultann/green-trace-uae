# Portrait credits

All three portraits are used under a licence that permits reuse. Keep this file
next to the images, and keep the on-screen credit line on the About page.

| File | Subject | Source | Author | Licence |
|------|---------|--------|--------|---------|
| `zayed.jpg` | H.H. Sheikh Zayed bin Sultan Al Nahyan | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sheikh_Zayed_with_King_Faisal,_1974_(cropped).jpg) | National Archives of the United Arab Emirates, Ministry of Presidential Affairs | Public domain |
| `mbz.jpg` | H.H. Sheikh Mohamed bin Zayed Al Nahyan | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Mohamed_bin_Zayed_Al_Nahyan_-_2024_(cropped).jpg) | Press Service of the President of the Republic of Azerbaijan | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) |
| `mbr.jpg` | H.H. Sheikh Mohammed bin Rashid Al Maktoum | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sheik_Mohammed_bin_Rashid_Al_Maktoum.jpg) | International Monetary Fund (IMF) | Public domain |

Each file was cropped to a square and resized to 440x440; no other alteration
was made.

## Sample leaves

The six photographs in `app/samples/` ship with the app so the kiosk can
demonstrate a scan without a working camera. Every one is CC-BY or CC0 — the
rest of the training set is CC-BY-NC and is used only to train a model, never
redistributed. Each file was rotated to its EXIF orientation and resized to fit
900x900; nothing else was changed.

They are pinned in `tools/samples.mjs`, which verifies on every build that the
deployed model still identifies each one correctly and that the health analyser
still puts it in the band it was chosen for. Two are unhealthy on purpose, so a
demonstration reaches the findings and the treatment advice.

| File | Tree | Identified | Leaf health | Photographer | Licence | Observation |
|------|------|-----------|-------------|--------------|---------|-------------|
| `samples/ghaf.jpg` | Prosopis cineraria | 100% | 95/100 (excellent) | Siddarth Machado | [CC-BY](https://creativecommons.org/licenses/by/4.0/) | [iNaturalist 27525737](https://www.inaturalist.org/observations/27525737) |
| `samples/sidr.jpg` | Ziziphus spina-christi | 100% | 100/100 (excellent) | Dedicated to the public domain | [CC0](https://creativecommons.org/publicdomain/zero/1.0/) | [iNaturalist 126155844](https://www.inaturalist.org/observations/126155844) |
| `samples/nakhl.jpg` | Phoenix dactylifera | 100% | 86/100 (excellent) | Valentin Moser | [CC-BY](https://creativecommons.org/licenses/by/4.0/) | [iNaturalist 267974620](https://www.inaturalist.org/observations/267974620) |
| `samples/samar.jpg` | Vachellia tortilis | 100% | 94/100 (excellent) | Karim Haddad | [CC-BY](https://creativecommons.org/licenses/by/4.0/) | [iNaturalist 47818947](https://www.inaturalist.org/observations/47818947) |
| `samples/ghaf-stressed.jpg` | Prosopis cineraria | 93% | 48/100 (poor) | Siddarth Machado | [CC-BY](https://creativecommons.org/licenses/by/4.0/) | [iNaturalist 27525737](https://www.inaturalist.org/observations/27525737) |
| `samples/nakhl-stressed.jpg` | Phoenix dactylifera | 100% | 52/100 (fair) | Sula Vanderplank | [CC-BY](https://creativecommons.org/licenses/by/4.0/) | [iNaturalist 268743154](https://www.inaturalist.org/observations/268743154) |

Photographs are © their authors, from iNaturalist.
