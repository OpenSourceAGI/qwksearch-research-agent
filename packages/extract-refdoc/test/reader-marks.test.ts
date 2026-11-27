// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { autoUnderlinePhrases } from "../src/highlight"
import { renderPaperReader } from "../src/html"
import { mountPaperReader, type PaperReaderHandle } from "../src/reader-runtime"
import type { Paper } from "../src/types"

const LONG =
  "Markets reward patient capital over many years. Therefore the strongest position is to hold broad index funds through every cycle, because timing the market has failed most professionals."

const paper: Paper = {
  title: "Marks Test",
  sections: [{ title: "First", summary: [], paragraphs: ["Plain words to mark here.", LONG, "Already ==marked text== stays."] }],
  references: ["Ref one."],
}

let root: Element
let handle: PaperReaderHandle | null = null

const button = (name: string) => root.querySelector(`[data-ptw="${name}"]`) as HTMLButtonElement
const firstParagraph = () => root.querySelectorAll(".ptw-content .ptw-paragraphs p")[0] as HTMLElement
const allMarks = () => Array.from(root.querySelectorAll(".ptw-content mark.debate-hl")).map((m) => m.textContent)
// The paper ships one pre-marked phrase; most tests only care about the marks they add.
const marks = () => allMarks().filter((text) => text !== "marked text")

function select(el: Element, from: number, to: number) {
  const text = el.firstChild as Text
  const range = document.createRange()
  range.setStart(text, from)
  range.setEnd(text, to)
  const selection = window.getSelection()!
  selection.removeAllRanges()
  selection.addRange(range)
}

