/**
 * @fileoverview Every help doc as one plain-text file, for LLM consumers.
 */
import { getLLMFullText } from 'qwksearch-help-docs/llms';

export const revalidate = false;

export function GET() {
  return new Response(getLLMFullText(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
