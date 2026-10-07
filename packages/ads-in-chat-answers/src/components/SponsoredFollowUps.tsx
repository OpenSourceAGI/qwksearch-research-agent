import { useEffect, useRef } from 'react';
import { followUpQuestion } from '../matching';
import type { AdSelection } from '../types';

export interface SponsoredFollowUpsProps {
  /** The assistant's own follow-up questions. */
  questions: string[];
  /** The follow-up auction winner, if any. */
  sponsored?: AdSelection | null;
  /**
   * Where the sponsored question goes in the list (default 1, second row).
   * Never first: the top suggestion should be the most useful one, not the
   * one that paid.
   */
  sponsoredIndex?: number;
  /** A question was picked. `selection` is set for the sponsored one. */
  onSelect: (question: string, selection?: AdSelection) => void;
  /** Fired once when the sponsored question first renders. */
  onImpression?: (selection: AdSelection) => void;
  title?: string;
  className?: string;
}

/**
 * The "Related" list after an answer, with at most one sponsored row:
 * "Learn more about <topic>", labelled Sponsored with the advertiser's name.
 */
export function SponsoredFollowUps({
  questions,
  sponsored,
  sponsoredIndex = 1,
  onSelect,
  onImpression,
  title = 'Related',
  className,
}: SponsoredFollowUpsProps) {
  const impressionFor = useRef<string | null>(null);
  useEffect(() => {
    if (!sponsored || impressionFor.current === sponsored.campaign.id) return;
    impressionFor.current = sponsored.campaign.id;
    onImpression?.(sponsored);
  }, [sponsored, onImpression]);

  const rows: Array<{ question: string; selection?: AdSelection }> = questions.map((question) => ({ question }));
  if (sponsored?.campaign.followUp) {
    const at = Math.min(Math.max(1, sponsoredIndex), rows.length);
    rows.splice(at, 0, {
      question: followUpQuestion(sponsored.campaign.followUp.topic),
      selection: sponsored,
    });
  }
  if (rows.length === 0) return null;

  return (
    <nav className={['qads-root qads-followups', className].filter(Boolean).join(' ')} aria-label={title}>
      <h3 className="qads-followups-title">{title}</h3>
      <ul>
        {rows.map(({ question, selection }) => (
          <li key={`${selection ? 'ad:' : ''}${question}`}>
            <button
              type="button"
              className={selection ? 'qads-followup qads-followup--sponsored' : 'qads-followup'}
              onClick={() => onSelect(question, selection)}
            >
              <span className="qads-followup-arrow" aria-hidden="true">
                ↳
              </span>
              <span className="qads-followup-text">{question}</span>
              {selection && (
                <span className="qads-followup-tag">
                  Sponsored · {selection.campaign.advertiser}
                </span>
              )}
              <span className="qads-followup-plus" aria-hidden="true">
                +
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
