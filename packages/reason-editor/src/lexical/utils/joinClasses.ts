/**
 * @fileoverview Utility for conditionally joining CSS class names.
 */
export default function joinClasses(
  ...args: Array<string | boolean | null | undefined>
  /**
   * Joins multiple class names into a single string, filtering out falsy values.
   * @param {Array<string | boolean | null | undefined>} args - The classes to join.
   * @returns {string} The joined class string.
   */
) {
  return args.filter(Boolean).join(" ");
}
