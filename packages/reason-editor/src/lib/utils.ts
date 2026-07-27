/**
 * Shared low-level UI helpers, notably `cn` for merging Tailwind class names. Imported by nearly every component to compose conditional class strings safely.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
// asd
