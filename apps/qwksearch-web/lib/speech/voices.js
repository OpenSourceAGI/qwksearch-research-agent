/**
 * Voice definitions and voice data for Kokoro TTS
 * Each voice has precomputed style embeddings
 */

export const VOICES = {
  // Female voices - English (a)
  'af': { name: 'Af', language: 'a', description: 'Female voice A' },
  'af_heart': { name: 'Af Heart', language: 'a', description: 'Female voice with heart' },
  'af_alloy': { name: 'Af Alloy', language: 'a', description: 'Female voice alloy' },
  'af_aoede': { name: 'Af Aoede', language: 'a', description: 'Female voice aoede' },
  'af_bella': { name: 'Af Bella', language: 'a', description: 'Female voice bella' },
  'af_jessica': { name: 'Af Jessica', language: 'a', description: 'Female voice jessica' },
  'af_nicole': { name: 'Af Nicole', language: 'a', description: 'Female voice nicole' },
  'af_river': { name: 'Af River', language: 'a', description: 'Female voice river' },
  'af_sarah': { name: 'Af Sarah', language: 'a', description: 'Female voice sarah' },
  'af_sky': { name: 'Af Sky', language: 'a', description: 'Female voice sky' },

  // Male voices - English (a)
  'am': { name: 'Am', language: 'a', description: 'Male voice A' },
  'am_adam': { name: 'Am Adam', language: 'a', description: 'Male voice adam' },
  'am_echo': { name: 'Am Echo', language: 'a', description: 'Male voice echo' },
  'am_fable': { name: 'Am Fable', language: 'a', description: 'Male voice fable' },
  'am_fenrir': { name: 'Am Fenrir', language: 'a', description: 'Male voice fenrir' },
  'am_liam': { name: 'Am Liam', language: 'a', description: 'Male voice liam' },
  'am_michael': { name: 'Am Michael', language: 'a', description: 'Male voice michael' },
  'am_onyx': { name: 'Am Onyx', language: 'a', description: 'Male voice onyx' },

  // Additional language variants (b)
  'bf': { name: 'Bf', language: 'b', description: 'Female voice B' },
  'bm': { name: 'Bm', language: 'b', description: 'Male voice B' },
};

/**
 * Precomputed voice style embeddings
 * These are normally loaded from model files
 * For now, we'll fetch them from the HuggingFace model
 */
const voiceDataCache = new Map();

/**
 * Load voice style data for a specific voice
 * @param {string} voice - The voice key (e.g., 'af_heart')
 * @returns {Promise<Float32Array>} The voice style embeddings
 */
export async function getVoiceData(voice) {
  if (voiceDataCache.has(voice)) {
    return voiceDataCache.get(voice);
  }

  try {
    // Construct the URL to the voice data file
    // This assumes voice data is available in the HuggingFace model
    const url = `https://huggingface.co/hexgrad/Kokoro-82M/resolve/main/voices/${voice}.npy`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch voice data for ${voice}`);
    }

    // Parse numpy array format
    const buffer = await response.arrayBuffer();
    const data = new Float32Array(buffer);

    voiceDataCache.set(voice, data);
    return data;
  } catch (error) {
    console.error(`Error loading voice data for ${voice}:`, error);
    // Return a default/zero-initialized embedding as fallback
    const fallback = new Float32Array(256);
    voiceDataCache.set(voice, fallback);
    return fallback;
  }
}
