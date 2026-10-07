import { useEffect, useId, useRef, useState } from 'react';
import { formatCents } from '../matching';
import type { AdProduct, AdSelection } from '../types';
import { BrandMark, ProductImage } from './BrandMark';

export interface ChatAnswerAdProps {
  selection: AdSelection;
  /** Fired once when the ad first renders. */
  onImpression?: (selection: AdSelection) => void;
  /** A product card was clicked. The card is also a real link to `product.url`. */
  onProductClick?: (product: AdProduct, selection: AdSelection) => void;
  /** "Hide this ad". The component hides itself either way. */
  onHide?: (selection: AdSelection) => void;
  /** "Ask about this ad" — the host turns it into a chat question. */
  onAsk?: (selection: AdSelection) => void;
  /** "Report this ad". */
  onReport?: (selection: AdSelection) => void;
  /** Show the auction numbers in "About this ad" (for the advertiser demo). */
  showAuctionDetails?: boolean;
  className?: string;
}

/**
 * The sponsored product carousel shown under an assistant answer: advertiser
 * header, an always-visible "Ad" label, an overflow menu (hide, about, ask,
 * report) and a horizontally scrolling row of product cards.
 *
 * It is rendered *after* the answer and visually separated from it — the ad
 * never sits inside the answer text, so it cannot be mistaken for the
 * assistant's recommendation.
 */
export function ChatAnswerAd({
  selection,
  onImpression,
  onProductClick,
  onHide,
  onAsk,
  onReport,
  showAuctionDetails = false,
  className,
}: ChatAnswerAdProps) {
  const { campaign } = selection;
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [reported, setReported] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Keyed on the campaign so re-rendering the same ad does not count twice.
  const impressionFor = useRef<string | null>(null);
  useEffect(() => {
    if (impressionFor.current === campaign.id) return;
    impressionFor.current = campaign.id;
    onImpression?.(selection);
  }, [campaign.id, onImpression, selection]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [menuOpen]);

  if (hidden) {
    return (
      <div className={['qads-root qads-hidden-note', className].filter(Boolean).join(' ')} role="status">
        {reported ? 'Thanks — this ad was reported and hidden.' : 'Ad hidden.'}
      </div>
    );
  }

  const scroll = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (track) track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
  };

  const menuAction = (fn: () => void) => () => {
    setMenuOpen(false);
    fn();
  };

  return (
    <section
      className={['qads-root qads-answer-ad', className].filter(Boolean).join(' ')}
      aria-label={`Sponsored by ${campaign.advertiser}`}
    >
      <header className="qads-ad-header">
        <div className="qads-ad-brand">
          <BrandMark name={campaign.advertiser} logoUrl={campaign.logoUrl} />
          <span className="qads-ad-name">{campaign.advertiser}</span>
        </div>
        <div className="qads-ad-actions" ref={menuRef}>
          <span className="qads-ad-badge">Ad</span>
          <button
            type="button"
            className="qads-icon-button"
            aria-label="Ad options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <DotsIcon />
          </button>
          {menuOpen && (
            <div className="qads-menu" role="menu" id={menuId}>
              <button
                type="button"
                role="menuitem"
                onClick={menuAction(() => {
                  setHidden(true);
                  onHide?.(selection);
                })}
              >
                <EyeOffIcon /> Hide this ad
              </button>
              <button type="button" role="menuitem" onClick={menuAction(() => setAboutOpen((o) => !o))}>
                <InfoIcon /> About this ad
              </button>
              {onAsk && (
                <button type="button" role="menuitem" onClick={menuAction(() => onAsk(selection))}>
                  <AskIcon /> Ask about this ad
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={menuAction(() => {
                  setReported(true);
                  setHidden(true);
                  onReport?.(selection);
                })}
              >
                <FlagIcon /> Report this ad
              </button>
            </div>
          )}
        </div>
      </header>

      {aboutOpen && (
        <div className="qads-about" role="note">
          <p>
            You're seeing this ad because your question matched keywords {campaign.advertiser} chose:{' '}
            {selection.hits.length
              ? selection.hits.slice(0, 4).map((h, i) => (
                  <span key={h.keyword}>
                    {i > 0 && ', '}
                    <strong>“{h.keyword}”</strong>
                  </span>
                ))
              : 'none recorded'}
            . Ads don't change the answer above, and your conversation isn't shared with the advertiser.
          </p>
          {showAuctionDetails && (
            <p className="qads-about-numbers">
              Relevance {Math.round(selection.relevance * 100)}% · max bid {formatCents(campaign.maxCpcCents)} ·
              pays {formatCents(selection.costPerClickCents)} per click
            </p>
          )}
          <button type="button" className="qads-link-button" onClick={() => setAboutOpen(false)}>
            Close
          </button>
        </div>
      )}

      <div className="qads-carousel">
        <div className="qads-track" ref={trackRef}>
          {campaign.products.map((product) => (
            <a
              key={product.id}
              className="qads-product"
              href={product.url}
              target="_blank"
              rel="sponsored noopener noreferrer"
              onClick={() => onProductClick?.(product, selection)}
            >
              <ProductImage title={product.title} imageUrl={product.imageUrl} />
              <span className="qads-product-body">
                <span className="qads-product-title">{product.title}</span>
                {product.price && <span className="qads-product-price">{product.price}</span>}
              </span>
            </a>
          ))}
        </div>
        {campaign.products.length > 2 && (
          <>
            <button type="button" className="qads-scroll qads-scroll--prev" aria-label="Previous products" onClick={() => scroll(-1)}>
              ‹
            </button>
            <button type="button" className="qads-scroll qads-scroll--next" aria-label="More products" onClick={() => scroll(1)}>
              ›
            </button>
          </>
        )}
      </div>
    </section>
  );
}

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

function DotsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.1A10.4 10.4 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3 3.7M6.6 6.6C3.9 8.4 2.5 12 2.5 12S6 19 12 19a9.6 9.6 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function AskIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 4v16h16" />
      <path d="M8 9h9M8 13h6M8 17h4" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 21V4h11l-1.5 4L16 12H5" />
    </svg>
  );
}
