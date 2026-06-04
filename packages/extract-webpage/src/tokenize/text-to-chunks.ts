/**
 * @fileoverview Utility for splitting text into semantic chunks for RAG and NLP tasks.
 * Uses complex regex patterns to identify structural elements like lists, tables, and code.
 * 
 * ### Split Text by Semantic Characters 
 * <img width="350px"  src="https://i.imgur.com/RpXf5as.png" /> 
 * 
 * 
 * Splits document text into semantic chunks based on various textual and structural
    * elements like HTML, markdown, and paragraphs.
 * 
 * This function performs a comprehensive tokenization of the input text, considering a wide range
    * of semantic elements and structural patterns commonly found in documents.It uses regular
        * expressions to identify and separate the following elements:
 * 
 * 1. Headings(Setext - style, Markdown, and HTML - style)
    * 2. Citations(e.g., [1])
        * 3. List items(bulleted, numbered, lettered, or task lists, including nested up to three levels)
            * 4. Block quotes(including nested quotes and citations, up to three levels)
                * 5. Code blocks(fenced, indented, or HTML pre / code tags)
                    * 6. Tables(Markdown, grid tables, and HTML tables)
                        * 7. Horizontal rules(Markdown and HTML hr tag)
                            * 8. Standalone lines or phrases(including single - line blocks and HTML elements)
                                * 9. Sentences or phrases ending with punctuation(including ellipsis and Unicode punctuation)
                                * 10. Quoted text, parenthetical phrases, or bracketed content
                                    * 11. Paragraphs
                                        * 12. HTML - like tags and their content(including self - closing tags and attributes)
                                            * 13. LaTeX - style math expressions(inline and block)
                                                * 14. Any remaining content(fallback)
                                                    * 
 * The function applies various length constraints to each type of element to ensure reasonable
    * chunk sizes.It also handles nested structures and special cases like code blocks and math
        * expressions.
 * 
 * [Sentence RAG Benchmarks](https://superlinked.com/vectorhub/articles/evaluation-rag-retrieval-chunking-methods)
 * 
 * @author[Jina AI(2024)](https://gist.github.com/hanxiao/3f60354cf6dc5ac698bc9154163b4e6a)
            * @param { string } text - The input text to be split into semantic chunks.
 * @param { Object }[options = {}] - Optional configuration options(currently unused).
 * @returns { Array.<string> } An array of text chunks, each representing a semantic unit of the document.
 * @category Topics
        * @example
        * const text = "# Heading\n\nThis is a paragraph.\n\n- List item 1\n- List item 2\n\n";
 * const chunks = splitTextSemanticChars(text);
 * console.log(chunks);
 * // Output: ['# Heading', 'This is a paragraph.', '- List item 1', '- List item 2']
 */
