import { elementToMarkdown, elementToPlainText } from '../markdown';
import type { ChatMessage, ChatRole } from '../types';

export function pickFirst(doc: Document, selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = doc.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

/** The form around the box, else the nearest of `selectors`, else a couple of levels up. */
export function composerAround(input: HTMLElement, selectors: string[] = []): HTMLElement {
  for (const selector of [...selectors, 'form']) {
    const found = input.closest<HTMLElement>(selector);
    if (found) return found;
  }
  return input.parentElement?.parentElement ?? input.parentElement ?? input;
}

export interface RoleExtraction {
  /** Selector for user turns. */
  user?: string;
  /** Selector for assistant turns. */
  assistant?: string;
  /** For sites that mark both roles with one selector: decides the role of each match. */
  both?: { selector: string; roleOf: (el: Element) => ChatRole | null };
  /** Narrows a matched turn to the element that holds the message text. */
  content?: (el: Element, role: ChatRole) => Element | null;
  /** Descendants removed from a copy of the turn before it is converted (thinking blocks, toolbars). */
  exclude?: string;
  /** Convert user turns as Markdown too. By default they keep exactly what was typed. */
  userAsMarkdown?: boolean;
}

function textOf(el: Element, asMarkdown: boolean, exclude?: string): string {
  const convert = asMarkdown ? elementToMarkdown : elementToPlainText;
  if (!exclude || !el.querySelector(exclude)) return convert(el);
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll(exclude).forEach((n) => n.remove());
  return convert(copy);
}

/** Collects turns in document order, skipping matches nested inside another match. */
export function extractByRole(doc: Document, spec: RoleExtraction): ChatMessage[] {
  const selectors = [spec.user, spec.assistant, spec.both?.selector].filter(Boolean) as string[];
  if (!selectors.length) return [];
  const matched = Array.from(doc.querySelectorAll(selectors.join(',')));
  const messages: ChatMessage[] = [];
  for (const el of matched) {
    if (matched.some((other) => other !== el && other.contains(el))) continue;
    let role: ChatRole | null = null;
    if (spec.user && el.matches(spec.user)) role = 'user';
    else if (spec.assistant && el.matches(spec.assistant)) role = 'assistant';
    else if (spec.both) role = spec.both.roleOf(el);
    if (!role) continue;
    const target = spec.content?.(el, role) ?? el;
    const text = textOf(target, role === 'assistant' || !!spec.userAsMarkdown, spec.exclude);
    if (text) messages.push({ role, text });
  }
  return messages;
}
