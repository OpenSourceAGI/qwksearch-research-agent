/**
 * Expression-level Postgres → SQLite rewrites that need to see operands and
 * function arguments, not just single words. Runs on the original Postgres
 * text (casts still present, so `::jsonb` tells a JSON merge from a string
 * concat) before `translateSQL`'s word-level pass.
 *
 * - `a || b` on jsonb objects → a shallow merge (Postgres semantics); on jsonb arrays → a
 *   `json_each` union)
 * - `a ? 'key'` (jsonb key exists) and `jsonb_exists(a, 'key')`
 * - `a #>> '{x,y}'` / `a #> '{x,y}'` path extraction
 * - `jsonb_set(t, '{x,y}', v[, create])` → `json_set(t, '$.x.y', json(v))`
 * - `left(s, n)` → `substr(s, 1, n)`, `to_jsonb(x)` → `json_quote(x)`,
 *   `jsonb_strip_nulls(x)` → `x`
 * - `jsonb_array_elements[_text](x) AS t[(col)]` → `json_each(x) AS t`
 */

type TokenType =
  'str' | 'ident' | 'word' | 'param' | 'num' | 'op' | 'lp' | 'rp' | 'comma' | 'ws' | 'raw';

interface Token {
  /** For `raw` tokens produced by a rewrite: whether the expression is jsonb. */
  json?: boolean;
  text: string;
  type: TokenType;
}

const tokenize = (src: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) {
      let j = i;
      while (j < src.length && /\s/.test(src[j])) j++;
      tokens.push({ text: src.slice(i, j), type: 'ws' });
      i = j;
    } else if (c === "'") {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "'" && src[j + 1] === "'") j += 2;
        else if (src[j] === "'") break;
        else j++;
      }
      tokens.push({ text: src.slice(i, j + 1), type: 'str' });
      i = j + 1;
    } else if (c === '"') {
      const j = src.indexOf('"', i + 1);
      tokens.push({ text: src.slice(i, j + 1), type: 'ident' });
      i = j + 1;
    } else if (c === '$' && /\d/.test(src[i + 1] ?? '')) {
      let j = i + 1;
      while (/\d/.test(src[j] ?? '')) j++;
      tokens.push({ text: src.slice(i, j), type: 'param' });
      i = j;
    } else if (/[A-Z_]/i.test(c)) {
      let j = i;
      while (j < src.length && /\w/.test(src[j])) j++;
      tokens.push({ text: src.slice(i, j), type: 'word' });
      i = j;
    } else if (/\d/.test(c)) {
      let j = i;
      while (j < src.length && /[\d.]/.test(src[j])) j++;
      tokens.push({ text: src.slice(i, j), type: 'num' });
      i = j;
    } else if (c === '(') {
      tokens.push({ text: c, type: 'lp' });
      i++;
    } else if (c === ')') {
      tokens.push({ text: c, type: 'rp' });
      i++;
    } else if (c === ',') {
      tokens.push({ text: c, type: 'comma' });
      i++;
    } else {
      const op = ['#>>', '->>', '::', '||', '#>', '->', '?|', '?&', '<>', '<=', '>=', '!='].find(
        (o) => src.startsWith(o, i),
      );
      const text = op ?? c;
      tokens.push({ text, type: 'op' });
      i += text.length;
    }
  }
  return tokens;
};

const join = (tokens: Token[]) => tokens.map((t) => t.text).join('');

const prevIndex = (tokens: Token[], i: number) => {
  let j = i - 1;
  while (j >= 0 && tokens[j].type === 'ws') j--;
  return j;
};
const nextIndex = (tokens: Token[], i: number) => {
  let j = i + 1;
  while (j < tokens.length && tokens[j].type === 'ws') j++;
  return j;
};

const matchBack = (tokens: Token[], rp: number) => {
  let depth = 0;
  for (let j = rp; j >= 0; j--) {
    if (tokens[j].type === 'rp') depth++;
    else if (tokens[j].type === 'lp' && --depth === 0) return j;
  }
  return -1;
};
const matchForward = (tokens: Token[], lp: number) => {
  let depth = 0;
  for (let j = lp; j < tokens.length; j++) {
    if (tokens[j].type === 'lp') depth++;
    else if (tokens[j].type === 'rp' && --depth === 0) return j;
  }
  return -1;
};

const isPrimaryEnd = (t: Token) =>
  ['str', 'ident', 'word', 'param', 'num', 'raw', 'rp'].includes(t.type);