export function splitTextSemanticChars(text, options = {}) {

    const MAX_SENTENCE_LENGTH = 400;
    const MAX_HEADING_LENGTH = 7;
    const MAX_HEADING_CONTENT_LENGTH = 200;
    const MAX_HEADING_UNDERLINE_LENGTH = 200;
    const MAX_HTML_HEADING_ATTRIBUTES_LENGTH = 100;
    const MAX_LIST_ITEM_LENGTH = 200;
    const MAX_NESTED_LIST_ITEMS = 6;
    const MAX_LIST_INDENT_SPACES = 7;
    const MAX_BLOCKQUOTE_LINE_LENGTH = 200;
    const MAX_BLOCKQUOTE_LINES = 15;
    const MAX_CODE_BLOCK_LENGTH = 1500;
    const MAX_CODE_LANGUAGE_LENGTH = 20;
    const MAX_INDENTED_CODE_LINES = 20;
    const MAX_TABLE_CELL_LENGTH = 200;
    const MAX_TABLE_ROWS = 20;
    const MAX_HTML_TABLE_LENGTH = 2000;
    const MIN_HORIZONTAL_RULE_LENGTH = 3;
    const MAX_QUOTED_TEXT_LENGTH = 300;
    const MAX_PARENTHETICAL_CONTENT_LENGTH = 200;
    const MAX_NESTED_PARENTHESES = 5;
    const MAX_MATH_INLINE_LENGTH = 100;
    const MAX_MATH_BLOCK_LENGTH = 500;
    const MAX_PARAGRAPH_LENGTH = 1000;
    const MAX_STANDALONE_LINE_LENGTH = 800;
    const MAX_HTML_TAG_ATTRIBUTES_LENGTH = 100;
    const MAX_HTML_TAG_CONTENT_LENGTH = 1000;
    const LOOKAHEAD_RANGE = 100;  // Number of characters to look ahead for a sentence boundary

    const AVOID_AT_START = `[\\s\\]})>,']`;
    const PUNCTUATION = `[.!?\u2026]|\\.{3}|[\\u2026\\u2047-\\u2049]|[\\p{Emoji_Presentation}\\p{Extended_Pictographic}]`;
    const QUOTE_END = `(?:'(?=\`)|''(?=\`\`))`;
    const SENTENCE_END = `(?:${PUNCTUATION}(?<!${AVOID_AT_START}(?=${PUNCTUATION}))|${QUOTE_END})(?=\\S|$)`;
    const SENTENCE_BOUNDARY = `(?:${SENTENCE_END}|(?=[\\r\\n]|$))`;
    const LOOKAHEAD_PATTERN = `(?:(?!${SENTENCE_END}).){1,${LOOKAHEAD_RANGE}}${SENTENCE_END}`;
    const NOT_PUNCTUATION_SPACE = `(?!${PUNCTUATION}\\s)`;
    const SENTENCE_PATTERN = `${NOT_PUNCTUATION_SPACE}(?:[^\\r\\n]{1,{MAX_LENGTH}}${SENTENCE_BOUNDARY}|[^\\r\\n]{1,{MAX_LENGTH}}(?=${PUNCTUATION}|${QUOTE_END})(?:${LOOKAHEAD_PATTERN})?)${AVOID_AT_START}*`;


    var arrayTextChunks = Array.from(text?.match(new RegExp(
        "(" +
        // 1. Headings (Setext-style, Markdown, and HTML-style, with length constraints)
        `(?:^(?:[#*=-]{1,${MAX_HEADING_LENGTH}}|\\w[^\\r\\n]{0,${MAX_HEADING_CONTENT_LENGTH}}\\r?\\n[-=]{2,${MAX_HEADING_UNDERLINE_LENGTH}}|<h[1-6][^>]{0,${MAX_HTML_HEADING_ATTRIBUTES_LENGTH}}>)[^\\r\\n]{1,${MAX_HEADING_CONTENT_LENGTH}}(?:</h[1-6]>)?(?:\\r?\\n|$))` +
        "|" +
        // New pattern for citations
        `(?:\\[[0-9]+\\][^\\r\\n]{1,${MAX_STANDALONE_LINE_LENGTH}})` +
        "|" +
        // 2. List items (bulleted, numbered, lettered, or task lists, including nested, up to three levels, with length constraints)
        `(?:(?:^|\\r?\\n)[ \\t]{0,3}(?:[-*+\u2022]|\\d{1,3}\\.\\w\\.|\\[[ xX]\\])[ \\t]+${SENTENCE_PATTERN.replace(/{MAX_LENGTH}/g, String(MAX_LIST_ITEM_LENGTH))}` +
        `(?:(?:\\r?\\n[ \\t]{2,5}(?:[-*+\u2022]|\\d{1,3}\\.\\w\\.|\\[[ xX]\\])[ \\t]+${SENTENCE_PATTERN.replace(/{MAX_LENGTH}/g, String(MAX_LIST_ITEM_LENGTH))}){0,${MAX_NESTED_LIST_ITEMS}}` +
        `(?:\\r?\\n[ \\t]{4,${MAX_LIST_INDENT_SPACES}}(?:[-*+\u2022]|\\d{1,3}\\.\\w\\.|\\[[ xX]\\])[ \\t]+${SENTENCE_PATTERN.replace(/{MAX_LENGTH}/g, String(MAX_LIST_ITEM_LENGTH))}){0,${MAX_NESTED_LIST_ITEMS}})?)` +
        "|" +
        // 3. Block quotes (including nested quotes and citations, up to three levels, with length constraints)
        `(?:(?:^>(?:>|\\s{2,}){0,2}${SENTENCE_PATTERN.replace(/{MAX_LENGTH}/g, String(MAX_BLOCKQUOTE_LINE_LENGTH))}\\r?\\n?){1,${MAX_BLOCKQUOTE_LINES}})` +
        "|" +
        // 4. Code blocks (fenced, indented, or HTML pre/code tags, with length constraints)
        `(?:(?:^|\\r?\\n)(?:\`\`\`|~~~)(?:\\w{0,${MAX_CODE_LANGUAGE_LENGTH}})?\\r?\\n[\\s\\S]{0,${MAX_CODE_BLOCK_LENGTH}}?(?:\`\`\`|~~~)\\r?\\n?` +
        `|(?:(?:^|\\r?\\n)(?: {4}|\\t)[^\\r\\n]{0,${MAX_LIST_ITEM_LENGTH}}(?:\\r?\\n(?: {4}|\\t)[^\\r\\n]{0,${MAX_LIST_ITEM_LENGTH}}){0,${MAX_INDENTED_CODE_LINES}}\\r?\\n?)` +
        `|(?:<pre>(?:<code>)?[\\s\\S]{0,${MAX_CODE_BLOCK_LENGTH}}?(?:</code>)?</pre>))` +
        "|" +
        // 5. Tables (Markdown, grid tables, and HTML tables, with length constraints)
        `(?:(?:^|\\r?\\n)(?:\\|[^\\r\\n]{0,${MAX_TABLE_CELL_LENGTH}}\\|(?:\\r?\\n\\|[-:]{1,${MAX_TABLE_CELL_LENGTH}}\\|){0,1}(?:\\r?\\n\\|[^\\r\\n]{0,${MAX_TABLE_CELL_LENGTH}}\\|){0,${MAX_TABLE_ROWS}}` +
        `|<table>[\\s\\S]{0,${MAX_HTML_TABLE_LENGTH}}?</table>))` +
        "|" +
        // 6. Horizontal rules (Markdown and HTML hr tag)
        `(?:^(?:[-*_]){${MIN_HORIZONTAL_RULE_LENGTH},}\\s*$|<hr\\s*/?>)` +
        "|" +
        // 10. Standalone lines or phrases (including single-line blocks and HTML elements, with length constraints)
        `(?!${AVOID_AT_START})(?:^(?:<[a-zA-Z][^>]{0,${MAX_HTML_TAG_ATTRIBUTES_LENGTH}}>)?${SENTENCE_PATTERN.replace(/{MAX_LENGTH}/g, String(MAX_STANDALONE_LINE_LENGTH))}(?:</[a-zA-Z]+>)?(?:\\r?\\n|$))` +
        "|" +
        // 7. Sentences or phrases ending with punctuation (including ellipsis and Unicode punctuation)
        `(?!${AVOID_AT_START})${SENTENCE_PATTERN.replace(/{MAX_LENGTH}/g, String(MAX_SENTENCE_LENGTH))}` +
        "|" +
        // 8. Quoted text, parenthetical phrases, or bracketed content (with length constraints)
        "(?:" +
        `(?<!\\w)\"\"\"[^\"]{0,${MAX_QUOTED_TEXT_LENGTH}}\"\"\"(?!\\w)` +
        `|(?<!\\w)(?:['\"\`'"])[^\\r\\n]{0,${MAX_QUOTED_TEXT_LENGTH}}\\1(?!\\w)` +
        `|(?<!\\w)\`[^\\r\\n]{0,${MAX_QUOTED_TEXT_LENGTH}}'(?!\\w)` +
        `|(?<!\\w)\`\`[^\\r\\n]{0,${MAX_QUOTED_TEXT_LENGTH}}''(?!\\w)` +
        `|\\([^\\r\\n()]{0,${MAX_PARENTHETICAL_CONTENT_LENGTH}}(?:\\([^\\r\\n()]{0,${MAX_PARENTHETICAL_CONTENT_LENGTH}}\\)[^\\r\\n()]{0,${MAX_PARENTHETICAL_CONTENT_LENGTH}}){0,${MAX_NESTED_PARENTHESES}}\\)` +
        `|\\[[^\\r\\n\\[\\]]{0,${MAX_PARENTHETICAL_CONTENT_LENGTH}}(?:\\[[^\\r\\n\\[\\]]{0,${MAX_PARENTHETICAL_CONTENT_LENGTH}}\\][^\\r\\n\\[\\]]{0,${MAX_PARENTHETICAL_CONTENT_LENGTH}}){0,${MAX_NESTED_PARENTHESES}}\\]` +
        `|\\$[^\\r\\n$]{0,${MAX_MATH_INLINE_LENGTH}}\\$` +
        `|\`[^\`\\r\\n]{0,${MAX_MATH_INLINE_LENGTH}}\`` +
        ")" +
        "|" +
        // 9. Paragraphs (with length constraints)
        `(?!${AVOID_AT_START})(?:(?:^|\\r?\\n\\r?\\n)(?:<p>)?${SENTENCE_PATTERN.replace(/{MAX_LENGTH}/g, String(MAX_PARAGRAPH_LENGTH))}(?:</p>)?(?=\\r?\\n\\r?\\n|$))` +
        "|" +
        // 11. HTML-like tags and their content (including self-closing tags and attributes, with length constraints)
        `(?:<[a-zA-Z][^>]{0,${MAX_HTML_TAG_ATTRIBUTES_LENGTH}}(?:>[\\s\\S]{0,${MAX_HTML_TAG_CONTENT_LENGTH}}?</[a-zA-Z]+>|\\s*/>))` +
        "|" +
        // 12. LaTeX-style math expressions (inline and block, with length constraints)
        `(?:(?:\\$\\$[\\s\\S]{0,${MAX_MATH_BLOCK_LENGTH}}?\\$\\$)|(?:\\$[^\\$\\r\\n]{0,${MAX_MATH_INLINE_LENGTH}}\\$))` +
        "|" +
        // 14. Fallback for any remaining content (with length constraints)
        `(?!${AVOID_AT_START})${SENTENCE_PATTERN.replace(/{MAX_LENGTH}/g, String(MAX_STANDALONE_LINE_LENGTH))}` +
        ")",
        "gmu"
    )));

    return arrayTextChunks;
}