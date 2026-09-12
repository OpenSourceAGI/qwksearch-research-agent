/**
 * `next/cache` replacement. The Worker has no ISR cache, so tag revalidation is
 * a no-op and `unstable_cache` is a transparent pass-through.
 */
export const revalidateTag = (_tag: string, _profile?: string) => undefined;
export const revalidatePath = (_path: string) => undefined;
export const unstable_cache = <T extends (...args: any[]) => Promise<unknown>>(fn: T): T => fn;
export const unstable_noStore = () => undefined;
export const cacheTag = () => undefined;
export const cacheLife = () => undefined;
