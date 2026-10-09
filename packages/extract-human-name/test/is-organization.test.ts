import { afterEach, describe, expect, it } from 'vitest';
import { isOrganization } from '../is-organization';
import { setHumanNamesDB } from '../human-names-db';

afterEach(() => setHumanNamesDB(null));

describe('isOrganization', () => {
  it('detects a well-known publication', () => {
    expect(isOrganization('The New York Times')).toBe(true);
  });

  it('detects a company with a legal suffix', () => {
    expect(isOrganization('Google LLC')).toBe(true);
  });

  it('detects a rigid acronym', () => {
    expect(isOrganization('WHO')).toBe(true);
  });

  it('detects paired ambiguous firm names', () => {
    // "morgan" and "stanley" double as human names, but the pair
    // of organization terms is decisive.
    expect(isOrganization('Morgan Stanley')).toBe(true);
  });

  it('accepts a plain person name', () => {
    expect(isOrganization('John Doe')).toBe(false);
  });

  it('accepts a multi-word person name from the compact list', () => {
    expect(isOrganization('Mary Ann Smith')).toBe(false);
  });

  it('accepts a "Last, First" inversion', () => {
    expect(isOrganization('Smith, John')).toBe(false);
  });

  it('accepts a name with a qualification term', () => {
    expect(isOrganization('Professor John Smith')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isOrganization('')).toBe(false);
  });

  it('treats unknown three-word strings as organizations without the database', () => {
    // None of these words are in the compact name list.
    expect(isOrganization('Zephyr Quill Xylo')).toBe(true);
  });

  it('treats the same string as a person once the database is loaded', () => {
    setHumanNamesDB({ zephyr: 1, quill: 2, xylo: 2 });
    expect(isOrganization('Zephyr Quill Xylo')).toBe(false);
  });

  it('keeps using the compact list when the database is cleared', () => {
    setHumanNamesDB(null);
    expect(isOrganization('Mary Ann Smith')).toBe(false);
  });
});
