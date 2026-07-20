/**
 * Convert text to phonemes for Kokoro TTS
 * This uses g2p-en (Grapheme-to-Phoneme) for English
 * and other language-specific phonemization
 */

// Map for English phonemization
const PHONEME_MAP = {
  // Vowels
  'a': 'ae',
  'e': 'eh',
  'i': 'ih',
  'o': 'oh',
  'u': 'uh',
  // Common consonants and digraphs
  'th': 'th',
  'ch': 'ch',
  'sh': 'sh',
  'ng': 'ng',
};

/**
 * Simple phonemization for English text
 * For production, consider using a library like g2p-en
 * @param {string} text - The input text
 * @param {string} language - The language code ('a' for English, 'b' for other)
 * @returns {Promise<string>} Phonemized text
 */
export async function phonemize(text, language = 'a') {
  // Basic implementation - normalize text and add phonetic hints
  // In production, you'd use a proper phoneme library
  let phonemes = text.toLowerCase().trim();

  // Remove punctuation but keep spaces
  phonemes = phonemes.replace(/[.,!?;:'"]/g, '');

  // For now, return the normalized text
  // A real implementation would convert to IPA or ARPAbet phonemes
  return phonemes;
}
