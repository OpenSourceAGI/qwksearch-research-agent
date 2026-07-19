/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Plugin} from 'prettier';

type PrettierLanguage = 'html' | 'css' | 'js' | 'markdown';

const PARSER_BY_LANGUAGE: Record<PrettierLanguage, string> = {
  css: 'css',
  html: 'html',
  js: 'babel',
  markdown: 'markdown',
};

async function loadPlugins(language: PrettierLanguage): Promise<Plugin[]> {
  switch (language) {
    case 'html':
      // The HTML parser also needs the css/babel parsers for embedded
      // <style> and <script> content.
      return Promise.all([
        import('prettier/plugins/html').then(m => m.default),
        import('prettier/plugins/postcss').then(m => m.default),
        import('prettier/plugins/babel').then(m => m.default),
        import('prettier/plugins/estree').then(m => m.default as Plugin),
      ]);
    case 'css':
      return [(await import('prettier/plugins/postcss')).default];
    case 'js':
      return Promise.all([
        import('prettier/plugins/babel').then(m => m.default),
        import('prettier/plugins/estree').then(m => m.default as Plugin),
      ]);
    case 'markdown':
      return [(await import('prettier/plugins/markdown')).default];
  }
}

/**
 * Formats source code with Prettier's standalone build, loading the
 * formatter and language plugins lazily. Returns the input unchanged if
 * formatting fails (e.g. syntax the parser can't handle).
 */
export async function formatCodeWithPrettier(
  code: string,
  language: PrettierLanguage = 'html',
): Promise<string> {
  try {
    const {format} = await import('prettier/standalone');
    const plugins = await loadPlugins(language);
    return await format(code, {
      parser: PARSER_BY_LANGUAGE[language],
      plugins,
    });
  } catch {
    return code;
  }
}
