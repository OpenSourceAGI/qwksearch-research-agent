import { describe, expect, it } from "vitest"
import { createMarkHistory, MARK_HISTORY_LIMIT, type MarkChange } from "../src/mark-history"

const change = (n: number, extra: Partial<MarkChange> = {}): MarkChange & { n: number } => ({
  action: "add",
  source: "manual",
  label: `change ${n}`,
  n,
  ...extra,
})

describe("createMarkHistory", () => {
  it("starts empty: nothing to undo or redo", () => {
    const history = createMarkHistory()
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
    expect(history.undo()).toBeNull()
    expect(history.redo()).toBeNull()
  })

  it("keeps how each change was made", () => {
    const history = createMarkHistory<MarkChange & { n: number }>()
    history.record(change(1, { action: "add", source: "auto" }))
    history.record(change(2, { action: "remove", source: "manual" }))
    expect(history.entries().map((e) => [e.action, e.source])).toEqual([
      ["add", "auto"],
      ["remove", "manual"],
    ])
    expect(history.entries().every((e) => typeof e.at === "number")).toBe(true)
  })

  it("caps the history at 30 changes and drops the oldest", () => {
    expect(MARK_HISTORY_LIMIT).toBe(30)
    const history = createMarkHistory<MarkChange & { n: number }>()
    expect(history.limit).toBe(30)
    for (let n = 1; n <= 45; n++) history.record(change(n))
    const kept = history.entries()
    expect(kept).toHaveLength(30)
    expect(kept[0].n).toBe(16)
    expect(kept[29].n).toBe(45)
    let undone = 0
    while (history.undo()) undone++
    expect(undone).toBe(30)
  })

  it("honours a larger limit", () => {
    const history = createMarkHistory(50)
    for (let n = 1; n <= 60; n++) history.record(change(n))
    expect(history.entries()).toHaveLength(50)
  })

  it("undoes the newest change first and redoes in the opposite order", () => {
    const history = createMarkHistory<MarkChange & { n: number }>()
    for (const n of [1, 2, 3]) history.record(change(n))
    expect(history.undo()?.n).toBe(3)
    expect(history.undo()?.n).toBe(2)
    expect(history.canRedo()).toBe(true)
    expect(history.entries().map((e) => e.n)).toEqual([1])
    expect(history.redo()?.n).toBe(2)
    expect(history.redo()?.n).toBe(3)
    expect(history.redo()).toBeNull()
    expect(history.entries().map((e) => e.n)).toEqual([1, 2, 3])
  })

  it("clears the redo stack when a new change is recorded", () => {
    const history = createMarkHistory<MarkChange & { n: number }>()
    for (const n of [1, 2, 3]) history.record(change(n))
    history.undo()
    history.undo()
    expect(history.canRedo()).toBe(true)
    history.record(change(4))
    expect(history.canRedo()).toBe(false)
    expect(history.redo()).toBeNull()
    expect(history.entries().map((e) => e.n)).toEqual([1, 4])
  })

  it("never lets undo plus redo grow past the cap", () => {
    const history = createMarkHistory<MarkChange & { n: number }>(3)
    for (let n = 1; n <= 5; n++) history.record(change(n))
    while (history.undo());
    expect(history.redoEntries()).toHaveLength(3)
    while (history.redo());
    expect(history.entries().map((e) => e.n)).toEqual([3, 4, 5])
  })

  it("clear forgets everything", () => {
    const history = createMarkHistory()
    history.record(change(1))
    history.undo()
    history.clear()
    expect(history.canUndo() || history.canRedo()).toBe(false)
  })
})
