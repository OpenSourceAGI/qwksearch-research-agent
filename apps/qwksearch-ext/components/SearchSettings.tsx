import { useState, useEffect } from "react"

const VOICES = [
  { name: "Angus", value: "angus" },
  { name: "Asteria", value: "asteria" },
  { name: "Arcas", value: "arcas" },
  { name: "Orion", value: "orion" },
  { name: "Orpheus", value: "orpheus" },
  { name: "Athena", value: "athena" },
  { name: "Luna", value: "luna" },
  { name: "Zeus", value: "zeus" },
  { name: "Perseus", value: "perseus" },
  { name: "Helios", value: "helios" },
  { name: "Hera", value: "hera" },
  { name: "Stella", value: "stella" },
]

const FOLLOWUP_OPTIONS = [
  { name: "2 questions", value: "2" },
  { name: "3 questions", value: "3" },
  { name: "4 questions (default)", value: "4" },
  { name: "5 questions", value: "5" },
  { name: "6 questions", value: "6" },
]

function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    const stored = localStorage.getItem(key)
    if (stored === null) return defaultValue
    if (typeof defaultValue === "boolean") return (stored !== "false") as T
    return stored as T
  })

  function set(next: T) {
    setValue(next)
    localStorage.setItem(key, String(next))
    window.dispatchEvent(new Event("client-config-changed"))
  }

  return [value, set] as const
}

export default function SearchSettings() {
  const [backgroundArt, setBackgroundArt] = useLocalStorage("showBackgroundArt", true)
  const [ttsVoice, setTtsVoice] = useLocalStorage("ttsSpeaker", "angus")
  const [systemInstructions, setSystemInstructions] = useLocalStorage("systemInstructions", "")
  const [followupQuestions, setFollowupQuestions] = useLocalStorage("maxFollowupQuestions", "4")

  return (
    <div className="p-4 space-y-5 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-800">Background Art</div>
          <div className="text-xs text-gray-500">Show a random artistic background on the chat homepage.</div>
        </div>
        <button
          role="switch"
          aria-checked={backgroundArt}
          onClick={() => setBackgroundArt(!backgroundArt)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
            backgroundArt ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
              backgroundArt ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <div className="space-y-1">
        <label className="font-medium text-gray-800">TTS Voice</label>
        <div className="text-xs text-gray-500 mb-1">Voice used for read-aloud text-to-speech.</div>
        <select
          value={ttsVoice}
          onChange={(e) => setTtsVoice(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {VOICES.map((v) => (
            <option key={v.value} value={v.value}>{v.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className="font-medium text-gray-800">System Instructions</label>
        <div className="text-xs text-gray-500 mb-1">Add custom behavior or tone for the model.</div>
        <textarea
          value={systemInstructions}
          onChange={(e) => setSystemInstructions(e.target.value)}
          rows={3}
          placeholder='e.g., "Respond in a friendly and concise tone" or "Use British English and format answers as bullet points."'
          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="space-y-1">
        <label className="font-medium text-gray-800">Follow-up Questions</label>
        <div className="text-xs text-gray-500 mb-1">Number of follow-up question suggestions to generate after each chat response.</div>
        <select
          value={followupQuestions}
          onChange={(e) => setFollowupQuestions(e.target.value)}
          className="w-full rounded border border-gray-300 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {FOLLOWUP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.name}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
