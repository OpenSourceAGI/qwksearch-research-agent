import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';
import { cleanKeyword, type AdvertiserBrief } from '../keywords';
import { formatCents, runAuction, scoreCampaign } from '../matching';
import { AD_PLACEMENTS, type AdPlacement, type Campaign, type KeywordPlan } from '../types';
import { BrandMark } from './BrandMark';

export interface CampaignStats {
  impressions: number;
  clicks: number;
  spendCents: number;
}

export interface AdvertiserPanelProps {
  campaigns: Campaign[];
  onSave: (campaign: Campaign) => void;
  onDelete?: (id: string) => void;
  /** Calls the keyword generator — usually `POST /keywords` on the server half. */
  generateKeywords: (brief: AdvertiserBrief) => Promise<KeywordPlan>;
  stats?: Record<string, CampaignStats>;
  className?: string;
}

const PLACEMENT_LABELS: Record<AdPlacement, string> = {
  answer: 'Product carousel under answers',
  'follow-up': 'Sponsored follow-up question',
};

let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

export function emptyCampaign(): Campaign {
  return {
    id: newId('cmp'),
    advertiser: '',
    description: '',
    website: '',
    keywords: [],
    negativeKeywords: [],
    placements: ['answer', 'follow-up'],
    products: [{ id: newId('prd'), title: '', price: '', url: '' }],
    followUp: { topic: '', url: '' },
    maxCpcCents: 50,
    dailyBudgetCents: 2_000,
    spentTodayCents: 0,
    active: true,
  };
}

/** Why a draft cannot be saved yet, or null when it can. */
export function validateCampaign(c: Campaign): string | null {
  if (!c.advertiser.trim()) return 'Add the advertiser name.';
  if (c.description.trim().length < 10) return 'Describe what you sell (at least 10 characters).';
  if (c.keywords.length === 0) return 'Add at least one keyword — or generate some.';
  if (c.placements.length === 0) return 'Pick at least one placement.';
  if (c.placements.includes('answer') && !c.products.some((p) => p.title.trim() && p.url.trim())) {
    return 'The product carousel needs at least one product with a title and URL.';
  }
  if (c.placements.includes('follow-up') && !(c.followUp?.topic.trim() && c.followUp.url.trim())) {
    return 'The sponsored follow-up needs a topic and a URL.';
  }
  if (c.maxCpcCents < 1) return 'Set a max cost per click.';
  if (c.dailyBudgetCents < c.maxCpcCents) return 'The daily budget must cover at least one click.';
  return null;
}

/**
 * Self-serve campaign builder: describe the business, let the model propose
 * keywords, pick placements and products, set a bid and budget, and test any
 * question against the live auction before saving.
 */
