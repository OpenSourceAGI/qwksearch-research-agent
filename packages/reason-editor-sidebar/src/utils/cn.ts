/**
 * @module utils/cn
 * @description General-purpose class-name merger (clsx + tailwind-merge).
 */
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}
