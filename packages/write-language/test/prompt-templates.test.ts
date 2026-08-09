import { describe, expect, it } from 'vitest';
import { AGENT_PROMPTS, extractJSONFromLanguageReply } from '../src/prompt-templates';

describe('AGENT_PROMPTS', () => {
  it('defines at least one agent', () => {
    expect(AGENT_PROMPTS.length).toBeGreaterThan(0);
  });

  it('gives every agent a unique name', () => {
    const names = AGENT_PROMPTS.map((a: { name: string }) => a.name);

    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every agent a non-empty name', () => {
    for (const agent of AGENT_PROMPTS as { name: string }[]) {
      expect(agent.name).toBeTruthy();
    }
  });
});

describe('extractJSONFromLanguageReply', () => {
  it('returns an empty string for unusable input', () => {
    expect(extractJSONFromLanguageReply('')).toBe('');
    expect(extractJSONFromLanguageReply(null)).toBe('');
    expect(extractJSONFromLanguageReply(undefined)).toBe('');
    expect(extractJSONFromLanguageReply(42)).toBe('');
  });

  describe('without a key', () => {
    it('collects numbered list items', () => {
      const text = 'Intro line\n1. First item\n2. Second item';

      expect(extractJSONFromLanguageReply(text)).toEqual(['First item', 'Second item']);
    });

    it('collects bulleted list items', () => {
      const text = 'Intro\n- First\n* Second\n• Third';

      // The keyless path strips the bullet marker but does not trim, unlike
      // the numbered form whose pattern also consumes the trailing space.
      expect(extractJSONFromLanguageReply(text)).toEqual([' First', ' Second', ' Third']);
    });

    it('accepts both "1." and "1)" numbering', () => {
      expect(extractJSONFromLanguageReply('1) One\n2. Two')).toEqual(['One', 'Two']);
    });

    it('ignores prose that is not a list item', () => {
      expect(extractJSONFromLanguageReply('Just a paragraph with no list.')).toEqual([]);
    });
  });

  describe('with a key', () => {
    it('extracts the lines inside the named tag', () => {
      const text = '<questions>\n- What is it?\n- Why does it matter?\n</questions>';

      expect(extractJSONFromLanguageReply(text, 'questions')).toEqual([
        'What is it?',
        'Why does it matter?',
      ]);
    });

    it('concatenates several occurrences of the tag', () => {
      const text = '<q>\nOne\n</q>\nfiller\n<q>\nTwo\n</q>';

      expect(extractJSONFromLanguageReply(text, 'q')).toEqual(['One', 'Two']);
    });

    it('ignores text outside the tags', () => {
      const text = 'Preamble\n<q>\nInside\n</q>\nEpilogue';

      expect(extractJSONFromLanguageReply(text, 'q')).toEqual(['Inside']);
    });

    it('strips list markers and blank lines from the extracted content', () => {
      const text = '<q>\n1. First\n\n- Second\n</q>';

      expect(extractJSONFromLanguageReply(text, 'q')).toEqual(['First', 'Second']);
    });

    it('unescapes &lt; and &gt; before matching tags', () => {
      const text = '&lt;q&gt;\n- Escaped item\n&lt;/q&gt;';

      expect(extractJSONFromLanguageReply(text, 'q')).toEqual(['Escaped item']);
    });

    it('returns an empty array when the tag is absent', () => {
      expect(extractJSONFromLanguageReply('No tags here', 'q')).toEqual([]);
    });

    it('returns an empty array when the closing tag is missing', () => {
      expect(extractJSONFromLanguageReply('<q>\nUnclosed', 'q')).toEqual([]);
    });

    it('returns an empty array for an empty tag body', () => {
      expect(extractJSONFromLanguageReply('<q></q>', 'q')).toEqual([]);
    });
  });
});
