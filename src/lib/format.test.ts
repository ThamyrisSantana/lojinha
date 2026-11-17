import { addDays, dataBR, mesLabel, prazoLabel, shiftMonth, today } from './dates';
import { brl, fmt, num, pct, plural } from './format';

const NBSP = ' ';

describe('formatting helpers', () => {
  test('num() reads Brazilian decimals and treats junk as zero', () => {
    expect(num('1,5')).toBe(1.5);
    expect(num(' 2 ')).toBe(2);
    expect(num(3)).toBe(3);
    expect(num('')).toBe(0);
    expect(num(null)).toBe(0);
    expect(num('abc')).toBe(0);
  });
  test('brl(), pct(), fmt() use pt-BR formatting', () => {
    expect(brl(1234.5)).toBe(`R$${NBSP}1.234,50`);
    expect(brl(NaN)).toBe(`R$${NBSP}0,00`);
    expect(pct(69.64)).toBe('69,6%');
    expect(fmt(1234.567)).toBe('1.234,57');
  });
  test('plural()', () => {
    expect(plural(1, 'peça')).toBe('peça');
    expect(plural(2, 'peça')).toBe('peças');
  });
});

describe('dates (clock fixed at 2026-10-20)', () => {
  beforeAll(() => vi.setSystemTime(new Date(2026, 9, 20, 12)));
  afterAll(() => vi.useRealTimers());
  test('today() follows the local date', () => expect(today()).toBe('2026-10-20'));
  test('month and date labels', () => {
    expect(mesLabel('2026-10')).toBe('out/26');
    expect(dataBR('2026-10-05')).toBe('05/10/2026');
    expect(dataBR('')).toBe('—');
  });
  test('shiftMonth() crosses year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-03', -15)).toBe('2024-12');
  });
  test('prazoLabel(): relative names near today, short date otherwise', () => {
    expect(prazoLabel('2026-10-20')).toBe('Hoje');
    expect(prazoLabel('2026-10-21')).toBe('Amanhã');
    expect(prazoLabel('2026-10-19')).toBe('Ontem');
    expect(prazoLabel('2026-10-05')).toBe('05/10');
    expect(prazoLabel('2025-10-05')).toBe('05/10/25');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});