/** Start index of the operand that ends at `end` (inclusive). */
const operandStart = (tokens: Token[], end: number): number => {
  let i = end;
  for (;;) {
    // `x::type`
    const before = prevIndex(tokens, i);
    if (tokens[i].type === 'word' && before >= 0 && tokens[before].text === '::') {
      i = prevIndex(tokens, before);
      continue;
    }
    // `x::type[]`
    if (tokens[i].text === ']' && tokens[before]?.text === '[') {
      i = prevIndex(tokens, before);
      continue;
    }
    let start = i;
    if (tokens[i].type === 'rp') {
      start = matchBack(tokens, i);
      const fn = start - 1;
      if (fn >= 0 && tokens[fn].type === 'word') start = fn;
    } else if (tokens[i].type === 'ident' || tokens[i].type === 'word') {
      // `"t"."c"`
      while (
        start >= 2 &&
        tokens[start - 1].text === '.' &&
        ['ident', 'word'].includes(tokens[start - 2].type)
      ) {
        start -= 2;
      }
    }
    const op = prevIndex(tokens, start);
    if (
      op >= 0 &&
      (tokens[op].text === '->' ||
        tokens[op].text === '->>' ||
        tokens[op].text === '#>' ||
        tokens[op].text === '#>>')
    ) {
      i = prevIndex(tokens, op);
      continue;
    }
    return start;
  }
};

/** End index (inclusive) of the operand that starts at `start`. */
const operandEnd = (tokens: Token[], start: number): number => {
  let i = start;
  if (tokens[i].type === 'word' && tokens[i + 1]?.type === 'lp') i = matchForward(tokens, i + 1);
  else if (tokens[i].type === 'lp') i = matchForward(tokens, i);
  else {
    while (tokens[i + 1]?.text === '.' && ['ident', 'word'].includes(tokens[i + 2]?.type)) i += 2;
  }
  for (;;) {
    const n = nextIndex(tokens, i);
    if (tokens[n]?.text === '::') {
      i = nextIndex(tokens, n);
      if (tokens[i + 1]?.text === '[' && tokens[i + 2]?.text === ']') i += 2;
      continue;
    }
    if (['->', '->>', '#>', '#>>'].includes(tokens[n]?.text)) {
      const m = nextIndex(tokens, n);
      i = operandEnd(tokens, m);
      continue;
    }
    return i;
  }
};

