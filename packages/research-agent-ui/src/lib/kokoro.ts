'use client';

// Dynamic import to avoid SSR bundling issues
let KokoroTTS: any = null;
let kokoroAvailable = false;

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

type DeviceMode = 'wasm' | 'webgpu';
type DType = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';

interface Backend {
  device: DeviceMode;
  dtype: DType;
}

const WEBGPU_BACKEND: Backend = { device: 'webgpu', dtype: 'fp32' };
const WASM_BACKEND: Backend = { device: 'wasm', dtype: 'q8' };

let ttsPromise: Promise<any> | null = null;
let chosenDevice: DeviceMode | null = null;

function supportsWebGPU() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

// Actually confirm a usable GPU adapter exists. `'gpu' in navigator` is true in
// many environments (headless/Linux Chrome, browsers behind flags, locked-down
// corporate profiles) where `requestAdapter()` still resolves to null. Relying
// on the property alone makes the WebGPU model load throw with no way to
// recover, which is the most common "model won't load" symptom.
async function hasWorkingWebGPU(): Promise<boolean> {
  if (!supportsWebGPU()) return false;
  try {
    const adapter = await (navigator as any).gpu.requestAdapter();
    return adapter != null;
  } catch {
    return false;
  }
}

export function getRecommendedBackend(): Backend {
  return supportsWebGPU() ? WEBGPU_BACKEND : WASM_BACKEND;
}

async function loadModel(): Promise<any> {
  if (!KokoroTTS) {
    try {
      const mod = await import('kokoro-js');
      KokoroTTS = mod.KokoroTTS;
      kokoroAvailable = true;
    } catch (err) {
      kokoroAvailable = false;
      console.warn('Kokoro.js not available, will use server-side TTS:', err instanceof Error ? err.message : String(err));
      throw new Error('Kokoro.js library not available');
    }
  }

  // Try the best available backend first, but always keep WASM as a fallback so
  // a WebGPU failure (unsupported op, OOM, driver issue) still produces audio.
  const backends: Backend[] = [];
  if (await hasWorkingWebGPU()) backends.push(WEBGPU_BACKEND);
  backends.push(WASM_BACKEND);

  let lastErr: unknown;
  for (const backend of backends) {
    try {
      const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        device: backend.device,
        dtype: backend.dtype,
      });
      chosenDevice = backend.device;
      return tts;
    } catch (err) {
      lastErr = err;
      console.warn(
        `Kokoro model failed to load on "${backend.device}" backend:`,
        err,
      );
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error('Failed to load Kokoro model');
}

export async function preloadKokoro() {
  if (!ttsPromise) {
    ttsPromise = loadModel().catch((err) => {
      // Never cache a rejected promise: reset it so a later call can retry
      // (e.g. after a transient network failure) instead of permanently
      // returning the same rejection until the page is reloaded.
      ttsPromise = null;
      throw err;
    });
  }

  return ttsPromise;
}

export async function getKokoro() {
  return preloadKokoro();
}

export async function getVoiceList(): Promise<string[]> {
  const tts = await getKokoro();
  return tts.list_voices();
}

export function getLoadedBackend() {
  return chosenDevice;
}

export function isKokoroAvailable() {
  return kokoroAvailable;
}
