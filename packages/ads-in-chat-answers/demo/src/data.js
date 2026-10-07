// Seed campaigns and canned answers for the demo. Every advertiser here is
// fictional; the demo runs fully offline with these, and a model key on the
// server only replaces the canned answers and keyword plans with live ones.

const product = (id, title, price) => ({ id, title, price, url: `https://example.com/p/${id}` });

export const SEED_CAMPAIGNS = [
  {
    id: 'pageturner',
    advertiser: 'PageTurner Books',
    description: 'Used and new books on graphic design, logo design and branding, shipped cheaply to students and designers.',
    website: 'https://example.com/pageturner',
    keywords: ['logo design', 'branding', 'graphic design books', 'brand identity', 'design books', 'typography'],
    negativeKeywords: ['free download', 'pdf'],
    placements: ['answer', 'follow-up'],
    products: [
      product('ldl-2', 'LOGO Design Love: A Guide to Creating Iconic Brand Identities (2nd ed.)', '$28.05'),
      product('ldl-1', 'Logo Design Love: A Guide to Creating Iconic Brand Identities', '$6.49'),
      product('ldl-vtm', 'Logo Design Love (Voices That Matter), paperback', '$7.09'),
      product('ldl-vtm2', 'Logo Design Love (Voices That Matter), like new', '$6.79'),
      product('tdb', 'Thinking with Type: A Critical Guide for Designers', '$12.40'),
      product('ident', 'Identity Designed: The Definitive Guide to Visual Branding', '$18.99'),
    ],
    followUp: { topic: 'classic books on brand identity', url: 'https://example.com/pageturner/branding' },
    maxCpcCents: 45,
    dailyBudgetCents: 2500,
    spentTodayCents: 0,
    active: true,
  },
  {
    id: 'brightline',
    advertiser: 'Brightline Design School',
    description: 'Online courses in logo design, branding and UI design with mentor feedback.',
    website: 'https://example.com/brightline',
    keywords: ['logo design', 'learn design', 'design course', 'ui design', 'become a designer', 'branding'],
    negativeKeywords: ['free'],
    placements: ['answer', 'follow-up'],
    products: [
      product('bl-logo', 'Logo Design Bootcamp — 6 weeks, mentor-reviewed', '$249'),
      product('bl-brand', 'Brand Identity Systems — self-paced', '$129'),
      product('bl-ui', 'UI Design Foundations', '$99'),
    ],
    followUp: { topic: 'logo design courses with mentor feedback', url: 'https://example.com/brightline/logo' },
    maxCpcCents: 35,
    dailyBudgetCents: 4000,
    spentTodayCents: 0,
    active: true,
  },
  {
    id: 'summit',
    advertiser: 'Summit Trail Gear',
    description: 'Hiking boots, trail running shoes and lightweight backpacking gear.',
    website: 'https://example.com/summit',
    keywords: ['hiking boots', 'hiking', 'trail running shoes', 'backpacking', 'waterproof boots', 'trail'],
    negativeKeywords: ['injury', 'lawsuit'],
    placements: ['answer', 'follow-up'],
    products: [
      product('st-ridge', 'Ridgeline Mid Waterproof Hiking Boot', '$139'),
      product('st-flow', 'Flowstate Trail Runner', '$115'),
      product('st-pack', 'Ultralight 38L Backpack', '$89'),
      product('st-sock', 'Merino Hiking Socks (3-pack)', '$29'),
    ],
    followUp: { topic: 'breaking in new hiking boots', url: 'https://example.com/summit/guide' },
    maxCpcCents: 60,
    dailyBudgetCents: 3000,
    spentTodayCents: 0,
    active: true,
  },
  {
    id: 'crumb',
    advertiser: 'Crumb & Crust',
    description: 'Sourdough starter kits, bannetons and Dutch ovens for home bakers.',
    website: 'https://example.com/crumb',
    keywords: ['sourdough', 'sourdough starter', 'bread baking', 'baking bread', 'dutch oven', 'banneton'],
    negativeKeywords: [],
    placements: ['answer'],
    products: [
      product('cc-kit', 'Sourdough Starter Kit with Live Culture', '$34'),
      product('cc-ban', 'Rattan Banneton Proofing Basket', '$22'),
      product('cc-oven', 'Enameled Dutch Oven 5qt', '$79'),
    ],
    maxCpcCents: 25,
    dailyBudgetCents: 1500,
    spentTodayCents: 0,
    active: true,
  },
];

