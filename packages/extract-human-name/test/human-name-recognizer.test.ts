import { afterEach, describe, expect, it } from 'vitest';
import { extractHumanName } from '../human-name-recognizer';
import { setHumanNamesDB } from '../human-names-db';

afterEach(() => setHumanNamesDB(null));

describe('extractHumanName', () => {
  it('formats a single person as "Last, First"', () => {
    expect(extractHumanName('John Doe')).toEqual({
      author_cite: 'Doe, John',
      author_short: 'Doe',
      author_type: 1,
    });
  });

  it('strips a "by:" prefix and honorifics', () => {
    expect(extractHumanName('by: Dr. John Smith')).toEqual({
      author_cite: 'Smith, John',
      author_short: 'Smith',
      author_type: 1,
    });
  });

  it('keeps titles, middle initials and honorifics', () => {
    expect(extractHumanName('Dr. John Q. Public Jr.')).toEqual({
      author_cite: 'Public, John Q., Jr.',
      author_short: 'Public',
      author_type: 1,
    });
  });

  it('joins two authors with an ampersand', () => {
    expect(extractHumanName('John Doe and Jane Smith')).toEqual({
      author_cite: 'Doe, John & Smith, Jane',
      author_short: 'Doe & Smith',
      author_type: 2,
    });
  });

  it('collapses three authors to et al. by default', () => {
    expect(extractHumanName('John Doe, Jane Smith, and Alex Jones')).toEqual({
      author_cite: 'Doe, John et al.',
      author_short: 'Doe et al.',
      author_type: 3,
    });
  });

  it('lists three authors in full when maxAuthorsBeforeEtAl allows', () => {
    expect(
      extractHumanName('John Doe, Jane Smith, and Alex Jones', {
        maxAuthorsBeforeEtAl: 3,
      }),
    ).toEqual({
      author_cite: 'Doe, John, Smith, Jane & Jones, Alex',
      author_short: 'Doe et al.',
      author_type: 3,
    });
  });

  it('abbreviates given names when asked', () => {
    expect(
      extractHumanName('John Quincy Doe', {
        formatCiteShortenAuthor: true,
      }),
    ).toEqual({
      author_cite: 'Doe, J. Q.',
      author_short: 'Doe',
      author_type: 1,
    });
  });

  it('leaves organization names unreversed', () => {
    expect(extractHumanName('The New York Times')).toEqual({
      author_cite: 'The New York Times',
      author_short: 'The New York Times',
      author_type: 4,
    });
  });

  it('returns empty output for empty input', () => {
    expect(extractHumanName('')).toEqual({
      author_cite: '',
      author_short: '',
      author_type: 4,
    });
  });

  it('returns empty output for non-string input', () => {
    expect(extractHumanName(null as unknown as string)).toEqual({
      author_cite: '',
      author_short: '',
      author_type: 4,
    });
  });

  it('normalizes erratic internal spacing', () => {
    expect(extractHumanName('John   Doe')).toEqual({
      author_cite: 'Doe, John',
      author_short: 'Doe',
      author_type: 1,
    });
  });

  it('reads a three-word name as an organization without the database', () => {
    // "zephyr", "quill" and "xylo" are absent from the compact list.
    expect(extractHumanName('Zephyr Quill Xylo').author_type).toBe(4);
  });

  it('reads the same name as a person once the database is loaded', () => {
    setHumanNamesDB({ zephyr: 1, quill: 2, xylo: 2 });
    expect(extractHumanName('Zephyr Quill Xylo')).toEqual({
      author_cite: 'Xylo, Zephyr Quill',
      author_short: 'Xylo',
      author_type: 1,
    });
  });
});
