/**
 * A `sharp`-shaped image pipeline backed by Photon (Rust → WASM).
 *
 * `sharp` is a native Node addon: it cannot be loaded by workerd, so every
 * server path that touched it kept the whole app off Cloudflare Workers.
 * Photon is plain WebAssembly and runs unchanged on Workers, Node and the edge
 * runtime, so the call sites keep the fluent API they already use and only the
 * import specifier changes.
 *
 * The surface here is deliberately the subset the app actually calls, not all
 * of sharp. Differences worth knowing:
 *
 * - **WebP quality is fixed.** Photon's WebP encoder takes no quality
 *   parameter, so `.webp({ quality })` accepts the option and ignores it.
 * - **Single frame only.** Animations decode to their first frame. Read
 *   `metadata().pages` before re-encoding if that would destroy the animation.
 * - **No AVIF, HEIF or SVG input.** Photon decodes PNG, JPEG, WebP, GIF and
 *   BMP. `metadata()` still identifies the other containers from their header,
 *   so callers can take their "cannot handle this" path instead of failing
 *   mid-pipeline, but any operation that needs pixels throws.
 * - **`.toFile()` is absent** — there is no filesystem on Workers.
 */
// Type-only, so it is erased at compile time and the WASM stays out of the
// module graph until `loadPhoton()` actually pulls it in.
import type * as Photon from '@cf-wasm/photon';

import type { Background, Fit, ResizeOptions } from './geometry';
import { parseBackground, planResize } from './geometry';
import type { ChannelStats, RawImage } from './pixels';
import {
  applyExifOrientation,
  channelStats,
  flattenOnto,
  padToCanvas,
  rotateQuarterTurns,
} from './pixels';
import type { ImageFormat } from './sniff';
import { sniffImage } from './sniff';

export type { Background, ChannelStats, Fit, ImageFormat, ResizeOptions };

type PhotonModule = typeof Photon;
type PhotonImage = InstanceType<PhotonModule['PhotonImage']>;

/** Formats Photon can encode. Anything else falls back to PNG on output. */
export type OutputFormat = 'jpeg' | 'png' | 'webp';

export interface PhotonSharpOptions {
  /**
   * Accepted for sharp compatibility and ignored: Photon decodes a single
   * frame regardless. `metadata().pages` still reports the real frame count.
   */
  animated?: boolean;
  /** Accepted for sharp compatibility and ignored: SVG input is unsupported. */
  density?: number;
  /** Accepted for sharp compatibility; Photon fails on any undecodable input. */
  failOn?: 'error' | 'none' | 'truncated' | 'warning';
  /** Reject images above this pixel count. `false` disables the check. */
  limitInputPixels?: boolean | number;
}

export interface Metadata {
  channels?: number;
  format?: ImageFormat;
  hasAlpha?: boolean;
  height?: number;
  orientation?: number;
  /** Frame count: 1 for a still image, >1 for an animation. */
  pages: number;
  size: number;
  space?: string;
  width?: number;
}

export interface Stats {
  channels: ChannelStats[];
  isOpaque: boolean;
}

export interface OutputOptions {
  quality?: number;
}

/**
 * What Photon's decoder actually accepts. Notably absent, and supported by the
 * libvips-backed `sharp` this replaced: AVIF and HEIF. An image in one of those
 * reaches `metadata()` intact — format, frame count, EXIF all come off the
 * header — but cannot be resized, re-encoded or inspected pixel-wise.
 */
const DECODABLE_FORMATS = new Set<ImageFormat>(['bmp', 'gif', 'jpeg', 'png', 'webp']);

/** sharp's own default ceiling: 0x3FFF × 0x3FFF pixels. */
const DEFAULT_PIXEL_LIMIT = 0x3f_ff * 0x3f_ff;
const DEFAULT_JPEG_QUALITY = 80;

type Operation =
  | { background: Background; type: 'flatten' }
  | { angle?: number; type: 'rotate' }
  | { options: ResizeOptions; type: 'resize' };

let photonModule: Promise<PhotonModule> | undefined;

/**
 * Loaded on first use rather than at import time. The WASM binary is around a
 * megabyte, and several call sites reach this module without ever touching an
 * image.
 */
const loadPhoton = () => (photonModule ??= import('@cf-wasm/photon'));

const toBytes = (input: ArrayBuffer | ArrayBufferView | Uint8Array): Uint8Array => {
  if (input instanceof Uint8Array) return input;
  if (ArrayBuffer.isView(input)) {
    return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  }
  return new Uint8Array(input);
};

