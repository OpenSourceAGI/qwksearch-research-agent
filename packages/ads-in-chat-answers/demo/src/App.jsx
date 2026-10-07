import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AdvertiserPanel,
  ChatAnswerAd,
  SponsoredFollowUps,
  formatCents,
  heuristicKeywordPlan,
  isEligible,
  recordClick,
  scoreCampaign,
  selectChatAds,
} from 'ads-in-chat-answers';
import { SAMPLE_QUESTIONS, SEED_CAMPAIGNS, cannedAnswer } from './data.js';

const STORE_KEY = 'qads-demo-v1';

// Demo state lives in this browser only; storage can be unavailable (private
// mode, blocked site data), so every access is guarded and the seed is the
// fallback.
function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.campaigns)) return { campaigns: parsed.campaigns, stats: parsed.stats ?? {} };
    }
  } catch {
    /* fall through to the seed */
  }
  return { campaigns: SEED_CAMPAIGNS, stats: {} };
}

function saveState(state) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch {
    /* per-viewer convenience only */
  }
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function App() {
  const initial = useMemo(loadState, []);
  const [tab, setTab] = useState('chat');
  const [campaigns, setCampaigns] = useState(initial.campaigns);
  const [stats, setStats] = useState(initial.stats);
  const [turns, setTurns] = useState([]);
  const [inspectId, setInspectId] = useState(null);

  useEffect(() => saveState({ campaigns, stats }), [campaigns, stats]);
  const campaignsRef = useRef(campaigns);
  campaignsRef.current = campaigns;

  const bump = useCallback((id, patch) => {
    setStats((s) => {
      const cur = s[id] ?? { impressions: 0, clicks: 0, spendCents: 0 };
      return {
        ...s,
        [id]: {
          impressions: cur.impressions + (patch.impressions ?? 0),
          clicks: cur.clicks + (patch.clicks ?? 0),
          spendCents: cur.spendCents + (patch.spendCents ?? 0),
        },
      };
    });
  }, []);

  const onImpression = useCallback((sel) => bump(sel.campaign.id, { impressions: 1 }), [bump]);

  const chargeClick = useCallback(
    (sel) => {
      bump(sel.campaign.id, { clicks: 1, spendCents: sel.costPerClickCents });
      setCampaigns((cs) => cs.map((c) => (c.id === sel.campaign.id ? recordClick(c, sel.costPerClickCents) : c)));
    },
    [bump]
  );

  const ask = useCallback(
    async (question) => {
      const q = question.trim();
      if (!q) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setTurns((t) => [...t, { id, question: q, loading: true }]);
      setInspectId(id);

      let reply = null;
      try {
        const data = await postJson('/api/answer', { question: q });
        if (data.source === 'llm' && data.answer) reply = { ...data, live: true };
      } catch {
        /* no API (vite dev, or offline) — use the canned answer */
      }
      reply ??= { ...cannedAnswer(q), live: false };

      // The auction runs after the answer exists, over a snapshot of the
      // campaigns, so the answer could not have been shaped by the ads.
      const snapshot = campaignsRef.current;
      const slots = selectChatAds(snapshot, { query: q, answer: reply.answer });
      setTurns((t) =>
        t.map((turn) => (turn.id === id ? { ...turn, ...reply, loading: false, slots, snapshot } : turn))
      );
    },
    []
  );

  const generateKeywords = useCallback(async (brief) => {
    try {
      return await postJson('/api/keywords', brief);
    } catch {
      return heuristicKeywordPlan(brief);
    }
  }, []);

  const saveCampaign = useCallback((c) => {
    setCampaigns((cs) => (cs.some((x) => x.id === c.id) ? cs.map((x) => (x.id === c.id ? c : x)) : [c, ...cs]));
  }, []);

  const reset = () => {
    setCampaigns(SEED_CAMPAIGNS);
    setStats({});
    setTurns([]);
    setInspectId(null);
  };

  const inspected = turns.find((t) => t.id === inspectId && !t.loading);

  return (
    <div className="app qads-root">
      <header className="topbar">
        <div className="logo">
          <span className="logo-mark">Ad</span>
          <span>
            <strong>ads-in-chat-answers</strong>
            <span className="muted"> · QwkSearch demo</span>
          </span>
        </div>
        <nav className="tabs" role="tablist">
          {[
            ['chat', 'Chat'],
            ['advertiser', 'Advertiser panel'],
            ['how', 'How it works'],
          ].map(([key, label]) => (
            <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'tab active' : 'tab'} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </nav>
        <button className="reset" onClick={reset} title="Restore the seed campaigns and clear stats">
          Reset demo
        </button>
      </header>

      {tab === 'chat' && (
        <div className="chat-layout">
          <main className="chat">
            {turns.length === 0 && (
              <div className="empty">
                <h1>Ask anything</h1>
                <p className="muted">
                  Ads appear only when your question matches an advertiser's keywords. Try a sample:
                </p>
                <div className="samples">
                  {SAMPLE_QUESTIONS.map((q) => (
                    <button key={q} className="sample" onClick={() => ask(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((turn) => (
              <article key={turn.id} className={turn.id === inspectId ? 'turn inspecting' : 'turn'}>
                <div className="bubble-row">
                  <div className="bubble">{turn.question}</div>
                </div>
                {turn.loading ? (
                  <p className="thinking">Thinking…</p>
                ) : (
                  <>
                    <div className="answer">{turn.answer}</div>
                    <div className="answer-tools">
                      <ToolIcon label="Copy" d="M8 8h11v11H8zM5 16V5h11" />
                      <ToolIcon label="Good response" d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 16.8 20H7" />
                      <ToolIcon label="Bad response" d="M17 13V4h3v9zM17 13l-4 8a2 2 0 0 1-2-2v-4H6a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 7.2 4H17" />
                      <span className="source-tag">{turn.live ? 'live model answer' : 'canned answer (no model key)'}</span>
                      <button className="inspect-link" onClick={() => setInspectId(turn.id)}>
                        Inspect auction →
                      </button>
                    </div>
                    {turn.slots?.answer && (
                      <ChatAnswerAd
                        selection={turn.slots.answer}
                        showAuctionDetails
                        onImpression={onImpression}
                        onProductClick={(_p, sel) => chargeClick(sel)}
                        onAsk={(sel) => ask(`What is ${sel.campaign.advertiser}?`)}
                      />
                    )}
                    <SponsoredFollowUps
                      questions={turn.followUps ?? []}
                      sponsored={turn.slots?.followUp}
                      onImpression={onImpression}
                      onSelect={(question, sel) => {
                        if (sel) chargeClick(sel);
                        ask(question);
                      }}
                    />
                  </>
                )}
              </article>
            ))}

            <Composer onAsk={ask} />
          </main>

          <aside className="inspector" aria-label="Auction inspector">
            <h2>Auction inspector</h2>
            {inspected ? (
              <AuctionTable turn={inspected} />
            ) : (
              <p className="muted">
                Ask a question to see how every campaign scored, which ad won each placement, and what it pays per click.
              </p>
            )}
          </aside>
        </div>
      )}

      {tab === 'advertiser' && (
        <div className="page">
          <p className="intro">
            Describe the business, press <strong>Generate keywords with AI</strong>, pick the placements, and set a
            bid. Then go back to <button className="inline-link" onClick={() => setTab('chat')}>Chat</button> and ask a
            question your keywords match.
          </p>
          <AdvertiserPanel
            campaigns={campaigns}
            stats={stats}
            onSave={saveCampaign}
            onDelete={(id) => setCampaigns((cs) => cs.filter((c) => c.id !== id))}
            generateKeywords={generateKeywords}
          />
        </div>
      )}

      {tab === 'how' && <HowItWorks />}
    </div>
  );
}

function Composer({ onAsk }) {
  const [value, setValue] = useState('');
  const ref = useRef(null);
  return (
    <form
      className="composer"
      onSubmit={(e) => {
        e.preventDefault();
        onAsk(value);
        setValue('');
        ref.current?.focus();
      }}
    >
      <input ref={ref} value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ask anything" aria-label="Ask anything" />
      <button type="submit" className="send" aria-label="Send" disabled={!value.trim()}>
        ↑
      </button>
    </form>
  );
}

function ToolIcon({ label, d }) {
  return (
    <button className="tool" aria-label={label} title={label} type="button">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  );
}

function AuctionTable({ turn }) {
  const context = { query: turn.question, answer: turn.answer };
  const rows = turn.snapshot
    .map((c) => {
      const { relevance, hits } = scoreCampaign(c, context);
      return { c, relevance, hits, adRank: relevance * c.maxCpcCents };
    })
    .sort((a, b) => b.adRank - a.adRank);
  const winner = { answer: turn.slots.answer?.campaign.id, followUp: turn.slots.followUp?.campaign.id };

  return (
    <>
      <p className="q">“{turn.question}”</p>
      <table className="auction">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Relevance</th>
            <th>Bid</th>
            <th>Rank</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ c, relevance, hits, adRank }) => {
            const notes = [];
            if (winner.answer === c.id) notes.push(['win', `Carousel · ${formatCents(turn.slots.answer.costPerClickCents)}/click`]);
            if (winner.followUp === c.id) notes.push(['win', `Follow-up · ${formatCents(turn.slots.followUp.costPerClickCents)}/click`]);
            if (!notes.length) {
              if (!c.active) notes.push(['lose', 'paused']);
              else if (!isEligible(c, 'answer') && !isEligible(c, 'follow-up')) notes.push(['lose', 'budget spent or no creative']);
              else if (relevance < 0.3) notes.push(['lose', 'not relevant (< 30%)']);
              else notes.push(['lose', 'outranked']);
            }
            return (
              <tr key={c.id}>
                <td>
                  <strong>{c.advertiser}</strong>
                  <div className="hits">{hits.length ? hits.slice(0, 3).map((h) => `${h.keyword}${h.source === 'answer' ? ' (answer)' : ''}`).join(', ') : '—'}</div>
                  {notes.map(([kind, text]) => (
                    <span key={text} className={`note ${kind}`}>
                      {text}
                    </span>
                  ))}
                </td>
                <td>{Math.round(relevance * 100)}%</td>
                <td>{formatCents(c.maxCpcCents)}</td>
                <td>{adRank.toFixed(1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted small">
        Rank = relevance × max bid. Under 30% relevance a campaign is never shown. The winner pays the least it could
        have bid and kept its spot (second price). One advertiser can't take both placements on one answer.
      </p>
    </>
  );
}

function HowItWorks() {
  const steps = [
    ['1 · Advertiser buys keywords', 'In the advertiser panel, a business describes what it sells. An LLM reads the brief and proposes the phrases people actually ask an assistant about — plus negative keywords where an ad would be unwelcome. The advertiser picks placements, products, a max cost per click and a daily budget.'],
    ['2 · The assistant answers first', 'The model answers the question with no knowledge of any advertiser. Ads are chosen afterwards, so they cannot change what the answer says.'],
    ['3 · Keyword auction', 'Every active campaign is scored against the question (full weight) and the answer (half weight). Negative keywords veto. Campaigns under 30% relevance are dropped, the rest rank by relevance × bid, and the winner pays a second price.'],
    ['4 · Answer carousel', 'The top campaign with products fills the carousel under the answer — always labelled “Ad”, with a menu to hide it, see why it was shown, or report it.'],
    ['5 · Sponsored follow-up', 'A different campaign can win one slot in the follow-up list, worded only as “Learn more about <topic>” and labelled Sponsored. It is never the first suggestion.'],
    ['6 · Billing', 'Impressions are counted when an ad renders; clicks are charged at the second price against the daily budget, and a campaign at its cap drops out of the auction.'],
  ];
  return (
    <div className="page how">
      <h1>How ad placements work</h1>
      <ol>
        {steps.map(([title, body]) => (
          <li key={title}>
            <h3>{title}</h3>
            <p>{body}</p>
          </li>
        ))}
      </ol>
      <h2>Use it in an app</h2>
      <pre>{`import { ChatAnswerAd, SponsoredFollowUps, selectChatAds } from 'ads-in-chat-answers';
import 'ads-in-chat-answers/styles.css';

const { answer, followUp } = selectChatAds(campaigns, { query, answer: text });

{answer && <ChatAnswerAd selection={answer} onProductClick={trackClick} />}
<SponsoredFollowUps questions={related} sponsored={followUp} onSelect={ask} />`}</pre>
    </div>
  );
}
