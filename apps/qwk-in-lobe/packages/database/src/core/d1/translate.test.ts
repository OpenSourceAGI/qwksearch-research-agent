import { describe, expect, it } from 'vitest';

import { inlineParams, isTransactionControl, toD1Value, translateSQL } from './translate';

describe('translateSQL', () => {
  it('turns $n placeholders into ?n and strips casts', () => {
    expect(
      translateSQL('select count(*)::int from "messages" where "id" = $1 and "n" > $12::integer'),
    ).toBe('select count(*) from "messages" where "id" = ?1 and "n" > ?12');
  });

  it('keeps string literals and casts inside them untouched', () => {
    expect(translateSQL(`select 'a::text $1 ilike' from "t" where "x" ilike $1`)).toBe(
      `select 'a::text $1 ilike' from "t" where "x" like ?1`,
    );
  });

  it('wraps jsonb-cast params and literals in json()', () => {
    expect(translateSQL(`select jsonb_build_object('a', $1::jsonb, 'b', '{}'::jsonb)`)).toBe(
      `select json_object('a', json(?1), 'b', json('{}'))`,
    );
  });

  it('renames LobeHub tables that clash with QwkSearch tables', () => {
    expect(translateSQL('select "documents"."id" from "documents"')).toBe(
      'select "lobe_documents"."id" from "lobe_documents"',
    );
  });

  it('maps now(), gen_random_uuid() and row locks', () => {
    const out = translateSQL('select now(), gen_random_uuid() from "t" for update');
    expect(out).toContain(`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`);
    expect(out).toContain('randomblob');
    expect(out).not.toMatch(/for update/i);
  });

  it('unwraps the parenthesized members of a compound select', () => {
    expect(
      translateSQL(
        '((select "id" from "topics" where false) union all (select "id" from "documents" where "a" = $1)) union all (select "id" from "tasks") order by updated_at desc limit $2',
      ),
    ).toBe(
      'select * from (select * from (select "id" from "topics" where false) union all select * from (select "id" from "lobe_documents" where "a" = ?1)) union all select * from (select "id" from "tasks") order by updated_at desc limit ?2',
    );
  });

  it('turns select distinct on into a row_number() window keeping row 1', () => {
    expect(
      translateSQL(
        'select distinct on ("messages"."topic_id") "topic_id", left("content", $1) from "messages" where "messages"."role" = $2 order by "messages"."topic_id", "messages"."created_at" desc limit $3',
      ),
    ).toBe(
      'select * from (select "topic_id", substr("content", 1, ?1), row_number() over (partition by "messages"."topic_id" order by "messages"."topic_id", "messages"."created_at" desc) as "__d1_rn" from "messages" where "messages"."role" = ?2) as "__d1_distinct" where "__d1_rn" = 1 limit ?3',
    );
  });

  it('leaves subqueries next to a compound operator alone', () => {
    expect(
      translateSQL('select 1 from "t" where "id" in (select "id" from "u") union select 2'),
    ).toBe('select 1 from "t" where "id" in (select "id" from "u") union select 2');
  });

  it('rewrites = any($n) into a json_each lookup', () => {
    expect(translateSQL('select 1 from "t" where "id" = any($1)')).toBe(
      'select 1 from "t" where "id" in (select value from json_each(?1))',
    );
  });

  it('turns a jsonb object || into a shallow merge, not string concat', () => {
    const out = translateSQL(`update "t" set "s" = coalesce("t"."s", '{}'::jsonb) || $1::jsonb`);
    expect(out).toContain('json_group_object');
    expect(out).not.toContain('||');
    // string concat stays
    expect(translateSQL(`select "a" || '-' || "b" from "t"`)).toBe(
      `select "a" || '-' || "b" from "t"`,
    );
  });

  it('maps jsonb_set paths, #>> paths, the ? operator and left()', () => {
    expect(translateSQL(`select jsonb_set("t"."m", '{a,b}', '"x"'::jsonb, true) from "t"`)).toBe(
      `select json_set("t"."m", '$."a"."b"', json(json('"x"'))) from "t"`,
    );
    expect(translateSQL(`select "m"#>>'{run,at}' from "t"`)).toBe(
      `select "m"->>'$."run"."at"' from "t"`,
    );
    expect(translateSQL(`select 1 from "t" where "m" ? 'usage'`)).toBe(
      `select 1 from "t" where (json_type("m", '$."usage"') IS NOT NULL)`,
    );
    expect(translateSQL(`select left("content", $1) from "t"`)).toBe(
      `select substr("content", 1, ?1) from "t"`,
    );
  });

  it('maps jsonb_array_elements with an alias to json_each', () => {
    expect(
      translateSQL(
        `select 1 from jsonb_array_elements("t"."p") as remap where remap ->> 'id' = $1`,
      ),
    ).toBe(`select 1 from json_each("t"."p") as remap where remap.value ->> 'id' = ?1`);
  });
});

describe('params', () => {
  it('coerces values D1 cannot bind', () => {
    expect(toD1Value(true)).toBe(1);
    expect(toD1Value(undefined)).toBeNull();
    expect(toD1Value(new Date('2026-01-02T03:04:05.000Z'))).toBe('2026-01-02T03:04:05.000Z');
    expect(toD1Value(['a', 'b'])).toBe('["a","b"]');
    expect(toD1Value(10n)).toBe(10);
  });

  it('inlines parameters as SQL literals', () => {
    expect(inlineParams(`select ?1, ?2, '?3' from "t?"`, ["it's", 2])).toBe(
      `select 'it''s', 2, '?3' from "t?"`,
    );
  });

  it('recognises transaction control statements', () => {
    expect(isTransactionControl('begin')).toBe(true);
    expect(isTransactionControl('COMMIT')).toBe(true);
    expect(isTransactionControl('select 1')).toBe(false);
  });
});