export const SAMPLE_QUESTIONS = [
  'What are the best books on logo design?',
  'How do I break in new hiking boots?',
  'Why is my sourdough starter not rising?',
  'What caused the fall of the Roman Empire?',
];

// Offline answers for the sample questions, so the demo is complete without a
// model key. The last one deliberately matches no campaign: it shows that an
// unrelated question gets no ad, whatever anyone bids.
export const CANNED_ANSWERS = {
  'what are the best books on logo design': {
    answer:
      'A few books come up again and again with working designers:\n\n• Logo Design Love by David Airey — a readable walk through the process of building an identity, with case studies from real briefs.\n• Thinking with Type by Ellen Lupton — not about logos specifically, but the typography grounding most wordmarks depend on.\n• Identity Designed, also by Airey — deeper case studies of full brand systems.\n\nIf you are just starting, read Logo Design Love first, then sketch a few marks for an imaginary client before moving on to the case-study books.',
    followUps: ['What makes a logo memorable?', 'How do designers present logo concepts to clients?', 'What is the difference between a logo and a brand identity?'],
  },
  'how do i break in new hiking boots': {
    answer:
      'Break them in gradually so the leather and footbed mould to your foot before a long trip:\n\n1. Wear them around the house for a few evenings with the socks you will hike in.\n2. Move to short walks on pavement, then easy trails, adding distance each time.\n3. Lace them snugly but not tight; re-lace mid-walk if you feel pressure points.\n4. Treat hot spots early with tape before they become blisters.\n\nModern synthetic boots need far less breaking in than full-grain leather — sometimes only a couple of short walks.',
    followUps: ['How should hiking boots fit?', 'Are trail runners better than boots?', 'How do I waterproof leather boots?'],
  },
  'why is my sourdough starter not rising': {
    answer:
      'The usual culprits, roughly in order:\n\n• Temperature — below about 70°F (21°C) yeast is sluggish. Find a warmer spot.\n• Feeding ratio — too much fresh flour dilutes the culture. Try 1:1:1 starter:flour:water.\n• Flour — bleached flour has fewer wild yeasts; mix in some whole wheat or rye.\n• Age — a starter under two weeks old is often not yet established.\n\nFeed it at a consistent time each day and mark the jar after feeding so you can see the rise.',
    followUps: ['How do I know when my starter is ready?', 'Can I use tap water for sourdough?', 'What hydration should my dough be?'],
  },
  'what caused the fall of the roman empire': {
    answer:
      'Historians generally point to a combination of pressures rather than a single cause: political instability and frequent civil wars, economic strain and currency debasement, overreliance on mercenary armies, pressure from migrating peoples on the frontiers, and the administrative split between East and West. The Western Empire ended in 476 CE; the Eastern (Byzantine) Empire lasted until 1453.',
    followUps: ['Why did the Eastern Roman Empire survive longer?', 'Who was Odoacer?', 'How did Christianity affect the late Empire?'],
  },
};

export function cannedAnswer(question) {
  const key = question.toLowerCase().replace(/[^a-z0-9 ]+/g, '').replace(/\s+/g, ' ').trim();
  const hit = CANNED_ANSWERS[key];
  if (hit) return hit;
  return {
    answer:
      'This demo has no language model configured, so here is a placeholder answer. Set LLM_API_KEY (or OPENROUTER_API_KEY) in the Vercel project to get live answers.\n\nAds below are still chosen for real: the auction scores your question against every campaign\'s keywords and only shows an ad when it is relevant.',
    followUps: [`What else should I know about ${question.replace(/^learn more about /i, '').replace(/[?.!]+$/, '').toLowerCase()}?`, 'Can you give me a quick summary?', 'What are common mistakes here?'],
  };
}
