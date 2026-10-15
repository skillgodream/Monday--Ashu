import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Standard utility function for conditionally combining Tailwind CSS class names
 * with automatic conflict resolution via tailwind-merge (Shadcn/ui standard).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
