// Unit tests for the dashboard's calculations. Expected values are worked out by hand in the
// comments, from the rules in the README.
import { applyRecords, backupObj, recordsFrom } from '@/data/backup';
import sample from '@/data/exemplo.json';
import { emptyDb, type Db, type Tarefa } from '@/domain/types';
import { createCalc, insStatus, moveTask, taskOrder, totPedido } from './calc';

const close = (actual: number, expected: number) => expect(actual).toBeCloseTo(expected, 6);

// Fixture: two supplies, two products, purchases, a batch, orders and expenses.
// Default settings: hourly rate R$20, margin 100%, platform fee 12%, waste 5%.
function fixture(): Db {
  return {
    ...emptyDb(),
    insumos: [
      { id: 'paper', nome: 'Papel', unidade: 'folha', custoManual: '2' }, // no purchases → manual cost 2
      { id: 'base', nome: 'Base botton', unidade: 'un', estoqueInicial: '10', estoqueMin: '50' }, // cost from purchases
    ],
    produtos: [
      // materials: paper 1/4 sheet × 2 = 0.50, base 1 × 0.6667 → 1.1667; waste 5% → 0.0583;
      // labor 6 min → 2.00; extras 0.30 → total 3.525
      {
        id: 'botton',
        nome: 'Botton',
        tempoMin: '6',
        custoExtra: '0,30',
        estoqueInicial: '5',
        insumos: [
          { insumoId: 'paper', qtd: '1', rende: '4' },
          { insumoId: 'base', qtd: '1', rende: '1' },
        ],
      },
      { id: 'card', nome: 'Cartão', tempoMin: '0', custoExtra: '1', insumos: [] }, // total 1.00
    ],
    gastos: [
      { id: 'g1', data: '2026-10-01', descricao: 'a', valor: '50', frete: '10', insumoId: 'base', qtd: '100' },
      { id: 'g2', data: '2026-10-15', descricao: 'b', valor: '40', frete: '', insumoId: 'base', qtd: '50' }, // base: (60 + 40) / 150
      { id: 'g3', data: '2026-09-10', descricao: 'c', valor: '25', frete: '0' },
    ],
    producoes: [{ id: 'p1', data: '2026-10-02', produtoId: 'botton', qtd: 10, consumo: [{ insumoId: 'base', qtd: 20 }] }],
    pedidos: [
      // subtotal 2 × 8.90 + 1 × 5 = 22.80; + shipping charged 10 − discount 2.80 = 30.00;
      // − platform fee 3 − real shipping 8 = net 19.00
      {
        id: 'o1',
        data: '2026-10-05',
        status: 'novo',
        freteCobrado: '10',
        desconto: '2,80',
        taxaValor: '3',
        custoEnvio: '8',
        itens: [
          { produtoId: 'botton', qtd: '2', preco: '8,90' },
          { produtoId: 'card', qtd: '1', preco: '5' },
        ],
      },
      { id: 'o2', data: '2026-10-07', status: 'cancelado', itens: [{ produtoId: 'botton', qtd: '2', preco: '50' }] },
      { id: 'o3', data: '2026-09-20', status: 'entregue', itens: [{ produtoId: 'card', qtd: '4', preco: '5' }] },
    ],
  };
}

describe('supplies', () => {
  const calc = createCalc(fixture());
  test('custoUnit() uses the manual cost when there are no purchases', () => {
    expect(calc.custoUnit(calc.insById('paper')!)).toMatchObject({ fonte: 'manual', valor: 2 });
  });
  test('custoUnit() averages purchases including shipping', () => {
    const c = calc.custoUnit(calc.insById('base')!);
    expect(c.fonte).toBe('compras');
    expect(c.n).toBe(2);
    close(c.valor, 100 / 150);
  });
  test('movIns(): initial stock + purchases − what batches consumed', () => {
    expect(calc.movIns(calc.insById('base')!)).toEqual({ comprado: 150, usado: 20, estoque: 140 });
  });
  test('insStatus(): ok, restock at the minimum, out at zero', () => {
    const base = calc.insById('base')!;
    expect(insStatus(base, 140)[0]).toBe('Ok');
    expect(insStatus(base, 50)[0]).toBe('Repor');
    expect(insStatus(base, 0)[0]).toBe('Acabou');
  });
});