export function AdvertiserPanel({
  campaigns,
  onSave,
  onDelete,
  generateKeywords,
  stats = {},
  className,
}: AdvertiserPanelProps) {
  const [draft, setDraft] = useState<Campaign>(emptyCampaign);
  const [plan, setPlan] = useState<KeywordPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keywordInput, setKeywordInput] = useState('');
  const [negativeInput, setNegativeInput] = useState('');
  const [testQuery, setTestQuery] = useState('');

  const update = (patch: Partial<Campaign>) => setDraft((d) => ({ ...d, ...patch }));
  const isEditing = campaigns.some((c) => c.id === draft.id);

  const addKeywords = (field: 'keywords' | 'negativeKeywords', words: string[]) =>
    setDraft((d) => {
      const current = d[field] ?? [];
      const next = [...current];
      for (const w of words.map(cleanKeyword)) if (w && !next.includes(w)) next.push(w);
      return { ...d, [field]: next };
    });

  const removeKeyword = (field: 'keywords' | 'negativeKeywords', word: string) =>
    setDraft((d) => ({ ...d, [field]: (d[field] ?? []).filter((k) => k !== word) }));

  const onChipKey = (field: 'keywords' | 'negativeKeywords', value: string, clear: () => void) =>
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter' && e.key !== ',') return;
      e.preventDefault();
      addKeywords(field, value.split(','));
      clear();
    };

  const generate = async () => {
    setError(null);
    if (!draft.advertiser.trim() || draft.description.trim().length < 10) {
      setError('Add a name and a short description first — the model plans keywords from them.');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateKeywords({
        advertiser: draft.advertiser,
        description: draft.description,
        website: draft.website,
        products: draft.products.map((p) => p.title).filter(Boolean),
        existingKeywords: draft.keywords,
      });
      setPlan(result);
      if (result.followUpTopic && !draft.followUp?.topic) {
        update({ followUp: { topic: result.followUpTopic, url: draft.followUp?.url || draft.website || '' } });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Keyword generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const products = draft.products.filter((p) => p.title.trim() && p.url.trim());
    const campaign = { ...draft, products };
    const problem = validateCampaign(campaign);
    if (problem) {
      setError(problem);
      return;
    }
    onSave(campaign);
    setDraft(emptyCampaign());
    setPlan(null);
    setError(null);
  };

  // Test the draft against everyone else, as the auction would see it.
  const test = useMemo(() => {
    const query = testQuery.trim();
    if (!query) return null;
    const pool = [...campaigns.filter((c) => c.id !== draft.id), { ...draft, active: true }];
    const score = scoreCampaign(draft, { query });
    const results = AD_PLACEMENTS.map((placement) => {
      const [winner] = runAuction(pool, { query }, { placement });
      return { placement, winner };
    });
    return { score, results };
  }, [testQuery, campaigns, draft]);

  const suggestions = plan?.keywords.filter((s) => !draft.keywords.includes(s.keyword)) ?? [];

  return (
    <div className={['qads-root qads-panel', className].filter(Boolean).join(' ')}>
      <form className="qads-panel-form" onSubmit={submit}>
        <h2>{isEditing ? 'Edit campaign' : 'New campaign'}</h2>

        <fieldset>
          <legend>1. Your business</legend>
          <label>
            Advertiser name
            <input value={draft.advertiser} onChange={(e) => update({ advertiser: e.target.value })} placeholder="PageTurner Books" />
          </label>
          <label>
            Website
            <input value={draft.website ?? ''} onChange={(e) => update({ website: e.target.value })} placeholder="https://example.com" />
          </label>
          <label>
            Logo URL <span className="qads-optional">optional</span>
            <input value={draft.logoUrl ?? ''} onChange={(e) => update({ logoUrl: e.target.value || undefined })} placeholder="https://…/logo.png" />
          </label>
          <label>
            What do you sell, and to whom?
            <textarea
              rows={3}
              value={draft.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Used and new books on graphic design, logo design and branding, shipped cheaply to students and designers."
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>2. Keywords</legend>
          <div className="qads-generate-row">
            <button type="button" className="qads-button qads-button--accent" onClick={generate} disabled={generating}>
              {generating ? 'Generating…' : '✦ Generate keywords with AI'}
            </button>
            {plan && (
              <span className="qads-muted">
                {plan.source === 'llm' ? 'Suggested by the model' : 'Offline suggestions (no model configured)'}
              </span>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="qads-suggestions">
              <div className="qads-suggestions-head">
                <span>Suggestions — click to add</span>
                <button type="button" className="qads-link-button" onClick={() => addKeywords('keywords', suggestions.map((s) => s.keyword))}>
                  Add all
                </button>
              </div>
              <div className="qads-chips">
                {suggestions.map((s) => (
                  <button
                    type="button"
                    key={s.keyword}
                    className="qads-chip qads-chip--suggestion"
                    title={s.reason}
                    onClick={() => addKeywords('keywords', [s.keyword])}
                  >
                    + {s.keyword}
                  </button>
                ))}
              </div>
              {plan && plan.negativeKeywords.some((n) => !(draft.negativeKeywords ?? []).includes(n)) && (
                <button type="button" className="qads-link-button" onClick={() => addKeywords('negativeKeywords', plan.negativeKeywords)}>
                  Also exclude: {plan.negativeKeywords.join(', ')}
                </button>
              )}
            </div>
          )}

          <label>
            Keywords you're bidding on
            <div className="qads-chip-input">
              {draft.keywords.map((k) => (
                <span key={k} className="qads-chip">
                  {k}
                  <button type="button" aria-label={`Remove ${k}`} onClick={() => removeKeyword('keywords', k)}>
                    ×
                  </button>
                </span>
              ))}
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={onChipKey('keywords', keywordInput, () => setKeywordInput(''))}
                placeholder="type and press Enter"
              />
            </div>
          </label>
          <label>
            Negative keywords <span className="qads-optional">never show for these</span>
            <div className="qads-chip-input">
              {(draft.negativeKeywords ?? []).map((k) => (
                <span key={k} className="qads-chip qads-chip--negative">
                  {k}
                  <button type="button" aria-label={`Remove ${k}`} onClick={() => removeKeyword('negativeKeywords', k)}>
                    ×
                  </button>
                </span>
              ))}
              <input
                value={negativeInput}
                onChange={(e) => setNegativeInput(e.target.value)}
                onKeyDown={onChipKey('negativeKeywords', negativeInput, () => setNegativeInput(''))}
                placeholder="free download"
              />
            </div>
          </label>
        </fieldset>

        <fieldset>
          <legend>3. Placements</legend>
          {AD_PLACEMENTS.map((p) => (
            <label key={p} className="qads-check">
              <input
                type="checkbox"
                checked={draft.placements.includes(p)}
                onChange={(e) =>
                  update({
                    placements: e.target.checked ? [...draft.placements, p] : draft.placements.filter((x) => x !== p),
                  })
                }
              />
              {PLACEMENT_LABELS[p]}
            </label>
          ))}

          {draft.placements.includes('answer') && (
            <div className="qads-products">
              <span className="qads-sublabel">Carousel products</span>
              {draft.products.map((product, i) => (
                <div key={product.id} className="qads-product-row">
                  <input
                    aria-label="Product title"
                    placeholder="Title"
                    value={product.title}
                    onChange={(e) => {
                      const products = [...draft.products];
                      products[i] = { ...product, title: e.target.value };
                      update({ products });
                    }}
                  />
                  <input
                    aria-label="Price"
                    placeholder="$9.99"
                    className="qads-price-input"
                    value={product.price ?? ''}
                    onChange={(e) => {
                      const products = [...draft.products];
                      products[i] = { ...product, price: e.target.value };
                      update({ products });
                    }}
                  />
                  <input
                    aria-label="Product URL"
                    placeholder="https://…"
                    value={product.url}
                    onChange={(e) => {
                      const products = [...draft.products];
                      products[i] = { ...product, url: e.target.value };
                      update({ products });
                    }}
                  />
                  <button
                    type="button"
                    className="qads-icon-button"
                    aria-label="Remove product"
                    onClick={() => update({ products: draft.products.filter((p) => p.id !== product.id) })}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="qads-link-button"
                onClick={() => update({ products: [...draft.products, { id: newId('prd'), title: '', price: '', url: '' }] })}
              >
                + Add product
              </button>
            </div>
          )}

          {draft.placements.includes('follow-up') && (
            <div className="qads-followup-fields">
              <span className="qads-sublabel">Follow-up question</span>
              <div className="qads-followup-preview">
                Learn more about{' '}
                <input
                  aria-label="Follow-up topic"
                  value={draft.followUp?.topic ?? ''}
                  onChange={(e) => update({ followUp: { url: draft.followUp?.url ?? '', topic: e.target.value } })}
                  placeholder="logo design fundamentals"
                />
              </div>
              <input
                aria-label="Follow-up URL"
                value={draft.followUp?.url ?? ''}
                onChange={(e) => update({ followUp: { topic: draft.followUp?.topic ?? '', url: e.target.value } })}
                placeholder="Landing page URL"
              />
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>4. Bid and budget</legend>
          <div className="qads-money-row">
            <label>
              Max cost per click ($)
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={draft.maxCpcCents / 100}
                onChange={(e) => update({ maxCpcCents: Math.round(Number(e.target.value) * 100) })}
              />
            </label>
            <label>
              Daily budget ($)
              <input
                type="number"
                min={1}
                step={1}
                value={draft.dailyBudgetCents / 100}
                onChange={(e) => update({ dailyBudgetCents: Math.round(Number(e.target.value) * 100) })}
              />
            </label>
          </div>
          <p className="qads-muted">
            You pay the second price: just enough to beat the next ad, never more than your max. A more relevant ad
            wins with a lower bid.
          </p>
        </fieldset>

        <fieldset>
          <legend>Test a question</legend>
          <input value={testQuery} onChange={(e) => setTestQuery(e.target.value)} placeholder="what are the best books on logo design?" />
          {test && (
            <div className="qads-test-result" aria-live="polite">
              <div>
                Relevance <strong>{Math.round(test.score.relevance * 100)}%</strong>
                {test.score.hits.length > 0 && <> — matched {test.score.hits.map((h) => `“${h.keyword}”`).join(', ')}</>}
              </div>
              {test.results.map(({ placement, winner }) => (
                <div key={placement}>
                  {PLACEMENT_LABELS[placement]}:{' '}
                  {winner ? (
                    winner.campaign.id === draft.id ? (
                      <strong className="qads-win">you win at {formatCents(winner.costPerClickCents)}/click</strong>
                    ) : (
                      <span>won by {winner.campaign.advertiser}</span>
                    )
                  ) : (
                    <span className="qads-muted">no ad shown</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {error && (
          <p className="qads-error" role="alert">
            {error}
          </p>
        )}
        <div className="qads-form-actions">
          <button type="submit" className="qads-button qads-button--primary">
            {isEditing ? 'Save changes' : 'Launch campaign'}
          </button>
          {isEditing && (
            <button type="button" className="qads-button" onClick={() => setDraft(emptyCampaign())}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="qads-campaigns">
        <h2>Campaigns</h2>
        {campaigns.length === 0 && <p className="qads-muted">No campaigns yet.</p>}
        <ul>
          {campaigns.map((c) => {
            const s = stats[c.id] ?? { impressions: 0, clicks: 0, spendCents: 0 };
            const ctr = s.impressions ? (s.clicks / s.impressions) * 100 : 0;
            return (
              <li key={c.id} className={c.active ? 'qads-campaign' : 'qads-campaign qads-campaign--paused'}>
                <div className="qads-campaign-head">
                  <BrandMark name={c.advertiser} logoUrl={c.logoUrl} size={24} />
                  <strong>{c.advertiser}</strong>
                  <span className="qads-muted">{c.active ? 'Active' : 'Paused'}</span>
                </div>
                <div className="qads-campaign-keywords">{c.keywords.slice(0, 6).join(' · ')}{c.keywords.length > 6 ? ' …' : ''}</div>
                <dl className="qads-stats">
                  <div><dt>Impr.</dt><dd>{s.impressions}</dd></div>
                  <div><dt>Clicks</dt><dd>{s.clicks}</dd></div>
                  <div><dt>CTR</dt><dd>{ctr.toFixed(1)}%</dd></div>
                  <div><dt>Spend</dt><dd>{formatCents(s.spendCents)}</dd></div>
                  <div><dt>Budget</dt><dd>{formatCents(c.dailyBudgetCents)}/day</dd></div>
                </dl>
                <div className="qads-campaign-actions">
                  <button type="button" className="qads-link-button" onClick={() => { setDraft({ ...c }); setPlan(null); setError(null); }}>
                    Edit
                  </button>
                  <button type="button" className="qads-link-button" onClick={() => onSave({ ...c, active: !c.active })}>
                    {c.active ? 'Pause' : 'Resume'}
                  </button>
                  {onDelete && (
                    <button type="button" className="qads-link-button qads-danger" onClick={() => onDelete(c.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
