/* Number and text formatting (pt-BR). */
import type { NumLike } from '@/domain/types';

/** Parses user input ("1,5", " 2 ", "") into a finite number; anything invalid becomes 0. */
export function num(v: NumLike): number {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** True when a form value was actually filled in (0 counts, an empty string does not). */
export const filled = (v: NumLike): boolean => v !== '' && v != null;

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const brl = (n: number): string => BRL.format(Number.isFinite(n) ? n : 0);
export const fmt = (n: NumLike, digits = 2): string =>
  (Number.isFinite(Number(n)) ? Number(n) : 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });
export const pct = (n: number): string => fmt(n, 1) + '%';
/** Short currency for chart axes: R$600, R$1,5k. */
export const brlShort = (v: number): string => (v >= 1000 ? 'R$' + fmt(v / 1000, 1) + 'k' : 'R$' + fmt(v, 0));

/** "1 peça" / "2 peças". The plural defaults to the singular + "s". */
export const plural = (n: number, one: string, many = one + 's'): string => (n === 1 ? one : many);

/** A valid decimal as typed in a form (empty allowed): "12", "1,5", "-0.3". */
export const DECIMAL = /^\s*-?\d*([.,]\d+)?\s*$/;
