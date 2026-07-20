import { Conversation } from './conversation.js';
import { initVoiceSelector } from './voice-selector.js';


function updateTimer(recordingStartTime, recordingTimer) {
    const elapsed = new Date() - recordingStartTime;
    const seconds = Math.floor((elapsed / 1000) % 60).toString().padStart(2, '0');
    const minutes = Math.floor((elapsed / 1000 / 60) % 60).toString().padStart(2, '0');
    recordingTimer.textContent = `${minutes}:${seconds}`;
}

export function displayConversation(conversationHistory) {
    let transcriptionResult = document.getElementById('transcriptionResult');
    let conversationHTML = '';
    // Skip the system message at index 0
    for (let i = 1; i < conversationHistory.length; i++) {
        const message = conversationHistory[i];
        const roleClass = message.role === 'user' ? 'user-message' : 'assistant-message';
        const roleLabel = message.role === 'user' ? 'You' : 'Assistant';
        conversationHTML += `<div class="${roleClass}">
            <strong>${roleLabel}:</strong> ${message.content}
        </div>`;
    }
    transcriptionResult.innerHTML = conversationHTML;
}

function displayTranscriptionError(transcriptionStatus, transcriptionResult, error) {
    transcriptionStatus.textContent = 'Error during transcription:';
    transcriptionResult.innerHTML = `<p class="error">${error.message}</p>`;
}

function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Update active button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show selected tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.classList.add('active');
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', async function () {
    const toggleButton = document.getElementById('toggleRecording');
    const recordingStatus = document.getElementById('recordingStatus');
    const recordingIndicator = document.getElementById('recordingIndicator');
    const recordingTimer = document.getElementById('recordingTimer');
    const transcriptionStatus = document.getElementById('transcriptionStatus');
    const transcriptionResult = document.getElementById('transcriptionResult');

    let recordingStartTime;
    let timerInterval;
    let isRecording = false;
    
    // Disable the button initially and show loading state
    toggleButton.disabled = true;
    toggleButton.textContent = 'Loading Models...';
    recordingStatus.textContent = 'Loading speech recognition and synthesis models...';
    
    setupTabNavigation();
    initVoiceSelector();

    let conversation = new Conversation();

    document.addEventListener('keydown', function (event) {
        if (event.key === 'F8') {
            conversation.conversationHistory.push({
                role: "user",
                content: "please continue."
            });
            conversation.sendConversationHistory();
        }
    });

    toggleButton.addEventListener('click', function () {
        if (!isRecording) {
            isRecording = true;
            toggleButton.textContent = 'Stop Recording';
            recordingStatus.textContent = 'Recording...';
            recordingIndicator.style.display = 'block';
            transcriptionStatus.textContent = 'Recording in progress...';
            transcriptionResult.textContent = '';
            recordingStartTime = new Date();
            timerInterval = setInterval(() => updateTimer(recordingStartTime, recordingTimer), 1000);
            updateTimer(recordingStartTime, recordingTimer);
            conversation.startRecording();
        } else {
            isRecording = false;
            toggleButton.textContent = 'Start Recording';
            recordingStatus.textContent = 'Recording stopped. Processing...';
            transcriptionStatus.textContent = 'Transcribing audio...';
            conversation.stopRecording();
            clearInterval(timerInterval);
            recordingIndicator.style.display = 'none';
        }
    });
});
