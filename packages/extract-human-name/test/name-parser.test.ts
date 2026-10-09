import { describe, expect, it } from 'vitest';
import {
  cleanProfessionalQualifications,
  extractHumanNameParts,
} from '../name-parser';

describe('extractHumanNameParts', () => {
  it('splits a simple first/last name', () => {
    expect(extractHumanNameParts('John Doe')).toEqual({
      title: '',
      firstname: 'John',
      middle: '',
      lastname: 'Doe',
      honorific: '',
    });
  });

  it('resolves "Last, First" comma inversion', () => {
    const parts = extractHumanNameParts('Doe, John');
    expect(parts.lastname).toBe('Doe');
    expect(parts.firstname).toBe('John');
  });

  it('extracts title, middle initial and honorific', () => {
    expect(extractHumanNameParts('Dr. John Q. Public Jr.')).toEqual({
      title: 'Dr.',
      firstname: 'John',
      middle: 'Q.',
      lastname: 'Public',
      honorific: 'Jr.',
    });
  });

  it('joins multi-word family prefixes onto the surname', () => {
    const parts = extractHumanNameParts('Ludwig van Beethoven');
    expect(parts.firstname).toBe('Ludwig');
    expect(parts.lastname).toBe('van Beethoven');
  });

  it('strips quoted aliases', () => {
    const parts = extractHumanNameParts('John "The Rocket" Doe');
    expect(parts.firstname).toBe('John');
    expect(parts.lastname).toBe('Doe');
  });

  it('fixes the case of all-upper and all-lower input', () => {
    expect(extractHumanNameParts('JOHN DOE').firstname).toBe('John');
    expect(extractHumanNameParts('john doe').lastname).toBe('Doe');
  });

  it('returns empty parts for empty input', () => {
    expect(extractHumanNameParts('')).toEqual({
      title: '',
      firstname: '',
      middle: '',
      lastname: '',
      honorific: '',
    });
  });
});

describe('cleanProfessionalQualifications', () => {
  it('strips honorifics and trailing titles', () => {
    expect(cleanProfessionalQualifications('Dr. John Smith, Professor')).toBe(
      'John Smith',
    );
  });

  it('strips a leading qualification', () => {
    expect(cleanProfessionalQualifications('Professor John Smith')).toBe(
      'John Smith',
    );
  });

  it('leaves plain names untouched', () => {
    expect(cleanProfessionalQualifications('John Doe')).toBe('John Doe');
  });

  it('returns an empty string for empty input', () => {
    expect(cleanProfessionalQualifications('')).toBe('');
  });
});
