/**
 * @fileoverview The mascot artwork on the homepage: a greeting card at the
 * top of the widgets and a figure in the background. Both follow the mascot
 * URL in the config (empty hides them), the card has its own switch and ✕,
 * and the figure goes away with the "Background Art" switch.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { HOMEPAGE_MASCOT_URL, researchAgentUIConfig } from '../src/config';

vi.mock('../src/hooks/useChat', () => ({ useChat: () => ({ sendMessage: vi.fn() }) }));
vi.mock('../src/components/MessageComposer/ChatInputBox', () => ({ default: () => null }));
vi.mock('../src/components/ChatConversation/RecentHistoryChips', () => ({ default: () => null }));
vi.mock('../src/components/Footer', () => ({ default: () => null }));
vi.mock('../src/ui/gradient-blur', () => ({ GradientBlur: () => null }));
vi.mock('quantum-sphere-loading-icon/react', () => ({ default: () => null }));
vi.mock('education-playlists', () => ({ EducationPlaylists: () => null }));
vi.mock('trending-news-api', () => ({ TrendingNews: () => null }));
vi.mock('use-weather-forecast', () => ({ WeatherForecast: () => null }));

const { default: ChatHomepage } = await import(
  '../src/components/ChatConversation/ChatHomepage'
);

const original = researchAgentUIConfig.homepageMascotUrl;

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn(async () => new Response('null')));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  researchAgentUIConfig.homepageMascotUrl = original;
});

describe('homepage mascot', () => {
  it('defaults to the mascot artwork', () => {
    expect(researchAgentUIConfig.homepageMascotUrl).toBe(HOMEPAGE_MASCOT_URL);
    expect(HOMEPAGE_MASCOT_URL).toMatch(/aecf77a7df115e25f612dcdbfa250a87f1aaff4604c4cab932bcacd0aa04da2b\.webp$/);
  });

  it('shows the greeting widget and the background figure once the page is idle', async () => {
    render(<ChatHomepage />);

    const widget = await screen.findByTestId('mascot-widget', {}, { timeout: 4000 });
    expect(widget.querySelector('img')?.getAttribute('src')).toBe(HOMEPAGE_MASCOT_URL);
    expect(screen.getByTestId('background-mascot').getAttribute('src')).toBe(HOMEPAGE_MASCOT_URL);
  });

  it('closes the widget from its ✕ and remembers it', async () => {
    render(<ChatHomepage />);

    fireEvent.click(await screen.findByLabelText('Hide mascot widget', {}, { timeout: 4000 }));

    expect(screen.queryByTestId('mascot-widget')).toBeNull();
    expect(localStorage.getItem('showMascotWidget')).toBe('false');
  });

  it('takes the background figure down with the Background Art switch', async () => {
    localStorage.setItem('showBackgroundArt', 'false');
    render(<ChatHomepage />);

    await screen.findByTestId('mascot-widget', {}, { timeout: 4000 });
    expect(screen.queryByTestId('background-mascot')).toBeNull();
  });

  it('hides both when the host blanks the mascot URL', async () => {
    researchAgentUIConfig.homepageMascotUrl = '';
    localStorage.setItem('showWeatherWidget', 'false');
    localStorage.setItem('showTrendingNewsWidget', 'false');
    render(<ChatHomepage />);

    // Give the idle callback its chance to run before asserting absence.
    await waitFor(() => new Promise((resolve) => setTimeout(resolve, 1200)), { timeout: 3000 });
    expect(screen.queryByTestId('mascot-widget')).toBeNull();
    expect(screen.queryByTestId('background-mascot')).toBeNull();
  });
});
