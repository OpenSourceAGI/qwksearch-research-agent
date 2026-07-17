/**
 * Shim for next/navigation so research-agent-ui can run inside a Chrome
 * extension (WXT/Vite) without a Next.js runtime.
 *
 * - useRouter: returns a no-op router (push/replace/back are silent)
 * - useParams: always returns {} — ChatProvider generates its own UUID
 * - useSearchParams: returns an empty URLSearchParams wrapper
 */

export function useRouter() {
  return {
    push: (_url: string) => {},
    replace: (_url: string) => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
    prefetch: (_url: string) => {},
  };
}

export function useParams<T extends Record<string, string | string[]> = {}>(): T {
  return {} as T;
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function usePathname(): string {
  return '/';
}
