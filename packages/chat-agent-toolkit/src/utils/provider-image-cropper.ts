/**
 * @fileoverview Crops a single provider's icon out of a shared sprite-sheet image.
 *
 * The sprite sheet is a 6-column by 4-row grid of provider logos; each provider's
 * grid position is looked up in `PROVIDERS` and rendered onto a canvas, which can
 * then be returned as a canvas, Blob, or data URL.
 */
const PROVIDERS = {
  openrouter: { row: 0, col: 0 },
  tongyi: { row: 0, col: 1 },
  ollama: { row: 0, col: 2 },
  huggingface: { row: 0, col: 3 },
  localai: { row: 0, col: 4 },
  openllm: { row: 0, col: 5 },
  zhipu: { row: 1, col: 0 },
  replicate: { row: 1, col: 1 },
  azure: { row: 1, col: 2 },
  anthropic: { row: 1, col: 3 },
  groq: { row: 1, col: 4 },
  sagemaker: { row: 1, col: 5 },
  "01ai": { row: 2, col: 0 },
  bedrock: { row: 2, col: 1 },
  openai: { row: 2, col: 2 },
  cohere: { row: 2, col: 3 },
  together: { row: 2, col: 4 },
  xorbits: { row: 2, col: 5 },
  wenxin: { row: 3, col: 0 },
  moonshot: { row: 3, col: 1 },
  gemini: { row: 3, col: 2 },
  mistral: { row: 3, col: 3 },
  jina: { row: 3, col: 4 },
  chatglm: { row: 3, col: 5 },
} as const;

export type Provider = keyof typeof PROVIDERS;

const COLS = 6;
const ROWS = 4;

/**
 * Returns a cropped canvas containing just the provider box.
 */
export async function cropProvider(
  image: HTMLImageElement | ImageBitmap,
  provider: Provider
): Promise<HTMLCanvasElement> {
  if (!(provider in PROVIDERS)) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const { row, col } = PROVIDERS[provider];

  const tileWidth = image.width / COLS;
  const tileHeight = image.height / ROWS;

  const canvas = document.createElement("canvas");
  canvas.width = tileWidth;
  canvas.height = tileHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context");
  }

  ctx.drawImage(
    image,
    col * tileWidth,
    row * tileHeight,
    tileWidth,
    tileHeight,
    0,
    0,
    tileWidth,
    tileHeight
  );

  return canvas;
}

/**
 * Returns the provider image as a Blob.
 */
export async function cropProviderAsBlob(
  image: HTMLImageElement | ImageBitmap,
  provider: Provider,
  type: "image/png" | "image/jpeg" | "image/webp" = "image/png",
  quality?: number
): Promise<Blob> {
  const canvas = await cropProvider(image, provider);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Returns the provider image as a data URL.
 */
export async function cropProviderAsDataURL(
  image: HTMLImageElement | ImageBitmap,
  provider: Provider,
  type: "image/png" | "image/jpeg" | "image/webp" = "image/png",
  quality?: number
): Promise<string> {
  const canvas = await cropProvider(image, provider);
  return canvas.toDataURL(type, quality);
}

/**
 * Helper to load and crop in one call.
 */
export async function getProviderImage(
  spriteSheetUrl: string,
  provider: Provider
): Promise<HTMLCanvasElement> {
  const img = new Image();
  img.src = spriteSheetUrl;
  await img.decode();
  return cropProvider(img, provider);
}

/**
 * Get all available provider names.
 */
export function getProviderNames(): Provider[] {
  return Object.keys(PROVIDERS) as Provider[];
}
