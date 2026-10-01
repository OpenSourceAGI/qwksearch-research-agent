/**
 * A custom control, supplied by *this app* rather than the package.
 *
 * `<FloatingYouTubePlayer extraControls={...} />` renders whatever you give it
 * inside the player's control strip, and hands it the live player context, so
 * app-specific chrome doesn't have to live in the npm package. This button is
 * the demo's version of it: a slow-down toggle for following something dense.
 *
 * debate-ai.com — where this player was ported from — plugs its own
 * "slow the debate spread down" button in through exactly this prop, with its
 * own label, icon and rate. The package itself stays generic: it exposes
 * `player.setPlaybackRate()` and reports the current `playbackRate`, and the
 * host decides what the button says and what it does.
 */

import type { PlayerControlContext } from 'extract-youtube/react';
import { Gauge } from 'lucide-react';

export const SLOW_RATE = 0.65;

export function SpeedButton({ playbackRate, player }: Pick<PlayerControlContext, 'playbackRate' | 'player'>) {
  const isSlow = playbackRate !== 1;

  return (
    <button
      type="button"
      // `eytp-btn` / `eytp-btn-active` are the player's own control classes, so
      // custom buttons match the built-in ones without any extra styling.
      className={`eytp-btn${isSlow ? ' eytp-btn-active' : ''}`}
      onClick={() => player.setPlaybackRate(isSlow ? 1 : SLOW_RATE)}
      aria-label={isSlow ? 'Back to normal speed' : 'Slow playback down'}
      title={isSlow ? 'Back to normal speed (1x)' : `Slow it down (${SLOW_RATE}x)`}
    >
      <Gauge size={13} />
    </button>
  );
}
