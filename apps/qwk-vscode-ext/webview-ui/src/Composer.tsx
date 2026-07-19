import { useEffect, useRef, useState } from "react";

interface ComposerProps {
  disabled: boolean;
  prefill?: string;
  onSend: (text: string) => void;
}

export default function Composer({ disabled, prefill, onSend }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prefill) {
      setValue(prefill);
      textareaRef.current?.focus();
    }
  }, [prefill]);

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
    setValue("");
  };

  return (
    <div className="composer">
      <textarea
        ref={textareaRef}
        rows={2}
        placeholder="Ask QwkSearch anything…"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button onClick={submit} disabled={disabled || !value.trim()}>
        Send
      </button>
    </div>
  );
}
