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
        // Create a promise that will resolve when the model is loaded
        this.modelReadyPromise = new Promise((resolve, reject) => {
            this._modelReadyResolve = resolve;
            this._modelReadyReject = reject;
        });
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
                'onnx-community/moonshine-base-ONNX', // 'onnx-community/whisper-large-v3-turbo', 
                options
            );
            console.log('Speech-to-text model loaded successfully');
            // Resolve the promise to indicate the model is ready
            this._modelReadyResolve();
        } catch (error) {
            console.error('Error loading speech-to-text model:', error);
            this._modelReadyReject(error);
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
                    //console.info('WAV format not supported, using default format.');
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
                recordingStatus.textContent = 'Error accessing microphone: ' + error.message;
            });

    }


    async stopRecording() {
        return new Promise((resolve, reject) => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                mediaRecorder.onstop = async () => {
                    try {
                        mediaRecorder.stream.getTracks().forEach(track => track.stop());
                        // Create blob with WAV MIME type
                        let type = { type: 'audio/webm;codecs=opus' }
                        if (mode === "WAV") {
                            type = { type: 'audio/wav' };
                        }

                        if (mode === "WAV") {
                            console.log('WAV format is already selected.');
                        } else {
                            console.info('Converting audio to WAV format...');
                            const audioContext = new AudioContext();
                            let audioBlob = new Blob(audioChunks, { type: type });
                            const arrayBuffer = await audioBlob.arrayBuffer();
                            //console.log("arrayBuffer", arrayBuffer)
                            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                            //console.log('Audio buffer decoded:', audioBuffer);
                            //wav = audioBuffer.getChannelData(0); // Float32Array of first channel
                            //console.log(wav)
                            wav = convertAudioBufferToWav(audioBuffer);
                        }

                        //wav = await resampleAudio(wav, 16000);
                        //const output = await transcriber(wav);

                        let wavBlob = new Blob([wav], { type: 'audio/wav' });
                        let wavBlobUrl = URL.createObjectURL(wavBlob);

                        const playbackStatus = document.getElementById('playbackStatus');
                        const audioPlayback = document.getElementById('audioPlayback');
                        audioPlayback.src = wavBlobUrl;
                        audioPlayback.style.display = 'block';
                        playbackStatus.textContent = 'Audio ready for playback:';

                        let output = await this.transcriber(wavBlobUrl);                        
                        if (output.text === undefined || output.text.length == 0) {
                            console.log('Trying transcription again 1...');

                            // Load audio and apply gain
                            wav = await convertAudioBufferToWav(await (async () => {
                                const audioContext = new AudioContext();
                                const arrayBuffer = await (await fetch(wavBlobUrl)).arrayBuffer();
                                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                                // Use the applyAudioGain function to increase volume
                                return applyAudioGain(audioBuffer, 1.5);
                            })());
                            wavBlob = new Blob([wav], { type: 'audio/wav' });
                            wavBlobUrl = URL.createObjectURL(wavBlob);
                            audioPlayback.src = wavBlobUrl;
                            output = await this.transcriber(wavBlobUrl);
                        }

                        if (output.text === undefined || output.text.length == 0) {
                            console.log('Trying transcription again 2...');
                            output = await this.transcriber(wavBlobUrl);
                        }

                        console.log('Transcription output 1:', output);
                        resolve(output.text);

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
}


