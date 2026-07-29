/**
 * @fileoverview Provides the `cn` class-name helper that merges `clsx` conditional classes with `tailwind-merge` conflict resolution.
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
