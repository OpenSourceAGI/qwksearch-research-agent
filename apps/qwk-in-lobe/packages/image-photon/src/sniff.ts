/**
 * Container sniffing.
 *
 * Photon decodes pixels but tells us nothing about the file it came from: no
 * format name, no frame count, no EXIF. Those are exactly the three things the
 * callers of `metadata()` branch on, so we read them straight off the bytes.
 *
 * Reading the header also lets `metadata()` answer without decoding at all,
 * which matters: the compression paths call `metadata()` first and return the
 * original buffer untouched when the image is already small enough.
 */

export type ImageFormat =
  'avif' | 'bmp' | 'gif' | 'heif' | 'ico' | 'jpeg' | 'png' | 'svg' | 'tiff' | 'webp';

export interface SniffResult {
  format?: ImageFormat;
  hasAlpha?: boolean;
  height?: number;
  /** EXIF orientation, 1-8. Undefined when the file carries no EXIF. */
  orientation?: number;
  /** Frame count. 1 for a still image, >1 for an animation. */
  pages: number;
  width?: number;
}

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.subarray(start, start + length));

const startsWith = (bytes: Uint8Array, signature: readonly number[], offset = 0) =>
  bytes.length >= offset + signature.length &&
  signature.every((byte, index) => bytes[offset + index] === byte);

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// ---------------------------------------------------------------- EXIF

/**
 * Read the orientation tag out of a TIFF-structured EXIF payload — the same
 * layout whether it arrived in a JPEG APP1 segment, a WebP `EXIF` chunk, a PNG
 * `eXIf` chunk, or a bare TIFF file.
 */
const readExifOrientation = (bytes: Uint8Array, start: number, end: number) => {
  if (end - start < 8) return undefined;

  const order = ascii(bytes, start, 2);
  if (order !== 'II' && order !== 'MM') return undefined;
  const littleEndian = order === 'II';

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const u16 = (at: number) => view.getUint16(at, littleEndian);
  const u32 = (at: number) => view.getUint32(at, littleEndian);

  if (u16(start + 2) !== 42) return undefined;

  const ifdOffset = start + u32(start + 4);
  if (ifdOffset + 2 > end) return undefined;

  const entryCount = u16(ifdOffset);
  for (let index = 0; index < entryCount; index += 1) {
    const entry = ifdOffset + 2 + index * 12;
    if (entry + 12 > end) break;
    // 0x0112 = Orientation, stored as a SHORT inline in the value field.
    if (u16(entry) !== 0x01_12) continue;
    const orientation = u16(entry + 8);
    return orientation >= 1 && orientation <= 8 ? orientation : undefined;
  }

  return undefined;
};

// ---------------------------------------------------------------- PNG

const sniffPng = (bytes: Uint8Array): SniffResult => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result: SniffResult = { format: 'png', pages: 1 };

  let offset = PNG_SIGNATURE.length;
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = ascii(bytes, offset + 4, 4);
    const data = offset + 8;
    if (data + length > bytes.length) break;

    switch (type) {
      case 'IHDR': {
        result.width = view.getUint32(data);
        result.height = view.getUint32(data + 4);
        const colorType = bytes[data + 9];
        // 4 = grayscale+alpha, 6 = truecolour+alpha. Palettes (3) can still be
        // transparent, which the tRNS case below picks up.
        result.hasAlpha = colorType === 4 || colorType === 6;
        break;
      }
      case 'acTL': {
        // Animated PNG control chunk: the frame count lives in its first word.
        result.pages = Math.max(1, view.getUint32(data));
        break;
      }
      case 'tRNS': {
        result.hasAlpha = true;
        break;
      }
      case 'eXIf': {
        result.orientation = readExifOrientation(bytes, data, data + length);
        break;
      }
      // Everything interesting precedes the pixel data, so stop there.
      case 'IDAT':
      case 'IEND': {
        return result;
      }
    }

    offset = data + length + 4;
  }

  return result;
};

// ---------------------------------------------------------------- JPEG

const SOF_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

const sniffJpeg = (bytes: Uint8Array): SniffResult => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result: SniffResult = { format: 'jpeg', hasAlpha: false, pages: 1 };

  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    // Padding fill bytes, and the standalone markers that carry no segment.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }
    // Start of scan: entropy-coded data follows, nothing more to read.
    if (marker === 0xda) break;

    const length = view.getUint16(offset + 2);
    const payload = offset + 4;
    if (length < 2 || payload + length - 2 > bytes.length) break;

    if (SOF_MARKERS.has(marker)) {
      result.height = view.getUint16(payload + 1);
      result.width = view.getUint16(payload + 3);
      if (result.orientation !== undefined) break;
    } else if (marker === 0xe1 && ascii(bytes, payload, 6) === 'Exif\0\0') {
      result.orientation = readExifOrientation(bytes, payload + 6, payload + length - 2);
      if (result.width !== undefined) break;
    }

    offset = payload + length - 2;
  }

  return result;
};

// ---------------------------------------------------------------- GIF

