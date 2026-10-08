'use client';

import * as React from 'react';

import { ChevronLeftIcon, ChevronRightIcon, SpellCheckIcon, XIcon } from 'lucide-react';
import { useEditorRef, usePluginOption } from 'platejs/react';

import {
  getHarperIssueRange,
  HarperPlugin,
  visibleHarperIssues,
} from '@/docs-agent/plate/kits/harper-kit';
import { cn } from '@/lib/utils';

const buttonClass =
  'inline-flex h-7 items-center justify-center rounded px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';

/**
 * Google Docs' "Spelling and grammar check" card: one issue at a time, with
 * Accept, Ignore and (for spelling) Add to dictionary, and arrows to step
 * through the rest. Floats over the top-right of the editor so the flagged text
 * stays visible.
 */
export function HarperPanel({ className }: { className?: string }) {
  const editor = useEditorRef();
  const api = editor.getApi(HarperPlugin).harper;

  const open = usePluginOption(HarperPlugin, 'panelOpen');
  const enabled = usePluginOption(HarperPlugin, 'enabled');
  const issuesAll = usePluginOption(HarperPlugin, 'issues');
  const ignored = usePluginOption(HarperPlugin, 'ignored');
  const showSpelling = usePluginOption(HarperPlugin, 'showSpelling');
  const showGrammar = usePluginOption(HarperPlugin, 'showGrammar');
  const status = usePluginOption(HarperPlugin, 'status');
  const activeId = usePluginOption(HarperPlugin, 'activeId');

  const issues = React.useMemo(
    () => visibleHarperIssues({ enabled, ignored, issues: issuesAll, showGrammar, showSpelling }),
    [enabled, ignored, issuesAll, showGrammar, showSpelling],
  );

  const index = Math.max(0, issues.findIndex((issue) => issue.id === activeId));
  const issue = issues[index];

  // Keep the panel on a real issue as the list changes under it.
  React.useEffect(() => {
    if (!open) return;
    if (issue && issue.id !== activeId) editor.setOption(HarperPlugin, 'activeId', issue.id);
  }, [activeId, editor, issue, open]);

  // Bring the flagged text into view.
  React.useEffect(() => {
    if (!open || !issue) return;
    const el = document.querySelector<HTMLElement>(`[data-harper-id="${CSS.escape(issue.id)}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [issue, open]);

  if (!open) return null;

  const go = (delta: number) => {
    if (issues.length === 0) return;
    const next = issues[(index + delta + issues.length) % issues.length];
    editor.setOption(HarperPlugin, 'activeId', next.id);
  };

  const accept = (suggestionIndex: number) => {
    if (!issue) return;
    const nextId = issues[index + 1]?.id ?? null;
    if (api.accept(issue.id, suggestionIndex)) {
      editor.setOption(HarperPlugin, 'activeId', nextId);
    }
  };

  const select = () => {
    if (!issue) return;
    const range = getHarperIssueRange(editor, issue);
    if (range) {
      editor.tf.select(range);
      editor.tf.focus();
    }
  };

  const busy = status === 'loading' || status === 'checking';

  return (
    <div
      aria-label="Spelling and grammar"
      className={cn(
        'absolute top-2 right-4 z-50 w-80 rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-gray-100',
        className,
      )}
      role="dialog"
    >
      <div className="mb-2 flex items-center gap-2">
        <SpellCheckIcon className="size-4 text-blue-600" />
        <span className="font-medium">Spelling and grammar</span>
        <span className="ml-auto text-xs text-gray-500">
          {issues.length > 0 ? `${index + 1} of ${issues.length}` : ''}
        </span>
        <button
          aria-label="Previous suggestion"
          className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-800"
          disabled={issues.length < 2}
          onClick={() => go(-1)}
          type="button"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <button
          aria-label="Next suggestion"
          className="rounded p-0.5 hover:bg-gray-100 disabled:opacity-40 dark:hover:bg-slate-800"
          disabled={issues.length < 2}
          onClick={() => go(1)}
          type="button"
        >
          <ChevronRightIcon className="size-4" />
        </button>
        <button
          aria-label="Close"
          className="rounded p-0.5 hover:bg-gray-100 dark:hover:bg-slate-800"
          onClick={() => api.closePanel()}
          type="button"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {status === 'error' ? (
        <p className="text-gray-600 dark:text-gray-300">
          The spelling and grammar checker could not be loaded in this browser.
        </p>
      ) : !issue ? (
        <p className="text-gray-600 dark:text-gray-300">
          {busy ? 'Checking…' : 'No spelling or grammar suggestions.'}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-medium tracking-wide text-gray-500 uppercase">
            {issue.kind}
          </div>
          <button
            className={cn(
              'block text-left font-medium underline decoration-wavy underline-offset-[3px]',
              issue.spelling ? 'decoration-[#e5484d]' : 'decoration-[#f5a623]',
            )}
            onClick={select}
            title="Select in document"
            type="button"
          >
            {issue.problemText || '(missing text)'}
          </button>
          <p className="text-gray-600 dark:text-gray-300">{issue.message}</p>

          {issue.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {issue.suggestions.slice(0, 5).map((suggestion, i) => (
                <button
                  className={cn(
                    buttonClass,
                    i === 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-300 hover:bg-gray-100 dark:border-slate-600 dark:hover:bg-slate-800',
                  )}
                  key={`${suggestion.kind}:${suggestion.replacement}`}
                  onClick={() => accept(i)}
                  type="button"
                >
                  {i === 0 ? `Accept “${suggestion.label}”` : suggestion.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-1.5 border-t border-gray-100 pt-2 dark:border-slate-800">
            <button
              className={cn(buttonClass, 'hover:bg-gray-100 dark:hover:bg-slate-800')}
              onClick={() => api.ignore(issue.id)}
              type="button"
            >
              Ignore
            </button>
            {issue.spelling && (
              <button
                className={cn(buttonClass, 'hover:bg-gray-100 dark:hover:bg-slate-800')}
                onClick={() => void api.addToDictionary(issue.problemText)}
                type="button"
              >
                Add to dictionary
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
