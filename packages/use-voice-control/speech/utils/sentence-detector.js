
/**
 * Utility functions for detecting sentence boundaries in streaming text
 */

// These are common sentence ending patterns
const SENTENCE_PATTERNS = {
  // Basic sentence endings: period, exclamation, question mark followed by space or end
  basicEnd: /[.!?][\s"')\]]*($|(?=\s*[A-Z]))/,
  
  // Dialog endings: quote followed by punctuation and space or end
  dialogEnd: /["'][,.!?][\s"')\]]*($|(?=\s*[A-Z]))/,
  
  // List item or enumeration endings: semicolon, colon
  listItemEnd: /[;:][\s]*($|(?=\s*[-•*]))/,
  
  // Paragraph breaks: double newline
  paragraphBreak: /\n\s*\n/,
  
  // Force breaks for very long text without clear sentence boundaries
  longText: (text) => text.length > 150
};

/**
 * Determines if a text contains a complete sentence or should be sent for TTS
 * @param {string} text - The text to check
 * @param {Object} options - Configuration options
 * @returns {boolean} - True if the text contains a complete sentence or should be spoken
 */
export function isCompleteSentence(text) {
  if (!text || text.trim().length === 0) {
    return false;
  }
  
  // Check all patterns
  return (
    SENTENCE_PATTERNS.basicEnd.test(text) ||
    SENTENCE_PATTERNS.dialogEnd.test(text) ||
    SENTENCE_PATTERNS.listItemEnd.test(text) ||
    SENTENCE_PATTERNS.paragraphBreak.test(text) ||
    SENTENCE_PATTERNS.longText(text)
  );
}

/**
 * Process streaming text and return complete sentences
 * 
 * @param {string} accumulator - The text accumulated so far
 * @param {string} newContent - The new content to add
 * @returns {Object} - Object with processed results:
 *   - sentences: Array of complete sentences to speak
 *   - remainder: Remaining text that doesn't form a complete sentence yet
 */
export function processStreamingText(accumulator, newContent) {
  const combinedText = accumulator + newContent;
  
  // If the text is empty, just return
  if (!combinedText || combinedText.trim().length === 0) {
    return { sentences: [], remainder: '' };
  }
  
  // Split text by common sentence boundaries to check for multiple sentences
  const parts = combinedText.split(/(?<=[.!?][\s"')\]])/);
  
  // If we only have one part and it's not a complete sentence
  if (parts.length === 1 && !isCompleteSentence(parts[0])) {
    return { sentences: [], remainder: combinedText };
  }
  
  // Otherwise process all parts
  const sentences = [];
  let currentSentence = '';
  
  for (let i = 0; i < parts.length; i++) {
    currentSentence += parts[i];
    
    // If this forms a complete sentence or is the last part that should be spoken
    if (isCompleteSentence(currentSentence) || 
        (i === parts.length - 1 && SENTENCE_PATTERNS.longText(currentSentence))) {
      sentences.push(currentSentence.trim());
      currentSentence = '';
    }
  }
  
  return { 
    sentences,
    remainder: currentSentence
  };
}