const isJsonExpr = (tokens: Token[], start: number, end: number): boolean => {
  if (start === end && tokens[start].type === 'raw') return !!tokens[start].json;
  const text = join(tokens.slice(start, end + 1))
    .trim()
    .toLowerCase();
  if (/::\s*jsonb?\s*$/.test(text)) return true;
  if (
    /^(?:jsonb?_build_object|jsonb?_build_array|to_jsonb|jsonb_set|jsonb_strip_nulls|json_patch|json_set|json_quote|json_object|json)\s*\(/.test(
      text,
    )
  )
    return true;
  if (/^coalesce\s*\(/.test(text) && /'(?:\{\}|\[\])'\s*::\s*jsonb/.test(text)) return true;
  return false;
};

/** A jsonb array: `'[]'::jsonb`, `coalesce(x, '[]'::jsonb)`, `jsonb_build_array(...)`. */
const isJsonArrayExpr = (tokens: Token[], start: number, end: number): boolean => {
  const text = join(tokens.slice(start, end + 1))
    .trim()
    .toLowerCase();
  return (
    /^'\[.*\]'\s*::\s*jsonb$/s.test(text) ||
    /^coalesce\s*\(.*,\s*'\[\]'\s*::\s*jsonb\s*\)$/s.test(text) ||
    /^jsonb?_build_array\s*\(/.test(text)
  );
};

/**
 * Postgres `a || b` on objects is a shallow merge: b's top-level keys replace
 * a's whole values, nulls included. (`json_patch` would merge recursively and
 * drop null keys.)
 */
const shallowMerge = (a: string, b: string) =>
  `(CASE WHEN (${a}) IS NULL OR (${b}) IS NULL THEN NULL ELSE (select json_group_object(key, ${JSON_EACH_VALUE}) from (select key, value, type from json_each(${a}) where key not in (select key from json_each(${b})) union all select key, value, type from json_each(${b}))) END)`;

/** Postgres array concat: `'[1]'::jsonb || '[2]'::jsonb`. */
const arrayConcat = (a: string, b: string) =>
  `(select json_group_array(${JSON_EACH_VALUE}) from (select value, type from json_each(${a}) union all select value, type from json_each(${b})))`;

/** A `json_each` row's value as JSON (booleans and nested values stay JSON, not 1/0 or text). */
const JSON_EACH_VALUE = `CASE type WHEN 'true' THEN json('true') WHEN 'false' THEN json('false') WHEN 'null' THEN json('null') WHEN 'object' THEN json(value) WHEN 'array' THEN json(value) ELSE value END`;

/** `'{a,b,0}'` → `'$.a.b[0]'` */
const pgPathToJsonPath = (literal: string): string | undefined => {
  const m = literal.match(/^'\{(.*)\}'$/s);
  if (!m) return undefined;
  const parts = m[1].split(',').map((p) => p.trim().replace(/^"(.*)"$/, '$1'));
  return `'$${parts.map((p) => (/^\d+$/.test(p) ? `[${p}]` : `."${p.replaceAll("'", "''")}"`)).join('')}'`;
};

/** `'key'` → `'$."key"'` */
const keyToJsonPath = (literal: string) =>
  literal.startsWith("'") ? `'$."${literal.slice(1, -1)}"'` : `'$."' || ${literal} || '"'`;

const splitArgs = (tokens: Token[], lp: number, rp: number): Token[][] => {
  const args: Token[][] = [[]];
  let depth = 0;
  for (let j = lp + 1; j < rp; j++) {
    const t = tokens[j];
    if (t.type === 'lp') depth++;
    if (t.type === 'rp') depth--;
    if (t.type === 'comma' && depth === 0) args.push([]);
    else args.at(-1)!.push(t);
  }
  return args;
};

const trimText = (tokens: Token[]) => join(tokens).trim();

const rewriteFunctions = (tokens: Token[]): Token[] => {
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    if (t.type !== 'word' || tokens[i + 1]?.type !== 'lp') continue;
    const name = t.text.toLowerCase();
    const lp = i + 1;
    const rp = matchForward(tokens, lp);
    if (rp < 0) continue;
    // Arguments get the operator rewrites first (`jsonb_set(t, p, a || b)`).
    const args = () => splitArgs(tokens, lp, rp).map((arg) => rewriteOperators(arg));
    let replacement: string | undefined;
    let json = false;

    switch (name) {
      case 'left': {
        const a = args();
        if (a.length === 2) replacement = `substr(${trimText(a[0])}, 1, ${trimText(a[1])})`;
        break;
      }
      case 'jsonb_set': {
        const a = args();
        const path = pgPathToJsonPath(trimText(a[1]));
        if (path && a.length >= 3) {
          const create = a[3] ? trimText(a[3]).toLowerCase() !== 'false' : true;
          replacement = `${create ? 'json_set' : 'json_replace'}(${trimText(a[0])}, ${path}, json(${trimText(a[2])}))`;
          json = true;
        }
        break;
      }
      case 'jsonb_exists': {
        const a = args();
        if (a.length === 2) {
          replacement = `(json_type(${trimText(a[0])}, ${keyToJsonPath(trimText(a[1]))}) IS NOT NULL)`;
        }
        break;
      }
      case 'to_jsonb':
      case 'to_json': {
        replacement = `json_quote(${trimText(args()[0])})`;
        json = true;
        break;
      }
      case 'jsonb_strip_nulls': {
        replacement = `(${trimText(args()[0])})`;
        json = true;
        break;
      }
      case 'jsonb_array_elements':
      case 'jsonb_array_elements_text':
      case 'json_array_elements':
      case 'json_array_elements_text': {
        replacement = `json_each(${trimText(args()[0])})`;
        break;
      }
    }

    if (replacement !== undefined) {
      tokens = [
        ...tokens.slice(0, i),
        { json, text: replacement, type: 'raw' },
        ...tokens.slice(rp + 1),
      ];
    }
  }
  return tokens;
};

/** `json_each(x) AS t(col)` → `json_each(x) AS t`, and bare `t` → `t.value`. */
const rewriteJsonEachAliases = (tokens: Token[]): Token[] => {
  const aliases = new Set<string>();
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'raw' || !tokens[i].text.startsWith('json_each(')) continue;
    const as = nextIndex(tokens, i);
    if (tokens[as]?.text.toLowerCase() !== 'as') continue;
    const alias = nextIndex(tokens, as);
    if (tokens[alias]?.type !== 'word' && tokens[alias]?.type !== 'ident') continue;
    aliases.add(tokens[alias].text);
    if (tokens[alias + 1]?.type === 'lp') {
      const rp = matchForward(tokens, alias + 1);
      const cols = splitArgs(tokens, alias + 1, rp).map(trimText);
      tokens.splice(alias + 1, rp - alias);
      // `t(v)`: references to `v` mean the element value.
      for (const col of cols) {
        if (col === 'value') continue;
        for (let j = 0; j < tokens.length; j++) {
          if (tokens[j].type === 'word' && tokens[j].text === col && tokens[j - 1]?.text !== '.') {
            tokens[j] = { text: `${tokens[alias].text}.value`, type: 'raw' };
          }
        }
      }
    } else {
      // No column list: the alias itself stands for the element.
      for (let j = alias + 1; j < tokens.length; j++) {
        if (
          tokens[j].text === tokens[alias].text &&
          tokens[j + 1]?.text !== '.' &&
          tokens[j - 1]?.text !== '.'
        ) {
          tokens[j] = { text: `${tokens[alias].text}.value`, type: 'raw' };
        }
      }
      // ...including references before the FROM (the select list).
      for (let j = 0; j < i; j++) {
        if (
          tokens[j].text === tokens[alias].text &&
          tokens[j + 1]?.text !== '.' &&
          tokens[j - 1]?.text !== '.'
        ) {
          tokens[j] = { text: `${tokens[alias].text}.value`, type: 'raw' };
        }
      }
    }
  }
  return tokens;
};

const rewriteOperators = (tokens: Token[]): Token[] => {
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];

    // `a #>> '{x,y}'`
    if (t.type === 'op' && (t.text === '#>>' || t.text === '#>')) {
      const r = nextIndex(tokens, i);
      const path = tokens[r]?.type === 'str' ? pgPathToJsonPath(tokens[r].text) : undefined;
      if (path) {
        tokens[i] = { text: t.text === '#>>' ? '->>' : '->', type: 'op' };
        tokens[r] = { text: path, type: 'str' };
      }
      continue;
    }

    // `a ? 'key'` — drizzle never emits `?` placeholders for Postgres, so a
    // bare `?` is the jsonb key-exists operator.
    if (t.type === 'op' && t.text === '?') {
      const l = prevIndex(tokens, i);
      const r = nextIndex(tokens, i);
      if (l < 0 || !isPrimaryEnd(tokens[l]) || r >= tokens.length) continue;
      const ls = operandStart(tokens, l);
      const re = operandEnd(tokens, r);
      const left = join(rewriteOperators(tokens.slice(ls, l + 1)));
      const right = join(rewriteOperators(tokens.slice(r, re + 1)));
      tokens = [
        ...tokens.slice(0, ls),
        { text: `(json_type(${left}, ${keyToJsonPath(right)}) IS NOT NULL)`, type: 'raw' },
        ...tokens.slice(re + 1),
      ];
      i = ls;
      continue;
    }

    if (t.type === 'op' && t.text === '||') {
      const l = prevIndex(tokens, i);
      const r = nextIndex(tokens, i);
      if (l < 0 || r >= tokens.length || !isPrimaryEnd(tokens[l])) continue;
      const ls = operandStart(tokens, l);
      const re = operandEnd(tokens, r);
      if (!isJsonExpr(tokens, ls, l) && !isJsonExpr(tokens, r, re)) continue;
      // Operands can hold their own `||` (inside a function call): rewrite those first.
      const left = join(rewriteOperators(tokens.slice(ls, l + 1)));
      const right = join(rewriteOperators(tokens.slice(r, re + 1)));
      const text =
        isJsonArrayExpr(tokens, ls, l) || isJsonArrayExpr(tokens, r, re)
          ? arrayConcat(left, right)
          : shallowMerge(left, right);
      tokens = [...tokens.slice(0, ls), { json: true, text, type: 'raw' }, ...tokens.slice(re + 1)];
      i = ls;
    }
  }
  return tokens;
};

export const rewritePgExpressions = (src: string): string => {
  if (
    !/\|\||\?|#>|jsonb_set|jsonb_exists|left\s*\(|to_jsonb?\s*\(|jsonb_strip_nulls|_array_elements/i.test(
      src,
    )
  ) {
    return src;
  }
  let tokens = tokenize(src);
  tokens = rewriteFunctions(tokens);
  tokens = rewriteJsonEachAliases(tokens);
  tokens = rewriteOperators(tokens);
  return join(tokens);
};
