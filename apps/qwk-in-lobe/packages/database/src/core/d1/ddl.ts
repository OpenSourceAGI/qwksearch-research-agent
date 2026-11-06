/**
 * SQLite DDL for LobeHub's tables, generated from the drizzle Postgres schema.
 *
 * Used by `scripts/generateD1LobeSchema.mts` to write
 * `migrations/d1/0005_lobehub_tables.sql`, and by the D1 test database. Every
 * statement is `IF NOT EXISTS`, so the file is safe to re-run; it does not
 * alter tables that already exist.
 */
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { getTableConfig, PgDialect } from 'drizzle-orm/pg-core';

import { getSchemaTables } from './columns';
import { SQLITE_NOW, SQLITE_UUID, TABLE_RENAMES, translateSQL } from './translate';

const q = (name: string) => `"${name}"`;
const tableName = (name: string) => TABLE_RENAMES[name] ?? name;

const sqliteType = (column: PgColumn): string => {
  const type = column.getSQLType().toLowerCase();
  if (type.endsWith('[]')) return 'TEXT';
  if (/^(?:integer|int|smallint|bigint|serial|bigserial|smallserial)/.test(type)) return 'INTEGER';
  if (type === 'boolean') return 'INTEGER';
  if (/^(?:real|double|numeric|decimal)/.test(type)) return 'REAL';
  if (type === 'bytea') return 'BLOB';
  return 'TEXT';
};

const sqlLiteral = (value: unknown): string => {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return `'${value.replaceAll("'", "''")}'`;
  return `'${JSON.stringify(value).replaceAll("'", "''")}'`;
};

const sqlChunksText = (value: unknown): string | undefined => {
  const chunks = (value as { queryChunks?: unknown[] } | undefined)?.queryChunks;
  if (!chunks) return undefined;
  return chunks
    .map((chunk) => {
      const v = (chunk as { value?: unknown }).value;
      return Array.isArray(v) ? v.join('') : typeof v === 'string' ? v : '';
    })
    .join('');
};

const defaultClause = (column: PgColumn): string => {
  if (!column.hasDefault || column.default === undefined) return '';
  const text = sqlChunksText(column.default);
  if (text === undefined) return ` DEFAULT ${sqlLiteral(column.default)}`;

  const lower = text.trim().toLowerCase();
  if (lower === 'now()' || lower === 'current_timestamp') return ` DEFAULT (${SQLITE_NOW})`;
  if (lower === 'gen_random_uuid()') return ` DEFAULT (${SQLITE_UUID})`;
  if (lower.startsWith('nextval(')) return '';
  const literal = text.trim().match(/^'(.*)'(::.*)?$/s);
  if (literal) {
    const raw = literal[1].replaceAll("''", "'");
    if (/::\s*\w+\[\]/.test(lower) && raw.startsWith('{')) {
      return ` DEFAULT ${sqlLiteral(raw === '{}' ? [] : raw.slice(1, -1).split(','))}`;
    }
    return ` DEFAULT ${sqlLiteral(raw)}`;
  }
  if (lower === 'true' || lower === 'false') return ` DEFAULT ${lower === 'true' ? 1 : 0}`;
  if (/^-?\d+(?:\.\d+)?$/.test(lower)) return ` DEFAULT ${lower}`;
  return '';
};

const dialect = new PgDialect();

/** Index `where` clauses render with table-qualified columns; SQLite wants bare names. */
const renderWhere = (where: unknown, table: string): string | undefined => {
  try {
    const { sql, params } = dialect.sqlToQuery(where as never);
    if (params.length > 0) return undefined;
    return translateSQL(sql).replaceAll(`"${tableName(table)}".`, '');
  } catch {
    return undefined;
  }
};

export const generateD1DDL = (schema: Record<string, unknown>): string => {
  const statements: string[] = [];

  for (const table of getSchemaTables(schema) as PgTable[]) {
    const config = getTableConfig(table);
    const name = tableName(config.name);
    const lines: string[] = [];

    const compositePk = config.primaryKeys[0];
    for (const column of config.columns) {
      const type = sqliteType(column);
      let line = `  ${q(column.name)} ${type}`;
      if (column.primary && !compositePk) {
        line += ' PRIMARY KEY';
        if (type !== 'INTEGER') line += ' NOT NULL';
      } else if (column.notNull) {
        line += ' NOT NULL';
      }
      line += defaultClause(column);
      if (column.isUnique && !column.primary) line += ' UNIQUE';
      lines.push(line);
    }

    if (compositePk) {
      lines.push(`  PRIMARY KEY (${compositePk.columns.map((c) => q(c.name)).join(', ')})`);
    }

    for (const unique of config.uniqueConstraints) {
      lines.push(`  UNIQUE (${unique.columns.map((c) => q(c.name)).join(', ')})`);
    }

    for (const fk of config.foreignKeys) {
      const ref = fk.reference();
      const target = getTableConfig(ref.foreignTable as PgTable).name;
      let line = `  FOREIGN KEY (${ref.columns.map((c) => q(c.name)).join(', ')}) REFERENCES ${q(tableName(target))} (${ref.foreignColumns.map((c) => q(c.name)).join(', ')})`;
      if (fk.onDelete) line += ` ON DELETE ${fk.onDelete.toUpperCase()}`;
      if (fk.onUpdate) line += ` ON UPDATE ${fk.onUpdate.toUpperCase()}`;
      lines.push(line);
    }

    statements.push(`CREATE TABLE IF NOT EXISTS ${q(name)} (\n${lines.join(',\n')}\n);`);

    for (const index of config.indexes) {
      const {
        columns,
        name: indexName,
        unique,
        where,
      } = index.config as {
        columns: unknown[];
        name?: string;
        unique: boolean;
        where?: unknown;
      };
      // Only plain column indexes; expression, GIN/HNSW and vector indexes stay Postgres-only.
      // Plain columns arrive as `IndexedColumn`s; expressions as SQL.
      const names = columns.map((c) =>
        (c as { queryChunks?: unknown }).queryChunks ? undefined : (c as { name?: string }).name,
      );
      if (!indexName || names.some((n) => typeof n !== 'string')) continue;
      let whereSql = '';
      if (where) {
        const rendered = renderWhere(where, config.name);
        if (!rendered) continue;
        whereSql = ` WHERE ${rendered}`;
      }
      statements.push(
        `CREATE ${unique ? 'UNIQUE ' : ''}INDEX IF NOT EXISTS ${q(TABLE_RENAMES[indexName] ?? indexName)} ON ${q(name)} (${(names as string[]).map(q).join(', ')})${whereSql};`,
      );
    }
  }

  return statements.join('\n\n') + '\n';
};
