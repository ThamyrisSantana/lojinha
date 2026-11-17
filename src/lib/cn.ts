import { clsx, type ClassValue } from 'clsx';

/** Joins class names, skipping falsy ones: cn('a', cond && 'b'). */
export const cn = (...classes: ClassValue[]): string => clsx(classes);
