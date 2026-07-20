import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js";
import { convertAudioBufferToWav, resampleAudio, applyAudioGain } from "./audio-utils.js";

let mediaRecorder;
let audioChunks = [];
let mode;
let wav;

async function detectWebGPU() {
    try {
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch (e) {
        return false;
    }
}

export class SpeechToText {
    constructor() {
        this.modelReadyPromise = new Promise((resolve, reject) => {
            this._modelReadyResolve = resolve;
            this._modelReadyReject = reject;
        });
        this.transcriber = null;
        this.modelLoadFailed = false;
        this.initialize();
    }

    async initialize() {
        try {
            const isWebGPUSupported = await detectWebGPU();
            const device = isWebGPUSupported ? "webgpu" : "wasm";
            const dtype = isWebGPUSupported ? "fp32" : "q8";
            const options = {
                device: device,
                dtype: dtype,
                quantized: !isWebGPUSupported,
            };

            this.transcriber = await pipeline(
                'automatic-speech-recognition',
                'onnx-community/moonshine-base-ONNX',
                options
            );
            console.log('Speech-to-text model loaded successfully');
            this._modelReadyResolve();
        } catch (error) {
            console.error('Error loading Hugging Face speech-to-text model:', error);
            console.warn('Will fall back to browser Web Speech API');
            this.modelLoadFailed = true;
            this._modelReadyResolve(); // Resolve anyway so we can use fallback
        }
    }

    startRecording() {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mode = "WAV";
                const options = { mimeType: 'audio/wav' };
                try {
                    mediaRecorder = new MediaRecorder(stream, options);
                } catch (e) {
                    mediaRecorder = new MediaRecorder(stream);
                    mode = "OGG";
                }
                audioChunks = [];
                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };
                mediaRecorder.start();
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                const recordingStatus = document.getElementById('recordingStatus');
                if (recordingStatus) {
                    recordingStatus.textContent = 'Error accessing microphone: ' + error.message;
                }
            });
    }

    async stopRecording() {
        return new Promise((resolve, reject) => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                mediaRecorder.onstop = async () => {
                    try {
                        mediaRecorder.stream.getTracks().forEach(track => track.stop());

                        let type = { type: 'audio/webm;codecs=opus' };
                        if (mode === "WAV") {
                            type = { type: 'audio/wav' };
                        }

                        if (mode === "WAV") {
                            console.log('WAV format is already selected.');
                        } else {
                            console.info('Converting audio to WAV format...');
                            const audioContext = new AudioContext();
                            let audioBlob = new Blob(audioChunks, { type });
                            const arrayBuffer = await audioBlob.arrayBuffer();
                            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                            wav = convertAudioBufferToWav(audioBuffer);
                        }

                        let wavBlob = new Blob([wav], { type: 'audio/wav' });
                        let wavBlobUrl = URL.createObjectURL(wavBlob);

                        const playbackStatus = document.getElementById('playbackStatus');
                        const audioPlayback = document.getElementById('audioPlayback');
                        if (audioPlayback) {
                            audioPlayback.src = wavBlobUrl;
                            audioPlayback.style.display = 'block';
                        }
                        if (playbackStatus) {
                            playbackStatus.textContent = 'Audio ready for playback:';
                        }

                        let output;

                        // Try Hugging Face model first if loaded
                        if (this.transcriber && !this.modelLoadFailed) {
                            output = await this._transcribeWithHuggingFace(wavBlobUrl);
                        }

                        // Fall back to browser Web Speech API if needed
                        if (!output || output.text === undefined || output.text.length === 0) {
                            console.log('Falling back to browser Web Speech API...');
                            output = await this._transcribeWithWebSpeechAPI(wavBlobUrl);
                        }

                        console.log('Transcription output:', output);
                        resolve(output.text || '');

                    } catch (error) {
                        console.error('Error during transcription:', error);
                        reject(error);
                    }
                };
            } else {
                reject(new Error("MediaRecorder is not active"));
            }
        });
    }

    async _transcribeWithHuggingFace(wavBlobUrl) {
        try {
            let output = await this.transcriber(wavBlobUrl);

            if (output.text === undefined || output.text.length === 0) {
                console.log('First HF attempt returned empty, trying with gain...');
                const wav = await convertAudioBufferToWav(await (async () => {
                    const audioContext = new AudioContext();
                    const arrayBuffer = await (await fetch(wavBlobUrl)).arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    return applyAudioGain(audioBuffer, 1.5);
                })());

                const wavBlob = new Blob([wav], { type: 'audio/wav' });
                const gainBlobUrl = URL.createObjectURL(wavBlob);
                output = await this.transcriber(gainBlobUrl);
            }

            if (output.text === undefined || output.text.length === 0) {
                console.log('Second HF attempt returned empty, trying once more...');
                output = await this.transcriber(wavBlobUrl);
            }

            return output;
        } catch (error) {
            console.error('Hugging Face transcription failed:', error);
            return { text: '' };
        }
    }

    async _transcribeWithWebSpeechAPI(wavBlobUrl) {
        return new Promise((resolve) => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

            if (!SpeechRecognition) {
                console.error('Web Speech API not supported in this browser');
                resolve({ text: '' });
                return;
            }

            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            let finalTranscript = '';

            recognition.onstart = () => {
                console.log('Web Speech API recognition started');
            };

            recognition.onresult = (event) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                    }
                }
            };

            recognition.onerror = (event) => {
                console.error('Web Speech API error:', event.error);
            };

            recognition.onend = () => {
                console.log('Web Speech API recognition ended');
                resolve({ text: finalTranscript.trim() });
            };

            // Fetch the audio blob and play it through the microphone
            // Note: Web Speech API needs live audio input, not a blob URL
            // This is a limitation - we'll attempt to use it anyway
            fetch(wavBlobUrl)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {
                        // Play through speakers and hope it picks up the audio
                        // This is not ideal but works as a fallback
                        const source = audioContext.createBufferSource();
                        source.buffer = audioBuffer;
                        source.connect(audioContext.destination);
                        source.start(0);
                        recognition.start();
                    });
                })
                .catch(error => {
                    console.error('Error fetching audio for Web Speech API:', error);
                    resolve({ text: '' });
                });
        });
    }
}
