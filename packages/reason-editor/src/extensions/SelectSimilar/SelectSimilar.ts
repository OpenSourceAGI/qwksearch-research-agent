/**
 * Defines the SelectSimilar Tiptap extension, which adds "select every run of
 * text that is formatted like this one" to the editor.
 *
 * ProseMirror only ever has one real selection, so the extra runs are held as a
 * list of ranges in plugin state, painted with a selection-like decoration, and
 * kept in sync with edits through the transaction mapping. The pay-off is in
 * `appendTransaction`: whenever a mark is added or removed inside the primary
 * selection, the same step is replayed across every stored range, so the plain
 * toolbar buttons (bold, colour, font, size, …) act on all of them at once
 * without any of those extensions knowing this one exists.
 */

import { Extension } from '@tiptap/core';
import { type Mark, type Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { AddMarkStep, RemoveMarkStep } from '@tiptap/pm/transform';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export type SelectSimilarMode = 'font' | 'style' | 'formatting';

export interface SelectSimilarOptions {
  /** Class applied to the decoration painted over each extra range. */
  className: string;
}

export interface SimilarRange {
  from: number;
  to: number;
}

interface SelectSimilarState {
  ranges: SimilarRange[];
  mode: SelectSimilarMode | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    selectSimilar: {
      /**
       * Highlight every run of text formatted like the current selection.
       * Subsequent mark changes apply to all of them.
       */
      selectSimilar: (mode: SelectSimilarMode) => ReturnType;
      /** Drop the extra ranges, leaving only the real selection. */
      clearSimilarSelection: () => ReturnType;
    };
  }
}

export const selectSimilarPluginKey = new PluginKey<SelectSimilarState>('selectSimilar');

/** Marks the transactions this extension generates so they are never replayed. */
const REPLAY_META = 'selectSimilarReplay';

const EMPTY_STATE: SelectSimilarState = { ranges: [], mode: null };

/** The textStyle attributes that make up "the same style". */
const STYLE_ATTRS = ['fontFamily', 'fontSize', 'color', 'backgroundColor', 'lineHeight'] as const;

function textStyleAttrs(marks: readonly Mark[]): Record<string, unknown> {
  const mark = marks.find((m) => m.type.name === 'textStyle');
  const attrs: Record<string, unknown> = {};

  for (const key of STYLE_ATTRS) {
    attrs[key] = mark?.attrs?.[key] ?? null;
  }

  return attrs;
}

function sameAttrs(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return Object.keys(a).every((key) => a[key] === b[key]);
}

/** The full mark set, name + attrs, order-independent. */
function markSignature(marks: readonly Mark[]): string {
  return marks
    .map((mark) => `${mark.type.name}:${JSON.stringify(mark.attrs ?? {})}`)
    .sort()
    .join('|');
}

function buildMatcher(mode: SelectSimilarMode, reference: readonly Mark[]) {
  if (mode === 'font') {
    const font = textStyleAttrs(reference).fontFamily ?? null;
    return (marks: readonly Mark[]) => (textStyleAttrs(marks).fontFamily ?? null) === font;
  }

  if (mode === 'style') {
    const attrs = textStyleAttrs(reference);
    return (marks: readonly Mark[]) => sameAttrs(attrs, textStyleAttrs(marks));
  }

  const signature = markSignature(reference);
  return (marks: readonly Mark[]) => markSignature(marks) === signature;
}

/**
 * The marks that describe "how the selection is formatted". An empty selection
 * reads the marks at the cursor; a real selection reads the first text node it
 * covers, so selecting a whole paragraph and asking for its font works.
 */
function referenceMarks(state: { doc: PMNode; selection: any; storedMarks: readonly Mark[] | null }) {
  const { selection } = state;

  if (selection.empty) {
    return state.storedMarks ?? selection.$from.marks();
  }

  let found: readonly Mark[] | null = null;

  state.doc.nodesBetween(selection.from, selection.to, (node: PMNode) => {
    if (found || !node.isText) return;
    found = node.marks;
  });

  return found ?? selection.$from.marks();
}

/** Every contiguous run of text in the document whose marks satisfy `matches`. */
function collectRanges(doc: PMNode, matches: (marks: readonly Mark[]) => boolean): SimilarRange[] {
  const ranges: SimilarRange[] = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    if (!matches(node.marks)) return;

    const from = pos;
    const to = pos + node.nodeSize;
    const previous = ranges.at(-1);

    // Adjacent text nodes (split by an unrelated mark boundary) read as one run.
    if (previous && previous.to === from) {
      previous.to = to;
      return;
    }

    ranges.push({ from, to });
  });

  return ranges;
}