const toRaw = (image: PhotonImage): RawImage => ({
  height: image.get_height(),
  pixels: image.get_raw_pixels(),
  width: image.get_width(),
});

export class PhotonSharp {
  private readonly bytes: Uint8Array;
  private readonly options: PhotonSharpOptions;
  private readonly operations: Operation[] = [];
  private outputFormat?: OutputFormat;
  private outputOptions: OutputOptions = {};

  constructor(input: ArrayBuffer | ArrayBufferView | Uint8Array, options: PhotonSharpOptions = {}) {
    this.bytes = toBytes(input);
    this.options = options;
  }

  // ------------------------------------------------------------ operations

  resize(options: ResizeOptions): this;
  resize(width?: number | null, height?: number | null, options?: ResizeOptions): this;
  resize(
    widthOrOptions?: ResizeOptions | number | null,
    height?: number | null,
    options: ResizeOptions = {},
  ): this {
    const resolved: ResizeOptions =
      typeof widthOrOptions === 'object' && widthOrOptions !== null
        ? widthOrOptions
        : { ...options, height, width: widthOrOptions };

    this.operations.push({ options: resolved, type: 'resize' });
    return this;
  }

  /** No angle auto-orients from EXIF, matching sharp. */
  rotate(angle?: number): this {
    this.operations.push({ angle, type: 'rotate' });
    return this;
  }

  flatten(options: { background?: Background | string } = {}): this {
    this.operations.push({ background: parseBackground(options.background), type: 'flatten' });
    return this;
  }

  // --------------------------------------------------------------- outputs

  jpeg(options: OutputOptions = {}): this {
    return this.toFormat('jpeg', options);
  }

  png(options: OutputOptions = {}): this {
    return this.toFormat('png', options);
  }

  /** `quality` is accepted for compatibility; Photon's WebP encoder ignores it. */
  webp(options: OutputOptions = {}): this {
    return this.toFormat('webp', options);
  }

  toFormat(format: OutputFormat, options: OutputOptions = {}): this {
    this.outputFormat = format;
    this.outputOptions = options;
    return this;
  }

  // ------------------------------------------------------------- terminals

  /**
   * Header-only where the container allows it: the compression paths call this
   * first and often return the original bytes without ever decoding.
   */
  async metadata(): Promise<Metadata> {
    const sniffed = sniffImage(this.bytes);

    if (sniffed.width !== undefined && sniffed.height !== undefined) {
      this.assertWithinPixelLimit(sniffed.width, sniffed.height);
      return {
        channels: sniffed.hasAlpha ? 4 : 3,
        format: sniffed.format,
        hasAlpha: sniffed.hasAlpha,
        height: sniffed.height,
        orientation: sniffed.orientation,
        pages: sniffed.pages,
        size: this.bytes.byteLength,
        space: 'srgb',
        width: sniffed.width,
      };
    }

    // Nothing to gain from a decode that is going to fail: report what the
    // header gave us and let the caller decide. Undefined dimensions are how
    // sharp's own callers already detect an image they cannot work with.
    if (sniffed.format && !DECODABLE_FORMATS.has(sniffed.format)) {
      return {
        format: sniffed.format,
        hasAlpha: sniffed.hasAlpha,
        orientation: sniffed.orientation,
        pages: sniffed.pages,
        size: this.bytes.byteLength,
      };
    }

    const image = await this.decode();
    try {
      return {
        channels: 4,
        format: sniffed.format,
        hasAlpha: sniffed.hasAlpha,
        height: image.get_height(),
        orientation: sniffed.orientation,
        pages: sniffed.pages,
        size: this.bytes.byteLength,
        space: 'srgb',
        width: image.get_width(),
      };
    } finally {
      image.free();
    }
  }

  /**
   * Only the decode is load-bearing at the call sites — this is how inline
   * images get validated — but the numbers are real.
   */
  async stats(): Promise<Stats> {
    const image = await this.decode();
    try {
      return channelStats(toRaw(image));
    } finally {
      image.free();
    }
  }

  async toBuffer(): Promise<Buffer> {
    const photon = await loadPhoton();
    let image = await this.decode();

    try {
      for (const operation of this.operations) {
        image = this.apply(photon, image, operation);
      }
      return Buffer.from(this.encode(image));
    } finally {
      image.free();
    }
  }

  // ------------------------------------------------------------- internals

