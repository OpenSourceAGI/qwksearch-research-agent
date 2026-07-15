/**
 * Hook providing `toggleSpeech` for voice input: uses the Web Speech API when available, falling back to
 * MediaRecorder + server-side transcription endpoint. Exposes `isListening` and `isSpeechSupported`.
 * Global Ctrl+` shortcut toggles listening while the hook is mounted.
 */
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import grab from "grab-url";

export function useSpeechInput(
  onTranscript: (transcript: string) => void,
  onEnd: () => void,
) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const transcriptReceivedRef = useRef(false);
  const fallbackFromRecognitionRef = useRef(false);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      : null;

  const stopFallbackRecorder = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    } else {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsListening(false);
      onEnd();
    }
  };

  const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
    const formData = new FormData();
    formData.append("file", audioBlob, "speech-input.webm");
    formData.append("languageCode", "en");

    const data = await grab("/api/agent/transcript", {
      method: "POST",
      body: formData,
    });
    return (data?.text ?? "").trim();
  };

  const startFallbackRecording = async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      toast.error("Speech input is not supported in this browser", {
        duration: 5000,
      });
      setIsListening(false);
      onEnd();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstart = () => {
        setIsListening(true);
      };

      recorder.onstop = async () => {
        try {
          const audioBlob = new Blob(chunksRef.current, {
            type: "audio/webm",
          });
          chunksRef.current = [];
          mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
          mediaStreamRef.current = null;
          mediaRecorderRef.current = null;
          setIsListening(false);

          if (audioBlob.size === 0) {
            onEnd();
            return;
          }

          const transcript = await transcribeAudio(audioBlob);
          if (transcript) {
            onTranscript(transcript);
          } else {
            toast.error("No speech detected. Please try again.");
          }
        } catch {
          toast.error("Unable to transcribe audio.");
        } finally {
          onEnd();
        }
      };

      recorder.start();
    } catch {
      toast.error("Microphone access is required for speech input.");
      setIsListening(false);
      onEnd();
    }
  };

  const toggleSpeech = async () => {
    if (isListening) {
      recognitionRef.current?.stop();
      stopFallbackRecorder();
      return;
    }

    fallbackFromRecognitionRef.current = false;
    transcriptReceivedRef.current = false;

    if (!SpeechRecognition) {
      await startFallbackRecording();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      transcriptReceivedRef.current = true;
      onTranscript(transcript);
    };

    recognition.onend = async () => {
      setIsListening(false);
      recognitionRef.current = null;
      if (fallbackFromRecognitionRef.current) {
        fallbackFromRecognitionRef.current = false;
        return;
      }
      onEnd();
    };

    recognition.onerror = async (event: any) => {
      setIsListening(false);
      recognitionRef.current = null;
      const errorCode = event?.error;
      const shouldFallback =
        !transcriptReceivedRef.current && errorCode !== "aborted";

      if (shouldFallback) {
        fallbackFromRecognitionRef.current = true;
        await startFallbackRecording();
        return;
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      await startFallbackRecording();
    }
  };

  // Global Ctrl+` shortcut for mic
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        void toggleSpeech();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      recognitionRef.current?.stop();
      stopFallbackRecorder();
    };
  }, [isListening]);

  const hasFallbackSupport =
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  return {
    isListening,
    toggleSpeech,
    isSpeechSupported: !!SpeechRecognition || hasFallbackSupport,
  };
}
