/**
 * The demo library: what the Worker seeds its store with, and what the
 * Storybook stories render. One file, so the live demo and the stories always
 * show the same videos.
 *
 * `DEMO_FIELDS` shows the "custom admin" side of `extract-youtube/library`:
 * fields this app declares for itself (a speaker, a difficulty level, a slides
 * link) that the package stores, searches, renders in the admin form and
 * shows as badges — without knowing what any of them mean.
 */

import type { CustomFieldDef, LibraryVideo } from 'extract-youtube/library';

export const DEMO_FIELDS: CustomFieldDef[] = [
  { key: 'speaker', label: 'Speaker', type: 'text', searchable: true, showOnCard: true, showInList: true },
  {
    key: 'level',
    label: 'Level',
    type: 'select',
    options: ['Beginner', 'Intermediate', 'Advanced'],
    showOnCard: true,
    help: 'How much background the video assumes.',
  },
  { key: 'slides', label: 'Slides', type: 'url', help: 'Link to the talk’s slides, if any.' },
  { key: 'minutes', label: 'Length (min)', type: 'number', showInList: true },
  { key: 'captioned', label: 'Human captions', type: 'boolean', help: 'Captions written by a person, not auto-generated.' },
];

type Seed = Partial<LibraryVideo> & { videoId: string };

/**
 * Real, public videos. The two 3Blue1Brown chapters link to each other in
 * their descriptions, so the library stacks them into one card with `<` / `>`
 * arrows — the stacked-playlist feature, working off nothing but YouTube's own
 * description links.
 */
export const DEMO_VIDEOS: Seed[] = [
  {
    videoId: 'aircAruvnKk',
    title: 'But what is a neural network?',
    channel: '3Blue1Brown',
    publishedAt: '2017-10-05',
    viewCount: 21_000_000,
    category: 'Machine learning',
    tags: ['neural networks', 'deep learning'],
    featured: true,
    description: 'Chapter 1 of the deep learning series. Next chapter: https://youtu.be/IHZwWFHWa-w',
    custom: { speaker: 'Grant Sanderson', level: 'Beginner', minutes: 19, captioned: true },
  },
  {
    videoId: 'IHZwWFHWa-w',
    title: 'Gradient descent, how neural networks learn',
    channel: '3Blue1Brown',
    publishedAt: '2017-10-16',
    viewCount: 8_600_000,
    category: 'Machine learning',
    tags: ['gradient descent'],
    description: 'Chapter 2. Start with chapter 1: https://www.youtube.com/watch?v=aircAruvnKk',
    custom: { speaker: 'Grant Sanderson', level: 'Intermediate', minutes: 21, captioned: true },
  },
  {
    videoId: 'UF8uR6Z6KLc',
    title: "Steve Jobs' 2005 Stanford Commencement Address",
    channel: 'Stanford',
    publishedAt: '2008-03-07',
    viewCount: 44_000_000,
    category: 'Talks',
    tags: ['commencement'],
    featured: true,
    custom: { speaker: 'Steve Jobs', level: 'Beginner', minutes: 15 },
  },
  {
    videoId: 'Ks-_Mh1QhMc',
    title: 'Your body language may shape who you are',
    channel: 'TED',
    publishedAt: '2012-10-01',
    viewCount: 70_000_000,
    category: 'Talks',
    tags: ['psychology'],
    custom: { speaker: 'Amy Cuddy', level: 'Beginner', minutes: 21, captioned: true },
  },
  {
    videoId: 'rfscVS0vtbw',
    title: 'Learn Python - Full Course for Beginners',
    channel: 'freeCodeCamp.org',
    publishedAt: '2018-07-11',
    viewCount: 47_000_000,
    category: 'Programming',
    tags: ['python', 'course'],
    custom: { speaker: 'Mike Dane', level: 'Beginner', minutes: 266 },
  },
  {
    videoId: 'M7lc1UVf-VE',
    title: 'YouTube Developers Live: Embedded Web Player Customization',
    channel: 'Google for Developers',
    publishedAt: '2013-04-02',
    viewCount: 2_400_000,
    category: 'Programming',
    tags: ['youtube api'],
    custom: { level: 'Intermediate', minutes: 33 },
  },
  {
    videoId: 'jNQXAC9IVRw',
    title: 'Me at the zoo',
    channel: 'jawed',
    publishedAt: '2005-04-24',
    viewCount: 350_000_000,
    category: 'History',
    tags: ['first youtube video'],
    featured: true,
    custom: { speaker: 'Jawed Karim', minutes: 1 },
  },
  {
    videoId: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Official Video)',
    channel: 'Rick Astley',
    publishedAt: '2009-10-25',
    viewCount: 1_700_000_000,
    category: 'Music',
    custom: { minutes: 4 },
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    title: 'Queen – Bohemian Rhapsody (Official Video Remastered)',
    channel: 'Queen Official',
    publishedAt: '2008-08-01',
    viewCount: 2_000_000_000,
    category: 'Music',
    custom: { minutes: 6 },
  },
  {
    videoId: 'kJQP7kiw5Fk',
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    channel: 'Luis Fonsi',
    publishedAt: '2017-01-12',
    viewCount: 8_700_000_000,
    category: 'Music',
    custom: { minutes: 5 },
  },
  {
    videoId: 'zzzzzzzzzz0',
    title: 'A video that was taken down',
    channel: 'Example channel',
    publishedAt: '2019-05-05',
    viewCount: 1234,
    category: 'Talks',
    availability: 'removed',
    description: 'Seeded as removed so the availability panel has something to show.',
  },
];

/** A few caption lines for stories that open a transcript without a backend. */
export const SAMPLE_SNIPPETS = [
  { text: 'This is a three.', start: 4.2, duration: 2.1 },
  { text: "It's sloppily written and rendered at an extremely low resolution of 28 by 28 pixels,", start: 6.3, duration: 4.9 },
  { text: 'but your brain has no trouble recognizing it as a three.', start: 11.2, duration: 3.2 },
  { text: 'And I want you to take a moment to appreciate how crazy it is that brains can do this so effortlessly.', start: 14.4, duration: 5.6 },
  { text: 'I mean, this, this and this are also recognizable as threes,', start: 20.0, duration: 3.4 },
  { text: 'even though the specific values of each pixel is very different from one image to the next.', start: 23.4, duration: 4.8 },
];
