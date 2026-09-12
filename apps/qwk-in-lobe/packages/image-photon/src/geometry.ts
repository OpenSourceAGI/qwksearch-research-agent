/**
 * Resize geometry, split out from the pipeline so the arithmetic can be read
 * against sharp's documented `fit` semantics without the WASM plumbing.
 */

export type Fit = 'contain' | 'cover' | 'fill' | 'inside' | 'outside';

export interface ResizeOptions {
  background?: Background;
  fit?: Fit;
  height?: number | null;
  width?: number | null;
  withoutEnlargement?: boolean;
  withoutReduction?: boolean;
}

export interface Background {
  alpha?: number;
  b: number;
  g: number;
  r: number;
}

export interface ResizePlan {
  /** Centre crop applied after scaling, for `fit: 'cover'`. */
  crop?: { height: number; left: number; top: number; width: number };
  /** Canvas the scaled image is centred on, for `fit: 'contain'`. */
  pad?: { height: number; width: number };
  /** Dimensions to hand to the resampler. */
  scaledHeight: number;
  scaledWidth: number;
}

const DEFAULT_BACKGROUND: Background = { alpha: 1, b: 0, g: 0, r: 0 };

const clamp = (value: number) => Math.max(1, Math.round(value));

/**
 * Parse the colour spellings sharp accepts on `background`: an object, a
 * `#rgb`/`#rgba`/`#rrggbb`/`#rrggbbaa` string, or one of a few common names.
 */
export const parseBackground = (background?: Background | string): Background => {
  if (!background) return DEFAULT_BACKGROUND;
  if (typeof background !== 'string') return { alpha: 1, ...background };

  const named: Record<string, Background> = {
    black: { alpha: 1, b: 0, g: 0, r: 0 },
    transparent: { alpha: 0, b: 0, g: 0, r: 0 },
    white: { alpha: 1, b: 255, g: 255, r: 255 },
  };
  const lowered = background.trim().toLowerCase();
  if (named[lowered]) return named[lowered];

  const hex = lowered.replace('#', '');
  const expand = (value: string) => Number.parseInt(value.repeat(2 / value.length), 16);

  if (hex.length === 3 || hex.length === 4) {
    return {
      alpha: hex.length === 4 ? expand(hex[3]) / 255 : 1,
      b: expand(hex[2]),
      g: expand(hex[1]),
      r: expand(hex[0]),
    };
  }
  if (hex.length === 6 || hex.length === 8) {
    const byte = (at: number) => Number.parseInt(hex.slice(at, at + 2), 16);
    return {
      alpha: hex.length === 8 ? byte(6) / 255 : 1,
      b: byte(4),
      g: byte(2),
      r: byte(0),
    };
  }

  return DEFAULT_BACKGROUND;
};

/**
 * Work out how to get from `sourceWidth`x`sourceHeight` to what the caller
 * asked for. Mirrors sharp: one dimension alone preserves the aspect ratio and
 * ignores `fit`; both dimensions select behaviour by `fit`, defaulting to
 * `cover`.
 */
export const planResize = (
  sourceWidth: number,
  sourceHeight: number,
  options: ResizeOptions,
): ResizePlan => {
  const targetWidth = options.width ?? undefined;
  const targetHeight = options.height ?? undefined;

  if (!targetWidth && !targetHeight) {
    return { scaledHeight: sourceHeight, scaledWidth: sourceWidth };
  }

  const limitScale = (scale: number) => {
    if (options.withoutEnlargement && scale > 1) return 1;
    if (options.withoutReduction && scale < 1) return 1;
    return scale;
  };

  // A single dimension: scale to it and let the other follow.
  if (!targetWidth || !targetHeight) {
    const scale = limitScale(
      targetWidth ? targetWidth / sourceWidth : (targetHeight as number) / sourceHeight,
    );
    return {
      scaledHeight: clamp(sourceHeight * scale),
      scaledWidth: clamp(sourceWidth * scale),
    };
  }

  const widthScale = targetWidth / sourceWidth;
  const heightScale = targetHeight / sourceHeight;
  const fit = options.fit ?? 'cover';

  if (fit === 'fill') {
    // `fill` distorts on purpose, so the two axes are limited independently.
    return {
      scaledHeight: clamp(sourceHeight * limitScale(heightScale)),
      scaledWidth: clamp(sourceWidth * limitScale(widthScale)),
    };
  }

  const contains = fit === 'inside' || fit === 'contain';
  const scale = limitScale(
    contains ? Math.min(widthScale, heightScale) : Math.max(widthScale, heightScale),
  );

  const scaledWidth = clamp(sourceWidth * scale);
  const scaledHeight = clamp(sourceHeight * scale);

  if (fit === 'cover') {
    // The scaled image covers the box on both axes; trim the overflow. When
    // enlargement was refused it may be smaller than the box, in which case
    // there is nothing to crop.
    const cropWidth = Math.min(scaledWidth, targetWidth);
    const cropHeight = Math.min(scaledHeight, targetHeight);
    if (cropWidth === scaledWidth && cropHeight === scaledHeight) {
      return { scaledHeight, scaledWidth };
    }
    return {
      crop: {
        height: cropHeight,
        left: Math.floor((scaledWidth - cropWidth) / 2),
        top: Math.floor((scaledHeight - cropHeight) / 2),
        width: cropWidth,
      },
      scaledHeight,
      scaledWidth,
    };
  }

  if (fit === 'contain' && (scaledWidth !== targetWidth || scaledHeight !== targetHeight)) {
    return {
      pad: { height: targetHeight, width: targetWidth },
      scaledHeight,
      scaledWidth,
    };
  }

  return { scaledHeight, scaledWidth };
};
