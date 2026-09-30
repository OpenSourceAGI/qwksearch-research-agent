import {
  applyLibraryQuery,
  assignVideoStacks,
  buildLibraryUpdate,
  buildNewLibraryVideo,
  buildVideoSlots,
  buildVideoStacks,
  buildVideoTree,
  classifyAvailability,
  coerceCustomValue,
  collectStackKeys,
  countVideoTreeLeaves,
  createLibraryVideo,
  createMemoryLibraryStore,
  deleteLibraryVideo,
  extractLinkedVideoIds,
  groupByChannel,
  groupByCustomField,
  groupByYear,
  groupKeysFromDepth,
  importLibraryVideos,
  normalizeLibraryVideo,
  parseLibraryQuery,
  libraryQueryToParams,
  recomputeStacks,
  resyncLibrary,
  autofillVideo,
  sortVideoTreeLeaves,
  updateLibraryVideo,
  videoTreeDepth,
  type CustomFieldDef,
  type LibraryVideo,
} from '../src/library';

const FIELDS: CustomFieldDef[] = [
  { key: 'speaker', label: 'Speaker', type: 'text', searchable: true, showOnCard: true },
  { key: 'level', label: 'Level', type: 'select', options: ['Intro', 'Advanced'] },
  { key: 'slides', label: 'Slides', type: 'url' },
  { key: 'minutes', label: 'Minutes', type: 'number' },
  { key: 'captioned', label: 'Captioned', type: 'boolean' },
];

const NOW = new Date('2026-01-02T03:04:05.000Z');

function video(id: string, overrides: Partial<LibraryVideo> = {}): LibraryVideo {
  return normalizeLibraryVideo({ videoId: id, title: `Video ${id}`, channel: 'Chan', ...overrides }, FIELDS, NOW);
}

const A = 'aaaaaaaaaaa';
const B = 'bbbbbbbbbbb';
const C = 'ccccccccccc';
const D = 'ddddddddddd';

describe('fields', () => {
  it('writes only the fields a patch carries and recomputes derived columns from the merged row', () => {
    const current = video(A, { title: 'Old title', description: 'about cats', publishedAt: '2020-01-01' });
    const update = buildLibraryUpdate(current, { title: 'New title' }, FIELDS, NOW);
    expect(update.title).toBe('New title');
    expect(update).not.toHaveProperty('description');
    expect(update.searchText).toContain('new title');
    expect(update.searchText).toContain('about cats');
    expect(update.publishedMs).toBeUndefined();
    expect(update.adminEdited).toBe(true);
    expect(update.updatedAt).toBe(NOW.toISOString());
  });

  it('keeps the stored title and date when a patch blanks them', () => {
    const current = video(A, { publishedAt: '2020-01-01' });
    const update = buildLibraryUpdate(current, { title: '  ', publishedAt: '' }, FIELDS, NOW);
    expect(update).not.toHaveProperty('title');
    expect(update).not.toHaveProperty('publishedAt');
  });

  it('recomputes publishedMs when the date changes', () => {
    const update = buildLibraryUpdate(video(A), { publishedAt: '2024-05-01' }, FIELDS, NOW);
    expect(update.publishedMs).toBe(Date.parse('2024-05-01'));
  });

  it('coerces custom fields by type and drops undeclared keys', () => {
    const update = buildLibraryUpdate(
      video(A),
      { custom: { speaker: ' Ada ', level: 'Expert', slides: 'javascript:alert(1)', minutes: '42', captioned: 'true', rogue: 'x' } },
      FIELDS,
      NOW,
    );
    expect(update.custom).toEqual({ speaker: 'Ada', level: null, slides: null, minutes: 42, captioned: true });
    expect(update.searchText).toContain('ada');
  });

  it('merges custom values instead of replacing the object', () => {
    const current = video(A, { custom: { speaker: 'Ada', minutes: 10 } });
    const update = buildLibraryUpdate(current, { custom: { minutes: 12 } }, FIELDS, NOW);
    expect(update.custom).toEqual({ speaker: 'Ada', minutes: 12 });
  });

  it('keeps only http(s) URLs', () => {
    expect(coerceCustomValue(FIELDS[2], 'https://x.test/a')).toBe('https://x.test/a');
    expect(coerceCustomValue(FIELDS[2], 'ftp://x')).toBeNull();
  });

  it('normalises tags from a comma string, de-duplicated case-insensitively', () => {
    const update = buildLibraryUpdate(video(A), { tags: 'Rust, rust , WASM,,' }, FIELDS, NOW);
    expect(update.tags).toEqual(['Rust', 'WASM']);
  });

  it('refuses a new video without a title', () => {
    expect(buildNewLibraryVideo(A, { channel: 'x' }, FIELDS, NOW)).toBeNull();
    const created = buildNewLibraryVideo(A, { title: 'T', publishedAt: '2021-02-03' }, FIELDS, NOW);
    expect(created?.publishedMs).toBe(Date.parse('2021-02-03'));
    expect(created?.adminEdited).toBe(true);
  });
});

