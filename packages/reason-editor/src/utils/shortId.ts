/**
 * Generates short, unique identifiers. Used to give nodes and elements stable keys and ids.
 */

export function shortId(length = 8) {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
}
