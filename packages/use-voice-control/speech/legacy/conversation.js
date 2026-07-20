import { SpeechToText } from "./stt.js";
import { textToSpeech, ttsModelReadyPromise } from "./tts.js";
import { processStreamingText } from "./sentence-detector.js";
import { displayConversation } from "./ui.js";

const $ = document.querySelector.bind(document);

export class Conversation {
    constructor() {
        this.modelsReady = false;
        this.speechToText = new SpeechToText();
        this.initModels();
        this.conversationHistory = [
            {
                role: "system",
                content: "placeholder"
            }
        ];
    }
    async initModels() {
        try {
            await Promise.all([
                this.speechToText.modelReadyPromise,
                ttsModelReadyPromise
            ]);
            this.modelsReady = true;
            const toggleButton = document.getElementById('toggleRecording');
            toggleButton.disabled = false;
            toggleButton.textContent = 'Start Recording';
            const recordingStatus = document.getElementById('recordingStatus');
            recordingStatus.textContent = 'Models loaded. Click "Start Recording" to begin';
        } catch (error) {
            console.error('Error initializing models:', error);
            const recordingStatus = document.getElementById('recordingStatus');
            recordingStatus.textContent = 'Error loading models: ' + error.message;
        }
    }

    startRecording() {
        if (this.modelsReady) {
            this.speechToText.startRecording();
        } else {
            console.warn('Cannot start recording: models are not yet loaded');
            const recordingStatus = document.getElementById('recordingStatus');
            recordingStatus.textContent = 'Please wait for models to finish loading...';
        }
    }

    async stopRecording() {
        let text = await this.speechToText.stopRecording();
        console.log('Transcription:', text)
        $('#transcriptionStatus').textContent = text;
        this.conversationHistory.push({
            role: "user",
            content: text
        });
        await this.sendConversationHistory();
    }

    async sendConversationHistory() {
        let serverUrl = $('#serverUrl').value;
        let system_prompt = $('#systemPrompt').value;

        this.conversationHistory[0].content = system_prompt;

        const response = await fetch(serverUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                stream: true,
                "messages": this.conversationHistory
            })
        });

        const decoder = new TextDecoder("utf-8");
        const reader = response.body.getReader();
        let accumulatedText = "";
        const voiceSelect = document.getElementById('voiceSelect');
        const voiceId = (voiceSelect && voiceSelect.value) ? voiceSelect.value : "af_heart";


        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            //console.log(chunk);

            for (const line of chunk.split("\n")) {
                if (line.startsWith("data: ")) {
                    const payload = line.slice(6).trim();
                    if (payload === "[DONE]") {
                        if (accumulatedText.trim().length > 0) {
                            textToSpeech(accumulatedText, voiceId);
                            this.conversationHistory.push({
                                "role": "assistant",
                                "content": accumulatedText
                            });
                        }
                        
                        console.log("\n[Stream complete]");
                        displayConversation(this.conversationHistory);
                        console.log("response", accumulatedText);
                        return;
                    }
                    const json = JSON.parse(payload);
                    const content = json.choices[0].delta.content || "";
                    const result = processStreamingText(accumulatedText, content);

                    // If we have complete sentences, speak them
                    if (result.sentences.length > 0) {
                        result.sentences.forEach(sentence => {
                            textToSpeech(sentence, voiceId);
                            this.conversationHistory.push({
                                "role": "assistant",
                                "content": sentence
                            });
                        });

                        accumulatedText = result.remainder;
                    } else {
                        accumulatedText = result.remainder;
                    }
                }
            }
        }
        // This code will never be reached when streaming is enabled
        // because of the return statement in the "[DONE]" handling block
        console.timeEnd('LLM Processing');

        // This section is for non-streaming mode
        try {
            const data = await response.json();
            const response_text = data.choices[0].message.content;
            this.conversationHistory.push({
                "role": "assistant",
                "content": response_text
            });
            console.log("response", response_text);
        } catch (error) {
            console.log("Error parsing response as JSON, likely already processed as a stream.");
        }


        // This was the original call, but now we're streaming per sentence
        // textToSpeech(reponse, "af_heart");
    }
}



