/**
 * @fileoverview The suggestion dropdown: site matches first, then query completions.
 *
 * Positioned absolutely against its nearest positioned ancestor, above or below
 * per `placement`. Numbered rows match the 1–9 shortcuts `useAutocomplete`
 * handles.
 */
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { UseAutocompleteResult } from "./useAutocomplete";

export type AutocompleteDropdownProps = Pick<
  UseAutocompleteResult,
  | "open"
  | "suggestions"
  | "domains"
  | "placement"
  | "highlightedIndex"
  | "setHighlightedIndex"
  | "selectSuggestion"
  | "selectDomain"
> & {
  className?: string;
};

const ROW =
  "w-full text-left px-4 py-1.5 text-[15px] flex items-center gap-3 transition-colors";
const ROW_ACTIVE = "bg-bg-200 text-text-100";
const ROW_IDLE = "text-text-200 hover:bg-bg-100 dark:hover:bg-[#3A3A38]";
const BADGE =
  "w-5 h-5 flex items-center justify-center rounded bg-bg-200 dark:bg-[#3A3A38] text-[11px] font-semibold text-text-400 shrink-0";

export function AutocompleteDropdown({
  open,
  suggestions,
  domains,
  placement,
  highlightedIndex,
  setHighlightedIndex,
  selectSuggestion,
  selectDomain,
  className = "left-2 right-2 md:left-0 md:right-0",
}: AutocompleteDropdownProps) {
  const offset = placement === "above" ? 4 : -4;
  return (
    <AnimatePresence>
      {open && domains.length + suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: offset }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: offset }}
          transition={{ duration: 0.12 }}
          className={`absolute ${className} z-20 rounded-2xl bg-gray-50 dark:bg-[#30302E] border border-bg-300 dark:border-transparent shadow-xl overflow-hidden ${
            placement === "above" ? "bottom-full" : "top-full"
          }`}
          // Keeps focus in the input, so a click does not blur it and close the list first.
          onMouseDown={(e) => e.preventDefault()}
        >
          <ul role="listbox" className="max-h-72 overflow-y-auto custom-scrollbar py-1">
            {domains.map((d, i) => (
              <li key={`domain-${d.domain}`} role="option" aria-selected={i === highlightedIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => selectDomain(d)}
                  className={`${ROW} ${i === highlightedIndex ? ROW_ACTIVE : ROW_IDLE}`}
                >
                  <span className={BADGE}>{i + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.favicon} alt="" className="w-4 h-4 rounded-sm shrink-0" />
                  <span className="truncate font-medium">{d.name || d.domain}</span>
                  <span className="truncate text-[13px] text-text-400 shrink-0">{d.domain}</span>
                  {Number.isFinite(d.rank) && d.rank < Number.MAX_SAFE_INTEGER && (
                    <span className="ml-auto shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold tabular-nums bg-bg-200 dark:bg-[#3A3A38] text-text-400">
                      #{d.rank.toLocaleString()}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {suggestions.map((s, i) => {
              const optionIndex = domains.length + i;
              return (
                <li key={`${s}-${i}`} role="option" aria-selected={optionIndex === highlightedIndex}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlightedIndex(optionIndex)}
                    onClick={() => selectSuggestion(s)}
                    className={`${ROW} ${optionIndex === highlightedIndex ? ROW_ACTIVE : ROW_IDLE}`}
                  >
                    <span className={BADGE}>{optionIndex + 1}</span>
                    <Search className="w-4 h-4 text-text-400 shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
