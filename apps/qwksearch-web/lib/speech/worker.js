/**
 * Web Worker for TTS model loading and audio generation
 * Runs in a separate thread to avoid blocking the main UI
 */

import { KokoroTTS } from './KokoroTTS.js';

let ttsInstance = null;
let modelLoading = false;

/**
 * Initialize and load the TTS model
 */
async function initializeModel() {
  if (ttsInstance) {
    return;
  }

  if (modelLoading) {
    // Wait for the model to finish loading
    while (modelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return;
  }

  modelLoading = true;

  try {
    // Determine backend based on available resources
    let device = 'wasm';
    let dtype = 'q8';

    // Check if WebGPU is available
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const adapter = await navigator.gpu.requestAdapter();
        if (adapter) {
          device = 'webgpu';
          dtype = 'fp32';
        }
      } catch (err) {
        console.warn('WebGPU not available, falling back to WASM');
      }
    }

    self.postMessage({
      status: 'device',
      device: device,
      dtype: dtype
    });

    // Load the model
    ttsInstance = await KokoroTTS.from_pretrained(
      'hexgrad/Kokoro-82M',
      {
        device: device,
        dtype: dtype,
        progress_callback: (progress) => {
          self.postMessage({
            status: 'progress',
            progress: progress
          });
        }
      }
    );

    // Signal that the model is ready
    self.postMessage({
      status: 'ready'
    });

  } catch (error) {
    console.error('Failed to initialize TTS model:', error);
    self.postMessage({
      status: 'error',
      error: error.message
    });
  } finally {
    modelLoading = false;
  }
}

/**
 * Handle messages from the main thread
 */
self.onmessage = async (e) => {
  const { type, text, voice } = e.data;

  if (type === 'generate') {
    try {
      // Ensure model is loaded
      if (!ttsInstance) {
        await initializeModel();
      }

      if (!ttsInstance) {
        throw new Error('TTS model failed to initialize');
      }

      // Generate audio
      const audio = await ttsInstance.generate(text, {
        voice: voice || 'af',
        speed: 1.0
      });

      // Send audio back to main thread
      self.postMessage({
        status: 'stream',
        audio: audio.data
      });

    } catch (error) {
      console.error('Error generating audio:', error);
      self.postMessage({
        status: 'error',
        error: error.message
      });
    }
  }
};

// Initialize model when worker starts
initializeModel().catch(error => {
  console.error('Failed to initialize model on worker startup:', error);
});
