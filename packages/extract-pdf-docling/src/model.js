/**
 * @file model.js
 * @description Singleton loader for the Granite Docling ONNX vision model and processor.
 */
import {
    AutoProcessor,
    AutoModelForVision2Seq,
    load_image,
    TextStreamer,
} from "@huggingface/transformers";

export { load_image, TextStreamer };

const MODEL_ID = "onnx-community/granite-docling-258M-ONNX";

/** @type {any} */
let model = null;
/** @type {any} */
let processor = null;
/** @type {Promise<{model: any, processor: any}> | null} */
let initializationPromise = null;

/**
 * Returns the loaded model and processor, initializing them on first call.
 * Subsequent calls return the cached instance without re-loading.
 *
 * @returns {Promise<{model: any, processor: any}>}
 */
export async function initializeModel() {
    if (model && processor) return { model, processor };
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
        console.log("Initializing Granite Docling model...");
        processor = await AutoProcessor.from_pretrained(MODEL_ID);
        model = await AutoModelForVision2Seq.from_pretrained(MODEL_ID, {
            dtype: "fp32",
        });
        console.log("Model initialized successfully");
        return { model, processor };
    })();

    return initializationPromise;
}

/**
 * Returns true once the model and processor have been loaded.
 *
 * @returns {boolean}
 */
export function isModelLoaded() {
    return model !== null && processor !== null;
}

/**
 * Runs the vision model on a pre-loaded image and returns the generated text.
 *
 * @param {object} opts
 * @param {any}    opts.image      - Image object returned by `load_image`
 * @param {string} opts.prompt     - Instruction text sent alongside the image
 * @param {number} opts.maxTokens  - Maximum tokens to generate
 * @param {boolean} opts.streaming - Whether to collect tokens via TextStreamer
 * @returns {Promise<{generatedText: string, generated_ids: any}>}
 */
export async function generateFromImage({ image, prompt, maxTokens, streaming }) {
    const { model: m, processor: p } = await initializeModel();

    const messages = [{
        role: "user",
        content: [{ type: "image" }, { type: "text", text: prompt }],
    }];

    const text = p.apply_chat_template(messages, { add_generation_prompt: true });
    const inputs = await p(text, [image], { do_image_splitting: true });

    let generatedText = "";
    let generated_ids;

    if (streaming) {
        const streamer = new TextStreamer(p.tokenizer, {
            skip_prompt: true,
            skip_special_tokens: false,
            on_finalized_text: (chunk) => { generatedText += chunk; },
        });
        generated_ids = await m.generate({ ...inputs, max_new_tokens: maxTokens, streamer });
    } else {
        generated_ids = await m.generate({ ...inputs, max_new_tokens: maxTokens });
        const texts = p.batch_decode(
            generated_ids.slice(null, [inputs.input_ids.dims.at(-1), null]),
            { skip_special_tokens: true },
        );
        generatedText = texts[0];
    }

    return { generatedText, generated_ids };
}