/** The stored ranges minus anything the user's own selection already covers. */
function rangesOutside(ranges: SimilarRange[], from: number, to: number): SimilarRange[] {
  const out: SimilarRange[] = [];

  for (const range of ranges) {
    if (range.to <= from || range.from >= to) {
      out.push(range);
      continue;
    }

    if (range.from < from) out.push({ from: range.from, to: from });
    if (range.to > to) out.push({ from: to, to: range.to });
  }

  return out;
}

function isMarkStep(step: unknown): step is AddMarkStep | RemoveMarkStep {
  return step instanceof AddMarkStep || step instanceof RemoveMarkStep;
}

/**
 * Re-apply the mark steps a transaction performed inside the primary selection
 * to every other range in the multi-selection.
 *
 * Only transactions made up entirely of mark steps are replayed. That is what
 * every formatting command produces, and it means the step ranges are still
 * valid against the new document (mark steps do not move positions), so no
 * remapping is needed here. Typing, in contrast, is a replace step and must
 * never be duplicated across the other ranges.
 */
function replayMarkSteps(
  transactions: readonly Transaction[],
  tr: Transaction,
  ranges: SimilarRange[]
): boolean {
  let changed = false;

  for (const transaction of transactions) {
    if (transaction.getMeta(REPLAY_META)) continue;
    if (transaction.steps.length === 0) continue;
    if (!transaction.steps.every(isMarkStep)) continue;

    for (const step of transaction.steps as (AddMarkStep | RemoveMarkStep)[]) {
      const isAdd = step instanceof AddMarkStep;

      // The step's own range was handled by the originating command; only the
      // parts of the multi-selection it did not touch need the replay.
      for (const range of rangesOutside(ranges, step.from, step.to)) {
        if (isAdd) tr.addMark(range.from, range.to, step.mark);
        else tr.removeMark(range.from, range.to, step.mark);

        changed = true;
      }
    }
  }

  return changed;
}

export const SelectSimilar = Extension.create<SelectSimilarOptions>({
  name: 'selectSimilar',

  addOptions() {
    return {
      className: 'similar-selection',
    };
  },

  addCommands() {
    return {
      selectSimilar:
        (mode) =>
        ({ state, dispatch }) => {
          const matches = buildMatcher(mode, referenceMarks(state as any));
          const ranges = collectRanges(state.doc, matches);

          if (dispatch) {
            dispatch(
              state.tr.setMeta(selectSimilarPluginKey, {
                ranges,
                mode,
              } satisfies SelectSimilarState)
            );
          }

          return ranges.length > 0;
        },

      clearSimilarSelection:
        () =>
        ({ state, dispatch }) => {
          if (selectSimilarPluginKey.getState(state)?.ranges.length === 0) return false;

          if (dispatch) {
            dispatch(state.tr.setMeta(selectSimilarPluginKey, EMPTY_STATE));
          }

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Escape: () => this.editor.commands.clearSimilarSelection(),
    };
  },

  addProseMirrorPlugins() {
    const { className } = this.options;

    return [
      new Plugin<SelectSimilarState>({
        key: selectSimilarPluginKey,

        state: {
          init: () => EMPTY_STATE,

          apply(tr, value) {
            const meta = tr.getMeta(selectSimilarPluginKey) as SelectSimilarState | undefined;

            if (meta) return meta;
            if (!tr.docChanged || value.ranges.length === 0) return value;

            // Follow the text as it is edited; ranges that were deleted drop out.
            const ranges = value.ranges
              .map((range) => ({
                from: tr.mapping.map(range.from, 1),
                to: tr.mapping.map(range.to, -1),
              }))
              .filter((range) => range.to > range.from);

            return { ranges, mode: value.mode };
          },
        },

        appendTransaction(transactions, _oldState, newState) {
          const ranges = selectSimilarPluginKey.getState(newState)?.ranges ?? [];

          if (ranges.length === 0) return null;

          const tr = newState.tr.setMeta(REPLAY_META, true);

          return replayMarkSteps(transactions, tr, ranges) ? tr : null;
        },

        props: {
          decorations(state) {
            const { ranges } = selectSimilarPluginKey.getState(state) ?? EMPTY_STATE;

            if (ranges.length === 0) return DecorationSet.empty;

            return DecorationSet.create(
              state.doc,
              ranges.map((range) => Decoration.inline(range.from, range.to, { class: className }))
            );
          },
        },
      }),
    ];
  },
});
