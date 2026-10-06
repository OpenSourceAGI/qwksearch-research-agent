import { describe, expect, it } from 'vitest';
import {
  followUpQuestion,
  isEligible,
  keywordStrength,
  normalizeText,
  recordClick,
  runAuction,
  scoreCampaign,
  selectChatAds,
} from '../src/matching';
import { campaign } from './fixtures';

describe('normalizeText / keywordStrength', () => {
  it('ignores case and punctuation', () => {
    expect(normalizeText('Logo-Design?!')).toBe('logo design');
    expect(keywordStrength('logo design', 'Any good LOGO-DESIGN books?')).toBe(1);
  });

  it('matches plurals of a single-word keyword', () => {
    expect(keywordStrength('logo', 'how do I design logos')).toBe(1);
  });

  it('does not match a phrase inside another word', () => {
    expect(keywordStrength('art', 'start a company')).toBe(0);
  });

  it('gives partial credit only when most of a phrase is present', () => {
    expect(keywordStrength('branding books designers', 'books about branding')).toBeGreaterThan(0);
    expect(keywordStrength('branding books designers', 'books about cats')).toBe(0);
  });

  it('never matches on stopwords alone', () => {
    expect(keywordStrength('the best', 'what is the best phone')).toBe(1); // whole phrase
    expect(keywordStrength('best for', 'for what')).toBe(0);
  });
});

describe('scoreCampaign', () => {
  it('scores a query hit above an answer-only hit', () => {
    const q = scoreCampaign(campaign(), { query: 'logo design tips' });
    const a = scoreCampaign(campaign(), { query: 'tips', answer: 'start with logo design basics' });
    expect(q.relevance).toBeGreaterThan(a.relevance);
    expect(a.hits[0].source).toBe('answer');
  });

  it('is zeroed by a negative keyword', () => {
    expect(scoreCampaign(campaign(), { query: 'logo design free download' }).relevance).toBe(0);
  });

  it('stays within 0..1 when many keywords hit', () => {
    const { relevance } = scoreCampaign(campaign(), { query: 'logo design graphic design branding books' });
    expect(relevance).toBeLessThanOrEqual(1);
    expect(relevance).toBeGreaterThan(0.9);
  });
});

describe('isEligible', () => {
  it('skips paused, over-budget and misconfigured campaigns', () => {
    expect(isEligible(campaign({ active: false }), 'answer')).toBe(false);
    expect(isEligible(campaign({ spentTodayCents: 1000 }), 'answer')).toBe(false);
    expect(isEligible(campaign({ products: [] }), 'answer')).toBe(false);
    expect(isEligible(campaign({ followUp: undefined }), 'follow-up')).toBe(false);
    expect(isEligible(campaign({ placements: ['answer'] }), 'follow-up')).toBe(false);
    expect(isEligible(campaign(), 'answer')).toBe(true);
  });
});

describe('runAuction', () => {
  const rival = campaign({ id: 'school', advertiser: 'Brightline', keywords: ['logo design'], maxCpcCents: 100 });

  it('shows nothing for an unrelated question, whatever the bid', () => {
    expect(runAuction([campaign({ maxCpcCents: 10_000 })], { query: 'best hiking boots' }, { placement: 'answer' })).toEqual([]);
  });

  it('ranks by relevance × bid and charges the second price', () => {
    const [winner] = runAuction([campaign(), rival], { query: 'logo design' }, { placement: 'answer' });
    expect(winner.campaign.id).toBe('school');
    // The runner-up's adRank (1 × 40) divided by the winner's relevance (1), plus a cent.
    expect(winner.costPerClickCents).toBe(41);
  });

  it('charges a lone bidder the reserve price', () => {
    const [winner] = runAuction([campaign()], { query: 'logo design' }, { placement: 'answer' });
    expect(winner.costPerClickCents).toBe(5);
  });

  it('never charges above the max bid', () => {
    const [winner] = runAuction(
      [campaign({ maxCpcCents: 3 })],
      { query: 'logo design' },
      { placement: 'answer', reservePriceCents: 10 }
    );
    expect(winner.costPerClickCents).toBe(3);
  });
});

describe('selectChatAds', () => {
  it('does not give one advertiser both slots', () => {
    const other = campaign({ id: 'school', advertiser: 'Brightline', maxCpcCents: 20 });
    const slots = selectChatAds([campaign(), other], { query: 'logo design' });
    expect(slots.answer?.campaign.id).toBe('books');
    expect(slots.followUp?.campaign.id).toBe('school');
  });

  it('leaves the follow-up empty rather than repeat the answer ad', () => {
    const slots = selectChatAds([campaign()], { query: 'logo design' });
    expect(slots.answer).not.toBeNull();
    expect(slots.followUp).toBeNull();
  });
});

describe('helpers', () => {
  it('words the sponsored follow-up', () => {
    expect(followUpQuestion(' logo design books? ')).toBe('Learn more about logo design books');
  });

  it('charges clicks to the daily budget', () => {
    expect(recordClick(campaign({ spentTodayCents: 10 }), 7).spentTodayCents).toBe(17);
  });
});