describe('query', () => {
  const rows = [
    video(A, { title: 'Alpha', publishedAt: '2022-01-01', viewCount: 5, category: 'Talks' }),
    video(B, { title: 'Bravo', publishedAt: '2024-01-01', viewCount: 50, featured: true }),
    video(C, { title: 'Charlie', publishedAt: '', viewCount: 500, hidden: true }),
    video(D, { title: 'Delta', publishedAt: '2023-01-01', viewCount: 50, availability: 'removed' }),
  ];

  it('sorts newest first by default with undated rows last', () => {
    const page = applyLibraryQuery(rows, { includeHidden: true });
    expect(page.videos.map((row) => row.title)).toEqual(['Bravo', 'Delta', 'Alpha', 'Charlie']);
  });

  it('keeps undated rows last in ascending order too', () => {
    const page = applyLibraryQuery(rows, { includeHidden: true, dir: 'asc' });
    expect(page.videos.map((row) => row.title)).toEqual(['Alpha', 'Delta', 'Bravo', 'Charlie']);
  });

  it('breaks ties by id so pages are stable', () => {
    const page = applyLibraryQuery(rows, { sort: 'views', dir: 'desc' });
    expect(page.videos.map((row) => row.videoId)).toEqual([D, B, A]);
  });

  it('excludes hidden rows unless asked', () => {
    expect(applyLibraryQuery(rows, {}).total).toBe(3);
    expect(applyLibraryQuery(rows, { includeHidden: true }).total).toBe(4);
  });

  it('treats an empty id allow-list as matching nothing', () => {
    expect(applyLibraryQuery(rows, { ids: [] }).total).toBe(0);
    expect(applyLibraryQuery(rows, { ids: [A] }).videos.map((row) => row.videoId)).toEqual([A]);
  });

  it('filters by text, category, availability and featured', () => {
    expect(applyLibraryQuery(rows, { q: 'brav' }).total).toBe(1);
    expect(applyLibraryQuery(rows, { q: A.slice(0, 4) }).total).toBe(1);
    expect(applyLibraryQuery(rows, { category: 'Talks' }).total).toBe(1);
    expect(applyLibraryQuery(rows, { availability: 'removed' }).total).toBe(1);
    expect(applyLibraryQuery(rows, { featured: true }).total).toBe(1);
  });

  it('clamps page and limit', () => {
    const page = applyLibraryQuery(rows, { limit: 2, page: 99 });
    expect(page).toMatchObject({ page: 2, pageCount: 2, limit: 2, total: 3 });
    expect(applyLibraryQuery(rows, { limit: 10_000 }).limit).toBe(100);
  });

  it('round-trips through URL params, keeping an empty ids list', () => {
    const params = libraryQueryToParams({ q: 'x', ids: [], sort: 'views', dir: 'asc', page: 2, limit: 10 });
    const parsed = parseLibraryQuery(params);
    expect(parsed).toMatchObject({ q: 'x', ids: [], sort: 'views', dir: 'asc', page: 2, limit: 10 });
    expect(parseLibraryQuery(new URLSearchParams('sort=bogus')).sort).toBeNull();
  });
});

describe('stacks', () => {
  it('extracts linked ids from every URL shape, de-duplicated', () => {
    const text = `Part 1 https://youtu.be/${A} and https://www.youtube.com/watch?feature=x&v=${B} again youtu.be/${A}
      shorts https://youtube.com/shorts/${C} not-an-id https://youtu.be/${D}X`;
    expect(extractLinkedVideoIds(text)).toEqual([A, B, C]);
  });

  it('stacks videos linked in either direction, oldest first', () => {
    const rows = [
      { videoId: B, description: `Full talk: https://youtu.be/${A}`, publishedAt: '2024-02-01' },
      { videoId: A, description: 'the talk', publishedAt: '2024-01-01' },
      { videoId: C, description: `unrelated https://youtu.be/zzzzzzzzzzz`, publishedAt: '2024-01-01' },
    ];
    expect(buildVideoStacks(rows)).toEqual([{ key: A, memberIds: [A, B] }]);
    const placement = assignVideoStacks(rows);
    expect(placement.get(B)).toEqual({ stackKey: A, stackPosition: 1 });
    expect(placement.get(C)).toEqual({ stackKey: null, stackPosition: 0 });
  });

  it('ignores playlist-dump descriptions', () => {
    const ids = Array.from({ length: 9 }, (_, i) => `v${String(i).padStart(10, '0')}`);
    const rows = [
      { videoId: A, description: ids.map((id) => `https://youtu.be/${id}`).join(' ') },
      ...ids.map((id) => ({ videoId: id, description: '' })),
    ];
    expect(buildVideoStacks(rows)).toEqual([]);
  });

  it('folds a stack into the slot of its first member in the feed', () => {
    const feed = [
      { videoId: C },
      { videoId: B, stackKey: A, stackPosition: 1 },
      { videoId: D },
      { videoId: A, stackKey: A, stackPosition: 0 },
    ];
    const slots = buildVideoSlots(feed);
    expect(slots.map((slot) => slot.videos.map((v) => v.videoId))).toEqual([[C], [A, B], [D]]);
    expect(slots[1].initialIndex).toBe(1);
    expect(buildVideoSlots(feed, null, false)).toHaveLength(4);
    expect(collectStackKeys(feed)).toEqual([A]);
  });
});

