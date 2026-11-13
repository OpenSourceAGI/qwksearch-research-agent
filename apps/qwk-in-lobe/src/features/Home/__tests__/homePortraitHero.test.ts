import { DEFAULT_INBOX_AVATAR } from '@lobechat/const';
import { describe, expect, it } from 'vitest';

import { CHIEF_AGENT_ARTWORKS, DEFAULT_CHIEF_AGENT_ARTWORK } from '@/features/ChiefAgent/artwork';

import { resolveHomePortraitHero } from '../useHomePortraitHero';

const otherCharacter = CHIEF_AGENT_ARTWORKS.find(
  (item) => item.id !== DEFAULT_CHIEF_AGENT_ARTWORK.id,
)!;

describe('resolveHomePortraitHero', () => {
  it('never draws the default character on Home', () => {
    expect(resolveHomePortraitHero({ avatar: DEFAULT_CHIEF_AGENT_ARTWORK.avatar })).toBeUndefined();
    expect(resolveHomePortraitHero({ avatar: DEFAULT_INBOX_AVATAR })).toBeUndefined();
    expect(resolveHomePortraitHero({})).toBeUndefined();
  });

  it('does not fall back to the default character for an avatar outside the catalog', () => {
    expect(resolveHomePortraitHero({ avatar: '🦊' })).toBeUndefined();
  });

  it('carries no full-body artwork for the default character', () => {
    expect(DEFAULT_CHIEF_AGENT_ARTWORK.hero).toBeUndefined();
  });

  it('still draws the other catalog characters', () => {
    expect(resolveHomePortraitHero({ avatar: otherCharacter.avatar })).toBe(otherCharacter.hero);
  });

  it("prefers the agent's own studio artwork over anything in the catalog", () => {
    expect(
      resolveHomePortraitHero({
        avatar: DEFAULT_CHIEF_AGENT_ARTWORK.avatar,
        fullBodyArtwork: 'https://example.com/own.webp',
      }),
    ).toBe('https://example.com/own.webp');
  });
});
