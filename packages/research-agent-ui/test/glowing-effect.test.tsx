import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import React from 'react';

/**
 * The pointer-tracked glow is driven by a `--start` angle that is tweened on
 * every pointer move. Two things used to make the visible arc sit far away
 * from the cursor:
 *
 *  1. each move started a new tween without stopping the previous one, so
 *     several tweens wrote conflicting angles to the same custom property, and
 *  2. the tween ran for two seconds, so the arc trailed the pointer by a large
 *     angle for as long as the pointer kept moving.
 *
 * These tests pin both down.
 */

type AnimateCall = { from: number; to: number; duration: number };

const animateCalls: AnimateCall[] = [];
const stopSpies: Array<ReturnType<typeof vi.fn>> = [];

vi.mock('motion/react', () => ({
  animate: (from: number, to: number, options: { duration: number }) => {
    animateCalls.push({ from, to, duration: options.duration });
    const stop = vi.fn();
    stopSpies.push(stop);
    return { stop };
  },
}));

// Imported after the mock so the component picks up the stubbed `animate`.
const { GlowingEffect } = await import('../src/ui/glowing-effect');

const CARD = { left: 100, top: 100, width: 200, height: 100 };

/** jsdom lays nothing out, so the component's rect has to be stubbed. */
const stubRect = () =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    ...CARD,
    right: CARD.left + CARD.width,
    bottom: CARD.top + CARD.height,
    x: CARD.left,
    y: CARD.top,
    toJSON: () => ({}),
  } as DOMRect);

/** Dispatch a pointer move and run the rAF callback the handler queues. */
const movePointer = (x: number, y: number) => {
  const event = new MouseEvent('pointermove', { clientX: x, clientY: y });
  window.dispatchEvent(event);
  vi.advanceTimersByTime(32);
};

describe('GlowingEffect pointer tracking', () => {
  beforeEach(() => {
    animateCalls.length = 0;
    stopSpies.length = 0;
    vi.useFakeTimers();
    stubRect();
    render(<GlowingEffect disabled={false} glow proximity={64} inactiveZone={0.01} />);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('stops the in-flight tween before starting the next one', () => {
    movePointer(340, 150);
    movePointer(345, 150);
    movePointer(350, 150);

    expect(animateCalls.length).toBe(3);
    // Every tween but the last one must have been stopped, so only a single
    // animation is ever writing `--start`.
    expect(stopSpies.slice(0, -1).every((stop) => stop.mock.calls.length > 0)).toBe(true);
    expect(stopSpies[stopSpies.length - 1]).not.toHaveBeenCalled();
  });

  it('tweens toward the pointer fast enough to stay under the cursor', () => {
    movePointer(340, 150);

    expect(animateCalls[0].duration).toBeLessThanOrEqual(0.3);
  });

  it('aims the arc at the pointer angle measured from the element centre', () => {
    // Pointer directly to the right of the card centre (200, 150): the conic
    // gradient starts at 12 o'clock, so "right" is 90deg.
    movePointer(340, 150);

    expect(animateCalls[0].to).toBeCloseTo(90, 5);

    // Directly below the centre is 180deg. The tween takes the shortest route,
    // so the raw target can be the negative equivalent of that angle.
    movePointer(200, 250);

    const normalized = ((animateCalls[1].to % 360) + 360) % 360;
    expect(normalized).toBeCloseTo(180, 5);
  });
});
