import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges Tailwind classes, resolving conflicts (e.g. `cn('p-2', 'p-4')` → `'p-4'`)
 * instead of leaving both in the class list. Used by every component that
 * accepts a `className` prop for overrides.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
