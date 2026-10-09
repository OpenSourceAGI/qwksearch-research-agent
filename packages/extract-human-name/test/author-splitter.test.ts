import { describe, expect, it } from 'vitest';
import { splitMultipleAuthors } from '../author-splitter';

describe('splitMultipleAuthors', () => {
  it('splits on "and"', () => {
    expect(splitMultipleAuthors('John Doe and Jane Smith')).toEqual([
      'John Doe',
      'Jane Smith',
    ]);
  });

  it('splits on "&"', () => {
    expect(splitMultipleAuthors('John Doe & Jane Smith')).toEqual([
      'John Doe',
      'Jane Smith',
    ]);
  });

  it('splits "Last, First & Last, First" without breaking inversions', () => {
    expect(splitMultipleAuthors('Doe, John & Smith, Jane')).toEqual([
      'Doe, John',
      'Smith, Jane',
    ]);
  });

  it('splits a comma series with a trailing "and"', () => {
    expect(splitMultipleAuthors('John Doe, Jane Smith, and Alex Jones')).toEqual(
      ['John Doe', 'Jane Smith', 'Alex Jones'],
    );
  });

  it('splits a comma series without a conjunction', () => {
    expect(splitMultipleAuthors('John Doe, Jane Smith, Alex Jones')).toEqual(
      ['John Doe', 'Jane Smith', 'Alex Jones'],
    );
  });

  it('splits on semicolons', () => {
    expect(splitMultipleAuthors('John Doe; Jane Smith')).toEqual([
      'John Doe',
      'Jane Smith',
    ]);
  });

  it('drops "et al."', () => {
    expect(splitMultipleAuthors('John Smith et al.')).toEqual(['John Smith']);
  });

  it('returns an empty array for empty input', () => {
    expect(splitMultipleAuthors('')).toEqual([]);
  });
});
