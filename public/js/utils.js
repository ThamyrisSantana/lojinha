/* Shared helpers: DOM shortcuts, number/date formatting, sorting and storage.
   Every other script relies on these, so this file loads first. */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escapes a value for safe use inside HTML text and attributes. */
const esc = s =>
  String(s ?? '').replace(
    /[&<>"']/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/** Parses user input ("1,5", " 2 ", "") into a finite number; anything invalid becomes 0. */
const num = v => {
  if (v == null || v === '') return 0;
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : 0;
};
/** True when a form value was actually filled in (0 counts, an empty string does not). */
const filled = v => v !== '' && v != null;

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl = n => BRL.format(isFinite(n) ? n : 0);
const fmt = (n, digits = 2) => Number(isFinite(n) ? n : 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });
const pct = n => fmt(n, 1) + '%';
/** "1 peça" / "2 peças". The plural defaults to the singular + "s". */
const plural = (n, one, many = one + 's') => (n === 1 ? one : many);

/* ---------- dates (always "YYYY-MM-DD" strings in local time) ---------- */
const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const thisMonth = () => today().slice(0, 7);
const nowISO = () => new Date().toISOString();
const addDays = (s, n) => {
  const d = new Date(s + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const shiftMonth = (k, n) => {
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
};
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];
const mesLabel = k => {
  const [y, m] = k.split('-');
  return MES[+m - 1] + '/' + y.slice(2);
};
const mesLongo = k => {
  if (!k) return 'Todos os meses';
  const [y, m] = k.split('-');
  return MESES[+m - 1] + ' de ' + y;
};
const dataBR = s => (s ? s.split('-').reverse().join('/') : '—');
/** True when a dated record ("YYYY-MM-DD") falls in month k ("YYYY-MM"). */
const inMonth = (rec, k) => (rec.data || '').startsWith(k);

/* ---------- sorting ---------- */
const byName = (a, b) => (a.nome || '').localeCompare(b.nome || '');
const byDateDesc = (a, b) => (b.data || '').localeCompare(a.data || '');
const byDateAsc = (a, b) => (a.data || '').localeCompare(b.data || '');
const sortedByName = list => [...list].sort(byName);

/* ---------- misc ---------- */
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const lsGet = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch (_) {
    return fallback;
  }
};
const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {
    /* storage full or blocked: the app keeps working without it */
  }
};
