/**
 * Test stub for `react-tweet`.
 *
 * Its published ESM imports CSS modules, which Node cannot load when Vitest
 * externalizes the package. Nothing under test renders a tweet — the import
 * only reaches the graph because both this package's Twitter extension and
 * Novel's own bundle pull it in — so a stub component is enough.
 */

export function Tweet(_props: { id?: string }) {
  return null;
}

export function TweetSkeleton() {
  return null;
}

export function TweetNotFound() {
  return null;
}
