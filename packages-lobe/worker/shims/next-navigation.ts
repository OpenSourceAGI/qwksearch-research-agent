/** `next/navigation` replacement for server-side helpers reachable from the Worker graph. */
export class NextRedirectError extends Error {
  constructor(public readonly url: string) {
    super(`NEXT_REDIRECT;${url}`);
    this.name = 'NextRedirectError';
  }
}

export class NextNotFoundError extends Error {
  constructor() {
    super('NEXT_NOT_FOUND');
    this.name = 'NextNotFoundError';
  }
}

export const redirect = (url: string): never => {
  throw new NextRedirectError(url);
};

export const permanentRedirect = redirect;

export const notFound = (): never => {
  throw new NextNotFoundError();
};
