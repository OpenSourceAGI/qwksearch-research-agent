/**
 * @fileoverview Example React component for using the TTS API
 */
"use client";

import { useState } from "react";

export function TTSExample() {
  const [text, setText] = useState("Hello from Kokoro!");
  const [provider, setProvider] = useState<"kokoro" | "deepgram">("kokoro");
  const [voice, setVoice] = useState("af_heart");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const kokoroVoices = [
    "af_heart", "af_alloy", "af_aoede", "af_bella",
    "af_jessica", "af_nicole", "af_river", "af_sarah", "af_sky",
    "am_adam", "am_echo", "am_fable", "am_fenrir",
    "am_liam", "am_michael", "am_onyx"
  ];

  const deepgramVoices = [
    "angus", "asteria", "arcas", "orion", "orpheus", "athena",
    "luna", "zeus", "perseus", "helios", "hera", "stella",
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    // Clean up previous audio URL
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const response = await fetch("/api/agent/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          provider,
          voice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate speech");
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">Text-to-Speech Demo</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-2 border rounded"
          rows={3}
          maxLength={5000}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Provider</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={provider === "kokoro"}
              onChange={() => {
                setProvider("kokoro");
                setVoice("af_heart");
              }}
            />
            Kokoro (Default)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={provider === "deepgram"}
              onChange={() => {
                setProvider("deepgram");
                setVoice("angus");
              }}
            />
            Deepgram
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Voice</label>
        <select
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          className="w-full p-2 border rounded"
        >
          {(provider === "kokoro" ? kokoroVoices : deepgramVoices).map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !text.trim()}
        className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {loading ? "Generating..." : "Generate Speech"}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800">
          {error}
        </div>
      )}

      {audioUrl && (
        <div className="space-y-2">
          <label className="block text-sm font-medium">Audio Output</label>
          <audio controls src={audioUrl} className="w-full" />
        </div>
      )}
    </div>
  );
}
