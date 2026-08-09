/**
 * Stand-in for the `cloudflare:workers` runtime module, which only resolves
 * inside workerd. `NotebookRunner` extends `Container` purely to inherit
 * lifecycle plumbing, so an empty base class is enough to import the worker.
 */
export class Container {
  ctx: {
    container: { start: (options: unknown) => void };
    storage: { get: <T>(key: string) => Promise<T | undefined> };
  };

  constructor() {
    this.ctx = {
      container: { start: () => {} },
      storage: { get: async () => undefined },
    };
  }
}

export class DurableObject {}