function press(init: KeyboardEventInit, target: EventTarget = document.body) {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

function mount(options: Parameters<typeof mountPaperReader>[1] = {}) {
  handle = mountPaperReader(root, { isMac: false, autoMarkPhrases: autoUnderlinePhrases, ...options })
  return handle
}

beforeEach(() => {
  handle?.destroy()
  handle = null
  localStorage.clear()
  document.body.innerHTML = renderPaperReader(paper)
  root = document.querySelector(".ptw-paper")!
})

describe("marking menu", () => {
  it("renders Undo mark and Redo mark greyed out until there is something to undo", () => {
    mount()
    expect(button("undo-mark").textContent).toBe("Undo mark")
    expect(button("redo-mark").textContent).toBe("Redo mark")
    expect(button("undo-mark").disabled).toBe(true)
    expect(button("redo-mark").disabled).toBe(true)
    select(firstParagraph(), 0, 5)
    button("mark").click()
    expect(button("undo-mark").disabled).toBe(false)
    expect(button("redo-mark").disabled).toBe(true)
    button("undo-mark").click()
    expect(button("undo-mark").disabled).toBe(true)
    expect(button("redo-mark").disabled).toBe(false)
  })

  it("undoes and redoes a manual mark and a manual unmark", () => {
    const reader = mount()
    select(firstParagraph(), 0, 5)
    button("mark").click()
    expect(marks()).toContain("Plain")
    const [added] = reader.markHistory.entries()
    expect([added.action, added.source]).toEqual(["add", "manual"])

    select(root.querySelector(".ptw-content mark.debate-hl")!, 0, 3)
    button("unmark").click()
    expect(marks()).not.toContain("Plain")
    expect(reader.markHistory.entries().map((e) => [e.action, e.source])).toEqual([
      ["add", "manual"],
      ["remove", "manual"],
    ])

    button("undo-mark").click()
    expect(marks()).toContain("Plain")
    button("undo-mark").click()
    expect(marks()).not.toContain("Plain")
    button("redo-mark").click()
    expect(marks()).toContain("Plain")
    expect(firstParagraph().innerHTML).toBe('<mark class="debate-hl">Plain</mark> words to mark here.')
  })

  it("auto-marks unmarked paragraphs and clears them, each as one undoable step", () => {
    const reader = mount()
    const before = root.querySelector(".ptw-content")!.innerHTML
    button("auto-mark").click()
    expect(marks()).toContain("Markets reward patient capital over many years")
    expect(allMarks()).toContain("marked text")
    const [auto] = reader.markHistory.entries()
    expect([auto.action, auto.source]).toEqual(["add", "auto"])
    expect(root.hasAttribute("data-has-underlining")).toBe(true)

    button("clear-marks").click()
    expect(allMarks()).toEqual([])
    expect(reader.markHistory.entries().map((e) => [e.action, e.source])).toEqual([
      ["add", "auto"],
      ["remove", "auto"],
    ])
    expect(root.hasAttribute("data-has-underlining")).toBe(false)

    button("undo-mark").click()
    expect(marks()).toContain("Markets reward patient capital over many years")
    button("undo-mark").click()
    expect(root.querySelector(".ptw-content")!.innerHTML).toBe(before)
  })

  it("hides Auto-mark when no phrase picker is given", () => {
    mount({ autoMarkPhrases: undefined })
    expect(button("auto-mark").hidden).toBe(true)
  })

  it("remembers only the last 30 marking changes", () => {
    const reader = mount()
    for (let i = 0; i < 40; i++) {
      button(i % 2 === 0 ? "auto-mark" : "clear-marks").click()
    }
    expect(reader.markHistory.entries()).toHaveLength(30)
    for (let i = 0; i < 30; i++) button("undo-mark").click()
    expect(button("undo-mark").disabled).toBe(true)
  })

  it("drops redo history when a new mark is made", () => {
    const reader = mount()
    select(firstParagraph(), 0, 5)
    button("mark").click()
    button("undo-mark").click()
    expect(reader.markHistory.canRedo()).toBe(true)
    select(firstParagraph(), 6, 11)
    button("mark").click()
    expect(reader.markHistory.canRedo()).toBe(false)
    expect(button("redo-mark").disabled).toBe(true)
  })
})

describe("marking shortcuts", () => {
  function markOnce() {
    firstParagraph().dispatchEvent(new Event("pointerdown", { bubbles: true }))
    select(firstParagraph(), 0, 5)
    button("mark").click()
  }

  it("Ctrl+Z undoes, Ctrl+Shift+Z and Ctrl+Y redo on Windows/Linux", () => {
    mount({ isMac: false })
    markOnce()
    expect(press({ key: "z", ctrlKey: true }).defaultPrevented).toBe(true)
    expect(marks()).toEqual([])
    expect(press({ key: "Z", ctrlKey: true, shiftKey: true }).defaultPrevented).toBe(true)
    expect(marks()).toEqual(["Plain"])
    press({ key: "z", ctrlKey: true })
    press({ key: "y", ctrlKey: true })
    expect(marks()).toEqual(["Plain"])
  })

  it("Cmd+Z undoes and Cmd+Shift+Z redoes on macOS; Ctrl+Z is left alone", () => {
    mount({ isMac: true })
    markOnce()
    expect(press({ key: "z", ctrlKey: true }).defaultPrevented).toBe(false)
    expect(marks()).toEqual(["Plain"])
    press({ key: "z", metaKey: true })
    expect(marks()).toEqual([])
    press({ key: "Z", metaKey: true, shiftKey: true })
    expect(marks()).toEqual(["Plain"])
    press({ key: "z", metaKey: true })
    press({ key: "y", ctrlKey: true })
    expect(marks()).toEqual([])
  })

  it("does not hijack Ctrl+Z in inputs, textareas or contenteditable editors", () => {
    mount()
    markOnce()
    const outside = document.createElement("div")
    outside.innerHTML = '<input id="i"><textarea id="t"></textarea><div id="c" contenteditable="true"><span>x</span></div>'
    document.body.append(outside)
    for (const target of [outside.querySelector("#i")!, outside.querySelector("#t")!, outside.querySelector("#c span")!]) {
      expect(press({ key: "z", ctrlKey: true }, target).defaultPrevented).toBe(false)
    }
    expect(marks()).toEqual(["Plain"])
  })

  it("ignores Ctrl+Z from elsewhere on the page, but acts after the reader was used", () => {
    mount()
    markOnce()
    const outside = document.createElement("button")
    document.body.append(outside)
    expect(press({ key: "z", ctrlKey: true }, outside).defaultPrevented).toBe(false)
    expect(marks()).toEqual(["Plain"])
    button("mark").focus()
    expect(press({ key: "z", ctrlKey: true }, button("mark")).defaultPrevented).toBe(true)
    expect(marks()).toEqual([])
  })

  it("leaves the browser's own undo alone when there is nothing to undo or redo", () => {
    mount()
    expect(press({ key: "z", ctrlKey: true }, firstParagraph()).defaultPrevented).toBe(false)
    expect(press({ key: "y", ctrlKey: true }, firstParagraph()).defaultPrevented).toBe(false)
  })

  it("stops listening once destroyed", () => {
    const reader = mount()
    markOnce()
    reader.destroy()
    expect(press({ key: "z", ctrlKey: true }, firstParagraph()).defaultPrevented).toBe(false)
    expect(marks()).toEqual(["Plain"])
  })
})
