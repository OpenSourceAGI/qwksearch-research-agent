'use client';

// Dynamic import to avoid SSR bundling issues
let KokoroTTS: any = null;

const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';

type DeviceMode = 'wasm' | 'webgpu';
type DType = 'fp32' | 'fp16' | 'q8' | 'q4' | 'q4f16';

let ttsPromise: Promise<any> | null = null;
let chosenDevice: DeviceMode | null = null;

function supportsWebGPU() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

export function getRecommendedBackend(): { device: DeviceMode; dtype: DType } {
  if (supportsWebGPU()) {
    return { device: 'webgpu', dtype: 'fp32' };
  }
  return { device: 'wasm', dtype: 'q8' };
}

export async function preloadKokoro() {
  if (!ttsPromise) {
    if (!KokoroTTS) {
      try {
        const mod = await import('kokoro-js');
        KokoroTTS = mod.KokoroTTS;
      } catch (err) {
        console.error('Failed to import kokoro-js:', err);
        throw new Error('Kokoro.js library not available');
      }
    }

    const { device, dtype } = getRecommendedBackend();
    chosenDevice = device;

    ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
      device,
      dtype,
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
