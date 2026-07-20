import React, { useState, useRef } from 'react';
import { Mic, Square } from 'lucide-react';
import { SpeechToText } from '../lib/speech-to-text.js';

export function MicInput({ onTranscription }: { onTranscription: (text: string) => void }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const speechToTextRef = useRef<SpeechToText | null>(null);

  React.useEffect(() => {
    speechToTextRef.current = new SpeechToText();
  }, []);

  const handleMicClick = async () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      setIsLoading(true);

      try {
        if (speechToTextRef.current) {
          const transcription = await speechToTextRef.current.stopRecording();
          onTranscription(transcription);
        }
      } catch (error) {
        console.error('Transcription error:', error);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Start recording
      setIsRecording(true);
      if (speechToTextRef.current) {
        speechToTextRef.current.startRecording();
      }
    }
  };

  return (
    <button
      onClick={handleMicClick}
      disabled={isLoading}
      className={`p-2 rounded-full transition-colors ${
        isRecording
          ? 'bg-red-500 hover:bg-red-600 text-white'
          : isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
      }`}
      title={isRecording ? 'Stop recording' : 'Start recording'}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      {isRecording ? (
        <Square size={20} />
      ) : (
        <Mic size={20} />
      )}
    </button>
  );
}
