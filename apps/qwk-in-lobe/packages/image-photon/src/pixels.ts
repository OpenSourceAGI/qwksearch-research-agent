/**
 * Raw RGBA operations Photon does not expose.
 *
 * Photon's own `rotate` interpolates for arbitrary angles, which is the wrong
 * tool for EXIF auto-orientation: those are exact quarter turns and mirrors,
 * and doing them here keeps them lossless. Alpha flattening and letterbox
 * padding have no Photon equivalent at all.
 */
import type { Background } from './geometry';

export interface RawImage {
  height: number;
  pixels: Uint8Array;
  width: number;
}

/** Composite an RGBA buffer onto an opaque background, dropping the alpha. */
export const flattenOnto = (
  { height, pixels, width }: RawImage,
  background: Background,
): RawImage => {
  const out = new Uint8Array(pixels.length);
  const backgroundAlpha = background.alpha ?? 1;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    const inverse = 1 - alpha;
    out[index] = Math.round(pixels[index] * alpha + background.r * backgroundAlpha * inverse);
    out[index + 1] = Math.round(
      pixels[index + 1] * alpha + background.g * backgroundAlpha * inverse,
    );
    out[index + 2] = Math.round(
      pixels[index + 2] * alpha + background.b * backgroundAlpha * inverse,
    );
    out[index + 3] = 255;
  }

  return { height, pixels: out, width };
};

/** Rotate by an exact number of quarter turns, clockwise. */
export const rotateQuarterTurns = (
  { height, pixels, width }: RawImage,
  turns: number,
): RawImage => {
  const normalized = ((turns % 4) + 4) % 4;
  if (normalized === 0) return { height, pixels, width };

  const swapped = normalized % 2 === 1;
  const outWidth = swapped ? height : width;
  const outHeight = swapped ? width : height;
  const out = new Uint8Array(pixels.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let outX: number;
      let outY: number;
      if (normalized === 1) {
        outX = height - 1 - y;
        outY = x;
      } else if (normalized === 2) {
        outX = width - 1 - x;
        outY = height - 1 - y;
      } else {
        outX = y;
        outY = width - 1 - x;
      }

      const from = (y * width + x) * 4;
      const to = (outY * outWidth + outX) * 4;
      out[to] = pixels[from];
      out[to + 1] = pixels[from + 1];
      out[to + 2] = pixels[from + 2];
      out[to + 3] = pixels[from + 3];
    }
  }

  return { height: outHeight, pixels: out, width: outWidth };
};

/** Mirror across the vertical axis (left↔right). */
export const mirrorHorizontally = ({ height, pixels, width }: RawImage): RawImage => {
  const out = new Uint8Array(pixels.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const from = (y * width + x) * 4;
      const to = (y * width + (width - 1 - x)) * 4;
      out[to] = pixels[from];
      out[to + 1] = pixels[from + 1];
      out[to + 2] = pixels[from + 2];
      out[to + 3] = pixels[from + 3];
    }
  }

  return { height, pixels: out, width };
};

/**
 * EXIF orientation 1-8 expressed as the mirror-then-rotate pair that undoes it.
 * Values are [horizontal mirror, clockwise quarter turns].
 */
const ORIENTATION_STEPS: Record<number, [boolean, number]> = {
  1: [false, 0],
  2: [true, 0],
  3: [false, 2],
  4: [true, 2],
  5: [true, 1],
  6: [false, 1],
  7: [true, 3],
  8: [false, 3],
};

/** Bake an EXIF orientation into the pixels, as sharp's `.rotate()` does. */
export const applyExifOrientation = (image: RawImage, orientation?: number): RawImage => {
  const steps = ORIENTATION_STEPS[orientation ?? 1];
  if (!steps) return image;

  const [mirror, turns] = steps;
  return rotateQuarterTurns(mirror ? mirrorHorizontally(image) : image, turns);
};

/** Centre an image on a larger canvas filled with `background`. */
export const padToCanvas = (
  { height, pixels, width }: RawImage,
  canvasWidth: number,
  canvasHeight: number,
  background: Background,
): RawImage => {
  const out = new Uint8Array(canvasWidth * canvasHeight * 4);
  const alpha = Math.round((background.alpha ?? 1) * 255);

  for (let index = 0; index < out.length; index += 4) {
    out[index] = background.r;
    out[index + 1] = background.g;
    out[index + 2] = background.b;
    out[index + 3] = alpha;
  }

  const left = Math.floor((canvasWidth - width) / 2);
  const top = Math.floor((canvasHeight - height) / 2);

  for (let y = 0; y < height; y += 1) {
    const targetY = top + y;
    if (targetY < 0 || targetY >= canvasHeight) continue;
    for (let x = 0; x < width; x += 1) {
      const targetX = left + x;
      if (targetX < 0 || targetX >= canvasWidth) continue;
      const from = (y * width + x) * 4;
      const to = (targetY * canvasWidth + targetX) * 4;
      out[to] = pixels[from];
      out[to + 1] = pixels[from + 1];
      out[to + 2] = pixels[from + 2];
      out[to + 3] = pixels[from + 3];
    }
  }

  return { height: canvasHeight, pixels: out, width: canvasWidth };
};

export interface ChannelStats {
  max: number;
  mean: number;
  min: number;
  squaresSum: number;
  stdev: number;
  sum: number;
}

/** Per-channel statistics, shaped like the subset of `sharp.stats()` we use. */
export const channelStats = ({ height, pixels, width }: RawImage) => {
  const count = width * height;
  const channels: ChannelStats[] = [];
  let isOpaque = true;

  for (let channel = 0; channel < 4; channel += 1) {
    let min = 255;
    let max = 0;
    let sum = 0;
    let squaresSum = 0;

    for (let index = channel; index < pixels.length; index += 4) {
      const value = pixels[index];
      if (value < min) min = value;
      if (value > max) max = value;
      sum += value;
      squaresSum += value * value;
    }

    if (channel === 3 && min < 255) isOpaque = false;

    const mean = count === 0 ? 0 : sum / count;
    channels.push({
      max,
      mean,
      min,
      squaresSum,
      stdev: count === 0 ? 0 : Math.sqrt(Math.max(0, squaresSum / count - mean * mean)),
      sum,
    });
  }

  return { channels, isOpaque };
};