  private assertWithinPixelLimit(width: number, height: number) {
    const { limitInputPixels } = this.options;
    if (limitInputPixels === false) return;

    const limit = typeof limitInputPixels === 'number' ? limitInputPixels : DEFAULT_PIXEL_LIMIT;
    if (width * height > limit) {
      throw new Error(
        `Input image exceeds pixel limit: ${width}x${height} is over ${limit} pixels`,
      );
    }
  }

  private async decode(): Promise<PhotonImage> {
    const { format } = sniffImage(this.bytes);
    if (format && !DECODABLE_FORMATS.has(format)) {
      throw new Error(
        `Photon cannot decode ${format} images (it handles ${[...DECODABLE_FORMATS].join(', ')})`,
      );
    }

    const photon = await loadPhoton();

    let image: PhotonImage;
    try {
      image = photon.PhotonImage.new_from_byteslice(this.bytes);
    } catch (error) {
      throw new Error(`Failed to decode image${format ? ` (${format})` : ''}`, { cause: error });
    }

    try {
      this.assertWithinPixelLimit(image.get_width(), image.get_height());
    } catch (error) {
      image.free();
      throw error;
    }

    return image;
  }

  private replace(image: PhotonImage, next: PhotonImage): PhotonImage {
    if (next !== image) image.free();
    return next;
  }

  private fromRaw(photon: PhotonModule, raw: RawImage): PhotonImage {
    return new photon.PhotonImage(raw.pixels, raw.width, raw.height);
  }

  private apply(photon: PhotonModule, image: PhotonImage, operation: Operation): PhotonImage {
    switch (operation.type) {
      case 'flatten': {
        return this.replace(
          image,
          this.fromRaw(photon, flattenOnto(toRaw(image), operation.background)),
        );
      }

      case 'rotate': {
        // sharp's no-argument `rotate()` means "bake in the EXIF orientation".
        if (operation.angle === undefined) {
          const { orientation } = sniffImage(this.bytes);
          if (!orientation || orientation === 1) return image;
          return this.replace(
            image,
            this.fromRaw(photon, applyExifOrientation(toRaw(image), orientation)),
          );
        }

        // Quarter turns stay lossless in JS; anything else needs Photon's
        // interpolating rotation.
        const angle = ((operation.angle % 360) + 360) % 360;
        if (angle === 0) return image;
        if (angle % 90 === 0) {
          return this.replace(
            image,
            this.fromRaw(photon, rotateQuarterTurns(toRaw(image), angle / 90)),
          );
        }
        return this.replace(image, photon.rotate(image, operation.angle));
      }

      case 'resize': {
        const plan = planResize(image.get_width(), image.get_height(), operation.options);
        let next = image;

        if (plan.scaledWidth !== next.get_width() || plan.scaledHeight !== next.get_height()) {
          next = this.replace(
            next,
            photon.resize(
              next,
              plan.scaledWidth,
              plan.scaledHeight,
              photon.SamplingFilter.Lanczos3,
            ),
          );
        }

        if (plan.crop) {
          const { height, left, top, width } = plan.crop;
          next = this.replace(next, photon.crop(next, left, top, left + width, top + height));
        }

        if (plan.pad) {
          next = this.replace(
            next,
            this.fromRaw(
              photon,
              padToCanvas(
                toRaw(next),
                plan.pad.width,
                plan.pad.height,
                parseBackground(operation.options.background),
              ),
            ),
          );
        }

        return next;
      }
    }
  }

  private encode(image: PhotonImage): Uint8Array {
    // With no explicit output format sharp keeps the input's. Photon can only
    // write PNG, JPEG and WebP, so anything else lands on PNG.
    const format =
      this.outputFormat ??
      ({ jpeg: 'jpeg', png: 'png', webp: 'webp' } as const)[
        sniffImage(this.bytes).format as OutputFormat
      ] ??
      'png';

    switch (format) {
      case 'jpeg': {
        return image.get_bytes_jpeg(this.outputOptions.quality ?? DEFAULT_JPEG_QUALITY);
      }
      case 'webp': {
        return image.get_bytes_webp();
      }
      default: {
        return image.get_bytes();
      }
    }
  }
}

/**
 * Drop-in replacement for sharp's factory function.
 *
 * ```ts
 * const thumbnail = await sharp(buffer)
 *   .resize(320, 320, { fit: 'inside', withoutEnlargement: true })
 *   .webp()
 *   .toBuffer();
 * ```
 */
export const sharp = (
  input: ArrayBuffer | ArrayBufferView | Uint8Array,
  options?: PhotonSharpOptions,
): PhotonSharp => new PhotonSharp(input, options);

export default sharp;
