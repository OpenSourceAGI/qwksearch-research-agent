/**
 * @fileoverview A self-contained search box: one input plus the autocomplete dropdown.
 *
 * For hosts that want the QwkSearch search experience without the chat
 * composer. Controlled or uncontrolled; Enter (with no suggestion highlighted)
 * submits.
 */
import { useRef, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { AutocompleteDropdown } from "./AutocompleteDropdown";
import { useAutocomplete, type UseAutocompleteOptions } from "./useAutocomplete";

export interface SearchBoxProps
  extends Omit<UseAutocompleteOptions, "value" | "onChange" | "anchorRef" | "inputRef" | "enabled"> {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
}

export function SearchBox({
  value: controlled,
  defaultValue = "",
  onChange,
  onSubmit,
  placeholder = "Search…",
  autoFocus,
  className = "",
  inputClassName = "",
  "aria-label": ariaLabel = "Search",
  ...autocompleteOptions
}: SearchBoxProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const [focused, setFocused] = useState(false);
  const value = controlled ?? uncontrolled;
  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const setValue = (next: string) => {
    if (controlled === undefined) setUncontrolled(next);
    onChange?.(next);
  };

  const autocomplete = useAutocomplete({
    ...autocompleteOptions,
    value,
    onChange: setValue,
    enabled: focused,
    anchorRef,
    inputRef,
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (autocomplete.handleKeyDown(e)) return;
    if (e.key === "Enter" && value.trim()) {
      e.preventDefault();
      autocomplete.close();
      onSubmit?.(value.trim());
    }
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={anchorRef}
        className="flex items-center gap-2 px-4 py-2.5 rounded-[28px] bg-gray-50 dark:bg-[#30302E] border border-bg-300 dark:border-transparent"
      >
        <Search className="w-4 h-4 text-text-400 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={autocomplete.open}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            autocomplete.close();
          }}
          onKeyDown={handleKeyDown}
          className={`w-full bg-transparent border-0 outline-none text-text-200 dark:text-text-100 text-[16px] ${inputClassName}`}
        />
      </div>
      <AutocompleteDropdown {...autocomplete} className="left-0 right-0" />
    </div>
  );
}
