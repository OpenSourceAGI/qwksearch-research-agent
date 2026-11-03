/**
 * @module html-to-content/highlight
 * @description Syntax highlighting for fenced code blocks, on highlight.js'
 * core build with an explicit set of languages.
 *
 * Every language below is an ordinary ES module import, registered
 * synchronously when this module loads, so there is no global to publish and
 * no load order to protect. Only the core and the listed grammars are bundled,
 * not highlight.js' full set of ~190 languages, which keeps the Worker bundles
 * that pull this package in small.
 */
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import c from "highlight.js/lib/languages/c";
import cpp from "highlight.js/lib/languages/cpp";
import css from "highlight.js/lib/languages/css";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import markdown from "highlight.js/lib/languages/markdown";
import python from "highlight.js/lib/languages/python";
import rust from "highlight.js/lib/languages/rust";
import sql from "highlight.js/lib/languages/sql";
import typescript from "highlight.js/lib/languages/typescript";
import xml from "highlight.js/lib/languages/xml";
import yaml from "highlight.js/lib/languages/yaml";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("c", c);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("css", css);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("python", python);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("yaml", yaml);
// highlight.js' JavaScript and TypeScript grammars already understand JSX.
hljs.registerAliases(["jsx"], { languageName: "javascript" });
hljs.registerAliases(["tsx"], { languageName: "typescript" });
hljs.registerAliases(["markup"], { languageName: "xml" });

/**
 * Highlights `code` as `lang`, returning HTML made of `hljs-*` spans, or
 * `null` when `lang` is not a registered language or alias — callers render
 * that block escaped and unhighlighted.
 */
export function highlightCode(code: string, lang: string): string | null {
  if (!lang || !hljs.getLanguage(lang)) return null;
  return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
}

export { hljs };
