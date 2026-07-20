'use client';

import { KokoroTTS } from '@huggingface/transformers';

type DeviceMode = 'wasm' | 'webgpu';
type DType = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';

interface Backend {
  device: DeviceMode;
  dtype: DType;
}

const WEBGPU_BACKEND: Backend = { device: 'webgpu', dtype: 'fp32' };
const WASM_BACKEND: Backend = { device: 'wasm', dtype: 'q8' };

const MODEL_ID = 'hexgrad/Kokoro-82M';

let ttsPromise: Promise<any> | null = null;
let chosenDevice: DeviceMode | null = null;

function supportsWebGPU() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

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
  return Object.keys(tts.voices);
}

export function getLoadedBackend() {
  return chosenDevice;
}
