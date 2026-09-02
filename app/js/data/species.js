/**
 * Reference data for the four species Green-Trace UAE recognises.
 *
 * `key` and the ordering here must match tools/species.mjs and the class order
 * baked into the trained model's metadata -- model.js asserts this on load.
 */
export const SPECIES = [
  {
    key: 'ghaf',
    emoji: '🌳',
    latin: 'Prosopis cineraria',
    en: {
      name: 'Ghaf',
      family: 'Fabaceae (legume family)',
      leaf: 'Twice-divided (bipinnate) leaves carrying 7–14 pairs of small, blue-green leaflets on each of two side branches. Feels thin and papery; the twigs bear scattered short thorns.',
      about:
        'The Ghaf is the national tree of the United Arab Emirates and the reason a great deal of the country was ever habitable. It survives on almost no rainfall by driving a taproot as deep as 30 metres to reach groundwater, and because it is a legume it fixes nitrogen through its roots, quietly fertilising the sand around it. A single mature Ghaf shelters an entire micro-ecosystem — grasses, insects, birds and grazing animals all cluster in its shade.',
      significance:
        'Declared a protected national symbol; 2019 was named the Year of Tolerance in the UAE with the Ghaf as its emblem, because generations of desert communities gathered beneath it to settle disputes.',
      health:
        'A healthy Ghaf holds an even blue-green tint. Widespread yellowing usually means salt stress from irrigation water; blackened leaflet tips point to Ghaf dieback, a fungal problem that has hit UAE plantations.',
    },
    ar: {
      name: 'الغاف',
      family: 'الفصيلة البقولية',
      leaf: 'أوراق مركبة ريشية مزدوجة تحمل من ٧ إلى ١٤ زوجاً من الوريقات الصغيرة الخضراء المزرقة، مع أشواك قصيرة متفرقة على الأغصان.',
      about:
        'الغاف هو الشجرة الوطنية لدولة الإمارات العربية المتحدة. يتحمل الجفاف بجذر وتدي يصل عمقه إلى ٣٠ متراً للوصول إلى المياه الجوفية، وهو يثبّت النيتروجين في التربة فيخصّب الرمال من حوله. الشجرة الواحدة الناضجة تؤوي نظاماً بيئياً كاملاً من الأعشاب والحشرات والطيور.',
      significance:
        'شجرة محمية ورمز وطني؛ اختيرت شعاراً لعام التسامح ٢٠١٩ لأن أهل الصحراء كانوا يجتمعون تحت ظلها لحل الخلافات.',
      health:
        'الشجرة السليمة موحدة اللون الأخضر المزرق. الاصفرار الواسع يدل غالباً على إجهاد ملحي، أما اسوداد أطراف الوريقات فيشير إلى موت أطراف الغاف الفطري.',
    },
  },
  {
    key: 'sidr',
    emoji: '🍃',
    latin: 'Ziziphus spina-christi',
    en: {
      name: 'Sidr',
      family: 'Rhamnaceae (buckthorn family)',
      leaf: 'Simple oval leaves, 2–6 cm, with three bold veins running from the base to the tip and a finely toothed edge. Glossy dark green above, pale and slightly downy underneath.',
      about:
        'Also called the Christ\'s thorn jujube, the Sidr is one of the longest-lived trees in Arabia — individuals over 500 years old are documented. Its small yellow fruit is edible, its leaves have been used as a cleanser and medicine for millennia, and Sidr honey, made by bees working its blossom, is among the most valuable honeys in the world.',
      significance:
        'Named in the Quran and deeply woven into Emirati heritage medicine. Its dense, thorny canopy makes it a critical nesting tree for desert birds.',
      health:
        'Look for the three basal veins staying crisp and green. Sidr is a common target for leaf-mining insects, which leave pale winding trails, and for sooty mould, which shows as a black film on the glossy upper surface.',
    },
    ar: {
      name: 'السدر',
      family: 'الفصيلة النبقية',
      leaf: 'أوراق بسيطة بيضاوية من ٢ إلى ٦ سم، لها ثلاثة عروق بارزة تمتد من القاعدة إلى القمة وحافة مسننة دقيقة، لامعة من الأعلى وشاحبة من الأسفل.',
      about:
        'السدر من أطول أشجار الجزيرة العربية عمراً، وقد وُثّقت أشجار تجاوزت خمسمائة عام. ثمره النبق صالح للأكل، وأوراقه استُخدمت للتنظيف والتداوي منذ آلاف السنين، وعسل السدر من أثمن أنواع العسل في العالم.',
      significance: 'ذُكر في القرآن الكريم وله مكانة راسخة في الطب الشعبي الإماراتي، وتُعد أشجاره ملاذاً لتعشيش طيور الصحراء.',
      health:
        'العروق الثلاثة يجب أن تبقى واضحة وخضراء. السدر عرضة لحشرات صانعة الأنفاق التي تترك خطوطاً شاحبة متعرجة، وللعفن الأسود الذي يظهر كطبقة سوداء على السطح اللامع.',
    },
  },
  {
    key: 'nakhl',
    emoji: '🌴',
    latin: 'Phoenix dactylifera',
    en: {
      name: 'Date Palm',
      family: 'Arecaceae (palm family)',
      leaf: 'A huge pinnate frond up to 5 m long, with stiff grey-green leaflets folded into a V and set along the midrib in opposing planes. The lowest leaflets harden into vicious spines.',
      about:
        'The date palm is the foundation of settled life in the Gulf. It tolerates salt and heat that would kill almost anything else, and every part of it was historically used: fruit for food, trunks for roofing, fronds for arish houses and fibre for rope. The UAE holds over 40 million date palms — one of the densest populations on earth.',
      significance:
        'Called "the mother tree" in Emirati culture. Date palm cultivation in the Al Ain oases is a UNESCO World Heritage inscription, and the UAE is a world leader in palm research.',
      health:
        'Healthy fronds are stiff and evenly grey-green. Drooping or collapsing fronds are the signature of red palm weevil, the single most destructive pest in the region, while orange-brown blotching along the leaflets suggests a fungal leaf spot.',
    },
    ar: {
      name: 'النخيل',
      family: 'الفصيلة النخيلية',
      leaf: 'سعفة ريشية ضخمة يصل طولها إلى ٥ أمتار، وريقاتها صلبة رمادية خضراء مطوية على شكل حرف V، وتتحول الوريقات السفلية إلى أشواك حادة.',
      about:
        'النخلة أساس الاستقرار في الخليج. تتحمل الملوحة والحرارة التي لا يصمد أمامها غيرها، واستُخدم كل جزء منها: الثمر غذاءً والجذوع سقوفاً والسعف للعرش والليف للحبال. تضم الإمارات أكثر من ٤٠ مليون نخلة.',
      significance: 'تُسمى «الشجرة الأم» في الثقافة الإماراتية، وواحات العين المزروعة بالنخيل مُدرجة في قائمة اليونسكو للتراث العالمي.',
      health:
        'السعف السليم صلب وموحد اللون. تدلي السعف أو انهياره علامة سوسة النخيل الحمراء، أخطر آفة في المنطقة، أما التبقع البرتقالي البني فيشير إلى تبقع الأوراق الفطري.',
    },
  },
  {
    key: 'samar',
    emoji: '🌾',
    latin: 'Vachellia tortilis',
    en: {
      name: 'Samar',
      family: 'Fabaceae (legume family)',
      leaf: 'Very small twice-divided leaves with tiny paired leaflets only a few millimetres long, giving a feathery, almost see-through look. Twigs carry both long straight white thorns and short hooked ones.',
      about:
        'The Samar, or umbrella thorn acacia, is the tree that gives the Arabian desert its silhouette — a flat, wide crown pruned into a perfect umbrella by browsing camels and goats. Shrinking its leaves to near-nothing is how it survives: less surface area means less water lost. It fixes nitrogen and its seed pods are a staple food for desert livestock and wildlife.',
      significance:
        'A keystone species of UAE gravel plains and wadis. Its shade lowers ground temperature enough for other plants to germinate, so losing Samar trees cascades through the whole habitat.',
      health:
        'Because the leaflets are so small, health is judged by canopy density rather than individual leaves. Thinning that exposes the branch structure means drought stress or over-browsing; galls and swollen thorn bases indicate insect infestation.',
    },
    ar: {
      name: 'السمر',
      family: 'الفصيلة البقولية',
      leaf: 'أوراق مركبة ريشية مزدوجة صغيرة جداً، وريقاتها لا تتجاوز بضعة مليمترات فتبدو الورقة ريشية شبه شفافة، مع أشواك بيضاء مستقيمة طويلة وأخرى قصيرة معقوفة.',
      about:
        'السمر هو الشجرة التي ترسم ملامح الصحراء العربية بتاجها المسطح العريض الذي تشذّبه الإبل والماعز على هيئة مظلة. يصغّر أوراقه إلى أدنى حد ليقلل فقد الماء، ويثبّت النيتروجين، وقرونه غذاء أساسي لحيوانات الصحراء.',
      significance: 'نوع أساسي في السهول الحصوية والأودية الإماراتية؛ ظله يخفض حرارة الأرض بما يكفي لإنبات نباتات أخرى.',
      health:
        'لصغر الوريقات تُقاس الصحة بكثافة التاج لا بالورقة الواحدة. التخلخل الذي يكشف الأغصان يعني إجهاد جفاف أو رعياً مفرطاً، والعقد المتورمة عند قواعد الأشواك تدل على إصابة حشرية.',
    },
  },
];

export const SPECIES_BY_KEY = Object.fromEntries(SPECIES.map((s) => [s.key, s]));
export const CLASS_ORDER = SPECIES.map((s) => s.key);