describe('tree', () => {
  const items = [
    { videoId: A, channel: 'Zed', publishedAt: '2023-05-01', viewCount: 10 },
    { videoId: B, channel: 'Amy', publishedAt: '2024-05-01', viewCount: 20 },
    { videoId: C, channel: '', publishedAt: '2024-06-01', viewCount: 5 },
    { videoId: D, channel: 'Amy', publishedAt: '', viewCount: 1, custom: { speaker: 'Ada' } },
  ];
  const slots = buildVideoSlots(items);

  it('groups year → channel, newest year first, placeholders last', () => {
    const tree = buildVideoTree(slots, [groupByYear, groupByChannel]);
    expect(tree.map((node) => (node.type === 'group' ? node.label : node.key))).toEqual(['2024', '2023', 'Undated']);
    const y2024 = tree[0];
    expect(y2024.type === 'group' && y2024.children.map((node) => node.type === 'group' && node.label)).toEqual(['Amy', 'Unsorted']);
    expect(y2024.type === 'group' && y2024.videoCount).toBe(2);
    expect(y2024.type === 'group' && y2024.viewCount).toBe(25);
    expect(videoTreeDepth(tree)).toBe(3);
    expect(countVideoTreeLeaves(tree)).toBe(4);
  });

  it('stops a path at the level above when a grouper returns null', () => {
    const tree = buildVideoTree(slots, [groupByCustomField('speaker', { skipEmpty: true })]);
    expect(tree.filter((node) => node.type === 'video')).toHaveLength(3);
    expect(tree[0]).toMatchObject({ type: 'group', label: 'Ada' });
  });

  it('sorts leaves within groups without moving groups', () => {
    const tree = buildVideoTree(slots, [groupByYear]);
    const sorted = sortVideoTreeLeaves(tree, (a, b) => (b.videos[0].viewCount ?? 0) - (a.videos[0].viewCount ?? 0));
    const y2024 = sorted[0];
    expect(y2024.type === 'group' && y2024.children.map((node) => node.type === 'video' && node.slot.videos[0].videoId)).toEqual([B, C]);
    expect(groupKeysFromDepth(tree, 0)).toHaveLength(3);
    expect(groupKeysFromDepth(tree, 1)).toHaveLength(0);
  });
});

