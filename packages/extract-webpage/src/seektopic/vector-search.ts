import grab from "grab-url";

/**
 * Text embeddings convert words or phrases into numerical vectors in a high-dimensional
 * space, where each dimension represents a semantic feature extracted by a model like
 * MiniLM-L6-v2. In this concept space, words with similar meanings have vectors that
 * are close together, allowing for quantitative comparisons of semantic similarity.
 * These vector representations enable powerful applications in natural language processing,
 * including semantic search, text classification, and clustering, by leveraging the
 * geometric properties of the embedding space to capture and analyze the relationships
 * between words and concepts.
 * [Text Embeddings, Classification, and Semantic Search
 *  (Youtube)](https://www.youtube.com/watch?v=sNa_uiqSlJo&t=129s)
 *
 * <img src="https://i.imgur.com/wtJqEqX.png" width="350" />
 * @param {string} text - The text to embed.
 * @param {Object} [options]
 * @param {AutoTokenizer} options.pipeline
 *  - The pipeline to use for embedding.
 * @param {number} options.precision default=4 - The number of decimal places to round to.
 * @returns {Promise<{embeddingsDict: Object.<string, number[]>, embedding: number[]}>}
 * @category Similarity
 */
export async function convertTextToEmbedding(
  text: string | string[],
  options: any = {},
) {
  var { precision = 4, pipeline } = options;

  if (!pipeline) pipeline = await getEmbeddingModel();

  const embedding = await pipeline(text, { pooling: "mean", normalize: true });

  // Check if input was an array to determine output format
  if (Array.isArray(text)) {
    return embedding
      .tolist()
      .map((vec) => vec.map((num) => parseFloat(num.toFixed(precision))));
  } else {
    const roundedEmbedding = Array.from((embedding as any).data).map(
      (num: any) => parseFloat((num as any).toFixed(precision)),
    );
    return roundedEmbedding;
  }
}

/**
 * Calculate the semantic similarity between one text and a list of
 * other sentences by comparing their embeddings.
 * https://huggingface.co/docs/api-inference/detailed_parameters#sentence-similarity-task
 *
 * <img src="https://i.imgur.com/ex2UWnu.png" width="350px" />
 * @param {string} source_sentence The string that you wish to
 * compare the other strings with. This can be a phrase, sentence,
 * or longer passage, depending on the model being used.
 * @param {Array<string>} sentences A list of strings which will be compared
 * against the source_sentence.
 * @param {Object} [options]
 * @param {string} options.model default="sentence-transformers/all-MiniLM-L6-v2"
 * @param {string} options.HF_API_KEY Required https://huggingface.co/settings/tokens
 * @returns array of 0-1 similarity scores for each sentence
 * @category Similarity
 */
export async function weighRelevanceConceptVectorAPI(
  source_sentence,
  sentences,
  options = {},
) {
  var { model = "sentence-transformers/all-MiniLM-L6-v2", HF_API_KEY = "" } =
    options as any;

  if (!HF_API_KEY) return { error: "No API key" };

  const url = `https://api-inference.huggingface.co/models/${model}`;
  try {
    return await grab(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: {
          source_sentence,
          sentences,
        },
      }),
    });
  } catch (error) {
    console.error("API request failed:", error);
    return null;
  }
}

/**
 * Initialize HuggingFace Transformers pipeline for embedding text.
 *
 * <img src="https://i.imgur.com/3R5Tsrf.png" width="350px" />
 * @param {Object} [options]
 * @param {string} options.pipelineName default "feature-extraction",
 * @param {string} options.modelName default="Xenova/all-MiniLM-L6-v2" -
 * The name of the model to use
 * @returns {Promise<import("@huggingface/transformers").AutoTokenizer>} The pipeline.
 * @category Similarity
 */
