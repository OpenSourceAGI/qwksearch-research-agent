import { StyleTextToSpeech2Model, AutoTokenizer, Tensor, RawAudio } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js";
//import { StyleTextToSpeech2Model, AutoTokenizer, Tensor, RawAudio } from "@huggingface/transformers";


import { phonemize } from "./phonemize.js";
import { getVoiceData, VOICES } from "./voices.js";

const STYLE_DIM = 256;
const SAMPLE_RATE = 24000;

export class KokoroTTS {
  /**
   * Create a new KokoroTTS instance.
   * @param {import('@huggingface/transformers').StyleTextToSpeech2Model} model The model
   * @param {import('@huggingface/transformers').PreTrainedTokenizer} tokenizer The tokenizer
   */
  constructor(model, tokenizer) {
    this.model = model;
    this.tokenizer = tokenizer;
  }

  /**
   * Load a KokoroTTS model from the Hugging Face Hub.
   * @param {string} model_id The model id
   * @param {Object} options Additional options
   * @param {"fp32"|"fp16"|"q8"|"q4"|"q4f16"} [options.dtype="fp32"] The data type to use.
   * @param {"wasm"|"webgpu"|"cpu"|null} [options.device=null] The device to run the model on.
   * @param {import("@huggingface/transformers").ProgressCallback} [options.progress_callback=null] A callback function that is called with progress information.
   * @returns {Promise<KokoroTTS>} The loaded model
   */
  static async from_pretrained(model_id, { dtype = "fp32", device = null, progress_callback = null } = {}) {
    const model = StyleTextToSpeech2Model.from_pretrained(model_id, { progress_callback, dtype, device });
    const tokenizer = AutoTokenizer.from_pretrained(model_id, { progress_callback });

    const info = await Promise.all([model, tokenizer]);
    return new KokoroTTS(...info);
  }

  get voices() {
    return VOICES;
  }

  list_voices() {
    console.table(VOICES);
  }

  /**
   * Generate audio from text.
   *
   * Note: The model will be loaded on the first call, and subsequent calls will use the same model.
   * @param {string} text The input text
   * @param {Object} options Additional options
   * @param {keyof typeof VOICES} [options.voice="af"] The voice style to use
   * @param {number} [options.speed=1] The speaking speed
   * @returns {Promise<RawAudio>} The generated audio
   */
  async generate(text, { voice = "af", speed = 1 } = {}) {
    if (!VOICES.hasOwnProperty(voice)) {
      console.error(`Voice "${voice}" not found. Available voices:`);
      console.table(VOICES);
      throw new Error(`Voice "${voice}" not found. Should be one of: ${Object.keys(VOICES).join(", ")}.`);
    }

    const language = voice.at(0); // "a" or "b"
    const phonemes = await phonemize(text, language);
    const { input_ids } = this.tokenizer(phonemes, {
      truncation: true,
    });

    // Select voice style based on number of input tokens
    const num_tokens = Math.max(
      input_ids.dims.at(-1) - 2, // Without padding;
      0,
    );

    // Load voice style
    const data = await getVoiceData(voice);
    const offset = num_tokens * STYLE_DIM;
    const voiceData = data.slice(offset, offset + STYLE_DIM);

    // Prepare model inputs
    const inputs = {
      input_ids,
      style: new Tensor("float32", voiceData, [1, STYLE_DIM]),
      speed: new Tensor("float32", [speed], [1]),
    };

    // Generate audio
    const { waveform } = await this.model(inputs);

    return new RawAudio(waveform.data, SAMPLE_RATE);
  }
}
