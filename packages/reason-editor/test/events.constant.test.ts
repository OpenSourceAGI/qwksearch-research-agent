import { describe, expect, it } from 'vitest';
import { EVENTS } from '../src/utils/customEvents/events.constant';

describe('EVENTS', () => {
  it('namespaces the upload-image event by id', () => {
    expect(EVENTS.UPLOAD_IMAGE('abc')).toBe('UPLOAD_IMAGE-abc');
  });

  it('namespaces the upload-video event by id', () => {
    expect(EVENTS.UPLOAD_VIDEO('abc')).toBe('UPLOAD_VIDEO-abc');
  });

  it('namespaces the drawio event by id', () => {
    expect(EVENTS.DRAWIO('abc')).toBe('DRAWIO-abc');
  });

  it('produces distinct names for distinct ids', () => {
    expect(EVENTS.UPLOAD_IMAGE('one')).not.toBe(EVENTS.UPLOAD_IMAGE('two'));
  });
});
