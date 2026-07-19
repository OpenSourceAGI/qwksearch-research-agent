import { createCommand, LexicalCommand } from 'lexical';

/**
 * Command to apply highlight with a specific color
 */
export const APPLY_HIGHLIGHT_COMMAND: LexicalCommand<string> = createCommand('APPLY_HIGHLIGHT_COMMAND');
