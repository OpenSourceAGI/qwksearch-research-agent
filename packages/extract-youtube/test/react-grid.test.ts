import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';

import {
  StackNav,
  VideoAvailabilityPanel,
  VideoCard,
  VideoEditDialog,
  VideoGrid,
  VideoLibraryAdmin,
  VideoList,
  formatCustomCell,
  formatCustomValue,
  formatViewCount,
  formatVideoDate,
  youtubePlayer,
} from '../src/react';
import { createLocalLibraryClient, createMemoryLibraryStore, type CustomFieldDef, type VideoItem } from '../src/library';

const FIELDS: CustomFieldDef[] = [
  { key: 'speaker', label: 'Speaker', type: 'text', showOnCard: true, showInList: true },
  { key: 'level', label: 'Level', type: 'select', options: ['Intro', 'Advanced'] },
];

const videos: VideoItem[] = [
  { videoId: 'aaaaaaaaaaa', title: 'First talk', channel: 'Chan A', publishedAt: '2024-03-01', viewCount: 12_345, stackKey: 'aaaaaaaaaaa', stackPosition: 0, custom: { speaker: 'Ada' } },
  { videoId: 'bbbbbbbbbbb', title: 'Q&A', channel: 'Chan A', publishedAt: '2024-03-02', viewCount: 99, stackKey: 'aaaaaaaaaaa', stackPosition: 1 },
  { videoId: 'ccccccccccc', title: 'Other', channel: 'Chan B', publishedAt: '2023-01-01', viewCount: 2_500_000, featured: true },
];

describe('format', () => {
  it('formats view counts compactly', () => {
    expect([0, 999, 1_000, 12_345, 2_500_000, 1_200_000_000].map(formatViewCount)).toEqual(['0', '999', '1K', '12.3K', '2.5M', '1.2B']);
  });

  it('formats custom values for badges and for labelled table cells', () => {
    const minutes: CustomFieldDef = { key: 'minutes', label: 'Length', type: 'number' };
    const captioned: CustomFieldDef = { key: 'captioned', label: 'Captioned', type: 'boolean' };
    expect(formatCustomValue(minutes, 1266)).toBe(`Length: ${(1266).toLocaleString()}`);
    expect(formatCustomCell(minutes, 1266)).toBe((1266).toLocaleString());
    expect(formatCustomValue(captioned, true)).toBe('Captioned');
    expect(formatCustomCell(captioned, true)).toBe('✓');
    expect(formatCustomCell(captioned, false)).toBe('');
    expect(formatCustomCell(FIELDS[0], 'Ada')).toBe('Ada');
    expect(formatCustomCell(FIELDS[0], undefined)).toBe('');
  });

  it('formats date-only strings without shifting the day', () => {
    expect(formatVideoDate('2024-03-01', true)).toMatch(/2024/);
    expect(formatVideoDate('not a date')).toBe('not a date');
    expect(formatVideoDate('')).toBe('');
  });
});

describe('server rendering', () => {
  afterEach(() => youtubePlayer.close());

  it('renders a grid with one stylesheet and stacks folded into one card', () => {
    const html = renderToString(h(VideoGrid, { videos, customFields: FIELDS, onToggleFavorite: () => undefined, favorites: ['ccccccccccc'] }));
    expect(html.match(/<style/g)).toHaveLength(1);
    expect(html.match(/<article/g)).toHaveLength(2);
    expect(html).toContain('1/2');
    expect(html).toContain('Ada');
    expect(html).toContain('Top pick');
    expect(html).toContain('aria-pressed="true"');
  });

  it('renders player state from the server snapshot, so hydration never mismatches', () => {
    // Playback is browser state: whatever the module store holds, the server
    // render must show the idle card the client's first render will show too.
    youtubePlayer.play({ videoId: 'ccccccccccc' });
    const html = renderToString(h(VideoCard, { video: videos[2] }));
    expect(html).toContain('class="eytg-card"');
    expect(html).toContain('Play Other');
  });

  it('renders an empty state', () => {
    expect(renderToString(h(VideoGrid, { videos: [], emptyState: 'Nothing yet' }))).toContain('Nothing yet');
  });

  it('renders a grouped list with level controls and custom columns', () => {
    const html = renderToString(h(VideoList, { videos, groupBy: ['year', 'channel'], customFields: FIELDS }));
    expect(html).toContain('L1');
    expect(html).toContain('L3');
    expect(html).toContain('Speaker');
    expect(html).toContain('2024');
    expect(html).toContain('Chan B');
  });

  it('opens a grouped list collapsed to a level', () => {
    const html = renderToString(h(VideoList, { videos, groupBy: ['year'], defaultCollapseDepth: 1 }));
    expect(html).not.toContain('First talk');
    expect(html).toContain('aria-expanded="false"');
  });

  it('renders the stack control only for real stacks', () => {
    expect(renderToString(h(StackNav, { index: 0, count: 1, onSelect: () => undefined }))).toBe('');
    expect(renderToString(h(StackNav, { index: 1, count: 3, label: 'Part 2', onSelect: () => undefined }))).toContain('2/3');
  });

  it('renders the admin screens against a local client', () => {
    const client = createLocalLibraryClient({ store: createMemoryLibraryStore(), customFields: FIELDS });
    expect(renderToString(h(VideoLibraryAdmin, { client, customFields: FIELDS }))).toContain('Add video');
    const dialog = renderToString(
      h(VideoEditDialog, { client, video: null, customFields: FIELDS, onClose: () => undefined, onSaved: () => undefined }),
    );
    expect(dialog).toContain('Custom fields');
    expect(dialog).toContain('Advanced');
    expect(renderToString(h(VideoAvailabilityPanel, { client }))).toContain('Unavailable on YouTube');
  });
});
