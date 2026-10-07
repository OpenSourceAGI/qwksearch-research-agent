import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AdvertiserPanel, validateCampaign, emptyCampaign } from '../src/components/AdvertiserPanel';
import { ChatAnswerAd } from '../src/components/ChatAnswerAd';
import { SponsoredFollowUps } from '../src/components/SponsoredFollowUps';
import { runAuction } from '../src/matching';
import { campaign } from './fixtures';

const selection = (placement: 'answer' | 'follow-up' = 'answer') =>
  runAuction([campaign()], { query: 'logo design' }, { placement })[0];

describe('ChatAnswerAd', () => {
  it('labels the ad and links products as sponsored', () => {
    const onImpression = vi.fn();
    render(<ChatAnswerAd selection={selection()} onImpression={onImpression} />);
    expect(screen.getByText('Ad')).toBeTruthy();
    expect(screen.getByLabelText('Sponsored by PageTurner Books')).toBeTruthy();
    const link = screen.getByRole('link');
    expect(link.getAttribute('rel')).toContain('sponsored');
    expect(onImpression).toHaveBeenCalledOnce();
  });

  it('explains why the ad matched and can be hidden', () => {
    const onHide = vi.fn();
    render(<ChatAnswerAd selection={selection()} onHide={onHide} />);
    fireEvent.click(screen.getByLabelText('Ad options'));
    fireEvent.click(screen.getByRole('menuitem', { name: /About this ad/ }));
    expect(screen.getByRole('note').textContent).toContain('“logo design”');

    fireEvent.click(screen.getByLabelText('Ad options'));
    fireEvent.click(screen.getByRole('menuitem', { name: /Hide this ad/ }));
    expect(onHide).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toBe('Ad hidden.');
  });
});

describe('SponsoredFollowUps', () => {
  it('inserts the sponsored question second, labelled', () => {
    const onSelect = vi.fn();
    render(
      <SponsoredFollowUps questions={['What makes a logo memorable?', 'Who designed the Nike swoosh?']} sponsored={selection('follow-up')} onSelect={onSelect} />
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons[1].textContent).toContain('Learn more about logo design books');
    expect(buttons[1].textContent).toContain('Sponsored · PageTurner Books');
    fireEvent.click(buttons[1]);
    expect(onSelect.mock.calls[0][1].campaign.id).toBe('books');
  });
});

describe('AdvertiserPanel', () => {
  it('validates a draft', () => {
    expect(validateCampaign(emptyCampaign())).toMatch(/advertiser name/);
    expect(validateCampaign(campaign())).toBeNull();
  });

  it('generates keyword suggestions and adds them', async () => {
    const generateKeywords = vi.fn(async () => ({
      keywords: [{ keyword: 'trail shoes', reason: 'core' }],
      negativeKeywords: [],
      followUpTopic: 'trail running',
      source: 'llm' as const,
    }));
    render(<AdvertiserPanel campaigns={[]} onSave={vi.fn()} generateKeywords={generateKeywords} />);
    fireEvent.change(screen.getByPlaceholderText('PageTurner Books'), { target: { value: 'Trailhead' } });
    fireEvent.change(screen.getByPlaceholderText(/Used and new books/), { target: { value: 'Trail running shoes for beginners' } });
    fireEvent.click(screen.getByText(/Generate keywords with AI/));
    await waitFor(() => expect(screen.getByText('+ trail shoes')).toBeTruthy());
    fireEvent.click(screen.getByText('+ trail shoes'));
    expect(screen.getByLabelText('Remove trail shoes')).toBeTruthy();
    expect((screen.getByLabelText('Follow-up topic') as HTMLInputElement).value).toBe('trail running');
  });
});