describe('product cost and price', () => {
  const calc = createCalc(fixture());
  const botton = calc.prodById('botton')!;
  test('custo() adds materials (with yield), waste, labor and extras', () => {
    const k = calc.custo(botton);
    close(k.mat, 0.5 + 100 / 150);
    close(k.perda, (0.5 + 100 / 150) * 0.05);
    close(k.mo, 2);
    close(k.extra, 0.3);
    close(k.total, 3.525);
  });
  test('suggested price = cost × (1 + margin) ÷ (1 − fee), rounded up to end in ,90', () => {
    const k = calc.custo(botton);
    close(k.sugerido, (3.525 * 2) / 0.88); // 8.0114
    close(k.redondo, 8.9);
    close(k.preco, 8.9);
    expect(k.manual).toBe(false);
    close(k.lucro, 8.9 * 0.88 - 3.525); // 4.307
    close(k.margemReal, ((8.9 * 0.88 - 3.525) / 8.9) * 100);
  });
  test('a price set by hand wins over the suggestion', () => {
    const k = calc.custoOf({ ...botton, preco: '10,00' });
    expect(k.manual).toBe(true);
    close(k.preco, 10);
  });
  test('a product can override the default margin', () => {
    const k = calc.custoOf({ ...botton, margem: '50' });
    close(k.sugerido, (3.525 * 1.5) / 0.88); // 6.0085
    close(k.redondo, 6.9);
  });
  test('changing the hourly rate in settings changes the cost', () => {
    const other = createCalc({ ...fixture(), config: { valorHora: '40' } });
    close(other.custo(other.prodById('botton')!).mo, 4);
  });
  test('estoqueProd(): initial + produced − ordered, ignoring cancelled orders', () => {
    expect(calc.estoqueProd(botton)).toBe(5 + 10 - 2);
  });
});

describe('orders, month summary and profit', () => {
  const db = fixture();
  const calc = createCalc(db);
  test('totPedido(): subtotal, total and net after fee and shipping', () => {
    const t = totPedido(db.pedidos[0]);
    close(t.sub, 22.8);
    close(t.total, 30);
    close(t.liquido, 19);
    expect(t.pecas).toBe(3);
  });
  test('resumoMes(): sales, net, expenses and cash for one month', () => {
    const r = calc.resumoMes('2026-10');
    expect(r.n).toBe(1); // the cancelled order is ignored
    close(r.vendas, 30);
    close(r.liquido, 19);
    close(r.gastos, 100); // 60 + 40 (September's expense is ignored)
    close(r.saldo, -81);
    close(r.ticket, 30);
  });
  test('monthProfit(): sales − cost of pieces sold − fees and shipping', () => {
    const p = calc.monthProfit('2026-10');
    close(p.sales, 30);
    close(p.goodsCost, 2 * 3.525 + 1); // 8.05
    close(p.feesAndShipping, 11);
    close(p.profit, 19 - 8.05); // 10.95
    close(p.margin, (10.95 / 30) * 100);
    expect(p.orders).toBe(1);
  });
  test('monthProfit(): order fees and discounts are split among items by revenue', () => {
    const p = calc.monthProfit('2026-10');
    const rate = (3 + 2.8) / 22.8;
    close(p.byProduct.botton.profit, 17.8 * (1 - rate) - 7.05);
    close(p.byProduct.card.profit, 5 * (1 - rate) - 1);
    expect(p.byProduct.botton.qty).toBe(2);
  });
  test('monthProfit(): product profits plus net shipping add up to the month profit', () => {
    const p = calc.monthProfit('2026-10');
    close(Object.values(p.byProduct).reduce((a, x) => a + x.profit, 0) + p.shippingNet, p.profit);
  });
  test('monthProfit(): a month without sales is all zeros', () => {
    const p = calc.monthProfit('2026-11');
    expect([p.sales, p.profit, p.margin, p.orders]).toEqual([0, 0, 0, 0]);
  });
  test('monthProfit(): a removed product counts as zero cost', () => {
    const withGone = createCalc({
      ...db,
      pedidos: [...db.pedidos, { id: 'o4', data: '2026-08-01', status: 'novo', itens: [{ produtoId: 'gone', qtd: '1', preco: '7' }] }],
    });
    close(withGone.monthProfit('2026-08').profit, 7);
  });
  test('consumoDe(): supplies a batch uses, by the recipe', () => {
    expect(calc.consumoDe(calc.prodById('botton'), 8)).toEqual([
      { insumoId: 'paper', qtd: 2 },
      { insumoId: 'base', qtd: 8 },
    ]);
  });
});

