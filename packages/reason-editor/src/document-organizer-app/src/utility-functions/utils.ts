/**
 * @module utility-functions/utils
 * @description General-purpose utilities: `cn` (class-name merger via clsx
 * + tailwind-merge) and other project-wide helper functions.
 */
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | boolean | undefined | null)[]) {
  return twMerge(clsx(inputs));
}