export async function getEmbeddingModel(options: any = {}) {
  const { pipeline } = await (import("@huggingface/transformers") as Promise<any>);
  const {
    pipelineName = "feature-extraction",
    modelName = "Xenova/all-MiniLM-L6-v2",
    quantized = true,
    gpu = false,
  } = options;

  return await pipeline(pipelineName, modelName, {
    quantized,
    dtype: "fp32",
    device: gpu ? "webgpu" : "cpu",
  } as any);
}

/**
 * [Cosine similarity](https://en.wikipedia.org/wiki/Cosine_similarity) gets similarity of two
 * vectors by whether they have the same direction (similar) or are poles apart. Cosine similarity
 * is often used with text representations to compare how similar two documents or sentences
 * are to each other. The output of cosine similarity ranges from -1 to 1, where -1 means the
 * two vectors are completely dissimilar, and 1 indicates maximum similarity.
 * @param {Array<number>} vectorA
 * @param {Array<number>} vectorB
 * @returns {number} -1 to 1 similarity score
 */
export function calculateCosineSimilarity(vectorA, vectorB) {
  return (
    vectorA.reduce((sum, a, i) => sum + a * vectorB[i], 0) /
    (Math.sqrt(vectorA.reduce((sum, a) => sum + a * a, 0)) *
      Math.sqrt(vectorB.reduce((sum, b) => sum + b * b, 0)))
  );
}

///OLDER ======================
/**
 * Rerank documents's chunks based on relevance to query,
 * based on cosine similarity of their concept vectors generated
 * by a 20MB MiniLM transformer model downloaded locally.
 *
 * [A Complete Overview of Word Embeddings](https://www.youtube.com/watch?v=5MaWmXwxFNQ&t=323s)
 * @param {Array<string>} documents
 * @param {string} query
 * @param {Object} [options]
 * @returns {Promise<Array<{content: string, similarity: number}>>}
 * @category Similarity
 */
export async function weighRelevanceConceptVector(
  documents,
  query,
  options = {},
) {
  const docEmbeddings = await convertTextToEmbedding(documents, options);

  const queryEmbedding = await convertTextToEmbedding(query, options);

  let sortedDocs = docEmbeddings
    .map((docEmbedding, i) => ({
      index: i,
      similarity: calculateCosineSimilarity(queryEmbedding, docEmbedding),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ index, similarity }) => ({
      content: documents[index],
      similarity,
    }));

  return sortedDocs;
}

/**
 * Rerank documents's chunks based on relevance to multiple queries,
 * optimizing by embedding documents only once.
 *
 * @param {Array<string>} documents
 * @param {Array<string>} queries
 * @param {Object} [options]
 * @returns {Promise<Object<string, Array<{content: string, similarity: number}>>>}
 * @category Similarity
 */
export async function weighRelevanceConceptVectorMultiple(
  documents,
  queries,
  options = {},
) {
  if (!documents || documents.length === 0 || !queries || queries.length === 0)
    return {};

  const pipeline = (options as any).pipeline;
  const embedder = pipeline || (await getEmbeddingModel(options));

  // Embed documents once
  const docEmbeddings = await convertTextToEmbedding(documents, {
    ...options,
    pipeline: embedder,
  });
  // Embed all queries at once
  const queryEmbeddings = await convertTextToEmbedding(queries, {
    ...options,
    pipeline: embedder,
  });

  // Ensure queryEmbeddings is a 2D array even if queries was a single string wrapped in an array
  const qEmbeds = Array.isArray(queryEmbeddings[0])
    ? queryEmbeddings
    : [queryEmbeddings];

  const resultsByQuery = {};

  queries.forEach((query, qIdx) => {
    const queryEmbedding = qEmbeds[qIdx];

    let sortedDocs = docEmbeddings
      .map((docEmbedding, i) => ({
        index: i,
        similarity: calculateCosineSimilarity(queryEmbedding, docEmbedding),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .map(({ index, similarity }) => ({
        content: documents[index],
        similarity,
      }));

    resultsByQuery[query] = sortedDocs;
  });

  return resultsByQuery;
}
