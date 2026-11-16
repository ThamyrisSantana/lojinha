/* Dates are "YYYY-MM-DD" strings in local time; months are "YYYY-MM". */

export function today(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
export const thisMonth = (): string => today().slice(0, 7);
export const nowISO = (): string => new Date().toISOString();

export function addDays(s: string, n: number): string {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function shiftMonth(k: string, n: number): string {
  let [y, m] = k.split('-').map(Number);
  m += n;
  while (m < 1) {
    m += 12;
    y--;
  }
  while (m > 12) {
    m -= 12;
    y++;
  }
  return y + '-' + String(m).padStart(2, '0');
}

const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** "out/26" */
export function mesLabel(k: string): string {
  const [y, m] = k.split('-');
  return MES[+m - 1] + '/' + y.slice(2);
}
/** "outubro de 2026"; an empty month means all of them. */
export function mesLongo(k: string): string {
  if (!k) return 'Todos os meses';
  const [y, m] = k.split('-');
  return MESES[+m - 1] + ' de ' + y;
}
/** "05/10/2026" */
export const dataBR = (s?: string): string => (s ? s.split('-').reverse().join('/') : '—');
/** True when a dated record falls in month k. */
export const inMonth = (rec: { data?: string }, k: string): boolean => (rec.data || '').startsWith(k);

/** Due-date label: "Hoje", "Amanhã", "Ontem", or a short date. */
export function prazoLabel(p?: string): string {
  if (!p) return '';
  const h = today();
  if (p === h) return 'Hoje';
  if (p === addDays(h, 1)) return 'Amanhã';
  if (p === addDays(h, -1)) return 'Ontem';
  const [y, m, d] = p.split('-');
  return d + '/' + m + (y !== h.slice(0, 4) ? '/' + y.slice(2) : '');
}