describe('tasks (clock fixed at 2026-10-20)', () => {
  beforeAll(() => vi.setSystemTime(new Date(2026, 9, 20, 12)));
  afterAll(() => vi.useRealTimers());
  test('tarefasUrgentes(): pending tasks due today or earlier, oldest first', () => {
    const calc = createCalc({
      ...emptyDb(),
      tarefas: [
        { id: 't1', titulo: 'Atrasada', prazo: '2026-10-19', feito: false },
        { id: 't2', titulo: 'Hoje', prazo: '2026-10-20', feito: false },
        { id: 't3', titulo: 'Amanhã', prazo: '2026-10-21', feito: false },
        { id: 't4', titulo: 'Feita', prazo: '2026-10-01', feito: true },
        { id: 't5', titulo: 'Sem prazo', prazo: '', feito: false },
      ],
    });
    expect(calc.tarefasUrgentes().map(t => t.id)).toEqual(['t1', 't2']);
  });
});

describe('backup and restore', () => {
  const db = fixture();
  test('recordsFrom() keeps valid records and skips bad ids', () => {
    const recs = recordsFrom({ config: { nomeLoja: 'X' }, insumos: { ok_1: { nome: 'A' }, 'bad id!': { nome: 'B' } }, pedidos: [] });
    expect(recs.map(r => `${r.colecao}/${r.id}`)).toEqual(['config/geral', 'insumos/ok_1']);
  });
  test('a backup restores every record', () => {
    const backup = JSON.parse(JSON.stringify(backupObj(db)));
    const total = db.insumos.length + db.produtos.length + db.gastos.length + db.pedidos.length + db.producoes.length + db.tarefas.length;
    expect(recordsFrom(backup)).toHaveLength(total + 1); // + config
    expect(backup.insumos.base.estoqueInicial).toBe('10');
    expect('id' in backup.insumos.base).toBe(false);
    expect(applyRecords(emptyDb(), recordsFrom(backup))).toEqual(db);
  });
});

describe('sample data (exemplo.json) regression', () => {
  const calc = createCalc(applyRecords(emptyDb(), recordsFrom(sample)));
  const round = (n: number) => Math.round(n * 100) / 100;
  test('October 2026 profit matches the value checked when the feature shipped', () => {
    const p = calc.monthProfit('2026-10');
    expect(round(p.sales)).toBe(594.5);
    expect(round(p.goodsCost)).toBe(139.44);
    expect(round(p.profit)).toBe(413.56);
  });
  test('August and September 2026 profit', () => {
    expect(round(calc.monthProfit('2026-08').profit)).toBe(191.99);
    expect(round(calc.monthProfit('2026-09').profit)).toBe(149.41);
  });
});

describe('task order', () => {
  const task = (id: string, extra: Partial<Tarefa> = {}): Tarefa => ({ id, titulo: id, criadoEm: `2026-10-0${id.slice(1)}`, ...extra });

  test('taskOrder(): the order set by the user comes first, then due date, priority and creation', () => {
    const list = [
      task('t1', { prazo: '2026-10-01' }),
      task('t2', { prazo: '2026-10-05', ordem: 2 }),
      task('t3', { prazo: '2026-10-09', ordem: 1 }),
      task('t4'),
      task('t5', { prazo: '2026-10-01', prioridade: 'alta' }),
    ];
    // Moved tasks (t3, t2) by their order; the others after them, by date (t5 before t1: higher priority), no date last.
    expect(list.toSorted(taskOrder).map(t => t.id)).toEqual(['t3', 't2', 't5', 't1', 't4']);
  });

  test('moveTask(): numbers the list in its new order and returns only what changed', () => {
    const list = [task('t1', { ordem: 1 }), task('t2', { ordem: 2 }), task('t3'), task('t4')];
    // t4 to the second place: t1 keeps 1, t4 gets 2, t2 becomes 3, t3 (never moved) gets 4.
    expect(moveTask(list, 3, 1).map(t => [t.id, t.ordem])).toEqual([
      ['t4', 2],
      ['t2', 3],
      ['t3', 4],
    ]);
    // Up from the first place or to the same place: nothing to save.
    expect(moveTask(list, 0, 0)).toEqual([]);
    expect(moveTask(list, 0, -1)).toEqual([]);
    // The list given is not changed.
    expect(list.map(t => t.ordem)).toEqual([1, 2, undefined, undefined]);
  });
});