describe('library operations (memory store)', () => {
  it('creates, refuses duplicates and clears a prior exclusion', async () => {
    const store = createMemoryLibraryStore({ customFields: FIELDS });
    await store.addExclusion({ videoId: A, deletedBy: 'x', deletedAt: NOW.toISOString() });
    const created = await createLibraryVideo(store, A, { title: 'Hello' }, { customFields: FIELDS });
    expect(created.ok).toBe(true);
    expect((await store.excludedIds([A])).size).toBe(0);
    expect(await createLibraryVideo(store, A, { title: 'Again' })).toEqual({ ok: false, reason: 'exists' });
    expect(await createLibraryVideo(store, 'nope', { title: 'x' })).toEqual({ ok: false, reason: 'invalid-id' });
    expect(await createLibraryVideo(store, B, {})).toEqual({ ok: false, reason: 'missing-title' });
  });

  it('restacks when a description link is added by an edit', async () => {
    const store = createMemoryLibraryStore({ seed: [video(A, { publishedAt: '2020-01-01' }), video(B, { publishedAt: '2021-01-01' })] });
    await updateLibraryVideo(store, B, { description: `follow-up to https://youtu.be/${A}` });
    expect((await store.get(B))?.stackKey).toBe(A);
    expect((await store.get(B))?.stackPosition).toBe(1);
    expect(await updateLibraryVideo(store, C, { title: 'x' })).toBeNull();
  });

  it('deletes with an exclusion, and imports skip excluded and admin-edited rows', async () => {
    const store = createMemoryLibraryStore({ seed: [video(A), video(B, { adminEdited: true, title: 'Edited' })] });
    expect(await deleteLibraryVideo(store, A, 'admin@x')).toBe(true);
    expect(await deleteLibraryVideo(store, A, 'admin@x')).toBe(false);
    const result = await importLibraryVideos(store, [
      { videoId: A, title: 'Back again' },
      { videoId: B, title: 'Import title' },
      { videoId: C, title: 'New' },
      { videoId: 'bad', title: 'Bad' },
    ]);
    expect(result).toEqual({ inserted: 1, updated: 0, skippedEdited: 1, skippedExcluded: 1, invalid: 1 });
    expect((await store.get(B))?.title).toBe('Edited');
    expect(await store.get(A)).toBeNull();
    const exclusions = await store.listExclusions();
    expect(exclusions[0]).toMatchObject({ videoId: A, deletedBy: 'admin@x' });
  });

  it('recomputeStacks writes only rows whose placement changed', async () => {
    const store = createMemoryLibraryStore({
      seed: [video(A), video(B, { description: `https://youtu.be/${A}` }), video(C)],
    });
    expect(await recomputeStacks(store)).toBe(2);
    expect(await recomputeStacks(store)).toBe(0);
  });
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

describe('YouTube data', () => {
  it('classifies availability', () => {
    expect(classifyAvailability(undefined)).toBe('removed');
    expect(classifyAvailability({ privacyStatus: 'private', uploadStatus: 'processed', embeddable: true })).toBe('private');
    expect(classifyAvailability({ privacyStatus: 'public', uploadStatus: 'rejected', embeddable: true })).toBe('removed');
    expect(classifyAvailability({ privacyStatus: 'public', uploadStatus: 'processed', embeddable: false })).toBe('not_embeddable');
    expect(classifyAvailability({ privacyStatus: 'public', uploadStatus: 'processed', embeddable: true })).toBe('available');
  });

  it('resyncs view counts and availability, writing only changes', async () => {
    const store = createMemoryLibraryStore({ seed: [video(A, { viewCount: 1 }), video(B, { viewCount: 7 }), video(C)] });
    const calls: string[] = [];
    const fetchMock = (async (url: string) => {
      calls.push(url);
      return jsonResponse({
        items: [
          { id: A, statistics: { viewCount: '100' }, status: { privacyStatus: 'public', uploadStatus: 'processed', embeddable: true } },
          { id: B, statistics: { viewCount: '7' }, status: { privacyStatus: 'private', uploadStatus: 'processed', embeddable: true } },
        ],
      });
    }) as unknown as typeof fetch;
    const result = await resyncLibrary(store, { apiKey: 'k', fetch: fetchMock });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toContain('part=snippet%2Cstatistics%2Cstatus');
    expect(result).toMatchObject({ videosChecked: 3, viewCountsUpdated: 1, availabilityChanged: 2 });
    expect(result.availability).toEqual({ available: 1, private: 1, not_embeddable: 0, removed: 1 });
    expect((await store.get(A))?.viewCount).toBe(100);
    expect((await store.get(C))?.availability).toBe('removed');
  });

  it('surfaces a Data API error instead of writing a partial resync', async () => {
    const store = createMemoryLibraryStore({ seed: [video(A)] });
    const fetchMock = (async () =>
      jsonResponse({ error: { errors: [{ reason: 'quotaExceeded' }] } }, 403)) as unknown as typeof fetch;
    await expect(resyncLibrary(store, { apiKey: 'k', fetch: fetchMock })).rejects.toThrow('quotaExceeded');
  });

  it('autofills from oEmbed without a key, keeps typed text, and merges a suggest hook', async () => {
    const fetchMock = (async (url: string) => {
      expect(url).toContain('oembed');
      return jsonResponse({ title: 'From YouTube', author_name: 'Channel X' });
    }) as unknown as typeof fetch;
    const result = await autofillVideo(
      { videoId: A, title: 'Typed title' },
      { fetch: fetchMock, suggest: async (context) => ({ custom: { speaker: `${context.channel} host` } }) },
    );
    expect(result.fields.title).toBe('Typed title');
    expect(result.fields.channel).toBe('Channel X');
    expect(result.fields.custom).toEqual({ speaker: 'Channel X host' });
    expect(result.sources).toEqual(['oembed', 'suggest']);
    expect(result.warnings[0]).toMatch(/No YouTube API key/);
  });
});
