export function splitTextSmart(text, maxChunkLength = 500) {
  const paragraphChunks = text.split(/\n\s*\n/);
  const finalChunks = [];

  for (let para of paragraphChunks) {
    if (para.length <= maxChunkLength) {
      finalChunks.push(para.trim());
      continue;
    }

    const sentenceRegex = /(?<=[.?!])(?=\s+["“”'a-z])/gi;
    const sentences = para.split(sentenceRegex);

    let chunk = '';
    for (let sentence of sentences) {
      sentence = sentence.trim();

      if (sentence.length > maxChunkLength) {
        // Sentence too long — fallback split
        const subChunks = splitLongSentence(sentence, maxChunkLength);
        for (let sub of subChunks) {
          if ((chunk + ' ' + sub).length > maxChunkLength) {
            if (chunk) finalChunks.push(chunk.trim());
            chunk = sub;
          } else {
            chunk += (chunk ? ' ' : '') + sub;
          }
        }
        continue;
      }

      if ((chunk + ' ' + sentence).length > maxChunkLength) {
        if (chunk) finalChunks.push(chunk.trim());
        chunk = sentence;
      } else {
        chunk += (chunk ? ' ' : '') + sentence;
      }
    }
    if (chunk) finalChunks.push(chunk.trim());
  }

  return finalChunks;
}

export function splitLongSentence(sentence, maxLen) {
  const chunks = [];
  let current = '';

  const commaParts = sentence.split(/,\s*/);
  for (let part of commaParts) {
    if ((current + ', ' + part).length > maxLen) {
      if (current) chunks.push(current.trim());
      if (part.length > maxLen) {
        const words = part.split(/\s+/);
        let wordChunk = '';
        for (let word of words) {
          if ((wordChunk + ' ' + word).length > maxLen) {
            if (wordChunk) chunks.push(wordChunk.trim());
            wordChunk = word;
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }
        if (wordChunk) chunks.push(wordChunk.trim());
        current = '';
      } else {
        current = part;
      }
    } else {
      current += (current ? ', ' : '') + part;
    }
  }
  if (current) chunks.push(current.trim());

  return chunks;
}


function splitTextSmartOld(text, maxChunkLength = 500) {
  const paragraphChunks = text.split(/\n\s*\n/); // Step 1: split on double returns
  const finalChunks = [];

  for (let para of paragraphChunks) {
    if (para.length <= maxChunkLength) {
      finalChunks.push(para.trim());
      continue;
    }

    // Step 2: Further split on sentence boundaries if too long
    const sentenceRegex = /(?<=[.?!])(?=\s+["“”'a-z])/gi;
    const sentences = para.split(sentenceRegex);

    let chunk = '';
    for (let sentence of sentences) {
      sentence = sentence.trim();
      if ((chunk + ' ' + sentence).length > maxChunkLength) {
        if (chunk) finalChunks.push(chunk.trim());
        chunk = sentence;
      } else {
        chunk += (chunk ? ' ' : '') + sentence;
      }
    }
    if (chunk) finalChunks.push(chunk.trim());
  }

  return finalChunks;
}
