import { adoptOpenerUrl } from '../src/react/player/useDocumentPictureInPicture';

/** A stand-in PiP window whose document records the calls made on it. */
function fakePipWindow(overrides: Partial<Record<'open' | 'write' | 'close', () => void>> = {}) {
  const calls: string[] = [];
  const document = {
    open: overrides.open ?? (() => calls.push('open')),
    write: overrides.write ?? ((html: string) => calls.push(`write:${html}`)),
    close: overrides.close ?? (() => calls.push('close')),
  };
  return { win: { document } as unknown as Window, calls };
}

describe('adoptOpenerUrl', () => {
  it('re-opens the PiP document from this page, in standards mode', () => {
    const { win, calls } = fakePipWindow();
    adoptOpenerUrl(win);
    expect(calls).toEqual(['open', 'write:<!doctype html><html><head></head><body></body></html>', 'close']);
  });

  it('keeps the blank document when the browser refuses document.open()', () => {
    const { win } = fakePipWindow({
      open: () => {
        throw new Error('InvalidStateError');
      },
    });
    expect(() => adoptOpenerUrl(win)).not.toThrow();
  });
});
