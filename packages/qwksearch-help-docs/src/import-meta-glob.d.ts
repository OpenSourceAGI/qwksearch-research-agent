/**
 * The `import.meta.glob` signatures this package uses.
 *
 * Declared locally rather than pulling in `vite/client`: `vite` is only a
 * devDependency here (for the `helpDocsMdxPlugin` type), and every consumer
 * that builds this package (the `vinext` app build and Vitest) is Vite-based,
 * so the transform is always available. Method declarations merge into
 * overloads, so this stays compatible with `vite/client` when a consuming
 * app's typecheck also loads it.
 */
interface ImportMeta {
  glob(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;

  glob<T>(pattern: string, options: { eager: true }): Record<string, T>;
}
