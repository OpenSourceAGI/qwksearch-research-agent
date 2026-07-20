import { KokoroTTS } from "./kokoro.js";
import { splitTextSmart } from "./semantic-split.js";

async function detectWebGPU() {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch (e) {
        return false;
    }
}

const device = (await detectWebGPU()) ? "webgpu" : "wasm";
self.postMessage({ status: "device", device });

let model_id = "onnx-community/Kokoro-82M-v1.0-ONNX";

const chunkQueue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || chunkQueue.length === 0) return;
    
    isProcessing = true;
    const { chunk, voice } = chunkQueue.shift();
    
    try {
        console.log("Processing chunk", chunk);
        const audio = await tts.generate(chunk, { voice });
        let ab = audio.audio.buffer;
        console.log("generate done");
        self.postMessage({ status: "stream", audio: ab, text: chunk }, [ab]);
    } catch (error) {
        console.error("Error processing chunk:", error);
        self.postMessage({ status: "error", error: error.message });
    }
    
    isProcessing = false;
    
    if (chunkQueue.length > 0) {
        processQueue();
    } else {
        self.postMessage({ status: "complete" });
    }
}

const tts = await KokoroTTS.from_pretrained(model_id, {
    dtype: device === "wasm" ? "q8" : "fp32",
    device,
    progress_callback: (progress) => {
        // Report progress to main thread
        self.postMessage({ status: "progress", progress });
    }
}).catch((e) => {
    self.postMessage({ status: "error", error: e.message });
    throw e;
});

self.postMessage({ status: "ready", voices: tts.voices, device });

self.addEventListener("message", async (e) => {
    const { text, voice } = e.data;
    let chunks = splitTextSmart(text, 600);

    for (const chunk of chunks) {
        chunkQueue.push({ chunk, voice });
    }
    
    processQueue();
});

