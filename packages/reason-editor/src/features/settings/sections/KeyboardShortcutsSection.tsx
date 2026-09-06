/**
 * @module KeyboardShortcutsSection
 * @description Settings panel for the toolbar keyboard shortcuts. Lists every
 * remappable action grouped by category with its current binding rendered as
 * key chips; clicking a binding records the next combo pressed (Esc cancels),
 * with per-row reset and a reset-all. Bindings persist via the shortcut store
 * and take effect immediately — toolbar tooltips and the editor keymap read
 * the same store.
 */
import { useEffect, useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';

import {
  SHORTCUT_ACTIONS,
  findActionByCurrentKeys,
  getShortcutBinding,
  hasCommandModifier,
  isShortcutOverridden,
  keysFromEvent,
  resetAllShortcuts,
  setShortcutBinding,
  useShortcutOverrides,
  type ShortcutAction,
} from '../../../shortcuts';
import { getShortcutKey } from '../../../utils/plateform';

function KeyChips({ keys, muted = false }: { keys: string[]; muted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((key, index) => (
        <kbd
          key={`${key}-${index}`}
          className={`inline-flex h-5 min-w-5 items-center justify-center rounded border px-1.5 text-[11px] font-semibold leading-none ${
            muted
              ? 'border-gray-200 bg-gray-50 text-gray-400 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500'
              : 'border-gray-300 border-b-2 bg-gray-100 text-gray-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
          }`}
        >
          {getShortcutKey(key)}
        </kbd>
      ))}
    </span>
  );
}

function ShortcutRow({
  action,
  recording,
  conflict,
  onStartRecording,
}: {
  action: ShortcutAction;
  recording: boolean;
  conflict?: string;
  onStartRecording: () => void;
}) {
  const keys = getShortcutBinding(action.id);
  const overridden = isShortcutOverridden(action.id);

  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-slate-800/60">
      <span className="flex-1 truncate text-sm">{action.label}</span>

      {conflict && (
        <span className="text-xs text-red-500 dark:text-red-400">{conflict}</span>
      )}

      <button
        type="button"
        onClick={onStartRecording}
        title={recording ? 'Press the new shortcut (Esc to cancel)' : 'Click to record a new shortcut'}
        className={`flex h-7 min-w-[88px] items-center justify-center rounded-md border px-2 transition-colors ${
          recording
            ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/40 dark:ring-blue-900'
            : 'border-transparent hover:border-gray-300 dark:hover:border-slate-600'
        }`}
      >
        {recording ? (
          <span className="animate-pulse text-xs text-blue-600 dark:text-blue-400">Press keys…</span>
        ) : (
          <KeyChips keys={keys} />
        )}
      </button>

      <button
        type="button"
        onClick={() => setShortcutBinding(action.id, null)}
        title="Reset to default"
        className={`rounded p-1 text-gray-400 transition-opacity hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-300 ${
          overridden ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        <RotateCcw size={13} />
      </button>
    </div>
  );
}

export const KeyboardShortcutsSection = ({ compact = false }: { compact?: boolean } = {}) => {
  // Re-render whenever any binding changes (this tab or another).
  useShortcutOverrides();

  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [conflictFor, setConflictFor] = useState<{ id: string; message: string } | null>(null);

  const groups = useMemo(() => {
    const byGroup = new Map<string, ShortcutAction[]>();
    for (const action of SHORTCUT_ACTIONS) {
      const list = byGroup.get(action.group) ?? [];
      list.push(action);
      byGroup.set(action.group, list);
    }
    return [...byGroup.entries()];
  }, []);

  // Capture-phase listener so the recorded combo never reaches the page
  // (typing, browser shortcuts, the dialog's own key handling).
  useEffect(() => {
    if (!recordingId) return;

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setRecordingId(null);
        return;
      }

      const keys = keysFromEvent(event);
      if (!keys) return; // bare modifier — keep waiting

      // A binding without a command modifier (plain letters, Enter…) would
      // shadow normal typing, so require mod/alt unless it's a function key.
      if (!hasCommandModifier(keys) && !/^F\d{1,2}$/.test(keys[keys.length - 1])) {
        setConflictFor({ id: recordingId, message: 'Include Ctrl/⌘ or Alt' });
        return;
      }

      const taken = findActionByCurrentKeys(keys);
      if (taken && taken.id !== recordingId) {
        setConflictFor({ id: recordingId, message: `Already used by “${taken.label}”` });
        return;
      }

      setShortcutBinding(recordingId, keys);
      setConflictFor(null);
      setRecordingId(null);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [recordingId]);

  const anyOverridden = SHORTCUT_ACTIONS.some((action) => isShortcutOverridden(action.id));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          {!compact && <h2 className="text-xl font-semibold mb-2">Keyboard Shortcuts</h2>}
          <p className="text-sm text-muted-foreground">
            Click a shortcut, then press the new key combination. Esc cancels recording.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetAllShortcuts();
            setConflictFor(null);
            setRecordingId(null);
          }}
          disabled={!anyOverridden}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <RotateCcw size={12} />
          Reset all
        </button>
      </div>

      {groups.map(([group, actions]) => (
        <div key={group} className="space-y-1">
          <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            {group}
          </h3>
          {actions.map((action) => (
            <ShortcutRow
              key={action.id}
              action={action}
              recording={recordingId === action.id}
              conflict={conflictFor?.id === action.id ? conflictFor.message : undefined}
              onStartRecording={() => {
                setConflictFor(null);
                setRecordingId((current) => (current === action.id ? null : action.id));
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