const sniffGif = (bytes: Uint8Array): SniffResult => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result: SniffResult = {
    format: 'gif',
    hasAlpha: false,
    height: view.getUint16(8, true),
    pages: 0,
    width: view.getUint16(6, true),
  };

  const flags = bytes[10];
  let offset = 13;
  // Global colour table, when present.
  if (flags & 0x80) offset += 3 * 2 ** ((flags & 0x07) + 1);

  /** Walk a chain of length-prefixed sub-blocks, ending at the zero-length one. */
  const skipSubBlocks = (from: number) => {
    let at = from;
    while (at < bytes.length) {
      const size = bytes[at];
      at += 1 + size;
      if (size === 0) break;
    }
    return at;
  };

  while (offset < bytes.length) {
    const block = bytes[offset];

    if (block === 0x2c) {
      // Image descriptor — one per frame.
      result.pages += 1;
      const localFlags = bytes[offset + 9];
      let at = offset + 10;
      if (localFlags & 0x80) at += 3 * 2 ** ((localFlags & 0x07) + 1);
      // LZW minimum code size, then the compressed image sub-blocks.
      offset = skipSubBlocks(at + 1);
    } else if (block === 0x21) {
      const label = bytes[offset + 1];
      // Graphic control extension: bit 0 of its packed field is the
      // transparent-colour flag.
      if (label === 0xf9 && bytes[offset + 3] & 0x01) result.hasAlpha = true;
      offset = skipSubBlocks(offset + 2);
    } else {
      // Trailer (0x3b) or a byte we cannot interpret.
      break;
    }
  }

  result.pages = Math.max(1, result.pages);
  return result;
};

// ---------------------------------------------------------------- WebP

const sniffWebp = (bytes: Uint8Array): SniffResult => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const result: SniffResult = { format: 'webp', pages: 0 };

  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const fourcc = ascii(bytes, offset, 4);
    const size = view.getUint32(offset + 4, true);
    const payload = offset + 8;
    if (payload + size > bytes.length) break;

    switch (fourcc) {
      case 'VP8X': {
        const flags = bytes[payload];
        result.hasAlpha = (flags & 0x10) !== 0;
        // Canvas size is stored as two 24-bit little-endian "minus one" values.
        result.width =
          (bytes[payload + 4] | (bytes[payload + 5] << 8) | (bytes[payload + 6] << 16)) + 1;
        result.height =
          (bytes[payload + 7] | (bytes[payload + 8] << 8) | (bytes[payload + 9] << 16)) + 1;
        break;
      }
      case 'VP8 ': {
        // Lossy: a 3-byte frame tag, the 3-byte start code, then 14-bit dims.
        if (result.width === undefined) {
          result.width = view.getUint16(payload + 6, true) & 0x3f_ff;
          result.height = view.getUint16(payload + 8, true) & 0x3f_ff;
        }
        result.hasAlpha ??= false;
        break;
      }
      case 'VP8L': {
        // Lossless: after the 0x2f signature, 14 bits width-1, 14 bits
        // height-1, then the alpha-used flag.
        if (result.width === undefined) {
          const bits = view.getUint32(payload + 1, true);
          result.width = (bits & 0x3f_ff) + 1;
          result.height = ((bits >> 14) & 0x3f_ff) + 1;
        }
        result.hasAlpha ??= ((view.getUint32(payload + 1, true) >> 28) & 1) === 1;
        break;
      }
      case 'ANMF': {
        result.pages += 1;
        break;
      }
      case 'EXIF': {
        result.orientation = readExifOrientation(bytes, payload, payload + size);
        break;
      }
    }

    // Chunks are padded to an even length.
    offset = payload + size + (size % 2);
  }

  result.pages = Math.max(1, result.pages);
  return result;
};

// ---------------------------------------------------------------- others

const sniffBmp = (bytes: Uint8Array): SniffResult => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    format: 'bmp',
    hasAlpha: false,
    // Height is signed: a negative value means the rows are stored top-down.
    height: Math.abs(view.getInt32(22, true)),
    pages: 1,
    width: Math.abs(view.getInt32(18, true)),
  };
};

const sniffTiff = (bytes: Uint8Array): SniffResult => ({
  format: 'tiff',
  orientation: readExifOrientation(bytes, 0, bytes.length),
  pages: 1,
});

const HEIF_BRANDS: Record<string, ImageFormat> = {
  avif: 'avif',
  avis: 'avif',
  heic: 'heif',
  heim: 'heif',
  heis: 'heif',
  heix: 'heif',
  hevc: 'heif',
  mif1: 'heif',
  msf1: 'heif',
};

const looksLikeSvg = (bytes: Uint8Array) => {
  const head = ascii(bytes, 0, Math.min(bytes.length, 1024)).trimStart();
  return head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'));
};

/**
 * Identify the container and read whatever the header can tell us cheaply.
 * Returns `{ pages: 1 }` with no format for bytes we do not recognise — the
 * caller then falls back to decoding, which is the real arbiter anyway.
 */
export const sniffImage = (bytes: Uint8Array): SniffResult => {
  if (bytes.length < 16) return { pages: 1 };

  if (startsWith(bytes, PNG_SIGNATURE)) return sniffPng(bytes);
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return sniffJpeg(bytes);
  if (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a') return sniffGif(bytes);
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') return sniffWebp(bytes);
  if (ascii(bytes, 0, 2) === 'BM') return sniffBmp(bytes);
  if (ascii(bytes, 0, 4) === 'II*\0' || ascii(bytes, 0, 4) === 'MM\0*') {
    return sniffTiff(bytes);
  }
  if (startsWith(bytes, [0x00, 0x00, 0x01, 0x00])) return { format: 'ico', pages: 1 };
  if (ascii(bytes, 4, 4) === 'ftyp') {
    const format = HEIF_BRANDS[ascii(bytes, 8, 4)];
    if (format) return { format, pages: 1 };
  }
  if (looksLikeSvg(bytes)) return { format: 'svg', pages: 1 };

  return { pages: 1 };
};
