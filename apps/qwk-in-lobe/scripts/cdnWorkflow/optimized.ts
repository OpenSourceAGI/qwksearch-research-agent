/**
 * Still on `sharp`, deliberately: `opimizedGif` re-encodes an animated GIF into
 * an animated WebP, which the Photon WASM codec that replaced `sharp` at
 * runtime cannot do (it decodes a single frame). This is a Node-only build
 * script and never reaches the Workers bundle, so the native dependency is
 * fine here.
 */
import sharp from 'sharp';

const WIDTH = 1600;

export const opimized = async (
  inputBuffer: ArrayBuffer,
  width: number = WIDTH,
): Promise<Buffer> => {
  return await sharp(inputBuffer).resize({ width, withoutEnlargement: true }).webp().toBuffer();
};

export const opimizedGif = async (inputBuffer: ArrayBuffer): Promise<Buffer> => {
  try {
    return await sharp(inputBuffer, { animated: true }).webp().toBuffer();
  } catch {
    return await sharp(inputBuffer, { animated: true, limitInputPixels: false }).webp().toBuffer();
  }
};
