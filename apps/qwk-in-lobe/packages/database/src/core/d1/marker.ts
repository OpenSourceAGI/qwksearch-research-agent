/**
 * Lets a model tell the D1 driver apart from Postgres for the few statements
 * the SQL translation cannot express (writable CTEs, `WITH ORDINALITY`).
 * Kept free of imports so models can use it without pulling in the driver.
 */
const D1_MARKER = Symbol.for('lobe:d1-database');

export const markD1Database = <T extends object>(db: T): T => {
  Object.defineProperty(db, D1_MARKER, { value: true });
  return db;
};

export const isD1Database = (db: unknown): boolean =>
  !!db && typeof db === 'object' && (db as Record<symbol, unknown>)[D1_MARKER] === true;
